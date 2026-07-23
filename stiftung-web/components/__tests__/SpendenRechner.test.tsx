import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpendenRechner } from '../SpendenRechner';
import { verwerfeTransienteErgebnisse } from '@/lib/hooks/useTransientesErgebnis';
import { computeYearsToGoal, futureValueWithAnnualDonation, NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';

// SpendenRechner ruft nach erfolgreicher Buchung router.refresh() (F3), damit
// server-gerenderte Sektionen (Finanztopf-Karte, Transparenz-Historie) auf
// derselben Seite aktuell bleiben. Ohne Mock wirft next/navigations
// useRouter() außerhalb eines echten App-Router-Baums ("invariant expected
// app router to be mounted").
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

// SpendenBestaetigung nutzt useCountUp für den Kapitalstand — ohne
// reduced-motion liefe die Zahl über requestAnimationFrame hoch und die
// synchronen/`findByText`-Assertions unten wären flaky (siehe
// SpendenBestaetigung.test.tsx für dieselbe Begründung).
beforeEach(() => {
  // Der Remount-Restore-Speicher lebt im Modul-Scope des Hooks und überlebt
  // damit Testgrenzen — ohne Reset restaurierte eine Buchung aus einem
  // früheren Test in späteren Tests eine Bestätigung.
  verwerfeTransienteErgebnisse();
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

// topfwertCent/zielKapitalCent bewusst so gewählt, dass topfEuro/zielEuro
// (Ableitung am Komponentenkopf) exakt die alten Euro-Fixtures (3000/25000)
// reproduzieren — jede vorher handgerechnete Projektions-Assertion
// (Zukunftswert, Verkürzung, aria-valuemax) bleibt dadurch unverändert gültig.
const einrichtung = {
  id: '1',
  slug: 'tagesmutter-wirbelwind-muenchen',
  name: 'Tagespflege Wirbelwind',
  typ: 'tagespflege' as const,
  ort: 'München',
  kinderAnzahl: 5,
  topfwertCent: 300_000,
  zielKapitalCent: 2_500_000,
  verifiziert: false,
};

const widmungWortlaut =
  'Ich bestimme, dass meine Zuwendung dem Vermögen des Vereins dauerhaft zugeführt wird (§ 62 Abs. 3 Nr. 2 AO). Gefördert wird die Einrichtung aus den Erträgen.';

describe('SpendenRechner', () => {
  it('zeigt initial die Jahre bis zum Ziel ohne Spende', () => {
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    expect(screen.getByText(/bis zum Ziel/i)).toBeInTheDocument();
  });

  it('aktualisiert die Berechnung, wenn der Spendenbetrag geändert wird', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    const initialText = screen.getByTestId('years-result').textContent;
    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '500');
    const updatedText = screen.getByTestId('years-result').textContent;
    expect(updatedText).not.toBe(initialText);
  });

  it('wechselt zwischen einmalig und jährlich', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    const jaehrlichButton = screen.getByRole('button', { name: 'Jährlich' });
    await user.click(jaehrlichButton);
    expect(jaehrlichButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('zeigt Preset-Buttons 25/50/100/250 € über dem Regler, mit aria-pressed auf dem aktiven Preset (Default 50 €)', () => {
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
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
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: '250 €' }));

    expect(screen.getByRole('button', { name: '250 €' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '50 €' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Spendenbetrag')).toHaveValue(250);
  });

  it('sendet POST mit { betragCent, verwendungsart } an den Spenden-Endpoint und zeigt die Bestätigung mit neuem Topfwert', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        verwendungsart: 'vermoegen',
        zuwendungId: 'zuwendung-123',
        einrichtung: { slug: einrichtung.slug, name: einrichtung.name, topfwertCent: 305_000, zielKapitalCent: einrichtung.zielKapitalCent },
        topfwertVorherCent: 300_000,
        topfwertNachherCent: 305_000,
        erreichteMeilensteine: [],
        widmung: { version: 1, wortlaut: widmungWortlaut },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/einrichtungen/${einrichtung.slug}/spenden`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ betragCent: 5000, verwendungsart: 'vermoegen' }),
      })
    );
    expect(await screen.findByText(/Spielgeld/i)).toBeInTheDocument();
    // formatEuroFromCent(305_000) = "3.050,00 €" — Anchored wie zuvor, da
    // derselbe Text auch im Vorher→Nachher-Bereich auftaucht.
    expect(await screen.findByText(/^3\.050,00 €$/)).toBeInTheDocument();
  });

  it('reicht erreichteMeilensteine aus der POST-Response an die Bestätigung weiter (Task 31)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        verwendungsart: 'vermoegen',
        zuwendungId: 'zuwendung-123',
        einrichtung: { slug: einrichtung.slug, name: einrichtung.name, topfwertCent: 305_000, zielKapitalCent: einrichtung.zielKapitalCent },
        topfwertVorherCent: 300_000,
        topfwertNachherCent: 305_000,
        erreichteMeilensteine: ['Silber erreicht'],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

    expect(await screen.findByTestId('meilenstein-banner')).toHaveTextContent('Silber erreicht');
  });

  it('zeigt keinen Meilenstein-Banner, wenn die POST-Response das Feld nicht liefert (Mock-Kompatibilität)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        verwendungsart: 'vermoegen',
        zuwendungId: 'zuwendung-123',
        einrichtung: { slug: einrichtung.slug, name: einrichtung.name, topfwertCent: 305_000, zielKapitalCent: einrichtung.zielKapitalCent },
        topfwertVorherCent: 300_000,
        topfwertNachherCent: 305_000,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

    expect(await screen.findByText(/Spielgeld/i)).toBeInTheDocument();
    expect(screen.queryByTestId('meilenstein-banner')).not.toBeInTheDocument();
  });

  it('zeigt bei einer zweiten Spende den vom Server für DIESE Buchung gelieferten Vorher-Wert (nicht den Seitenlade-Snapshot)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verwendungsart: 'vermoegen',
          zuwendungId: 'zuwendung-1',
          einrichtung: { slug: einrichtung.slug, name: einrichtung.name, topfwertCent: 305_000, zielKapitalCent: einrichtung.zielKapitalCent },
          topfwertVorherCent: 300_000,
          topfwertNachherCent: 305_000,
          erreichteMeilensteine: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verwendungsart: 'vermoegen',
          zuwendungId: 'zuwendung-2',
          einrichtung: { slug: einrichtung.slug, name: einrichtung.name, topfwertCent: 315_000, zielKapitalCent: einrichtung.zielKapitalCent },
          topfwertVorherCent: 305_000,
          topfwertNachherCent: 315_000,
          erreichteMeilensteine: [],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);

    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/^3\.050,00 €$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/^3\.150,00 €$/)).toBeInTheDocument();
    expect(screen.getByText(/3\.050,00 € → 3\.150,00 €/)).toBeInTheDocument();
  });

  it('friert die Bestätigung auf den GEBUCHTEN Betrag ein — ein späteres Verschieben des Reglers ändert Quittung/Share nicht (F1-Regressionsschutz)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        verwendungsart: 'vermoegen',
        zuwendungId: 'zuwendung-123',
        einrichtung: { slug: einrichtung.slug, name: einrichtung.name, topfwertCent: 305_000, zielKapitalCent: einrichtung.zielKapitalCent },
        topfwertVorherCent: 300_000,
        topfwertNachherCent: 305_000,
        erreichteMeilensteine: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByTestId('konfetti-danke')).toHaveTextContent('50,00 €');

    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '250');

    expect(screen.getByTestId('konfetti-danke')).toHaveTextContent('50,00 €');
    expect(screen.getByTestId('konfetti-danke')).not.toHaveTextContent('250,00 €');
  });

  // Intl.NumberFormat setzt zwischen Betrag und "€" ein geschütztes Leerzeichen
  // (U+00A0), keinen normalen Space — textContent gibt das roh weiter. \s in
  // JS-Regexes matcht beides, deshalb hier normalisieren statt literalem " ".
  function normalisiert(text: string | null): string {
    return (text ?? '').replace(/\s+/g, ' ');
  }

  it('zeigt unter dem Ergebnis eine Wirkungs-Zeile mit Jahresertrag und Impact-Beispiel passend zum Einrichtungstyp', () => {
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/erwirtschaftet dauerhaft/i);
    expect(impactText).toMatch(/0,50 €\/Jahr/);
    expect(impactText).toMatch(/Spielzeug/i);
    expect(impactText).toMatch(/jedes Jahr aufs Neue/i);
    expect(impactText).toMatch(/1 % jährliche Ausschüttungsquote/i);
  });

  it('passt die Wirkungs-Zeile beim Wechsel auf jährlich an (Formel je gespendetem Betrag)', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: 'Jährlich' }));

    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/je gespendetem Betrag/i);
    expect(impactText).toMatch(/0,50 €\/Jahr/);
  });

  it('bleibt bei 250 € (2,50 €/Jahr) noch auf der niedrigsten Stufe (Schwellenwert-Regressionsschutz)', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: '250 €' }));

    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/2,50 €\/Jahr/);
    expect(impactText).toMatch(/Spielzeug/i);
  });

  it('zeigt Bastelmaterial statt Spielzeug, sobald der Jahresertrag die zweite Stufe erreicht', async () => {
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '500');

    const impactText = normalisiert(screen.getByTestId('impact-beispiel').textContent);
    expect(impactText).toMatch(/5,00 €\/Jahr/);
    expect(impactText).toMatch(/Bastelmaterial/i);
  });

  it('zeigt einen Fehlertext, wenn die Buchung fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByText(/Spende konnte nicht gebucht werden/i)).toBeInTheDocument();
  });

  describe('Spender-Badge (Task 30: absolute Schwellen, unabhängig von Kinderzahl/Frequenz)', () => {
    it('zeigt den Bronze-Chip bereits bei einer Einmalspende von 50 € (vorher: kein Chip möglich)', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      expect(screen.getByText('Bronze-Spender:in')).toBeInTheDocument();
    });

    it('zeigt keinen Chip unterhalb der ersten Schwelle (25 €)', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '10');
      expect(screen.queryByText(/-Spender:in/)).not.toBeInTheDocument();
    });

    it('zeigt denselben Chip für jährliche Spenden wie für einmalige (reine Betragsfunktion)', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('button', { name: 'Jährlich' }));
      expect(screen.getByText('Bronze-Spender:in')).toBeInTheDocument();
    });

    it('wechselt auf den Silber-Chip bei 100 €', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('button', { name: '100 €' }));
      expect(screen.getByText('Silber-Spender:in')).toBeInTheDocument();
    });

    it('zeigt einen Hinweis, wie viel bis zum nächsten Level fehlt', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      expect(screen.getByText(/noch 50,00 € bis Silber/)).toBeInTheDocument();
    });

    it('zeigt den Nächstes-Level-Hinweis auch, wenn noch kein Level erreicht ist', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '10');
      expect(screen.getByText(/noch 15,00 € bis Bronze/)).toBeInTheDocument();
    });

    it('zeigt keinen Nächstes-Level-Hinweis mehr, sobald Diamant (die höchste Stufe) erreicht ist', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '2500');
      expect(screen.getByText('Diamant-Spender:in')).toBeInTheDocument();
      expect(screen.queryByText(/noch .* bis/)).not.toBeInTheDocument();
    });
  });

  describe('Rechner-Reframing (Zukunftswert-Story statt Wartezeit)', () => {
    // Fixture: topfEuro 3000, zielEuro 25000, Default-Betrag 50 €, einmalig.
    // Handgerechnet: jahre ≈ 36,10 → Zukunftswert(50, 36,10) ≈ 409,84 € und
    // verkuerzungMonate(…, 50, 'einmalig') = 3.

    it('führt mit dem Zukunftswert der Spende (WIRKUNG), nicht mit der Wartezeit', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const hero = screen.getByTestId('zukunftswert-hero');
      expect(normalisiert(hero.textContent)).toMatch(/50,00 €.*angewachsen/i);
      expect(normalisiert(hero.textContent)).toMatch(/409,8[0-9] €/);
    });

    it('legt die Wachstumsannahme der Hero-Zahl offen (ehrliche Fußnote, keine unbelegte Zukunftsprognose)', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const hero = screen.getByTestId('zukunftswert-hero');
      expect(normalisiert(hero.textContent)).toMatch(/Netto-Wachstumsrate.*6 ?%/i);
    });

    it('visualisiert den Anteil der Spende am Ziel als beschrifteten Mini-Balken (kein Color-only)', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemax', '25000');
      const hero = screen.getByTestId('zukunftswert-hero');
      expect(normalisiert(hero.textContent)).toMatch(/409,8[0-9] €.*25\.000,00 €/);
    });

    it('zeigt sekundär, um wie viele Monate die Spende den Weg zum Ziel verkürzt', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      expect(normalisiert(screen.getByTestId('verkuerzung').textContent)).toMatch(/verkürz\w+ den Weg.*3 Monate/i);
    });

    it('zeigt die Jahre-bis-Ziel-Zahl nur noch als tertiäre Info (nicht mehr die Hero-Aussage)', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const jahreText = normalisiert(screen.getByTestId('years-result').textContent);
      expect(jahreText).toMatch(/bis zum Ziel/i);
      const heroText = normalisiert(screen.getByTestId('zukunftswert-hero').textContent);
      expect(heroText).not.toMatch(/Jahre? und \d+ Monate?/i);
      expect(heroText).not.toMatch(/bis zum Ziel/i);
    });

    it('zeigt bei unerreichbarem Ziel (Infinity) NIE die Wartezeit als Hauptbotschaft, sondern die Dauerförderungs-Perspektive', async () => {
      const astronomisch = { ...einrichtung, topfwertCent: 0, zielKapitalCent: 1e30 };
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={astronomisch} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('button', { name: 'Jährlich' }));

      expect(screen.queryByTestId('zukunftswert-hero')).not.toBeInTheDocument();
      const fallback = screen.getByTestId('dauerfoerderung-perspektive');
      expect(normalisiert(fallback.textContent)).toMatch(/dauerhaft/i);
      expect(normalisiert(fallback.textContent)).not.toMatch(/nicht erreichbar/i);
      expect(normalisiert(screen.getByTestId('years-result').textContent)).toMatch(/nicht erreichbar/i);
    });

    it('zeigt den Jährlich-Hero-Pfad mit erreichbarem Ziel: Rentenbarwert-Verdrahtung mit jährlicher Wording', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('button', { name: 'Jährlich' }));

      const jahre = computeYearsToGoal({
        startCapital: einrichtung.topfwertCent / 100,
        targetCapital: einrichtung.zielKapitalCent / 100,
        donation: 50,
        frequency: 'jaehrlich',
      });
      expect(isFinite(jahre)).toBe(true);

      const expectedZukunftswert = futureValueWithAnnualDonation(0, 50, NET_GROWTH_RATE, jahre);

      const hero = screen.getByTestId('zukunftswert-hero');
      expect(hero).toBeInTheDocument();

      const heroText = normalisiert(hero.textContent);
      expect(heroText).toMatch(/Deine jährlichen/i);
      expect(heroText).toMatch(/wachsen bis zur Zielerreichung/i);
      const expectedNumberPart = expectedZukunftswert.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(heroText).toMatch(new RegExp(expectedNumberPart.replace(/\./g, '\\.')));
    });
  });

  describe('Betrag < 5 € zeigt neutralen Hinweis statt absurder 0-€-Story (F5)', () => {
    it('zeigt bei geleertem Betragsfeld einen Hinweis statt Zukunftswert-Hero und Wirkungs-Zeile', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);

      expect(screen.getByTestId('betrag-hinweis')).toHaveTextContent('Wähle einen Betrag ab 5 €.');
      expect(screen.queryByText(/angewachsen/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId('zukunftswert-hero')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dauerfoerderung-perspektive')).not.toBeInTheDocument();
      expect(screen.queryByTestId('impact-beispiel')).not.toBeInTheDocument();
    });

    it('zeigt Hero und Wirkungs-Zeile wieder, sobald der Betrag auf mindestens 5 € gesetzt wird', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '5');

      expect(screen.queryByTestId('betrag-hinweis')).not.toBeInTheDocument();
      expect(screen.getByTestId('zukunftswert-hero')).toBeInTheDocument();
      expect(screen.getByTestId('impact-beispiel')).toBeInTheDocument();
    });
  });

  describe('Verwendungsart A/B (Spec §3.1)', () => {
    it('zeigt zwei Radio-Karten nebeneinander, mit A vorausgewählt', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const radioA = screen.getByRole('radio', { name: /Dauerhaft anlegen/i });
      const radioB = screen.getByRole('radio', { name: /Direkt auszahlen/i });
      expect(radioA).toBeChecked();
      expect(radioB).not.toBeChecked();
      expect(screen.getByText(/fördert die Einrichtung jedes Jahr aus ihren Erträgen/)).toBeInTheDocument();
      expect(screen.getByText(/gesammelt und monatlich an die Einrichtung ausgezahlt/)).toBeInTheDocument();
    });

    it('deaktiviert B mit Hinweistext, wenn die Einrichtung nicht verifiziert ist', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      const radioB = screen.getByRole('radio', { name: /Direkt auszahlen/i });
      expect(radioB).toBeDisabled();
      expect(screen.getByText(/Erst verfügbar, wenn die Einrichtung ihren Zugang abgeholt hat/)).toBeInTheDocument();
    });

    it('aktiviert B, sobald die Einrichtung verifiziert ist', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={{ ...einrichtung, verifiziert: true }} widmungWortlaut={widmungWortlaut} />);
      const radioB = screen.getByRole('radio', { name: /Direkt auszahlen/i });
      expect(radioB).not.toBeDisabled();
      await user.click(radioB);
      expect(radioB).toBeChecked();
      expect(screen.getByRole('radio', { name: /Dauerhaft anlegen/i })).not.toBeChecked();
    });

    it('blendet alle Wachstums-/Projektions-Sektionen aus, sobald B gewählt ist', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={{ ...einrichtung, verifiziert: true }} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('radio', { name: /Direkt auszahlen/i }));

      expect(screen.queryByTestId('zukunftswert-hero')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dauerfoerderung-perspektive')).not.toBeInTheDocument();
      expect(screen.queryByTestId('verkuerzung')).not.toBeInTheDocument();
      expect(screen.queryByTestId('years-result')).not.toBeInTheDocument();
      expect(screen.queryByTestId('impact-beispiel')).not.toBeInTheDocument();
    });

    it('zeigt den Widmungswortlaut sichtbar mit Kenntnisnahme-Zeile bei gewähltem A', () => {
      render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
      expect(screen.getByText(widmungWortlaut)).toBeInTheDocument();
      expect(screen.getByText(/Mit deiner Spende gibst du diese Erklärung ab/)).toBeInTheDocument();
    });

    it('blendet Widmungswortlaut und Kenntnisnahme-Zeile aus, wenn B gewählt ist (keine Vermögens-Erklärung bei Direktspende)', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={{ ...einrichtung, verifiziert: true }} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('radio', { name: /Direkt auszahlen/i }));
      expect(screen.queryByText(widmungWortlaut)).not.toBeInTheDocument();
      expect(screen.queryByText(/Mit deiner Spende gibst du diese Erklärung ab/)).not.toBeInTheDocument();
    });

    it('sendet verwendungsart "direkt" im POST-Body und zeigt die Auszahlungs-Bestätigung, wenn B gewählt ist', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ verwendungsart: 'direkt', zuwendungId: 'zuwendung-direkt', offeneDirektausschuettungenCent: 5_000 }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={{ ...einrichtung, verifiziert: true }} widmungWortlaut={widmungWortlaut} />);
      await user.click(screen.getByRole('radio', { name: /Direkt auszahlen/i }));
      await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/einrichtungen/${einrichtung.slug}/spenden`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ betragCent: 5000, verwendungsart: 'direkt' }),
        })
      );
      expect(await screen.findByText(/werden gesammelt und im nächsten Monatslauf/)).toBeInTheDocument();
    });
  });
});

