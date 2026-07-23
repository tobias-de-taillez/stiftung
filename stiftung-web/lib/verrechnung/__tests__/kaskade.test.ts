import { describe, it, expect } from 'vitest';
import { berechneKaskade, type KaskadeInput } from '../kaskade';
import { ANTEILS_EINHEITEN_PRO_CENT } from '../konstanten';

/** Anteile zum Bootstrap-Kurs: `cent` € -Cent als Anteile. */
const A = (cent: bigint) => cent * ANTEILS_EINHEITEN_PRO_CENT;

function summe(eintraege: { cent: bigint }[]): bigint {
  return eintraege.reduce((s, e) => s + e.cent, 0n);
}

function geldErhaltung(input: KaskadeInput, e: ReturnType<typeof berechneKaskade>) {
  const vorher =
    input.etfMarktwertCent + input.verrechnungskontoCent + input.soliFondsCent + input.managementKontoCent;
  const nachher =
    e.endEtfMarktwertCent + e.endVerrechnungskontoCent + e.endSoliFondsCent + e.endManagementKontoCent;
  expect(nachher + summe(e.direktspenden)).toBe(vorher);
}

// ============================================================
// GOLDENER TEST — durchgerechnetes Spec-Beispiel (§9), in Cent.
// Ausgangslage NACH Spendeneingang + Sweep:
//   Töpfe A 140 € (5 Kinder), B 150 € (4), C 125 € (5)
//   ETF 410,85 € · Verrechnungskonto 4,15 € · Soli 300 €
//   Management 1.000 €, Cap 1.200 €
// Die Spec rechnet in Zehntel-Cent weiter (Abgabe 1,836 €); die Integer-
// Cent-Welt bucht kaufmännisch gerundet (Abgabe 34 + 150 = 184 Cent) und
// landet auf EXAKT den Endständen der Spec: A 139,55 · B 147,00 · C 125,45 ·
// Soli 295,83 · Management 1.003,02 · Verrechnungskonto 0.
// ============================================================
describe('berechneKaskade — goldenes Spec-§9-Beispiel', () => {
  const input: KaskadeInput = {
    einrichtungen: [
      { id: 'A', anteile: A(14_000n), kinder: 5, verifiziert: true },
      { id: 'B', anteile: A(15_000n), kinder: 4, verifiziert: true },
      { id: 'C', anteile: A(12_500n), kinder: 5, verifiziert: true },
    ],
    etfMarktwertCent: 41_085n,
    verrechnungskontoCent: 415n,
    offeneDirektausschuettungenCent: 0n,
    soliFondsCent: 30_000n,
    managementKontoCent: 100_000n,
    managementCapCent: 120_000n,
  };

  it('reproduziert alle Endstände der Spec exakt', () => {
    const e = berechneKaskade(input);

    expect(e.snapshot.poolwertCent).toBe(41_500n);
    expect(e.auffuellenCent).toBe(0n); // Konto steht bereits auf dem Bedarf (4,15 €)

    expect(e.direktspenden).toEqual([
      { id: 'A', cent: 140n },
      { id: 'B', cent: 150n },
      { id: 'C', cent: 125n },
    ]);

    // Abgabe: C 0 · A 0,24 % × 140 € = 33,6 → 34 Cent · B 1 % × 150 € = 150 Cent
    expect(e.abgaben.find((a) => a.id === 'A')!.cent).toBe(34n);
    expect(e.abgaben.find((a) => a.id === 'B')!.cent).toBe(150n);
    expect(e.abgaben.find((a) => a.id === 'C')).toBeUndefined();

    expect(e.managementBewegungCent).toBe(302n); // 1 % × 301,84 € kaufmännisch
    expect(e.endManagementKontoCent).toBe(100_302n);

    // Reihenfolge == Input-Reihenfolge der Einrichtungen (pure Funktion hat
    // keine Anzeige-Meinung); B fehlt, weil Empfänger mit 0 nicht gelistet werden.
    expect(e.umverteilung).toEqual([
      { id: 'A', cent: 129n },
      { id: 'C', cent: 170n },
    ]);

    expect(e.endTopfCent.get('A')).toBe(13_955n);
    expect(e.endTopfCent.get('B')).toBe(14_700n);
    expect(e.endTopfCent.get('C')).toBe(12_545n);
    expect(e.endSoliFondsCent).toBe(29_583n);
    expect(e.endVerrechnungskontoCent).toBe(0n);
    expect(e.keineVerteilungGrund).toBeNull();

    geldErhaltung(input, e);
  });

  it('das Verrechnungskonto startet leer ins neue Jahr; ETF trägt den Rest-Poolwert', () => {
    const e = berechneKaskade(input);
    const poolwertEnde = [...e.endTopfCent.values()].reduce((a, b) => a + b, 0n);
    expect(e.endEtfMarktwertCent).toBe(poolwertEnde); // investierbares Cash == 0
  });
});

