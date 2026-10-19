// Small persistence helpers shared by the routes and the seeder.
// Table/column names are always constants (never user input); only VALUES come
// from request bodies, bound as named parameters.

import { db } from './db.js';

/** Fetch one row by id (or null). */
export function findRow(table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = @id`).get({ id });
}

function applyValues(params, key, value, jsonColumns) {
  if (value === undefined) return null;
  if (jsonColumns.has(key) && value !== null) return JSON.stringify(value);
  return value;
}

/**
 * Apply a Partial<T> patch to a row. Unknown keys (and `id`) are ignored.
 * Returns the updated row, or null when the id does not exist.
 */
export async function patchRow(table, id, patch, columns, jsonColumns = []) {
  const json = new Set(jsonColumns);
  const sets = [];
  const params = { id };
  for (const key of Object.keys(patch && typeof patch === 'object' ? patch : {})) {
    if (key === 'id' || !columns.includes(key)) continue;
    sets.push(`${key} = @${key}`);
    params[key] = applyValues(params, key, patch[key], json);
  }
  if (sets.length > 0) {
    await db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = @id`).run(params);
  }
  return findRow(table, id);
}

/**
 * Insert or update (upsert by id) a full row. `values` holds the entity;
 * only whitelisted columns are persisted, everything else is ignored.
 * Returns the stored row.
 */
export async function upsertRow(table, values, columns, jsonColumns = []) {
  const json = new Set(jsonColumns);
  const params = {};
  for (const key of columns) {
    params[key] = applyValues(params, key, values ? values[key] : undefined, json);
  }
  const names = columns.join(', ');
  const placeholders = columns.map((c) => `@${c}`).join(', ');
  const updates = columns
    .filter((c) => c !== 'id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  await db
    .prepare(
      `INSERT INTO ${table} (${names}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${updates}`
    )
    .run(params);
  return findRow(table, params.id);
}

/**
 * Delete a row by id. Returns the deleted row, or null when it did not exist.
 * (Read-then-delete keeps the same return shape across both backends.)
 */
export async function deleteRow(table, id) {
  const existing = await findRow(table, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM ${table} WHERE id = @id`).run({ id });
  return existing;
}
