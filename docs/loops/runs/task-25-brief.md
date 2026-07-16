### Task 25: Motion-Fundament

**Files:** Modify: `stiftung-web/app/globals.css`, `components/ProgressBar.tsx`; Create: `stiftung-web/lib/hooks/useCountUp.ts` + Test.

**Akzeptanzkriterien:**
- `.pill` und klickbare `.card`s haben transition + sichtbaren Hover-Zustand (Card: Lift `translateY(-2px)` + Shadow-Verstärkung; Pill: Helligkeits-Shift). Nav-Links eingeschlossen.
- `ProgressBar` füllt beim ersten Rendern animiert von 0 auf Zielbreite (CSS-Transition, ~800ms ease-out) und zeigt zusätzlich die Prozentzahl als Text (z. B. „4 %"); bei ≥100 % wechselt der Balken auf `var(--turquoise)` und das Label ergänzt „Ziel erreicht". aria-Attribute unverändert korrekt.
- `useCountUp(target, durationMs)`-Hook (requestAnimationFrame, ease-out, respektiert reduced-motion → sofort Endwert). Unit-Test: liefert am Ende exakt target; mit reduced-motion sofort.
- Evidenz-Gaps: globals.css ohne jede Transition (grep 0 Treffer außer reduced-motion-Block); ProgressBar.tsx:12 width ohne Transition; DESIGN.md-Regel „Status nie nur über Farbe — immer Zahl daneben" (Prozent fehlt bisher).

