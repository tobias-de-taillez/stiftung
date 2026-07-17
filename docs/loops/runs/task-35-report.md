# Task 35: Landing-Belebung (Desktop-Layout) — Report

## Status
DONE

## Zusammenfassung

### 1. Hero-Grid (`app/page.tsx`, `app/globals.css`)
- Hero-Sektion ist jetzt `<section className="hero-grid">`: links unverändertes Text/Mission/CTA-Bündel, rechts ein neuer `.hero-visual`-Slot.
- `.hero-grid` (globals.css): zweispaltig via `grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr)` ab 800px, fällt unter `@media (max-width: 800px)` auf `1fr` (einspaltig) zurück — derselbe Breakpoint, den `.container` bereits für sein Padding nutzt.
- `.hero-visual` (Wrapper aus Kennzahl-Karte + Live-Ticker) nutzt ebenfalls `grid-template-columns: minmax(0, 1fr)` statt eines impliziten Auto-Tracks — Begründung siehe Concerns/Bugfix unten.

### 2. Neue Komponenten (Interims-Visual bis Task 36, hartes User-Gate — keine Illustration gebaut)
- `components/KennzahlHero.tsx` (`'use client'`): großer animierter Gesamtkapital-Wert via vorhandenem `useCountUp`-Hook (1200ms). Eigene Client-Komponente, weil `app/page.tsx` eine async Server Component ist.
- `components/MiniBalkenwald.tsx` (kein `'use client'`, keine Hooks nötig): Balkenreihe für alle Einrichtungen aus `listEinrichtungen()` (8 im Seed, generisch für jede Anzahl). Wachstum läuft rein über CSS (`.mini-balkenwald-bar` + `@keyframes mini-balkenwald-grow` in globals.css, gleiches "nur `from`-Keyframe"-Muster wie `.progress-bar-fill-in`) — dadurch SSR-fähig und automatisch reduced-motion-sicher über den bestehenden globalen Override. Jeder Balken trägt `title` + `aria-label` (Name + Betrag) UND ein sichtbares Text-Label (Institutionsname) — Wert wird nie nur über Balkenhöhe/Farbe kommuniziert (DESIGN.md: „Status nie nur über Farbe").
- `app/page.tsx` ruft jetzt zusätzlich `listEinrichtungen()` parallel zu `statistik()` (`Promise.all`) und reicht die Liste als `{ slug, name, kapital }` an `MiniBalkenwald`.

### 3. Ticker + Live-Zahlen „harmonisch integriert"
- Live-Zahlen-Absatz (Task 26) bleibt unverändert im linken Text-Block (Teil der Mission-Erzählung).
- `SpendenTicker` (Task 33) zog vom Seitenende in den rechten `.hero-visual`-Slot, direkt unter die Kennzahl-Karte — damit bildet die rechte Spalte einen zusammenhängenden „Live-Dashboard"-Block (Kapital + Balkenwald + Live-Ticker) statt vereinzelt am Seitenende zu hängen. Keine Text-/Prop-Änderung an `SpendenTicker` selbst.

### Bugfix während manueller Verifikation: horizontaler Overflow
Nach der ersten Implementierung zeigte der Dev-Server (Playwright-Screenshot bei 1280px) einen horizontalen Seiten-Overflow: die Balken-Labels (`white-space: nowrap`) zwangen den *impliziten* Grid-Track von `.hero-visual` (nur `display: grid`, kein `grid-template-columns`) dazu, sich am Inhalt (Max-Content-Breite ~944px) statt an der vom äußeren `.hero-grid` zugewiesenen Spaltenbreite (~446px) auszurichten — klassisches CSS-Grid-"Automatic Minimum Size"-Problem, eine Ebene tiefer als der bereits bekannte Grund für `minmax(0, …)` in `.hero-grid` selbst. Fix: `.hero-visual { grid-template-columns: minmax(0, 1fr); }` erzwingt dieselbe Null-Minimum-Regel eine Ebene tiefer. Verifiziert per `document.body.scrollWidth === document.body.clientWidth` (vorher 1646 vs. 1265, danach 1265 vs. 1265) und Screenshots bei 1280px und 700px (Einspaltig-Fallback korrekt).

### Tests (TDD, `components/__tests__/`, `app/__tests__/page.test.tsx`)
- `components/__tests__/KennzahlHero.test.tsx`: zeigt unter reduced-motion sofort den formatierten Zielwert; zeigt Eyebrow-Beschriftung.
- `components/__tests__/MiniBalkenwald.test.tsx`: 8 Balken aus 8 Props-Einträgen; jeder Balken trägt `title` + `aria-label` (Name + Betrag, per direktem `getAttribute`-Vergleich statt `screen.getByLabelText` — Begründung siehe Concerns); sichtbares Text-Label pro Balken; Balkenhöhe skaliert relativ zum größten Kapital; leere Liste crasht nicht.
- `app/__tests__/page.test.tsx`: neue `describe('Hero-Visual-Slot (Task 35)')` mit 4 Tests (Grid-Klasse vorhanden, Gesamtkapital in der Kennzahl, 2 beschriftete Balken aus den 2 seed-Einrichtungen des Tests, Live-Ticker weiterhin vorhanden). `beforeEach` stubbt jetzt zusätzlich `window.matchMedia` (reduced-motion), weil `KennzahlHero`s `useCountUp` sonst bei 0 startet und asynchron über `requestAnimationFrame` hochzählt (jsdom hat keinen rAF-Polyfill) — bestehende Assertions unverändert, nur ergänzt.
- Alle bestehenden Landing-Tests (Mission, Live-Zahlen, CTAs, 2-Mio-Modellkarte) unverändert grün — keine Assertion geschwächt.

### Gefundener/behobener Test-Fallstrick: NBSP in `formatEuro`
`Intl.NumberFormat('de-DE', { style: 'currency', ... })` setzt ein ` ` (NBSP) vor „€". Testing-Library normalisiert bei Text-/Label-Queries (`getByText`, `getByLabelText`) und bei `jest-dom`s `toHaveTextContent` **nur die DOM-Seite** (Whitespace-Kollaps inkl. NBSP → normales Leerzeichen), **nicht** den übergebenen Vergleichsstring — ein direkt aus `formatEuro(...)` gebauter Erwartungsstring (der ebenfalls ein NBSP enthält) matcht dadurch nie. Fix in allen neuen Tests: entweder Regex mit `\s*`/`\s+` (toleriert jede Leerzeichenart) oder direkter `getAttribute`/`textContent`-Vergleich ohne RTL-Normalizer.

## Geänderte/neue Dateien
- `stiftung-web/app/page.tsx` (Hero-Grid, Kennzahl-Komposition, Ticker-Umzug)
- `stiftung-web/app/globals.css` (`.hero-grid`, `.hero-visual`, `.mini-balkenwald-bar` + Keyframe)
- `stiftung-web/components/KennzahlHero.tsx` (neu)
- `stiftung-web/components/MiniBalkenwald.tsx` (neu)
- `stiftung-web/components/__tests__/KennzahlHero.test.tsx` (neu)
- `stiftung-web/components/__tests__/MiniBalkenwald.test.tsx` (neu)
- `stiftung-web/app/__tests__/page.test.tsx` (erweitert, nicht geschwächt)
- `docs/loops/runs/task-35-brief.md` (Task-Brief, mitversioniert wie bei früheren Tasks üblich)

## Test/Verify-Summary
- `npm run test`: 249 passed (249) — vorher 238, +11 neue Tests (2 KennzahlHero, 5 MiniBalkenwald, 4 Page-Hero-Slot).
- `npm run verify` (tsc --noEmit && vitest run && next build): exit 0.
- Manuelle Verifikation im Dev-Server (Playwright/Browser-Tool) bei 1280px und 700px: kein horizontaler Overflow, 8 Balken sichtbar, Count-up läuft und landet exakt beim Live-Zahlen-Wert, Einspaltig-Fallback unter 800px korrekt.

## Concerns (nicht blockierend)
- `SpendenTicker`s Fetch-Effekt löst gelegentlich einen React-„not wrapped in act"-Warnhinweis in `app/__tests__/page.test.tsx` aus (Console-Warning, keine Test-Fehlschläge). Ursache ist vorbestehend (Task 33, unabhängig von dieser Änderung) — die zusätzliche Testanzahl in dieser Datei macht die Race sichtbarer als vorher. Nicht behoben, da außerhalb des Task-35-Scopes (würde Änderungen an `SpendenTicker`s Test-Setup oder Component selbst erfordern).
- Mini-Balkenwald-Labels sind bei 8 Einrichtungen auf ca. 55px Breite gestaucht und nutzen `text-overflow: ellipsis` — bei sehr langen Institutionsnamen bleibt nur der Anfang lesbar; volle Namen + Betrag stehen im `title`-Tooltip und `aria-label`. Akzeptabel für ein Interims-Visual, könnte Task 36 (Illustration) ohnehin ersetzen.
