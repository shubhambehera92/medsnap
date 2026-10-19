import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, Home, Camera, CloudOff } from 'lucide-react';
import { CaptureShell } from '@/components/capture/CaptureShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useCaptureStore } from '@/stores/captureStore';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';

export const Receipt = () => {
  const navigate = useNavigate();
  const { mode, imageData, quality, detectedText, patient, setReceipt, reset } = useCaptureStore();
  const { addPhoto } = useAppStore();
  const { user } = useAuthStore();
  const { isOnline } = useUIStore();
  const [phase, setPhase] = useState<'uploading' | 'done'>(isOnline ? 'uploading' : 'done');

  const recordId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
  const fhirRef = `DocumentReference/medsnap-dr-${Math.floor(10000 + Math.random() * 90000)}`;
  const timestamp = new Date().toISOString();

  useEffect(() => {
    if (!patient || !mode || !imageData) {
      navigate('/capture/mode');
      return;
    }

    const finalize = () => {
      const online = isOnline;
      setReceipt({ recordId, fhirRef, patientName: patient.name, timestamp, online });

      addPhoto({
        id: `photo-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.name,
        patientCase: patient.caseNumber,
        type: mode,
        takenBy: user?.name || 'Unknown',
        takenByRole: user?.role || 'Nurse',
        takenAt: timestamp,
        status: online ? 'Filed' : 'Queued',
        quality: quality?.score ?? 0,
        blur: false,
        glare: false,
        dark: false,
        imageData,
        extractedText: detectedText,
        fhirRef: online ? fhirRef : undefined,
        recordId,
        priority: Math.random() > 0.7 ? 'High' : 'Normal',
        queueReason: online ? undefined : 'Offline — uploads when connection returns',
      });

      logAudit({
        action: online ? 'File Photo (FHIR)' : 'Queue Photo (Offline)',
        patient: patient.name,
        details: online
          ? `Record ${recordId} • ${fhirRef} • quality ${quality?.score ?? 0}/100`
          : `Record ${recordId} queued in encrypted vault`,
      });
      setPhase('done');
    };

    if (isOnline) {
      const t = setTimeout(finalize, 1400);
      return () => clearTimeout(t);
    }
    finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goHome = () => {
    reset();
    navigate(`/${(user?.role || 'Nurse').toLowerCase()}/home`);
  };

  const captureAnother = () => {
    reset();
    navigate('/capture/mode');
  };

  if (!patient) return null;

  return (
    <CaptureShell step="done" title="Filed receipt" subtitle={patient.name}>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft text-center space-y-4">
        {phase === 'uploading' ? (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-primary-light flex items-center justify-center">
              <Spinner className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-ink">Uploading and building FHIR DocumentReference…</p>
              <p className="text-sm text-ink2 mt-1">Demo upload to the simulated EHR</p>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div className="h-full w-2/3 bg-primary rounded-full animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-success-light flex items-center justify-center">
              {isOnline ? (
                <CheckCircle2 className="h-9 w-9 text-success" />
              ) : (
                <CloudOff className="h-9 w-9 text-warning" />
              )}
            </div>
            <div>
              <p className="font-semibold text-ink">
                {isOnline ? 'Filed successfully' : 'Queued encrypted in vault'}
              </p>
              <p className="text-sm text-ink2 mt-1">
                {isOnline
                  ? 'Your capture is secure and in the patient record.'
                  : 'No signal — this uploads automatically when the connection returns.'}
              </p>
            </div>

            <div className="text-left rounded-xl bg-bg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink2">Record ID</span>
                <span className="font-medium text-ink tabular-nums">{recordId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink2">Time</span>
                <span className="font-medium text-ink tabular-nums">{new Date(timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink2">Patient</span>
                <span className="font-medium text-ink">{patient.name}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-ink2">FHIR DocumentReference</span>
                <span className="font-medium text-ink text-right break-all text-xs">
                  {isOnline ? fhirRef : 'pending'}
                </span>
              </div>
            </div>

            <Badge variant="muted">Simulated EHR upload — demo</Badge>
          </>
        )}
      </div>

      {phase === 'done' && (
        <>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/audit')}
          >
            <FileText className="h-4 w-4" /> View audit entry
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={captureAnother}>
              <Camera className="h-4 w-4" /> Capture another
            </Button>
            <Button className="flex-1" onClick={goHome}>
              <Home className="h-4 w-4" /> Go home
            </Button>
          </div>
        </>
      )}
    </CaptureShell>
  );
};