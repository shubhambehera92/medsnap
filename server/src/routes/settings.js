import { toSettings } from '../mappers.js';
import { findRow, upsertRow } from '../repo.js';
import { writable } from '../columns.js';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '../defaults.js';

const SETTINGS_COLUMNS = writable('settings');

/** The single settings row, falling back to the demo defaults when absent. */
async function loadSettings() {
  const row = await findRow('settings', SETTINGS_ID);
  return row ? toSettings(row) : { ...DEFAULT_SETTINGS };
}

export default async function settingsRoutes(fastify) {
  fastify.get('/api/settings', async () => ({ settings: await loadSettings() }));

  fastify.put('/api/settings', async (req) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const merged = { ...(await loadSettings()) };
    for (const key of SETTINGS_COLUMNS) {
      if (body[key] !== undefined) merged[key] = body[key];
    }
    const row = await upsertRow(
      'settings',
      { id: SETTINGS_ID, ...merged },
      ['id', ...SETTINGS_COLUMNS],
      []
    );
    return { settings: toSettings(row) };
  });
}
