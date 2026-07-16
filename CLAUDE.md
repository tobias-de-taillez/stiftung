# Deutsche Bildungsstiftung — Projektkontext

Doku-Repo + lokale Website `stiftung-web/` (Next.js 14 App Router, TypeScript, Prisma + SQLite, Vitest). Kein echtes Geld, kein Payment — Spielgeld-Buchungen gegen lokale SQLite-DB.

## Kommandos

```bash
cd stiftung-web
npm run dev      # Dev-Server Port 3000
npm run test     # Vitest (einmalig)
```

## Maßgebliche Quellen

- Build-Plan (Ausführung): `docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md` — Global Constraints dort sind bindend.
- Fortschritts-Ledger: `.superpowers/sdd/progress.md` (git-ignoriert)
- Leitbild: `leitbild.md` · Finanzmodell: `projekt-status.md` (7 % Brutto, 1 % Ausschüttung, 6 % Netto-Wachstum; Kapital = Jahresbetrag / 0.01)

## Konventionen

- Conventional Commits, deutsch (`feat:`, `fix:`, `docs:`, `chore:` …).
- Farben nur als `var(--token)` — keine rohen Hex-Werte außerhalb des Token-Blocks in `globals.css`.
- Eine Schriftfamilie: `Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif`.
- Charts immer mit beschrifteten Achsen.
- Jede Daten-Ansicht: Loading/Empty/Populated/Error; DB-Seiten mit `loading.tsx` + `error.tsx`.
- Backend-Tests gegen echte SQLite-Datei (`prisma/test.db`), kein DB-Mocking.

## Hinweise

- `project-rules.md` Rule #2 (Auto-Push nach jedem Commit) ist obsolet — niemals ohne expliziten Auftrag pushen.
- `projekt-status.md` wird beim Branch-Abschluss aktualisiert, nicht pro Commit.
