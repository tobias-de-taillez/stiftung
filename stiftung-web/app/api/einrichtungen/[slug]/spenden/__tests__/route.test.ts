import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/server/prismaClient';
import { resetDb, seedWidmung, seedKontenstand, createTestEinrichtung, createTestTraeger } from '@/lib/server/__tests__/testDb';
import { POST } from '../route';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('POST /api/einrichtungen/[slug]/spenden', () => {
  it('bucht Verwendungsart A (Vermögen) real in die DB, kauft Anteile und liefert 201', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const vorher = await createTestEinrichtung({ slug: 'spende-a', topfCent: 10_000n });

    const request = new Request('http://localhost/api/einrichtungen/spende-a/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 5_000 }),
    });
    const response = await POST(request, { params: { slug: 'spende-a' } });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.verwendungsart).toBe('vermoegen');
    expect(json.topfwertVorherCent).toBe(10_000);
    expect(json.topfwertNachherCent).toBe(15_000);
    expect(json).toHaveProperty('zuwendungId');
    expect(json).toHaveProperty('erreichteMeilensteine');
    expect(json).toHaveProperty('widmung');

    const nachher = await prisma.einrichtung.findUniqueOrThrow({ where: { slug: 'spende-a' } });
    expect(nachher.anteile).toBeGreaterThan(vorher.anteile);
  });

  it('bucht Verwendungsart B (Direkt) bei verifiziertem Träger und liefert 201', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const traeger = await createTestTraeger({ verifiziert: true });
    await createTestEinrichtung({ slug: 'spende-b', topfCent: 10_000n, traegerId: traeger.id });

    const request = new Request('http://localhost/api/einrichtungen/spende-b/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 3_000, verwendungsart: 'direkt' }),
    });
    const response = await POST(request, { params: { slug: 'spende-b' } });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.verwendungsart).toBe('direkt');
    expect(json.offeneDirektausschuettungenCent).toBe(3_000);
    expect(json).toHaveProperty('zuwendungId');

    // Direktausschüttung kauft keine Anteile — der Topf selbst wächst nicht.
    const nachher = await prisma.einrichtung.findUniqueOrThrow({ where: { slug: 'spende-b' } });
    const vorher = await prisma.zuwendung.findMany({ where: { einrichtungId: nachher.id } });
    expect(vorher).toHaveLength(1);
  });

  it('gibt 409 direkt_nicht_verfuegbar, wenn der Träger nicht verifiziert ist', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const traeger = await createTestTraeger({ verifiziert: false });
    await createTestEinrichtung({ slug: 'spende-b-unverifiziert', topfCent: 10_000n, traegerId: traeger.id });

    const request = new Request('http://localhost/api/einrichtungen/spende-b-unverifiziert/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 1_000, verwendungsart: 'direkt' }),
    });
    const response = await POST(request, { params: { slug: 'spende-b-unverifiziert' } });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('direkt_nicht_verfuegbar');
  });

  it('gibt 409 geschlossen bei geschlossener Einrichtung', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    await createTestEinrichtung({ slug: 'spende-geschlossen', topfCent: 10_000n, geschlossenAm: new Date() });

    const request = new Request('http://localhost/api/einrichtungen/spende-geschlossen/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 1_000 }),
    });
    const response = await POST(request, { params: { slug: 'spende-geschlossen' } });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('geschlossen');
  });

  it('gibt 404 bei unbekanntem slug', async () => {
    const request = new Request('http://localhost/api/einrichtungen/unbekannt/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 1_000 }),
    });
    const response = await POST(request, { params: { slug: 'unbekannt' } });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('not_found');
  });

  it('gibt 400 bei ungültigem Betrag (negativ)', async () => {
    const request = new Request('http://localhost/api/einrichtungen/irrelevant/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: -10 }),
    });
    const response = await POST(request, { params: { slug: 'irrelevant' } });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('invalid_betrag');
  });

  it('gibt 400 bei nicht-ganzzahligem Betrag', async () => {
    const request = new Request('http://localhost/api/einrichtungen/irrelevant/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 10.5 }),
    });
    const response = await POST(request, { params: { slug: 'irrelevant' } });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('invalid_betrag');
  });

  it('behandelt jeden anderen Wert als "vermoegen" statt "direkt" (Voreinstellung Spec §3.1)', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    await createTestEinrichtung({ slug: 'spende-default', topfCent: 10_000n });

    const request = new Request('http://localhost/api/einrichtungen/spende-default/spenden', {
      method: 'POST',
      body: JSON.stringify({ betragCent: 1_000, verwendungsart: 'quatsch' }),
    });
    const response = await POST(request, { params: { slug: 'spende-default' } });
    expect(response.status).toBe(201);
    expect((await response.json()).verwendungsart).toBe('vermoegen');
  });
});
