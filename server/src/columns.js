// Column whitelists derived from the shared schema, so routes never drift from
// the table definitions. `id` is included (upserts need it); patches filter it.

import { TABLES, columnNames } from './schema.js';

export const COLUMNS = Object.fromEntries(TABLES.map((table) => [table.name, columnNames(table)]));

export const JSON_COLUMNS = Object.fromEntries(TABLES.map((table) => [table.name, table.json || []]));

/** Writable columns (everything but the primary key). */
export function writable(table) {
  return COLUMNS[table].filter((column) => column !== 'id');
}
