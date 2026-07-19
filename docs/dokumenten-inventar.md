# Dokumenten-Inventar

**Stand:** 2026-07-19 · Nach der Konsolidierung (Löschungen + Single Source of Truth).

Übersicht aller Dokumentationsdateien im Repo: Zweck, Status und die Frage,
**wo eine Information ihre einzige maßgebliche Quelle hat**. Ausgenommen sind
`docs/loops/runs/` (25 Protokolldateien) und der Code unter `stiftung-web/`.

## Legende

| Status | Bedeutung |
|---|---|
| ✅ **maßgeblich** | Einzige gültige Quelle für ihr Thema. Bei Widerspruch gilt dieses Dokument |
| 📘 **aktuell** | Aktuell, aber nicht normativ — Kontext, Analyse, Hintergrund |
| 🕰️ **Protokoll** | Historischer Zustand. Wird bewusst nicht rückwirkend geändert |
| ⚠️ **teilweise überholt** | Enthält Aussagen, die nicht mehr gelten. Kopf-Banner beachten |

---

## Single Source of Truth — wer besitzt was

Diese Tabelle ist der Kern des Inventars. Wer eine dieser Informationen
braucht, holt sie **dort und nur dort**. Andere Dokumente verweisen, statt zu
wiederholen.

| Information | Einzige Quelle |
|---|---|
| Mission, Vision, Kernwerte, Phasenplan | [`leitbild.md`](../leitbild.md) |
| Rechtsform-Regeln, Organe, Überführungspflicht | [`docx/Vereinssatzung.md`](../docx/Vereinssatzung.md) |
| Steuerliche Herleitung (§§ 55, 62, 63 AO), Prämisse P1 | [Vereinsgründungs-Spec](superpowers/specs/2026-07-19-vereinsgruendung-design.md) |
| Kanonische Projektionsannahme (Rendite, Ausschüttung, Wachstum, Kapitalformel) | [`docs/verrechnungsmodell.md`](verrechnungsmodell.md) |
| Kontenmodell, Datenmodell, Jahres-Kaskade, Verteilungsformeln | [`docs/verrechnungsmodell.md`](verrechnungsmodell.md) |
| Abstand zwischen Code und Zielmodell | [`projekt-status.md`](../projekt-status.md) |
| Spendenrechner-Formeln (Zeitersparnis) | [`zeitersparnis.md`](../zeitersparnis.md) |
| Arbeitskonventionen für Agenten | [`CLAUDE.md`](../CLAUDE.md) |

---

## Bestand

### Grundlagen und Ausrichtung

| Datei | Z. | Status | Anmerkung |
|---|---|---|---|
| [`leitbild.md`](../leitbild.md) | 92 | ✅ maßgeblich | Steht über Satzung, Roadmap und Feature-Liste |
| [`README.md`](../README.md) | 56 | ✅ maßgeblich | Einstieg und Wegweiser |
| [`CLAUDE.md`](../CLAUDE.md) | 44 | ✅ maßgeblich | Projektkontext für Agenten. Enthält bewusst **keine** Finanzzahlen mehr, nur den Verweis |
| [`projekt-status.md`](../projekt-status.md) | 99 | ✅ maßgeblich | IST-Zustand des Codes und Abstand zum Zielmodell |
| [`docs/historie.md`](historie.md) | 185 | 🕰️ Protokoll | Am 2026-07-19 aus `projekt-status.md` ausgelagert |

### Rechtsform

| Datei | Z. | Status | Anmerkung |
|---|---|---|---|
| [`docx/Vereinssatzung.md`](../docx/Vereinssatzung.md) | 158 | ✅ maßgeblich | Satzungsentwurf Phase 1. Entwurf, kein Rechtsrat |
| [Vereinsgründungs-Spec](superpowers/specs/2026-07-19-vereinsgruendung-design.md) | 246 | ✅ maßgeblich | Herleitung und die Fragen S1–S8 an die Steuerberatung |
| [`docx/Stiftungssatzung.md`](../docx/Stiftungssatzung.md) | 369 | 🕰️ Phase-3-Ziel | Nicht anzuwenden. **Text stellenweise beschädigt** — bei der Konvertierung sind Aufzählungsinhalte verlorengegangen. Vor Phase 3 zu rekonstruieren |
| [`docx/Zusatzdokument zur Mittelverwendung.md`](../docx/Zusatzdokument%20zur%20Mittelverwendung.md) | 86 | 🕰️ Phase-3-Ziel | Auf Überblick und Zielsetzung gekürzt; die abgelöste Quartilsmechanik wurde entfernt |

### Finanzmodell

| Datei | Z. | Status | Anmerkung |
|---|---|---|---|
| [`docs/verrechnungsmodell.md`](verrechnungsmodell.md) | 870 | ✅ maßgeblich | Buchungs-Spec. Noch nicht implementiert. Hängt an Prämisse P1 |
| [`zeitersparnis.md`](../zeitersparnis.md) | 165 | ✅ maßgeblich | Nur für die Zeitersparnis-Formeln; die Parameter bezieht es aus dem Verrechnungsmodell |
| [`docx/Edge Cases.md`](../docx/Edge%20Cases.md) | 115 | 📘 aktuell | Sonderfälle mit Statusübersicht |

