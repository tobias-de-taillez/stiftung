import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { POST } from '../route';

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
  await prisma.einrichtung.create({
    data: {
      slug: 'simulation-test-kita',
      name: 'Simulations-Test-Kita',
      typ: 'kita',
      ort: 'TestStadt',
      kinderAnzahl: 10,
      aktuellesKapital: 1000,
      zielKapital: 5000,
    },
  });
});

describe('POST /api/simulation/jahr', () => {
  it('returns 201 with complete result shape and increments institution capital', async () => {
    const kapitalVorher = await prisma.einrichtung.findUnique({
      where: { slug: 'simulation-test-kita' },
      select: { aktuellesKapital: true },
    });

    const res = await POST();
    expect(res.status).toBe(201);

    const json = await res.json();

    // Verify all six required fields are present
    expect(json).toHaveProperty('nummer');
    expect(json).toHaveProperty('fondsErtrag');
    expect(json).toHaveProperty('kapitalErtrag');
    expect(json).toHaveProperty('verteiltGesamt');
    expect(json).toHaveProperty('verteilung');
    expect(json).toHaveProperty('neuerFondsBestand');

    expect(typeof json.nummer).toBe('number');
    expect(typeof json.fondsErtrag).toBe('number');
    expect(typeof json.kapitalErtrag).toBe('number');
    expect(typeof json.verteiltGesamt).toBe('number');
    expect(Array.isArray(json.verteilung)).toBe(true);
    expect(typeof json.neuerFondsBestand).toBe('number');

    // Verify institution capital increased in DB
    const kapitalNachher = await prisma.einrichtung.findUnique({
      where: { slug: 'simulation-test-kita' },
      select: { aktuellesKapital: true },
    });

    expect(kapitalNachher!.aktuellesKapital).toBeGreaterThan(kapitalVorher!.aktuellesKapital);
  });

  it('increments nummer on second POST call', async () => {
    const res1 = await POST();
    const json1 = await res1.json();
    expect(json1.nummer).toBe(1);

    const res2 = await POST();
    const json2 = await res2.json();
    expect(json2.nummer).toBe(2);
  });
});
