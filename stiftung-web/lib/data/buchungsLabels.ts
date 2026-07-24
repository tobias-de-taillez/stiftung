import type { Buchungstyp } from '@/lib/server/buchungstypen';

// Geteiltes Klartext-Label je Buchungstyp (Task 7): vorher eine lokale Kopie
// in app/einrichtungen/[slug]/page.tsx (nur 8 Typen, die dort vorkommen
// können). Das Admin-Journal braucht alle Typen aus BUCHUNGSTYPEN — deshalb
// hierher gezogen und für beide Verbraucher vollständig gemacht. Die acht
// bereits bestehenden Werte bleiben byte-identisch (siehe
// app/einrichtungen/[slug]/__tests__/page.test.tsx, "labelt jeden
// Buchungstyp mit dem korrekten Klartext").
export const BUCHUNGS_LABELS: Record<Buchungstyp, string> = {
  spende: 'Spende',
  soli_spende: 'Spende an den Solidaritätsfonds',
  erstbefuellung: 'Erstbefüllung aus dem Solidaritätsfonds',
  direktausschuettung_eingang: 'Direktspende (wird ausgezahlt)',
  auszahlungslauf: 'Auszahlung',
  sweep: 'Anlage ins Einrichtungs-Depot (ETF)',
  soli_sweep: 'Anlage ins Soli-Depot (ETF)',
  kurs_einrichtungsdepot: 'Kursbewegung Einrichtungs-Depot',
  kurs_soli: 'Kursbewegung Soli-Depot',
  schliessung: 'Schließung',
  soli_konsolidierung: 'Konsolidierung ins Soli-Depot',
  kaskade_auffuellen: 'Kaskade: Verrechnungskonto auffüllen',
  kaskade_direktspende: 'Direktförderung ausgezahlt',
  kaskade_abgabe: 'Solidaritätsabgabe',
  kaskade_management: 'Kaskade: Management-Bewegung',
  kaskade_umverteilung: 'aus dem Solidaritätsfonds',
};

// `typ` kommt aus der DB als plain string (Prisma-Feld ohne Enum) — das
// Lookup-Objekt ist aber über die Buchungstyp-Union getippt (erzwingt
// Vollständigkeit beim Schreiben oben). buchungsLabel() bündelt den nötigen
// Cast + Fallback für beide Verbraucher (Detailseite, Journal), statt ihn an
// jeder Aufrufstelle zu wiederholen.
export function buchungsLabel(typ: string): string {
  return BUCHUNGS_LABELS[typ as Buchungstyp] ?? typ;
}
