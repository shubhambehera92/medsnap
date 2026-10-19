import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { toPhoto } from '../mappers.js';
import { findRow, patchRow, upsertRow, deleteRow } from '../repo.js';
import { COLUMNS, JSON_COLUMNS, writable } from '../columns.js';

const PHOTO_COLUMNS = writable('photos');

export default async function photoRoutes(fastify) {
  fastify.get('/api/photos', async () => {
    const rows = await db.prepare('SELECT * FROM photos ORDER BY takenAt DESC').all();
    return { photos: rows.map(toPhoto) };
  });

  fastify.get('/api/photos/:id', async (req, reply) => {
    const row = await findRow('photos', req.params.id);
    if (!row) return reply.code(404).send({ error: 'Photo not found' });
    return { photo: toPhoto(row) };
  });

  // Upsert by id; the server generates id/takenAt when the client omits them.
  fastify.post('/api/photos', async (req, reply) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const values = {
      ...body,
      id: body.id || randomUUID(),
      takenAt: body.takenAt || new Date().toISOString(),
    };
    const row = await upsertRow('photos', values, COLUMNS.photos, JSON_COLUMNS.photos);
    return reply.code(201).send({ photo: toPhoto(row) });
  });

  fastify.patch('/api/photos/:id', async (req, reply) => {
    const row = await patchRow('photos', req.params.id, req.body, PHOTO_COLUMNS, JSON_COLUMNS.photos);
    if (!row) return reply.code(404).send({ error: 'Photo not found' });
    return { photo: toPhoto(row) };
  });

  // Permanently remove a capture (the caller logs the reason to the audit trail).
  fastify.delete('/api/photos/:id', async (req, reply) => {
    const row = await deleteRow('photos', req.params.id);
    if (!row) return reply.code(404).send({ error: 'Photo not found' });
    return reply.code(204).send();
  });
}
