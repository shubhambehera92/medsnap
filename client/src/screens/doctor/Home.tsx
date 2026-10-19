import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { Users, Inbox, MessageCircle, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export const DoctorHome = () => {
  const { user } = useAuthStore();
  const { photos, chatThreads } = useAppStore();
  const navigate = useNavigate();

  const pendingReviews = photos.filter((p) => p.status === 'Filed' && !p.reviewed).length;

  const tiles = [
    { label: 'Inbox', value: pendingReviews, sub: 'Photos awaiting review', icon: Inbox, to: '/doctor/inbox', tint: 'bg-info-light text-info' },
    { label: 'My Patients', value: 12, sub: 'Active cases', icon: Users, to: '/patients', tint: 'bg-primary-light text-primary' },
    { label: 'Chat Threads', value: chatThreads.length, sub: 'Active conversations', icon: MessageCircle, to: '/chat', tint: 'bg-success-light text-success' },
  ];

  return (
    <MainLayout title="Home">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-1"
        >
          <h1 className="text-2xl font-semibold text-ink">Good day, {user?.name}</h1>
          <p className="text-ink2">Doctor, City General Demo Hospital</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="grid md:grid-cols-3 gap-4"
        >
          {tiles.map((t) => (
            <button key={t.label} onClick={() => navigate(t.to)} className="text-left">
              <Card className="p-4 hover:border-primary/40 transition-colors h-full">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.tint}`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-ink2">{t.label}</p>
                    <p className="text-xl font-semibold text-ink tabular-nums">{t.value}</p>
                    <p className="text-xs text-muted">{t.sub}</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <button onClick={() => navigate('/doctor/inbox')} className="w-full text-left">
            <Card className="p-4 border-primary/20 bg-primary-light/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-primary" />
                <p className="text-sm text-ink">
                  {pendingReviews > 0
                    ? `${pendingReviews} capture(s) are ready for your review.`
                    : 'No captures waiting — new nurse uploads will appear in your inbox.'}
                </p>
              </div>
            </Card>
          </button>
        </motion.div>
      </div>
    </MainLayout>
  );
};
