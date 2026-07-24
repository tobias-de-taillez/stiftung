import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, createTestTraeger, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import { erstelleSessionToken, ADMIN_COOKIE } from '@/lib/server/adminSession';
import { prisma } from '@/lib/server/prismaClient';
import { POST as antragPost } from '@/app/api/traeger/[id]/verifikation/antrag/route';
import { GET as antraegeGet } from '../verifikation/antraege/route';
import { POST as entscheidePost } from '../verifikation/antraege/[id]/route';

const adminCookie = () => `${ADMIN_COOKIE}=${erstelleSessionToken()}`;
beforeEach(resetDb);

describe('POST /api/traeger/[id]/verifikation/antrag (public)', () => {
  it('legt einen Antrag an (201)', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(201);
  });

  it('409 bei bereits verifiziertem Träger', async () => {
    const t = await createTestTraeger({ verifiziert: true });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('bereits_verifiziert');
  });

  it('400 bei ungültiger Rechtsform', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const req = new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechtsform: 'quatsch', gemeinnuetzig: true }),
    });
    const res = await antragPost(req, { params: { id: t.id } });
    expect(res.status).toBe(400);
  });
});

describe('Admin-Verifikations-Routen: Guard + Fluss', () => {
  it('GET antraege: ohne Cookie 401', async () => {
    const res = await antraegeGet(new Request('http://x/api/admin/verifikation/antraege'));
    expect(res.status).toBe(401);
  });

  it('End-to-End: Antrag → Liste → Genehmigung verifiziert den Träger', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    await createTestEinrichtung({ traegerId: t.id });
    await antragPost(
      new Request(`http://x/api/traeger/${t.id}/verifikation/antrag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechtsform: 'ggmbh', gemeinnuetzig: true }),
      }),
      { params: { id: t.id } }
    );
    const liste = await (await antraegeGet(new Request('http://x/api/admin/verifikation/antraege', { headers: { cookie: adminCookie() } }))).json();
    expect(liste).toHaveLength(1);
    const antragId = liste[0].antragId;
    const res = await entscheidePost(
      new Request(`http://x/api/admin/verifikation/antraege/${antragId}`, {
        method: 'POST', headers: { cookie: adminCookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung: 'genehmigt' }),
      }),
      { params: { id: antragId } }
    );
    expect(res.status).toBe(200);
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(true);
  });

  it('POST entscheidung: ohne Cookie 401', async () => {
    const res = await entscheidePost(
      new Request('http://x/api/admin/verifikation/antraege/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entscheidung: 'genehmigt' }) }),
      { params: { id: 'x' } }
    );
    expect(res.status).toBe(401);
  });
});