describe('berechneKaskade — nicht abgeholte Töpfe (Spec §3.4)', () => {
  // 'u' ist unverifiziert: keine Direktspende (Bedarf gekürzt!), zahlt
  // Abgabe, empfängt keine Umverteilung.
  const input: KaskadeInput = {
    einrichtungen: [
      { id: 'arm', anteile: A(10_000n), kinder: 10, verifiziert: true },   // 10 €/Kind
      { id: 'reich', anteile: A(40_000n), kinder: 10, verifiziert: true }, // 40 €/Kind
      { id: 'u', anteile: A(50_000n), kinder: 10, verifiziert: false },    // 50 €/Kind — reichste, unverifiziert
    ],
    etfMarktwertCent: 100_000n,
    verrechnungskontoCent: 0n,
    offeneDirektausschuettungenCent: 0n,
    soliFondsCent: 50_000n,
    managementKontoCent: 0n,
    managementCapCent: 100_000n,
  };

  it('kürzt den Schritt-2-Bedarf um unverifizierte, zieht Abgabe aber ein und verteilt nicht an sie', () => {
    const e = berechneKaskade(input);

    // Direktspenden nur für verifizierte: 1 % × 100 € + 1 % × 400 € = 5 €
    expect(e.direktspenden).toEqual([
      { id: 'arm', cent: 100n },
      { id: 'reich', cent: 400n },
    ]);
    expect(e.auffuellenCent).toBe(500n); // ETF-Verkauf exakt in Bedarfshöhe

    // Abgabe: Skala aus verifizierten (10–40 €/Kind, P5 = 11,5, P95 = 38,5).
    // 'u' liegt drüber → p = 1 → zahlt volle 1 % × 500 € = 500 Cent.
    expect(e.abgaben.find((a) => a.id === 'u')!.cent).toBe(500n);

    // Umverteilung: 'u' ist kein Empfänger.
    expect(e.umverteilung.find((u) => u.id === 'u')).toBeUndefined();

    geldErhaltung(input, e);
  });
});

