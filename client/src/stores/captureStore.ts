import { create } from 'zustand';
import { PhotoType, Patient } from '@/types';

export type CaptureStep = 'mode' | 'capture' | 'review' | 'patient' | 'consent' | 'done';

interface QualityResult {
  ok: boolean;
  score: number;
  reason?: string;
}

interface CaptureState {
  step: CaptureStep;
  mode: PhotoType | null;
  imageData: string | null;
  quality: QualityResult | null;
  detectedText: string;
  detectedType: PhotoType | null;
  patient: Patient | null;
  confirmedPatient: boolean;
  consentRecorded: boolean;
  forceBlur: boolean;
  receipt: {
    recordId: string;
    fhirRef: string;
    patientName: string;
    timestamp: string;
    online: boolean;
  } | null;
  setStep: (step: CaptureStep) => void;
  setMode: (mode: PhotoType) => void;
  setImage: (data: string) => void;
  setQuality: (q: QualityResult) => void;
  setDetected: (text: string, type: PhotoType) => void;
  setPatient: (patient: Patient) => void;
  setConfirmedPatient: (v: boolean) => void;
  setConsentRecorded: (v: boolean) => void;
  setForceBlur: (v: boolean) => void;
  setReceipt: (r: CaptureState['receipt']) => void;
  reset: () => void;
}

const initialState = {
  step: 'mode' as CaptureStep,
  mode: null,
  imageData: null,
  quality: null,
  detectedText: '',
  detectedType: null,
  patient: null,
  confirmedPatient: false,
  consentRecorded: false,
  forceBlur: false,
  receipt: null,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setMode: (mode) => set({ mode }),
  setImage: (imageData) => set({ imageData }),
  setQuality: (quality) => set({ quality }),
  setDetected: (detectedText, detectedType) => set({ detectedText, detectedType }),
  setPatient: (patient) => set({ patient }),
  setConfirmedPatient: (confirmedPatient) => set({ confirmedPatient }),
  setConsentRecorded: (consentRecorded) => set({ consentRecorded }),
  setForceBlur: (forceBlur) => set({ forceBlur }),
  setReceipt: (receipt) => set({ receipt }),
  reset: () => set({ ...initialState }),
}));