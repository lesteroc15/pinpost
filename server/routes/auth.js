const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, orgId: user.org_id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Email/password login (workers, super admin)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.is_active) return res.status(403).json({ error: 'Account suspended. Contact your provider.' });

  // Check org status if not super admin
  if (user.role !== 'super_admin' && user.org_id) {
    const orgRes = await pool.query('SELECT status FROM organizations WHERE id = $1', [user.org_id]);
    if (orgRes.rows[0]?.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been paused. Please contact your service provider.' });
    }
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: makeToken(user), role: user.role });
});

// Google OAuth redirect (admin login + GBP connect)
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'email profile https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/auth?${params}`);
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect(`${process.env.APP_URL}/login?error=google_denied`);

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code'
    });
    const { access_token, refresh_token } = tokenRes.data;

    // Get user info
    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const { email, name } = userInfoRes.data;

    // Look up user by email
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.redirect(`${process.env.APP_URL}/login?error=not_registered`);
    if (!user.is_active) return res.redirect(`${process.env.APP_URL}/login?error=suspended`);

    // Store GBP tokens on their org
    if (user.org_id) {
      await pool.query(
        'UPDATE organizations SET gbp_access_token = $1, gbp_refresh_token = $2 WHERE id = $3',
        [access_token, refresh_token, user.org_id]
      );
    }

    // Update name if missing
    if (!user.name && name) {
      await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, user.id]);
      user.name = name;
    }

    const token = makeToken(user);
    res.redirect(`${process.env.APP_URL}/auth/callback?token=${token}&role=${user.role}`);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${process.env.APP_URL}/login?error=oauth_failed`);
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, name, role, org_id FROM users WHERE id = $1',
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  let org = null;
  if (user.org_id) {
    const orgRes = await pool.query(
      'SELECT id, name, status, gbp_location_name, gbp_location_id, meta_page_id, meta_ig_account_id FROM organizations WHERE id = $1',
      [user.org_id]
    );
    org = orgRes.rows[0] || null;
  }
  res.json({ user, org });
});

// Register via invite token
router.post('/register', async (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password) return res.status(400).json({ error: 'All fields required' });

  const inviteRes = await pool.query(
    'SELECT * FROM invites WHERE token = $1 AND used = false AND expires_at > NOW()',
    [token]
  );
  const invite = inviteRes.rows[0];
  if (!invite) return res.status(400).json({ error: 'Invalid or expired invite link' });

  const hash = await bcrypt.hash(password, 10);
  const email = invite.email || `worker_${Date.now()}@pinpost.app`;

  const { rows } = await pool.query(
    'INSERT INTO users (org_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [invite.org_id, email, hash, name, 'worker']
  );

  await pool.query('UPDATE invites SET used = true WHERE id = $1', [invite.id]);

  res.json({ token: makeToken(rows[0]), role: 'worker' });
});

module.exports = router;
