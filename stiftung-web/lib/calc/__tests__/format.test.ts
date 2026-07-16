import { describe, it, expect } from 'vitest';
import { formatEuro, formatDuration, formatMonate } from '../format';

describe('formatEuro', () => {
  it('formatiert mit deutschem Format und Euro-Zeichen', () => {
    expect(formatEuro(1234.5)).toBe('1.234,50 €');
  });
  it('rundet auf zwei Nachkommastellen', () => {
    expect(formatEuro(40000)).toBe('40.000,00 €');
  });
});

describe('formatDuration', () => {
  it('zeigt Jahre und Monate', () => {
    expect(formatDuration(2.25)).toBe('2 Jahre und 3 Monate');
  });
  it('zeigt nur Monate bei unter einem Jahr', () => {
    expect(formatDuration(0.5)).toBe('6 Monate');
  });
  it('zeigt nur Jahre bei vollen Jahren', () => {
    expect(formatDuration(5)).toBe('5 Jahre');
  });
  it('nutzt Singular bei genau einem Jahr bzw. Monat', () => {
    expect(formatDuration(1)).toBe('1 Jahr');
    expect(formatDuration(13 / 12)).toBe('1 Jahr und 1 Monat');
  });
  it('meldet Infinity als nicht erreichbar', () => {
    expect(formatDuration(Infinity)).toBe('nicht erreichbar');
  });
});

describe('formatMonate', () => {
  it('nutzt Singular bei genau einem Monat', () => {
    expect(formatMonate(1)).toBe('1 Monat');
  });

  it('nutzt Plural bei 0 oder mehreren Monaten', () => {
    expect(formatMonate(0)).toBe('0 Monate');
    expect(formatMonate(3)).toBe('3 Monate');
    expect(formatMonate(16)).toBe('16 Monate');
  });

  it('rundet auf ganze Monate', () => {
    expect(formatMonate(16.4)).toBe('16 Monate');
  });
});
