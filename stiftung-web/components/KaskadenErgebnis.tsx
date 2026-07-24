'use client';

import { useEffect, useState } from 'react';
import { formatEuroFromCent } from '@/lib/calc/format';
import { prefersReducedMotion } from '@/lib/hooks/useCountUp';
import { Konfetti } from './Konfetti';
import type { KaskadenlaufErgebnis } from '@/lib/server/kaskadeService';

export type KaskadenErgebnisProps = KaskadenlaufErgebnis;

// Gesamtdauer strukturell ≤ 4 s — dieselbe Formel wie das alte
// ZeitrafferErgebnis (Task 32), hier EIGENSTÄNDIG kopiert statt importiert:
// ZeitrafferErgebnis.tsx verschwindet in Task 20, KaskadenErgebnis darf nicht
// davon abhängen.
// PHASE1_MS (900) + N × staggerInterval(N) + ABSCHLUSS_MS (400) ≤ 4000 ms
export const PHASE1_MS = 900;
export const ABSCHLUSS_MS = 400;
export const VERTEILUNG_BUDGET_MS = 2400;

/**
 * Berechnet das Stagger-Intervall zwischen gestaffelt erscheinenden
 * Einträgen/Sektionen. Bei kleinen N (≤9) bleibt es bei max. 220ms für
 * angenehmes Tempo. Bei größeren N schrumpft es proportional, um die
 * Gesamtdauer unter 4s zu halten.
 */
export function staggerInterval(anzahl: number): number {
  if (anzahl <= 0) return 0;
  return Math.min(220, Math.floor(VERTEILUNG_BUDGET_MS / anzahl));
}

// Die vier "mittleren" Sektionen (Direktförderung, Abgaben, Management,
// Umverteilung) staggern nacheinander; Snapshot (sofort) und Meilensteine
// (Finale nach ABSCHLUSS_MS-Pause) rahmen sie ein — sechs Sektionen gesamt.
const GESTAFFELTE_SEKTIONEN = 4;
const GESAMT_SEKTIONEN = 6;

