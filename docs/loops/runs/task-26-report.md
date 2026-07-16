# Task 26: Conversion-Pfad — Report

## Status: DONE

## Implementiert

1. **Nav-Active-State** (`stiftung-web/components/NavLink.tsx` neu, `components/Nav.tsx` modifiziert)
   - `NavLink.tsx`: neue kleine Client-Component (`'use client'`), nutzt `usePathname()` aus `next/navigation`. `isActive = href === '/' ? pathname === '/' : !!pathname?.startsWith(href)` — Startseite braucht Exact-Match (sonst wäre sie unter jeder Route "aktiv", da `'/'` Präfix von allem ist), alle anderen Routen per Präfix-Match (deckt z. B. `/einrichtungen/[slug]` ab). Null-safe (`pathname?.`) für den Fall, dass `usePathname()` außerhalb eines echten App-Router-Kontexts `null` liefert.
   - Aktiver Link: `className="pill pill-primary"` (gefüllte Pille, wiederverwendet die bestehende Primary-Farbe statt neuer CSS) + `aria-current="page"`. Inaktiv: `pill pill-secondary`, kein `aria-current`-Attribut (nicht `aria-current="false"` — RTL/AT-Konvention: Attribut abwesend statt falsy).
   - `Nav.tsx` bleibt Server-Component (kein `'use client'` auf Nav selbst nötig) und delegiert die vier Links an `<NavLink>`.

2. **SpendenRechner-Presets** (`components/SpendenRechner.tsx`)
   - `BETRAG_PRESETS = [25, 50, 100, 250]`, Button-Reihe (`role="group" aria-label="Betrag-Vorschläge"`) direkt über dem Slider-Label eingefügt. Klick ruft `setBetrag(preset)`; aktiver Preset (`betrag === preset`) bekommt `pill-primary` + `aria-pressed="true"`, sonst `pill-secondary` + `aria-pressed="false"` (gleiches Muster wie die bestehenden Einmalig/Jährlich-Buttons).
   - Default-State `betrag = 50` matcht automatisch den 50-€-Preset (kein Sonderfall nötig).

