import { NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, Users, MessageCircle, MoreHorizontal, Database, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  
  const getNavItems = () => {
    if (!user) return [];
    
    if (user.role === 'Nurse') {
      return [
        { icon: Home, label: 'Home', to: `/${user.role.toLowerCase()}/home` },
        { icon: Camera, label: 'Capture', to: '/capture/mode' },
        { icon: Users, label: 'Patients', to: '/patients' },
        { icon: MessageCircle, label: 'Chat', to: '/chat' },
        { icon: MoreHorizontal, label: 'More', to: '/settings' },
      ];
    }
    
    if (user.role === 'Doctor') {
      return [
        { icon: Home, label: 'Home', to: `/${user.role.toLowerCase()}/home` },
        { icon: Users, label: 'Patients', to: '/patients' },
        { icon: MessageCircle, label: 'Chat', to: '/chat' },
        { icon: MoreHorizontal, label: 'More', to: '/settings' },
      ];
    }
    
    if (user.role === 'Admin') {
      return [
        { icon: Home, label: 'Home', to: `/${user.role.toLowerCase()}/home` },
        { icon: Users, label: 'Users', to: '/admin/users' },
        { icon: Database, label: 'Audit', to: '/admin/audit' },
        { icon: Settings, label: 'More', to: '/settings' },
      ];
    }
    
    return [];
  };
  
  const navItems = getNavItems();
  
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 pb-safe">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-2 min-h-[64px] min-w-[44px] transition-colors',
                isActive ? 'text-primary' : 'text-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};