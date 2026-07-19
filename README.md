# Deutsche Bildungsstiftung

Dauerhaftes Bildungskapital für Bildungs- und Betreuungseinrichtungen in
Deutschland. Zuwendungen werden nicht verbraucht, sondern angelegt;
ausgeschüttet wird der Ertrag. Einrichtungen mit geringem Kapital je Kind
werden über einen Solidaritätsfonds überproportional gefördert.

Doku-Repo plus lokale Website unter [`stiftung-web/`](stiftung-web/)
(Next.js 14, TypeScript, Prisma/SQLite). **Kein echtes Geld, kein Payment** —
Spielgeld-Buchungen gegen eine lokale SQLite-Datenbank.

## Rechtsform: Verein jetzt, Stiftung später

Träger ist in Phase 1 ein **gemeinnütziger Verein**, keine Stiftung. Der Verein
braucht deutlich weniger Startkapital und darf ausdrücklich gewidmete
Zuwendungen nach § 62 Abs. 3 AO unbegrenzt seinem Vermögen zuführen — der
Kapitalaufbau funktioniert also auch ohne Stiftung.

Erreicht der **Solidaritätsfonds eine Million Euro**, ist die Überführung in
eine Stiftung innerhalb von zwei Jahren zu vollziehen. Die Frist ist durch
begründeten Beschluss der Mitgliederversammlung um jeweils ein Jahr
verlängerbar. Der eigentliche Grund für die spätere Stiftung ist nicht der
Kapitalaufbau, sondern der erweiterte Spendenabzug nach § 10b Abs. 1a EStG,
der Stiftungen vorbehalten ist.

> Der Projektname trägt weiterhin „Stiftung". Die Namensentscheidung steht aus;
> bis dahin bleibt das Website-Branding unverändert.

| Dokument | Inhalt |
|---|---|
| [`docx/Vereinssatzung.md`](docx/Vereinssatzung.md) | Satzungsentwurf Phase 1 — **maßgeblich** |
| [`docx/Stiftungssatzung.md`](docx/Stiftungssatzung.md) | Zieldokument Phase 3, noch nicht anzuwenden |
| [`docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md`](docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md) | Steuerrechtliche Herleitung, offene Fragen an die Steuerberatung |

## Einstieg

| Dokument | Inhalt |
|---|---|
| [`leitbild.md`](leitbild.md) | Mission, Vision, True North — oberster Ausrichtungspunkt |
| [`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md) | Konten, Depots, Jahres-Kaskade — maßgeblich für die Buchung |
| [`zeitersparnis.md`](zeitersparnis.md) | Spendenrechner-Modell und Formeln |
| [`projekt-status.md`](projekt-status.md) | Aktueller Stand und Historie |
| [`docs/dokumenten-inventar.md`](docs/dokumenten-inventar.md) | Übersicht aller Dokumente, inkl. veralteter |

## Website lokal starten

```bash
cd stiftung-web
npm run dev      # Port 3000
npm run test     # Vitest
npm run verify   # tsc + Tests + Build
```
