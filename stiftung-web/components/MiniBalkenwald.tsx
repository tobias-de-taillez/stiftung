import { formatEuro } from '@/lib/calc/format';

export interface BalkenwaldEintrag {
  slug: string;
  name: string;
  kapital: number;
}

/**
 * Mini-Balkenwald (Task 35): kompakte Balkenübersicht aller Einrichtungen
 * für den rechten Hero-Visual-Slot — bleibt bewusst neben der
 * Wachstums-Illustration (Task 36) bestehen, statt von ihr ersetzt zu
 * werden (siehe app/page.tsx). Nutzt echte Daten (listEinrichtungen()),
 * keine Fixture — bei 8 Einrichtungen im Seed entsteht so der titelgebende
 * "Wald" aus 8 Balken, generisch für jede Anzahl.
 *
 * Wachstum läuft rein über CSS (.mini-balkenwald-bar in globals.css, gleiches
 * "nur from-Keyframe"-Muster wie .progress-bar-fill-in): kein Hook, keine
 * 'use client'-Direktive nötig, SSR-fähig, automatisch reduced-motion-sicher
 * über den globalen Override.
 *
 * Wie bei BarChart.tsx trägt jeder Balken einen Text-Label (Name) UND einen
 * title-Tooltip mit Name+Betrag — Wert wird nie nur über Balkenhöhe/Farbe
 * kommuniziert (DESIGN.md: „Status nie nur über Farbe — immer Zahl daneben").
 */
export function MiniBalkenwald({ einrichtungen }: { einrichtungen: BalkenwaldEintrag[] }) {
  const max = Math.max(1, ...einrichtungen.map((e) => e.kapital));

  return (
    <div
      data-testid="mini-balkenwald"
      style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '140px' }}
    >
      {einrichtungen.map((e) => {
        const pct = Math.max(3, Math.round((e.kapital / max) * 100));
        const beschriftung = `${e.name}: ${formatEuro(e.kapital)}`;
        return (
          <div
            key={e.slug}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              gap: '0.35rem',
            }}
          >
            <div
              role="img"
              aria-label={beschriftung}
              title={beschriftung}
              className="mini-balkenwald-bar"
              style={{ width: '100%', height: `${pct}%`, borderRadius: '4px 4px 0 0', background: 'var(--turquoise)' }}
            />
            <span
              className="muted"
              style={{
                fontSize: '0.6rem',
                textAlign: 'center',
                lineHeight: 1.15,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {e.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
