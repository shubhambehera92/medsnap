import { PhotoType } from '@/types';

// Simulated OCR + type detection. Clearly labelled as demo everywhere it appears.
export const SAMPLE_TEXT: Record<PhotoType, string> = {
  Label: 'Metformin 500 mg — take one tablet twice daily with food. Batch BX-2291.',
  Wound: '',
  'Insurance card': 'Northwind Health — Member ID NW-4482910 — Group 55210 — Valid thru 12/2026',
  'Home test': 'Rapid antigen home test — C line visible — T line absent — Result: Negative',
};

/** Deterministic pseudo-hash of a string, for stable "detection" per image. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Simulated type detection. Usually agrees with the chosen mode; occasionally
 * disagrees so the "confirm or change mode" dialog can be demonstrated.
 */
export function detectType(
  imageData: string,
  chosen: PhotoType,
  forceMismatch = false
): PhotoType {
  const types: PhotoType[] = ['Label', 'Wound', 'Insurance card', 'Home test'];
  if (forceMismatch) {
    return types[(types.indexOf(chosen) + 1) % types.length];
  }
  const idx = hash(imageData.slice(0, 2000)) % types.length;
  // 75% chance to keep the chosen mode, otherwise report the hashed type
  return idx === (hash(chosen) % types.length) ? chosen : chosen;
}

/** Extract text (simulated OCR) for the detected type. */
export function extractText(type: PhotoType): string {
  return SAMPLE_TEXT[type] || '';
}

/** Simulated quality analysis of a data URL. */
export function analyzeQuality(imageData: string, forceBlur = false) {
  const h = hash(imageData.slice(0, 4000));
  const blur = forceBlur || h % 7 === 0;
  const glare = h % 11 === 0;
  const dark = h % 13 === 0;
  let score = 95 - (h % 25);
  if (blur) score = Math.min(score, 42);
  if (glare) score = Math.min(score, 55);
  if (dark) score = Math.min(score, 48);
  const reason = blur ? 'Image is blurred — hold the phone steady.' : glare ? 'Glare detected — reduce reflection.' : dark ? 'Too dark — add light.' : undefined;
  return { ok: score >= 60, score, reason, blur, glare, dark };
}