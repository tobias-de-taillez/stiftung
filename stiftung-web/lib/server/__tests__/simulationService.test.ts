import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { spendeAnFonds, getFondsBestand } from '../solidaritaetsfondsService';
import { statistik } from '../einrichtungenService';
import { simuliereJahr, jahresabschluesse } from '../simulationService';

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
    expect(erster.meilensteine).toEqual([]);
    expect(erster.nummer).toBe(1);

    const zweiter = await simuliereJahr();
    expect(zweiter.nummer).toBe(2);
  });

  // Meilenstein-Erkennung (Task 31): derselbe Helper wie in einrichtungenService.spenden(),
  // aber angewendet über die GESAMTE Jahresspanne (Kapital-Ertrag + Solidaritäts-Verteilung).
  // "arm" startet bei 0 € von 10.000 € Ziel (0 %); Wachstum bringt nichts (0 € Kapital), die
  // Verteilung hebt sie auf 1.216,06 € (12,16 %) — überschreitet Bronze (10 %).
  // "reich" startet bei 90 % und landet bei 95,96 % — keine Schwelle überschritten.
  it('erkennt Meilensteine pro Einrichtung über Wachstum + Verteilung hinweg (gleicher Helper wie bei Spenden)', async () => {
    await spendeZwoelfMalHundertAnFonds();
    const ergebnis = await simuliereJahr();

    const arm = ergebnis.meilensteine.find((m) => m.slug === 'arm');
    const reich = ergebnis.meilensteine.find((m) => m.slug === 'reich');

    expect(arm).toEqual({ slug: 'arm', name: 'Arme Kita', labels: ['Bronze erreicht'] });
    expect(reich).toBeUndefined();
  });
});

// Jahresabschluss-Historie (Task 34): Read-Helper auf die bereits von
// simuliereJahr() persistierte Jahresabschluss-Tabelle — für die Statistik-Seite.
describe('jahresabschluesse', () => {
  it('liefert ein leeres Array ohne Abschlüsse', async () => {
    expect(await jahresabschluesse()).toEqual([]);
  });

  it('liefert Abschlüsse neueste zuerst (nummer absteigend) mit allen Kennzahlen', async () => {
    await spendeZwoelfMalHundertAnFonds();
    await simuliereJahr();
    await spendeZwoelfMalHundertAnFonds();
    await simuliereJahr();

    const liste = await jahresabschluesse();
    expect(liste).toHaveLength(2);
    expect(liste[0].nummer).toBe(2);
    expect(liste[1].nummer).toBe(1);
    expect(liste[0].fondsErtrag).toBeGreaterThan(0);
    expect(liste[0].kapitalErtrag).toBeGreaterThan(0);
    expect(typeof liste[0].verteiltGesamt).toBe('number');
    expect(liste[0].createdAt).toBeInstanceOf(Date);
  });
});
