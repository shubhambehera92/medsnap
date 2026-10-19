import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { DEMO_USERS } from '@/data/demo';
import { UserCog, Database, Monitor, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminHome = () => {
  const { user } = useAuthStore();
  const { auditLog, devices } = useAppStore();
  const navigate = useNavigate();

  const tiles = [
    { label: 'Users', value: DEMO_USERS.length, icon: UserCog, to: '/admin/users', tint: 'bg-primary-light text-primary' },
    { label: 'Audit entries', value: auditLog.length, icon: Database, to: '/admin/audit', tint: 'bg-info-light text-info' },
    { label: 'Devices', value: devices.length, icon: Monitor, to: '/admin/devices', tint: 'bg-warning-light text-warning' },
    {
      label: 'Wipe pending',
      value: devices.filter((d) => d.status === 'Wipe pending').length,
      icon: AlertCircle,
      to: '/admin/devices',
      tint: 'bg-danger-light text-danger',
    },
  ];

  return (
    <MainLayout title="Admin Console">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-1"
        >
          <h1 className="text-2xl font-semibold text-ink">Admin Console</h1>
          <p className="text-ink2">Welcome, {user?.name}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {tiles.map((t) => (
            <button key={t.label} onClick={() => navigate(t.to)} className="text-left">
              <Card className="p-4 hover:border-primary/40 transition-colors h-full">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.tint}`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-ink2">{t.label}</p>
                    <p className="text-xl font-semibold text-ink tabular-nums">{t.value}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </motion.div>
      </div>
    </MainLayout>
  );
};
