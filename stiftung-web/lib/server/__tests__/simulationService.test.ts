import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { spendeAnFonds, getFondsBestand } from '../solidaritaetsfondsService';
import { statistik } from '../einrichtungenService';
import { simuliereJahr } from '../simulationService';

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'arm', name: 'Arme Kita', typ: 'kita', ort: 'X', kinderAnzahl: 10, aktuellesKapital: 0, zielKapital: 10000 },
  });
  await prisma.einrichtung.create({
    data: { slug: 'reich', name: 'Reiche Schule', typ: 'schule', ort: 'Y', kinderAnzahl: 10, aktuellesKapital: 9000, zielKapital: 10000 },
  });
});

async function spendeZwoelfMalHundertAnFonds() {
  for (let i = 0; i < 12; i++) {
    await spendeAnFonds(100);
  }
}

describe('simuliereJahr', () => {
  it('bucht Fonds- und Kapital-Erträge korrekt (6% Netto-Wachstum)', async () => {
    await spendeZwoelfMalHundertAnFonds();
    const ergebnis = await simuliereJahr();
    expect(ergebnis.fondsErtrag).toBe(72);
    expect(ergebnis.kapitalErtrag).toBe(540);
  });

  it('verteilt den Pool bedarfsproportional nach dem Wachstum', async () => {
    await spendeZwoelfMalHundertAnFonds();
    const ergebnis = await simuliereJahr();
    const arm = ergebnis.verteilung.find((v) => v.slug === 'arm')!;
    const reich = ergebnis.verteilung.find((v) => v.slug === 'reich')!;
    expect(arm.anteil).toBe(1216.06);
    expect(reich.anteil).toBe(55.94);
    expect(ergebnis.verteiltGesamt).toBe(1272);
    expect(ergebnis.neuerFondsBestand).toBe(0);
  });

  it('erhält die Gesamtsumme auf den Cent', async () => {
    await spendeZwoelfMalHundertAnFonds();

    const fondsVorher = await getFondsBestand();
    const einrichtungenVorher = await prisma.einrichtung.findMany();
    const kapitalVorher = einrichtungenVorher.reduce((sum, e) => sum + e.aktuellesKapital, 0);
    const gesamtVorher = fondsVorher + kapitalVorher;
    expect(gesamtVorher).toBe(10200);

    const ergebnis = await simuliereJahr();

    const fondsNachher = await getFondsBestand();
    const einrichtungenNachher = await prisma.einrichtung.findMany();
    const kapitalNachher = einrichtungenNachher.reduce((sum, e) => sum + e.aktuellesKapital, 0);
    const gesamtNachher = fondsNachher + kapitalNachher;

    expect(gesamtVorher + ergebnis.fondsErtrag + ergebnis.kapitalErtrag).toBe(10812);
    expect(gesamtNachher).toBe(10812);
  });

  it('zählt Erträge und Verteilungs-Buchungen nicht als Spenden-Zufluss', async () => {
    await spendeZwoelfMalHundertAnFonds();
    await simuliereJahr();
    const stats = await statistik();
    expect(stats.zuflussLetztesJahr).toBe(1200);
  });

  it('liefert im leeren Zustand alle Erträge als 0 und zählt nummer hoch', async () => {
    await prisma.einrichtung.deleteMany();

    const erster = await simuliereJahr();
    expect(erster.fondsErtrag).toBe(0);
    expect(erster.kapitalErtrag).toBe(0);
    expect(erster.verteiltGesamt).toBe(0);
    expect(erster.verteilung).toEqual([]);
    expect(erster.nummer).toBe(1);

    const zweiter = await simuliereJahr();
    expect(zweiter.nummer).toBe(2);
  });
});
