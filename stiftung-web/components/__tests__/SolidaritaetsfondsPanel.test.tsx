import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SolidaritaetsfondsPanel } from '../SolidaritaetsfondsPanel';

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
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));
    expect(await screen.findByText(/Fonds-Ertrag:\s*12,34\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Kapital-Ertrag.*88,10\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Verteilt:\s*45,67\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Arme Kita: 45,67\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/3,21\s*€/)).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn die Jahres-Simulation fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel initialBestand={120} />);
    await user.click(screen.getByRole('button', { name: /Jahr simulieren/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});
