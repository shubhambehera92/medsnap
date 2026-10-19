import { db, toPatient } from '../db.js';
import { recordAudit } from '../auditStore.js';
import { createFhirPatient } from '../fhir.js';

/** Extract a case id from a QR payload: `medsnap://patient/P-1001`, `P-1001`, or a URL. */
export function parsePatientCode(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  const patterns = [
    /medsnap:\/\/patient\/([A-Za-z0-9-]+)/i,
    /medsnap:patient:([A-Za-z0-9-]+)/i,
    /[?&]patient=([A-Za-z0-9-]+)/i,
    /^([A-Za-z0-9-]+)$/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

export default async function patientRoutes(fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/api/patients', async () => {
    const rows = await db.prepare('SELECT * FROM patients ORDER BY name').all();
    return { patients: rows.map(toPatient) };
  });

  // Resolve a scanned QR / typed case id. Logs a "scan" audit event on success.
  fastify.get('/api/patients/resolve', async (req, reply) => {
    const code = parsePatientCode(req.query.code);
    if (!code) return reply.code(400).send({ error: 'Unrecognised QR payload' });
    const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(code);
    if (!row) return reply.code(404).send({ error: `No patient found for "${code}"` });
    const patient = toPatient(row);
    recordAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: 'scan',
      patientId: patient.id,
      subjectType: 'patient',
      subjectId: patient.id,
      detail: `Scanned wristband for ${patient.name} (consent ${patient.consent ? 'granted' : 'NOT granted'})`,
    });
    return { patient };
  });

  fastify.get('/api/patients/:id', async (req, reply) => {
    const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!row) return reply.code(404).send({ error: 'Patient not found' });
    return { patient: toPatient(row) };
  });

  // Demo convenience: toggle consent so a presenter can show the block and then the allow.
  fastify.post('/api/patients/:id/consent', async (req, reply) => {
    const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!row) return reply.code(404).send({ error: 'Patient not found' });
    const consent = req.body?.consent ? true : false;
    const consentAt = consent ? new Date().toISOString() : null;
    await db.prepare('UPDATE patients SET consent = ?, consentAt = ? WHERE id = ?').run(consent, consentAt, req.params.id);

    recordAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: consent ? 'consent_granted' : 'consent_revoked',
      patientId: row.id,
      subjectType: 'patient',
      subjectId: row.id,
      detail: `Consent ${consent ? 'granted' : 'revoked'} for ${row.name}`,
    });

    const updated = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    return { patient: toPatient(updated) };
  });

  // Best-effort: push the patient into the mock EHR.
  fastify.post('/api/patients/:id/fhir-sync', async (req, reply) => {
    const row = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!row) return reply.code(404).send({ error: 'Patient not found' });
    const patient = toPatient(row);
    const result = await createFhirPatient(patient);
    if (result.ok) {
      await db.prepare('UPDATE patients SET fhirPatientId = ?, fhirSynced = ? WHERE id = ?').run(result.id, true, patient.id);
    }
    recordAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: 'fhir_patient_sync',
      patientId: patient.id,
      subjectType: 'patient',
      subjectId: patient.id,
      detail: result.ok ? `Patient synced to FHIR (${result.id})` : `FHIR patient sync failed: ${result.error}`,
    });
    return result;
  });
}
