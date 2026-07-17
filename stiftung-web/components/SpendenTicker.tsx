'use client';

import { useEffect, useState } from 'react';
import { Card } from './Card';
import { formatEuro } from '@/lib/calc/format';

export type SpendenTickerEintrag = {
  betrag: number;
  einrichtungName: string;
  quelle: string;
  vorMinuten: number;
};

// Polling-Intervall für den Live-Ticker (Task 33) — exportiert, damit der
// Test explizit denselben Wert referenziert statt ihn zu duplizieren.
export const POLL_INTERVAL_MS = 15000;

function zeitLabel(vorMinuten: number): string {
  return vorMinuten <= 0 ? 'Gerade eben' : `Vor ${vorMinuten} Min`;
}

/**
 * Live-Ticker der letzten Spenden (Task 33). Pollt `/api/spenden/letzte`
 * beim Mounten und danach alle 15 s. `quelle: 'solidaritaet'` (Buchungen aus
 * der Solidaritätsfonds-Verteilung, keine Spende von echten Personen) wird
 * hier — nicht im Backend — als "Solidaritätsfonds-Verteilung" gelabelt; die
 * API reicht `quelle` bewusst unverändert durch.
 */
export function SpendenTicker() {
  const [eintraege, setEintraege] = useState<SpendenTickerEintrag[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function laden() {
      // Optionaler Sichtbarkeits-Guard: kein Netzwerk-Traffic für Tabs im
      // Hintergrund. `document` fehlt nie im Browser, die Prüfung schützt nur
      // gegen exotische Testumgebungen ohne `document.hidden`.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch('/api/spenden/letzte');
        if (!res.ok) return;
        const json: SpendenTickerEintrag[] = await res.json();
        if (!cancelled) setEintraege(json);
      } catch {
        // Ticker bleibt beim letzten bekannten Stand — kein Fehler-UI nötig,
        // der nächste Poll versucht es erneut.
      }
    }

    laden();
    const interval = setInterval(laden, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <p className="eyebrow">Live-Ticker</p>
      {eintraege.length === 0 ? (
        <p className="muted">Sei die erste Spende!</p>
      ) : (
        <ul style={{ display: 'grid', gap: '0.5rem', listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
          {eintraege.map((e, i) => (
            <li key={i} className="spenden-ticker-eintrag">
              {zeitLabel(e.vorMinuten)}: {formatEuro(e.betrag)} für {e.einrichtungName}
              {e.quelle === 'solidaritaet' && (
                <span className="muted"> · Solidaritätsfonds-Verteilung</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
