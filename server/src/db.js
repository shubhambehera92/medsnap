// Database selection: Postgres when a connection string (or Vercel) is present,
// otherwise local SQLite. Both backends share the same async interface:
//   db.prepare(sql) -> { get(params), all(params), run(params) }  (all async)
//   db.exec(sql)                                                  (async)
//
// Backends are dynamically imported so the Vercel bundle never pulls in
// node:sqlite (the SQLite module only exists in the local dev/demo path).

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const usePostgres = connectionString.length > 0;

if (process.env.VERCEL === '1' && !usePostgres) {
  throw new Error('[medsnap] Running on Vercel requires DATABASE_URL (or POSTGRES_URL) — set it in the project env.');
}

const { createPgDb } = usePostgres ? await import('./db-pg.js') : { createPgDb: null };
const { createSqliteDb } = usePostgres ? { createSqliteDb: null } : await import('./db-sqlite.js');

export const db = usePostgres ? createPgDb(connectionString) : createSqliteDb();

/** Parse a JSON column safely. */
export function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Map a raw patient row into an API-friendly object. */
export function toPatient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    dob: row.dob,
    sex: row.sex,
    ward: row.ward,
    mrn: row.mrn,
    diagnosis: row.diagnosis,
    allergies: parseJson(row.allergies, []),
    consent: !!row.consent,
    consentAt: row.consentAt,
    fhirPatientId: row.fhirPatientId,
    fhirSynced: !!row.fhirSynced,
    qrPayload: `medsnap://patient/${row.id}`,
  };
}

/** Map a raw capture row into an API-friendly object (without the heavy image). */
export function toCaptureSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patientId,
    userId: row.userId,
    userName: row.userName,
    type: row.type,
    note: row.note,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    mimeType: row.mimeType,
    thumbnail: row.thumbnail || null,
    sha256: row.sha256,
    sizeBytes: row.sizeBytes,
    syncStatus: row.syncStatus,
    classifier: row.classifierSource
      ? { source: row.classifierSource, confidence: row.classifierConfidence }
      : null,
    fhir: {
      status: row.fhirStatus,
      documentReferenceId: row.fhirDocumentReferenceId,
      binaryId: row.fhirBinaryId,
      error: row.fhirError,
    },
  };
}