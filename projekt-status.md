# Projekt-Status: Deutsche Bildungsstiftung

> **Dieses Dokument beschreibt den IST-Zustand des Codes**, nicht das
> Zielmodell. Maßgeblich für Verrechnung und Umverteilung ist
> [`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md). Der Code
> implementiert es seit Task 20 vollständig — siehe
> [Zielmodell umgesetzt](#zielmodell-umgesetzt).
>
> Dies ist die **einzige** Stelle, an der der Abstand zwischen Code und
> Zielmodell geführt wird. Frühere Projektstände stehen in
> [`docs/historie.md`](docs/historie.md).

## Rechtsform (Stand 2026-07-19)

Träger ist in Phase 1 ein **gemeinnütziger Verein**, keine Stiftung — trotz des
Projektnamens. Maßgebliches Dokument ist
[`docx/Vereinssatzung.md`](docx/Vereinssatzung.md);
[`docx/Stiftungssatzung.md`](docx/Stiftungssatzung.md) ist das Phase-3-Ziel und
nicht anzuwenden.

Erreicht der Solidaritätsfonds **zwei Millionen Euro**, ist die Überführung in
eine Stiftung binnen zwei Jahren zu vollziehen; die Frist ist durch begründeten
Beschluss der Mitgliederversammlung um jeweils ein Jahr verlängerbar
(§ 13 Vereinssatzung). Bei der Überführung wird eine Million als
Grundstockvermögen der Stiftung festgeschrieben, der Rest bleibt
Solidaritätsfonds — das erfordert später eine dritte Topf-Ebene im
Datenmodell, siehe [`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md).

**Offen und relevant für den Code:** Der Kapitalaufbau stützt sich auf
Vermögenszuführungen nach § 62 Abs. 3 AO. Damit die greifen, muss der
Spendenflow eine **Widmungserklärung** der Spender:innen erfassen und
dokumentieren — heute nicht implementiert. Ebenfalls ungeprüft ist Prämisse P1
(thesaurierender ETF erzeugt keinen Mittelzufluss), an der das 6 %-Netto-Wachstum
hängt. Herleitung und offene Fragen:
[`docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md`](docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md).

## Aktueller Stand 2026-07-23

**Status:** ✅ Verrechnungsmodell vollständig umgesetzt — Pool-Anteile, fünf Kontenebenen, Solidaritätsabgabe, Kaskade

Branch `verrechnungsmodell-umbau`
([`docs/superpowers/plans/2026-07-23-verrechnungsmodell-umbau.md`](docs/superpowers/plans/2026-07-23-verrechnungsmodell-umbau.md),
20 Tasks) hat den kompletten Finanzteil von `stiftung-web/` gegen die Spec in
[`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md) getauscht. Task 20
hat die Alt-Welt-Mechanismen aus dem vorigen Stand (2026-07-16, siehe
[`docs/historie.md`](docs/historie.md)) — Float-Kapital, deterministische
6-%-Jahressimulation, absoluter Soli-Fonds-Bedarf — endgültig aus dem Code
entfernt; das Verrechnungsmodell ist jetzt der einzige Buchungspfad.

**Was jetzt real ist:**
- **Pool-Anteile statt Euro-Float:** Jede Einrichtung hält Anteile am
  gemeinsamen Einrichtungs-Depot; der Topfwert ergibt sich aus Anteil ×
  Poolwert, ganzzahlig in Cent (`lib/verrechnung/anteile.ts`, `geld.ts`).
- **Fünf Kontenebenen:** Einrichtungs-Depot, Verrechnungskonto, Soli-Depot,
  Soli-Verrechnungskonto, Management-Konto als `Kontenstand`-Singleton
  (`lib/server/kontenService.ts`).
- **Jahres-Kaskade statt Simulation:** ein Marktjahr stellt den Kurs, die
  Kaskade (`lib/verrechnung/kaskade.ts`, `lib/server/kaskadeService.ts`)
  bucht ertragsblind auf dem Stichtagswert — Abgabe, P5/P95-Rang,
  1-%-Umverteilung, Management-Cap, Buchungsjournal.
- **Träger + Spendenwidmung:** Einrichtungen hängen an einem Rechtsträger;
  Zuwendungen tragen eine Widmung (Vermögen A / Direktförderung B,
  § 62/§ 55 AO).
- **407 Tests, alle grün** (45 Testdateien, Vitest); `npm run verify`
  (tsc + Tests + Build) läuft ohne Fehler durch.

Details: [`stiftung-web/README.md`](stiftung-web/README.md).

### Zielmodell umgesetzt

Der Code implementiert das Modell aus
[`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md) seit Task 20
vollständig — Ist == Soll:

| Zielmodell | Ist-Zustand |
|---|---|
| Töpfe als Pool-Anteile | ✓ |
| Fünf Kontenebenen (2 Depots, 2 Verrechnungskonten, Management-Konto) | ✓ |
| Solidaritätsabgabe der besser ausgestatteten Einrichtungen | ✓ |
| Verteilung nach relativer Position (P5/P95-winsorisiert) | ✓ |
| Nur 1 % Umverteilung, Rest bleibt liegen | ✓ |
| Rechtsträger (Träger 1 — n Einrichtung) | ✓ |
| Spendenwidmung (Vermögen A / Direktförderung B) | ✓ |
| Erstbefüllung neuer Einrichtungen | ✓ |
| Sweep (Verrechnungskonto auf 1-%-Ziel) | ✓ |
| Buchungsjournal (Spec §7, brutto pro Einrichtung) | ✓ |

**Weiterhin offen** (bewusst nicht Teil dieses Umbaus):
- Kein echtes Payment/KYC — Spielgeld-Buchung, anonyme Spenden.
- Prämisse P1 (thesaurierender ETF erzeugt keinen Mittelzufluss nach
  § 55 Abs. 1 Nr. 5 AO) — ungeprüft, vor Gründung mit Steuerberater:in zu
  klären.
- S8 (Verkäufe nur in Ausschüttungshöhe) und S9 (Empfängerfähigkeit
  Tagespflege) — offene Fragen an die Spec, siehe
  [Vereinsgründungs-Spec](docs/superpowers/specs/2026-07-19-vereinsgruendung-design.md).
- Kein Grundstock-Topf — erst zur Stiftungsumwandlung in Phase 3 fällig; das
  Kontenmodell ist dafür vorbereitet (siehe Verrechnungsmodell § 10).

---
## Historie

Die früheren Projektstände (Vanilla-Stack, Vercel-Demo, Roadmap 2025) stehen in
[`docs/historie.md`](docs/historie.md). Sie wurden am 2026-07-19 aus diesem
Dokument ausgelagert, weil sie rund 72 % der Datei ausmachten und den aktuellen
Stand verdeckten.
