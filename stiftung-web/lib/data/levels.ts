export interface Level {
  name: string;
  annualDonationPerChild: number;
  tone: 'positive' | 'forecast' | 'muted';
}

export const LEVELS: Level[] = [
  { name: 'Bronze', annualDonationPerChild: 50, tone: 'muted' },
  { name: 'Silber', annualDonationPerChild: 200, tone: 'muted' },
  { name: 'Gold', annualDonationPerChild: 500, tone: 'forecast' },
  { name: 'Platin', annualDonationPerChild: 1000, tone: 'forecast' },
  { name: 'Diamant', annualDonationPerChild: 2000, tone: 'positive' },
];

export function currentLevel(annualDonationPerChild: number): Level | null {
  let result: Level | null = null;
  for (const level of LEVELS) {
    if (annualDonationPerChild >= level.annualDonationPerChild) {
      result = level;
    }
  }
  return result;
}
