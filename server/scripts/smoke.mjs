// End-to-end API smoke test for the MedSnap open demo API.
// Start the server first, then:
//   npm run smoke -w server   (or: node server/scripts/smoke.mjs)
// Exits non-zero if any check fails. Re-runnable: writes use fixed ids, so the
// demo seed stays intact apart from a few obviously-named test rows.

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001';

let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } else {
    failed += 1;
    console.error(`  \u2717 ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json, text };
}

const keys = (obj) => Object.keys(obj || {}).sort();
const sameKeys = (obj, expected) => JSON.stringify(keys(obj)) === JSON.stringify([...expected].sort());
const allStrings = (obj) => Object.values(obj || {}).every((v) => typeof v === 'string');
const idsOf = (list, pattern) => list.map((x) => x.id).filter((id) => pattern.test(id));

const USER_KEYS = ['id', 'name', 'email', 'role', 'status', 'lastActive'];
const PATIENT_KEYS = ['id', 'name', 'age', 'msId', 'caseNumber', 'ward', 'consentStatus'];
const PHOTO_REQUIRED = [
  'id', 'patientId', 'patientName', 'patientCase', 'type', 'takenBy', 'takenByRole',
  'takenAt', 'status', 'quality', 'blur', 'glare', 'dark', 'imageData',
];
const AUDIT_BASE = ['id', 'userId', 'userName', 'role', 'action', 'timestamp', 'device'];
const THREAD_KEYS = ['id', 'patientId', 'patientName', 'lastMessage', 'lastMessageAt', 'participants'];
const MESSAGE_BASE = ['id', 'threadId', 'author', 'authorRole', 'content', 'type', 'timestamp'];
const DEVICE_KEYS = ['id', 'name', 'os', 'status', 'lastSeen', 'registeredBy'];
const SETTINGS_KEYS = ['idleTimeout', 'retentionDays', 'consentText'];

async function main() {
  console.log(`\nMedSnap API smoke test → ${BASE}\n`);

  // wait for the server
  let up = false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await req('/api/health');
      if (r.status === 200) {
        up = true;
        break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!up) {
    console.error('Server not reachable. Start it with `npm run dev:api`.');
    process.exit(1);
  }

  // ---- health ---------------------------------------------------------------
  const health = await req('/api/health');
  check('health ok + service name', health.json?.ok === true && health.json?.service === 'medsnap-api');
  check('health reports backend + time', ['sqlite', 'postgres'].includes(health.json?.db) && typeof health.json?.time === 'string', JSON.stringify(health.json));
  check('health has exactly {ok,service,db,time}', sameKeys(health.json, ['ok', 'service', 'db', 'time']));

  // ---- users ----------------------------------------------------------------
  const users = await req('/api/users');
  check('users returns 6 demo users', users.json?.users?.length === 6);
  check('users payload is {users}', sameKeys(users.json, ['users']));
  check(
    'every user matches the User shape',
    users.json?.users?.every((u) => sameKeys(u, USER_KEYS) && allStrings(u))
  );
  const sarah = users.json?.users?.find((u) => u.id === 'nurse-1');
  check(
    'nurse-1 seeded verbatim',
    sarah?.name === 'Sarah Johnson' &&
      sarah?.email === 'sarah.johnson@medsnap.demo' &&
      sarah?.role === 'Nurse' &&
      sarah?.status === 'Active' &&
      sarah?.lastActive === '2024-01-15T10:30:00Z'
  );
  check('no user carries an empty avatar key', users.json?.users?.every((u) => !('avatar' in u)));

  const userPatchSame = await req('/api/users/nurse-1', { method: 'PATCH', body: { status: 'Active' } });
  check('PATCH /api/users/:id returns {user}', userPatchSame.status === 200 && sameKeys(userPatchSame.json, ['user']) && userPatchSame.json?.user?.id === 'nurse-1');
  const userPatchMissing = await req('/api/users/ghost', { method: 'PATCH', body: { status: 'Disabled' } });
  check('PATCH missing user → 404 {error}', userPatchMissing.status === 404 && typeof userPatchMissing.json?.error === 'string');

  // ---- patients -------------------------------------------------------------
  const patients = await req('/api/patients');
  const names = patients.json?.patients?.map((p) => p.name);
  check('patients returns 5 demo patients', patients.json?.patients?.length === 5);
  check(
    'patients ordered by name',
    JSON.stringify(names) === JSON.stringify(['Asha Verma', 'James Mitchell', 'Linda Park', 'Maria Santos', 'Robert Johnson'])
  );
  const p1 = patients.json?.patients?.find((p) => p.id === 'p1');
  check('p1 matches the Patient shape', sameKeys(p1, [...PATIENT_KEYS, 'consentExpiry']));
  check('p1 seeded verbatim (age is a number)', p1?.name === 'Asha Verma' && p1?.age === 54 && typeof p1?.age === 'number' && p1?.consentExpiry === '2024-04-15');
  const p3 = patients.json?.patients?.find((p) => p.id === 'p3');
  check('p3 has no consentExpiry key', sameKeys(p3, PATIENT_KEYS) && p3?.consentStatus === 'Missing');

  const one = await req('/api/patients/p2');
  check('GET /api/patients/:id returns {patient}', one.status === 200 && one.json?.patient?.id === 'p2');
  const missingPatient = await req('/api/patients/nope');
  check('GET missing patient → 404 {error}', missingPatient.status === 404 && typeof missingPatient.json?.error === 'string');

  const patch1 = await req('/api/patients/p1', { method: 'PATCH', body: { caseNumber: 'CN-1001-SMOKE', age: 55 } });
  check('PATCH /api/patients/p1 updates + returns {patient}', patch1.status === 200 && patch1.json?.patient?.caseNumber === 'CN-1001-SMOKE' && patch1.json?.patient?.age === 55);
  const patchBack = await req('/api/patients/p1', { method: 'PATCH', body: { caseNumber: 'CN-1001', age: 54 } });
  check('PATCH /api/patients/p1 is reverted', patchBack.json?.patient?.caseNumber === 'CN-1001' && patchBack.json?.patient?.age === 54);
  const patchMissingPatient = await req('/api/patients/ghost', { method: 'PATCH', body: { ward: 'Ward 1' } });
  check('PATCH missing patient → 404 {error}', patchMissingPatient.status === 404 && typeof patchMissingPatient.json?.error === 'string');

  // ---- photos ---------------------------------------------------------------
  const photos = await req('/api/photos');
  const photoList = photos.json?.photos || [];
  check('photos payload is {photos}', sameKeys(photos.json, ['photos']));
  check('photos returns the 6 demo photos', idsOf(photoList, /^photo\d+$/).length === 6);
  check(
    'photos ordered newest takenAt first',
    JSON.stringify(idsOf(photoList, /^photo\d+$/)) === JSON.stringify(['photo3', 'photo5', 'photo1', 'photo2', 'photo6', 'photo4'])
  );
  check('every photo has the required Photo keys', photoList.every((p) => PHOTO_REQUIRED.every((k) => k in p)));
  check('photo booleans are real booleans', photoList.every((p) => [p.blur, p.glare, p.dark].every((b) => typeof b === 'boolean')));
  check('photo quality is a number', photoList.every((p) => typeof p.quality === 'number'));

  const photo1 = photoList.find((p) => p.id === 'photo1');
  check(
    'photo1 matches demo.ts exactly',
    photo1?.status === 'Filed' &&
      photo1?.quality === 92 &&
      photo1?.blur === false &&
      photo1?.priority === 'Normal' &&
      photo1?.reviewed === true &&
      photo1?.reviewedBy === 'Dr. Michael Brown' &&
      photo1?.reviewedAt === '2024-01-15T14:30:00Z' &&
      photo1?.fhirRef === 'FHIR-DR-1001' &&
      photo1?.recordId === 'REC-1001' &&
      Array.isArray(photo1?.comments) &&
      photo1.comments.length === 1 &&
      sameKeys(photo1.comments[0], ['id', 'author', 'authorRole', 'content', 'timestamp'])
  );
  const photo2 = photoList.find((p) => p.id === 'photo2');
  check('photo2 omits absent optionals (comments/notes/priority/reviewed)', !('comments' in photo2) && !('notes' in photo2) && !('priority' in photo2) && !('reviewed' in photo2));
  check('photo2 keeps extractedText', photo2?.extractedText === 'Simulated OCR (demo): Metformin 500mg');
  const photo5 = photoList.find((p) => p.id === 'photo5');
  check('photo5 held with reason', photo5?.status === 'Held' && photo5?.heldReason === 'Patient verification pending');

  const photoOne = await req('/api/photos/photo6');
  check('GET /api/photos/:id returns {photo}', photoOne.status === 200 && photoOne.json?.photo?.id === 'photo6' && photoOne.json?.photo?.priority === 'High');
  const photoMissing = await req('/api/photos/nope');
  check('GET missing photo → 404 {error}', photoMissing.status === 404 && typeof photoMissing.json?.error === 'string');

  const created = await req('/api/photos', {
    method: 'POST',
    body: {
      id: 'smoke-photo-1',
      patientId: 'p1',
      patientName: 'Asha Verma',
      patientCase: 'CN-1001',
      type: 'Wound',
      takenBy: 'Smoke Test',
      takenByRole: 'Nurse',
      status: 'Queued',
      quality: 70,
      blur: false,
      glare: true,
      dark: false,
      imageData: 'data:image/png;base64,AAAA',
    },
  });
  check('POST /api/photos creates (201) with generated takenAt', created.status === 201 && created.json?.photo?.id === 'smoke-photo-1' && typeof created.json?.photo?.takenAt === 'string');
  check('POST /api/photos preserves booleans', created.json?.photo?.glare === true && created.json?.photo?.blur === false);

  const noId = await req('/api/photos', { method: 'POST', body: { patientId: 'p2', type: 'Label', imageData: 'x' } });
  check('POST /api/photos generates id when omitted', noId.status === 201 && typeof noId.json?.photo?.id === 'string' && noId.json.photo.id.length > 0);

  const photoPatch = await req('/api/photos/smoke-photo-1', {
    method: 'PATCH',
    body: { status: 'Filed', reviewed: true, comments: [{ id: 'sc1', author: 'Smoke', authorRole: 'Nurse', content: 'ok', timestamp: '2024-01-16T00:00:00Z' }] },
  });
  check('PATCH /api/photos/:id updates status/reviewed/comments', photoPatch.status === 200 && photoPatch.json?.photo?.status === 'Filed' && photoPatch.json?.photo?.reviewed === true && Array.isArray(photoPatch.json?.photo?.comments) && photoPatch.json.photo.comments.length === 1);
  const reread = await req('/api/photos/smoke-photo-1');
  check('PATCHed photo persists (JSON comments round-trip)', reread.json?.photo?.comments?.[0]?.content === 'ok' && reread.json?.photo?.status === 'Filed');
  const photoPatchMissing = await req('/api/photos/ghost', { method: 'PATCH', body: { status: 'Filed' } });
  check('PATCH missing photo → 404 {error}', photoPatchMissing.status === 404 && typeof photoPatchMissing.json?.error === 'string');

  // ---- audit ----------------------------------------------------------------
  const audit = await req('/api/audit');
  const auditList = audit.json?.entries || [];
  check('audit payload is {entries}', sameKeys(audit.json, ['entries']));
  check('audit returns the 5 demo entries', idsOf(auditList, /^a\d+$/).length === 5);
  check(
    'audit newest first (relative demo order)',
    JSON.stringify(idsOf(auditList, /^a\d+$/)) === JSON.stringify(['a4', 'a3', 'a2', 'a1', 'a5'])
  );
  check('every audit entry has the required keys', auditList.every((e) => AUDIT_BASE.every((k) => k in e)));
  const a2 = auditList.find((e) => e.id === 'a2');
  check('a2 seeded verbatim', a2?.action === 'Capture Wound Photo' && a2?.patient === 'Asha Verma' && a2?.details === 'Quality: 92/100' && a2?.device === 'Chrome 120 - Windows' && a2?.role === 'Nurse');
  const a1 = auditList.find((e) => e.id === 'a1');
  check('a1 omits absent optionals (patient/target/details/ip)', !('patient' in a1) && !('target' in a1) && !('details' in a1) && !('ip' in a1));

  const limited = await req('/api/audit?limit=2');
  check('audit honours ?limit=2', limited.json?.entries?.length === 2);
  const limitedOne = await req('/api/audit?limit=1');
  check('audit ?limit=1 returns one entry', limitedOne.json?.entries?.length === 1);

  const auditPost = await req('/api/audit', {
    method: 'POST',
    body: { id: 'smoke-audit-1', action: 'Smoke Test', patient: 'Asha Verma', userId: 'nurse-1', userName: 'Sarah Johnson', role: 'Nurse', details: 'from smoke' },
  });
  check('POST /api/audit creates (201) {entry}', auditPost.status === 201 && sameKeys(auditPost.json, ['entry']) && auditPost.json.entry.id === 'smoke-audit-1');
  check(
    'POST /api/audit fills timestamp + device and keeps body fields',
    typeof auditPost.json?.entry?.timestamp === 'string' &&
      auditPost.json?.entry?.device === 'MedSnap API' &&
      auditPost.json?.entry?.action === 'Smoke Test' &&
      auditPost.json?.entry?.patient === 'Asha Verma'
  );
  const auditUpsert = await req('/api/audit', { method: 'POST', body: { id: 'smoke-audit-1', action: 'Smoke Test v2' } });
  check('POST /api/audit upserts by id', auditUpsert.json?.entry?.action === 'Smoke Test v2');
  const auditBad = await req('/api/audit', { method: 'POST', body: { details: 'no action' } });
  check('POST /api/audit without action → 400 {error}', auditBad.status === 400 && typeof auditBad.json?.error === 'string');

  // ---- chat -----------------------------------------------------------------
  const threads = await req('/api/chat/threads');
  const threadList = threads.json?.threads || [];
  check('chat threads payload is {threads}', sameKeys(threads.json, ['threads']));
  check('chat threads returns 2 demo threads newest first', threadList.length === 2 && threadList[0]?.id === 'ct1' && threadList[1]?.id === 'ct2');
  check('threads match the ChatThread shape', threadList.every((t) => sameKeys(t, THREAD_KEYS) && Array.isArray(t.participants) && t.participants.every((p) => typeof p === 'string')));
  check('ct1 participants seeded verbatim', JSON.stringify(threadList[0]?.participants) === JSON.stringify(['nurse-1', 'doctor-1']));

  const messages = await req('/api/chat/messages');
  const messageList = messages.json?.messages || [];
  check('chat messages payload is {messages}', sameKeys(messages.json, ['messages']));
  check('chat messages sorted oldest first (relative demo order)', JSON.stringify(idsOf(messageList, /^m\d+$/)) === JSON.stringify(['m4', 'm5', 'm1', 'm2', 'm3']));
  check('messages match the ChatMessage shape', messageList.every((m) => MESSAGE_BASE.every((k) => k in m)));
  const m2 = messageList.find((m) => m.id === 'm2');
  check('m2 photo message keeps photoId', m2?.type === 'photo' && m2?.photoId === 'photo1' && !('photoId' in messageList.find((m) => m.id === 'm1')));

  const filtered = await req('/api/chat/messages?threadId=ct1');
  check('chat messages filter by threadId', JSON.stringify(idsOf(filtered.json?.messages || [], /^m\d+$/)) === JSON.stringify(['m1', 'm2', 'm3']));

  const msgPost = await req('/api/chat/messages', { method: 'POST', body: { id: 'smoke-msg-1', threadId: 'ct1', author: 'Smoke', authorRole: 'Nurse', content: 'See capture', type: 'photo', photoId: 'photo1' } });
  check('POST /api/chat/messages creates (201) {message}', msgPost.status === 201 && sameKeys(msgPost.json, ['message']) && msgPost.json.message.id === 'smoke-msg-1' && typeof msgPost.json.message.timestamp === 'string');
  const threadsAfterPhoto = await req('/api/chat/threads');
  check('photo message sets thread lastMessage to [photo]', threadsAfterPhoto.json?.threads?.find((t) => t.id === 'ct1')?.lastMessage === '[photo]');
  const msgText = await req('/api/chat/messages', { method: 'POST', body: { id: 'smoke-msg-2', threadId: 'ct2', author: 'Smoke', authorRole: 'Nurse', content: 'Hello ward', type: 'text' } });
  check('text message sets thread lastMessage to content', msgText.status === 201 && (await req('/api/chat/threads')).json?.threads?.find((t) => t.id === 'ct2')?.lastMessage === 'Hello ward');
  const threadPatch = await req('/api/chat/threads/ct1', { method: 'PATCH', body: { lastMessage: 'Wound showing improvement', lastMessageAt: '2024-01-15T15:00:00Z' } });
  check('PATCH /api/chat/threads/:id returns {thread}', threadPatch.status === 200 && sameKeys(threadPatch.json, ['thread']) && threadPatch.json.thread.lastMessage === 'Wound showing improvement');
  await req('/api/chat/threads/ct2', { method: 'PATCH', body: { lastMessage: 'Need consent form signed', lastMessageAt: '2024-01-15T11:30:00Z' } });
  const threadPatchMissing = await req('/api/chat/threads/ghost', { method: 'PATCH', body: { lastMessage: 'x' } });
  check('PATCH missing thread → 404 {error}', threadPatchMissing.status === 404 && typeof threadPatchMissing.json?.error === 'string');
  const msgBad = await req('/api/chat/messages', { method: 'POST', body: { content: 'no thread' } });
  check('POST /api/chat/messages without threadId → 400 {error}', msgBad.status === 400 && typeof msgBad.json?.error === 'string');

  // ---- devices --------------------------------------------------------------
  const devices = await req('/api/devices');
  check('devices returns 3 demo devices', devices.json?.devices?.length === 3 && JSON.stringify(devices.json.devices.map((d) => d.id)) === JSON.stringify(['d1', 'd2', 'd3']));
  check('devices match the Device shape', devices.json?.devices?.every((d) => sameKeys(d, DEVICE_KEYS) && allStrings(d)));
  const d2 = devices.json?.devices?.find((d) => d.id === 'd2');
  check('d2 seeded verbatim', d2?.name === 'Nurse-iPad-01' && d2?.os === 'iPadOS 17' && d2?.status === 'Wipe pending' && d2?.lastSeen === '2024-01-14T18:00:00Z');
  const devicePatch = await req('/api/devices/d2', { method: 'PATCH', body: { status: 'Wipe pending' } });
  check('PATCH /api/devices/:id returns {device}', devicePatch.status === 200 && devicePatch.json?.device?.id === 'd2' && devicePatch.json?.device?.status === 'Wipe pending');
  const devicePatchMissing = await req('/api/devices/ghost', { method: 'PATCH', body: { status: 'Active' } });
  check('PATCH missing device → 404 {error}', devicePatchMissing.status === 404 && typeof devicePatchMissing.json?.error === 'string');

  // ---- settings -------------------------------------------------------------
  const settings = await req('/api/settings');
  check('settings payload is exactly {idleTimeout,retentionDays,consentText}', sameKeys(settings.json?.settings, SETTINGS_KEYS));
  check(
    'settings seeded with demo defaults',
    settings.json?.settings?.idleTimeout === 2 &&
      settings.json?.settings?.retentionDays === 365 &&
      settings.json?.settings?.consentText === 'I consent to the capture and secure storage of my clinical photos for diagnostic and treatment purposes.'
  );
  const settingsPut = await req('/api/settings', { method: 'PUT', body: { retentionDays: 730, idleTimeout: 5 } });
  check('PUT /api/settings merges partial updates', settingsPut.status === 200 && settingsPut.json?.settings?.retentionDays === 730 && settingsPut.json?.settings?.idleTimeout === 5);
  const settingsBack = await req('/api/settings', { method: 'PUT', body: { retentionDays: 365, idleTimeout: 2 } });
  check('settings restored to demo defaults', settingsBack.json?.settings?.retentionDays === 365 && settingsBack.json?.settings?.idleTimeout === 2);

  // ---- error contract -------------------------------------------------------
  const notFound = await req('/api/does-not-exist');
  check('unknown /api path → 404 {error}', notFound.status === 404 && typeof notFound.json?.error === 'string');

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
