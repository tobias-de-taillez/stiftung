import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { getFondsBestand, spendeAnFonds, verteileFonds } from '../solidaritaetsfondsService';
import { UngueltigerBetragError, statistik } from '../einrichtungenService';

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'arm', name: 'Arme Kita', typ: 'kita', ort: 'X', kinderAnzahl: 10, aktuellesKapital: 0, zielKapital: 10000 },
  });
  await prisma.einrichtung.create({
    data: { slug: 'reich', name: 'Reiche Schule', typ: 'schule', ort: 'Y', kinderAnzahl: 10, aktuellesKapital: 9000, zielKapital: 10000 },
  });
});

describe('spendeAnFonds', () => {
  it('erhöht den Fonds-Bestand dauerhaft', async () => {
    await spendeAnFonds(100);
    expect(await getFondsBestand()).toBe(100);
  });
  it('wirft UngueltigerBetragError bei Betrag <= 0', async () => {
    await expect(spendeAnFonds(0)).rejects.toThrow(UngueltigerBetragError);
  });
});

describe('verteileFonds', () => {
  it('verteilt mehr an die Einrichtung mit größerem Pro-Kind-Bedarf', async () => {
    await spendeAnFonds(1000);
    const ergebnis = await verteileFonds();
    const arm = ergebnis.verteilung.find((v) => v.slug === 'arm')!;
    const reich = ergebnis.verteilung.find((v) => v.slug === 'reich')!;
    expect(arm.anteil).toBeGreaterThan(reich.anteil);
  });

  it('setzt den Fonds-Bestand nach Verteilung auf 0 zurück', async () => {
    await spendeAnFonds(500);
    await verteileFonds();
    expect(await getFondsBestand()).toBe(0);
  });

  it('bucht die Verteilung als echte Spende mit quelle "solidaritaet"', async () => {
    await spendeAnFonds(300);
    await verteileFonds();
    const spendenListe = await prisma.spende.findMany({ where: { quelle: 'solidaritaet' } });
    expect(spendenListe.length).toBeGreaterThan(0);
  });

  it('lässt den Pool unangetastet, wenn kein Bedarf besteht', async () => {
    await prisma.einrichtung.updateMany({ data: { aktuellesKapital: 10000 } });
    await spendeAnFonds(200);
    await verteileFonds();
    expect(await getFondsBestand()).toBe(200);
  });

  it('zählt verteiltes Fondsgeld nicht doppelt in der Statistik', async () => {
    await spendeAnFonds(300);
    await verteileFonds();
    const stats = await statistik();
    expect(stats.zuflussLetztesJahr).toBe(300);
  });

  it('lässt keinen Float-Staub im Bestand zurück (Bedarfe 1000/1037/1074, Pool 460)', async () => {
    // Anteile 147.86 + 153.33 + 158.81 summieren in Float zu 460.00000000000006 —
    // ohne Cent-Rundung am Bestand-Write bliebe -5.68e-14 stehen.
    await prisma.einrichtung.create({
      data: { slug: 'c', name: 'Kita C', typ: 'kita', ort: 'X', kinderAnzahl: 10, aktuellesKapital: 0, zielKapital: 10740 },
    });
    await prisma.einrichtung.update({ where: { slug: 'reich' }, data: { aktuellesKapital: 0, zielKapital: 10370 } });
    await spendeAnFonds(460);
    await verteileFonds();
    expect(await getFondsBestand()).toBe(0);
  });
});
