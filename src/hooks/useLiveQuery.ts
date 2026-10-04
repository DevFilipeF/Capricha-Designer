import { useState, useEffect } from 'react';

/**
 * Simple replacement for dexie-react-hooks useLiveQuery
 * Polls the query every interval ms for reactivity.
 */
export function useLiveQuery<T>(querier: () => Promise<T>, deps: any[] = [], interval = 2000): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const val = await querier();
        if (!cancelled) setResult(val);
      } catch (e) {
        console.error('useLiveQuery error:', e);
      }
    };

    run();
    const timer = setInterval(run, interval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return result;
}
