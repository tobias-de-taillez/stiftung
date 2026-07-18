// Finanzmodell aus projekt-status.md: 7% Brutto-Rendite, 1% jährliche
// Ausschüttung, 6% Netto-Wachstumsrate.
export const NET_GROWTH_RATE = 0.06;
export const ANNUAL_PAYOUT_RATE = 0.01;

export function capitalForAnnualPayout(annualPayout: number): number {
  return annualPayout / ANNUAL_PAYOUT_RATE;
}

function yearsToTargetWithoutRecurringDonation(startCapital: number, targetCapital: number, rate: number): number {
  if (startCapital >= targetCapital) return 0;
  if (startCapital <= 0) return Infinity;
  return Math.log(targetCapital / startCapital) / Math.log(1 + rate);
}

// Future Value einer gewöhnlichen Rente: FV = PV*(1+i)^n + PMT*((1+i)^n - 1)/i
// Exportiert (statt eine zweite Renten-FV-Formel für den Zukunftswert
// wiederkehrender Spenden zu duplizieren) — Aufruf mit startCapital=0 liefert
// die reine Renten-Komponente einer Spendenreihe.
export function futureValueWithAnnualDonation(startCapital: number, donation: number, rate: number, years: number): number {
  const growthFactor = Math.pow(1 + rate, years);
  const capitalPart = startCapital * growthFactor;
  const donationPart = donation > 0 ? donation * ((growthFactor - 1) / rate) : 0;
  return capitalPart + donationPart;
}

// Zukunftswert einer einmaligen Spende, verzinst mit der Netto-Wachstumsrate
// über `jahre` Jahre (Zinseszins). Die Brainstorming-Kernvisualisierung
// "50 € wachsen zu 40.000 €" — bewusst unabhängig vom Startkapital der
// Einrichtung: es geht um das Wachstum des eigenen Beitrags, nicht um den
// Finanztopf insgesamt.
export function zukunftswert(betrag: number, jahre: number, rate: number = NET_GROWTH_RATE): number {
  return betrag * Math.pow(1 + rate, jahre);
}

// Dauerhafte jährliche Förderung, die aus der Spende entsteht.
//
// KORREKTUR (siehe Task-Brief): Die Ausschüttung entsteht aus dem
// ANGEWACHSENEN Kapital, nicht aus dem Spendenbetrag selbst — die korrekte
// Formel ist FV(betrag) × ANNUAL_PAYOUT_RATE zum Zielzeitpunkt. Die naive
// Variante `betrag × ANNUAL_PAYOUT_RATE` ist nur der "ab sofort"-Untergrenzfall
// (jahre=0 → zukunftswert(betrag,0) === betrag), nicht die ganze Wahrheit.
// Default jahre=0 hält die im Brief benannte Ein-Parameter-Signatur
// `dauerhafteJahresfoerderung(betrag)` für den Untergrenz-Fall abwärtskompatibel
// nutzbar; mit expliziter Jahresangabe liefert dieselbe Funktion die
// ehrliche, gewachsene Ausschüttung zum Zielzeitpunkt.
export function dauerhafteJahresfoerderung(betrag: number, jahre: number = 0, rate: number = NET_GROWTH_RATE): number {
  return zukunftswert(betrag, jahre, rate) * ANNUAL_PAYOUT_RATE;
}

export function computeYearsToGoal(input: {
  startCapital: number;
  targetCapital: number;
  donation: number;
  frequency: 'einmalig' | 'jaehrlich';
  netRate?: number;
}): number {
  const { startCapital, targetCapital, donation, frequency, netRate = NET_GROWTH_RATE } = input;

  if (startCapital >= targetCapital) return 0;

  if (frequency === 'einmalig') {
    return yearsToTargetWithoutRecurringDonation(startCapital + donation, targetCapital, netRate);
  }

  const MAX_YEARS = 500;
  if (futureValueWithAnnualDonation(startCapital, donation, netRate, MAX_YEARS) < targetCapital) {
    return Infinity;
  }

  let lo = 0;
  let hi = MAX_YEARS;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fv = futureValueWithAnnualDonation(startCapital, donation, netRate, mid);
    if (fv < targetCapital) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

// Verkürzung des Wegs zum Ziel durch die Spende, in Monaten — Delta zwischen
// Jahre-bis-Ziel ohne und mit Spende. Nimmt bewusst {startCapital,
// targetCapital} statt des Prisma-geformten Einrichtungs-Objekts
// ({aktuellesKapital, zielKapital}), konsistent mit computeYearsToGoal, damit
// dieses Modul von den Server-Feldnamen entkoppelt bleibt (Caller mappen).
export function verkuerzungMonate(
  einrichtung: { startCapital: number; targetCapital: number },
  betrag: number,
  frequenz: 'einmalig' | 'jaehrlich',
  netRate: number = NET_GROWTH_RATE
): number {
  const basis = { startCapital: einrichtung.startCapital, targetCapital: einrichtung.targetCapital, frequency: frequenz, netRate };
  const ohneJahre = computeYearsToGoal({ ...basis, donation: 0 });
  const mitJahre = computeYearsToGoal({ ...basis, donation: betrag });

  // Bleibt das Ziel auch mit Spende im Simulationszeitraum unerreichbar
  // (beide Infinity), ist "Verkürzung" nicht sinnvoll definiert (Infinity -
  // Infinity = NaN) — 0 ist hier die ehrliche Antwort: keine ausweisbare
  // Verkürzung.
  if (!isFinite(ohneJahre) && !isFinite(mitJahre)) return 0;

  return Math.max(0, Math.round((ohneJahre - mitJahre) * 12));
}
