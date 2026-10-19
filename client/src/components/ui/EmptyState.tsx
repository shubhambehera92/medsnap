import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, message, action, className }: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
      <div className="h-14 w-14 rounded-full bg-bg flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted" />
      </div>
      <h3 className="font-medium text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink2 max-w-sm mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-primary hover:text-primary-hover min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};