function formatSatzProzent(pPromille: number): string {
  return (pPromille / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

/**
 * Inszenierte Sequenz für den Jahresabschluss (Task 18, ersetzt
 * ZeitrafferErgebnis für die Kaskade): sechs Sektionen in Kaskaden-Reihenfolge
 * (Spec §4 Schritte 1–6) erscheinen nacheinander. Reine Client-Inszenierung
 * der bereits vorhandenen API-Antwort — keine neuen Requests.
 *
 * `prefersReducedMotion()` wird einmal beim Mounten gelesen: unter
 * reduced-motion ist die gesamte Sequenz von Anfang an im Endzustand
 * (deterministisch, keine Timer).
 */
export function KaskadenErgebnis({
  poolwertCent,
  soliFondsCent,
  direktspenden,
  abgaben,
  managementBewegungCent,
  umverteilung,
  keineVerteilungGrund,
  endSoliFondsCent,
  endManagementKontoCent,
  meilensteine,
}: KaskadenErgebnisProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [sichtbar, setSichtbar] = useState(reduced ? GESAMT_SEKTIONEN : 1);

  useEffect(() => {
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stagger = staggerInterval(GESTAFFELTE_SEKTIONEN);
    for (let i = 1; i <= GESTAFFELTE_SEKTIONEN; i++) {
      const naechsterStand = 1 + i;
      timers.push(setTimeout(() => setSichtbar((s) => Math.max(s, naechsterStand)), PHASE1_MS + i * stagger));
    }
    timers.push(
      setTimeout(
        () => setSichtbar(GESAMT_SEKTIONEN),
        PHASE1_MS + GESTAFFELTE_SEKTIONEN * stagger + ABSCHLUSS_MS
      )
    );
    return () => timers.forEach(clearTimeout);
    // Nur beim Mount planen: Elternteil vergibt `key={nummer}`, jede neue
    // Kaskade erzeugt also eine frische Instanz mit eigener Sequenz.
  }, [reduced]);

  return (
    <div data-testid="kaskaden-ergebnis">
      {/* 1 — Snapshot (Schritt 1: Poolwert, Fonds vor der Kaskade) */}
      <div data-testid="kaskade-snapshot" style={{ marginTop: '1rem' }}>
        <p className="eyebrow">Stichtag — Snapshot</p>
        <p>Poolwert: {formatEuroFromCent(poolwertCent)}</p>
        <p>Solidaritätsfonds vor der Kaskade: {formatEuroFromCent(soliFondsCent)}</p>
      </div>

      {/* 2 — Direktförderung (Schritt 3) */}
      {sichtbar >= 2 && (
        <div data-testid="kaskade-direktfoerderung" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Direktförderung — 1 % je verifizierter Einrichtung</p>
          {direktspenden.length === 0 ? (
            <p className="muted">Keine verifizierten Einrichtungen — keine Direktförderung in diesem Lauf.</p>
          ) : (
            <ul>
              {direktspenden.map((d) => (
                <li key={d.slug} className="zeitraffer-eintrag">
                  {d.name}: {formatEuroFromCent(d.cent)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 3 — Solidaritätsabgabe (Schritt 4) */}
      {sichtbar >= 3 && (
        <div data-testid="kaskade-abgaben" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Solidaritätsabgabe — 0–1 % nach Rangposition p</p>
          {abgaben.length === 0 ? (
            <p className="muted">Keine Abgabe in diesem Lauf.</p>
          ) : (
            <ul>
              {abgaben.map((a) => (
                <li key={a.slug} className="zeitraffer-eintrag">
                  {a.name} zahlt {formatSatzProzent(a.pPromille)} % von {formatEuroFromCent(a.basisCent)} — {formatEuroFromCent(a.cent)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 4 — Management-Konto (Schritt 5, läuft immer) */}
      {sichtbar >= 4 && (
        <div data-testid="kaskade-management" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Management-Konto</p>
          <p>
            {`${managementBewegungCent >= 0 ? '+' : ''}${formatEuroFromCent(managementBewegungCent)}${
              managementBewegungCent < 0 ? ' — Rückfluss in den Fonds' : ''
            } (neuer Stand: ${formatEuroFromCent(endManagementKontoCent)})`}
          </p>
        </div>
      )}

      {/* 5 — Umverteilung (Schritt 6) */}
      {sichtbar >= 5 && (
        <div data-testid="kaskade-umverteilung" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Umverteilung — 1 % des Fonds, proportional zu 1 − p</p>
          {keineVerteilungGrund === 'alleGleich' ? (
            <div
              data-testid="verteilungsgleichheit-erfolg"
              className="card"
              style={{ background: 'var(--space-2)', border: '1px solid var(--turquoise)', padding: '1rem' }}
            >
              <p className="positive" style={{ margin: 0 }}>
                <strong>Verteilungsgleichheit erreicht.</strong> Alle Einrichtungen stehen pro Kind gleich — es
                gibt nichts umzuverteilen. Das 1 % bleibt im Fonds und wächst weiter.
              </p>
            </div>
          ) : keineVerteilungGrund === 'zuWenigEinrichtungen' ? (
            <p className="muted">
              Zu wenige Einrichtungen für eine Rangbildung — keine Umverteilung in diesem Lauf.
            </p>
          ) : umverteilung.length === 0 ? (
            <p className="muted">Keine Umverteilung in diesem Lauf.</p>
          ) : (
            <ul>
              {umverteilung.map((u) => (
                <li key={u.slug} className="zeitraffer-eintrag">
                  {u.name}: {formatEuroFromCent(u.cent)}
                </li>
              ))}
            </ul>
          )}
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Solidaritätsfonds nach der Kaskade: {formatEuroFromCent(endSoliFondsCent)}
          </p>
        </div>
      )}

      {/* 6 — Meilensteine (Finale) */}
      {sichtbar >= 6 && (
        <div data-testid="kaskade-meilensteine" style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Meilensteine</p>
          {meilensteine.length === 0 ? (
            <p className="muted">Keine Meilensteine in diesem Lauf.</p>
          ) : (
            <>
              <Konfetti />
              <ul>
                {meilensteine.map((m) => (
                  <li key={m.slug}>
                    {m.name}
                    {m.labels.map((label) => (
                      <span key={label} className="kaskade-meilenstein-tag"> 🎉 {label}</span>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
