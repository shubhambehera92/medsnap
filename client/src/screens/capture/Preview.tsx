import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Pencil, X } from 'lucide-react';
import { CaptureShell } from '@/components/capture/CaptureShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCaptureStore } from '@/stores/captureStore';
import { extractText } from '@/lib/ocr';
import { logAudit } from '@/lib/audit';
import { PhotoType } from '@/types';

const ALL_TYPES: PhotoType[] = ['Label', 'Wound', 'Insurance card', 'Home test'];

export const Preview = () => {
  const navigate = useNavigate();
  const { mode, imageData, quality, setDetected, setStep } = useCaptureStore();
  const [extractedText, setExtractedText] = useState('');
  const [detectedType, setDetectedType] = useState<PhotoType | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (!mode || !imageData) return;
    // Simulated detection: normally agrees with the chosen mode.
    setDetectedType(mode);
    setExtractedText(extractText(mode));
  }, [mode, imageData]);

  if (!mode || !imageData) {
    return (
      <CaptureShell step="review" title="Review">
        <p className="text-ink2">
          Nothing to review.{' '}
          <button className="text-primary font-medium" onClick={() => navigate('/capture/mode')}>
            Choose a mode
          </button>
        </p>
      </CaptureShell>
    );
  }

  const needsText = detectedType === 'Label' || detectedType === 'Insurance card';
  const mismatch = detectedType !== mode;

  const accept = () => {
    setDetected(extractedText, detectedType!);
    setStep('patient');
    logAudit({
      action: `Confirm ${detectedType}`,
      details: mismatch ? `Mode changed from ${mode} to ${detectedType}` : 'Photo confirmed',
    });
    navigate('/capture/patient');
  };

  const retake = () => {
    setStep('capture');
    navigate('/capture/camera');
  };

  return (
    <CaptureShell
      step="review"
      title="Review photo"
      subtitle={mode}
      left={
        <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-900">
          <img src={imageData} alt="Captured" className="w-full max-h-[60vh] object-contain" />
          <Badge variant="info" className="absolute top-3 left-3 !bg-black/50 !text-white border-0">
            DEMO DATA
          </Badge>
        </div>
      }
    >
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Detected type</span>
          <div className="flex items-center gap-2">
            <Badge variant={mismatch ? 'warning' : 'default'}>{detectedType}</Badge>
            <button
              onClick={() => setChanging((c) => !c)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink2 hover:bg-bg"
              aria-label="Change detected type"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>

        {changing && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ALL_TYPES.map((t) => (
              <Button
                key={t}
                variant={detectedType === t ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setDetectedType(t);
                  setChanging(false);
                }}
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        {mismatch && (
          <p className="mt-3 text-xs text-warning bg-warning-light rounded-lg p-2">
            The detected type ({detectedType}) differs from the chosen mode ({mode}). Confirm or change
            before continuing.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink2">Quality score</span>
          <span className="font-semibold text-ink tabular-nums">{quality?.score ?? 0}/100</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${quality?.score ?? 0}%` }} />
        </div>
      </div>

      {needsText && (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Extracted text</span>
            <Badge variant="muted">Simulated OCR (demo)</Badge>
          </div>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            placeholder="Recognised text will appear here…"
            className="w-full h-24 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={retake}>
          <X className="h-4 w-4" /> Retake
        </Button>
        <Button className="flex-1" onClick={accept}>
          <Check className="h-4 w-4" /> Use photo
        </Button>
      </div>
    </CaptureShell>
  );
};