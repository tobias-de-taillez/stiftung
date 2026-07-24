import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminEinrichtungenListe } from '../AdminEinrichtungenListe';
import type { EinrichtungMitTopf } from '@/lib/server/uebersichtService';

// Nur router.refresh() nach erfolgreichem Schließen — dasselbe Muster wie
// TraegerPanel/AdminAktionen.
const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

beforeEach(() => {
  refreshMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const einrichtung: EinrichtungMitTopf = {
  id: 'e-1',
  slug: 'kita-a',
  name: 'Kita A',
  typ: 'kita',
  ort: 'Teststadt',
  kinderAnzahl: 10,
  topfwertCent: 150_000,
  zielKapitalCent: 5_000_000,
  foerderungProKindCent: 15_000,
  verifiziert: true,
  auszahlungspfad: 'mittelweitergabe',
  rechtsformLabel: 'eingetragener Verein',
  traegerName: 'Träger Test e.V.',
  traegerId: 'traeger-1',
};

describe('AdminEinrichtungenListe', () => {
  it('rendert Name, Topfwert, Status und Auszahlungspfad', () => {
    render(<AdminEinrichtungenListe einrichtungen={[einrichtung]} />);
    expect(screen.getByText('Kita A')).toBeInTheDocument();
    expect(screen.getByText(/1\.500,00\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/Zugang abgeholt/)).toBeInTheDocument();
    expect(screen.getByText(/Mittelweitergabe/)).toBeInTheDocument();
  });

  it('zeigt den Empty-State, wenn keine Einrichtungen vorhanden sind', () => {
    render(<AdminEinrichtungenListe einrichtungen={[]} />);
    expect(screen.getByText(/Keine Einrichtungen vorhanden/)).toBeInTheDocument();
  });

  it('zeigt die Bestätigung mit dem formatierten Topfwert erst nach Klick auf "Einrichtung schließen"', async () => {
    const user = userEvent.setup();
    render(<AdminEinrichtungenListe einrichtungen={[einrichtung]} />);

    expect(screen.queryByText(/geht in den Solidaritätsfonds über/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Einrichtung schließen/i }));
    expect(
      screen.getByText(/Der gesamte Topf — 1\.500,00\s*€ — geht in den Solidaritätsfonds über\. Das lässt sich nicht rückgängig machen\./)
    ).toBeInTheDocument();
  });

  it('postet bei Bestätigung auf /api/admin/einrichtungen/[slug]/schliessen und aktualisiert danach', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminEinrichtungenListe einrichtungen={[einrichtung]} />);

    await user.click(screen.getByRole('button', { name: /Einrichtung schließen/i }));
    await user.click(screen.getByRole('button', { name: /Ja, endgültig schließen/i }));

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/einrichtungen/kita-a/schliessen', expect.objectContaining({ method: 'POST' }));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('bricht ohne POST ab, wenn "Abbrechen" geklickt wird', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AdminEinrichtungenListe einrichtungen={[einrichtung]} />);

    await user.click(screen.getByRole('button', { name: /Einrichtung schließen/i }));
    await user.click(screen.getByRole('button', { name: /Abbrechen/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/geht in den Solidaritätsfonds über/)).not.toBeInTheDocument();
  });

  it('zeigt einen Fehlertext, wenn das Schließen fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<AdminEinrichtungenListe einrichtungen={[einrichtung]} />);

    await user.click(screen.getByRole('button', { name: /Einrichtung schließen/i }));
    await user.click(screen.getByRole('button', { name: /Ja, endgültig schließen/i }));

    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});
