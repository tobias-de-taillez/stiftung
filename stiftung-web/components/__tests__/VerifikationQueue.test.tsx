import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VerifikationQueue } from '../VerifikationQueue';
import type { OffenerAntrag } from '@/lib/server/verifikationsService';

// Nur router.refresh() wird nach einer Entscheidung aufgerufen, nie asserted
// welche Instanz — dasselbe Muster wie AdminAktionen.test.tsx.
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

const antrag: OffenerAntrag = {
  antragId: 'antrag-1',
  traegerId: 'traeger-1',
  traegerName: 'Träger Test e.V.',
  einrichtungen: [{ slug: 'kita-a', name: 'Kita A' }],
  rechtsform: 'verein',
  rechtsformLabel: 'eingetragener Verein',
  gemeinnuetzig: true,
  createdAt: new Date('2026-07-20T10:00:00Z'),
};

describe('VerifikationQueue', () => {
  it('rendert Trägername, Einrichtungen, Rechtsform-Label und gemeinnützig-Flag', () => {
    render(<VerifikationQueue antraege={[antrag]} />);
    expect(screen.getByText('Träger Test e.V.')).toBeInTheDocument();
    expect(screen.getByText(/Kita A/)).toBeInTheDocument();
    expect(screen.getByText('eingetragener Verein')).toBeInTheDocument();
    expect(screen.getByText(/gemeinnützig/i)).toBeInTheDocument();
  });

  it('zeigt den Empty-State "Keine offenen Anträge.", wenn die Liste leer ist', () => {
    render(<VerifikationQueue antraege={[]} />);
    expect(screen.getByText('Keine offenen Anträge.')).toBeInTheDocument();
  });

  it('postet bei Genehmigen auf die richtige URL mit entscheidung: genehmigt und aktualisiert danach', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<VerifikationQueue antraege={[antrag]} />);

    await user.click(screen.getByRole('button', { name: /Genehmigen/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/verifikation/antraege/antrag-1',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ entscheidung: 'genehmigt' }),
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it('postet bei Ablehnen auf die richtige URL mit entscheidung: abgelehnt', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<VerifikationQueue antraege={[antrag]} />);

    await user.click(screen.getByRole('button', { name: /Ablehnen/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/verifikation/antraege/antrag-1',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ entscheidung: 'abgelehnt' }),
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it('zeigt einen Fehlertext, wenn die Entscheidung fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    render(<VerifikationQueue antraege={[antrag]} />);
    await user.click(screen.getByRole('button', { name: /Genehmigen/i }));
    expect(await screen.findByText(/Aktion fehlgeschlagen/i)).toBeInTheDocument();
  });
});
