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

  it('zeigt den Zustandstext auch in der kleinen Variante sichtbar (nie nur visuell, unabhängig von der Größe)', () => {
    render(<WachstumsIllustration aktuellesKapital={15000} zielKapital={100000} groesse="klein" />);
    expect(screen.getByText('Wachstumsstufe: Keimling — Bronze erreicht')).toBeVisible();
  });
});
