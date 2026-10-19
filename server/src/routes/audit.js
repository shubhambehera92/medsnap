import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { toAuditEntry } from '../mappers.js';
import { upsertRow } from '../repo.js';
import { COLUMNS } from '../columns.js';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 10000;
const DEFAULT_DEVICE = 'MedSnap API';

function parseLimit(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export default async function auditRoutes(fastify) {
  fastify.get('/api/audit', async (req) => {
    const limit = parseLimit(req.query?.limit);
    const rows = await db
      .prepare(`SELECT * FROM audit ORDER BY timestamp DESC LIMIT ${limit}`)
      .all();
    return { entries: rows.map(toAuditEntry) };
  });

  // Accepts one entry (not a batch); upserts by id and fills id/timestamp/device.
  fastify.post('/api/audit', async (req, reply) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (!body.action) return reply.code(400).send({ error: 'action is required' });
    const values = {
      ...body,
      id: body.id || randomUUID(),
      timestamp: body.timestamp || new Date().toISOString(),
      device: body.device || DEFAULT_DEVICE,
    };
    const row = await upsertRow('audit', values, COLUMNS.audit);
    return reply.code(201).send({ entry: toAuditEntry(row) });
  });
}
