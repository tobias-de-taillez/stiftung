import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SolidaritaetsfondsPanel } from '../SolidaritaetsfondsPanel';
import type { KontenLage } from '@/lib/server/kontenService';

// Soli-Spende ruft nach Erfolg router.refresh() auf (Kontenlage lebt server-
// seitig, siehe page.tsx) — ohne Mock wirft next/navigation useRouter()
// außerhalb eines echten App-Router-Baums.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

describe('SolidaritaetsfondsPanel — Kontenübersicht (via KontenUebersicht)', () => {
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
});

describe('SolidaritaetsfondsPanel — keine Admin-Aktionen mehr', () => {
  it('rendert keine der vier operativen Admin-Aktionen (die leben jetzt in AdminAktionen)', () => {
    render(<SolidaritaetsfondsPanel lage={lage} />);
    expect(screen.queryByRole('button', { name: /Marktjahr simulieren/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Jahresabschluss ausführen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Auszahlungslauf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cap speichern/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Management-Cap/i)).not.toBeInTheDocument();
  });

  it('rendert weder den alten 6-%-Button noch den alten "Fonds verteilen"-Button', () => {
    render(<SolidaritaetsfondsPanel lage={lage} />);
    expect(screen.queryByRole('button', { name: /Jetzt verteilen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+6 ?%/i })).not.toBeInTheDocument();
  });
});

describe('SolidaritaetsfondsPanel — Soli-Spende (bleibt public)', () => {
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
    vi.unstubAllGlobals();
  });

  it('zeigt Fehlertext, wenn die Spende fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<SolidaritaetsfondsPanel lage={lage} />);
    await user.click(screen.getByRole('button', { name: /in den Fonds (ein)?spenden|einzahlen/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
