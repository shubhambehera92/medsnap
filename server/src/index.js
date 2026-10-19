import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';

import { config, CLIENT_DIST } from './config.js';
import { dbKind } from './db.js';
import { ensureSeed } from './seed.js';

import usersRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import photoRoutes from './routes/photos.js';
import auditRoutes from './routes/audit.js';
import chatRoutes from './routes/chat.js';
import deviceRoutes from './routes/devices.js';
import settingsRoutes from './routes/settings.js';

const isVercel = process.env.VERCEL === '1' || process.env.MEDSNAP_SERVERLESS === '1';

/** Build (and seed) the Fastify app. Shared by the local server and the Vercel function. */
export async function buildApp() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: config.maxUploadBytes,
    trustProxy: true,
  });

  // Baseline security headers for a clinical app.
  fastify.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(self), geolocation=()');
  });

  await fastify.register(cors, { origin: true });

  // Global rate limit.
  await fastify.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
  });

  // Every error is JSON: { error: "message" }.
  fastify.setErrorHandler((err, _req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) fastify.log.error(err);
    reply.code(status).send({ error: err.message || 'Internal error' });
  });

  fastify.get('/api/health', async () => ({
    ok: true,
    service: 'medsnap-api',
    db: dbKind,
    time: new Date().toISOString(),
  }));

  await fastify.register(usersRoutes);
  await fastify.register(patientRoutes);
  await fastify.register(photoRoutes);
  await fastify.register(auditRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(deviceRoutes);
  await fastify.register(settingsRoutes);

  // On Vercel the CDN serves the built PWA and the SPA fallback; the function
  // only handles /api. Locally, serve the built client when it exists.
  const serveStatic = !isVercel && fs.existsSync(CLIENT_DIST);
  if (serveStatic) {
    await fastify.register(fastifyStatic, { root: CLIENT_DIST });
    fastify.log.info(`Serving PWA from ${CLIENT_DIST}`);
  }

  fastify.setNotFoundHandler((req, reply) => {
    if (serveStatic && !req.raw.url?.startsWith('/api')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'Not found' });
  });

  // Seed demo data on boot when the database is empty (idempotent).
  const seedResult = await ensureSeed();
  fastify.log.info({ seed: seedResult }, 'seed check complete');

  return fastify;
}

if (!isVercel) {
  const fastify = await buildApp();
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`MedSnap API ready — ${dbKind} backend on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