### Inhaltliche Begründung

| Datei | Z. | Status | Anmerkung |
|---|---|---|---|
| [`docx/Studien.md`](../docx/Studien.md) | 756 | 📘 aktuell | 9 bildungsökonomische Studien. Zeitlos |
| [`docx/Übersichtsarbeit…`](../docx/Übersichtsarbeit%20zur%20Gründungsbasis%20der%20Deutschen%20Bildungsstiftung.md) | 86 | ⚠️ teilweise überholt | Befunde gültig, Paragrafenverweise zeigen auf den Satzungsstand 2023 |
| [`docx/Deutsche Bildungsstiftung.md`](../docx/Deutsche%20Bildungsstiftung.md) | 386 | ⚠️ teilweise überholt | Präambel und Datenschutzteil brauchbar. Architekturkonzept am 2026-07-19 entfernt |
| [`docx/Notizen Ideenboard Ergänzungen.md`](../docx/Notizen%20Ideenboard%20Ergänzungen.md) | 111 | ⚠️ teilweise überholt | Datierte Abschnitte aktuell, Rohnotizen oben überholt |

### Prozess und Protokolle

| Datei | Z. | Status | Anmerkung |
|---|---|---|---|
| [Build-Plan](superpowers/plans/2026-07-15-website-rebuild-lokal.md) | 3712 | 🕰️ Protokoll | Tasks 1–36, eingefroren |
| [`docs/loops/STATE.md`](loops/STATE.md) | 35 | 🕰️ Protokoll | Ledger, meldet „ALL TASKS DONE" |
| [`docs/loops/plan-executor.md`](loops/plan-executor.md) | 61 | ⚠️ teilweise überholt | Beschreibt den Loop als laufend, obwohl abgeschlossen |
| `docs/loops/runs/*.md` (25 Dateien) | 1391 | 🕰️ Protokoll | **Nie rückwirkend ändern** |
| [`stiftung-web/README.md`](../stiftung-web/README.md) | 94 | 📘 aktuell | Setup und Struktur. Verweist für den Zielmodell-Abstand auf `projekt-status.md` |

---

## Änderungen der Konsolidierung (2026-07-19)

### Gelöscht

| Datei | Grund | Rettung |
|---|---|---|
| `project-rules.md` | Stand Januar 2025, zwei widersprüchliche „Rule #3", Auto-Push-Regel bereits als obsolet markiert | Gültiger Rest stand bereits in `CLAUDE.md` |
| `docx/Betreuung von Kindern in Deutschland.md` | 7 Zeilen, nur ein Link | Link nach `docx/Studien.md` übernommen |
| `docx/websiten brainstorming.md` | Konzeptnotiz, im Build-Plan umgesetzt; Level-Werte widersprachen dem Code | — |
| `docx/Deutsche Bildungsstiftung.md`, Architekturteil | Blockchain/Microservices/AWS — Wunschbild, das dem realen Stack widersprach | Hinweis auf die realen Quellen eingefügt |
| `docx/Zusatzdokument…`, Abschnitte 2–4 | Ordinale Quartilsmechanik, durch das Verrechnungsmodell abgelöst | Verweis eingefügt |

Alle gelöschten Inhalte bleiben über die Git-Historie zugänglich.

### Redundanzen aufgelöst

| Vorher doppelt | Jetzt |
|---|---|
| Finanzannahme in `CLAUDE.md`, `zeitersparnis.md`, Verrechnungsmodell | Nur noch im Verrechnungsmodell; die anderen verweisen |
| „Abstand zum Zielmodell" in `projekt-status.md` und `stiftung-web/README.md` | Nur noch in `projekt-status.md` |
| Rechtsform-Begründung in vier Dokumenten | Leitbild (Warum), Vereinssatzung (Regel), Spec (Steuerrecht); Verrechnungsmodell verweist nur |
| Verteilungsmechanik in `Zusatzdokument…` und Verrechnungsmodell | Nur noch im Verrechnungsmodell |

### Git-Hygiene

Zwei Dateien waren doppelt im Index — je einmal NFC- und einmal NFD-normalisiert
(`Notizen Ideenboard Ergänzungen.md`, `Übersichtsarbeit…md`). Beide Einträge
zeigten auf dieselbe Datei; unter Linux wären daraus zwei echte Dateien
geworden. Die NFD-Einträge wurden entfernt.

## Verbleibende Redundanz

Die Präambel (Zwei-Säulen-Modell) steht weiterhin sinngemäß in `leitbild.md`,
`docx/Vereinssatzung.md`, `docx/Stiftungssatzung.md` und
`docx/Deutsche Bildungsstiftung.md`. Das ist **beabsichtigt**: Satzungen müssen
aus sich heraus verständlich sein und dürfen nicht auf externe Dateien
verweisen. Maßgeblich für die geltende Rechtslage ist die Vereinssatzung.