3. **Landing-Page** (`app/page.tsx`)
   - Async Server Component, `export const dynamic = 'force-dynamic'`, ruft `statistik()`.
   - Primärer CTA „Jetzt spenden" → `/einrichtungen/${stats.bottom5[0].slug}` (Einrichtung mit größtem Pro-Kind-Förderbedarf, server-seitig ermittelt); Fallback `/einrichtungen` falls `bottom5` leer ist (leere DB). „Einrichtung finden" jetzt sekundär (`pill-secondary`), dahinter unverändert „Statistik ansehen" / „Solidaritätsfonds".
   - Live-Zahlen-Zeile: `{anzahlEinrichtungen} Einrichtungen · {gesamtKinder} Kinder · {formatEuro(gesamtKapital)} Bildungskapital`.
   - Hero-Wirkungs-Karte („So wirkt Ihre Spende") führt jetzt mit Kleinspender-Perspektive: Verdopplungszeit wird aus der bestehenden Konstante `NET_GROWTH_RATE` berechnet (`t = ln(2) / ln(1+r)`, keine zweite Marketing-Zahl) — „Schon 5 € wachsen für immer weiter … verdoppelt sich jede gespendete Summe rein rechnerisch alle rund 12 Jahre …".
   - Der 2.000.000-€-Anker (`capitalForAnnualPayout(20000)`) ist unverändert in eine neue, untergeordnete Card „Wie das Modell funktioniert" gewandert (identischer Text/Markup wie zuvor, nur Card-Titel/-Position geändert) — bestehende `<strong>{formatEuro(beispielZiel)}</strong>`-Struktur bleibt für den Regressionstest erhalten.
   - Neu: `app/loading.tsx` (`LoadingState label="Startseite wird geladen …"`) und `app/error.tsx` (`'use client'`, `ErrorState label="Startseite konnte nicht geladen werden."`) — exakt das Muster von `app/einrichtungen/{loading,error}.tsx`.

4. **Statistik-Ranking** (`app/statistik/page.tsx`)
   - Neue Hilfsfunktion `fortschrittProzent(aktuellesKapital, zielKapital)` — clamped 0–100, gerundet, `zielKapital <= 0` → 0 (Guard analog zu `ProgressBar`s `max > 0`-Check).
   - Jeder Eintrag in „Am besten gefördert" / „Größter Förderbedarf" ist jetzt `<Link href={"/einrichtungen/"+slug}>` und zeigt Name, `Ort · Typ · X %` sowie unverändert `formatEuro(foerderungProKind)` pro Kind.

## Tests (neu/angepasst)

- `components/__tests__/Nav.test.tsx`: `vi.mock('next/navigation', ...)` mit `usePathname: vi.fn(() => '/')` als Default; 2 neue Tests — aktive Route bekommt `pill-primary` + `aria-current="page"`, inaktive Routen nicht; Startseite bleibt bei `/einrichtungen` inaktiv (kein Präfix-Fehltreffer). Bestehender Link-Test unverändert grün.
- `components/__tests__/SpendenRechner.test.tsx`: 2 neue Tests — Preset-Buttons vorhanden mit korrektem `aria-pressed` bei Default 50 €; Klick auf „250 €" setzt `aria-pressed` um und aktualisiert den Zahlen-Input auf 250.
- `app/__tests__/page.test.tsx`: komplett auf async + DB umgestellt. `beforeEach` mit 5-Tabellen-FK-safe-Reset (`fondsSpende → spende → einrichtung → solidaritaetsfonds → jahresabschluss`, Muster aus `app/api/simulation/jahr/__tests__/route.test.ts`) + Seed von zwei Einrichtungen mit eindeutig unterschiedlicher Förderung/Kind, damit `bottom5[0]` deterministisch ist. Drei Tests: (1) Mission + Live-Zahlen (`toHaveTextContent`, kein bruchanfälliger Spanning-Regex) + primärer CTA-Href/-Klasse, (2) sekundäre CTAs inkl. „Einrichtung finden" jetzt mit `pill-secondary`, (3) 2-Mio-€-Assertion unverändert, jetzt im „Wie das Modell funktioniert"-Abschnitt.
- `app/statistik/page.tsx`: keine dedizierte Test-Datei existierte vorher für diese Seite (bestätigt vor Beginn per Repo-Suche) — Brief fordert dafür keine neuen Tests (Akzeptanzkriterium 6 zählt nur Nav/Presets/Landing auf). `fortschrittProzent` ist eine neue reine Funktion ohne eigenen Unit-Test; sie spiegelt exakt den bereits getesteten Clamp aus `ProgressBar.tsx` (`Math.min(100, Math.max(0, ...))`) und wurde live im Browser gegen echte Seed-Daten verifiziert (siehe unten).

## Verify

```
$ cd stiftung-web && npm run verify
tsc --noEmit           → 0 Fehler
vitest run             → 24 Test-Dateien, 107 Tests, alle grün (vorher 103 — +2 Nav, +2 Presets)
next build             → erfolgreich, 10/10 Seiten generiert, "/" jetzt ƒ (dynamic) statt ○ (static)
EXIT_CODE=0
```

## Browser-Verifikation (Live-Check gegen echte Seed-Daten, `dev.db`)

- `/`: Live-Zahlen „8 Einrichtungen · 1260 Kinder · 734.846,76 € Bildungskapital" korrekt gerendert; „Jetzt spenden" verlinkt auf `/einrichtungen/kita-regenbogen-koeln` — verifiziert per Handrechnung: `5000/45 ≈ 111,1 €/Kind`, niedrigster Wert aller 8 Seed-Einrichtungen (Vergleichswerte 200–2000 €/Kind). Kleinspender-Copy zeigt „… alle rund 12 Jahre …" (aus `NET_GROWTH_RATE=0.06` berechnet: `ln(2)/ln(1.06) ≈ 11,9`, gerundet 12). 2-Mio-€-Anker jetzt unter „Wie das Modell funktioniert".
- `/einrichtungen` (Nav-Check per `getComputedStyle`-Äquivalent über `className`): „Einrichtungen"-Pill hat `className="pill pill-primary"` + `aria-current="page"`, alle anderen `pill pill-secondary` ohne `aria-current`.
- `/statistik`: Ranking-Einträge zeigen z. B. „Tagespflege Kleine Forscher — Dresden · tagespflege · 48 % / 2.413,69 € pro Kind" und „Kita Regenbogen — Köln · kita · 7 % / 135,10 € pro Kind", jeweils als Link zur Detailseite.
- `/einrichtungen/kita-regenbogen-koeln`: Preset-Buttons 25/50/100/250 € über dem Regler; Klick auf „250 €" (per `element.click()`, da Screenshot-Klick-Koordinaten wegen Viewport-Skalierung erst danebenlagen) setzt `aria-pressed="true"` auf „250 €" und `"false"` auf „50 €", Zahlen-Input aktualisiert auf `250`, Ergebnis „45 Jahre und 7 Monate" neu berechnet.

## Geänderte/neue Dateien

- `stiftung-web/components/NavLink.tsx` (Create)
- `stiftung-web/components/Nav.tsx` (Modify)
- `stiftung-web/components/__tests__/Nav.test.tsx` (Modify)
- `stiftung-web/components/SpendenRechner.tsx` (Modify)
- `stiftung-web/components/__tests__/SpendenRechner.test.tsx` (Modify)
- `stiftung-web/app/page.tsx` (Modify)
- `stiftung-web/app/loading.tsx` (Create)
- `stiftung-web/app/error.tsx` (Create)
- `stiftung-web/app/__tests__/page.test.tsx` (Modify)
- `stiftung-web/app/statistik/page.tsx` (Modify)

## Selbst-Review

- **Alle 6 Akzeptanzkriterien** erfüllt: primärer „Jetzt spenden"-CTA zu `bottom5[0]` ✓, Live-Zahlen aus `statistik()` ✓; 2-Mio-Anker in eigener Sektion, Hero führt mit Kleinspender-Formel ✓; Presets 25/50/100/250 € mit `aria-pressed` ✓; Nav `usePathname` + gefüllte Pille + `aria-current="page"` ✓; Statistik-Ranking-Einträge als Links mit Ort · Typ · Fortschritt-% + Pro-Kind-Wert ✓; Tests für Nav-Active-State, Presets, angepasster Landing-Test ✓.
- **Rechen-Wahrheit eingehalten**: Verdopplungszeit nutzt ausschließlich die bestehende `NET_GROWTH_RATE`-Konstante, keine neue Marketing-Zahl, keine zweite Konstante.
- **Qualität**: `Nav` bleibt Server-Component, nur der pathname-abhängige Teil wandert in die kleine Client-Component `NavLink` (kein unnötiger großflächiger Client-Boundary-Wechsel). `fortschrittProzent` ist eine neue reine, ungetestete Funktion — sie spiegelt exakt den bereits getesteten Clamp aus `ProgressBar.tsx` und wurde live gegen echte Seed-Daten verifiziert; das Brief listet für die Statistik-Seite keine Testpflicht (Akzeptanzkriterium 6 zählt nur Nav/Presets/Landing auf), daher bewusst kein zusätzlicher Testfall ergänzt (YAGNI ggü. Scope-Erweiterung).
- **Tests verifizieren echtes Verhalten**: Landing-Test nutzt `toHaveTextContent` statt spanning-Regex (robust gegen Text-Node-Aufteilung), 5-Tabellen-FK-safe-Reset verhindert Cross-Test-Leaks über die geteilte `test.db`; Nav-Test deckt sowohl Aktiv- als auch explizit den Nicht-Präfix-Fehltreffer-Fall der Startseite ab.
- **Advisor-Review vor Commit**: zweimal konsultiert (vor Implementierung zur Plan-Bestätigung, danach zur Abschluss-Prüfung) — keine Korrekturen nötig, beide Male „proceed"/„no blocking concerns".
- **Keine offenen Concerns.**
