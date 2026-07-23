// Jahres-Kaskade (Spec §4): läuft einmal jährlich, Schritte 1–6 in fester
// Reihenfolge, alle Werte vom Bewertungsstichtag. ES WIRD KEINE RENDITE
// BERECHNET — der ETF hat am Stichtag den Wert, den er hat (ertragsblind).
// Reine Funktion: Snapshot rein, vollständiges Buchungsergebnis raus.
import { anteilVon, divRound, verteileProportional, type Cent } from './geld';
import { topfwertCent } from './anteile';
import { berechneRang, type KeineVerteilungGrund, type RangKandidat } from './rang';
import { AUSSCHUETTUNGS_SATZ, P_SCALE } from './konstanten';

export interface KaskadeEinrichtung {
  id: string;
  anteile: bigint;
  kinder: number;
  verifiziert: boolean;
}

export interface KaskadeInput {
  einrichtungen: KaskadeEinrichtung[];
  etfMarktwertCent: Cent;
  verrechnungskontoCent: Cent;
  offeneDirektausschuettungenCent: Cent;
  soliFondsCent: Cent;
  managementKontoCent: Cent;
  managementCapCent: Cent;
}

export interface KaskadeErgebnis {
  snapshot: { poolwertCent: Cent; soliFondsCent: Cent; topfCent: Map<string, Cent> };
  auffuellenCent: Cent;
  direktspenden: { id: string; cent: Cent }[];
  abgaben: { id: string; cent: Cent; pPromille: number }[];
  managementBewegungCent: Cent;
  umverteilung: { id: string; cent: Cent }[];
  keineVerteilungGrund: KeineVerteilungGrund | null;
  endTopfCent: Map<string, Cent>;
  endEtfMarktwertCent: Cent;
  endVerrechnungskontoCent: Cent;
  endSoliFondsCent: Cent;
  endManagementKontoCent: Cent;
}

/**
 * Schritt 1 — Snapshot: Cent-Töpfe aus Anteilen. Die Rundungsdifferenz zur
 * Poolwert-Summe geht an die Einrichtung mit den meisten Anteilen (kleinste
 * relative Verzerrung, Tie: niedrigere ID), damit ab hier exakt gilt:
 * Σ topf == poolwert (Invariante Spec §2).
 */
function snapshotToepfe(
  einrichtungen: KaskadeEinrichtung[],
  poolwertCent: Cent
): Map<string, Cent> {
  const anteileGesamt = einrichtungen.reduce((s, e) => s + e.anteile, 0n);
  const topf = new Map<string, Cent>();
  for (const e of einrichtungen) {
    topf.set(e.id, topfwertCent(e.anteile, poolwertCent, anteileGesamt));
  }
  const differenz = poolwertCent - [...topf.values()].reduce((a, b) => a + b, 0n);
  if (differenz !== 0n && einrichtungen.length > 0) {
    const groesste = [...einrichtungen].sort((a, b) =>
      a.anteile !== b.anteile ? (a.anteile > b.anteile ? -1 : 1) : a.id < b.id ? -1 : 1
    )[0];
    topf.set(groesste.id, topf.get(groesste.id)! + differenz);
  }
  return topf;
}

