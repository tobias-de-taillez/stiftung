### Task 34: Transparenz auf Detailseite + Jahresabschluss-Historie

**Files:** Modify: `stiftung-web/app/einrichtungen/[slug]/page.tsx`, `lib/server/einrichtungenService.ts` (+ Tests), `app/statistik/page.tsx`, `lib/server/simulationService.ts` (Read-Helper).

**Akzeptanzkriterien:**
- Detailseite zeigt: Förderung pro Kind, Spendenhistorie (letzte 10: Datum, Betrag, Quelle — Solidaritäts-Zuflüsse explizit gelabelt „aus dem Solidaritätsfonds" mit turquoise-Akzent: der Leitbild-Kernmechanismus wird sichtbar), Anzahl Unterstützungen gesamt.
- Statistik-Seite: Jahresabschluss-Historie als Tabelle (Nr., Fonds-Ertrag, Kapital-Ertrag, Verteilt, Datum) aus der bereits persistierten `Jahresabschluss`-Tabelle; der Kennzahlen-Block „Simulierter Jahresertrag" verweist auf echte Abschlüsse, wenn vorhanden.
- DB-Tests für neue Service-Reads.

