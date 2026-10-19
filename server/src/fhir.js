import { randomUUID } from 'node:crypto';
import { config } from './config.js';

/**
 * Minimal FHIR R4 client for the public HAPI test server.
 *
 * Resources are created with PUT + client-assigned logical IDs ("update as
 * create") for idempotency. The public HAPI T4 server rejects a create whose
 * CONTENT is byte-identical to an existing resource (HAPI-2840), so every demo
 * run adds a per-process `urn:medsnap:run` identifier to the Patient, which
 * makes each run's content unique while keeping re-syncs idempotent (same id
 * + same content → 200 update).
 *
 * Every call is best-effort: the demo keeps working when the network is down,
 * in which case the capture is stored locally and flagged as fhirStatus "failed".
 */

/** Stable per-process run id — unique content per server boot, reused across re-syncs. */
const RUN_ID = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function fhirFetch(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.fhirTimeoutMs);
  try {
    const res = await fetch(`${config.fhirBaseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON error page */
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (err) {
    return { ok: false, status: 0, json: null, text: String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

const GENDER = { female: 'female', male: 'male', other: 'other', unknown: 'unknown' };

/** PUT a resource with a client-assigned logical id (idempotent create-or-update). */
async function putResource(resourceType, logicalId, resource) {
  return fhirFetch(`/${resourceType}/${logicalId}`, {
    method: 'PUT',
    body: { id: logicalId, ...resource },
  });
}

/**
 * Ensure a Patient exists on the mock EHR. Returns the logical patient id.
 * Content is made unique per demo run (see header note).
 */
export async function createFhirPatient(patient) {
  if (!config.fhirEnabled) return { ok: false, error: 'FHIR disabled' };

  const logicalId = `medsnap-${patient.id}-${RUN_ID}`;
  const [given, ...rest] = String(patient.name || '').split(' ');
  const resource = {
    resourceType: 'Patient',
    active: true,
    identifier: [
      { system: 'urn:medsnap:case-id', value: patient.id },
      { system: 'urn:medsnap:run', value: RUN_ID },
      { system: 'urn:medsnap:mrn', value: patient.mrn || patient.id },
    ],
    name: [{ text: patient.name, family: rest.join(' ') || given, given: [given] }],
    gender: GENDER[patient.sex] || 'unknown',
    birthDate: patient.dob || undefined,
    meta: {
      tag: [{ system: 'urn:medsnap:run', code: RUN_ID, display: 'MedSnap demo run' }],
    },
  };

  const res = await putResource('Patient', logicalId, resource);
  if (!res.ok) return { ok: false, status: res.status, id: logicalId, error: res.text?.slice(0, 300) };
  return { ok: true, id: logicalId, status: res.status };
}

/**
 * Create a DocumentReference with an embedded Binary image, linked to the patient.
 * Stable logical ids per capture keep retries idempotent, while a per-attempt
 * tag on the Binary guarantees unique content (avoids HAPI-2840 duplicates).
 */
export async function createFhirDocumentReference({ patient, capture }) {
  if (!config.fhirEnabled) {
    return { ok: false, error: 'FHIR disabled (set FHIR_ENABLED=true)' };
  }

  const contentType = capture.mimeType || 'image/jpeg';
  const captureId = capture.id || randomUUID();
  const binaryId = `medsnap-bin-${captureId}`;
  const attemptCode = `${RUN_ID}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

  // ensure the Patient exists; reuse a previously stored FHIR patient id when present
  let patientId = patient.fhirPatientId;
  if (patientId) {
    // A stored id can go stale across server restarts (each run uses fresh ids).
    const exists = await fhirFetch(`/Patient/${patientId}`);
    if (!exists.ok) patientId = null;
  }
  if (!patientId) {
    const created = await createFhirPatient(patient);
    patientId = created.ok ? created.id : `medsnap-${patient.id}-${RUN_ID}`;
  }

  const binaryRes = await putResource('Binary', binaryId, {
    resourceType: 'Binary',
    contentType,
    data: capture.imageBase64,
    meta: {
      tag: [{ system: 'urn:medsnap:attempt', code: attemptCode, display: 'MedSnap capture attempt' }],
    },
  });
  if (!binaryRes.ok) {
    return { ok: false, status: binaryRes.status, binaryId, error: `Binary: ${binaryRes.text?.slice(0, 240)}` };
  }

  const isWound = capture.type !== 'Medicine label';
  const typeCoding = isWound
    ? { system: 'http://loinc.org', code: '72287-8', display: 'Wound photograph' }
    : { system: 'http://loinc.org', code: '11526-1', display: 'Medication label' };

  const createdAt = capture.createdAt || new Date().toISOString();
  const docRef = {
    resourceType: 'DocumentReference',
    status: 'current',
    docStatus: 'final',
    description: capture.note || `${capture.type} capture`,
    subject: { reference: `Patient/${patientId}`, display: patient.name },
    date: createdAt,
    meta: {
      security: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-Confidentiality',
          code: 'R',
          display: 'Restricted',
        },
      ],
      tag: [
        { system: 'urn:medsnap:source', code: 'medsnap-app', display: 'MedSnap capture' },
        { system: 'urn:medsnap:run', code: RUN_ID, display: 'MedSnap demo run' },
      ],
    },
    type: { coding: [typeCoding], text: capture.type },
    content: [
      {
        attachment: {
          contentType,
          url: `Binary/${binaryId}`,
          title: `${capture.type} — ${createdAt}`,
          creation: createdAt,
          size: capture.sizeBytes || undefined,
          hash: capture.shaBase64 || undefined,
        },
      },
    ],
    context: {
      period: { start: createdAt },
      sourcePatientInfo: { reference: `Patient/${patientId}` },
    },
  };

  const docRefId = `medsnap-dr-${captureId}`;
  const drRes = await putResource('DocumentReference', docRefId, docRef);
  if (!drRes.ok) {
    return {
      ok: false,
      status: drRes.status,
      binaryId,
      patientId,
      error: `DocumentReference: ${drRes.text?.slice(0, 240)}`,
    };
  }
  return { ok: true, binaryId, documentReferenceId: docRefId, patientId, status: drRes.status };
}

/** Quick reachability probe for the Sync Status screen. */
export async function pingFhir() {
  if (!config.fhirEnabled) return { ok: false, error: 'disabled', baseUrl: config.fhirBaseUrl };
  const res = await fhirFetch('/metadata');
  return { ok: res.ok, status: res.status, baseUrl: config.fhirBaseUrl };
}