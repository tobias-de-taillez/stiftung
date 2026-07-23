// Sweep ins Depot (Spec §3.2): Cash wird erst ab 1,2 % des Poolwerts
// investiert, und dann auf das 1-%-Ziel abgeschöpft (nicht um feste 0,2 %).
import { anteilVon, type Cent } from './geld';
import { SWEEP_SCHWELLE, SWEEP_ZIEL } from './konstanten';

export interface SweepZustand {
  verrechnungskontoCent: Cent;
  offeneDirektausschuettungenCent: Cent;
  etfMarktwertCent: Cent;
}

/** Zu investierender Betrag; 0n, wenn die Schwelle nicht überschritten ist. */
export function sweepBetrag(z: SweepZustand): Cent {
  // Offene Direktausschüttungen gehören bereits den Einrichtungen (§3.1) —
  // sie sind weder investierbar noch Teil des Poolwerts.
  const investierbar = z.verrechnungskontoCent - z.offeneDirektausschuettungenCent;
  const poolwert = z.etfMarktwertCent + investierbar;
  if (poolwert <= 0n) return 0n;
  if (investierbar <= anteilVon(poolwert, SWEEP_SCHWELLE)) return 0n;
  return investierbar - anteilVon(poolwert, SWEEP_ZIEL);
}
