# Task 29: Rechner-Reframing (Zukunftswert-Story) — Report

**Status:** DONE

**Commit:** 8433d5f — `feat(rechner): Zukunftswert-Story statt Wartezeit im Spendenrechner` (branch `begeisterung-pakete`)

## Was wurde gebaut

### 1. `lib/calc/spendenrechner.ts` (+ Tests)

- `zukunftswert(betrag, jahre, rate = NET_GROWTH_RATE)`: Zinseszins-FV eines
  einmaligen Betrags — bewusst unabhängig vom Startkapital der Einrichtung
  (die Brainstorming-Kernvisualisierung "50 € wachsen zu 40.000 €" ist das
  Wachstum des eigenen Beitrags, nicht des gesamten Finanztopfs).
- `futureValueWithAnnualDonation` war bereits modul-intern vorhanden (Task 6)
  und wurde jetzt `export`iert statt eine zweite Renten-FV-Formel für
  wiederkehrende Spenden zu duplizieren — Aufruf mit `startCapital=0` liefert
  die reine Renten-Komponente einer Spendenreihe.
- `dauerhafteJahresfoerderung(betrag, jahre = 0, rate = NET_GROWTH_RATE)`:
  **KORREKTUR aus dem Brief war der Kern dieser Funktion** — die Ausschüttung
  entsteht aus dem *angewachsenen* Kapital, nicht aus dem Spendenbetrag
  selbst. Die korrekte Formel ist `FV(betrag) × ANNUAL_PAYOUT_RATE` zum
  Zielzeitpunkt; `betrag × 0.01` ist nur der "ab sofort"-Untergrenzfall. Der
  Brief listet die Signatur als `dauerhafteJahresfoerderung(betrag)`
  (1 Parameter) — aufgelöst über einen Default `jahre = 0`:
  `dauerhafteJahresfoerderung(betrag)` → `zukunftswert(betrag,0) × Rate` =
  `betrag × Rate` (Untergrenze, abwärtskompatibel zur Brief-Signatur), während
  `dauerhafteJahresfoerderung(betrag, jahre)` mit explizitem `jahre > 0` die
  ehrliche gewachsene Ausschüttung liefert. Vor der Implementierung per
  Advisor gegengeprüft, da die Brief-Signatur und die KORREKTUR-Formel
  isoliert betrachtet widersprüchlich wirkten.
- `verkuerzungMonate(einrichtung, betrag, frequenz, netRate?)`: Delta
  Jahre-bis-Ziel ohne/mit Spende, in Monaten. Nimmt `{startCapital,
  targetCapital}` (nicht die Prisma-Feldnamen `aktuellesKapital`/`zielKapital`)
  — konsistent mit `computeYearsToGoal`, entkoppelt das Modul von
  Server-Feldnamen. Guard gegen `Infinity − Infinity = NaN` (liefert dann 0 —
  "keine ausweisbare Verkürzung"); ansonsten `Math.max(0, round(...))`.
  **Wichtiger Rechen-Fund:** Bei `frequenz: 'einmalig'` liefert
  `computeYearsToGoal` praktisch nie `Infinity` (die geschlossene Log-Formel
  kennt keinen Zeit-Deckel — schon eine kleine Spende macht ein Ziel formal
  "erreichbar", nur eben in absurd vielen Jahren). Echtes `Infinity` tritt nur
  bei `frequenz: 'jaehrlich'` auf (dort deckelt `computeYearsToGoal` bei
  `MAX_YEARS=500`). Der "unerreichbar auch mit Spende"-Test musste deshalb auf
  ein astronomisches Ziel (`1e30`) mit `frequenz: 'jaehrlich'` umgestellt
  werden — mit einem realistischeren Ziel hätte selbst der Guard-Test nie
  Infinity gesehen.
- Property-Test (gefordert): `verkuerzungMonate` ist ≥ 0 und monoton
  (nicht fallend) in `betrag`, geprüft an einer Folge steigender Beträge
  (10…2000 €) an einer realistischen Fixture (3.000 €/25.000 €), reines
  Vitest ohne fast-check.
