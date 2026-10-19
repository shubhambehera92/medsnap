export type UserRole = 'Nurse' | 'Doctor' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Disabled' | 'Locked';
  lastActive: string;
  avatar?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  msId: string;
  caseNumber: string;
  ward: string;
  consentStatus: 'On record' | 'Missing' | 'Expired';
  consentExpiry?: string;
}

export type PhotoType = 'Label' | 'Wound' | 'Insurance card' | 'Home test';

export interface Photo {
  id: string;
  patientId: string;
  patientName: string;
  patientCase: string;
  type: PhotoType;
  takenBy: string;
  takenByRole: UserRole;
  takenAt: string;
  status: 'Queued' | 'Held' | 'Filed';
  quality: number;
  blur: boolean;
  glare: boolean;
  dark: boolean;
  imageData: string;
  extractedText?: string;
  notes?: string;
  fhirRef?: string;
  recordId?: string;
  priority?: 'High' | 'Normal';
  reviewed?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: Comment[];
  heldReason?: string;
  queueReason?: string;
}

export interface Comment {
  id: string;
  author: string;
  authorRole: UserRole;
  content: string;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  patient?: string;
  target?: string;
  timestamp: string;
  device: string;
  details?: string;
  ip?: string;
}

export interface ChatThread {
  id: string;
  patientId: string;
  patientName: string;
  lastMessage: string;
  lastMessageAt: string;
  participants: string[];
}

export interface ChatMessage {
  id: string;
  threadId: string;
  author: string;
  authorRole: UserRole;
  content: string;
  type: 'text' | 'photo';
  photoId?: string;
  timestamp: string;
}

export interface Device {
  id: string;
  name: string;
  os: string;
  status: 'Active' | 'Wipe pending' | 'Wiped';
  lastSeen: string;
  registeredBy: string;
}