describe('berechneKaskade — Randfälle (Spec §6)', () => {
  it('n = 1: keine Abgabe, keine Umverteilung — Management läuft trotzdem', () => {
    const input: KaskadeInput = {
      einrichtungen: [{ id: 'solo', anteile: A(10_000n), kinder: 5, verifiziert: true }],
      etfMarktwertCent: 10_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 100_000n,
      managementKontoCent: 0n,
      managementCapCent: 50_000n,
    };
    const e = berechneKaskade(input);
    expect(e.keineVerteilungGrund).toBe('zuWenigEinrichtungen');
    expect(e.abgaben).toEqual([]);
    expect(e.umverteilung).toEqual([]);
    // Direktspende läuft (hängt nicht am Ranking): 1 % × 100 € = 1 €
    expect(e.direktspenden).toEqual([{ id: 'solo', cent: 100n }]);
    // Management läuft: 1 % × 1.000 € = 10 €
    expect(e.managementBewegungCent).toBe(1_000n);
    // Das 1 % Umverteilung verlässt den Soli-Fonds nicht.
    expect(e.endSoliFondsCent).toBe(99_000n);
    geldErhaltung(input, e);
  });

  it('alle v gleich: Erfolgsfall gleichverteilt, S bleibt liegen', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'a', anteile: A(10_000n), kinder: 5, verifiziert: true },
        { id: 'b', anteile: A(20_000n), kinder: 10, verifiziert: true },
      ],
      etfMarktwertCent: 30_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 10_000n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    expect(e.keineVerteilungGrund).toBe('alleGleich');
    expect(e.abgaben).toEqual([]);
    expect(e.umverteilung).toEqual([]);
    geldErhaltung(input, e);
  });

  it('Cap-Senkung: negativer Management-Abgleich fließt vor Schritt 6 in den Soli zurück', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'arm', anteile: A(10_000n), kinder: 10, verifiziert: true },
        { id: 'reich', anteile: A(40_000n), kinder: 10, verifiziert: true },
      ],
      etfMarktwertCent: 50_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 300n, // 1 % Soli = 3 Cent
      managementKontoCent: 25_000n,
      managementCapCent: 15_000n, // Cap unter Kontostand gesenkt
    };
    const e = berechneKaskade(input);
    // Ziel = min(15.000, 25.000 + 3) = 15.000 → Bewegung −10.000 (Spec §4 Schritt 5, Beispielzeile 3)
    expect(e.managementBewegungCent).toBe(-10_000n);
    expect(e.endManagementKontoCent).toBe(15_000n);
    // Rückfluss steht VOR Schritt 6 und geht sofort in die Umverteilung ein:
    // Abgabe: reich p=1 → 1 % × 400 € = 400 Cent → Soli 300 + 400 + 10.000 = 10.700.
    // S = 1 % × 10.700 = 107 Cent, alles an 'arm' (p=0, reich Gewicht 0).
    expect(e.umverteilung).toEqual([{ id: 'arm', cent: 107n }]);
    expect(e.endSoliFondsCent).toBe(10_593n);
    geldErhaltung(input, e);
  });

  it('Snapshot-Alignment: krumme Anteile summieren exakt auf den Poolwert', () => {
    // Drei gleiche Anteile auf 100 Cent: je 33 gerundet, Restcent an die
    // niedrigste ID (Anteils-Gleichstand) — ab dem Snapshot gilt Σ Topf == Poolwert.
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'a', anteile: 1n, kinder: 1, verifiziert: true },
        { id: 'b', anteile: 1n, kinder: 1, verifiziert: true },
        { id: 'c', anteile: 1n, kinder: 1, verifiziert: true },
      ],
      etfMarktwertCent: 100n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 0n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    const summe = [...e.snapshot.topfCent.values()].reduce((x, y) => x + y, 0n);
    expect(summe).toBe(100n);
    expect(e.snapshot.topfCent.get('a')).toBe(34n);
    geldErhaltung(input, e);
  });

  it('offene Direktausschüttungen bleiben unangetastet auf dem Verrechnungskonto liegen', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'a', anteile: A(10_000n), kinder: 5, verifiziert: true },
        { id: 'b', anteile: A(30_000n), kinder: 5, verifiziert: true },
      ],
      etfMarktwertCent: 39_000n,
      verrechnungskontoCent: 3_000n, // davon 2.000 durchlaufende Posten
      offeneDirektausschuettungenCent: 2_000n,
      soliFondsCent: 0n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    expect(e.snapshot.poolwertCent).toBe(40_000n); // 39.000 + (3.000 − 2.000)
    expect(e.endVerrechnungskontoCent).toBe(2_000n); // fremdes Geld bleibt liegen
    geldErhaltung(input, e);
  });

  it('Gewichtssumme 0: einzige verifizierte Einrichtung ist die reichste — S bleibt im Soli', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'u1', anteile: A(100_000n), kinder: 10, verifiziert: false },
        { id: 'u2', anteile: A(200_000n), kinder: 10, verifiziert: false },
        { id: 'v', anteile: A(400_000n), kinder: 10, verifiziert: true },
      ],
      etfMarktwertCent: 700_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 100_000n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    // v ist als einzige Empfängerin auf p = 1 geklemmt → Gewichtssumme 0:
    // die Umverteilung entfällt, das 1 % verlässt den Soli-Fonds nicht.
    expect(e.umverteilung).toEqual([]);
    expect(e.endSoliFondsCent).toBe(104_667n); // 100.000 + Abgaben u2 667 + v 4.000
    geldErhaltung(input, e);
  });

  it('Gleichheit nur am Snapshot: Direktspende bricht sie, Umverteilung läuft — Grund wird NICHT gemeldet', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'u1', anteile: A(100_000n), kinder: 10, verifiziert: false },
        { id: 'u2', anteile: A(100_000n), kinder: 10, verifiziert: false },
        { id: 'v', anteile: A(100_000n), kinder: 10, verifiziert: true },
      ],
      etfMarktwertCent: 300_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 100_000n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    // Snapshot: alle 100 €/Kind gleich → keine Abgabe. Die Direktspende der
    // verifizierten Einrichtung bricht die Gleichheit, Schritt 6 verteilt real.
    expect(e.abgaben).toEqual([]);
    expect(e.umverteilung).toEqual([{ id: 'v', cent: 1_000n }]);
    expect(e.keineVerteilungGrund).toBeNull();
    geldErhaltung(input, e);
  });
});

