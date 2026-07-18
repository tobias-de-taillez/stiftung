### Task 28: Impact-Beispiele + Share-Text mit Wirkung

**Files:** Create: `stiftung-web/lib/data/impactBeispiele.ts` + Test; Modify: `components/SpendenRechner.tsx`, `components/SpendenBestaetigung.tsx`, `app/einrichtungen/[slug]/page.tsx`.

**Akzeptanzkriterien:**
- `impactBeispiel(typ, jahresAusschuettung)`: mappt Einrichtungstyp + jährlichen Ausschüttungsbetrag auf konkrete Beispiele (tagespflege: Spielzeug/Bastelmaterial/Ausflug; kita: Bücherkiste/Musikinstrumente; schule: Klassensatz Schulmaterial/Experimentierkasten — gestaffelt nach Betrag, mind. 3 Stufen je Typ). Pure Funktion + Tests.
- Rechner zeigt unter dem Ergebnis: „Deine Spende erwirtschaftet dauerhaft ~X €/Jahr — das ist z. B. [Beispiel], jedes Jahr aufs Neue." (X = betrag × ANNUAL_PAYOUT_RATE bei einmalig; ehrliche Formel-Fußnote).
- Share-Text erzählt Wirkung statt Transaktion: enthält Delta („verkürzt den Weg zum Ziel um …") oder Impact-Beispiel — Daten aus vorhandener Rechner-Mathematik.
- Brainstorming-Evidenz: Abs. 5 („Solche Beispiele … motivieren ihn, den Spendenknopf zu drücken"), Abs. 7 (Erfolg teilen).

---

## Paket 2 „Story" — der Rechner erzählt die richtige Geschichte (Tasks 29–31)

