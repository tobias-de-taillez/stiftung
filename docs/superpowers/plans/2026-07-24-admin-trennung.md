# Rollen-Trennung Public/Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `stiftung-web/` trennt öffentliches Spender-Frontend und passwortgeschütztes Admin-Interface; zwei Rollen (Normalo + Admin) sind parallel in getrennten Browser-Sessions steuerbar; Verifikation läuft als Antrag (public) → Genehmigung (admin).

**Architecture:** Signiertes httpOnly-Session-Cookie via Node `crypto` (keine neue Dependency). Alle Mutations-Routen ziehen unter `/api/admin/*` und tragen einen Handler-Guard `pruefeAdminSession` als erste Zeile (die maßgebliche Autorisierung — Middleware ist nur Redirect-Komfort). Buchungslogik unverändert; ein neuer Antragsfluss (`VerifikationsAntrag`) sitzt vor dem bestehenden `setzeVerifikation`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Prisma 6 + SQLite, Vitest (echte `prisma/test.db`), keine neuen Runtime-Dependencies.

**Branch:** `admin-trennung` (bereits angelegt, enthält die Design-Spec).

**Maßgebliche Spec:** `docs/superpowers/specs/2026-07-23-admin-trennung-design.md`.

## Global Constraints

Gelten für JEDEN Task:

- **Handler-Guard ist die Wahrheit.** Jeder `/api/admin/*`-Handler ruft `pruefeAdminSession(request)` als erste Zeile; ohne gültiges Cookie → `401 { error: 'nicht_angemeldet' }`. UI-Ausblendung und Middleware sind Komfort, nie die einzige Barriere.
- **Keine neuen Dependencies** (Runtime oder dev). Session-Krypto ausschließlich `node:crypto`.
- **Geld bleibt bigint in Cent** in allen Buchungspfaden; number nur an der API-Grenze via `serialisiere`. Feldnamen mit Geldwert enden auf `Cent`.
- **Buchungslogik unverändert:** `kaskadeService`, `marktService`, `auszahlungsService`, `kontenService.setManagementCap`, `lebenszyklusService` werden NICHT geändert — nur ihre Aufrufer (Routen) ziehen um und bekommen den Guard. `setzeVerifikation` bleibt die einzige Stelle, die Träger-Status schreibt.
- Farben nur `var(--token)`; eine Schriftfamilie; Du-Form in User-Copy; Charts/Tabellen beschriftet; jede Datenansicht mit Loading/Empty/Populated/Error (`loading.tsx` + `error.tsx` nach App-Router-Konvention).
- Backend-Tests gegen echte SQLite (`prisma/test.db`), kein DB-Mocking; DB-Suiten nutzen `resetDb()` aus `lib/server/__tests__/testDb.ts`. Route-Tests rufen den exportierten Handler direkt auf (kein HTTP-Server) — deshalb ist der Handler-Guard direkt testbar.
- Conventional Commits, deutsch. Nach jedem Task: `cd stiftung-web && npm run verify` (tsc + Tests + Build) Exit 0, dann committen. Niemals pushen ohne expliziten Auftrag.
- Env-Variablen `ADMIN_PASSWORT` und `ADMIN_SESSION_SECRET` müssen zur Testzeit gesetzt sein (via `vitest.config.ts`), sonst wirft `adminSession`.

## Interface-Vertrag (verbindlich, taskübergreifend)

```ts
// lib/server/adminSession.ts
export const ADMIN_COOKIE = 'admin_session';
export function erstelleSessionToken(): string;
export function pruefeSessionToken(token: string | undefined): boolean;
export function pruefePasswort(eingabe: string): boolean;
export function pruefeAdminSession(request: Request): boolean; // liest ADMIN_COOKIE aus dem Cookie-Header

// lib/server/verifikationsService.ts
export class TraegerNichtGefundenError extends Error {}
export class BereitsVerifiziertError extends Error {}
export class AntragOffenError extends Error {}
export class AntragNichtGefundenError extends Error {}
export class AntragBereitsEntschiedenError extends Error {}
export async function stelleAntrag(traegerId: string, daten: { rechtsform: Rechtsform; gemeinnuetzig: boolean }): Promise<{ antragId: string }>;
export async function offeneAntraege(): Promise<OffenerAntrag[]>; // serialisiert
export async function entscheideAntrag(antragId: string, entscheidung: 'genehmigt' | 'abgelehnt'): Promise<void>;

// lib/server/uebersichtService.ts (ergänzt)
export async function buchungsJournal(limit?: number): Promise<JournalEintrag[]>; // alle Buchungstypen, neueste zuerst, serialisiert
```

---

## Task 1: Session-Fundament — `lib/server/adminSession.ts`

**Files:**
- Create: `stiftung-web/lib/server/adminSession.ts`
- Modify: `stiftung-web/vitest.config.ts` (env ergänzen)
- Create: `stiftung-web/.env.example`
- Test: `stiftung-web/lib/server/__tests__/adminSession.test.ts`

**Interfaces:**
- Consumes: `node:crypto`, `process.env.ADMIN_PASSWORT`, `process.env.ADMIN_SESSION_SECRET`
- Produces: `ADMIN_COOKIE`, `erstelleSessionToken`, `pruefeSessionToken`, `pruefePasswort`, `pruefeAdminSession` (Signaturen s. Interface-Vertrag)

- [ ] **Step 1: vitest.config.ts erweitern**

Im `env`-Block ergänzen (neben `DATABASE_URL`):

```ts
    env: {
      DATABASE_URL: 'file:./test.db',
      ADMIN_PASSWORT: 'test-passwort',
      ADMIN_SESSION_SECRET: 'test-secret-mindestens-32-zeichen-lang!!',
    },
```

- [ ] **Step 2: .env.example anlegen**

```
# stiftung-web/.env.example
DATABASE_URL="file:./dev.db"
# Admin-Zugang (Spielgeld-Demo — vor jedem echten Einsatz ändern):
ADMIN_PASSWORT="wechselmich"
ADMIN_SESSION_SECRET="langer-zufalls-string-mindestens-32-zeichen"
```

Hinweis für den Executor: Falls `stiftung-web/.env` existiert, dort dieselben zwei Variablen ergänzen (git-ignoriert, damit `npm run dev` läuft) — aber `.env` NICHT committen.

- [ ] **Step 3: Failing Tests schreiben**

