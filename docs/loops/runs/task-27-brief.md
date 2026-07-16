### Task 27: Feier-Moment nach der Spende

**Files:** Modify: `stiftung-web/components/SpendenBestaetigung.tsx`, `components/SpendenRechner.tsx`; Create: `components/Konfetti.tsx` (reines CSS/SVG-Partikel-Burst, einmalig, reduced-motion-safe).

**Akzeptanzkriterien:**
- Reihenfolge der Bestätigung: (1) Konfetti-Burst + „Danke für Ihre Spende!" prominent, (2) animierter Vorher→Nachher-Fortschrittsbalken (alter Stand als blasser Geisterbalken, neuer Stand füllt animiert nach; Prozentzuwachs als Text), (3) neuer Kapitalstand mit Count-up (`useCountUp` aus Task 25), (4) Share/Quittung, (5) Spielgeld-Hinweis als LETZTES Element (dezenter `muted`-Text statt auffälligem Chip — ehrlich, aber kein Dämpfer vor dem Danke).
- Der SpendenRechner übergibt der Bestätigung `altesKapital` zusätzlich (hat er bereits im Prop `einrichtung`).
- Tests: Bestätigung rendert Geisterbalken-Werte korrekt (alt/neu), Spielgeld-Hinweis existiert weiterhin (Regressionsschutz Ehrlichkeits-Constraint), bestehende Tests angepasst.

