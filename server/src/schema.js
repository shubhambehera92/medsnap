// Single source of truth for the database schema, shared by BOTH backends
// (db-sqlite.js and db-pg.js). Tables/columns map 1:1 to the client types in
// client/src/types/index.ts.
//
// Column type keys are backend-agnostic and translated per backend:
//   text -> TEXT                       real -> REAL / DOUBLE PRECISION
//   int  -> INTEGER                    bool -> INTEGER(0/1) / BOOLEAN
//   json -> TEXT (JSON string, parsed/serialised in the route layer)
//
// `id` is always the PRIMARY KEY and is declared first.

export const TABLES = [
  {
    name: 'users',
    columns: {
      id: 'text',
      name: 'text',
      email: 'text',
      role: 'text',
      status: 'text',
      lastActive: 'text',
      avatar: 'text',
    },
    json: [],
  },
  {
    name: 'patients',
    columns: {
      id: 'text',
      name: 'text',
      age: 'int',
      msId: 'text',
      caseNumber: 'text',
      ward: 'text',
      consentStatus: 'text',
      consentExpiry: 'text',
    },
    json: [],
  },
  {
    name: 'photos',
    columns: {
      id: 'text',
      patientId: 'text',
      patientName: 'text',
      patientCase: 'text',
      type: 'text',
      takenBy: 'text',
      takenByRole: 'text',
      takenAt: 'text',
      status: 'text',
      quality: 'real',
      blur: 'bool',
      glare: 'bool',
      dark: 'bool',
      imageData: 'text',
      extractedText: 'text',
      notes: 'text',
      fhirRef: 'text',
      recordId: 'text',
      priority: 'text',
      reviewed: 'bool',
      reviewedBy: 'text',
      reviewedAt: 'text',
      comments: 'json',
      heldReason: 'text',
      queueReason: 'text',
    },
    json: ['comments'],
  },
  {
    name: 'audit',
    columns: {
      id: 'text',
      userId: 'text',
      userName: 'text',
      role: 'text',
      action: 'text',
      patient: 'text',
      target: 'text',
      timestamp: 'text',
      device: 'text',
      details: 'text',
      ip: 'text',
    },
    json: [],
  },
  {
    name: 'chat_threads',
    columns: {
      id: 'text',
      patientId: 'text',
      patientName: 'text',
      lastMessage: 'text',
      lastMessageAt: 'text',
      participants: 'json',
    },
    json: ['participants'],
  },
  {
    name: 'chat_messages',
    columns: {
      id: 'text',
      threadId: 'text',
      author: 'text',
      authorRole: 'text',
      content: 'text',
      type: 'text',
      photoId: 'text',
      timestamp: 'text',
    },
    json: [],
  },
  {
    name: 'devices',
    columns: {
      id: 'text',
      name: 'text',
      os: 'text',
      status: 'text',
      lastSeen: 'text',
      registeredBy: 'text',
    },
    json: [],
  },
  {
    name: 'settings',
    columns: {
      id: 'text',
      idleTimeout: 'int',
      retentionDays: 'int',
      consentText: 'text',
    },
    json: [],
  },
];

/** Legacy tables from the removed FHIR/captures API — dropped on boot. */
export const LEGACY_TABLES = ['captures'];

export const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_photos_taken ON photos (takenAt)',
  'CREATE INDEX IF NOT EXISTS idx_audit_time ON audit (timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_threads_last ON chat_threads (lastMessageAt)',
  'CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages (threadId, timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_messages_time ON chat_messages (timestamp)',
];

const SQL_TYPES = {
  sqlite: { text: 'TEXT', int: 'INTEGER', real: 'REAL', bool: 'INTEGER', json: 'TEXT' },
  postgres: { text: 'TEXT', int: 'INTEGER', real: 'DOUBLE PRECISION', bool: 'BOOLEAN', json: 'TEXT' },
};

/** Build an idempotent CREATE TABLE statement for one table on one backend. */
export function buildCreateSql(backend, table) {
  const types = SQL_TYPES[backend];
  const cols = Object.entries(table.columns).map(
    ([name, kind]) => `  ${name} ${types[kind]}${name === 'id' ? ' PRIMARY KEY' : ''}`
  );
  return `CREATE TABLE IF NOT EXISTS ${table.name} (\n${cols.join(',\n')}\n)`;
}

/**
 * Postgres folds unquoted identifiers to lowercase, so SELECT * rows come back
 * with lowercase keys (patientId -> patientid). Map every camelCase column back
 * to its canonical name so row mappers behave identically on both backends.
 */
export const ROW_CASE = {};
for (const table of TABLES) {
  for (const col of Object.keys(table.columns)) {
    if (/[A-Z]/.test(col)) ROW_CASE[col] = col.toLowerCase();
  }
}

/** All column names of a table, in declaration order. */
export function columnNames(table) {
  return Object.keys(table.columns);
}
