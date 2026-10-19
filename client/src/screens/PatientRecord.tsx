import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Columns2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/stores/appStore';
import { Photo, PhotoType } from '@/types';
import { cn } from '@/lib/utils';

const FILTERS: (PhotoType | 'All')[] = ['All', 'Label', 'Wound', 'Insurance card', 'Home test'];

export const PatientRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, photos } = useAppStore();
  const patient = patients.find((p) => p.id === id);
  const [filter, setFilter] = useState<PhotoType | 'All'>('All');
  const [compareMode, setCompareMode] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);

  const patientPhotos = useMemo(
    () => photos.filter((p) => p.patientId === id).sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt)),
    [photos, id]
  );

  const filtered = useMemo(
    () => (filter === 'All' ? patientPhotos : patientPhotos.filter((p) => p.type === filter)),
    [patientPhotos, filter]
  );

  const woundPhotos = patientPhotos.filter((p) => p.type === 'Wound');

  const toggleCompare = (photoId: string) => {
    setCompare((c) => (c.includes(photoId) ? c.filter((x) => x !== photoId) : [...c, photoId].slice(-2)));
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <EmptyState icon={User} title="Patient not found" message="This patient record does not exist." />
      </div>
    );
  }

  const openPhoto = (photo: Photo) => {
    if (compareMode && photo.type === 'Wound') {
      toggleCompare(photo.id);
      return;
    }
    navigate(`/photo/${photo.id}`);
  };

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
            <h1 className="font-semibold text-ink truncate">{patient.name}</h1>
            <p className="text-xs text-ink2">
              Age {patient.age} • {patient.caseNumber} • {patient.ward}
            </p>
          </div>
          <Badge
            variant={
              patient.consentStatus === 'On record'
                ? 'success'
                : patient.consentStatus === 'Expired'
                ? 'danger'
                : 'warning'
            }
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            {patient.consentStatus}
          </Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 rounded-full text-sm font-medium min-h-[44px] transition-colors border',
                filter === f ? 'bg-primary text-white dark:text-[#04211E] border-primary' : 'bg-surface text-ink2 border-border hover:text-ink'
              )}
            >
              {f}
            </button>
          ))}
          {woundPhotos.length >= 2 && (
            <Button
              variant={compareMode ? 'primary' : 'secondary'}
              size="sm"
              className="ml-auto"
              onClick={() => {
                setCompareMode((c) => !c);
                setCompare([]);
              }}
            >
              <Columns2 className="h-4 w-4" /> Compare wounds
            </Button>
          )}
        </div>

        {compareMode && (
          <Card className="p-4 border-primary/20 bg-primary-light/20">
            <p className="text-sm text-ink">
              Select two wound photos to compare side by side ({compare.length}/2 selected).
            </p>
          </Card>
        )}

        {compareMode && compare.length === 2 && (
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {compare.map((pid) => {
                const p = patientPhotos.find((x) => x.id === pid)!;
                return (
                  <figure key={pid} className="space-y-2">
                    <img src={p.imageData} alt="" className="w-full rounded-xl object-cover aspect-square" />
                    <figcaption className="text-xs text-ink2 text-center">
                      {new Date(p.takenAt).toLocaleDateString()}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </Card>
        )}

        {/* Timeline */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={User}
            title="No photos yet"
            message="Captures for this patient will appear here on the timeline."
          />
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {filtered.map((photo) => (
                <div key={photo.id} className="relative">
                  <div className="absolute -left-[18px] top-6 h-3 w-3 rounded-full bg-primary border-2 border-bg" />
                  <Card
                    className={cn(
                      'p-3 cursor-pointer hover:border-primary/40 transition-colors',
                      compare.includes(photo.id) && 'border-2 border-primary'
                    )}
                    onClick={() => openPhoto(photo)}
                  >
                    <div className="flex gap-4">
                      <img src={photo.imageData} alt="" className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default">{photo.type}</Badge>
                          <Badge variant={photo.status === 'Filed' ? 'success' : photo.status === 'Queued' ? 'warning' : 'info'}>
                            {photo.status}
                          </Badge>
                          {photo.priority === 'High' && <Badge variant="danger">High</Badge>}
                        </div>
                        <p className="text-sm text-ink2">
                          {new Date(photo.takenAt).toLocaleString()} • by {photo.takenBy}
                        </p>
                        <p className="text-xs text-muted">Quality {photo.quality}/100 • {photo.recordId}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {compareMode && (
          <Button variant="secondary" className="w-full" onClick={() => setCompareMode(false)}>
            <Columns2 className="h-4 w-4" /> Exit compare
          </Button>
        )}
      </div>
    </div>
  );
};