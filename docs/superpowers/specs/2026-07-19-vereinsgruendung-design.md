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

Das Finanzmodell des Projekts lautet: Spenden werden nicht verbraucht, sondern angelegt; ausgeschüttet wird nur der Ertrag (1 % von 7 % Brutto-Rendite), das Kapital bleibt und wächst.

Für eine **Stiftung** ist das der Normalfall — Zustiftungen gehen ins Grundstockvermögen.

Für einen **gemeinnützigen Verein** gilt dagegen § 55 Abs. 1 Nr. 5 AO: Mittel sind grundsätzlich zeitnah, also innerhalb der auf den Zufluss folgenden zwei Kalenderjahre, für die satzungsmäßigen Zwecke zu verwenden. Dauerhafter Kapitalaufbau ist damit **nicht automatisch zulässig** und muss über die Ausnahmetatbestände konstruiert werden.

**Gewählter Weg — Vermögenszuführung nach § 62 Abs. 3 AO.** Die Satzung erlaubt ausdrücklich, dem Vermögen zuzuführen:

- Zuwendungen von Todes wegen, sofern die Erblasserin/der Erblasser keine Verwendung für laufende Ausgaben vorgeschrieben hat (§ 62 Abs. 3 Nr. 1 AO),
- Zuwendungen, bei denen die Zuwendende/der Zuwendende ausdrücklich bestimmt, dass sie dem Vermögen zuzuführen sind (§ 62 Abs. 3 Nr. 2 AO),
- Zuwendungen aufgrund eines Spendenaufrufs, wenn aus diesem ersichtlich ist, dass Beträge zur Aufstockung des Vermögens erbeten werden (§ 62 Abs. 3 Nr. 3 AO),
- Sachzuwendungen ihrer Natur nach zum Vermögen gehörend (§ 62 Abs. 3 Nr. 4 AO).

Ergänzend die freie Rücklage nach § 62 Abs. 1 Nr. 3 AO (bis zu einem Drittel des Überschusses aus der Vermögensverwaltung und darüber hinaus bis zu 10 % der sonstigen zeitnah zu verwendenden Mittel).

**Folge für die Plattform (offener Punkt, nicht Teil dieses Specs):** Damit § 62 Abs. 3 Nr. 2/3 AO greifen kann, muss die Widmung *durch die Spender:innen* erfolgen und dokumentiert sein. Der Spendenflow braucht daher später ein explizites Widmungs-Element — entweder eine Auswahl beim Spenden („als Vermögenszuführung") oder einen entsprechend formulierten Spendenaufruf. Ohne das ist der Kapitalaufbau in der Vereinsphase steuerlich angreifbar.

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
| **13** | **Überführung in eine Stiftung** | Benennt die Überführung als satzungsmäßiges Ziel. Auslösung durch Beschluss der Mitgliederversammlung mit qualifizierter Mehrheit — **bewusst ohne Zahl in der Satzung**, damit die Schwelle ohne Satzungsänderung angepasst werden kann. Die Stiftung muss denselben gemeinnützigen Zweck verfolgen |
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
