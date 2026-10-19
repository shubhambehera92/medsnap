import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import { CaptureShell } from '@/components/capture/CaptureShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCaptureStore } from '@/stores/captureStore';
import { useAppStore } from '@/stores/appStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';

type Expiry = '30' | '90' | 'custom';

export const Consent = () => {
  const navigate = useNavigate();
  const { patient, setConsentRecorded, setStep, setPatient } = useCaptureStore();
  const { consentText, updatePatient } = useAppStore();
  const { isOnline, showToast } = useUIStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const alreadyOnRecord = patient?.consentStatus === 'On record';
  const [ticked, setTicked] = useState(alreadyOnRecord);
  const [expiry, setExpiry] = useState<Expiry>('90');

  if (!patient) {
    return (
      <CaptureShell step="consent" title="Consent">
        <p className="text-ink2">No patient selected.</p>
      </CaptureShell>
    );
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const record = () => {
    if (!ticked) {
      showToast('Please tick the consent box', 'warning');
      return;
    }
    const days = expiry === '30' ? 30 : expiry === '90' ? 90 : 180;
    const expiryDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    updatePatient(patient.id, { consentStatus: 'On record', consentExpiry: expiryDate });
    // Keep the in-progress capture patient in sync so the screen updates live.
    setPatient({ ...patient, consentStatus: 'On record', consentExpiry: expiryDate });
    setConsentRecorded(true);
    logAudit({ action: 'Record Consent', patient: patient.name, details: `Consent expires ${expiryDate}` });
    setStep('done');
    navigate('/capture/receipt');
  };

  const skipConsent = () => {
    setConsentRecorded(true);
    setStep('done');
    navigate('/capture/receipt');
  };

  const revoke = () => {
    updatePatient(patient.id, { consentStatus: 'Missing', consentExpiry: undefined });
    setPatient({ ...patient, consentStatus: 'Missing', consentExpiry: undefined });
    logAudit({ action: 'Revoke Consent', patient: patient.name, details: 'Consent revoked by staff' });
    showToast('Consent revoked', 'warning');
    setTicked(false);
  };

  return (
    <CaptureShell step="consent" title="Patient consent" subtitle={patient.name}>
      <div
        className={`rounded-2xl border p-4 flex items-start gap-3 ${
          patient.consentStatus === 'On record'
            ? 'border-success/30 bg-success-light'
            : patient.consentStatus === 'Expired'
            ? 'border-danger/30 bg-danger-light'
            : 'border-warning/30 bg-warning-light'
        }`}
      >
        {patient.consentStatus === 'On record' ? (
          <ShieldCheck className="h-5 w-5 text-success mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
        )}
        <div>
          <p className="font-medium text-ink">Consent: {patient.consentStatus}</p>
          {patient.consentExpiry && (
            <p className="text-sm text-ink2">Expires {patient.consentExpiry}</p>
          )}
        </div>
      </div>

      {alreadyOnRecord ? (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <p className="text-sm text-ink2">
            Consent is already on record for {patient.name}. You can continue, or revoke it below.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={revoke}>
              Revoke consent
            </Button>
            <Button className="flex-1" onClick={skipConsent}>
              <Check className="h-4 w-4" /> Continue
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <p className="text-sm text-ink2">{consentText}</p>
            <label className="flex items-start gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={ticked}
                onChange={(e) => setTicked(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
              Patient (or guardian) has given informed consent.
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <span className="text-sm font-medium text-ink">Signature (optional)</span>
            <canvas
              ref={canvasRef}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              width={600}
              height={160}
              className="w-full h-32 rounded-xl border border-dashed border-border bg-bg touch-none"
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
            <span className="text-sm font-medium text-ink">Consent expiry</span>
            <div className="flex gap-2">
              {(['30', '90', 'custom'] as Expiry[]).map((e) => (
                <Button
                  key={e}
                  variant={expiry === e ? 'primary' : 'secondary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpiry(e)}
                >
                  {e === 'custom' ? '180 days' : `${e} days`}
                </Button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={record} disabled={!ticked}>
            <Check className="h-4 w-4" /> Record consent
          </Button>
        </>
      )}

      <div className="text-center">
        <Badge variant={isOnline ? 'success' : 'warning'}>
          {isOnline ? 'Online — will upload now' : 'Offline — will queue in vault'}
        </Badge>
      </div>
    </CaptureShell>
  );
};