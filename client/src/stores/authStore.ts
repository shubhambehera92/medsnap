import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { DEMO_USERS } from '@/data/demo';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loginAttempts: number;
  isLocked: boolean;
  lockUntil: number | null;
  login: (email: string, password: string) => Promise<{ success: boolean; requiresMFA?: boolean; message?: string }>;
  verifyMFA: (code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  resetLock: () => void;
}

const MFA_CODE = '123456';
const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loginAttempts: 0,
      isLocked: false,
      lockUntil: null,
      login: async (email, password) => {
        const state = get();
        const now = Date.now();
        
        if (state.isLocked && state.lockUntil && now < state.lockUntil) {
          const remaining = Math.ceil((state.lockUntil - now) / 1000 / 60);
          return { success: false, message: `Account locked. Try again in ${remaining} minutes.` };
        }
        
        if (state.isLocked) {
          set({ isLocked: false, lockUntil: null, loginAttempts: 0 });
        }
        
        const user = DEMO_USERS.find(u => u.email === email && password === 'demo123');
        
        if (!user) {
          const attempts = state.loginAttempts + 1;
          const locked = attempts >= MAX_ATTEMPTS;
          set({ 
            loginAttempts: attempts,
            isLocked: locked,
            lockUntil: locked ? now + LOCK_DURATION : null
          });
          return { success: false, message: locked ? `Account locked for 5 minutes.` : `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempts remaining.` };
        }
        
        set({ user, loginAttempts: 0, isLocked: false });
        return { success: true, requiresMFA: true };
      },
      verifyMFA: async (code) => {
        if (code !== MFA_CODE) {
          return { success: false, message: 'Invalid code' };
        }
        set({ isAuthenticated: true });
        return { success: true };
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      resetLock: () => {
        set({ isLocked: false, lockUntil: null, loginAttempts: 0 });
      },
    }),
    {
      name: 'medsnap-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);