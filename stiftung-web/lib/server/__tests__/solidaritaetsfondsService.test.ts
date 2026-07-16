import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { getFondsBestand, spendeAnFonds, verteileFonds } from '../solidaritaetsfondsService';
import { UngueltigerBetragError } from '../einrichtungenService';

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
});
