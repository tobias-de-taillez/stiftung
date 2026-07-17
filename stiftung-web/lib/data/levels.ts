// Spender-Badge (Task 30): absolute, erreichbare Spendenschwellen —
// unabhängig von der Kinderzahl der Einrichtung. Vorher war die Schwelle als
// annualDonationPerChild definiert und griff bei Einmalspenden nie (dort war
// annualDonationPerChild immer 0) und lag bei großen Einrichtungen faktisch
// unerreichbar hoch (Bronze bei 60-Kinder-Kita = 3.000 €/Jahr, Slider-Max
// aber 2.000 €). Die Schwellen gelten jetzt direkt auf den gespendeten Betrag.
export interface Level {
  name: string;
  schwelleEuro: number;
  tone: 'positive' | 'forecast' | 'muted';
}

export const LEVELS: Level[] = [
  { name: 'Bronze', schwelleEuro: 25, tone: 'muted' },
  { name: 'Silber', schwelleEuro: 100, tone: 'muted' },
  { name: 'Gold', schwelleEuro: 250, tone: 'forecast' },
  { name: 'Platin', schwelleEuro: 1000, tone: 'forecast' },
  { name: 'Diamant', schwelleEuro: 2500, tone: 'positive' },
];

export function currentLevel(betragEuro: number): Level | null {
  let result: Level | null = null;
  for (const level of LEVELS) {
    if (betragEuro >= level.schwelleEuro) {
      result = level;
    }
  }
  return result;
}

// Nächste erreichbare Stufe oberhalb des aktuellen Betrags — Grundlage für
// den "noch X € bis [nächstes Level]"-Hinweis im Spendenrechner. null, wenn
// bereits Diamant (die höchste Stufe) erreicht ist.
export function nextLevel(betragEuro: number): Level | null {
  for (const level of LEVELS) {
    if (betragEuro < level.schwelleEuro) {
      return level;
    }
  }
  return null;
}

// Einrichtungs-Level (Brainstorming Abs. 4): Bronze→Diamant als
// Zwischenziele des Finanztopfs selbst — definiert als Anteil des
// Zielkapitals, nicht als Spendenbetrag. Dieselben fünf Namen/Töne wie beim
// Spender-Badge, aber eine separate Skala (Anteil statt Euro-Betrag).
export interface EinrichtungsLevelStufe {
  name: string;
  anteil: number;
  tone: 'positive' | 'forecast' | 'muted';
}

export const EINRICHTUNGS_LEVELS: EinrichtungsLevelStufe[] = [
  { name: 'Bronze', anteil: 0.1, tone: 'muted' },
  { name: 'Silber', anteil: 0.25, tone: 'muted' },
  { name: 'Gold', anteil: 0.5, tone: 'forecast' },
  { name: 'Platin', anteil: 0.75, tone: 'forecast' },
  { name: 'Diamant', anteil: 1, tone: 'positive' },
];

export interface EinrichtungsLevelResult {
  current: EinrichtungsLevelStufe | null;
  next: EinrichtungsLevelStufe | null;
  fehlenderBetrag: number;
}

export function einrichtungsLevel(aktuell: number, ziel: number): EinrichtungsLevelResult {
  if (ziel <= 0) {
    return { current: null, next: null, fehlenderBetrag: 0 };
  }
  const anteil = aktuell / ziel;
  let current: EinrichtungsLevelStufe | null = null;
  let next: EinrichtungsLevelStufe | null = null;
  for (const stufe of EINRICHTUNGS_LEVELS) {
    if (anteil >= stufe.anteil) {
      current = stufe;
    } else if (next === null) {
      next = stufe;
    }
  }
  const fehlenderBetrag = next ? Math.max(0, next.anteil * ziel - aktuell) : 0;
  return { current, next, fehlenderBetrag };
}
