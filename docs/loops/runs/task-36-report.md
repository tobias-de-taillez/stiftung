# Task 36 Report — Eigene Bildwelt „Wachstum"

**Status:** DONE

**Commit:** `1572d1a` — feat(design): eigene Wachstums-Bildwelt statt Weltraum-Illustration (Task 36)
Branch: `begeisterung-pakete` (verified via `git rev-parse --abbrev-ref HEAD` before commit).

## Was gebaut wurde

`stiftung-web/components/WachstumsIllustration.tsx` — reine SVG/CSS-Komponente, keine neuen Dependencies, keine Bild-Assets. Synchrone Server-Komponente (wie `MiniBalkenwald`), kein `'use client'` nötig.

- **Sechs Wuchsstufen**, deckungsgleich mit `einrichtungsLevel()` aus `lib/data/levels.ts` (Task 30):
  - Stufe 0 (current === null, < 10 % des Zielkapitals): Samen im Erdhügel
  - Stufe 1 (Bronze, 10–25 %): Keimling
  - Stufe 2 (Silber, 25–50 %): Junges Bäumchen
  - Stufe 3 (Gold, 50–75 %): Baum mit Krone
  - Stufe 4 (Platin, 75–100 %): Großer Baum
  - Stufe 5 (Diamant, 100 %): Baum voller Früchte
