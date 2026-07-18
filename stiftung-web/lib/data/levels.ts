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

// Meilenstein-Erkennung (Task 31): welche Einrichtungs-Level (s. o.) UND
// welche Prozent-Marken (25/50/75/100 %) wurden zwischen altKapital und
// neuKapital überschritten? Beide Skalen sind unabhängig gedacht — ein
// Level-Name ("Silber erreicht") und eine Prozent-Marke ("Halbzeit: 50 %
// des Ziels") dürfen nebeneinander stehen, auch wenn sie zufällig auf
// denselben Anteil fallen (Silber/Gold/Platin liegen exakt bei 25/50/75 %).
// Einzige Ausnahme: 100 % und Diamant fallen IMMER zusammen (Diamant ist per
// Definition die 100-%-Stufe) — dafür gibt es genau ein „Ziel erreicht!"-
// Label statt zweier redundanter Meldungen. Deshalb wird Diamant aus der
// Level-Schleife ausgenommen und stattdessen einmalig separat behandelt.
//
// Wiederverwendet von spenden() (einrichtungenService.ts, pro Spende) und
// simuliereJahr() (simulationService.ts, pro Einrichtung über Wachstum +
// Solidaritäts-Verteilung hinweg) — eine einzige Erkennungs-Funktion, kein
// Duplikat der Schwellenlogik.
const PROZENT_LABELS: Record<number, string> = {
  25: 'Viertel geschafft: 25 % des Ziels',
  50: 'Halbzeit: 50 % des Ziels',
  75: 'Dreiviertel geschafft: 75 % des Ziels',
};

export function erreichteMeilensteine(altKapital: number, neuKapital: number, zielKapital: number): string[] {
  if (!(zielKapital > 0) || neuKapital <= altKapital) {
    return [];
  }
  const altAnteil = altKapital / zielKapital;
  const neuAnteil = neuKapital / zielKapital;

  const checkpoints: { schwelle: number; label: string }[] = [
    ...EINRICHTUNGS_LEVELS.filter((stufe) => stufe.anteil < 1).map((stufe) => ({
      schwelle: stufe.anteil,
      label: `${stufe.name} erreicht`,
    })),
    ...Object.entries(PROZENT_LABELS).map(([marke, label]) => ({ schwelle: Number(marke) / 100, label })),
  ].sort((a, b) => a.schwelle - b.schwelle);

  const labels = checkpoints
    .filter((cp) => altAnteil < cp.schwelle && neuAnteil >= cp.schwelle)
    .map((cp) => cp.label);

  if (altAnteil < 1 && neuAnteil >= 1) {
    labels.push('Ziel erreicht!');
  }

  return labels;
}
