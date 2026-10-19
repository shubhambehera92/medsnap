// Debug: run the full FHIR flow against HAPI and print results.
import { createFhirPatient, createFhirDocumentReference } from '../src/fhir.js';

const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// HAPI T4 rejects Binary creates with duplicate data — make the payload unique.
function uniqueJpeg() {
  const base = Buffer.from(TINY_JPEG, 'base64');
  const nonce = Buffer.from(`medsnap:${Date.now()}:${Math.random().toString(36).slice(2)}`);
  return Buffer.concat([base, nonce]).toString('base64');
}

const patient = {
  id: 'P-1001',
  name: 'Maria Sanchez',
  mrn: 'MRN-884213',
  sex: 'female',
  dob: '1979-04-12',
  fhirPatientId: null,
};
const capture = {
  id: `capture-${Date.now()}`,
  type: 'Wound',
  note: 'smoke test',
  createdAt: new Date().toISOString(),
  mimeType: 'image/jpeg',
  imageBase64: uniqueJpeg(),
  sizeBytes: 1024,
};

const p = await createFhirPatient(patient);
console.log('PATIENT:', JSON.stringify(p));
if (p.ok) patient.fhirPatientId = p.id;

const r = await createFhirDocumentReference({ patient, capture });
console.log('DOCREF:', JSON.stringify(r));

// Retry with the SAME capture id — must be idempotent (Binary update-as-create).
const r2 = await createFhirDocumentReference({ patient, capture });
console.log('DOCREF RETRY:', JSON.stringify(r2));