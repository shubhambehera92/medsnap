import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

interface TopBarProps {
  title: string;
  showSearch?: boolean;
}

export const TopBar = ({ title, showSearch = false }: TopBarProps) => {
  const { isOnline } = useUIStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 'n1',
      text: 'New wound photo awaiting review',
      to: user?.role === 'Doctor' ? '/doctor/inbox' : '/patients',
      when: '2m ago',
    },
    {
      id: 'n2',
      text: 'Queued uploads will sync when back online',
      to: '/sync',
      when: '18m ago',
    },
    {
      id: 'n3',
      text: 'Consent expires in 7 days for a patient',
      to: '/patients',
      when: '1h ago',
    },
  ];

  const go = (to: string) => {
    setShowNotifications(false);
    navigate(to);
  };

  return (
    <div className="hidden md:flex items-center justify-between px-6 py-4 bg-surface border-b border-border sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="w-64">
            <Input placeholder="Search..." leftIcon={<Search className="h-4 w-4" />} className="h-9" />
          </div>
        )}
        <Badge variant={isOnline ? 'success' : 'warning'}>{isOnline ? 'Online' : 'Offline'}</Badge>

        <div className="relative">
          <button
            onClick={() => setShowNotifications((s) => !s)}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink2 hover:bg-bg hover:text-ink transition-colors"
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-danger rounded-full" />
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-80 z-50 rounded-2xl border border-border bg-surface shadow-soft overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-ink">Notifications</p>
                </div>
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => go(n.to)}
                      className="w-full text-left px-4 py-3 hover:bg-bg transition-colors min-h-[44px]"
                    >
                      <p className="text-sm text-ink">{n.text}</p>
                      <p className="text-xs text-muted mt-1">{n.when}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
