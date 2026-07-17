### Task 29: Rechner-Reframing (Zukunftswert-Story)

**Files:** Modify: `stiftung-web/lib/calc/spendenrechner.ts` (+ Tests), `components/SpendenRechner.tsx`.

**Akzeptanzkriterien:**
- Neue pure Funktionen (mit Tests): `zukunftswert(betrag, jahre)` (FV zum Zielzeitpunkt der Einrichtung), `verkuerzungMonate(einrichtung, betrag, frequenz)` (Delta Jahre-bis-Ziel ohne/mit Spende, in Monaten), `dauerhafteJahresfoerderung(betrag)` (= betrag × ANNUAL_PAYOUT_RATE... KORREKTUR: Ausschüttung entsteht aus dem ANGEWACHSENEN Kapital — Formel: FV(betrag) × ANNUAL_PAYOUT_RATE zum Zielzeitpunkt; einfache Variante betrag × 0.01 nur als „ab sofort"-Untergrenze ausweisen).
- Hero-Anzeige des Rechners wird die WIRKUNG, nicht die Wartezeit: primär „Deine 50 € sind bei Zielerreichung auf ~X € angewachsen" + Anteil am Ziel visualisiert (Mini-Balken: mein Beitrag vs. Ziel — die Brainstorming-Kernvisualisierung 50 €→40.000 € im Verhältnis zu 2 Mio); sekundär „…und verkürzen den Weg um Y Monate"; die Jahre-bis-Ziel-Zahl bleibt als tertiäre Info. „nicht erreichbar" (Infinity) erscheint nie als Hauptbotschaft — stattdessen wird bei unerreichbarem Ziel die Dauerförderungs-Perspektive gezeigt.
- Alle Formeln aus bestehenden Konstanten; Property-Test: verkuerzungMonate ≥ 0 und monoton in betrag.

