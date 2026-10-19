import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Stepper } from './Stepper';
import { CaptureStep } from '@/stores/captureStore';
import { cn } from '@/lib/utils';

interface CaptureShellProps {
  step: CaptureStep;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  /** Two-panel desktop layout: left preview, right controls. */
  left?: React.ReactNode;
  dark?: boolean;
}

export const CaptureShell = ({ step, title, subtitle, children, right, left, dark }: CaptureShellProps) => {
  return (
    <div className={cn('min-h-[100dvh]', dark ? 'bg-slate-950 text-white' : 'bg-bg')}>
      <header
        className={cn(
          'sticky top-0 z-30 border-b backdrop-blur',
          dark ? 'border-white/10 bg-slate-950/80' : 'border-border bg-surface/80'
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className={cn(
              'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors',
              dark ? 'hover:bg-white/10 text-white' : 'hover:bg-bg text-ink'
            )}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={cn('font-semibold truncate', dark ? 'text-white' : 'text-ink')}>{title}</h1>
            {subtitle && (
              <p className={cn('text-xs truncate', dark ? 'text-white/60' : 'text-ink2')}>{subtitle}</p>
            )}
          </div>
          <div className="hidden sm:block">
            <Logo size="sm" />
          </div>
          {right}
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <Stepper current={step} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {left ? (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div>{left}</div>
            <div className="space-y-4">{children}</div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">{children}</div>
        )}
      </main>
    </div>
  );
};