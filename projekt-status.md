# Projekt-Status: Deutsche Bildungsstiftung

> **Dieses Dokument beschreibt den IST-Zustand des Codes**, nicht das
> Zielmodell. Maßgeblich für Verrechnung und Umverteilung ist
> [`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md). Der Code weicht
> davon derzeit erheblich ab — siehe [Abstand zum Zielmodell](#abstand-zum-zielmodell).
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

## Aktueller Stand 2026-07-16

**Status:** ✅ Lokale Website neu aufgebaut, echtes getestetes Backend, Solidaritätsfonds aktiv

Der Code-Stand liegt jetzt vollständig unter [`stiftung-web/`](stiftung-web/) —
ein Next.js-14-Projekt (App Router, TypeScript) mit Prisma/SQLite statt des
früheren Vanilla-Stacks (HTML/CSS/JS, siehe Historie unten). Der alte
Code-Stand wurde entfernt (`78b98d2`), die lokale Version in 21 Tasks
(`docs/superpowers/plans/2026-07-15-website-rebuild-lokal.md`) neu gebaut.

**Was jetzt real ist (kein Mock mehr):**
- **Echtes Backend:** Spenden werden per API-Route über Prisma real in einer
  lokalen SQLite-Datenbank gebucht und persistieren über Reloads hinweg —
  "Spielgeld", aber keine gemockte Datenschicht. Service-Layer und
  API-Routes sind gegen eine echte Test-SQLite-Datei integrationsgetestet.
- **Aktiver Solidaritätsfonds:** Nicht zweckgebundene Spenden sammeln sich im
  Fonds; eine Verteilung berechnet pro Einrichtung den Pro-Kind-Abstand zum
  Ziel-Kapital und teilt den Fonds-Bestand proportional dazu auf — die
  bedürftigste Einrichtung bekommt nachweislich am meisten (End-to-End
  verifiziert). Das ist der Kernmechanismus aus dem Leitbild, nicht nur eine
  informative Rangliste.
- **Jahres-Simulation aktiv:** Button „Jahr simulieren (+6 %)" im
  Fonds-Panel bucht einen kompletten Jahresabschluss — 6 % Netto-Wachstum auf
  Fonds-Bestand und auf das Kapital jeder Einrichtung, danach automatische
  Verteilung, protokolliert als `Jahresabschluss`-Datensatz. Kein
  Spenden-Zufluss, reines Kapitalwachstum.
- **94 Tests, alle grün:** 23 Testdateien (Vitest), Service-Layer,
  Berechnungslogik und API-Routes abgedeckt; `npm run build` läuft ohne
  TypeScript-/ESLint-Fehler durch.

**Was weiterhin offen ist:**
- Kein echtes Payment (Stripe/PayPal) — reine Spielgeld-Buchung.
- Kein Login/KYC — Spenden sind anonym.
- Keine Auszahlung an Einrichtungen (nur Zufluss modelliert).
- Deployment/Hosting noch nicht adressiert.

Details: [`stiftung-web/README.md`](stiftung-web/README.md).

### Abstand zum Zielmodell

Der Code implementiert das Modell aus
[`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md) **nicht**. Die
Umsetzung ist ein Umbau, kein Patch. Offene Punkte:

| Zielmodell | Ist-Zustand |
|---|---|
| Töpfe als **Pool-Anteile** | `aktuellesKapital: Float` in Euro |
| Fünf Kontenebenen (2 Depots, 2 Verrechnungskonten, Management-Konto) | Kein Konten-/Depot-Split |
| **Solidaritätsabgabe** der besser ausgestatteten Einrichtungen | Fehlt vollständig — Fonds speist sich nur aus freien Spenden |
| Verteilung nach **relativer** Position (P5/P95-winsorisiert) | Verteilung nach **absolutem** Abstand zum Ziel-Kapital |
| Nur 1 % des Soli-Fonds wird verteilt, Rest bleibt liegen | Kompletter Fonds-Bestand wird verteilt, danach auf 0 gesetzt |
| Direktförderung 1 % an die Einrichtung | Keine Auszahlung modelliert |
| Ertragsblinde Buchung auf Stichtagswert | Deterministische 6 %-Simulation |

Die 6 %-Jahressimulation ist als **Projektion** weiterhin sinnvoll; sie ist
nur keine Buchungsregel (siehe Geltungsbereich der Spec).

---
## Historie

Die früheren Projektstände (Vanilla-Stack, Vercel-Demo, Roadmap 2025) stehen in
[`docs/historie.md`](docs/historie.md). Sie wurden am 2026-07-19 aus diesem
Dokument ausgelagert, weil sie rund 72 % der Datei ausmachten und den aktuellen
Stand verdeckten.
