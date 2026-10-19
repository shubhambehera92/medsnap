import { db } from '../db.js';
import { toDevice } from '../mappers.js';
import { patchRow } from '../repo.js';
import { writable } from '../columns.js';

const DEVICE_COLUMNS = writable('devices');

export default async function deviceRoutes(fastify) {
  fastify.get('/api/devices', async () => {
    const rows = await db.prepare('SELECT * FROM devices ORDER BY id').all();
    return { devices: rows.map(toDevice) };
  });

  fastify.patch('/api/devices/:id', async (req, reply) => {
    const row = await patchRow('devices', req.params.id, req.body, DEVICE_COLUMNS);
    if (!row) return reply.code(404).send({ error: 'Device not found' });
    return { device: toDevice(row) };
  });
}
