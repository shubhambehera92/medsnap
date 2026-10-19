import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Share2, Download, Lock, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { WatermarkedImage } from '@/components/ui/WatermarkedImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';

export const PhotoViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { photos, updatePhoto, users } = useAppStore();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const photo = photos.find((p) => p.id === id);

  const [comment, setComment] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareTo, setShareTo] = useState('');
  const [reason, setReason] = useState('');

  if (!photo) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <EmptyState icon={ShieldAlert} title="Photo not found" message="This capture is not available." />
      </div>
    );
  }

  const timestamp = new Date().toISOString();

  const addComment = () => {
    if (!comment.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      author: user?.name || 'Unknown',
      authorRole: user?.role || 'Nurse',
      content: comment.trim(),
      timestamp: new Date().toISOString(),
    };
    updatePhoto(photo.id, { comments: [...(photo.comments || []), newComment] });
    logAudit({ action: 'Comment', patient: photo.patientName, target: photo.id, details: comment.trim() });
    setComment('');
    showToast('Comment added and logged', 'success');
  };

  const share = () => {
    if (!shareTo) return;
    logAudit({ action: 'Share in app', patient: photo.patientName, target: photo.id, details: `Shared to ${shareTo}` });
    setShareOpen(false);
    setShareTo('');
    showToast(`Shared with ${shareTo} (logged)`, 'success');
  };

  const doExport = () => {
    if (!reason.trim()) return;
    logAudit({ action: 'Export', patient: photo.patientName, target: photo.id, details: `Reason: ${reason.trim()}` });
    setExportOpen(false);
    setReason('');
    showToast('Export approved and logged', 'success');
  };

  const colleagues = users.filter((u) => u.id !== user?.id);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-bg"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-ink" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-ink truncate">{photo.patientName}</h1>
            <p className="text-xs text-ink2">
              {photo.type} • {new Date(photo.takenAt).toLocaleString()}
            </p>
          </div>
          <Badge variant="muted">
            <Lock className="h-3 w-3 mr-1" /> No download
          </Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          <div className="rounded-2xl border border-border bg-slate-900 overflow-hidden">
            <WatermarkedImage
              src={photo.imageData}
              viewerName={user?.name || 'Viewer'}
              timestamp={timestamp}
              className="aspect-[4/3] w-full"
            />
          </div>

          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Details</span>
                <Badge variant={photo.status === 'Filed' ? 'success' : 'warning'}>{photo.status}</Badge>
              </div>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between"><dt className="text-ink2">Patient</dt><dd className="text-ink">{photo.patientName}</dd></div>
                <div className="flex justify-between"><dt className="text-ink2">Type</dt><dd className="text-ink">{photo.type}</dd></div>
                <div className="flex justify-between"><dt className="text-ink2">Captured by</dt><dd className="text-ink">{photo.takenBy}</dd></div>
                <div className="flex justify-between"><dt className="text-ink2">Record</dt><dd className="text-ink tabular-nums">{photo.recordId || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink2">Quality</dt><dd className="text-ink tabular-nums">{photo.quality}/100</dd></div>
              </dl>
            </Card>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setExportOpen(true)}>
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
            <p className="text-xs text-muted flex items-center gap-1">
              <Lock className="h-3 w-3" /> No plain download. Exports require a logged reason.
            </p>

            <Card className="p-4 space-y-3">
              <span className="text-sm font-medium text-ink flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Clinical notes
              </span>
              <div className="space-y-2">
                {(photo.comments || []).map((c) => (
                  <div key={c.id} className="rounded-xl bg-bg p-3">
                    <p className="text-sm text-ink">{c.content}</p>
                    <p className="text-xs text-muted mt-1">
                      {c.author} · {new Date(c.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
                {(!photo.comments || photo.comments.length === 0) && (
                  <p className="text-sm text-ink2">No notes yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add clinical note…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button onClick={addComment} disabled={!comment.trim()}>Add</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share in app">
        <div className="space-y-4">
          <p className="text-sm text-ink2">Photos are shared by reference inside MedSnap — never copied out.</p>
          <div className="space-y-2">
            {colleagues.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-bg min-h-[44px]"
              >
                <input
                  type="radio"
                  name="colleague"
                  checked={shareTo === c.name}
                  onChange={() => setShareTo(c.name)}
                  className="h-4 w-4 text-primary"
                />
                <span className="text-sm text-ink">{c.name}</span>
                <Badge variant="muted">{c.role}</Badge>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShareOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={share} disabled={!shareTo}>Share</Button>
          </div>
        </div>
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export photo">
        <div className="space-y-4">
          <p className="text-sm text-ink2">
            Exporting is audited. Enter the clinical or legal reason for this export.
          </p>
          <Input
            placeholder="Reason for export (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={doExport} disabled={!reason.trim()}>Export</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};