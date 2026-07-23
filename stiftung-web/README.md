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
echo 'DATABASE_URL="file:./dev.db"' > .env
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Alternativ die mitgelieferte Vorlage kopieren: `cp .env.example .env`.

Danach `http://localhost:3000` öffnen.

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
`deleteMany()`-Aufrufe. Aktueller Stand: 45 Testdateien, 407 Tests, alle PASS.

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

Ein Jahreslauf ist zweigeteilt: das **Marktjahr** (`app/api/simulation/marktjahr`)
stellt nur den neuen ETF-Kurs, ohne zu buchen. Die **Kaskade**
(`app/api/simulation/jahresabschluss`, `lib/verrechnung/kaskade.ts`,
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
- Kein Login/KYC — Träger-Verifikation ist ein Boolean-Feld, kein echter Prozess.
- Prämisse P1 (thesaurierender ETF erzeugt keinen Mittelzufluss nach § 55 Abs. 1 Nr. 5 AO) ist ungeprüft.
- Kein Grundstock-Topf — erst zur Stiftungsumwandlung in Phase 3 fällig.

**Die vollständige Liste offener Punkte und der Ist/Soll-Abgleich mit dem
Zielmodell stehen in [`projekt-status.md`](../projekt-status.md), Abschnitt
„Zielmodell umgesetzt" — und nur dort.**

Nächste Schritte: siehe [`leitbild.md`](../leitbild.md) und
[`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md).
