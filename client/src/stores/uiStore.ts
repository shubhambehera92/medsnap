import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UIState {
  isOnline: boolean;
  offlineBannerVisible: boolean;
  /** Demo-only: forces the next simulated list load to fail so error states are demoable. */
  forceListError: boolean;
  toasts: Toast[];
  showToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  setOnline: (online: boolean) => void;
  setForceListError: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineBannerVisible: false,
  forceListError: false,
  toasts: [],
  showToast: (message, type) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  setOnline: (online) => {
    set({ isOnline: online, offlineBannerVisible: !online });
  },
  setForceListError: (forceListError) => {
    set({ forceListError });
  },
}));

// Initialize online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useUIStore.getState().setOnline(true);
  });
  window.addEventListener('offline', () => {
    useUIStore.getState().setOnline(false);
  });
}