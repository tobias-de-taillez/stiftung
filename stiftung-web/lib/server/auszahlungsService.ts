// Monatlicher Sammellauf (Spec §3.1 "Auszahlungsrhythmus"): Direktausschüttungen
// werden gesammelt ausgezahlt, nicht einzeln — Transaktionskosten-Logik wie
// beim Sweep. Die Zwei-Jahres-Frist des § 55 Abs. 1 Nr. 5 AO ist damit
// mit großem Abstand eingehalten.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand } from './kontenService';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export async function auszahlungslauf(): Promise<{ laufId: string | null; summeCent: number; anzahl: number }> {
  return prisma.$transaction(async (tx) => {
    const offene = await tx.zuwendung.findMany({
      where: { verwendungsart: 'direkt', ausgezahltAm: null },
    });
    if (offene.length === 0) {
      return { laufId: null, summeCent: 0, anzahl: 0 };
    }
    const summe = offene.reduce((s, z) => s + z.betragCent, 0n);
    const lauf = await tx.auszahlungsLauf.create({
      data: { summeCent: summe, anzahl: offene.length },
    });
    const jetzt = new Date();
    await tx.zuwendung.updateMany({
      where: { id: { in: offene.map((z) => z.id) } },
      data: { ausgezahltAm: jetzt, auszahlungsLaufId: lauf.id },
    });
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { verrechnungskontoCent: k.verrechnungskontoCent - summe },
    });
    // Brutto-Protokoll (Spec §7): eine Buchung je Einrichtung.
    const jeEinrichtung = new Map<string, bigint>();
    for (const z of offene) {
      if (!z.einrichtungId) {
        // Der Service erzwingt bei 'direkt' eine Einrichtung — so eine Zeile
        // ist Datenkorruption; abbrechen statt einrichtungslos zu buchen.
        throw new Error(`Direkt-Zuwendung ${z.id} ohne Einrichtung — Auszahlungslauf abgebrochen`);
      }
      jeEinrichtung.set(z.einrichtungId, (jeEinrichtung.get(z.einrichtungId) ?? 0n) + z.betragCent);
    }
    for (const [einrichtungId, betragCent] of jeEinrichtung) {
      await buche(tx, { typ: 'auszahlungslauf', betragCent, einrichtungId });
    }
    return serialisiere({ laufId: lauf.id, summeCent: summe, anzahl: offene.length });
  });
}
