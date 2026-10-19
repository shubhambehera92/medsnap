import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';
import { Inbox, Eye, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export const DoctorInbox = () => {
  const { photos, updatePhoto } = useAppStore();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();

  const pending = photos.filter((p) => p.status === 'Filed' && !p.reviewed);
  const highPriority = pending.filter((p) => p.priority === 'High');
  const normalPriority = pending.filter((p) => p.priority !== 'High');

  const markReviewed = (id: string, patientName: string) => {
    updatePhoto(id, {
      reviewed: true,
      reviewedBy: user?.name,
      reviewedAt: new Date().toISOString(),
    });
    logAudit({ action: 'Mark Reviewed', patient: patientName, target: id });
    showToast('Marked as reviewed', 'success');
  };

  const renderItem = (photo: (typeof pending)[number], index: number) => (
    <motion.div
      key={photo.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <img src={photo.imageData} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-ink">{photo.patientName}</h3>
                <Badge variant={photo.priority === 'High' ? 'danger' : 'warning'}>
                  {photo.priority || 'Normal'}
                </Badge>
              </div>
              <p className="text-sm text-ink2">
                {photo.type} • Sent by {photo.takenBy} • {new Date(photo.takenAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted">Record ID: {photo.recordId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-0"
              onClick={() => navigate(`/photo/${photo.id}`)}
              aria-label="Open in viewer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => markReviewed(photo.id, photo.patientName)}
            >
              <Check className="h-4 w-4" />
              Mark as Reviewed
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <MainLayout title="Doctor Inbox">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Inbox</h1>
          <p className="text-ink2">Photos waiting for review</p>
        </div>

        {pending.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No pending reviews"
            message="All photos have been reviewed. New captures from nurses will appear here."
          />
        ) : (
          <div className="space-y-6">
            {highPriority.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-danger uppercase tracking-wide">High priority</h2>
                {highPriority.map(renderItem)}
              </div>
            )}
            {normalPriority.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-ink2 uppercase tracking-wide">Normal</h2>
                {normalPriority.map(renderItem)}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
