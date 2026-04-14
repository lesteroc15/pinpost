const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// List all orgs
router.get('/orgs', requireAuth, requireSuperAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT o.*, COUNT(u.id) as user_count,
           (SELECT COUNT(*) FROM checkins c WHERE c.org_id = o.id) as checkin_count
    FROM organizations o
    LEFT JOIN users u ON u.org_id = o.id AND u.role != 'super_admin'
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
});

// Create new org + admin user
router.post('/orgs', requireAuth, requireSuperAdmin, async (req, res) => {
  const { orgName, adminEmail, adminName, adminPassword } = req.body;
  if (!orgName || !adminEmail || !adminPassword) return res.status(400).json({ error: 'All fields required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgRes = await client.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
      [orgName]
    );
    const org = orgRes.rows[0];

    const hash = await bcrypt.hash(adminPassword, 10);
    const userRes = await client.query(
      'INSERT INTO users (org_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [org.id, adminEmail.toLowerCase(), hash, adminName || adminEmail, 'admin']
    );

    await client.query('COMMIT');
    res.json({ org, user: userRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    throw err;
  } finally {
    client.release();
  }
});

// Update org status (trial/active/suspended)
router.patch('/orgs/:orgId/status', requireAuth, requireSuperAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['trial', 'active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  await pool.query('UPDATE organizations SET status = $1 WHERE id = $2', [status, req.params.orgId]);
  res.json({ success: true });
});

// Delete org
router.delete('/orgs/:orgId', requireAuth, requireSuperAdmin, async (req, res) => {
  await pool.query('DELETE FROM organizations WHERE id = $1', [req.params.orgId]);
  res.json({ success: true });
});

// Get org detail + team
router.get('/orgs/:orgId', requireAuth, requireSuperAdmin, async (req, res) => {
  const orgRes = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.params.orgId]);
  const usersRes = await pool.query('SELECT id, email, name, role, is_active, created_at FROM users WHERE org_id = $1', [req.params.orgId]);
  const checkinsRes = await pool.query('SELECT COUNT(*) FROM checkins WHERE org_id = $1', [req.params.orgId]);
  res.json({ org: orgRes.rows[0], users: usersRes.rows, checkinCount: checkinsRes.rows[0].count });
});

module.exports = router;
