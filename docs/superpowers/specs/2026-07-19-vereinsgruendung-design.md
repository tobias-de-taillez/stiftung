# Design: Gemeinnütziger Verein als Rechtsform der Phase 1

**Stand:** 2026-07-19 · **Status:** Entwurf zur Umsetzung

---

## Ausgangslage

`leitbild.md` beschreibt die Sequenz bereits vollständig:

> **Phase 1 — Verein, MVP bei der Tagespflege.** Wir starten als gemeinnütziger Verein (deutlich weniger Startkapital als eine Stiftung) […]
> **Phase 3 — Umwandlung in eine Stiftung.** Bei Erreichen einer definierten Schwellensumme wird der Verein in eine Stiftung überführt. Die Rechtsform folgt dem Kapital, nicht umgekehrt.

Die strategische Entscheidung ist also nicht Gegenstand dieses Specs. Gegenstand ist die **Lücke zwischen Leitbild und Projektstand**: Es existiert nur eine `Stiftungssatzung.md`, keine Vereinssatzung, und README sowie `projekt-status.md` sprechen durchgängig von einer Stiftung.

## Ziel

1. Eine belastbare **Vereinssatzung** als Entwurf, die den Kapitalaufbau-Mechanismus des Leitbilds vereinsrechtlich und gemeinnützigkeitsrechtlich trägt.
2. **Docs-Konsistenz**: Die aktuellen (nicht historischen) Aussagen zur Rechtsform stimmen mit dem Leitbild überein.

## Nicht-Ziele

- **Kein Rebranding.** Der Name „Deutsche Bildungsstiftung" ist für einen e.V. sprachlich schief, die Namensentscheidung wurde jedoch bewusst vertagt. Die Website (`Nav.tsx`, `layout.tsx`, `page.tsx`) bleibt in diesem Task unangetastet.
- **Keine Änderung an `docx/Stiftungssatzung.md`.** Sie ist das Phase-3-Zieldokument, kein Fehler. Die Vereinssatzung tritt daneben, nicht an ihre Stelle.
- **Keine Änderung an `docs/loops/runs/*` und an den Historie-Abschnitten von `projekt-status.md`.** Das sind Protokolle vergangener Zustände; Protokolle werden nicht rückwirkend umgeschrieben.
- **Keine Code-Änderung.** Der aus § 4 folgende Plattform-Bedarf (Widmungs-Feld im Spendenflow) ist als offener Punkt vermerkt, nicht Teil dieses Specs.
- **Keine Gründungsdurchführung.** Kein Notartermin, keine Registeranmeldung, keine Mitgliederwerbung — dieser Spec produziert Dokumente, keine Rechtsakte.

---

## Die inhaltliche Kernfrage: zeitnahe Mittelverwendung

Das Finanzmodell des Projekts lautet: Spenden werden nicht verbraucht, sondern angelegt; ausgeschüttet wird jährlich **1 % des Fondsvolumens** einer Einrichtung, das Kapital bleibt und wächst. Bei einer angenommenen Brutto-Rendite von 7 % verbleiben rechnerisch 6 % Netto-Wachstum. Mechanik: [`docs/verrechnungsmodell.md`](../../verrechnungsmodell.md).

Für eine **Stiftung** ist das der Normalfall — Zustiftungen gehen ins Grundstockvermögen.

