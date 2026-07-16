'use client';

import { useState } from 'react';

const FARBEN = ['var(--sun)', 'var(--turquoise)', 'var(--lavender)', 'var(--coral)'];
const DRIFT_VARIANTEN = ['konfetti-partikel-a', 'konfetti-partikel-b', 'konfetti-partikel-c'];
const ANZAHL_PARTIKEL = 20;

interface Partikel {
  id: number;
  left: number;
  farbe: string;
  driftKlasse: string;
  delayMs: number;
  dauerMs: number;
}

function erzeugePartikel(): Partikel[] {
  return Array.from({ length: ANZAHL_PARTIKEL }, (_, i) => ({
    id: i,
    left: Math.round(Math.random() * 96),
    farbe: FARBEN[i % FARBEN.length],
    driftKlasse: DRIFT_VARIANTEN[i % DRIFT_VARIANTEN.length],
    delayMs: Math.round(Math.random() * 150),
    dauerMs: 700 + Math.round(Math.random() * 400),
  }));
}

/**
 * Einmaliger Konfetti-Burst beim Mounten der Bestätigung — reines CSS,
 * keine Abhängigkeiten. `useState(erzeugePartikel)` erzeugt die Partikel nur
 * beim ersten Rendern (stabile keys), Re-Renders des Elternteils (z. B. durch
 * den Kapitalstand-Count-up) starten den Burst nicht neu.
 *
 * Unter prefers-reduced-motion blendet die globale Media-Query in globals.css
 * den kompletten Container aus (`display: none`) — kein eingefrorenes
 * Partikelfeld mitten im Bild.
 */
export function Konfetti() {
  const [partikel] = useState<Partikel[]>(erzeugePartikel);

  return (
    <div className="konfetti-burst" aria-hidden="true" data-testid="konfetti">
      {partikel.map((p) => (
        <span
          key={p.id}
          className={`konfetti-partikel ${p.driftKlasse}`}
          style={{
            left: `${p.left}%`,
            background: p.farbe,
            animationDelay: `${p.delayMs}ms`,
            animationDuration: `${p.dauerMs}ms`,
          }}
        />
      ))}
    </div>
  );
}
