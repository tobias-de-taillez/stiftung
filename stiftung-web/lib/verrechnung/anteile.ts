// Töpfe sind Pool-Anteile, keine Euro-Beträge (Spec §2):
//   Topf_€ = Anteil × Poolwert / Gesamtanteile
// Kursbewegung == null Schreibvorgänge; der Euro-Wert entsteht beim Lesen.
import { divRound, type Cent } from './geld';
import { ANTEILS_EINHEITEN_PRO_CENT } from './konstanten';

/** Euro-Wert eines Topfes in Cent, kaufmännisch gerundet (reine Anzeige-/Rechen-Sicht). */
export function topfwertCent(anteile: bigint, poolwertCent: Cent, anteileGesamt: bigint): Cent {
  if (anteileGesamt === 0n) return 0n;
  return divRound(anteile * poolwertCent, anteileGesamt);
}

/**
 * Anteile, die `betragCent` kauft — bewertet zum Poolwert VOR dem Zufluss.
 * Leerer/wertloser Pool: Bootstrap-Kurs 1 Cent == ANTEILS_EINHEITEN_PRO_CENT.
 */
export function kaufeAnteile(
  betragCent: Cent,
  poolwertCentVorZufluss: Cent,
  anteileGesamtVorher: bigint
): bigint {
  if (anteileGesamtVorher === 0n || poolwertCentVorZufluss <= 0n) {
    return betragCent * ANTEILS_EINHEITEN_PRO_CENT;
  }
  return divRound(betragCent * anteileGesamtVorher, poolwertCentVorZufluss);
}

/** Anteile, die für eine Entnahme von `betragCent` aufgelöst werden (preisneutral). */
export function verkaufsAnteileFuer(
  betragCent: Cent,
  poolwertCent: Cent,
  anteileGesamt: bigint
): bigint {
  if (anteileGesamt === 0n || poolwertCent <= 0n) return 0n;
  return divRound(betragCent * anteileGesamt, poolwertCent);
}

/**
 * Renormierung nach der Jahres-Kaskade: Die Kaskade rechnet Spec-treu in Cent
 * (Snapshot-Basis) und schreibt die End-Töpfe als frische Anteile zum
 * Bootstrap-Kurs zurück. Das hält die Invariante Σ Topf == Poolwert nach der
 * Kaskade EXAKT auf den Cent, statt Rundungsdrift über sequenzielle
 * Einzelverkäufe zu sammeln. Zwischen den Kaskaden gilt die reine Anteilswelt.
 */
export function renormAnteile(topfCent: Cent): bigint {
  return topfCent * ANTEILS_EINHEITEN_PRO_CENT;
}
