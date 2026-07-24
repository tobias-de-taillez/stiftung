# Deutsche Bildungsstiftung — Projektkontext

Doku-Repo + lokale Website `stiftung-web/` (Next.js 14 App Router, TypeScript, Prisma + SQLite, Vitest). Kein echtes Geld, kein Payment — Spielgeld-Buchungen gegen lokale SQLite-DB.

## Kommandos

```bash
cd stiftung-web
npm run dev      # Dev-Server Port 3000
npm run test     # Vitest (einmalig)
```

Env-Variablen `ADMIN_PASSWORT` und `ADMIN_SESSION_SECRET` (siehe
`stiftung-web/.env.example`) müssen in `stiftung-web/.env` gesetzt sein, sonst
lassen sich weder `npm run dev` (Admin-Login) noch die Tests (dort per
`vitest.config.ts` fest vorgegeben) starten.

## Maßgebliche Quellen

- **Verrechnungsmodell (maßgeblich): `docs/verrechnungsmodell.md`** — Kontenmodell, Datenmodell, Jahres-Kaskade, Abgabe- und Umverteilungsformeln. Bei Widerspruch zu anderen Dokumenten gilt diese Spec, im Rahmen ihres Geltungsbereichs.
- Build-Plan (Ausführung): `docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md` — Global Constraints dort sind bindend, **soweit sie dem Verrechnungsmodell nicht widersprechen**.
- Fortschritts-Ledger: `.superpowers/sdd/progress.md` (git-ignoriert)
- Leitbild: `leitbild.md` (Werte und Phasenplan — steht über allem)
- Rechtsform (maßgeblich): `docx/Vereinssatzung.md` — Träger ist in Phase 1 ein **gemeinnütziger Verein**, keine Stiftung. `docx/Stiftungssatzung.md` ist das Phase-3-Ziel und **nicht anzuwenden**. Herleitung und offene Steuerfragen: `docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md`.
- Dokumenten-Übersicht: `docs/dokumenten-inventar.md` — welche Dokumente gelten, welche überholt sind. **Vor dem Zitieren eines `docx/`-Dokuments dort nachsehen.**
- Anlage-/Projektionsannahme: **nicht hier definiert.** Kanonische Quelle ist `docs/verrechnungsmodell.md`, Abschnitt „Kanonische Projektionsannahme" — dort nachsehen, bevor eine Zahl verwendet oder in Copy geschrieben wird. Merksatz ohne Zahlen: Es ist eine **Prognosegrundlage**, keine Buchungsregel; gebucht wird ertragsblind auf dem Stichtagswert.
- ⚠️ Das 6 %-Netto-Wachstum steht unter **Prämisse P1** (thesaurierender ETF erzeugt keinen Mittelzufluss nach § 55 Abs. 1 Nr. 5 AO). Ungeprüft. Trägt sie nicht, sinkt das Wachstum auf grob 2,3 %. Siehe `docs/verrechnungsmodell.md`, Abschnitt „Gemeinnützigkeitsrechtliche Einordnung".

## Konventionen

- Conventional Commits, deutsch (`feat:`, `fix:`, `docs:`, `chore:` …).
- Farben nur als `var(--token)` — keine rohen Hex-Werte außerhalb des Token-Blocks in `globals.css`.
- Eine Schriftfamilie: `Inter, ui-rounded, "SF Pro Rounded", system-ui, sans-serif`.
- Charts immer mit beschrifteten Achsen.
- Jede Daten-Ansicht: Loading/Empty/Populated/Error; DB-Seiten mit `loading.tsx` + `error.tsx`.
- Backend-Tests gegen echte SQLite-Datei (`prisma/test.db`), kein DB-Mocking. Jede DB-Suite nutzt `resetDb()` aus `lib/server/__tests__/testDb.ts`.
- Anrede in User-Copy: Du-Form (nicht Sie) — konsistent über alle Seiten.

## Hinweise

- Niemals ohne expliziten Auftrag pushen. (`project-rules.md` mit der gegenteiligen Auto-Push-Regel wurde am 2026-07-19 gelöscht.)
- `projekt-status.md` wird beim Branch-Abschluss aktualisiert, nicht pro Commit.
- **Admin-Bereich:** `/admin` (passwortgeschützt, Passwort aus `ADMIN_PASSWORT`
  in `.env`). Trennt öffentliches Spender-Frontend von administrativen
  Aktionen (Marktjahr, Jahresabschluss, Auszahlungslauf, Management-Cap,
  Einrichtung schließen, Verifikations-Entscheidung) — siehe
  `docs/superpowers/specs/2026-07-23-admin-trennung-design.md`. Jeder
  `/api/admin/*`-Handler prüft die Session selbst (`pruefeAdminSession`); die
  Middleware ist nur Redirect-Komfort, keine alleinige Barriere.
- **Zwei-Fenster-Demo-Muster** zum manuellen Testen der Rollen-Trennung: ein
  privates Browserfenster ohne Cookie (Normalo/Spender-Sicht) neben einem
  zweiten privaten Fenster, in dem man sich unter `/admin/login` einloggt
  (Admin-Sicht). Beide Rollen sind so gleichzeitig und unabhängig voneinander
  sichtbar, weil das Session-Cookie kein `maxAge` hat und pro Fenster gilt.

## Loops

- Loop-Verzeichnis: `docs/loops/` — Loop-Definitionen + `STATE.md` (versioniertes Ledger, append-only; bei Wiederaufnahme gilt Ledger + `git log`, nicht Erinnerung).
- `docs/loops/plan-executor.md` (Plan-Tasks 25–36, Branch `begeisterung-pakete`) — **abgeschlossen**, siehe `STATE.md` („ALL TASKS DONE"). Kein aktiver Loop.
- Mechanischer Check: `cd stiftung-web && npm run verify` (tsc + Tests + Build) — das Urteil, nicht die Agenten-Meinung.
- Human-Gates: push, PR-Merge, Task 36, Deploy, Löschen — nie autonom.
