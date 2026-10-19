import { db } from '../db.js';
import { toUser } from '../mappers.js';
import { patchRow } from '../repo.js';
import { writable } from '../columns.js';

const USER_COLUMNS = writable('users');

export default async function usersRoutes(fastify) {
  fastify.get('/api/users', async () => {
    const rows = await db.prepare('SELECT * FROM users').all();
    return { users: rows.map(toUser) };
  });

  fastify.patch('/api/users/:id', async (req, reply) => {
    const row = await patchRow('users', req.params.id, req.body, USER_COLUMNS);
    if (!row) return reply.code(404).send({ error: 'User not found' });
    return { user: toUser(row) };
  });
}
