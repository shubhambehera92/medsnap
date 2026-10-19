import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, children, className, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px]';
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-soft dark:text-[#04211E]',
      secondary: 'bg-surface text-ink border border-border hover:bg-bg shadow-soft',
      ghost: 'text-ink hover:bg-bg',
      danger: 'bg-danger text-white hover:bg-danger/90 shadow-soft',
    };
    
    const sizes = {
      sm: 'h-9 px-3 text-sm rounded-xl',
      md: 'h-11 px-4 text-base rounded-xl',
      lg: 'h-12 px-6 text-base rounded-xl',
    };
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';