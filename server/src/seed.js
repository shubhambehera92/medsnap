import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { PATIENTS, sampleCaptures } from './seedData.js';
import { recordAudit } from './auditStore.js';

const insertPatient = db.prepare(`
  INSERT INTO patients
    (id, name, dob, sex, ward, mrn, diagnosis, allergies, consent, consentAt, fhirPatientId, fhirSynced, createdAt)
  VALUES
    (@id, @name, @dob, @sex, @ward, @mrn, @diagnosis, @allergies, @consent, @consentAt, @fhirPatientId, @fhirSynced, @createdAt)
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name, dob = excluded.dob, sex = excluded.sex, ward = excluded.ward,
    mrn = excluded.mrn, diagnosis = excluded.diagnosis, allergies = excluded.allergies,
    consent = excluded.consent, consentAt = excluded.consentAt,
    fhirPatientId = excluded.fhirPatientId, fhirSynced = excluded.fhirSynced,
    createdAt = excluded.createdAt
`);

const insertCapture = db.prepare(`
  INSERT INTO captures
    (id, patientId, userId, userName, type, note, createdAt, expiresAt, mimeType, imageBase64, thumbnail,
     sha256, sizeBytes, syncStatus, classifierSource, classifierConfidence,
     fhirDocumentReferenceId, fhirBinaryId, fhirStatus, fhirError)
  VALUES
    (@id, @patientId, @userId, @userName, @type, @note, @createdAt, @expiresAt, @mimeType, @imageBase64, @thumbnail,
     @sha256, @sizeBytes, @syncStatus, @classifierSource, @classifierConfidence,
     @fhirDocumentReferenceId, @fhirBinaryId, @fhirStatus, @fhirError)
  ON CONFLICT (id) DO UPDATE SET
    patientId = excluded.patientId, userId = excluded.userId, userName = excluded.userName,
    type = excluded.type, note = excluded.note, createdAt = excluded.createdAt,
    expiresAt = excluded.expiresAt, mimeType = excluded.mimeType, imageBase64 = excluded.imageBase64,
    thumbnail = excluded.thumbnail, sha256 = excluded.sha256, sizeBytes = excluded.sizeBytes,
    syncStatus = excluded.syncStatus, classifierSource = excluded.classifierSource,
    classifierConfidence = excluded.classifierConfidence,
    fhirDocumentReferenceId = excluded.fhirDocumentReferenceId, fhirBinaryId = excluded.fhirBinaryId,
    fhirStatus = excluded.fhirStatus, fhirError = excluded.fhirError
`);

function seedAuditForCaptures(captures) {
  for (const c of captures) {
    recordAudit({
      id: randomUUID(),
      userId: c.userId,
      userName: c.userName,
      role: c.userId.startsWith('dr') ? 'Doctor' : 'Nurse',
      action: 'capture',
      patientId: c.patientId,
      subjectType: 'capture',
      subjectId: c.id,
      detail: `Captured ${c.type}${c.note ? ` — ${c.note}` : ''}`,
      source: 'seed',
      createdAt: c.createdAt,
    });
    recordAudit({
      id: randomUUID(),
      userId: c.userId,
      userName: c.userName,
      role: c.userId.startsWith('dr') ? 'Doctor' : 'Nurse',
      action: 'sync',
      patientId: c.patientId,
      subjectType: 'capture',
      subjectId: c.id,
      detail: 'Synced to MedSnap vault + FHIR DocumentReference',
      source: 'seed',
      createdAt: c.createdAt,
    });
  }
  // A few extra events so the audit dashboard has variety on first load.
  const now = new Date();
  const extra = [
    ['share', 'Share link generated for ward 3B handover', 'dr-chen', 'Dr. Chen', 'Doctor'],
    ['export', 'Exported timeline PDF for P-1001', 'nurse-priya', 'Nurse Priya', 'Nurse'],
    ['view', 'Viewed wound capture for P-1001', 'nurse-priya', 'Nurse Priya', 'Nurse'],
  ];
  extra.forEach(([action, detail, userId, userName, role], i) => {
    recordAudit({
      userId,
      userName,
      role,
      action,
      patientId: 'P-1001',
      subjectType: 'patient',
      subjectId: 'P-1001',
      detail,
      source: 'seed',
      createdAt: new Date(now.getTime() - (i + 1) * 36e5).toISOString(),
    });
  });
}

/** Insert demo data. No-op if patients already exist unless `reset` is true. */
export async function seed({ reset = false } = {}) {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM patients').get();
  if (existing?.n > 0 && !reset) {
    return { seeded: false, patients: Number(existing.n) };
  }
  if (reset) {
    await db.exec('DELETE FROM captures; DELETE FROM patients; DELETE FROM audit;');
  }

  const now = new Date().toISOString();
  for (const p of PATIENTS) {
    await insertPatient.run({
      id: p.id,
      name: p.name,
      dob: p.dob,
      sex: p.sex,
      ward: p.ward,
      mrn: p.mrn,
      diagnosis: p.diagnosis,
      allergies: JSON.stringify(p.allergies || []),
      consent: !!p.consent,
      consentAt: p.consent ? now : null,
      fhirPatientId: p.fhirPatientId,
      fhirSynced: false,
      createdAt: now,
    });
  }

  const captures = sampleCaptures();
  for (const c of captures) {
    await insertCapture.run({
      id: c.id,
      patientId: c.patientId,
      userId: c.userId,
      userName: c.userName,
      type: c.type,
      note: c.note,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt,
      mimeType: c.mimeType,
      imageBase64: c.imageBase64,
      thumbnail: c.thumbnail,
      sha256: c.sha256,
      sizeBytes: c.sizeBytes,
      syncStatus: c.syncStatus,
      classifierSource: c.classifierSource,
      classifierConfidence: c.classifierConfidence,
      fhirDocumentReferenceId: c.fhirDocumentReferenceId,
      fhirBinaryId: c.fhirBinaryId,
      fhirStatus: c.fhirStatus,
      fhirError: null,
    });
  }
  seedAuditForCaptures(captures);

  return { seeded: true, patients: PATIENTS.length, captures: captures.length };
}

/** Called at server boot: seed only when the database is empty. */
export async function ensureSeed() {
  return seed({ reset: false });
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  try {
    const result = await seed({ reset: process.argv.includes('--reset') });
    console.log('[seed]', result);
    if (result.seeded) {
      console.log('[seed] Demo patients: P-1001 (consent), P-1002 (consent), P-1003 (NO consent)');
    }
  } catch (err) {
    console.error('[seed] failed', err);
    process.exit(1);
  }
}