import { describe, it, expect } from 'vitest';
import {
  LEVELS,
  currentLevel,
  nextLevel,
  einrichtungsLevel,
  EINRICHTUNGS_LEVELS,
  erreichteMeilensteine,
} from '../levels';

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

// Meilenstein-Erkennung (Task 31): welche Einrichtungs-Level (Task 30) und
// welche Prozent-Marken (25/50/75/100 %) wurden zwischen altKapital und
// neuKapital überschritten? Ein Spende-Betrag kann mehrere Schwellen auf
// einmal überspringen (z. B. bei der ersten großen Spende).
describe('erreichteMeilensteine', () => {
  it('liefert ein leeres Array, wenn keine Schwelle überschritten wird', () => {
    // 1.000 € → 1.050 € von 50.000 € Ziel: 2 % → 2,1 %, bleibt weit unter Bronze (10 %).
    expect(erreichteMeilensteine(1000, 1050, 50000)).toEqual([]);
  });

  it('liefert ein leeres Array, wenn sich das Kapital nicht erhöht', () => {
    expect(erreichteMeilensteine(5000, 5000, 50000)).toEqual([]);
    expect(erreichteMeilensteine(5000, 4000, 50000)).toEqual([]);
  });

  it('behandelt ein Zielkapital von 0 defensiv (kein Meilenstein)', () => {
    expect(erreichteMeilensteine(0, 100, 0)).toEqual([]);
  });

  it('erkennt Bronze (10 %) ohne Prozent-Marke, wenn keine 25 %-Schwelle mit überschritten wird', () => {
    // 1.000 € → 5.000 € von 50.000 € Ziel: 2 % → 10 % — nur Bronze, keine Prozent-Marke.
    expect(erreichteMeilensteine(1000, 5000, 50000)).toEqual(['Bronze erreicht']);
  });

  it('erkennt Silber UND die 25 %-Marke gemeinsam, wenn beide auf denselben Anteil fallen', () => {
    // 20.000 € → 30.000 € von 100.000 € Ziel: 20 % → 30 % — überschreitet Silber (25 %) und die 25-%-Marke zugleich.
    expect(erreichteMeilensteine(20000, 30000, 100000)).toEqual([
      'Silber erreicht',
      'Viertel geschafft: 25 % des Ziels',
    ]);
  });

  it('erkennt Gold UND „Halbzeit" (50 %) gemeinsam', () => {
    expect(erreichteMeilensteine(40000, 60000, 100000)).toEqual([
      'Gold erreicht',
      'Halbzeit: 50 % des Ziels',
    ]);
  });

  it('erkennt Platin UND die 75 %-Marke gemeinsam', () => {
    expect(erreichteMeilensteine(70000, 80000, 100000)).toEqual([
      'Platin erreicht',
      'Dreiviertel geschafft: 75 % des Ziels',
    ]);
  });

  it('dedupliziert Diamant + 100 % zu einem einzigen „Ziel erreicht!"-Label', () => {
    // 90.000 € → 100.000 € von 100.000 € Ziel: 90 % → 100 % — Platin liegt schon dahinter,
    // Diamant und die 100-%-Marke fallen zusammen und dürfen nur EIN Label ergeben.
    expect(erreichteMeilensteine(90000, 100000, 100000)).toEqual(['Ziel erreicht!']);
  });

  it('liefert bei einer Spende von 0 % auf 100 % alle Zwischenschritte in aufsteigender Reihenfolge, ohne doppeltes Ziel-Label', () => {
    expect(erreichteMeilensteine(0, 100000, 100000)).toEqual([
      'Bronze erreicht',
      'Silber erreicht',
      'Viertel geschafft: 25 % des Ziels',
      'Gold erreicht',
      'Halbzeit: 50 % des Ziels',
      'Platin erreicht',
      'Dreiviertel geschafft: 75 % des Ziels',
      'Ziel erreicht!',
    ]);
  });
});