describe('SpendenRechner — Bestätigung übersteht den Refresh-Remount (Next 14: erster router.refresh() nach Hydration remountet den Client-Subtree)', () => {
  // Effekt des echten Router-Remounts in RTL: unmount() + neues render() —
  // alle useState-Initializer laufen erneut (Begründung siehe
  // SolidaritaetsfondsPanel.test.tsx, gleicher Block).
  function mockErfolgreicheBuchung() {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          verwendungsart: 'vermoegen',
          zuwendungId: 'zuwendung-123',
          einrichtung: {
            slug: einrichtung.slug,
            name: einrichtung.name,
            topfwertCent: 305_000,
            zielKapitalCent: einrichtung.zielKapitalCent,
          },
          topfwertVorherCent: 300_000,
          topfwertNachherCent: 305_000,
          erreichteMeilensteine: ['Silber erreicht'],
        }),
      })
    );
  }

  it('stellt die Bestätigung nach Unmount + Remount mit denselben Buchungsdaten wieder her', async () => {
    mockErfolgreicheBuchung();
    const user = userEvent.setup();
    const { unmount } = render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByTestId('konfetti-danke')).toBeInTheDocument();

    unmount();
    render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);

    // Bestätigung ist sofort wieder da — inklusive gebuchtem Betrag und
    // Meilenstein-Banner aus der POST-Response.
    expect(screen.getByTestId('konfetti-danke')).toHaveTextContent('50,00 €');
    expect(screen.getByTestId('meilenstein-banner')).toHaveTextContent('Silber erreicht');
  });

  it('restauriert nichts für eine andere Einrichtung (Key enthält den Slug)', async () => {
    mockErfolgreicheBuchung();
    const user = userEvent.setup();
    const { unmount } = render(<SpendenRechner einrichtung={einrichtung} widmungWortlaut={widmungWortlaut} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
    expect(await screen.findByTestId('konfetti-danke')).toBeInTheDocument();

    unmount();
    render(
      <SpendenRechner einrichtung={{ ...einrichtung, slug: 'andere-einrichtung' }} widmungWortlaut={widmungWortlaut} />
    );

    expect(screen.queryByTestId('konfetti-danke')).not.toBeInTheDocument();
  });
});
