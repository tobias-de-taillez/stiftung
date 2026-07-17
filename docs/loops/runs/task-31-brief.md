### Task 31: Meilenstein-Erkennung + Feier

**Files:** Modify: `stiftung-web/lib/server/einrichtungenService.ts` (+ Tests), `app/api/einrichtungen/[slug]/spenden/route.ts`, `components/SpendenBestaetigung.tsx`.

**Akzeptanzkriterien:**
- `spenden()` erkennt überschrittene Einrichtungs-Level (aus Task 30) und Prozent-Meilensteine (25/50/75/100) und liefert sie im Ergebnis (`erreichteMeilensteine: string[]`). DB-Integrationstest: Spende über Schwelle → Meilenstein im Response; Spende ohne Schwelle → leer.
- Bestätigung feiert Meilensteine prominent („🎉 Silber erreicht!" — Banner über dem Danke, mit Konfetti-Wiederverwendung aus Task 27).
- Simulation (`simuliereJahr`) liefert Meilensteine pro Einrichtung ebenfalls (gleiche Erkennungs-Helper-Funktion, kein Duplikat).

---

## Paket 3 „Leben" — tote Daten inszenieren (Tasks 32–36)

