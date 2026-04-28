const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateDescription } = require('../services/claude');
const { createCollage, compressImage, UPLOAD_DIR } = require('../services/image');
const { createLocalPost, refreshAccessToken } = require('../services/gbp');
const { postToFacebook, postToInstagram, getPageAccessToken } = require('../services/meta');

const router = express.Router();

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { files: 10, fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Generate AI description
router.post('/generate-description', requireAuth, async (req, res) => {
  const { address, businessName, businessType, existingText } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });
  try {
    const description = await generateDescription({ businessName, businessType, address, existingText });
    res.json({ description });
  } catch (err) {
    console.error('Claude error:', err.message);
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

// Submit check-in
router.post('/', requireAuth, upload.array('photos', 10), async (req, res) => {
  const { address, lat, lng, description, socialDescription, photoLabels: photoLabelsRaw } = req.body;
  if (!address || !description) return res.status(400).json({ error: 'Address and description required' });

  const orgId = req.user.orgId;
  if (!orgId) return res.status(400).json({ error: 'No organization linked' });

  // Check org status
  const orgRes = await pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
  const org = orgRes.rows[0];
  if (!org || org.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact your provider.' });
  }

  // Parse per-photo labels (null | 'before' | 'after'). Sent as a JSON string
  // because FormData doesn't natively support arrays.
  let photoLabels = [];
  try { photoLabels = JSON.parse(photoLabelsRaw || '[]'); } catch { photoLabels = []; }
  if (!Array.isArray(photoLabels)) photoLabels = [];

  const photoPaths = (req.files || []).map(f => f.filename);

  // Compress uploaded images
  for (const filename of photoPaths) {
    try { await compressImage(path.join(UPLOAD_DIR, filename)); } catch {}
  }
  let collagePath = null;

  if (photoPaths.length >= 2) {
    const fullPaths = photoPaths.map(f => path.join(UPLOAD_DIR, f));
    const collageFile = await createCollage(fullPaths, { labels: photoLabels });
    collagePath = path.basename(collageFile);
  }

  // Save check-in
  const { rows } = await pool.query(
    `INSERT INTO checkins (org_id, user_id, address, lat, lng, description, social_description, photo_paths, collage_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [orgId, req.user.id, address, lat || null, lng || null, description, socialDescription || null, photoPaths, collagePath]
  );
  const checkin = rows[0];

  const appUrl = process.env.APP_URL;
  const primaryPhoto = collagePath || photoPaths[0];
  const photoUrl = primaryPhoto ? `${appUrl}/uploads/${primaryPhoto}` : null;

  // Post to GBP (async, don't block response)
  postToGBP(org, checkin, description, photoUrl).catch(console.error);

  // Post to social (async)
  postToSocial(org, checkin, socialDescription || description, photoUrl).catch(console.error);

  res.json({ success: true, checkinId: checkin.id });
});

async function postToGBP(org, checkin, description, photoUrl) {
  if (!org.gbp_refresh_token || !org.gbp_location_id) {
    await pool.query('UPDATE checkins SET gbp_status = $1, gbp_error = $2 WHERE id = $3',
      ['skipped', 'GBP not connected', checkin.id]);
    return;
  }
  try {
    const accessToken = await refreshAccessToken(org.gbp_refresh_token);
    const post = await createLocalPost({
      accessToken,
      accountId: org.gbp_account_id,
      locationId: org.gbp_location_id,
      description,
      photoUrl
    });
    await pool.query('UPDATE checkins SET gbp_status = $1, gbp_post_id = $2 WHERE id = $3',
      ['posted', post.name, checkin.id]);
  } catch (err) {
    console.error('GBP post error:', err.message);
    await pool.query('UPDATE checkins SET gbp_status = $1, gbp_error = $2 WHERE id = $3',
      ['failed', err.message, checkin.id]);
  }
}

async function postToSocial(org, checkin, message, photoUrl) {
  if (!org.meta_access_token || !org.meta_page_id) return;

  try {
    const pageToken = await getPageAccessToken({ userAccessToken: org.meta_access_token, pageId: org.meta_page_id });

    // Facebook
    try {
      const fbPost = await postToFacebook({ pageAccessToken: pageToken, pageId: org.meta_page_id, message, photoUrl });
      await pool.query('UPDATE checkins SET fb_status = $1, fb_post_id = $2 WHERE id = $3',
        ['posted', fbPost.id || fbPost.post_id, checkin.id]);
    } catch (err) {
      await pool.query('UPDATE checkins SET fb_status = $1, fb_error = $2 WHERE id = $3',
        ['failed', err.message, checkin.id]);
    }

    // Instagram
    if (org.meta_ig_account_id && photoUrl) {
      try {
        const igPost = await postToInstagram({ pageAccessToken: pageToken, igAccountId: org.meta_ig_account_id, message, photoUrl });
        await pool.query('UPDATE checkins SET ig_status = $1, ig_post_id = $2 WHERE id = $3',
          ['posted', igPost.id, checkin.id]);
      } catch (err) {
        await pool.query('UPDATE checkins SET ig_status = $1, ig_error = $2 WHERE id = $3',
          ['failed', err.message, checkin.id]);
      }
    }
  } catch (err) {
    console.error('Social post error:', err.message);
  }
}

// List check-ins for org
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, u.name as worker_name FROM checkins c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.org_id = $1 ORDER BY c.created_at DESC LIMIT 100`,
    [req.user.orgId]
  );
  res.json(rows);
});

// Get single check-in (for status polling after submit)
router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM checkins WHERE id = $1 AND org_id = $2',
    [req.params.id, req.user.orgId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Retry a failed GBP post (admin only)
router.post('/:id/retry', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM checkins WHERE id = $1 AND org_id = $2',
    [req.params.id, req.user.orgId]
  );
  const checkin = rows[0];
  if (!checkin) return res.status(404).json({ error: 'Not found' });
  if (checkin.gbp_status === 'posted') return res.status(400).json({ error: 'Already posted to Google.' });

  const orgRes = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.user.orgId]);
  const org = orgRes.rows[0];
  if (!org?.gbp_refresh_token || !org?.gbp_location_id) {
    return res.status(400).json({ error: 'Google Business Profile is not connected. Connect it in Settings first.' });
  }

  // Mark pending so the UI immediately shows the retry is in flight.
  await pool.query(
    'UPDATE checkins SET gbp_status = $1, gbp_error = NULL WHERE id = $2',
    ['pending', checkin.id]
  );

  const appUrl = process.env.APP_URL;
  const primaryPhoto = checkin.collage_path || checkin.photo_paths?.[0];
  const photoUrl = primaryPhoto ? `${appUrl}/uploads/${primaryPhoto}` : null;

  postToGBP(org, checkin, checkin.description, photoUrl).catch(console.error);

  res.json({ success: true });
});

// Delete check-in (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { rowCount } = await pool.query(
    'DELETE FROM checkins WHERE id = $1 AND org_id = $2',
    [req.params.id, req.user.orgId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
