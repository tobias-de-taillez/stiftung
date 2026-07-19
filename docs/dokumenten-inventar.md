# Dokumenten-Inventar

**Stand:** 2026-07-19 · Erstellt beim Umbau auf die Rechtsform „gemeinnütziger Verein".

Übersicht aller Dokumentationsdateien im Repo: Zweck, Aktualität und
Obsoleszenz. Ziel ist, dass niemand ein überholtes Dokument für maßgeblich
hält. Ausgenommen sind `docs/loops/runs/` (25 Protokolldateien der
Loop-Pässe 25–36) und der Code unter `stiftung-web/`.

## Legende

| Status | Bedeutung |
|---|---|
| ✅ **maßgeblich** | Aktuell und verbindlich. Bei Widerspruch gilt dieses Dokument |
| 📘 **aktuell** | Aktuell, aber nicht normativ — Kontext, Analyse, Hintergrund |
| 🕰️ **Protokoll** | Historischer Zustand. Wird bewusst nicht rückwirkend geändert |
| ⚠️ **teilweise überholt** | Enthält Aussagen, die nicht mehr gelten. Kopf-Banner beachten |
| 🗑️ **Obsoleszenz-Kandidat** | Kann wahrscheinlich weg oder aufgehen in einem anderen Dokument |

---

## Grundlagen und Ausrichtung

| Datei | Z. | Status | Zweck / Anmerkung |
|---|---|---|---|
| [`leitbild.md`](../leitbild.md) | 88 | ✅ maßgeblich | Mission, Vision, True North. Oberster Ausrichtungspunkt, steht über Satzung und Roadmap |
| [`README.md`](../README.md) | 54 | ✅ maßgeblich | Einstieg, Rechtsform-Aussage, Verweise |
| [`CLAUDE.md`](../CLAUDE.md) | 41 | ✅ maßgeblich | Projektkontext für Agenten: Kommandos, Quellen, Konventionen |
| [`projekt-status.md`](../projekt-status.md) | 242 | ⚠️ teilweise überholt | Abschnitt „Aktueller Stand" gilt; **Z. 67–243 sind markierte Historie** (Vanilla-Stack, Vercel-Demo, Roadmap 2025) — rund 72 % der Datei |

## Rechtsform

| Datei | Z. | Status | Zweck / Anmerkung |
|---|---|---|---|
| [`docx/Vereinssatzung.md`](../docx/Vereinssatzung.md) | ~160 | ✅ maßgeblich | Satzungsentwurf Phase 1. Entwurf, kein Rechtsrat |
| [`docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md`](superpowers/specs/2026-07-19-vereinsgruendung-design.md) | ~230 | ✅ maßgeblich | Steuerrechtliche Herleitung (§§ 55, 62, 63 AO), Prämisse P1, Fragen S1–S7 an die Steuerberatung |
| [`docx/Stiftungssatzung.md`](../docx/Stiftungssatzung.md) | 369 | 🕰️ Phase-3-Ziel | Nicht anzuwenden, solange der Verein besteht. **Text ist stellenweise beschädigt** — bei der Konvertierung sind Aufzählungsinhalte verloren gegangen (z. B. Z. 54, 65, 71–73, 89, 95–99). Vor Phase 3 zu rekonstruieren |

## Finanzmodell

| Datei | Z. | Status | Zweck / Anmerkung |
|---|---|---|---|
| [`docs/verrechnungsmodell.md`](verrechnungsmodell.md) | 737 | ✅ maßgeblich | Kontenmodell, Datenmodell, Jahres-Kaskade. **Kanonische Quelle** der Annahme 7 % / 1 % / 6 % / `Jahresbetrag ÷ 0,01`. Noch nicht implementiert |
| [`zeitersparnis.md`](../zeitersparnis.md) | 160 | 📘 aktuell | Spendenrechner-Modell und Formeln. Parameter zitieren das Verrechnungsmodell |
| [`docx/Edge Cases.md`](../docx/Edge%20Cases.md) | 115 | 📘 aktuell | Katalog offener Sonderfälle, gepflegt |
| [`docx/Zusatzdokument zur Mittelverwendung.md`](../docx/Zusatzdokument%20zur%20Mittelverwendung.md) | 190 | 🗑️ Obsoleszenz-Kandidat | Mechanik **vollständig ersetzt** durch das Verrechnungsmodell: ordinale Quartilsstaffelung, `×2`-Faktor, Kosten direkt aus dem Soli-Fonds, Stichtag 1. Januar. Banner vorhanden, aber ~130 Zeilen gegenstandsloser Text |

## Inhaltliche Begründung

