import { describe, it, expect } from 'vitest';
import {
  ANNUAL_PAYOUT_RATE,
  NET_GROWTH_RATE,
  capitalForAnnualPayout,
  computeYearsToGoal,
  zukunftswert,
  futureValueWithAnnualDonation,
  dauerhafteJahresfoerderung,
  verkuerzungMonate,
} from '../spendenrechner';

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

describe('zukunftswert', () => {
  it('liefert den Betrag unverändert bei 0 Jahren (keine Verzinsung)', () => {
    expect(zukunftswert(50, 0)).toBe(50);
  });

  it('verzinst den Betrag mit der Netto-Wachstumsrate über die Jahre (Zinseszins)', () => {
    // 1000 € über 10 Jahre bei 6 % Netto-Wachstum.
    expect(zukunftswert(1000, 10)).toBeCloseTo(1790.85, 2);
  });

  it('akzeptiert eine abweichende Rate, Default ist NET_GROWTH_RATE', () => {
    expect(zukunftswert(1000, 10, 0.1)).toBeCloseTo(1000 * Math.pow(1.1, 10), 6);
    expect(zukunftswert(1000, 10)).toBeCloseTo(zukunftswert(1000, 10, NET_GROWTH_RATE), 6);
  });
});

describe('futureValueWithAnnualDonation (exportiert für die Renten-FV wiederkehrender Spenden)', () => {
  it('berechnet die Renten-Zukunftswert-Formel für eine reine Spendenreihe ohne Startkapital', () => {
    // 100 €/Jahr, 5 Jahre, 6 % — FV = PMT * ((1+i)^n - 1) / i
    expect(futureValueWithAnnualDonation(0, 100, 0.06, 5)).toBeCloseTo(563.71, 2);
  });

  it('addiert das verzinste Startkapital zur Renten-Komponente', () => {
    expect(futureValueWithAnnualDonation(1000, 0, 0.06, 5)).toBeCloseTo(1000 * Math.pow(1.06, 5), 6);
  });
});

describe('dauerhafteJahresfoerderung', () => {
  it('liefert ohne Jahresangabe (Default 0) die "ab sofort"-Untergrenze betrag × ANNUAL_PAYOUT_RATE', () => {
    expect(dauerhafteJahresfoerderung(50)).toBeCloseTo(50 * ANNUAL_PAYOUT_RATE, 6);
    expect(dauerhafteJahresfoerderung(50, 0)).toBeCloseTo(50 * ANNUAL_PAYOUT_RATE, 6);
  });

  it('KORREKTUR: mit Jahresangabe entsteht die Ausschüttung aus dem angewachsenen Kapital (FV(betrag) × ANNUAL_PAYOUT_RATE)', () => {
    expect(dauerhafteJahresfoerderung(1000, 10)).toBeCloseTo(zukunftswert(1000, 10) * ANNUAL_PAYOUT_RATE, 6);
    // Die gewachsene Ausschüttung liegt über der naiven "ab sofort"-Untergrenze.
    expect(dauerhafteJahresfoerderung(1000, 10)).toBeGreaterThan(dauerhafteJahresfoerderung(1000, 0));
  });
});

describe('verkuerzungMonate', () => {
  const einrichtung = { startCapital: 3000, targetCapital: 25000 };

  it('berechnet die Verkürzung in Monaten als Delta zwischen Jahre-bis-Ziel ohne/mit Spende', () => {
    // Handgerechnet: ohne ≈ 36,3876 Jahre, mit (Startkapital+250) ≈ 35,0139 Jahre
    // → Delta ≈ 16,48 Monate, gerundet 16.
    expect(verkuerzungMonate(einrichtung, 250, 'einmalig')).toBe(16);
  });

  it('liefert 0, wenn keine Spende erfolgt (kein Unterschied ohne/mit)', () => {
    expect(verkuerzungMonate(einrichtung, 0, 'einmalig')).toBe(0);
  });

  it('liefert nie einen negativen Wert (Spende kann den Weg nie verlängern)', () => {
    expect(verkuerzungMonate(einrichtung, 10, 'einmalig')).toBeGreaterThanOrEqual(0);
  });

  it('jährliche Spende verkürzt den Weg stärker als eine einmalige Spende gleicher Höhe', () => {
    const einmalig = verkuerzungMonate(einrichtung, 250, 'einmalig');
    const jaehrlich = verkuerzungMonate(einrichtung, 250, 'jaehrlich');
    expect(jaehrlich).toBeGreaterThan(einmalig);
  });

  it('liefert 0, wenn das Ziel auch mit Spende im Simulationszeitraum unerreichbar bleibt (kein NaN)', () => {
    // Bei "einmalig" macht schon eine kleine Spende (>0) das Ziel formal
    // "erreichbar" (die geschlossene Log-Formel kennt kein Zeit-Limit) — nur
    // bei "jaehrlich" (mit MAX_YEARS=500-Deckel in computeYearsToGoal) bleibt
    // ein astronomisch großes Ziel auch mit Spende Infinity. Das ist der
    // Fall, den dieser Test prüft (siehe computeYearsToGoal-Test oben für den
    // reinen Infinity-Fall ohne Spende).
    const astronomisch = { startCapital: 0, targetCapital: 1e30 };
    expect(verkuerzungMonate(astronomisch, 50, 'jaehrlich')).toBe(0);
  });

  it('Property-Test: verkuerzungMonate ist ≥ 0 und monoton (nicht fallend) in betrag', () => {
    const betraege = [10, 50, 100, 250, 500, 1000, 2000];
    let vorheriger = -1;
    for (const betrag of betraege) {
      const monate = verkuerzungMonate(einrichtung, betrag, 'einmalig');
      expect(monate).toBeGreaterThanOrEqual(0);
      expect(monate).toBeGreaterThanOrEqual(vorheriger);
      vorheriger = monate;
    }
  });
});
