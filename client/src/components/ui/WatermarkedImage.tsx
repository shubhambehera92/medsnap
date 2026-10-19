import { cn } from '@/lib/utils';

interface WatermarkedImageProps {
  src: string;
  alt?: string;
  viewerName: string;
  timestamp: string;
  className?: string;
}

/**
 * Renders an image with a diagonal repeated watermark (viewer + time).
 * Export previews are baked through the same overlay. No download control is
 * exposed anywhere.
 */
export const WatermarkedImage = ({ src, alt, viewerName, timestamp, className }: WatermarkedImageProps) => {
  const stamp = `${viewerName} · ${new Date(timestamp).toLocaleString()} · DEMO DATA`;
  return (
    <div
      className={cn('relative overflow-hidden select-none no-save', className)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img
        src={src}
        alt={alt || 'Clinical photo'}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="pointer-events-none w-full h-full object-contain"
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -inset-1/2 flex flex-wrap gap-x-16 gap-y-12 opacity-[0.18]"
          style={{ transform: 'rotate(-30deg)' }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="text-white text-[11px] font-semibold whitespace-nowrap drop-shadow">
              {stamp}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};