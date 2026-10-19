import { randomUUID } from 'node:crypto';
import { db, toCaptureSummary, toPatient } from '../db.js';
import { recordAudit } from '../auditStore.js';
import { createFhirDocumentReference } from '../fhir.js';
import { verifyToken } from '../auth.js';

const VALID_TYPES = new Set(['Wound', 'Medicine label']);

/** Auth via Bearer header OR ?token= (so <img> tags can load protected images). */
async function authHeaderOrQuery(req, reply) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  const bearer = scheme === 'Bearer' ? token : null;
  const payload = verifyToken(bearer || req.query.token || '');
  if (!payload) return reply.code(401).send({ error: 'Unauthorized' });
  req.user = { id: payload.sub, name: payload.name, role: payload.role };
}

/** Push one stored capture to the mock EHR (HAPI FHIR). Best-effort + persisted. */
export async function pushToFhir(captureId) {
  const row = await db.prepare('SELECT * FROM captures WHERE id = ?').get(captureId);
  if (!row) return { ok: false, error: 'Capture not found' };
  if (!row.imageBase64) {
    await db.prepare("UPDATE captures SET fhirStatus = 'failed', fhirError = ? WHERE id = ?").run(
      'No image data stored (seeded sample)',
      captureId
    );
    return { ok: false, error: 'No image data' };
  }
  const patientRow = await db.prepare('SELECT * FROM patients WHERE id = ?').get(row.patientId);
  if (!patientRow) return { ok: false, error: 'Patient not found' };

  const result = await createFhirDocumentReference({
    patient: toPatient(patientRow),
    capture: {
      id: row.id,
      type: row.type,
      note: row.note,
      createdAt: row.createdAt,
      mimeType: row.mimeType,
      imageBase64: row.imageBase64,
      sha256: row.sha256,
      sizeBytes: row.sizeBytes,
    },
  });

  if (result.ok) {
    await db.prepare(
      `UPDATE captures
         SET fhirStatus = 'created', fhirDocumentReferenceId = ?, fhirBinaryId = ?, fhirError = NULL
       WHERE id = ?`
    ).run(result.documentReferenceId, result.binaryId, captureId);
    // Remember the FHIR patient id so later captures reference the same patient.
    if (result.patientId && result.patientId !== patientRow.fhirPatientId) {
      await db.prepare('UPDATE patients SET fhirPatientId = ?, fhirSynced = ? WHERE id = ?').run(
        result.patientId,
        true,
        patientRow.id
      );
    }
  } else {
    await db.prepare("UPDATE captures SET fhirStatus = 'failed', fhirError = ? WHERE id = ?").run(
      String(result.error || 'Unknown error').slice(0, 400),
      captureId
    );
  }
  return result;
}

