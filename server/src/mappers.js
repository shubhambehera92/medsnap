// Row mappers: raw database rows -> API payloads that match the client
// TypeScript types in client/src/types/index.ts exactly.
//
// Rules:
//   - Required fields are always present; a missing/NULL value falls back to a
//     value of the correct type ('' for strings, 0 for numbers, false for
//     booleans).
//   - Optional fields (`?` in the type) are OMITTED when NULL, so payloads
//     mirror the demo objects in client/src/data/demo.ts byte-for-byte.
//   - Booleans come back as real booleans (SQLite stores 0/1, Postgres BOOLEAN).
//   - JSON columns (photos.comments, chat_threads.participants) are parsed here.

import { parseJson } from './db.js';

const str = (v) => (v === null || v === undefined ? '' : String(v));
const num = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isPresent = (v) => v !== null && v !== undefined;

/** Include an optional (string) field only when it has a value. */
function optional(out, key, value) {
  if (isPresent(value)) out[key] = value;
}

export function toUser(row) {
  if (!row) return null;
  const out = {
    id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    role: str(row.role),
    status: str(row.status),
    lastActive: str(row.lastActive),
  };
  optional(out, 'avatar', row.avatar);
  return out;
}

export function toPatient(row) {
  if (!row) return null;
  const out = {
    id: str(row.id),
    name: str(row.name),
    age: num(row.age),
    msId: str(row.msId),
    caseNumber: str(row.caseNumber),
    ward: str(row.ward),
    consentStatus: str(row.consentStatus),
  };
  optional(out, 'consentExpiry', row.consentExpiry);
  return out;
}

export function toPhoto(row) {
  if (!row) return null;
  const out = {
    id: str(row.id),
    patientId: str(row.patientId),
    patientName: str(row.patientName),
    patientCase: str(row.patientCase),
    type: str(row.type),
    takenBy: str(row.takenBy),
    takenByRole: str(row.takenByRole),
    takenAt: str(row.takenAt),
    status: str(row.status),
    quality: num(row.quality),
    blur: !!row.blur,
    glare: !!row.glare,
    dark: !!row.dark,
    imageData: str(row.imageData),
  };
  optional(out, 'extractedText', row.extractedText);
  optional(out, 'notes', row.notes);
  optional(out, 'fhirRef', row.fhirRef);
  optional(out, 'recordId', row.recordId);
  optional(out, 'priority', row.priority);
  if (isPresent(row.reviewed)) out.reviewed = !!row.reviewed;
  optional(out, 'reviewedBy', row.reviewedBy);
  optional(out, 'reviewedAt', row.reviewedAt);
  const comments = parseJson(row.comments, null);
  if (Array.isArray(comments)) out.comments = comments;
  optional(out, 'heldReason', row.heldReason);
  optional(out, 'queueReason', row.queueReason);
  return out;
}

export function toAuditEntry(row) {
  if (!row) return null;
  const out = {
    id: str(row.id),
    userId: str(row.userId),
    userName: str(row.userName),
    role: str(row.role),
    action: str(row.action),
  };
  optional(out, 'patient', row.patient);
  optional(out, 'target', row.target);
  out.timestamp = str(row.timestamp);
  out.device = str(row.device);
  optional(out, 'details', row.details);
  optional(out, 'ip', row.ip);
  return out;
}

export function toChatThread(row) {
  if (!row) return null;
  const participants = parseJson(row.participants, null);
  return {
    id: str(row.id),
    patientId: str(row.patientId),
    patientName: str(row.patientName),
    lastMessage: str(row.lastMessage),
    lastMessageAt: str(row.lastMessageAt),
    participants: Array.isArray(participants) ? participants : [],
  };
}

export function toChatMessage(row) {
  if (!row) return null;
  const out = {
    id: str(row.id),
    threadId: str(row.threadId),
    author: str(row.author),
    authorRole: str(row.authorRole),
    content: str(row.content),
    type: str(row.type),
  };
  optional(out, 'photoId', row.photoId);
  out.timestamp = str(row.timestamp);
  return out;
}

export function toDevice(row) {
  if (!row) return null;
  return {
    id: str(row.id),
    name: str(row.name),
    os: str(row.os),
    status: str(row.status),
    lastSeen: str(row.lastSeen),
    registeredBy: str(row.registeredBy),
  };
}

export function toSettings(row) {
  if (!row) return null;
  return {
    idleTimeout: num(row.idleTimeout),
    retentionDays: num(row.retentionDays),
    consentText: str(row.consentText),
  };
}
