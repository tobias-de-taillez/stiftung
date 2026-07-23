// Einrichtungs-Lebenszyklus: Der Soli-Fonds ist Ein- und Ausgang (Spec §3.0/§3.3) —
// neue Einrichtungen werden aus ihm erstbefüllt, geschlossene fließen in ihn zurück.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, anteileGesamt, poolwertCent } from './kontenService';
import { topfwertCent } from '@/lib/verrechnung/anteile';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { EinrichtungGeschlossenError, EinrichtungNichtGefundenError } from './spendenService';
import type { Rechtsform } from '@/lib/verrechnung/traeger';

export async function schliesseEinrichtung(slug: string): Promise<{ uebertragCent: number }> {
  return prisma.$transaction(async (tx) => {
    const einrichtung = await tx.einrichtung.findUnique({ where: { slug } });
    if (!einrichtung) throw new EinrichtungNichtGefundenError(`Keine Einrichtung mit slug ${slug}`);
    if (einrichtung.geschlossenAm) throw new EinrichtungGeschlossenError(`${slug} ist bereits geschlossen`);

    const pool = await poolwertCent(tx);
    const gesamt = await anteileGesamt(tx);
    const uebertrag = topfwertCent(einrichtung.anteile, pool, gesamt);

    await tx.einrichtung.update({
      where: { id: einrichtung.id },
      data: { anteile: 0n, geschlossenAm: new Date() },
    });
    const k = await ensureKontenstand(tx);
    // Physisch liegt ein Teil des Poolwerts als Cash auf dem Verrechnungskonto
    // (Sweep-Ziel ~1 %). Die Entnahme nimmt zuerst das Depot, der Rest kommt
    // aus dem investierbaren Cash — sonst würde das ETF-Konto negativ, sobald
    // der Topf größer ist als der Depot-Bestand (z. B. letzte Einrichtung).
    // Rest <= investierbares VK gilt strukturell: uebertrag <= Poolwert.
    const ausEtf = uebertrag < k.etfMarktwertCent ? uebertrag : k.etfMarktwertCent;
    const ausVerrechnungskonto = uebertrag - ausEtf;
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        etfMarktwertCent: k.etfMarktwertCent - ausEtf,
        verrechnungskontoCent: k.verrechnungskontoCent - ausVerrechnungskonto,
        soliDepotCent: k.soliDepotCent + uebertrag,
      },
    });
    await buche(tx, { typ: 'schliessung', betragCent: uebertrag, einrichtungId: einrichtung.id });
    return serialisiere({ uebertragCent: uebertrag });
  });
}

export async function setzeVerifikation(
  traegerId: string,
  daten: { verifiziert: boolean; gemeinnuetzig?: boolean; rechtsform?: Rechtsform }
): Promise<void> {
  await prisma.traeger.update({
    where: { id: traegerId },
    data: {
      verifiziert: daten.verifiziert,
      ...(daten.gemeinnuetzig !== undefined ? { gemeinnuetzig: daten.gemeinnuetzig } : {}),
      ...(daten.rechtsform !== undefined ? { rechtsform: daten.rechtsform } : {}),
    },
  });
}
