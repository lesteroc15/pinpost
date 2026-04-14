const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listAccounts, listLocations, refreshAccessToken } = require('../services/gbp');

const router = express.Router();

// Get team members
router.get('/team', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, name, role, is_active, created_at FROM users WHERE org_id = $1 ORDER BY created_at',
    [req.user.orgId]
  );
  res.json(rows);
});

// Add worker (email/password)
router.post('/team', requireAuth, requireAdmin, async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) return res.status(400).json({ error: 'All fields required' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (org_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [req.user.orgId, email.toLowerCase(), hash, name, 'worker']
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    throw err;
  }
});

// Generate invite link
router.post('/team/invite', requireAuth, requireAdmin, async (req, res) => {
  const { email } = req.body;
  const token = uuidv4();
  await pool.query(
    'INSERT INTO invites (org_id, email, token) VALUES ($1, $2, $3)',
    [req.user.orgId, email || null, token]
  );
  const link = `${process.env.APP_URL}/register?token=${token}`;
  res.json({ link });
});

// Deactivate worker
router.delete('/team/:userId', requireAuth, requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE users SET is_active = false WHERE id = $1 AND org_id = $2',
    [req.params.userId, req.user.orgId]
  );
  res.json({ success: true });
});

// Get GBP accounts (after Google OAuth)
router.get('/gbp/accounts', requireAuth, requireAdmin, async (req, res) => {
  const orgRes = await pool.query('SELECT gbp_access_token, gbp_refresh_token FROM organizations WHERE id = $1', [req.user.orgId]);
  const org = orgRes.rows[0];
  if (!org?.gbp_refresh_token) return res.status(400).json({ error: 'Google not connected' });

  try {
    const accessToken = await refreshAccessToken(org.gbp_refresh_token);
    const accounts = await listAccounts(accessToken);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get GBP locations for an account
router.get('/gbp/locations/:accountId', requireAuth, requireAdmin, async (req, res) => {
  const orgRes = await pool.query('SELECT gbp_refresh_token FROM organizations WHERE id = $1', [req.user.orgId]);
  const org = orgRes.rows[0];

  try {
    const accessToken = await refreshAccessToken(org.gbp_refresh_token);
    const locations = await listLocations(accessToken, req.params.accountId);
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save selected GBP location
router.post('/gbp/location', requireAuth, requireAdmin, async (req, res) => {
  const { accountId, locationId, locationName } = req.body;
  await pool.query(
    'UPDATE organizations SET gbp_account_id = $1, gbp_location_id = $2, gbp_location_name = $3 WHERE id = $4',
    [accountId, locationId, locationName, req.user.orgId]
  );
  res.json({ success: true });
});

// Meta OAuth redirect
router.get('/meta/connect', requireAuth, requireAdmin, (req, res) => {
  if (!process.env.META_APP_ID) {
    return res.status(400).json({ error: 'Meta app not configured yet' });
  }
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.APP_URL}/api/admin/meta/callback`,
    scope: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,pages_show_list',
    response_type: 'code',
    state: req.user.orgId
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

// Meta OAuth callback
router.get('/meta/callback', async (req, res) => {
  const { code, state: orgId, error } = req.query;
  if (error) return res.redirect(`${process.env.APP_URL}/settings?error=meta_denied`);

  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/admin/meta/callback`,
        code
      }
    });
    const accessToken = tokenRes.data.access_token;

    // Get pages
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: accessToken }
    });
    const pages = pagesRes.data.data;
    if (!pages.length) return res.redirect(`${process.env.APP_URL}/settings?error=no_pages`);

    const page = pages[0];

    // Get connected Instagram account
    let igAccountId = null;
    try {
      const igRes = await axios.get(`https://graph.facebook.com/v19.0/${page.id}`, {
        params: { fields: 'instagram_business_account', access_token: page.access_token }
      });
      igAccountId = igRes.data.instagram_business_account?.id || null;
    } catch {}

    await pool.query(
      'UPDATE organizations SET meta_access_token = $1, meta_page_id = $2, meta_ig_account_id = $3, meta_connected_at = NOW() WHERE id = $4',
      [accessToken, page.id, igAccountId, orgId]
    );

    res.redirect(`${process.env.APP_URL}/settings?success=meta_connected`);
  } catch (err) {
    console.error('Meta callback error:', err.message);
    res.redirect(`${process.env.APP_URL}/settings?error=meta_failed`);
  }
});

module.exports = router;
