'use client';

import { useCountUp } from '@/lib/hooks/useCountUp';
import { formatEuro } from '@/lib/calc/format';

/**
 * Kennzahl-Hero (Task 35): große, animiert hochzählende Gesamtkapital-Zahl
 * für den rechten Hero-Visual-Slot — steht seit Task 36 neben der
 * Wachstums-Illustration (siehe app/page.tsx), nicht durch sie ersetzt.
 *
 * Eigene Client-Komponente, weil `app/page.tsx` eine async Server Component
 * ist und Hooks (useCountUp) nur in Client-Components laufen dürfen.
 * useCountUp selbst respektiert `prefers-reduced-motion` (Sofort-Sprung auf
 * den Zielwert, siehe lib/hooks/useCountUp.ts).
 */
export function KennzahlHero({ gesamtKapital }: { gesamtKapital: number }) {
  const angezeigt = useCountUp(gesamtKapital, 1200);
  return (
    <div data-testid="kennzahl-hero">
      <p className="eyebrow">Bildungskapital heute</p>
      <p className="hero-number" style={{ fontSize: 'clamp(1.8rem, 4vw, 3.4rem)', margin: 0 }}>
        {formatEuro(angezeigt)}
      </p>
    </div>
  );
}
