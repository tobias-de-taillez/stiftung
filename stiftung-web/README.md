# Deutsche Bildungsstiftung — lokale Website

Lokale Demo-Version (Next.js + SQLite/Prisma). Kein echtes Payment, kein
echtes Geld — aber ein echtes, laufendes Backend: Spenden werden real in
einer lokalen SQLite-Datenbank gebucht ("Spielgeld"), inklusive eines aktiv
wirkenden Solidaritäts-Umverteilungsmechanismus.

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
dass jede Test-Suite in ihrem `beforeEach` alle vier Tabellen leert
(FK-sichere Reihenfolge) und `fileParallelism: false` die Testdateien
sequenziell ausführt. Neue DB-Test-Suiten müssen dieses beforeEach-Muster
übernehmen. Aktueller Stand: 23 Testdateien, 94 Tests, alle PASS.

## Struktur

- `app/` — Seiten (Landing, Einrichtungen, Statistik, Solidaritätsfonds) + `app/api/**` (Backend-HTTP-Schnittstelle)
- `components/` — UI-Bausteine (Design-Tokens aus `app/globals.css`)
- `lib/calc/` — clientseitige Spendenrechner-Simulation + Solidaritäts-Verteilungsformel (beide pure Funktionen, DB-unabhängig)
- `lib/server/` — Backend-Service-Layer (Prisma-Zugriff, Buchungslogik, Fonds-Verteilung, Statistik)
- `prisma/` — DB-Schema und Seed-Daten (8 Einrichtungen, Tagespflege-Schwerpunkt nach Leitbild Phase 1)

## Solidaritätsfonds

> **Ist-Zustand.** Das Zielmodell steht in
> [`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md) und ist hier
> noch nicht umgesetzt — Abweichungen unten unter
> [Was hier bewusst fehlt](#was-hier-bewusst-fehlt-lokale-version).

Nicht zweckgebundene Spenden sammeln sich im Fonds. Eine Verteilung berechnet
pro Einrichtung den Pro-Kind-Abstand zum Ziel (`bedarfProKind`) und teilt den
Fonds-Bestand proportional dazu auf — Einrichtungen mit dem größten Rückstand
bekommen am meisten. Besteht nirgends Bedarf, bleibt der Fonds bewusst
unangetastet statt sinnlos verteilt zu werden.

## Jahres-Simulation

Auf der Solidaritätsfonds-Seite bucht der Button „Jahr simulieren (+6 %)"
einen kompletten Jahresabschluss: Er schreibt 6 % Netto-Wachstum
(`NET_GROWTH_RATE`) sowohl auf den Fonds-Bestand als auch auf das
`aktuellesKapital` jeder einzelnen Einrichtung, verteilt den Fonds
anschließend wie gewohnt bedarfsproportional und protokolliert das Ergebnis
als `Jahresabschluss`-Zeile (fortlaufende `nummer`, `fondsErtrag`,
`kapitalErtrag`, `verteiltGesamt`). Der Button ist bewusst nicht an
`bestand > 0` gekoppelt — die Simulation ist auch bei leerem Fonds sinnvoll,
weil das Einrichtungskapital unabhängig vom Fonds wächst. Wichtig: `fondsErtrag`
und `kapitalErtrag` sind Kapitalwachstum, kein Spenden-Zufluss — dafür
entstehen keine neuen `Spende`/`FondsSpende`-Datensätze, und sie verändern
nicht die Spendenstatistik (`zuflussLetztesJahr`), nur die Kapitalstände. Der
anschließende Verteilungsschritt bucht wie bei „Jetzt verteilen" weiterhin
`Spende`-Zeilen mit `quelle: 'solidaritaet'` pro begünstigter Einrichtung —
diese werden in der Statistik separat herausgefiltert, tauchen also ebenfalls
nicht im Zufluss auf.

## Was hier bewusst fehlt (lokale Version)

- Kein echtes Payment (Stripe/PayPal) — Buchung ist real in der DB, aber ohne echtes Zahlungsmittel ("Spielgeld").
- Kein Login/KYC — Spenden sind anonym.
- Keine Auszahlung an Einrichtungen (nur Zufluss modelliert, kein Abfluss aus der Stiftung heraus).

### Abstand zum Zielmodell

Gegenüber [`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md) fehlt:

| Zielmodell | Hier |
|---|---|
| Töpfe als **Pool-Anteile** (Kursbewegung = 0 Schreibvorgänge) | `aktuellesKapital: Float` in Euro |
| Einrichtungs-Depot + Verrechnungskonto + Soli-Depot + Soli-Verrechnungskonto + Management-Konto | Kein Konten-/Depot-Split |
| **Solidaritätsabgabe** (`p × 1 %`) der besser ausgestatteten Einrichtungen | Fehlt — Fonds speist sich nur aus freien Spenden |
| Verteilung nach **relativer** Position, P5/P95-winsorisiert | Verteilung nach **absolutem** Abstand zum Ziel-Kapital (`bedarfProKind`) |
| Nur 1 % des Fonds wird verteilt | Kompletter Bestand wird verteilt, danach 0 |
| Direktförderung 1 % an die Einrichtung | Nicht modelliert |
| Ertragsblinde Buchung auf Stichtagswert | Deterministische 6 %-Simulation |

Die 6 %-Jahressimulation bleibt als **Projektion** sinnvoll — sie ist nur
keine Buchungsregel. Prognose ist erlaubt, Zusage nicht.

Nächste Schritte: siehe Leitbild (`../leitbild.md`) und die Spec.
