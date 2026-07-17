import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SolidaritaetsfondsPanel } from '../SolidaritaetsfondsPanel';

// Die Zeitraffer-Sequenz (Task 32) staggert per Timer über mehrere Sekunden —
// ohne reduced-motion-Stub wären die Assertions unten flaky/langsam
// (Wall-Clock-Timer statt fake timers). reduced-motion erzwingt den
// Sofort-Endzustand (siehe useCountUp/ZeitrafferErgebnis), deterministisch für
// alle Tests in dieser Datei — auch die, die die Sequenz gar nicht auslösen.
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

beforeEach(() => {
  stubReducedMotion();
});

afterEach(() => vi.unstubAllGlobals());

describe('SolidaritaetsfondsPanel', () => {
  it('zeigt den initialen Bestand', () => {
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    expect(screen.getByText(/120,00 €/)).toBeInTheDocument();
  });

  it('zahlt ein und aktualisiert den Bestand aus der Server-Antwort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bestand: 170 }) }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /In den Fonds einzahlen/i }));
    expect(await screen.findByText(/170,00 €/)).toBeInTheDocument();
  });

  it('verteilt und zeigt das Ergebnis, setzt Bestand auf 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ verteiltGesamt: 120, verteilung: [{ slug: 'arm', name: 'Arme Kita', anteil: 120 }] }),
      })
    );
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jetzt verteilen/i }));
    expect(await screen.findByText(/Arme Kita: 120,00 €/)).toBeInTheDocument();
    expect(screen.getByText('0,00 €')).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn die Einzahlung fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /In den Fonds einzahlen/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });

  it('lässt den Bestand unverändert, wenn Verteilung ohne Bedarf zurückkommt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ verteiltGesamt: 0, verteilung: [] }),
    }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jetzt verteilen/i }));
    expect(await screen.findByText(/Kein Bedarf/i)).toBeInTheDocument();
    expect(screen.getByText(/120,00\s*€/)).toBeInTheDocument();
  });

  it('simuliert ein Jahr und zeigt Erträge + Verteilung, setzt Bestand aus neuerFondsBestand', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          nummer: 1,
          fondsErtrag: 12.34,
          kapitalErtrag: 88.1,
          verteiltGesamt: 45.67,
          verteilung: [{ slug: 'arm', name: 'Arme Kita', anteil: 45.67 }],
          neuerFondsBestand: 3.21,
        }),
      })
    );
    const user = userEvent.setup();
    const { container } = render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));
    expect(await screen.findByText(/Fonds-Ertrag:\s*12,34\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Kapital-Ertrag.*88,10\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Verteilt:\s*45,67\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Arme Kita: 45,67\s*€/)).toBeInTheDocument();
    // Bestand-Derivation: der Kartenkopf ("Aktueller Bestand") übernimmt
    // neuerFondsBestand. Der Zeitraffer-Abschluss (Task 32) nennt denselben
    // Wert zusätzlich explizit — daher gezielt der Kartenkopf statt
    // getByText (das bei zwei Treffern sonst mehrdeutig wäre).
    expect(container.querySelector('.hero-number')?.textContent).toMatch(/3,21\s*€/);
  });

  it('zeigt Fehlertext, wenn die Jahres-Simulation fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });

  // Simulations-Zeitraffer (Task 32): "Jahr simulieren" rendert jetzt eine
  // inszenierte Sequenz (ZeitrafferErgebnis) statt drei bloßer Textzeilen.
  // Unter reduced-motion (Stub oben) ist die Sequenz sofort im Endzustand —
  // deterministisch, ohne fake timers.
  describe('Zeitraffer-Sequenz', () => {
    const zeitrafferResponse = {
      nummer: 7,
      fondsErtrag: 5,
      kapitalErtrag: 200,
      verteiltGesamt: 100,
      verteilung: [
        { slug: 'klein', name: 'Kleine Kita', anteil: 10 },
        { slug: 'gross', name: 'Große Kita', anteil: 90 },
      ],
      neuerFondsBestand: 15,
      meilensteine: [{ slug: 'gross', name: 'Große Kita', labels: ['Bronze erreicht'] }],
    };

    it('zeigt sofort den vollständigen Endzustand als gestaffelten Container, mit hervorgehobenem größtem Empfänger', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => zeitrafferResponse }));
      const user = userEvent.setup();
      const { container } = render(<SolidaritaetsfondsPanel initialBestand={0} />);
      await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));

      // Staged-Container existiert, beide Einträge und die Abschluss-Summe
      // sind sofort da (kein Warten auf gestaffelte Timer nötig).
      expect(await screen.findByTestId('zeitraffer-ergebnis')).toBeInTheDocument();
      expect(screen.getByText(/Kleine Kita: 10,00\s*€/)).toBeInTheDocument();
      expect(screen.getByText(/Große Kita: 90,00\s*€/)).toBeInTheDocument();
      expect(screen.getByText(/Verteilt:\s*100,00\s*€/)).toBeInTheDocument();
      expect(screen.getByText(/Neuer Fonds-Bestand:\s*15,00\s*€/)).toBeInTheDocument();

      // Größter Empfänger (Große Kita, 90 €) ist optisch hervorgehoben.
      const eintraege = container.querySelectorAll('.zeitraffer-eintrag');
      expect(eintraege).toHaveLength(2);
      const hervorgehoben = container.querySelector('.zeitraffer-eintrag--top');
      expect(hervorgehoben).not.toBeNull();
      expect(hervorgehoben?.textContent).toMatch(/Große Kita/);
    });

    it('zeigt Meilenstein-Tags an der passenden Einrichtung, wenn vorhanden', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => zeitrafferResponse }));
      const user = userEvent.setup();
      render(<SolidaritaetsfondsPanel initialBestand={0} />);
      await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));
      expect(await screen.findByText(/🎉 Bronze erreicht/)).toBeInTheDocument();
    });

    it('zeigt „Kein Bedarf", wenn die Simulation keine Verteilung liefert', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            nummer: 2,
            fondsErtrag: 0,
            kapitalErtrag: 0,
            verteiltGesamt: 0,
            verteilung: [],
            neuerFondsBestand: 0,
          }),
        })
      );
      const user = userEvent.setup();
      render(<SolidaritaetsfondsPanel initialBestand={0} />);
      await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));
      expect(await screen.findByText(/Kein Bedarf/i)).toBeInTheDocument();
    });
  });
});
