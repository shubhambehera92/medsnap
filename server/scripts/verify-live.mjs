// Post-deploy verification of static/PWA assets + hydrated capture shape.
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

// Hydrated capture shape on Postgres (syncStatus / fhir must exist now).
const login = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Verify', role: 'Nurse' }),
});
const { token } = await login.json();
const list = await fetch(BASE + '/api/captures?limit=2', {
  headers: { Authorization: 'Bearer ' + token },
});
const { captures } = await list.json();
for (const c of captures.slice(0, 2)) {
  console.log('capture:', c.id, '| sync=' + c.syncStatus, '| fhir=' + (c.fhir && c.fhir.status), '| imageBase64 in payload=' + ('imageBase64' in c));
}

console.log(fails === 0 ? 'ALL STATIC CHECKS PASS' : `${fails} STATIC CHECKS FAILED`);
process.exit(fails === 0 ? 0 : 1);