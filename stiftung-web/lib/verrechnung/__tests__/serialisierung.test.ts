import { describe, it, expect } from 'vitest';
import { serialisiere } from '../serialisierung';

describe('serialisiere', () => {
  it('konvertiert bigint rekursiv zu number, lässt Rest unangetastet', () => {
    const datum = new Date('2026-01-09');
    expect(
      serialisiere({ a: 415n, b: 'x', c: [{ d: 1n }], e: datum, f: null, g: new Map([['k', 2n]]) })
    ).toEqual({ a: 415, b: 'x', c: [{ d: 1 }], e: datum, f: null, g: { k: 2 } });
  });
  it('wirft bei Werten jenseits MAX_SAFE_INTEGER statt still zu runden', () => {
    expect(() => serialisiere({ a: 2n ** 60n })).toThrow(RangeError);
  });
});
