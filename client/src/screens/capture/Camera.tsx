import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera as CameraIcon, SwitchCamera, Upload, Ruler, AlertTriangle, Sparkles } from 'lucide-react';
import { CaptureShell } from '@/components/capture/CaptureShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCaptureStore } from '@/stores/captureStore';
import { useUIStore } from '@/stores/uiStore';
import { analyzeQuality } from '@/lib/ocr';
import { makeDemoImage } from '@/lib/demoImages';
import { logAudit } from '@/lib/audit';

const MAX_EDGE = 1280;

export const CameraScreen = () => {
  const navigate = useNavigate();
  const { mode, setImage, setQuality, setStep, forceBlur, setForceBlur } = useCaptureStore();
  const { showToast } = useUIStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [showRuler, setShowRuler] = useState(mode === 'Wound');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const startStream = useCallback(
    async (mode2: 'environment' | 'user') => {
      setError(null);
      stopStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available on this device. Upload an image instead.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode2, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        setError('Camera unavailable or permission denied. Upload from your computer or use a demo image.');
      }
    },
    [stopStream]
  );

  useEffect(() => {
    startStream(facing);
    return () => stopStream();
  }, [facing, startStream, stopStream]);

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 720;
    const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopStream();
    captureFromDataUrl(canvas.toDataURL('image/jpeg', 0.85));
  };

  const captureFromDataUrl = (dataUrl: string) => {
    const quality = analyzeQuality(dataUrl, forceBlur);
    setImage(dataUrl);
    setQuality(quality);
    if (forceBlur) setForceBlur(false);
    if (!quality.ok) {
      showToast(`${quality.reason} Please retake.`, 'warning');
      if (!streamRef.current && ready === false) {
        startStream(facing);
      }
      return;
    }
    setStep('review');
    logAudit({ action: `Capture ${mode}`, details: `Quality: ${quality.score}/100` });
    navigate('/capture/review');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      stopStream();
      captureFromDataUrl(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const guides: Record<string, string> = {
    Wound: 'absolute inset-0 m-auto h-3/4 w-3/4 rounded-full border-2 border-white/40',
    Label: 'absolute inset-x-8 top-1/4 bottom-1/4 rounded-2xl border-2 border-white/40',
    'Insurance card': 'absolute inset-x-6 top-1/3 bottom-1/3 rounded-2xl border-2 border-white/40',
    'Home test': 'absolute inset-x-10 top-1/4 bottom-1/4 rounded-2xl border-2 border-white/40',
  };

  if (!mode) {
    return (
      <CaptureShell step="capture" title="Camera" subtitle="No mode selected">
        <p className="text-ink2">
          Please choose a capture mode first.{' '}
          <button className="text-primary font-medium" onClick={() => navigate('/capture/mode')}>
            Choose mode
          </button>
        </p>
      </CaptureShell>
    );
  }

  const preview = (
    <div className="relative aspect-[3/4] sm:aspect-video lg:aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
          Starting camera…
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/95 p-6 text-center text-white">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <p className="text-sm">{error}</p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload from computer
            </Button>
            <Button variant="ghost" size="sm" className="!text-white" onClick={() => captureFromDataUrl(makeDemoImage(mode))}>
              <Sparkles className="h-4 w-4" /> Use demo image
            </Button>
            <Button variant="ghost" size="sm" className="!text-white" onClick={() => startStream(facing)}>
              Retry camera
            </Button>
          </div>
        </div>
      )}

      {/* Guide overlay */}
      {ready && (
        <div className="pointer-events-none absolute inset-0">
          <div className={guides[mode]} />
          {showRuler && (
            <div className="absolute left-1/2 bottom-4 -translate-x-1/2">
              <div className="flex items-end gap-0.5 bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={i % 5 === 0 ? 'h-3 w-px bg-white' : 'h-1.5 w-px bg-white/60'} />
                    <span className="text-[9px] text-white/70">{i}</span>
                  </div>
                ))}
                <span className="ml-1 text-[10px] text-white/80">cm</span>
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge variant="info" className="!bg-black/40 !text-white border-0">DEMO DATA</Badge>
            <Badge className="!bg-black/40 !text-white border-0">{mode}</Badge>
          </div>
        </div>
      )}
    </div>
  );

  const controls = (
    <>
      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} disabled={!ready}>
          <SwitchCamera className="h-4 w-4" /> Flip
        </Button>
        {mode === 'Wound' && (
          <Button variant={showRuler ? 'primary' : 'secondary'} size="sm" onClick={() => setShowRuler((s) => !s)}>
            <Ruler className="h-4 w-4" /> Ruler
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>

      <Button
        onClick={captureFromVideo}
        disabled={!ready}
        className="w-full h-16 text-base"
        size="lg"
      >
        <CameraIcon className="h-6 w-6" /> Capture photo
      </Button>

      <button
        onClick={() => captureFromDataUrl(makeDemoImage(mode))}
        className="w-full text-center text-sm text-primary hover:text-primary-hover min-h-[44px]"
      >
        No camera? Use a {mode} demo image
      </button>

      <p className="text-xs text-muted text-center">
        Photos are stored in the encrypted vault — never in the device gallery.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
    </>
  );

  return (
    <CaptureShell
      step="capture"
      title={mode}
      subtitle="Frame the subject inside the guide"
      dark
      left={preview}
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="flex items-center gap-2 text-sm text-white/80">
          <CameraIcon className="h-4 w-4" />
          Keep the {mode.toLowerCase()} inside the frame. Capture is in-memory only.
        </p>
      </div>
      {controls}
    </CaptureShell>
  );
};