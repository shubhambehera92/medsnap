// SQLite backend for local dev / demo mode.
// Exposes the SAME async interface as the Postgres backend (see db-pg.js), so
// route code is backend-agnostic. Queries stay synchronous under the hood via
// node:sqlite; the wrappers just return Promises.

import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DB_PATH, DATA_DIR } from './config.js';

fs.mkdirSync(DATA_DIR, { recursive: true });

const raw = new DatabaseSync(DB_PATH);

raw.exec(`
  PRAGMA journal_mode = WAL;

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
    consent       INTEGER NOT NULL DEFAULT 0,
    consentAt     TEXT,
    fhirPatientId TEXT,
    fhirSynced    INTEGER NOT NULL DEFAULT 0,
    createdAt     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS captures (
    id                       TEXT PRIMARY KEY,
    patientId                TEXT NOT NULL,
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
    sizeBytes                INTEGER,
    syncStatus               TEXT NOT NULL DEFAULT 'synced',
    classifierSource         TEXT,
    classifierConfidence     REAL,
    fhirDocumentReferenceId  TEXT,
    fhirBinaryId             TEXT,
    fhirStatus               TEXT NOT NULL DEFAULT 'pending',
    fhirError                TEXT,
    FOREIGN KEY (patientId) REFERENCES patients(id)
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
`);

/** Normalise JS booleans to SQLite integers and undefined to NULL. */
function convertValue(value) {
  if (value === true) return 1;
  if (value === false) return 0;
  if (value === undefined) return null;
  return value;
}

/** Accepts a named-params object OR positional array/scalar values. */
function bindArgs(args) {
  if (args.length === 0) return {};
  if (args.length === 1) {
    const value = args[0];
    if (value === undefined || value === null) return {};
    if (Array.isArray(value)) return value.map(convertValue);
    if (typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = convertValue(v);
      return out;
    }
    return [convertValue(value)];
  }
  return args.map(convertValue);
}

function prepare(sql) {
  const stmt = raw.prepare(sql);
  return {
    get(...args) {
      try {
        const bound = bindArgs(args);
        const row = Array.isArray(bound) ? stmt.get(...bound) : stmt.get(bound);
        return Promise.resolve(row ?? null);
      } catch (err) {
        return Promise.reject(err);
      }
    },
    all(...args) {
      try {
        const bound = bindArgs(args);
        const rows = Array.isArray(bound) ? stmt.all(...bound) : stmt.all(bound);
        return Promise.resolve(rows);
      } catch (err) {
        return Promise.reject(err);
      }
    },
    run(...args) {
      try {
        const bound = bindArgs(args);
        const res = Array.isArray(bound) ? stmt.run(...bound) : stmt.run(bound);
        return Promise.resolve({ changes: Number(res.changes ?? 0), lastInsertRowid: res.lastInsertRowid ?? null });
      } catch (err) {
        return Promise.reject(err);
      }
    },
  };
}

function exec(sql) {
  try {
    raw.exec(sql);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

export function createSqliteDb() {
  return { prepare, exec };
}