import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { POST as postSpenden } from '../spenden/route';
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
