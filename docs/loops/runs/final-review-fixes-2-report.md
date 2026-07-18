# Final-Review-Fixes (Runde 2) — Report

## Status
DONE

## Kontext
Fix-Welle auf Basis der kompletten Final-Review-Befundliste (F1–F5), angewendet
auf Branch `begeisterung-pakete` (Basis-Commit `5fd8fc1`).

## Zusammenfassung der Fixes

### F1 (Important) — Bestätigung zeigte Live-Reglerstand statt gebuchter Spende
`stiftung-web/components/SpendenRechner.tsx`: neue States `gebuchterBetrag`/
`gebuchteFrequenz` (Default 50/'einmalig', analog zum bestehenden
`altesKapital`-Snapshot-Muster). In `handleSpenden()` werden sie im
Erfolgspfad zusammen mit den übrigen Snapshot-States gesetzt, bevor
`status` auf `'done'` wechselt. `SpendenBestaetigung` bekommt jetzt
`betrag={gebuchterBetrag}` / `frequenz={gebuchteFrequenz}` statt der live
weiterlaufenden `betrag`/`frequenz`-States — ein Verschieben des Reglers nach
dem Buchen ändert Bestätigung/Quittung/Share-Text nicht mehr rückwirkend.
Regressionstest in `SpendenRechner.test.tsx`: spendet 50 €, ändert danach das
Zahlenfeld auf 250 — der Bestätigungsblock (`konfetti-danke`) zeigt weiterhin
„50,00 €", nie „250,00 €".

### F2 (Important) — Du/Sie-Bruch im Conversion-Flow
- `stiftung-web/components/SpendenBestaetigung.tsx`: „Danke für Ihre Spende!"
  → „Danke für deine Spende!" (einzige Sie-Form in user-facing Copy dieser
  Datei — restliche Datei geprüft, keine weiteren Treffer).
- `stiftung-web/app/page.tsx`: „So wirkt Ihre Spende" → „So wirkt deine
  Spende".
- Repo-weiter Grep über `app`/`components` (ohne Tests) bestätigt: keine
  weiteren Ihre/Sie/Ihnen/Ihrer/Ihren-Vorkommen in User-Copy außerhalb dieser
  zwei Stellen (ein Treffer auf „Sie wächst mit" in `SpendenRechner.tsx` ist
  keine Anrede, sondern Pronomen für „Diese Zahl" — unverändert gelassen).
- Keine bestehende Testassertion prüfte den alten Ihre-Wortlaut — keine
  Testanpassung nötig.
- `CLAUDE.md` (Konventionen): neue Zeile „Anrede in User-Copy: Du-Form (nicht
  Sie) — konsistent über alle Seiten."

### F3 (Recommendation) — Same-Screen Stale/Live-Widerspruch
- `SpendenRechner.tsx`: `useRouter()` (next/navigation) + `router.refresh()`
  am Ende des Erfolgspfads von `handleSpenden()` — aktualisiert die
  server-gerenderten Sektionen derselben Route (Finanztopf-Karte,
  Transparenz-Historie in `app/einrichtungen/[slug]/page.tsx`), ohne den
  Client-State der Komponente (Bestätigung, Konfetti) zu verlieren.
- `SolidaritaetsfondsPanel.tsx`: `router.refresh()` je einmal im Erfolgspfad
  von `handleVerteilen()` und `handleSimulieren()` — bewusst NICHT in
  `handleSpenden()` (Einzahlen in den Fonds), da laut Brief nur
  simulate/verteilen betroffen sind und diese Aktion keine andere
  server-gerenderte Sektion auf derselben Seite verändert (der Bestand ist
  bereits vollständig client-seitiger State).
- Test-Guards: `vi.mock('next/navigation', ...)` mit
  `useRouter: () => ({ refresh: vi.fn() })` ergänzt in
  `SpendenRechner.test.tsx` und `SolidaritaetsfondsPanel.test.tsx`. Zusätzlich
  (beim Verify-Lauf entdeckt, nicht im Brief explizit genannt, aber
  notwendig): `app/einrichtungen/[slug]/__tests__/page.test.tsx` rendert die
  echte Detailseite inkl. `SpendenRechner` und bräuchte sonst denselben Mock
  — dort per `importOriginal`-Variante ergänzt, damit das ebenfalls von
  `next/navigation` importierte reale `notFound()` (von der Seite selbst
  genutzt) erhalten bleibt statt zu `undefined` zu werden.

### F4 (Minor) — Doppel-Konfetti bei Meilenstein
`SpendenBestaetigung.tsx`: Danke-Konfetti rendert jetzt nur noch, wenn
`meilensteine.length === 0` (das Meilenstein-Banner bringt bei Erreichen
eines Meilensteins bereits sein eigenes Konfetti mit). Bestehender Test
„rendert einen Meilenstein-Banner mit Konfetti" bleibt grün (prüft nur
`>= 1` Konfetti-Instanz, die Banner-Instanz reicht).

