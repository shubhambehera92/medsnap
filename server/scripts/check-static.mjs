// Verify production PWA serving: index, manifest, service worker, icons, SPA fallback.
const BASE = process.env.BASE || 'http://localhost:3001';

async function head(name, path) {
  const res = await fetch(`${BASE}${path}`);
  const type = res.headers.get('content-type') || '';
  console.log(`  /${path.replace(/^\//, '')} → ${res.status} (${type.split(';')[0]})`);
  return res;
}

const checks = {};
checks.index = await head('index', '/');
checks.manifest = await head('manifest', '/manifest.webmanifest');
checks.sw = await head('sw', '/sw.js');
checks.icon192 = await head('icon192', '/icons/icon-192.png');
checks.icon512 = await head('icon512', '/icons/icon-512.png');
checks.maskable = await head('maskable', '/icons/icon-maskable-512.png');
checks.spa = await head('spa /patients/P-1001', '/patients/P-1001');

const ok =
  checks.index.status === 200 &&
  checks.manifest.status === 200 &&
  checks.sw.status === 200 &&
  checks.icon192.status === 200 &&
  checks.icon512.status === 200 &&
  checks.maskable.status === 200 &&
  checks.spa.status === 200;

const manifest = await checks.manifest.json();
console.log(`  manifest name: ${manifest.name}`);
console.log(`  manifest icons: ${manifest.icons.length}, start_url: ${manifest.start_url}`);
console.log(ok ? 'PWA ASSETS OK' : 'PWA ASSETS MISSING');
process.exit(ok ? 0 : 1);