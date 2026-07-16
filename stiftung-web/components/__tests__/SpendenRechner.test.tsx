import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpendenRechner } from '../SpendenRechner';

// SpendenBestaetigung nutzt useCountUp für den Kapitalstand — ohne
// reduced-motion liefe die Zahl über requestAnimationFrame hoch und die
// synchronen/`findByText`-Assertions unten wären flaky (siehe
// SpendenBestaetigung.test.tsx für dieselbe Begründung).
beforeEach(() => {
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const einrichtung = {
  id: '1',
  slug: 'tagesmutter-wirbelwind-muenchen',
  name: 'Tagespflege Wirbelwind',
  typ: 'tagespflege',
  ort: 'München',
  kinderAnzahl: 5,
  aktuellesKapital: 3000,
  zielKapital: 25000,
};

describe('SpendenRechner', () => {
  it('zeigt initial die Jahre bis zum Ziel ohne Spende', () => {
    render(<SpendenRechner einrichtung={einrichtung} />);
    expect(screen.getByText(/bis zum Ziel/i)).toBeInTheDocument();
  });

  it('aktualisiert die Berechnung, wenn der Spendenbetrag geändert wird', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const initialText = screen.getByTestId('years-result').textContent;
    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '500');
    const updatedText = screen.getByTestId('years-result').textContent;
    expect(updatedText).not.toBe(initialText);
  });

  it('wechselt zwischen einmalig und jährlich', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const jaehrlichButton = screen.getByRole('button', { name: 'Jährlich' });
    await user.click(jaehrlichButton);
    expect(jaehrlichButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('zeigt Preset-Buttons 25/50/100/250 € über dem Regler, mit aria-pressed auf dem aktiven Preset (Default 50 €)', () => {
    render(<SpendenRechner einrichtung={einrichtung} />);
    const preset25 = screen.getByRole('button', { name: '25 €' });
    const preset50 = screen.getByRole('button', { name: '50 €' });
    const preset100 = screen.getByRole('button', { name: '100 €' });
    const preset250 = screen.getByRole('button', { name: '250 €' });

    expect(preset50).toHaveAttribute('aria-pressed', 'true');
    expect(preset25).toHaveAttribute('aria-pressed', 'false');
    expect(preset100).toHaveAttribute('aria-pressed', 'false');
    expect(preset250).toHaveAttribute('aria-pressed', 'false');
  });

  it('setzt den Spendenbetrag beim Klick auf einen Preset-Button', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: '250 €' }));

    expect(screen.getByRole('button', { name: '250 €' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '50 €' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Spendenbetrag')).toHaveValue(250);
  });

  it('sendet POST an den Spenden-Endpoint und zeigt die Bestätigung mit neuem Kapitalstand', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        einrichtung: { ...einrichtung, aktuellesKapital: 3050 },
        spende: { id: 'spende-123', betrag: 50, frequenz: 'einmalig' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/einrichtungen/${einrichtung.slug}/spenden`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByText(/Spielgeld/i)).toBeInTheDocument();
    // Anchored: "3.050,00 €" taucht sowohl im Vorher→Nachher-Text als auch im
    // Kapitalstand-<strong> auf — nur die volle Anker-Regex trifft eindeutig
    // das <strong> (siehe SpendenBestaetigung.test.tsx für die Begründung).
    expect(await screen.findByText(/^3\.050,00 €$/)).toBeInTheDocument();
  });

  it('zeigt einen Fehlertext, wenn die Buchung fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/Spende konnte nicht gebucht werden/i)).toBeInTheDocument();
  });
});
