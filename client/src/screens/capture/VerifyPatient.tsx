import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Search, Check, X, User } from 'lucide-react';
import { CaptureShell } from '@/components/capture/CaptureShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useCaptureStore } from '@/stores/captureStore';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';

export const VerifyPatient = () => {
  const navigate = useNavigate();
  const { mode, imageData, quality, detectedText, patient, setPatient, setConfirmedPatient, setStep } =
    useCaptureStore();
  const { patients, addPhoto } = useAppStore();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [caseNumber, setCaseNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const findPatient = (code: string) =>
    patients.find(
      (p) =>
        p.caseNumber.toLowerCase() === code.trim().toLowerCase() ||
        p.msId.toLowerCase() === code.trim().toLowerCase()
    );

  const runScan = () => {
    setScanning(true);
    setError('');
    setTimeout(() => {
      setScanning(false);
      const p = patients[0];
      setPatient(p);
      showToast(`Wristband scanned (demo): ${p.name}`, 'info');
    }, 1600);
  };

  const lookup = () => {
    const p = findPatient(caseNumber);
    if (!p) {
      setError('No patient found for that case number.');
      return;
    }
    setError('');
    setPatient(p);
  };

  const hold = () => {
    if (!mode || !imageData || !patient) {
      showToast('Select a patient first', 'warning');
      return;
    }
    addPhoto({
      id: `held-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      patientCase: patient.caseNumber,
      type: mode,
      takenBy: user?.name || 'Unknown',
      takenByRole: user?.role || 'Nurse',
      takenAt: new Date().toISOString(),
      status: 'Held',
      quality: quality?.score ?? 0,
      blur: false,
      glare: false,
      dark: false,
      imageData,
      extractedText: detectedText,
      heldReason: 'Patient not confirmed on screen',
    });
    logAudit({ action: 'Hold Photo', patient: patient.name, details: 'Patient not confirmed — held in vault' });
    showToast('Photo held in vault — resolve later', 'warning');
    setStep('done');
    navigate('/sync');
  };

  const confirmPatient = () => {
    if (!confirmed || !patient) return;
    setConfirmedPatient(true);
    // Consent check
    setStep('consent');
    logAudit({ action: 'Verify Patient', patient: patient.name, details: `Confirmed ${patient.caseNumber}` });
    navigate('/capture/consent');
  };

  return (
    <CaptureShell step="patient" title="Verify patient" subtitle="Match the photo to the correct patient">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Scan wristband</span>
          <Badge variant="muted">Demo</Badge>
        </div>
        <div className="relative h-24 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center">
          {scanning ? (
            <>
              <div className="absolute left-0 right-0 h-0.5 bg-primary animate-scan" />
              <span className="text-white/70 text-sm">Scanning wristband…</span>
            </>
          ) : (
            <ScanLine className="h-8 w-8 text-white/40" />
          )}
        </div>
        <Button variant="secondary" className="w-full" onClick={runScan} disabled={scanning}>
          <ScanLine className="h-4 w-4" /> Scan wristband (demo)
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft space-y-3">
        <label className="block text-sm font-medium text-ink">Or enter case number</label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. CN-1001"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            error={error}
          />
          <Button onClick={lookup}>Find</Button>
        </div>
      </div>

      {patient && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary-light/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary text-white dark:text-[#04211E] flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-ink">{patient.name}</p>
              <p className="text-sm text-ink2">
                Age {patient.age} • {patient.msId} • {patient.caseNumber} • {patient.ward}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            This is the right patient
          </label>
        </div>
      )}

      <div className="flex gap-3">
        {patient && (
          <Button variant="danger" className="flex-1" onClick={hold}>
            <X className="h-4 w-4" /> No / Hold
          </Button>
        )}
        <Button className="flex-1" onClick={confirmPatient} disabled={!confirmed}>
          <Check className="h-4 w-4" /> Confirm patient
        </Button>
      </div>
    </CaptureShell>
  );
};