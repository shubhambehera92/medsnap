import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: 'bg-success-light text-success border-success/20',
  error: 'bg-danger-light text-danger border-danger/20',
  info: 'bg-info-light text-info border-info/20',
  warning: 'bg-warning-light text-warning border-warning/20',
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();
  
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-md w-full px-4 md:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border shadow-soft',
                styles[toast.type]
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-current hover:opacity-70 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};