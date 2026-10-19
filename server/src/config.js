import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const CLIENT_DIST = path.resolve(ROOT_DIR, '..', 'client', 'dist');
export const DB_PATH = path.join(DATA_DIR, 'medsnap.db');

export const config = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '0.0.0.0',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024),
  isProd: process.env.NODE_ENV === 'production',
};