### F5 (Minor) — Betrag 0 (bzw. < 5 €) absurde Copy
`SpendenRechner.tsx`: neue Ableitung `betragZuNiedrig = betrag < 5`.
Bei `true` wird statt Zukunftswert-Hero/Dauerförderungs-Perspektive ein
neutraler Hinweis „Wähle einen Betrag ab 5 €." (`data-testid="betrag-hinweis"`,
`.muted`) gerendert; die Wirkungs-Zeile (`impact-beispiel`) und die
Verkürzungs-Zeile werden komplett ausgeblendet. Die tertiäre
Jahre-bis-Ziel-Info (`years-result`) bleibt unverändert sichtbar (nicht
Teil des Befunds, weiterhin sinnvoll auch ohne aktuelle Spende). Zwei neue
Tests: Betragsfeld geleert → Hinweis sichtbar, kein „angewachsen"-Text, keine
Hero-/Impact-Testids; Betrag auf 5 € gesetzt → Hinweis verschwindet, Hero
und Impact-Zeile wieder da.

## Geänderte Dateien
- `stiftung-web/components/SpendenRechner.tsx`
- `stiftung-web/components/SpendenBestaetigung.tsx`
- `stiftung-web/components/SolidaritaetsfondsPanel.tsx`
- `stiftung-web/app/page.tsx`
- `stiftung-web/components/__tests__/SpendenRechner.test.tsx`
- `stiftung-web/components/__tests__/SolidaritaetsfondsPanel.test.tsx`
- `stiftung-web/app/einrichtungen/[slug]/__tests__/page.test.tsx`
- `CLAUDE.md`

## Test/Verify-Summary
- `npx tsc --noEmit`: exit 0.
- `npx vitest run` (isoliert, 2×): beide Läufe **30/30 Testdateien, 252/252
  Tests grün** (vorher 249 laut letztem Report — +3 neue Tests: 1× F1-
  Regression, 2× F5).
- `npm run verify` (tsc + vitest + `next build`, 2× vollständig
  hintereinander): **beide Läufe exit 0**, 252/252 Tests, Build erfolgreich,
  keine Flakes über beide Durchläufe.

## Übersprungen / nicht im Scope
- Kein Punkt der Brief-Liste wurde übersprungen. Die einzige Abweichung vom
  wörtlichen Brief ist eine Ergänzung: der zusätzliche `next/navigation`-Mock
  in `app/einrichtungen/[slug]/__tests__/page.test.tsx` war nicht explizit
  genannt, aber technisch erforderlich, sobald `SpendenRechner` `useRouter()`
  aufruft (dieser Test rendert die echte Seite ungemockt) — ohne den Mock
  wäre der Test mit „invariant expected app router to be mounted"
  fehlgeschlagen.

## Commit
`fix: Final-Review-Fixes — gebuchte Spende eingefroren, Du-Form durchgängig,
router.refresh nach Buchung` (siehe Git-Log für exakten Wortlaut/SHA).
