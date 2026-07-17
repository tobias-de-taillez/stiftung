# Task 32: Simulations-Zeitraffer — Report

**Status:** DONE

**Commit:** `25910ec` — feat: Simulations-Zeitraffer für Jahresabschluss (Task 32)

## Was wurde gebaut

- Neue Komponente `stiftung-web/components/ZeitrafferErgebnis.tsx`: inszenierte
  Sequenz statt der drei statischen Textzeilen. Drei Phasen (`kapital` →
  `verteilung` → `abschluss`), gesteuert über einen JS-Timer (setTimeout-Kette,
  nicht CSS-animation-delay, damit reduced-motion sauber und deterministisch
  auf den Endzustand springen kann).
  - Phase 1: „Kapital wächst +6 %…" + Count-up (useCountUp) des Kapital-Ertrags.
  - Phase 2: „Fonds verteilt an die Bedürftigsten…" — Verteilungseinträge
    erscheinen gestaffelt (220ms/Eintrag), jeder mit eigenem Count-up
    (eigene Subkomponente `ZeitrafferVerteilungsEintrag`, um `useCountUp`
    nicht in einer `.map()`-Schleife aufzurufen). Größter Empfänger erhält
    Klasse `.zeitraffer-eintrag--top` (Stern-Icon + Hervorhebung). Meilenstein-
    Tags aus Task 31 (`meilensteine?`) werden pro Einrichtung angehängt, falls
    vorhanden — optional, kein Crash bei alten Mocks ohne dieses Feld.
  - Phase 3: Abschluss-Summe (verteiltGesamt + neuerFondsBestand).
  - Gesamtdauer: 900ms + n×220ms + 400ms Puffer — bei realistisch max. 9
    Einrichtungen ≈ 3,28s, unter dem 4s-Limit.
  - `prefersReducedMotion()` wurde aus `lib/hooks/useCountUp.ts` exportiert
    (vorher intern) und hier wiederverwendet: bei reduced-motion ist der
    komplette Endzustand von Anfang an da (keine Timer, deterministisch für
    Tests).
- `SolidaritaetsfondsPanel.tsx`: `handleSimulieren` setzt jetzt den kompletten
  API-Response (inkl. `nummer`, `meilensteine`) in einen `zeitraffer`-State und
  rendert `<ZeitrafferErgebnis key={zeitraffer.nummer} .../>` anstelle des alten
  3-Zeilen-Blocks. `key={nummer}` erzwingt bei jeder neuen Simulation einen
  frischen Mount (frische Sequenz statt Timer-Wiederverwendung). Die geteilte
  `verteilung`/„Letzte Verteilung"-Anzeige (für den separaten „Jetzt
  verteilen"-Button) bleibt unverändert und wird von der Simulation nicht mehr
  mitbefüllt (verhindert doppelte Anzeige derselben Verteilung).
- `app/globals.css`: `.zeitraffer-eintrag` (Fade/Slide-in, degradiert über den
  bestehenden globalen reduced-motion-Override) + `.zeitraffer-eintrag--top`
  (Hervorhebung).

## Tests

- `components/__tests__/SolidaritaetsfondsPanel.test.tsx`: reduced-motion-Stub
  jetzt global per `beforeEach` (wie in `SpendenBestaetigung.test.tsx`) — macht
  alle Tests deterministisch, auch die neuen. Neue Tests (`describe
  'Zeitraffer-Sequenz'`): Endzustand + gestaffelter Container + Highlight des
  größten Empfängers; Meilenstein-Tags werden angezeigt, wenn vorhanden; „Kein
  Bedarf" bei leerer Verteilung aus der Simulation.
- Eine bestehende Assertion musste angepasst werden (siehe Concern unten).
- 202 Tests grün (199 Baseline + 3 neue), `npm run verify` (tsc + vitest + next
  build) exit 0.

## Concerns

1. **Bestehende Assertion geändert, nicht nur erweitert.** Der ursprüngliche
   Test „simuliert ein Jahr…" prüfte `getByText(/3,21 €/)` — durch die neue
   Abschluss-Zeile „Neuer Fonds-Bestand: 3,21 €" taucht derselbe Wert jetzt
   zusätzlich zum Kartenkopf („Aktueller Bestand") ein zweites Mal im DOM auf,
   `getByText` würde also mehrdeutig fehlschlagen. Ich habe die Assertion auf
   `container.querySelector('.hero-number')` umgestellt (prüft weiterhin exakt
   dieselbe Bestand-Derivation, nur eindeutig). Das ist eine bewusste, gezielte
   Anpassung einer bestehenden Prüfung, keine versehentliche Lockerung — die
   Werteabdeckung bleibt vollständig erhalten.
2. **Kein Test läuft über den echten Timer-Pfad.** Alle Tests laufen unter
   reduced-motion (bewusst laut Brief sanktioniert für deterministische
   Tests). Die gestaffelte Timer-Sequenz selbst (nicht reduced-motion) ist
   damit nicht durch einen Test abgesichert, nur durch Typecheck/Build/manuelle
   Nachvollziehbarkeit der Logik.

Report-Pfad: `docs/loops/runs/task-32-report.md`

## Fix nach Review

**Commit:** `72fa38b` — fix: Zeitraffer-Gesamtdauer strukturell auf 4 s begrenzt (Stagger skaliert mit Anzahl)

**Issue:** `ITEM_STAGGER_MS = 220` (flat constant) führte bei ~13 Einrichtungen zu >4s Gesamtdauer (12.3s bei 50).

**Lösung:** Stagger-Intervall wird jetzt proportional zur Anzahl der Einrichtungen berechnet:
- Neue exportierte Konstanten: `PHASE1_MS = 900`, `ABSCHLUSS_MS = 400`, `VERTEILUNG_BUDGET_MS = 2400`
- Neue Hilfsfunktion: `staggerInterval(anzahl: number): number` 
  - Berechnet: `Math.min(220, Math.floor(VERTEILUNG_BUDGET_MS / anzahl))`
  - Garantiert strukturell: `PHASE1_MS + N × staggerInterval(N) + ABSCHLUSS_MS ≤ 4000 ms` für alle N
- `ZeitrafferErgebnis.tsx`: Einsatz von `const stagger = staggerInterval(verteilung.length)` in der useEffect-Timer-Planung

**Tests hinzugefügt:**
- `staggerInterval(9) === 220` (kleine N: max 220ms bleibt erhalten)
- `staggerInterval(50) === 48` (großes N: proportionale Skalierung)
- Invarianten-Test: für N ∈ [1, 9, 13, 50, 200] bleibt Gesamtdauer ≤ 4s
- Mathimatische Korrektheit: `staggerInterval(n) === min(220, floor(2400/n))` für alle kritischen Werte

**Verifikation:** 207 Tests grün, `npm run verify` exit 0.