Für einen **gemeinnützigen Verein** gilt dagegen § 55 Abs. 1 Nr. 5 AO. Eine verbreitete Vereinfachung — etwa auf [deutsches-ehrenamt.de](https://deutsches-ehrenamt.de/vereinsgruendung-vereinsarten/gemeinnuetzigkeit-verein/) — lautet, gemeinnützige Vereine dürften „primär weder Vermögen anhäufen noch Gewinne für die Mitglieder erzielen". Das ist in zwei Punkten unzutreffend:

1. Die dort genannte Norm § 55 Abs. 1 **Nr. 4** AO regelt die Vermögensbindung *bei Auflösung*, nicht die laufende Mittelverwendung. Einschlägig ist **Nr. 5**.
2. § 55 Abs. 1 Nr. 5 Satz 1 AO gilt ausdrücklich „**vorbehaltlich des § 62**". Die Norm ist keine Ansammlungssperre, sondern eine Verwendungsfrist (Zufluss plus zwei folgende Kalender- oder Wirtschaftsjahre) mit gesetzlich vorgesehenen Ausnahmen.

Recherche-Grundlage: 19 Quellen, 25 adversarial geprüfte Behauptungen, Kernaussagen am konsolidierten Gesetzestext gegengeprüft (Abruf 2026-07-19).

### Die drei Geldströme — getrennt zu betrachten

Der Kernfehler wäre, alle Zuflüsse gleich zu behandeln. Das Modell hat drei verschiedene Ströme mit drei verschiedenen Rechtsfolgen:

**Strom 1 — eingehende Spenden in den Kapitalstock: § 62 Abs. 3 AO, kein Zeittakt.**
Der Einleitungssatz lautet: „Die folgenden Mittelzuführungen unterliegen nicht der zeitnahen Mittelverwendung nach § 55 Absatz 1 Nummer 5." Erfasst sind:

- Zuwendungen von Todes wegen, sofern die Erblasserin/der Erblasser keine Verwendung für laufende Ausgaben vorgeschrieben hat (Nr. 1),
- Zuwendungen mit ausdrücklicher Widmungserklärung zur Vermögensausstattung oder -erhöhung (Nr. 2) — **Hauptkanal**,
- Zuwendungen aufgrund eines Spendenaufrufs, aus dem ersichtlich ist, dass Beträge zur Aufstockung des Vermögens erbeten werden (Nr. 3) — **gleichrangiger Hauptkanal**,
- Sachzuwendungen, die ihrer Natur nach zum Vermögen gehören (Nr. 4).

Diese Tatbestände sind **betragsmäßig unbegrenzt** und brauchen weder Finanzamts-Genehmigung noch Bedarfsbegründung noch Zeithorizont. Adressat ist generisch „die Körperschaft"; der Umkehrschluss zu Abs. 4 („Eine Stiftung kann…") ist zwingend — der Gesetzgeber differenziert bewusst und nur dort. Die Finanzverwaltung NRW illustriert Nr. 2 in ihrer amtlichen Arbeitshilfe „Stiftungen aus steuerlicher Sicht" (Stand 01.07.2024) ausgerechnet am Beispiel eines e.V.

**Strom 2 — Wertsteigerung des angelegten Kapitals: kein Zufluss, daher kein Zeittakt.**
Siehe die benannte Prämisse unten. Dies ist die tragende, aber ungeprüfte Annahme des Modells.

**Strom 3 — realisierte Verkaufserlöse zur Ausschüttung: Zufluss, Zeittakt greift, wird erfüllt.**
Der jährliche Verkauf in Höhe des Ausschüttungsbedarfs erzeugt Mittel im Sinne des § 55 Abs. 1 Nr. 5 AO. Diese werden unmittelbar an die Einrichtungen ausgeschüttet, also zeitnah verwendet. Kein Konflikt.

**Ergänzend, faktisch nachrangig:** die freie Rücklage nach § 62 Abs. 1 Nr. 3 AO (höchstens ein Drittel des Überschusses aus der Vermögensverwaltung und darüber hinaus höchstens 10 % der sonstigen zeitnah zu verwendenden Mittel; Nachholung in zwei Folgejahren möglich). Unter Prämisse P1 entsteht kaum Überschuss aus Vermögensverwaltung, sodass dieser Kanal wenig Gewicht hat. Er ist der Auffangmechanismus, falls P1 nicht trägt.

### Prämisse P1 — thesaurierender ETF erzeugt keinen Mittelzufluss

**Annahme.** § 55 Abs. 1 Nr. 5 AO knüpft an den *Zufluss* von Mitteln an. Bei einem thesaurierenden ETF vereinnahmt der Fonds intern; der Körperschaft fließt nichts zu, das Vermögen steigt lediglich im Wert. Wertsteigerung ist kein Zufluss. Erst der Verkauf erzeugt Mittel.

