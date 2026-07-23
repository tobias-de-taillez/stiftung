// Rangposition p (Spec §5): wertbasierte Position zwischen P5 und P95 der
// Pro-Kind-Volumina. Das clamp IST die Winsorisierung. Skala nur aus
// KYC-verifizierten Einrichtungen; unverifizierte werden an ihr gemessen.
import { divRound, type Cent } from './geld';
import { P_SCALE } from './konstanten';

export interface RangKandidat {
  id: string;
  topfCent: Cent;
  kinder: number;
  verifiziert: boolean;
}

export type KeineVerteilungGrund = 'zuWenigEinrichtungen' | 'alleGleich';

export interface RangErgebnis {
  /** id → p als Integer in [0, P_SCALE]; null, wenn keine Verteilung stattfindet. */
  p: Map<string, bigint> | null;
  grund: KeineVerteilungGrund | null;
  /** Verifizierte Einrichtung mit dem niedrigsten v (Tie: niedrigere ID) — Restcent-Empfängerin. */
  aermsteVerifizierteId: string | null;
}

/** Pro-Kind-Volumen in Tausendstel-Cent — fein genug, deterministisch, BigInt. */
export function vProKindTausendstelCent(topfCent: Cent, kinder: number): bigint {
  if (kinder <= 0) {
    throw new RangeError(`vProKindTausendstelCent: kinder muss > 0 sein, war ${kinder}`);
  }
  return divRound(topfCent * 1000n, BigInt(kinder));
}

/**
 * Perzentil mit linearer Interpolation (Spec §5): Position q × (n−1) auf der
 * aufsteigend sortierten Liste, Bruchteil linear interpoliert, exakt in BigInt.
 */
export function perzentil(
  sortiertAufsteigend: readonly bigint[],
  qZaehler: bigint,
  qNenner: bigint
): bigint {
  const n = sortiertAufsteigend.length;
  if (n === 0) throw new RangeError('perzentil: leere Liste');
  const posZaehler = qZaehler * BigInt(n - 1);
  const k = Number(posZaehler / qNenner);
  const rest = posZaehler % qNenner;
  const unten = sortiertAufsteigend[k];
  if (rest === 0n) return unten;
  const oben = sortiertAufsteigend[k + 1];
  return unten + divRound(rest * (oben - unten), qNenner);
}

function clampP(wert: bigint): bigint {
  if (wert < 0n) return 0n;
  if (wert > P_SCALE) return P_SCALE;
  return wert;
}

export function berechneRang(kandidaten: readonly RangKandidat[]): RangErgebnis {
  if (kandidaten.length < 2) {
    return { p: null, grund: 'zuWenigEinrichtungen', aermsteVerifizierteId: null };
  }

  const v = new Map(kandidaten.map((k) => [k.id, vProKindTausendstelCent(k.topfCent, k.kinder)]));

  // Skala nur aus verifizierten; Fallback auf alle bei < 2 verifizierten (Spec §5).
  const verifizierte = kandidaten.filter((k) => k.verifiziert);
  const skalenBasis = verifizierte.length >= 2 ? verifizierte : kandidaten;
  const sortiert = skalenBasis.map((k) => v.get(k.id)!).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  let vLo = perzentil(sortiert, 5n, 100n);
  let vHi = perzentil(sortiert, 95n, 100n);
  if (vHi === vLo) {
    // Winsorisierung kollabiert → Fallback ungewinsorisiert (Spec §5).
    vLo = sortiert[0];
    vHi = sortiert[sortiert.length - 1];
  }
  if (vHi === vLo) {
    // Wirklich alle gleich: Erfolgsfall Verteilungsgleichheit, kein Fehlerfall (Spec §6).
    return { p: null, grund: 'alleGleich', aermsteVerifizierteId: null };
  }

  const spanne = vHi - vLo;
  const p = new Map<string, bigint>();
  for (const k of kandidaten) {
    p.set(k.id, clampP(divRound((v.get(k.id)! - vLo) * P_SCALE, spanne)));
  }

  let aermste: RangKandidat | null = null;
  for (const k of verifizierte) {
    if (
      aermste === null ||
      v.get(k.id)! < v.get(aermste.id)! ||
      (v.get(k.id)! === v.get(aermste.id)! && k.id < aermste.id)
    ) {
      aermste = k;
    }
  }

  return { p, grund: null, aermsteVerifizierteId: aermste?.id ?? null };
}
