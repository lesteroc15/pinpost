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
  // Start the server first so Railway sees it's healthy
  app.listen(PORT, () => console.log(`PinPost running on port ${PORT}`));
  // Then init DB (retry on failure)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`DB init attempt ${attempt}...`);
      console.log('DB URL host:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@'));
      await initDb();
      await createSuperAdmin();
      console.log('Startup complete');
      return;
    } catch (err) {
      console.error(`DB init attempt ${attempt} failed:`, err.message);
      if (attempt < 5) await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('All DB init attempts failed. Server running without DB.');
}

start();