**Begründung, warum die Gegenauffassung zu absurden Ergebnissen führt.** Wären nicht realisierte Buchgewinne „Mittel", müsste ein Verein bei +20 % Jahresrendite rund 17 % ausschütten; folgen drei Jahre mit 0 % und ein Jahr mit −15 %, steht das Kapital dauerhaft unter dem Ausgangswert. Die zeitnahe Mittelverwendung würde Marktvolatilität in permanenten Substanzverzehr übersetzen — das kann nicht Rechtsfolge einer Norm sein, die den Kapitalerhalt gemeinnütziger Körperschaften gerade nicht verbietet.

**Einordnung.** Die Annahme ist konservativer als die für Stiftungen herrschende Meinung, nach der Umschichtungsgewinne dem Vermögen zugeführt werden dürfen. Hier werden Verkaufserlöse vollständig als zeitnah zu verwendende Mittel behandelt.

**Risikovermerk.** P1 ist **nicht verifiziert**. Die Recherche kam bei genau dieser Praxisfrage ohne belastbaren Beleg zurück. Zusätzlich zu klären: die Vorabpauschale nach § 18 InvStG, die für steuerbefreite Anleger regelmäßig entfällt, steuerlich aber jährlich fiktive Erträge unterstellt — ob das auf den Mittelbegriff des § 55 AO durchschlägt, ist offen. **Vor Gründung zwingend mit einer Steuerberater:in klären.**

**Zwei harte Design-Vorgaben, die aus P1 folgen:**

- **Der ETF muss thesaurierend sein.** Ein ausschüttender ETF erzeugt jährlich echte Zuflüsse und bricht die Konstruktion. Keine Präferenz, sondern Bedingung.
- **Verkäufe nur in Höhe des Ausschüttungsbedarfs.** Größere Umschichtungen erzeugen Mittelzuflüsse, für die die Ausschüttung nicht als zeitnahe Verwendung ausreicht.

### Freigrenze für die Anfangsphase

§ 55 Abs. 1 Nr. 5 Satz 4 AO: „Satz 1 gilt nicht für Körperschaften mit jährlichen Einnahmen von nicht mehr als 100 000 Euro." Der Betrag wurde durch das Steueränderungsgesetz 2025 (BGBl. 2025 I Nr. 363) zum 1.1.2026 von 45.000 auf 100.000 EUR angehoben; am konsolidierten Gesetzestext verifiziert. Unterhalb dieser Grenze entfällt die zeitnahe Mittelverwendung vollständig — die ersten Jahre braucht der Verein keine Rücklagentechnik.

Zwei Einschränkungen: Es ist eine **Freigrenze, kein Freibetrag** — ein Euro darüber lässt die volle Pflicht aufleben. Und sie knüpft an die **kumulierten Bruttoeinnahmen aller vier Sphären** an (ideeller Bereich, Zweckbetrieb, Vermögensverwaltung, wirtschaftlicher Geschäftsbetrieb), Spendenzuflüsse für den Kapitalstock eingeschlossen.

### Rechtsformnachteile, die bleiben

| | Verein | Stiftung |
|---|---|---|
| § 62 Abs. 3 Nr. 1–4 (gewidmete Vermögenszuführungen) | ✅ | ✅ |
| § 62 Abs. 4 (Überschüsse thesaurieren, Errichtungsjahr + 3 Jahre) | ❌ | ✅ |
| § 10b Abs. 1a EStG (erweiterter Spendenabzug, 1 Mio. EUR über 10 Jahre) | ❌ | ✅ |

Der zweite Punkt wiegt praktisch schwerer als der erste: Großspender erhalten beim Verein nur den normalen Abzug nach § 10b Abs. 1 EStG. Das ist ein Fundraising-Nachteil, keine Formalie, und ein eigenständiges Argument für die spätere Umwandlung.

### Risiko bei Fehleinschätzung

§ 63 Abs. 4 AO: „Hat die Körperschaft ohne Vorliegen der Voraussetzungen Mittel angesammelt, kann das Finanzamt ihr eine angemessene Frist für die Verwendung der Mittel setzen." Also **keine sofortige Aberkennung der Gemeinnützigkeit** — zuerst Fristsetzung; bei rechtzeitiger Verwendung gilt die Geschäftsführung als ordnungsgemäß. Das begrenzt den Schaden, falls P1 nicht trägt.