```ts
// stiftung-web/lib/server/__tests__/adminSession.test.ts
import { describe, it, expect } from 'vitest';
import { erstelleSessionToken, pruefeSessionToken, pruefePasswort, pruefeAdminSession, ADMIN_COOKIE } from '../adminSession';

describe('adminSession', () => {
  it('erstellt ein Token, das die eigene Prüfung besteht', () => {
    const token = erstelleSessionToken();
    expect(pruefeSessionToken(token)).toBe(true);
  });

  it('weist manipulierte, leere und fehlende Token ab', () => {
    expect(pruefeSessionToken(undefined)).toBe(false);
    expect(pruefeSessionToken('')).toBe(false);
    expect(pruefeSessionToken('admin.v1.123.gefälscht')).toBe(false);
    const echt = erstelleSessionToken();
    expect(pruefeSessionToken(echt + 'x')).toBe(false); // Signatur kippt
    expect(pruefeSessionToken('quatsch')).toBe(false);
  });

  it('pruefePasswort ist true nur beim exakten Passwort', () => {
    expect(pruefePasswort('test-passwort')).toBe(true);
    expect(pruefePasswort('falsch')).toBe(false);
    expect(pruefePasswort('')).toBe(false);
    expect(pruefePasswort('test-passwort ')).toBe(false); // kein Trim
  });

  it('pruefeAdminSession liest das Cookie aus dem Cookie-Header', () => {
    const token = erstelleSessionToken();
    const mitCookie = new Request('http://x/api/admin/x', { headers: { cookie: `${ADMIN_COOKIE}=${token}` } });
    const ohneCookie = new Request('http://x/api/admin/x');
    const falsch = new Request('http://x/api/admin/x', { headers: { cookie: `${ADMIN_COOKIE}=kaputt` } });
    const fremdesCookie = new Request('http://x/api/admin/x', { headers: { cookie: `anderes=abc; ${ADMIN_COOKIE}=${token}` } });
    expect(pruefeAdminSession(mitCookie)).toBe(true);
    expect(pruefeAdminSession(ohneCookie)).toBe(false);
    expect(pruefeAdminSession(falsch)).toBe(false);
    expect(pruefeAdminSession(fremdesCookie)).toBe(true); // findet das richtige Cookie zwischen anderen
  });
});
```

- [ ] **Step 4: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/adminSession.test.ts`
Expected: FAIL — „Cannot find module '../adminSession'"

- [ ] **Step 5: Implementierung**

```ts
// stiftung-web/lib/server/adminSession.ts
// Admin-Session (Design-Spec §1): signiertes httpOnly-Cookie, rein node:crypto,
// keine Dependency. Das Cookie ist Session-Scope (kein maxAge) → stirbt mit dem
// Browserfenster; zwei private Fenster ergeben zwei unabhängige Rollen.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'admin_session';
const PRAEFIX = 'admin.v1.';

function env(name: string): string {
  const wert = process.env[name];
  if (!wert) {
    // Kein stilles Leer-Secret: ein leeres Secret würde jeden Token akzeptieren.
    throw new Error(`${name} ist nicht gesetzt — Admin-Session nicht nutzbar.`);
  }
  return wert;
}

// Secret aus Session-Secret UND Passwort: eine Passwortänderung invalidiert
// automatisch alle bestehenden Sessions.
function secret(): string {
  return createHmac('sha256', env('ADMIN_SESSION_SECRET')).update(env('ADMIN_PASSWORT')).digest('hex');
}

function signiere(nutzlast: string): string {
  return createHmac('sha256', secret()).update(nutzlast).digest('base64url');
}

