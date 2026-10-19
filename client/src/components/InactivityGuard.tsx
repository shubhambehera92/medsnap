import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { logAudit } from '@/lib/audit';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/**
 * Auto-logout after `idleTimeout` minutes of inactivity. Shows a 15-second
 * "Still there?" countdown before logging out. Logout is always audited.
 */
export const InactivityGuard = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const idleTimeout = useAppStore((s) => s.idleTimeout);
  const navigate = useNavigate();
  const [warning, setWarning] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const reset = () => {
      lastActivity.current = Date.now();
      setWarning(false);
      setCountdown(15);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivity.current;
      const timeoutMs = idleTimeout * 60 * 1000;
      if (idleMs >= timeoutMs + 15000) {
        logAudit({ action: 'Auto Logout', details: 'Logged out after inactivity' });
        logout();
        navigate('/login');
      }
    }, 1000);

    const warnTimer = setInterval(() => {
      const idleMs = Date.now() - lastActivity.current;
      const timeoutMs = idleTimeout * 60 * 1000;
      if (idleMs >= timeoutMs && !warning) {
        setWarning(true);
      }
    }, 500);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearInterval(interval);
      clearInterval(warnTimer);
    };
  }, [isAuthenticated, idleTimeout, logout, navigate, warning]);

  useEffect(() => {
    if (!warning) return;
    setCountdown(15);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [warning]);

  const stay = () => {
    lastActivity.current = Date.now();
    setWarning(false);
  };

  const logoutNow = () => {
    logAudit({ action: 'Logout', details: 'User chose to log out from idle warning' });
    logout();
    navigate('/login');
  };

  return (
    <Modal open={warning} onClose={stay} title="Still there?" sheetOnMobile={false}>
      <div className="space-y-4">
        <p className="text-sm text-ink2">
          You've been inactive. For security you'll be logged out in{' '}
          <span className="font-semibold text-ink tabular-nums">{Math.max(countdown, 0)}s</span>.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={logoutNow}>
            Log out now
          </Button>
          <Button className="flex-1" onClick={stay}>
            Stay signed in
          </Button>
        </div>
      </div>
    </Modal>
  );
};