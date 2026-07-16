# Deutsche Bildungsstiftung — lokale Website

Lokale Demo-Version (Next.js + SQLite/Prisma). Kein echtes Payment, kein
echtes Geld — aber ein echtes, laufendes Backend: Spenden werden real in
einer lokalen SQLite-Datenbank gebucht ("Spielgeld"), inklusive eines aktiv
wirkenden Solidaritäts-Umverteilungsmechanismus.

## Lokal starten

```bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Danach `http://localhost:3000` öffnen.

## Tests

```bash
npm run test
```

Setzt vor jedem Lauf automatisch `prisma/test.db` zurück (`pretest`-Skript)
und testet Service-Layer und API-Routes gegen eine echte SQLite-Datei —
keine gemockte Datenbank. Aktueller Stand: 21 Testdateien, 83 Tests, alle
PASS.

## Struktur

- `app/` — Seiten (Landing, Einrichtungen, Statistik, Solidaritätsfonds) + `app/api/**` (Backend-HTTP-Schnittstelle)
- `components/` — UI-Bausteine (Design-Tokens aus `app/globals.css`)
- `lib/calc/` — clientseitige Spendenrechner-Simulation + Solidaritäts-Verteilungsformel (beide pure Funktionen, DB-unabhängig)
- `lib/server/` — Backend-Service-Layer (Prisma-Zugriff, Buchungslogik, Fonds-Verteilung, Statistik)
- `prisma/` — DB-Schema und Seed-Daten (8 Einrichtungen, Tagespflege-Schwerpunkt nach Leitbild Phase 1)

## Solidaritätsfonds

Nicht zweckgebundene Spenden sammeln sich im Fonds. Eine Verteilung berechnet
pro Einrichtung den Pro-Kind-Abstand zum Ziel (`bedarfProKind`) und teilt den
Fonds-Bestand proportional dazu auf — Einrichtungen mit dem größten Rückstand
bekommen am meisten. Besteht nirgends Bedarf, bleibt der Fonds bewusst
unangetastet statt sinnlos verteilt zu werden.

## Was hier bewusst fehlt (lokale Version)

- Kein echtes Payment (Stripe/PayPal) — Buchung ist real in der DB, aber ohne echtes Zahlungsmittel ("Spielgeld").
- Kein Login/KYC — Spenden sind anonym.
- Keine Auszahlung an Einrichtungen (nur Zufluss modelliert, kein Abfluss aus der Stiftung heraus).
- Kein Arbeits-Konto/Fonds-Konto-Split — pro Einrichtung nur ein `aktuellesKapital`-Feld.

Diese Punkte sind laut Leitbild (`../leitbild.md`) die nächsten Schritte für
eine Produktions-Version.
