require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, initDb, isReady } = require('./db');
const { ensureUploadDir, UPLOAD_DIR } = require('./services/image');

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

app.set('trust proxy', 1); // Railway sits behind a proxy; req.ip should reflect the client.

const allowedOrigins = (process.env.NODE_ENV === 'production')
  ? [process.env.APP_URL].filter(Boolean)
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Health check — Railway uses this to decide if the service is live.
// Returns 503 until the DB schema has initialized so requests don't hit a half-booted server.
app.get('/health', async (req, res) => {
  if (!isReady()) return res.status(503).json({ status: 'starting', db: false });
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: true });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: false, error: err.message });
  }
});

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
      await initDb();
      await createSuperAdmin();
      console.log('Startup complete');
      return;
    } catch (err) {
      console.error(`DB init attempt ${attempt} failed:`, err.message);
      if (attempt < 5) await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('All DB init attempts failed. /health will report 503.');
}

start();