- **Nur Token-Farben:** Stamm/Blätter/Krone `var(--turquoise)`, Früchte (nur Stufe 5) `var(--sun)`, Erdhügel `var(--surface-2)` mit `var(--lavender)`-Rand/Samen-Akzent. Keine neue Farbe eingeführt (DESIGN.md-Regel „keine neue Farbe pro Feature").
- **Wind-Animation:** `.wachstum-sway` in `globals.css`, rotiert nur den oberirdischen Pflanzenteil (nicht den Erdhügel) um den Fußpunkt. Bewusst `0%/100% → rotate(0deg)` als Keyframe-Ruhezustand statt `animation: … alternate` (wie bei `.zeitraffer-eintrag`) — unter dem globalen `prefers-reduced-motion`-Override (`iteration-count: 1`) landet die Pflanze so garantiert aufrecht, unabhängig von fill-mode. `transform-box: view-box` verankert den Drehpunkt an den viewBox-Koordinaten statt an der stufenabhängigen Bounding-Box der Gruppe.
- **Barrierefreiheit:** SVG ist `aria-hidden="true"`; sichtbarer (nicht sr-only) Zustandstext direkt daneben in BEIDEN Größen, z. B. „Wachstumsstufe: Keimling — Bronze erreicht". `data-testid="wachstums-illustration"` + `data-stage` fürs Testen.
- **Props:** `{ aktuellesKapital, zielKapital, groesse?: 'klein' | 'gross' }`, klein = 64 px, gross = 180 px (Default).

## Einbindung

1. **Detailseite** (`app/einrichtungen/[slug]/page.tsx`): groß, direkt neben dem Finanztopf-ProgressBar in derselben Card — dieselbe Kennzahl treibt beide.
2. **Einrichtungs-Karten** (`components/EinrichtungenFilter.tsx`): klein, in einer Flex-Row direkt neben dem `<h2>`-Namen.
3. **Landing-Hero** (`app/page.tsx`): groß, neben `KennzahlHero` (toppt sie, ersetzt sie nicht) — nutzt das **Aggregat** über alle Einrichtungen (`stats.gesamtKapital` / Summe aller `zielKapital`), nicht eine einzelne Institution. `MiniBalkenwald` bleibt unverändert darunter erhalten. Die Platzhalter-Kommentare in `KennzahlHero.tsx`/`MiniBalkenwald.tsx` ("interimistische Füllung, bis Task 36 …") wurden aktualisiert.

## Tests

- Neu: `components/__tests__/WachstumsIllustration.test.tsx` — alle 6 Stufen parametrisiert (`data-stage` + exakter Zustandstext), `aria-hidden` auf dem SVG, defensives Verhalten bei `zielKapital=0` (→ Stufe 0), Größenunterschied klein/groß, sichtbarer Text auch in der kleinen Variante. 10 Tests.
- Bestehende Tests **erweitert** (nicht nur grün gehalten):
  - `app/__tests__/page.test.tsx`: neuer Test prüft die aggregierte Illustration im Hero (Stufe 1 bei den Fixture-Daten, 14,4 % von 70.000 € Gesamtziel).
  - `app/einrichtungen/[slug]/__tests__/page.test.tsx`: neue/erweiterte Tests für Stufe 0 (2 %), Stufe 3 (60 %, Gold) und Stufe 5 (100 %, Diamant) — `data-stage`-Attribut direkt geprüft.
  - `components/__tests__/EinrichtungenFilter.test.tsx`: neuer Block prüft eine Illustration pro Karte (`getAllByTestId`) und den sichtbaren Zustandstext beider Fixtures (beide fallen zufällig auf Bronze → `getAllByText`, nicht `getByText`).

## Verify

```
cd stiftung-web && npm run verify
```
→ `tsc --noEmit` clean, **266/266 Tests grün** (31 Dateien; vorher 252 + 4 neue Test-Dateien-Additionen = 266), `next build` erfolgreich. Exit 0, dreimal reproduziert (inkl. unmittelbar vor dem Commit).

## Visuelle Verifikation

Dev-Server lokal gestartet (`npm run dev`, Port 3000, bestehende `prisma/dev.db` mit Seed-Daten), per Browser-Pane-Tool (nicht nur curl) tatsächlich gescreenshottet:

- **Landing-Hero:** Junge-Bäumchen-Illustration (Silber, Gesamtaggregat) sauber neben der hochzählenden Kennzahl, Mini-Balkenwald unverändert darunter.
- **Einrichtungen-Liste:** Icon + Zustandstext neben jedem Namen, alle 8 Seed-Einrichtungen zeigen plausible, unterschiedliche Stufen (Samen bis Junges Bäumchen je nach Füllstand).
- **Detailseite:** großer Baum neben dem Finanztopf-Balken, Text und ProgressBar stimmen überein (z. B. „Aktuelles Level: Silber" + „Wachstumsstufe: Junges Bäumchen — Silber erreicht").
- **Stufe 5 (Diamant/Baum voller Früchte)** manuell verifiziert: echte Spende über `/api/einrichtungen/kita-regenbogen-koeln/spenden` auf 100 % gebucht (reale, persistierte Transaktion wie vom Produkt vorgesehen), Baum mit türkiser Vollkrone + sonnengelben Früchten gerendert wie erwartet, Text „Baum voller Früchte — Diamant erreicht" korrekt. **Dev-Datenbank danach über `npx prisma db seed` (idempotentes Upsert) wieder auf den Ausgangsstand zurückgesetzt** — keine bleibende Veränderung an `prisma/dev.db`.

Kein headless Screenshot-Tool separat nötig — die Browser-Pane-Tools waren direkt verfügbar und wurden für echte Screenshots genutzt (kein reines curl-Raten aus HTML).

## Concerns für das Design-Review-Gate

1. **Visuelle Dichte auf den kleinen Karten:** Der volle Satz-Zustandstext („Wachstumsstufe: Junges Bäumchen — Silber erreicht") unter dem 64-px-Icon wirkt auf der Einrichtungen-Liste recht textlastig/vierzeilig neben dem Namen (siehe Screenshot-Beobachtung). Funktional korrekt und barrierefrei, aber eine Kürzung für die kleine Variante (z. B. nur „Silber erreicht" statt des vollen Wachstumsstufen-Satzes) wäre eine legitime Verfeinerung, falls das Review-Gate das für zu unruhig hält. Bewusst nicht vorab „optimiert", um dem Design-Gate die Entscheidung zu überlassen.
2. **Seed-Daten decken nur Stufen 0–2 automatisch ab** (max. 40 % in `prisma/seed.ts`); Stufen 3–5 sind nur durch echte Spenden erreichbar (wie im Task-Brief erwartet, kein Blocker) — Stufe 5 wurde manuell verifiziert (s. o.), Stufe 4 (Platin, 75–100 %) wurde nicht separat gescreenshottet, aber durch den Unit-Test (`data-stage="4"` bei 80 %) abgedeckt.

## Dateien

- `stiftung-web/components/WachstumsIllustration.tsx` (neu)
- `stiftung-web/components/__tests__/WachstumsIllustration.test.tsx` (neu)
- `stiftung-web/app/globals.css` (`.wachstum-sway` + `@keyframes wachstum-sway`)
- `stiftung-web/app/page.tsx` (Landing-Hero-Integration)
- `stiftung-web/app/einrichtungen/[slug]/page.tsx` (Detailseiten-Integration)
- `stiftung-web/components/EinrichtungenFilter.tsx` (Listen-Karten-Integration)
- `stiftung-web/components/KennzahlHero.tsx`, `stiftung-web/components/MiniBalkenwald.tsx` (Doc-Kommentare aktualisiert)
- `stiftung-web/app/__tests__/page.test.tsx`, `stiftung-web/app/einrichtungen/[slug]/__tests__/page.test.tsx`, `stiftung-web/components/__tests__/EinrichtungenFilter.test.tsx` (erweiterte Assertions)

## Fix nach Design-Review

Zwei Important-Findings aus dem Design-Review-Gate behoben, ohne den Scope zu erweitern.

**Finding 1 — Kurzlabel auf den Listen-Karten:** `groesse="klein"` zeigte bisher den vollen Zustandssatz („Wachstumsstufe: Junges Bäumchen — Silber erreicht") und sprengte in vier Zeilen die 64-px-Spalte (gemessen: 85 px Überlauf), was mit dem Karten-`<h2>` kollidierte. Fix: `groesse="klein"` rendert jetzt nur noch den kurzen Stufennamen (`kurzLabel`, z. B. „Keimling"), einzeilig, `muted`, ~0.7rem, zentriert unter dem Icon. Der volle Satz bleibt exklusiv `groesse="gross"` vorbehalten. Barrierefreiheit bleibt gewahrt: der sichtbare Kurztext transportiert weiterhin die Wuchsstufe (nicht nur visuell/Farbe), Beträge/Prozente liefert ohnehin das `ProgressBar`-Label direkt unter der Karte.

Beim eigenen Nachprüfen im laufenden Dev-Server (Browser-Pane, nicht nur Unit-Tests) fiel zusätzlich auf, dass längere Stufennamen („Junges Bäumchen", „Baum voller Früchte") bei 0.7rem/`nowrap` selbst als Kurzlabel breiter als die 64-px-Spalte sind — gemessen an einer echten Karte (Förderschule Pestalozzi, zweizeiliges `<h2>`) ein Überlauf von ~34 px mit ~7,5 px messbarer Übersclappung in den Einrichtungsnamen hinein, dieselbe Kollisionsart wie Finding 1, nur kleiner. Deshalb zusätzlich (über die reine Findings-Vorgabe hinaus) `overflow: hidden`, `textOverflow: ellipsis`, `maxWidth: 100%` auf das Kurzlabel — verhindert den Überlauf für jeden Stufennamen unabhängig von Kartenbreite/Nachbarname. Mit Ellipsis-Test abgesichert (`components/__tests__/WachstumsIllustration.test.tsx`).

**Finding 2 — Stufen 2/3 lasen sich als Map-Pin statt Baum:** Ursache war (a) `ErdhuegelUndSamen`s `var(--surface-2)`-Füllung, die gegen den Card-Gradient (`var(--surface)`/`var(--space-2)`, beides dunkles Navy) praktisch unsichtbar wurde — übrig blieb nur der Lavendel-Ring — und (b) Stufe 2/3, die beide dieselbe Geometrie (dünner Stiel + ein einzelner perfekter Kreis) nur skaliert zeigten, was besonders groß wie ein Map-Pin/Lolli wirkte.

Fix:
- Erdhügel: Füllung auf `var(--lavender)` mit `fillOpacity={0.25}` umgestellt (statt `--surface-2`) — liest sich jetzt klar als Erdhügel, nicht als hohler Ring.
- Stufe 0 (Bonus/Minor 3): Same-Radius von 6 auf 9 vergrößert, zusätzlicher `var(--turquoise)`-Rand für Kontrast — die Einrichtungen ohne jedes Level bekommen ein klarer sichtbares Symbol.
- Stufe 2 („Junges Bäumchen"): behält die beiden Keimling-Blätter (jetzt am unteren Ende eines kürzeren Stiels, `y=70–100`) UND bekommt obenauf eine kleine einlappige Krone (`r=18` statt vorher `r=20` auf vollem Stiel). Wichtig: Stiel deutlich verkürzt (30 statt 50 Einheiten) und Krone vergrößert/tiefer gesetzt, damit sie in den Stiel „einwächst" statt als Kreis auf einem langen dünnen Stab zu schweben — die erste Version mit `y=50–100`/`r=14` sah beim visuellen Gegenlesen im Dev-Server (Browser-Pane-Screenshot, nicht nur Code-Review) immer noch wie ein Pin aus und wurde deshalb nachjustiert.
- Stufe 3 („Baum mit Krone"): dickerer Stiel + dreilappige „Wolken"-Krone (ein Hauptlappen `r=22` + zwei Seitenlappen `r=14`) als sichtbare Vorstufe der vollen Drei-Kreis-Krone aus Stufe 4 — kein einzelner perfekter Kreis mehr auf dem Stiel.

Alle sechs Stufen bleiben eindeutig unterscheidbar, nur Token-Farben (`--turquoise`, `--sun`, `--lavender`), `aria-hidden`-SVG + sichtbarer Text-Sibling und die `.wachstum-sway`-Animation unverändert.

**Verifikation:** `cd stiftung-web && npm run verify` → `tsc --noEmit` clean, **268/268 Tests grün** (31 Dateien; 2 neue/angepasste Tests ggü. vorher: Kurzlabel-Sichtbarkeit + Ellipsis-Regressionsschutz, ein Test umbenannt/verschoben von klein→gross), `next build` erfolgreich, Exit 0. Zusätzlich visuell im Dev-Server (Browser-Pane, echte Screenshots + `getBoundingClientRect()`-Messungen, nicht nur curl) auf `/einrichtungen` und `/einrichtungen/foerderschule-pestalozzi-bremen` geprüft: kein Überlapp zwischen Kurzlabel und Karten-`<h2>` mehr (Gap ≥ 9,6 px in allen 8 Seed-Karten), Erdhügel sichtbar gefüllt, Stufe 2 liest sich als junger Baum statt Pin.

**Commit:** siehe Git-Log — `fix(design): Bildwelt-Nachschärfung — Kurzlabel auf Karten, Baum-Silhouetten für Stufe 2/3, sichtbarer Erdhügel`.

**Dateien (Fix):**
- `stiftung-web/components/WachstumsIllustration.tsx`
- `stiftung-web/components/__tests__/WachstumsIllustration.test.tsx`
- `stiftung-web/components/__tests__/EinrichtungenFilter.test.tsx`
