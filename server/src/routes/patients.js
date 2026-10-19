import { db } from '../db.js';
import { toPatient } from '../mappers.js';
import { findRow, patchRow } from '../repo.js';
import { writable } from '../columns.js';

const PATIENT_COLUMNS = writable('patients');

export default async function patientRoutes(fastify) {
  fastify.get('/api/patients', async () => {
    const rows = await db.prepare('SELECT * FROM patients ORDER BY name').all();
    return { patients: rows.map(toPatient) };
  });

  fastify.get('/api/patients/:id', async (req, reply) => {
    const row = await findRow('patients', req.params.id);
    if (!row) return reply.code(404).send({ error: 'Patient not found' });
    return { patient: toPatient(row) };
  });

  fastify.patch('/api/patients/:id', async (req, reply) => {
    const row = await patchRow('patients', req.params.id, req.body, PATIENT_COLUMNS);
    if (!row) return reply.code(404).send({ error: 'Patient not found' });
    return { patient: toPatient(row) };
  });
}
