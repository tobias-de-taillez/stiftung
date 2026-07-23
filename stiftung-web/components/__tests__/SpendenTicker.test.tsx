import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SpendenTicker, POLL_INTERVAL_MS } from '../SpendenTicker';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SpendenTicker', () => {
  it('zeigt den Empty-State, wenn keine Buchungen vorhanden sind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<SpendenTicker />);
    expect(await screen.findByText(/Sei die erste Spende!/i)).toBeInTheDocument();
  });

  it('zeigt einen Buchungs-Eintrag mit Zeit, Betrag, Einrichtung und Typ-Label "Spende"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ betragCent: 5000, typ: 'spende', einrichtungName: 'Kita Regenbogen', vorMinuten: 2, zeitpunkt: 1720000000000 }],
      })
    );
    render(<SpendenTicker />);
    expect(await screen.findByText(/Vor 2 Min:\s*50,00\s*€\s*für Kita Regenbogen/)).toBeInTheDocument();
    expect(screen.getByText(/Spende/)).toBeInTheDocument();
  });

  it('zeigt "Gerade eben" für vorMinuten 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ betragCent: 500, typ: 'spende', einrichtungName: 'Kita X', vorMinuten: 0, zeitpunkt: 1720000001000 }],
      })
    );
    render(<SpendenTicker />);
    expect(await screen.findByText(/Gerade eben:\s*5,00\s*€/)).toBeInTheDocument();
  });

  it.each([
    ['soli_spende', 'Fonds-Spende'],
    ['erstbefuellung', 'Erstbefüllung'],
    ['kaskade_umverteilung', 'Solidaritätsfonds-Verteilung'],
    ['direktausschuettung_eingang', 'Direktspende'],
  ])('mappt typ "%s" auf das Label "%s"', async (typ, label) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ betragCent: 3000, typ, einrichtungName: 'Kita Y', vorMinuten: 1, zeitpunkt: 1720000002000 }],
      })
    );
    render(<SpendenTicker />);
    expect(await screen.findByText(new RegExp(label))).toBeInTheDocument();
  });

  it('bleibt beim letzten Stand, wenn der Fetch fehlschlägt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<SpendenTicker />);
    expect(await screen.findByText(/Sei die erste Spende!/i)).toBeInTheDocument();
  });

  it('pollt nach 15 Sekunden erneut und rendert die aktualisierten Einträge', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ betragCent: 1000, typ: 'spende', einrichtungName: 'Kita Z', vorMinuten: 0, zeitpunkt: 1720000003000 }],
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    render(<SpendenTicker />);

    // Initialer Fetch beim Mount.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Sei die erste Spende!/i)).toBeInTheDocument();

    // Nach 15s erneuter Poll (POLL_INTERVAL_MS), neue Daten erscheinen.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Gerade eben:\s*10,00\s*€\s*für Kita Z/)).toBeInTheDocument();
  });

  it('räumt das Interval beim Unmount auf (kein weiterer Fetch danach)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    const { unmount } = render(<SpendenTicker />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
