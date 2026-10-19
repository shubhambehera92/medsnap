// Exercises the Vercel serverless adapter (api/index.mjs) against the in-process
// Fastify app using mock req/res objects — catches adapter bugs before deploy.
// Run:  npm run test:serverless -w server
process.env.MEDSNAP_SERVERLESS = '1'; // skip fastify.listen() (still uses local SQLite)

const { default: handler } = await import('../../api/index.mjs');

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
  try { json = JSON.parse(payload); } catch { /* not JSON */ }
  return { status: res.statusCode, json, raw: payload, headers: res.state.headers };
}

let passed = 0;
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '\u2713' : '\u2717'} ${name}${cond ? '' : extra ? ` — ${extra}` : ''}`);
  if (cond) passed += 1;
};

const health = await call('GET', '/api/health');
check('health via adapter', health.status === 200 && health.json?.ok === true && health.json?.service === 'medsnap-api');

const users = await call('GET', '/api/users');
check('GET /api/users via adapter (no auth)', users.status === 200 && users.json?.users?.length === 6);

const patients = await call('GET', '/api/patients');
check('GET /api/patients via adapter', patients.status === 200 && patients.json?.patients?.length === 5);

const one = await call('GET', '/api/patients/p1');
check('path params + query string preserved', one.status === 200 && one.json?.patient?.id === 'p1');

const patch = await call('PATCH', '/api/patients/p1', { ward: 'Ward 4' }, { 'content-type': 'application/json' });
check('PATCH JSON body parsed through adapter', patch.status === 200 && patch.json?.patient?.id === 'p1', `got ${patch.status}`);

const audit = await call('POST', '/api/audit', { id: 'sls-audit-1', action: 'Serverless Test', role: 'Admin' }, { 'content-type': 'application/json' });
check('POST /api/audit through adapter fills defaults', audit.status === 201 && audit.json?.entry?.device === 'MedSnap API' && typeof audit.json?.entry?.timestamp === 'string', `got ${audit.status}`);

const settings = await call('GET', '/api/settings');
check('settings via adapter', settings.status === 200 && settings.json?.settings?.retentionDays === 365);

const bad = await call('GET', '/api/does-not-exist');
check('unknown API path → 404 {error}', bad.status === 404 && typeof bad.json?.error === 'string');

console.log(`\n${passed === 8 ? 'PASS' : 'FAIL'} — ${passed}/8 adapter checks passed`);
process.exit(passed === 8 ? 0 : 1);
