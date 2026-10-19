import { create } from 'zustand';
import type {
  Patient,
  Photo,
  AuditEntry,
  ChatThread,
  ChatMessage,
  Device,
  User,
} from '@/types';
import {
  DEMO_PATIENTS,
  DEMO_PHOTOS,
  DEMO_AUDIT,
  DEMO_CHAT_THREADS,
  DEMO_MESSAGES,
  DEMO_DEVICES,
  DEMO_USERS,
} from '@/data/demo';
import { api } from '@/lib/api';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppState {
  users: User[];
  patients: Patient[];
  photos: Photo[];
  auditLog: AuditEntry[];
  chatThreads: ChatThread[];
  messages: ChatMessage[];
  devices: Device[];
  idleTimeout: number; // minutes
  retentionDays: number;
  consentText: string;
  lastActivity: number;
  /** Status of the initial API load (data below is seeded demo data as a fallback). */
  status: LoadStatus;
  error: string | null;
  /** Which backend the API reported (e.g. "postgres" or "sqlite"), for the demo helper. */
  dbEngine: string | null;

  /** Fetch everything from the API and replace the local snapshot. */
  load: () => Promise<void>;

  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'device'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  addPhoto: (photo: Photo) => void;
  deletePhoto: (id: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  updatePolicy: (updates: Partial<Pick<AppState, 'idleTimeout' | 'retentionDays' | 'consentText'>>) => void;
  updateLastActivity: () => void;
}

/** Fire-and-forget write to the API. Failures never break the local (offline-first) UI. */
function push(request: Promise<unknown>) {
  request.catch((err) => {
    console.warn('[medsnap] API write failed:', err instanceof Error ? err.message : err);
  });
}

export const useAppStore = create<AppState>((set) => ({
  // Seeded demo snapshot — shown instantly and kept if the API is unreachable.
  users: DEMO_USERS,
  patients: DEMO_PATIENTS,
  photos: DEMO_PHOTOS,
  auditLog: DEMO_AUDIT,
  chatThreads: DEMO_CHAT_THREADS,
  messages: DEMO_MESSAGES,
  devices: DEMO_DEVICES,
  idleTimeout: 2,
  retentionDays: 365,
  consentText:
    'I consent to the capture and secure storage of my clinical photos for diagnostic and treatment purposes.',
  lastActivity: Date.now(),
  status: 'idle',
  error: null,
  dbEngine: null,

  load: async () => {
    set({ status: 'loading', error: null });
    try {
      const [health, users, patients, photos, auditLog, chatThreads, messages, devices, settings] =
        await Promise.all([
          api.health(),
          api.users(),
          api.patients(),
          api.photos(),
          api.audit(),
          api.chatThreads(),
          api.chatMessages(),
          api.devices(),
          api.settings(),
        ]);

      set({
        users,
        patients,
        photos,
        auditLog,
        chatThreads,
        messages,
        devices,
        idleTimeout: settings.idleTimeout,
        retentionDays: settings.retentionDays,
        consentText: settings.consentText,
        dbEngine: health.db,
        status: 'ready',
        error: null,
      });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load data from the API',
      });
    }
  },

  addAuditEntry: (entry) => {
    const newEntry: AuditEntry = {
      id: `a${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      device: 'Chrome 120 - Windows',
      ...entry,
    };
    set((state) => ({ auditLog: [newEntry, ...state.auditLog] }));
    push(api.createAudit(newEntry));
  },

  updateUser: (id, updates) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    }));
    push(api.updateUser(id, updates));
  },

  updatePatient: (id, updates) => {
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    push(api.updatePatient(id, updates));
  },

  updatePhoto: (id, updates) => {
    set((state) => ({
      photos: state.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    push(api.updatePhoto(id, updates));
  },

  addPhoto: (photo) => {
    set((state) => ({ photos: [photo, ...state.photos] }));
    push(api.createPhoto(photo));
  },

  deletePhoto: (id) => {
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) }));
    push(api.deletePhoto(id));
  },

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
    set((state) => ({
      chatThreads: state.chatThreads.map((t) =>
        t.id === message.threadId
          ? {
              ...t,
              lastMessage: message.type === 'photo' ? '[photo]' : message.content,
              lastMessageAt: message.timestamp,
            }
          : t
      ),
    }));
    push(api.createMessage(message));
  },

  updateDevice: (id, updates) => {
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    push(api.updateDevice(id, updates));
  },

  updatePolicy: (updates) => {
    set(updates);
    push(api.updateSettings(updates));
  },

  updateLastActivity: () => {
    set({ lastActivity: Date.now() });
  },
}));
