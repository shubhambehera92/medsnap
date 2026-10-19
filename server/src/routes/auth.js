import { db } from '../db.js';
import { signToken } from '../auth.js';
import { recordAudit } from '../auditStore.js';

const VALID_ROLES = new Set(['Nurse', 'Doctor']);

function validate(name, role) {
  if (!name || String(name).trim().length < 2) return 'Name must be at least 2 characters';
  if (!VALID_ROLES.has(role)) return 'Role must be Nurse or Doctor';
  return null;
}

/** Derive the stable user id + trimmed display name from a name + role. */
function identity(name, role) {
  const cleanName = String(name).trim().slice(0, 60);
  const id = `${role === 'Doctor' ? 'dr' : 'nurse'}-${cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
  return { cleanName, id };
}

export default async function authRoutes(fastify) {
  // Mock OAuth: pick a name + role, get a JWT. No password in the prototype.
  // Auto-provisions the user so the demo can be driven by any name; sign-up
  // (below) is the explicit "create an account" path.
  // Tighter rate limit than the global limit to blunt brute-force / replay.
  fastify.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { name, role } = req.body || {};
      const invalid = validate(name, role);
      if (invalid) return reply.code(400).send({ error: invalid });

      const { cleanName, id } = identity(name, role);

      // Upsert by id so the same demo user keeps their history.
      const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!existing) {
        await db.prepare('INSERT INTO users (id, name, role, createdAt) VALUES (?, ?, ?, ?)').run(
          id,
          cleanName,
          role,
          new Date().toISOString()
        );
      }

      const user = { id, name: existing?.name || cleanName, role };
      const token = signToken(user);

      recordAudit({
        userId: id,
        userName: user.name,
        role,
        action: 'login',
        subjectType: 'session',
        detail: `${user.name} signed in as ${role}`,
        source: 'server',
      });

      return { token, user };
    }
  );

  // Sign up: create a brand-new account. Unlike login (which auto-provisions
  // for the passwordless demo), this rejects a name + role that already exists,
  // so "create account" and "sign in" behave like a real auth flow.
  fastify.post(
    '/api/auth/signup',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { name, role } = req.body || {};
      const invalid = validate(name, role);
      if (invalid) return reply.code(400).send({ error: invalid });

      const { cleanName, id } = identity(name, role);

      const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (existing) {
        return reply
          .code(409)
          .send({ error: 'An account with this name and role already exists — please sign in.' });
      }

      await db.prepare('INSERT INTO users (id, name, role, createdAt) VALUES (?, ?, ?, ?)').run(
        id,
        cleanName,
        role,
        new Date().toISOString()
      );

      const user = { id, name: cleanName, role };
      const token = signToken(user);

      recordAudit({
        userId: id,
        userName: user.name,
        role,
        action: 'signup',
        subjectType: 'session',
        detail: `${user.name} created a ${role} account`,
        source: 'server',
      });

      return { token, user };
    }
  );

  fastify.get('/api/auth/me', { preHandler: fastify.authenticate }, async (req) => ({
    user: req.user,
  }));

  // Handy for the audit filter dropdown: who has signed in so far.
  fastify.get('/api/auth/users', { preHandler: fastify.authenticate }, async () => {
    const users = await db.prepare('SELECT id, name, role FROM users ORDER BY name').all();
    return { users };
  });
}
