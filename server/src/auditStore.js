import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const insertStmt = db.prepare(`
  INSERT INTO audit
    (id, userId, userName, role, action, patientId, subjectType, subjectId, detail, source, createdAt)
  VALUES
    (@id, @userId, @userName, @role, @action, @patientId, @subjectType, @subjectId, @detail, @source, @createdAt)
  ON CONFLICT (id) DO NOTHING
`);

/** Persist one audit event. Never throws — auditing must not break the request. */
export function recordAudit(event) {
  try {
    insertStmt
      .run({
        id: event.id || randomUUID(),
        userId: event.userId ?? null,
        userName: event.userName ?? null,
        role: event.role ?? null,
        action: event.action,
        patientId: event.patientId ?? null,
        subjectType: event.subjectType ?? null,
        subjectId: event.subjectId ?? null,
        detail: event.detail ? String(event.detail).slice(0, 500) : null,
        source: event.source || 'server',
        createdAt: event.createdAt || new Date().toISOString(),
      })
      .catch((err) => console.error('[audit] failed to record', err?.message));
  } catch (err) {
    console.error('[audit] failed to record', err?.message);
  }
}