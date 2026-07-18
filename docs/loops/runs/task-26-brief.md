### Task 26: Conversion-Pfad

**Files:** Modify: `stiftung-web/app/page.tsx`, `components/Nav.tsx`, `components/SpendenRechner.tsx`, `app/statistik/page.tsx`; ggf. Create: `components/NavLink.tsx`.

**Akzeptanzkriterien:**
- Landing-Hero: primärer CTA „Jetzt spenden" (führt zur Einrichtung mit größtem Pro-Kind-Förderbedarf — Server-seitig via bestehendem `statistik().bottom5[0]` ermittelt); „Einrichtung finden" wird sekundär. Landing zeigt Live-Zahlen aus `statistik()` („X Einrichtungen · Y Kinder · Z € Bildungskapital") statt nur des statischen Rechenbeispiels.
- Der 2.000.000-€-Anker wandert aus der Hero-Wirkungs-Karte in eine untergeordnete „Wie das Modell funktioniert"-Sektion; die Wirkungs-Karte führt stattdessen mit Kleinspender-Perspektive („Schon 5 € wachsen für immer…" mit ehrlicher Formel-Basis).
- Spendenrechner: Preset-Buttons 25 / 50 / 100 / 250 € über dem Slider (Klick setzt Betrag, aria-pressed auf aktivem Preset).
- Nav markiert die aktive Route (usePathname, gefüllte Pille + `aria-current="page"` — DESIGN.md-Regel).
- Statistik-Ranking: jeder Eintrag in „Am besten gefördert"/„Größter Förderbedarf" ist Link zur Detailseite und zeigt Ort · Typ · Fortschritt in % zusätzlich zum Pro-Kind-Wert.
- Tests: Nav-Active-State (RTL, gemockter pathname), Presets setzen Betrag, Landing-Test auf neuen CTA angepasst.

