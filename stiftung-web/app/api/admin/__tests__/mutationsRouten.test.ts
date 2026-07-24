import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedKontenstand, seedWidmung, createTestTraeger, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import { erstelleSessionToken, ADMIN_COOKIE } from '@/lib/server/adminSession';
import { PUT as capPut } from '../cap/route';
import { POST as marktjahr } from '../marktjahr/route';
import { POST as jahresabschluss } from '../jahresabschluss/route';
import { POST as auszahlungslauf } from '../auszahlungslauf/route';
import { POST as schliessen } from '../einrichtungen/[slug]/schliessen/route';

const cookie = () => `${ADMIN_COOKIE}=${erstelleSessionToken()}`;
function adminReq(url: string, method: 'POST' | 'PUT', body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { cookie: cookie(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
function anonReq(url: string, method: 'POST' | 'PUT', body?: unknown): Request {
  return new Request(url, {
    method,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
}

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
  await seedKontenstand({ etfMarktwertCent: 100_000n, soliDepotCent: 50_000n, managementCapCent: 100_000n });
});

describe('Admin-Mutations-Routen: Guard', () => {
  it('cap: ohne Cookie 401, mit Cookie 200', async () => {
    expect((await capPut(anonReq('http://x/api/admin/cap', 'PUT', { capCent: 5000 }))).status).toBe(401);
    expect((await capPut(adminReq('http://x/api/admin/cap', 'PUT', { capCent: 5000 }))).status).toBe(200);
  });

  it('marktjahr: ohne Cookie 401, mit Cookie 201', async () => {
    expect((await marktjahr(anonReq('http://x/api/admin/marktjahr', 'POST'))).status).toBe(401);
    expect((await marktjahr(adminReq('http://x/api/admin/marktjahr', 'POST'))).status).toBe(201);
  });

  it('jahresabschluss: ohne Cookie 401, mit Cookie 201', async () => {
    expect((await jahresabschluss(anonReq('http://x/api/admin/jahresabschluss', 'POST'))).status).toBe(401);
    expect((await jahresabschluss(adminReq('http://x/api/admin/jahresabschluss', 'POST'))).status).toBe(201);
  });

  it('auszahlungslauf: ohne Cookie 401, mit Cookie 201', async () => {
    expect((await auszahlungslauf(anonReq('http://x/api/admin/auszahlungslauf', 'POST'))).status).toBe(401);
    expect((await auszahlungslauf(adminReq('http://x/api/admin/auszahlungslauf', 'POST'))).status).toBe(201);
  });

  it('schliessen: ohne Cookie 401, mit Cookie 200', async () => {
    const t = await createTestTraeger();
    await createTestEinrichtung({ slug: 'zu-schliessen', topfCent: 10_000n, traegerId: t.id });
    const ctx = { params: { slug: 'zu-schliessen' } };
    expect((await schliessen(anonReq('http://x/api/admin/einrichtungen/zu-schliessen/schliessen', 'POST'), ctx)).status).toBe(401);
    expect((await schliessen(adminReq('http://x/api/admin/einrichtungen/zu-schliessen/schliessen', 'POST'), ctx)).status).toBe(200);
  });
});
