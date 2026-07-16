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
  typ: 'tagespflege' as const,
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

  it('verwendet bei einer zweiten Spende den tatsächlichen Kapitalstand als Vorher-Wert statt des Seitenlade-Snapshots (Regressionsschutz)', async () => {
    // Vorher-Bug: altesKapital wurde immer aus einrichtung.aktuellesKapital
    // (Seitenlade-Snapshot) gelesen, sodass eine zweite Spende wieder den
    // ursprünglichen Stand als "Vorher" zeigte statt des Stands nach der
    // ersten Spende.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          einrichtung: { ...einrichtung, aktuellesKapital: 3050 },
          spende: { id: 'spende-1', betrag: 50, frequenz: 'einmalig' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          einrichtung: { ...einrichtung, aktuellesKapital: 3150 },
          spende: { id: 'spende-2', betrag: 100, frequenz: 'einmalig' },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);

    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/^3\.050,00 €$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    // Nachher-Wert der zweiten Spende:
    expect(await screen.findByText(/^3\.150,00 €$/)).toBeInTheDocument();
    // Vorher-Wert der zweiten Spende muss der Nachher-Wert der ersten sein
    // (3.050,00 €), nicht der Seitenlade-Stand (3.000,00 €).
    expect(screen.getByText(/3\.050,00 € → 3\.150,00 €/)).toBeInTheDocument();
  });

  // Intl.NumberFormat setzt zwischen Betrag und "€" ein geschütztes Leerzeichen
  // (U+00A0), keinen normalen Space — textContent gibt das roh weiter. \s in
  // JS-Regexes matcht beides, deshalb hier normalisieren statt literalem " ".
  function normalisiert(text: string | null): string {
    return (text ?? '').replace(/\s+/g, ' ');
  }

  it('zeigt unter dem Ergebnis eine Wirkungs-Zeile mit Jahresertrag und Impact-Beispiel passend zum Einrichtungstyp', () => {
    render(<SpendenRechner einrichtung={einrichtung} />);
    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    // Default: Betrag 50 €, einmalig → 50 × 1 % ANNUAL_PAYOUT_RATE = 0,50 €/Jahr.
    // tagespflege liegt bei 0,50 €/Jahr auf der niedrigsten Stufe: "Spielzeug".
    expect(impactText).toMatch(/erwirtschaftet dauerhaft/i);
    expect(impactText).toMatch(/0,50 €\/Jahr/);
    expect(impactText).toMatch(/Spielzeug/i);
    expect(impactText).toMatch(/jedes Jahr aufs Neue/i);
    // Ehrliche Formel-Fußnote muss den Rechenweg offenlegen.
    expect(impactText).toMatch(/1 % jährliche Ausschüttungsquote/i);
  });

  it('passt die Wirkungs-Zeile beim Wechsel auf jährlich an (Formel je gespendetem Betrag)', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: 'Jährlich' }));

    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/je gespendetem Betrag/i);
    expect(impactText).toMatch(/0,50 €\/Jahr/);
  });

  it('bleibt bei 250 € (2,50 €/Jahr) noch auf der niedrigsten Stufe (Schwellenwert-Regressionsschutz)', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: '250 €' }));

    // 250 × 1 % = 2,50 €/Jahr → tagespflege-Stufe "Bastelmaterial" (ab 5 €/Jahr
    // greift erst bei 500 €, hier reicht 250 € noch nicht — Regressionsschutz
    // für die Stufen-Schwelle).
    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/2,50 €\/Jahr/);
    expect(impactText).toMatch(/Spielzeug/i);
  });

  it('zeigt Bastelmaterial statt Spielzeug, sobald der Jahresertrag die zweite Stufe erreicht', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '500');

    // 500 × 1 % = 5,00 €/Jahr → tagespflege-Stufe "Bastelmaterial" (ab 5 €/Jahr).
    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/5,00 €\/Jahr/);
    expect(impactText).toMatch(/Bastelmaterial/i);
  });

  it('zeigt einen Fehlertext, wenn die Buchung fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/Spende konnte nicht gebucht werden/i)).toBeInTheDocument();
  });
});
