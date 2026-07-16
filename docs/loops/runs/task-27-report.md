### Task 27: Feier-Moment nach der Spende — Report

**Status:** DONE

**Commit:** e22c130 — `feat(spenden): Feier-Moment nach der Spende — Konfetti, Vorher/Nachher-Balken, Count-up` (branch `begeisterung-pakete`)

**Was wurde gebaut**

- `components/Konfetti.tsx` (neu): einmaliger CSS-Partikel-Burst beim Mounten, keine Abhängigkeiten. 20 Partikel mit zufälliger Startposition/Delay/Dauer, 3 fixe Drift-Keyframe-Varianten (kein JS-Custom-Property-Bedarf). `aria-hidden="true"`. Unter `prefers-reduced-motion` blendet die globale Media Query den Container komplett aus (`display: none`), damit nichts eingefroren mitten im Bild hängen bleibt.
- `components/SpendenBestaetigung.tsx` (umgebaut): neue Reihenfolge exakt nach Akzeptanzkriterium — (1) Konfetti + „Danke für Ihre Spende!" (2) Vorher→Nachher-Fortschrittsbalken: Geisterbalken (`.vorher-nachher-ghost`, blass, `altesKapital`-Anteil) unter animiertem Fill (`.vorher-nachher-fill`, `neuesKapital`-Anteil, wiederverwendet die bestehende `progress-bar-fill-in`-Keyframe-Animation und erbt damit den globalen reduced-motion-Override) + Prozentzuwachs-Text `(neu-alt)/alt*100`, gerundet auf 1 Nachkommastelle; (3) neuer Kapitalstand via `useCountUp` (Task 25); (4) Share/Quittung unverändert; (5) Spielgeld-Hinweis als letztes Element, jetzt ein dezenter `muted`-Absatz statt `StatusChip` (Chip-Import entfernt). Jede Sektion trägt `data-testid` für die Reihenfolge-Assertion.
- `components/SpendenRechner.tsx`: übergibt zusätzlich `altesKapital={einrichtung.aktuellesKapital}` und `zielKapital={einrichtung.zielKapital}` an die Bestätigung (beide waren bereits im `einrichtung`-Prop vorhanden).
- `app/globals.css`: CSS für Geisterbalken/Fill (`.vorher-nachher-*`) und Konfetti (`.konfetti-*`, 3 Keyframes, reduced-motion-Override).

**Designentscheidung (nicht durch Akzeptanzkriterium fixiert):** „Prozentzuwachs" wurde als relatives Wachstum des Kapitalstands `(neu-alt)/alt*100` interpretiert (nicht als Prozentpunkte-Fortschritt zum Ziel) — liest sich als eigenständige Wachstums-Aussage und bleibt auch bei sehr großem `zielKapital` sichtbar (Prozentpunkte-Fortschritt würde bei kleinen Spenden auf 0,0 % runden). Edge Case notiert: bei `altesKapital = 0` (erste Spende überhaupt) zeigt der Text „+0,0 %" — bewusst nicht sonderbehandelt, da unauffällig und sicher.

