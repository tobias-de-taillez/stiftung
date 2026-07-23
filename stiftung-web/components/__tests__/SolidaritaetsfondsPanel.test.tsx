import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SolidaritaetsfondsPanel } from '../SolidaritaetsfondsPanel';
import type { KontenLage } from '@/lib/server/kontenService';

// Aktionen rufen nach Erfolg router.refresh() auf (Kontenlage lebt server-
// seitig, siehe page.tsx) — ohne Mock wirft next/navigation useRouter()
// außerhalb eines echten App-Router-Baums.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// KaskadenErgebnis staggert Sektionen per Timer (Task 18) — ohne
// reduced-motion-Stub wären Assertions nach dem Jahresabschluss flaky/langsam.
// reduced-motion erzwingt den Sofort-Endzustand, deterministisch für alle
// Tests in dieser Datei.
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

// Bewusst überlappungsfreie Cent-Werte (keine Zahl ist Teilstring einer
// anderen formatierten Euro-Zahl) — sonst kollidieren getByText-Regexe
// zwischen z. B. Verrechnungskonto und der Poolwert-Summenzeile.
const lage: KontenLage = {
  etfMarktwertCent: 500_000,
  verrechnungskontoCent: 12_340,
  soliDepotCent: 20_000,
  soliVerrechnungskontoCent: 6_780,
  managementKontoCent: 100_000,
  managementCapCent: 120_000,
  offeneDirektausschuettungenCent: 0,
  poolwertCent: 512_340,
  soliFondsCent: 26_780,
};

describe('SolidaritaetsfondsPanel — Kontenübersicht', () => {
  it('zeigt den Fondswert-Hero und alle fünf Konten plus Poolwert-Summenzeile', () => {
    const { container } = render(<SolidaritaetsfondsPanel lage={lage} />);
    // Fondswert-Hero
    expect(screen.getByText(/267,80\s*€/)).toBeInTheDocument();

    // Fünf Konten + Summenzeile — pro Zeile gezielt geprüft (within), damit
    // Zahlen nicht versehentlich als Teilstring einer Nachbarzeile matchen
    // (z. B. Poolwert enthält die Summe aller Einzelkonten).
    const rows = [...container.querySelectorAll('tr')];
    const zeileMit = (label: string) => {
      const row = rows.find((r) => r.textContent?.includes(label));
      if (!row) throw new Error(`Keine Zeile mit "${label}" gefunden`);
      return within(row);
    };

    expect(zeileMit('Einrichtungs-Depot').getByText(/5\.000,00\s*€/)).toBeInTheDocument();
    expect(zeileMit('Verrechnungskonto').getByText(/123,40\s*€/)).toBeInTheDocument();
    expect(zeileMit('Soli-Depot').getByText(/200,00\s*€/)).toBeInTheDocument();
    expect(zeileMit('Soli-Verrechnungskonto').getByText(/67,80\s*€/)).toBeInTheDocument();
    const managementZeile = zeileMit('Management-Konto');
    expect(managementZeile.getByText(/1\.000,00\s*€/)).toBeInTheDocument();
    expect(managementZeile.getByText(/Cap:\s*1\.200,00\s*€/)).toBeInTheDocument();
    expect(zeileMit('Poolwert').getByText(/5\.123,40\s*€/)).toBeInTheDocument();
  });

  it('zeigt "davon durchlaufend", wenn offene Direktausschüttungen bestehen', () => {
    render(<SolidaritaetsfondsPanel lage={{ ...lage, offeneDirektausschuettungenCent: 3_000 }} />);
    expect(screen.getByText(/davon durchlaufend:\s*30,00\s*€/)).toBeInTheDocument();
  });

  it('zeigt "davon durchlaufend" nicht, wenn keine offenen Direktausschüttungen bestehen', () => {
    render(<SolidaritaetsfondsPanel lage={lage} />);
    expect(screen.queryByText(/davon durchlaufend/)).not.toBeInTheDocument();
  });

  it('rendert weder den alten 6-%-Button noch den alten "Fonds verteilen"-Button', () => {
    render(<SolidaritaetsfondsPanel lage={lage} />);
    expect(screen.queryByRole('button', { name: /Jetzt verteilen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+6 ?%/i })).not.toBeInTheDocument();
  });
});

