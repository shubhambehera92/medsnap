import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Camera,
  Users,
  MessageCircle,
  Inbox,
  Settings,
  LogOut,
  Shield,
  UserCog,
  Database,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { logAudit } from '@/lib/audit';
import { Logo } from './Logo';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const { isOnline } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logAudit({ action: 'Logout', details: 'User signed out' });
    logout();
    navigate('/login');
  };
  
  const getNavItems = () => {
    if (!user) return [];
    const baseItems = [
      { icon: Home, label: 'Home', to: `/${user.role.toLowerCase()}/home` },
    ];
    
    if (user.role === 'Nurse') {
      return [
        ...baseItems,
        { icon: Camera, label: 'Capture', to: '/capture/mode' },
        { icon: Users, label: 'Patients', to: '/patients' },
        { icon: RefreshCw, label: 'Sync Queue', to: '/sync' },
        { icon: MessageCircle, label: 'Chat', to: '/chat' },
        { icon: Settings, label: 'Settings', to: '/settings' },
      ];
    }
    
    if (user.role === 'Doctor') {
      return [
        ...baseItems,
        { icon: Users, label: 'My Patients', to: '/patients' },
        { icon: Inbox, label: 'Inbox', to: '/doctor/inbox' },
        { icon: MessageCircle, label: 'Chat', to: '/chat' },
        { icon: Settings, label: 'Settings', to: '/settings' },
      ];
    }
    
    if (user.role === 'Admin') {
      return [
        ...baseItems,
        { icon: UserCog, label: 'Users', to: '/admin/users' },
        { icon: Shield, label: 'Policies', to: '/admin/policies' },
        { icon: Database, label: 'Audit Log', to: '/admin/audit' },
        { icon: Monitor, label: 'Devices', to: '/admin/devices' },
        { icon: Settings, label: 'Settings', to: '/settings' },
      ];
    }
    
    return baseItems;
  };
  
  const navItems = getNavItems();
  
  return (
    <div className="hidden md:flex w-64 flex-col h-screen bg-surface border-r border-border fixed left-0 top-0 z-40">
      <div className="p-6">
        <Logo />
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-ink2 hover:bg-bg hover:text-ink'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-bg">
          <div className="h-9 w-9 rounded-full bg-primary text-white dark:text-[#04211E] flex items-center justify-center text-sm font-medium">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
            <p className="text-xs text-muted truncate">{user?.role}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between px-3">
          <Badge variant={isOnline ? 'success' : 'warning'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink2 hover:bg-bg hover:text-danger transition-colors min-h-[44px]"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};