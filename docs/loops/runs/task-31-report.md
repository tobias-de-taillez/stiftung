# Task 31: Meilenstein-Erkennung + Feier — Report

## Status: DONE

## Was wurde gebaut

### 1. Pure Erkennungs-Funktion (`lib/data/levels.ts`)
`erreichteMeilensteine(altKapital, neuKapital, zielKapital): string[]` — neben `einrichtungsLevel()`
(Task 30), reuse von `EINRICHTUNGS_LEVELS`. Erkennt zwischen altKapital und neuKapital überschrittene:
- Einrichtungs-Level (Bronze/Silber/Gold/Platin) → `"{Name} erreicht"`
- Prozent-Marken 25/50/75 % → eigene Labels (`"Viertel geschafft: 25 % des Ziels"`,
  `"Halbzeit: 50 % des Ziels"`, `"Dreiviertel geschafft: 75 % des Ziels"`)

Level-Namen und Prozent-Marken **koexistieren bewusst** (z. B. bei 50 % erscheinen sowohl
"Gold erreicht" als auch "Halbzeit: 50 % des Ziels" — das ist Absicht laut Brief, keine
Duplizierung). Einzige Ausnahme: Diamant (100 %) wird aus der Level-Schleife ausgenommen und
mit der 100-%-Marke zu einem einzigen `"Ziel erreicht!"`-Label verschmolzen. Defensiv: `zielKapital
<= 0` oder `neuKapital <= altKapital` → `[]`. TDD: 9 neue Tests, erst RED (Funktion fehlte),
dann GREEN.

### 2. `spenden()` (`lib/server/einrichtungenService.ts`)
Rückgabe um `erreichteMeilensteine: string[]` erweitert (berechnet aus Vorher-/Nachher-Kapital
und `zielKapital`, kein Schema-Change). DB-Integrationstests: Spende über Schwelle → Label
vorhanden; Spende ohne Schwelle → `[]`.

### 3. `simuliereJahr()` (`lib/server/simulationService.ts`)
Neues Feld `meilensteine: { slug, name, labels }[]` (nur Einrichtungen mit `labels.length > 0`,
analog zum Filter-Pattern von `verteilung`). Nutzt **denselben** `erreichteMeilensteine()`-Helper,
angewendet über die GESAMTE Jahresspanne (Kapital-Ertrag-Schritt + Solidaritäts-Verteilung
zusammen, nicht getrennt aufgerufen) — kein Duplikat der Schwellenlogik. DB-Test nutzt die
bestehende arm/reich-Fixture: "arm" springt von 0 % auf 12,16 % (Bronze), "reich" bleibt bei
90→96 % ohne Meilenstein.

### 4. API-Route (`app/api/einrichtungen/[slug]/spenden/route.ts`)
Keine Code-Änderung nötig — Route gibt das Service-Ergebnis bereits 1:1 durch. 2 neue Tests
verifizieren, dass `erreichteMeilensteine` im JSON-Response ankommt (mit/ohne Schwelle).

### 5. UI (`components/SpendenBestaetigung.tsx`, `components/SpendenRechner.tsx`)
Neuer optionaler Prop `meilensteine?: string[]` (Default `[]`) auf `SpendenBestaetigung` — Banner
(`data-testid="meilenstein-banner"`) rendert ÜBER dem Danke-Block, zeigt `🎉 {Label}` pro
Meilenstein und reiht `<Konfetti />` (Task 27) ein zweites Mal ein statt einer neuen
Implementierung. Bei leerem/fehlendem Array kein Banner. `SpendenRechner` liest
`erreichteMeilensteine` aus der POST-Response (`?? []`) und reicht es durch — bestehende
Test-Mocks ohne dieses Feld funktionieren unverändert weiter.

## Tests / Verify

- `npm run verify` (tsc --noEmit && vitest run && next build): **exit 0**
- 199/199 Tests grün (vorher 179, +20 neue: 9 Helper, 2 Service, 1 Simulation, 2 Route, 4
  Komponente, 2 SpendenRechner)
- Production-Build erfolgreich, keine TS-Fehler

## Concerns

- Keine E2E/Playwright-Suite in `npm run verify` — Banner-Rendering wurde nur über
  Component-/Integrationstests verifiziert, nicht per Browser-E2E. Da der Banner nur bei
  Schwellen-Überschreitung rendert (Standard-Spenden der Seed-Daten liegen meist darunter),
  ist das bestehende E2E-Smoke-Set davon nicht betroffen.
- Wortlaut der Prozent-Labels ("Viertel geschafft: 25 % des Ziels" etc.) ist eigene Entscheidung,
  nicht wörtlich im Brief vorgegeben (nur "Halbzeit: 50 % des Ziels" und "Ziel erreicht!" waren
  Beispiele) — dokumentiert in Kommentaren, leicht änderbar falls Produkt anderen Wortlaut will.

## Geänderte Dateien

- `stiftung-web/lib/data/levels.ts` (+ `__tests__/levels.test.ts`)
- `stiftung-web/lib/server/einrichtungenService.ts` (+ `__tests__/einrichtungenService.test.ts`)
- `stiftung-web/lib/server/simulationService.ts` (+ `__tests__/simulationService.test.ts`)
- `stiftung-web/app/api/einrichtungen/[slug]/spenden/__tests__/route.test.ts`
- `stiftung-web/components/SpendenBestaetigung.tsx` (+ Test)
- `stiftung-web/components/SpendenRechner.tsx` (+ Test)

Damit ist Paket „Story" (Tasks 25–31) vollständig.
