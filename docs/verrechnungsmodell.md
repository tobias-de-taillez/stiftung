# Verrechnungsmodell — Spezifikation

**Stand:** 2026-07-19 · **Status:** Entwurf v0.1 (abgestimmt, noch nicht implementiert)

Diese Spezifikation beschreibt, wie das Verrechnungs-Backend der Deutschen
Bildungsstiftung funktionieren muss: Kontenstruktur, Datenmodell, laufende
Prozesse und die vollständige Jahres-Kaskade.

Sie konkretisiert [`docx/Zusatzdokument zur Mittelverwendung.md`](../docx/Zusatzdokument%20zur%20Mittelverwendung.md)
und **weicht an drei Stellen bewusst davon ab** (siehe [Abweichungen](#abweichungen-vom-zusatzdokument)).

## Geltungsbereich

Diese Spec regelt **die Buchung**: Kontenmodell, Datenmodell, Spendeneingang,
Jahres-Kaskade, Abgabe und Umverteilung. In diesem Bereich gilt bei
Widerspruch dieses Dokument.

**Nicht** geregelt und ausdrücklich nicht überschrieben:

| Ebene | Beispiele | Wo geregelt |
|---|---|---|
| **Produkt** | Zielkapital pro Einrichtung, Level-System, Fortschrittsanzeige | Build-Plan, Website-Konzept |
| **Projektion** | „Deine 50 € sind in 10 Jahren ~90 €", Spendenrechner | `zeitersparnis.md` |
| **Anlagestrategie** | ETF-Auswahl, erwartete Rendite, Inflationsannahme | Leitbild, Finanzplan |
| **Rechtsform & Governance** | Verein vs. Stiftung, Organe, Beschlusswege | Satzung, Leitbild |

Der Unterschied ist wichtig: Wenn diese Spec sagt „es wird keine Rendite
berechnet" (Schritt 2), heißt das, dass die **Jahresbuchung** ertragsblind
auf dem Stichtagswert arbeitet. Es heißt *nicht*, dass keine
Wachstumsprojektion gegenüber Spender:innen gezeigt werden darf — eine
Prognose ist keine Buchungsregel.

Die Grenze verläuft bei **Prognose vs. Zusage**: „bei ~6 % Wachstum wären das
in 10 Jahren ~X €" ist zulässig. „Das Kapital wird nie verbraucht" ist es
nicht, denn Schritt 2 entnimmt auch im Verlustjahr.

### Kanonische Projektionsannahme

Damit Spendenrechner, Wirkungsaussagen und Planungsdokumente nicht
auseinanderlaufen, gilt **überall dieselbe Annahme**:

| Größe | Wert |
|---|---|
| Brutto-Rendite (ETF, Langfristmittel) | **7 %** |
| Ausschüttung (Direktförderung) | **1 %** |
| Netto-Wachstum | **6 %** |
| Benötigtes Kapital | **Jahresbetrag / 0,01** |

Die Kapitalformel folgt direkt aus dem 1 %-Satz (`1 / 0,01 = 100`) — beide
sind untrennbar und dürfen nie getrennt zitiert werden.

Ergänzend, **nicht** als Ersatz: bei rund 3 % Inflation entspricht das
6 %-Nominalwachstum etwa 3 % real. Diese Angabe ist eine Zusatzinformation
für Realwert-Aussagen — die frühere Rechnung „6 % − 3 % = 3 % entnehmbar" ist
**abgelöst** und darf nicht wiederbelebt werden.

Der 1 %-Satz ist der einzige Wert dieser Tabelle, der zugleich Buchungsregel
ist (Schritt 3). Die übrigen sind reine Prognose.

> **Achtung:** Der aktuelle Code-Stand in `stiftung-web/` implementiert dieses
> Modell **nicht**. Dort läuft eine einfachere Verteilungslogik ohne
> Verrechnungskonto, ohne zweites Depot und ohne Management-Konto. Die
> Umsetzung ist ein Umbau, kein Patch.

### Gemeinnützigkeitsrechtliche Einordnung

Der Träger ist in Phase 1 ein gemeinnütziger Verein (siehe [Leitbild](../leitbild.md),
[Vereinssatzung](../docx/Vereinssatzung.md)). Für ihn gilt das Gebot der zeitnahen
Mittelverwendung nach § 55 Abs. 1 Nr. 5 AO: Mittel sind spätestens in den auf den
Zufluss folgenden zwei Kalenderjahren zweckgebunden zu verwenden. Das Modell hält
das ein, weil es drei Geldströme unterscheidet:

| Strom | Behandlung | Rechtsgrundlage |
|---|---|---|
| Eingehende gewidmete Zuwendungen | dauerhaft ins Vermögen, kein Zeittakt | § 62 Abs. 3 Nr. 1–4 AO |
| Wertsteigerung im ETF | kein Zufluss, daher kein Zeittakt | Prämisse P1, siehe unten |
| Verkaufserlöse für die Ausschüttung | Zufluss, wird zeitnah ausgeschüttet | § 55 Abs. 1 Nr. 5 AO, erfüllt |

Deshalb sind **Schritt 2** (Verrechnungskonto nur auf 1 % des Poolwerts auffüllen)
und die **Wahl eines thesaurierenden ETF** keine Optimierungen, sondern
Bedingungen des Modells. Sie sind in § 4 Abs. 6 der Vereinssatzung verankert.

> **⚠️ Prämisse P1 — nicht verifiziert.** Das Modell nimmt an, dass die
> Wertsteigerung eines thesaurierenden ETF keinen Mittelzufluss im Sinne des
> § 55 Abs. 1 Nr. 5 AO auslöst, weil der Körperschaft nichts zufließt. Trägt
> diese Annahme nicht, wäre die Thesaurierung auf rund ein Drittel des
> Überschusses aus der Vermögensverwaltung gedeckelt (freie Rücklage,
> § 62 Abs. 1 Nr. 3 AO) — das Netto-Wachstum läge dann nicht bei 6 %, sondern
> bei grob 2,3 %, und die Ausschüttungsquote entsprechend höher. **Vor
> Gründung mit einer Steuerberater:in klären** (Fragen S1/S2 in
> [`superpowers/specs/2026-07-19-vereinsgruendung-design.md`](superpowers/specs/2026-07-19-vereinsgruendung-design.md)).

---

## 1. Kontenmodell

| Ebene | Art | Zweck |
|---|---|---|
| **Einrichtungs-Depot** | ETF | Gesamtgeld aller Einrichtungsfonds, gepoolt |
| **Verrechnungskonto** | Bank | Cash-Puffer am Einrichtungs-Depot. Ein-/Auszahlungen |
| **Soli-Depot** | ETF | Solidaritätsfonds, eigenes Depot |
| **Soli-Verrechnungskonto** | Bank | Cash-Puffer am Soli-Depot |
| **Management-Konto** | Bank | Betriebsmittel des Vereins, gedeckelt |
| **Einrichtungsfonds** | *Tabellenzeile* | Anteil einer Einrichtung am Einrichtungs-Depot |

**Einrichtungen haben keine eigenen Konten.** Die Zuordnung passiert
ausschließlich über Tabellenzeilen. Buchhaltung und Kassenlage sind
entkoppelt: Der Topf einer Einrichtung kann Geld ausweisen, das physisch
gerade als Cash auf dem Verrechnungskonto liegt statt im ETF.

Das Soli-Depot ist bewusst getrennt: Erreicht es **zwei Millionen Euro**, löst
das die Pflicht zur Umwandlung des Vereins in eine Stiftung aus (§ 13 der
[Vereinssatzung](../docx/Vereinssatzung.md)). Maßgeblich ist allein der
Soli-Fonds — die den Einrichtungen zugeordneten Kapitalbestände zählen
nicht mit. Das Einrichtungs-Depot kann die Schwelle also längst
überschritten haben, ohne den Auslöser zu berühren.

**Bei der Umwandlung wird das Soli-Depot geteilt** (§ 13 Abs. 3 Vereinssatzung):

| Teil | Betrag | Verwendung |
|---|---|---|
| **Grundstock** | 1.000.000 € | Grundstockvermögen der Stiftung. Substanz unangetastet, Erträge tragen Bestand und Verwaltung |
| **Soli-Fonds** | Rest (≥ 1.000.000 €) | Verteilt weiter an Einrichtungen mit geringem Kapital je Kind, unverändert |

Für das Datenmodell heißt das: Ab der Umwandlung braucht es **eine dritte
Topf-Ebene** neben Einrichtungs-Depot und Soli-Depot. Der Grundstock ist
buchhalterisch ein eigener Topf mit eigener Entnahmeregel — seine Erträge
fließen ins Management-Konto, nicht in die Umverteilung. Das ist ein Umbau,
der erst zur Umwandlung fällig wird; heute ist er nicht zu implementieren,
aber beim Entwurf des Kontenmodells mitzudenken, damit er später kein
Datenmigrations-Problem wird.

---

## 2. Datenmodell: Anteile, keine Euro-Beträge

Der ETF-Wert ändert sich täglich. Würde jeder Einrichtungsfonds als
Euro-Betrag gespeichert, müsste bei jeder Kursbewegung jede Zeile neu
geschrieben werden.

**Jeder Topf wird deshalb als Pool-Anteil gespeichert:**

```
Topf_€ = Anteil × Poolwert
Poolwert = ETF-Marktwert + Verrechnungskonto-Saldo
```

- Spende → kauft Anteile
- Auszahlung → verkauft Anteile
- Kursbewegung → **null Schreibvorgänge**, der Euro-Wert ergibt sich beim Lesen

*Verworfene Alternative:* Euro-Beträge speichern und periodisch alle Zeilen
proportional reskalieren. Gleiche Semantik, deutlich höhere Schreiblast.

**Invariante (muss jederzeit gelten):**

```
Σ Topf_€ (alle Einrichtungen) == Poolwert
```

### Datentypen: ganzzahlige Cent, ganzzahlige Anteile

**Kein Fließkomma für Geld.** Alle Geldbeträge werden als **Integer in Cent**
gespeichert und gerechnet. Über Jahrzehnte von Anteilskäufen, -verkäufen und
Umverteilungen summieren sich Fließkomma-Fehler sonst auf, und die Invariante
oben würde nur noch näherungsweise gelten — genau das, was sie ausschließen
soll.

*Betrifft den Bestand:* `stiftung-web/` speichert heute `aktuellesKapital` als
`Float`. Die Migration ist Teil des Umbaus.

**Anteile sind kein Geld** und brauchen einen eigenen Typ. Sie werden als
Integer in einer festen Feinheit geführt (Vorschlag: 10⁻⁸ Anteilseinheiten),
damit auch Kleinstspenden bei großem Pool noch abbildbar sind, ohne auf 0 zu
runden.

### Rundung

Bei proportionaler Verteilung bleiben fast immer Restcents übrig.

1. Jeden Einzelbetrag **kaufmännisch auf Cent** runden.
2. Die verbleibende Differenz zur Zielsumme der Einrichtung mit dem
   **niedrigsten Pro-Kind-Volumen** zuschlagen.

Deterministisch, prüfbar, und der Restcent landet systematisch dort, wohin das
Modell ohnehin umverteilt. Die ausgeschüttete Summe entspricht damit **exakt**
der berechneten — die Invariante hält auf den Cent.

Bei Gleichstand am unteren Ende entscheidet die niedrigere Einrichtungs-ID,
damit das Ergebnis reproduzierbar bleibt.

---

## 3. Laufende Prozesse

### 3.0 Erstbefüllung neuer Einrichtungen

Ein Finanztopf kann von jeder Person angelegt werden, auch anonym — über die
Einrichtungs-Suche auf der Website. Damit Spender:innen nicht auf 0 € blicken,
wird ein Initialbetrag in Aussicht gestellt.

**Die Anlage ist zweistufig — erst flüchtig, dann persistent:**

| Stufe | Auslöser | Persistenz | Buchung |
|---|---|---|---|
| 1. Anlage der Einrichtung | Eingabe durch eine beliebige Person | **keine** — reiner Browser-Zustand | keine |
| 2. Erste Spende | tatsächlicher Spendeneingang | Einrichtung + Topf werden angelegt | Soli-Depot → Einrichtungs-Depot |

In Stufe 1 entsteht **kein Datensatz**: weder Einrichtung noch Topf. Die
eingegebenen Daten existieren nur im Browser. Erst die reale Spende macht
beides persistent und löst die Überweisung aus.

Der angezeigte Betrag ist dabei **keine Platzhalterzahl**, sondern wird live
aus dem aktuellen Soli-Fonds-Stand ermittelt — er ist echt, nur eben noch
nicht gebucht.

**Darstellungspflicht.** In Stufe 1 darf der Betrag **nicht** als Kontostand
des Topfes ausgewiesen werden — das wäre eine falsche Tatsachenbehauptung und
verletzt „Transparenz vor Vertrauensvorschuss" aus dem
[Leitbild](../leitbild.md). Korrekt ist eine als solche erkennbare Zusage:

> „Sobald du spendest, legt der Solidaritätsfonds 21 € dazu."

Nicht: „Aktueller Stand: 21 €".

**Warum das den Missbrauchsvektor schließt.** Ohne diese Zweistufigkeit könnte
jede Person anonym beliebig viele Fake-Einrichtungen anlegen und den
Soli-Fonds leerziehen. Weil Stufe 2 eine echte Spende verlangt, kostet
Masse-Anlage nichts und bewirkt nichts. Zusätzlich ist das Geld auch dann
nicht entnehmbar: Auszahlungen an eine Einrichtung setzen einen verifizierten
Zugang (KYC) voraus, und ein nicht abgeholter Topf erhält keine Umverteilung
(Abschnitt 3.4).

Die Invariante aus Abschnitt 2 bleibt in beiden Stufen gewahrt: In Stufe 1
existiert nichts, in Stufe 2 wird verschoben, nicht erzeugt.

**Zwei Konsequenzen aus der fehlenden Persistenz in Stufe 1:**

- **Doppelanlage.** Zwei Personen können dieselbe Einrichtung gleichzeitig im
  Browser anlegen. Spenden beide, entstehen zwei Datensätze für dieselbe
  Einrichtung. Beim Persistieren ist deshalb gegen die bestehenden
  Einrichtungen zu deduplizieren (Name + Adresse); bei Treffer fließt die
  Spende in den existierenden Topf und die Erstbefüllung entfällt.
- **Der Betrag kann sich ändern.** Zwischen Anzeige und Spende vergeht Zeit,
  und der Soli-Fonds bewegt sich. Verbindlich ist der Stand **zum Zeitpunkt
  der Buchung**, nicht der angezeigte. Weicht er nennenswert ab, ist der
  tatsächliche Betrag in der Spendenbestätigung auszuweisen.

**Höhe der Erstbefüllung**

```
Erstbefüllung = min( Basisbetrag , Spendenbetrag , 0,5 % × Soli-Fonds )
```

Drei Grenzen, jede mit eigenem Zweck:

| Grenze | Wirkung |
|---|---|
| **Basisbetrag** (Vorschlag: 25 €) | Obergrenze im Normalfall — hält die Zusage klein und erklärbar |
| **Spendenbetrag** | Der Soli-Fonds gibt nie mehr, als frisches Geld hereinkommt. Wer 5 € spendet, bekommt 5 € dazu — Verdopplung als Anreiz, ohne Netto-Abfluss |
| **0,5 % des Soli-Fonds** | Schützt einen noch kleinen Soli-Fonds. Bei 1.000 € Fondsstand sind das 5 € — die Erstbefüllung kann den Fonds so nie nennenswert leerziehen |

Die 0,5-%-Grenze bindet nur in der Frühphase: Ab etwa 5.000 € Soli-Fonds
liegt sie über dem Basisbetrag und wird wirkungslos.

*(Der Basisbetrag ist noch nicht beschlossen — 25 € ist ein Vorschlag.)*

### 3.1 Spendeneingang

Eine Spende hat **zwei unabhängige Merkmale**:

| Merkmal | Werte |
|---|---|
| **Empfänger** | eine bestimmte Einrichtung · oder Solidaritätsfonds |
| **Verwendungsart** | Vermögenszuführung · oder Direktausschüttung |

#### Verwendungsart A — Vermögenszuführung (Regelfall)

Die spendende Person bestimmt ausdrücklich, dass die Zuwendung dem Vermögen
zugeführt werden soll (**§ 62 Abs. 3 Nr. 2 AO**). Die Spende unterliegt damit
nicht der zeitnahen Mittelverwendung, wird dauerhaft angelegt und finanziert
die Einrichtung über ihre Erträge.

Buchung: Verrechnungskonto → Anteilskauf im Topf der Einrichtung
beziehungsweise im Soli-Fonds. Wie bisher.

#### Verwendungsart B — Direktausschüttung

Die Spende wird **nicht** angelegt, sondern zeitnah an die Einrichtung
ausgezahlt. Sie ist zeitnah zu verwendendes Mittel nach § 55 Abs. 1 Nr. 5 AO;
die Frist wird durch die Auszahlung selbst erfüllt.

**Nur wählbar, wenn die Einrichtung KYC-verifiziert ist.** Ohne verifizierten
Zugang gibt es kein Konto, auf das ausgezahlt werden könnte — und die
Leitbild-Regel „niedrige Hürde zum Geben, hohe Hürde zum Nehmen" verlangt die
Prüfung vor jedem Abfluss. Für nicht verifizierte Einrichtungen steht daher
ausschließlich Verwendungsart A zur Verfügung.

**Für den Solidaritätsfonds gibt es keine Direktausschüttung.** Eine
Soli-Spende hat keinen benannten Empfänger; ohne Empfänger ist die Widmung
gegenstandslos. Soli-Spenden sind immer Verwendungsart A.

#### Buchungstechnische Folge: durchlaufende Mittel

Geld der Verwendungsart B darf **niemals Anteile kaufen** und **nicht in den
Poolwert eingehen**. Sonst bricht die Invariante aus Abschnitt 2:

```
Σ Topf_€ (alle Einrichtungen) == Poolwert
```

Direktausschüttungen sind **durchlaufende Posten**: Sie liegen als
Verbindlichkeit gegenüber der Einrichtung auf dem Verrechnungskonto und
werden von dort ausgezahlt. Der Sweep (Abschnitt 3.2) muss sie deshalb vom
investierbaren Cash abziehen:

```
investierbar = Verrechnungskonto − offene Direktausschüttungen
```

Wird das übersehen, investiert der Sweep fremdes Geld und die Auszahlung
scheitert an fehlender Liquidität.

#### Auszahlungsrhythmus

Direktausschüttungen werden **gesammelt und monatlich** ausgezahlt, nicht
einzeln. Einzelüberweisungen bei Kleinspenden würden von Transaktionskosten
aufgefressen — dieselbe Logik wie beim Sweep. Die Zwei-Jahres-Frist des § 55
Abs. 1 Nr. 5 AO ist dabei mit großem Abstand eingehalten.

#### Dokumentation der Widmung

Damit § 62 Abs. 3 Nr. 2 AO trägt, muss die Widmung **von der spendenden
Person** erklärt und nachweisbar sein. Zu jeder Spende der Verwendungsart A
sind daher zu speichern:

- der Zeitpunkt der Erklärung (muss zum Zahlungszeitpunkt vorliegen, nicht später),
- der **Wortlaut**, der der Person angezeigt wurde, versioniert — ändert sich
  die Formulierung, bleibt die alte Fassung den alten Spenden zugeordnet,
- die getroffene Auswahl.

**Die Widmung gehört nicht auf die Zuwendungsbestätigung.** Die amtlichen
Muster sind verbindlich (§ 50 Abs. 1 EStDV, BMF v. 07.11.2013); das
Vermögensstock-Ankreuzfeld existiert nur in den Stiftungs-Mustern. Für die
spendende Person ist der Abzug in beiden Fällen identisch (§ 10b Abs. 1 EStG)
— die Wahl hat für sie **keine steuerliche Auswirkung**, nur eine inhaltliche.

#### Voreinstellung

Vorausgewählt ist **Verwendungsart A**. Das Kapitalaufbau-Modell ist der Kern
des Vorhabens; die Direktausschüttung ist die bewusste Abweichung. Die
Voreinstellung darf nicht versteckt sein — beide Optionen stehen sichtbar
nebeneinander, mit einem Satz, der die Folge erklärt.

#### Warum die Direktspende überhaupt existiert

Nicht als Zugeständnis, sondern wegen der **Zuwendungsbestätigung**: Die
Spende geht an den Verein, also stellt der Verein die Bestätigung aus. Eine
Tagesmutter oder eine kleine Kita — häufig gar nicht selbst gemeinnützig —
muss sich nie mit Spendenquittungen befassen. Genau daran scheitern
Direktspenden an Kleinsteinrichtungen sonst.

Das ist zugleich ein Argument gegenüber Einrichtungen: Wer sich verifiziert,
kann Spenden entgegennehmen, ohne eigene steuerliche Infrastruktur aufzubauen.

Im [Leitbild](../leitbild.md) ist die Direktspende seit dem 2026-07-19
ausdrücklich Teil der Mission — der frühere Widerspruch zum Satz „Spenden
werden nicht verbraucht, sondern angelegt" ist damit aufgelöst.

> ⚠️ **Ungeklärt: Empfängerfähigkeit der Einrichtungen.** Betrifft **beide**
> Verwendungsarten, nicht nur die Direktspende — siehe Frage S9 im
> [Vereinsgründungs-Spec](superpowers/specs/2026-07-19-vereinsgruendung-design.md).
> Eine Tagesmutter ist in der Regel ein privatwirtschaftliches
> Einzelunternehmen und damit weder steuerbegünstigte Körperschaft noch
> juristische Person des öffentlichen Rechts. Die Mittelweitergabe nach
> § 58 Nr. 1 AO setzt aber genau das voraus. Vor dem ersten realen Abfluss zu
> klären.

### 3.2 Sweep ins Depot

Um Transaktionsgebühren zu vermeiden, wird Cash nicht bei jeder Spende
investiert, sondern erst ab einer Schwelle:

```
investierbar = Verrechnungskonto − offene Direktausschüttungen
Ziel         = 1,0 % des Poolwerts
Schwelle     = 1,2 % des Poolwerts

WENN investierbar > Schwelle:
    kaufe ETF für (investierbar − Ziel)
```

Der Abzug der offenen Direktausschüttungen ist zwingend — dieses Geld gehört
bereits den Einrichtungen (Abschnitt 3.1).

Es wird also **auf das 1-%-Ziel abgeschöpft**, nicht um feste 0,2 %. Die
Formulierung „bei 1,2 % werden die 0,2 % eingezahlt" beschreibt nur den
Grenzfall, in dem das Konto exakt auf der Schwelle steht. Liegt es darüber —
etwa nach einer Großspende — wird entsprechend mehr investiert.

Der Sweep ist eine Neuerung dieser Spec; das Zusatzdokument kennt weder ein
Verrechnungskonto noch eine Sweep-Schwelle.

Die 1 % während des Jahres sind **kein Auszahlungspuffer**, sondern nur eine
Transaktions-Frequenz-Schwelle. Am Stichtag wird ohnehin auf den echten
Bedarf aufgefüllt (Schritt 2 der Kaskade).

Gleiche Regel analog für das Soli-Verrechnungskonto.

### 3.3 Schließung einer Einrichtung

Stellt eine Einrichtung den Betrieb endgültig ein, geht ihr Fondsvolumen
**vollständig in den Soli-Fonds** über. Der Topf wird geschlossen, die
Einrichtung verlässt das Ranking.

Buchung: Einrichtungs-Depot → Soli-Depot. Einen Sammel- oder „Gründungspool"
gibt es nicht.

Zusammen mit Abschnitt 3.0 ergibt das einen geschlossenen Kreislauf: **Der
Soli-Fonds ist Ein- und Ausgang des Einrichtungs-Lebenszyklus.** Neue
Einrichtungen werden aus ihm erstbefüllt, geschlossene fließen in ihn zurück.
Kein Geld verlässt das System, keins bleibt stecken — genau die Zusage aus dem
[Leitbild](../leitbild.md).

### 3.4 Nicht abgeholte Töpfe

Eine Einrichtung kann einen Topf haben, ohne ihren Zugang je eingefordert zu
haben (KYC nicht durchlaufen). Solche Töpfe bleiben **im System und im
Ranking**, werden aber asymmetrisch behandelt:

| Schritt | Verhalten |
|---|---|
| 3 — Direktförderung | **entfällt.** Kein verifizierter Empfänger, also keine Auszahlung. Der Betrag bleibt im Topf. |
| 4 — Solidaritätsabgabe | **wird gezahlt**, ganz normal nach `p`. |
| 6 — Umverteilung | **wird nicht empfangen.** |

**Zweck:** Eine große Einmalspende an eine noch inaktive Einrichtung bleibt
dadurch trotzdem wirksam — sie speist über die Abgabe dauerhaft den
Solidaritätsfonds und kommt so anderen Einrichtungen zugute, statt untätig zu
liegen.

**Selbstverstärkende Wirkung.** Weil die Direktförderung entfällt, wächst ein
nicht abgeholter Topf schneller als ein aktiver (7 % statt 6 % abzüglich
Abgabe). Sein Pro-Kind-Volumen steigt also relativ zu den anderen, er klettert
im Ranking, und sein `p` — und damit sein Abgabesatz — wächst mit. **Je länger
eine Einrichtung ihren Zugang nicht abholt, desto stärker subventioniert sie
die anderen.** Das ist gewollt und braucht keinen zusätzlichen Mechanismus.

Holt die Einrichtung ihren Zugang später ab, nimmt sie ab dem nächsten
Stichtag regulär teil. Nichts geht verloren; der angesammelte Topf steht in
voller Höhe bereit.

---

## 4. Jahres-Kaskade

### Stichtag: zweiter Freitag im Januar

| | |
|---|---|
| **Bewertungsstichtag** | Schlusskurs des **zweiten Freitags im Januar** (fällt immer auf den 8.–14. Januar) |
| **Berechnung** | am darauffolgenden Wochenende, bei geschlossener Börse |
| **Ausführung** | Depot-Transaktionen am folgenden Montag zur Börsenöffnung |

Gewählt aus drei Gründen: Die Jahreswechsel-Volatilität hat sich bis dahin
beruhigt; ein Freitag ist nie ein Feiertag; und das Wochenende bei
geschlossener Börse gibt Zeit, sauber zu rechnen und die Einrichtungen zu
informieren, bevor Geld bewegt wird.

Alle Werte der Kaskade beziehen sich auf den **Bewertungsstichtag**, nicht auf
den Ausführungstag. Kursbewegungen am Montag ändern die berechneten Beträge
nicht mehr.

*Ersetzt die widersprüchlichen Angaben der Altdokumente (1. Januar,
30. Januar, 30. März).*

### Ablauf

Läuft einmal jährlich in dieser Reihenfolge.

| # | Schritt | Cash-Bewegung |
|---|---|---|
| 1 | Snapshot: Poolwert, alle `v_i`, Soli-Stand | — |
| 2 | Verrechnungskonto auf 1 % des Poolwerts auffüllen | ETF-Verkauf |
| 3 | Direktspende 1 % je Einrichtung auszahlen | Verrechnungskonto → **0 €** |
| 4 | Solidaritätsabgabe einziehen | Einr.-Depot → Soli-Depot |
| 5 | Management-Konto abgleichen | Soli-Depot ↔ Bank |
| 6 | Umverteilung ausschütten | Soli-Depot → Einr.-Depot |

### Schritt 1 — Snapshot

```
Poolwert = ETF-Marktwert + Verrechnungskonto
v_i      = Topf_€(i) / Kinderzahl(i)        // Fondsvolumen pro Kind
```

`v_i` wird **einmal** hier ermittelt und für Schritt 4 verwendet. Für
Schritt 6 wird neu ermittelt (die Töpfe haben sich inzwischen geändert).

### Schritt 2 — Verrechnungskonto auffüllen

```
Bedarf = 1 % des Poolwerts        // == Summe aller Direktspenden
Differenz = Bedarf − Verrechnungskonto

Differenz > 0  →  ETF verkaufen für Differenz
Differenz < 0  →  Überschuss ins ETF investieren
```

Das Konto wird also auf **exakt** den Bedarf abgeglichen, in beide Richtungen.
Der negative Fall ist erreichbar: der laufende Sweep (Abschnitt 3.2) feuert
erst bei 1,2 %, das Konto kann am Stichtag also zwischen 1,0 % und 1,2 %
stehen.

**Es wird keine Rendite berechnet.** Der ETF hat am Stichtag den Wert, den er
hat. Auch in einem Verlustjahr wird 1 % des dann geltenden Volumens
entnommen — die Auszahlung fällt entsprechend kleiner aus. Ein Shortfall ist
strukturell unmöglich, solange das Depot überhaupt Wert hat.

### Schritt 3 — Direktspende

```
Direktspende_i = 1 % × Topf_€(i)     → an die Einrichtung ausgezahlt
```

Nach diesem Schritt steht das Verrechnungskonto per Konstruktion auf **0 €**
und startet so ins neue Jahr.

**Ausnahme:** Für nicht abgeholte Töpfe entfällt die Direktförderung — es gibt
keinen verifizierten Empfänger (Abschnitt 3.4). Der Bedarf in Schritt 2 ist
entsprechend um diese Töpfe zu kürzen, sonst wird zu viel Cash bereitgestellt
und das Konto landet nicht auf 0.

### Schritt 4 — Solidaritätsabgabe

```
Abgabe_i = p_i × 1 % × Topf_€(i) zum Snapshot        // Stand aus Schritt 1,
                                                     // NICHT nach Direktspende
```

`p_i` nach [Abschnitt 5](#5-rangposition-p). Die Einrichtung mit dem
niedrigsten `v` zahlt 0 %, die mit dem höchsten 1 %.

**Bemessungsgrundlage ist zwingend der Snapshot aus Schritt 1**, nicht der um
die Direktspende reduzierte Topf. Das sind zwei verschiedene Größen: `v_i`
(für das Ranking) *und* die Euro-Basis (für den Betrag) stammen beide aus dem
Snapshot. Andernfalls hinge die Abgabe von der Reihenfolge innerhalb der
Kaskade ab — im Beispiel unten wären es 1,818 € statt 1,836 €.

### Schritt 5 — Management-Konto abgleichen

```
Ziel     = min(Cap, Kontostand + 1 % × Soli-Fonds)
Bewegung = Ziel − Kontostand      // + : Soli → Konto,  − : Konto → Soli
```

Zufluss ist auf 1 % des Soli-Fonds gedeckelt, Rückfluss ist ungedeckelt.
Beispiele:

| Kontostand | Cap | 1 % Soli | Bewegung |
|---|---|---|---|
| 25k | 250k | 120k | +120k (Lücke reicht) |
| 25k | 250k | 300k | +225k (Cap begrenzt, 75k bleiben im Soli) |
| 250k | 150k | 3k | −100k (Rückfluss nach Cap-Senkung) |

Der Rückfluss steht **vor** Schritt 6, damit zurückgeflossenes Geld sofort in
die Umverteilung eingeht statt ein Jahr ungenutzt zu liegen.

Dieser Schritt läuft **unabhängig vom Ranking** — auch wenn Schritt 4 und 6
entfallen (siehe [Randfälle](#6-randfälle)).

### Schritt 6 — Umverteilung

```
S = 1 % × Soli-Fonds nach Schritt 5      // also nach dem Management-Abgleich
Förderung_i = (1 − p_i) / Σ(1 − p_j) × S
```

`p_i` wird hier **neu** ermittelt (Töpfe haben sich in Schritt 3 und 4
geändert). Die Einrichtung mit dem niedrigsten `v` bekommt den größten
Anteil, die mit dem höchsten bekommt 0.

**Nicht abgeholte Töpfe sind von der Umverteilung ausgeschlossen**
(Abschnitt 3.4). Sie fallen aus der Gewichtssumme `Σ(1 − p_j)` heraus — das
Verfahren normalisiert über die verbleibenden Empfänger, sodass weiterhin
exakt `S` ausgeschüttet wird. Für die Ermittlung von `p` selbst zählen sie
dagegen **mit**: ihr Kapital ist real und Teil der Verteilungslage.

---

## 5. Rangposition `p`

`p` ist die Position einer Einrichtung zwischen dem ärmsten und reichsten
Pro-Kind-Volumen — **wertbasiert, nicht ordinal**. Ein Ausreißer wird dadurch
nach seinem tatsächlichen Abstand behandelt, nicht nur nach seinem Platz in
der Reihenfolge.

```
n = Anzahl Einrichtungen
WENN n < 2 → keine Abgabe, keine Umverteilung

// Skala NUR aus verifizierten Einrichtungen (KYC durchlaufen):
v_lo = P5(v_verifiziert)     // 5. Perzentil, lineare Interpolation
v_hi = P95(v_verifiziert)    // 95. Perzentil

WENN Anzahl(verifiziert) < 2:          // zu wenige für eine Skala
    v_lo = P5(v_alle);  v_hi = P95(v_alle)   // Fallback: alle

WENN v_hi == v_lo:                    // Winsorisierung kollabiert
    v_lo = min(v);  v_hi = max(v)     // Fallback: ungewinsorisiert
WENN v_hi == v_lo:                    // wirklich alle gleich
    → keine Abgabe, keine Umverteilung

p_i = clamp( (v_i − v_lo) / (v_hi − v_lo), 0, 1 )
```

### Nur verifizierte Einrichtungen bilden die Skala

`v_lo` und `v_hi` werden **ausschließlich aus KYC-verifizierten
Einrichtungen** gebildet. Grund: Bei der Anlage durch Fremde ist die
Kinderzahl nur geschätzt, geht aber über `v = Topf / Kinder` direkt in die
Skala und damit in die Abgabesätze **aller** Einrichtungen ein. Eine grob
falsche Schätzung würde fremde Zahlungen verschieben.

Unverifizierte Einrichtungen bekommen trotzdem ein `p` (geklemmt auf `[0, 1]`)
und zahlen damit ganz normal Abgabe — sie **beeinflussen** die Skala nur
nicht, sie **werden** an ihr gemessen.

Der Fallback bei weniger als zwei verifizierten Einrichtungen ist praktisch
relevant: In der MVP-Phase sind die meisten Einträge noch unverifiziert.

### Winsorisierung

Das `clamp` **ist** die Winsorisierung. Einrichtungen unterhalb P5 landen auf
`p = 0`, oberhalb P95 auf `p = 1`. Extremwerte werden an den Rand gezogen,
statt den Rand zu definieren — sonst würde ein Tippfehler in der Kinderzahl
oder eine einzelne Großspende die Sätze *aller* Einrichtungen reskalieren.

Der `v_hi == v_lo`-Fallback ist nötig, wenn über 90 % der Einrichtungen
identisches `v` haben, aber Ausreißer existieren: dann kollabiert die
winsorisierte Spanne, obwohl die Verteilung nicht gleich ist.

**Winsorisierung wirkt erst ab n ≥ 21.** Damit P95 den obersten Wert nicht
mehr berührt, muss gelten `0,95 × (n−1) ≤ n−2`, also `n ≥ 21`. Für P5
analog. Darunter degradiert das Verfahren sauber auf reines Min/Max — kein
Sonderfall nötig, aber in der MVP-Phase ist die Winsorisierung faktisch
inaktiv.

### Warum kein Max-Satz und kein ×2

Das Zusatzdokument rechnet mit `Max-Satz = (S / n) × 2`. Dieser Faktor ist
**nur bei ordinaler Rangvergabe** korrekt, weil dort `Σ(1−p) = n/2` exakt
gilt. Wertbasiert stimmt das nicht mehr:

```
Beispiel (3 Einrichtungen):  Σ(1−p) = 1,758  statt  n/2 = 1,5
→ ×2 würde 117 % der Zielsumme ausschütten
```

Die proportionale Allokation `(1−p_i)/Σ(1−p_j) × S` schüttet dagegen **exakt
S aus, für jede Verteilung** — und kollabiert bei ordinaler Staffelung auf
genau die `2S/n`-Formel des Zusatzdokuments. Sie ist also eine
Verallgemeinerung, keine Abkehr.

### Eigenschaften

- **Crash-invariant.** Eine uniforme Marktbewegung kürzt sich in
  `(v_i − v_lo)/(v_hi − v_lo)` vollständig heraus. Nicht nur die
  Reihenfolge, sondern die exakten Sätze bleiben unverändert.
- **Keine Gleichstands-Regel nötig.** Gleiche `v` ergeben automatisch
  gleiches `p`; die proportionale Allokation verarbeitet gleiche Gewichte
  ohne Sonderbehandlung.
- **Wirkt stark nach unten, begrenzt nach oben.** Ein echter Armuts-Ausreißer
  erhält Gewicht ≈ 1 und damit fast die gesamte Ausschüttung. Nach oben ist
  der Effekt schwächer: die reichste Einrichtung zahlt in jedem Schema 1 %.
  Erst ab n ≥ 21 greift die Winsorisierung und verhindert, dass ein
  Super-Ausreißer die Reichen darunter schützt. Soll auch nach oben stärker
  gewirkt werden, braucht die Abgabeseite eine konvexe Kennlinie statt der
  linearen — **offene Designfrage**.

---

## 6. Randfälle

| Fall | Verhalten |
|---|---|
| `n = 1` | Keine Abgabe, keine Umverteilung. Kein relativer Vergleich möglich. |
| Alle `v` gleich | Keine Abgabe, keine Umverteilung. |
| `v_hi == v_lo` (winsorisiert) | Fallback auf Min/Max, dann erneut prüfen. |
| `n < 21` | Winsorisierung inaktiv, Verhalten == Min/Max. Kein Fehler. |

**Alle `v` gleich ist ein Erfolgsfall, kein Fehlerfall.** Es bedeutet, dass
die Verteilungsgleichheit aus dem [Leitbild](../leitbild.md) erreicht ist.
Entsprechend als Zielerreichung protokollieren und im Jahresbericht
ausweisen — nicht als Division-durch-Null-Guard wegfangen.

In allen Fällen ohne Umverteilung gilt:

- Das 1 % **verlässt den Soli-Fonds nicht**. Es bleibt liegen und wächst
  weiter — kein Geld bleibt stecken, es wird nur später verteilt.
- Schritt 5 (Management-Konto) läuft trotzdem.

---

## 7. Cash-Optimierung: brutto buchen, netto überweisen

Schritte 4, 5 und 6 bewegen Geld zwischen zwei ETF-Depots und einem
Bankkonto — teilweise in entgegengesetzte Richtungen im selben Lauf.

**Gebucht wird brutto**, pro Einrichtung einzeln (Abgabe und Förderung
erscheinen als getrennte Positionen). Das ist die
Transparenz-Anforderung aus dem Leitbild.

**Überwiesen wird netto.** Aus dem durchgerechneten Beispiel unten:

| | brutto | |
|---|---|---|
| Abgabe | Einrichtungen → Soli | +1,84 € |
| Management | Soli → Bank | −3,02 € |
| Umverteilung | Soli → Einrichtungen | −2,99 € |

→ **Netto:** Soli-Depot verkauft 4,17 €, davon 3,02 € aufs Management-Konto
und 1,15 € ins Einrichtungs-Depot. Zwei Transaktionen statt vier.

> ⚠️ **Steuerlich ungeklärt (Frage S8).** Der Vereinsgründungs-Spec leitet aus
> Prämisse P1 die Vorgabe ab: *Verkäufe nur in Höhe des Ausschüttungsbedarfs.*
> Die Kaskade verkauft aber auch für Abgabe (Schritt 4), Umverteilung
> (Schritt 6), Erstbefüllung (3.0) und Schließung (3.3) — allesamt kein
> Ausschüttungsbedarf.
>
> Das Netting oben entschärft das teilweise (im Beispiel ergibt sich für das
> Einrichtungs-Depot netto sogar ein Kauf), aber nicht verlässlich.
>
> **Fällt S8 negativ aus, gibt es zwei Auswege:** ein *gemeinsames* Depot
> (Abgabe und Umverteilung wären dann reine Umbuchungen ohne Verkauf), oder
> ein weiter gefasster Sweep-Korridor (Abschnitt 3.2), sodass der Netto-Saldo
> aus dem Cash-Puffer gedeckt ist.
>
> Herleitung und beide Auswege im Detail:
> [`superpowers/specs/2026-07-19-vereinsgruendung-design.md`](superpowers/specs/2026-07-19-vereinsgruendung-design.md),
> Abschnitt „S8 im Detail". **Vor der Implementierung des Zwei-Depot-Modells
> klären** — die Antwort entscheidet über Abschnitt 1.

---

## 8. Governance des Management-Kontos

- Der **Cap** wird von der Mitgliederversammlung beschlossen, auf Vorschlag
  des Finanzvorstands. Jedes Vereinsmitglied darf vorab einen eigenen
  Finanzvorschlag einreichen.
- Der Cap muss **vor** dem Stichtags-Lauf feststehen, sonst hat Schritt 5
  kein Ziel.
- Wird der Cap unter den aktuellen Kontostand gesenkt, fließt der Überschuss
  in den Soli-Fonds zurück (Schritt 5, negative Bewegung).
- Die Vereinsführung legt der Mitgliederversammlung einen
  Finanz-Rechenschaftsbericht vor. Das Management-Konto braucht dafür
  **transaktionsgenaue Buchhaltung** (wofür wurde ausgegeben) — anderes
  Datenmodell als die Fonds-Tabellen, wo nur Salden zählen.

### Zwei Regler, zwei Zeithorizonte

| Regler | Begrenzt | Gesetzt von |
|---|---|---|
| 1 % des Soli-Fonds | Langfrist-Ausgabenrate | Mechanismus |
| Cap | Einzeljahres-Maximum | Mitgliederversammlung |

Nachhaltiger Missbrauch ist strukturell unmöglich: der dauerhafte
Ausgabenpfad ist auf 1 % des Soli-Fonds pro Jahr begrenzt, egal was
beschlossen wird. Innerhalb eines Jahres ist das Ausgeben vom Konto nicht
ratenbegrenzt — der Cap ist insofern der Einzeljahres-Blast-Radius, und er
ist mitgliederautorisiert.

**Daraus folgt die Tragfähigkeitsbedingung:**

```
Soli-Fonds ≥ 100 × gewünschtes Jahresbudget
```

250k € Jahresbudget verlangen also **25 Mio € Soli-Fonds**. Darunter
schrumpft das Management-Konto Jahr für Jahr, unabhängig vom beschlossenen
Cap. Nicht der Cap ist die bindende Größe, sondern die Soli-Fonds-Größe.

---

## 9. Durchgerechnetes Beispiel

**Ausgangslage**

| Einrichtung | Fonds | Kinder | €/Kind |
|---|---|---|---|
| A | 100 € | 5 | 20,00 € |
| B | 150 € | 4 | 37,50 € |
| C | 125 € | 5 | 25,00 € |

Soli-Fonds 300 € · Management-Konto 1000 €, Cap 1200 € ·
Verrechnungskonto 0 € · Einrichtungs-Depot 375 €

**Ereignis:** Spende 40 € zweckgebunden für A, danach Jahresende.

---

**Spendeneingang.** A: 100 → 140 €. Buchbestand gesamt 415 €.
Verrechnungskonto 0 → 40 €.

**Sweep.** Ziel 1 % × 415 = 4,15 €, Schwelle 1,2 % × 415 = 4,98 €.
40 € > 4,98 € → ETF-Kauf über 35,85 €.
Verrechnungskonto 4,15 € · Depot 410,85 €.

**Schritt 1 — Snapshot.** Poolwert 415 €.
`v`: A 28,00 · B 37,50 · C 25,00

**Schritt 2 — Auffüllen.** Bedarf 1 % × 415 = 4,15 €. Konto steht bereits auf
4,15 € → kein Verkauf nötig.

**Schritt 3 — Direktspende.** A 1,40 € · B 1,50 € · C 1,25 € = 4,15 €
ausgezahlt. Verrechnungskonto → **0 €**.
Töpfe: A 138,60 · B 148,50 · C 123,75

**Schritt 4 — Abgabe.** Sortiert [25,00 · 28,00 · 37,50], n = 3:

```
P5  = 25,00 + 0,1 × 3,00 = 25,30
P95 = 28,00 + 0,9 × 9,50 = 36,55        Spanne 11,25

p_C = clamp(−0,027) = 0
p_A = 2,70 / 11,25   = 0,2400
p_B = clamp( 1,084)  = 1
```

Abgabe: C 0 € · A 0,24 % × 140 = 0,336 € · B 1 % × 150 = 1,50 € → **1,836 €**
Töpfe: A 138,264 · B 147,00 · C 123,75 · Soli **301,836 €**

> Bei n = 3 ist die Winsorisierung wirkungslos: ungewinsorisiert ergäbe sich
> `p_A = 3,00/12,50 = 0,2400` — identisch.

**Schritt 5 — Management-Konto.** 1 % × 301,836 = 3,018 €.
`Ziel = min(1200; 1000 + 3,018) = 1003,018` → Bewegung **+3,018 €**.
Konto **1003,02 €** · Soli **298,818 €**

**Schritt 6 — Umverteilung.** S = 1 % × 298,818 = 2,988 €.
`v` neu: A 27,6528 · B 36,75 · C 24,75

```
P5  = 25,040    P95 = 35,840        Spanne 10,80

p_C = 0        (1−p) = 1,0000
p_A = 0,2419   (1−p) = 0,7581
p_B = 1        (1−p) = 0,0000
                     Σ = 1,7581

C: 1,0000 / 1,7581 × 2,988 = 1,700 €
A: 0,7581 / 1,7581 × 2,988 = 1,289 €
B: 0 €                        Σ = 2,988 €  ✓
```

---

**Endstand**

| | Fonds | Direktspende (Cash) |
|---|---|---|
| A | **139,55 €** | 1,40 € |
| B | **147,00 €** | 1,50 € |
| C | **125,45 €** | 1,25 € |

Soli-Fonds **295,83 €** · Management-Konto **1003,02 €** ·
Verrechnungskonto **0 €**

Netto-Cash: Soli-Depot verkauft 4,17 € → 3,02 € Bank, 1,15 € Einrichtungs-Depot.

---

## 10. Rechtsform: Verein jetzt, Stiftung später

Diese Spec unterstellt einen **gemeinnützigen Verein**:
Mitgliederversammlung, Finanzvorstand, Beschluss des Caps durch die
Mitglieder (Abschnitt 8).

`docx/Stiftungssatzung.md` und `docx/Zusatzdokument zur Mittelverwendung.md`
unterstellen dagegen eine **Stiftung** (Stiftungsrat, Stiftungsleitung,
NStiftG). Das ist kein Widerspruch, sondern der Phasenplan — sie sind
**Phase-3-Artefakte** und werden nicht auf Vereinssprache umgeschrieben.

Phasenplan und Begründung stehen im [Leitbild](../leitbild.md), die
rechtsverbindliche Regel in § 13 der
[Vereinssatzung](../docx/Vereinssatzung.md), die steuerliche Herleitung im
[Vereinsgründungs-Spec](superpowers/specs/2026-07-19-vereinsgruendung-design.md).
**Hier wird nur die Kapitalwirkung geregelt** — alles andere ist dort
nachzulesen, nicht hier zu wiederholen.

### Schwellenwert und Übergang

**Erreicht der Soli-Fonds 2 Mio. €, wird er geteilt: 1 Mio. € geht ins
Grundstockvermögen der Stiftung, der Rest bleibt Soli-Fonds.**

Frist und Verfahren regelt nicht diese Spec, sondern § 13 der
[Vereinssatzung](../docx/Vereinssatzung.md): Der Vorstand ist ab Erreichen der
Schwelle verpflichtet, die Überführung binnen zwei Jahren zu vollziehen; die
Mitgliederversammlung kann um jeweils ein Jahr verlängern, aber nur auf
schriftliche, vorab versendete und veröffentlichte Begründung. Zur Motivation
(erweiterter Spendenabzug nach § 10b Abs. 1a EStG) siehe
[Leitbild](../leitbild.md), Phase 3.

Für die Verrechnung ist allein die **Kapitalwirkung** relevant:

| Topf | vor der Umwandlung | nach der Umwandlung |
|---|---|---|
| Grundstock | — | 1.000.000 €, Substanz gebunden, Erträge → Management-Konto |
| Soli-Fonds | ≥ 2.000.000 € | Restbetrag, mindestens 1.000.000 € |
| Einrichtungs-Depot | unverändert | unverändert |

> ✅ **Die Schwelle von 2 Mio. € ist genau deshalb so gewählt.** Eine frühere
> Fassung dieser Spec setzte 1 Mio. € an und ließ das *gesamte* Volumen in den
> Grundstock übergehen. Der Soli-Fonds startete danach bei 0 €, womit
> gleichzeitig Umverteilung (Schritt 6), Zufluss zum Management-Konto
> (Schritt 5) und Erstbefüllung neuer Einrichtungen (Abschnitt 3.0) für Jahre
> ausgefallen wären — bei rund 5.000 € Jahresabgabe hätte der Wiederaufbau
> sehr lange gedauert. Die Teilung bei 2 Mio. € beseitigt diese Durststrecke:
> Der Betrieb läuft nach der Umwandlung mit mindestens 1 Mio. € Soli-Fonds
> ununterbrochen weiter.

Die Tragfähigkeitsbedingung aus Abschnitt 8 (`Soli ≥ 100 × Jahresbudget`) ist
nach der Teilung weiterhin zu prüfen: Bei 1 Mio. € Rest-Soli trägt sie ein
Jahresbudget von bis zu 10.000 €. Reicht das nicht, ist vor der Umwandlung
entweder das Management-Konto vorzufüllen oder die Schwelle anzuheben.

**Datenmodell.** Ab der Umwandlung existiert der Grundstock als **dritte
Topf-Ebene** mit eigener Entnahmeregel — seine Erträge fließen ins
Management-Konto, nicht in die Umverteilung. Nicht heute zu implementieren,
aber beim Entwurf des Kontenmodells mitzudenken, damit es später keine
Datenmigration erzwingt.

Für die Verrechnung ändert die Rechtsform nichts: Kaskade, Formeln und
Kontenmodell sind identisch. Es wechselt nur das beschlussfassende Organ —
Mitgliederversammlung statt Stiftungsrat.

---

## Abweichungen vom Zusatzdokument

| Zusatzdokument | Diese Spec | Grund |
|---|---|---|
| Quartilsorientierte Staffelung nach Rang | Wertbasierte Interpolation P5/P95 | Ausreißer nach tatsächlichem Abstand behandeln, nicht nach Platz |
| `Max-Satz = (S / n) × 2` | `(1−p_i)/Σ(1−p_j) × S` | ×2 ist nur bei ordinaler Staffelung exakt |
| Stiftungskosten direkt aus Soli-Fonds | Management-Konto mit Cap | Planbarkeit + Missbrauchsbegrenzung |

---

## Offene Punkte

Zwei Zahlen fehlen noch, beide unkritisch — beides Vorschläge, keine
Blockierer:

- **Basisbetrag der Erstbefüllung** (Abschnitt 3.0). Vorschlag: **25 €**.
- **Feinheit der Anteilseinheiten** (Abschnitt 2). Vorschlag: **10⁻⁸**.

Ein drittes, größeres Thema liegt außerhalb dieser Spec, wirkt aber direkt auf
sie:

- **Übergangsplan zur Stiftungsumwandlung.** Der Soli-Fonds fällt bei der
  Umwandlung auf 0 (Abschnitt 10). Vor der Umwandlung ist zu beschließen, wie
  der Betrieb die Durststrecke finanziert. Governance, nicht Verrechnung.

### Entschieden am 2026-07-19

| Frage | Entscheidung |
|---|---|
| Stichtag | Zweiter Freitag im Januar, Ausführung Montag (Abschnitt 4) |
| Erstbefüllung | `min(Basisbetrag, Spende, 0,5 % Soli-Fonds)` (Abschnitt 3.0) |
| Persistenz neuer Einrichtungen | Erst bei Spendeneingang (Abschnitt 3.0) |
| Nicht abgeholte Töpfe | Zahlen Abgabe, erhalten keine Umverteilung (Abschnitt 3.4) |
| Schließung | Volumen geht in den Soli-Fonds (Abschnitt 3.3) |
| Skalenbildung | Nur verifizierte Einrichtungen (Abschnitt 5) |
| Abgabe-Kennlinie | **Linear.** Erklärbar, Deckel fest bei 1 %; die Winsorisierung repariert den Reichen-Effekt ab n ≥ 21 ohnehin |
| Mittelungsfenster | **Keines.** Stichtagswert direkt; Winsorisierung und Crash-Invarianz dämpfen bereits. Neu bewerten, falls Ausreißer bei n < 21 stören |
| Umwandlungsschwelle | **2 Mio. €** im Soli-Fonds; davon 1 Mio. € ins Grundstockvermögen, Rest bleibt Soli-Fonds (Abschnitt 10) |
| Rundung | Kaufmännisch auf Cent, Restbetrag an die ärmste Einrichtung (Abschnitt 2) |
| Geldtyp | Ganzzahlige Cent; Anteile als eigener Integer-Typ (Abschnitt 2) |
| Rechtsform | Kein offener Punkt — siehe Abschnitt 10 |
