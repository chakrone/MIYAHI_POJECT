import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Polls an async fetcher on a stable interval.
 *
 * Key fix: we store the latest fetcher in a ref so the setInterval
 * callback always calls the current fetcher without the interval
 * itself needing to be torn down and recreated on every render.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 5000
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep latest fetcher in a ref — avoids restarting the interval on every render
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const refresh = useCallback(() => {
    fetcherRef.current()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // stable — never changes

  useEffect(() => {
    // Fire immediately on mount
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]); // intervalMs change restarts the interval (correct)

  return { data, loading, error, refresh };
}
