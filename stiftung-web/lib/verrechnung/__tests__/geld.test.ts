import { describe, it, expect } from 'vitest';
import { divRound, anteilVon, verteileProportional } from '../geld';
import { AUSSCHUETTUNGS_SATZ } from '../konstanten';

describe('divRound — kaufmännische Rundung (half away from zero)', () => {
  it('rundet glatte Division exakt', () => {
    expect(divRound(100n, 4n)).toBe(25n);
  });
  it('rundet ,5 weg von null (33,6 → 34; 0,5 → 1)', () => {
    expect(divRound(336n, 10n)).toBe(34n); // Spec-§9-Wert: 0,24 % × 140 € = 33,6 Cent
    expect(divRound(1n, 2n)).toBe(1n);
    expect(divRound(3n, 2n)).toBe(2n);
  });
  it('rundet unterhalb ,5 ab', () => {
    expect(divRound(14n, 10n)).toBe(1n);
  });
  it('behandelt negative Zähler symmetrisch (half AWAY from zero)', () => {
    expect(divRound(-1n, 2n)).toBe(-1n);
    expect(divRound(-14n, 10n)).toBe(-1n);
    expect(divRound(-336n, 10n)).toBe(-34n);
  });
  it('wirft bei nenner <= 0', () => {
    expect(() => divRound(1n, 0n)).toThrow(RangeError);
    expect(() => divRound(1n, -5n)).toThrow(RangeError);
  });
});

describe('anteilVon', () => {
  it('1 % von 41.500 Cent sind 415 Cent', () => {
    expect(anteilVon(41500n, AUSSCHUETTUNGS_SATZ)).toBe(415n);
  });
  it('1 % von 30.184 Cent sind 302 Cent (kaufmännisch: 301,84)', () => {
    expect(anteilVon(30184n, AUSSCHUETTUNGS_SATZ)).toBe(302n);
  });
});

describe('verteileProportional — Summe exakt, Rest an restIndex (Spec §2 Rundung)', () => {
  it('verteilt proportional und kaufmännisch gerundet', () => {
    // Spec-§9 Schritt 6: S = 299 Cent, Gewichte w_C = 1e9, w_A = 758166667, w_B = 0
    const anteile = verteileProportional(299n, [1_000_000_000n, 758_166_667n, 0n], 0);
    expect(anteile).toEqual([170n, 129n, 0n]);
    expect(anteile[0] + anteile[1] + anteile[2]).toBe(299n);
  });
  it('gibt die Restdifferenz an restIndex, Summe bleibt exakt', () => {
    // 100 Cent auf drei gleiche Gewichte: je 33,33 → gerundet 33; Rest 1 an Index 1
    expect(verteileProportional(100n, [1n, 1n, 1n], 1)).toEqual([33n, 34n, 33n]);
  });
  it('zieht Über-Rundung beim restIndex wieder ab (negativer Rest)', () => {
    // 1 Cent auf zwei gleiche Gewichte: je round(0,5) = 1 → Summe 2, Rest −1 an Index 0
    expect(verteileProportional(1n, [1n, 1n], 0)).toEqual([0n, 1n]);
  });
  it('alle Gewichte 0 → alles an restIndex', () => {
    expect(verteileProportional(50n, [0n, 0n], 1)).toEqual([0n, 50n]);
  });
  it('leere Gewichte → leeres Ergebnis, wirft nicht', () => {
    expect(verteileProportional(0n, [], 0)).toEqual([]);
  });
});
