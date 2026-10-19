import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { toChatMessage, toChatThread } from '../mappers.js';
import { patchRow, upsertRow } from '../repo.js';
import { COLUMNS, JSON_COLUMNS, writable } from '../columns.js';

const THREAD_COLUMNS = writable('chat_threads');

export default async function chatRoutes(fastify) {
  fastify.get('/api/chat/threads', async () => {
    const rows = await db.prepare('SELECT * FROM chat_threads ORDER BY lastMessageAt DESC').all();
    return { threads: rows.map(toChatThread) };
  });

  fastify.patch('/api/chat/threads/:id', async (req, reply) => {
    const row = await patchRow('chat_threads', req.params.id, req.body, THREAD_COLUMNS, JSON_COLUMNS.chat_threads);
    if (!row) return reply.code(404).send({ error: 'Thread not found' });
    return { thread: toChatThread(row) };
  });

  fastify.get('/api/chat/messages', async (req) => {
    const threadId = req.query?.threadId;
    const rows = threadId
      ? await db
          .prepare('SELECT * FROM chat_messages WHERE threadId = @threadId ORDER BY timestamp ASC')
          .all({ threadId })
      : await db.prepare('SELECT * FROM chat_messages ORDER BY timestamp ASC').all();
    return { messages: rows.map(toChatMessage) };
  });

  // Upsert by id; fills id/timestamp, and updates the owning thread's preview.
  fastify.post('/api/chat/messages', async (req, reply) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (!body.threadId) return reply.code(400).send({ error: 'threadId is required' });
    const values = {
      ...body,
      id: body.id || randomUUID(),
      timestamp: body.timestamp || new Date().toISOString(),
    };
    const row = await upsertRow('chat_messages', values, COLUMNS.chat_messages);
    const preview = values.type === 'photo' ? '[photo]' : String(values.content ?? '');
    await db
      .prepare('UPDATE chat_threads SET lastMessage = @lastMessage, lastMessageAt = @lastMessageAt WHERE id = @id')
      .run({ lastMessage: preview, lastMessageAt: values.timestamp, id: values.threadId });
    return reply.code(201).send({ message: toChatMessage(row) });
  });
}
