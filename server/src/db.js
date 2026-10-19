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

/** Which backend is active — reported by GET /api/health. */
export const dbKind = usePostgres ? 'postgres' : 'sqlite';

/** Parse a JSON column safely. */
export function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
