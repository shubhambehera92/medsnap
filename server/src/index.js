import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';

import { config, CLIENT_DIST } from './config.js';
import { authenticate } from './auth.js';
import { ensureSeed } from './seed.js';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import captureRoutes from './routes/captures.js';
import auditRoutes from './routes/audit.js';
import syncRoutes from './routes/sync.js';

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

  // Global rate limit; individual routes can override (see auth login).
  await fastify.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
  });

  fastify.decorate('authenticate', authenticate);

  fastify.get('/api/health', async () => ({
    ok: true,
    service: 'medsnap-api',
    fhir: { enabled: config.fhirEnabled, baseUrl: config.fhirBaseUrl },
    time: new Date().toISOString(),
  }));

  await fastify.register(authRoutes);
  await fastify.register(patientRoutes);
  await fastify.register(captureRoutes);
  await fastify.register(auditRoutes);
  await fastify.register(syncRoutes);

  // On Vercel the CDN serves the built PWA and the SPA fallback; the function
  // only handles /api. Locally, serve the built client when it exists.
  if (!isVercel && fs.existsSync(CLIENT_DIST)) {
    await fastify.register(fastifyStatic, { root: CLIENT_DIST });
    fastify.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith('/api')) {
        return reply.code(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
    fastify.log.info(`Serving PWA from ${CLIENT_DIST}`);
  }

  // Seed demo data on boot when the database is empty (idempotent).
  const seedResult = await ensureSeed();
  fastify.log.info({ seed: seedResult }, 'seed check complete');

  return fastify;
}

if (!isVercel) {
  const fastify = await buildApp();
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`MedSnap API ready — FHIR base: ${config.fhirBaseUrl}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}