import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetDb, seedKontenstand, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import Page from '../page';

// Die Landing-Page rendert seit Task 35 KennzahlHero (useCountUp), das beim
// Mounten `prefers-reduced-motion` liest. Ohne Stub würde der Zähler bei 0
// starten und asynchron über requestAnimationFrame hochzählen (jsdom hat
// keinen rAF-Polyfill) — reduced-motion erzwingt den deterministischen
// Sofort-Sprung auf den Zielwert (siehe components/__tests__/KennzahlHero.test.tsx).
function stubReducedMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

// Die Landing-Page rendert seit Task 33 den client-seitigen SpendenTicker,
// der beim Mounten `/api/spenden/letzte` fetcht. Ohne Stub würde jsdom einen
// echten (fehlschlagenden) Request gegen eine relative URL versuchen — der
// Ticker selbst fängt das ab (Empty-State bleibt), aber der Stub hält den
// Test hermetisch und leise.
beforeEach(async () => {
  stubReducedMotion();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  await resetDb();
  // Zwei Einrichtungen mit eindeutig unterschiedlicher Förderung pro Kind,
  // damit stats.bottom5[0] (größter Förderbedarf) deterministisch ist.
  // Summe topfCent == etfMarktwertCent, damit der Poolwert exakt auf die
  // beiden Töpfe aufgeht (kein Rundungsrest, s. uebersichtService.test.ts).
  await seedKontenstand({ etfMarktwertCent: 61_580_000n });
  await createTestEinrichtung({
    slug: 'landing-test-gut-gefoerdert',
    name: 'Gut geförderte Kita',
    typ: 'kita',
    ort: 'Musterstadt',
    kinderAnzahl: 10,
    topfCent: 60_000_000n,
    zielKapitalCent: 300_000_000n,
  });
  await createTestEinrichtung({
    slug: 'landing-test-bedarf',
    name: 'Tagespflege mit Bedarf',
    typ: 'tagespflege',
    ort: 'Beispielstadt',
    kinderAnzahl: 10,
    topfCent: 1_580_000n,
    zielKapitalCent: 120_000_000n,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Landing Page', () => {
  it('zeigt die Mission, Live-Zahlen und einen primären "Jetzt spenden"-CTA zur Einrichtung mit dem größten Förderbedarf', async () => {
    render(await Page());
    expect(screen.getByText(/Bildung darf niemals vom Geldbeutel/i)).toBeInTheDocument();

    const liveZahlen = screen.getByText(/Einrichtungen/, { selector: 'p' });
    expect(liveZahlen).toHaveTextContent('2 Einrichtungen');
    expect(liveZahlen).toHaveTextContent('20 Kinder');
    expect(liveZahlen).toHaveTextContent('615.800,00 €');
    // Zuwendungszähler: keine Zuwendung in diesem Seed erzeugt → 0.
    expect(liveZahlen).toHaveTextContent('0 Zuwendungen bisher');

    const cta = screen.getByRole('link', { name: /Jetzt spenden/i });
    expect(cta).toHaveAttribute('href', '/einrichtungen/landing-test-bedarf');
    expect(cta).toHaveClass('pill-primary');
  });

  it('zeigt sekundäre CTAs zu Einrichtung finden, Statistik und Solidaritätsfonds', async () => {
    render(await Page());
    const einrichtungFinden = screen.getByRole('link', { name: /Einrichtung finden/i });
    expect(einrichtungFinden).toHaveAttribute('href', '/einrichtungen');
    expect(einrichtungFinden).toHaveClass('pill-secondary');
    expect(screen.getByRole('link', { name: /Statistik ansehen/i })).toHaveAttribute('href', '/statistik');
    expect(screen.getByRole('link', { name: /Solidaritätsfonds/i })).toHaveAttribute('href', '/solidaritaetsfonds');
  });

  it('zeigt das Beispiel-Zielkapital von 2 Mio. € (20.000 € Ausschüttung / 1%) in der "Wie das Modell funktioniert"-Sektion', async () => {
    render(await Page());
    expect(screen.getByText(/Wie das Modell funktioniert/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.000\.000,00\s*€/)).toBeInTheDocument();
  });

  it('nennt die Netto-Wachstumsrate in beiden Copy-Blöcken konsistent aus NET_GROWTH_RATE (kein zweites hartkodiertes Literal)', async () => {
    const { container } = render(await Page());
    // "So wirkt deine Spende" UND "Wie das Modell funktioniert" — beide
    // Stellen leiten die Prozentzahl jetzt aus derselben Konstante ab, statt
    // dass eine davon ein eigenes hartkodiertes "6 %"-Literal trägt.
    const treffer = container.textContent?.match(/Netto-Wachstumsrate\s+von\s+6\s*%\s*pro\s+Jahr/g) ?? [];
    expect(treffer).toHaveLength(2);
  });

  // Task 35: zweispaltiges Hero-Layout — rechter Visual-Slot füllt die zuvor
  // leere Fläche mit einer animierten Kennzahl-Komposition aus echten Daten.
  describe('Hero-Visual-Slot (Task 35)', () => {
    it('rendert die Hero-Sektion als zweispaltiges Grid (.hero-grid)', async () => {
      const { container } = render(await Page());
      expect(container.querySelector('section.hero-grid')).toBeInTheDocument();
    });

    it('zeigt das Poolwert-Bildungskapital als große Kennzahl im Visual-Slot', async () => {
      render(await Page());
      const kennzahl = screen.getByTestId('kennzahl-hero');
      // toMatch statt toHaveTextContent: formatEuroFromCent nutzt ein schmales
      // geschütztes Leerzeichen (NBSP) vor "€", das RTL/jest-dom nur
      // einseitig normalisieren (DOM-Seite ja, Vergleichsstring nein) —
      // \s* im Regex überbrückt das unabhängig von der genauen Leerzeichenart.
      expect(kennzahl.textContent).toMatch(/615\.800,00\s*€/);
    });

    it('zeigt einen Mini-Balkenwald mit einem beschrifteten Balken pro echter Einrichtung', async () => {
      const { container } = render(await Page());
      const balken = container.querySelectorAll('[data-testid="mini-balkenwald"] [role="img"]');
      expect(balken.length).toBe(2);
      const labels = Array.from(balken).map((b) => b.getAttribute('aria-label') ?? '');
      expect(labels.some((l) => l.includes('Gut geförderte Kita') && /600\.000,00\s*€/.test(l))).toBe(true);
      expect(labels.some((l) => l.includes('Tagespflege mit Bedarf') && /15\.800,00\s*€/.test(l))).toBe(true);
    });

    it('behält den Live-Ticker im Visual-Slot (harmonisch neben Kennzahl und Balkenwald)', async () => {
      render(await Page());
      expect(screen.getByText(/Live-Ticker/i)).toBeInTheDocument();
    });

    // Task 36: Wachstums-Illustration steht groß neben der Kennzahl und
    // codiert das AGGREGAT über beide Einrichtungen (615.800 € von
    // 4.200.000 € Gesamtzielkapital ≈ 14,7 % → Bronze/Stufe 1), nicht eine
    // einzelne — jetzt aus poolStatistik() statt listEinrichtungen().
    it('zeigt die aggregierte Wachstums-Illustration neben der Kennzahl (Poolwert/Gesamtzielkapital aus poolStatistik())', async () => {
      const { container } = render(await Page());
      const illustration = container.querySelector('[data-testid="wachstums-illustration"]');
      expect(illustration).toHaveAttribute('data-stage', '1');
      expect(screen.getByText('Wachstumsstufe: Keimling — Bronze erreicht')).toBeInTheDocument();
    });
  });
});
