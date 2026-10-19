import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';

/**
 * Watches connectivity and automatically files photos that were queued while
 * offline, writing an audit entry for each. Runs app-wide so a capture made in
 * a basement uploads the moment the signal returns.
 */
export const SyncManager = () => {
  const photos = useAppStore((s) => s.photos);
  const updatePhoto = useAppStore((s) => s.updatePhoto);
  const isOnline = useUIStore((s) => s.isOnline);
  const showToast = useUIStore((s) => s.showToast);
  const running = useRef(false);

  useEffect(() => {
    if (!isOnline || running.current) return;
    const queued = photos.filter((p) => p.status === 'Queued');
    if (queued.length === 0) return;

    running.current = true;
    let cancelled = false;

    const sync = async () => {
      for (const photo of queued) {
        if (cancelled) break;
        await new Promise((r) => setTimeout(r, 600));
        updatePhoto(photo.id, {
          status: 'Filed',
          fhirRef: `DocumentReference/medsnap-dr-${Math.floor(10000 + Math.random() * 90000)}`,
          queueReason: undefined,
        });
        logAudit({
          action: 'Auto Sync (FHIR)',
          patient: photo.patientName,
          target: photo.id,
          details: `Queued upload filed automatically`,
        });
      }
      if (!cancelled) {
        showToast(`${queued.length} queued photo(s) synced`, 'success');
      }
      running.current = false;
    };

    sync();
    return () => {
      cancelled = true;
      running.current = false;
    };
  }, [isOnline, photos, updatePhoto, showToast]);

  return null;
};
