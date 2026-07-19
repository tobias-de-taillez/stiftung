# Zeitersparnis-Modell (Spendenrechner)

**Stand:** 2026-07-19 · Ursprung: `zeitersparnis.xlsx`

Dieses Modell beantwortet die Kernfrage des Spendenrechners:

> **Wie viel früher erreicht eine Einrichtung ihr Zielkapital, weil du gespendet hast?**

Das Ergebnis ist eine **Zeitersparnis in Tagen** — die emotional greifbarste
Wirkungsaussage der Website, weil sie eine kleine Spende in etwas Konkretes
übersetzt, statt in einen verschwindend kleinen Prozentwert.

> **Ebene: Projektion, nicht Buchung.** Dieses Modell prognostiziert.
> Die tatsächliche Jahresbuchung ist ertragsblind und nimmt den Stichtagswert
> des Depots ([`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md),
> Schritt 2). Aussagen wie „das Kapital wird nie verbraucht" sind daraus
> **nicht** ableitbar — im Verlustjahr wird aus der Substanz entnommen.

---

## Parameter

| Symbol | Bedeutung | Wert |
|---|---|---|
| `r` | Brutto-Rendite ETF (Langfristannahme) | 7 % |
| `a` | Ausschüttungssatz (Direktförderung) | 1 % |
| `s` | Solidaritätsabgabe der Einrichtung | 0 – 1 % |
| `g` | **Netto-Wachstum** = `r − a − s` | **5 – 6 %** |
| `V` | Aktuelles Fondsvolumen der Einrichtung | z. B. 2.500 € |
| `P` | Spendenbetrag | z. B. 10 € |
| `k` | Anzahl Kinder | z. B. 430 |
| `z` | Ziel-Ausschüttung pro Kind und Jahr | z. B. 1 € |

### Zielkapital

```
Zielkapital   Z = k × z / a
Ziel pro Kind     = z / a
```

Beispiel: 430 Kinder × 1 €/Kind/Jahr ÷ 0,01 = **43.000 €**, also 100 € pro Kind.

Die Division durch `a` ist keine willkürliche Konstante: Wenn jährlich 1 % des
Topfes ausgeschüttet wird, braucht es das Hundertfache des gewünschten
Jahresbetrags. `1 / 0,01 = 100`.

---

## Die Wachstumsrate ist eine Spanne, kein Wert

Ein Einrichtungstopf verliert pro Jahr **zwei** Beträge: die Direktförderung
(immer 1 %) und die Solidaritätsabgabe (0 – 1 %, je nach relativer
Ausstattung). Daraus folgt:

| Einrichtung | Abgabe `s` | Netto-Wachstum `g` |
|---|---|---|
| Am schlechtesten ausgestattet (`p = 0`) | 0 % | **6 %** |
| Median (`p = 0,5`) | 0,5 % | 5,5 % |
| Am besten ausgestattet (`p = 1`) | 1 % | **5 %** |

> **Auflösung der alten Tabellenblätter.** `Sheet1` rechnete mit 6 %, `Sheet2`
> mit hartcodierten 5 %. Das war kein Fehler und kein veralteter Wert — es sind
> die **beiden Endpunkte dieser Spanne**. Neu ist nur, dass die Spanne jetzt
> benannt statt implizit ist.

**Konservativ rechnen:** Für Spender-Aussagen 5 % verwenden. Wer eine
Einrichtung unterstützt, die ohnehin schon gut dasteht, bekommt dann keine
geschönte Zahl — und bei den schlecht ausgestatteten Einrichtungen, dem
eigentlichen Ziel der Stiftung, fällt das Ergebnis besser aus als versprochen.

**Bewusst nicht modelliert:** Schlecht ausgestattete Einrichtungen *erhalten*
zusätzlich aus der Umverteilung (Schritt 6 der Kaskade). Das beschleunigt sie
weiter. Die Projektion lässt das weg und unterschätzt sie dadurch.

---

## Formeln

Grundmodell: der Topf wächst geometrisch mit `g`, bis er `Z` erreicht.

### Dauer bis zum Ziel — ohne Spende

```
t₀ = ln(Z / V) / ln(1 + g)
```

### Dauer bis zum Ziel — mit einmaliger Spende `P`

```
t₁ = ln(Z / (V + P)) / ln(1 + g)
```

### Dauer bis zum Ziel — mit jährlicher Spende `P`

Rekursion `Vₙ₊₁ = Vₙ(1 + g) + P`, geschlossen aufgelöst:

```
t₂ = ln( (Z·g + P) / (V·g + P) ) / ln(1 + g)
```

### Zeitersparnis

```
Ersparnis (einmalig) = t₀ − t₁        →  × 365 für Tage
Ersparnis (jährlich) = t₀ − t₂        →  × 365 für Tage
```

Die logarithmische Form ist bewusst gewählt: sie liefert **Fließkomma-Jahre**
statt gerundeter ganzer Jahre. Bei kleinen Spenden liegt die Ersparnis im
Bereich weniger Tage — eine Ganzjahres-Rechnung würde dort auf 0 runden und
die Aussage zerstören.

---

## Durchgerechnetes Beispiel

Einrichtung mit 430 Kindern, aktuell 2.500 € im Topf (5,81 €/Kind), Ziel
43.000 € (100 €/Kind). Spende: 10 €.

| | bei `g` = 6 % | bei `g` = 5 % |
|---|---|---|
| Dauer ohne Spende | 48,8 Jahre | 58,3 Jahre |
| Dauer mit 10 € einmalig | 48,8 Jahre | 58,2 Jahre |
| **Ersparnis einmalig** | **25 Tage** | **30 Tage** |
| Dauer mit 10 € jährlich | 47,8 Jahre | 56,8 Jahre |
| **Ersparnis jährlich** | **380 Tage** | **541 Tage** |

Zwei Dinge, die man daran sieht:

1. **10 € einmalig ≈ 25 Tage früher am Ziel.** Für einen Betrag, den man kaum
   spürt, ist das eine erstaunlich konkrete Aussage.
2. **Jährlich spenden wirkt 15–18× stärker als einmalig** (15,2× bei 6 %,
   18,1× bei 5 %) — nicht etwa 10×, weil jede einzelne Jahresspende selbst
   wieder mitwächst. Das ist das stärkste Argument für eine Mitgliedschaft
   statt einer Einmalspende. Bemerkenswert: der Hebel ist bei den *besser*
   ausgestatteten Einrichtungen größer, weil dort die längere Laufzeit mehr
   Jahresspenden aufsummiert.

---

## Was aus dem alten Dokument entfernt wurde

`Sheet2` bestand aus rund 250 Zeilen, die die Rekursion
`Vₙ₊₁ = (Vₙ + Pₙ) × 1,05` Jahr für Jahr per Hand ausschrieben — eine
numerische Expansion genau der Formel, die oben als `t₂` in geschlossener Form
steht. Kein zusätzlicher Informationsgehalt, aber 250 Zeilen, in denen die
Wachstumsrate 250-mal hartcodiert stand und beim nächsten Parameterwechsel
250-mal hätte geändert werden müssen.

Ersetzt durch die geschlossene Formel. Die Rate steht jetzt an genau einer
Stelle — im Parameterblock oben.

---

## Bezug zur Implementierung

Die Formeln entsprechen `lib/calc/` in `stiftung-web/`
(`NET_GROWTH_RATE`, Bisektion für den Fall jährlicher Spenden). Der aktuelle
Code kennt allerdings die Solidaritätsabgabe noch nicht und rechnet fest mit
6 % — siehe [Abstand zum Zielmodell](stiftung-web/README.md).
