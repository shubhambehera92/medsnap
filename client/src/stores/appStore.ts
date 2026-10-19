import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Patient, Photo, AuditEntry, ChatThread, ChatMessage, Device } from '@/types';
import { DEMO_PATIENTS, DEMO_PHOTOS, DEMO_AUDIT, DEMO_CHAT_THREADS, DEMO_MESSAGES, DEMO_DEVICES } from '@/data/demo';

interface AppState {
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
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'device'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  addPhoto: (photo: Photo) => void;
  addMessage: (message: ChatMessage) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  updatePolicy: (updates: Partial<Pick<AppState, 'idleTimeout' | 'retentionDays' | 'consentText'>>) => void;
  updateLastActivity: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      patients: DEMO_PATIENTS,
      photos: DEMO_PHOTOS,
      auditLog: DEMO_AUDIT,
      chatThreads: DEMO_CHAT_THREADS,
      messages: DEMO_MESSAGES,
      devices: DEMO_DEVICES,
      idleTimeout: 2, // default 2 minutes
      retentionDays: 365,
      consentText: 'I consent to the capture and secure storage of my clinical photos for diagnostic and treatment purposes.',
      lastActivity: Date.now(),
      addAuditEntry: (entry) => {
        const newEntry: AuditEntry = {
          id: `a${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          device: 'Chrome 120 - Windows',
          ...entry,
        };
        set((state) => ({ auditLog: [newEntry, ...state.auditLog] }));
      },
      updatePatient: (id, updates) => {
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },
      updatePhoto: (id, updates) => {
        set((state) => ({
          photos: state.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },
      addPhoto: (photo) => {
        set((state) => ({ photos: [photo, ...state.photos] }));
      },
      addMessage: (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
      },
      updateDevice: (id, updates) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
      },
      updatePolicy: (updates) => {
        set(updates);
      },
      updateLastActivity: () => {
        set({ lastActivity: Date.now() });
      },
    }),
    {
      name: 'medsnap-app',
    }
  )
);