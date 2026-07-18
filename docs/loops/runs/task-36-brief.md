### Task 36 (OPTIONAL — nur nach explizitem User-Go): Eigene Bildwelt „Wachstum"

**Files:** Create: `stiftung-web/components/WachstumsIllustration.tsx` + Einbindung Landing/Detailseite/Karten.

**Akzeptanzkriterien:**
- Bedeutungstragende SVG-Illustration in Hausstil-Manier (DESIGN.md §3-Prinzip, eigene Metapher statt Weltraum): Pflanze/Baum, deren Wuchsstufe (Samen → Keimling → Bäumchen → Baum → Baum mit Früchten) den Finanztopf-Füllstand (die 5 Einrichtungs-Level aus Task 30) codiert. Nur eigene CSS/SVG-Primitives, Token-Farben, sanfte Wind-Animation (reduced-motion-safe), `aria-hidden` + textliche Zustandsangabe daneben (Status nie nur visuell).
- Erscheint auf Detailseite (groß, neben Finanztopf), Einrichtungs-Karten (klein) und Landing-Hero-Slot.
- L-Aufwand — eigenes Design-Review-Gate vor Merge.

---

**Ausführungs-Reihenfolge:** Paket 1 (25–28) → Paket 2 (29–31) → Paket 3 (32–35), Task 36 nur nach explizitem Go. Jeder Task einzeln review-gated wie Tasks 1–24. Mechanischer Check pro Task: `cd stiftung-web && npm run test && npm run build && npx tsc --noEmit`.
