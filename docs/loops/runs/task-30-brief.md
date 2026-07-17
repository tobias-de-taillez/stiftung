### Task 30: Level-System-Reparatur (zurück zur Original-Vision)

**Files:** Modify: `stiftung-web/lib/data/levels.ts` (+ Tests), `components/ProgressBar.tsx` oder Create: `components/LevelLeiter.tsx`, Modify: `app/einrichtungen/[slug]/page.tsx`, `components/SpendenRechner.tsx`.

**Akzeptanzkriterien:**
- **Einrichtungs-Level (Brainstorming-Vision):** Bronze→Diamant als Zwischenziele des FINANZTOPFS — definiert als Anteile des Zielkapitals (z. B. Bronze 10 %, Silber 25 %, Gold 50 %, Platin 75 %, Diamant 100 %). Sichtbar als Marker auf dem Fortschrittsbalken der Detailseite + „Nächstes Ziel: Silber — noch X €"-Zeile. Pure Funktion `einrichtungsLevel(aktuell, ziel)` + Tests.
- **Spender-Badge repariert:** absolute, erreichbare Schwellen unabhängig von Kinderzahl (25/100/250/1.000/2.500 €), gilt auch für Einmalspenden. `currentLevel`-Signatur entsprechend umgestellt, Tests angepasst. Chip zeigt zusätzlich „noch X € bis [nächstes Level]".
- Evidenz: Brainstorming Abs. 4 (Level = Ausschüttungs-Stufen der Einrichtung), Gap „Bronze bei 60-Kinder-Kita = 3.000 €/Jahr, Slider-Max 2.000".

