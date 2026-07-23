import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpendenRechner, verwerfeLetzteBuchung } from '../SpendenRechner';
import { computeYearsToGoal, futureValueWithAnnualDonation, NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';

// SpendenRechner ruft nach erfolgreicher Buchung router.refresh() (F3), damit
// server-gerenderte Sektionen (Finanztopf-Karte, Transparenz-Historie) auf
// derselben Seite aktuell bleiben. Ohne Mock wirft next/navigations
// useRouter() außerhalb eines echten App-Router-Baums ("invariant expected
// app router to be mounted").
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

// Der Remount-Restore-Snapshot lebt im Modul-Scope von SpendenRechner.tsx und
// überlebt damit Testgrenzen — ohne Reset würde eine Buchung aus einem
// früheren Test in späteren Tests eine Bestätigung restaurieren.
beforeEach(() => {
  verwerfeLetzteBuchung();
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

  it('reicht erreichteMeilensteine aus der POST-Response an die Bestätigung weiter (Task 31)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        einrichtung: { ...einrichtung, aktuellesKapital: 3050 },
        spende: { id: 'spende-123', betrag: 50, frequenz: 'einmalig' },
        erreichteMeilensteine: ['Silber erreicht'],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<SpendenRechner einrichtung={einrichtung} />);
    await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

    expect(await screen.findByTestId('meilenstein-banner')).toHaveTextContent('Silber erreicht');
  });

  it('zeigt keinen Meilenstein-Banner, wenn die POST-Response das Feld nicht liefert (Mock-Kompatibilität)', async () => {
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

    expect(await screen.findByText(/Spielgeld/i)).toBeInTheDocument();
    expect(screen.queryByTestId('meilenstein-banner')).not.toBeInTheDocument();
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

  it('friert die Bestätigung auf den GEBUCHTEN Betrag ein — ein späteres Verschieben des Reglers ändert Quittung/Share nicht (F1-Regressionsschutz)', async () => {
    // Vorher-Bug: SpendenBestaetigung bekam die LIVE betrag/frequenz-States.
    // Nach dem Spenden weiterbewegen des Reglers rechnete Bestätigung/
    // Quittung/Share-Text die Live-Werte um — eine fake Quittung.
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
    expect(await screen.findByTestId('konfetti-danke')).toHaveTextContent('50,00 €');

    const input = screen.getByLabelText('Spendenbetrag');
    await user.clear(input);
    await user.type(input, '250');

    // Bestätigungsblock zeigt weiterhin die gebuchten 50 €, nicht die Live-250 €.
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

  describe('Spender-Badge (Task 30: absolute Schwellen, unabhängig von Kinderzahl/Frequenz)', () => {
    // Fixture-Einrichtung hat kinderAnzahl 5 — die alten annualDonationPerChild-
    // Schwellen hätten bei Einmalspenden nie einen Chip gezeigt (Zähler war
    // dort immer 0). Jetzt zählt nur der gespendete Betrag, für beide
    // Frequenzen.

    it('zeigt den Bronze-Chip bereits bei einer Einmalspende von 50 € (vorher: kein Chip möglich)', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      // Default-Betrag ist 50 €, Default-Frequenz "einmalig".
      expect(screen.getByText('Bronze-Spender:in')).toBeInTheDocument();
    });

    it('zeigt keinen Chip unterhalb der ersten Schwelle (25 €)', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '10');
      expect(screen.queryByText(/-Spender:in/)).not.toBeInTheDocument();
    });

    it('zeigt denselben Chip für jährliche Spenden wie für einmalige (reine Betragsfunktion)', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: 'Jährlich' }));
      expect(screen.getByText('Bronze-Spender:in')).toBeInTheDocument();
    });

    it('wechselt auf den Silber-Chip bei 100 €', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: '100 €' }));
      expect(screen.getByText('Silber-Spender:in')).toBeInTheDocument();
    });

    it('zeigt einen Hinweis, wie viel bis zum nächsten Level fehlt', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      // Default 50 € → Bronze, nächstes Level Silber bei 100 € → fehlen 50 €.
      expect(screen.getByText(/noch 50,00 € bis Silber/)).toBeInTheDocument();
    });

    it('zeigt den Nächstes-Level-Hinweis auch, wenn noch kein Level erreicht ist', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '10');
      expect(screen.getByText(/noch 15,00 € bis Bronze/)).toBeInTheDocument();
    });

    it('zeigt keinen Nächstes-Level-Hinweis mehr, sobald Diamant (die höchste Stufe) erreicht ist', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '2500');
      expect(screen.getByText('Diamant-Spender:in')).toBeInTheDocument();
      expect(screen.queryByText(/noch .* bis/)).not.toBeInTheDocument();
    });
  });

  describe('Rechner-Reframing (Zukunftswert-Story statt Wartezeit)', () => {
    // Fixture: aktuellesKapital 3000, zielKapital 25000, Default-Betrag 50 €,
    // einmalig. Handgerechnet (siehe spendenrechner.test.ts-Fixtures für die
    // gleiche Formel): jahre ≈ 36,10 → Zukunftswert(50, 36,10) ≈ 409,84 € und
    // verkuerzungMonate(…, 50, 'einmalig') = 3.

    it('führt mit dem Zukunftswert der Spende (WIRKUNG), nicht mit der Wartezeit', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      const hero = screen.getByTestId('zukunftswert-hero');
      expect(normalisiert(hero.textContent)).toMatch(/50,00 €.*angewachsen/i);
      expect(normalisiert(hero.textContent)).toMatch(/409,8[0-9] €/);
    });

    it('legt die Wachstumsannahme der Hero-Zahl offen (ehrliche Fußnote, keine unbelegte Zukunftsprognose)', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      const hero = screen.getByTestId('zukunftswert-hero');
      expect(normalisiert(hero.textContent)).toMatch(/Netto-Wachstumsrate.*6 ?%/i);
    });

    it('visualisiert den Anteil der Spende am Ziel als beschrifteten Mini-Balken (kein Color-only)', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemax', '25000');
      const hero = screen.getByTestId('zukunftswert-hero');
      // Pflicht-Label-Text (nicht nur Farbe): Betrag vs. Ziel als Text.
      expect(normalisiert(hero.textContent)).toMatch(/409,8[0-9] €.*25\.000,00 €/);
    });

    it('zeigt sekundär, um wie viele Monate die Spende den Weg zum Ziel verkürzt', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      expect(normalisiert(screen.getByTestId('verkuerzung').textContent)).toMatch(/verkürz\w+ den Weg.*3 Monate/i);
    });

    it('zeigt die Jahre-bis-Ziel-Zahl nur noch als tertiäre Info (nicht mehr die Hero-Aussage)', () => {
      render(<SpendenRechner einrichtung={einrichtung} />);
      const jahreText = normalisiert(screen.getByTestId('years-result').textContent);
      expect(jahreText).toMatch(/bis zum Ziel/i);
      // Die Hero-Zeile selbst darf NICHT mehr die Wartezeit-Formulierung
      // ("X Jahre und Y Monate") führen — die Wachstumsraten-Fußnote ("6 %
      // pro Jahr") ist davon ausdrücklich ausgenommen, das ist keine
      // Wartezeit-Angabe, sondern eine Annahmen-Offenlegung.
      const heroText = normalisiert(screen.getByTestId('zukunftswert-hero').textContent);
      // Die charakteristische Wartezeit-Formulierung ("X Jahre und Y Monate
      // bis zum Ziel") darf in der Hero-Zeile nicht auftauchen.
      expect(heroText).not.toMatch(/Jahre? und \d+ Monate?/i);
      expect(heroText).not.toMatch(/bis zum Ziel/i);
    });

    it('zeigt bei unerreichbarem Ziel (Infinity) NIE die Wartezeit als Hauptbotschaft, sondern die Dauerförderungs-Perspektive', async () => {
      const astronomisch = { ...einrichtung, aktuellesKapital: 0, zielKapital: 1e30 };
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={astronomisch} />);
      // Nur bei "jährlich" kann computeYearsToGoal (MAX_YEARS-Deckel) für ein
      // derart astronomisches Ziel tatsächlich Infinity liefern.
      await user.click(screen.getByRole('button', { name: 'Jährlich' }));

      expect(screen.queryByTestId('zukunftswert-hero')).not.toBeInTheDocument();
      const fallback = screen.getByTestId('dauerfoerderung-perspektive');
      expect(normalisiert(fallback.textContent)).toMatch(/dauerhaft/i);
      expect(normalisiert(fallback.textContent)).not.toMatch(/nicht erreichbar/i);
      // Die Jahre-Zahl darf als tertiäre Info weiterhin "nicht erreichbar" zeigen.
      expect(normalisiert(screen.getByTestId('years-result').textContent)).toMatch(/nicht erreichbar/i);
    });

    it('zeigt den Jährlich-Hero-Pfad mit erreichbarem Ziel: Rentenbarwert-Verdrahtung mit jährlicher Wording', async () => {
      const user = userEvent.setup();
      render(<SpendenRechner einrichtung={einrichtung} />);
      // Fixture: 3000/25000, Default 50 € einmalig
      // Klicke auf "Jährlich", um den Renten-Zukunftswert zu triggern.
      await user.click(screen.getByRole('button', { name: 'Jährlich' }));

      // Berechne erwartete Werte mit denselben Funktionen wie die Komponente.
      const jahre = computeYearsToGoal({
        startCapital: einrichtung.aktuellesKapital,
        targetCapital: einrichtung.zielKapital,
        donation: 50, // Default-Betrag
        frequency: 'jaehrlich',
      });
      expect(isFinite(jahre)).toBe(true); // Ziel ist erreichbar.

      const expectedZukunftswert = futureValueWithAnnualDonation(0, 50, NET_GROWTH_RATE, jahre);

      // Hero-Div muss sichtbar sein und die jährlich-Wording enthalten.
      const hero = screen.getByTestId('zukunftswert-hero');
      expect(hero).toBeInTheDocument();

      const heroText = normalisiert(hero.textContent);
      // Prüfe die jährlich-spezifische Wording.
      expect(heroText).toMatch(/Deine jährlichen/i);
      expect(heroText).toMatch(/wachsen bis zur Zielerreichung/i);
      // Prüfe, dass der berechnete Zukunftswert (mit Dezimalzahlen-Muster)
      // angezeigt wird — robust gegenüber Intl.NumberFormat-Formatierung.
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
      render(<SpendenRechner einrichtung={einrichtung} />);
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
      render(<SpendenRechner einrichtung={einrichtung} />);
      const input = screen.getByLabelText('Spendenbetrag');
      await user.clear(input);
      await user.type(input, '5');

      expect(screen.queryByTestId('betrag-hinweis')).not.toBeInTheDocument();
      expect(screen.getByTestId('zukunftswert-hero')).toBeInTheDocument();
      expect(screen.getByTestId('impact-beispiel')).toBeInTheDocument();
    });
  });

  describe('Bestätigung übersteht den Refresh-Remount (Next-14: erster router.refresh() nach Hydration remountet den Client-Subtree)', () => {
    // Im echten Browser remountet Next 14 den Client-Subtree beim ERSTEN
    // router.refresh() nach der Hydration — der frische useState-Stand wäre
    // weg und die gerade gezeigte Bestätigung verschwände nach ~20 ms.
    // RTL kann den echten Router-Remount nicht auslösen (refresh ist hier ein
    // No-op-Mock), aber sein Effekt ist identisch mit unmount() + neuem
    // render(): alle useState-Initializer laufen erneut. Genau dagegen sichert
    // der Modul-Scope-Snapshot ab, den diese Tests prüfen.
    function mockErfolgreicheBuchung() {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            einrichtung: { ...einrichtung, aktuellesKapital: 3050 },
            spende: { id: 'spende-123', betrag: 50, frequenz: 'einmalig' },
            erreichteMeilensteine: ['Silber erreicht'],
          }),
        })
      );
    }

    it('stellt die Bestätigung nach Unmount + Remount mit denselben Buchungsdaten wieder her', async () => {
      mockErfolgreicheBuchung();
      const user = userEvent.setup();
      const { unmount } = render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
      expect(await screen.findByTestId('konfetti-danke')).toBeInTheDocument();

      unmount();
      render(<SpendenRechner einrichtung={einrichtung} />);

      // Bestätigung ist sofort wieder da — inklusive Vorher→Nachher-Werten,
      // Beleg-Nr.-Quelle (spendeId) und Meilenstein-Banner.
      expect(screen.getByTestId('konfetti-danke')).toHaveTextContent('50,00 €');
      expect(screen.getByText(/3\.000,00 € → 3\.050,00 €/)).toBeInTheDocument();
      expect(screen.getByTestId('meilenstein-banner')).toHaveTextContent('Silber erreicht');
    });

    it('nutzt nach dem Remount den restaurierten Kapitalstand als Vorher-Wert einer Folgespende', async () => {
      mockErfolgreicheBuchung();
      const user = userEvent.setup();
      const { unmount } = render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
      expect(await screen.findByTestId('konfetti-danke')).toBeInTheDocument();
      unmount();

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            einrichtung: { ...einrichtung, aktuellesKapital: 3150 },
            spende: { id: 'spende-2', betrag: 100, frequenz: 'einmalig' },
          }),
        })
      );
      render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));

      // Vorher-Wert der Folgespende ist der restaurierte Stand nach der ersten
      // Spende (3.050), nicht der Seitenlade-Snapshot (3.000).
      expect(await screen.findByText(/3\.050,00 € → 3\.150,00 €/)).toBeInTheDocument();
    });

    it('restauriert nichts für eine andere Einrichtung (Slug-Guard)', async () => {
      mockErfolgreicheBuchung();
      const user = userEvent.setup();
      const { unmount } = render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
      expect(await screen.findByTestId('konfetti-danke')).toBeInTheDocument();

      unmount();
      render(<SpendenRechner einrichtung={{ ...einrichtung, slug: 'andere-einrichtung' }} />);

      expect(screen.queryByTestId('konfetti-danke')).not.toBeInTheDocument();
    });

    it('restauriert nichts mehr, wenn das Frische-Fenster abgelaufen ist (kein Wiederauftauchen bei späterer Rück-Navigation)', async () => {
      mockErfolgreicheBuchung();
      const user = userEvent.setup();
      const { unmount } = render(<SpendenRechner einrichtung={einrichtung} />);
      await user.click(screen.getByRole('button', { name: /Jetzt spenden/i }));
      expect(await screen.findByTestId('konfetti-danke')).toBeInTheDocument();

      unmount();
      const echtesJetzt = Date.now();
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(echtesJetzt + 60_000);
      try {
        render(<SpendenRechner einrichtung={einrichtung} />);
        expect(screen.queryByTestId('konfetti-danke')).not.toBeInTheDocument();
      } finally {
        dateNowSpy.mockRestore();
      }
    });
  });
});