function sicherGleich(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function erstelleSessionToken(): string {
  const nutzlast = `${PRAEFIX}${Date.now()}`;
  return `${nutzlast}.${signiere(nutzlast)}`;
}

export function pruefeSessionToken(token: string | undefined): boolean {
  if (!token || !token.startsWith(PRAEFIX)) return false;
  const idx = token.lastIndexOf('.');
  if (idx <= PRAEFIX.length - 1) return false;
  const nutzlast = token.slice(0, idx);
  const signatur = token.slice(idx + 1);
  if (!nutzlast.startsWith(PRAEFIX) || signatur.length === 0) return false;
  return sicherGleich(signatur, signiere(nutzlast));
}

export function pruefePasswort(eingabe: string): boolean {
  return sicherGleich(eingabe, env('ADMIN_PASSWORT'));
}

export function pruefeAdminSession(request: Request): boolean {
  const header = request.headers.get('cookie');
  if (!header) return false;
  const treffer = header
    .split(';')
    .map((teil) => teil.trim())
    .find((teil) => teil.startsWith(`${ADMIN_COOKIE}=`));
  if (!treffer) return false;
  return pruefeSessionToken(treffer.slice(ADMIN_COOKIE.length + 1));
}
```

- [ ] **Step 6: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/adminSession.test.ts`
Expected: PASS (alle)

- [ ] **Step 7: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0.

```bash
git add stiftung-web/lib/server/adminSession.ts stiftung-web/lib/server/__tests__/adminSession.test.ts stiftung-web/vitest.config.ts stiftung-web/.env.example
git commit -m "feat(admin): Session-Fundament — signiertes httpOnly-Cookie via node:crypto"
```

---

## Task 2: Auth-Routen + Middleware

**Files:**
- Create: `stiftung-web/app/api/admin/login/route.ts`
- Create: `stiftung-web/app/api/admin/logout/route.ts`
- Create: `stiftung-web/middleware.ts`
- Test: `stiftung-web/app/api/admin/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `pruefePasswort`, `erstelleSessionToken`, `ADMIN_COOKIE` aus `@/lib/server/adminSession`
- Produces: `POST /api/admin/login`, `POST /api/admin/logout`, Middleware-Redirect für `/admin/*`

**Cookie-Attribute (verbindlich):** `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure: process.env.NODE_ENV === 'production'`, **kein** `maxAge`.

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/app/api/admin/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import { POST as login } from '../login/route';
import { POST as logout } from '../logout/route';
import { ADMIN_COOKIE, pruefeSessionToken } from '@/lib/server/adminSession';

function req(body: unknown): Request {
  return new Request('http://x/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function cookieAusResponse(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const m = setCookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

describe('POST /api/admin/login', () => {
  it('setzt bei korrektem Passwort ein gültiges Session-Cookie', async () => {
    const res = await login(req({ passwort: 'test-passwort' }));
    expect(res.status).toBe(200);
    const token = cookieAusResponse(res);
    expect(token).not.toBeNull();
    expect(pruefeSessionToken(token!)).toBe(true);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).not.toMatch(/Max-Age/i); // Session-Cookie
  });

  it('weist falsches Passwort mit 401 ab und setzt kein Cookie', async () => {
    const res = await login(req({ passwort: 'falsch' }));
    expect(res.status).toBe(401);
    expect(cookieAusResponse(res)).toBeNull();
  });

  it('weist fehlendes Passwort mit 401 ab', async () => {
    const res = await login(req({}));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/logout', () => {
  it('löscht das Cookie (Max-Age=0)', async () => {
    const res = await logout(new Request('http://x/api/admin/logout', { method: 'POST' }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(new RegExp(`${ADMIN_COOKIE}=`));
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run app/api/admin/__tests__/auth.test.ts`
Expected: FAIL — Module nicht gefunden

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { pruefePasswort, erstelleSessionToken, ADMIN_COOKIE } from '@/lib/server/adminSession';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.passwort !== 'string' || !pruefePasswort(body.passwort)) {
    return NextResponse.json({ error: 'falsches_passwort' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, erstelleSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    // kein maxAge → Session-Cookie, stirbt mit dem Browserfenster
  });
  return res;
}
```

```ts
// stiftung-web/app/api/admin/logout/route.ts
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/server/adminSession';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
```

```ts
// stiftung-web/middleware.ts
// Redirect-Komfort für /admin/* (verhindert das Aufblitzen einer Admin-Seite).
// Prüft NUR die Präsenz des Cookies, NICHT die Signatur — node:crypto ist im
// Edge-Runtime eingeschränkt; die maßgebliche Signaturprüfung leisten die
// Handler-Guards (pruefeAdminSession) und die RSC der Admin-Seiten.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/server/adminSession';

export function middleware(request: NextRequest) {
  const hatCookie = request.cookies.has(ADMIN_COOKIE);
  if (!hatCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // /admin/* schützen, aber die Login-Seite selbst ausnehmen.
  matcher: ['/admin/((?!login).*)'],
};
```

Hinweis für den Executor: `ADMIN_COOKIE` ist eine reine String-Konstante — ihr Import in die Middleware zieht `node:crypto` NICHT ins Edge-Bundle (Tree-Shaking über den benannten Export; die Krypto-Funktionen werden hier nicht aufgerufen). Falls der Build dennoch über `node:crypto` im Edge-Runtime klagt, die Konstante `'admin_session'` in der Middleware inline setzen (mit Kommentar) statt zu importieren.

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run app/api/admin/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0 (inkl. Build mit Middleware).

```bash
git add stiftung-web/app/api/admin/login stiftung-web/app/api/admin/logout stiftung-web/middleware.ts stiftung-web/app/api/admin/__tests__/auth.test.ts
git commit -m "feat(admin): Login/Logout-Routen und Middleware-Redirect für /admin"
```

---

## Task 3: Mutations-Routen nach `/api/admin/*` umziehen (mit Guard)

**Files:**
- Create: `stiftung-web/app/api/admin/marktjahr/route.ts`
- Create: `stiftung-web/app/api/admin/jahresabschluss/route.ts`
- Create: `stiftung-web/app/api/admin/auszahlungslauf/route.ts`
- Create: `stiftung-web/app/api/admin/cap/route.ts`
- Create: `stiftung-web/app/api/admin/einrichtungen/[slug]/schliessen/route.ts`
- Delete: `stiftung-web/app/api/simulation/marktjahr/`, `stiftung-web/app/api/simulation/jahresabschluss/`, `stiftung-web/app/api/auszahlungen/lauf/`, `stiftung-web/app/api/management/cap/`, `stiftung-web/app/api/einrichtungen/[slug]/schliessen/`
- Test: `stiftung-web/app/api/admin/__tests__/mutationsRouten.test.ts`

**Interfaces:**
- Consumes: `pruefeAdminSession` (Task 1); bestehende Services (`simuliereMarktjahr`, `fuehreKaskadeAus`, `auszahlungslauf`, `setManagementCap`/`kontenLage`, `schliesseEinrichtung`) — Logik unverändert übernehmen.

**Muster (verbindlich): Guard als erste Zeile jedes Handlers.**

```ts
if (!pruefeAdminSession(request)) {
  return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
}
```

Die inhaltliche Logik jeder Route wird 1:1 aus der alten Route übernommen (siehe Ist-Code: `cap` validiert `Number.isSafeInteger`; `schliessen` mappt `EinrichtungNichtGefundenError`→404, `EinrichtungGeschlossenError`→409; `marktjahr`/`jahresabschluss`/`auszahlungslauf` sind Body-lose POST-Wrapper mit Status 201). `schliessen` nimmt weiterhin `{ params: { slug } }`. Für `cap` und `schliessen` muss der Handler die `request` in der Signatur führen, damit der Guard sie lesen kann (die Body-losen Wrapper ebenfalls: `export async function POST(request: Request)`).

- [ ] **Step 1: Failing Tests** — pro Route zwei Fälle: „ohne Cookie → 401", „mit gültigem Cookie → erwarteter Erfolg". Beispiel für zwei Routen (Muster für alle fünf übernehmen):

```ts
// stiftung-web/app/api/admin/__tests__/mutationsRouten.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedKontenstand, seedWidmung, createTestTraeger, createTestEinrichtung } from '@/lib/server/__tests__/testDb';
import { erstelleSessionToken, ADMIN_COOKIE } from '@/lib/server/adminSession';
import { PUT as capPut } from '../cap/route';
import { POST as marktjahr } from '../marktjahr/route';
import { POST as jahresabschluss } from '../jahresabschluss/route';
import { POST as auszahlungslauf } from '../auszahlungslauf/route';
import { POST as schliessen } from '../einrichtungen/[slug]/schliessen/route';
import { prisma } from '@/lib/server/prismaClient';

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
```

- [ ] **Step 2:** Tests laufen lassen → FAIL (Module fehlen).

- [ ] **Step 3:** Die fünf neuen Handler schreiben (Guard-Zeile + 1:1-Logik der Alt-Routen), dann die fünf Alt-Verzeichnisse löschen. Beispiel `cap`:

```ts
// stiftung-web/app/api/admin/cap/route.ts
import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { setManagementCap, kontenLage } from '@/lib/server/kontenService';

export async function PUT(request: Request) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  const body = await request.json();
  const capCent = Number(body.capCent);
  if (!Number.isSafeInteger(capCent) || capCent < 0) {
    return NextResponse.json({ error: 'invalid_cap' }, { status: 400 });
  }
  await setManagementCap(BigInt(capCent));
  return NextResponse.json(await kontenLage());
}
```

`marktjahr`/`jahresabschluss`/`auszahlungslauf`: Guard + `return NextResponse.json(await <service>(), { status: 201 })`. `schliessen`: Guard + die bestehende try/catch-Logik mit 404/409-Mapping, Signatur `(request: Request, { params }: { params: { slug: string } })`.

- [ ] **Step 4:** Tests laufen lassen → PASS.

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add -A
git commit -m "feat(admin): Mutations-Routen nach /api/admin verschoben, Handler-Guard erzwingt Session"
```

---

## Task 4: Verifikations-Antragsfluss — Schema + Service

**Files:**
- Modify: `stiftung-web/prisma/schema.prisma` (Modell `VerifikationsAntrag` + `Traeger.antraege`)
- Create: `stiftung-web/lib/server/verifikationsService.ts`
- Modify: `stiftung-web/lib/server/__tests__/testDb.ts` (`resetDb` um `verifikationsAntrag` ergänzen)
- Test: `stiftung-web/lib/server/__tests__/verifikationsService.test.ts`

**Interfaces:**
- Consumes: `prisma`, `setzeVerifikation` aus `lebenszyklusService`, `RECHTSFORM_LABELS`/`auszahlungspfad`/`type Rechtsform` aus `@/lib/verrechnung/traeger`, `serialisiere`
- Produces: die 5 Fehlerklassen + `stelleAntrag`/`offeneAntraege`/`entscheideAntrag` (Interface-Vertrag)

- [ ] **Step 1: Schema ergänzen**

```prisma
model VerifikationsAntrag {
  id            String    @id @default(cuid())
  traegerId     String
  traeger       Traeger   @relation(fields: [traegerId], references: [id])
  rechtsform    String
  gemeinnuetzig Boolean
  status        String    @default("offen") // 'offen' | 'genehmigt' | 'abgelehnt'
  createdAt     DateTime  @default(now())
  entschiedenAm DateTime?
}
```

Und in `model Traeger` die Rückrelation ergänzen: `antraege VerifikationsAntrag[]`.

- [ ] **Step 2: resetDb ergänzen**

In `lib/server/__tests__/testDb.ts`, `resetDb()`, VOR `traeger.deleteMany()` (FK-Reihenfolge — Kind vor Elternteil):

```ts
  await prisma.verifikationsAntrag.deleteMany();
```

- [ ] **Step 3: Schema pushen**

```bash
cd stiftung-web && npm run db:push
```
Expected: „Your database is now in sync with your Prisma schema."

- [ ] **Step 4: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/verifikationsService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, createTestTraeger, createTestEinrichtung } from './testDb';
import {
  stelleAntrag, offeneAntraege, entscheideAntrag,
  BereitsVerifiziertError, AntragOffenError, AntragBereitsEntschiedenError, AntragNichtGefundenError, TraegerNichtGefundenError,
} from '../verifikationsService';

beforeEach(resetDb);

describe('verifikationsService', () => {
  it('stelleAntrag legt einen offenen Antrag an', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    const zeile = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(zeile.status).toBe('offen');
    expect(zeile.rechtsform).toBe('ggmbh');
  });

  it('lehnt Antrag für unbekannten Träger ab', async () => {
    await expect(stelleAntrag('gibt-es-nicht', { rechtsform: 'verein', gemeinnuetzig: true })).rejects.toThrow(TraegerNichtGefundenError);
  });

  it('lehnt Antrag ab, wenn der Träger bereits verifiziert ist', async () => {
    const t = await createTestTraeger({ verifiziert: true });
    await expect(stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true })).rejects.toThrow(BereitsVerifiziertError);
  });

  it('lehnt einen zweiten offenen Antrag ab', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await expect(stelleAntrag(t.id, { rechtsform: 'verein', gemeinnuetzig: false })).rejects.toThrow(AntragOffenError);
  });

  it('offeneAntraege listet nur offene, mit Träger und Einrichtungen', async () => {
    const t = await createTestTraeger({ verifiziert: false, name: 'Träger X' });
    await createTestEinrichtung({ slug: 'kita-x', name: 'Kita X', traegerId: t.id });
    await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    const liste = await offeneAntraege();
    expect(liste).toHaveLength(1);
    expect(liste[0].traegerName).toBe('Träger X');
    expect(liste[0].rechtsformLabel).toBe('gGmbH');
    expect(liste[0].einrichtungen.map((e) => e.slug)).toContain('kita-x');
  });

  it('Genehmigung verifiziert den Träger und übernimmt Rechtsform + gemeinnützig', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await entscheideAntrag(antragId, 'genehmigt');
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(true);
    expect(traeger.rechtsform).toBe('ggmbh');
    expect(traeger.gemeinnuetzig).toBe(true);
    const antrag = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(antrag.status).toBe('genehmigt');
    expect(antrag.entschiedenAm).not.toBeNull();
  });

  it('Ablehnung ändert den Träger nicht', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt' });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await entscheideAntrag(antragId, 'abgelehnt');
    const traeger = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(traeger.verifiziert).toBe(false);
    expect(traeger.rechtsform).toBe('unbekannt');
    const antrag = await prisma.verifikationsAntrag.findUniqueOrThrow({ where: { id: antragId } });
    expect(antrag.status).toBe('abgelehnt');
  });

  it('doppelte Entscheidung wirft', async () => {
    const t = await createTestTraeger({ verifiziert: false });
    const { antragId } = await stelleAntrag(t.id, { rechtsform: 'ggmbh', gemeinnuetzig: true });
    await entscheideAntrag(antragId, 'genehmigt');
    await expect(entscheideAntrag(antragId, 'abgelehnt')).rejects.toThrow(AntragBereitsEntschiedenError);
  });

  it('Entscheidung über unbekannten Antrag wirft', async () => {
    await expect(entscheideAntrag('gibt-es-nicht', 'genehmigt')).rejects.toThrow(AntragNichtGefundenError);
  });
});
```

- [ ] **Step 5:** Tests laufen lassen → FAIL.

- [ ] **Step 6: Implementierung**

```ts
// stiftung-web/lib/server/verifikationsService.ts
// Verifikations-Antragsfluss (Design-Spec §6): Public stellt Antrag, Admin
// entscheidet. setzeVerifikation bleibt die einzige Stelle, die den
// Träger-Status schreibt — die Genehmigung ruft sie.
import { prisma } from './prismaClient';
import { setzeVerifikation } from './lebenszyklusService';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export class TraegerNichtGefundenError extends Error {}
export class BereitsVerifiziertError extends Error {}
export class AntragOffenError extends Error {}
export class AntragNichtGefundenError extends Error {}
export class AntragBereitsEntschiedenError extends Error {}

export async function stelleAntrag(
  traegerId: string,
  daten: { rechtsform: Rechtsform; gemeinnuetzig: boolean }
): Promise<{ antragId: string }> {
  return prisma.$transaction(async (tx) => {
    const traeger = await tx.traeger.findUnique({ where: { id: traegerId } });
    if (!traeger) throw new TraegerNichtGefundenError(`Kein Träger ${traegerId}`);
    if (traeger.verifiziert) throw new BereitsVerifiziertError(`Träger ${traegerId} ist bereits verifiziert`);
    const offen = await tx.verifikationsAntrag.findFirst({ where: { traegerId, status: 'offen' } });
    if (offen) throw new AntragOffenError(`Träger ${traegerId} hat bereits einen offenen Antrag`);
    const antrag = await tx.verifikationsAntrag.create({
      data: { traegerId, rechtsform: daten.rechtsform, gemeinnuetzig: daten.gemeinnuetzig },
    });
    return { antragId: antrag.id };
  });
}

export async function offeneAntraege() {
  const antraege = await prisma.verifikationsAntrag.findMany({
    where: { status: 'offen' },
    orderBy: { createdAt: 'asc' },
    include: { traeger: { include: { einrichtungen: { select: { slug: true, name: true } } } } },
  });
  return serialisiere(
    antraege.map((a) => ({
      antragId: a.id,
      traegerId: a.traegerId,
      traegerName: a.traeger.name,
      einrichtungen: a.traeger.einrichtungen,
      rechtsform: a.rechtsform as Rechtsform,
      rechtsformLabel: RECHTSFORM_LABELS[a.rechtsform as Rechtsform] ?? a.rechtsform,
      gemeinnuetzig: a.gemeinnuetzig,
      createdAt: a.createdAt,
    }))
  );
}
export type OffenerAntrag = Awaited<ReturnType<typeof offeneAntraege>>[number];

export async function entscheideAntrag(antragId: string, entscheidung: 'genehmigt' | 'abgelehnt'): Promise<void> {
  const antrag = await prisma.verifikationsAntrag.findUnique({ where: { id: antragId } });
  if (!antrag) throw new AntragNichtGefundenError(`Kein Antrag ${antragId}`);
  if (antrag.status !== 'offen') throw new AntragBereitsEntschiedenError(`Antrag ${antragId} ist ${antrag.status}`);

  if (entscheidung === 'genehmigt') {
    // setzeVerifikation ist die einzige Stelle, die den Träger-Status schreibt.
    await setzeVerifikation(antrag.traegerId, {
      verifiziert: true,
      gemeinnuetzig: antrag.gemeinnuetzig,
      rechtsform: antrag.rechtsform as Rechtsform,
    });
  }
  await prisma.verifikationsAntrag.update({
    where: { id: antragId },
    data: { status: entscheidung, entschiedenAm: new Date() },
  });
}
```

- [ ] **Step 7:** Tests laufen lassen → PASS.

- [ ] **Step 8: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/prisma/schema.prisma stiftung-web/lib/server/verifikationsService.ts stiftung-web/lib/server/__tests__/testDb.ts stiftung-web/lib/server/__tests__/verifikationsService.test.ts
git commit -m "feat(admin): Verifikations-Antragsfluss — Schema, Service, Antrag→Genehmigung"
```

---

## Task 5: Verifikations-Routen (public Antrag + admin Entscheidung) + Journal-Lesefunktion

**Files:**
- Create: `stiftung-web/app/api/traeger/[id]/verifikation/antrag/route.ts` (public POST)
- Delete: `stiftung-web/app/api/traeger/[id]/verifikation/route.ts` (alter direkter Toggle)
- Create: `stiftung-web/app/api/admin/verifikation/antraege/route.ts` (admin GET)
- Create: `stiftung-web/app/api/admin/verifikation/antraege/[id]/route.ts` (admin POST Entscheidung)
- Modify: `stiftung-web/lib/server/uebersichtService.ts` (`buchungsJournal` ergänzen)
- Delete: `stiftung-web/app/api/traeger/[id]/verifikation/__tests__/` falls vorhanden (alter Toggle-Test)
- Test: `stiftung-web/app/api/admin/__tests__/verifikationRouten.test.ts`, ergänze `uebersichtService.test.ts` um `buchungsJournal`

**Interfaces:**
- Consumes: `stelleAntrag`/`offeneAntraege`/`entscheideAntrag` + Fehlerklassen (Task 4); `pruefeAdminSession` (Task 1); `RECHTSFORM_LABELS` für Rechtsform-Validierung; `buchungsJournal` neu in uebersichtService.

**Fehler-Mapping (verbindlich):**
- Antrag (public): `TraegerNichtGefundenError`→404 `traeger_nicht_gefunden`; `BereitsVerifiziertError`→409 `bereits_verifiziert`; `AntragOffenError`→409 `antrag_offen`; ungültige Rechtsform / `gemeinnuetzig` kein boolean →400.
- Entscheidung (admin): Guard→401; `AntragNichtGefundenError`→404; `AntragBereitsEntschiedenError`→409 `bereits_entschieden`; `entscheidung ∉ {genehmigt, abgelehnt}`→400.

- [ ] **Step 1: `buchungsJournal` in uebersichtService**

Ans Ende von `uebersichtService.ts` (nach `buchungsTicker`):

```ts
/**
 * Vollständiges Buchungsjournal für die Admin-Ansicht (alle Typen, nicht nur
 * die Ticker-sichtbaren). Neueste zuerst, id-Tiebreaker gegen ms-Kollisionen.
 */
export async function buchungsJournal(limit = 100) {
  const buchungen = await prisma.buchung.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: { einrichtung: { select: { name: true, slug: true } } },
  });
  return serialisiere(
    buchungen.map((b) => ({
      id: b.id,
      typ: b.typ,
      betragCent: b.betragCent,
      einrichtungName: b.einrichtung?.name ?? null,
      einrichtungSlug: b.einrichtung?.slug ?? null,
      createdAt: b.createdAt,
    }))
  );
}
export type JournalEintrag = Awaited<ReturnType<typeof buchungsJournal>>[number];
```

- [ ] **Step 2: Failing Tests** (Antrag-Route public, Entscheidungs-Routen admin, buchungsJournal). Kernfälle:

```ts
// stiftung-web/app/api/admin/__tests__/verifikationRouten.test.ts
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
```

Ergänze in `uebersichtService.test.ts` einen `buchungsJournal`-Test (nutzt bestehende Seed-Helfer + eine echte Buchung via `buche` oder eine Spende, prüft: neueste zuerst, alle Typen sichtbar).

- [ ] **Step 3:** Tests laufen lassen → FAIL.

- [ ] **Step 4: Implementierung**

```ts
// stiftung-web/app/api/traeger/[id]/verifikation/antrag/route.ts
// Public: Einrichtung/Träger beantragt Verifikation (Design-Spec §6).
import { NextResponse } from 'next/server';
import { stelleAntrag, TraegerNichtGefundenError, BereitsVerifiziertError, AntragOffenError } from '@/lib/server/verifikationsService';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  if (!Object.hasOwn(RECHTSFORM_LABELS, body.rechtsform) || body.rechtsform === 'unbekannt') {
    return NextResponse.json({ error: 'invalid_rechtsform' }, { status: 400 });
  }
  if (typeof body.gemeinnuetzig !== 'boolean') {
    return NextResponse.json({ error: 'invalid_gemeinnuetzig' }, { status: 400 });
  }
  try {
    const ergebnis = await stelleAntrag(params.id, { rechtsform: body.rechtsform as Rechtsform, gemeinnuetzig: body.gemeinnuetzig });
    return NextResponse.json(ergebnis, { status: 201 });
  } catch (err) {
    if (err instanceof TraegerNichtGefundenError) return NextResponse.json({ error: 'traeger_nicht_gefunden' }, { status: 404 });
    if (err instanceof BereitsVerifiziertError) return NextResponse.json({ error: 'bereits_verifiziert' }, { status: 409 });
    if (err instanceof AntragOffenError) return NextResponse.json({ error: 'antrag_offen' }, { status: 409 });
    throw err;
  }
}
```

```ts
// stiftung-web/app/api/admin/verifikation/antraege/route.ts
import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { offeneAntraege } from '@/lib/server/verifikationsService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  return NextResponse.json(await offeneAntraege());
}
```

```ts
// stiftung-web/app/api/admin/verifikation/antraege/[id]/route.ts
import { NextResponse } from 'next/server';
import { pruefeAdminSession } from '@/lib/server/adminSession';
import { entscheideAntrag, AntragNichtGefundenError, AntragBereitsEntschiedenError } from '@/lib/server/verifikationsService';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!pruefeAdminSession(request)) {
    return NextResponse.json({ error: 'nicht_angemeldet' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body.entscheidung !== 'genehmigt' && body.entscheidung !== 'abgelehnt') {
    return NextResponse.json({ error: 'invalid_entscheidung' }, { status: 400 });
  }
  try {
    await entscheideAntrag(params.id, body.entscheidung);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AntragNichtGefundenError) return NextResponse.json({ error: 'antrag_nicht_gefunden' }, { status: 404 });
    if (err instanceof AntragBereitsEntschiedenError) return NextResponse.json({ error: 'bereits_entschieden' }, { status: 409 });
    throw err;
  }
}
```

Dann die alte Route `app/api/traeger/[id]/verifikation/route.ts` (+ evtl. deren Test) löschen.

- [ ] **Step 5:** Tests laufen lassen → PASS.

- [ ] **Step 6: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add -A
git commit -m "feat(admin): Verifikations-Routen (public Antrag, admin Entscheidung) + Buchungsjournal-Leser"
```

