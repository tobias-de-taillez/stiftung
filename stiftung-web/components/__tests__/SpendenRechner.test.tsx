import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SpendenRechner } from '../SpendenRechner';

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
    expect(await screen.findByText(/3.050,00 €/)).toBeInTheDocument();
  });

  it('zeigt einen Fehlertext, wenn die Buchung fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/Spende konnte nicht gebucht werden/i)).toBeInTheDocument();
  });
});
