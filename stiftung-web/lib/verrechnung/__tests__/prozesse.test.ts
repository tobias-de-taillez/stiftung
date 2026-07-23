import { describe, it, expect } from 'vitest';
import { sweepBetrag } from '../sweep';
import { erstbefuellungCent } from '../erstbefuellung';
import { auszahlungspfad } from '../traeger';

describe('sweepBetrag (Spec §3.2)', () => {
  it('Spec-§9-Beispiel: 40 € Cash bei 415 € Pool → Kauf über 35,85 €', () => {
    // Poolwert = 375 € ETF + 40 € investierbar = 415 €; Schwelle 4,98 €; Ziel 4,15 €
    expect(
      sweepBetrag({ verrechnungskontoCent: 4_000n, offeneDirektausschuettungenCent: 0n, etfMarktwertCent: 37_500n })
    ).toBe(3_585n);
  });
  it('unter der Schwelle passiert nichts', () => {
    // investierbar 4,90 € bei Poolwert 414,90 € → Schwelle 4,9788 € nicht überschritten
    expect(
      sweepBetrag({ verrechnungskontoCent: 490n, offeneDirektausschuettungenCent: 0n, etfMarktwertCent: 41_000n })
    ).toBe(0n);
  });
  it('zieht offene Direktausschüttungen vom investierbaren Cash ab (Spec §3.1 — sonst wird fremdes Geld investiert)', () => {
    // Physisch 40 € auf dem Konto, davon 36 € durchlaufende Posten → investierbar 4 €
    // Poolwert = 375 + 4 = 379 €; Schwelle 4,548 € → kein Sweep
    expect(
      sweepBetrag({ verrechnungskontoCent: 4_000n, offeneDirektausschuettungenCent: 3_600n, etfMarktwertCent: 37_500n })
    ).toBe(0n);
  });
});

describe('erstbefuellungCent (Spec §3.0): min(Basis, Spende, 0,5 % Soli)', () => {
  it('Normalfall: Basisbetrag deckelt', () => {
    // Spende 100 €, Soli 10.000 € (0,5 % = 50 €) → 25 € Basis greift
    expect(erstbefuellungCent(10_000n, 1_000_000n)).toBe(2_500n);
  });
  it('Kleinspende: Verdopplung ohne Netto-Abfluss (wer 5 € spendet, bekommt 5 € dazu)', () => {
    expect(erstbefuellungCent(500n, 1_000_000n)).toBe(500n);
  });
  it('kleiner Soli-Fonds: 0,5 %-Grenze schützt (1.000 € Fonds → 5 €)', () => {
    expect(erstbefuellungCent(10_000n, 100_000n)).toBe(500n);
  });
  it('leerer Soli-Fonds → 0', () => {
    expect(erstbefuellungCent(10_000n, 0n)).toBe(0n);
  });
});

describe('auszahlungspfad (Spec §3.5)', () => {
  it('steuerbegünstigte Körperschaft → Pfad 1 Mittelweitergabe', () => {
    expect(auszahlungspfad({ rechtsform: 'ggmbh', gemeinnuetzig: true })).toBe('mittelweitergabe');
  });
  it('Kommune (jPöR) → Pfad 1, auch ohne Gemeinnützigkeitsstatus', () => {
    expect(auszahlungspfad({ rechtsform: 'kommune', gemeinnuetzig: false })).toBe('mittelweitergabe');
  });
  it('natürliche Person (Kindertagespflege) → Pfad 2 Förderguthaben', () => {
    expect(auszahlungspfad({ rechtsform: 'einzelunternehmen', gemeinnuetzig: false })).toBe('foerderguthaben');
  });
  it('gewerblicher Träger → Pfad 2, selbst wenn gemeinnuetzig fälschlich gesetzt ist', () => {
    // Eine natürliche Person / ein Gewerbebetrieb kann den Status strukturell
    // nicht halten (§ 51 Abs. 1 S. 2 AO) — die Weiche traut dem Flag nicht.
    expect(auszahlungspfad({ rechtsform: 'gewerblich', gemeinnuetzig: true })).toBe('foerderguthaben');
    expect(auszahlungspfad({ rechtsform: 'einzelunternehmen', gemeinnuetzig: true })).toBe('foerderguthaben');
  });
  it('Körperschaft ohne Gemeinnützigkeitsstatus → Pfad 2 (der Status entscheidet, nicht die Rechtsform)', () => {
    expect(auszahlungspfad({ rechtsform: 'verein', gemeinnuetzig: false })).toBe('foerderguthaben');
    expect(auszahlungspfad({ rechtsform: 'ggmbh', gemeinnuetzig: false })).toBe('foerderguthaben');
  });
  it('unbekannter Träger → Pfad 2', () => {
    expect(auszahlungspfad({ rechtsform: 'unbekannt', gemeinnuetzig: false })).toBe('foerderguthaben');
  });
});
