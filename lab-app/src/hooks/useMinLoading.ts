import { useState, useRef, useCallback } from 'react';

/**
 * Like useState for a loading flag, but guarantees the loader stays visible
 * for at least `minMs` milliseconds so it never flashes and disappears instantly.
 */
export function useMinLoading(initial = true, minMs = 450) {
  const [loading, setRaw] = useState(initial);
  const startRef = useRef<number | null>(initial ? Date.now() : null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLoading = useCallback((val: boolean) => {
    if (val) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      startRef.current = Date.now();
      setRaw(true);
    } else {
      const elapsed = startRef.current != null ? Date.now() - startRef.current : minMs;
      const remaining = Math.max(0, minMs - elapsed);
      if (remaining > 0) {
        timerRef.current = setTimeout(() => { timerRef.current = null; setRaw(false); }, remaining);
      } else {
        setRaw(false);
      }
    }
  }, [minMs]);

  return [loading, setLoading] as const;
}