describe('berechneKaskade — Geld-Erhaltung unter zufälligen Lagen (seeded)', () => {
  // Handgerollter LCG statt fast-check: keine neue Dependency, deterministisch.
  function lcg(seed: number) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 2 ** 32);
  }

  it('hält die Erhaltungs-Invariante über 200 zufällige Konstellationen', () => {
    const rand = lcg(42);
    for (let lauf = 0; lauf < 200; lauf++) {
      const n = 1 + Math.floor(rand() * 8);
      const einrichtungen = Array.from({ length: n }, (_, i) => ({
        id: `e${String(i).padStart(2, '0')}`,
        anteile: A(BigInt(Math.floor(rand() * 5_000_000))),
        kinder: 1 + Math.floor(rand() * 800),
        verifiziert: rand() < 0.7,
      }));
      const anteileSumme = einrichtungen.reduce((s, e) => s + e.anteile, 0n);
      const poolwert = anteileSumme / ANTEILS_EINHEITEN_PRO_CENT; // Kurs ~1
      const offene = BigInt(Math.floor(rand() * 10_000));
      const vk = offene + BigInt(Math.floor(rand() * Number(poolwert / 10n + 1n)));
      const input: KaskadeInput = {
        einrichtungen,
        etfMarktwertCent: poolwert - (vk - offene),
        verrechnungskontoCent: vk,
        offeneDirektausschuettungenCent: offene,
        soliFondsCent: BigInt(Math.floor(rand() * 10_000_000)),
        managementKontoCent: BigInt(Math.floor(rand() * 200_000)),
        managementCapCent: BigInt(Math.floor(rand() * 300_000)),
      };
      const e = berechneKaskade(input);
      geldErhaltung(input, e);
      // Invariante Spec §2 nach der Kaskade: Σ Topf == End-Poolwert
      const topfSumme = [...e.endTopfCent.values()].reduce((a, b) => a + b, 0n);
      expect(e.endEtfMarktwertCent + e.endVerrechnungskontoCent - input.offeneDirektausschuettungenCent).toBe(topfSumme);
    }
  });
});
