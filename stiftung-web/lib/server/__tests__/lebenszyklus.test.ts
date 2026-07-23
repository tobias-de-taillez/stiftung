import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung, createTestTraeger } from './testDb';
import { schliesseEinrichtung, setzeVerifikation } from '../lebenszyklusService';
import { spendeVermoegen, EinrichtungGeschlossenError } from '../spendenService';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('schliesseEinrichtung (Spec §3.3)', () => {
  it('überträgt das volle Fondsvolumen in den Soli-Fonds und schließt den Topf', async () => {
    await seedKontenstand({ etfMarktwertCent: 40_000n, soliDepotCent: 10_000n });
    const bleibt = await createTestEinrichtung({ topfCent: 30_000n });
    const geht = await createTestEinrichtung({ topfCent: 10_000n });

    const ergebnis = await schliesseEinrichtung(geht.slug);
    expect(ergebnis.uebertragCent).toBe(10_000);

    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { id: geht.id } });
    expect(zeile.anteile).toBe(0n);
    expect(zeile.geschlossenAm).not.toBeNull();

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(30_000n);
    expect(k.soliDepotCent).toBe(20_000n);

    // Kreislauf geschlossen (Spec §3.3): kein Geld verlässt das System.
    const b = await prisma.buchung.findFirstOrThrow({ where: { typ: 'schliessung' } });
    expect(b.betragCent).toBe(10_000n);
    expect(b.einrichtungId).toBe(geht.id);

    // Der Topf des Verbleibenden ist unberührt (Preis konstant).
    const andere = await prisma.einrichtung.findUniqueOrThrow({ where: { id: bleibt.id } });
    expect(andere.anteile).toBe(bleibt.anteile);
  });

  it('letzte Einrichtung schließen: kein Konto wird negativ, Cash-Anteil kommt vom Verrechnungskonto', async () => {
    await seedKontenstand({ etfMarktwertCent: 39_600n, verrechnungskontoCent: 400n, soliDepotCent: 0n });
    const e = await createTestEinrichtung({ topfCent: 40_000n });
    const ergebnis = await schliesseEinrichtung(e.slug);
    expect(ergebnis.uebertragCent).toBe(40_000);
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(0n);
    expect(k.verrechnungskontoCent).toBe(0n);
    expect(k.soliDepotCent).toBe(40_000n);
  });

  it('geschlossene Einrichtungen nehmen keine Spenden mehr an und doppelte Schließung wirft', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const e = await createTestEinrichtung({ topfCent: 10_000n });
    await schliesseEinrichtung(e.slug);
    await expect(spendeVermoegen(e.slug, 100n)).rejects.toThrow(EinrichtungGeschlossenError);
    await expect(schliesseEinrichtung(e.slug)).rejects.toThrow(EinrichtungGeschlossenError);
  });
});

describe('setzeVerifikation (Spielgeld-KYC, Spec §3.5)', () => {
  it('stellt Status und Rechtsform am Träger fest', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    await setzeVerifikation(t.id, { verifiziert: true, gemeinnuetzig: true, rechtsform: 'ggmbh' });
    const zeile = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(zeile.verifiziert).toBe(true);
    expect(zeile.rechtsform).toBe('ggmbh');
  });
});
