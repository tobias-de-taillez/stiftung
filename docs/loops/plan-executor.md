# Loop: plan-executor

**Zweck:** Die offenen Plan-Tasks 25–35 (Begeisterungs-Pakete) Task für Task abarbeiten — Maker implementiert, Verifier gatet, Ledger dokumentiert.
**True North:** Plan `docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md`, Erweiterung 2: „**Ausführungs-Reihenfolge:** Paket 1 (25–28) → Paket 2 (29–31) → Paket 3 (32–35) … Jeder Task einzeln review-gated wie Tasks 1–24." Dahinter `leitbild.md` (True North: „Wir verwandeln jeden gespendeten Euro in dauerhaft arbeitendes Bildungskapital …"). Dieser Loop zahlt ein, indem er die Begeisterungs-Lücken schließt, die die Gap-Analyse zwischen Ist-Website und Leitbild-Anspruch („Transparenz", „niedrige Hürde zum Geben") gefunden hat.
**Maturity-Level:** 2 (Draft) — jeder Pass arbeitet auf dem Feature-Branch `begeisterung-pakete`; der Mensch reviewt den PR vor Merge.
**Aufstiegskriterium:** 8 Task-Pässe in Folge, deren Verifier-ERSTreview 0 Critical und 0 Important enthält ⇒ Kandidat für Level 3 (Verifier gatet allein, Mensch approved nur den PR).

## Trigger

Manuell durch den Operator, oder `/loop` ohne Intervall (Modell taktet selbst). Einstiegsprompt wörtlich:

> Führe einen Pass des plan-executor-Loops aus (docs/loops/plan-executor.md). Lies zuerst docs/loops/STATE.md und `git log --oneline -5` auf Branch begeisterung-pakete. Nimm den ersten offenen Task laut STATE.md-Next (Reihenfolge 25→35 aus dem Plan, Erweiterung 2). Ein Task pro Pass, Maker-Verifier-Zyklus wie in dieser Datei definiert. Bei Success-/No-Op-/Eskalations-/Hard-Stop-Bedingung: anhalten und melden statt weitermachen.

## Inputs (pro Pass frisch lesen)

- `docs/loops/STATE.md` (Next + Ledger — was ist wirklich erledigt)
- `docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md`, Erweiterung 2 (Task-Spezifikationen + zusätzliche Global Constraints)
- `git log --oneline -10` auf `begeisterung-pakete` (Commits schlagen Erinnerung)
- `CLAUDE.md` (bindende Konventionen)

## Action (pro Pass)

GENAU EINEN Plan-Task (25–35) umsetzen: Brief aus dem Plan extrahieren → Maker-Subagent (frischer Kontext) implementiert nach Akzeptanzkriterien, testet, committet auf `begeisterung-pakete` → Review-Paket (diff BASE..HEAD, BASE = HEAD vor dem Task) → Verifier-Subagent prüft → Critical/Important: Fix-Dispatch + Re-Review → erst nach „Approved" gilt der Task als erledigt. Nichts außerhalb des Task-Scopes anfassen.

## Check (mechanisch)

```
cd stiftung-web && npm run verify
```

Erwartet: Exit 0 (tsc leer, alle Tests grün, Build durch). Zusätzlich gilt der Task erst mit Verifier-Verdict „Approved" als bestanden. Der Check wird zwischen Pässen nicht verändert (freeze the check).

## State-Update

Nach jedem Pass eine Ledger-Zeile in `docs/loops/STATE.md`: Task-Nr., Commits (SHA-Range), Evidence (`npm run verify` → Exit 0, X/Y Tests; Verifier-Verdict), Findings-Kurzfassung, Next aktualisieren. Nach Task 35: Zeile `ALL TASKS DONE` unter Goal einfügen.

## Stop-Bedingungen

- ✅ Success: `grep -q "ALL TASKS DONE" docs/loops/STATE.md` — gesetzt erst, wenn Tasks 25–35 alle approved und committet sind.
- 🟰 No-Op: kein offener Task in STATE.md-Next ODER Working Tree dirty (uncommittete menschliche Arbeit) ⇒ ohne Änderung beenden + melden.
- 🙋 Eskalation (Mensch fragen): Verifier meldet „plan-mandated"-Finding (der Plan benotet nicht die eigene Arbeit) · Task erfordert Architektur-Entscheidung außerhalb der Akzeptanzkriterien · Task 36 (explizit User-Gate) · Widerspruch zwischen Plan und Global Constraints.
- 🛑 Hard Stops: derselbe Task fällt 2× durch Review ⇒ Abbruch + Eskalation · max. 4 Task-Pässe pro Session/Loop-Lauf · max. 15 Pässe gesamt über alle Läufe (11 Tasks + 4 Puffer) · pro Finding max. 1 Fix-Dispatch + 1 Re-Review, danach Eskalation.

## Human-Gates (nie autonom)

`git push` · PR erstellen/mergen · Task 36 (Bildwelt) · Löschen von Daten/Historie/Branches · Deploy · Änderungen an diesem Loop-Dokument oder am Check.

## Vorbedingung pro Pass

Sauberer Checkout auf `begeisterung-pakete` (Branch existiert ab Pass 1; falls nicht: von aktuellem `main` abzweigen — einmalig, Teil von Pass 1). Dirty Working Tree ⇒ No-Op + Meldung, niemals überschreiben.

## Rollen

- **Maker:** Mid-Tier (sonnet); reine Transkriptions-Tasks (kompletter Code im Brief) Low-Tier (haiku). Dispatch-Contract: templates.md §4 des loop-engineering-Skills — Brief-Datei + Report-Datei unter `docs/loops/runs/task-<N>-{brief,report}.md`, Status DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, Branch-Verifikation vor jedem Commit (`git rev-parse --abbrev-ref HEAD` = `begeisterung-pakete`).
- **Verifier:** Mid-Tier minimum (sonnet), eigener Subagent-Kontext. Dispatch-Contract: templates.md §5 — do not trust the report, diff-scoped (Review-Paket-Datei), zwei Verdicts (Spec + Qualität), Kalibrierung Critical/Important/Minor, plan-mandated ⇒ Eskalation.
- Finale Whole-Branch-Review (stärkstes Modell) vor PR — wie bei Tasks 1–24.

## Dry-Run-Protokoll

Erste Iteration am 2026-07-16 manuell/beaufsichtigt gefahren (Pass 1 = Task 25). Befunde und Nachschärfungen: siehe Ledger-Zeile Pass 1 in STATE.md.
