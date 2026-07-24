# Rollen-Trennung: Public-Frontend vs. Admin-Interface — Design

**Stand:** 2026-07-23 · **Status:** Entwurf (abgestimmt, noch nicht implementiert)

Trennt die heute vermischte `stiftung-web/`-Oberfläche in ein öffentliches
Spender-Frontend und ein passwortgeschütztes Admin-Interface. Zwei simulierte
Rollen — Normalo und Admin — sind parallel in getrennten Browser-Sessions
steuerbar (zwei private Fenster teilen keinen Cookie-Store).

## Geltungsbereich

Dieses Design regelt **Zugang und Oberfläche**: Session-Rollen, welche
Aktionen wo leben, den Verifikations-Antragsfluss. Es ändert **keine**
Buchungslogik — alle Services aus dem Verrechnungsmodell-Umbau
(`docs/verrechnungsmodell.md`) bleiben unangetastet; sie werden nur hinter
einen Admin-Guard gestellt bzw. um einen Antragsschritt ergänzt.

## Motivation

Nach dem Verrechnungsmodell-Umbau (Branch `verrechnungsmodell-umbau`, gemerged)
liegen operative Eingriffe mitten im öffentlichen UI: Jeder Besucher kann einen
Jahresabschluss auslösen, ein Marktjahr simulieren, den Cap ändern, eine
Einrichtung schließen oder per Toggle „verifizieren". Für die Demo war das
zulässig, ist aber sachlich falsch: Ein Spender darf keine Kaskade auslösen und
keine Einrichtung schließen. Die Leitbild-Regel **„niedrige Hürde zum Geben,
hohe Hürde zum Nehmen"** verlangt genau diese Trennung.

## Kernentscheidungen (abgestimmt 2026-07-23)

| Frage | Entscheidung |
|---|---|
| Admin-Zugang | **Passwort-Gate** — festes `ADMIN_PASSWORT` aus `.env`, signiertes Session-Cookie |
| Admin-Layout | **Eigener `/admin`-Bereich** mit eigenem Layout + Nav |
| Public-Transparenz | **Alles lesbar** — Kontenlage, Journal, Historie öffentlich; nur Auslösen ist Admin |
| KYC-Flow | **Antrag + Genehmigung** — Public stellt Antrag, Admin entscheidet |
| Session-Technik | **Ansatz A** — signiertes httpOnly-Cookie via Node `crypto` (keine neue Dependency) |

## Nicht-Ziele (bewusst ausgeklammert)

- **Kein User-Modell.** Eine Rolle, ein geteiltes Admin-Passwort — keine
  Accounts, keine Registrierung, kein Passwort-Hash pro Nutzer.
- **Kein Träger-Portal.** Das dritte Interface (Einrichtung holt Zugang ab,
  verwaltet Förderguthaben, reicht Belege ein) ist Phase 2. Hier wird der
  Antrag im Spender-Frontend gestellt, nicht in einem eigenen Träger-Login.
- **Kein Live-Sync zwischen den zwei Fenstern.** Der Admin genehmigt, der
  Normalo lädt neu und sieht das Ergebnis. Kein WebSocket, kein Polling.
- **Keine Härtung über den Spielgeld-Rahmen hinaus:** kein Rate-Limit, kein
  CSRF-Token (sameSite=lax + same-origin-Formulare decken die Demo), Passwort
  im Klartext in `.env`. Vor jedem echten Deployment neu zu bewerten.

## Architektur

### 1. Session-Mechanik — `lib/server/adminSession.ts`

Rein stdlib (`node:crypto`), keine Dependency.

**Token-Format:** `admin.v1.<issuedAtMs>.<hmacBase64url>`, wobei
`hmac = HMAC-SHA256(secret, "admin.v1." + issuedAtMs)`. `secret` wird aus
`ADMIN_SESSION_SECRET` **und** `ADMIN_PASSWORT` abgeleitet
(`HMAC(ADMIN_SESSION_SECRET, ADMIN_PASSWORT)`), sodass eine Passwortänderung
alle Alt-Sessions ungültig macht. Verifikation mit `crypto.timingSafeEqual`
(längengleiche Buffer, sonst sofort `false`).

