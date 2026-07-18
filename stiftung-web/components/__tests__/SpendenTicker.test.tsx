import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SpendenTicker, POLL_INTERVAL_MS } from '../SpendenTicker';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SpendenTicker', () => {
  it('zeigt den Empty-State, wenn keine Spenden vorhanden sind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<SpendenTicker />);
    expect(await screen.findByText(/Sei die erste Spende!/i)).toBeInTheDocument();
  });

  it('zeigt einen Spenden-Eintrag mit Zeit, Betrag und Einrichtung', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ betrag: 50, einrichtungName: 'Kita Regenbogen', quelle: 'direkt', vorMinuten: 2, zeitpunkt: 1720000000000 }],
      })
    );
    render(<SpendenTicker />);
    expect(await screen.findByText(/Vor 2 Min:\s*50,00\s*€\s*für Kita Regenbogen/)).toBeInTheDocument();
  });

  it('zeigt "Gerade eben" für vorMinuten 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ betrag: 5, einrichtungName: 'Kita X', quelle: 'direkt', vorMinuten: 0, zeitpunkt: 1720000001000 }],
      })
    );
    render(<SpendenTicker />);
    expect(await screen.findByText(/Gerade eben:\s*5,00\s*€/)).toBeInTheDocument();
  });

  it('labelt quelle solidaritaet als "Solidaritätsfonds-Verteilung"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ betrag: 30, einrichtungName: 'Kita Y', quelle: 'solidaritaet', vorMinuten: 1, zeitpunkt: 1720000002000 }],
      })
    );
    render(<SpendenTicker />);
    expect(await screen.findByText(/Solidaritätsfonds-Verteilung/)).toBeInTheDocument();
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
        json: async () => [{ betrag: 10, einrichtungName: 'Kita Z', quelle: 'direkt', vorMinuten: 0, zeitpunkt: 1720000003000 }],
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
