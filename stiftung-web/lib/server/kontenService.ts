// Kontenmodell (Spec §1): fünf Konten als Singleton-Zeile + Buchungsjournal.
// Alle Funktionen nehmen den TransactionClient — Buchungen sind IMMER Teil
// einer umschließenden $transaction des aufrufenden Services.
import type { Prisma, Kontenstand } from '@prisma/client';
import { prisma } from './prismaClient';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import type { Buchungstyp } from './buchungstypen';

export type Tx = Prisma.TransactionClient;

export async function ensureKontenstand(tx: Tx): Promise<Kontenstand> {
  return tx.kontenstand.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });
}

/** Durchlaufende Posten (Spec §3.1): offene Verwendungsart-B-Zuwendungen. */
export async function offeneDirektausschuettungenCent(tx: Tx): Promise<bigint> {
  const summe = await tx.zuwendung.aggregate({
    _sum: { betragCent: true },
    where: { verwendungsart: 'direkt', ausgezahltAm: null },
  });
  return summe._sum.betragCent ?? 0n;
}

/** Poolwert = ETF-Marktwert + Verrechnungskonto − offene Direktausschüttungen (Spec §2, §3.1). */
export async function poolwertCent(tx: Tx): Promise<bigint> {
  const k = await ensureKontenstand(tx);
  return k.etfMarktwertCent + k.verrechnungskontoCent - (await offeneDirektausschuettungenCent(tx));
}

export async function soliFondsCentAktuell(tx: Tx): Promise<bigint> {
  const k = await ensureKontenstand(tx);
  return k.soliDepotCent + k.soliVerrechnungskontoCent;
}

/** Σ Anteile aller offenen Einrichtungen (geschlossene haben anteile == 0). */
export async function anteileGesamt(tx: Tx): Promise<bigint> {
  const summe = await tx.einrichtung.aggregate({ _sum: { anteile: true } });
  return summe._sum.anteile ?? 0n;
}

export async function buche(
  tx: Tx,
  eintrag: { typ: Buchungstyp; betragCent: bigint; einrichtungId?: string; kaskadenlaufId?: string }
): Promise<void> {
  await tx.buchung.create({
    data: {
      typ: eintrag.typ,
      betragCent: eintrag.betragCent,
      einrichtungId: eintrag.einrichtungId ?? null,
      kaskadenlaufId: eintrag.kaskadenlaufId ?? null,
    },
  });
}

export async function setManagementCap(capCent: bigint): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await ensureKontenstand(tx);
    await tx.kontenstand.update({ where: { id: 'main' }, data: { managementCapCent: capCent } });
  });
}

export async function kontenLage() {
  return prisma.$transaction(async (tx) => {
    const k = await ensureKontenstand(tx);
    const offene = await offeneDirektausschuettungenCent(tx);
    return serialisiere({
      etfMarktwertCent: k.etfMarktwertCent,
      verrechnungskontoCent: k.verrechnungskontoCent,
      soliDepotCent: k.soliDepotCent,
      soliVerrechnungskontoCent: k.soliVerrechnungskontoCent,
      managementKontoCent: k.managementKontoCent,
      managementCapCent: k.managementCapCent,
      offeneDirektausschuettungenCent: offene,
      poolwertCent: k.etfMarktwertCent + k.verrechnungskontoCent - offene,
      soliFondsCent: k.soliDepotCent + k.soliVerrechnungskontoCent,
    });
  });
}

export type KontenLage = Awaited<ReturnType<typeof kontenLage>>;
