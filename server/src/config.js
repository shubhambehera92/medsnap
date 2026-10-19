import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const CLIENT_DIST = path.resolve(ROOT_DIR, '..', 'client', 'dist');
export const DB_PATH = path.join(DATA_DIR, 'medsnap.db');

function bool(value, fallback) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() !== 'false';
}

export const config = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'medsnap-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  fhirBaseUrl: (process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4').replace(/\/$/, ''),
  fhirEnabled: bool(process.env.FHIR_ENABLED, true),
  fhirTimeoutMs: Number(process.env.FHIR_TIMEOUT_MS || 20000),
  retentionHours: Number(process.env.RETENTION_HOURS || 72),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024),
  isProd: process.env.NODE_ENV === 'production',
};
