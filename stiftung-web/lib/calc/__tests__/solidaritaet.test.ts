import { describe, it, expect } from 'vitest';
import { bedarfProKind, verteilePool } from '../solidaritaet';

describe('bedarfProKind', () => {
  it('berechnet die Pro-Kind-Lücke zum Ziel', () => {
    expect(bedarfProKind({ aktuellesKapital: 1000, zielKapital: 5000, kinderAnzahl: 10 })).toBe(400);
  });
  it('gibt 0 zurück, wenn das Ziel pro Kind bereits erreicht ist', () => {
    expect(bedarfProKind({ aktuellesKapital: 6000, zielKapital: 5000, kinderAnzahl: 10 })).toBe(0);
  });
  it('gibt 0 zurück bei kinderAnzahl 0 statt NaN', () => {
    expect(bedarfProKind({ aktuellesKapital: 1000, zielKapital: 5000, kinderAnzahl: 0 })).toBe(0);
  });
});

describe('verteilePool', () => {
  it('verteilt proportional zum Bedarf – höherer Bedarf bekommt mehr', () => {
    const ergebnis = verteilePool(100, [
      { slug: 'a', bedarf: 300 },
      { slug: 'b', bedarf: 100 },
    ]);
    const a = ergebnis.find((e) => e.slug === 'a')!;
    const b = ergebnis.find((e) => e.slug === 'b')!;
    expect(a.anteil).toBeGreaterThan(b.anteil);
    expect(a.anteil + b.anteil).toBeCloseTo(100, 2);
  });

  it('verteilt den kompletten Pool ohne Rest (Rundungsdifferenz an den letzten Eintrag)', () => {
    const ergebnis = verteilePool(100, [
      { slug: 'a', bedarf: 1 },
      { slug: 'b', bedarf: 1 },
      { slug: 'c', bedarf: 1 },
    ]);
    const summe = ergebnis.reduce((s, e) => s + e.anteil, 0);
    expect(summe).toBeCloseTo(100, 2);
  });

  it('gibt überall 0 zurück, wenn kein Bedarf besteht', () => {
    const ergebnis = verteilePool(100, [{ slug: 'a', bedarf: 0 }, { slug: 'b', bedarf: 0 }]);
    expect(ergebnis.every((e) => e.anteil === 0)).toBe(true);
  });

  it('gibt überall 0 zurück, wenn der Pool leer ist', () => {
    const ergebnis = verteilePool(0, [{ slug: 'a', bedarf: 100 }]);
    expect(ergebnis.every((e) => e.anteil === 0)).toBe(true);
  });

  it('verteilt nie negative Anteile (kleiner Pool, viele gleiche Bedarfe)', () => {
    const ergebnis = verteilePool(0.02, [
      { slug: 'a', bedarf: 1 },
      { slug: 'b', bedarf: 1 },
      { slug: 'c', bedarf: 1 },
      { slug: 'd', bedarf: 1 },
    ]);
    expect(ergebnis.every((e) => e.anteil >= 0)).toBe(true);
    expect(ergebnis.reduce((s, e) => s + e.anteil, 0)).toBeCloseTo(0.02, 10);
  });

  it('lässt nicht-finite Bedarfe die Verteilung nicht vergiften', () => {
    const ergebnis = verteilePool(100, [
      { slug: 'kaputt', bedarf: Number.NaN },
      { slug: 'ok', bedarf: 50 },
    ]);
    expect(ergebnis.find((e) => e.slug === 'kaputt')!.anteil).toBe(0);
    expect(ergebnis.find((e) => e.slug === 'ok')!.anteil).toBe(100);
  });

  it('gibt die Rundungsdifferenz an den letzten Eintrag mit Bedarf > 0, nie an bedarfslose', () => {
    const ergebnis = verteilePool(0.01, [
      { slug: 'beduerftig', bedarf: 1 },
      { slug: 'satt', bedarf: 0 },
    ]);
    expect(ergebnis.find((e) => e.slug === 'beduerftig')!.anteil).toBe(0.01);
    expect(ergebnis.find((e) => e.slug === 'satt')!.anteil).toBe(0);
  });
});