**Kein Ablauf-Timestamp erzwungen** — die Session lebt so lange wie das
Cookie, und das Cookie ist Session-Scope (kein `maxAge`/`expires`), stirbt also
mit dem Browserfenster. `issuedAtMs` ist nur informativ.

**Exporte:**

```ts
export function erstelleSessionToken(): string;
export function pruefeSessionToken(token: string | undefined): boolean;
export function pruefePasswort(eingabe: string): boolean; // timingSafeEqual gegen ADMIN_PASSWORT
export const ADMIN_COOKIE = 'admin_session';
```

**Cookie-Attribute beim Setzen:** `httpOnly`, `sameSite: 'lax'`, `path: '/'`,
`secure` in Produktion (`process.env.NODE_ENV === 'production'`), **kein**
`maxAge` → Session-Cookie.

**Guard:** `pruefeAdminSession(request: Request): boolean` liest das Cookie aus
dem `Cookie`-Header und ruft `pruefeSessionToken`. Er ist die **erste Zeile
jedes** `/api/admin/*`-Handlers. Grund: Die Backend-Tests rufen Route-Handler
direkt auf (kein HTTP-Server, keine Middleware) — die Middleware allein wäre
untestbar und wäre reine UI-Kosmetik. Der Handler-Guard ist die maßgebliche
Autorisierung.

### 2. Env-Konfiguration

`.env.example` dokumentiert (echte Werte in git-ignoriertem `.env`):

```
ADMIN_PASSWORT="wechselmich"
ADMIN_SESSION_SECRET="langer-zufalls-string-min-32-zeichen"
```

`vitest.config.ts` setzt beide im `env`-Block auf feste Test-Werte, damit
Session-Tests deterministisch laufen. Fehlt eine Variable zur Laufzeit, wirft
`adminSession` beim ersten Zugriff einen klaren Fehler (kein stilles Leer-Secret
— ein leeres Secret würde jeden Token akzeptieren).

### 3. Auth-Routen

| Route | Methode | Body | Verhalten |
|---|---|---|---|
| `/api/admin/login` | POST | `{ passwort }` | richtig → Set-Cookie + 200 `{ ok: true }`; falsch → 401 `{ error: 'falsches_passwort' }` |
| `/api/admin/logout` | POST | — | Cookie löschen (maxAge 0) + 200 |

### 4. Middleware — `stiftung-web/middleware.ts`

`matcher: ['/admin/:path*']` **ausgenommen** `/admin/login`. Ohne gültiges
Cookie → Redirect auf `/admin/login`. Reiner Komfort (verhindert das kurze
Aufblitzen einer Admin-Seite); die Autorisierung selbst leisten die
Handler-Guards. Die Middleware ruft **nicht** `adminSession` mit Node-`crypto`
auf, falls das Edge-Runtime-Probleme macht — sie prüft nur *Präsenz* des
Cookies und delegiert die Signaturprüfung an die Seite/den Handler. (Node
`crypto` ist im Edge-Runtime eingeschränkt; die bloße Präsenzprüfung reicht für
den Redirect-Komfort, die echte Prüfung passiert serverseitig im Handler/RSC.)

### 5. Routen-Umzug (Logik unverändert, nur Pfad + Guard)

Diese heute öffentlichen Mutations-Routen ziehen unter `/api/admin/` und
erhalten `pruefeAdminSession` als erste Zeile:

| alt | neu |
|---|---|
| `POST /api/simulation/marktjahr` | `POST /api/admin/marktjahr` |
| `POST /api/simulation/jahresabschluss` | `POST /api/admin/jahresabschluss` |
| `POST /api/auszahlungen/lauf` | `POST /api/admin/auszahlungslauf` |
| `PUT /api/management/cap` | `PUT /api/admin/cap` |
| `POST /api/einrichtungen/[slug]/schliessen` | `POST /api/admin/einrichtungen/[slug]/schliessen` |

Der alte direkte Verifikations-Endpoint `POST /api/traeger/[id]/verifikation`
**entfällt** und wird durch den Antragsfluss (Abschnitt 6) ersetzt.

