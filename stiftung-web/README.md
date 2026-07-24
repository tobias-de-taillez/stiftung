# Deutsche Bildungsstiftung — lokale Website

Lokale Demo-Version (Next.js + SQLite/Prisma). Kein echtes Payment, kein
echtes Geld — aber ein echtes, laufendes Backend: Spenden werden real in
einer lokalen SQLite-Datenbank gebucht ("Spielgeld"), inklusive eines aktiv
wirkenden Solidaritäts-Umverteilungsmechanismus. Der Code implementiert das
Verrechnungsmodell aus [`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md)
seit Task 20 vollständig (siehe [`projekt-status.md`](../projekt-status.md),
Abschnitt „Zielmodell umgesetzt").

## Lokal starten

```bash
cp .env.example .env
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

`.env.example` enthält drei Variablen: `DATABASE_URL` sowie `ADMIN_PASSWORT`
und `ADMIN_SESSION_SECRET` für den Admin-Bereich (siehe unten) — alle drei
müssen in `.env` gesetzt sein, sonst startet `npm run dev` zwar, aber der
Admin-Login schlägt fehl. `.env` ist git-ignoriert und wird nicht committet.

Danach `http://localhost:3000` öffnen.

## Admin-Bereich

`/admin` ist passwortgeschützt (Passwort aus `ADMIN_PASSWORT` in `.env`,
Default in `.env.example`: `wechselmich` — vor jedem Einsatz außerhalb der
lokalen Demo ändern). Dort laufen alle administrativen Aktionen, die vorher
öffentlich waren: Marktjahr auslösen, Jahresabschluss (Kaskade), Auszahlungslauf,
Management-Cap setzen, Einrichtung schließen, sowie die
Verifikations-Warteschlange (Anträge genehmigen/ablehnen) und das komplette
Buchungsjournal. Das Session-Cookie ist signiert (`node:crypto`, keine neue
Dependency) und hat kein `maxAge` — es stirbt mit dem Browserfenster.

**Was öffentlich bleibt:** alle GETs (Statistik, Einrichtungsliste, Detailseiten,
Soli-Fonds-Stand), Einrichtung anlegen, Spenden (an eine Einrichtung, an den
Soli-Fonds), und den Verifikations-*Antrag* stellen
(`POST /api/traeger/[id]/verifikation/antrag`). Die *Entscheidung* über den
Antrag ist admin-only. Jeder `/api/admin/*`-Handler prüft die Session selbst
(`pruefeAdminSession`) als erste Zeile — das ist die maßgebliche Barriere,
nicht die Middleware (reiner Redirect-Komfort) oder die UI.

### Zwei-Fenster-Demo (Test-Rezept)

So lässt sich die Rollen-Trennung von Hand nachvollziehen, ohne zwei Rechner
zu brauchen:

1. Zwei **private/Inkognito-Browserfenster** öffnen (unterschiedliches
   Cookie-Jar). Fenster A bleibt ohne Cookie = Normalo/Spender-Sicht.
2. In Fenster A: eine noch unverifizierte Einrichtung öffnen, „Zugang
   abholen" antragen (Verifikations-Antrag).
3. In Fenster B: unter `/admin/login` mit dem Passwort aus `.env` anmelden,
   den Antrag unter `/admin/verifikation` sehen und genehmigen.
4. Zurück in Fenster A: die Einrichtungsseite neu laden — Status springt auf
   „Zugang abgeholt", Verwendungsart B (Direkt auszahlen) wird im
   Spendenrechner wählbar.
5. In Fenster B zusätzlich Marktjahr und Jahresabschluss auslösen (Dashboard);
   in Fenster A zeigen `/statistik` und `/solidaritaetsfonds` den neuen Stand
   (nur lesen, keine Aktions-Buttons dort).

## Tests

```bash
npm run test
```

Die Tests laufen gegen eine echte SQLite-Datei (`prisma/test.db`, via
`DATABASE_URL` in `vitest.config.ts`) — keine gemockte Datenbank. Das
`pretest`-Skript synchronisiert nur das Schema; die Isolation kommt daher,
dass jede DB-Test-Suite in ihrem `beforeEach` den zentralen Helper
`resetDb()` aus `lib/server/__tests__/testDb.ts` aufruft (leert alle Tabellen
in FK-sicherer Reihenfolge) und `fileParallelism: false` die Testdateien
sequenziell ausführt. Neue DB-Test-Suiten rufen `resetDb()` statt eigener
`deleteMany()`-Aufrufe. Aktueller Stand: 56 Testdateien, 467 Tests, alle PASS.

## Struktur

- `app/` — Seiten (Landing, Einrichtungen, Statistik, Solidaritätsfonds) + `app/api/**` (Backend-HTTP-Schnittstelle)
- `components/` — UI-Bausteine (Design-Tokens aus `app/globals.css`)
- `lib/calc/` — clientseitige Spendenrechner-Simulation (pure Funktion, DB-unabhängig)
- `lib/verrechnung/` — Buchungskern aus `docs/verrechnungsmodell.md`, pure Funktionen: Anteile (`anteile.ts`), Kaskade (`kaskade.ts`), Rangposition (`rang.ts`), Sweep/Erstbefüllung/Träger, Geld-/Cent-Arithmetik (`geld.ts`)
- `lib/server/` — Backend-Service-Layer (Prisma-Zugriff, Konten-, Spenden-, Kaskaden- und Marktservice, Statistik)
- `prisma/` — DB-Schema und Seed-Daten (8 Einrichtungen, Tagespflege-Schwerpunkt nach Leitbild Phase 1)

## Datenmodell

Einrichtungen halten keine Euro-Beträge, sondern **Anteile** am gemeinsamen
Einrichtungs-Depot (`Einrichtung.anteile`, Pool-Anteile in 10⁻⁸-Einheiten,
Spec §2). Der Topfwert einer Einrichtung ergibt sich jederzeit aus
`Anteil × Poolwert / Anteile gesamt` (`topfwertCent()`,
`lib/verrechnung/anteile.ts`) — nie aus einer gespeicherten Kapitalspalte.

Der **Kontenstand** (`Kontenstand`, Singleton-Zeile `id: 'main'`) führt fünf
Ebenen: Einrichtungs-Depot (ETF), Verrechnungskonto (Cash-Puffer),
Soli-Depot, Soli-Verrechnungskonto, Management-Konto — siehe
[`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md), Abschnitt
„Kontenmodell".

Ein Jahreslauf ist zweigeteilt: das **Marktjahr** (`app/api/admin/marktjahr`,
admin-only) stellt nur den neuen ETF-Kurs, ohne zu buchen. Die **Kaskade**
(`app/api/admin/jahresabschluss`, admin-only, `lib/verrechnung/kaskade.ts`,
`lib/server/kaskadeService.ts`) bucht anschließend ertragsblind auf dem
Stichtagswert: Solidaritätsabgabe der besser gestellten Einrichtungen,
P5/P95-winsorisierte Rangposition, 1-%-Umverteilung an die bedürftigsten
Einrichtungen, Management-Cap-Abschöpfung. Kurz: **Marktjahr stellt den
Kurs, die Kaskade bucht ertragsblind.**

Jede Kapitalbewegung erzeugt eine Zeile im **Buchungsjournal** (`Buchung`,
Spec §7) — brutto, pro Einrichtung einzeln, mit Bezug auf den auslösenden
`Kaskadenlauf` sofern zutreffend. Das Journal ist der Nachweis, nicht die
Kontenstände allein.

## Was hier bewusst fehlt (lokale Version)

- Kein echtes Payment (Stripe/PayPal) — Buchung ist real in der DB, aber ohne echtes Zahlungsmittel ("Spielgeld").
- Kein Träger-Portal/KYC — Träger haben kein eigenes Login; das
  Spender-Frontend stellt den Verifikations-Antrag stellvertretend. Ein Admin
  entscheidet ihn im Admin-Bereich (siehe oben), aber ohne echte Prüfung von
  Dokumenten. Eigenes Träger-Login ist Phase 2.
- Ein einziges geteiltes Admin-Passwort, kein User-Modell, kein Rate-Limit/CSRF
  auf den Admin-Routen — für die Spielgeld-Demo genügt `sameSite=lax` +
  Same-Origin.
- Prämisse P1 (thesaurierender ETF erzeugt keinen Mittelzufluss nach § 55 Abs. 1 Nr. 5 AO) ist ungeprüft.
- Kein Grundstock-Topf — erst zur Stiftungsumwandlung in Phase 3 fällig.

**Die vollständige Liste offener Punkte und der Ist/Soll-Abgleich mit dem
Zielmodell stehen in [`projekt-status.md`](../projekt-status.md), Abschnitt
„Zielmodell umgesetzt" — und nur dort.**

Nächste Schritte: siehe [`leitbild.md`](../leitbild.md) und
[`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md).
