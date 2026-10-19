import { PhotoType } from '@/types';

/**
 * Generates an SVG data-URL placeholder. NEVER uses real patient photos — the
 * illustrations are synthetic and watermarked DEMO DATA.
 */
export function makeDemoImage(type: PhotoType): string {
  const configs: Record<PhotoType, { bg: string; fg: string; label: string }> = {
    Wound: { bg: '#FEE2E2', fg: '#DC2626', label: 'Wound' },
    Label: { bg: '#DBEAFE', fg: '#2563EB', label: 'Medication Label' },
    'Insurance card': { bg: '#DCFCE7', fg: '#16A34A', label: 'Insurance Card' },
    'Home test': { bg: '#FEF3C7', fg: '#D97706', label: 'Home Test' },
  };
  const { bg, fg, label } = configs[type];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="${bg}"/>
  <rect x="60" y="60" width="680" height="480" rx="24" fill="white" stroke="${fg}" stroke-width="3" stroke-dasharray="12 10"/>
  <circle cx="400" cy="240" r="70" fill="${fg}" opacity="0.15" />
  <text x="400" y="255" font-family="Inter, sans-serif" font-size="48" fill="${fg}" text-anchor="middle">${label}</text>
  <text x="400" y="360" font-family="Inter, sans-serif" font-size="22" fill="${fg}" text-anchor="middle" opacity="0.8">DEMO DATA — synthetic illustration</text>
  <text x="400" y="410" font-family="Inter, sans-serif" font-size="18" fill="${fg}" text-anchor="middle" opacity="0.6">Not a real clinical photograph</text>
  <text x="56" y="96" font-family="Inter, sans-serif" font-size="20" fill="${fg}" font-weight="600">DEMO DATA</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}