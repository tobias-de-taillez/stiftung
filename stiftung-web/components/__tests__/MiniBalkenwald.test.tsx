import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MiniBalkenwald } from '../MiniBalkenwald';
import { formatEuroFromCent } from '@/lib/calc/format';

// Acht Einträge wie im echten Seed (prisma/seed.ts) — der titelgebende
// "Wald" aus 8 Balken. Kapital ist seit Task 19 ein Cent-Wert.
const ACHT = [
  { slug: 'tagespflege-wirbelwind', name: 'Tagespflege Wirbelwind', kapital: 300000 },
  { slug: 'tagespflege-sonnenschein', name: 'Tagespflege Sonnenschein', kapital: 80000 },
  { slug: 'tagespflege-kleine-forscher', name: 'Tagespflege Kleine Forscher', kapital: 1200000 },
  { slug: 'kita-wirbelwind', name: 'Kita Wirbelwind', kapital: 1500000 },
  { slug: 'kita-regenbogen', name: 'Kita Regenbogen', kapital: 500000 },
  { slug: 'grundschule-sonnenhuegel', name: 'Grundschule Sonnenhügel', kapital: 5000000 },
  { slug: 'gymnasium-neustadt', name: 'Gymnasium Neustadt', kapital: 45000000 },
  { slug: 'foerderschule-pestalozzi', name: 'Förderschule Pestalozzi', kapital: 8000000 },
];

describe('MiniBalkenwald', () => {
  it('rendert einen Balken pro Einrichtung (8 aus echten Daten)', () => {
    const { container } = render(<MiniBalkenwald einrichtungen={ACHT} />);
    expect(container.querySelectorAll('[role="img"]').length).toBe(8);
  });

  it('beschriftet jeden Balken mit Name UND Betrag (title + aria-label) — nie nur Farbe/Höhe', () => {
    const { container } = render(<MiniBalkenwald einrichtungen={ACHT} />);
    const bars = container.querySelectorAll('[role="img"]');
    expect(bars.length).toBe(ACHT.length);
    // Direkter Attribut-Vergleich statt screen.getByLabelText: formatEuroFromCent
    // nutzt ein NBSP vor "€" — RTLs Text-Matcher normalisiert nur die
    // DOM-Seite, nicht den Vergleichsstring, und würde hier falsch-negativ
    // melden. getAttribute()-Vergleich betrifft beide Seiten roh/identisch.
    ACHT.forEach((e, i) => {
      const beschriftung = `${e.name}: ${formatEuroFromCent(e.kapital)}`;
      expect(bars[i].getAttribute('aria-label')).toBe(beschriftung);
      expect(bars[i].getAttribute('title')).toBe(beschriftung);
    });
  });

  it('zeigt zusätzlich ein sichtbares Text-Label (Institutionsname) je Balken', () => {
    render(<MiniBalkenwald einrichtungen={ACHT} />);
    ACHT.forEach((e) => {
      expect(screen.getByText(e.name)).toBeInTheDocument();
    });
  });

  it('skaliert die Balkenhöhe relativ zum größten Kapital', () => {
    const { container } = render(<MiniBalkenwald einrichtungen={ACHT} />);
    const bars = container.querySelectorAll('.mini-balkenwald-bar');
    const groessterName = 'Gymnasium Neustadt: ' + formatEuroFromCent(45000000);
    const kleinsterName = 'Tagespflege Sonnenschein: ' + formatEuroFromCent(80000);
    const groessterBar = Array.from(bars).find((b) => b.getAttribute('title') === groessterName) as HTMLElement;
    const kleinsterBar = Array.from(bars).find((b) => b.getAttribute('title') === kleinsterName) as HTMLElement;
    expect(groessterBar.style.height).toBe('100%');
    expect(parseInt(kleinsterBar.style.height)).toBeLessThan(parseInt(groessterBar.style.height));
  });

  it('stürzt bei leerer Liste nicht ab und rendert keine Balken', () => {
    const { container } = render(<MiniBalkenwald einrichtungen={[]} />);
    expect(container.querySelectorAll('[role="img"]').length).toBe(0);
  });
});
