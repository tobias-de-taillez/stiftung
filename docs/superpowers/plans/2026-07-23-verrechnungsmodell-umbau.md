# Verrechnungsmodell-Umbau Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `stiftung-web/` implementiert das Kontenmodell, Datenmodell und die Jahres-Kaskade aus `docs/verrechnungsmodell.md` (Spec v0.1) vollständig — Pool-Anteile statt Euro-Float, fünf Kontenebenen, Solidaritätsabgabe, wertbasierte Rangposition `p`, Träger-Entität, Spendenwidmung A/B, Erstbefüllung, Sweep und Buchungsjournal.

**Architecture:** Reine Rechenkerne in `lib/verrechnung/` (BigInt-Cent, DB-frei, exakt gegen das durchgerechnete Spec-Beispiel §9 getestet) + dünne Prisma-Services in `lib/server/` (jede Buchung eine `$transaction`) + bestehende Next.js-App-Router-UI, die von Euro-Float auf Cent-Werte umgestellt wird. Die Kaskade rechnet Spec-treu in Cent auf dem Snapshot und persistiert am Ende über eine Anteils-Renormierung.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Prisma 6 + SQLite, Vitest (echte `prisma/test.db`), keine neuen Runtime-Dependencies.

**Branch:** `verrechnungsmodell-umbau` (von `main`).

## Global Constraints

Gelten für JEDEN Task, zusätzlich zu den Task-eigenen Schritten:

