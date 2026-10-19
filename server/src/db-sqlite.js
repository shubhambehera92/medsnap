// SQLite backend for local dev / demo mode.
// Exposes the SAME async interface as the Postgres backend (see db-pg.js), so
// route code is backend-agnostic. Queries stay synchronous under the hood via
// node:sqlite; the wrappers just return Promises.

import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DB_PATH, DATA_DIR } from './config.js';
import { TABLES, LEGACY_TABLES, INDEXES, buildCreateSql } from './schema.js';

fs.mkdirSync(DATA_DIR, { recursive: true });

const raw = new DatabaseSync(DB_PATH);

raw.exec('PRAGMA journal_mode = WAL;');

/** Declared column names of an existing table, or null when it does not exist. */
function existingColumns(name) {
  const table = raw
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name);
  if (!table) return null;
  return raw
    .prepare(`PRAGMA table_info("${name}")`)
    .all()
    .map((col) => col.name);
}

/**
 * Idempotent schema creation. A table left over from the legacy API (same name,
 * different columns) is dropped and recreated so the new schema always matches.
 */
function initSchema() {
  for (const legacy of LEGACY_TABLES) {
    raw.exec(`DROP TABLE IF EXISTS "${legacy}";`);
  }
  for (const table of TABLES) {
    const existing = existingColumns(table.name);
    if (existing) {
      const wanted = Object.keys(table.columns);
      const stale = wanted.some((col) => !existing.includes(col));
      if (stale) raw.exec(`DROP TABLE IF EXISTS "${table.name}";`);
    }
    raw.exec(`${buildCreateSql('sqlite', table)};`);
  }
  raw.exec(`${INDEXES.join(';\n')};`);
}

initSchema();

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
