const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const url = process.env.DATABASE_URL || '';
const isInternal = url.includes('.railway.internal');

const pool = new Pool({
  connectionString: url,
  connectionTimeoutMillis: 15000,
  ...(isInternal ? {} : { ssl: { rejectUnauthorized: false } })
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

const state = { ready: false };

async function initDb() {
  if (process.env.DEBUG_DB === '1') {
    const dns = require('dns');
    const parsedUrl = new URL(url);
    try {
      const addrs = await dns.promises.resolve(parsedUrl.hostname);
      console.log('DNS resolved:', parsedUrl.hostname, '->', addrs);
    } catch (e) {
      console.log('DNS resolve failed:', e.message);
    }
  }
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await client.query(stmt);
    }
    state.ready = true;
    console.log('Database schema initialized');
  } finally {
    client.release();
  }
}

function isReady() {
  return state.ready;
}

module.exports = { pool, initDb, isReady };
