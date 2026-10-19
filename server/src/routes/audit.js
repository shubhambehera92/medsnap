import { db } from '../db.js';
import { recordAudit } from '../auditStore.js';

export default async function auditRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/api/audit', async (req) => {
    const { action, userId, patientId, from, to, q } = req.query;
    const clauses = [];
    const params = {};
    if (action) {
      clauses.push('action = @action');
      params.action = action;
    }
    if (userId) {
      clauses.push('userId = @userId');
      params.userId = userId;
    }
    if (patientId) {
      clauses.push('patientId = @patientId');
      params.patientId = patientId;
    }
    if (from) {
      clauses.push('createdAt >= @from');
      params.from = from;
    }
    if (to) {
      clauses.push('createdAt <= @to');
      params.to = to;
    }
    if (q) {
      clauses.push('(detail LIKE @q OR userName LIKE @q OR patientId LIKE @q OR action LIKE @q)');
      params.q = `%${q}%`;
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const offset = Number(req.query.offset) || 0;
    const rows = await db
      .prepare(`SELECT * FROM audit ${where} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`)
      .all(params);
    const total = (await db.prepare(`SELECT COUNT(*) AS n FROM audit ${where}`).get(params)).n;
    return { entries: rows, total };
  });

  fastify.get('/api/audit/actions', async () => {
    const rows = await db.prepare('SELECT action, COUNT(*) AS n FROM audit GROUP BY action ORDER BY action').all();
    return { actions: rows };
  });

  fastify.get('/api/audit/stats', async () => {
    const byAction = await db.prepare('SELECT action, COUNT(*) AS n FROM audit GROUP BY action').all();
    const total = (await db.prepare('SELECT COUNT(*) AS n FROM audit').get()).n;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = (await db
      .prepare('SELECT COUNT(*) AS n FROM audit WHERE createdAt >= ?')
      .get(today.toISOString())).n;
    return { total, today: todayCount, byAction };
  });

  // Batch ingest of locally-recorded (offline) audit events.
  fastify.post('/api/audit', async (req, reply) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    let inserted = 0;
    for (const evt of events) {
      if (!evt?.action) continue;
      recordAudit({
        id: evt.id,
        userId: evt.userId || req.user.id,
        userName: evt.userName || req.user.name,
        role: evt.role || req.user.role,
        action: evt.action,
        patientId: evt.patientId ?? null,
        subjectType: evt.subjectType ?? null,
        subjectId: evt.subjectId ?? null,
        detail: evt.detail ?? null,
        source: evt.source || 'client',
        createdAt: evt.createdAt || new Date().toISOString(),
      });
      inserted += 1;
    }
    return reply.code(201).send({ inserted });
  });
}
