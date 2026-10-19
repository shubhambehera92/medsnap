// Load local, git-ignored env files before any module reads process.env.
// Uses Node's built-in loader (no dotenv dependency). Loaded, in order:
//   <repo>/.env        (shared)
//   <repo>/server/.env (api overrides)
// Existing environment variables are never overwritten. Deliberately does NOT
// read the Vercel-managed `.env.local` (it sets VERCEL=1 and masks secrets).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(here, '..', '..', '.env'),
  path.resolve(here, '..', '.env'),
];

if (typeof process.loadEnvFile === 'function') {
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) process.loadEnvFile(file);
    } catch (err) {
      console.warn(`[env] could not load ${file}: ${err?.message ?? err}`);
    }
  }
}
