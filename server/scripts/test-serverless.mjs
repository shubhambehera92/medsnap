// Exercises the Vercel serverless adapter (api/index.mjs) against the in-process
// Fastify app using mock req/res objects — catches adapter bugs before deploy.
// Run:  npm run test:serverless -w server
process.env.MEDSNAP_SERVERLESS = '1'; // skip fastify.listen() (still uses local SQLite)

const { default: handler } = await import('../../api/index.mjs');
import assert from 'node:assert';

function mockReq({ method, url, headers = {}, body }) {
  return {
    method,
    url,
    headers,
    body,
    socket: { remoteAddress: '203.0.113.7' },
  };
}

function mockRes() {
  const state = { headers: {}, chunks: [] };
  return {
    statusCode: 0,
    state,
    setHeader(k, v) { state.headers[k.toLowerCase()] = v; },
    end(chunk) { if (chunk !== undefined && chunk !== null) state.chunks.push(Buffer.from(chunk)); },
  };
}

async function call(method, url, body, headers = {}) {
  const res = mockRes();
  await handler(
    mockReq({
      method,
      url,
      headers: { 'x-forwarded-for': '198.51.100.2', ...headers },
      body,
    }),
    res
  );
  const payload = Buffer.concat(res.state.chunks).toString('utf8');
  let json = null;
  try { json = JSON.parse(payload); } catch { /* not JSON (e.g. images) */ }
  return { status: res.statusCode, json, raw: payload, headers: res.state.headers };
}

let passed = 0;
const check = (name, cond) => { console.log(`  ${cond ? '\u2713' : '\u2717'} ${name}`); if (cond) passed += 1; };

const health = await call('GET', '/api/health');
check('health via adapter', health.status === 200 && health.json?.ok === true);

const login = await call('POST', '/api/auth/login', { name: 'Adapter Tester', role: 'Nurse' }, { 'content-type': 'application/json' });
check('post JSON body parsed through adapter', login.status === 200 && !!login.json?.token, `got ${login.status}`);

const { token } = login.json;
const pats = await call('GET', '/api/patients', undefined, { authorization: `Bearer ${token}` });
check('auth header passes through', pats.status === 200 && pats.json?.patients?.length === 3);

const resolved = await call('GET', '/api/patients/resolve?code=P-1001', undefined, { authorization: `Bearer ${token}` });
check('query string preserved', resolved.status === 200 && resolved.json?.patient?.id === 'P-1001');

const sync = await call('GET', '/api/sync/status', undefined, { authorization: `Bearer ${token}` });
check('sync status via adapter', sync.status === 200 && !!sync.json?.fhirBaseUrl);

const bad = await call('GET', '/api/patients', undefined);
check('unauthenticated rejected', bad.status === 401);

console.log(`\n${passed === 6 ? 'PASS' : 'FAIL'} — ${passed}/6 adapter checks passed`);
process.exit(passed === 6 ? 0 : 1);