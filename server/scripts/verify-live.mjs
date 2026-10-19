// Post-deploy verification of static/PWA assets + the open demo API shape.
// Usage: node scripts/verify-live.mjs [baseUrl]
const BASE = process.argv[2] || 'https://medsnap-two.vercel.app';

const show = async (label, path, check) => {
  const r = await fetch(BASE + path);
  const t = r.headers.get('content-type') || '';
  const body = await r.text();
  const ok = check(r.status, t, body);
  console.log((ok ? 'PASS' : 'FAIL'), label.padEnd(34), r.status, '/', t.split(';')[0].slice(0, 22));
  return ok;
};

const okSpa = (s, t, b) => s === 200 && /text\/html/.test(t) && b.includes('id="root"');
const okJson = (s, t) => s === 200 && /json/.test(t);
const okJs = (s, t, b) => s === 200 && /javascript/.test(t) && b.length > 100;
const okBin = (s, t) => s === 200 && /image|octet/.test(t);

let fails = 0;
fails += (await show('SPA fallback (/)', '/', okSpa)) ? 0 : 1;
fails += (await show('SPA fallback deep route', '/ward/P-1001', okSpa)) ? 0 : 1;
fails += (await show('manifest.webmanifest', '/manifest.webmanifest', okJson)) ? 0 : 1;
fails += (await show('sw.js service worker', '/sw.js', okJs)) ? 0 : 1;
fails += (await show('icon-192', '/icons/icon-192.png', okBin)) ? 0 : 1;
fails += (await show('icon-512', '/icons/icon-512.png', okBin)) ? 0 : 1;

const sw = await fetch(BASE + '/sw.js');
console.log('  sw.js cache-control:', sw.headers.get('cache-control'));

// Open demo API (no auth) — health, backend and a couple of seeded collections.
const api = async (label, path, check) => {
  const r = await fetch(BASE + path);
  let json = null;
  try { json = await r.json(); } catch { /* ignore */ }
  const ok = r.status === 200 && check(json);
  console.log(ok ? 'PASS' : 'FAIL', label.padEnd(34), r.status, JSON.stringify(json)?.slice(0, 90));
  return ok;
};

fails += (await api('GET /api/health', '/api/health', (j) => j.ok === true && j.service === 'medsnap-api' && typeof j.db === 'string')) ? 0 : 1;
fails += (await api('GET /api/users', '/api/users', (j) => j.users?.length === 6 && j.users[0].email?.includes('@'))) ? 0 : 1;
fails += (await api('GET /api/patients', '/api/patients', (j) => j.patients?.length === 5 && typeof j.patients[0].age === 'number')) ? 0 : 1;
fails += (await api('GET /api/photos', '/api/photos', (j) => Array.isArray(j.photos) && typeof j.photos[0].blur === 'boolean')) ? 0 : 1;
fails += (await api('GET /api/settings', '/api/settings', (j) => typeof j.settings?.consentText === 'string')) ? 0 : 1;

console.log(fails === 0 ? 'ALL STATIC + API CHECKS PASS' : `${fails} CHECKS FAILED`);
process.exit(fails === 0 ? 0 : 1);
