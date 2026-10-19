import { db, toCaptureSummary } from '../db.js';
import { pingFhir } from '../fhir.js';
import { config } from '../config.js';

export default async function syncRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/api/sync/status', async () => {
    const byFhir = await db.prepare('SELECT fhirStatus, COUNT(*) AS n FROM captures GROUP BY fhirStatus').all();
    const bySync = await db.prepare('SELECT syncStatus, COUNT(*) AS n FROM captures GROUP BY syncStatus').all();
    const pendingFhir = await db
      .prepare("SELECT * FROM captures WHERE fhirStatus IN ('pending','failed') ORDER BY createdAt DESC LIMIT 50")
      .all();
    return {
      fhirEnabled: config.fhirEnabled,
      fhirBaseUrl: config.fhirBaseUrl,
      byFhir,
      bySync,
      pendingFhir: pendingFhir.map(toCaptureSummary),
    };
  });

  fastify.get('/api/sync/fhir-health', async () => pingFhir());
}
