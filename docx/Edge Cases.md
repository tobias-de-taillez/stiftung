> **Teilweise beantwortet.** Mehrere Punkte dieser Liste sind inzwischen in
> [`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md) geregelt:
>
> | Punkt | Status |
> |---|---|
> | Kursschwankungen verzerren Abgaben/Ausschüttungen | **Entschärft.** Alle Einrichtungsfonds liegen im selben Depot, eine uniforme Marktbewegung kürzt sich in der Rangformel vollständig heraus — die Sätze sind crash-invariant, nur die Absolutbeträge schrumpfen. |
> | Rundungsdifferenzen in der Quartilsberechnung | **Gegenstandslos.** Das ordinale Quartilsverfahren ist durch wertbasierte P5/P95-Interpolation ersetzt. |
> | Sonderzuwendungen / Großspenden verzerren das Ranking | **Abgemildert** durch die P5/P95-Winsorisierung — greift allerdings erst ab 21 Einrichtungen. |
> | Mindestpolster in Verlustjahren | **Entschieden: nein.** Entnommen wird 1 % des Stichtagswerts, auch im Minusjahr. |
> | Einrichtungsschließung | **Weiterhin offen** — siehe unten, zwei sich ausschließende Varianten. |
> | Gleitender Mittelwert / mehrjähriger Durchschnitt | **Weiterhin offen**, in der Spec als offener Punkt geführt. |

Bei einem komplexen Verteilungsmodell wie dem Zwei-Säulen-Modell der Deutschen Bildungsstiftung kann es neben den bereits genannten Sonderfällen (z. B. Neugründung/Schließung einer Einrichtung) noch eine Reihe weiterer „Edge-Cases“ geben, die bei der praktischen Umsetzung bedacht werden sollten. Im Folgenden eine (nicht abschließende) Liste von Situationen, die zusätzliche Regeln oder Vorgehensweisen erfordern können:

**Dramatische Veränderungen in der Kinderzahl einer Einrichtung**

Wenn sich die Kinderzahl in kurzer Zeit stark erhöht oder verringert (z. B. durch Schließung einer Parallel-Einrichtung, Zuzug/Abwanderung in eine Region), kann sich das „Fondsvolumen pro Kind“ erheblich verschieben.

Es sollte definiert werden, ob für die Berechnung der Abgabe und Ausschüttung der Durchschnittswert eines bestimmten Zeitraums zugrunde gelegt wird, um kurzfristige Ausreißer abzufedern.

**Außergewöhnlich starke Kursschwankungen oder Kapitalverluste**

Falls die Geldanlage (ETF-Portfolio etc.) in einem Jahr erhebliche Verluste einfährt, kann das Fondsvolumen deutlich sinken. Dies kann sowohl die Abgaben als auch die Ausschüttungen verzerren.

Zu klären ist, ob in solchen Fällen ein „Mindestpolster“ oder ein mehrjähriger Durchschnitt für die Ermittlung des relevanten Fondsvolumens angesetzt wird.

**Verschmelzungen oder Zusammenschlüsse von Einrichtungen**

Wenn zwei Bildungseinrichtungen fusionieren (z. B. aus schulorganisatorischen Gründen), muss geklärt werden, wie sich deren Fondsvolumina und Kinderzahlen zusammenführen.

Gleiches gilt umgekehrt für die Aufspaltung großer Einrichtungen.

**Teilweises Aussetzen oder Pausieren**

Manche Einrichtungen könnten vorübergehend keine Kinder aufnehmen (z. B. umfangreiche Sanierung, pandemiebedingte Schließung). Hier stellt sich die Frage, ob der Fonds und sein Volumen dann „eingefroren“ wird oder weiterhin in die Berechnungen einfließt.

**Kurzfristige Neuanmeldungen am Stichtag**

Wenn eine Einrichtung sich sehr knapp vor dem Stichtag registriert oder nachmeldet, könnte das zu Verzerrungen bei den Rangberechnungen führen.

Möglicherweise sind Registrierungsfristen oder bestimmte Stichtage zu definieren, bis zu denen die Daten vorliegen müssen.

**Sonderzuwendungen oder Großspenden**

Erhält eine Einrichtung innerhalb kürzester Zeit einen sehr hohen einmaligen Spendenbetrag, steigt ihr Fondsvolumen sprunghaft an.

Es wäre zu prüfen, ob ein Korrekturmechanismus (z. B. ein gleitender Mittelwert) die Berechnung gegen solche Einmaleffekte absichern soll.

**Rundungsdifferenzen in der Quartilsberechnung** — *gegenstandslos*

> Das ordinale Quartilsverfahren ist ersetzt. Die Rangposition wird jetzt
> wertbasiert zwischen P5 und P95 interpoliert und auf `[0, 1]` geklemmt; die
> Ausschüttung wird proportional über die tatsächliche Gewichtssumme
> normalisiert und ist dadurch für jede Verteilung und jede Einrichtungszahl
> exakt. Ein Gleichstands-Sonderfall entfällt.
>
> Offen bleibt nur die **Geldrundung**: kaufmännisch auf Cent, mit definierter
> Zuweisung des Restbetrags, damit die Invariante `Σ Topf_€ == Poolwert` exakt
> hält. Siehe [`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md).

