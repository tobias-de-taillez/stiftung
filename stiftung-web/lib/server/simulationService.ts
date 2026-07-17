import { prisma } from './prismaClient';
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';
import { verteileMitClient } from './solidaritaetsfondsService';
import { erreichteMeilensteine } from '@/lib/data/levels';

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export async function simuliereJahr(): Promise<{
  nummer: number;
  fondsErtrag: number;
  kapitalErtrag: number;
  verteiltGesamt: number;
  verteilung: { slug: string; name: string; anteil: number }[];
  meilensteine: { slug: string; name: string; labels: string[] }[];
  neuerFondsBestand: number;
}> {
  return prisma.$transaction(async (tx) => {
    // (1) Fonds-Ertrag buchen
    const fonds = await tx.solidaritaetsfonds.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main', bestand: 0 },
    });
    const fondsErtrag = round2(fonds.bestand * NET_GROWTH_RATE);
    await tx.solidaritaetsfonds.update({
      where: { id: 'main' },
      data: { bestand: { increment: fondsErtrag } },
    });

    // (2) Kapital-Ertrag pro Einrichtung buchen
    const alle = await tx.einrichtung.findMany();
    let kapitalErtrag = 0;
    for (const e of alle) {
      const ertrag = round2(e.aktuellesKapital * NET_GROWTH_RATE);
      kapitalErtrag += ertrag;
      await tx.einrichtung.update({
        where: { slug: e.slug },
        data: { aktuellesKapital: { increment: ertrag } },
      });
    }
    kapitalErtrag = round2(kapitalErtrag);

    // (3) Verteilung über den tx-fähigen Helper
    const { verteiltGesamt, verteilung } = await verteileMitClient(tx);

    const fondsNachher = await tx.solidaritaetsfonds.findUniqueOrThrow({ where: { id: 'main' } });

    // (4) Jahresabschluss-Zeile schreiben
    const anzahl = await tx.jahresabschluss.count();
    const nummer = anzahl + 1;
    await tx.jahresabschluss.create({
      data: { nummer, fondsErtrag, kapitalErtrag, verteiltGesamt },
    });

    // (5) Meilenstein-Erkennung pro Einrichtung — über die GESAMTE Jahresspanne
    // (Kapital-Ertrag aus (2) + Solidaritäts-Verteilung aus (3) zusammen, nicht
    // getrennt), mit demselben Helper wie einrichtungenService.spenden()
    // (kein Duplikat der Schwellenlogik). `alle` ist der Vorher-Stand vor
    // Schritt (2); für den Nachher-Stand wird frisch aus der tx gelesen.
    const nachAlle = await tx.einrichtung.findMany();
    const vorherNachSlug = new Map(alle.map((e) => [e.slug, e.aktuellesKapital]));
    const meilensteine = nachAlle
      .map((e) => ({
        slug: e.slug,
        name: e.name,
        labels: erreichteMeilensteine(vorherNachSlug.get(e.slug) ?? e.aktuellesKapital, e.aktuellesKapital, e.zielKapital),
      }))
      .filter((m) => m.labels.length > 0);

    return {
      nummer,
      fondsErtrag,
      kapitalErtrag,
      verteiltGesamt,
      verteilung,
      meilensteine,
      neuerFondsBestand: fondsNachher.bestand,
    };
  });
}
