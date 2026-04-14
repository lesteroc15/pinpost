require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, initDb } = require('./db');
const { ensureUploadDir, UPLOAD_DIR } = require('./services/image');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/checkins', require('./routes/checkins'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/superadmin', require('./routes/superadmin'));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

async function createSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return;

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (rows.length) return;

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
    [email.toLowerCase(), hash, 'Super Admin', 'super_admin']
  );
  console.log('Super admin created:', email);
}

async function start() {
  ensureUploadDir();
  await initDb();
  await createSuperAdmin();
  app.listen(PORT, () => console.log(`PinPost running on port ${PORT}`));
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
