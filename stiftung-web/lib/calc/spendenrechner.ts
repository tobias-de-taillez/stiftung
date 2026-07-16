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
function futureValueWithAnnualDonation(startCapital: number, donation: number, rate: number, years: number): number {
  const growthFactor = Math.pow(1 + rate, years);
  const capitalPart = startCapital * growthFactor;
  const donationPart = donation > 0 ? donation * ((growthFactor - 1) / rate) : 0;
  return capitalPart + donationPart;
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