**Tests:** 110/110 grün (107 bestehend + 3 neu: Geisterbalken-Werte alt/neu + Prozentzuwachs-Text, Reihenfolge/Existenz Spielgeld-Hinweis als letztes Element ohne Chip, Konfetti-Burst-Rendering). Bestehende Tests angepasst, nicht abgeschwächt:
- Zwei Assertions (`SpendenBestaetigung.test.tsx`, `SpendenRechner.test.tsx`) mussten von `getByText(/3.050,00 €/)` auf `getByText(/^3\.050,00 €$/)` verschärft werden, weil derselbe Betrag jetzt zusätzlich im Vorher→Nachher-Text vorkommt (`"3.000,00 € → 3.050,00 €"`) und ohne Anker zwei Treffer entstünden. Die volle Anker-Regex trifft eindeutig nur das `<strong>` im Kapitalstand (RTL `getNodeText` fasst nur direkte Text-Kindknoten zusammen).
- Beide Testdateien bekamen ein `beforeEach`, das `window.matchMedia` auf `reduced-motion: true` stubbt (`vi.stubGlobal`, per bestehendem `afterEach(() => vi.unstubAllGlobals())` sauber zurückgesetzt) — sonst würde `useCountUp` über `requestAnimationFrame` real hochzählen und die synchronen/`findByText`-Assertions wären flaky.
- Regressionsschutz Ehrlichkeits-Constraint (`/Spielgeld/i`, „kein echtes Geld") bleibt bestehen, jetzt gegen den neuen `muted`-Absatz statt den `StatusChip`.

**Verify:** `cd stiftung-web && npm run verify` → exit 0 (tsc --noEmit clean, 110 Tests grün, `next build` erfolgreich).

**Branch-Check:** `git rev-parse --abbrev-ref HEAD` = `begeisterung-pakete` (vor Commit geprüft).

**Concerns:** keine harten Blocker. Eine offene Designentscheidung (Prozentzuwachs-Formel) ist oben dokumentiert, da das Akzeptanzkriterium keinen exakten Wert vorgibt — vom Advisor vor Umsetzung gegengeprüft.

## Fix nach Review

**Review-Findings (Pass 3, beide Important):**

1. **Prozentzuwachs widerspricht Zielbalken:** Die in Pass 1 getroffene Designentscheidung `(neu-alt)/alt*100` erzeugte bei großen Einrichtungen (z. B. `altesKapital` im fünfstelligen Bereich) einen Text wie „+0,0 %" direkt neben einem Balken, der sichtbar von 4,0 % auf 4,25 % wächst — der Text widersprach dem Balken.
2. **`altesKapital` stale bei Zweitspenden:** `SpendenRechner.tsx` übergab immer `einrichtung.aktuellesKapital` (Seitenlade-Snapshot) als `altesKapital`. Da „Jetzt spenden" nach Erfolg wieder klickbar ist, zeigte eine zweite Spende denselben (falschen) Vorher-Stand statt des tatsächlichen Stands nach der ersten Spende. Die Live-Simulation (`computeYearsToGoal`) nutzte ebenfalls weiterhin den stale Startwert.

**Fix 1 — `components/SpendenBestaetigung.tsx`:**
Der relative Wachstumstext wurde entfernt. Die bereits berechneten `altPct`/`neuPct` (Prozent zum Ziel, für den Balken) werden jetzt auch für den Text verwendet: `Von ${formatProzent(altPct)} % auf ${formatProzent(neuPct)} % des Ziels`, 1 Nachkommastelle, de-DE-Formatierung (`toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })`). Der Text ist damit immer konsistent mit dem darüber liegenden Balken.

**Fix 2 — `components/SpendenRechner.tsx`:**
Neuer State `kapitalStand` (Init: `einrichtung.aktuellesKapital`) hält den jeweils aktuellen Live-Stand und wird als `startCapital` der Simulation genutzt. Ein zweiter State `altesKapital` (ebenfalls init `einrichtung.aktuellesKapital`) hält separat den Vorher-Stand der zuletzt gebuchten Spende fest. In `handleSpenden` wird beim Empfang der Server-Antwort zuerst `setAltesKapital(kapitalStand)` aufgerufen (Snapshot des noch nicht überschriebenen Live-Stands), danach `setKapitalStand(updated.aktuellesKapital)`. Zwei separate States sind hier nötig: React batcht `setKapitalStand` und `setStatus('done')` in einem Render, sodass ein einzelner State für „Vorher" beim Rendern bereits den neuen Wert zeigen würde.

**Tests:**
- `SpendenBestaetigung.test.tsx`: bestehender Test „Geisterbalken + Prozentzuwachs" umbenannt/angepasst auf „Ziel-Fortschritt als Text", Assertion prüft jetzt `„Von 12,0 % auf 12,2 % des Ziels"` (Fixture 3000→3050/25000) statt der alten Regex `/\+1,7 %/`. Neuer Regressionstest mit der 800→850/20000-Fixture prüft exakt `„Von 4,0 % auf 4,3 % des Ziels"` und stellt sicher, dass kein `+0,0 %`-Text mehr erscheint.
- `SpendenRechner.test.tsx`: neuer Test mit zwei aufeinanderfolgenden gemockten POSTs (aktuellesKapital 3000→3050→3150). Nach der zweiten Spende wird geprüft, dass der Vorher-Wert der Bestätigung dem Nachher-Wert der ersten Spende entspricht (`„3.050,00 € → 3.150,00 €"`), nicht dem Seitenlade-Snapshot (`3.000,00 €`).

**Testbefehle + Ergebnis:**
```
npx vitest run components/__tests__/SpendenBestaetigung.test.tsx components/__tests__/SpendenRechner.test.tsx
→ Test Files 2 passed (2), Tests 15 passed (15)

npm run verify
→ tsc --noEmit clean, 112/112 Tests grün (25 Testdateien), next build erfolgreich, exit 0
```

**Branch-Check:** `git rev-parse --abbrev-ref HEAD` = `begeisterung-pakete` (vor Commit geprüft).

**Commit:** siehe Git-Log (`fix: Feier-Moment ehrlich — Ziel-Prozente statt Relativ-Wachstum, Kapitalstand-Tracking bei Folgespenden`).
