import { describe, it, expect } from 'vitest';
import { LEVELS, currentLevel, nextLevel, einrichtungsLevel, EINRICHTUNGS_LEVELS } from '../levels';

// Spender-Badge: absolute, von der Kinderzahl unabhängige Schwellen (Task 30).
// Vorher war LEVELS an annualDonationPerChild geknüpft — das brach bei
// größeren Einrichtungen (Bronze bei 60-Kinder-Kita = 3.000 €/Jahr) und war
// für Einmalspenden komplett tot (annualDonationPerChild war dort immer 0).
describe('LEVELS', () => {
  it('enthält absolute, erreichbare Spendenschwellen (25/100/250/1.000/2.500 €)', () => {
    expect(LEVELS.map((l) => l.schwelleEuro)).toEqual([25, 100, 250, 1000, 2500]);
  });

  it('behält die fünf Namen aus dem Brainstorming', () => {
    expect(LEVELS.map((l) => l.name)).toEqual(['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant']);
  });
});

describe('currentLevel', () => {
  it('gibt null zurück unter der ersten Schwelle', () => {
    expect(currentLevel(10)).toBeNull();
  });
  it('gibt Bronze bei genau 25 € zurück', () => {
    expect(currentLevel(25)?.name).toBe('Bronze');
  });
  it('gibt Silber bei 150 € zurück (zwischen den Schwellen)', () => {
    expect(currentLevel(150)?.name).toBe('Silber');
  });
  it('gibt das höchste erreichte Level zurück', () => {
    expect(currentLevel(300)?.name).toBe('Gold');
  });
  it('gibt Diamant bei sehr hohen Beträgen zurück', () => {
    expect(currentLevel(5000)?.name).toBe('Diamant');
  });
  it('funktioniert unabhängig von der Kinderzahl — reine Betragsfunktion (Kernreparatur)', () => {
    // Vorher war die Schwelle pro Kind normiert; jetzt zählt nur der Betrag.
    expect(currentLevel(1000)?.name).toBe('Platin');
  });
});

describe('nextLevel', () => {
  it('gibt Bronze als nächstes Level unter der ersten Schwelle zurück', () => {
    expect(nextLevel(10)?.name).toBe('Bronze');
  });
  it('gibt Silber als nächstes Level zurück, wenn Bronze exakt erreicht ist', () => {
    expect(nextLevel(25)?.name).toBe('Silber');
  });
  it('gibt null zurück, wenn Diamant (höchste Schwelle) bereits erreicht ist', () => {
    expect(nextLevel(2500)).toBeNull();
  });
  it('gibt null zurück weit über der höchsten Schwelle', () => {
    expect(nextLevel(10000)).toBeNull();
  });
});

// Einrichtungs-Level: Bronze→Diamant als Zwischenziele des Finanztopfs,
// definiert als Anteile des Zielkapitals (Brainstorming Abs. 4).
describe('EINRICHTUNGS_LEVELS', () => {
  it('definiert die fünf Stufen als Anteile des Zielkapitals (10/25/50/75/100 %)', () => {
    expect(EINRICHTUNGS_LEVELS.map((l) => l.anteil)).toEqual([0.1, 0.25, 0.5, 0.75, 1]);
  });
});

describe('einrichtungsLevel', () => {
  it('gibt kein aktuelles Level zurück, solange nicht einmal Bronze (10 %) erreicht ist', () => {
    const result = einrichtungsLevel(500, 100000);
    expect(result.current).toBeNull();
    expect(result.next?.name).toBe('Bronze');
  });

  it('gibt Bronze als aktuelles Level bei exakt 10 % zurück, nächstes Ziel Silber', () => {
    const result = einrichtungsLevel(10000, 100000);
    expect(result.current?.name).toBe('Bronze');
    expect(result.next?.name).toBe('Silber');
    // Silber liegt bei 25 % von 100.000 € = 25.000 €, aktuell 10.000 € → fehlen 15.000 €.
    expect(result.fehlenderBetrag).toBe(15000);
  });

  it('gibt das höchste erreichte Level zurück (Gold bei 60 %)', () => {
    const result = einrichtungsLevel(60000, 100000);
    expect(result.current?.name).toBe('Gold');
    expect(result.next?.name).toBe('Platin');
    expect(result.fehlenderBetrag).toBe(15000);
  });

  it('gibt Diamant zurück, wenn das Ziel erreicht ist — kein nächstes Level, kein Fehlbetrag', () => {
    const result = einrichtungsLevel(100000, 100000);
    expect(result.current?.name).toBe('Diamant');
    expect(result.next).toBeNull();
    expect(result.fehlenderBetrag).toBe(0);
  });

  it('behandelt ein Zielkapital von 0 defensiv (kein Level, kein Fehlbetrag)', () => {
    const result = einrichtungsLevel(0, 0);
    expect(result.current).toBeNull();
    expect(result.next).toBeNull();
    expect(result.fehlenderBetrag).toBe(0);
  });
});
