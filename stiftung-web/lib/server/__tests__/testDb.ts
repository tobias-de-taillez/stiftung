// Zentraler Reset für DB-Suiten der NEUEN Welt: ALLE Tabellen, FK-sichere
// Reihenfolge (Kinder vor Eltern). Bestehende Alt-Suiten behalten ihren
// eigenen 5-Tabellen-Reset — dank onDelete: SetNull der neuen Relationen
// kollidieren die Welten nicht.
import { prisma } from '../prismaClient';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';

export async function resetDb() {
  await prisma.buchung.deleteMany();
  await prisma.zuwendung.deleteMany();
  await prisma.auszahlungsLauf.deleteMany();
  await prisma.kaskadenlauf.deleteMany();
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.traeger.deleteMany();
  await prisma.widmungsText.deleteMany();
  await prisma.kontenstand.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
}

export async function seedWidmung() {
  return prisma.widmungsText.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      wortlaut:
        'Ich bestimme, dass meine Zuwendung dem Vermögen des Vereins dauerhaft zugeführt wird (§ 62 Abs. 3 Nr. 2 AO). Gefördert wird die Einrichtung aus den Erträgen.',
    },
  });
}

export async function seedKontenstand(
  overrides: Partial<{
    etfMarktwertCent: bigint;
    verrechnungskontoCent: bigint;
    soliDepotCent: bigint;
    soliVerrechnungskontoCent: bigint;
    managementKontoCent: bigint;
    managementCapCent: bigint;
  }> = {}
) {
  return prisma.kontenstand.create({ data: { id: 'main', ...overrides } });
}

let laufNr = 0;

export async function createTestTraeger(
  overrides: Partial<{ name: string; rechtsform: string; gemeinnuetzig: boolean; verifiziert: boolean }> = {}
) {
  laufNr += 1;
  return prisma.traeger.create({
    data: {
      name: `Testträger ${laufNr}`,
      rechtsform: 'ggmbh',
      gemeinnuetzig: true,
      verifiziert: true,
      ...overrides,
    },
  });
}

export async function createTestEinrichtung(
  overrides: Partial<{
    slug: string;
    name: string;
    typ: string;
    ort: string;
    kinderAnzahl: number;
    topfCent: bigint; // Komfort: wird zum Bootstrap-Kurs in anteile übersetzt
    zielKapitalCent: bigint;
    traegerId: string;
    geschlossenAm: Date | null;
  }> = {}
) {
  laufNr += 1;
  const traegerId = overrides.traegerId ?? (await createTestTraeger()).id;
  const topfCent = overrides.topfCent ?? 0n;
  return prisma.einrichtung.create({
    data: {
      slug: overrides.slug ?? `test-einrichtung-${laufNr}`,
      name: overrides.name ?? `Test-Einrichtung ${laufNr}`,
      typ: overrides.typ ?? 'kita',
      ort: overrides.ort ?? 'Teststadt',
      kinderAnzahl: overrides.kinderAnzahl ?? 10,
      aktuellesKapital: Number(topfCent) / 100, // Legacy-Spalte, fällt in Task 20
      zielKapital: Number(overrides.zielKapitalCent ?? 1_000_000n) / 100,
      anteile: topfCent * ANTEILS_EINHEITEN_PRO_CENT,
      zielKapitalCent: overrides.zielKapitalCent ?? 1_000_000n,
      traegerId,
      geschlossenAm: overrides.geschlossenAm ?? null,
    },
  });
}
