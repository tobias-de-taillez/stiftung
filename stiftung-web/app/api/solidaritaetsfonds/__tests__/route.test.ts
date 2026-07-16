import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { GET } from '../route';
import { POST as postSpenden } from '../spenden/route';
import { POST as postVerteilen } from '../verteilen/route';

beforeEach(async () => {
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'fonds-test-kita', name: 'Fonds-Test-Kita', typ: 'kita', ort: 'Z', kinderAnzahl: 10, aktuellesKapital: 0, zielKapital: 5000 },
  });
});

describe('Solidaritätsfonds-API', () => {
  it('GET liefert Bestand 0 initial', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.bestand).toBe(0);
  });

  it('POST /spenden erhöht Bestand, POST /verteilen bucht real in Einrichtung', async () => {
    await postSpenden(
      new Request('http://localhost/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        body: JSON.stringify({ betrag: 100 }),
      })
    );
    const verteilenRes = await postVerteilen();
    const verteilenJson = await verteilenRes.json();
    expect(verteilenJson.verteiltGesamt).toBeGreaterThan(0);

    const e = await prisma.einrichtung.findUnique({ where: { slug: 'fonds-test-kita' } });
    expect(e?.aktuellesKapital).toBeGreaterThan(0);
  });

  it('POST /spenden gibt 400 bei ungültigem Betrag', async () => {
    const res = await postSpenden(
      new Request('http://localhost/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        body: JSON.stringify({ betrag: -5 }),
      })
    );
    expect(res.status).toBe(400);
  });
});
