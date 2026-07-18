import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WachstumsIllustration } from '../WachstumsIllustration';

// Sechs Wuchsstufen (Task 36) — deckungsgleich mit den fünf
// EINRICHTUNGS_LEVELS aus lib/data/levels.ts plus Stufe 0 (current === null,
// noch nicht einmal Bronze/10 % erreicht). Jede Zeile wählt aktuellesKapital
// so, dass einrichtungsLevel() eindeutig genau ein Level (oder keins)
// zurückgibt — siehe lib/data/__tests__/levels.test.ts für dieselben
// Schwellen (10/25/50/75/100 % von zielKapital).
const STUFEN = [
  { stage: 0, aktuell: 0, ziel: 100000, text: 'Wachstumsstufe: Samen — noch kein Level erreicht' },
  { stage: 1, aktuell: 15000, ziel: 100000, text: 'Wachstumsstufe: Keimling — Bronze erreicht' },
  { stage: 2, aktuell: 30000, ziel: 100000, text: 'Wachstumsstufe: Junges Bäumchen — Silber erreicht' },
  { stage: 3, aktuell: 60000, ziel: 100000, text: 'Wachstumsstufe: Baum mit Krone — Gold erreicht' },
  { stage: 4, aktuell: 80000, ziel: 100000, text: 'Wachstumsstufe: Großer Baum — Platin erreicht' },
  { stage: 5, aktuell: 100000, ziel: 100000, text: 'Wachstumsstufe: Baum voller Früchte — Diamant erreicht' },
];

describe('WachstumsIllustration', () => {
  describe.each(STUFEN)('Stufe $stage (aktuell=$aktuell von $ziel)', ({ stage, aktuell, ziel, text }) => {
    it(`rendert data-stage=${stage} und den passenden Zustandstext`, () => {
      const { container } = render(<WachstumsIllustration aktuellesKapital={aktuell} zielKapital={ziel} />);
      const wrapper = container.querySelector('[data-testid="wachstums-illustration"]');
      expect(wrapper).toHaveAttribute('data-stage', String(stage));
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  it('versieht das SVG mit aria-hidden — die Bedeutung trägt der sichtbare Text daneben', () => {
    const { container } = render(<WachstumsIllustration aktuellesKapital={0} zielKapital={100000} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('behandelt ein Zielkapital von 0 defensiv als Stufe 0 (Samen)', () => {
    const { container } = render(<WachstumsIllustration aktuellesKapital={0} zielKapital={0} />);
    expect(container.querySelector('[data-testid="wachstums-illustration"]')).toHaveAttribute('data-stage', '0');
  });

  it('rendert bei groesse="klein" ein kleineres SVG (64px) als bei "gross" (180px, Standard)', () => {
    const { container: klein } = render(
      <WachstumsIllustration aktuellesKapital={50000} zielKapital={100000} groesse="klein" />
    );
    const { container: gross } = render(
      <WachstumsIllustration aktuellesKapital={50000} zielKapital={100000} groesse="gross" />
    );
    expect(klein.querySelector('svg')).toHaveAttribute('width', '64');
    expect(gross.querySelector('svg')).toHaveAttribute('width', '180');
  });

  it('zeigt in der großen Variante den vollen Zustandssatz sichtbar (nie nur visuell)', () => {
    render(<WachstumsIllustration aktuellesKapital={15000} zielKapital={100000} groesse="gross" />);
    expect(screen.getByText('Wachstumsstufe: Keimling — Bronze erreicht')).toBeVisible();
  });

  // Design-Review-Fix (Finding 1): der volle Zustandssatz sprengte in vier
  // Zeilen die 64-px-Karten-Spalte und kollidierte mit dem Karten-<h2>. Die
  // kleine Variante zeigt daher nur noch den kurzen Stufennamen — einzeilig,
  // aber weiterhin sichtbarer Text (nicht sr-only), also weiterhin "Status
  // nie nur visuell" erfüllt. Die Beträge/Prozente liefert dort ohnehin der
  // ProgressBar-Label direkt unter der Karte.
  it('zeigt bei groesse="klein" nur das kurze Stufen-Label statt des vollen Satzes (sichtbar, nicht sr-only)', () => {
    render(<WachstumsIllustration aktuellesKapital={15000} zielKapital={100000} groesse="klein" />);
    expect(screen.getByText('Keimling')).toBeVisible();
    expect(screen.queryByText('Wachstumsstufe: Keimling — Bronze erreicht')).not.toBeInTheDocument();
  });

  // Regressionsschutz: längere Stufennamen ("Junges Bäumchen", "Baum voller
  // Früchte") sind bei 0.7rem breiter als die 64-px-Spalte. In einer echten
  // Karte (gemessen via Browser-Pane auf /einrichtungen, Card mit zweizeiligem
  // <h2>) überlappte "Junges Bäumchen" ohne diese Begrenzung um ~7,5px in den
  // Namen der Einrichtung hinein — dieselbe Kollisionsart wie Finding 1, nur
  // kleiner. Ellipsis+overflow:hidden statt Umbruch verhindert das für JEDEN
  // Stufennamen, unabhängig von der Kartenbreite/dem Nachbarnamen.
  it('begrenzt das Kurzlabel bei groesse="klein" per Ellipsis auf die Spaltenbreite (kein Überlauf in den Karten-Namen)', () => {
    const { container } = render(
      <WachstumsIllustration aktuellesKapital={30000} zielKapital={100000} groesse="klein" />
    );
    const label = container.querySelector('[data-testid="wachstums-illustration"] p');
    expect(label).toHaveStyle({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
    });
  });
});
