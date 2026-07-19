# Deutsche Bildungsstiftung — Projektkontext

Doku-Repo + lokale Website `stiftung-web/` (Next.js 14 App Router, TypeScript, Prisma + SQLite, Vitest). Kein echtes Geld, kein Payment — Spielgeld-Buchungen gegen lokale SQLite-DB.

## Kommandos

```bash
cd stiftung-web
npm run dev      # Dev-Server Port 3000
npm run test     # Vitest (einmalig)
```

## Maßgebliche Quellen

- **Verrechnungsmodell (maßgeblich): `docs/verrechnungsmodell.md`** — Kontenmodell, Datenmodell, Jahres-Kaskade, Abgabe- und Umverteilungsformeln. Bei Widerspruch zu anderen Dokumenten gilt diese Spec, im Rahmen ihres Geltungsbereichs.
- Build-Plan (Ausführung): `docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md` — Global Constraints dort sind bindend, **soweit sie dem Verrechnungsmodell nicht widersprechen**.
- Fortschritts-Ledger: `.superpowers/sdd/progress.md` (git-ignoriert)
- Leitbild: `leitbild.md` (Werte und Phasenplan — steht über allem)
- Rechtsform (maßgeblich): `docx/Vereinssatzung.md` — Träger ist in Phase 1 ein **gemeinnütziger Verein**, keine Stiftung. `docx/Stiftungssatzung.md` ist das Phase-3-Ziel und **nicht anzuwenden**. Herleitung und offene Steuerfragen: `docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md`.
- Dokumenten-Übersicht: `docs/dokumenten-inventar.md` — welche Dokumente gelten, welche überholt sind. **Vor dem Zitieren eines `docx/`-Dokuments dort nachsehen.**
- Anlage-/Projektionsannahme (kanonisch): **7 % Brutto-Rendite, 1 % Ausschüttung, 6 % Netto-Wachstum; `Kapital = Jahresbetrag / 0.01`.** Das ist die **Prognosegrundlage** für Spendenrechner und Wirkungsaussagen — **nicht** die Buchungsregel. Gebucht wird ertragsblind auf dem Stichtagswert (`docs/verrechnungsmodell.md`, Schritt 2). Definiert in `docs/verrechnungsmodell.md`, Geltungsbereich.
- ⚠️ Das 6 %-Netto-Wachstum steht unter **Prämisse P1** (thesaurierender ETF erzeugt keinen Mittelzufluss nach § 55 Abs. 1 Nr. 5 AO). Ungeprüft. Trägt sie nicht, sinkt das Wachstum auf grob 2,3 %. Siehe `docs/verrechnungsmodell.md`, Abschnitt „Gemeinnützigkeitsrechtliche Einordnung".

## Konventionen

- Conventional Commits, deutsch (`feat:`, `fix:`, `docs:`, `chore:` …).
- Farben nur als `var(--token)` — keine rohen Hex-Werte außerhalb des Token-Blocks in `globals.css`.
- Eine Schriftfamilie: `Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif`.
- Charts immer mit beschrifteten Achsen.
- Jede Daten-Ansicht: Loading/Empty/Populated/Error; DB-Seiten mit `loading.tsx` + `error.tsx`.
- Backend-Tests gegen echte SQLite-Datei (`prisma/test.db`), kein DB-Mocking.
- Anrede in User-Copy: Du-Form (nicht Sie) — konsistent über alle Seiten.

## Hinweise

- `project-rules.md` ist als Ganzes überholt (Stand Januar 2025) und Löschkandidat — der gültige Inhalt steht hier. Insbesondere Rule #2 (Auto-Push nach jedem Commit): niemals ohne expliziten Auftrag pushen.
- `projekt-status.md` wird beim Branch-Abschluss aktualisiert, nicht pro Commit.

## Loops

- Loop-Verzeichnis: `docs/loops/` — Loop-Definitionen + `STATE.md` (versioniertes Ledger, append-only; bei Wiederaufnahme gilt Ledger + `git log`, nicht Erinnerung).
- `docs/loops/plan-executor.md` (Plan-Tasks 25–36, Branch `begeisterung-pakete`) — **abgeschlossen**, siehe `STATE.md` („ALL TASKS DONE"). Kein aktiver Loop.
- Mechanischer Check: `cd stiftung-web && npm run verify` (tsc + Tests + Build) — das Urteil, nicht die Agenten-Meinung.
- Human-Gates: push, PR-Merge, Task 36, Deploy, Löschen — nie autonom.
