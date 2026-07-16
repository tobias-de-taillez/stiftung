import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 800;

function easeOutQuad(progress: number): number {
  return 1 - (1 - progress) * (1 - progress);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animiert einen Zahlenwert von 0 auf `target` hoch (ease-out, requestAnimationFrame).
 * Respektiert `prefers-reduced-motion`: springt dann sofort auf `target`.
 */
export function useCountUp(target: number, durationMs: number = DEFAULT_DURATION_MS): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frameId: number;
    let startTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(1, elapsed / durationMs);
      // Am Ende exakt `target` setzen (nicht durch Rundung/Ease-Out-Rundungsfehler
      // approximiert) — wichtig für nicht-ganzzahlige Zielwerte (z. B. Euro-Beträge).
      setValue(progress < 1 ? Math.round(target * easeOutQuad(progress)) : target);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return value;
}