**Öffentlich bleiben unverändert:** alle GET-Routen (`einrichtungen`,
`einrichtungen/[slug]`, `solidaritaetsfonds`, `statistik`, `spenden/letzte`,
`erstbefuellung`), `POST /api/einrichtungen` (Anlage bei Erstspende),
`POST /api/einrichtungen/[slug]/spenden`, `POST /api/solidaritaetsfonds/spenden`.
Spenden ist die niedrige Hürde — bleibt public.

### 6. Verifikations-Antragsfluss

**Datenmodell** (Prisma, additiv):

```prisma
model VerifikationsAntrag {
  id            String   @id @default(cuid())
  traegerId     String
  traeger       Traeger  @relation(fields: [traegerId], references: [id])
  rechtsform    String   // vorgeschlagene Rechtsform (Rechtsform-Union)
  gemeinnuetzig Boolean
  status        String   @default("offen") // 'offen' | 'genehmigt' | 'abgelehnt'
  createdAt     DateTime @default(now())
  entschiedenAm DateTime?
}
```

`Traeger` erhält die Rückrelation `antraege VerifikationsAntrag[]`.

**Service** — `lib/server/verifikationsService.ts`:

```ts
export class TraegerNichtGefundenError extends Error {}
export class BereitsVerifiziertError extends Error {}
export class AntragOffenError extends Error {}
export class AntragNichtGefundenError extends Error {}
export class AntragBereitsEntschiedenError extends Error {}

export async function stelleAntrag(traegerId: string, daten: {
  rechtsform: Rechtsform; gemeinnuetzig: boolean;
}): Promise<{ antragId: string }>;
// wirft BereitsVerifiziert, wenn traeger.verifiziert; AntragOffen, wenn schon ein 'offen'-Antrag existiert.

export async function offeneAntraege(): Promise<Array<{
  antragId: string; traegerId: string; traegerName: string;
  einrichtungen: { slug: string; name: string }[];
  rechtsform: Rechtsform; rechtsformLabel: string; gemeinnuetzig: boolean; createdAt: Date;
}>>; // serialisiert

export async function entscheideAntrag(antragId: string, entscheidung: 'genehmigt' | 'abgelehnt'): Promise<void>;
// genehmigt → ruft setzeVerifikation(traegerId, { verifiziert: true, gemeinnuetzig, rechtsform });
// setzt status + entschiedenAm; wirft AntragBereitsEntschieden bei erneutem Aufruf.
```

`setzeVerifikation` (aus `lebenszyklusService`) bleibt die einzige Stelle, die
den Träger-Status schreibt — der Antrag ruft sie, ersetzt sie nicht.

**Routen:**

| Route | Auth | Body | Verhalten |
|---|---|---|---|
| `POST /api/traeger/[id]/verifikation/antrag` | **public** | `{ rechtsform, gemeinnuetzig }` | 201 `{ antragId }`; 404 `traeger_nicht_gefunden`; 409 `bereits_verifiziert` / `antrag_offen`; 400 bei ungültiger Rechtsform |
| `GET /api/admin/verifikation/antraege` | admin | — | Liste offener Anträge |
| `POST /api/admin/verifikation/antraege/[id]` | admin | `{ entscheidung }` | 200; 404 `antrag_nicht_gefunden`; 409 `bereits_entschieden`; 400 bei ungültiger Entscheidung |

### 7. UI

#### Admin-Bereich (`app/admin/`)

- `app/admin/layout.tsx` — eigenes Layout: Nav (Dashboard · Verifikation ·
  Einrichtungen · Journal · Logout-Button), sichtbares „Admin"-Badge, damit
  klar ist, in welcher Rolle das Fenster steckt. Server Component; liest die
  Session per RSC (`cookies()` + `pruefeSessionToken`) und rendert bei
  fehlender Session nichts Sensibles (Middleware hat ohnehin schon
  umgeleitet — doppelter Boden).
- `app/admin/login/page.tsx` — Passwort-Formular → `POST /api/admin/login` →
  bei Erfolg `router.push('/admin')` + `router.refresh()`. Fehlbanner bei 401.