- **Maßgebliche Spec:** `docs/verrechnungsmodell.md`. Bei Widerspruch zwischen diesem Plan und der Spec gilt die Spec (im Rahmen ihres Geltungsbereichs: Buchung — nicht Produkt/Projektion).
- **Geld ist `bigint` in Cent.** In `lib/verrechnung/` und in allen Buchungspfaden der Services gibt es keine Fließkomma-Geldarithmetik. `number` für Geld ist nur erlaubt: (a) an der API-/UI-Grenze als ganzzahlige Cent (Safe-Integer-geprüft), (b) in Projektions-/Produktrechnung (`lib/calc/`, `lib/data/` — 6 %-Prognose, Level, Meilensteine).
- **Anteile sind `bigint`** in 10⁻⁸-Feinheit (Spec §2, Vorschlag übernommen). Anteile sind kein Geld — kein Mischen der Einheiten.
- **Invariante (Spec §2):** `Σ Topf_€ == Poolwert` mit `Poolwert = etfMarktwertCent + verrechnungskontoCent − offene Direktausschüttungen`. Jeder Service-Task endet mit einem Test, der Geld-Erhaltung prüft (Summe aller Konten + externe Zu-/Abflüsse konstant in Cent).
- **Rundung (Spec §2):** kaufmännisch auf Cent (half away from zero); bei proportionaler Verteilung geht die Restdifferenz an die Einrichtung mit dem niedrigsten Pro-Kind-Volumen, bei Gleichstand niedrigere Einrichtungs-ID.
- **Kanonische Projektionsannahme** (Spec, „Kanonische Projektionsannahme"): 7 % brutto, 1 % Ausschüttung, 6 % netto, Kapital = Jahresbetrag/0,01. Nur der 1 %-Satz ist Buchungsregel. Konstanten `NET_GROWTH_RATE`/`ANNUAL_PAYOUT_RATE` aus `lib/calc/spendenrechner.ts` bleiben die einzige Quelle für Projektions-Copy.
- Keine neuen Runtime-Dependencies. Keine neuen devDependencies (randomisierte Tests mit handgerolltem Seeded-PRNG, kein fast-check).
- Backend-Tests gegen echte SQLite-Datei (`prisma/test.db`), kein DB-Mocking. Jede DB-Test-Suite resettet in `beforeEach` ALLE Tabellen in FK-sicherer Reihenfolge — ab Task 5 über den zentralen Helper `lib/server/__tests__/testDb.ts`.
- Farben nur `var(--token)`; eine Schriftfamilie; Charts mit beschrifteten Achsen; jede Datenansicht mit Loading/Empty/Populated/Error (`loading.tsx` + `error.tsx` bleiben erhalten); `prefers-reduced-motion` respektiert.
- Anrede in User-Copy: Du-Form. Rechtliche Erklärtexte (Widmungswortlaut) sind Ich-Erklärungen der spendenden Person — das ist keine Anrede-Verletzung.
- Conventional Commits, deutsch. Nach jedem Task: `cd stiftung-web && npm run verify` (tsc + Tests + Build) grün, dann committen. Niemals pushen ohne expliziten Auftrag.
- **Darstellungspflicht (Spec §3.0):** Die Erstbefüllungs-Zusage wird nie als Kontostand ausgewiesen, immer als erkennbare Zusage („Sobald du spendest, legt der Solidaritätsfonds X € dazu.").

---

## Kontext für den Executor (Ist-Zustand, den dieser Plan ersetzt)

Der Bestand speichert `Einrichtung.aktuellesKapital` als Euro-`Float`, kennt keinen Träger, keine Konten, keine Abgabe. `lib/calc/solidaritaet.ts` verteilt den **gesamten** Fondsbestand nach **absoluter** Pro-Kind-Lücke zum Zielkapital; `lib/server/simulationService.ts` bucht 6 % Ertrag als Float-Increment. Beides ist laut Spec falsch und wird ersetzt. Die UI (Landing, `/einrichtungen`, `/einrichtungen/[slug]`, `/solidaritaetsfonds`, `/statistik`) sowie Konfetti/Ticker/Meilensteine/Level bleiben als Produkt erhalten und werden nur auf die neuen Datenquellen umgestellt.

**Was bewusst NICHT gebaut wird (Spielgeld-Rahmen, YAGNI):**

- Kein echtes KYC — `Traeger.verifiziert` ist ein Boolean-Toggle in der UI („Zugang abgeholt“-Simulation).
- Kein echter Zahlungsverkehr, keine Bankverbindungen, keine Belegprüfung (Pfad 2 / Erstattungskatalog = reine Anzeige des Auszahlungspfads).
- Kein Grundstock (Phase 3). Das Kontenmodell ist aber so geschnitten (Singleton `Kontenstand` mit benannten Spalten + `Buchung`-Journal), dass eine dritte Topf-Ebene später als Spalten + Buchungstyp ergänzbar ist, ohne bestehende Zeilen umzudeuten (Spec §1 „mitzudenken“).
- Kein Stichtags-Scheduler („zweiter Freitag im Januar“) — die Kaskade wird per Button ausgelöst; der Stichtag ist Doku/Copy, kein Cron.
- Frage S8 (Verkäufe nur in Ausschüttungshöhe) ist steuerlich offen; die Demo bucht das Zwei-Depot-Modell wie in der Spec beschrieben und übernimmt das Brutto-Buchen/Netto-Überweisen nur auf Buchungsebene (Journal), nicht als echte Order-Optimierung.

---

## Datei-Struktur (Zielbild)

```
stiftung-web/
  prisma/
    schema.prisma                    UMBAU: Traeger, Einrichtung(anteile), Spende(Widmung),
                                     WidmungsText, Kontenstand, Buchung, Jahresabschluss
    seed.ts                          UMBAU: Träger + Anteile + Kontenstände + WidmungsText v1
  lib/
    verrechnung/                     NEU — reine Rechenkerne, DB-frei, BigInt
      konstanten.ts                  Sätze (1 %, 1,2 %, 0,5 %, 25 €), Feinheit, Skala
      geld.ts                        Cent-Typ, divRound (kaufmännisch), verteileProportional
      anteile.ts                     Topfwert, Anteilskauf/-verkauf, Bootstrap-Kurs
      rang.ts                        v pro Kind, P5/P95-Interpolation, p, Randfälle
      kaskade.ts                     Schritte 1–6 als pure Funktion Snapshot → Ergebnis
      erstbefuellung.ts              min(Basis, Spende, 0,5 % Soli)
      sweep.ts                       Sweep-Formel (investierbar/Ziel/Schwelle)
      traeger.ts                     Auszahlungspfad-Weiche (Pfad 1/2) aus Rechtsträger-Status
      serialisierung.ts              bigint→number an der API-Grenze (Safe-Integer-geprüft)
      __tests__/                     Unit-Tests inkl. goldener Spec-§9-Test
    server/
      prismaClient.ts                unverändert
      kontenService.ts               NEU: Kontenstand-Singleton, Poolwert, Topfwerte, offene Posten
      spendenService.ts              NEU: Spendeneingang A/B, Soli-Spende, Sweep, Erstbefüllung,
                                     Dedup + Persistierung neuer Einrichtungen
      einrichtungenService.ts        UMBAU: Liste/Detail/Statistik/Transparenz auf Cent+Topfwert,
                                     Schließung; spenden() zieht in spendenService um
      kaskadeService.ts              NEU: Kaskade laden→rechnen→persistieren (ersetzt
                                     simulationService + solidaritaetsfondsService.verteilen)
      marktService.ts                NEU: Marktjahr ±Kurs auf beide Depots (ersetzt 6 %-Buchung)
      auszahlungsService.ts          NEU: monatlicher Sammellauf für Direktausschüttungen
      __tests__/testDb.ts            NEU: zentraler Reset-Helper (alle Tabellen, FK-Reihenfolge)
    calc/
      spendenrechner.ts              bleibt (Projektionsebene); Aufrufer mappen Cent→Euro
      solidaritaet.ts                LÖSCHEN (Task 20) — Logik ist spec-widrig
      format.ts                      ERWEITERN: formatEuroFromCent
    data/levels.ts                   bleibt (Produktebene, nimmt Euro-number; Aufrufer /100)
  app/
    api/
      einrichtungen/route.ts                 GET Liste (Cent) + NEU POST (Anlage bei Erstspende)
      einrichtungen/[slug]/route.ts          GET Detail (Cent, Träger, Topfwert)
      einrichtungen/[slug]/spenden/route.ts  UMBAU: betragCent, verwendungsart, Widmung
      einrichtungen/[slug]/schliessen/route.ts  NEU POST
      solidaritaetsfonds/route.ts            GET Fondswert (Depot+VK) + Kontenstände
      solidaritaetsfonds/spenden/route.ts    UMBAU: betragCent
      solidaritaetsfonds/verteilen/route.ts  LÖSCHEN (Verteilung nur noch via Kaskade)
      simulation/jahr/route.ts               LÖSCHEN
      simulation/marktjahr/route.ts          NEU POST (+7 % Kurs, beide Depots)
      simulation/jahresabschluss/route.ts    NEU POST (Kaskade)
      auszahlungen/lauf/route.ts             NEU POST (monatlicher Sammellauf)
      erstbefuellung/route.ts                NEU GET (Zusage live aus Soli-Stand)
      management/cap/route.ts                NEU PUT (Cap setzen)
      statistik/route.ts                     UMBAU (Poolwert, Cent)
      spenden/letzte/route.ts                UMBAU: liest Buchungen (Ticker)
  components/                        UMBAU einzelner Komponenten, siehe UI-Tasks
```

## Interface-Vertrag zwischen den Schichten (verbindlich für alle Tasks)

- `lib/verrechnung/*` exportiert nur pure Funktionen über `bigint`/Plain-Objects. Kein Prisma-Import.
- Services geben an Routen ausschließlich **serialisierte** Objekte (`bigint` bereits in `number`-Cent konvertiert via `serialisiere()`); Feldnamen enden auf `Cent` (z. B. `topfwertCent: number`).
- UI-Komponenten erhalten Cent als `number` und formatieren ausschließlich über `formatEuroFromCent()`.
- Prisma-`BigInt`-Spalten ↔ JS `bigint` (Prisma-Default). Kein `parseInt`/`Number()` auf Geldwerten innerhalb der Services.

---

## Task 1: Geld-Fundament — `lib/verrechnung/geld.ts` + `konstanten.ts`

**Files:**
- Create: `stiftung-web/lib/verrechnung/konstanten.ts`
- Create: `stiftung-web/lib/verrechnung/geld.ts`
- Test: `stiftung-web/lib/verrechnung/__tests__/geld.test.ts`

**Interfaces:**
- Consumes: —
- Produces (spätere Tasks verlassen sich exakt hierauf):
  - `type Cent = bigint`
  - `divRound(zaehler: bigint, nenner: bigint): bigint` — kaufmännisch (half away from zero), `nenner > 0` sonst `throw new RangeError`
  - `anteilVon(basis: Cent, satz: Satz): Cent` mit `interface Satz { zaehler: bigint; nenner: bigint }`
  - `verteileProportional(summe: Cent, gewichte: readonly bigint[], restIndex: number): Cent[]`
  - Konstanten: `AUSSCHUETTUNGS_SATZ`, `SWEEP_ZIEL`, `SWEEP_SCHWELLE`, `ERSTBEFUELLUNG_SOLI_SATZ`, `MARKT_BRUTTO_RENDITE_SATZ` (je `Satz`), `ERSTBEFUELLUNG_BASIS_CENT = 2500n`, `ANTEILS_EINHEITEN_PRO_CENT = 1_000_000n`, `P_SCALE = 1_000_000_000n`, `MARKT_BRUTTO_RENDITE` (number, aus dem Satz abgeleitet — eine Quelle, nur für Copy)

- [ ] **Step 1: Failing Tests schreiben**

```ts
// stiftung-web/lib/verrechnung/__tests__/geld.test.ts
import { describe, it, expect } from 'vitest';
import { divRound, anteilVon, verteileProportional } from '../geld';
import { AUSSCHUETTUNGS_SATZ, ERSTBEFUELLUNG_BASIS_CENT } from '../konstanten';

describe('divRound — kaufmännische Rundung (half away from zero)', () => {
  it('rundet glatte Division exakt', () => {
    expect(divRound(100n, 4n)).toBe(25n);
  });
  it('rundet ,5 weg von null (33,6 → 34; 0,5 → 1)', () => {
    expect(divRound(336n, 10n)).toBe(34n); // Spec-§9-Wert: 0,24 % × 140 € = 33,6 Cent
    expect(divRound(1n, 2n)).toBe(1n);
    expect(divRound(3n, 2n)).toBe(2n);
  });
  it('rundet unterhalb ,5 ab', () => {
    expect(divRound(14n, 10n)).toBe(1n);
  });
  it('behandelt negative Zähler symmetrisch (half AWAY from zero)', () => {
    expect(divRound(-1n, 2n)).toBe(-1n);
    expect(divRound(-14n, 10n)).toBe(-1n);
    expect(divRound(-336n, 10n)).toBe(-34n);
  });
  it('wirft bei nenner <= 0', () => {
    expect(() => divRound(1n, 0n)).toThrow(RangeError);
    expect(() => divRound(1n, -5n)).toThrow(RangeError);
  });
});

describe('anteilVon', () => {
  it('1 % von 41.500 Cent sind 415 Cent', () => {
    expect(anteilVon(41500n, AUSSCHUETTUNGS_SATZ)).toBe(415n);
  });
  it('1 % von 30.184 Cent sind 302 Cent (kaufmännisch: 301,84)', () => {
    expect(anteilVon(30184n, AUSSCHUETTUNGS_SATZ)).toBe(302n);
  });
});

describe('verteileProportional — Summe exakt, Rest an restIndex (Spec §2 Rundung)', () => {
  it('verteilt proportional und kaufmännisch gerundet', () => {
    // Spec-§9 Schritt 6: S = 299 Cent, Gewichte w_C = 1e9, w_A = 758166667, w_B = 0
    const anteile = verteileProportional(299n, [1_000_000_000n, 758_166_667n, 0n], 0);
    expect(anteile).toEqual([170n, 129n, 0n]);
    expect(anteile[0] + anteile[1] + anteile[2]).toBe(299n);
  });
  it('gibt die Restdifferenz an restIndex, Summe bleibt exakt', () => {
    // 100 Cent auf drei gleiche Gewichte: je 33,33 → gerundet 33; Rest 1 an Index 1
    expect(verteileProportional(100n, [1n, 1n, 1n], 1)).toEqual([33n, 34n, 33n]);
  });
  it('zieht Über-Rundung beim restIndex wieder ab (negativer Rest)', () => {
    // 1 Cent auf zwei gleiche Gewichte: je round(0,5) = 1 → Summe 2, Rest −1 an Index 0
    expect(verteileProportional(1n, [1n, 1n], 0)).toEqual([0n, 1n]);
  });
  it('alle Gewichte 0 → alles an restIndex', () => {
    expect(verteileProportional(50n, [0n, 0n], 1)).toEqual([0n, 50n]);
  });
  it('leere Gewichte → leeres Ergebnis, wirft nicht', () => {
    expect(verteileProportional(0n, [], 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/geld.test.ts`
Expected: FAIL — „Cannot find module '../geld'“

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/verrechnung/konstanten.ts
// Buchungs-Konstanten der Spec docs/verrechnungsmodell.md.
// Sätze als exakte Brüche — niemals als Fließkommazahl auf Geld anwenden.
import type { Satz } from './geld';

/** 1 % — Direktspende (Kaskade Schritt 3) und Umverteilungsquote (Schritt 6). Einziger Satz, der zugleich Buchungsregel ist. */
export const AUSSCHUETTUNGS_SATZ: Satz = { zaehler: 1n, nenner: 100n };
/** Sweep-Ziel: 1,0 % des Poolwerts (Spec §3.2). */
export const SWEEP_ZIEL: Satz = { zaehler: 1n, nenner: 100n };
/** Sweep-Schwelle: 1,2 % des Poolwerts (Spec §3.2). */
export const SWEEP_SCHWELLE: Satz = { zaehler: 12n, nenner: 1000n };
/** Erstbefüllungs-Grenze: 0,5 % des Soli-Fonds (Spec §3.0). */
export const ERSTBEFUELLUNG_SOLI_SATZ: Satz = { zaehler: 5n, nenner: 1000n };
/** Basisbetrag der Erstbefüllung: 25 € (Spec §3.0, Vorschlag — dort als offen markiert). */
export const ERSTBEFUELLUNG_BASIS_CENT = 2500n;
/**
 * Anteils-Feinheit 10⁻⁸ pro Anteil (Spec §2, Vorschlag übernommen) bei
 * Bootstrap-Kurs „1 Anteil == 1 €": 1 Cent == 10⁶ Anteilseinheiten.
 */
export const ANTEILS_EINHEITEN_PRO_CENT = 1_000_000n;
/** Festkomma-Skala für die Rangposition p ∈ [0, 1] (Spec §5): p als Integer in [0, P_SCALE]. */
export const P_SCALE = 1_000_000_000n;
/**
 * 7 % Brutto-Rendite — NUR Marktsimulation/Projektion (kanonische
 * Projektionsannahme), niemals Kaskaden-Buchungsregel. Als Satz, damit die
 * Markt-Simulation bruchgenau rechnet; die number-Ableitung ist für Copy.
 */
export const MARKT_BRUTTO_RENDITE_SATZ: Satz = { zaehler: 7n, nenner: 100n };
export const MARKT_BRUTTO_RENDITE =
  Number(MARKT_BRUTTO_RENDITE_SATZ.zaehler) / Number(MARKT_BRUTTO_RENDITE_SATZ.nenner);
```

```ts
// stiftung-web/lib/verrechnung/geld.ts
// Geld ist bigint in Cent. Kein Fließkomma (Spec §2 „Datentypen").

export type Cent = bigint;

/** Exakter Bruch für Prozentsätze — verhindert Fließkomma auf Geldwerten. */
export interface Satz {
  zaehler: bigint;
  nenner: bigint;
}

/**
 * Kaufmännische Rundung (half away from zero) von zaehler/nenner.
 * Deutsche kaufmännische Rundung == round half up für positive Werte,
 * symmetrisch für negative (Spec §2 „Rundung").
 */
export function divRound(zaehler: bigint, nenner: bigint): bigint {
  if (nenner <= 0n) {
    throw new RangeError(`divRound: nenner muss > 0 sein, war ${nenner}`);
  }
  const doppelt = 2n * zaehler;
  if (zaehler >= 0n) {
    return (doppelt + nenner) / (2n * nenner);
  }
  return -((-doppelt + nenner) / (2n * nenner));
}

/** satz × basis, kaufmännisch auf Cent gerundet. */
export function anteilVon(basis: Cent, satz: Satz): Cent {
  return divRound(basis * satz.zaehler, satz.nenner);
}

/**
 * Proportionale Verteilung von `summe` nach `gewichte` (Spec §2 „Rundung"):
 * jeden Einzelbetrag kaufmännisch runden, die verbleibende Differenz zur
 * Zielsumme bekommt `restIndex` (Aufrufer: Einrichtung mit dem niedrigsten
 * Pro-Kind-Volumen, bei Gleichstand niedrigere Einrichtungs-ID).
 * Summe des Ergebnisses == summe, exakt.
 */
export function verteileProportional(
  summe: Cent,
  gewichte: readonly bigint[],
  restIndex: number
): Cent[] {
  if (gewichte.length === 0) return [];
  const gewichtSumme = gewichte.reduce((a, b) => a + b, 0n);
  const anteile = gewichte.map((w) =>
    gewichtSumme === 0n ? 0n : divRound(summe * w, gewichtSumme)
  );
  const verteilt = anteile.reduce((a, b) => a + b, 0n);
  anteile[restIndex] += summe - verteilt;
  return anteile;
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/geld.test.ts`
Expected: PASS (alle)

- [ ] **Step 5: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0, alle bestehenden Tests weiter grün.

```bash
git add stiftung-web/lib/verrechnung
git commit -m "feat(verrechnung): Geld-Fundament — BigInt-Cent, kaufmännische Rundung, proportionale Verteilung"
```

---

## Task 2: Anteils-Arithmetik — `lib/verrechnung/anteile.ts`

**Files:**
- Create: `stiftung-web/lib/verrechnung/anteile.ts`
- Test: `stiftung-web/lib/verrechnung/__tests__/anteile.test.ts`

**Interfaces:**
- Consumes: `divRound`, `Cent` aus `./geld`; `ANTEILS_EINHEITEN_PRO_CENT` aus `./konstanten`
- Produces:
  - `topfwertCent(anteile: bigint, poolwertCent: Cent, anteileGesamt: bigint): Cent`
  - `kaufeAnteile(betragCent: Cent, poolwertCentVorZufluss: Cent, anteileGesamtVorher: bigint): bigint`
  - `verkaufsAnteileFuer(betragCent: Cent, poolwertCent: Cent, anteileGesamt: bigint): bigint`
  - `renormAnteile(topfCent: Cent): bigint` — Kurs-Reset „1 Cent == ANTEILS_EINHEITEN_PRO_CENT" (nur Kaskaden-Persistenz)

**Semantik (verbindlich):**
- Kauf bewertet zum Poolwert **vor** dem Zufluss (der Zufluss selbst erhöht den Poolwert; würde man danach bewerten, bekäme die Spende zu wenige Anteile und schenkte die Differenz den Bestandstöpfen).
- Bootstrap: Ist der Pool leer (`anteileGesamt == 0n` oder `poolwertCent <= 0n`), gilt der Bootstrap-Kurs 1 Cent == `ANTEILS_EINHEITEN_PRO_CENT`.
- Verkauf in Höhe eines Cent-Betrags löst `divRound(betrag × anteileGesamt, poolwert)` Anteile auf — Preis für die verbleibenden Töpfe bleibt (bis auf die dokumentierte 10⁻⁸-Rundung) konstant.

- [ ] **Step 1: Failing Tests schreiben**

```ts
// stiftung-web/lib/verrechnung/__tests__/anteile.test.ts
import { describe, it, expect } from 'vitest';
import { topfwertCent, kaufeAnteile, verkaufsAnteileFuer, renormAnteile } from '../anteile';
import { ANTEILS_EINHEITEN_PRO_CENT } from '../konstanten';

describe('kaufeAnteile', () => {
  it('Bootstrap: leerer Pool kauft zum Kurs 1 Cent == 1e6 Einheiten', () => {
    expect(kaufeAnteile(4000n, 0n, 0n)).toBe(4000n * ANTEILS_EINHEITEN_PRO_CENT);
  });
  it('bewertet zum Poolwert VOR dem Zufluss', () => {
    // Pool: 10.000 Cent, 10.000 × 1e6 Anteile (Kurs 1:1e6). Spende 500 Cent
    // → exakt 500 × 1e6 Anteile, unabhängig davon, dass der Pool danach 10.500 hält.
    expect(kaufeAnteile(500n, 10_000n, 10_000n * ANTEILS_EINHEITEN_PRO_CENT)).toBe(
      500n * ANTEILS_EINHEITEN_PRO_CENT
    );
  });
  it('nach Kursanstieg kauft derselbe Betrag weniger Anteile', () => {
    // Pool verdoppelt sich auf 20.000 Cent bei unveränderten Anteilen
    expect(kaufeAnteile(500n, 20_000n, 10_000n * ANTEILS_EINHEITEN_PRO_CENT)).toBe(
      250n * ANTEILS_EINHEITEN_PRO_CENT
    );
  });
});

describe('topfwertCent', () => {
  it('leerer Pool → 0', () => {
    expect(topfwertCent(0n, 0n, 0n)).toBe(0n);
  });
  it('Anteil × Poolwert / Gesamtanteile, kaufmännisch gerundet', () => {
    const gesamt = 3n * ANTEILS_EINHEITEN_PRO_CENT;
    expect(topfwertCent(ANTEILS_EINHEITEN_PRO_CENT, 100n, gesamt)).toBe(33n);
    expect(topfwertCent(2n * ANTEILS_EINHEITEN_PRO_CENT, 100n, gesamt)).toBe(67n);
  });
  it('Kursbewegung ändert den Wert ohne Anteils-Schreibvorgang (Spec §2)', () => {
    const anteile = 500n * ANTEILS_EINHEITEN_PRO_CENT;
    const gesamt = 1000n * ANTEILS_EINHEITEN_PRO_CENT;
    expect(topfwertCent(anteile, 10_000n, gesamt)).toBe(5_000n);
    expect(topfwertCent(anteile, 10_700n, gesamt)).toBe(5_350n); // +7 % Kurs
  });
});

describe('verkaufsAnteileFuer', () => {
  it('löst für einen Cent-Betrag die preisneutrale Anteilsmenge auf', () => {
    const gesamt = 10_000n * ANTEILS_EINHEITEN_PRO_CENT;
    expect(verkaufsAnteileFuer(500n, 10_000n, gesamt)).toBe(500n * ANTEILS_EINHEITEN_PRO_CENT);
  });
  it('Kauf und Verkauf zum selben Kurs sind invers', () => {
    const gesamt = 41_500n * ANTEILS_EINHEITEN_PRO_CENT;
    const gekauft = kaufeAnteile(4_000n, 41_500n, gesamt);
    expect(verkaufsAnteileFuer(4_000n, 41_500n, gesamt)).toBe(gekauft);
  });
});

describe('renormAnteile', () => {
  it('setzt den Kurs auf 1 Cent == 1e6 Einheiten', () => {
    expect(renormAnteile(13_955n)).toBe(13_955n * ANTEILS_EINHEITEN_PRO_CENT);
    expect(renormAnteile(0n)).toBe(0n);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/anteile.test.ts`
Expected: FAIL — „Cannot find module '../anteile'“

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/verrechnung/anteile.ts
// Töpfe sind Pool-Anteile, keine Euro-Beträge (Spec §2):
//   Topf_€ = Anteil × Poolwert / Gesamtanteile
// Kursbewegung == null Schreibvorgänge; der Euro-Wert entsteht beim Lesen.
import { divRound, type Cent } from './geld';
import { ANTEILS_EINHEITEN_PRO_CENT } from './konstanten';

/** Euro-Wert eines Topfes in Cent, kaufmännisch gerundet (reine Anzeige-/Rechen-Sicht). */
export function topfwertCent(anteile: bigint, poolwertCent: Cent, anteileGesamt: bigint): Cent {
  if (anteileGesamt === 0n) return 0n;
  return divRound(anteile * poolwertCent, anteileGesamt);
}

/**
 * Anteile, die `betragCent` kauft — bewertet zum Poolwert VOR dem Zufluss.
 * Leerer/wertloser Pool: Bootstrap-Kurs 1 Cent == ANTEILS_EINHEITEN_PRO_CENT.
 */
export function kaufeAnteile(
  betragCent: Cent,
  poolwertCentVorZufluss: Cent,
  anteileGesamtVorher: bigint
): bigint {
  if (anteileGesamtVorher === 0n || poolwertCentVorZufluss <= 0n) {
    return betragCent * ANTEILS_EINHEITEN_PRO_CENT;
  }
  return divRound(betragCent * anteileGesamtVorher, poolwertCentVorZufluss);
}

/** Anteile, die für eine Entnahme von `betragCent` aufgelöst werden (preisneutral). */
export function verkaufsAnteileFuer(
  betragCent: Cent,
  poolwertCent: Cent,
  anteileGesamt: bigint
): bigint {
  if (anteileGesamt === 0n || poolwertCent <= 0n) return 0n;
  return divRound(betragCent * anteileGesamt, poolwertCent);
}

/**
 * Renormierung nach der Jahres-Kaskade: Die Kaskade rechnet Spec-treu in Cent
 * (Snapshot-Basis) und schreibt die End-Töpfe als frische Anteile zum
 * Bootstrap-Kurs zurück. Das hält die Invariante Σ Topf == Poolwert nach der
 * Kaskade EXAKT auf den Cent, statt Rundungsdrift über sequenzielle
 * Einzelverkäufe zu sammeln. Zwischen den Kaskaden gilt die reine Anteilswelt.
 */
export function renormAnteile(topfCent: Cent): bigint {
  return topfCent * ANTEILS_EINHEITEN_PRO_CENT;
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/anteile.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0.

```bash
git add stiftung-web/lib/verrechnung
git commit -m "feat(verrechnung): Anteils-Arithmetik — Topfwert, Kauf/Verkauf, Kaskaden-Renormierung"
```

## Task 3: Rangposition `p` — `lib/verrechnung/rang.ts`

**Files:**
- Create: `stiftung-web/lib/verrechnung/rang.ts`
- Test: `stiftung-web/lib/verrechnung/__tests__/rang.test.ts`

**Interfaces:**
- Consumes: `divRound`, `Cent` aus `./geld`; `P_SCALE` aus `./konstanten`
- Produces:
  - `interface RangKandidat { id: string; topfCent: Cent; kinder: number; verifiziert: boolean }`
  - `type KeineVerteilungGrund = 'zuWenigEinrichtungen' | 'alleGleich'`
  - `interface RangErgebnis { p: Map<string, bigint> | null; grund: KeineVerteilungGrund | null; aermsteVerifizierteId: string | null }`
  - `vProKindTausendstelCent(topfCent: Cent, kinder: number): bigint`
  - `perzentil(sortiertAufsteigend: readonly bigint[], qZaehler: bigint, qNenner: bigint): bigint`
  - `berechneRang(kandidaten: readonly RangKandidat[]): RangErgebnis`

**Spec-Bezug (§5, §6):** `p` ist wertbasiert zwischen P5 und P95 der Pro-Kind-Volumina, Skala NUR aus verifizierten Einrichtungen (Fallback: alle, wenn < 2 verifiziert), `clamp` auf `[0, P_SCALE]` ist die Winsorisierung. `v` wird in **Tausendstel-Cent pro Kind** geführt (`topfCent × 1000 / kinder`, kaufmännisch gerundet) — genau genug für jede reale Verteilung, deterministisch, BigInt.

- [ ] **Step 1: Failing Tests schreiben**

```ts
// stiftung-web/lib/verrechnung/__tests__/rang.test.ts
import { describe, it, expect } from 'vitest';
import { vProKindTausendstelCent, perzentil, berechneRang } from '../rang';
import { P_SCALE } from '../konstanten';

describe('vProKindTausendstelCent', () => {
  it('140,00 € auf 5 Kinder sind 28,00 € pro Kind (2.800.000 Tausendstel-Cent)', () => {
    expect(vProKindTausendstelCent(14_000n, 5)).toBe(2_800_000n);
  });
  it('wirft bei kinder <= 0', () => {
    expect(() => vProKindTausendstelCent(100n, 0)).toThrow(RangeError);
  });
});

describe('perzentil — lineare Interpolation (Spec §5)', () => {
  // Spec-§9-Werte: v sortiert [25,00 · 28,00 · 37,50] €/Kind
  const sortiert = [2_500_000n, 2_800_000n, 3_750_000n];
  it('P5 von [25,00 · 28,00 · 37,50] ist 25,30', () => {
    expect(perzentil(sortiert, 5n, 100n)).toBe(2_530_000n);
  });
  it('P95 von [25,00 · 28,00 · 37,50] ist 36,55', () => {
    expect(perzentil(sortiert, 95n, 100n)).toBe(3_655_000n);
  });
  it('einelementige Liste: jedes Perzentil ist der Wert selbst', () => {
    expect(perzentil([42n], 5n, 100n)).toBe(42n);
    expect(perzentil([42n], 95n, 100n)).toBe(42n);
  });
});

describe('berechneRang', () => {
  const k = (id: string, topfCent: bigint, kinder: number, verifiziert = true) => ({
    id, topfCent, kinder, verifiziert,
  });

  it('n < 2 → keine Verteilung (Spec §6)', () => {
    const r = berechneRang([k('a', 10_000n, 5)]);
    expect(r.p).toBeNull();
    expect(r.grund).toBe('zuWenigEinrichtungen');
  });

  it('alle v gleich → keine Verteilung, Grund alleGleich (Erfolgsfall, Spec §6)', () => {
    const r = berechneRang([k('a', 10_000n, 5), k('b', 20_000n, 10)]); // beide 20 €/Kind
    expect(r.p).toBeNull();
    expect(r.grund).toBe('alleGleich');
  });

  it('reproduziert die Spec-§9-Sätze: p_C = 0, p_A = 0,24, p_B = 1', () => {
    // Snapshot: A 140 € / 5 Kinder, B 150 € / 4, C 125 € / 5
    const r = berechneRang([k('A', 14_000n, 5), k('B', 15_000n, 4), k('C', 12_500n, 5)]);
    expect(r.grund).toBeNull();
    expect(r.p!.get('C')).toBe(0n);
    expect(r.p!.get('A')).toBe(240_000_000n); // 0,24 × P_SCALE
    expect(r.p!.get('B')).toBe(P_SCALE);
    expect(r.aermsteVerifizierteId).toBe('C');
  });

  it('Skala NUR aus verifizierten; unverifizierte werden an ihr gemessen und geklemmt', () => {
    // Verifizierte spannen 10–20 €/Kind auf; der unverifizierte Ausreißer mit
    // 100 €/Kind verschiebt die Skala NICHT und landet geklemmt auf p = 1.
    const r = berechneRang([
      k('v1', 10_000n, 10),           // 10 €/Kind
      k('v2', 20_000n, 10),           // 20 €/Kind
      k('u1', 100_000n, 10, false),   // 100 €/Kind, unverifiziert
    ]);
    expect(r.p!.get('v1')).toBe(0n);
    expect(r.p!.get('v2')).toBe(P_SCALE);
    expect(r.p!.get('u1')).toBe(P_SCALE); // geklemmt, nicht skalenbildend
  });

  it('Fallback: weniger als 2 verifizierte → Skala aus allen (Spec §5, MVP-Fall)', () => {
    const r = berechneRang([
      k('u1', 10_000n, 10, false),
      k('u2', 30_000n, 10, false),
      k('v1', 20_000n, 10, true),
    ]);
    // Skala aus allen: 10–30 €/Kind (P5/P95 interpoliert), v1 liegt in der Mitte
    expect(r.p!.get('v1')! > 0n && r.p!.get('v1')! < P_SCALE).toBe(true);
  });

  it('kollabierte winsorisierte Spanne → Fallback Min/Max (Spec §5)', () => {
    // 21 Einrichtungen: 20 identische, 1 Ausreißer oben. P5 == P95 == Mehrheitswert
    // → ungewinsorisiert Min/Max, Ausreißer p = 1, Mehrheit p = 0.
    const viele = Array.from({ length: 20 }, (_, i) => k(`m${String(i).padStart(2, '0')}`, 10_000n, 10));
    const r = berechneRang([...viele, k('reich', 100_000n, 10)]);
    expect(r.grund).toBeNull();
    expect(r.p!.get('m00')).toBe(0n);
    expect(r.p!.get('reich')).toBe(P_SCALE);
  });

  it('ärmste bei Gleichstand: niedrigere ID gewinnt (Spec §2 Rundung)', () => {
    const r = berechneRang([k('b', 10_000n, 10), k('a', 10_000n, 10), k('c', 30_000n, 10)]);
    expect(r.aermsteVerifizierteId).toBe('a');
  });

  it('aermsteVerifizierteId ignoriert unverifizierte (Restcent darf nur an Empfänger gehen)', () => {
    const r = berechneRang([
      k('u-arm', 1_000n, 10, false), // ärmster insgesamt, aber kein Umverteilungs-Empfänger
      k('v-arm', 5_000n, 10, true),
      k('v-reich', 50_000n, 10, true),
    ]);
    expect(r.aermsteVerifizierteId).toBe('v-arm');
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/rang.test.ts`
Expected: FAIL — „Cannot find module '../rang'“

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/verrechnung/rang.ts
// Rangposition p (Spec §5): wertbasierte Position zwischen P5 und P95 der
// Pro-Kind-Volumina. Das clamp IST die Winsorisierung. Skala nur aus
// KYC-verifizierten Einrichtungen; unverifizierte werden an ihr gemessen.
import { divRound, type Cent } from './geld';
import { P_SCALE } from './konstanten';

export interface RangKandidat {
  id: string;
  topfCent: Cent;
  kinder: number;
  verifiziert: boolean;
}

export type KeineVerteilungGrund = 'zuWenigEinrichtungen' | 'alleGleich';

export interface RangErgebnis {
  /** id → p als Integer in [0, P_SCALE]; null, wenn keine Verteilung stattfindet. */
  p: Map<string, bigint> | null;
  grund: KeineVerteilungGrund | null;
  /** Verifizierte Einrichtung mit dem niedrigsten v (Tie: niedrigere ID) — Restcent-Empfängerin. */
  aermsteVerifizierteId: string | null;
}

/** Pro-Kind-Volumen in Tausendstel-Cent — fein genug, deterministisch, BigInt. */
export function vProKindTausendstelCent(topfCent: Cent, kinder: number): bigint {
  if (kinder <= 0) {
    throw new RangeError(`vProKindTausendstelCent: kinder muss > 0 sein, war ${kinder}`);
  }
  return divRound(topfCent * 1000n, BigInt(kinder));
}

/**
 * Perzentil mit linearer Interpolation (Spec §5): Position q × (n−1) auf der
 * aufsteigend sortierten Liste, Bruchteil linear interpoliert, exakt in BigInt.
 */
export function perzentil(
  sortiertAufsteigend: readonly bigint[],
  qZaehler: bigint,
  qNenner: bigint
): bigint {
  const n = sortiertAufsteigend.length;
  if (n === 0) throw new RangeError('perzentil: leere Liste');
  const posZaehler = qZaehler * BigInt(n - 1);
  const k = Number(posZaehler / qNenner);
  const rest = posZaehler % qNenner;
  const unten = sortiertAufsteigend[k];
  if (rest === 0n) return unten;
  const oben = sortiertAufsteigend[k + 1];
  return unten + divRound(rest * (oben - unten), qNenner);
}

function clampP(wert: bigint): bigint {
  if (wert < 0n) return 0n;
  if (wert > P_SCALE) return P_SCALE;
  return wert;
}

export function berechneRang(kandidaten: readonly RangKandidat[]): RangErgebnis {
  if (kandidaten.length < 2) {
    return { p: null, grund: 'zuWenigEinrichtungen', aermsteVerifizierteId: null };
  }

  const v = new Map(kandidaten.map((k) => [k.id, vProKindTausendstelCent(k.topfCent, k.kinder)]));

  // Skala nur aus verifizierten; Fallback auf alle bei < 2 verifizierten (Spec §5).
  const verifizierte = kandidaten.filter((k) => k.verifiziert);
  const skalenBasis = verifizierte.length >= 2 ? verifizierte : kandidaten;
  const sortiert = skalenBasis.map((k) => v.get(k.id)!).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  let vLo = perzentil(sortiert, 5n, 100n);
  let vHi = perzentil(sortiert, 95n, 100n);
  if (vHi === vLo) {
    // Winsorisierung kollabiert → Fallback ungewinsorisiert (Spec §5).
    vLo = sortiert[0];
    vHi = sortiert[sortiert.length - 1];
  }
  if (vHi === vLo) {
    // Wirklich alle gleich: Erfolgsfall Verteilungsgleichheit, kein Fehlerfall (Spec §6).
    return { p: null, grund: 'alleGleich', aermsteVerifizierteId: null };
  }

  const spanne = vHi - vLo;
  const p = new Map<string, bigint>();
  for (const k of kandidaten) {
    p.set(k.id, clampP(divRound((v.get(k.id)! - vLo) * P_SCALE, spanne)));
  }

  let aermste: RangKandidat | null = null;
  for (const k of verifizierte) {
    if (
      aermste === null ||
      v.get(k.id)! < v.get(aermste.id)! ||
      (v.get(k.id)! === v.get(aermste.id)! && k.id < aermste.id)
    ) {
      aermste = k;
    }
  }

  return { p, grund: null, aermsteVerifizierteId: aermste?.id ?? null };
}
```

**Hinweis für den Executor:** `divRound` verlangt einen positiven Nenner, arbeitet hier aber mit potenziell negativem Zähler (`v − vLo` unter P5) — genau dafür ist die symmetrische Rundung aus Task 1 da; das anschließende `clampP` zieht Negative auf 0.

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/rang.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0.

```bash
git add stiftung-web/lib/verrechnung
git commit -m "feat(verrechnung): Rangposition p — P5/P95-Winsorisierung, Skala aus verifizierten Einrichtungen"
```

---

## Task 4: Kleine Prozess-Kerne — `sweep.ts`, `erstbefuellung.ts`, `traeger.ts`

**Files:**
- Create: `stiftung-web/lib/verrechnung/sweep.ts`
- Create: `stiftung-web/lib/verrechnung/erstbefuellung.ts`
- Create: `stiftung-web/lib/verrechnung/traeger.ts`
- Test: `stiftung-web/lib/verrechnung/__tests__/prozesse.test.ts`

**Interfaces:**
- Consumes: `anteilVon`, `Cent` aus `./geld`; Konstanten aus `./konstanten`
- Produces:
  - `sweepBetrag(z: { verrechnungskontoCent: Cent; offeneDirektausschuettungenCent: Cent; etfMarktwertCent: Cent }): Cent` — zu investierender Betrag, `0n` wenn Schwelle nicht erreicht
  - `erstbefuellungCent(spendeCent: Cent, soliFondsCent: Cent): Cent`
  - `type Rechtsform = 'verein' | 'ggmbh' | 'stiftung' | 'kirche' | 'kommune' | 'einzelunternehmen' | 'gewerblich' | 'unbekannt'`
  - `type Auszahlungspfad = 'mittelweitergabe' | 'foerderguthaben'`
  - `auszahlungspfad(t: { rechtsform: Rechtsform; gemeinnuetzig: boolean }): Auszahlungspfad`
  - `RECHTSFORM_LABELS: Record<Rechtsform, string>` (für UI)

- [ ] **Step 1: Failing Tests schreiben**

```ts
// stiftung-web/lib/verrechnung/__tests__/prozesse.test.ts
import { describe, it, expect } from 'vitest';
import { sweepBetrag } from '../sweep';
import { erstbefuellungCent } from '../erstbefuellung';
import { auszahlungspfad } from '../traeger';

describe('sweepBetrag (Spec §3.2)', () => {
  it('Spec-§9-Beispiel: 40 € Cash bei 415 € Pool → Kauf über 35,85 €', () => {
    // Poolwert = 375 € ETF + 40 € investierbar = 415 €; Schwelle 4,98 €; Ziel 4,15 €
    expect(
      sweepBetrag({ verrechnungskontoCent: 4_000n, offeneDirektausschuettungenCent: 0n, etfMarktwertCent: 37_500n })
    ).toBe(3_585n);
  });
  it('unter der Schwelle passiert nichts', () => {
    // investierbar 4,90 € bei Poolwert 414,90 € → Schwelle 4,9788 € nicht überschritten
    expect(
      sweepBetrag({ verrechnungskontoCent: 490n, offeneDirektausschuettungenCent: 0n, etfMarktwertCent: 41_000n })
    ).toBe(0n);
  });
  it('zieht offene Direktausschüttungen vom investierbaren Cash ab (Spec §3.1 — sonst wird fremdes Geld investiert)', () => {
    // Physisch 40 € auf dem Konto, davon 36 € durchlaufende Posten → investierbar 4 €
    // Poolwert = 375 + 4 = 379 €; Schwelle 4,548 € → kein Sweep
    expect(
      sweepBetrag({ verrechnungskontoCent: 4_000n, offeneDirektausschuettungenCent: 3_600n, etfMarktwertCent: 37_500n })
    ).toBe(0n);
  });
});

describe('erstbefuellungCent (Spec §3.0): min(Basis, Spende, 0,5 % Soli)', () => {
  it('Normalfall: Basisbetrag deckelt', () => {
    // Spende 100 €, Soli 10.000 € (0,5 % = 50 €) → 25 € Basis greift
    expect(erstbefuellungCent(10_000n, 1_000_000n)).toBe(2_500n);
  });
  it('Kleinspende: Verdopplung ohne Netto-Abfluss (wer 5 € spendet, bekommt 5 € dazu)', () => {
    expect(erstbefuellungCent(500n, 1_000_000n)).toBe(500n);
  });
  it('kleiner Soli-Fonds: 0,5 %-Grenze schützt (1.000 € Fonds → 5 €)', () => {
    expect(erstbefuellungCent(10_000n, 100_000n)).toBe(500n);
  });
  it('leerer Soli-Fonds → 0', () => {
    expect(erstbefuellungCent(10_000n, 0n)).toBe(0n);
  });
});

describe('auszahlungspfad (Spec §3.5)', () => {
  it('steuerbegünstigte Körperschaft → Pfad 1 Mittelweitergabe', () => {
    expect(auszahlungspfad({ rechtsform: 'ggmbh', gemeinnuetzig: true })).toBe('mittelweitergabe');
  });
  it('Kommune (jPöR) → Pfad 1, auch ohne Gemeinnützigkeitsstatus', () => {
    expect(auszahlungspfad({ rechtsform: 'kommune', gemeinnuetzig: false })).toBe('mittelweitergabe');
  });
  it('natürliche Person (Kindertagespflege) → Pfad 2 Förderguthaben', () => {
    expect(auszahlungspfad({ rechtsform: 'einzelunternehmen', gemeinnuetzig: false })).toBe('foerderguthaben');
  });
  it('gewerblicher Träger → Pfad 2, selbst wenn gemeinnuetzig fälschlich gesetzt ist', () => {
    // Eine natürliche Person / ein Gewerbebetrieb kann den Status strukturell
    // nicht halten (§ 51 Abs. 1 S. 2 AO) — die Weiche traut dem Flag nicht.
    expect(auszahlungspfad({ rechtsform: 'gewerblich', gemeinnuetzig: true })).toBe('foerderguthaben');
    expect(auszahlungspfad({ rechtsform: 'einzelunternehmen', gemeinnuetzig: true })).toBe('foerderguthaben');
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/prozesse.test.ts`
Expected: FAIL — Module nicht gefunden

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/verrechnung/sweep.ts
// Sweep ins Depot (Spec §3.2): Cash wird erst ab 1,2 % des Poolwerts
// investiert, und dann auf das 1-%-Ziel abgeschöpft (nicht um feste 0,2 %).
import { anteilVon, type Cent } from './geld';
import { SWEEP_SCHWELLE, SWEEP_ZIEL } from './konstanten';

export interface SweepZustand {
  verrechnungskontoCent: Cent;
  offeneDirektausschuettungenCent: Cent;
  etfMarktwertCent: Cent;
}

/** Zu investierender Betrag; 0n, wenn die Schwelle nicht überschritten ist. */
export function sweepBetrag(z: SweepZustand): Cent {
  // Offene Direktausschüttungen gehören bereits den Einrichtungen (§3.1) —
  // sie sind weder investierbar noch Teil des Poolwerts.
  const investierbar = z.verrechnungskontoCent - z.offeneDirektausschuettungenCent;
  const poolwert = z.etfMarktwertCent + investierbar;
  if (poolwert <= 0n) return 0n;
  if (investierbar <= anteilVon(poolwert, SWEEP_SCHWELLE)) return 0n;
  return investierbar - anteilVon(poolwert, SWEEP_ZIEL);
}
```

```ts
// stiftung-web/lib/verrechnung/erstbefuellung.ts
// Erstbefüllung neuer Einrichtungen (Spec §3.0):
//   Erstbefüllung = min(Basisbetrag, Spendenbetrag, 0,5 % × Soli-Fonds)
// Verbindlich ist der Stand ZUM ZEITPUNKT DER BUCHUNG, nicht der angezeigte.
import { anteilVon, type Cent } from './geld';
import { ERSTBEFUELLUNG_BASIS_CENT, ERSTBEFUELLUNG_SOLI_SATZ } from './konstanten';

export function erstbefuellungCent(spendeCent: Cent, soliFondsCent: Cent): Cent {
  if (soliFondsCent <= 0n || spendeCent <= 0n) return 0n;
  const soliGrenze = anteilVon(soliFondsCent, ERSTBEFUELLUNG_SOLI_SATZ);
  const kandidaten = [ERSTBEFUELLUNG_BASIS_CENT, spendeCent, soliGrenze];
  return kandidaten.reduce((a, b) => (a < b ? a : b));
}
```

```ts
// stiftung-web/lib/verrechnung/traeger.ts
// Abfluss-Weiche (Spec §3.5): Der Gemeinnützigkeitsstatus des RECHTSTRÄGERS
// entscheidet über den Auszahlungspfad — nicht der Einrichtungstyp.
export type Rechtsform =
  | 'verein'
  | 'ggmbh'
  | 'stiftung'
  | 'kirche'
  | 'kommune'
  | 'einzelunternehmen'
  | 'gewerblich'
  | 'unbekannt';

export type Auszahlungspfad = 'mittelweitergabe' | 'foerderguthaben';

/** Rechtsformen, die den Gemeinnützigkeitsstatus überhaupt halten können (Körperschaften). */
const KOERPERSCHAFTEN: ReadonlySet<Rechtsform> = new Set(['verein', 'ggmbh', 'stiftung', 'kirche']);

/**
 * Pfad 1 (Mittelweitergabe, § 58 Nr. 1 AO): steuerbegünstigte Körperschaft
 * oder juristische Person des öffentlichen Rechts. Alles andere: Pfad 2
 * (Förderguthaben, § 57 AO). Eine natürliche Person oder ein Gewerbebetrieb
 * kann den Status strukturell nicht erlangen — das Flag wird dort ignoriert.
 */
export function auszahlungspfad(t: { rechtsform: Rechtsform; gemeinnuetzig: boolean }): Auszahlungspfad {
  if (t.rechtsform === 'kommune') return 'mittelweitergabe';
  if (KOERPERSCHAFTEN.has(t.rechtsform) && t.gemeinnuetzig) return 'mittelweitergabe';
  return 'foerderguthaben';
}

export const RECHTSFORM_LABELS: Record<Rechtsform, string> = {
  verein: 'eingetragener Verein',
  ggmbh: 'gGmbH',
  stiftung: 'Stiftung',
  kirche: 'kirchliche Körperschaft',
  kommune: 'Kommune',
  einzelunternehmen: 'Kindertagespflege (Einzelunternehmen)',
  gewerblich: 'gewerblicher Träger',
  unbekannt: 'Träger noch nicht erfasst',
};
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/prozesse.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0.

```bash
git add stiftung-web/lib/verrechnung
git commit -m "feat(verrechnung): Sweep, Erstbefüllung und Auszahlungspfad-Weiche als reine Kerne"
```

---

## Task 5: Jahres-Kaskade — `lib/verrechnung/kaskade.ts` (pure, mit goldenem Spec-§9-Test)

**Files:**
- Create: `stiftung-web/lib/verrechnung/kaskade.ts`
- Test: `stiftung-web/lib/verrechnung/__tests__/kaskade.test.ts`

**Interfaces:**
- Consumes: `anteilVon`, `divRound`, `verteileProportional`, `Cent` aus `./geld`; `topfwertCent` aus `./anteile`; `berechneRang`, `KeineVerteilungGrund` aus `./rang`; `AUSSCHUETTUNGS_SATZ`, `P_SCALE` aus `./konstanten`
- Produces:

```ts
export interface KaskadeEinrichtung {
  id: string;
  anteile: bigint;
  kinder: number;
  verifiziert: boolean;
}

export interface KaskadeInput {
  einrichtungen: KaskadeEinrichtung[];
  etfMarktwertCent: Cent;
  verrechnungskontoCent: Cent;              // physischer Saldo
  offeneDirektausschuettungenCent: Cent;    // durchlaufende Posten (§3.1)
  soliFondsCent: Cent;                      // Soli-Depot + Soli-VK, konsolidiert
  managementKontoCent: Cent;
  managementCapCent: Cent;
}

export interface KaskadeErgebnis {
  snapshot: { poolwertCent: Cent; soliFondsCent: Cent; topfCent: Map<string, Cent> };
  auffuellenCent: Cent;                     // Schritt 2: > 0 ETF-Verkauf, < 0 Kauf
  direktspenden: { id: string; cent: Cent }[];       // Schritt 3 (nur verifizierte)
  abgaben: { id: string; cent: Cent; pPromille: number }[]; // Schritt 4 (alle mit p > 0-Abgabe > 0)
  managementBewegungCent: Cent;             // Schritt 5, signiert
  umverteilung: { id: string; cent: Cent }[];        // Schritt 6 (nur Empfänger mit Betrag > 0)
  keineVerteilungGrund: KeineVerteilungGrund | null; // betrifft Schritt 4 + 6
  endTopfCent: Map<string, Cent>;
  endEtfMarktwertCent: Cent;
  endVerrechnungskontoCent: Cent;           // == offeneDirektausschuettungenCent
  endSoliFondsCent: Cent;
  endManagementKontoCent: Cent;
}

export function berechneKaskade(input: KaskadeInput): KaskadeErgebnis
```

**Verbindliche Semantik (Spec §4, §6):**

1. **Schritt 1 — Snapshot:** `poolwert = etf + verrechnungskonto − offeneDirekt`. Cent-Töpfe aus Anteilen: erst jeden Topf mit `topfwertCent()` runden, dann die Rundungs-Differenz `poolwert − Σ topf` der Einrichtung mit den **meisten Anteilen** zuschlagen (kleinste relative Verzerrung; Tie: niedrigere ID) — ab hier gilt exakt `Σ topf == poolwert`.
2. **Schritt 2 — Auffüllen:** `bedarf = Σ_verifiziert anteilVon(topf_i, 1 %)` (Summe der *gerundeten* Einzel-Direktspenden, und nur der verifizierten — Spec §4 Schritt 3 „Ausnahme": sonst landet das Konto nicht auf 0). `auffuellen = bedarf − (verrechnungskonto − offeneDirekt)`, in beide Richtungen.
3. **Schritt 3 — Direktspende:** je verifizierte Einrichtung `anteilVon(topfSnapshot_i, 1 %)` auszahlen, Topf sinkt entsprechend. Verrechnungskonto (investierbarer Teil) steht danach per Konstruktion auf 0.
4. **Schritt 4 — Abgabe:** `p` aus dem **Snapshot** (Schritt 1), Bemessungsgrundlage **Snapshot-Topf** (nicht der um die Direktspende reduzierte — Spec nennt explizit 1,836 € statt 1,818 €): `abgabe_i = divRound(p_i × anteilVon(topfSnapshot_i, 1 %), P_SCALE)`. Zahlen ALLE Einrichtungen, auch unverifizierte (§3.4).
5. **Schritt 5 — Management:** `zufluss = anteilVon(soli, 1 %)`, `ziel = min(cap, konto + zufluss)`, `bewegung = ziel − konto` (Rückfluss ungedeckelt). Läuft auch, wenn Schritt 4/6 entfallen (§6).
6. **Schritt 6 — Umverteilung:** `p` **neu** berechnen (Töpfe nach Schritt 3+4). `S = anteilVon(soli nach Schritt 5, 1 %)`. Empfänger nur verifizierte; Gewichte `P_SCALE − p_i`; `verteileProportional(S, gewichte, restIndex = ärmste verifizierte)`. Ist die Gewichtssumme 0 (alle Empfänger auf p = 1) oder gibt es keine Verteilung: S bleibt im Soli-Fonds liegen (§6 — „kein Geld bleibt stecken, es wird nur später verteilt").
7. Geld-Erhaltung: `etf + vk + soli + mgmt (vorher) == endEtf + endVk + endSoli + endMgmt + Σ direktspenden`.

- [ ] **Step 1: Failing Tests schreiben**

```ts
// stiftung-web/lib/verrechnung/__tests__/kaskade.test.ts
import { describe, it, expect } from 'vitest';
import { berechneKaskade, type KaskadeInput } from '../kaskade';
import { ANTEILS_EINHEITEN_PRO_CENT } from '../konstanten';

/** Anteile zum Bootstrap-Kurs: `cent` € -Cent als Anteile. */
const A = (cent: bigint) => cent * ANTEILS_EINHEITEN_PRO_CENT;

function summe(eintraege: { cent: bigint }[]): bigint {
  return eintraege.reduce((s, e) => s + e.cent, 0n);
}

function geldErhaltung(input: KaskadeInput, e: ReturnType<typeof berechneKaskade>) {
  const vorher =
    input.etfMarktwertCent + input.verrechnungskontoCent + input.soliFondsCent + input.managementKontoCent;
  const nachher =
    e.endEtfMarktwertCent + e.endVerrechnungskontoCent + e.endSoliFondsCent + e.endManagementKontoCent;
  expect(nachher + summe(e.direktspenden)).toBe(vorher);
}

// ============================================================
// GOLDENER TEST — durchgerechnetes Spec-Beispiel (§9), in Cent.
// Ausgangslage NACH Spendeneingang + Sweep:
//   Töpfe A 140 € (5 Kinder), B 150 € (4), C 125 € (5)
//   ETF 410,85 € · Verrechnungskonto 4,15 € · Soli 300 €
//   Management 1.000 €, Cap 1.200 €
// Die Spec rechnet in Zehntel-Cent weiter (Abgabe 1,836 €); die Integer-
// Cent-Welt bucht kaufmännisch gerundet (Abgabe 34 + 150 = 184 Cent) und
// landet auf EXAKT den Endständen der Spec: A 139,55 · B 147,00 · C 125,45 ·
// Soli 295,83 · Management 1.003,02 · Verrechnungskonto 0.
// ============================================================
describe('berechneKaskade — goldenes Spec-§9-Beispiel', () => {
  const input: KaskadeInput = {
    einrichtungen: [
      { id: 'A', anteile: A(14_000n), kinder: 5, verifiziert: true },
      { id: 'B', anteile: A(15_000n), kinder: 4, verifiziert: true },
      { id: 'C', anteile: A(12_500n), kinder: 5, verifiziert: true },
    ],
    etfMarktwertCent: 41_085n,
    verrechnungskontoCent: 415n,
    offeneDirektausschuettungenCent: 0n,
    soliFondsCent: 30_000n,
    managementKontoCent: 100_000n,
    managementCapCent: 120_000n,
  };

  it('reproduziert alle Endstände der Spec exakt', () => {
    const e = berechneKaskade(input);

    expect(e.snapshot.poolwertCent).toBe(41_500n);
    expect(e.auffuellenCent).toBe(0n); // Konto steht bereits auf dem Bedarf (4,15 €)

    expect(e.direktspenden).toEqual([
      { id: 'A', cent: 140n },
      { id: 'B', cent: 150n },
      { id: 'C', cent: 125n },
    ]);

    // Abgabe: C 0 · A 0,24 % × 140 € = 33,6 → 34 Cent · B 1 % × 150 € = 150 Cent
    expect(e.abgaben.find((a) => a.id === 'A')!.cent).toBe(34n);
    expect(e.abgaben.find((a) => a.id === 'B')!.cent).toBe(150n);
    expect(e.abgaben.find((a) => a.id === 'C')).toBeUndefined();

    expect(e.managementBewegungCent).toBe(302n); // 1 % × 301,84 € kaufmännisch
    expect(e.endManagementKontoCent).toBe(100_302n);

    // Reihenfolge == Input-Reihenfolge der Einrichtungen (pure Funktion hat
    // keine Anzeige-Meinung); B fehlt, weil Empfänger mit 0 nicht gelistet werden.
    expect(e.umverteilung).toEqual([
      { id: 'A', cent: 129n },
      { id: 'C', cent: 170n },
    ]);

    expect(e.endTopfCent.get('A')).toBe(13_955n);
    expect(e.endTopfCent.get('B')).toBe(14_700n);
    expect(e.endTopfCent.get('C')).toBe(12_545n);
    expect(e.endSoliFondsCent).toBe(29_583n);
    expect(e.endVerrechnungskontoCent).toBe(0n);
    expect(e.keineVerteilungGrund).toBeNull();

    geldErhaltung(input, e);
  });

  it('das Verrechnungskonto startet leer ins neue Jahr; ETF trägt den Rest-Poolwert', () => {
    const e = berechneKaskade(input);
    const poolwertEnde = [...e.endTopfCent.values()].reduce((a, b) => a + b, 0n);
    expect(e.endEtfMarktwertCent).toBe(poolwertEnde); // investierbares Cash == 0
  });
});

describe('berechneKaskade — nicht abgeholte Töpfe (Spec §3.4)', () => {
  // 'u' ist unverifiziert: keine Direktspende (Bedarf gekürzt!), zahlt
  // Abgabe, empfängt keine Umverteilung.
  const input: KaskadeInput = {
    einrichtungen: [
      { id: 'arm', anteile: A(10_000n), kinder: 10, verifiziert: true },   // 10 €/Kind
      { id: 'reich', anteile: A(40_000n), kinder: 10, verifiziert: true }, // 40 €/Kind
      { id: 'u', anteile: A(50_000n), kinder: 10, verifiziert: false },    // 50 €/Kind — reichste, unverifiziert
    ],
    etfMarktwertCent: 100_000n,
    verrechnungskontoCent: 0n,
    offeneDirektausschuettungenCent: 0n,
    soliFondsCent: 50_000n,
    managementKontoCent: 0n,
    managementCapCent: 100_000n,
  };

  it('kürzt den Schritt-2-Bedarf um unverifizierte, zieht Abgabe aber ein und verteilt nicht an sie', () => {
    const e = berechneKaskade(input);

    // Direktspenden nur für verifizierte: 1 % × 100 € + 1 % × 400 € = 5 €
    expect(e.direktspenden).toEqual([
      { id: 'arm', cent: 100n },
      { id: 'reich', cent: 400n },
    ]);
    expect(e.auffuellenCent).toBe(500n); // ETF-Verkauf exakt in Bedarfshöhe

    // Abgabe: Skala aus verifizierten (10–40 €/Kind, P5 = 11,5, P95 = 38,5).
    // 'u' liegt drüber → p = 1 → zahlt volle 1 % × 500 € = 500 Cent.
    expect(e.abgaben.find((a) => a.id === 'u')!.cent).toBe(500n);

    // Umverteilung: 'u' ist kein Empfänger.
    expect(e.umverteilung.find((u) => u.id === 'u')).toBeUndefined();

    geldErhaltung(input, e);
  });
});

describe('berechneKaskade — Randfälle (Spec §6)', () => {
  it('n = 1: keine Abgabe, keine Umverteilung — Management läuft trotzdem', () => {
    const input: KaskadeInput = {
      einrichtungen: [{ id: 'solo', anteile: A(10_000n), kinder: 5, verifiziert: true }],
      etfMarktwertCent: 10_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 100_000n,
      managementKontoCent: 0n,
      managementCapCent: 50_000n,
    };
    const e = berechneKaskade(input);
    expect(e.keineVerteilungGrund).toBe('zuWenigEinrichtungen');
    expect(e.abgaben).toEqual([]);
    expect(e.umverteilung).toEqual([]);
    // Direktspende läuft (hängt nicht am Ranking): 1 % × 100 € = 1 €
    expect(e.direktspenden).toEqual([{ id: 'solo', cent: 100n }]);
    // Management läuft: 1 % × 1.000 € = 10 €
    expect(e.managementBewegungCent).toBe(1_000n);
    // Das 1 % Umverteilung verlässt den Soli-Fonds nicht.
    expect(e.endSoliFondsCent).toBe(99_000n);
    geldErhaltung(input, e);
  });

  it('alle v gleich: Erfolgsfall gleichverteilt, S bleibt liegen', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'a', anteile: A(10_000n), kinder: 5, verifiziert: true },
        { id: 'b', anteile: A(20_000n), kinder: 10, verifiziert: true },
      ],
      etfMarktwertCent: 30_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 10_000n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    expect(e.keineVerteilungGrund).toBe('alleGleich');
    expect(e.abgaben).toEqual([]);
    expect(e.umverteilung).toEqual([]);
    geldErhaltung(input, e);
  });

  it('Cap-Senkung: negativer Management-Abgleich fließt vor Schritt 6 in den Soli zurück', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'arm', anteile: A(10_000n), kinder: 10, verifiziert: true },
        { id: 'reich', anteile: A(40_000n), kinder: 10, verifiziert: true },
      ],
      etfMarktwertCent: 50_000n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 300n, // 1 % Soli = 3 Cent
      managementKontoCent: 25_000n,
      managementCapCent: 15_000n, // Cap unter Kontostand gesenkt
    };
    const e = berechneKaskade(input);
    // Ziel = min(15.000, 25.000 + 3) = 15.000 → Bewegung −10.000 (Spec §4 Schritt 5, Beispielzeile 3)
    expect(e.managementBewegungCent).toBe(-10_000n);
    expect(e.endManagementKontoCent).toBe(15_000n);
    // Rückfluss steht VOR Schritt 6 und geht sofort in die Umverteilung ein:
    // Abgabe: reich p=1 → 1 % × 400 € = 400 Cent → Soli 300 + 400 + 10.000 = 10.700.
    // S = 1 % × 10.700 = 107 Cent, alles an 'arm' (p=0, reich Gewicht 0).
    expect(e.umverteilung).toEqual([{ id: 'arm', cent: 107n }]);
    expect(e.endSoliFondsCent).toBe(10_593n);
    geldErhaltung(input, e);
  });

  it('Snapshot-Alignment: krumme Anteile summieren exakt auf den Poolwert', () => {
    // Drei gleiche Anteile auf 100 Cent: je 33 gerundet, Restcent an die
    // niedrigste ID (Anteils-Gleichstand) — ab dem Snapshot gilt Σ Topf == Poolwert.
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'a', anteile: 1n, kinder: 1, verifiziert: true },
        { id: 'b', anteile: 1n, kinder: 1, verifiziert: true },
        { id: 'c', anteile: 1n, kinder: 1, verifiziert: true },
      ],
      etfMarktwertCent: 100n,
      verrechnungskontoCent: 0n,
      offeneDirektausschuettungenCent: 0n,
      soliFondsCent: 0n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    const summe = [...e.snapshot.topfCent.values()].reduce((x, y) => x + y, 0n);
    expect(summe).toBe(100n);
    expect(e.snapshot.topfCent.get('a')).toBe(34n);
    geldErhaltung(input, e);
  });

  it('offene Direktausschüttungen bleiben unangetastet auf dem Verrechnungskonto liegen', () => {
    const input: KaskadeInput = {
      einrichtungen: [
        { id: 'a', anteile: A(10_000n), kinder: 5, verifiziert: true },
        { id: 'b', anteile: A(30_000n), kinder: 5, verifiziert: true },
      ],
      etfMarktwertCent: 39_000n,
      verrechnungskontoCent: 3_000n, // davon 2.000 durchlaufende Posten
      offeneDirektausschuettungenCent: 2_000n,
      soliFondsCent: 0n,
      managementKontoCent: 0n,
      managementCapCent: 0n,
    };
    const e = berechneKaskade(input);
    expect(e.snapshot.poolwertCent).toBe(40_000n); // 39.000 + (3.000 − 2.000)
    expect(e.endVerrechnungskontoCent).toBe(2_000n); // fremdes Geld bleibt liegen
    geldErhaltung(input, e);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/kaskade.test.ts`
Expected: FAIL — „Cannot find module '../kaskade'“

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/verrechnung/kaskade.ts
// Jahres-Kaskade (Spec §4): läuft einmal jährlich, Schritte 1–6 in fester
// Reihenfolge, alle Werte vom Bewertungsstichtag. ES WIRD KEINE RENDITE
// BERECHNET — der ETF hat am Stichtag den Wert, den er hat (ertragsblind).
// Reine Funktion: Snapshot rein, vollständiges Buchungsergebnis raus.
import { anteilVon, divRound, verteileProportional, type Cent } from './geld';
import { topfwertCent } from './anteile';
import { berechneRang, type KeineVerteilungGrund, type RangKandidat } from './rang';
import { AUSSCHUETTUNGS_SATZ, P_SCALE } from './konstanten';

export interface KaskadeEinrichtung {
  id: string;
  anteile: bigint;
  kinder: number;
  verifiziert: boolean;
}

export interface KaskadeInput {
  einrichtungen: KaskadeEinrichtung[];
  etfMarktwertCent: Cent;
  verrechnungskontoCent: Cent;
  offeneDirektausschuettungenCent: Cent;
  soliFondsCent: Cent;
  managementKontoCent: Cent;
  managementCapCent: Cent;
}

export interface KaskadeErgebnis {
  snapshot: { poolwertCent: Cent; soliFondsCent: Cent; topfCent: Map<string, Cent> };
  auffuellenCent: Cent;
  direktspenden: { id: string; cent: Cent }[];
  abgaben: { id: string; cent: Cent; pPromille: number }[];
  managementBewegungCent: Cent;
  umverteilung: { id: string; cent: Cent }[];
  keineVerteilungGrund: KeineVerteilungGrund | null;
  endTopfCent: Map<string, Cent>;
  endEtfMarktwertCent: Cent;
  endVerrechnungskontoCent: Cent;
  endSoliFondsCent: Cent;
  endManagementKontoCent: Cent;
}

/**
 * Schritt 1 — Snapshot: Cent-Töpfe aus Anteilen. Die Rundungsdifferenz zur
 * Poolwert-Summe geht an die Einrichtung mit den meisten Anteilen (kleinste
 * relative Verzerrung, Tie: niedrigere ID), damit ab hier exakt gilt:
 * Σ topf == poolwert (Invariante Spec §2).
 */
function snapshotToepfe(
  einrichtungen: KaskadeEinrichtung[],
  poolwertCent: Cent
): Map<string, Cent> {
  const anteileGesamt = einrichtungen.reduce((s, e) => s + e.anteile, 0n);
  const topf = new Map<string, Cent>();
  for (const e of einrichtungen) {
    topf.set(e.id, topfwertCent(e.anteile, poolwertCent, anteileGesamt));
  }
  const differenz = poolwertCent - [...topf.values()].reduce((a, b) => a + b, 0n);
  if (differenz !== 0n && einrichtungen.length > 0) {
    const groesste = [...einrichtungen].sort((a, b) =>
      a.anteile !== b.anteile ? (a.anteile > b.anteile ? -1 : 1) : a.id < b.id ? -1 : 1
    )[0];
    topf.set(groesste.id, topf.get(groesste.id)! + differenz);
  }
  return topf;
}

export function berechneKaskade(input: KaskadeInput): KaskadeErgebnis {
  const { einrichtungen } = input;

  // ── Schritt 1: Snapshot ────────────────────────────────────────────────
  const investierbarVK = input.verrechnungskontoCent - input.offeneDirektausschuettungenCent;
  const poolwertCent = input.etfMarktwertCent + investierbarVK;
  const snapshotTopf = snapshotToepfe(einrichtungen, poolwertCent);
  const topf = new Map(snapshotTopf); // Arbeitskopie, wird durch Schritt 3/4/6 verändert

  // ── Schritt 2: Verrechnungskonto auf den Bedarf abgleichen ─────────────
  // Bedarf = Summe der GERUNDETEN Direktspenden der VERIFIZIERTEN Töpfe
  // (Spec §4 Schritt 3 „Ausnahme": sonst landet das Konto nicht auf 0).
  const verifizierte = einrichtungen.filter((e) => e.verifiziert);
  const direktspenden = verifizierte.map((e) => ({
    id: e.id,
    cent: anteilVon(snapshotTopf.get(e.id)!, AUSSCHUETTUNGS_SATZ),
  }));
  const bedarf = direktspenden.reduce((s, d) => s + d.cent, 0n);
  const auffuellenCent = bedarf - investierbarVK; // > 0: ETF-Verkauf, < 0: Überschuss investieren
  let etf = input.etfMarktwertCent - auffuellenCent;

  // ── Schritt 3: Direktspende auszahlen ──────────────────────────────────
  for (const d of direktspenden) {
    topf.set(d.id, topf.get(d.id)! - d.cent);
  }
  // Verrechnungskonto steht jetzt per Konstruktion auf 0 (plus durchlaufende Posten).

  // ── Schritt 4: Solidaritätsabgabe (Bemessung: SNAPSHOT, nicht Schritt-3-Stand) ──
  const rangSnapshot = berechneRang(
    einrichtungen.map(
      (e): RangKandidat => ({
        id: e.id,
        topfCent: snapshotTopf.get(e.id)!,
        kinder: e.kinder,
        verifiziert: e.verifiziert,
      })
    )
  );
  const abgaben: { id: string; cent: Cent; pPromille: number }[] = [];
  let soli = input.soliFondsCent;
  if (rangSnapshot.p !== null) {
    for (const e of einrichtungen) {
      const p = rangSnapshot.p.get(e.id)!;
      const cent = divRound(p * anteilVon(snapshotTopf.get(e.id)!, AUSSCHUETTUNGS_SATZ), P_SCALE);
      if (cent > 0n) {
        abgaben.push({ id: e.id, cent, pPromille: Number((p * 1000n) / P_SCALE) });
        topf.set(e.id, topf.get(e.id)! - cent);
        etf -= cent;   // Einr.-Depot → Soli-Depot
        soli += cent;
      }
    }
  }

  // ── Schritt 5: Management-Konto abgleichen (läuft IMMER, Spec §6) ──────
  const zufluss = anteilVon(soli, AUSSCHUETTUNGS_SATZ);
  const kontoPlusZufluss = input.managementKontoCent + zufluss;
  const ziel = kontoPlusZufluss < input.managementCapCent ? kontoPlusZufluss : input.managementCapCent;
  const managementBewegungCent = ziel - input.managementKontoCent;
  soli -= managementBewegungCent;

  // ── Schritt 6: Umverteilung (p NEU ermitteln — Töpfe haben sich geändert) ──
  const rangAktuell = berechneRang(
    einrichtungen.map(
      (e): RangKandidat => ({
        id: e.id,
        topfCent: topf.get(e.id)!,
        kinder: e.kinder,
        verifiziert: e.verifiziert,
      })
    )
  );
  const umverteilung: { id: string; cent: Cent }[] = [];
  if (rangAktuell.p !== null) {
    // Nicht abgeholte Töpfe empfangen nicht; sie fallen aus der Gewichtssumme
    // heraus, das Verfahren normalisiert über die verbleibenden Empfänger (§3.4).
    const empfaenger = einrichtungen.filter((e) => e.verifiziert);
    const gewichte = empfaenger.map((e) => P_SCALE - rangAktuell.p!.get(e.id)!);
    const gewichtSumme = gewichte.reduce((a, b) => a + b, 0n);
    if (empfaenger.length > 0 && gewichtSumme > 0n) {
      const s = anteilVon(soli, AUSSCHUETTUNGS_SATZ);
      const restIndex = empfaenger.findIndex((e) => e.id === rangAktuell.aermsteVerifizierteId);
      const anteile = verteileProportional(s, gewichte, restIndex === -1 ? 0 : restIndex);
      for (let i = 0; i < empfaenger.length; i++) {
        if (anteile[i] > 0n) {
          umverteilung.push({ id: empfaenger[i].id, cent: anteile[i] });
          topf.set(empfaenger[i].id, topf.get(empfaenger[i].id)! + anteile[i]);
          etf += anteile[i]; // Soli-Depot → Einr.-Depot
        }
      }
      soli -= anteile.reduce((a, b) => a + b, 0n);
    }
  }

  // Wenn EINER der beiden Rang-Läufe keine Verteilung erlaubte, ist das der Grund.
  const keineVerteilungGrund = rangSnapshot.grund ?? rangAktuell.grund;

  return {
    snapshot: { poolwertCent, soliFondsCent: input.soliFondsCent, topfCent: snapshotTopf },
    auffuellenCent,
    direktspenden,
    abgaben,
    managementBewegungCent,
    umverteilung,
    keineVerteilungGrund,
    endTopfCent: topf,
    endEtfMarktwertCent: etf,
    endVerrechnungskontoCent: input.offeneDirektausschuettungenCent,
    endSoliFondsCent: soli,
    endManagementKontoCent: ziel,
  };
}
```

**Konsolidierungs-Hinweis (in `kaskadeService`, Task 12, relevant):** Die Kaskade behandelt den Soli-Fonds als eine Summe (Depot + Verrechnungskonto). Am Stichtag wird ohnehin gehandelt — der Service konsolidiert die Soli-Kassenlage beim Persistieren (Soli-VK → Soli-Depot), analog stellt Schritt 2 die Einrichtungs-Kassenlage exakt auf den Bedarf.

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/kaskade.test.ts`
Expected: PASS — insbesondere der goldene §9-Test mit allen sechs Endständen exakt.

- [ ] **Step 5: Randomisierter Geld-Erhaltungs-Test ergänzen**

Ans Ende von `kaskade.test.ts` anhängen:

```ts
describe('berechneKaskade — Geld-Erhaltung unter zufälligen Lagen (seeded)', () => {
  // Handgerollter LCG statt fast-check: keine neue Dependency, deterministisch.
  function lcg(seed: number) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 2 ** 32);
  }

  it('hält die Erhaltungs-Invariante über 200 zufällige Konstellationen', () => {
    const rand = lcg(42);
    for (let lauf = 0; lauf < 200; lauf++) {
      const n = 1 + Math.floor(rand() * 8);
      const einrichtungen = Array.from({ length: n }, (_, i) => ({
        id: `e${String(i).padStart(2, '0')}`,
        anteile: A(BigInt(Math.floor(rand() * 5_000_000))),
        kinder: 1 + Math.floor(rand() * 800),
        verifiziert: rand() < 0.7,
      }));
      const anteileSumme = einrichtungen.reduce((s, e) => s + e.anteile, 0n);
      const poolwert = anteileSumme / ANTEILS_EINHEITEN_PRO_CENT; // Kurs ~1
      const offene = BigInt(Math.floor(rand() * 10_000));
      const vk = offene + BigInt(Math.floor(rand() * Number(poolwert / 10n + 1n)));
      const input: KaskadeInput = {
        einrichtungen,
        etfMarktwertCent: poolwert - (vk - offene),
        verrechnungskontoCent: vk,
        offeneDirektausschuettungenCent: offene,
        soliFondsCent: BigInt(Math.floor(rand() * 10_000_000)),
        managementKontoCent: BigInt(Math.floor(rand() * 200_000)),
        managementCapCent: BigInt(Math.floor(rand() * 300_000)),
      };
      const e = berechneKaskade(input);
      geldErhaltung(input, e);
      // Invariante Spec §2 nach der Kaskade: Σ Topf == End-Poolwert
      const topfSumme = [...e.endTopfCent.values()].reduce((a, b) => a + b, 0n);
      expect(e.endEtfMarktwertCent + e.endVerrechnungskontoCent - input.offeneDirektausschuettungenCent).toBe(topfSumme);
    }
  });
});
```

Run: `cd stiftung-web && npx vitest run lib/verrechnung/__tests__/kaskade.test.ts`
Expected: PASS (201 Assertions-Blöcke). Fällt der Zufallstest, ist die Kaskade falsch — nicht der Test.

- [ ] **Step 6: Verify + Commit**

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0.

```bash
git add stiftung-web/lib/verrechnung
git commit -m "feat(verrechnung): Jahres-Kaskade als reine Funktion — goldener Spec-§9-Test, Geld-Erhaltung"
```

---

# Phase B — Datenmodell + Services

## Übergangsstrategie (gilt für Task 6–19, Abriss in Task 20)

Das neue Modell entsteht **additiv neben** dem alten: neue Tabellen (`Traeger`, `Kontenstand`, `WidmungsText`, `Zuwendung`, `AuszahlungsLauf`, `Buchung`, `Kaskadenlauf`) und neue Spalten an `Einrichtung` (`anteile`, `zielKapitalCent`, `traegerId`, `geschlossenAm`). Die alten Tabellen/Spalten (`aktuellesKapital`, `zielKapital`, `Spende`, `FondsSpende`, `Solidaritaetsfonds`, `Jahresabschluss`) und die alten Services bleiben unangetastet, bis die jeweilige UI-Seite geflippt ist — so ist `npm run verify` nach **jedem** Task grün. Task 20 reißt die alte Welt ab.

**Bewusste Folge:** Zwischen Task 8 und Task 19 buchen alte UI-Buttons (altes Panel) und neue Services in getrennte Welten; die lokale Demo ist in dieser Phase teilweise inkonsistent. Maßgeblich sind die Tests. Nach Task 19 ist die Demo vollständig kohärent, nach Task 20 existiert nur noch eine Welt. DB-Daten sind wegwerfbar (`npm run db:push` + `npm run db:seed`).

---

## Task 6: Prisma-Schema-Erweiterung, Seed v2, Test-Helfer, Serialisierung

**Files:**
- Modify: `stiftung-web/prisma/schema.prisma` (nur ERGÄNZEN, nichts löschen)
- Modify: `stiftung-web/prisma/seed.ts`
- Create: `stiftung-web/lib/server/buchungstypen.ts`
- Create: `stiftung-web/lib/verrechnung/serialisierung.ts`
- Create: `stiftung-web/lib/server/__tests__/testDb.ts`
- Test: `stiftung-web/lib/verrechnung/__tests__/serialisierung.test.ts`, `stiftung-web/lib/server/__tests__/schema.test.ts`

**Interfaces:**
- Produces:
  - Prisma-Modelle wie unten (Feldnamen sind Vertrag für alle Folge-Tasks)
  - `serialisiere<T>(wert: T)` — rekursiv `bigint → number` (Safe-Integer-geprüft), `Date` unangetastet
  - `resetDb()`, `seedKontenstand(overrides?)`, `createTestTraeger(overrides?)`, `createTestEinrichtung(overrides?)` aus `testDb.ts`
  - `BUCHUNGSTYPEN`-Union aus `buchungstypen.ts`

- [ ] **Step 1: Schema ergänzen**

In `stiftung-web/prisma/schema.prisma` — `Einrichtung` erhält vier neue Felder + zwei Relationen (bestehende Felder unverändert lassen):

```prisma
model Einrichtung {
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  typ              String
  ort              String
  kinderAnzahl     Int
  aktuellesKapital Float    // ÜBERGANG: Legacy, fällt in Task 20
  zielKapital      Float    // ÜBERGANG: Legacy, fällt in Task 20
  anteile          BigInt   @default(0)  // Pool-Anteile, 10^-8-Einheiten (Spec §2)
  zielKapitalCent  BigInt   @default(0)  // Produktebene (Level/Fortschritt), kein Buchungswert
  traegerId        String?  // Services erzwingen einen Träger; nullable nur für Legacy-Zeilen
  traeger          Traeger? @relation(fields: [traegerId], references: [id])
  geschlossenAm    DateTime? // Spec §3.3: geschlossen == raus aus Ranking und Listen
  spenden          Spende[]
  zuwendungen      Zuwendung[]
  buchungen        Buchung[]
}
```

Neue Modelle ans Dateiende:

```prisma
// Rechtsträger (Spec §1, §3.5): Träger 1 ── n Einrichtung. Am Träger hängen
// Rechtsform, Gemeinnützigkeitsstatus und Verifikation (Spielgeld-KYC).
model Traeger {
  id            String        @id @default(cuid())
  name          String
  rechtsform    String        @default("unbekannt") // Rechtsform-Union aus lib/verrechnung/traeger.ts
  gemeinnuetzig Boolean       @default(false)
  verifiziert   Boolean       @default(false)       // "Zugang abgeholt" (Spec §3.4)
  einrichtungen Einrichtung[]
}

// Kontenmodell (Spec §1) als Singleton-Zeile id 'main'. Einrichtungen haben
// keine eigenen Konten — ihre Zuordnung sind die anteile-Zeilen.
// ponytail: Grundstock (Phase 3, Spec §10) kommt später als weitere Spalten +
// Buchungstyp — keine Datenmigration nötig, deshalb reicht die eine Zeile.
model Kontenstand {
  id                        String @id @default("main")
  etfMarktwertCent          BigInt @default(0) // Einrichtungs-Depot (ETF)
  verrechnungskontoCent     BigInt @default(0) // Cash-Puffer, enthält auch durchlaufende Posten
  soliDepotCent             BigInt @default(0)
  soliVerrechnungskontoCent BigInt @default(0)
  managementKontoCent       BigInt @default(0)
  managementCapCent         BigInt @default(0) // von der Mitgliederversammlung beschlossen (Spec §8)
}

// Versionierter Widmungs-Wortlaut (Spec §3.1 "Dokumentation der Widmung"):
// ändert sich die Formulierung, bleibt die alte Fassung den alten Spenden zugeordnet.
model WidmungsText {
  version   Int      @id
  wortlaut  String
  gueltigAb DateTime @default(now())
}

// Zuwendung von außen (ersetzt Spende + FondsSpende ab Task 20).
// einrichtungId null == Empfänger Solidaritätsfonds (Spec §3.1: zwei Merkmale,
// Empfänger × Verwendungsart; Soli immer Verwendungsart A).
model Zuwendung {
  id                String           @id @default(cuid())
  einrichtungId     String?
  einrichtung       Einrichtung?     @relation(fields: [einrichtungId], references: [id])
  betragCent        BigInt
  verwendungsart    String           // 'vermoegen' (A, § 62 Abs. 3 Nr. 2 AO) | 'direkt' (B, § 55 Abs. 1 Nr. 5 AO)
  widmungVersion    Int?             // Pflicht bei 'vermoegen' (Service erzwingt; B hat keine Vermögenswidmung)
  widmungZeitpunkt  DateTime?        // muss zum Zahlungszeitpunkt vorliegen
  ausgezahltAm      DateTime?        // nur 'direkt': null == offener durchlaufender Posten
  auszahlungsLaufId String?
  auszahlungsLauf   AuszahlungsLauf? @relation(fields: [auszahlungsLaufId], references: [id])
  createdAt         DateTime         @default(now())
}

// Monatlicher Sammellauf für Direktausschüttungen (Spec §3.1 "Auszahlungsrhythmus").
model AuszahlungsLauf {
  id          String      @id @default(cuid())
  summeCent   BigInt
  anzahl      Int
  createdAt   DateTime    @default(now())
  zuwendungen Zuwendung[]
}

// Buchungsjournal (Spec §7): Gebucht wird brutto, pro Einrichtung einzeln.
// Jede Kapitalbewegung im Kontenmodell erzeugt genau eine Zeile.
model Buchung {
  id             String        @id @default(cuid())
  typ            String        // Union in lib/server/buchungstypen.ts
  einrichtungId  String?
  einrichtung    Einrichtung?  @relation(fields: [einrichtungId], references: [id])
  betragCent     BigInt        // immer >= 0; die Richtung steckt im typ
  kaskadenlaufId String?
  kaskadenlauf   Kaskadenlauf? @relation(fields: [kaskadenlaufId], references: [id])
  createdAt      DateTime      @default(now())
}

// Protokoll eines Jahres-Kaskadenlaufs (Spec §4). Ersetzt Jahresabschluss ab Task 20.
model Kaskadenlauf {
  id                     String    @id @default(cuid())
  nummer                 Int
  poolwertCent           BigInt    // Snapshot Schritt 1
  soliFondsCent          BigInt    // Snapshot Schritt 1
  direktspendenCent      BigInt
  abgabenCent            BigInt
  managementBewegungCent BigInt    // signiert
  umverteilungCent       BigInt
  keineVerteilungGrund   String?   // 'zuWenigEinrichtungen' | 'alleGleich' (Erfolgsfall!, Spec §6)
  buchungen              Buchung[]
  createdAt              DateTime  @default(now())
}
```

- [ ] **Step 2: Buchungstypen-Union**

```ts
// stiftung-web/lib/server/buchungstypen.ts
// Journal-Typen (Spec §7). Die Richtung der Bewegung ist im Typ kodiert;
// betragCent ist immer >= 0.
export const BUCHUNGSTYPEN = [
  'spende',                    // Zuwendung A an Einrichtung: VK +, Anteilskauf
  'soli_spende',               // Zuwendung A an Soli: Soli-VK +
  'erstbefuellung',            // Soli → Einrichtungs-Depot (Spec §3.0)
  'direktausschuettung_eingang', // Zuwendung B: durchlaufender Posten auf VK (Spec §3.1)
  'auszahlungslauf',           // monatliche Sammel-Auszahlung: VK − (je Einrichtung eine Zeile)
  'sweep',                     // VK → ETF (Spec §3.2)
  'soli_sweep',                // Soli-VK → Soli-Depot
  'kurs_einrichtungsdepot',    // Marktsimulation: ETF-Marktwert-Delta (kein Geldfluss)
  'kurs_soli',                 // Marktsimulation: Soli-Depot-Delta
  'schliessung',               // Einrichtungs-Depot → Soli (Spec §3.3)
  'soli_konsolidierung',       // Soli-VK → Soli-Depot am Stichtag (Kaskaden-Vorbereitung)
  'kaskade_auffuellen',        // Schritt 2: ETF ↔ VK (betrag = |Differenz|, Richtung s. Kaskadenlauf)
  'kaskade_direktspende',      // Schritt 3: Auszahlung an Einrichtung
  'kaskade_abgabe',            // Schritt 4: Einr.-Depot → Soli
  'kaskade_management',        // Schritt 5: Soli ↔ Management (betrag = |Bewegung|)
  'kaskade_umverteilung',      // Schritt 6: Soli → Einr.-Depot
] as const;

export type Buchungstyp = (typeof BUCHUNGSTYPEN)[number];
```

- [ ] **Step 3: Serialisierung + Test**

```ts
// stiftung-web/lib/verrechnung/serialisierung.ts
// bigint überlebt NextResponse.json() nicht. An der API-Grenze werden alle
// bigint-Felder in number konvertiert — mit hartem Safe-Integer-Check, damit
// ein Überlauf laut knallt statt still zu runden.
type Serialisiert<T> = T extends bigint
  ? number
  : T extends Date
    ? Date
    : T extends Array<infer U>
      ? Array<Serialisiert<U>>
      : T extends Map<infer K, infer V>
        ? Record<string, Serialisiert<V>>
        : T extends object
          ? { [K in keyof T]: Serialisiert<T[K]> }
          : T;

export function serialisiere<T>(wert: T): Serialisiert<T> {
  if (typeof wert === 'bigint') {
    const zahl = Number(wert);
    if (!Number.isSafeInteger(zahl)) {
      throw new RangeError(`serialisiere: ${wert} überschreitet Number.MAX_SAFE_INTEGER`);
    }
    return zahl as Serialisiert<T>;
  }
  if (wert instanceof Date || wert === null || typeof wert !== 'object') {
    return wert as Serialisiert<T>;
  }
  if (Array.isArray(wert)) {
    return wert.map((e) => serialisiere(e)) as Serialisiert<T>;
  }
  if (wert instanceof Map) {
    return Object.fromEntries([...wert.entries()].map(([k, v]) => [String(k), serialisiere(v)])) as Serialisiert<T>;
  }
  return Object.fromEntries(
    Object.entries(wert as Record<string, unknown>).map(([k, v]) => [k, serialisiere(v)])
  ) as Serialisiert<T>;
}
```

```ts
// stiftung-web/lib/verrechnung/__tests__/serialisierung.test.ts
import { describe, it, expect } from 'vitest';
import { serialisiere } from '../serialisierung';

describe('serialisiere', () => {
  it('konvertiert bigint rekursiv zu number, lässt Rest unangetastet', () => {
    const datum = new Date('2026-01-09');
    expect(
      serialisiere({ a: 415n, b: 'x', c: [{ d: 1n }], e: datum, f: null, g: new Map([['k', 2n]]) })
    ).toEqual({ a: 415, b: 'x', c: [{ d: 1 }], e: datum, f: null, g: { k: 2 } });
  });
  it('wirft bei Werten jenseits MAX_SAFE_INTEGER statt still zu runden', () => {
    expect(() => serialisiere({ a: 2n ** 60n })).toThrow(RangeError);
  });
});
```

- [ ] **Step 4: Test-Helfer**

```ts
// stiftung-web/lib/server/__tests__/testDb.ts
// Zentraler Reset für DB-Suiten der NEUEN Welt: ALLE Tabellen, FK-sichere
// Reihenfolge (Kinder vor Eltern). Bestehende Alt-Suiten behalten ihren
// eigenen 5-Tabellen-Reset — dank onDelete: SetNull der neuen Relationen
// kollidieren die Welten nicht.
import { prisma } from '../prismaClient';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';

export async function resetDb() {
  await prisma.buchung.deleteMany();
  await prisma.zuwendung.deleteMany();
  await prisma.auszahlungsLauf.deleteMany();
  await prisma.kaskadenlauf.deleteMany();
  await prisma.fondsSpende.deleteMany();
  await prisma.spende.deleteMany();
  await prisma.einrichtung.deleteMany();
  await prisma.traeger.deleteMany();
  await prisma.widmungsText.deleteMany();
  await prisma.kontenstand.deleteMany();
  await prisma.solidaritaetsfonds.deleteMany();
  await prisma.jahresabschluss.deleteMany();
}

export async function seedWidmung() {
  return prisma.widmungsText.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      wortlaut:
        'Ich bestimme, dass meine Zuwendung dem Vermögen des Vereins dauerhaft zugeführt wird (§ 62 Abs. 3 Nr. 2 AO). Gefördert wird die Einrichtung aus den Erträgen.',
    },
  });
}

export async function seedKontenstand(
  overrides: Partial<{
    etfMarktwertCent: bigint;
    verrechnungskontoCent: bigint;
    soliDepotCent: bigint;
    soliVerrechnungskontoCent: bigint;
    managementKontoCent: bigint;
    managementCapCent: bigint;
  }> = {}
) {
  return prisma.kontenstand.create({ data: { id: 'main', ...overrides } });
}

let laufNr = 0;

export async function createTestTraeger(
  overrides: Partial<{ name: string; rechtsform: string; gemeinnuetzig: boolean; verifiziert: boolean }> = {}
) {
  laufNr += 1;
  return prisma.traeger.create({
    data: {
      name: `Testträger ${laufNr}`,
      rechtsform: 'ggmbh',
      gemeinnuetzig: true,
      verifiziert: true,
      ...overrides,
    },
  });
}

export async function createTestEinrichtung(
  overrides: Partial<{
    slug: string;
    name: string;
    typ: string;
    ort: string;
    kinderAnzahl: number;
    topfCent: bigint; // Komfort: wird zum Bootstrap-Kurs in anteile übersetzt
    zielKapitalCent: bigint;
    traegerId: string;
    geschlossenAm: Date | null;
  }> = {}
) {
  laufNr += 1;
  const traegerId = overrides.traegerId ?? (await createTestTraeger()).id;
  const topfCent = overrides.topfCent ?? 0n;
  return prisma.einrichtung.create({
    data: {
      slug: overrides.slug ?? `test-einrichtung-${laufNr}`,
      name: overrides.name ?? `Test-Einrichtung ${laufNr}`,
      typ: overrides.typ ?? 'kita',
      ort: overrides.ort ?? 'Teststadt',
      kinderAnzahl: overrides.kinderAnzahl ?? 10,
      aktuellesKapital: Number(topfCent) / 100, // Legacy-Spalte, fällt in Task 20
      zielKapital: Number(overrides.zielKapitalCent ?? 1_000_000n) / 100,
      anteile: topfCent * ANTEILS_EINHEITEN_PRO_CENT,
      zielKapitalCent: overrides.zielKapitalCent ?? 1_000_000n,
      traegerId,
      geschlossenAm: overrides.geschlossenAm ?? null,
    },
  });
}
```

- [ ] **Step 5: Seed v2**

`stiftung-web/prisma/seed.ts` vollständig ersetzen:

```ts
// stiftung-web/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Anteils-Feinheit: Bootstrap-Kurs 1 Cent == 1e6 Einheiten (siehe lib/verrechnung/konstanten.ts —
// hier dupliziert, weil seed.ts über tsx außerhalb des Next-Alias läuft).
const ANTEILE = 1_000_000n;

const TRAEGER = [
  { key: 'winter', name: 'Maria Winter', rechtsform: 'einzelunternehmen', gemeinnuetzig: false, verifiziert: true },
  { key: 'krause', name: 'Familie Krause', rechtsform: 'einzelunternehmen', gemeinnuetzig: false, verifiziert: false },
  { key: 'forscher', name: 'Jan Litke', rechtsform: 'einzelunternehmen', gemeinnuetzig: false, verifiziert: true },
  { key: 'kinderland', name: 'Kinderland gGmbH', rechtsform: 'ggmbh', gemeinnuetzig: true, verifiziert: true },
  { key: 'berlin', name: 'Land Berlin', rechtsform: 'kommune', gemeinnuetzig: false, verifiziert: true },
  { key: 'hamburg', name: 'Freie und Hansestadt Hamburg', rechtsform: 'kommune', gemeinnuetzig: false, verifiziert: false },
  { key: 'pestalozzi', name: 'Pestalozzi-Stiftung Bremen', rechtsform: 'stiftung', gemeinnuetzig: true, verifiziert: true },
] as const;

// topfCent == bisheriges aktuellesKapital in Cent; Kinderland betreibt zwei
// Einrichtungen (Träger 1 ── n Einrichtung, Spec §1).
const EINRICHTUNGEN = [
  { slug: 'tagesmutter-wirbelwind-muenchen', name: 'Tagespflege Wirbelwind', typ: 'tagespflege', ort: 'München', kinderAnzahl: 5, topfCent: 300_000n, zielKapitalCent: 2_500_000n, traeger: 'winter' },
  { slug: 'tagesvater-sonnenschein-leipzig', name: 'Tagespflege Sonnenschein', typ: 'tagespflege', ort: 'Leipzig', kinderAnzahl: 4, topfCent: 80_000n, zielKapitalCent: 2_000_000n, traeger: 'krause' },
  { slug: 'tagesmutter-kleine-forscher-dresden', name: 'Tagespflege Kleine Forscher', typ: 'tagespflege', ort: 'Dresden', kinderAnzahl: 6, topfCent: 1_200_000n, zielKapitalCent: 3_000_000n, traeger: 'forscher' },
  { slug: 'kita-wirbelwind-muenchen', name: 'Kita Wirbelwind', typ: 'kita', ort: 'München', kinderAnzahl: 60, topfCent: 1_500_000n, zielKapitalCent: 12_000_000n, traeger: 'kinderland' },
  { slug: 'kita-regenbogen-koeln', name: 'Kita Regenbogen', typ: 'kita', ort: 'Köln', kinderAnzahl: 45, topfCent: 500_000n, zielKapitalCent: 9_000_000n, traeger: 'kinderland' },
  { slug: 'grundschule-sonnenhuegel-berlin', name: 'Grundschule Sonnenhügel', typ: 'schule', ort: 'Berlin', kinderAnzahl: 250, topfCent: 5_000_000n, zielKapitalCent: 25_000_000n, traeger: 'berlin' },
  { slug: 'gymnasium-neustadt-hamburg', name: 'Gymnasium Neustadt', typ: 'schule', ort: 'Hamburg', kinderAnzahl: 800, topfCent: 45_000_000n, zielKapitalCent: 120_000_000n, traeger: 'hamburg' },
  { slug: 'foerderschule-pestalozzi-bremen', name: 'Förderschule Pestalozzi', typ: 'schule', ort: 'Bremen', kinderAnzahl: 90, topfCent: 8_000_000n, zielKapitalCent: 22_500_000n, traeger: 'pestalozzi' },
] as const;

async function main() {
  const traegerIds = new Map<string, string>();
  for (const t of TRAEGER) {
    const vorhanden = await prisma.traeger.findFirst({ where: { name: t.name } });
    const zeile =
      vorhanden ??
      (await prisma.traeger.create({
        data: { name: t.name, rechtsform: t.rechtsform, gemeinnuetzig: t.gemeinnuetzig, verifiziert: t.verifiziert },
      }));
    traegerIds.set(t.key, zeile.id);
  }

  for (const e of EINRICHTUNGEN) {
    const data = {
      slug: e.slug,
      name: e.name,
      typ: e.typ,
      ort: e.ort,
      kinderAnzahl: e.kinderAnzahl,
      aktuellesKapital: Number(e.topfCent) / 100, // Legacy, fällt in Task 20
      zielKapital: Number(e.zielKapitalCent) / 100, // Legacy, fällt in Task 20
      anteile: e.topfCent * ANTEILE,
      zielKapitalCent: e.zielKapitalCent,
      traegerId: traegerIds.get(e.traeger)!,
    };
    await prisma.einrichtung.upsert({ where: { slug: e.slug }, update: data, create: data });
  }

  // Kontenstände: Poolwert == Σ Töpfe; Verrechnungskonto sauber auf dem
  // 1-%-Sweep-Ziel, Rest im ETF. Soli-Fonds 5.000 € (Depot 4.950 € + VK 50 €).
  const poolwert = EINRICHTUNGEN.reduce((s, e) => s + e.topfCent, 0n); // 61.580.000 Cent
  const vk = poolwert / 100n; // 1 % Ziel
  await prisma.kontenstand.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      etfMarktwertCent: poolwert - vk,
      verrechnungskontoCent: vk,
      soliDepotCent: 495_000n,
      soliVerrechnungskontoCent: 5_000n,
      managementKontoCent: 0n,
      managementCapCent: 1_000_000n, // Cap 10.000 € (Spec §8: von der Mitgliederversammlung; hier Demo-Wert)
    },
  });

  await prisma.widmungsText.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      wortlaut:
        'Ich bestimme, dass meine Zuwendung dem Vermögen des Vereins dauerhaft zugeführt wird (§ 62 Abs. 3 Nr. 2 AO). Gefördert wird die Einrichtung aus den Erträgen.',
    },
  });

  // Legacy-Fonds-Zeile, bis das alte Panel fällt (Task 20).
  await prisma.solidaritaetsfonds.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', bestand: 0 },
  });

  console.log(`Seed abgeschlossen: ${TRAEGER.length} Träger, ${EINRICHTUNGEN.length} Einrichtungen, Kontenstand, Widmung v1.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 6: Schema-Smoke-Test**

```ts
// stiftung-web/lib/server/__tests__/schema.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, createTestEinrichtung, seedKontenstand } from './testDb';

beforeEach(resetDb);

describe('Schema v2', () => {
  it('legt Träger ─ Einrichtung ─ Anteile an und liest bigint zurück', async () => {
    const e = await createTestEinrichtung({ topfCent: 14_000n });
    const geladen = await prisma.einrichtung.findUniqueOrThrow({
      where: { id: e.id },
      include: { traeger: true },
    });
    expect(geladen.anteile).toBe(14_000n * 1_000_000n);
    expect(geladen.traeger?.verifiziert).toBe(true);
  });

  it('Kontenstand ist ein Singleton mit BigInt-Salden', async () => {
    await seedKontenstand({ etfMarktwertCent: 41_085n, verrechnungskontoCent: 415n });
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(41_085n);
  });

  it('Einrichtung löschen setzt Buchungs-Referenz auf null (Welten kollidieren nicht)', async () => {
    const e = await createTestEinrichtung();
    await prisma.buchung.create({ data: { typ: 'spende', einrichtungId: e.id, betragCent: 100n } });
    await prisma.zuwendung.deleteMany();
    await prisma.einrichtung.delete({ where: { id: e.id } });
    const b = await prisma.buchung.findFirstOrThrow();
    expect(b.einrichtungId).toBeNull();
  });
});
```

**Hinweis:** Damit `onDelete: SetNull` greift, die Relationen `Buchung.einrichtung`, `Zuwendung.einrichtung`, `Einrichtung.traeger` explizit mit `onDelete: SetNull` annotieren, falls Prisma beim `db push` meckert (Default für optionale Relationen ist SetNull — Annotation macht es sichtbar).

- [ ] **Step 7: Schema pushen, Tests laufen lassen**

```bash
cd stiftung-web && npm run db:push && npm run db:seed
```
Expected: „Seed abgeschlossen: 7 Träger, 8 Einrichtungen …“

Run: `cd stiftung-web && npm run verify`
Expected: Exit 0 — `pretest` pusht das erweiterte Schema automatisch in `test.db`; alle Alt-Tests bleiben grün (nur additive Änderungen).

- [ ] **Step 8: Commit**

```bash
git add stiftung-web/prisma stiftung-web/lib
git commit -m "feat(schema): Träger, Kontenstand, Zuwendung, Buchungsjournal, Kaskadenlauf — additiv neben Legacy"
```

---

## Task 7: Kontenlage — `lib/server/kontenService.ts`

**Files:**
- Create: `stiftung-web/lib/server/kontenService.ts`
- Test: `stiftung-web/lib/server/__tests__/kontenService.test.ts`

**Interfaces:**
- Consumes: Prisma-Modelle aus Task 6; `topfwertCent` aus `@/lib/verrechnung/anteile`; `serialisiere`
- Produces (Vertrag für Task 8–19):

```ts
export type Tx = Prisma.TransactionClient;
export async function ensureKontenstand(tx: Tx): Promise<Kontenstand>
export async function offeneDirektausschuettungenCent(tx: Tx): Promise<bigint>
export async function poolwertCent(tx: Tx): Promise<bigint>            // etf + vk − offene Posten
export async function soliFondsCentAktuell(tx: Tx): Promise<bigint>    // soliDepot + soliVK
export async function anteileGesamt(tx: Tx): Promise<bigint>           // Σ anteile offener Einrichtungen
export async function buche(tx: Tx, eintrag: { typ: Buchungstyp; betragCent: bigint; einrichtungId?: string; kaskadenlaufId?: string }): Promise<void>
export async function setManagementCap(capCent: bigint): Promise<void>
export async function kontenLage(): Promise<KontenLage>                // serialisiert für UI/API
// KontenLage = { etfMarktwertCent, verrechnungskontoCent, soliDepotCent, soliVerrechnungskontoCent,
//   managementKontoCent, managementCapCent, offeneDirektausschuettungenCent, poolwertCent, soliFondsCent } — alles number
```

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/kontenService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung } from './testDb';
import {
  ensureKontenstand,
  offeneDirektausschuettungenCent,
  poolwertCent,
  soliFondsCentAktuell,
  kontenLage,
  setManagementCap,
} from '../kontenService';

beforeEach(resetDb);

describe('kontenService', () => {
  it('ensureKontenstand legt das Singleton bei Bedarf an', async () => {
    const k = await prisma.$transaction((tx) => ensureKontenstand(tx));
    expect(k.id).toBe('main');
    expect(k.etfMarktwertCent).toBe(0n);
  });

  it('poolwertCent zieht offene Direktausschüttungen ab (Spec §3.1: B geht nicht in den Poolwert ein)', async () => {
    await seedKontenstand({ etfMarktwertCent: 39_000n, verrechnungskontoCent: 3_000n });
    const e = await createTestEinrichtung();
    await prisma.zuwendung.create({
      data: { einrichtungId: e.id, betragCent: 2_000n, verwendungsart: 'direkt' },
    });
    await prisma.$transaction(async (tx) => {
      expect(await offeneDirektausschuettungenCent(tx)).toBe(2_000n);
      expect(await poolwertCent(tx)).toBe(40_000n);
    });
  });

  it('bereits ausgezahlte Direktausschüttungen zählen nicht mehr als offen', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const e = await createTestEinrichtung();
    await prisma.zuwendung.create({
      data: { einrichtungId: e.id, betragCent: 500n, verwendungsart: 'direkt', ausgezahltAm: new Date() },
    });
    await prisma.$transaction(async (tx) => {
      expect(await offeneDirektausschuettungenCent(tx)).toBe(0n);
    });
  });

  it('soliFondsCentAktuell summiert Depot + Verrechnungskonto', async () => {
    await seedKontenstand({ soliDepotCent: 495_000n, soliVerrechnungskontoCent: 5_000n });
    await prisma.$transaction(async (tx) => {
      expect(await soliFondsCentAktuell(tx)).toBe(500_000n);
    });
  });

  it('kontenLage liefert serialisierte number-Werte', async () => {
    await seedKontenstand({ etfMarktwertCent: 41_085n, verrechnungskontoCent: 415n, soliDepotCent: 30_000n });
    const lage = await kontenLage();
    expect(lage.poolwertCent).toBe(41_500);
    expect(lage.soliFondsCent).toBe(30_000);
    expect(typeof lage.etfMarktwertCent).toBe('number');
  });

  it('setManagementCap schreibt den Cap (Spec §8: muss vor dem Stichtagslauf feststehen)', async () => {
    await setManagementCap(120_000n);
    const lage = await kontenLage();
    expect(lage.managementCapCent).toBe(120_000);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/kontenService.test.ts`
Expected: FAIL — Modul fehlt

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/server/kontenService.ts
// Kontenmodell (Spec §1): fünf Konten als Singleton-Zeile + Buchungsjournal.
// Alle Funktionen nehmen den TransactionClient — Buchungen sind IMMER Teil
// einer umschließenden $transaction des aufrufenden Services.
import type { Prisma, Kontenstand } from '@prisma/client';
import { prisma } from './prismaClient';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import type { Buchungstyp } from './buchungstypen';

export type Tx = Prisma.TransactionClient;

export async function ensureKontenstand(tx: Tx): Promise<Kontenstand> {
  return tx.kontenstand.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });
}

/** Durchlaufende Posten (Spec §3.1): offene Verwendungsart-B-Zuwendungen. */
export async function offeneDirektausschuettungenCent(tx: Tx): Promise<bigint> {
  const summe = await tx.zuwendung.aggregate({
    _sum: { betragCent: true },
    where: { verwendungsart: 'direkt', ausgezahltAm: null },
  });
  return summe._sum.betragCent ?? 0n;
}

/** Poolwert = ETF-Marktwert + Verrechnungskonto − offene Direktausschüttungen (Spec §2, §3.1). */
export async function poolwertCent(tx: Tx): Promise<bigint> {
  const k = await ensureKontenstand(tx);
  return k.etfMarktwertCent + k.verrechnungskontoCent - (await offeneDirektausschuettungenCent(tx));
}

export async function soliFondsCentAktuell(tx: Tx): Promise<bigint> {
  const k = await ensureKontenstand(tx);
  return k.soliDepotCent + k.soliVerrechnungskontoCent;
}

/** Σ Anteile aller offenen Einrichtungen (geschlossene haben anteile == 0). */
export async function anteileGesamt(tx: Tx): Promise<bigint> {
  const summe = await tx.einrichtung.aggregate({ _sum: { anteile: true } });
  return summe._sum.anteile ?? 0n;
}

export async function buche(
  tx: Tx,
  eintrag: { typ: Buchungstyp; betragCent: bigint; einrichtungId?: string; kaskadenlaufId?: string }
): Promise<void> {
  await tx.buchung.create({
    data: {
      typ: eintrag.typ,
      betragCent: eintrag.betragCent,
      einrichtungId: eintrag.einrichtungId ?? null,
      kaskadenlaufId: eintrag.kaskadenlaufId ?? null,
    },
  });
}

export async function setManagementCap(capCent: bigint): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await ensureKontenstand(tx);
    await tx.kontenstand.update({ where: { id: 'main' }, data: { managementCapCent: capCent } });
  });
}

export async function kontenLage() {
  return prisma.$transaction(async (tx) => {
    const k = await ensureKontenstand(tx);
    const offene = await offeneDirektausschuettungenCent(tx);
    return serialisiere({
      etfMarktwertCent: k.etfMarktwertCent,
      verrechnungskontoCent: k.verrechnungskontoCent,
      soliDepotCent: k.soliDepotCent,
      soliVerrechnungskontoCent: k.soliVerrechnungskontoCent,
      managementKontoCent: k.managementKontoCent,
      managementCapCent: k.managementCapCent,
      offeneDirektausschuettungenCent: offene,
      poolwertCent: k.etfMarktwertCent + k.verrechnungskontoCent - offene,
      soliFondsCent: k.soliDepotCent + k.soliVerrechnungskontoCent,
    });
  });
}

export type KontenLage = Awaited<ReturnType<typeof kontenLage>>;
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/kontenService.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): kontenService — Kontenlage, Poolwert mit durchlaufenden Posten, Buchungsjournal-Helfer"
```

---

## Task 8: Spendeneingang Verwendungsart A — `lib/server/spendenService.ts`

**Files:**
- Create: `stiftung-web/lib/server/spendenService.ts`
- Test: `stiftung-web/lib/server/__tests__/spendenService.test.ts`

**Interfaces:**
- Consumes: kontenService (Task 7), `kaufeAnteile`/`topfwertCent` (Task 2), `sweepBetrag` (Task 4), `erreichteMeilensteine` aus `@/lib/data/levels`
- Produces:

```ts
export class UngueltigeZuwendungError extends Error {}
export class EinrichtungGeschlossenError extends Error {}
export class DirektNichtVerfuegbarError extends Error {}
export class EinrichtungNichtGefundenError extends Error {}

export interface SpendeErgebnis {
  zuwendungId: string;
  einrichtung: { slug: string; name: string; topfwertCent: number; zielKapitalCent: number };
  topfwertVorherCent: number;
  topfwertNachherCent: number;
  erreichteMeilensteine: string[];
  widmung: { version: number; wortlaut: string } | null;
}

export async function spendeVermoegen(slug: string, betragCent: bigint): Promise<SpendeErgebnis>
export async function spendeAnSoli(betragCent: bigint): Promise<{ zuwendungId: string; soliFondsCent: number }>
export async function aktuelleWidmung(): Promise<{ version: number; wortlaut: string }>
```

**Buchungssemantik A (Spec §3.1/§3.2, alles in EINER `$transaction`):**
1. Validierung: `betragCent > 0n`; Einrichtung existiert, `geschlossenAm == null`.
2. Widmung: aktuellste `WidmungsText`-Version laden (höchste `version`); fehlt sie → Fehler (Doku-Pflicht, keine stille Spende ohne Widmungsnachweis).
3. Anteile kaufen zum Poolwert **vor** Zufluss; `einrichtung.anteile += neu`.
4. `verrechnungskontoCent += betrag`; `Buchung 'spende'`.
5. Sweep prüfen (`sweepBetrag`): wenn > 0 → `verrechnungskonto −`, `etfMarktwert +`, `Buchung 'sweep'`.
6. Meilensteine aus Topfwert vorher/nachher (`erreichteMeilensteine(Number(vorher), Number(nachher), Number(zielKapitalCent))` — ratio-basiert, Cent-Zahlen sind zulässig).

Soli-Spende analog auf `soliVerrechnungskontoCent` (+ Soli-Sweep gegen den Soli-Fonds), Zuwendung mit `einrichtungId: null`, immer Verwendungsart A (Spec §3.1: „Für den Solidaritätsfonds gibt es keine Direktausschüttung“).

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/spendenService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung, createTestTraeger } from './testDb';
import { spendeVermoegen, spendeAnSoli, UngueltigeZuwendungError, EinrichtungGeschlossenError } from '../spendenService';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('spendeVermoegen (Verwendungsart A, Spec §3.1)', () => {
  it('kauft Anteile zum Poolwert vor Zufluss, bucht aufs Verrechnungskonto und dokumentiert die Widmung', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n, verrechnungskontoCent: 0n });
    const e = await createTestEinrichtung({ topfCent: 10_000n, zielKapitalCent: 2_500_000n });
    // Einzige Einrichtung: ihre 10.000-Cent-Anteile tragen den GANZEN Pool von
    // 37.500 Cent → Kurs 3,75 pro Bootstrap-Einheit. 40 € kaufen daher
    // divRound(4.000 × 10^10, 37.500) = 1.066.666.667 Einheiten (~10,67 € nominal).
    const ergebnis = await spendeVermoegen(e.slug, 4_000n);

    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(zeile.anteile).toBe(10_000n * ANTEILS_EINHEITEN_PRO_CENT + 1_066_666_667n); // divRound(4000×1e10, 37500)

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    // Sweep: investierbar 4.000 bei Poolwert 41.500 → Schwelle 498 überschritten → Kauf 3.585
    expect(k.verrechnungskontoCent).toBe(415n);
    expect(k.etfMarktwertCent).toBe(41_085n);

    const zuwendung = await prisma.zuwendung.findUniqueOrThrow({ where: { id: ergebnis.zuwendungId } });
    expect(zuwendung.verwendungsart).toBe('vermoegen');
    expect(zuwendung.widmungVersion).toBe(1);
    expect(zuwendung.widmungZeitpunkt).not.toBeNull();

    const buchungen = await prisma.buchung.findMany({ orderBy: { createdAt: 'asc' } });
    expect(buchungen.map((b) => b.typ)).toEqual(['spende', 'sweep']);
    expect(ergebnis.widmung?.version).toBe(1);
  });

  it('Poolwert-Invariante: Topfwert-Zuwachs entspricht dem Spendenbetrag (±1 Cent Anzeige-Rundung)', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n });
    const e = await createTestEinrichtung({ topfCent: 37_500n });
    const ergebnis = await spendeVermoegen(e.slug, 4_000n);
    const zuwachs = ergebnis.topfwertNachherCent - ergebnis.topfwertVorherCent;
    expect(Math.abs(zuwachs - 4_000)).toBeLessThanOrEqual(1);
  });

  it('erste Spende in leeren Pool nutzt den Bootstrap-Kurs', async () => {
    await seedKontenstand();
    const e = await createTestEinrichtung({ topfCent: 0n });
    await spendeVermoegen(e.slug, 500n);
    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(zeile.anteile).toBe(500n * ANTEILS_EINHEITEN_PRO_CENT);
  });

  it('meldet Meilensteine über den Topfwert-Sprung', async () => {
    await seedKontenstand();
    const e = await createTestEinrichtung({ topfCent: 900n, zielKapitalCent: 10_000n }); // 9 % vom Ziel
    const ergebnis = await spendeVermoegen(e.slug, 200n); // → 11 %: Bronze (10 %)
    expect(ergebnis.erreichteMeilensteine).toContain('Bronze erreicht');
  });

  it('lehnt Betrag <= 0, unbekannten Slug und geschlossene Einrichtungen ab', async () => {
    await seedKontenstand();
    const e = await createTestEinrichtung({ geschlossenAm: new Date() });
    await expect(spendeVermoegen(e.slug, 100n)).rejects.toThrow(EinrichtungGeschlossenError);
    await expect(spendeVermoegen('gibt-es-nicht', 100n)).rejects.toThrow();
    const offen = await createTestEinrichtung();
    await expect(spendeVermoegen(offen.slug, 0n)).rejects.toThrow(UngueltigeZuwendungError);
  });
});

describe('spendeAnSoli', () => {
  it('bucht auf das Soli-Verrechnungskonto, dokumentiert Widmung, sweept gegen den Soli-Fonds', async () => {
    await seedKontenstand({ soliDepotCent: 100_000n });
    const ergebnis = await spendeAnSoli(10_000n);
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    // Soli-Fonds 110.000; Ziel 1.100, Schwelle 1.320: investierbar 10.000 > 1.320 → Kauf 8.900
    expect(k.soliVerrechnungskontoCent).toBe(1_100n);
    expect(k.soliDepotCent).toBe(108_900n);
    expect(ergebnis.soliFondsCent).toBe(110_000);
    const z = await prisma.zuwendung.findFirstOrThrow();
    expect(z.einrichtungId).toBeNull();
    expect(z.verwendungsart).toBe('vermoegen'); // Soli kennt keine Direktausschüttung
    const typen = (await prisma.buchung.findMany()).map((b) => b.typ).sort();
    expect(typen).toEqual(['soli_spende', 'soli_sweep']);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/spendenService.test.ts`
Expected: FAIL — Modul fehlt

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/server/spendenService.ts
// Spendeneingang (Spec §3.1): zwei Merkmale — Empfänger (Einrichtung | Soli)
// und Verwendungsart (A Vermögenszuführung | B Direktausschüttung).
// Dieser Service bucht; die Projektion (6 %-Prognose) lebt in lib/calc/.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, anteileGesamt, poolwertCent, offeneDirektausschuettungenCent, soliFondsCentAktuell, type Tx } from './kontenService';
import { kaufeAnteile, topfwertCent } from '@/lib/verrechnung/anteile';
import { sweepBetrag } from '@/lib/verrechnung/sweep';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { erreichteMeilensteine } from '@/lib/data/levels';

export class UngueltigeZuwendungError extends Error {}
export class EinrichtungGeschlossenError extends Error {}
export class DirektNichtVerfuegbarError extends Error {}
export class EinrichtungNichtGefundenError extends Error {}

export interface SpendeErgebnis {
  zuwendungId: string;
  einrichtung: { slug: string; name: string; topfwertCent: number; zielKapitalCent: number };
  topfwertVorherCent: number;
  topfwertNachherCent: number;
  erreichteMeilensteine: string[];
  widmung: { version: number; wortlaut: string } | null;
}

function pruefeBetrag(betragCent: bigint): void {
  if (betragCent <= 0n) {
    throw new UngueltigeZuwendungError('Betrag muss größer als 0 sein');
  }
}

async function ladeOffeneEinrichtung(tx: Tx, slug: string) {
  const einrichtung = await tx.einrichtung.findUnique({ where: { slug }, include: { traeger: true } });
  if (!einrichtung) throw new EinrichtungNichtGefundenError(`Keine Einrichtung mit slug ${slug}`);
  if (einrichtung.geschlossenAm) throw new EinrichtungGeschlossenError(`${slug} ist geschlossen`);
  return einrichtung;
}

async function ladeAktuelleWidmung(tx: Tx) {
  const widmung = await tx.widmungsText.findFirst({ orderBy: { version: 'desc' } });
  if (!widmung) {
    // Doku-Pflicht (Spec §3.1): ohne nachweisbaren Wortlaut keine Vermögenszuführung.
    throw new UngueltigeZuwendungError('Kein Widmungstext hinterlegt — Verwendungsart A nicht buchbar');
  }
  return widmung;
}

/** Sweep-Check fürs Einrichtungs-Depot; bucht bei Bedarf (Spec §3.2). */
async function sweepEinrichtungsDepot(tx: Tx): Promise<void> {
  const k = await ensureKontenstand(tx);
  const betrag = sweepBetrag({
    verrechnungskontoCent: k.verrechnungskontoCent,
    offeneDirektausschuettungenCent: await offeneDirektausschuettungenCent(tx),
    etfMarktwertCent: k.etfMarktwertCent,
  });
  if (betrag > 0n) {
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        verrechnungskontoCent: k.verrechnungskontoCent - betrag,
        etfMarktwertCent: k.etfMarktwertCent + betrag,
      },
    });
    await buche(tx, { typ: 'sweep', betragCent: betrag });
  }
}

/** Analoger Sweep fürs Soli-Depot (Spec §3.2 letzter Satz). */
async function sweepSoliDepot(tx: Tx): Promise<void> {
  const k = await ensureKontenstand(tx);
  const betrag = sweepBetrag({
    verrechnungskontoCent: k.soliVerrechnungskontoCent,
    offeneDirektausschuettungenCent: 0n, // durchlaufende Posten gibt es nur im Einrichtungs-Pool
    etfMarktwertCent: k.soliDepotCent,
  });
  if (betrag > 0n) {
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        soliVerrechnungskontoCent: k.soliVerrechnungskontoCent - betrag,
        soliDepotCent: k.soliDepotCent + betrag,
      },
    });
    await buche(tx, { typ: 'soli_sweep', betragCent: betrag });
  }
}

export async function spendeVermoegen(slug: string, betragCent: bigint): Promise<SpendeErgebnis> {
  pruefeBetrag(betragCent);
  return prisma.$transaction(async (tx) => {
    const einrichtung = await ladeOffeneEinrichtung(tx, slug);
    const widmung = await ladeAktuelleWidmung(tx);

    const pool = await poolwertCent(tx);
    const gesamt = await anteileGesamt(tx);
    const topfVorher = topfwertCent(einrichtung.anteile, pool, gesamt);

    const neueAnteile = kaufeAnteile(betragCent, pool, gesamt);
    await tx.einrichtung.update({
      where: { id: einrichtung.id },
      data: { anteile: einrichtung.anteile + neueAnteile },
    });
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { verrechnungskontoCent: k.verrechnungskontoCent + betragCent },
    });

    const zuwendung = await tx.zuwendung.create({
      data: {
        einrichtungId: einrichtung.id,
        betragCent,
        verwendungsart: 'vermoegen',
        widmungVersion: widmung.version,
        widmungZeitpunkt: new Date(),
      },
    });
    await buche(tx, { typ: 'spende', betragCent, einrichtungId: einrichtung.id });
    await sweepEinrichtungsDepot(tx);

    const topfNachher = topfwertCent(
      einrichtung.anteile + neueAnteile,
      pool + betragCent,
      gesamt + neueAnteile
    );

    return serialisiere({
      zuwendungId: zuwendung.id,
      einrichtung: {
        slug: einrichtung.slug,
        name: einrichtung.name,
        topfwertCent: topfNachher,
        zielKapitalCent: einrichtung.zielKapitalCent,
      },
      topfwertVorherCent: topfVorher,
      topfwertNachherCent: topfNachher,
      erreichteMeilensteine: erreichteMeilensteine(
        Number(topfVorher),
        Number(topfNachher),
        Number(einrichtung.zielKapitalCent)
      ),
      widmung: { version: widmung.version, wortlaut: widmung.wortlaut },
    });
  });
}

export async function spendeAnSoli(betragCent: bigint): Promise<{ zuwendungId: string; soliFondsCent: number }> {
  pruefeBetrag(betragCent);
  return prisma.$transaction(async (tx) => {
    const widmung = await ladeAktuelleWidmung(tx);
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { soliVerrechnungskontoCent: k.soliVerrechnungskontoCent + betragCent },
    });
    const zuwendung = await tx.zuwendung.create({
      data: {
        einrichtungId: null,
        betragCent,
        verwendungsart: 'vermoegen', // Soli-Spenden sind immer Verwendungsart A (Spec §3.1)
        widmungVersion: widmung.version,
        widmungZeitpunkt: new Date(),
      },
    });
    await buche(tx, { typ: 'soli_spende', betragCent });
    await sweepSoliDepot(tx);
    return serialisiere({
      zuwendungId: zuwendung.id,
      soliFondsCent: await soliFondsCentAktuell(tx),
    });
  });
}

export async function aktuelleWidmung(): Promise<{ version: number; wortlaut: string }> {
  return prisma.$transaction(async (tx) => {
    const w = await ladeAktuelleWidmung(tx);
    return { version: w.version, wortlaut: w.wortlaut };
  });
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/spendenService.test.ts`
Expected: PASS. Vorher die Anteils-Erwartung im ersten Test nachrechnen: `kaufeAnteile(4000, 37500 + 0, 10000×1e6)` = `divRound(4000 × 10^10, 37500)` = `divRound(4×10^13, 37500)` = 1.066.666.667 — der Wert im Test ist korrekt hergeleitet, nicht gefittet.

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): Spendeneingang Verwendungsart A — Widmungsdoku, Anteilskauf, Sweep für beide Depots"
```

---

## Task 9: Verwendungsart B + Auszahlungslauf — `spendenService` + `auszahlungsService`

**Files:**
- Modify: `stiftung-web/lib/server/spendenService.ts` (Funktion `spendeDirekt` ergänzen)
- Create: `stiftung-web/lib/server/auszahlungsService.ts`
- Test: `stiftung-web/lib/server/__tests__/direktausschuettung.test.ts`

**Interfaces:**
- Produces:
  - `spendeDirekt(slug: string, betragCent: bigint): Promise<{ zuwendungId: string; offeneDirektausschuettungenCent: number }>` — wirft `DirektNichtVerfuegbarError`, wenn der Träger nicht verifiziert ist (Spec §3.1: „Nur wählbar, wenn die Einrichtung KYC-verifiziert ist“)
  - `auszahlungslauf(): Promise<{ laufId: string | null; summeCent: number; anzahl: number }>` — `laufId null`, wenn nichts offen ist

**Buchungssemantik B (Spec §3.1 „durchlaufende Mittel“):**
- Geld der Verwendungsart B kauft **niemals Anteile** und geht **nicht in den Poolwert** ein. Es liegt als offene Zuwendung (`ausgezahltAm: null`) auf dem Verrechnungskonto (`verrechnungskontoCent += betrag`), Buchung `'direktausschuettung_eingang'`.
- Der Sweep zieht offene Posten ab (bereits in Task 4/7/8 verdrahtet) — ein Test hier beweist es end-to-end.
- `auszahlungslauf()` (monatlich, per Button): alle offenen B-Zuwendungen in einer `$transaction` als ausgezahlt markieren, `verrechnungskontoCent −= Summe`, ein `AuszahlungsLauf`-Datensatz, je Einrichtung eine Buchung `'auszahlungslauf'`.

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/direktausschuettung.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung, createTestTraeger } from './testDb';
import { spendeDirekt, spendeVermoegen, DirektNichtVerfuegbarError } from '../spendenService';
import { auszahlungslauf } from '../auszahlungsService';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('spendeDirekt (Verwendungsart B, Spec §3.1)', () => {
  it('bucht als durchlaufenden Posten: kein Anteilskauf, kein Poolwert-Beitrag', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n });
    const e = await createTestEinrichtung({ topfCent: 37_500n });
    const vorher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });

    const ergebnis = await spendeDirekt(e.slug, 3_600n);

    const nachher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(nachher.anteile).toBe(vorher.anteile); // keine Anteile
    expect(ergebnis.offeneDirektausschuettungenCent).toBe(3_600);
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(3_600n); // liegt als Verbindlichkeit auf dem Konto
    const z = await prisma.zuwendung.findFirstOrThrow();
    expect(z.verwendungsart).toBe('direkt');
    expect(z.widmungVersion).toBeNull(); // B ist keine Vermögenswidmung
    expect(z.ausgezahltAm).toBeNull();
  });

  it('verweigert B für unverifizierte Träger (hohe Hürde zum Nehmen)', async () => {
    await seedKontenstand();
    const t = await createTestTraeger({ verifiziert: false });
    const e = await createTestEinrichtung({ traegerId: t.id });
    await expect(spendeDirekt(e.slug, 1_000n)).rejects.toThrow(DirektNichtVerfuegbarError);
  });

  it('der Sweep investiert kein fremdes Geld (Spec §3.1: sonst scheitert die Auszahlung an Liquidität)', async () => {
    await seedKontenstand({ etfMarktwertCent: 37_500n });
    const e = await createTestEinrichtung({ topfCent: 37_500n });
    await spendeDirekt(e.slug, 3_600n); // 36 € durchlaufend
    await spendeVermoegen(e.slug, 400n); // investierbar 4 € bei Pool 379 € → unter Schwelle
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(4_000n); // 3.600 fremd + 400 eigen, kein Sweep
    expect(k.etfMarktwertCent).toBe(37_500n);
  });
});

describe('auszahlungslauf (monatlich gesammelt, Spec §3.1)', () => {
  it('zahlt alle offenen Posten aus, setzt das Konto zurück und protokolliert je Einrichtung', async () => {
    await seedKontenstand();
    const e1 = await createTestEinrichtung();
    const e2 = await createTestEinrichtung();
    await spendeDirekt(e1.slug, 1_000n);
    await spendeDirekt(e1.slug, 500n);
    await spendeDirekt(e2.slug, 2_000n);

    const lauf = await auszahlungslauf();
    expect(lauf.summeCent).toBe(3_500);
    expect(lauf.anzahl).toBe(3);

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(0n);
    const offene = await prisma.zuwendung.count({ where: { ausgezahltAm: null, verwendungsart: 'direkt' } });
    expect(offene).toBe(0);
    const buchungen = await prisma.buchung.findMany({ where: { typ: 'auszahlungslauf' } });
    expect(buchungen).toHaveLength(2); // eine Zeile je Einrichtung (brutto, Spec §7)
  });

  it('ohne offene Posten passiert nichts', async () => {
    await seedKontenstand();
    const lauf = await auszahlungslauf();
    expect(lauf.laufId).toBeNull();
    expect(lauf.summeCent).toBe(0);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/direktausschuettung.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementierung**

In `spendenService.ts` ergänzen:

```ts
export async function spendeDirekt(
  slug: string,
  betragCent: bigint
): Promise<{ zuwendungId: string; offeneDirektausschuettungenCent: number }> {
  pruefeBetrag(betragCent);
  return prisma.$transaction(async (tx) => {
    const einrichtung = await ladeOffeneEinrichtung(tx, slug);
    if (!einrichtung.traeger?.verifiziert) {
      // Spec §3.1: ohne verifizierten Zugang kein Konto, auf das ausgezahlt
      // werden könnte — für unverifizierte gibt es nur Verwendungsart A.
      throw new DirektNichtVerfuegbarError(`Träger von ${slug} ist nicht verifiziert`);
    }
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { verrechnungskontoCent: k.verrechnungskontoCent + betragCent },
    });
    const zuwendung = await tx.zuwendung.create({
      data: { einrichtungId: einrichtung.id, betragCent, verwendungsart: 'direkt' },
    });
    await buche(tx, { typ: 'direktausschuettung_eingang', betragCent, einrichtungId: einrichtung.id });
    return serialisiere({
      zuwendungId: zuwendung.id,
      offeneDirektausschuettungenCent: await offeneDirektausschuettungenCent(tx),
    });
  });
}
```

```ts
// stiftung-web/lib/server/auszahlungsService.ts
// Monatlicher Sammellauf (Spec §3.1 "Auszahlungsrhythmus"): Direktausschüttungen
// werden gesammelt ausgezahlt, nicht einzeln — Transaktionskosten-Logik wie
// beim Sweep. Die Zwei-Jahres-Frist des § 55 Abs. 1 Nr. 5 AO ist damit
// mit großem Abstand eingehalten.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand } from './kontenService';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export async function auszahlungslauf(): Promise<{ laufId: string | null; summeCent: number; anzahl: number }> {
  return prisma.$transaction(async (tx) => {
    const offene = await tx.zuwendung.findMany({
      where: { verwendungsart: 'direkt', ausgezahltAm: null },
    });
    if (offene.length === 0) {
      return { laufId: null, summeCent: 0, anzahl: 0 };
    }
    const summe = offene.reduce((s, z) => s + z.betragCent, 0n);
    const lauf = await tx.auszahlungsLauf.create({
      data: { summeCent: summe, anzahl: offene.length },
    });
    const jetzt = new Date();
    await tx.zuwendung.updateMany({
      where: { id: { in: offene.map((z) => z.id) } },
      data: { ausgezahltAm: jetzt, auszahlungsLaufId: lauf.id },
    });
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: { verrechnungskontoCent: k.verrechnungskontoCent - summe },
    });
    // Brutto-Protokoll (Spec §7): eine Buchung je Einrichtung.
    const jeEinrichtung = new Map<string, bigint>();
    for (const z of offene) {
      jeEinrichtung.set(z.einrichtungId!, (jeEinrichtung.get(z.einrichtungId!) ?? 0n) + z.betragCent);
    }
    for (const [einrichtungId, betragCent] of jeEinrichtung) {
      await buche(tx, { typ: 'auszahlungslauf', betragCent, einrichtungId });
    }
    return serialisiere({ laufId: lauf.id, summeCent: summe, anzahl: offene.length });
  });
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/direktausschuettung.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): Direktausschüttung als durchlaufender Posten + monatlicher Auszahlungslauf"
```

---

## Task 10: Erstbefüllung + Anlage bei Erstspende — `spendenService.spendeMitAnlage`

**Files:**
- Modify: `stiftung-web/lib/server/spendenService.ts`
- Test: `stiftung-web/lib/server/__tests__/erstbefuellung.test.ts`

**Interfaces:**
- Produces:

```ts
export interface NeueEinrichtungDaten {
  name: string;
  typ: string;       // 'tagespflege' | 'kita' | 'schule' (bestehende Werte)
  ort: string;
  kinderAnzahl: number;
}
export interface AnlageErgebnis extends SpendeErgebnis {
  dedup: boolean;               // true: Spende floss in existierenden Topf, keine Erstbefüllung
  erstbefuellungCent: number;   // 0 bei dedup
  slug: string;
}
export async function spendeMitAnlage(daten: NeueEinrichtungDaten, betragCent: bigint): Promise<AnlageErgebnis>
export async function erstbefuellungsZusageCent(spendeCent: bigint): Promise<number> // live für die UI (Stufe 1)
```

**Semantik (Spec §3.0):**
- **Stufe 1 ist reiner Browser-Zustand** — es gibt KEINE API, die eine Einrichtung ohne Spende anlegt. `spendeMitAnlage` ist Stufe 2: erst der Spendeneingang persistiert Einrichtung + Topf.
- **Dedup gegen Bestand** (Name + Ort, case-insensitiv verglichen in JS — SQLite-Prisma kann kein `mode: 'insensitive'`): bei Treffer fließt die Spende in den existierenden Topf (`spendeVermoegen`), die Erstbefüllung **entfällt**.
- Erstbefüllung `E = min(25 €, Spende, 0,5 % Soli-Fonds)` — **zum Buchungszeitpunkt** neu ermittelt, nicht der angezeigte Wert. Buchung: Soli → Einrichtungs-Depot (`Buchung 'erstbefuellung'`); Entnahme zuerst aus dem Soli-Verrechnungskonto, Rest aus dem Soli-Depot.
- Neuer Träger: `rechtsform 'unbekannt'`, `verifiziert false` — die Verwendungsart ist damit zwingend A.
- Anteilskauf für `Spende + E` gemeinsam zum Poolwert vor Zufluss; die Spende läuft als normale A-Zuwendung mit Widmung.
- `zielKapitalCent`-Default: `kinderAnzahl × 2.000 €` (`ponytail:` Produkt-Platzhalter — Zielkapital ist Produktebene, nicht Spec).
- Slug: `slugify(\`${typ}-${name}-${ort}\`)`, bei Kollision numerisches Suffix.

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/erstbefuellung.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung } from './testDb';
import { spendeMitAnlage, erstbefuellungsZusageCent } from '../spendenService';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

const DATEN = { name: 'Tagespflege Pusteblume', typ: 'tagespflege', ort: 'Kiel', kinderAnzahl: 4 };

describe('spendeMitAnlage (Spec §3.0 — Stufe 2: erst die Spende persistiert)', () => {
  it('legt Träger + Einrichtung an, bucht Erstbefüllung aus dem Soli und die Spende zusammen', async () => {
    await seedKontenstand({ soliDepotCent: 990_000n, soliVerrechnungskontoCent: 10_000n }); // Soli 10.000 €
    const ergebnis = await spendeMitAnlage(DATEN, 10_000n); // Spende 100 €

    expect(ergebnis.dedup).toBe(false);
    expect(ergebnis.erstbefuellungCent).toBe(2_500); // min(25 €, 100 €, 50 €) = Basisbetrag

    const e = await prisma.einrichtung.findUniqueOrThrow({
      where: { slug: ergebnis.slug },
      include: { traeger: true },
    });
    expect(e.traeger?.verifiziert).toBe(false);
    expect(e.traeger?.rechtsform).toBe('unbekannt');
    expect(e.zielKapitalCent).toBe(800_000n); // 4 Kinder × 2.000 €

    // Topf = Spende + Erstbefüllung = 125 €
    expect(ergebnis.topfwertNachherCent).toBe(12_500);

    // Soli hat exakt E verloren (zuerst aus dem Soli-VK entnommen)
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.soliVerrechnungskontoCent + k.soliDepotCent).toBe(997_500n);

    const typen = (await prisma.buchung.findMany()).map((b) => b.typ).sort();
    expect(typen).toContain('erstbefuellung');
    expect(typen).toContain('spende');
  });

  it('0,5 %-Grenze schützt einen kleinen Soli-Fonds (Spec §3.0: 1.000 € Fonds → 5 €)', async () => {
    await seedKontenstand({ soliDepotCent: 100_000n });
    const ergebnis = await spendeMitAnlage(DATEN, 10_000n);
    expect(ergebnis.erstbefuellungCent).toBe(500);
  });

  it('dedupliziert gegen bestehende Einrichtungen (Name + Ort, case-insensitiv) — keine Erstbefüllung', async () => {
    await seedKontenstand({ soliDepotCent: 1_000_000n });
    await createTestEinrichtung({ name: 'Tagespflege Pusteblume', ort: 'Kiel', topfCent: 5_000n });
    const ergebnis = await spendeMitAnlage({ ...DATEN, name: 'tagespflege pusteblume' }, 10_000n);
    expect(ergebnis.dedup).toBe(true);
    expect(ergebnis.erstbefuellungCent).toBe(0);
    expect(await prisma.einrichtung.count()).toBe(1); // kein zweiter Datensatz
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.soliDepotCent).toBe(1_000_000n); // Soli unangetastet
  });

  it('leerer Soli-Fonds: Anlage funktioniert, Erstbefüllung ist 0', async () => {
    await seedKontenstand();
    const ergebnis = await spendeMitAnlage(DATEN, 500n);
    expect(ergebnis.erstbefuellungCent).toBe(0);
    expect(ergebnis.topfwertNachherCent).toBe(500);
  });
});

describe('erstbefuellungsZusageCent (Stufe-1-Anzeige, live aus dem Soli-Stand)', () => {
  it('liefert die aktuelle Zusage ohne irgendetwas zu buchen', async () => {
    await seedKontenstand({ soliDepotCent: 1_000_000n });
    expect(await erstbefuellungsZusageCent(500n)).toBe(500); // Verdopplung der Kleinspende
    expect(await prisma.einrichtung.count()).toBe(0);
    expect(await prisma.buchung.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/erstbefuellung.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementierung**

In `spendenService.ts` ergänzen (Imports: `erstbefuellungCent` aus `@/lib/verrechnung/erstbefuellung`):

```ts
export interface NeueEinrichtungDaten {
  name: string;
  typ: string;
  ort: string;
  kinderAnzahl: number;
}

export interface AnlageErgebnis extends SpendeErgebnis {
  dedup: boolean;
  erstbefuellungCent: number;
  slug: string;
}

// ponytail: Zielkapital ist Produktebene (nicht Spec) — 2.000 €/Kind als
// Platzhalter, bis das Produkt eine echte Zielgrößen-Logik beschließt.
const ZIEL_CENT_PRO_KIND = 200_000n;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalisiert(text: string): string {
  return text.trim().toLowerCase();
}

/** Stufe-1-Anzeige (Spec §3.0): live aus dem Soli-Stand, bucht nichts. */
export async function erstbefuellungsZusageCent(spendeCent: bigint): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const soli = await soliFondsCentAktuell(tx);
    return Number(erstbefuellungCent(spendeCent, soli));
  });
}

export async function spendeMitAnlage(
  daten: NeueEinrichtungDaten,
  betragCent: bigint
): Promise<AnlageErgebnis> {
  pruefeBetrag(betragCent);
  if (!daten.name.trim() || !daten.ort.trim() || daten.kinderAnzahl < 1) {
    throw new UngueltigeZuwendungError('Name, Ort und Kinderzahl (>= 1) sind Pflicht');
  }

  // Dedup (Spec §3.0 "Doppelanlage"): Name + Ort, case-insensitiv. SQLite-
  // Prisma kennt kein mode:'insensitive' — bei lokaler Datenmenge ist der
  // JS-Vergleich über alle Zeilen die ehrliche, einfache Lösung. Geschlossene
  // Einrichtungen zählen nicht: ihr Name darf neu besetzt werden (§3.3).
  const alle = await prisma.einrichtung.findMany({
    where: { geschlossenAm: null },
    select: { slug: true, name: true, ort: true },
  });
  const treffer = alle.find(
    (e) => normalisiert(e.name) === normalisiert(daten.name) && normalisiert(e.ort) === normalisiert(daten.ort)
  );
  if (treffer) {
    const ergebnis = await spendeVermoegen(treffer.slug, betragCent);
    return { ...ergebnis, dedup: true, erstbefuellungCent: 0, slug: treffer.slug };
  }

  return prisma.$transaction(async (tx) => {
    const widmung = await ladeAktuelleWidmung(tx);

    // Slug mit Kollisions-Suffix
    const basis = slugify(`${daten.typ}-${daten.name}-${daten.ort}`);
    let slug = basis;
    for (let i = 2; await tx.einrichtung.findUnique({ where: { slug } }); i++) {
      slug = `${basis}-${i}`;
    }

    const traeger = await tx.traeger.create({
      data: { name: `Träger ${daten.name}`, rechtsform: 'unbekannt', gemeinnuetzig: false, verifiziert: false },
    });

    // Erstbefüllung: verbindlich ist der Stand ZUM BUCHUNGSZEITPUNKT (Spec §3.0).
    const soli = await soliFondsCentAktuell(tx);
    const e = erstbefuellungCent(betragCent, soli);

    // Anteilskauf für Spende + Erstbefüllung gemeinsam, zum Poolwert vor Zufluss.
    const pool = await poolwertCent(tx);
    const gesamt = await anteileGesamt(tx);
    const neueAnteile = kaufeAnteile(betragCent + e, pool, gesamt);

    const einrichtung = await tx.einrichtung.create({
      data: {
        slug,
        name: daten.name.trim(),
        typ: daten.typ,
        ort: daten.ort.trim(),
        kinderAnzahl: daten.kinderAnzahl,
        aktuellesKapital: Number(betragCent + e) / 100, // Legacy, fällt in Task 20
        zielKapital: Number(BigInt(daten.kinderAnzahl) * ZIEL_CENT_PRO_KIND) / 100, // Legacy
        anteile: neueAnteile,
        zielKapitalCent: BigInt(daten.kinderAnzahl) * ZIEL_CENT_PRO_KIND,
        traegerId: traeger.id,
      },
    });

    const k = await ensureKontenstand(tx);
    // Soli-Entnahme: zuerst aus dem Soli-Verrechnungskonto, Rest aus dem Depot.
    const ausVK = e < k.soliVerrechnungskontoCent ? e : k.soliVerrechnungskontoCent;
    const ausDepot = e - ausVK;
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        soliVerrechnungskontoCent: k.soliVerrechnungskontoCent - ausVK,
        soliDepotCent: k.soliDepotCent - ausDepot,
        verrechnungskontoCent: k.verrechnungskontoCent + betragCent + e,
      },
    });

    const zuwendung = await tx.zuwendung.create({
      data: {
        einrichtungId: einrichtung.id,
        betragCent,
        verwendungsart: 'vermoegen', // Träger unverifiziert → B strukturell ausgeschlossen
        widmungVersion: widmung.version,
        widmungZeitpunkt: new Date(),
      },
    });
    if (e > 0n) {
      await buche(tx, { typ: 'erstbefuellung', betragCent: e, einrichtungId: einrichtung.id });
    }
    await buche(tx, { typ: 'spende', betragCent, einrichtungId: einrichtung.id });
    await sweepEinrichtungsDepot(tx);

    const topfNachher = topfwertCent(neueAnteile, pool + betragCent + e, gesamt + neueAnteile);
    return serialisiere({
      zuwendungId: zuwendung.id,
      einrichtung: { slug, name: einrichtung.name, topfwertCent: topfNachher, zielKapitalCent: einrichtung.zielKapitalCent },
      topfwertVorherCent: 0n,
      topfwertNachherCent: topfNachher,
      erreichteMeilensteine: erreichteMeilensteine(0, Number(topfNachher), Number(einrichtung.zielKapitalCent)),
      widmung: { version: widmung.version, wortlaut: widmung.wortlaut },
      dedup: false,
      erstbefuellungCent: e,
      slug,
    });
  });
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/erstbefuellung.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): Erstbefüllung aus dem Soli-Fonds — Anlage erst bei Erstspende, Dedup, Grenzformel"
```

---

## Task 11: Schließung + Verifikation — `einrichtungenService`-Erweiterung

**Files:**
- Create: `stiftung-web/lib/server/lebenszyklusService.ts`
- Test: `stiftung-web/lib/server/__tests__/lebenszyklus.test.ts`

**Interfaces:**
- Produces:
  - `schliesseEinrichtung(slug: string): Promise<{ uebertragCent: number }>` — Spec §3.3: Fondsvolumen vollständig in den Soli-Fonds, Topf zu, raus aus dem Ranking
  - `setzeVerifikation(traegerId: string, daten: { verifiziert: boolean; gemeinnuetzig?: boolean; rechtsform?: Rechtsform }): Promise<void>` — Spielgeld-KYC; stellt Status + Rechtsform fest (die Weiche für den Auszahlungspfad, Spec §3.5)

**Buchungssemantik Schließung:** Topfwert `T` zum aktuellen Kurs ermitteln, `anteile → 0`, `etfMarktwertCent −= T`, `soliDepotCent += T`, `geschlossenAm = now`, Buchung `'schliessung'`. Der Anteilspreis der übrigen Töpfe bleibt konstant (Verkauf zum Marktwert). Doppelte Schließung ist ein Fehler.

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/lebenszyklus.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestEinrichtung, createTestTraeger } from './testDb';
import { schliesseEinrichtung, setzeVerifikation } from '../lebenszyklusService';
import { spendeVermoegen, EinrichtungGeschlossenError } from '../spendenService';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('schliesseEinrichtung (Spec §3.3)', () => {
  it('überträgt das volle Fondsvolumen in den Soli-Fonds und schließt den Topf', async () => {
    await seedKontenstand({ etfMarktwertCent: 40_000n, soliDepotCent: 10_000n });
    const bleibt = await createTestEinrichtung({ topfCent: 30_000n });
    const geht = await createTestEinrichtung({ topfCent: 10_000n });

    const ergebnis = await schliesseEinrichtung(geht.slug);
    expect(ergebnis.uebertragCent).toBe(10_000);

    const zeile = await prisma.einrichtung.findUniqueOrThrow({ where: { id: geht.id } });
    expect(zeile.anteile).toBe(0n);
    expect(zeile.geschlossenAm).not.toBeNull();

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(30_000n);
    expect(k.soliDepotCent).toBe(20_000n);

    // Kreislauf geschlossen (Spec §3.3): kein Geld verlässt das System.
    const b = await prisma.buchung.findFirstOrThrow({ where: { typ: 'schliessung' } });
    expect(b.betragCent).toBe(10_000n);
    expect(b.einrichtungId).toBe(geht.id);

    // Der Topf des Verbleibenden ist unberührt (Preis konstant).
    const andere = await prisma.einrichtung.findUniqueOrThrow({ where: { id: bleibt.id } });
    expect(andere.anteile).toBe(bleibt.anteile);
  });

  it('geschlossene Einrichtungen nehmen keine Spenden mehr an und doppelte Schließung wirft', async () => {
    await seedKontenstand({ etfMarktwertCent: 10_000n });
    const e = await createTestEinrichtung({ topfCent: 10_000n });
    await schliesseEinrichtung(e.slug);
    await expect(spendeVermoegen(e.slug, 100n)).rejects.toThrow(EinrichtungGeschlossenError);
    await expect(schliesseEinrichtung(e.slug)).rejects.toThrow(EinrichtungGeschlossenError);
  });
});

describe('setzeVerifikation (Spielgeld-KYC, Spec §3.5)', () => {
  it('stellt Status und Rechtsform am Träger fest', async () => {
    const t = await createTestTraeger({ verifiziert: false, rechtsform: 'unbekannt', gemeinnuetzig: false });
    await setzeVerifikation(t.id, { verifiziert: true, gemeinnuetzig: true, rechtsform: 'ggmbh' });
    const zeile = await prisma.traeger.findUniqueOrThrow({ where: { id: t.id } });
    expect(zeile.verifiziert).toBe(true);
    expect(zeile.rechtsform).toBe('ggmbh');
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/lebenszyklus.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/server/lebenszyklusService.ts
// Einrichtungs-Lebenszyklus: Der Soli-Fonds ist Ein- und Ausgang (Spec §3.0/§3.3) —
// neue Einrichtungen werden aus ihm erstbefüllt, geschlossene fließen in ihn zurück.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, anteileGesamt, poolwertCent } from './kontenService';
import { topfwertCent } from '@/lib/verrechnung/anteile';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { EinrichtungGeschlossenError, EinrichtungNichtGefundenError } from './spendenService';
import type { Rechtsform } from '@/lib/verrechnung/traeger';

export async function schliesseEinrichtung(slug: string): Promise<{ uebertragCent: number }> {
  return prisma.$transaction(async (tx) => {
    const einrichtung = await tx.einrichtung.findUnique({ where: { slug } });
    if (!einrichtung) throw new EinrichtungNichtGefundenError(`Keine Einrichtung mit slug ${slug}`);
    if (einrichtung.geschlossenAm) throw new EinrichtungGeschlossenError(`${slug} ist bereits geschlossen`);

    const pool = await poolwertCent(tx);
    const gesamt = await anteileGesamt(tx);
    const uebertrag = topfwertCent(einrichtung.anteile, pool, gesamt);

    await tx.einrichtung.update({
      where: { id: einrichtung.id },
      data: { anteile: 0n, geschlossenAm: new Date() },
    });
    const k = await ensureKontenstand(tx);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        etfMarktwertCent: k.etfMarktwertCent - uebertrag,
        soliDepotCent: k.soliDepotCent + uebertrag,
      },
    });
    await buche(tx, { typ: 'schliessung', betragCent: uebertrag, einrichtungId: einrichtung.id });
    return serialisiere({ uebertragCent: uebertrag });
  });
}

export async function setzeVerifikation(
  traegerId: string,
  daten: { verifiziert: boolean; gemeinnuetzig?: boolean; rechtsform?: Rechtsform }
): Promise<void> {
  await prisma.traeger.update({
    where: { id: traegerId },
    data: {
      verifiziert: daten.verifiziert,
      ...(daten.gemeinnuetzig !== undefined ? { gemeinnuetzig: daten.gemeinnuetzig } : {}),
      ...(daten.rechtsform !== undefined ? { rechtsform: daten.rechtsform } : {}),
    },
  });
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/lebenszyklus.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): Schließung in den Soli-Fonds und Spielgeld-Verifikation am Träger"
```

---

## Task 12: Kaskaden-Persistenz — `lib/server/kaskadeService.ts`

**Files:**
- Create: `stiftung-web/lib/server/kaskadeService.ts`
- Test: `stiftung-web/lib/server/__tests__/kaskadeService.test.ts`

**Interfaces:**
- Consumes: `berechneKaskade` (Task 5), `renormAnteile` (Task 2), kontenService, `erreichteMeilensteine`
- Produces:

```ts
export interface KaskadenlaufErgebnis {
  nummer: number;
  poolwertCent: number;
  soliFondsCent: number;                 // Snapshot
  direktspenden: { slug: string; name: string; cent: number }[];
  abgaben: { slug: string; name: string; cent: number; pPromille: number }[];
  managementBewegungCent: number;
  umverteilung: { slug: string; name: string; cent: number }[];
  keineVerteilungGrund: 'zuWenigEinrichtungen' | 'alleGleich' | null;
  endSoliFondsCent: number;
  endManagementKontoCent: number;
  meilensteine: { slug: string; name: string; labels: string[] }[];
}
export async function fuehreKaskadeAus(): Promise<KaskadenlaufErgebnis>
```

**Persistenz-Ablauf (eine `$transaction`):**
1. Offene Einrichtungen (`geschlossenAm: null`, `anteile > 0n` ODER `anteile == 0n` ist ok — auch leere Töpfe sind Kandidaten), Kontenstand, offene Direktausschüttungen laden. Verifikation kommt vom Träger (`traeger.verifiziert`, fehlender Träger == unverifiziert).
2. Soli-Kassenlage konsolidieren: `soliVerrechnungskontoCent → soliDepotCent` (Buchung `'soli_konsolidierung'`, falls ≠ 0) — am Stichtag wird ohnehin gehandelt.
3. `berechneKaskade` mit dem konsolidierten Snapshot.
4. Persistieren: je Einrichtung `anteile = renormAnteile(endTopfCent)`; Kontenstand `etfMarktwertCent = endEtf`, `verrechnungskontoCent = endVk`, `soliDepotCent = endSoli`, `soliVerrechnungskontoCent = 0`, `managementKontoCent = endMgmt`.
5. `Kaskadenlauf`-Zeile (`nummer` = count + 1) + Brutto-Buchungen: `'kaskade_auffuellen'` (|Wert|, nur wenn ≠ 0), je Direktspende, je Abgabe, `'kaskade_management'` (|Wert|, nur wenn ≠ 0), je Umverteilung — alle mit `kaskadenlaufId`.
6. Meilensteine aus Snapshot-Topf vs. End-Topf.

- [ ] **Step 1: Failing Test — der goldene §9-Test end-to-end über die DB**

```ts
// stiftung-web/lib/server/__tests__/kaskadeService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, seedWidmung, createTestTraeger, createTestEinrichtung } from './testDb';
import { fuehreKaskadeAus } from '../kaskadeService';
import { ANTEILS_EINHEITEN_PRO_CENT } from '@/lib/verrechnung/konstanten';

beforeEach(async () => {
  await resetDb();
  await seedWidmung();
});

describe('fuehreKaskadeAus — goldenes Spec-§9-Beispiel über die echte DB', () => {
  it('persistiert exakt die Endstände der Spec und protokolliert brutto', async () => {
    await seedKontenstand({
      etfMarktwertCent: 41_085n,
      verrechnungskontoCent: 415n,
      soliDepotCent: 30_000n,
      soliVerrechnungskontoCent: 0n,
      managementKontoCent: 100_000n,
      managementCapCent: 120_000n,
    });
    const t = await createTestTraeger();
    const A = await createTestEinrichtung({ slug: 'a', name: 'A', topfCent: 14_000n, kinderAnzahl: 5, traegerId: t.id });
    const B = await createTestEinrichtung({ slug: 'b', name: 'B', topfCent: 15_000n, kinderAnzahl: 4, traegerId: t.id });
    const C = await createTestEinrichtung({ slug: 'c', name: 'C', topfCent: 12_500n, kinderAnzahl: 5, traegerId: t.id });

    const ergebnis = await fuehreKaskadeAus();

    expect(ergebnis.nummer).toBe(1);
    expect(ergebnis.poolwertCent).toBe(41_500);
    expect(ergebnis.direktspenden.map((d) => d.cent)).toEqual([140, 150, 125]);
    expect(ergebnis.abgaben.find((a) => a.slug === 'a')!.cent).toBe(34);
    expect(ergebnis.abgaben.find((a) => a.slug === 'b')!.cent).toBe(150);
    expect(ergebnis.managementBewegungCent).toBe(302);
    // Reihenfolge folgt der Lade-Reihenfolge (orderBy slug asc).
    expect(ergebnis.umverteilung).toEqual([
      { slug: 'a', name: 'A', cent: 129 },
      { slug: 'c', name: 'C', cent: 170 },
    ]);
    expect(ergebnis.endSoliFondsCent).toBe(29_583);
    expect(ergebnis.endManagementKontoCent).toBe(100_302);

    // Renormierte Anteile == End-Töpfe zum Bootstrap-Kurs
    const a = await prisma.einrichtung.findUniqueOrThrow({ where: { id: A.id } });
    expect(a.anteile).toBe(13_955n * ANTEILS_EINHEITEN_PRO_CENT);
    const b = await prisma.einrichtung.findUniqueOrThrow({ where: { id: B.id } });
    expect(b.anteile).toBe(14_700n * ANTEILS_EINHEITEN_PRO_CENT);
    const c = await prisma.einrichtung.findUniqueOrThrow({ where: { id: C.id } });
    expect(c.anteile).toBe(12_545n * ANTEILS_EINHEITEN_PRO_CENT);

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.verrechnungskontoCent).toBe(0n);
    expect(k.etfMarktwertCent).toBe(41_200n); // 13.955 + 14.700 + 12.545
    expect(k.soliDepotCent).toBe(29_583n);
    expect(k.soliVerrechnungskontoCent).toBe(0n);
    expect(k.managementKontoCent).toBe(100_302n);

    // Brutto-Journal (Spec §7): Abgabe und Förderung als getrennte Positionen.
    const lauf = await prisma.kaskadenlauf.findFirstOrThrow({ include: { buchungen: true } });
    const typen = lauf.buchungen.map((x) => x.typ);
    expect(typen.filter((x) => x === 'kaskade_direktspende')).toHaveLength(3);
    expect(typen.filter((x) => x === 'kaskade_abgabe')).toHaveLength(2);
    expect(typen.filter((x) => x === 'kaskade_umverteilung')).toHaveLength(2);
    expect(typen).toContain('kaskade_management');
  });

  it('unverifizierte Töpfe: keine Direktspende, Abgabe ja, Umverteilung nein (Spec §3.4)', async () => {
    await seedKontenstand({
      etfMarktwertCent: 100_000n,
      soliDepotCent: 50_000n,
      managementCapCent: 100_000n,
    });
    const tv = await createTestTraeger({ verifiziert: true });
    const tu = await createTestTraeger({ verifiziert: false });
    await createTestEinrichtung({ slug: 'arm', topfCent: 10_000n, kinderAnzahl: 10, traegerId: tv.id });
    await createTestEinrichtung({ slug: 'reich', topfCent: 40_000n, kinderAnzahl: 10, traegerId: tv.id });
    await createTestEinrichtung({ slug: 'u', topfCent: 50_000n, kinderAnzahl: 10, traegerId: tu.id });

    const ergebnis = await fuehreKaskadeAus();
    expect(ergebnis.direktspenden.map((d) => d.slug).sort()).toEqual(['arm', 'reich']);
    expect(ergebnis.abgaben.find((a) => a.slug === 'u')!.cent).toBe(500);
    expect(ergebnis.umverteilung.find((u) => u.slug === 'u')).toBeUndefined();
  });

  it('konsolidiert das Soli-Verrechnungskonto vor dem Lauf und zählt Läufe hoch', async () => {
    await seedKontenstand({
      etfMarktwertCent: 20_000n,
      soliDepotCent: 9_000n,
      soliVerrechnungskontoCent: 1_000n,
    });
    const t = await createTestTraeger();
    await createTestEinrichtung({ slug: 'x', topfCent: 10_000n, kinderAnzahl: 5, traegerId: t.id });
    await createTestEinrichtung({ slug: 'y', topfCent: 10_000n, kinderAnzahl: 10, traegerId: t.id });

    const erster = await fuehreKaskadeAus();
    expect(erster.soliFondsCent).toBe(10_000); // konsolidiert: 9.000 + 1.000
    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.soliVerrechnungskontoCent).toBe(0n);

    const zweiter = await fuehreKaskadeAus();
    expect(zweiter.nummer).toBe(2);
  });

  it('geschlossene Einrichtungen nehmen nicht teil', async () => {
    await seedKontenstand({ etfMarktwertCent: 30_000n, soliDepotCent: 10_000n });
    const t = await createTestTraeger();
    await createTestEinrichtung({ slug: 'offen-1', topfCent: 10_000n, kinderAnzahl: 5, traegerId: t.id });
    await createTestEinrichtung({ slug: 'offen-2', topfCent: 20_000n, kinderAnzahl: 5, traegerId: t.id });
    await createTestEinrichtung({ slug: 'zu', topfCent: 0n, kinderAnzahl: 5, traegerId: t.id, geschlossenAm: new Date() });
    const ergebnis = await fuehreKaskadeAus();
    expect(ergebnis.direktspenden.map((d) => d.slug).sort()).toEqual(['offen-1', 'offen-2']);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/kaskadeService.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/server/kaskadeService.ts
// Jahres-Kaskade: laden → berechneKaskade (pure) → persistieren.
// Die Kaskade rechnet in Cent auf dem Snapshot; persistiert wird über
// Anteils-Renormierung (siehe renormAnteile) — die Invariante
// Σ Topf == Poolwert gilt danach exakt auf den Cent.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, offeneDirektausschuettungenCent } from './kontenService';
import { berechneKaskade } from '@/lib/verrechnung/kaskade';
import { renormAnteile } from '@/lib/verrechnung/anteile';
import { serialisiere } from '@/lib/verrechnung/serialisierung';
import { erreichteMeilensteine } from '@/lib/data/levels';

export async function fuehreKaskadeAus() {
  return prisma.$transaction(async (tx) => {
    const einrichtungen = await tx.einrichtung.findMany({
      where: { geschlossenAm: null },
      include: { traeger: true },
      // Deterministische Reihenfolge für Protokoll und Tests; cuid-Sortierung
      // wäre insertion-abhängig.
      orderBy: { slug: 'asc' },
    });
    const k = await ensureKontenstand(tx);
    const offene = await offeneDirektausschuettungenCent(tx);

    // Soli-Kassenlage konsolidieren: am Stichtag wird ohnehin gehandelt.
    if (k.soliVerrechnungskontoCent !== 0n) {
      await buche(tx, { typ: 'soli_konsolidierung', betragCent: k.soliVerrechnungskontoCent });
    }
    const soliKonsolidiert = k.soliDepotCent + k.soliVerrechnungskontoCent;

    const ergebnis = berechneKaskade({
      einrichtungen: einrichtungen.map((e) => ({
        id: e.id,
        anteile: e.anteile,
        kinder: e.kinderAnzahl,
        verifiziert: e.traeger?.verifiziert ?? false,
      })),
      etfMarktwertCent: k.etfMarktwertCent,
      verrechnungskontoCent: k.verrechnungskontoCent,
      offeneDirektausschuettungenCent: offene,
      soliFondsCent: soliKonsolidiert,
      managementKontoCent: k.managementKontoCent,
      managementCapCent: k.managementCapCent,
    });

    // Persistieren: Anteile renormieren, Konten setzen.
    for (const e of einrichtungen) {
      await tx.einrichtung.update({
        where: { id: e.id },
        data: { anteile: renormAnteile(ergebnis.endTopfCent.get(e.id)!) },
      });
    }
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        etfMarktwertCent: ergebnis.endEtfMarktwertCent,
        verrechnungskontoCent: ergebnis.endVerrechnungskontoCent,
        soliDepotCent: ergebnis.endSoliFondsCent,
        soliVerrechnungskontoCent: 0n,
        managementKontoCent: ergebnis.endManagementKontoCent,
      },
    });

    // Protokoll: Kaskadenlauf + Brutto-Buchungen (Spec §7).
    const nummer = (await tx.kaskadenlauf.count()) + 1;
    const summe = (liste: { cent: bigint }[]) => liste.reduce((s, x) => s + x.cent, 0n);
    const lauf = await tx.kaskadenlauf.create({
      data: {
        nummer,
        poolwertCent: ergebnis.snapshot.poolwertCent,
        soliFondsCent: ergebnis.snapshot.soliFondsCent,
        direktspendenCent: summe(ergebnis.direktspenden),
        abgabenCent: summe(ergebnis.abgaben),
        managementBewegungCent: ergebnis.managementBewegungCent,
        umverteilungCent: summe(ergebnis.umverteilung),
        keineVerteilungGrund: ergebnis.keineVerteilungGrund,
      },
    });
    const abs = (x: bigint) => (x < 0n ? -x : x);
    if (ergebnis.auffuellenCent !== 0n) {
      await buche(tx, { typ: 'kaskade_auffuellen', betragCent: abs(ergebnis.auffuellenCent), kaskadenlaufId: lauf.id });
    }
    for (const d of ergebnis.direktspenden) {
      await buche(tx, { typ: 'kaskade_direktspende', betragCent: d.cent, einrichtungId: d.id, kaskadenlaufId: lauf.id });
    }
    for (const a of ergebnis.abgaben) {
      await buche(tx, { typ: 'kaskade_abgabe', betragCent: a.cent, einrichtungId: a.id, kaskadenlaufId: lauf.id });
    }
    if (ergebnis.managementBewegungCent !== 0n) {
      await buche(tx, { typ: 'kaskade_management', betragCent: abs(ergebnis.managementBewegungCent), kaskadenlaufId: lauf.id });
    }
    for (const u of ergebnis.umverteilung) {
      await buche(tx, { typ: 'kaskade_umverteilung', betragCent: u.cent, einrichtungId: u.id, kaskadenlaufId: lauf.id });
    }

    // Anzeige-Daten: Namen + Meilensteine über die Jahresspanne.
    const nameVon = new Map(einrichtungen.map((e) => [e.id, { slug: e.slug, name: e.name }]));
    const meilensteine = einrichtungen
      .map((e) => ({
        slug: e.slug,
        name: e.name,
        labels: erreichteMeilensteine(
          Number(ergebnis.snapshot.topfCent.get(e.id)!),
          Number(ergebnis.endTopfCent.get(e.id)!),
          Number(e.zielKapitalCent)
        ),
      }))
      .filter((m) => m.labels.length > 0);

    const mitName = <T extends { id: string; cent: bigint }>(liste: T[]) =>
      liste.map(({ id, ...rest }) => ({ ...nameVon.get(id)!, ...rest }));

    return serialisiere({
      nummer,
      poolwertCent: ergebnis.snapshot.poolwertCent,
      soliFondsCent: ergebnis.snapshot.soliFondsCent,
      direktspenden: mitName(ergebnis.direktspenden),
      abgaben: mitName(ergebnis.abgaben),
      managementBewegungCent: ergebnis.managementBewegungCent,
      umverteilung: mitName(ergebnis.umverteilung),
      keineVerteilungGrund: ergebnis.keineVerteilungGrund,
      endSoliFondsCent: ergebnis.endSoliFondsCent,
      endManagementKontoCent: ergebnis.endManagementKontoCent,
      meilensteine,
    });
  });
}

export type KaskadenlaufErgebnis = Awaited<ReturnType<typeof fuehreKaskadeAus>>;

/** Historie für die Statistik-Seite: neueste zuerst, reine Leseliste. */
export async function kaskadenlaeufe() {
  const laeufe = await prisma.kaskadenlauf.findMany({ orderBy: { nummer: 'desc' } });
  return serialisiere(laeufe);
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/kaskadeService.test.ts`
Expected: PASS — der goldene Test beweist Spec-Treue end-to-end über die echte SQLite-DB.

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): Kaskaden-Persistenz — Renormierung, Kaskadenlauf-Protokoll, Brutto-Journal"
```

---

## Task 13: Marktsimulation — `lib/server/marktService.ts`

**Files:**
- Create: `stiftung-web/lib/server/marktService.ts`
- Test: `stiftung-web/lib/server/__tests__/marktService.test.ts`

**Interfaces:**
- Produces: `simuliereMarktjahr(): Promise<{ einrichtungsDepotDeltaCent: number; soliDepotDeltaCent: number; poolwertCent: number; soliFondsCent: number }>`

**Semantik:** Ersetzt die alte 6 %-Ertragsbuchung. Die Marktsimulation ist **Kurs**, keine Buchung: beide ETF-Depots wachsen um 7 % brutto (kaufmännisch gerundet, `divRound(x × 107, 100) − x`), Cash-Konten bleiben unverändert, **kein einziger Topf wird geschrieben** (Spec §2: „Kursbewegung → null Schreibvorgänge“). Buchungen `'kurs_einrichtungsdepot'` / `'kurs_soli'` mit dem Delta (Journal-Transparenz). Zusammen mit der Kaskade (1 % Ausschüttung) ergibt das die kanonischen ~6 % netto — die Konstante 7 % kommt aus `MARKT_BRUTTO_RENDITE`; die Kaskade selbst bleibt ertragsblind.

- [ ] **Step 1: Failing Tests**

```ts
// stiftung-web/lib/server/__tests__/marktService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prismaClient';
import { resetDb, seedKontenstand, createTestEinrichtung } from './testDb';
import { simuliereMarktjahr } from '../marktService';

beforeEach(resetDb);

describe('simuliereMarktjahr', () => {
  it('hebt beide Depots um 7 % brutto, lässt Cash und Anteile unangetastet', async () => {
    await seedKontenstand({
      etfMarktwertCent: 100_000n,
      verrechnungskontoCent: 1_000n,
      soliDepotCent: 50_000n,
      soliVerrechnungskontoCent: 500n,
    });
    const e = await createTestEinrichtung({ topfCent: 100_000n });
    const anteileVorher = (await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } })).anteile;

    const ergebnis = await simuliereMarktjahr();
    expect(ergebnis.einrichtungsDepotDeltaCent).toBe(7_000);
    expect(ergebnis.soliDepotDeltaCent).toBe(3_500);

    const k = await prisma.kontenstand.findUniqueOrThrow({ where: { id: 'main' } });
    expect(k.etfMarktwertCent).toBe(107_000n);
    expect(k.soliDepotCent).toBe(53_500n);
    expect(k.verrechnungskontoCent).toBe(1_000n); // Cash verzinst nicht
    expect(k.soliVerrechnungskontoCent).toBe(500n);

    // Kursbewegung == null Schreibvorgänge auf Töpfen (Spec §2).
    const nachher = await prisma.einrichtung.findUniqueOrThrow({ where: { id: e.id } });
    expect(nachher.anteile).toBe(anteileVorher);

    const typen = (await prisma.buchung.findMany()).map((b) => b.typ).sort();
    expect(typen).toEqual(['kurs_einrichtungsdepot', 'kurs_soli']);
  });

  it('rundet kaufmännisch (10,01 € × 7 % = 70,07 Cent → 70 Cent)', async () => {
    await seedKontenstand({ etfMarktwertCent: 1_001n });
    const ergebnis = await simuliereMarktjahr();
    expect(ergebnis.einrichtungsDepotDeltaCent).toBe(70);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/marktService.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementierung**

```ts
// stiftung-web/lib/server/marktService.ts
// Marktjahr-Simulation: Kurs, keine Buchungsregel. Beide ETF-Depots wachsen
// um MARKT_BRUTTO_RENDITE (kanonische Projektionsannahme: 7 % brutto, 1 %
// Ausschüttung via Kaskade, ~6 % netto). Töpfe werden NICHT geschrieben —
// ihr Euro-Wert entsteht beim Lesen (Spec §2). Die Kaskade bleibt ertragsblind.
import { prisma } from './prismaClient';
import { buche, ensureKontenstand, offeneDirektausschuettungenCent } from './kontenService';
import { anteilVon } from '@/lib/verrechnung/geld';
import { MARKT_BRUTTO_RENDITE_SATZ } from '@/lib/verrechnung/konstanten';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

export async function simuliereMarktjahr() {
  return prisma.$transaction(async (tx) => {
    const k = await ensureKontenstand(tx);
    const deltaEinrichtung = anteilVon(k.etfMarktwertCent, MARKT_BRUTTO_RENDITE_SATZ);
    const deltaSoli = anteilVon(k.soliDepotCent, MARKT_BRUTTO_RENDITE_SATZ);
    await tx.kontenstand.update({
      where: { id: 'main' },
      data: {
        etfMarktwertCent: k.etfMarktwertCent + deltaEinrichtung,
        soliDepotCent: k.soliDepotCent + deltaSoli,
      },
    });
    if (deltaEinrichtung !== 0n) {
      await buche(tx, { typ: 'kurs_einrichtungsdepot', betragCent: deltaEinrichtung });
    }
    if (deltaSoli !== 0n) {
      await buche(tx, { typ: 'kurs_soli', betragCent: deltaSoli });
    }
    const offene = await offeneDirektausschuettungenCent(tx);
    return serialisiere({
      einrichtungsDepotDeltaCent: deltaEinrichtung,
      soliDepotDeltaCent: deltaSoli,
      poolwertCent: k.etfMarktwertCent + deltaEinrichtung + k.verrechnungskontoCent - offene,
      soliFondsCent: k.soliDepotCent + deltaSoli + k.soliVerrechnungskontoCent,
    });
  });
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `cd stiftung-web && npx vitest run lib/server/__tests__/marktService.test.ts`
Expected: PASS

- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web/lib/server
git commit -m "feat(server): Marktjahr-Simulation — 7 % Kurs auf beide Depots, null Topf-Schreibvorgänge"
```

---

# Phase C — API + UI-Flip + Abriss

**Stil-Hinweis für Phase C:** Die UI-Tasks folgen dem in diesem Repo etablierten Muster (Build-Plan Tasks 25–36): exakte Datei-Listen, verbindliche Props-Kontrakte, wörtliche Copy, vollständiger Code für alles Rechnende und für jede neue Komponente — bei reinen JSX-Umbauten bestehender Komponenten beschreiben Akzeptanzkriterien + Kern-Snippets den Zielzustand präzise. Copy IMMER in Du-Form; Cent-Werte werden ausschließlich mit `formatEuroFromCent()` formatiert; User-Euro-Eingaben (Slider, Presets) bleiben Euro und nutzen weiterhin `formatEuro()`. **Konvention: Jedes Feld mit Suffix `Cent` trägt Cent; alles andere Euro.**

---

## Task 14: Lese-Service + neue API-Routen

**Files:**
- Create: `stiftung-web/lib/server/uebersichtService.ts`
- Modify: `stiftung-web/lib/calc/format.ts` (Funktion `formatEuroFromCent` ergänzen)
- Create: `stiftung-web/app/api/erstbefuellung/route.ts`
- Create: `stiftung-web/app/api/simulation/marktjahr/route.ts`
- Create: `stiftung-web/app/api/simulation/jahresabschluss/route.ts`
- Create: `stiftung-web/app/api/auszahlungen/lauf/route.ts`
- Create: `stiftung-web/app/api/management/cap/route.ts`
- Create: `stiftung-web/app/api/einrichtungen/[slug]/schliessen/route.ts`
- Create: `stiftung-web/app/api/traeger/[id]/verifikation/route.ts`
- Modify: `stiftung-web/app/api/einrichtungen/route.ts` (GET auf neue Form + POST Anlage-bei-Erstspende)
- Modify: `stiftung-web/app/api/einrichtungen/[slug]/route.ts` (GET auf neue Form)
- Modify: `stiftung-web/app/api/solidaritaetsfonds/route.ts` (GET liefert KontenLage)
- Modify: `stiftung-web/app/api/solidaritaetsfonds/spenden/route.ts` (POST `betragCent`)
- Test: `stiftung-web/lib/server/__tests__/uebersichtService.test.ts`, `stiftung-web/app/api/__tests__/neueRouten.test.ts`, `stiftung-web/lib/calc/__tests__/format.test.ts` (erweitern)

**Nicht anfassen (bleiben bis zum jeweiligen UI-Flip):** `POST /api/einrichtungen/[slug]/spenden` (Task 16), `GET /api/spenden/letzte` (Task 19), `GET /api/statistik` (Task 19), `POST /api/solidaritaetsfonds/verteilen` + `POST /api/simulation/jahr` (Löschung in Task 20).

**Interfaces:**
- Produces (Vertrag für Task 15–19):

```ts
// lib/calc/format.ts
export function formatEuroFromCent(cent: number): string; // == formatEuro(cent / 100)

// lib/server/uebersichtService.ts
export interface EinrichtungMitTopf {
  id: string; slug: string; name: string; typ: string; ort: string;
  kinderAnzahl: number;
  topfwertCent: number;
  zielKapitalCent: number;
  foerderungProKindCent: number;      // topfwert / kinder, kaufmännisch
  verifiziert: boolean;
  auszahlungspfad: 'mittelweitergabe' | 'foerderguthaben';
  rechtsformLabel: string;
  traegerName: string | null;
  traegerId: string | null;
}
export async function listEinrichtungenMitTopf(): Promise<EinrichtungMitTopf[]>; // nur offene, orderBy name
export interface EinrichtungDetail extends EinrichtungMitTopf {
  anzahlUnterstuetzungen: number;     // Zufluss-Buchungen: spende | erstbefuellung | kaskade_umverteilung
  buchungen: { id: string; typ: string; betragCent: number; createdAt: Date }[]; // letzte 10, neueste zuerst
}
export async function einrichtungDetail(slug: string): Promise<EinrichtungDetail | null>; // null: Seite entscheidet über notFound()
```

**Implementierung `uebersichtService.ts` (vollständig):**

```ts
// stiftung-web/lib/server/uebersichtService.ts
// Lese-Schicht der neuen Welt: Topfwerte entstehen beim Lesen aus Anteilen
// (Spec §2). Liefert ausschließlich serialisierte Cent-number-Objekte.
import { prisma } from './prismaClient';
import { anteileGesamt, poolwertCent, type Tx } from './kontenService';
import { topfwertCent } from '@/lib/verrechnung/anteile';
import { divRound } from '@/lib/verrechnung/geld';
import { auszahlungspfad, RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';
import { serialisiere } from '@/lib/verrechnung/serialisierung';

const ZUFLUSS_TYPEN = ['spende', 'erstbefuellung', 'kaskade_umverteilung'];

type EinrichtungMitTraeger = Awaited<ReturnType<typeof ladeOffene>>[number];

async function ladeOffene(tx: Tx) {
  return tx.einrichtung.findMany({
    where: { geschlossenAm: null },
    include: { traeger: true },
    orderBy: { name: 'asc' },
  });
}

function mitTopf(e: EinrichtungMitTraeger, pool: bigint, gesamt: bigint) {
  const topf = topfwertCent(e.anteile, pool, gesamt);
  const rechtsform = (e.traeger?.rechtsform ?? 'unbekannt') as Rechtsform;
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    typ: e.typ,
    ort: e.ort,
    kinderAnzahl: e.kinderAnzahl,
    topfwertCent: topf,
    zielKapitalCent: e.zielKapitalCent,
    foerderungProKindCent: e.kinderAnzahl > 0 ? divRound(topf, BigInt(e.kinderAnzahl)) : 0n,
    verifiziert: e.traeger?.verifiziert ?? false,
    auszahlungspfad: auszahlungspfad({ rechtsform, gemeinnuetzig: e.traeger?.gemeinnuetzig ?? false }),
    rechtsformLabel: RECHTSFORM_LABELS[rechtsform],
    traegerName: e.traeger?.name ?? null,
    traegerId: e.traeger?.id ?? null,
  };
}

export async function listEinrichtungenMitTopf() {
  return prisma.$transaction(async (tx) => {
    const [alle, pool, gesamt] = [await ladeOffene(tx), await poolwertCent(tx), await anteileGesamt(tx)];
    return serialisiere(alle.map((e) => mitTopf(e, pool, gesamt)));
  });
}
export type EinrichtungMitTopf = Awaited<ReturnType<typeof listEinrichtungenMitTopf>>[number];

export async function einrichtungDetail(slug: string) {
  return prisma.$transaction(async (tx) => {
    const e = await tx.einrichtung.findUnique({ where: { slug }, include: { traeger: true } });
    if (!e || e.geschlossenAm) return null;
    const [pool, gesamt] = [await poolwertCent(tx), await anteileGesamt(tx)];
    const [buchungen, anzahlUnterstuetzungen] = await Promise.all([
      tx.buchung.findMany({
        where: { einrichtungId: e.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // id-Tiebreaker wie bisher (ms-Kollisionen)
        take: 10,
      }),
      tx.buchung.count({ where: { einrichtungId: e.id, typ: { in: ZUFLUSS_TYPEN } } }),
    ]);
    return serialisiere({
      ...mitTopf(e, pool, gesamt),
      anzahlUnterstuetzungen,
      buchungen: buchungen.map((b) => ({ id: b.id, typ: b.typ, betragCent: b.betragCent, createdAt: b.createdAt })),
    });
  });
}
export type EinrichtungDetail = NonNullable<Awaited<ReturnType<typeof einrichtungDetail>>>;
```

**Routen-Muster (vollständig für die drei nicht-trivialen; die Button-Routen `marktjahr`/`jahresabschluss`/`lauf` sind identisch geformte POST-ohne-Body-Wrapper um `simuliereMarktjahr()`/`fuehreKaskadeAus()`/`auszahlungslauf()` mit Status 201):**

```ts
// stiftung-web/app/api/einrichtungen/route.ts
import { NextResponse } from 'next/server';
import { listEinrichtungenMitTopf } from '@/lib/server/uebersichtService';
import { spendeMitAnlage, UngueltigeZuwendungError } from '@/lib/server/spendenService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await listEinrichtungenMitTopf());
}

// Anlage bei Erstspende (Spec §3.0, Stufe 2): erst die Spende persistiert.
export async function POST(request: Request) {
  const body = await request.json();
  const betragCent = Number(body.betragCent);
  const kinderAnzahl = Number(body.kinderAnzahl);
  if (!Number.isSafeInteger(betragCent) || betragCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  if (!Number.isSafeInteger(kinderAnzahl) || kinderAnzahl < 1) {
    return NextResponse.json({ error: 'invalid_kinderanzahl' }, { status: 400 });
  }
  try {
    const ergebnis = await spendeMitAnlage(
      { name: String(body.name ?? ''), typ: String(body.typ ?? 'kita'), ort: String(body.ort ?? ''), kinderAnzahl },
      BigInt(betragCent)
    );
    return NextResponse.json(ergebnis, { status: 201 });
  } catch (err) {
    if (err instanceof UngueltigeZuwendungError) {
      return NextResponse.json({ error: 'invalid_anlage' }, { status: 400 });
    }
    throw err;
  }
}
```

```ts
// stiftung-web/app/api/erstbefuellung/route.ts
// Stufe-1-Zusage (Spec §3.0): live aus dem Soli-Stand, bucht nichts.
import { NextResponse } from 'next/server';
import { erstbefuellungsZusageCent } from '@/lib/server/spendenService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const spendeCent = Number(new URL(request.url).searchParams.get('spendeCent'));
  if (!Number.isSafeInteger(spendeCent) || spendeCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  return NextResponse.json({ zusageCent: await erstbefuellungsZusageCent(BigInt(spendeCent)) });
}
```

```ts
// stiftung-web/app/api/management/cap/route.ts
// Cap-Beschluss (Spec §8): muss vor dem Stichtagslauf feststehen.
import { NextResponse } from 'next/server';
import { setManagementCap, kontenLage } from '@/lib/server/kontenService';

export async function PUT(request: Request) {
  const body = await request.json();
  const capCent = Number(body.capCent);
  if (!Number.isSafeInteger(capCent) || capCent < 0) {
    return NextResponse.json({ error: 'invalid_cap' }, { status: 400 });
  }
  await setManagementCap(BigInt(capCent));
  return NextResponse.json(await kontenLage());
}
```

Weitere Umbauten: `GET /api/solidaritaetsfonds` → `NextResponse.json(await kontenLage())`; `POST /api/solidaritaetsfonds/spenden` → Body `{ betragCent }`, Safe-Integer-Validierung, `spendeAnSoli(BigInt(betragCent))`, Fehler-Mapping `UngueltigeZuwendungError → 400 invalid_betrag`; `GET /api/einrichtungen/[slug]` → `einrichtungDetail(slug)` mit 404 bei `null`; `POST .../schliessen` → `schliesseEinrichtung`, 404/409-Mapping (`EinrichtungNichtGefundenError` → 404, `EinrichtungGeschlossenError` → 409); `POST /api/traeger/[id]/verifikation` → Body `{ verifiziert, gemeinnuetzig?, rechtsform? }`, `rechtsform` gegen `RECHTSFORM_LABELS`-Keys validieren.

- [ ] **Step 1: Tests schreiben (failing):** `formatEuroFromCent(1395500) === '13.955,00 €'`-artige Fälle in `format.test.ts`; `uebersichtService.test.ts` (mit `resetDb`/`seedKontenstand`/`createTestEinrichtung`): Topfwert-Berechnung bei Kurs ≠ 1 (ETF × 1,07 → `topfwertCent` wächst ohne Anteils-Schreibvorgang), `auszahlungspfad`-Felder, geschlossene fehlen in der Liste, `einrichtungDetail('nix') === null`, Zufluss-Zählung; `neueRouten.test.ts` ruft die Handler direkt (Muster der bestehenden Route-Tests): POST Anlage 201 + dedup-Fall, GET erstbefuellung 200/400, PUT cap 200/400, POST schliessen 409 bei Doppelt, POST verifikation 200.
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Implementieren (Code oben + Wrapper-Routen).
- [ ] **Step 4:** Tests laufen lassen → PASS.
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web
git commit -m "feat(api): Lese-Service und Routen der neuen Welt — Anlage, Erstbefüllung, Kaskade, Cap, Verifikation"
```

---

## Task 15: UI-Flip Einrichtungs-Liste

**Files:**
- Modify: `stiftung-web/app/einrichtungen/page.tsx`
- Modify: `stiftung-web/components/EinrichtungenFilter.tsx`
- Test: `stiftung-web/components/__tests__/EinrichtungenFilter.test.tsx` (umschreiben)

**Akzeptanzkriterien:**
- `page.tsx` lädt über `listEinrichtungenMitTopf()` (statt `listEinrichtungen()`); Empty-State („Noch keine Einrichtungen") bleibt; `loading.tsx`/`error.tsx` unverändert.
- `EinrichtungenFilter`-Props-Interface wird ersetzt durch `EinrichtungMitTopf` aus dem Service (Cent-Felder). ProgressBar-Label: `` `${formatEuroFromCent(e.topfwertCent)} von ${formatEuroFromCent(e.zielKapitalCent)}` `` — `value={e.topfwertCent} max={e.zielKapitalCent}` (ratio-sicher).
- Jede Karte zeigt zwei neue StatusChips: Verifikationsstatus (`verifiziert` → `tone="positive"`, Text „Zugang abgeholt"; sonst `tone="muted"`, Text „Zugang noch nicht abgeholt") und Auszahlungspfad (`mittelweitergabe` → „Mittelweitergabe (§ 58 AO)", `foerderguthaben` → „Förderguthaben (§ 57 AO)", beide `tone="forecast"`).
- Link-Karte auf `/einrichtungen/neu` als letzte Kachel: „Deine Einrichtung fehlt? Leg sie an — sobald du spendest, hilft der Solidaritätsfonds mit." (Flow kommt in Task 17; die Kachel verlinkt schon jetzt).
- `WachstumsIllustration` erhält `aktuellesKapital={e.topfwertCent} zielKapital={e.zielKapitalCent}` (ratio-basiert, Props-NAMEN bleiben — Umbenennung wäre reine Churn).

- [ ] **Step 1:** `EinrichtungenFilter.test.tsx` umschreiben (failing): Fixtures mit Cent-Feldern (`topfwertCent: 300000`), Assertions `'3.000,00 € von 25.000,00 €'`, Chip-Texte „Zugang abgeholt"/„Förderguthaben (§ 57 AO)", Filter-Verhalten (Suche + Typ) unverändert grün.
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Filter + Page umbauen (Interface ersetzen, Labels via `formatEuroFromCent`, Chips ergänzen, Kachel-Link).
- [ ] **Step 4:** Tests laufen lassen → PASS. Browser-Smoke: `npm run dev` → `/einrichtungen` zeigt Cent-korrekte Beträge (3.000,00 €, nicht 300.000,00 €).
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web
git commit -m "feat(ui): Einrichtungs-Liste auf Topfwerte, Verifikations- und Pfad-Chips umgestellt"
```

---

## Task 16: UI-Flip Detailseite + Spendenstrecke (Verwendungsart A/B, Widmung)

**Files:**
- Modify: `stiftung-web/app/einrichtungen/[slug]/page.tsx`
- Modify: `stiftung-web/components/SpendenRechner.tsx`
- Modify: `stiftung-web/components/SpendenBestaetigung.tsx`
- Create: `stiftung-web/components/TraegerPanel.tsx`
- Modify: `stiftung-web/app/api/einrichtungen/[slug]/spenden/route.ts`
- Test: `stiftung-web/app/einrichtungen/[slug]/__tests__/page.test.tsx`, `components/__tests__/SpendenRechner.test.tsx`, `components/__tests__/SpendenBestaetigung.test.tsx`, `app/api/einrichtungen/[slug]/spenden/__tests__/route.test.ts` (alle umschreiben)

**Props-Kontrakte (verbindlich):**

```ts
// SpendenRechner
interface EinrichtungFuerRechner {
  slug: string; name: string; typ: string; kinderAnzahl: number;
  topfwertCent: number; zielKapitalCent: number;
  verifiziert: boolean;          // steuert Verfügbarkeit von Verwendungsart B
}
// zusätzliche Prop: widmungWortlaut: string (Server lädt aktuelleWidmung())

// SpendenBestaetigung
interface SpendenBestaetigungProps {
  betragCent: number;
  frequenz: 'einmalig' | 'jaehrlich';
  verwendungsart: 'vermoegen' | 'direkt';
  einrichtungName: string;
  altesTopfwertCent: number;     // eingefrorener Vorher-Stand (Verhalten aus Fix 4027022 beibehalten)
  neuesTopfwertCent: number;
  zielKapitalCent: number;
  zuwendungId: string;
  meilensteine?: string[];
  widmungWortlaut: string | null; // nur Verwendungsart A
}
```

**Route-Umbau `POST /api/einrichtungen/[slug]/spenden`:**

```ts
import { NextResponse } from 'next/server';
import {
  spendeVermoegen, spendeDirekt,
  UngueltigeZuwendungError, EinrichtungNichtGefundenError,
  EinrichtungGeschlossenError, DirektNichtVerfuegbarError,
} from '@/lib/server/spendenService';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const body = await request.json();
  const betragCent = Number(body.betragCent);
  const verwendungsart = body.verwendungsart === 'direkt' ? 'direkt' : 'vermoegen'; // A ist Voreinstellung (Spec §3.1)
  if (!Number.isSafeInteger(betragCent) || betragCent <= 0) {
    return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
  }
  try {
    const ergebnis =
      verwendungsart === 'direkt'
        ? await spendeDirekt(params.slug, BigInt(betragCent))
        : await spendeVermoegen(params.slug, BigInt(betragCent));
    return NextResponse.json({ verwendungsart, ...ergebnis }, { status: 201 });
  } catch (err) {
    if (err instanceof EinrichtungNichtGefundenError) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (err instanceof EinrichtungGeschlossenError) return NextResponse.json({ error: 'geschlossen' }, { status: 409 });
    if (err instanceof DirektNichtVerfuegbarError) return NextResponse.json({ error: 'direkt_nicht_verfuegbar' }, { status: 409 });
    if (err instanceof UngueltigeZuwendungError) return NextResponse.json({ error: 'invalid_betrag' }, { status: 400 });
    throw err;
  }
}
```

**Akzeptanzkriterien Detailseite (`page.tsx`):**
- Lädt `einrichtungDetail(slug)` (null → `notFound()`) + `aktuelleWidmung()`.
- Kopfbereich: ProgressBar-Label mit `formatEuroFromCent`; Level-Marker via `einrichtungsLevel(detail.topfwertCent, detail.zielKapitalCent)` — Cent rein, `fehlenderBetrag` kommt in Cent zurück → `formatEuroFromCent(level.fehlenderBetrag)`. „Förderung pro Kind: `formatEuroFromCent(detail.foerderungProKindCent)`".
- Transparenz-Karte liest `detail.buchungen` statt Spenden-Historie. Label je `typ`: `spende` → „Spende", `erstbefuellung` → „Erstbefüllung aus dem Solidaritätsfonds", `kaskade_umverteilung` → „aus dem Solidaritätsfonds", `kaskade_direktspende` → „Direktförderung ausgezahlt", `kaskade_abgabe` → „Solidaritätsabgabe", `direktausschuettung_eingang` → „Direktspende (wird ausgezahlt)", `auszahlungslauf` → „Auszahlung", `schliessung` → „Schließung". Beträge `formatEuroFromCent(b.betragCent)`.
- Neues `TraegerPanel` (Client-Komponente, vollständig neu): zeigt `traegerName`, `rechtsformLabel`, Verifikations-Chip und Auszahlungspfad mit Ein-Satz-Erklärung („Der Auszahlungspfad hängt am Rechtsträger, nicht am Einrichtungstyp."). Zwei Spielgeld-Aktionen: Toggle „Zugang abholen (KYC simulieren)" → `POST /api/traeger/[id]/verifikation` (öffnet bei Aktivierung eine Rechtsform-Auswahl aus `RECHTSFORM_LABELS` + Checkbox „gemeinnützig"), danach `router.refresh()`; Button „Einrichtung schließen" mit Bestätigungs-Dialog („Der gesamte Topf — X € — geht in den Solidaritätsfonds über. Das lässt sich nicht rückgängig machen.") → `POST .../schliessen`, danach Redirect auf `/einrichtungen`. Unverifiziert zusätzlich der §3.4-Hinweis: „Dieser Topf wächst weiter und zahlt Solidaritätsabgabe, erhält aber keine Umverteilung und keine Direktförderung, bis der Zugang abgeholt ist."
- **SpendenRechner:** Alle internen Berechnungen leiten EINMAL am Komponentenkopf ab: `const topfEuro = einrichtung.topfwertCent / 100; const zielEuro = einrichtung.zielKapitalCent / 100;` — sämtliche `lib/calc/spendenrechner.ts`-Aufrufe (unverändert Euro-basiert) nutzen `topfEuro`/`zielEuro`; der User-`betrag` bleibt Euro. POST-Body: `{ betragCent: Math.round(betrag * 100), verwendungsart }`.
- Verwendungsart-Wahl (Spec §3.1 „Voreinstellung"): zwei sichtbare Radio-Karten nebeneinander, **A vorausgewählt**, nicht versteckt. Copy A: „**Dauerhaft anlegen** — deine Spende wird dem Vermögen zugeführt und fördert die Einrichtung jedes Jahr aus ihren Erträgen." Copy B: „**Direkt auszahlen** — deine Spende wird nicht angelegt, sondern gesammelt und monatlich an die Einrichtung ausgezahlt." Bei `!verifiziert` ist B deaktiviert mit Hinweis: „Erst verfügbar, wenn die Einrichtung ihren Zugang abgeholt hat." Bei gewähltem B: Projektions-Sektionen (Zukunftswert, Verkürzung, dauerhafte Förderung) ausgeblendet — eine Direktspende wächst nicht.
- Unter der A-Auswahl steht der Widmungswortlaut sichtbar (kleine Schrift, `widmungWortlaut`-Prop) mit Checkbox-freier Kenntnisnahme-Zeile: „Mit deiner Spende gibst du diese Erklärung ab." (Die Erklärung ist die Auswahl selbst; Zeitpunkt + Version speichert der Server.)
- **SpendenBestaetigung:** Cent-Props; Variante B zeigt statt Kapital-Sprung: „Deine `formatEuroFromCent(betragCent)` werden gesammelt und im nächsten Monatslauf an `einrichtungName` ausgezahlt." Variante A wie bisher (eingefrorener alter/neuer Stand, Konfetti, Meilensteine) + Beleg-Zeile mit Widmungswortlaut. Count-up-Werte laufen auf Cent-Zahlen und formatieren mit `formatEuroFromCent`.

- [ ] **Step 1:** Alle vier Test-Dateien umschreiben (failing): Route-Test — 201 A-Fall (Anteile via DB geprüft), 201 B-Fall, 409 `direkt_nicht_verfuegbar`, 409 `geschlossen`, 400; Rechner-Test — Radio-Karten (A checked default), B-disabled-Hinweis bei `verifiziert: false`, POST-Body-Assertion `betragCent`, Projektion versteckt bei B, Widmungswortlaut sichtbar; Bestätigungs-Test — A-Variante Cent-Formatierung + Widmung, B-Variante Auszahlungs-Copy; Page-Test — Buchungs-Labels, Träger-Panel, `formatEuroFromCent`-Strings (`'Förderung pro Kind: 6,00 €'`-artig mit Cent-Fixtures).
- [ ] **Step 2:** Tests laufen lassen → FAIL.
- [ ] **Step 3:** Route + Komponenten + Page umbauen wie oben.
- [ ] **Step 4:** Tests laufen lassen → PASS. Browser-Smoke: Spende A bucht und aktualisiert den Topf; Spende B erscheint als „wird ausgezahlt" in der Transparenz-Karte.
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web
git commit -m "feat(ui): Spendenstrecke mit Verwendungsart A/B, Widmungsdoku und Trägerpanel"
```

---

## Task 17: UI Neue-Einrichtung-Flow (Stufe 1 nur Browser, Stufe 2 bucht)

**Files:**
- Create: `stiftung-web/app/einrichtungen/neu/page.tsx` (Server-Wrapper, rendert Formular)
- Create: `stiftung-web/components/EinrichtungAnlegen.tsx` (Client)
- Test: `stiftung-web/components/__tests__/EinrichtungAnlegen.test.tsx`

**Akzeptanzkriterien (Spec §3.0 — jede Zeile hier ist Spec-Pflicht):**
- Das Formular (Name, Typ-Auswahl, Ort, Kinderzahl, Spendenbetrag in Euro) hält ALLES im Browser-State. Es gibt **keinen** Persistenz-Call vor der Spende — kein Draft, kein localStorage.
- Live-Zusage unterhalb des Betrags (debounced `GET /api/erstbefuellung?spendeCent=`): wörtlich „**Sobald du spendest, legt der Solidaritätsfonds `formatEuroFromCent(zusageCent)` dazu.**" — NIEMALS als „Aktueller Stand" oder Kontostand formuliert (Darstellungspflicht). Bei `zusageCent === 0`: „Der Solidaritätsfonds ist gerade leer — deine Spende legt trotzdem los."
- Hinweis-Zeile: „Verbindlich ist der Stand zum Zeitpunkt deiner Spende — der Fonds bewegt sich."
- Submit → `POST /api/einrichtungen`. Antwort `dedup: true` → eigene Ansicht: „Diese Einrichtung gibt es schon — deine Spende ist in ihren bestehenden Topf geflossen." mit Link auf `/einrichtungen/[slug]`. Sonst Erfolgs-Ansicht mit tatsächlich gebuchter Erstbefüllung (`erstbefuellungCent` aus der Response — kann von der Zusage abweichen, dann Satz: „Der Fonds-Stand hat sich seit der Anzeige bewegt — gebucht wurden `formatEuroFromCent(erstbefuellungCent)`.") und Link zur neuen Detailseite.
- Loading/Empty/Error-Zustände: Ladespinner am Zusage-Fetch, Fehlerbanner bei POST-Fehler (Formulardaten bleiben erhalten — sie leben ja nur im Browser).

- [ ] **Step 1:** Komponententest schreiben (failing; `fetch`-Stubs wie im `SolidaritaetsfondsPanel`-Test): Zusage-Copy exakt („Sobald du spendest, legt der Solidaritätsfonds 25,00 € dazu."), kein POST vor Submit, dedup-Ansicht, Abweichungs-Satz wenn `erstbefuellungCent !== zusageCent`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** PASS + Browser-Smoke (Anlage → Detailseite zeigt Topf = Spende + Erstbefüllung; zweite Anlage desselben Namens → dedup).
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web
git commit -m "feat(ui): Einrichtung anlegen — flüchtige Stufe 1, Erstbefüllungs-Zusage, Dedup bei Erstspende"
```

---

## Task 18: UI-Flip Solidaritätsfonds-Seite (Kontenlage, Marktjahr, Kaskade, Cap, Auszahlungslauf)

**Files:**
- Modify: `stiftung-web/app/solidaritaetsfonds/page.tsx`
- Modify: `stiftung-web/components/SolidaritaetsfondsPanel.tsx` (Neubau der Inhalte, Dateiname bleibt)
- Create: `stiftung-web/components/KaskadenErgebnis.tsx` (ersetzt `ZeitrafferErgebnis` für den Kaskadenlauf)
- Test: `stiftung-web/components/__tests__/SolidaritaetsfondsPanel.test.tsx`, `stiftung-web/components/__tests__/KaskadenErgebnis.test.tsx`

**Akzeptanzkriterien:**
- `page.tsx` lädt `kontenLage()` und übergibt sie dem Panel. Die Formel-Prosa der Seite wird durch die Spec-Mechanik ersetzt (die alte „Bedarf = Zielkapital ÷ Kinderanzahl − …"-Erklärung ist spec-widrig und fällt weg): drei kurze Absätze zu (1) Rangposition `p` zwischen ärmstem und reichstem Pro-Kind-Volumen (P5/P95-winsorisiert, Skala nur aus verifizierten Einrichtungen), (2) Abgabe 0–1 % nach `p`, (3) Umverteilung von 1 % des Fonds proportional zu `1 − p`. Plus Stichtags-Satz: „Der Jahresabschluss rechnet mit dem Stichtagswert — auch in einem Verlustjahr. Es wird keine Rendite gebucht, nur der Kurs gestellt."
- Panel-Kopf: Fondswert-Hero `formatEuroFromCent(lage.soliFondsCent)`; darunter eine Kontenübersicht-Tabelle (5 Zeilen: Einrichtungs-Depot, Verrechnungskonto — mit Zusatz „davon durchlaufend: X €" wenn `offeneDirektausschuettungenCent > 0` —, Soli-Depot, Soli-Verrechnungskonto, Management-Konto mit „Cap: Y €"). Poolwert als Summenzeile.
- Aktionen (je Button ein POST, danach `router.refresh()`):
  - „Spende in den Fonds" (Euro-Input → `betragCent`) → `POST /api/solidaritaetsfonds/spenden`
  - „Marktjahr simulieren (+7 % Kurs)" → `POST /api/simulation/marktjahr`; Ergebnis-Zeile: „Kurs: Einrichtungs-Depot +X €, Soli-Depot +Y € — kein einziger Topf wurde geschrieben."
  - „Jahresabschluss ausführen (Kaskade)" → `POST /api/simulation/jahresabschluss`; Ergebnis rendert `KaskadenErgebnis`
  - „Auszahlungslauf (Monat)" → `POST /api/auszahlungen/lauf`; zeigt „X € in Y Auszahlungen überwiesen" oder „Nichts offen."
  - Cap-Zeile mit Inline-Edit (Euro-Input) → `PUT /api/management/cap`
- `KaskadenErgebnis` (vollständig neue Komponente, gleiche Motion-Disziplin wie `ZeitrafferErgebnis`: Stagger mit Budget, `prefers-reduced-motion` → Sofort-Endzustand): sechs Sektionen in Kaskaden-Reihenfolge — Snapshot (Poolwert, Fonds), Direktförderung je Einrichtung, Abgaben je Einrichtung mit dem Abgabesatz („zahlt 0,24 % von 140,00 €" — Satz = `p × 1 %`, also `(pPromille / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })` %), Management-Bewegung (signiert, bei negativ: „Rückfluss in den Fonds"), Umverteilung je Einrichtung, Meilensteine mit Konfetti (bestehende `Konfetti`-Komponente). Sonderfall `keineVerteilungGrund === 'alleGleich'`: prominente Erfolgs-Karte „**Verteilungsgleichheit erreicht.** Alle Einrichtungen stehen pro Kind gleich — es gibt nichts umzuverteilen. Das 1 % bleibt im Fonds und wächst weiter." (`tone="positive"` — Erfolgsfall, kein Fehler, Spec §6). `zuWenigEinrichtungen` → nüchterner Hinweis.
- Der alte 6-%-Button, der „Fonds verteilen"-Button und `ZeitrafferErgebnis`-Verwendung fliegen aus dem Panel (Komponente `ZeitrafferErgebnis.tsx` selbst wird erst in Task 20 gelöscht, ihre Tests hier auf `KaskadenErgebnis` umgezogen).

- [ ] **Step 1:** Beide Testdateien schreiben/umschreiben (failing; `next/navigation`-Mock + reduced-motion-Stub wie bisher): Kontenübersicht rendert alle fünf Konten; Marktjahr-Button postet auf `/api/simulation/marktjahr` und zeigt die Kurs-Zeile; Kaskaden-Button rendert `KaskadenErgebnis` mit Brutto-Positionen (Fixture = goldene §9-Zahlen: „0,2 %"…„34 Cent"-Darstellungen via `formatEuroFromCent(34) === '0,34 €'`); `alleGleich`-Erfolgs-Karte; Cap-Edit postet PUT; Auszahlungslauf-Leerfall („Nichts offen.").
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** PASS + Browser-Smoke: Marktjahr → Kaskade → Statistik-Werte bewegen sich konsistent; zweimal Kaskade hintereinander → Lauf Nr. 2.
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web
git commit -m "feat(ui): Fonds-Seite mit Kontenlage, Marktjahr, Kaskadenlauf, Cap und Auszahlungslauf"
```

---

## Task 19: UI-Flip Landing, Statistik, Ticker

**Files:**
- Modify: `stiftung-web/app/page.tsx`, `stiftung-web/app/__tests__/page.test.tsx`
- Modify: `stiftung-web/app/statistik/page.tsx`
- Modify: `stiftung-web/app/api/statistik/route.ts`, `stiftung-web/app/api/spenden/letzte/route.ts`
- Modify: `stiftung-web/components/SpendenTicker.tsx`, `components/__tests__/SpendenTicker.test.tsx`
- Modify: `stiftung-web/lib/server/uebersichtService.ts` (zwei Funktionen ergänzen)
- Test: `stiftung-web/lib/server/__tests__/uebersichtService.test.ts` (erweitern)

**Service-Ergänzungen (vollständig):**

```ts
// in uebersichtService.ts ergänzen
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';
import { soliFondsCentAktuell } from './kontenService';

const TICKER_TYPEN = ['spende', 'soli_spende', 'erstbefuellung', 'kaskade_umverteilung', 'direktausschuettung_eingang'];

export async function poolStatistik() {
  return prisma.$transaction(async (tx) => {
    const [alle, pool, gesamt, soli] = [
      await ladeOffene(tx),
      await poolwertCent(tx),
      await anteileGesamt(tx),
      await soliFondsCentAktuell(tx),
    ];
    const mit = alle.map((e) => mitTopf(e, pool, gesamt));
    const ranked = [...mit].sort((a, b) => (b.foerderungProKindCent < a.foerderungProKindCent ? -1 : 1));
    const einJahrVorHeute = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const [zufluss, anzahlZuwendungen] = await Promise.all([
      tx.zuwendung.aggregate({ _sum: { betragCent: true }, where: { createdAt: { gte: einJahrVorHeute } } }),
      tx.zuwendung.count(),
    ]);
    return serialisiere({
      anzahlEinrichtungen: alle.length,
      poolwertCent: pool,
      soliFondsCent: soli,
      gesamtZielKapitalCent: alle.reduce((s, e) => s + e.zielKapitalCent, 0n),
      gesamtKinder: alle.reduce((s, e) => s + e.kinderAnzahl, 0),
      zuflussLetztesJahrCent: zufluss._sum.betragCent ?? 0n,
      anzahlZuwendungen,
      // Projektion (kanonische Annahme), kein Buchungswert: number-Mathe erlaubt.
      simulierterJahresertragCent: Math.round(Number(pool) * NET_GROWTH_RATE),
      top5: ranked.slice(0, 5),
      bottom5: ranked.slice(-5).reverse(),
    });
  });
}

export async function buchungsTicker(limit = 10) {
  const buchungen = await prisma.buchung.findMany({
    where: { typ: { in: TICKER_TYPEN } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: { einrichtung: { select: { name: true } } },
  });
  const jetzt = Date.now();
  return serialisiere(
    buchungen.map((b) => ({
      betragCent: b.betragCent,
      typ: b.typ,
      einrichtungName: b.einrichtung?.name ?? 'Solidaritätsfonds',
      vorMinuten: Math.floor((jetzt - b.createdAt.getTime()) / 60000),
      zeitpunkt: b.createdAt.getTime(), // Epoch-ms als stabiler React-Key (bewährtes Muster)
    }))
  );
}
```

**Akzeptanzkriterien:**
- Landing: Kennzahlen-Zeile aus `poolStatistik()` — „X Einrichtungen · Y Kinder · `formatEuroFromCent(poolwertCent)` Bildungskapital · Z Zuwendungen bisher"; `KennzahlHero`/`MiniBalkenwald`/`WachstumsIllustration` erhalten Cent-Werte (ratio-sicher), Geld-Formatierung via `formatEuroFromCent`. Die zwei **hartkodierten „6 %"-Literale** (Landing-Copy + Statistik-Kartentitel) werden durch `{Math.round(NET_GROWTH_RATE * 100)} %` ersetzt — eine Quelle, wie es die Global Constraints seit Task 25 verlangen.
- Statistik: Karten aus `poolStatistik()` (Ø Volumen = `poolwertCent / anzahl`, serverseitig gerundet); die Jahresabschluss-Historie wird zur **Kaskadenlauf-Historie** (`kaskadenlaeufe()` aus Task 12): Tabelle mit Nr., Poolwert, Direktförderung, Abgaben, Umverteilung, Management-Bewegung — Spalten beschriftet, Beträge `formatEuroFromCent`; `keineVerteilungGrund === 'alleGleich'` rendert einen positiven Badge „Verteilungsgleichheit". BarChart „Förderung pro Kind (€)" erhält `Math.round(foerderungProKindCent / 100)` (Achsen-Label bleibt €-wahr).
- Ticker: `GET /api/spenden/letzte` → `buchungsTicker()`; `SpendenTicker` mappt `typ` auf Labels („Spende", „Fonds-Spende", „Erstbefüllung", „Solidaritätsfonds-Verteilung", „Direktspende"); Key bleibt `zeitpunkt`-basiert (Live-Slide-in-Verhalten unverändert).
- `GET /api/statistik` → `NextResponse.json(await poolStatistik())`.

- [ ] **Step 1:** Tests umschreiben (failing): Service-Tests für `poolStatistik` (Poolwert, bottom5-Ordnung, Zufluss-Fenster) und `buchungsTicker` (Typ-Filter, Soli-Fallback-Name); Page-Test Landing mit Cent-Fixtures (`'615.800,00 €'`), Ticker-Test mit `typ`-Labels.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Verify + Commit**

```bash
cd stiftung-web && npm run verify
git add stiftung-web
git commit -m "feat(ui): Landing, Statistik und Ticker auf Poolwert, Kaskadenläufe und Buchungsjournal"
```

---

## Task 20: Abriss der Alt-Welt + Doku-Abschluss

**Files:**
- Modify: `stiftung-web/prisma/schema.prisma` — LÖSCHEN: Modelle `Spende`, `FondsSpende`, `Solidaritaetsfonds`, `Jahresabschluss`; Felder `Einrichtung.aktuellesKapital`, `Einrichtung.zielKapital`, Relation `Einrichtung.spenden`
- Delete: `stiftung-web/lib/server/simulationService.ts` + Test, `stiftung-web/lib/server/solidaritaetsfondsService.ts` + Test, `stiftung-web/lib/calc/solidaritaet.ts` + Test, `stiftung-web/lib/server/einrichtungenService.ts` + Test (alle Aufgaben sind in `uebersicht`/`spenden`/`lebenszyklus`-Services aufgegangen), `stiftung-web/components/ZeitrafferErgebnis.tsx` + Test
- Delete: `stiftung-web/app/api/simulation/jahr/` + Test, `stiftung-web/app/api/solidaritaetsfonds/verteilen/`
- Modify: `stiftung-web/prisma/seed.ts` (Legacy-Felder `aktuellesKapital`/`zielKapital` + `solidaritaetsfonds`-Upsert entfernen), `lib/server/__tests__/testDb.ts` (Legacy-Tabellen aus dem Reset, Legacy-Felder aus der Factory)
- Modify: `CLAUDE.md`, `projekt-status.md`, `stiftung-web/README.md`, `docs/verrechnungsmodell.md`, `docs/dokumenten-inventar.md`

- [ ] **Step 1: Code-Abriss.** Dateien/Modelle/Felder wie gelistet entfernen. Grep-Beweise, dass nichts mehr referenziert: `grep -rn "aktuellesKapital\|zielKapital[^C]\|FondsSpende\|Solidaritaetsfonds\|Jahresabschluss\|verteilePool\|bedarfProKind\|simuliereJahr\|ZeitrafferErgebnis" stiftung-web/app stiftung-web/components stiftung-web/lib stiftung-web/prisma` → 0 Treffer (außer ggf. `zielKapitalCent`).
- [ ] **Step 2: DB neu aufbauen.** `cd stiftung-web && npm run db:push && npm run db:seed` (lokal destruktiv — gewollt; `pretest` zieht `test.db` nach).
- [ ] **Step 3: Verify.** `cd stiftung-web && npm run verify` → Exit 0. Browser-Smoke über alle fünf Seiten inkl. einer vollen Runde: Soli-Spende → Anlage neuer Einrichtung → Spende A → Spende B → Auszahlungslauf → Marktjahr → Kaskade.
- [ ] **Step 4: Doku.**
  - `docs/verrechnungsmodell.md`: Den Warnblock „Der aktuelle Code-Stand implementiert dieses Modell **nicht**“ (Abschnitt „Kanonische Projektionsannahme“, Zeilen ~60–63) ersetzen durch: „**Implementierungsstand:** `stiftung-web/` implementiert dieses Modell seit Branch `verrechnungsmodell-umbau` (2026-07); maßgeblicher End-to-End-Beweis ist der goldene §9-Test in `lib/verrechnung/__tests__/kaskade.test.ts` und `lib/server/__tests__/kaskadeService.test.ts`.“ Ebenso den Hinweis unter „Kontenmodell“ („Betrifft den Bestand: stiftung-web kennt heute nur Einrichtung ohne Träger…“) und unter „Datentypen“ („speichert heute als Float“) auf den neuen Stand anpassen.
  - `CLAUDE.md`: Test-Reset-Regel auf den zentralen Helper umformulieren („Jede DB-Suite nutzt `resetDb()` aus `lib/server/__tests__/testDb.ts`“); den Kommandos-Block unverändert lassen.
  - `projekt-status.md`: Abschnitt „Abstand zum Zielmodell“ ersetzen durch „Zielmodell umgesetzt“ mit der Tabelle Ist == Soll (Pool-Anteile ✓, fünf Konten ✓, Abgabe ✓, P5/P95 ✓, 1 %-Umverteilung ✓, Träger ✓, Widmung ✓, Erstbefüllung ✓, Sweep ✓, Buchungsjournal ✓) und den weiterhin offenen Punkten (kein echtes Payment/KYC, Prämisse P1 ungeprüft, S8/S9 offen, kein Grundstock).
  - `stiftung-web/README.md`: Datenmodell-Abschnitt aktualisieren (Anteile, Kontenstand, Kaskade, Buchungsjournal; „Marktjahr stellt den Kurs, die Kaskade bucht ertragsblind“).
  - `docs/dokumenten-inventar.md`: Eintrag ergänzen, dass der Build-Plan-Finanzteil (2026-07-15) durch die Umsetzung dieses Plans historisch ist.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: Alt-Welt entfernt — Verrechnungsmodell ist der einzige Buchungspfad"
```

- [ ] **Step 6 (Human-Gate):** Branch fertig. KEIN Push, KEIN Merge ohne expliziten Auftrag (CLAUDE.md). Whole-Branch-Review anbieten (superpowers:requesting-code-review), dann PR nur auf Zuruf.

---

## Offene Punkte, die dieser Plan bewusst NICHT löst (nicht vergessen, nicht verstecken)

| Punkt | Wo dokumentiert | Warum offen |
|---|---|---|
| Prämisse P1 (thesaurierender ETF, § 55 AO) | Spec „Gemeinnützigkeitsrechtliche Einordnung", CLAUDE.md | Steuerberater:in, vor Gründung |
| S8 (Verkäufe nur in Ausschüttungshöhe) | Spec §7 | entscheidet ggf. über Ein-Depot-Variante |
| S9 (Empfängerfähigkeit Tagespflege) | Spec §3.1/§3.5 | vor erstem realen Abfluss |
| Grundstock-Topf (Phase 3) | Spec §1/§10 | erst zur Stiftungsumwandlung; Kontenmodell ist vorbereitet |
| Konvexe Abgabe-Kennlinie | Spec §5 „Eigenschaften" | offene Designfrage der Spec, nicht des Codes |
| Stichtags-Automatik (zweiter Freitag im Januar) | Spec §4 | lokale Demo triggert per Button |

## Self-Review-Protokoll (vom Planenden ausgeführt)

1. **Spec-Abdeckung:** §1 Kontenmodell → Task 6/7; §2 Anteile/Cent/Rundung → Task 1/2/6; §3.0 Erstbefüllung/Zweistufigkeit/Dedup/Darstellungspflicht → Task 4/10/17; §3.1 Widmung A/B/durchlaufende Posten/Monatslauf/Voreinstellung → Task 6/8/9/16; §3.2 Sweep beide Depots → Task 4/8; §3.3 Schließung → Task 11; §3.4 nicht abgeholte Töpfe → Task 3/5/12/16; §3.5 Träger/Pfade → Task 4/6/15/16; §4 Kaskade Schritte 1–6/Snapshot-Bemessung → Task 5/12; §5 p/P5/P95/verifizierte Skala → Task 3; §6 Randfälle/Erfolgsfall → Task 3/5/18; §7 brutto buchen → Task 6/12; §8 Cap/Governance → Task 5 (Schritt 5)/14/18; §9 durchgerechnetes Beispiel → goldene Tests Task 5+12; §10 Grundstock → bewusst offen (Tabelle oben). Netting (§7 „netto überweisen") ist Order-Optimierung ohne Buchungswirkung → bewusst nicht gebaut (S8 offen).
2. **Placeholder-Scan:** keine TBD/TODO; jeder Rechenpfad hat Code; UI-Tasks haben Kontrakte + wörtliche Copy.
3. **Typ-Konsistenz:** `Cent = bigint` durchgängig; `divRound(zaehler, nenner)`-Signatur in Task 1 definiert, in 3/5/13/14 identisch verwendet; `topfwertCent(anteile, poolwertCent, anteileGesamt)` in 2/5/8/11/14 identisch; `KaskadeInput`-Feldnamen in Task 5 und 12 identisch; `SpendeErgebnis` in Task 8/10/16 konsistent (`AnlageErgebnis extends SpendeErgebnis`); Fehlernamen (`DirektNichtVerfuegbarError` etc.) in 8/9/16 identisch.

**Plan-Ende.**



