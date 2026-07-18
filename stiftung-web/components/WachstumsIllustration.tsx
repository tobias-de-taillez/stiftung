import { einrichtungsLevel } from '@/lib/data/levels';

export interface WachstumsIllustrationProps {
  aktuellesKapital: number;
  zielKapital: number;
  groesse?: 'klein' | 'gross';
}

interface Wuchsstufe {
  stage: number;
  name: string;
  levelLabel: string | null;
}

// Task 36: eigene Bildwelt „Wachstum" statt der Weltraum-/Missions-
// Illustration des Vorgänger-Projekts (DESIGN.md §3 im wealth-Projekt:
// „bedeutungstragend, nicht dekorativ"). Die Wuchsstufe der Pflanze codiert
// direkt das Einrichtungs-Level aus einrichtungsLevel() (Task 30) — sechs
// Stufen, wobei Stufe 0 (Samen) den Zustand "current === null" abbildet
// (noch nicht einmal Bronze/10 % erreicht) und die Stufen 1–5 den fünf
// EINRICHTUNGS_LEVELS 1:1 entsprechen. Reihenfolge ist absichtlich
// deckungsgleich mit lib/data/levels.ts EINRICHTUNGS_LEVELS, damit ein
// Level-Name hier per levelLabel wiedergefunden wird, statt die
// Schwellenlogik zu duplizieren.
const WUCHSSTUFEN: Wuchsstufe[] = [
  { stage: 0, name: 'Samen', levelLabel: null },
  { stage: 1, name: 'Keimling', levelLabel: 'Bronze' },
  { stage: 2, name: 'Junges Bäumchen', levelLabel: 'Silber' },
  { stage: 3, name: 'Baum mit Krone', levelLabel: 'Gold' },
  { stage: 4, name: 'Großer Baum', levelLabel: 'Platin' },
  { stage: 5, name: 'Baum voller Früchte', levelLabel: 'Diamant' },
];

function wuchsstufeFuer(levelName: string | undefined): Wuchsstufe {
  if (!levelName) return WUCHSSTUFEN[0];
  return WUCHSSTUFEN.find((s) => s.levelLabel === levelName) ?? WUCHSSTUFEN[0];
}

// Erdhügel/Topf — für alle Stufen gleich, schwingt NICHT im Wind (nur der
// oberirdische Pflanzenteil tut das, siehe .wachstum-sway weiter unten).
//
// Design-Review-Fix (Finding 2): `var(--surface-2)` als Füllung verschwindet
// gegen den Card-Hintergrund (Gradient aus var(--surface)/var(--space-2), beides
// dunkles Navy) — übrig blieb nur der Lavendel-Ring, der zusammen mit einem
// dünnen Stiel + einzelnem Kreis (Stufen 2/3, siehe Pflanze()) wie ein
// Map-Pin/Lolli wirkte. Fix: Lavendel-Füllung mit niedriger Deckkraft statt
// `--surface-2` — liest sich als Erdhügel, nicht als hohler Ring.
function ErdhuegelUndSamen({ zeigeSamen }: { zeigeSamen: boolean }) {
  return (
    <>
      <ellipse cx="60" cy="103" rx="36" ry="11" fill="var(--lavender)" fillOpacity={0.25} stroke="var(--lavender)" strokeWidth="2" />
      {/* Bonus-Fix (Minor 3): Same bei Stufe 0 größer/kontrastreicher — die
          neediest Einrichtungen (noch kein Level erreicht) verdienen ein
          klar sichtbares Symbol, nicht nur einen kleinen Punkt. */}
      {zeigeSamen && <circle cx="60" cy="96" r="9" fill="var(--lavender)" stroke="var(--turquoise)" strokeWidth="1.5" />}
    </>
  );
}

