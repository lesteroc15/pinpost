const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const url = process.env.DATABASE_URL || '';
const isInternal = url.includes('.railway.internal');
console.log('DB URL present:', !!url, 'internal:', isInternal);

const pool = new Pool({
  connectionString: url,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

async function initDb() {
  // Debug DNS resolution
  const dns = require('dns');
  const parsedUrl = new URL(url);
  try {
    const addrs = await dns.promises.resolve(parsedUrl.hostname);
    console.log('DNS resolved:', parsedUrl.hostname, '->', addrs);
  } catch (e) {
    console.log('DNS resolve failed:', e.message);
    try {
      const addrs6 = await dns.promises.resolve6(parsedUrl.hostname);
      console.log('DNS IPv6 resolved:', addrs6);
    } catch (e2) {
      console.log('DNS IPv6 also failed:', e2.message);
    }
  }
  console.log('Connecting to database...');
  const client = await pool.connect();
  console.log('Connected to database');
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log('Database schema initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
