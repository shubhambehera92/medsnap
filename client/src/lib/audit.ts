import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { AuditEntry } from '@/types';

type AuditInput = {
  action: string;
  patient?: string;
  target?: string;
  details?: string;
};

/**
 * Append-only audit log helper. Every meaningful action calls this.
 * Entries can never be edited or deleted.
 */
export function logAudit(input: AuditInput) {
  const user = useAuthStore.getState().user;
  const addAuditEntry = useAppStore.getState().addAuditEntry;
  addAuditEntry({
    userId: user?.id || 'anonymous',
    userName: user?.name || 'Unknown',
    role: user?.role || 'Nurse',
    action: input.action,
    patient: input.patient,
    target: input.target,
    details: input.details,
  } as Omit<AuditEntry, 'id' | 'timestamp' | 'device'>);
}