Ursprüngliche Notiz:

Die Quartile und Ränge werden i. d. R. anhand statistischer Verfahren berechnet (Medians, Interpolationen). Je nach Anzahl der Einrichtungen kann es zu Rundungsdiskussionen kommen (z. B. bei sehr kleiner oder sehr großer Einrichtungszahl).

Eine klare Definition, wie gerundet wird (mathematisch, kaufmännisch, floors/ceilings etc.), schafft Transparenz.

**Zuwendungen mit spezifischen Zweckbindungen jenseits des Fondsvolumens**

Manche Spender könnten Spenden zweckbinden, die nicht direkt ins allgemeine Fondsvolumen fließen sollen (z. B. „Nur für Digitalisierung“). Die Frage ist, ob und wie sich das auf die Kennzahl „Fondsvolumen pro Kind“ auswirkt, wenn die Mittel streng zweckgebunden sind.

**Sonderregeln für unterschiedliche Bildungstypen**

Kitas, Schulen oder Tagesmütter können sich in ihren Kostenstrukturen erheblich unterscheiden. Wenn eine Einrichtung etwa sehr wenige Kinder betreut (z. B. Kleinstschule im ländlichen Raum, inklusives Förderzentrum), können extreme Pro-Kopf-Werte entstehen.

Hier kann ein „gewichteter Mechanismus“ oder eine Mindest-/Höchstgrenze sinnvoll sein, damit das Ranking nicht zu stark verzerrt wird.

**Wechsel der Rechtsform oder Aufgabe des Gemeinnützigkeitsstatus**

Ändert sich der Status einer Einrichtung (z. B. durch Privatisierung) und sie erfüllt nicht mehr die Förderkriterien der Stiftung, stellt sich die Frage, was mit dem bis dahin angesparten Fondsvolumen geschieht.

**Abgleich von Ist- und Prognosewerten**

Durch Verzögerungen beim Melden der Kinderzahlen oder bei der Aktualisierung der Fondsstände können veraltete Daten die Verteilungen verzerren.

Eventuell sollten regelmäßige Prüfzyklen festgelegt sein (z. B. Quartalsweise oder halbjährlich) und besondere Nachmelderegeln für die Statistik eingeführt werden.

**Technische und organisatorische Fehler**

Fehlerhafte Dateneingabe, IT-Systemausfälle oder versehentliche Doppeleinträge können zu falschen Berechnungen führen.

Ein Notfallprotokoll, das Datenstände sichert und bei Fehlern Rückbuchungen/Neuabrechnungen zulässt, ist wichtig.

**Grenzüberschreitende Spenden (Internationalität)**

Falls es irgendwann Spender aus dem Ausland gibt oder Einrichtungen jenseits der Landesgrenzen (z. B. deutsche Schulen im Ausland) berücksichtigt werden sollen, kann dies besondere steuer- und rechtliche Fragen aufwerfen (z. B. Anerkennung der Gemeinnützigkeit, Währungsumrechnungen).

**Ereignisse höherer Gewalt**

Naturkatastrophen, Epidemien oder politische Krisen können dazu führen, dass einzelne Einrichtungen temporär komplett schließen müssen oder das Spendenaufkommen massiv einbricht bzw. stark steigt (z. B. Nothilfeprogramme).

Hier kann eine Sonderklausel die Möglichkeit schaffen, Mittel im Notfall anders zu verteilen, ohne das reguläre System zu sehr zu destabilisieren.

**Einrichtungsschließung/Eröffnung** — *entschieden (2026-07-19)*

Was passiert mit dem Fondsvolumen einer Einrichtung, wenn diese final den Betrieb einstellt?

**Das Fondsvolumen geht vollständig in den Soli-Fonds über.**

Umgekehrt werden neu angelegte Einrichtungen aus dem Soli-Fonds erstbefüllt.
Der Soli-Fonds ist damit Ein- und Ausgang des Einrichtungs-Lebenszyklus — ein
separater Sammeltopf ist dafür nicht nötig. Siehe
[`docs/verrechnungsmodell.md`](../docs/verrechnungsmodell.md), Abschnitte 3.0
und 3.3.


