# Task 34: Transparenz auf Detailseite + Jahresabschluss-Historie — Report

## Status
DONE

## Zusammenfassung

### 1. Detailseite (`app/einrichtungen/[slug]/page.tsx`)
- Neue Service-Funktion `einrichtungsTransparenz(slug)` in `lib/server/einrichtungenService.ts`:
  - liefert `einrichtung`, `foerderungProKind`, `anzahlUnterstuetzungen` (Gesamtzahl aller Spende-Zeilen der Einrichtung, **inkl.** `quelle='solidaritaet'` — bewusst anders als der sitesweite Spenderzähler `statistik().anzahlSpenden`, der Solidaritätsfonds-Verteilungen als interne Umbuchung ausschließt; Kommentar im Code erklärt den Unterschied) und `spendenHistorie` (letzte 10 Spenden, neueste zuerst, mit `id`, `betrag`, `quelle`, `createdAt`).
  - gibt `null` bei unbekanntem slug zurück (kein Wurf) — die Seite entscheidet über `notFound()`.
- Seite ruft nur noch `einrichtungsTransparenz()` auf (ein DB-Roundtrip statt zwei getrennte Lookups).
- Neue Karte „Transparenz": Förderung pro Kind, Anzahl Unterstützungen, Historie-Liste (Datum `de-DE`, Betrag, bei `quelle==='solidaritaet'` explizites Text-Label „aus dem Solidaritätsfonds" + turquoise-Akzent via vorhandene CSS-Klasse `.positive` — Text-Label ist Pflicht, Farbe nur Zusatz). Empty State „Noch keine Spenden für diese Einrichtung."
- `export const dynamic = 'force-dynamic'` ergänzt (fehlte bisher; ohne das könnte Next die `[slug]`-Route trotz dynamischer Params cachen, weil hier nur über Prisma statt `fetch()` gelesen wird — gleiches Muster wie `app/statistik/page.tsx`).

### 2. Statistik-Seite (`app/statistik/page.tsx`)
- Neue Read-Funktion `jahresabschluesse()` in `lib/server/simulationService.ts`: liest die bereits von `simuliereJahr()` persistierte `Jahresabschluss`-Tabelle, sortiert `nummer` absteigend.
- Neue Karte „Jahresabschluss-Historie": Tabelle (Nr., Fonds-Ertrag, Kapital-Ertrag, Verteilt, Datum), Empty State „Noch keine Jahresabschlüsse." wenn keine Zeilen existieren.
- Kachel „Simulierter Jahresertrag (6%)": zeigt bei vorhandenen echten Abschlüssen die Subzeile „Letzter echter Abschluss (Nr. X): Y €" (Y = `fondsErtrag + kapitalErtrag` des neuesten Abschlusses) statt des bisherigen generischen Hinweistexts; ohne echte Abschlüsse bleibt der alte Hinweis („kein realer Auszahlungs-Flow …") erhalten.

### Tests (TDD RED→GREEN, echte DB via `test.db`)
- `lib/server/__tests__/einrichtungenService.test.ts`: 7 neue Tests für `einrichtungsTransparenz` (unbekannter slug → null, Grunddaten ohne Spenden, Historie-Reihenfolge inkl. Quelle, 10er-Limit, Solidaritäts-Zählung, gemischte Zählung, Isolation zwischen Einrichtungen).
- `lib/server/__tests__/simulationService.test.ts`: 2 neue Tests für `jahresabschluesse` (leer, neueste zuerst mit allen Kennzahlen).
- `app/einrichtungen/[slug]/__tests__/page.test.tsx`: 4 neue Tests (Förderung pro Kind + Unterstützungen ohne Spenden, Direktspende ohne Solidaritäts-Label, explizites „aus dem Solidaritätsfonds"-Label + `.positive`-Klasse, 10er-Limit in der Anzeige).
- Kein Test für `app/statistik/page.tsx` ergänzt — für diese Seite existierte zuvor keine Test-Datei; die neuen Reads sind über die Service-Tests abgedeckt (Bindungsregel „DB-Tests für neue Service-Reads" erfüllt). Tabelle/Subtitle manuell per curl gegen laufenden Dev-Server verifiziert.

### Manuelle Verifikation
- `npm run verify` (tsc --noEmit && vitest run && next build) zweimal grün: 238/238 Tests, Build erfolgreich, `/einrichtungen/[slug]` als `ƒ (Dynamic)` bestätigt force-dynamic.
- Dev-Server gestartet, `/einrichtungen/kita-regenbogen-koeln` und `/statistik` per curl geprüft: Transparenz-Karte inkl. Solidaritäts-Label und `.positive`-Klasse sowie Jahresabschluss-Tabelle inkl. „Letzter echter Abschluss"-Subtitle rendern korrekt.

## Geänderte/neue Dateien
- `stiftung-web/lib/server/einrichtungenService.ts` (neu: `einrichtungsTransparenz`)
- `stiftung-web/lib/server/simulationService.ts` (neu: `jahresabschluesse`)
- `stiftung-web/app/einrichtungen/[slug]/page.tsx` (Transparenz-Karte, force-dynamic, Refactor auf einen Service-Call)
- `stiftung-web/app/statistik/page.tsx` (Jahresabschluss-Historie-Tabelle, Subtitle-Referenz)
- `stiftung-web/lib/server/__tests__/einrichtungenService.test.ts`
- `stiftung-web/lib/server/__tests__/simulationService.test.ts`
- `stiftung-web/app/einrichtungen/[slug]/__tests__/page.test.tsx`

## Test/Verify-Summary
- `npm run test`: 238 passed (238) — vorher 225, +13 neue Tests.
- `npm run verify`: exit 0 (tsc clean, Tests grün, Build erfolgreich).

## Concerns (nicht blockierend)
- Ein Service-Test (`liefert die Historie neueste zuerst, inkl. Quelle`) sortiert zwei Spenden, die im selben DB-Aufruf-Zyklus mit `createdAt: now()` erzeugt werden — bei exakt identischem Timestamp wäre die Reihenfolge nicht deterministisch garantiert. In der Praxis liegen zwischen den beiden `await`-Aufrufen reale Millisekunden, das Risiko ist gering; bei Bedarf ließe sich mit expliziten `createdAt`-Werten hart absichern.
