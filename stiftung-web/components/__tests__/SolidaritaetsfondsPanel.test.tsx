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
});
