import { prisma } from './prismaClient';
import type { Prisma } from '@prisma/client';
import { bedarfProKind, verteilePool } from '@/lib/calc/solidaritaet';
import { UngueltigerBetragError } from './einrichtungenService';

async function ensureFonds() {
  return prisma.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });
}

export async function getFondsBestand(): Promise<number> {
  const fonds = await ensureFonds();
  return fonds.bestand;
}

export async function spendeAnFonds(betrag: number): Promise<number> {
  if (!Number.isFinite(betrag) || betrag <= 0) {
    throw new UngueltigerBetragError('Betrag muss größer als 0 sein');
  }
  await ensureFonds();
  const fonds = await prisma.solidaritaetsfonds.update({
    where: { id: 'main' },
    data: { bestand: { increment: betrag } },
  });
  await prisma.fondsSpende.create({ data: { betrag } });
  return fonds.bestand;
}

export async function verteileMitClient(tx: Prisma.TransactionClient): Promise<{
  verteiltGesamt: number;
  verteilung: { slug: string; name: string; anteil: number }[];
}> {
  const fonds = await tx.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });
  if (fonds.bestand <= 0) {
    return { verteiltGesamt: 0, verteilung: [] as { slug: string; name: string; anteil: number }[] };
  }

  const alle = await tx.einrichtung.findMany();
  const eintraege = alle.map((e) => ({ slug: e.slug, bedarf: bedarfProKind(e) }));
  const verteilung = verteilePool(fonds.bestand, eintraege);

  for (const v of verteilung) {
    if (v.anteil <= 0) continue;
    const e = alle.find((x) => x.slug === v.slug)!;
    await tx.einrichtung.update({
      where: { slug: v.slug },
      data: {
        aktuellesKapital: e.aktuellesKapital + v.anteil,
        spenden: { create: { betrag: v.anteil, frequenz: 'einmalig', quelle: 'solidaritaet' } },
      },
    });
  }

  const verteiltGesamt = verteilung.reduce((s, v) => s + v.anteil, 0);
  await tx.solidaritaetsfonds.update({
    where: { id: 'main' },
    data: { bestand: Math.round((fonds.bestand - verteiltGesamt) * 100) / 100 },
  });

  const namen = new Map(alle.map((e) => [e.slug, e.name]));
  return {
    verteiltGesamt,
    verteilung: verteilung
      .filter((v) => v.anteil > 0)
      .map((v) => ({ ...v, name: namen.get(v.slug)! })),
  };
}

export async function verteileFonds(): Promise<{
  verteiltGesamt: number;
  verteilung: { slug: string; name: string; anteil: number }[];
}> {
  return prisma.$transaction((tx) => verteileMitClient(tx));
}