export default async function captureRoutes(fastify) {
  // ---- Protected image stream (header or token query) --------------------
  fastify.get('/api/captures/:id/image', { preHandler: authHeaderOrQuery }, async (req, reply) => {
    const row = await db.prepare('SELECT * FROM captures WHERE id = ?').get(req.params.id);
    if (!row) return reply.code(404).send({ error: 'Capture not found' });

    recordAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: 'view',
      patientId: row.patientId,
      subjectType: 'capture',
      subjectId: row.id,
      detail: `Viewed ${row.type} capture`,
    });

    if (row.imageBase64) {
      const buffer = Buffer.from(row.imageBase64, 'base64');
      return reply.header('Content-Type', row.mimeType || 'image/jpeg').send(buffer);
    }
    // Seeded sample → serve its SVG thumbnail.
    if (row.thumbnail?.startsWith('data:')) {
      const [meta, data] = row.thumbnail.split(',');
      const mime = meta.slice(5).replace(';base64', '');
      return reply
        .header('Content-Type', mime)
        .send(decodeURIComponent(data));
    }
    return reply.code(404).send({ error: 'No image data' });
  });

  // ---- Everything below requires a Bearer token --------------------------
  await fastify.register(async (secured) => {
    secured.addHook('preHandler', fastify.authenticate);

    // Create a capture (image uploaded from the client vault during sync).
    secured.post('/api/captures', async (req, reply) => {
      const b = req.body || {};
      const type = VALID_TYPES.has(b.type) ? b.type : null;
      if (!type) return reply.code(400).send({ error: 'type must be "Wound" or "Medicine label"' });
      if (!b.patientId) return reply.code(400).send({ error: 'patientId is required' });
      if (!b.imageBase64 || typeof b.imageBase64 !== 'string') {
        return reply.code(400).send({ error: 'imageBase64 is required' });
      }

      const patientRow = await db.prepare('SELECT * FROM patients WHERE id = ?').get(b.patientId);
      if (!patientRow) return reply.code(404).send({ error: 'Patient not found' });
      if (!patientRow.consent) {
        recordAudit({
          userId: req.user.id,
          userName: req.user.name,
          role: req.user.role,
          action: 'capture_blocked',
          patientId: patientRow.id,
          subjectType: 'patient',
          subjectId: patientRow.id,
          detail: 'Upload rejected: patient consent not granted',
        });
        return reply.code(403).send({ error: 'Patient consent not granted — capture blocked' });
      }

      const id = b.id || randomUUID();
      const createdAt = b.createdAt || new Date().toISOString();
      const expiresAt = b.expiresAt || new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      const sizeBytes = b.sizeBytes || Math.floor((b.imageBase64.length * 3) / 4);

      await db.prepare(
        `INSERT INTO captures
          (id, patientId, userId, userName, type, note, createdAt, expiresAt, mimeType,
           imageBase64, thumbnail, sha256, sizeBytes, syncStatus, classifierSource,
           classifierConfidence, fhirStatus)
         VALUES
          (@id, @patientId, @userId, @userName, @type, @note, @createdAt, @expiresAt, @mimeType,
           @imageBase64, NULL, @sha256, @sizeBytes, 'synced', @classifierSource,
           @classifierConfidence, 'pending')
         ON CONFLICT (id) DO UPDATE SET
           patientId = excluded.patientId, userId = excluded.userId, userName = excluded.userName,
           type = excluded.type, note = excluded.note, createdAt = excluded.createdAt,
           expiresAt = excluded.expiresAt, mimeType = excluded.mimeType,
           imageBase64 = excluded.imageBase64, sha256 = excluded.sha256, sizeBytes = excluded.sizeBytes,
           syncStatus = excluded.syncStatus, classifierSource = excluded.classifierSource,
           classifierConfidence = excluded.classifierConfidence, fhirStatus = excluded.fhirStatus`
      ).run({
        id,
        patientId: patientRow.id,
        userId: req.user.id,
        userName: req.user.name,
        type,
        note: b.note ? String(b.note).slice(0, 400) : null,
        createdAt,
        expiresAt,
        mimeType: b.mimeType || 'image/jpeg',
        imageBase64: b.imageBase64,
        sha256: b.sha256 || null,
        sizeBytes,
        classifierSource: b.classifier?.source || null,
        classifierConfidence: b.classifier?.confidence ?? null,
      });

      recordAudit({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'sync',
        patientId: patientRow.id,
        subjectType: 'capture',
        subjectId: id,
        detail: `Uploaded ${type} capture (${(sizeBytes / 1024).toFixed(0)} KB) to MedSnap vault`,
      });

      // On serverless the function can be frozen the moment the response is sent,
      // so post-response background work (the FHIR upload) is unreliable. Await it
      // here with a short cap: typical HAPI round-trips (~1-3s) finish inside the
      // request; if HAPI is slow we respond anyway with status 'pending' and the
      // Sync screen / fhir-retry endpoint can finish the job later.
      await Promise.race([
        pushToFhir(id).catch((err) => console.error('[fhir] background push failed', err?.message)),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ]);

      const saved = await db.prepare('SELECT * FROM captures WHERE id = ?').get(id);
      return reply.code(201).send({ capture: toCaptureSummary(saved) });
    });

    // List / timeline with filters.
    secured.get('/api/captures', async (req) => {
      const { patientId, type, syncStatus, from, to } = req.query;
      const clauses = [];
      const params = {};
      if (patientId) {
        clauses.push('patientId = @patientId');
        params.patientId = patientId;
      }
      if (type) {
        clauses.push('type = @type');
        params.type = type;
      }
      if (syncStatus) {
        clauses.push('syncStatus = @syncStatus');
        params.syncStatus = syncStatus;
      }
      if (from) {
        clauses.push('createdAt >= @from');
        params.from = from;
      }
      if (to) {
        clauses.push('createdAt <= @to');
        params.to = to;
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const rows = await db
        .prepare(`SELECT * FROM captures ${where} ORDER BY createdAt DESC LIMIT ${limit}`)
        .all(params);
      // Never ship raw image bytes in the list payload.
      return { captures: rows.map(toCaptureSummary) };
    });

    secured.get('/api/captures/:id', async (req, reply) => {
      const row = await db.prepare('SELECT * FROM captures WHERE id = ?').get(req.params.id);
      if (!row) return reply.code(404).send({ error: 'Capture not found' });
      return { capture: toCaptureSummary(row) };
    });

    secured.delete('/api/captures/:id', async (req, reply) => {
      const row = await db.prepare('SELECT * FROM captures WHERE id = ?').get(req.params.id);
      if (!row) return reply.code(404).send({ error: 'Capture not found' });
      await db.prepare('DELETE FROM captures WHERE id = ?').run(req.params.id);
      recordAudit({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'delete',
        patientId: row.patientId,
        subjectType: 'capture',
        subjectId: row.id,
        detail: `Deleted ${row.type} capture (retention/admin)`,
      });
      return { ok: true };
    });

    // Retry a failed FHIR push.
    secured.post('/api/captures/:id/fhir-retry', async (req, reply) => {
      const row = await db.prepare('SELECT * FROM captures WHERE id = ?').get(req.params.id);
      if (!row) return reply.code(404).send({ error: 'Capture not found' });
      const result = await pushToFhir(row.id);
      recordAudit({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'fhir_retry',
        patientId: row.patientId,
        subjectType: 'capture',
        subjectId: row.id,
        detail: result.ok ? `FHIR document created (${result.documentReferenceId})` : `FHIR retry failed: ${result.error}`,
      });
      const updated = await db.prepare('SELECT * FROM captures WHERE id = ?').get(row.id);
      return { result, capture: toCaptureSummary(updated) };
    });
  });
}