// Vercel serverless entry — runs the whole Fastify app in-process and adapts
// each incoming request via fastify.inject(). Static assets + SPA fallback are
// handled by the Vercel CDN (see vercel.json), so this function only sees /api.
import { buildApp } from '../server/src/index.js';

let appPromise = null;
function getApp() {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();

    // Give rate limiting / audit a realistic client IP (Vercel sets X-Forwarded-For).
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
      .split(',')[0]
      .trim();

    let payload;
    if (req.body === undefined || req.body === null) {
      payload = undefined;
    } else if (typeof req.body === 'string') {
      payload = req.body;
    } else {
      payload = JSON.stringify(req.body);
    }

    const response = await app.inject({
      method: req.method,
      url: req.url,
      headers: { ...req.headers },
      payload,
      remoteAddress: ip,
    });

    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers)) {
      if (value === undefined) continue;
      res.setHeader(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
    res.end(response.rawPayload ?? response.payload);
  } catch (err) {
    console.error('[medsnap] handler error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal error', message: String(err?.message || err) }));
  }
}