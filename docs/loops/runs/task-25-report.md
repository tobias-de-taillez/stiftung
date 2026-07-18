# Task 25: Motion-Fundament — Report

## Status: DONE

## Implementiert

1. **`.pill` und klickbare `.card`s: transition + Hover-Zustand** (`stiftung-web/app/globals.css`)
   - `.pill` bekommt `transition: filter 0.15s ease-out;` und `.pill:hover:not(:disabled) { filter: brightness(1.12); }` — ein Helligkeits-Shift, der für alle Pill-Varianten (primary/secondary) und damit auch für die Nav-Links (`Nav.tsx` nutzt `className="pill pill-secondary"`) automatisch greift.
   - Klickbare Cards: `EinrichtungenFilter.tsx` wrappt `<Card>` in `<Link>`. Neue Regel `a .card { transition: transform 0.2s ease-out, box-shadow 0.2s ease-out; }` + `a:hover .card { transform: translateY(-2px); box-shadow: var(--shadow-hover); }`. Nicht-klickbare Cards (z. B. auf `/statistik`, Landing, Solidaritätsfonds) sind nicht in `<a>` gewrappt und bleiben unverändert (per Browser-Check bestätigt, siehe unten).
   - Neuer Token `--shadow-hover: 0 26px 60px rgba(2, 7, 25, 0.4);` im `:root`-Block ergänzt (Konvention „Farben/rgba nur als var(--token)" eingehalten, kein Inline-rgba in der Regel).

2. **`ProgressBar` — animierte Füllung + Prozenttext + Ziel-erreicht** (`stiftung-web/components/ProgressBar.tsx`)
   - Bleibt Server-Component (kein `'use client'`): Füllung nutzt reines CSS `@keyframes progress-bar-fill-in { from { width: 0; } }` mit `animation: progress-bar-fill-in 800ms ease-out;` auf `.progress-bar-fill`. Da kein `to`/`100%`-Keyframe definiert ist, nimmt die Animation laut CSS-Animations-Spec den per Inline-Style gesetzten `width`-Wert als implizites Ende — dadurch läuft die Animation bei jedem Erst-Rendern automatisch von 0 auf die Zielbreite, ganz ohne JS-Mount-Erkennung. Funktioniert dadurch unverändert in den bestehenden Server-Component-Verbrauchern (`app/einrichtungen/[slug]/page.tsx`) und im Client-Component-Verbraucher (`EinrichtungenFilter.tsx`).
   - Prozenttext: `${Math.round(pct)} %` als eigenständiges `<p>` neben dem Label (nicht im selben Textknoten wie `label`, damit der bestehende exakte `getByText(label)`-Test unverändert grün bleibt).
   - Bei `pct >= 100`: Klasse `is-complete` auf dem Füllbalken (→ `background: var(--turquoise)` statt `var(--sun)`) und Text ergänzt `· Ziel erreicht`.
   - aria-Attribute (`role`, `aria-valuemin/max/now`, Clamping) unverändert übernommen.
   - Reduced-Motion: keine Dopplung des globalen Overrides — der bestehende `@media (prefers-reduced-motion: reduce)`-Block am Dateiende kappt `animation-duration` auf `0.001ms`, wodurch die Fill-Animation sofort im Endzustand ankommt (per Browser-Analyse verifiziert, siehe unten).

3. **`useCountUp(target, durationMs?)`-Hook** (`stiftung-web/lib/hooks/useCountUp.ts`)
   - `requestAnimationFrame`-basiert, ease-out (`1 - (1-p)^2`), Default-Dauer 800ms.
   - `prefersReducedMotion()`-Guard via `window.matchMedia('(prefers-reduced-motion: reduce)')`, defensiv gegen SSR (`typeof window === 'undefined'`) und gegen jsdom-Umgebungen ohne `matchMedia`-Implementierung.
   - Bei reduced-motion: State startet bereits bei `target` (lazy `useState`-Initializer) und der Effect setzt zusätzlich sofort `target`, kein rAF-Loop.
   - Sonst: rAF-Loop, der pro Frame `Math.round(target * easeOutQuad(progress))` setzt, `cancelAnimationFrame` im Cleanup.

## TDD RED/GREEN Evidenz (Hook)

**RED** — Test vor Implementierung, Import schlägt fehl:

```
$ npx vitest run lib/hooks/__tests__/useCountUp.test.ts
 FAIL  lib/hooks/__tests__/useCountUp.test.ts [ lib/hooks/__tests__/useCountUp.test.ts ]
Error: Failed to resolve import "../useCountUp" from "lib/hooks/__tests__/useCountUp.test.ts". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

**GREEN** — nach Implementierung von `lib/hooks/useCountUp.ts`:

```
$ npx vitest run lib/hooks/__tests__/useCountUp.test.ts
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

Tests: (1) animiert von 0 bis exakt `target` nach Ablauf der Dauer (Zwischenwert strikt zwischen 0 und target bei 400ms von 800ms), (2) reduced-motion → sofort `target`, auch nach Zeitablauf unverändert, (3) SSR-/jsdom-Safety ohne `matchMedia` → Startwert 0, (4) nicht-ganzzahliger `target` (1234.56) landet exakt darauf — kein Rundungsfehler durch `Math.round` im letzten Frame (Härtung nach Advisor-Review: letzter Frame setzt `target` direkt statt `Math.round(target * easeOutQuad(1))`). Deterministisch über `vi.useFakeTimers()` + `vi.advanceTimersByTime()`; per Vorab-Experiment verifiziert, dass Vitest 4.1.10 `requestAnimationFrame` mit festen 16ms-Frames faked (Timestamps 16, 32, 48, … deterministisch), keine Real-Timing-Flakiness.

## ProgressBar-Tests (erweitert)

Bestehender Test lief unverändert weiter grün (kein Edit nötig, da Prozent/„Ziel erreicht" in einem separaten `<p>` liegen, nicht im Label-Textknoten). Erweitert um 5 Fälle:

```
$ npx vitest run components/__tests__/ProgressBar.test.tsx
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

- unverändert: aria-valuemin/max/now + Label-Text
- neu: Prozenttext „2 %“ bei 40.000/2.000.000
- neu: Clamping auf `aria-valuenow=2000000` bei `value > max` + Text „100 % · Ziel erreicht“ + Klasse `is-complete` auf dem Fill-Element (Advisor-Hinweis: Turquoise-State war zuvor nur über den textgleichen Zweig indirekt abgedeckt, jetzt direkt assertet)
- neu: „100 % · Ziel erreicht“ + `is-complete`-Klasse bei exaktem Erreichen
- neu: Fill-Element hat KEINE `is-complete`-Klasse unterhalb 100 %

## Verify

```
$ cd stiftung-web && npm run verify
tsc --noEmit           → 0 Fehler
vitest run             → 24 Test-Dateien, 103 Tests, alle grün (vorher 95 — +4 useCountUp, +6 ProgressBar-Erweiterung [1 unverändert + 5 neu])
next build             → erfolgreich, 10/10 Seiten generiert
EXIT_CODE=0
```

## Browser-Verifikation (Live-Check, nicht nur Unit-Tests)

Preview-Devserver (`stiftung-web`, Port 3000) neu gestartet (alter `.next`-Cache war durch parallel gelaufenen `next build` korrumpiert — `.next` gelöscht, Devserver sauber neu hochgefahren; kein Zusammenhang mit den Code-Änderungen).

- `/einrichtungen`: alle 8 Karten zeigen Prozenttext (z. B. „42 %“, „7 %“, „48 %“) neben dem Label.
- Hover auf eine verlinkte Karte (`a .card`) per `getComputedStyle`: `transform: matrix(1,0,0,1,0,-2)` (= `translateY(-2px)`) und `boxShadow` wechselt von `--shadow` auf `--shadow-hover`; nicht gehoverte Karten bleiben `transform: none`.
- `/statistik`: 7 Cards insgesamt, `document.querySelectorAll('a .card').length === 0` — bestätigt, dass nicht-klickbare Cards keine Hover-Transition-Regel matchen.
- Hover auf Nav-Pill „Einrichtungen“: `getComputedStyle(pill).filter === 'brightness(1.12)'`, andere Pills `filter: none`.
- Detailseite (`/einrichtungen/tagesmutter-kleine-forscher-dresden`, Server-Component-Verbraucher): `aria-valuemin/max/now` korrekt, Fill-Element hat `className="progress-bar-fill"`, `animationName: "progress-bar-fill-in"`, `background: rgb(255, 200, 87)` (= `--sun`) — Server-Component-Pfad unverändert lauffähig, kein `'use client'` nötig.

## Geänderte/neue Dateien

- `stiftung-web/app/globals.css` (Modify)
- `stiftung-web/components/ProgressBar.tsx` (Modify)
- `stiftung-web/components/__tests__/ProgressBar.test.tsx` (Modify, erweitert)
- `stiftung-web/lib/hooks/useCountUp.ts` (Create)
- `stiftung-web/lib/hooks/__tests__/useCountUp.test.ts` (Create)

## Selbst-Review

- **Alle 4 Akzeptanzkriterien**: Pill/Card-Transition+Hover inkl. Nav-Links ✓; ProgressBar-Fill-Animation+Prozenttext+Ziel-erreicht+aria unverändert ✓; `useCountUp`-Hook mit exakter Signatur, rAF, ease-out, reduced-motion, deterministisch getestet ✓; Evidenz-Gaps adressiert (Transitions jetzt vorhanden, ProgressBar-Width jetzt animiert, Prozent jetzt sichtbar neben Label statt nur Farbe) ✓.
- **Qualität**: `ProgressBar` bleibt Server-Component (kein unnötiger Client-Boundary-Wechsel, geringeres Risiko); Shadow-Hover als Token statt Inline-rgba (Konvention aus `CLAUDE.md` eingehalten); reduced-motion nicht dupliziert, sondern bewusst auf den bestehenden globalen Override gestützt.
- **YAGNI**: `useCountUp` wird in diesem Task bewusst *nicht* in `ProgressBar` verdrahtet (nicht gefordert, wäre zusätzliche Client-Component-Konvertierung ohne Nutzen für Task 25); kein `:focus-visible`-Pendant zum Card-Hover ergänzt (nur „Hover-Zustand“ verlangt, globaler `:focus-visible`-Outline-Ring existiert bereits unabhängig davon für Tastatur-Nutzer).
- **Tests verifizieren echtes Verhalten**: Hook-Tests nutzen `vi.useFakeTimers()` mit tatsächlichem rAF-Faking (kein `setTimeout`-Mock-Ersatz), decken Zwischenzustand + Endzustand + reduced-motion + SSR-Fall ab. ProgressBar-Tests decken Normalfall, Clamping-über-Ziel und Exakt-100%-Fall ab.
- **Advisor-Review vor Commit**: zwei Härtungen übernommen (siehe oben) — exakter Endwert bei nicht-ganzzahligem `target`, direkte Assertion der `is-complete`-Klasse statt nur des textgleichen Zweigs. Trailer-Autor-String exakt gemäß Task-Brief verwendet (`Claude Sonnet 5`, nicht der abweichende Beispieltext aus den generischen Git-Instruktionen). Commit staged nur die 5 Task-relevanten Dateien namentlich (kein `git add -A`), `.claude/` und `docs/loops/runs/` bleiben unangetastet/ungestaged.
- **Keine offenen Concerns.**
