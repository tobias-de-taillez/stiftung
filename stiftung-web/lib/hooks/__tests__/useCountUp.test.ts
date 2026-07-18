import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reducedMotion,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('animiert von 0 bis exakt target innerhalb der Dauer', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useCountUp(1234, 800));

    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1234);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1234);
  });

  it('springt bei reduced-motion sofort auf den Zielwert', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useCountUp(999, 800));

    expect(result.current).toBe(999);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(999);
  });

  it('nutzt 0 als Startwert ohne matchMedia-Unterstützung (SSR-sicher)', () => {
    // @ts-expect-error – jsdom liefert kein matchMedia standardmäßig
    delete window.matchMedia;
    const { result } = renderHook(() => useCountUp(50, 800));
    expect(result.current).toBe(0);
  });

  it('landet bei nicht-ganzzahligem target exakt auf dem Zielwert (kein Rundungsfehler)', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useCountUp(1234.56, 800));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1234.56);
  });
});
