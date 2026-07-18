### Task 32: Simulations-Zeitraffer

**Files:** Modify: `stiftung-web/components/SolidaritaetsfondsPanel.tsx` (+ Tests); ggf. Create: `components/ZeitrafferErgebnis.tsx`.

**Akzeptanzkriterien:**
- Nach „Jahr simulieren" läuft eine inszenierte Sequenz statt drei Textzeilen: (1) „Kapital wächst +6 %…" mit Count-up des Kapital-Ertrags, (2) „Fonds verteilt an die Bedürftigsten…" — Verteilungsliste baut sich gestaffelt auf (Einträge erscheinen nacheinander, Beträge zählen hoch, größter Empfänger hervorgehoben), (3) Abschluss-Summe. Gesamtdauer ≤ 4 s, reduced-motion → alles sofort.
- Reine Client-Inszenierung der vorhandenen API-Antwort (fondsErtrag, kapitalErtrag, verteilung[]) — kein API-Umbau.
- Tests: Endzustand nach Sequenz zeigt alle Werte (fake timers oder reduced-motion-Pfad).

