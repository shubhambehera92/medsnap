import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

/**
 * Fastify preHandler — requires a valid Bearer token and attaches `req.user`.
 * Attach with: fastify.get('/x', { preHandler: fastify.authenticate }, handler)
 */
export async function authenticate(req, reply) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return reply.code(401).send({ error: 'Missing bearer token' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
  req.user = { id: payload.sub, name: payload.name, role: payload.role };
}
