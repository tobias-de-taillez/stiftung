import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminAktionen } from '../AdminAktionen';
import type { KontenLage } from '@/lib/server/kontenService';

// Nur router.refresh() wird aufgerufen, nie asserted — das einfache
// Fabrik-Mock reicht hier (anders als bei AdminLogin, das router.push
// prüft), siehe SolidaritaetsfondsPanel.test für dasselbe Muster.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// KaskadenErgebnis staggert Sektionen per Timer — reduced-motion erzwingt
// den Sofort-Endzustand, deterministisch für alle Tests in dieser Datei.
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

describe('AdminAktionen — Marktjahr', () => {
  it('postet auf /api/admin/marktjahr und zeigt die Kurs-Zeile', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ einrichtungsDepotDeltaCent: 35_000, soliDepotDeltaCent: 1_400 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);

    await user.click(screen.getByRole('button', { name: /Marktjahr simulieren/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/marktjahr', expect.objectContaining({ method: 'POST' }));
    expect(
      await screen.findByText(/Kurs: Einrichtungs-Depot \+350,00\s*€, Soli-Depot \+14,00\s*€/)
    ).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn die Marktjahr-Simulation fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Marktjahr simulieren/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});

describe('AdminAktionen — Jahresabschluss (Kaskade)', () => {
  const goldeneKaskade = {
    nummer: 1,
    poolwertCent: 41_500,
    soliFondsCent: 30_000,
    direktspenden: [{ slug: 'a', name: 'Einrichtung A', cent: 140 }],
    abgaben: [{ slug: 'a', name: 'Einrichtung A', cent: 34, pPromille: 240 }],
    managementBewegungCent: 302,
    umverteilung: [{ slug: 'a', name: 'Einrichtung A', cent: 129 }],
    keineVerteilungGrund: null,
    endSoliFondsCent: 29_583,
    endManagementKontoCent: 100_302,
    meilensteine: [],
  };

  it('postet auf /api/admin/jahresabschluss und rendert KaskadenErgebnis', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => goldeneKaskade });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);

    await user.click(screen.getByRole('button', { name: /Jahresabschluss ausführen/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/jahresabschluss', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByTestId('kaskaden-ergebnis')).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn der Jahresabschluss fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Jahresabschluss ausführen/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});

describe('AdminAktionen — Auszahlungslauf', () => {
  it('postet auf /api/admin/auszahlungslauf und zeigt "X € in Y Auszahlungen überwiesen"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ summeCent: 4_500, anzahl: 3 }) })
    );
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Auszahlungslauf/i }));
    expect(await screen.findByText(/45,00\s*€ in 3 Auszahlungen überwiesen\./)).toBeInTheDocument();
  });

  it('zeigt "Nichts offen.", wenn der Auszahlungslauf leer ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ summeCent: 0, anzahl: 0 }) }));
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Auszahlungslauf/i }));
    expect(await screen.findByText(/Nichts offen\./)).toBeInTheDocument();
  });

  it('zeigt Fehlertext, wenn der Auszahlungslauf fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);
    await user.click(screen.getByRole('button', { name: /Auszahlungslauf/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});

describe('AdminAktionen — Management-Cap Inline-Edit', () => {
  it('postet PUT /api/admin/cap mit dem neuen Cap in Cent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...lage, managementCapCent: 150_000 }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);

    const input = screen.getByLabelText(/Management-Cap/i);
    await user.clear(input);
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: /Cap speichern/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/cap',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ capCent: 150_000 }),
      })
    );
  });

  it('zeigt Fehlertext, wenn das Speichern des Caps fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<AdminAktionen lage={lage} />);
    const input = screen.getByLabelText(/Management-Cap/i);
    await user.clear(input);
    await user.type(input, '1500');
    await user.click(screen.getByRole('button', { name: /Cap speichern/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});