---

## Task 6: Admin-UI — Layout, Login, Dashboard

**Files:**
- Create: `stiftung-web/app/admin/layout.tsx`
- Create: `stiftung-web/app/admin/login/page.tsx`
- Create: `stiftung-web/components/AdminLogin.tsx`
- Create: `stiftung-web/app/admin/page.tsx` (Dashboard, Server Component)
- Create: `stiftung-web/app/admin/loading.tsx`, `stiftung-web/app/admin/error.tsx`
- Create: `stiftung-web/components/KontenUebersicht.tsx` (aus SolidaritaetsfondsPanel extrahiert)
- Create: `stiftung-web/components/AdminAktionen.tsx` (die vier Operationen)
- Test: `stiftung-web/components/__tests__/AdminLogin.test.tsx`, `stiftung-web/components/__tests__/AdminAktionen.test.tsx`

**Interfaces:**
- Consumes: `kontenLage` (Server), neue `/api/admin/*`-Routen (Client), `KaskadenErgebnis`, `formatEuroFromCent`, `cookies()` aus `next/headers` + `pruefeSessionToken` (Layout-RSC-Guard).

**Akzeptanzkriterien:**
- `KontenUebersicht`: reine Präsentationskomponente `{ lage: KontenLage }` — die Tabelle (5 Konten + „davon durchlaufend" + Cap-Zeile + Poolwert-Fuß) 1:1 aus dem heutigen `SolidaritaetsfondsPanel` extrahiert, damit Public (nur lesen) und Admin (mit Aktionen) dieselbe Tabelle teilen. Keine Buttons darin.
- `AdminAktionen` (`'use client'`, `{ lage: KontenLage }`): die vier Operationen (Marktjahr → `/api/admin/marktjahr`; Jahresabschluss → `/api/admin/jahresabschluss`, rendert `KaskadenErgebnis`; Auszahlungslauf → `/api/admin/auszahlungslauf`; Cap-Edit → `/api/admin/cap`) — Logik/Copy aus dem heutigen Panel übernommen, nur die URLs zeigen auf `/api/admin/*`. `router.refresh()` nach jeder Aktion.
- `app/admin/layout.tsx` (Server Component): eigenes Layout mit Nav (Dashboard · Verifikation · Einrichtungen · Journal) + Logout-Button + sichtbares „Admin"-Badge. RSC-Guard: liest `cookies().get(ADMIN_COOKIE)`, prüft `pruefeSessionToken`; ungültig → `redirect('/admin/login')`. **Ausnahme:** Die Login-Seite darf NICHT im geschützten Layout hängen — entweder `login/` via Route-Group aus dem Layout nehmen, oder im Layout `if (pathname === '/admin/login') return children` (App-Router: Login als eigenes Segment ohne dieses Layout — sauberste Lösung: `app/admin/login/page.tsx` bekommt ein eigenes minimales Layout oder liegt bewusst so, dass der Guard sie nicht umleitet; da das `admin/layout.tsx` aber ALLE `/admin/*` umschließt, prüft der Guard `headers()`/den Pfad NICHT zuverlässig — daher: **Login-Seite rendert ihr eigenes `<AdminLogin/>` und der Layout-Guard lässt `/admin/login` durch, indem das Layout selbst KEINEN Redirect macht, sondern nur die Nav zeigt; der echte Schutz sind Middleware (leitet unangemeldet von allem außer /admin/login weg) + Handler-Guards**). Der Executor wählt die im Next-14-App-Router saubere Variante: `admin/login` als Route außerhalb der Guard-Logik (Middleware-Matcher nimmt `login` bereits aus; das Layout macht den Redirect nur, wenn Cookie fehlt UND nicht auf der Login-Seite — via `next/headers`-Pfadprüfung ist unzuverlässig, daher Redirect allein der Middleware überlassen und das Layout nur rendern). **Konkret:** Layout macht KEINEN eigenen Redirect (Middleware erledigt das); es rendert Nav + Badge + `children`. Die Login-Seite nutzt ein eigenes schlichtes Wrapper-Markup statt des Admin-Layouts, indem sie in einer Route-Group `app/admin/(auth)/login/` liegt — falls das zu viel Umbau ist, akzeptabel: Login rendert im Admin-Layout, zeigt aber nur das Formular (Nav-Links sind für Unangemeldete unschädlich, da alle Zielrouten wieder auf Login zurückleiten).
- `AdminLogin` (`'use client'`): Passwortfeld → `POST /api/admin/login`; Erfolg → `router.push('/admin')` + `router.refresh()`; 401 → Fehlbanner, Feld bleibt.
- `app/admin/page.tsx`: `<KontenUebersicht lage/>` + `<AdminAktionen lage/>`. Kein Soli-Spende-Feld (das bleibt public).

**Hinweis Layout/Login-Sauberkeit:** Empfohlen ist die Route-Group-Variante — `app/admin/(geschuetzt)/layout.tsx` umschließt Dashboard/Verifikation/Einrichtungen/Journal mit Nav+Badge; `app/admin/login/page.tsx` liegt außerhalb dieser Gruppe und hat kein Admin-Chrome. Middleware-Matcher `'/admin/((?!login).*)'` (aus Task 2) schützt genau die Gruppe, nicht Login. Das ist die sauberste Trennung; der Executor setzt sie so um.

- [ ] **Step 1:** Komponententests schreiben (failing): `AdminLogin` (Erfolg setzt Redirect-Mock / 401 zeigt Banner, `fetch`-Stub, `next/navigation`-Mock), `AdminAktionen` (Buttons posten auf die `/api/admin/*`-URLs — via `fetch`-Stub asserten; Marktjahr-Zeile, Kaskaden-Ergebnis-Render, Cap-PUT; reduced-motion-Stub + `next/navigation`-Mock wie in `SolidaritaetsfondsPanel.test`).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `KontenUebersicht` extrahieren, `AdminAktionen` + `AdminLogin` + Layout(-Gruppe) + Login-Seite + Dashboard + loading/error bauen.
- [ ] **Step 4:** PASS. Browser-Smoke: `npm run dev`, `/admin` ohne Cookie → Redirect `/admin/login`; Login mit `test-passwort`… (Dev nutzt `.env` — dort echtes Passwort) → Dashboard; Aktionen funktionieren.
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add -A
git commit -m "feat(admin): Admin-Layout, Login und Dashboard mit Kontenübersicht + Operationen"
```

---

## Task 7: Admin-UI — Verifikation, Einrichtungen, Journal

**Files:**
- Create: `stiftung-web/app/admin/(geschuetzt)/verifikation/page.tsx` + `loading.tsx`/`error.tsx`
- Create: `stiftung-web/components/VerifikationQueue.tsx`
- Create: `stiftung-web/app/admin/(geschuetzt)/einrichtungen/page.tsx` + `loading.tsx`/`error.tsx`
- Create: `stiftung-web/components/AdminEinrichtungenListe.tsx` (mit Schließen-Aktion)
- Create: `stiftung-web/app/admin/(geschuetzt)/journal/page.tsx` + `loading.tsx`/`error.tsx`
- Test: `stiftung-web/components/__tests__/VerifikationQueue.test.tsx`, `stiftung-web/components/__tests__/AdminEinrichtungenListe.test.tsx`

(Pfade in der Route-Group `(geschuetzt)` gemäß Task 6; falls Task 6 die Nicht-Gruppen-Variante gewählt hat, entsprechend unter `app/admin/…`.)

**Interfaces:**
- Consumes: `offeneAntraege` + Trägerliste (Server), `POST /api/admin/verifikation/antraege/[id]` (Client); `listEinrichtungenMitTopf` (Server, inkl. Filter geschlossen) + `POST /api/admin/einrichtungen/[slug]/schliessen` (Client); `buchungsJournal` (Server).

**Akzeptanzkriterien:**
- **Verifikation** (`/admin/verifikation`): Server-Page lädt `offeneAntraege()` + alle Träger (`prisma.traeger.findMany` mit Einrichtungen). `VerifikationQueue` (`'use client'`): pro offenem Antrag Träger, Einrichtungen, vorgeschlagene Rechtsform (Label), gemeinnützig-Flag, „Genehmigen"/„Ablehnen" → POST → `router.refresh()`. Empty-State „Keine offenen Anträge." Darunter Trägerliste mit aktuellem Status (verifiziert-Chip + Rechtsform).
- **Einrichtungen** (`/admin/einrichtungen`): Liste aller offenen Einrichtungen (`listEinrichtungenMitTopf`) mit Topfwert, Status, Auszahlungspfad; Schließen-Button je Zeile mit Bestätigungsdialog (aus TraegerPanel übernommen: „Der gesamte Topf — X € — geht in den Solidaritätsfonds über. Das lässt sich nicht rückgängig machen.") → `POST /api/admin/einrichtungen/[slug]/schliessen` → `router.refresh()`.
- **Journal** (`/admin/journal`): `buchungsJournal()` als beschriftete Tabelle (Datum, Typ-Label, Einrichtung, Betrag). Typ-Labels wie in der Detailseite (`BUCHUNGS_LABELS` — als gemeinsame Konstante nach `lib/data/` ziehen ODER lokal wiederholen; Executor entscheidet, aber wenn beide Orte sie brauchen, gehört sie in ein geteiltes Modul). Empty-State „Noch keine Buchungen." Für die Demo reicht „neueste 100" (Default von `buchungsJournal`).
- Alle drei Seiten: Loading/Empty/Error-Zustände.

- [ ] **Step 1:** Komponententests (failing): `VerifikationQueue` (Antrag rendern, Genehmigen postet auf die richtige URL, Empty-State), `AdminEinrichtungenListe` (Schließen-Bestätigung + POST-URL). `fetch`-Stub, `next/navigation`-Mock.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Seiten + Komponenten bauen.
- [ ] **Step 4:** PASS. Browser-Smoke der Warteschlange (siehe Task 8-Demo).
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add -A
git commit -m "feat(admin): Verifikations-Warteschlange, Einrichtungsverwaltung und Buchungsjournal"
```

---

## Task 8: Public entschärfen — Fonds-Panel + TraegerPanel + Verweise

**Files:**
- Modify: `stiftung-web/components/SolidaritaetsfondsPanel.tsx` (Aktionen raus, `KontenUebersicht` einsetzen, Soli-Spende bleibt)
- Modify: `stiftung-web/components/TraegerPanel.tsx` (Toggle + Schließen raus, Antragsformular rein)
- Create: `stiftung-web/components/VerifikationAntragForm.tsx`
- Modify: `stiftung-web/app/einrichtungen/[slug]/page.tsx` (TraegerPanel-Props: offener-Antrag-Status ergänzen)
- Modify: `stiftung-web/lib/server/uebersichtService.ts` (`einrichtungDetail` liefert `offenerAntrag: boolean`)
- Test: umschreiben `stiftung-web/components/__tests__/SolidaritaetsfondsPanel.test.tsx`, `stiftung-web/components/__tests__/TraegerPanel.test.tsx` (falls vorhanden; sonst neu für das Antragsformular), ergänze `uebersichtService.test.ts`

**Interfaces:**
- `einrichtungDetail` ergänzt Feld `offenerAntrag: boolean` (ob ein `VerifikationsAntrag` mit `status:'offen'` für den Träger existiert).
- `TraegerPanel` neue Props: `offenerAntrag: boolean`; entfällt: keine Schließen/Toggle-Logik mehr.

**Akzeptanzkriterien:**
- **SolidaritaetsfondsPanel:** rendert `<KontenUebersicht lage/>` + Soli-Spende-Formular (bleibt public — Spenden ist die niedrige Hürde). **Entfernt:** Marktjahr-, Jahresabschluss-, Auszahlungslauf-Buttons, Cap-Edit, `KaskadenErgebnis`-Import. Die Fonds-Seite bleibt sonst unverändert (Hero + Erklär-Prosa).
- **TraegerPanel:** zeigt weiter Träger, Status-Chips, Auszahlungspfad-Erklärung und (bei unverifiziert) den §3.4-Hinweis. **Entfernt:** „Zugang abholen (KYC simulieren)"-Toggle mit direkter Verifikation, „Einrichtung schließen"-Button + Bestätigung. **Neu:** bei `!verifiziert && !offenerAntrag` das `VerifikationAntragForm`; bei `!verifiziert && offenerAntrag` der Hinweis „Antrag in Prüfung — ein Admin entscheidet."; bei `verifiziert` der bestehende „Zugang abgeholt"-Chip.
- **VerifikationAntragForm** (`'use client'`, `{ traegerId, slug }`): Rechtsform-Auswahl (`RECHTSFORM_LABELS` ohne `unbekannt`) + gemeinnützig-Checkbox → `POST /api/traeger/[id]/verifikation/antrag` → bei 201 `router.refresh()` (zeigt dann „Antrag in Prüfung"); Fehlbanner bei 409/400 mit sprechendem Text.
- Die öffentliche Nav bleibt ohne Admin-Link.

- [ ] **Step 1:** Tests umschreiben (failing): `SolidaritaetsfondsPanel` ohne Admin-Buttons (assert: kein „Jahresabschluss"-Button, Soli-Spende bleibt); `VerifikationAntragForm`/`TraegerPanel` (Antragsformular bei unverifiziert-ohne-Antrag; „in Prüfung" bei offenem Antrag; POST-URL/-Body; kein Schließen-Button mehr); `uebersichtService.test` um `offenerAntrag` ergänzen.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `einrichtungDetail` um `offenerAntrag` ergänzen; Panels umbauen; Antragsformular bauen; Detailseite-Props nachziehen.
- [ ] **Step 4:** PASS. Browser-Smoke: Public-Detailseite hat keinen Schließen-Button; Fonds-Seite hat keine Admin-Aktionen.
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add -A
git commit -m "feat(public): Fonds-Panel und Trägerpanel entschärft — nur noch Lesen, Spenden und Antrag"
```

---

## Task 9: End-to-End-Verdrahtung, Doku, Abschluss

**Files:**
- Modify: `CLAUDE.md` (Admin-Zugang + Kommandos), `projekt-status.md` (Rollen-Trennung als erledigt), `stiftung-web/README.md` (Env-Variablen, Admin-Bereich, Zwei-Fenster-Demo), `docs/dokumenten-inventar.md` (Spec eintragen)
- Verify only: Gesamtlauf

- [ ] **Step 1: Volle Verifikation + Zwei-Fenster-Smoke.**

```bash
cd stiftung-web && npm run db:push && npm run db:seed && npm run verify
```
Expected: Exit 0.

Manuelle Zwei-Fenster-Demo (dokumentieren, nicht automatisieren): Privates Fenster A (kein Cookie) = Normalo — bei einer unverifizierten Einrichtung „Zugang abholen" beantragen. Privates Fenster B = Admin (`/admin/login`) — Antrag in `/admin/verifikation` sehen, genehmigen. Fenster A neu laden → „Zugang abgeholt", Verwendungsart B wird im Spendenrechner wählbar. Zusätzlich: Admin löst Marktjahr + Jahresabschluss aus; Normalo sieht die aktualisierte Kontenlage/Statistik (nur lesen), hat aber keine dieser Aktionen.

- [ ] **Step 2: Grep-Beweis, dass keine öffentliche Route mehr mutiert.**

`grep -rn` über `app/api/` (außer `app/api/admin/`) nach den verschobenen Endpunkten — es darf keine `simulation/marktjahr`, `simulation/jahresabschluss`, `auszahlungen/lauf`, `management/cap`, `einrichtungen/[slug]/schliessen`, `traeger/[id]/verifikation` (alter Toggle) mehr geben. Öffentlich bleiben nur: GETs, `POST /api/einrichtungen`, `POST /api/einrichtungen/[slug]/spenden`, `POST /api/solidaritaetsfonds/spenden`, `POST /api/traeger/[id]/verifikation/antrag`.

- [ ] **Step 3: Doku.**
  - `CLAUDE.md`: Unter „Kommandos" die zwei neuen Env-Variablen erwähnen; unter „Hinweise" den Admin-Bereich (`/admin`, Passwort aus `.env`) + Zwei-Fenster-Demo-Muster kurz dokumentieren.
  - `projekt-status.md`: Neuer Abschnitt „Rollen-Trennung Public/Admin umgesetzt" (Session-Cookie, `/admin`-Bereich, Antrag→Genehmigung-Fluss, was public/was admin ist). Offene Punkte ehrlich: kein User-Modell, kein Rate-Limit/CSRF, kein Träger-Portal (Phase 2).
  - `stiftung-web/README.md`: Env-Setup (`.env` aus `.env.example`), Admin-Bereich, Zwei-Fenster-Demo als Test-Rezept.
  - `docs/dokumenten-inventar.md`: Design-Spec `2026-07-23-admin-trennung-design.md` als geltend eintragen.

- [ ] **Step 4: Commit.**

```bash
git add -A
git commit -m "docs: Rollen-Trennung dokumentiert — Admin-Zugang, Zwei-Fenster-Demo"
```

- [ ] **Step 5 (Human-Gate):** Branch fertig. KEIN Push, KEIN Merge ohne expliziten Auftrag. Whole-Branch-Review anbieten, dann Merge/PR auf Zuruf.

---

## Offene Punkte (bewusst nicht in diesem Plan)

| Punkt | Warum offen |
|---|---|
| Echtes Auth / User-Modell | Spielgeld-Rahmen; erst bei realem Deployment |
| Rate-Limit, CSRF-Token | Spielgeld-Demo; sameSite=lax + same-origin genügt lokal |
| Träger-Portal (eigenes Login) | Phase 2; hier stellt das Spender-Frontend den Antrag |
| Live-Sync zwischen den Fenstern | YAGNI — Reload holt den Stand |
| Journal-Pagination | Demo: neueste 100; erst bei Bedarf |

## Self-Review-Protokoll (vom Planenden ausgeführt)

1. **Spec-Abdeckung:** §1 Session → Task 1; §2 Env → Task 1; §3 Auth-Routen → Task 2; §4 Middleware → Task 2; §5 Routen-Umzug → Task 3; §6 Antragsfluss → Task 4+5; §7 UI (Admin) → Task 6+7, (Public) → Task 8; §8 Demo-Datenfluss → Task 9; Fehlerbehandlung → über alle Routen-Tasks; Tests → jede Task; Nicht-Ziele → Tabelle oben.
2. **Placeholder-Scan:** keine TBD; jeder Rechen-/Krypto-Pfad hat vollständigen Code; UI-Tasks haben Kontrakte + Copy. Der Layout/Login-Sauberkeitspunkt (Task 6) ist als klare Empfehlung (Route-Group) mit zulässiger Rückfalloption formuliert — keine offene Frage.
3. **Typ-Konsistenz:** `ADMIN_COOKIE`/`pruefeAdminSession`/`erstelleSessionToken`/`pruefeSessionToken`/`pruefePasswort` in Task 1 definiert, in 2/3/5/6 identisch verwendet; `stelleAntrag`/`offeneAntraege`/`entscheideAntrag` + Fehlerklassen in Task 4 definiert, in 5 gemappt; `KontenLage` (bestehend) in KontenUebersicht/AdminAktionen; `buchungsJournal` in Task 5 definiert, in Task 7 konsumiert; `offenerAntrag` in Task 8 durchgängig.

**Plan-Ende.**
