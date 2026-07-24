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

**Erledigt seit Branch `verrechnungsmodell-umbau`:** Der Kapitalaufbau stützt
sich auf Vermögenszuführungen nach § 62 Abs. 3 AO. Damit die greifen, erfasst
der Spendenflow seit diesem Branch eine zweigeteilte **Widmungserklärung**:
Verwendungsart A (Vermögen) trägt einen versionierten Wortlaut, dokumentiert
über `widmungVersion`/`widmungZeitpunkt` zum Zahlungszeitpunkt; Verwendungsart
B (Direktförderung) ist nur für verifizierte Träger zugelassen. Details:
[`docs/verrechnungsmodell.md`](docs/verrechnungsmodell.md). Weiterhin ungeprüft
ist Prämisse P1 (thesaurierender ETF erzeugt keinen Mittelzufluss), an der das
6 %-Netto-Wachstum hängt. Herleitung und offene Fragen:
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

## Rollen-Trennung Public/Admin umgesetzt (Stand 2026-07-24)

Branch `admin-trennung`
([`docs/superpowers/plans/2026-07-24-admin-trennung.md`](docs/superpowers/plans/2026-07-24-admin-trennung.md),
9 Tasks; Design-Spec
[`docs/superpowers/specs/2026-07-23-admin-trennung-design.md`](docs/superpowers/specs/2026-07-23-admin-trennung-design.md))
trennt das öffentliche Spender-Frontend von einem passwortgeschützten
Admin-Bereich. Vorher konnte jeder Besucher Marktjahr, Jahresabschluss,
Auszahlungslauf, Management-Cap und Träger-Verifikation direkt auslösen —
das war für die Demo praktisch, aber keine plausible Rollentrennung.

**Was jetzt real ist:**
- **Signiertes httpOnly-Session-Cookie** (`lib/server/adminSession.ts`), reine
  `node:crypto`-HMAC-Signatur, keine neue Dependency. Kein `maxAge` — das
  Cookie ist Session-Scope und stirbt mit dem Browserfenster; zwei private
  Fenster ergeben deshalb zwei unabhängige, gleichzeitig nutzbare Rollen.
- **`/admin`-Bereich** (`/admin/login`, Dashboard, `/admin/verifikation`,
  `/admin/einrichtungen`, `/admin/journal`), Zugriff mit Passwort aus
  `ADMIN_PASSWORT`. Middleware redirected unangemeldete Besucher als Komfort;
  die maßgebliche Prüfung ist der RSC-Layout-Guard
  (`app/admin/(geschuetzt)/layout.tsx`, `pruefeSessionToken`) plus der
  Handler-Guard (`pruefeAdminSession`) in jeder `/api/admin/*`-Route.
- **Mutations-Routen unter `/api/admin/*`** verschoben: Marktjahr,
  Jahresabschluss, Auszahlungslauf, Management-Cap, Einrichtung schließen,
  Verifikations-Entscheidung. Jeder Handler prüft die Session als erste
  Zeile — ohne gültiges Cookie: `401 { error: 'nicht_angemeldet' }`.
- **Antrag→Genehmigung-Fluss für Verifikation:** Der alte direkte
  Verifikations-Toggle ist weg. Ein Träger (bzw. die Spender-Seite in seinem
  Namen) stellt öffentlich einen Antrag
  (`POST /api/traeger/[id]/verifikation/antrag`,
  `lib/server/verifikationsService.ts`); ein Admin sieht ihn in der
  Warteschlange (`/admin/verifikation`) und genehmigt oder lehnt ihn ab.
  `setzeVerifikation` bleibt die einzige Stelle, die den Träger-Status
  schreibt — der Antragsfluss sitzt davor.
- **Was public bleibt:** alle GETs, Einrichtung anlegen
  (`POST /api/einrichtungen`), Spende an eine Einrichtung
  (`POST /api/einrichtungen/[slug]/spenden`), Spende an den Solidaritätsfonds
  (`POST /api/solidaritaetsfonds/spenden`), Verifikations-Antrag stellen
  (`POST /api/traeger/[id]/verifikation/antrag`). **Was admin ist:** Login/
  Logout, Marktjahr, Jahresabschluss, Auszahlungslauf, Management-Cap,
  Einrichtung schließen, Verifikations-Entscheidung, Buchungsjournal-Ansicht.
- Grep-Beweis geführt: kein öffentlicher Handler importiert eine der
  mutierenden Service-Funktionen mehr; alle Admin-Fetches im Client-Code
  liegen ausschließlich in Komponenten, die nur unter `app/admin/` eingebunden
  sind.
- **467 Tests, alle grün** (56 Testdateien, Vitest); `npm run verify`
  (tsc + Tests + Build) läuft ohne Fehler durch.

**Ehrlich offen:**
- Kein echtes User-Modell — ein einziges geteiltes Admin-Passwort, keine
  Rollen/Rechte-Differenzierung unter Admins.
- Kein Rate-Limit, kein CSRF-Token auf den Admin-Routen — für die
  Spielgeld-Demo genügt `sameSite=lax` + Same-Origin; vor echtem Einsatz
  nachzurüsten.
- Kein Träger-Portal — Träger haben kein eigenes Login und stellen den
  Verifikations-Antrag nicht selbst; das Spender-Frontend tut es stellvertretend
  für sie. Eigenes Träger-Login ist Phase 2.
- `entscheideAntrag` (`lib/server/verifikationsService.ts`) ist **nicht
  transaktional** über Antrags-Update und `setzeVerifikation` hinweg — bei
  zwei gleichzeitigen Admins auf denselben Antrag ist ein Race möglich. Für
  eine Einzel-Admin-Demo unkritisch, aber ein Follow-up vor Multi-Admin-Einsatz.
- Middleware matcht `/admin/((?!login).*)` und deckt damit die bloße
  `/admin`-Route (Dashboard, Route-Group ohne URL-Segment) nicht ab — dort
  übernimmt bewusst der RSC-Layout-Guard allein (stärkere Prüfung: volle
  Signatur statt nur Cookie-Präsenz). Kein Datenleck, siehe Kommentar in
  `app/admin/(geschuetzt)/layout.tsx`.

---
## Historie

Die früheren Projektstände (Vanilla-Stack, Vercel-Demo, Roadmap 2025) stehen in
[`docs/historie.md`](docs/historie.md). Sie wurden am 2026-07-19 aus diesem
Dokument ausgelagert, weil sie rund 72 % der Datei ausmachten und den aktuellen
Stand verdeckten.
