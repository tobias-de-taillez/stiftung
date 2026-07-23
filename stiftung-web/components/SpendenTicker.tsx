'use client';

import { useEffect, useState } from 'react';
import { Card } from './Card';
import { formatEuroFromCent } from '@/lib/calc/format';

export type SpendenTickerEintrag = {
  betragCent: number;
  typ: string;
  einrichtungName: string;
  vorMinuten: number;
  zeitpunkt: number;
};

// Polling-Intervall für den Live-Ticker (Task 33) — exportiert, damit der
// Test explizit denselben Wert referenziert statt ihn zu duplizieren.
export const POLL_INTERVAL_MS = 15000;

// Typ→Label-Mapping (Task 19, ersetzt das quelle==='solidaritaet'-Sonderlabel
// aus der alten Welt): buchungsTicker() liefert einen von fünf Buchungstypen
// (siehe TICKER_TYPEN in uebersichtService.ts) — jeder bekommt hier ein
// sprechendes Label statt des rohen Buchungstyp-Strings.
const TYP_LABELS: Record<string, string> = {
  spende: 'Spende',
  soli_spende: 'Fonds-Spende',
  erstbefuellung: 'Erstbefüllung',
  kaskade_umverteilung: 'Solidaritätsfonds-Verteilung',
  direktausschuettung_eingang: 'Direktspende',
};

function zeitLabel(vorMinuten: number): string {
  return vorMinuten <= 0 ? 'Gerade eben' : `Vor ${vorMinuten} Min`;
}

/**
 * Live-Ticker der letzten Buchungen (Task 33, seit Task 19 auf dem
 * Buchungsjournal statt der alten Spende-Tabelle). Pollt
 * `/api/spenden/letzte` beim Mounten und danach alle 15 s. `typ` wird über
 * TYP_LABELS auf ein sprechendes Label gemappt — die API reicht `typ`
 * bewusst unverändert durch, das Labeling ist Sache der UI-Komponente.
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
            <li key={`${e.zeitpunkt}-${i}`} className="spenden-ticker-eintrag">
              {zeitLabel(e.vorMinuten)}: {formatEuroFromCent(e.betragCent)} für {e.einrichtungName}
              <span className="muted"> · {TYP_LABELS[e.typ] ?? e.typ}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
