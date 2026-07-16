import { describe, it, expect } from 'vitest';
import { ANNUAL_PAYOUT_RATE, NET_GROWTH_RATE, capitalForAnnualPayout, computeYearsToGoal } from '../spendenrechner';

describe('capitalForAnnualPayout', () => {
  it('berechnet benötigtes Kapital für gewünschte Jahresausschüttung (1%)', () => {
    expect(capitalForAnnualPayout(20000)).toBe(2000000);
  });

  it('exportiert die jährliche Ausschüttungsquote von 1%, konsistent mit capitalForAnnualPayout', () => {
    expect(ANNUAL_PAYOUT_RATE).toBe(0.01);
  });
});

describe('computeYearsToGoal', () => {
  it('liefert 0 Jahre, wenn Startkapital bereits über dem Ziel liegt', () => {
    expect(computeYearsToGoal({ startCapital: 3000000, targetCapital: 2000000, donation: 0, frequency: 'einmalig' })).toBe(0);
  });

  it('berechnet Jahre bis Ziel ohne Spende (reines Wachstum)', () => {
    const years = computeYearsToGoal({ startCapital: 50000, targetCapital: 100000, donation: 0, frequency: 'einmalig' });
    expect(years).toBeCloseTo(11.9, 1);
  });

  it('einmalige Spende reduziert die Jahre bis zum Ziel', () => {
    const ohne = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 0, frequency: 'einmalig' });
    const mit = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 50, frequency: 'einmalig' });
    expect(mit).toBeLessThan(ohne);
  });

  it('jährliche Spende reduziert die Jahre stärker als einmalige gleicher Höhe', () => {
    const einmalig = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 50, frequency: 'einmalig' });
    const jaehrlich = computeYearsToGoal({ startCapital: 50000, targetCapital: 250000, donation: 50, frequency: 'jaehrlich' });
    expect(jaehrlich).toBeLessThan(einmalig);
  });

  it('verwendet die Netto-Wachstumsrate von 6% als Default', () => {
    expect(NET_GROWTH_RATE).toBe(0.06);
  });

  it('gibt Infinity zurück, wenn das Ziel im Simulationszeitraum nicht erreichbar ist', () => {
    const years = computeYearsToGoal({ startCapital: 0, targetCapital: 1_000_000_000_000, donation: 0, frequency: 'jaehrlich' });
    expect(years).toBe(Infinity);
  });
});