export function berechneKaskade(input: KaskadeInput): KaskadeErgebnis {
  const { einrichtungen } = input;

  // ── Schritt 1: Snapshot ────────────────────────────────────────────────
  const investierbarVK = input.verrechnungskontoCent - input.offeneDirektausschuettungenCent;
  const poolwertCent = input.etfMarktwertCent + investierbarVK;
  const snapshotTopf = snapshotToepfe(einrichtungen, poolwertCent);
  const topf = new Map(snapshotTopf); // Arbeitskopie, wird durch Schritt 3/4/6 verändert

  // ── Schritt 2: Verrechnungskonto auf den Bedarf abgleichen ─────────────
  // Bedarf = Summe der GERUNDETEN Direktspenden der VERIFIZIERTEN Töpfe
  // (Spec §4 Schritt 3 „Ausnahme": sonst landet das Konto nicht auf 0).
  const verifizierte = einrichtungen.filter((e) => e.verifiziert);
  const direktspenden = verifizierte.map((e) => ({
    id: e.id,
    cent: anteilVon(snapshotTopf.get(e.id)!, AUSSCHUETTUNGS_SATZ),
  }));
  const bedarf = direktspenden.reduce((s, d) => s + d.cent, 0n);
  const auffuellenCent = bedarf - investierbarVK; // > 0: ETF-Verkauf, < 0: Überschuss investieren
  let etf = input.etfMarktwertCent - auffuellenCent;

  // ── Schritt 3: Direktspende auszahlen ──────────────────────────────────
  for (const d of direktspenden) {
    topf.set(d.id, topf.get(d.id)! - d.cent);
  }
  // Verrechnungskonto steht jetzt per Konstruktion auf 0 (plus durchlaufende Posten).

  // ── Schritt 4: Solidaritätsabgabe (Bemessung: SNAPSHOT, nicht Schritt-3-Stand) ──
  const rangSnapshot = berechneRang(
    einrichtungen.map(
      (e): RangKandidat => ({
        id: e.id,
        topfCent: snapshotTopf.get(e.id)!,
        kinder: e.kinder,
        verifiziert: e.verifiziert,
      })
    )
  );
  const abgaben: { id: string; cent: Cent; pPromille: number }[] = [];
  let soli = input.soliFondsCent;
  if (rangSnapshot.p !== null) {
    for (const e of einrichtungen) {
      const p = rangSnapshot.p.get(e.id)!;
      const cent = divRound(p * anteilVon(snapshotTopf.get(e.id)!, AUSSCHUETTUNGS_SATZ), P_SCALE);
      if (cent > 0n) {
        abgaben.push({ id: e.id, cent, pPromille: Number((p * 1000n) / P_SCALE) });
        topf.set(e.id, topf.get(e.id)! - cent);
        etf -= cent;   // Einr.-Depot → Soli-Depot
        soli += cent;
      }
    }
  }

  // ── Schritt 5: Management-Konto abgleichen (läuft IMMER, Spec §6) ──────
  const zufluss = anteilVon(soli, AUSSCHUETTUNGS_SATZ);
  const kontoPlusZufluss = input.managementKontoCent + zufluss;
  const ziel = kontoPlusZufluss < input.managementCapCent ? kontoPlusZufluss : input.managementCapCent;
  const managementBewegungCent = ziel - input.managementKontoCent;
  soli -= managementBewegungCent;

  // ── Schritt 6: Umverteilung (p NEU ermitteln — Töpfe haben sich geändert) ──
  const rangAktuell = berechneRang(
    einrichtungen.map(
      (e): RangKandidat => ({
        id: e.id,
        topfCent: topf.get(e.id)!,
        kinder: e.kinder,
        verifiziert: e.verifiziert,
      })
    )
  );
  const umverteilung: { id: string; cent: Cent }[] = [];
  if (rangAktuell.p !== null) {
    // Nicht abgeholte Töpfe empfangen nicht; sie fallen aus der Gewichtssumme
    // heraus, das Verfahren normalisiert über die verbleibenden Empfänger (§3.4).
    const empfaenger = einrichtungen.filter((e) => e.verifiziert);
    const gewichte = empfaenger.map((e) => P_SCALE - rangAktuell.p!.get(e.id)!);
    const gewichtSumme = gewichte.reduce((a, b) => a + b, 0n);
    if (empfaenger.length > 0 && gewichtSumme > 0n) {
      const s = anteilVon(soli, AUSSCHUETTUNGS_SATZ);
      const restIndex = empfaenger.findIndex((e) => e.id === rangAktuell.aermsteVerifizierteId);
      const anteile = verteileProportional(s, gewichte, restIndex === -1 ? 0 : restIndex);
      for (let i = 0; i < empfaenger.length; i++) {
        if (anteile[i] > 0n) {
          umverteilung.push({ id: empfaenger[i].id, cent: anteile[i] });
          topf.set(empfaenger[i].id, topf.get(empfaenger[i].id)! + anteile[i]);
          etf += anteile[i]; // Soli-Depot → Einr.-Depot
        }
      }
      soli -= anteile.reduce((a, b) => a + b, 0n);
    }
  }

  // Wenn EINER der beiden Rang-Läufe keine Verteilung erlaubte, ist das der Grund.
  const keineVerteilungGrund = rangSnapshot.grund ?? rangAktuell.grund;

  return {
    snapshot: { poolwertCent, soliFondsCent: input.soliFondsCent, topfCent: snapshotTopf },
    auffuellenCent,
    direktspenden,
    abgaben,
    managementBewegungCent,
    umverteilung,
    keineVerteilungGrund,
    endTopfCent: topf,
    endEtfMarktwertCent: etf,
    endVerrechnungskontoCent: input.offeneDirektausschuettungenCent,
    endSoliFondsCent: soli,
    endManagementKontoCent: ziel,
  };
}
