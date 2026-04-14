const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('DB URL present:', !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes('.railway.internal') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

async function initDb() {
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
