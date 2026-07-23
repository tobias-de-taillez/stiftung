import { describe, it, expect } from 'vitest';
import { topfwertCent, kaufeAnteile, verkaufsAnteileFuer, renormAnteile } from '../anteile';
import { ANTEILS_EINHEITEN_PRO_CENT } from '../konstanten';

describe('kaufeAnteile', () => {
  it('Bootstrap: leerer Pool kauft zum Kurs 1 Cent == 1e6 Einheiten', () => {
    expect(kaufeAnteile(4000n, 0n, 0n)).toBe(4000n * ANTEILS_EINHEITEN_PRO_CENT);
  });
  it('bewertet zum Poolwert VOR dem Zufluss', () => {
    // Pool: 10.000 Cent, 10.000 × 1e6 Anteile (Kurs 1:1e6). Spende 500 Cent
    // → exakt 500 × 1e6 Anteile, unabhängig davon, dass der Pool danach 10.500 hält.
    expect(kaufeAnteile(500n, 10_000n, 10_000n * ANTEILS_EINHEITEN_PRO_CENT)).toBe(
      500n * ANTEILS_EINHEITEN_PRO_CENT
    );
  });
  it('nach Kursanstieg kauft derselbe Betrag weniger Anteile', () => {
    // Pool verdoppelt sich auf 20.000 Cent bei unveränderten Anteilen
    expect(kaufeAnteile(500n, 20_000n, 10_000n * ANTEILS_EINHEITEN_PRO_CENT)).toBe(
      250n * ANTEILS_EINHEITEN_PRO_CENT
    );
  });
});

describe('topfwertCent', () => {
  it('leerer Pool → 0', () => {
    expect(topfwertCent(0n, 0n, 0n)).toBe(0n);
  });
  it('Anteil × Poolwert / Gesamtanteile, kaufmännisch gerundet', () => {
    const gesamt = 3n * ANTEILS_EINHEITEN_PRO_CENT;
    expect(topfwertCent(ANTEILS_EINHEITEN_PRO_CENT, 100n, gesamt)).toBe(33n);
    expect(topfwertCent(2n * ANTEILS_EINHEITEN_PRO_CENT, 100n, gesamt)).toBe(67n);
  });
  it('Kursbewegung ändert den Wert ohne Anteils-Schreibvorgang (Spec §2)', () => {
    const anteile = 500n * ANTEILS_EINHEITEN_PRO_CENT;
    const gesamt = 1000n * ANTEILS_EINHEITEN_PRO_CENT;
    expect(topfwertCent(anteile, 10_000n, gesamt)).toBe(5_000n);
    expect(topfwertCent(anteile, 10_700n, gesamt)).toBe(5_350n); // +7 % Kurs
  });
});

describe('verkaufsAnteileFuer', () => {
  it('löst für einen Cent-Betrag die preisneutrale Anteilsmenge auf', () => {
    const gesamt = 10_000n * ANTEILS_EINHEITEN_PRO_CENT;
    expect(verkaufsAnteileFuer(500n, 10_000n, gesamt)).toBe(500n * ANTEILS_EINHEITEN_PRO_CENT);
  });
  it('Kauf und Verkauf zum selben Kurs sind invers', () => {
    const gesamt = 41_500n * ANTEILS_EINHEITEN_PRO_CENT;
    const gekauft = kaufeAnteile(4_000n, 41_500n, gesamt);
    expect(verkaufsAnteileFuer(4_000n, 41_500n, gesamt)).toBe(gekauft);
  });
});

describe('renormAnteile', () => {
  it('setzt den Kurs auf 1 Cent == 1e6 Einheiten', () => {
    expect(renormAnteile(13_955n)).toBe(13_955n * ANTEILS_EINHEITEN_PRO_CENT);
    expect(renormAnteile(0n)).toBe(0n);
  });
});
