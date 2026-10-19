// Postgres backend for Vercel (Neon / Vercel Postgres).
// Mirrors the async interface of db-sqlite.js so route code is identical.
// Named params (@foo) and anonymous params (?) are rewritten to $n positions.

import pg from 'pg';

const { Pool } = pg;

// COUNT(*) / BIGINT columns come back as strings by default; treat them as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

/**
 * pg lets the URL's own `sslmode`/`ssl` params override the Pool `ssl` config
 * (ConnectionParameters merges parse(connectionString) over the config object).
 * Providers like Supabase ship `?sslmode=require`, which would re-enable cert
 * verification and break rejectUnauthorized:false. Strip those params so our
 * explicit SSL config is the only one pg sees.
 */
function sanitizeConnectionString(url) {
  try {
    const parsed = new URL(url);
    for (const key of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey']) parsed.searchParams.delete(key);
    return parsed.toString();
  } catch {
    return url; // unparseable → let pg try as-is
  }
}

export function createPgDb(connectionString) {
  if (!connectionString) {
    throw new Error(
      '[db-pg] No Postgres connection string. Set DATABASE_URL (or POSTGRES_URL) before running in Vercel mode.'
    );
  }

  const pool = new Pool({
    connectionString: sanitizeConnectionString(connectionString),
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => console.error('[db-pg] idle client error', err?.message));

  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS users (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      role      TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      dob           TEXT,
      sex           TEXT,
      ward          TEXT,
      mrn           TEXT,
      diagnosis     TEXT,
      allergies     TEXT,
      consent       BOOLEAN NOT NULL DEFAULT FALSE,
      consentAt     TEXT,
      fhirPatientId TEXT,
      fhirSynced    BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS captures (
      id                       TEXT PRIMARY KEY,
      patientId                TEXT NOT NULL REFERENCES patients(id),
      userId                   TEXT,
      userName                 TEXT,
      type                     TEXT NOT NULL,
      note                     TEXT,
      createdAt                TEXT NOT NULL,
      expiresAt                TEXT,
      mimeType                 TEXT,
      imageBase64              TEXT,
      thumbnail                TEXT,
      sha256                   TEXT,
      sizeBytes                BIGINT,
      syncStatus               TEXT NOT NULL DEFAULT 'synced',
      classifierSource         TEXT,
      classifierConfidence     DOUBLE PRECISION,
      fhirDocumentReferenceId  TEXT,
      fhirBinaryId             TEXT,
      fhirStatus               TEXT NOT NULL DEFAULT 'pending',
      fhirError                TEXT
    );

    CREATE TABLE IF NOT EXISTS audit (
      id          TEXT PRIMARY KEY,
      userId      TEXT,
      userName    TEXT,
      role        TEXT,
      action      TEXT NOT NULL,
      patientId   TEXT,
      subjectType TEXT,
      subjectId   TEXT,
      detail      TEXT,
      source      TEXT DEFAULT 'server',
      createdAt   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_captures_patient ON captures (patientId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_captures_sync ON captures (syncStatus);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit (createdAt);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit (action);
    CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit (patientId);
  `;

  /** Ensure tables/indexes exist before the first query (idempotent). */
  const ready = (async () => {
    for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
      await pool.query(statement);
    }
  })().catch((err) => {
    console.error('[db-pg] schema init failed', err?.message);
    throw err;
  });

  /** Rewrite @named and ? placeholders to $1..$N. */
  function rewriteSql(sql) {
    const keys = new Map();
    let anon = 0;
    const text = sql.replace(/(@[A-Za-z0-9_]+)|\?/g, (token, named) => {
      if (named) {
        const name = named.slice(1);
        if (!keys.has(name)) keys.set(name, keys.size + 1);
        return `$${keys.get(name)}`;
      }
      anon += 1;
      return `$${anon}`;
    });
    return { text, keys };
  }

  function toArgs({ keys }, args) {
    if (args.length === 0) return [];
    const params = args.length === 1 ? args[0] : args;
    if (params === undefined || params === null) return [];
    if (typeof params === 'object' && !Array.isArray(params)) {
      const out = new Array(keys.size).fill(null);
      for (const [name, index] of keys) out[index - 1] = params[name] ?? null;
      return out;
    }
    const list = Array.isArray(params) ? params : [params];
    return list.map((v) => (v === undefined ? null : v));
  }

  /**
   * Postgres folds unquoted identifiers to lowercase (syncStatus → syncstatus),
   * so SELECT * rows come back with lowercase keys while the rest of the app
   * reads camelCase (row.syncStatus / row.imageBase64 …). Add back the
   * camelCase aliases so mappers and routes behave identically on both backends.
   */
  const ROW_CASE = {
    patientId: 'patientid',
    userId: 'userid',
    userName: 'username',
    createdAt: 'createdat',
    consentAt: 'consentat',
    expiresAt: 'expiresat',
    mimeType: 'mimetype',
    sizeBytes: 'sizebytes',
    syncStatus: 'syncstatus',
    imageBase64: 'imagebase64',
    classifierSource: 'classifiersource',
    classifierConfidence: 'classifierconfidence',
    fhirPatientId: 'fhirpatientid',
    fhirSynced: 'fhirsynced',
    fhirDocumentReferenceId: 'fhirdocumentreferenceid',
    fhirBinaryId: 'fhirbinaryid',
    fhirStatus: 'fhirstatus',
    fhirError: 'fhirerror',
    subjectType: 'subjecttype',
    subjectId: 'subjectid',
  };
  const hydrateCamelCase = (row) => {
    if (!row) return row;
    for (const [camel, lower] of Object.entries(ROW_CASE)) {
      if (lower in row) row[camel] = row[lower];
    }
    return row;
  };

  function prepare(sql) {
    const rewritten = rewriteSql(sql);
    return {
      async get(...args) {
        await ready;
        const { rows } = await pool.query(rewritten.text, toArgs(rewritten, args));
        return hydrateCamelCase(rows[0] ?? null);
      },
      async all(...args) {
        await ready;
        const { rows } = await pool.query(rewritten.text, toArgs(rewritten, args));
        return rows.map(hydrateCamelCase);
      },
      async run(...args) {
        await ready;
        const result = await pool.query(rewritten.text, toArgs(rewritten, args));
        return { changes: result.rowCount ?? 0, lastInsertRowid: null };
      },
    };
  }

  async function exec(sql) {
    await ready;
    for (const statement of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      await pool.query(statement);
    }
  }

  return { prepare, exec };
}