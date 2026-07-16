import { describe, it, expect } from 'vitest';
import { LEVELS, currentLevel } from '../levels';

describe('LEVELS', () => {
  it('enthält die Stufen aus dem Brainstorming (50/200/500 pro Kind/Jahr) plus zwei weitere', () => {
    expect(LEVELS.map((l) => l.annualDonationPerChild)).toEqual([50, 200, 500, 1000, 2000]);
  });
});

describe('currentLevel', () => {
  it('gibt null zurück unter der ersten Schwelle', () => {
    expect(currentLevel(10)).toBeNull();
  });
  it('gibt Bronze bei genau 50 zurück', () => {
    expect(currentLevel(50)?.name).toBe('Bronze');
  });
  it('gibt das höchste erreichte Level zurück', () => {
    expect(currentLevel(600)?.name).toBe('Gold');
  });
  it('gibt Diamant bei sehr hohen Beträgen zurück', () => {
    expect(currentLevel(5000)?.name).toBe('Diamant');
  });
});