describe('SolidaritaetsfondsPanel — Soli-Spende', () => {
  it('postet betragCent aus dem Euro-Input', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ zuwendungId: 'z1', soliFondsCent: 27_500 }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);

    const input = screen.getByLabelText(/Betrag für den Solidaritätsfonds/i);
    await user.clear(input);
    await user.type(input, '25');
    await user.click(screen.getByRole('button', { name: /in den Fonds (ein)?spenden|einzahlen/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/solidaritaetsfonds/spenden',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ betragCent: 2_500 }),
      })
    );
  });

  it('zeigt Fehlertext, wenn die Spende fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /in den Fonds (ein)?spenden|einzahlen/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});

describe('SolidaritaetsfondsPanel — Marktjahr', () => {
  it('postet auf /api/simulation/marktjahr und zeigt die Kurs-Zeile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        einrichtungsDepotDeltaCent: 35_000,
        soliDepotDeltaCent: 1_400,
        poolwertCent: 545_000,
        soliFondsCent: 26_400,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);

    await user.click(screen.getByRole('button', { name: /Marktjahr simulieren/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/simulation/marktjahr', expect.objectContaining({ method: 'POST' }));
    expect(
      await screen.findByText(/Kurs: Einrichtungs-Depot \+350,00\s*€, Soli-Depot \+14,00\s*€ — kein einziger Topf wurde geschrieben\./)
    ).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn die Marktjahr-Simulation fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Marktjahr simulieren/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});

describe('SolidaritaetsfondsPanel — Jahresabschluss (Kaskade)', () => {
  // Goldene §9-Zahlen (siehe lib/verrechnung/__tests__/kaskade.test.ts).
  const goldeneKaskade = {
    nummer: 1,
    poolwertCent: 41_500,
    soliFondsCent: 30_000,
    direktspenden: [
      { slug: 'a', name: 'Einrichtung A', cent: 140 },
      { slug: 'b', name: 'Einrichtung B', cent: 150 },
      { slug: 'c', name: 'Einrichtung C', cent: 125 },
    ],
    abgaben: [
      { slug: 'a', name: 'Einrichtung A', cent: 34, pPromille: 240 },
      { slug: 'b', name: 'Einrichtung B', cent: 150, pPromille: 1000 },
    ],
    managementBewegungCent: 302,
    umverteilung: [
      { slug: 'a', name: 'Einrichtung A', cent: 129 },
      { slug: 'c', name: 'Einrichtung C', cent: 170 },
    ],
    keineVerteilungGrund: null,
    endSoliFondsCent: 29_583,
    endManagementKontoCent: 100_302,
    meilensteine: [],
  };

  it('postet auf /api/simulation/jahresabschluss und rendert KaskadenErgebnis mit Brutto-Positionen', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => goldeneKaskade });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);

    await user.click(screen.getByRole('button', { name: /Jahresabschluss ausführen/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/simulation/jahresabschluss', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByTestId('kaskaden-ergebnis')).toBeInTheDocument();
    expect(screen.getByText(/Einrichtung A zahlt 0,24\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/0,34\s*€/)).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn der Jahresabschluss fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Jahresabschluss ausführen/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });

  it('zeigt einen zweiten Kaskadenlauf mit eigener Instanz (Lauf Nr. 2)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => goldeneKaskade })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...goldeneKaskade, nummer: 2 }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);

    const button = screen.getByRole('button', { name: /Jahresabschluss ausführen/i });
    await user.click(button);
    expect(await screen.findByTestId('kaskaden-ergebnis')).toBeInTheDocument();
    await user.click(button);
    expect(await screen.findByTestId('kaskaden-ergebnis')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('SolidaritaetsfondsPanel — Auszahlungslauf', () => {
  it('zeigt "X € in Y Auszahlungen überwiesen", wenn etwas offen war', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ laufId: 'lauf1', summeCent: 4_500, anzahl: 3 }) })
    );
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Auszahlungslauf/i }));
    expect(await screen.findByText(/45,00\s*€ in 3 Auszahlungen überwiesen\./)).toBeInTheDocument();
  });

  it('zeigt "Nichts offen.", wenn der Auszahlungslauf leer ist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ laufId: null, summeCent: 0, anzahl: 0 }) })
    );
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Auszahlungslauf/i }));
    expect(await screen.findByText(/Nichts offen\./)).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn der Auszahlungslauf fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Auszahlungslauf/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});

describe('SolidaritaetsfondsPanel — Management-Cap Inline-Edit', () => {
  it('postet PUT /api/management/cap mit dem neuen Cap in Cent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...lage, managementCapCent: 150_000 }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);

    const input = screen.getByLabelText(/Management-Cap/i);
    await user.clear(input);
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: /Cap speichern/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/management/cap',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ capCent: 150_000 }),
      })
    );
  });

  it('zeigt Fehlertext, wenn das Speichern des Caps fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    const input = screen.getByLabelText(/Management-Cap/i);
    await user.clear(input);
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: /Cap speichern/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});