### Folge für die Plattform (offener Punkt, nicht Teil dieses Specs)

Damit § 62 Abs. 3 Nr. 2/3 AO greift, muss die Widmung *durch die Spender:innen* erfolgen und dokumentiert sein. Zwei Wege, die sich ergänzen: ein Widmungs-Element im Spendenflow (Nr. 2) und ein entsprechend formulierter Spendenaufruf auf der Plattform (Nr. 3).

**Wichtig — die Widmung gehört nicht auf die Zuwendungsbestätigung.** Die amtlichen Muster sind verbindlich (§ 50 Abs. 1 EStDV); BMF v. 07.11.2013 (IV C 4 - S 2223/07/0018:005, BStBl I 2013, 1333), Rz. 2: „Die Wortwahl und die Reihenfolge der vorgegebenen Textpassagen in den Mustern sind beizubehalten, Umformulierungen sind unzulässig." Das Ankreuzfeld „Die Zuwendung erfolgte in das zu erhaltende Vermögen (Vermögensstock)" existiert nur in den **Stiftungs**-Mustern (§ 10b Abs. 1a EStG) und ist für die Vereins-Widmung nicht vorgesehen. Die Widmung ist daher separat zu dokumentieren, idealerweise mit Zeitstempel zum Zahlungszeitpunkt.

---

## Deliverable A: `docx/Vereinssatzung.md`

Neues Dokument, gleiche Ablage wie die bestehenden Rechtsdokumente. Struktur:

| § | Inhalt | Anmerkung |
|---|---|---|
| 1 | Name, Sitz, Geschäftsjahr | Sitz Oldenburg (Niedersachsen), Geschäftsjahr = Kalenderjahr — beides aus der Stiftungssatzung übernommen. Name als Platzhalter `[Arbeitstitel]`, Zusatz „e.V." nach Eintragung |
| 2 | Zweck | Förderung von Erziehung, Volks- und Berufsbildung (§ 52 Abs. 2 Satz 1 Nr. 7 AO); Zweckverwirklichung durch Kapitalaufbau und Ertragsausschüttung an Bildungs- und Betreuungseinrichtungen. Inhaltlich aus der Stiftungssatzung übernommen |
| 3 | Gemeinnützigkeit, Selbstlosigkeit | Standardklauseln nach §§ 51 ff. AO: ausschließlich und unmittelbar gemeinnützig, keine Gewinnerzielung, keine Begünstigung durch zweckfremde Ausgaben oder unverhältnismäßige Vergütungen |
| **4** | **Mittelverwendung und Vermögen** | **Kernparagraf.** Zeitnahe Verwendung als Regel; Vermögenszuführung nach § 62 Abs. 3 AO (alle vier Nummern); freie Rücklage nach § 62 Abs. 1 Nr. 3 AO; Grundsatz des Kapitalerhalts: ausgeschüttet wird der Ertrag, nicht die Substanz |
| 5 | Zwei-Säulen-Modell | Zweckgebundene Förderung einzelner Einrichtungen + Solidaritätsfonds mit überproportionaler Förderung schwach finanzierter Einrichtungen. Verankert den Leitbild-Kernwert satzungsfest |
| 6 | Mitgliedschaft | Ordentliche und Fördermitglieder; Erwerb durch schriftlichen Antrag und Vorstandsbeschluss; Ende durch Austritt, Ausschluss, Tod/Erlöschen |
| 7 | Mitgliedsbeiträge | Höhe und Fälligkeit durch Beitragsordnung, beschlossen von der Mitgliederversammlung — nicht in der Satzung, damit Anpassung ohne Satzungsänderung möglich |
| 8 | Organe | Mitgliederversammlung und Vorstand |
| 9 | Mitgliederversammlung | Einberufung, Frist, Beschlussfähigkeit, Mehrheiten, Zuständigkeiten (Vorstandswahl und -entlastung, Jahresabschluss, Beitragsordnung, Satzungsänderung, Überführung, Auflösung) |
| 10 | Vorstand | Zusammensetzung, Vertretungsregelung nach § 26 BGB, Amtszeit, Beschlussfassung |
| 11 | Transparenz und Rechnungslegung | Jahresrechnung, Kassenprüfung, Veröffentlichung der Mittelverwendung — setzt den Leitbild-Kernwert „Transparenz vor Vertrauensvorschuss" um |
| 12 | Satzungsänderung | Qualifizierte Mehrheit; Änderungen, die Zweck oder Gemeinnützigkeit berühren, bedürfen der vorherigen Abstimmung mit dem Finanzamt |
| **13** | **Überführung in eine Stiftung** | Benennt die Überführung als satzungsmäßiges Ziel. Auslösung durch Beschluss der Mitgliederversammlung mit qualifizierter Mehrheit — **bewusst ohne Zahl in der Satzung**, damit die Schwelle ohne Satzungsänderung angepasst werden kann. Die Stiftung muss denselben gemeinnützigen Zweck verfolgen. ⚠️ **Der Umwandlungspfad ist gemeinnützigkeitsrechtlich ungesichert** — siehe offener Punkt 5 |
| 14 | Auflösung, Vermögensanfall | Bei Auflösung oder Wegfall steuerbegünstigter Zwecke fällt das Vermögen an eine gemeinnützige Stiftung gleichen Zwecks (§ 55 Abs. 1 Nr. 4 AO), ersatzweise an eine andere steuerbegünstigte Körperschaft zur Verwendung für Erziehung und Bildung |

