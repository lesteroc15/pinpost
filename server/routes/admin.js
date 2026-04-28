const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listAccounts, listLocations, refreshAccessToken } = require('../services/gbp');
const oauthState = require('../lib/oauthState');

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
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (org_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, is_active, created_at',
      [req.user.orgId, email.toLowerCase(), hash, name, 'worker']
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    throw err;
  }
});

// Update worker (name, email, password, is_active)
router.patch('/team/:userId', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, is_active } = req.body;

  // Confirm the target row belongs to this admin's org and is a worker
  const target = await pool.query(
    'SELECT id, role FROM users WHERE id = $1 AND org_id = $2',
    [req.params.userId, req.user.orgId]
  );
  if (!target.rows.length) return res.status(404).json({ error: 'Not found' });
  if (target.rows[0].role !== 'worker') return res.status(403).json({ error: 'Cannot edit non-worker accounts.' });

  const updates = [];
  const values = [];
  let i = 1;
  if (typeof name === 'string' && name.trim()) { updates.push(`name = $${i++}`); values.push(name.trim()); }
  if (typeof email === 'string' && email.trim()) {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'Invalid email.' });
    updates.push(`email = $${i++}`); values.push(e);
  }
  if (typeof password === 'string' && password.length > 0) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    updates.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(password, 10));
  }
  if (typeof is_active === 'boolean') { updates.push(`is_active = $${i++}`); values.push(is_active); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update.' });

  values.push(req.params.userId, req.user.orgId);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i++} AND org_id = $${i} RETURNING id, email, name, role, is_active, created_at`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'That email is already in use.' });
    throw err;
  }
});

// Generate invite link
router.post('/team/invite', requireAuth, requireAdmin, async (req, res) => {
  const { email } = req.body;
  const token = uuidv4();
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  await pool.query(
    'INSERT INTO invites (org_id, email, token) VALUES ($1, $2, $3)',
    [req.user.orgId, normalizedEmail, token]
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

// GBP OAuth connect (separate from login — admin must be logged in first)
// Accepts token via query param since browser navigation doesn't send Auth header.
// We immediately exchange it for a short-lived signed state and redirect to Google,
// so the JWT only appears in this server's URL once (then is bound into the state).
router.get('/gbp/connect', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.query.token;
  if (!token) return res.status(401).send('Token required');
  let user;
  try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).send('Invalid token'); }
  if (user.role !== 'admin' && user.role !== 'super_admin') return res.status(403).send('Admin only');
  const state = oauthState.sign({ orgId: user.orgId, userId: user.id, kind: 'gbp' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/api/admin/gbp/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/auth?${params}`);
});

// GBP OAuth callback
router.get('/gbp/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error) return res.redirect(`${process.env.APP_URL}/settings?error=google_denied`);

  const payload = oauthState.verify(state);
  if (!payload || payload.kind !== 'gbp' || !payload.orgId) {
    return res.redirect(`${process.env.APP_URL}/settings?error=google_failed`);
  }

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.APP_URL}/api/admin/gbp/callback`,
      grant_type: 'authorization_code'
    });
    const { access_token, refresh_token } = tokenRes.data;

    await pool.query(
      'UPDATE organizations SET gbp_access_token = $1, gbp_refresh_token = $2 WHERE id = $3',
      [access_token, refresh_token, payload.orgId]
    );

    res.redirect(`${process.env.APP_URL}/settings?success=google_connected`);
  } catch (err) {
    console.error('GBP OAuth error:', err.message);
    res.redirect(`${process.env.APP_URL}/settings?error=google_failed`);
  }
});

// Get GBP accounts (after Google OAuth)
router.get('/gbp/accounts', requireAuth, requireAdmin, async (req, res) => {
  const orgRes = await pool.query('SELECT gbp_access_token, gbp_refresh_token FROM organizations WHERE id = $1', [req.user.orgId]);
  const org = orgRes.rows[0];
  if (!org?.gbp_refresh_token) return res.status(400).json({ error: 'Google not connected' });

  try {
    const accessToken = await refreshAccessToken(org.gbp_refresh_token);
    console.log('GBP: Got access token, fetching accounts...');
    const accounts = await listAccounts(accessToken);
    console.log('GBP: Accounts response:', JSON.stringify(accounts).slice(0, 500));
    res.json(accounts);
  } catch (err) {
    console.error('GBP accounts error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
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
  const state = oauthState.sign({ orgId: req.user.orgId, userId: req.user.id, kind: 'meta' });
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.APP_URL}/api/admin/meta/callback`,
    scope: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,pages_show_list',
    response_type: 'code',
    state
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

// Meta OAuth callback
router.get('/meta/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${process.env.APP_URL}/settings?error=meta_denied`);

  const payload = oauthState.verify(state);
  if (!payload || payload.kind !== 'meta' || !payload.orgId) {
    return res.redirect(`${process.env.APP_URL}/settings?error=meta_failed`);
  }
  const orgId = payload.orgId;

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
