import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { POST } from '../route';

beforeEach(async () => {
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.einrichtung.create({
    data: { slug: 'api-test-kita', name: 'API-Test-Kita', typ: 'kita', ort: 'Teststadt', kinderAnzahl: 10, aktuellesKapital: 1000, zielKapital: 50000 },
  });
});

describe('POST /api/einrichtungen/[slug]/spenden', () => {
  it('bucht Spende real in die DB und gibt { einrichtung, spende } zurück (201)', async () => {
    const request = new Request('http://localhost/api/einrichtungen/api-test-kita/spenden', {
      method: 'POST',
      body: JSON.stringify({ betrag: 100, frequenz: 'einmalig' }),
    });
    const response = await POST(request, { params: { slug: 'api-test-kita' } });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.einrichtung.aktuellesKapital).toBe(1100);
    expect(json.spende.betrag).toBe(100);

    const inDb = await prisma.einrichtung.findUnique({ where: { slug: 'api-test-kita' } });
    expect(inDb?.aktuellesKapital).toBe(1100);
  });

  it('gibt 404 bei unbekanntem slug', async () => {
    const request = new Request('http://localhost/api/einrichtungen/unbekannt/spenden', {
      method: 'POST',
      body: JSON.stringify({ betrag: 100, frequenz: 'einmalig' }),
    });
    const response = await POST(request, { params: { slug: 'unbekannt' } });
    expect(response.status).toBe(404);
  });

  it('gibt 400 bei ungültigem Betrag', async () => {
    const request = new Request('http://localhost/api/einrichtungen/api-test-kita/spenden', {
      method: 'POST',
      body: JSON.stringify({ betrag: -10, frequenz: 'einmalig' }),
    });
    const response = await POST(request, { params: { slug: 'api-test-kita' } });
    expect(response.status).toBe(400);
  });
});
