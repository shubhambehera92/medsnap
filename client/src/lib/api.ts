import type {
  User,
  Patient,
  Photo,
  AuditEntry,
  ChatThread,
  ChatMessage,
  Device,
} from '@/types';

/**
 * Thin typed client for the MedSnap REST API.
 *
 * In dev, Vite proxies `/api` to the local Fastify server (see vite.config.ts);
 * in production Vercel routes `/api/*` to the serverless function. Because the
 * stores keep their seeded demo data as a fallback, the app stays usable even
 * if this API is unreachable (offline-first demo).
 */

const BASE = '/api';

export interface Settings {
  idleTimeout: number;
  retentionDays: number;
  consentText: string;
}

export interface Health {
  ok: boolean;
  service: string;
  db: string;
  time: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

export const api = {
  health: () => request<Health>('/health'),

  users: () => request<{ users: User[] }>('/users').then((r) => r.users),
  updateUser: (id: string, updates: Partial<User>) =>
    request<{ user: User }>(`/users/${enc(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).then((r) => r.user),

  patients: () => request<{ patients: Patient[] }>('/patients').then((r) => r.patients),
  patient: (id: string) =>
    request<{ patient: Patient }>(`/patients/${enc(id)}`).then((r) => r.patient),
  updatePatient: (id: string, updates: Partial<Patient>) =>
    request<{ patient: Patient }>(`/patients/${enc(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).then((r) => r.patient),

  photos: () => request<{ photos: Photo[] }>('/photos').then((r) => r.photos),
  photo: (id: string) => request<{ photo: Photo }>(`/photos/${enc(id)}`).then((r) => r.photo),
  createPhoto: (photo: Photo) =>
    request<{ photo: Photo }>('/photos', {
      method: 'POST',
      body: JSON.stringify(photo),
    }).then((r) => r.photo),
  updatePhoto: (id: string, updates: Partial<Photo>) =>
    request<{ photo: Photo }>(`/photos/${enc(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).then((r) => r.photo),
  deletePhoto: (id: string) => request<void>(`/photos/${enc(id)}`, { method: 'DELETE' }),

  audit: (limit?: number) =>
    request<{ entries: AuditEntry[] }>(`/audit${limit ? `?limit=${limit}` : ''}`).then(
      (r) => r.entries
    ),
  createAudit: (entry: Partial<AuditEntry>) =>
    request<{ entry: AuditEntry }>('/audit', {
      method: 'POST',
      body: JSON.stringify(entry),
    }).then((r) => r.entry),

  chatThreads: () => request<{ threads: ChatThread[] }>('/chat/threads').then((r) => r.threads),
  updateThread: (id: string, updates: Partial<ChatThread>) =>
    request<{ thread: ChatThread }>(`/chat/threads/${enc(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).then((r) => r.thread),
  chatMessages: (threadId?: string) =>
    request<{ messages: ChatMessage[] }>(
      `/chat/messages${threadId ? `?threadId=${enc(threadId)}` : ''}`
    ).then((r) => r.messages),
  createMessage: (message: ChatMessage) =>
    request<{ message: ChatMessage }>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    }).then((r) => r.message),

  devices: () => request<{ devices: Device[] }>('/devices').then((r) => r.devices),
  updateDevice: (id: string, updates: Partial<Device>) =>
    request<{ device: Device }>(`/devices/${enc(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).then((r) => r.device),

  settings: () => request<{ settings: Settings }>('/settings').then((r) => r.settings),
  updateSettings: (updates: Partial<Settings>) =>
    request<{ settings: Settings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then((r) => r.settings),
};