// Oberirdischer Pflanzenteil je Stufe — nur eigene SVG-Primitives
// (Rechtecke/Ellipsen/Kreise), ausschließlich Token-Farben: Stamm/Blätter/
// Krone in var(--turquoise), Früchte (nur Stufe 5) in var(--sun).
function Pflanze({ stage }: { stage: number }) {
  switch (stage) {
    case 1: // Keimling: dünner Stiel + zwei kleine Keimblätter
      return (
        <>
          <rect x="57" y="78" width="6" height="22" rx="3" fill="var(--turquoise)" />
          <ellipse cx="48" cy="80" rx="9" ry="5" fill="var(--turquoise)" transform="rotate(-25 48 80)" />
          <ellipse cx="72" cy="80" rx="9" ry="5" fill="var(--turquoise)" transform="rotate(25 72 80)" />
        </>
      );
    case 2: // Junges Bäumchen: „Keimling, der zum Baum wird" — die beiden
      // Keimblätter aus Stufe 1 bleiben unten am (jetzt höheren) Stamm
      // erhalten, obendrauf wächst eine erste kleine, einlappige Krone.
      // Bewusst KEIN nackter Stiel mit einzelnem Kreis (Design-Review
      // Finding 2: das las sich als Map-Pin) — die Blätter am Fuß machen die
      // Silhouette eindeutig als Baum/Pflanze erkennbar.
      return (
        <>
          <rect x="56" y="70" width="8" height="30" rx="4" fill="var(--turquoise)" />
          <ellipse cx="48" cy="88" rx="9" ry="5" fill="var(--turquoise)" transform="rotate(-25 48 88)" />
          <ellipse cx="72" cy="88" rx="9" ry="5" fill="var(--turquoise)" transform="rotate(25 72 88)" />
          <circle cx="60" cy="60" r="18" fill="var(--turquoise)" />
        </>
      );
    case 3: // Baum mit Krone: kräftigerer Stamm + dreilappige „Wolken"-Krone
      // (zwei kleinere Seitenlappen + Hauptlappen) — sichtbare Vorstufe der
      // vollen Drei-Kreis-Krone aus Stufe 4, statt eines einzelnen perfekten
      // Kreises auf dem Stiel (der wie ein Lolli/Map-Pin wirkte).
      return (
        <>
          <rect x="54" y="42" width="12" height="58" rx="5" fill="var(--turquoise)" />
          <circle cx="60" cy="38" r="22" fill="var(--turquoise)" />
          <circle cx="45" cy="46" r="14" fill="var(--turquoise)" />
          <circle cx="75" cy="46" r="14" fill="var(--turquoise)" />
        </>
      );
    case 4: // Großer Baum: dickerer Stamm + volle Krone aus drei Kreisen
      return (
        <>
          <rect x="52" y="28" width="16" height="72" rx="6" fill="var(--turquoise)" />
          <circle cx="60" cy="24" r="30" fill="var(--turquoise)" />
          <circle cx="38" cy="36" r="20" fill="var(--turquoise)" />
          <circle cx="82" cy="36" r="20" fill="var(--turquoise)" />
        </>
      );
    case 5: // Baum voller Früchte: wie Stufe 4, plus verstreute Früchte
      return (
        <>
          <rect x="52" y="28" width="16" height="72" rx="6" fill="var(--turquoise)" />
          <circle cx="60" cy="24" r="30" fill="var(--turquoise)" />
          <circle cx="38" cy="36" r="20" fill="var(--turquoise)" />
          <circle cx="82" cy="36" r="20" fill="var(--turquoise)" />
          <circle cx="46" cy="16" r="5" fill="var(--sun)" />
          <circle cx="74" cy="14" r="5" fill="var(--sun)" />
          <circle cx="60" cy="32" r="5" fill="var(--sun)" />
          <circle cx="34" cy="34" r="5" fill="var(--sun)" />
          <circle cx="86" cy="30" r="5" fill="var(--sun)" />
        </>
      );
    default:
      return null;
  }
}

/**
 * Wachstums-Illustration (Task 36): bedeutungstragende SVG-Pflanze, deren
 * Wuchsstufe den Finanztopf-Füllstand einer Einrichtung (oder — auf der
 * Landing-Page — die Summe aller Einrichtungen) codiert. Reine SVG/CSS-
 * Primitives, keine Bild-Assets, keine neue Dependency.
 *
 * Synchrone Server-Komponente (wie MiniBalkenwald) — keine Hooks nötig, die
 * Wind-Animation läuft komplett über CSS (.wachstum-sway in globals.css) und
 * degradiert unter prefers-reduced-motion automatisch über den bestehenden
 * globalen Override dort.
 *
 * Barrierefreiheit (DESIGN.md: „Status nie nur über Farbe/visuell"): das SVG
 * selbst ist `aria-hidden`, der Zustand steht als sichtbarer Text daneben
 * (nicht sr-only) — in BEIDEN Größen, nicht nur in der großen. Die kleine
 * Variante (Design-Review Finding 1) zeigt dafür nur ein kurzes Label (den
 * Stufennamen, z. B. „Keimling") statt des vollen Satzes — auf den
 * Listen-Karten sprengte der volle Satz in vier Zeilen die 64-px-Spalte und
 * kollidierte mit dem Karten-`<h2>`. Die konkreten Beträge/Prozente trägt
 * dort ohnehin der `ProgressBar`-Label direkt darunter; das Kurzlabel hält
 * „Status nie nur visuell" trotzdem ein, weil die Wuchsstufe als Wort lesbar
 * bleibt.
 */
export function WachstumsIllustration({ aktuellesKapital, zielKapital, groesse = 'gross' }: WachstumsIllustrationProps) {
  const { current } = einrichtungsLevel(aktuellesKapital, zielKapital);
  const stufe = wuchsstufeFuer(current?.name);
  const groesseInPx = groesse === 'klein' ? 64 : 180;
  const zustandsText = stufe.levelLabel
    ? `Wachstumsstufe: ${stufe.name} — ${stufe.levelLabel} erreicht`
    : `Wachstumsstufe: ${stufe.name} — noch kein Level erreicht`;
  // Kurzlabel für die kleine Kartenvariante: nur der Stufenname, einzeilig.
  const kurzLabel = stufe.name;

  return (
    <div
      data-testid="wachstums-illustration"
      data-stage={stufe.stage}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', width: groesseInPx }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        width={groesseInPx}
        height={groesseInPx}
        className={`wachstum-stufe-${stufe.stage}`}
      >
        <ErdhuegelUndSamen zeigeSamen={stufe.stage === 0} />
        {stufe.stage > 0 && (
          <g className="wachstum-sway">
            <Pflanze stage={stufe.stage} />
          </g>
        )}
      </svg>
      <p
        className={groesse === 'klein' ? 'muted' : 'eyebrow'}
        style={
          groesse === 'klein'
            ? // Einzeilig, kein Umbruch (Finding 1) — UND per Ellipsis auf die
              // 64-px-Spalte begrenzt: manche Stufennamen ("Junges Bäumchen",
              // "Baum voller Früchte") sind bei 0.7rem breiter als 64px und
              // würden sonst — je nach Namenslänge der Karte daneben — genau
              // die Kollision mit dem <h2> reproduzieren, die Finding 1 erst
              // behoben hat (gemessen: ~34px Überlauf bei "Junges Bäumchen").
              {
                margin: 0,
                fontSize: '0.7rem',
                textAlign: 'center',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }
            : { margin: 0, textAlign: 'center', lineHeight: 1.25 }
        }
      >
        {groesse === 'klein' ? kurzLabel : zustandsText}
      </p>
    </div>
  );
}
