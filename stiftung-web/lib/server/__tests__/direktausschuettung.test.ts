import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung, createTestTraeger, pruefeInvarianten } from './testDb';
import { spendeDirekt, spendeVermoegen, DirektNichtVerfuegbarError } from '../spendenService';
import { auszahlungslauf } from '../auszahlungsService';

// DB-Invarianten (P9): kein Konto negativ, Σ Topfwerte == Poolwert.
afterEach(pruefeInvarianten);

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('spendeDirekt (Verwendungsart B, Spec §3.1)', () => {
  it('bucht als durchlaufenden Posten: kein Anteilskauf, kein Poolwert-Beitrag', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n });
    const e = await createTestEinrichtung({ topfCent: 37_500n });
    const vorher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });

    const ergebnis = await spendeDirekt(e.slug, 3_600n);

    const nachher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(nachher.anteile).toBe(vorher.anteile); // keine Anteile
    expect(ergebnis.offeneDirektausschuettungenCent).toBe(3_600);
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(3_600n); // liegt als Verbindlichkeit auf dem Konto
    const z = await prisma.zuwendung.findFirstOrThrow();
    expect(z.verwendungsart).toBe('direkt');
    expect(z.widmungVersion).toBeNull(); // B ist keine Vermögenswidmung
    expect(z.ausgezahltAm).toBeNull();
  });

  it('verweigert B für unverifizierte Träger (hohe Hürde zum Nehmen)', async () => {
    await seedKontenstand();
    const t = await createTestTraeger({ verifiziert: false });
    const e = await createTestEinrichtung({ traegerId: t.id });
    await expect(spendeDirekt(e.slug, 1_000n)).rejects.toThrow(DirektNichtVerfuegbarError);
  });

  it('der Sweep investiert kein fremdes Geld (Spec §3.1: sonst scheitert die Auszahlung an Liquidität)', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n });
    const e = await createTestEinrichtung({ topfCent: 37_500n });
    await spendeDirekt(e.slug, 3_600n); // 36 € durchlaufend
    await spendeVermoegen(e.slug, 400n); // investierbar 4 € bei Pool 379 € → unter Schwelle
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(4_000n); // 3.600 fremd + 400 eigen, kein Sweep
    expect(k.etfMarktwertCent).toBe(37_500n);
  });
});

describe('auszahlungslauf (monatlich gesammelt, Spec §3.1)', () => {
  it('zahlt alle offenen Posten aus, setzt das Konto zurück und protokolliert je Einrichtung', async () => {
    await seedKontenstand();
    const e1 = await createTestEinrichtung();
    const e2 = await createTestEinrichtung();
    await spendeDirekt(e1.slug, 1_000n);
    await spendeDirekt(e1.slug, 500n);
    await spendeDirekt(e2.slug, 2_000n);

    const lauf = await auszahlungslauf();
    expect(lauf.summeCent).toBe(3_500);
    expect(lauf.anzahl).toBe(3);

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(0n);
    const offene = await prisma.zuwendung.count({ where: { ausgezahltAm: null, verwendungsart: 'direkt' } });
    expect(offene).toBe(0);
    const buchungen = await prisma.buchung.findMany({ where: { typ: 'auszahlungslauf' } });
    expect(buchungen).toHaveLength(2); // eine Zeile je Einrichtung (brutto, Spec §7)
    const jeEinrichtung = new Map(buchungen.map((b) => [b.einrichtungId, b.betragCent]));
    expect(jeEinrichtung.get(e1.id)).toBe(1_500n); // 1.000 + 500 aggregiert
    expect(jeEinrichtung.get(e2.id)).toBe(2_000n);
  });

  it('bricht ab, wenn eine Direkt-Zuwendung keine Einrichtung referenziert (Datenbestand inkonsistent)', async () => {
    await seedKontenstand();
    // Der Service erzwingt eine Einrichtung — so eine Zeile kann nur durch
    // direkte DB-Manipulation entstehen. Der Lauf darf sie nicht stillschweigend
    // als einrichtungslose Buchung protokollieren.
    await prisma.zuwendung.create({ data: { einrichtungId: null, betragCent: 1_000n, verwendungsart: 'direkt' } });
    await expect(auszahlungslauf()).rejects.toThrow(/ohne Einrichtung/);
    // Transaktion zurückgerollt: nichts ausgezahlt, kein Lauf angelegt.
    expect(await prisma.auszahlungsLauf.count()).toBe(0);
    expect(await prisma.zuwendung.count({ where: { ausgezahltAm: null } })).toBe(1);
  });

  it('ohne offene Posten passiert nichts', async () => {
    await seedKontenstand();
    const lauf = await auszahlungslauf();
    expect(lauf.laufId).toBeNull();
    expect(lauf.summeCent).toBe(0);
  });
});
