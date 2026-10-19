import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, FlaskConical } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useCaptureStore } from '@/stores/captureStore';
import { useAppStore } from '@/stores/appStore';
import { DEMO_USERS } from '@/data/demo';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { logAudit } from '@/lib/audit';
import { cn } from '@/lib/utils';

/** Discreet floating demo helper: quick role switch, offline toggle, force blur. */
export const DemoHelper = () => {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const { isOnline, setOnline, forceListError, setForceListError, showToast } = useUIStore();
  const setForceBlur = useCaptureStore((s) => s.setForceBlur);
  const setStep = useCaptureStore((s) => s.setStep);
  const dataStatus = useAppStore((s) => s.status);
  const dbEngine = useAppStore((s) => s.dbEngine);
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const switchRole = (role: UserRole) => {
    const next = DEMO_USERS.find((u) => u.role === role);
    if (!next) return;
    useAuthStore.setState({ user: next, isAuthenticated: true });
    logAudit({ action: 'Switch Role (Demo)', details: `Switched to ${role}` });
    showToast(`Switched to ${role} (demo)`, 'info');
    navigate(`/${role.toLowerCase()}/home`);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[80] flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-2xl border border-border bg-surface shadow-soft p-3 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <FlaskConical className="h-4 w-4 text-primary" /> Demo helper
          </div>
          <div className="space-y-2">
            <p className="text-xs text-ink2">Switch role (no re-login)</p>
            <div className="grid grid-cols-3 gap-1">
              {(['Nurse', 'Doctor', 'Admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={cn(
                    'text-xs rounded-lg py-2 min-h-[44px] font-medium transition-colors',
                    user?.role === r ? 'bg-primary text-white dark:text-[#04211E]' : 'bg-bg text-ink2 hover:text-ink'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink2">Simulate offline</span>
            <button
              onClick={() => setOnline(!isOnline)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                !isOnline ? 'bg-primary' : 'bg-bg border border-border'
              )}
              aria-label="Toggle offline mode"
              aria-pressed={!isOnline}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white border border-border transition-transform',
                  !isOnline ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink2">Simulate load error</span>
            <button
              onClick={() => {
                setForceListError(!forceListError);
                showToast(
                  !forceListError ? 'Lists will fail to load (demo)' : 'Lists will load normally',
                  'info'
                );
              }}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                forceListError ? 'bg-danger' : 'bg-bg border border-border'
              )}
              aria-label="Toggle simulated load error"
              aria-pressed={forceListError}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white border border-border transition-transform',
                  forceListError ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              setForceBlur(true);
              setStep('mode');
              showToast('Next capture will fail quality check (blur)', 'info');
              navigate('/capture/mode');
            }}
          >
            Force blur-retake next
          </Button>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-ink2">API / database</span>
            <span className="text-xs font-medium text-ink">
              {dbEngine
                ? `Connected · ${dbEngine}`
                : dataStatus === 'error'
                ? 'Offline — demo data'
                : dataStatus === 'loading'
                ? 'Connecting…'
                : 'Demo data'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-ink text-white px-3 py-2 shadow-soft min-h-[44px] opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Demo helper"
      >
        <FlaskConical className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Demo</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
};