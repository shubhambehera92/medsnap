import { WifiOff } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineBanner = () => {
  const { offlineBannerVisible, isOnline } = useUIStore();
  
  return (
    <AnimatePresence>
      {offlineBannerVisible && !isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[90] bg-warning-light text-warning px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <WifiOff className="h-4 w-4" />
          You are offline. Actions will be queued.
        </motion.div>
      )}
    </AnimatePresence>
  );
};