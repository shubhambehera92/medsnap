import { Camera, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className, size = 'md' }: LogoProps) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };
  
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Camera className={cn('text-primary', sizes[size])} />
        <Shield className={cn('absolute -bottom-0.5 -right-0.5 text-primary bg-surface rounded-full', size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5')} />
      </div>
      <span className={cn('font-semibold text-ink', textSizes[size])}>MedSnap</span>
    </div>
  );
};