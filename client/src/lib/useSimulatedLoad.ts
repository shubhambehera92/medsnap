import { useCallback, useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

/**
 * Simulates an async data fetch so lists can render real loading skeletons and
 * a reachable error state (satisfying the empty / loading / error checklist)
 * without a backend.
 *
 * Toggle "Simulate load error" in the Demo helper to force the error branch.
 */
export function useSimulatedLoad(delay = 450) {
  const forceListError = useUIStore((s) => s.forceListError);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      if (forceListError) {
        setError('Could not reach the vault. Check your connection and try again.');
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delay, forceListError, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { loading, error, retry };
}