**Kopfzeile des Dokuments** (verbindlich, nicht optional): Entwurf ohne Rechtsberatungscharakter. Vor Gründungsversammlung und Registeranmeldung durch eine Rechtsanwältin/einen Rechtsanwalt oder Notar:in prüfen und beim Finanzamt zur Vorabprüfung nach § 60a AO einreichen. Die Mustersatzung der Anlage 1 zu § 60 AO ist einzuhalten, sonst entfällt die Steuerbegünstigung.

---

## Deliverable B: Docs-Konsistenz

Drei Dateien, jeweils minimaler Diff:

1. **`README.md`** — Rechtsform-Aussage ergänzen/korrigieren: Träger ist in Phase 1 ein gemeinnütziger Verein, die Stiftung ist das Phase-3-Ziel. Verweis auf `leitbild.md` und `docx/Vereinssatzung.md`.
2. **`projekt-status.md`** — ausschließlich der Abschnitt „Aktueller Stand". Ein kurzer Absatz zur Rechtsform mit Verweis auf die Vereinssatzung. Die Abschnitte unter „Historie" bleiben unverändert.
3. **`CLAUDE.md`** — unter „Maßgebliche Quellen" die Vereinssatzung als Rechtsform-Dokument der Phase 1 aufnehmen, Stiftungssatzung als Phase-3-Ziel kennzeichnen.

---

## Verifikation

Es gibt keinen mechanischen Test für Prosa. Die Abnahme ist eine Checkliste:

- [ ] `docx/Vereinssatzung.md` enthält alle 14 Paragrafen aus der Tabelle oben.
- [ ] § 4 nennt § 62 Abs. 3 AO explizit und benennt alle vier Zuführungstatbestände.
- [ ] § 4 behandelt Nr. 2 (Widmung) und Nr. 3 (Spendenaufruf) als gleichrangige Hauptkanäle.
- [ ] § 4 enthält den Grundsatz, dass Kapital in thesaurierenden Anlagen gehalten und nur in Höhe des Ausschüttungsbedarfs veräußert wird (Prämisse P1).
- [ ] § 13 enthält **keine** konkrete Schwellenzahl.
- [ ] § 14 regelt den Vermögensanfall an eine gemeinnützige Stiftung gleichen Zwecks.
- [ ] Der Rechtsberatungs-Disclaimer steht im Kopf des Dokuments.
- [ ] `docx/Stiftungssatzung.md` ist unverändert (`git diff` leer).
- [ ] `docs/loops/runs/` ist unverändert (`git diff` leer).
- [ ] Die Historie-Abschnitte in `projekt-status.md` sind unverändert.
- [ ] `stiftung-web/` ist unverändert.
- [ ] Die Aussagen in README, `projekt-status.md` (aktueller Teil) und `leitbild.md` widersprechen einander nicht.

