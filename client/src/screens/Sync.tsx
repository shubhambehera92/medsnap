import { useState } from 'react';
import { RefreshCw, CheckCircle2, Trash2, CloudOff, Cloud, Inbox, UserCheck } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/stores/appStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';
import { Photo } from '@/types';

export const Sync = () => {
  const [tab, setTab] = useState<'queued' | 'held'>('queued');
  const { photos, patients, updatePhoto } = useAppStore();
  const { isOnline, showToast } = useUIStore();
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [resolveTarget, setResolveTarget] = useState<Photo | null>(null);

  const queued = photos.filter((p) => p.status === 'Queued');
  const held = photos.filter((p) => p.status === 'Held');
  const items = tab === 'queued' ? queued : held;

  const retry = (id: string) => {
    if (!isOnline) {
      showToast('Still offline — try again when connected', 'warning');
      return;
    }
    const photo = photos.find((p) => p.id === id);
    updatePhoto(id, {
      status: 'Filed',
      fhirRef: `DocumentReference/medsnap-dr-${Math.floor(10000 + Math.random() * 90000)}`,
      queueReason: undefined,
    });
    logAudit({ action: 'Retry Upload', patient: photo?.patientName, target: id, details: 'Queued photo uploaded' });
    showToast('Photo uploaded to vault', 'success');
  };

  const confirmDelete = () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    const { id, patientName } = deleteTarget;
    useAppStore.setState((state) => ({ photos: state.photos.filter((p) => p.id !== id) }));
    logAudit({ action: 'Delete Photo', patient: patientName, target: id, details: `Reason: ${deleteReason.trim()}` });
    showToast('Photo deleted (reason logged)', 'success');
    setDeleteTarget(null);
    setDeleteReason('');
  };

  const resolveToPatient = (patientId: string) => {
    if (!resolveTarget) return;
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;
    const fhirRef = `DocumentReference/medsnap-dr-${Math.floor(10000 + Math.random() * 90000)}`;
    updatePhoto(resolveTarget.id, {
      patientId: patient.id,
      patientName: patient.name,
      patientCase: patient.caseNumber,
      status: isOnline ? 'Filed' : 'Queued',
      fhirRef: isOnline ? fhirRef : undefined,
      heldReason: undefined,
      queueReason: isOnline ? undefined : 'Offline — uploads when connection returns',
    });
    logAudit({
      action: 'Resolve Held Photo',
      patient: patient.name,
      target: resolveTarget.id,
      details: `Assigned held photo to ${patient.name} (${patient.caseNumber})`,
    });
    showToast(`Held photo assigned to ${patient.name}`, 'success');
    setResolveTarget(null);
  };

  return (
    <MainLayout title="Sync Queue & Held">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ink">Sync Queue & Held</h1>
            <p className="text-ink2">Uploads and photos awaiting resolution</p>
          </div>
          <Badge variant={isOnline ? 'success' : 'warning'}>
            {isOnline ? (
              <span className="flex items-center gap-1"><Cloud className="h-3 w-3" /> Online — auto-syncing</span>
            ) : (
              <span className="flex items-center gap-1"><CloudOff className="h-3 w-3" /> Offline — {queued.length} queued</span>
            )}
          </Badge>
        </div>

        <div className="inline-flex rounded-xl bg-bg p-1 border border-border">
          <button
            onClick={() => setTab('queued')}
            className={`px-4 py-2 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
              tab === 'queued' ? 'bg-surface text-ink shadow-soft' : 'text-ink2'
            }`}
          >
            Queued ({queued.length})
          </button>
          <button
            onClick={() => setTab('held')}
            className={`px-4 py-2 text-sm font-medium rounded-lg min-h-[44px] transition-colors ${
              tab === 'held' ? 'bg-surface text-ink shadow-soft' : 'text-ink2'
            }`}
          >
            Held ({held.length})
          </button>
        </div>

        {isOnline && queued.length > 0 && (
          <Card className="p-4 border-info/20 bg-info-light/30">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-info animate-spin" />
              <p className="text-sm text-info">Syncing {queued.length} queued photo(s) automatically…</p>
            </div>
          </Card>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={tab === 'queued' ? 'Nothing queued' : 'No held photos'}
            message={
              tab === 'queued'
                ? 'All captures have been uploaded. New offline captures will appear here.'
                : 'Photos you hold for patient verification will appear here.'
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((photo) => (
              <Card key={photo.id} className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <img src={photo.imageData} alt="" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium text-ink">{photo.patientName}</p>
                      <p className="text-sm text-ink2">
                        {photo.type} • {new Date(photo.takenAt).toLocaleString()}
                      </p>
                      <Badge variant={photo.status === 'Queued' ? 'warning' : 'info'}>
                        {photo.status === 'Queued' ? 'Encrypted — queued' : photo.heldReason || 'Held'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {photo.status === 'Queued' ? (
                      <Button size="sm" onClick={() => retry(photo.id)}>
                        <RefreshCw className="h-4 w-4" /> Retry
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setResolveTarget(photo)}>
                        <UserCheck className="h-4 w-4" /> Assign patient
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteTarget(photo)}
                      aria-label={`Delete ${photo.patientName} photo`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete requires a logged reason */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete photo">
        <div className="space-y-4">
          <p className="text-sm text-ink2">
            Deleting is permanent and cannot be undone. A reason is required and will be written to the audit log.
          </p>
          <textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Reason for deletion…"
            className="w-full h-24 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger resize-none"
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete} disabled={!deleteReason.trim()}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Resolve a held photo by assigning the correct patient */}
      <Modal open={!!resolveTarget} onClose={() => setResolveTarget(null)} title="Assign held photo">
        <div className="space-y-3">
          <p className="text-sm text-ink2">
            Pick the correct patient for this capture. The assignment is logged.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => resolveToPatient(p.id)}
                className="w-full text-left rounded-xl border border-border bg-surface p-3 hover:border-primary/40 transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{p.name}</span>
                  <CheckCircle2 className="h-4 w-4 text-primary opacity-0" />
                </div>
                <p className="text-sm text-ink2">
                  {p.msId} • Case {p.caseNumber} • {p.ward}
                </p>
              </button>
            ))}
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setResolveTarget(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </MainLayout>
  );
};
