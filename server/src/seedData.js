import { randomUUID } from 'node:crypto';

/** 3 mock patients. One intentionally has NO consent so the demo can show the capture block. */
export const PATIENTS = [
  {
    id: 'P-1001',
    name: 'Maria Sanchez',
    dob: '1979-04-12',
    sex: 'female',
    ward: '3B — Surgical',
    mrn: 'MRN-884213',
    diagnosis: 'Post-op abdominal wound (day 4)',
    allergies: ['Penicillin'],
    consent: true,
    fhirPatientId: 'medsnap-P-1001',
  },
  {
    id: 'P-1002',
    name: 'James Okafor',
    dob: '1966-11-02',
    sex: 'male',
    ward: '2A — Medical',
    mrn: 'MRN-771902',
    diagnosis: 'Diabetic foot ulcer, left foot',
    allergies: [],
    consent: true,
    fhirPatientId: 'medsnap-P-1002',
  },
  {
    id: 'P-1003',
    name: 'Aisha Khan',
    dob: '1990-06-25',
    sex: 'female',
    ward: '4C — Maternity',
    mrn: 'MRN-993044',
    diagnosis: 'Caesarean section site',
    allergies: ['Latex'],
    consent: false, // <-- blocks capture in the demo
    fhirPatientId: 'medsnap-P-1003',
  },
];

const woundPalettes = [
  ['#f6d2c4', '#c0392b', '#7b241c'],
  ['#f3c9b6', '#b03a2e', '#641e16'],
  ['#e8b4a0', '#a93226', '#4a1612'],
];

function svgThumbnail({ label, sub, kind, seed }) {
  const [base, mid, dark] = woundPalettes[seed % woundPalettes.length];
  const body =
    kind === 'Medicine label'
      ? `<rect x="24" y="30" width="252" height="140" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
         <rect x="24" y="30" width="252" height="26" rx="10" fill="#1d4ed8"/>
         <rect x="44" y="76" width="150" height="10" rx="5" fill="#334155"/>
         <rect x="44" y="96" width="200" height="8" rx="4" fill="#94a3b8"/>
         <rect x="44" y="114" width="176" height="8" rx="4" fill="#94a3b8"/>
         <rect x="44" y="132" width="120" height="8" rx="4" fill="#94a3b8"/>`
      : `<rect x="0" y="0" width="300" height="200" rx="14" fill="${base}"/>
         <ellipse cx="150" cy="104" rx="72" ry="54" fill="${mid}" opacity="0.85"/>
         <ellipse cx="150" cy="104" rx="42" ry="30" fill="${dark}"/>
         <ellipse cx="132" cy="92" rx="12" ry="8" fill="#ffffff" opacity="0.35"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient></defs>
    <rect width="300" height="200" fill="url(#g)"/>
    ${body}
    <rect x="0" y="170" width="300" height="30" fill="rgba(15,23,42,0.72)"/>
    <text x="12" y="190" font-family="Segoe UI, Arial" font-size="15" fill="#ffffff">${label}</text>
    <text x="288" y="190" text-anchor="end" font-family="Segoe UI, Arial" font-size="12" fill="#cbd5e1">${sub}</text>
  </svg>`;
}

function dataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Days-ago helper so the timeline always looks populated relative to "today". */
function daysAgo(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.toISOString();
}

/** A few sample wound photos across dates for the timeline demo (P-1001 + P-1002). */
export function sampleCaptures() {
  const rows = [
    { patientId: 'P-1001', type: 'Wound', days: 9, note: 'Baseline on admission', user: 'Nurse Priya', uid: 'nurse-priya' },
    { patientId: 'P-1001', type: 'Wound', days: 6, note: 'Redness reducing after dressing change', user: 'Nurse Priya', uid: 'nurse-priya' },
    { patientId: 'P-1001', type: 'Medicine label', days: 6, note: 'Antibiotic label for reconciliation', user: 'Dr. Chen', uid: 'dr-chen', hour: 15 },
    { patientId: 'P-1001', type: 'Wound', days: 3, note: 'Granulation tissue visible', user: 'Dr. Chen', uid: 'dr-chen' },
    { patientId: 'P-1001', type: 'Wound', days: 1, note: 'Wound edges closing well', user: 'Nurse Priya', uid: 'nurse-priya' },
    { patientId: 'P-1002', type: 'Wound', days: 5, note: 'Left foot ulcer — baseline', user: 'Dr. Chen', uid: 'dr-chen' },
    { patientId: 'P-1002', type: 'Wound', days: 2, note: 'Debridement completed', user: 'Nurse Priya', uid: 'nurse-priya' },
  ];

  return rows.map((r, i) => {
    const createdAt = daysAgo(r.days, r.hour ?? 10);
    const kind = r.type === 'Medicine label' ? 'Medicine label' : 'wound';
    const thumb = dataUri(
      svgThumbnail({
        label: r.type === 'Medicine label' ? 'Medicine label' : 'Wound',
        sub: new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        kind,
        seed: i,
      })
    );
    return {
      id: `seed-${randomUUID()}`,
      patientId: r.patientId,
      userId: r.uid,
      userName: r.user,
      type: r.type,
      note: r.note,
      createdAt,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      mimeType: 'image/svg+xml',
      imageBase64: null,
      thumbnail: thumb,
      sha256: `seeded-${i}`,
      sizeBytes: 4096,
      syncStatus: 'synced',
      classifierSource: 'seed',
      classifierConfidence: 0.99,
      fhirDocumentReferenceId: `seed-dr-${i + 1}`,
      fhirBinaryId: `seed-bin-${i + 1}`,
      fhirStatus: 'created',
    };
  });
}