---

## Offene Punkte (bewusst nicht in diesem Spec entschieden)

1. **Name.** „Deutsche Bildungsstiftung" für einen e.V. ist sprachlich und potenziell firmenrechtlich problematisch. Entscheidung vertagt; die Satzung nutzt einen Platzhalter. Solange der Name offen ist, bleibt das Website-Branding unverändert.
2. **Schwellensumme für die Überführung.** Bewusst nicht in der Satzung. Sollte separat im Leitbild oder Finanzmodell begründet werden.
3. **Widmungs-Element im Spendenflow.** Technische Voraussetzung dafür, dass § 62 Abs. 3 Nr. 2/3 AO greift. Eigener Task.
4. **Gründungsmitglieder und Vorstandsbesetzung.** Ein e.V. braucht mindestens sieben Mitglieder zur Eintragung (§ 56 BGB). Nicht Gegenstand der Satzung, aber Voraussetzung der Gründung.
5. **Umwandlungspfad Verein → Stiftung.** Ungesichert. Die Annahme, § 55 Abs. 1 Nr. 4 AO trage die Übertragung des Kapitalstocks auf eine neu errichtete Stiftung, wurde in der Recherche 0-3 widerlegt. Zu prüfen sind die Alternativen: Auflösung mit Vermögensanfall, § 58 Nr. 1 AO (Mittelweitergabe), Anwachsung. Berührt § 13 und § 14 der Satzung.

---

## Vor Gründung mit Steuerberater:in zu klären

Diese Punkte konvergieren nicht über Web-Recherche. Die Recherche (19 Quellen, 25 geprüfte Behauptungen) kam bei jedem davon ohne belastbaren Beleg zurück. Sie gehören in ein Fachgespräch, nicht in eine weitere Recherche-Runde:

| # | Frage | Warum es zählt |
|---|---|---|
| S1 | Trägt Prämisse P1 — erzeugt ein thesaurierender ETF keinen Mittelzufluss im Sinne des § 55 Abs. 1 Nr. 5 AO? | **Tragende Annahme des gesamten Finanzmodells.** Trägt sie nicht, ist die Thesaurierung auf rund ein Drittel des Vermögensverwaltungsüberschusses gedeckelt (§ 62 Abs. 1 Nr. 3 AO) und die Ausschüttungsquote steigt entsprechend |
| S2 | Schlägt die Vorabpauschale nach § 18 InvStG auf den Mittelbegriff des § 55 AO durch? | Für steuerbefreite Anleger entfällt sie regelmäßig, unterstellt aber jährlich fiktive Erträge. Direkt gekoppelt an S1 |
| S3 | Genügt ein Auswahlfeld im Online-Spendenformular als „ausdrückliche Bestimmung" nach § 62 Abs. 3 Nr. 2 AO, oder braucht es eine unterschriebene Erklärung? | Bestimmt die Architektur des Spendenflows. Belegt ist nur die Negativseite: nicht auf der Zuwendungsbestätigung |
| S4 | Welche Anforderungen stellt § 62 Abs. 3 Nr. 3 AO an Formulierung, Dokumentation und Aufbewahrung eines Spendenaufrufs? | Über den Gesetzeswortlaut hinaus wurde keine konkretisierende AEAO-Passage verifiziert |
| S5 | Muss die Satzung die Vermögenszuführungen nach § 62 Abs. 3 AO ausdrücklich erlauben, oder folgt die Befugnis unmittelbar aus dem Gesetz? | Vollständig unbeantwortet. Der Spec nimmt vorsorglich die ausdrückliche Satzungsregelung auf |
| S6 | Wie ist die **tatsächliche Zweckverwirklichung** (§§ 56, 63 Abs. 1 AO) bei einer Ausschüttungsquote von 1 % plausibel zu machen? | Unabhängig von § 62 AO. Ein Verein, der 1 % ausschüttet und den Rest hält, muss belegen, dass er seinen Zweck real verfolgt |
| S7 | Auf welchem Rechtsweg lässt sich der Kapitalstock später steuerunschädlich auf eine Stiftung übertragen? | Siehe offener Punkt 5 |
