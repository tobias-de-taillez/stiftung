'use client';

import { useEffect, useState } from 'react';
import { formatEuro } from '@/lib/calc/format';
import { useCountUp, prefersReducedMotion } from '@/lib/hooks/useCountUp';

export interface ZeitrafferVerteilungsPosten {
  slug: string;
  name: string;
  anteil: number;
}

export interface ZeitrafferMeilenstein {
  slug: string;
  name: string;
  labels: string[];
}

export interface ZeitrafferErgebnisProps {
  fondsErtrag: number;
  kapitalErtrag: number;
  verteiltGesamt: number;
  verteilung: ZeitrafferVerteilungsPosten[];
  neuerFondsBestand: number;
  // Meilenstein-Tags pro Einrichtung (Task 31) — optional: ältere Mocks/Aufrufer
  // ohne dieses Feld dürfen nicht crashen (Default []).
  meilensteine?: ZeitrafferMeilenstein[];
}

const ITEM_STAGGER_MS = 220;
// Übergang zur Verteilungs-Phase — orientiert sich an der Count-up-Dauer des
// Kapital-Ertrags (useCountUp-Default 800ms) plus kleinem Puffer.
const PHASE_KAPITAL_MS = 900;
const PHASE_ABSCHLUSS_PUFFER_MS = 400;

type Phase = 'kapital' | 'verteilung' | 'abschluss';

/**
 * Inszenierte Sequenz für „Jahr simulieren" (Task 32): (1) Kapital wächst
 * +6 % mit Count-up, (2) Verteilung an die Bedürftigsten baut sich gestaffelt
 * auf (größter Empfänger hervorgehoben), (3) Abschluss-Summe. Reine
 * Client-Inszenierung der bereits vorhandenen API-Antwort — keine neuen
 * Requests. Gesamtdauer < 4 s (siehe PHASE_*-Konstanten).
 *
 * `prefersReducedMotion()` wird einmal beim Mounten gelesen: unter
 * reduced-motion ist die gesamte Sequenz von Anfang an im Endzustand
 * (deterministisch, keine Timer) — siehe useCountUp, das denselben Check
 * intern für den jeweiligen Count-up-Wert nutzt.
 */
export function ZeitrafferErgebnis({
  fondsErtrag,
  kapitalErtrag,
  verteiltGesamt,
  verteilung,
  neuerFondsBestand,
  meilensteine = [],
}: ZeitrafferErgebnisProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(reduced ? 'abschluss' : 'kapital');
  const [revealedCount, setRevealedCount] = useState(reduced ? verteilung.length : 0);

  useEffect(() => {
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('verteilung'), PHASE_KAPITAL_MS));
    for (let i = 0; i < verteilung.length; i++) {
      const naechsterStand = i + 1;
      timers.push(
        setTimeout(
          () => setRevealedCount((c) => Math.max(c, naechsterStand)),
          PHASE_KAPITAL_MS + naechsterStand * ITEM_STAGGER_MS
        )
      );
    }
    timers.push(
      setTimeout(
        () => setPhase('abschluss'),
        PHASE_KAPITAL_MS + verteilung.length * ITEM_STAGGER_MS + PHASE_ABSCHLUSS_PUFFER_MS
      )
    );
    return () => timers.forEach(clearTimeout);
    // Nur beim Mount planen: Elternteil vergibt `key={nummer}`, jede neue
    // Simulation erzeugt also eine frische Instanz mit eigener Sequenz statt
    // Timer einer laufenden Sequenz neu zu berechnen.
  }, [reduced, verteilung.length]);

  const angezeigterKapitalErtrag = useCountUp(kapitalErtrag);
  const groessterAnteil = verteilung.reduce((max, v) => Math.max(max, v.anteil), 0);
  const meilensteineNachSlug = new Map(meilensteine.map((m) => [m.slug, m.labels]));

  return (
    <div data-testid="zeitraffer-ergebnis">
      <div data-testid="zeitraffer-kapital" style={{ marginTop: '1rem' }}>
        <p className="eyebrow">Kapital wächst +6 % (Jahressimulation)</p>
        <p>Fonds-Ertrag: {formatEuro(fondsErtrag)}</p>
        <p>Kapital-Ertrag (alle Einrichtungen): {formatEuro(angezeigterKapitalErtrag)}</p>
      </div>

      {(phase === 'verteilung' || phase === 'abschluss') && (
        <div data-testid="zeitraffer-verteilung" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Fonds verteilt an die Bedürftigsten</p>
          {verteilung.length === 0 ? (
            <p className="muted">Kein Bedarf — alle Einrichtungen haben ihr Pro-Kind-Ziel erreicht.</p>
          ) : (
            <ul>
              {verteilung.slice(0, revealedCount).map((v) => (
                <ZeitrafferVerteilungsEintrag
                  key={v.slug}
                  eintrag={v}
                  istGroesster={v.anteil === groessterAnteil}
                  meilensteinLabels={meilensteineNachSlug.get(v.slug) ?? []}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {phase === 'abschluss' && (
        <div data-testid="zeitraffer-abschluss" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Jahresabschluss</p>
          <p>Verteilt: {formatEuro(verteiltGesamt)}</p>
          <p>Neuer Fonds-Bestand: {formatEuro(neuerFondsBestand)}</p>
        </div>
      )}
    </div>
  );
}

function ZeitrafferVerteilungsEintrag({
  eintrag,
  istGroesster,
  meilensteinLabels,
}: {
  eintrag: ZeitrafferVerteilungsPosten;
  istGroesster: boolean;
  meilensteinLabels: string[];
}) {
  // Eigene Komponente pro Eintrag, damit useCountUp nicht in einer
  // .map()-Schleife aufgerufen wird (Rules of Hooks).
  const angezeigterAnteil = useCountUp(eintrag.anteil, 500);
  return (
    <li className={istGroesster ? 'zeitraffer-eintrag zeitraffer-eintrag--top' : 'zeitraffer-eintrag'}>
      {istGroesster && <span aria-hidden="true">⭐ </span>}
      {eintrag.name}: {formatEuro(angezeigterAnteil)}
      {meilensteinLabels.map((label) => (
        <span key={label} className="zeitraffer-meilenstein-tag"> 🎉 {label}</span>
      ))}
    </li>
  );
}
