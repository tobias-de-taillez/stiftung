# Task 30: Level-System-Reparatur (zurück zur Original-Vision) — Report

**Status:** DONE

**Commit:** e48861a — `fix(level): Level-System repariert — Einrichtungs-Level als Finanztopf-Zwischenziele, Spender-Badge mit absoluten Schwellen` (branch `begeisterung-pakete`)

## Was wurde gebaut

### (A) Einrichtungs-Level — neue Zwischenziele des Finanztopfs

`lib/data/levels.ts`: neue `EINRICHTUNGS_LEVELS`-Skala (Bronze 10 %, Silber
25 %, Gold 50 %, Platin 75 %, Diamant 100 % des Zielkapitals, gleiche fünf
Namen/Töne wie der Spender-Badge, aber eine separate Skala auf Anteils- statt
Euro-Basis) + pure Funktion `einrichtungsLevel(aktuell, ziel)`:

- Iteriert die Stufen aufsteigend, merkt sich die höchste erreichte
  (`current`) und die erste nicht erreichte (`next`).
- `fehlenderBetrag` = `next.anteil × ziel − aktuell` (0, wenn `next` null,
  d. h. Diamant/100 % bereits erreicht).
- Defensiver Guard für `ziel <= 0` (liefert `{ current: null, next: null,
  fehlenderBetrag: 0 }` statt Division durch 0/NaN).

`components/ProgressBar.tsx`: neues optionales Prop `marker?: { position:
number; label: string }[]` (Position in % von `max`). Rendert pro Eintrag ein
`aria-hidden="true"`-`<span>` mit `title`-Tooltip, absolut positioniert via
`left: {position}%` in einem neuen `position: relative`-Wrapper um den
bestehenden Balken. Bestehende Aufrufer ohne `marker` sind unverändert (Prop
optional, kein Marker-Element ohne Daten). Neue CSS-Klasse
`.progress-bar-marker` in `app/globals.css` (schmaler vertikaler Strich,
`var(--cream)`, 55 % Deckkraft).

`app/einrichtungen/[slug]/page.tsx`: übergibt die fünf Einrichtungs-Level als
`marker`-Prop an den Finanztopf-Balken und zeigt darunter
`Aktuelles Level: {name}` (nur wenn mindestens Bronze erreicht) sowie
`Nächstes Ziel: {name} — noch {formatEuro(fehlenderBetrag)}` (nur wenn nicht
bereits Diamant).

### (B) Spender-Badge — repariert auf absolute Schwellen

**Kernproblem laut Brief:** `currentLevel` war an `annualDonationPerChild`
(Spendenbetrag ÷ Kinderzahl, nur bei `frequenz: 'jaehrlich'` ≠ 0) geknüpft.
Damit zeigte der Chip bei Einmalspenden **nie** etwas an (Zähler war dort
konstant 0), und bei großen Einrichtungen war selbst Bronze (50 €/Kind/Jahr)
faktisch unerreichbar (60-Kinder-Kita → 3.000 €/Jahr nötig, Regler-Max aber
2.000 €).

`lib/data/levels.ts`: `LEVELS`-Einträge umbenannt von `annualDonationPerChild`
auf `schwelleEuro`, Werte auf 25/100/250/1.000/2.500 € umgestellt (fünf Namen/
Töne unverändert). `currentLevel(betragEuro)` unverändert in der Form, aber
jetzt reine Betragsfunktion. Neue Funktion `nextLevel(betragEuro)`: erste
Stufe oberhalb des Betrags, `null` sobald Diamant erreicht — Grundlage für den
neuen Hinweistext.

`components/SpendenRechner.tsx`: `level = currentLevel(betrag)` (statt
`annualDonationPerChild`) — Chip erscheint jetzt für **beide** Frequenzen rein
aus dem Spendenbetrag. Neue Zeile darunter: `noch {formatEuro(schwelleEuro −
betrag)} bis {nextLevel.name}` (muted, ausgeblendet sobald `nextLevel` null
ist, also ab Diamant).

## Semantik-Bruch (bewusst, das ist der Zweck der Reparatur)

`lib/data/__tests__/levels.test.ts` komplett umgeschrieben: alte Assertions
(50/200/500/1000/2000 €/Kind/Jahr, `currentLevel(50)` → Bronze,
`currentLevel(600)` → Gold) sind durch die neuen absoluten Schwellen ersetzt
(`LEVELS.schwelleEuro` → `[25,100,250,1000,2500]`, `currentLevel(25)` →
Bronze, `currentLevel(300)` → Gold). Kein Fall, in dem eine bestehende
`SpendenRechner`-Testerwartung sich umdrehen musste — der Brief nannte einen
Test, der "keinen Chip bei 50 € einmalig" erwartet; ein solcher Test existierte
im Repo nicht (grep über alle `*.test.tsx` nach "Bronze/Silber/Platin/
Diamant/-Spender/level" bestätigt: `SpendenRechner.test.tsx` enthielt vor
dieser Änderung keine einzige Assertion zum Level-Chip). Die neuen Chip-Tests
sind daher additiv, keine Inversion einer bestehenden Erwartung.

## TDD-Nachweis (RED→GREEN, pro Einheit)

1. `lib/data/__tests__/levels.test.ts`: 14/18 Assertions RED (u. a.
   `einrichtungsLevel is not a function` für alle 6 neuen Tests, alte
   Schwellen-Assertions gegen neue Werte RED) → nach Implementierung 18/18
   GREEN.
2. `components/__tests__/ProgressBar.test.tsx`: 2 neue Tests RED (`marker`-
   Prop existierte nicht, `.progress-bar-marker` nicht im DOM) → nach
   Implementierung 8/8 GREEN.
3. `components/__tests__/SpendenRechner.test.tsx`: 6 neue Tests RED (Chip
   fehlte bei Default-Fixture, kein "noch X €"-Hinweis) → nach Implementierung
   26/26 GREEN.
4. `app/einrichtungen/[slug]/__tests__/page.test.tsx`: 4 neue Tests RED (keine
   Marker im DOM, keine "Nächstes Ziel"/"Aktuelles Level"-Texte) → nach
   Implementierung 6/6 GREEN.

Handgerechnete Fixtures in den Tests: Einrichtung 1.000 €/50.000 € (2 % → kein
aktuelles Level, "noch 4.000,00 € bis Bronze"), 30.000 €/50.000 € (60 % →
Gold, "noch 7.500,00 € bis Platin"), 50.000 €/50.000 € (100 % → Diamant, keine
Nächstes-Ziel-Zeile).

## Verifikation

`cd stiftung-web && npm run verify` (`tsc --noEmit && npm run test && npm run
build`): **Exit 0**. 179/179 Tests grün (26 Testdateien, +27 gegenüber der
Baseline von 152), Next-Build (inkl. Lint + Typecheck) erfolgreich.

## Concerns

Keine harten Blocker. Zwei kleine Designentscheidungen, dokumentiert:

- `EinrichtungsLevelStufe`/`Level` sind zwei separate Typen (Anteils- vs.
  Euro-Skala) statt eines gemeinsamen generischen Typs — bewusst, weil sie
  fachlich unterschiedliche Größen sind (Finanztopf-Anteil vs. Spendenbetrag)
  und eine Vereinheitlichung nur künstliche Indirektion gebracht hätte.
- `marker`-Prop (nicht `markers`) exakt wie im Brief/Interface-Notiz
  benannt, obwohl es ein Array ist — Konsistenz mit der dokumentierten
  Schnittstelle hatte Vorrang vor Namenskonvention.
