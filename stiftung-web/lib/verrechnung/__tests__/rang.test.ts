import { describe, it, expect } from 'vitest';
import { vProKindTausendstelCent, perzentil, berechneRang } from '../rang';
import { P_SCALE } from '../konstanten';

describe('vProKindTausendstelCent', () => {
  it('140,00 € auf 5 Kinder sind 28,00 € pro Kind (2.800.000 Tausendstel-Cent)', () => {
    expect(vProKindTausendstelCent(14_000n, 5)).toBe(2_800_000n);
  });
  it('wirft bei kinder <= 0', () => {
    expect(() => vProKindTausendstelCent(100n, 0)).toThrow(RangeError);
  });
});

describe('perzentil — lineare Interpolation (Spec §5)', () => {
  // Spec-§9-Werte: v sortiert [25,00 · 28,00 · 37,50] €/Kind
  const sortiert = [2_500_000n, 2_800_000n, 3_750_000n];
  it('P5 von [25,00 · 28,00 · 37,50] ist 25,30', () => {
    expect(perzentil(sortiert, 5n, 100n)).toBe(2_530_000n);
  });
  it('P95 von [25,00 · 28,00 · 37,50] ist 36,55', () => {
    expect(perzentil(sortiert, 95n, 100n)).toBe(3_655_000n);
  });
  it('einelementige Liste: jedes Perzentil ist der Wert selbst', () => {
    expect(perzentil([42n], 5n, 100n)).toBe(42n);
    expect(perzentil([42n], 95n, 100n)).toBe(42n);
  });
});

describe('berechneRang', () => {
  const k = (id: string, topfCent: bigint, kinder: number, verifiziert = true) => ({
    id, topfCent, kinder, verifiziert,
  });

  it('n < 2 → keine Verteilung (Spec §6)', () => {
    const r = berechneRang([k('a', 10_000n, 5)]);
    expect(r.p).toBeNull();
    expect(r.grund).toBe('zuWenigEinrichtungen');
  });

  it('alle v gleich → keine Verteilung, Grund alleGleich (Erfolgsfall, Spec §6)', () => {
    const r = berechneRang([k('a', 10_000n, 5), k('b', 20_000n, 10)]); // beide 20 €/Kind
    expect(r.p).toBeNull();
    expect(r.grund).toBe('alleGleich');
  });

  it('reproduziert die Spec-§9-Sätze: p_C = 0, p_A = 0,24, p_B = 1', () => {
    // Snapshot: A 140 € / 5 Kinder, B 150 € / 4, C 125 € / 5
    const r = berechneRang([k('A', 14_000n, 5), k('B', 15_000n, 4), k('C', 12_500n, 5)]);
    expect(r.grund).toBeNull();
    expect(r.p!.get('C')).toBe(0n);
    expect(r.p!.get('A')).toBe(240_000_000n); // 0,24 × P_SCALE
    expect(r.p!.get('B')).toBe(P_SCALE);
    expect(r.aermsteVerifizierteId).toBe('C');
  });

  it('Skala NUR aus verifizierten; unverifizierte werden an ihr gemessen und geklemmt', () => {
    // Verifizierte spannen 10–20 €/Kind auf; der unverifizierte Ausreißer mit
    // 100 €/Kind verschiebt die Skala NICHT und landet geklemmt auf p = 1.
    const r = berechneRang([
      k('v1', 10_000n, 10),           // 10 €/Kind
      k('v2', 20_000n, 10),           // 20 €/Kind
      k('u1', 100_000n, 10, false),   // 100 €/Kind, unverifiziert
    ]);
    expect(r.p!.get('v1')).toBe(0n);
    expect(r.p!.get('v2')).toBe(P_SCALE);
    expect(r.p!.get('u1')).toBe(P_SCALE); // geklemmt, nicht skalenbildend
  });

  it('Fallback: weniger als 2 verifizierte → Skala aus allen (Spec §5, MVP-Fall)', () => {
    const r = berechneRang([
      k('u1', 10_000n, 10, false),
      k('u2', 30_000n, 10, false),
      k('v1', 20_000n, 10, true),
    ]);
    // Skala aus allen: 10–30 €/Kind (P5/P95 interpoliert), v1 liegt in der Mitte
    expect(r.p!.get('v1')! > 0n && r.p!.get('v1')! < P_SCALE).toBe(true);
  });

  it('kollabierte winsorisierte Spanne → Fallback Min/Max (Spec §5)', () => {
    // 21 Einrichtungen: 20 identische, 1 Ausreißer oben. P5 == P95 == Mehrheitswert
    // → ungewinsorisiert Min/Max, Ausreißer p = 1, Mehrheit p = 0.
    const viele = Array.from({ length: 20 }, (_, i) => k(`m${String(i).padStart(2, '0')}`, 10_000n, 10));
    const r = berechneRang([...viele, k('reich', 100_000n, 10)]);
    expect(r.grund).toBeNull();
    expect(r.p!.get('m00')).toBe(0n);
    expect(r.p!.get('reich')).toBe(P_SCALE);
  });

  it('ärmste bei Gleichstand: niedrigere ID gewinnt (Spec §2 Rundung)', () => {
    const r = berechneRang([k('b', 10_000n, 10), k('a', 10_000n, 10), k('c', 30_000n, 10)]);
    expect(r.aermsteVerifizierteId).toBe('a');
  });

  it('aermsteVerifizierteId ignoriert unverifizierte (Restcent darf nur an Empfänger gehen)', () => {
    const r = berechneRang([
      k('u-arm', 1_000n, 10, false), // ärmster insgesamt, aber kein Umverteilungs-Empfänger
      k('v-arm', 5_000n, 10, true),
      k('v-reich', 50_000n, 10, true),
    ]);
    expect(r.aermsteVerifizierteId).toBe('v-arm');
  });
});