| Datei | Z. | Status | Zweck / Anmerkung |
|---|---|---|---|
| [`docx/Studien.md`](../docx/Studien.md) | 748 | 📘 aktuell | Abstracts und Zusammenfassungen von 9 bildungsökonomischen Studien. Zeitlos |
| [`docx/Übersichtsarbeit zur Gründungsbasis der Deutschen Bildungsstiftung.md`](../docx/Übersichtsarbeit%20zur%20Gründungsbasis%20der%20Deutschen%20Bildungsstiftung.md) | 73 | ⚠️ teilweise überholt | Wissenschaftliche Begründung (ROI frühkindlicher Bildung). Forschungslage zeitlos, aber **alle Paragrafenverweise zeigen auf den Satzungsstand 2023** |
| [`docx/Deutsche Bildungsstiftung.md`](../docx/Deutsche%20Bildungsstiftung.md) | 542 | ⚠️ teilweise überholt | Sammeldokument: Präambel + Verteilungsprozess + Datenschutz + Architekturkonzept. **Architekturteil Z. 358–542 (Blockchain, Microservices, AWS) ist Wunschbild, kein Ist.** Präambel und Verteilungsprozess sind Dubletten |
| [`docx/Notizen Ideenboard Ergänzungen.md`](../docx/Notizen%20Ideenboard%20Ergänzungen.md) | 101 | ⚠️ teilweise überholt | Z. 37–101 aktuell (Rechtsform-Analyse, MVP-Reihenfolge). **Z. 1–33 alte Rohnotizen**, darunter „Stiftungsrat besetzen" — durch die Vereins-Entscheidung überholt |
| [`docx/websiten brainstorming.md`](../docx/websiten%20brainstorming.md) | 11 | 🗑️ Obsoleszenz-Kandidat | Konzeptnotiz zum Spenden-UI, im Build-Plan weitgehend umgesetzt. Level-Werte in Z. 4 weichen von der Implementierung ab |
| [`docx/Betreuung von Kindern in Deutschland.md`](../docx/Betreuung%20von%20Kindern%20in%20Deutschland.md) | 7 | 🗑️ Obsoleszenz-Kandidat | Stub, enthält nur einen Artikel-Link |

## Prozess und Protokolle

| Datei | Z. | Status | Zweck / Anmerkung |
|---|---|---|---|
| [`docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md`](superpowers/plans/2026-07-15-website-rebuild-lokal.md) | 3712 | 🕰️ Protokoll | Ausgeführter Build-Plan, Tasks 1–36. Eingefroren |
| [`docs/loops/STATE.md`](loops/STATE.md) | 35 | 🕰️ Protokoll | Append-only Ledger des plan-executor-Loops. Meldet „ALL TASKS DONE" |
| [`docs/loops/plan-executor.md`](loops/plan-executor.md) | 61 | ⚠️ teilweise überholt | Loop-Definition. Beschreibt den Loop als laufend, obwohl er abgeschlossen ist |
| `docs/loops/runs/*.md` (25 Dateien) | 1391 | 🕰️ Protokoll | Task-Briefs und Verifier-Reports der Pässe 25–36. **Nie rückwirkend ändern** |
| [`project-rules.md`](../project-rules.md) | 94 | 🗑️ Obsoleszenz-Kandidat | Stand „Januar 2025". Rule #2 (Auto-Push) in `CLAUDE.md` bereits für obsolet erklärt, doppelte Rule-Nummerierung, Aktivierungstabelle ohne Bezug zur heutigen Arbeitsweise. Der verbleibende gültige Inhalt steht in `CLAUDE.md` |
| [`stiftung-web/README.md`](../stiftung-web/README.md) | 100 | ⚠️ teilweise überholt | Setup und Struktur der App. **Z. 35 „23 Testdateien, 94 Tests" ist veraltet** — Ledger nennt 268 Tests |

---

## Obsoleszenz-Kandidaten — Empfehlung

Nichts davon wurde gelöscht. Löschen ist ein Human-Gate; das hier ist die
Vorlage für diese Entscheidung.

| # | Datei | Empfehlung | Begründung |
|---|---|---|---|
| 1 | `project-rules.md` | **löschen** | Stärkster Kandidat. Vollständig durch `CLAUDE.md` abgelöst, in sich widersprüchlich (zwei „Rule #3"), Stand Januar 2025 |
| 2 | `docx/Betreuung von Kindern in Deutschland.md` | **löschen** oder als Link in `docx/Studien.md` aufnehmen | 7 Zeilen, nur ein Artikel-Link |
| 3 | `docx/websiten brainstorming.md` | **archivieren** | Im Build-Plan umgesetzt; Level-Werte widersprechen dem Code |
| 4 | `docx/Zusatzdokument zur Mittelverwendung.md` | **behalten, kürzen** | Als Phase-3-Anlage zur Stiftungssatzung noch relevant, aber die abgelöste Quartilsmechanik (~130 Z.) kann raus |
| 5 | `docx/Deutsche Bildungsstiftung.md` | **aufteilen** | Vier Themen in einer Datei. Der Architekturteil (Z. 358–542) ist reines Wunschbild und sollte entweder gelöscht oder als solcher gekennzeichnet werden |
| 6 | `projekt-status.md` Z. 67–243 | **auslagern** nach `docs/historie.md` | 72 % der Datei ist markierte Historie und verdeckt den aktuellen Stand |

## Bekannte Redundanzen

Keine davon ist ein Fehler — aber jede ist eine Stelle, die bei Änderungen
doppelt gepflegt werden muss.

| Inhalt | Steht in |
|---|---|
| Kanonische Finanzannahme (7 / 1 / 6 / 0,01) | `docs/verrechnungsmodell.md` (Quelle), `CLAUDE.md`, `zeitersparnis.md`, Build-Plan, `projekt-status.md` (historisch) |
| Rechtsform-Begründung Verein → Stiftung | `leitbild.md`, `docx/Notizen…`, `docs/verrechnungsmodell.md`, Vereinsgründungs-Spec |
| „Abstand zum Zielmodell"-Tabelle | `projekt-status.md` und `stiftung-web/README.md`, nahezu wortgleich |
| Präambel / Zwei-Säulen-Modell | `docx/Deutsche Bildungsstiftung.md`, `docx/Stiftungssatzung.md`, `docx/Vereinssatzung.md`, `docx/Zusatzdokument…` |
| MVP-Begründung Tagespflege | `leitbild.md` (verdichtet) und `docx/Notizen…` (ausführlich) |
