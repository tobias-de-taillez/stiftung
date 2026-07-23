import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { GET } from '../route';
import { POST as postSpenden } from '../spenden/route';
import { POST as postVerteilen } from '../verteilen/route';
import { resetDb, seedWidmung } from '@/lib/server/__tests__/testDb';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('GET /api/solidaritaetsfonds (neue Welt: liefert KontenLage)', () => {
  it('liefert soliFondsCent 0 initial', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.soliFondsCent).toBe(0);
    expect(json).toHaveProperty('poolwertCent');
    expect(json).toHaveProperty('managementCapCent');
  });
});

describe('POST /api/solidaritaetsfonds/spenden (neue Welt: betragCent → spendeAnSoli)', () => {
  it('erhöht soliFondsCent und gibt 201', async () => {
    const res = await postSpenden(
      new Request('http://localhost/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        body: JSON.stringify({ betragCent: 10_000 }),
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.soliFondsCent).toBe(10_000);

    const lage = await (await GET()).json();
    expect(lage.soliFondsCent).toBe(10_000);
  });

  it('gibt 400 bei ungültigem Betrag', async () => {
    const res = await postSpenden(
      new Request('http://localhost/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        body: JSON.stringify({ betragCent: -5 }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_betrag');
  });
});

// Alt-Welt, unangetastet (Löschung erst Task 20): eigene Legacy-Tabellen,
// unabhängig vom neuen Kontenstand — Seed direkt über den Legacy-Service.
describe('POST /api/solidaritaetsfonds/verteilen (Alt-Welt, unangetastet)', () => {
  it('bucht real in eine Einrichtung ein', async () => {
    await prisma.einrichtung.create({
      data: {
        slug: 'fonds-test-kita',
        name: 'Fonds-Test-Kita',
        typ: 'kita',
        ort: 'Z',
        kinderAnzahl: 10,
        aktuellesKapital: 0,
        zielKapital: 5000,
      },
    });
    await prisma.solidaritaetsfonds.upsert({
      where: { id: 'main' },
      update: { bestand: 100 },
      create: { id: 'main', bestand: 100 },
    });

    const verteilenRes = await postVerteilen();
    const verteilenJson = await verteilenRes.json();
    expect(verteilenJson.verteiltGesamt).toBeGreaterThan(0);

    const e = await prisma.einrichtung.findUnique({ where: { slug: 'fonds-test-kita' } });
    expect(e?.aktuellesKapital).toBeGreaterThan(0);
  });
});
