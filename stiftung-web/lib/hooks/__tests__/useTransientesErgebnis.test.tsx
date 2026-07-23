import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTransientesErgebnis, verwerfeTransienteErgebnisse } from '../useTransientesErgebnis';

// Der Snapshot-Speicher lebt im Modul-Scope und überlebt damit Testgrenzen —
// ohne Reset würde ein Wert aus einem früheren Test spätere Tests verfälschen.
beforeEach(() => {
  verwerfeTransienteErgebnisse();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTransientesErgebnis', () => {
  it('liefert initial null, wenn kein Snapshot existiert', () => {
    const { result } = renderHook(() => useTransientesErgebnis<string>('test.leer'));
    expect(result.current[0]).toBeNull();
  });

  it('restauriert den zuletzt gesetzten Wert nach Unmount + Remount (Refresh-Remount-Szenario)', () => {
    const { result, unmount } = renderHook(() => useTransientesErgebnis<{ delta: number }>('test.ergebnis'));
    act(() => result.current[1]({ delta: 42 }));
    expect(result.current[0]).toEqual({ delta: 42 });

    unmount();
    const remounted = renderHook(() => useTransientesErgebnis<{ delta: number }>('test.ergebnis'));

    expect(remounted.result.current[0]).toEqual({ delta: 42 });
  });

  it('restauriert nichts für einen anderen Key (Isolation zwischen Ergebnissen)', () => {
    const { result, unmount } = renderHook(() => useTransientesErgebnis<string>('test.a'));
    act(() => result.current[1]('wert-a'));
    unmount();

    const anderer = renderHook(() => useTransientesErgebnis<string>('test.b'));
    expect(anderer.result.current[0]).toBeNull();
  });

  it('restauriert nichts mehr nach Ablauf des Frische-Fensters (keine Wiederbelebung bei später Rück-Navigation)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { result, unmount } = renderHook(() => useTransientesErgebnis<string>('test.frische'));
    act(() => result.current[1]('frisch'));
    unmount();

    vi.setSystemTime(1_000_000 + 10_000);
    const remounted = renderHook(() => useTransientesErgebnis<string>('test.frische'));

    expect(remounted.result.current[0]).toBeNull();
  });

  it('restauriert innerhalb des Frische-Fensters (Remount folgt ~20 ms nach dem refresh)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { result, unmount } = renderHook(() => useTransientesErgebnis<string>('test.knapp'));
    act(() => result.current[1]('frisch'));
    unmount();

    vi.setSystemTime(1_000_000 + 9_999);
    const remounted = renderHook(() => useTransientesErgebnis<string>('test.knapp'));

    expect(remounted.result.current[0]).toBe('frisch');
  });

  it('verwerfeTransienteErgebnisse() leert den Speicher (Test-Reset)', () => {
    const { result, unmount } = renderHook(() => useTransientesErgebnis<string>('test.reset'));
    act(() => result.current[1]('wert'));
    unmount();

    verwerfeTransienteErgebnisse();
    const remounted = renderHook(() => useTransientesErgebnis<string>('test.reset'));

    expect(remounted.result.current[0]).toBeNull();
  });
});
