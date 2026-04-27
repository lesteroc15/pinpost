const crypto = require('crypto');

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not set');
  return s;
}

function sign(payload) {
  const body = { ...payload, iat: Date.now() };
  const json = JSON.stringify(body);
  const b64 = Buffer.from(json).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(b64).digest('base64url');
  return `${b64}.${mac}`;
}

function verify(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) return null;
  const [b64, mac] = state.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(b64).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(b64, 'base64url').toString()); } catch { return null; }
  if (!payload.iat || Date.now() - payload.iat > STATE_TTL_MS) return null;
  return payload;
}

module.exports = { sign, verify };