- TDD: RED (13 neue Assertions schlugen fehl, Funktionen fehlten) → GREEN.
  21/21 Tests in `spendenrechner.test.ts` grün.

### 2. `lib/calc/format.ts` (+ Tests) — kleine, gerechtfertigte Ergänzung

- `formatMonate(monate)`: Singular/Plural-Formatierung analog zu
  `formatDuration`, für die neue Sekundär-Botschaft im Rechner. Nicht im
  Brief-Dateiumfang genannt, aber trivial und im Stil der bestehenden Datei —
  vom Advisor als vertretbare, geringe Scope-Erweiterung bestätigt.

### 3. `components/SpendenRechner.tsx` (+ Tests)

Hero-Struktur komplett umgebaut, Reihenfolge exakt nach Akzeptanzkriterium:

- **Primär** (`data-testid="zukunftswert-hero"`, nur wenn Ziel erreichbar):
  "Deine {Betrag} sind bei Zielerreichung auf ~{Zukunftswert} angewachsen."
  (Formulierung für `jaehrlich` angepasst: "…wachsen … zusammen auf …").
  Darunter ein beschrifteter Mini-Balken (wiederverwendetes `ProgressBar`,
  Pflicht-Label-Text "X € von Y € — dein Anteil am Ziel", kein Color-only).
  Zusätzlich eine Fußnote zur Wachstumsannahme ("Angenommene
  Netto-Wachstumsrate: 6 % pro Jahr, konstant bis zur Zielerreichung — eine
  Modellrechnung … keine garantierte Prognose") — **nachträglich per
  Advisor-Review ergänzt**: Die Hero-Zahl ist die prominenteste, überzeugendste
  Zahl der Seite, hätte aber ohne Fußnote als unbelegte Zukunftsprognose
  gelesen werden können (Bindungsregel 2: "Honest math only … Fußnoten wo
  vereinfacht").
- **Sekundär** (`data-testid="verkuerzung"`, nur wenn `verkuerzungMonate > 0`):
  "Und verkürzen den Weg zum Ziel um {Y Monate}." Bewusst ausgeblendet, wenn
  0 Monate — ein "verkürzt um 0 Monate"-Satz direkt nach der Zukunftswert-
  Botschaft wäre ein Anti-Klimax gewesen (in der Browser-Verifikation an
  einer realen Einrichtung mit großem Kapitalstand tatsächlich beobachtet:
  50 € bewegen bei 536.000 € Startkapital die Jahreszahl nicht messbar).
- **Tertiär** (`data-testid="years-result"`, unverändertes Testid, jetzt
  kleiner/muted): "{Jahre bis Ziel} bis zum Ziel von {Zielkapital}" — bleibt
  bestehen, zeigt bei Infinity weiterhin "nicht erreichbar", aber demotiert.
- **Fallback bei Infinity** (`data-testid="dauerfoerderung-perspektive"`):
  "Dein Beitrag trägt schon ab sofort dauerhaft mit ~{dauerhafteJahresfoerderung(betrag)}/Jahr
  bei." + Fußnote, dass dies eine Untergrenze ist, die mit dem Kapital
  weiterwächst. Die Task-28-Wirkungs-Zeile (Impact-Beispiele) bleibt
  unverändert bestehen — wie im Kontext gefordert, komplementär statt
  Duplikat (bewusst *nicht* dieselbe Formulierung wie die neue
  Fallback-Headline, um keine Zahl doppelt/verwirrend zu präsentieren).

**Design-Entscheidung (nicht durch Akzeptanzkriterium fixiert):** Die
gewachsene Variante von `dauerhafteJahresfoerderung` (mit `jahre > 0`) wird in
der laufenden UI nirgends aufgerufen — der Brief verlangt sie nur für den
Infinity-Fallback (dort ist `jahre` per Definition unbestimmt, also gilt der
Default `jahre=0`). Die Funktion ist getestet und exportiert, aber im
Produkt derzeit nur über den Untergrenzfall sichtbar. Bewusst nicht
künstlich in die Hero-Zeile gezwungen, um die vom Brief geforderte
"saubere Hero" nicht mit einer vierten Zahl zu überladen — vom Advisor
bestätigt.

## Verifikation

- TDD: Alle neuen Funktionen und die Komponenten-Änderungen RED→GREEN
  entwickelt (RED-Läufe protokolliert, siehe Testläufe während der Session).
- `npm run verify` (`tsc --noEmit && npm run test && npm run build`):
  **Exit 0**, 151/151 Tests grün (26 Testdateien), Next-Build erfolgreich.
- Browser-Verifikation (Dev-Server via `.claude/launch.json`, echte
  Seed-Daten): `/einrichtungen/tagesmutter-wirbelwind-muenchen` (3.861 €/
  25.000 €) zeigt bei 50 € Default: "Deine 50,00 € sind bei Zielerreichung
  auf ~319,59 € angewachsen." + Balken "319,59 € von 25.000,00 € — dein
  Anteil am Ziel" (1 %) + "Und verkürzen den Weg zum Ziel um 3 Monate." +
  tertiär "31 Jahre und 10 Monate bis zum Ziel von 25.000,00 €" + unveränderte
  Task-28-Wirkungs-Zeile. An `/einrichtungen/gymnasium-neustadt-hamburg`
  (536.129 €/1.200.000 €) korrekt beobachtet: Sekundär-Satz erscheint NICHT,
  weil 50 € bei diesem Kapitalstand die Zielzeit nicht um ein ganzes
  Monat verkürzen (Regressionsschutz für den `verkuerzung > 0`-Guard live
  bestätigt, nicht nur in Unit-Tests).

## Concerns

Keine harten Blocker. Zwei bewusste, dokumentierte Trade-offs (oben
beschrieben): (1) `dauerhafteJahresfoerderung`s gewachsener Zweig
(`jahre > 0`) wird aktuell nur getestet, nicht live angezeigt — Infinity-
Fallback nutzt bewusst nur den Untergrenzfall. (2) Die `jaehrlich`-Hero-
Formulierung ("…wachsen … zusammen auf …") ist nicht durch einen direkten
Component-Test abgesichert (der Infinity-Test klickt zwar auf "Jährlich",
landet aber im Fallback-Zweig, nicht im Zukunftswert-Hero-Zweig) — reine
Formulierungs-Abdeckungslücke, keine Logiklücke (die zugrundeliegende
`futureValueWithAnnualDonation`-Formel ist über `spendenrechner.test.ts`
direkt getestet).

## Fix nach Review

**Commit:** f440c6c — `test: Jährlich-Hero-Pfad des Spendenrechners komponentengetestet (Rentenbarwert-Verdrahtung)`

Die Formulierungs-Abdeckungslücke wurde geschlossen. Der neue Test
`zeigt den Jährlich-Hero-Pfad mit erreichbarem Ziel: Rentenbarwert-Verdrahtung mit jährlicher Wording`
in `SpendenRechner.test.tsx`:

- Nutzt die Standard-Fixture (3000/25000 €, 5 Kinder, Default 50 € Betrag)
- Klickt auf "Jährlich", um in den Renten-Zweig zu wechseln
- Berechnet die erwarteten Jahre und den Zukunftswert mit den **gleichen
  exportierten Funktionen** wie die Komponente selbst
  (`computeYearsToGoal`, `futureValueWithAnnualDonation`, `NET_GROWTH_RATE`)
- Verifiziert, dass (a) die Hero-Div sichtbar ist (Ziel erreichbar), (b) die
  jährlich-spezifische Wording present ist ("Deine jährlichen", "wachsen bis
  zur Zielerreichung"), (c) der berechnete Zukunftswert mit Dezimal-Muster
  angezeigt wird
- Reuses das bestehende `beforeEach`/`afterEach`-Stub-Pattern für `matchMedia`
  (reduced-motion) → `useCountUp` wird determinis­tisch

**Verifikation:**
- Test-Lauf: `cd stiftung-web && npx vitest run components/__tests__/SpendenRechner.test.tsx` → alle 19 Tests grün (+1 neu)
- Full-Verify: `npm run verify` (`tsc + test + build`) → **Exit 0**, 152/152 Tests grün
