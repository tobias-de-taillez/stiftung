// Erstbefüllung neuer Einrichtungen (Spec §3.0):
//   Erstbefüllung = min(Basisbetrag, Spendenbetrag, 0,5 % × Soli-Fonds)
// Verbindlich ist der Stand ZUM ZEITPUNKT DER BUCHUNG, nicht der angezeigte.
import { anteilVon, type Cent } from './geld';
import { ERSTBEFUELLUNG_BASIS_CENT, ERSTBEFUELLUNG_SOLI_SATZ } from './konstanten';

export function erstbefuellungCent(spendeCent: Cent, soliFondsCent: Cent): Cent {
  if (soliFondsCent <= 0n || spendeCent <= 0n) return 0n;
  const soliGrenze = anteilVon(soliFondsCent, ERSTBEFUELLUNG_SOLI_SATZ);
  const kandidaten = [ERSTBEFUELLUNG_BASIS_CENT, spendeCent, soliGrenze];
  return kandidaten.reduce((a, b) => (a < b ? a : b));
}