- `app/admin/page.tsx` — **Dashboard**: Kontenübersicht (die aus dem heutigen
  `SolidaritaetsfondsPanel` extrahierte Tabelle als eigene Komponente
  `KontenUebersicht`) + die vier operativen Aktionen (Marktjahr,
  Jahresabschluss → rendert `KaskadenErgebnis`, Auszahlungslauf, Cap-Edit).
  Ruft die neuen `/api/admin/*`-Routen.
- `app/admin/verifikation/page.tsx` — Antrags-Warteschlange (offene Anträge mit
  Träger, Einrichtungen, vorgeschlagener Rechtsform, gemeinnützig-Flag;
  Genehmigen/Ablehnen-Buttons) + darunter die Trägerliste mit aktuellem Status.
- `app/admin/einrichtungen/page.tsx` — Einrichtungsliste (inkl. geschlossener,
  markiert) mit Schließen-Aktion (Bestätigungsdialog von heute) → neue
  Admin-Schließen-Route.
- `app/admin/journal/page.tsx` — volles Buchungsjournal, neue Lesefunktion
  `buchungsJournal(filter?)` in `uebersichtService` (alle `Buchung`-Zeilen,
  neueste zuerst, optional nach Typ gefiltert; Typ-Labels wie in der
  Transparenz-Karte).

Jede Admin-Seite mit Daten behält Loading/Empty/Error (`loading.tsx`/`error.tsx`
nach App-Router-Konvention).

#### Public-Bereich (aktionsfrei außer Spenden)

- `app/solidaritaetsfonds/page.tsx` + `SolidaritaetsfondsPanel` — behält
  Fondswert-Hero, `KontenUebersicht` (lesen), Soli-Spende-Formular. **Entfernt:**
  Marktjahr-, Jahresabschluss-, Auszahlungslauf-Buttons und Cap-Inline-Edit.
  `KaskadenErgebnis` wird hier nicht mehr gerendert (zieht ins Admin-Dashboard).
- `app/einrichtungen/[slug]/page.tsx` + `TraegerPanel` — der KYC-Toggle und der
  Schließen-Button entfallen. Stattdessen: Status-Chips (wie heute) plus, wenn
  unverifiziert und kein offener Antrag, ein **„Zugang abholen"-Formular**
  (Rechtsform-Auswahl aus `RECHTSFORM_LABELS` + gemeinnützig-Checkbox) →
  `POST …/verifikation/antrag`. Bei offenem Antrag: Hinweis „Antrag in Prüfung".
  Bei verifiziert: „Zugang abgeholt".
- Die Nav des öffentlichen Layouts bekommt **keinen** sichtbaren Admin-Link
  (unverlinkt erreichbar über `/admin`); Spielgeld-Rahmen.

### 8. Datenfluss der Zwei-Fenster-Demo

```
Fenster 1 (privat, kein Cookie = Normalo)          Fenster 2 (privat, Admin-Cookie)
──────────────────────────────────────────         ────────────────────────────────
Einrichtung-Detailseite                             /admin/login → Passwort → /admin
  „Zugang abholen" (Rechtsform, gemeinnützig)
  → POST …/verifikation/antrag  ──────────────►     /admin/verifikation
                                                       sieht neuen Antrag in der Queue
                                                       „Genehmigen"
                                                       → POST …/antraege/[id] {genehmigt}
                                                       → setzeVerifikation(...)
  Reload der Detailseite  ◄───────────────────────
  sieht „Zugang abgeholt", Verwendungsart B wählbar
```

Kein Push — der Reload im Normalo-Fenster holt den neuen Stand. Das ist der
didaktische Kern: „hohe Hürde zum Nehmen" wird als getrennte Genehmigung sichtbar.

## Fehlerbehandlung

- **Admin-Route ohne/ungültiges Cookie:** 401 `nicht_angemeldet` (Guard, erste
  Zeile). UI-seitig fängt `error.tsx` bzw. leitet die Middleware auf Login um.
- **Login falsch:** 401 `falsches_passwort`, Formular bleibt befüllt.
- **Antrag-Konflikte:** 409 mit sprechendem `error`-Code; das Antragsformular
  zeigt den Grund („bereits verifiziert" / „Antrag läuft schon").
- **Doppel-Entscheid** (zwei Admins/Tabs entscheiden denselben Antrag): 409
  `bereits_entschieden` — der zweite Klick ändert nichts.
