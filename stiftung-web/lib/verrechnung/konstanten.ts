// Buchungs-Konstanten der Spec docs/verrechnungsmodell.md.
// Sätze als exakte Brüche — niemals als Fließkommazahl auf Geld anwenden.
import type { Satz } from './geld';

/** 1 % — Direktspende (Kaskade Schritt 3) und Umverteilungsquote (Schritt 6). Einziger Satz, der zugleich Buchungsregel ist. */
export const AUSSCHUETTUNGS_SATZ: Satz = { zaehler: 1n, nenner: 100n };
/** Sweep-Ziel: 1,0 % des Poolwerts (Spec §3.2). */
export const SWEEP_ZIEL: Satz = { zaehler: 1n, nenner: 100n };
/** Sweep-Schwelle: 1,2 % des Poolwerts (Spec §3.2). */
export const SWEEP_SCHWELLE: Satz = { zaehler: 12n, nenner: 1000n };
/** Erstbefüllungs-Grenze: 0,5 % des Soli-Fonds (Spec §3.0). */
export const ERSTBEFUELLUNG_SOLI_SATZ: Satz = { zaehler: 5n, nenner: 1000n };
/** Basisbetrag der Erstbefüllung: 25 € (Spec §3.0, Vorschlag — dort als offen markiert). */
export const ERSTBEFUELLUNG_BASIS_CENT = 2500n;
/**
 * Anteils-Feinheit 10⁻⁸ pro Anteil (Spec §2, Vorschlag übernommen) bei
 * Bootstrap-Kurs „1 Anteil == 1 €": 1 Cent == 10⁶ Anteilseinheiten.
 */
export const ANTEILS_EINHEITEN_PRO_CENT = 1_000_000n;
/** Festkomma-Skala für die Rangposition p ∈ [0, 1] (Spec §5): p als Integer in [0, P_SCALE]. */
export const P_SCALE = 1_000_000_000n;
/**
 * 7 % Brutto-Rendite — NUR Marktsimulation/Projektion (kanonische
 * Projektionsannahme), niemals Kaskaden-Buchungsregel. Als Satz, damit die
 * Markt-Simulation bruchgenau rechnet; die number-Ableitung ist für Copy.
 */
export const MARKT_BRUTTO_RENDITE_SATZ: Satz = { zaehler: 7n, nenner: 100n };
export const MARKT_BRUTTO_RENDITE =
  Number(MARKT_BRUTTO_RENDITE_SATZ.zaehler) / Number(MARKT_BRUTTO_RENDITE_SATZ.nenner);
