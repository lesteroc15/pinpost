// In-memory sliding-window rate limiter. One process; fine for single-tenant
// Railway service. Replace with Redis-backed limiter if we ever scale to N instances.

function rateLimit({ windowMs, max, key, message }) {
  const hits = new Map(); // key -> [timestamps]

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    const arr = (hits.get(k) || []).filter(t => now - t < windowMs);
    if (arr.length >= max) {
      return res.status(429).json({ error: message || 'Too many requests, please try again later.' });
    }
    arr.push(now);
    hits.set(k, arr);
    // Periodic cleanup so the map doesn't grow forever.
    if (hits.size > 5000) {
      for (const [mk, mv] of hits) {
        if (!mv.some(t => now - t < windowMs)) hits.delete(mk);
      }
    }
    next();
  };
}

const ipKey = req =>
  (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || req.socket.remoteAddress || 'unknown';

module.exports = { rateLimit, ipKey };