- **Fehlende Env-Variablen:** harter Startfehler mit klarer Meldung, kein
  stilles Leer-Secret.

## Tests

Bestehende 408 Tests bleiben grün (Routen-Umzug zieht deren Import-Pfade nach).

- **adminSession:** Token-Roundtrip (erstellen → prüfen == true); manipuliertes
  Token → false; leeres/fehlendes Token → false; `pruefePasswort` richtig/falsch;
  Passwortänderung invalidiert Alt-Token (Secret-Ableitung).
- **Auth-Routen:** Login richtig → Set-Cookie; falsch → 401; Logout löscht Cookie.
- **Guard auf jeder Admin-Route:** je Route ein Test „ohne Cookie → 401" und
  „mit gültigem Cookie → 2xx" (Handler direkt mit `Cookie`-Header aufrufen —
  Muster der bestehenden Route-Tests, echte test.db).
- **verifikationsService:** Antrag stellen (Happy Path); `BereitsVerifiziert`;
  `AntragOffen` bei zweitem Antrag; `offeneAntraege` listet nur `status:offen`;
  Genehmigung setzt `verifiziert`+Rechtsform+gemeinnützig und `entschiedenAm`;
  Ablehnung ändert den Träger nicht; Doppel-Entscheid → `AntragBereitsEntschieden`.
- **buchungsJournal:** liefert alle Typen neueste-zuerst; Typ-Filter greift.
- **Komponententests:** Login-Formular (Erfolg/Fehler, fetch-Stub),
  Antragsformular auf der Detailseite (Rechtsform-Auswahl → POST-Body; Zustände
  unverifiziert/Antrag-läuft/verifiziert), Admin-Dashboard-Aktionen
  (next/navigation-Mock, reduced-motion-Stub wie gehabt).

## Betroffene Dateien (Überblick)

```
stiftung-web/
  .env.example                                   NEU
  middleware.ts                                  NEU
  vitest.config.ts                               env: ADMIN_* ergänzen
  prisma/schema.prisma                           + VerifikationsAntrag, Traeger.antraege
  lib/server/
    adminSession.ts                              NEU
    verifikationsService.ts                      NEU
    uebersichtService.ts                         + buchungsJournal()
    __tests__/adminSession.test.ts, verifikationsService.test.ts  NEU
  app/
    admin/
      layout.tsx, page.tsx, login/page.tsx,
      verifikation/page.tsx, einrichtungen/page.tsx, journal/page.tsx,
      + loading.tsx/error.tsx je Datenseite      NEU
    api/admin/
      login/route.ts, logout/route.ts,
      marktjahr/route.ts, jahresabschluss/route.ts, auszahlungslauf/route.ts,
      cap/route.ts, einrichtungen/[slug]/schliessen/route.ts,
      verifikation/antraege/route.ts, verifikation/antraege/[id]/route.ts   NEU (Logik verschoben)
    api/traeger/[id]/verifikation/antrag/route.ts   NEU (public)
    api/traeger/[id]/verifikation/route.ts          LÖSCHEN (durch Antrag ersetzt)
    api/simulation/marktjahr, api/simulation/jahresabschluss,
    api/auszahlungen/lauf, api/management/cap,
    api/einrichtungen/[slug]/schliessen               LÖSCHEN (nach /api/admin verschoben)
  components/
    KontenUebersicht.tsx                          NEU (aus SolidaritaetsfondsPanel extrahiert)
    AdminDashboard.tsx / AdminAktionen.tsx        NEU
    VerifikationAntragForm.tsx                    NEU (Detailseite)
    SolidaritaetsfondsPanel.tsx                   Aktionen raus, Lese-Teil bleibt
    TraegerPanel.tsx                              Toggle/Schließen raus, Antrag rein
    Nav.tsx                                       unverändert (kein Admin-Link)
```

## Offene Kleinigkeiten (unkritisch)

- Standard-Admin-Passwort in `.env.example` ist bewusst schwach und als
  „wechselmich" markiert — vor jedem realen Einsatz zu ändern.
- Ob `/admin/journal` Pagination braucht, hängt an der Journal-Größe; für die
  Demo reicht „neueste 100". Wird beim Bau entschieden, nicht hier.
