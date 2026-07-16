# Task 28: Impact-Beispiele + Share-Text mit Wirkung — Report

## Status: DONE

## Was wurde gebaut

### 1. `lib/data/impactBeispiele.ts` (neu) + Test
- Exportiert `EinrichtungTyp = 'tagespflege' | 'kita' | 'schule'` (kein zentraler
  Export dieses Unions client-seitig vorhanden, daher hier lokal definiert, wie
  im Kontext des Makers vorgeschlagen).
- `impactBeispiel(typ, jahresAusschuettung)`: reine Funktion, gestaffelt via
  Schwellenwert-Tabelle (Muster wie `lib/data/levels.ts::currentLevel`).
- TDD: Testdatei zuerst geschrieben (RED, Modul existierte nicht), dann
  Implementierung (GREEN). 14 Tests, alle grün.

**Stufen-Design-Entscheidung (dokumentiert wie gefordert):** Die Stufen mussten
innerhalb des im Rechner tatsächlich erreichbaren Wertebereichs liegen. Der
Wert, der an `impactBeispiel` übergeben wird, ist `betrag × ANNUAL_PAYOUT_RATE`
(1 %) — beim Slider-Maximum von 2.000 € ergibt das nur 20 €/Jahr. Deshalb liegt
die höchste Stufe je Typ bei ≤ 20 €/Jahr (tagespflege: 0/5/15, kita: 0/7/16,
schule: 0/8/18) — sonst hätte die UI die gestaffelten Beispiele nie sichtbar
gemacht (Regressionstest dafür vorhanden: "alle drei Stufen liegen innerhalb
des im Rechner erreichbaren Wertebereichs"). Für "kita"/"schule" wurde je ein
dritter Beispiel-Typ ergänzt, da der Brief nur zwei benannte (Bücherkiste/
Musikinstrumente bzw. Klassensatz/Experimentierkasten): kita →
"Bewegungslandschaft für den Turnraum", schule → "Experimentierkasten" blieb
höchste Stufe, darunter "kompletter Klassensatz Schulmaterial", niedrigste
"Schulmaterial für eine Klasse".

### 2. `lib/calc/spendenrechner.ts`
- `ANNUAL_PAYOUT_RATE` (war modul-privat) jetzt `export`iert — keine zweite
  Konstante angelegt, wie in den Interface-Notizen gefordert. Zusätzlicher Test
  in `spendenrechner.test.ts` (`ANNUAL_PAYOUT_RATE === 0.01`).

### 3. `components/SpendenRechner.tsx`
- `EinrichtungFuerRechner.typ: EinrichtungTyp` ergänzt.
- Neue Wirkungs-Zeile unter dem Ergebnis (`data-testid="impact-beispiel"`):
  - `X = betrag × ANNUAL_PAYOUT_RATE` (bei "einmalig" wie im Brief verlangt).
  - Haupttext (verbatim wie im Brief für "einmalig"): „Deine Spende
    erwirtschaftet dauerhaft ~X €/Jahr — das ist z. B. [Beispiel], jedes Jahr
    aufs Neue."
  - Formel-Fußnote, **wichtig nach Advisor-Korrektur**: Erste Fassung hatte
    einen inhaltlichen Fehler (Formulierung ließ vermuten, die 0,50 €/Jahr
    "summieren sich über Jahre zu einer Anschaffung" — das widerspricht dem
    Haupttext, der "jedes Jahr aufs Neue" (= wiederkehrend, nicht kumulativ)
    verspricht) und vertauschte Kapital/Ertrag (fälschlich stand da, der
    Ausschüttungs-Betrag selbst bleibe "angelegt"). Korrigiert: Fußnote sagt
    jetzt korrekt, dass der **Spendenbetrag** dauerhaft im Finanztopf angelegt
    bleibt und nur der **Ertrag** (1 %) jährlich ausgeschüttet wird, ohne dass
    das Kapital schrumpft; die Beispiele stehen für das, was solche
    wiederkehrenden Ausschüttungen über viele Spenden hinweg ermöglichen (nicht
    für das, was ein einzelnes Jahr eines einzelnen Spenders kauft).

**Jährlich-Formel-Entscheidung (dokumentiert wie gefordert):** Für `frequenz
=== 'jaehrlich'` wird dieselbe Formel (`betrag × ANNUAL_PAYOUT_RATE`) je
gespendetem Betrag verwendet (nicht kumuliert über N Jahre), Label „je
gespendetem Betrag" plus zusätzlicher Fußnoten-Satz „Bei jährlicher Spende gilt
diese Rechnung für jeden gespendeten Jahresbetrag erneut." — das ist die im
Kontext genannte Fallback-Variante, gewählt weil eine kumulierte
N-Jahres-Formel (N×betrag×0.01/Jahr) im Fließtext ohne zusätzlichen Zeitbezug
missverständlich gewesen wäre (welches N?).

### 4. `components/SpendenBestaetigung.tsx`
- Kein neuer Prop nötig: Share-Text nutzt die bereits im Component vorhandene
  Ziel-Fortschritt-Mathematik (`altPct`/`neuPct`, dieselbe wie im Balken/
  `zielFortschrittText`) statt eines neuen `impactBeispiel`-Aufrufs — Daten
  „aus vorhandener Rechner-Mathematik" wie gefordert, ohne die Prop-Signatur zu
  erweitern.
- Neuer Share-Text: „Ich habe gerade {Betrag} an {Einrichtung} gespendet — der
  Finanztopf ist jetzt bei {neuPct} % des Ziels (vorher {altPct} %). Mach mit!"
  → enthält das geforderte Delta (Ziel-Prozent-Delta statt Zeit-Delta „verkürzt
  den Weg um … Jahre" — Letzteres hätte einen neuen Prop `jahre`/`altesJahre`
  gebraucht, was Mehraufwand ohne Not gewesen wäre, da der Brief explizit auch
  "Impact-Beispiel oder Delta" als Alternativen nennt).
- **Bekannter Kompromiss:** Kriterium sagt "Wirkung *statt* Transaktion" —
  der Text nennt weiterhin zuerst den gespendeten Betrag, dann das Delta
  (both/and statt strikt instead-of). Wurde bewusst so belassen, da „enthält
  Delta" als Erfüllungskriterium explizit genannt ist und der Betrag für
  Kontext/Glaubwürdigkeit beim Teilen sinnvoll bleibt.
- Test `SpendenBestaetigung.test.tsx`: WhatsApp-Share-Test verschärft — prüft
  jetzt per `decodeURIComponent` den tatsächlichen Inhalt des `wa.me`-Links auf
  die Delta-Werte (12,0 % → 12,2 %), nicht nur, dass der Link `wa.me` enthält.

### 5. `app/einrichtungen/[slug]/page.tsx`
- Prisma liefert `typ` als generischen `string` (kein Enum in
  `schema.prisma`). Getrennte, typisierte Zwischenvariable `rechnerEinrichtung
  = { ...einrichtung!, typ: einrichtung!.typ as EinrichtungTyp }` vor dem
  Rendern angelegt (Cast an der Grenze zwischen Server-Datenmodell und
  client-seitigem engeren Union-Typ), damit `SpendenRechner` seinen
  `EinrichtungFuerRechner`-Typ typsicher bekommt.

## Verifikation
- `npm run verify` (== `tsc --noEmit && npm run test && npm run build`):
  exit 0. 128/128 Tests grün (vorher 112 laut Auftrag + 16 neue/angepasste
  hier: 5 in `impactBeispiele.test.ts` erweitert auf 14 Einzel-Assertions über
  12 `it`-Blöcke, 1 in `spendenrechner.test.ts`, 5 in `SpendenRechner.test.tsx`,
  1 verschärft in `SpendenBestaetigung.test.tsx`). Next-Build erfolgreich,
  Type-Checking sauber.

## Sonstige Erkenntnisse
- `Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'})` setzt ein
  geschütztes Leerzeichen (U+00A0) zwischen Zahl und „€", kein normales
  Leerzeichen — bei direkten `textContent`-Assertions (statt
  `screen.getByText`, das automatisch normalisiert) musste das mit `.replace(/
  \s+/g, ' ')` vor dem Regex-Match berücksichtigt werden.
- Excess-Property-Check von TypeScript greift bei einem Objekt-Spread
  (`{ ...x, feld: y }`) nicht auf die aus dem Spread übernommenen Felder — nur
  auf explizit im Literal geschriebene Schlüssel. Der Cast in `page.tsx`
  kompiliert daher sauber, obwohl `einrichtung!` zusätzliche Felder (`id`,
  `ort`, `createdAt`, …) trägt, die nicht Teil von `EinrichtungFuerRechner`
  sind.

## Concerns
- Keine offenen Blocker. Ein bewusster Trade-off (Share-Text both/and statt
  strikt instead-of) ist oben dokumentiert.
