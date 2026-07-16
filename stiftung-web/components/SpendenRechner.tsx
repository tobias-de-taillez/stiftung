'use client';

import { useState } from 'react';
import { computeYearsToGoal } from '@/lib/calc/spendenrechner';
import { formatDuration, formatEuro } from '@/lib/calc/format';
import { currentLevel } from '@/lib/data/levels';
import { StatusChip } from './StatusChip';

interface EinrichtungFuerRechner {
  slug: string;
  name: string;
  kinderAnzahl: number;
  aktuellesKapital: number;
  zielKapital: number;
}

export function SpendenRechner({ einrichtung }: { einrichtung: EinrichtungFuerRechner }) {
  const [betrag, setBetrag] = useState(50);
  const [frequenz, setFrequenz] = useState<'einmalig' | 'jaehrlich'>('einmalig');

  const jahre = computeYearsToGoal({
    startCapital: einrichtung.aktuellesKapital,
    targetCapital: einrichtung.zielKapital,
    donation: betrag,
    frequency: frequenz,
  });

  const annualDonationPerChild = (frequenz === 'jaehrlich' ? betrag : 0) / einrichtung.kinderAnzahl;
  const level = currentLevel(annualDonationPerChild);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <label>
        <span className="eyebrow" style={{ display: 'block' }}>Spendenbetrag</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            aria-label="Spendenbetrag (Regler)"
            type="range"
            min={5}
            max={2000}
            step={5}
            value={betrag}
            onChange={(e) => setBetrag(Number(e.target.value))}
          />
          <input
            aria-label="Spendenbetrag"
            type="number"
            min={5}
            value={betrag}
            onChange={(e) => setBetrag(Number(e.target.value) || 0)}
            style={{ width: '6rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <span>€</span>
        </div>
      </label>

      <div role="group" aria-label="Spendenfrequenz" style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className={`pill ${frequenz === 'einmalig' ? 'pill-primary' : 'pill-secondary'}`} aria-pressed={frequenz === 'einmalig'} onClick={() => setFrequenz('einmalig')}>
          Einmalig
        </button>
        <button type="button" className={`pill ${frequenz === 'jaehrlich' ? 'pill-primary' : 'pill-secondary'}`} aria-pressed={frequenz === 'jaehrlich'} onClick={() => setFrequenz('jaehrlich')}>
          Jährlich
        </button>
      </div>

      <div data-testid="years-result">
        <p className="hero-number" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>{formatDuration(jahre)}</p>
        <p className="muted">bis zum Ziel von {formatEuro(einrichtung.zielKapital)}</p>
      </div>

      {level && <StatusChip tone={level.tone}>{level.name}-Spender:in</StatusChip>}
    </div>
  );
}
