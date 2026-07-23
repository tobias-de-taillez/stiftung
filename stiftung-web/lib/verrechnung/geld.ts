// Geld ist bigint in Cent. Kein Fließkomma (Spec §2 „Datentypen").

export type Cent = bigint;

/** Exakter Bruch für Prozentsätze — verhindert Fließkomma auf Geldwerten. */
export interface Satz {
  zaehler: bigint;
  nenner: bigint;
}

/**
 * Kaufmännische Rundung (half away from zero) von zaehler/nenner.
 * Deutsche kaufmännische Rundung == round half up für positive Werte,
 * symmetrisch für negative (Spec §2 „Rundung").
 */
export function divRound(zaehler: bigint, nenner: bigint): bigint {
  if (nenner <= 0n) {
    throw new RangeError(`divRound: nenner muss > 0 sein, war ${nenner}`);
  }
  const doppelt = 2n * zaehler;
  if (zaehler >= 0n) {
    return (doppelt + nenner) / (2n * nenner);
  }
  return -((-doppelt + nenner) / (2n * nenner));
}

/** satz × basis, kaufmännisch auf Cent gerundet. */
export function anteilVon(basis: Cent, satz: Satz): Cent {
  return divRound(basis * satz.zaehler, satz.nenner);
}

/**
 * Proportionale Verteilung von `summe` nach `gewichte` (Spec §2 „Rundung"):
 * jeden Einzelbetrag kaufmännisch runden, die verbleibende Differenz zur
 * Zielsumme bekommt `restIndex` (Aufrufer: Einrichtung mit dem niedrigsten
 * Pro-Kind-Volumen, bei Gleichstand niedrigere Einrichtungs-ID).
 * Summe des Ergebnisses == summe, exakt.
 */
export function verteileProportional(
  summe: Cent,
  gewichte: readonly bigint[],
  restIndex: number
): Cent[] {
  if (gewichte.length === 0) return [];
  const gewichtSumme = gewichte.reduce((a, b) => a + b, 0n);
  const anteile = gewichte.map((w) =>
    gewichtSumme === 0n ? 0n : divRound(summe * w, gewichtSumme)
  );
  const verteilt = anteile.reduce((a, b) => a + b, 0n);
  anteile[restIndex] += summe - verteilt;
  return anteile;
}
