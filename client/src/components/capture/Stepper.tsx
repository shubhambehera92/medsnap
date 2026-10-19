import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { CaptureStep } from '@/stores/captureStore';

const STEPS: { key: CaptureStep; label: string }[] = [
  { key: 'mode', label: 'Mode' },
  { key: 'capture', label: 'Capture' },
  { key: 'review', label: 'Review' },
  { key: 'patient', label: 'Patient' },
  { key: 'consent', label: 'Consent' },
  { key: 'done', label: 'Done' },
];

export const Stepper = ({ current }: { current: CaptureStep }) => {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex items-center gap-2 min-w-max px-1">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.key} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  active && 'bg-primary text-white dark:text-[#04211E]',
                  done && 'bg-primary-light text-primary',
                  !active && !done && 'bg-bg text-muted'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                    active && 'bg-white/20',
                    done && 'bg-primary text-white dark:text-[#04211E]',
                    !active && !done && 'bg-border text-ink2'
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
              </div>
              {index < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
};