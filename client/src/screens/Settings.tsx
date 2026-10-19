import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppStore } from '@/stores/appStore';
import { logAudit } from '@/lib/audit';
import { Shield, Wifi, Info, LogOut, RefreshCw, Monitor, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

const SESSIONS = [
  { id: 's1', device: 'This browser', os: 'Windows · Chrome', current: true, lastActive: new Date().toISOString() },
  { id: 's2', device: 'iPad — Ward 4', os: 'iPadOS · Safari', current: false, lastActive: '2024-01-15T09:10:00Z' },
  { id: 's3', device: 'Nurse station PC', os: 'Windows · Edge', current: false, lastActive: '2024-01-14T18:40:00Z' },
];

export const Settings = () => {
  const { user, logout } = useAuthStore();
  const { isOnline, setOnline, showToast } = useUIStore();
  const { idleTimeout, updatePolicy } = useAppStore();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sessions, setSessions] = useState(SESSIONS);
  const navigate = useNavigate();

  const logoutOthers = () => {
    setSessions((s) => s.filter((x) => x.current));
    logAudit({ action: 'Log out other sessions', details: 'Revoked all other active sessions' });
    showToast('Other sessions signed out', 'success');
  };

  const changeIdle = (value: number) => {
    if (Number.isNaN(value) || value < 1) return;
    updatePolicy({ idleTimeout: value });
  };

  const doLogout = () => {
    logAudit({ action: 'Logout', details: 'User signed out' });
    logout();
    navigate('/login');
  };

  return (
    <MainLayout title="Settings">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary text-white dark:text-[#04211E] flex items-center justify-center text-lg font-medium">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-ink">{user?.name}</h2>
                <p className="text-sm text-ink2">{user?.email}</p>
                <Badge variant="info">{user?.role}</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
          <Card className="p-6">
            <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Security
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">Auto-lock timeout</p>
                  <p className="text-sm text-ink2">Log out after this many minutes of inactivity</p>
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={idleTimeout}
                    onChange={(e) => changeIdle(parseInt(e.target.value, 10))}
                    aria-label="Auto-lock timeout in minutes"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">Active sessions</p>
                  <Button variant="secondary" size="sm" onClick={logoutOthers}>
                    Log out other sessions
                  </Button>
                </div>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg">
                      {s.os.includes('iPad') ? (
                        <Smartphone className="h-5 w-5 text-ink2" />
                      ) : (
                        <Monitor className="h-5 w-5 text-ink2" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{s.device}</p>
                        <p className="text-xs text-muted">{s.os} · {new Date(s.lastActive).toLocaleString()}</p>
                      </div>
                      {s.current && <Badge variant="success">Current</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
          <Card className="p-6">
            <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" /> Connectivity & demo
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">Offline simulation</p>
                  <p className="text-sm text-ink2">Toggle to demo the encrypted queue</p>
                </div>
                <button
                  onClick={() => setOnline(!isOnline)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !isOnline ? 'bg-primary' : 'bg-border'
                  }`}
                  aria-label="Toggle offline mode"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !isOnline ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/sync')}>
                <RefreshCw className="h-4 w-4" /> Open Sync Queue & Held
              </Button>
              <p className="text-xs text-muted bg-warning-light p-3 rounded-lg border border-warning/20">
                <strong>DEMO MODE:</strong> Prototype with simulated OCR, EHR upload and wristband scan.
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
          <Card className="p-6">
            <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> About & privacy
            </h2>
            <div className="space-y-2 text-sm text-ink2">
              <p><strong className="text-ink">MedSnap</strong> v1.0.0 — PWA</p>
              <p>Team Techbuzzers · Hackyard Round 2</p>
              <p className="mt-2">
                Photos are captured in memory, encrypted at rest and never written to the device gallery.
                Every action is recorded in an append-only audit log. This prototype uses only clearly-labelled
                DEMO DATA — no real patient information.
              </p>
            </div>
          </Card>
        </motion.div>

        <Button variant="danger" className="w-full" onClick={() => setConfirmLogout(true)}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Log out?" sheetOnMobile={false}>
        <div className="space-y-4">
          <p className="text-sm text-ink2">You will be returned to the login screen. This action is logged.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmLogout(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={doLogout}>
              Log out
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
};
