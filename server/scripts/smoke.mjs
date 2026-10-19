// End-to-end API smoke test. Run the server first, then:
//   npm run smoke -w server   (or: node server/scripts/smoke.mjs)
// Exits non-zero if any check fails.

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001';

// 1x1 JPEG — enough for a FHIR Binary in the smoke test.
const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// The public HAPI T4 server rejects creates whose Binary *payload* matches an
// existing resource (HAPI-2840). Real photos are unique, but the smoke test
// reuses the same JPEG — append a random trailer (ignored by JPEG decoders)
// so every run is byte-unique. (Must be appended before base64 re-encoding —
// trailing `==` padding would otherwise swallow it.)
function uniqueJpeg() {
  const base = Buffer.from(TINY_JPEG, 'base64');
  const nonce = Buffer.from(`medsnap:${Date.now()}:${Math.random().toString(36).slice(2)}`);
  return Buffer.concat([base, nonce]).toString('base64');
}

let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`\nMedSnap API smoke test → ${BASE}\n`);

  // wait for the server
  let up = false;
  for (let i = 0; i < 20; i++) {
    try {
      const r = await req('/api/health');
      if (r.status === 200) {
        up = true;
        break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!up) {
    console.error('Server not reachable. Start it with `npm run dev:api`.');
    process.exit(1);
  }
  const health = await req('/api/health');
  check('health returns ok', health.json?.ok === true);

  // auth
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: { name: 'Smoke Nurse', role: 'Nurse' },
  });
  check('login issues a JWT', !!login.json?.token);
  const token = login.json?.token;

  const noAuth = await req('/api/patients');
  check('unauthenticated request is rejected (401)', noAuth.status === 401);

  // patients
  const patients = await req('/api/patients', { token });
  check('lists 3 demo patients', patients.json?.patients?.length === 3);
  check(
    'P-1003 has no consent',
    patients.json?.patients?.find((p) => p.id === 'P-1003')?.consent === false
  );

  const resolveOk = await req('/api/patients/resolve?code=' + encodeURIComponent('medsnap://patient/P-1001'), { token });
  check('resolves a QR payload', resolveOk.json?.patient?.id === 'P-1001');

  const resolveBad = await req('/api/patients/resolve?code=ZZZ-000', { token });
  check('unknown QR returns 404', resolveBad.status === 404);

  // captures
  const consentPatient = await req('/api/captures', {
    method: 'POST',
    token,
    body: {
      id: `smoke-${Date.now()}`,
      patientId: 'P-1001',
      type: 'Wound',
      note: 'smoke test',
      imageBase64: uniqueJpeg(),
      mimeType: 'image/jpeg',
      sha256: 'deadbeef',
      sizeBytes: 1024,
    },
  });
  check('creates a capture for a consented patient (201)', consentPatient.status === 201, `got ${consentPatient.status}`);
  const captureId = consentPatient.json?.capture?.id;

  // The server pushes to HAPI FHIR in the background — poll briefly.
  let fhirCreated = false;
  for (let i = 0; i < 30; i++) {
    const poll = await req(`/api/captures/${captureId}`, { token });
    if (poll.json?.capture?.fhir?.status === 'created') {
      fhirCreated = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  check(
    'capture reaches the mock EHR (DocumentReference posted)',
    fhirCreated,
    '(external HAPI may be slow/down — capture is still stored locally)'
  );

  const blocked = await req('/api/captures', {
    method: 'POST',
    token,
    body: { patientId: 'P-1003', type: 'Wound', imageBase64: uniqueJpeg(), mimeType: 'image/jpeg' },
  });
  check('blocks capture without consent (403)', blocked.status === 403, `got ${blocked.status}`);

  const list = await req('/api/captures?patientId=P-1001', { token });
  check('lists captures for a patient', Array.isArray(list.json?.captures) && list.json.captures.length >= 1);
  check(
    'list payload omits raw image bytes',
    list.json?.captures?.every((c) => !('imageBase64' in c))
  );

  const image = await req(`/api/captures/${captureId}/image?token=${token}`);
  check('serves protected image via token query', image.status === 200);

  // audit
  const audit = await req('/api/audit?action=capture_blocked', { token });
  check('records the blocked-capture audit event', (audit.json?.entries?.length || 0) >= 1);

  // sync
  const sync = await req('/api/sync/status', { token });
  check('sync status reports FHIR endpoint', !!sync.json?.fhirBaseUrl);

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
