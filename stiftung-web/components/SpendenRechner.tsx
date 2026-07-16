'use client';

import { useState } from 'react';
import { ANNUAL_PAYOUT_RATE, computeYearsToGoal } from '@/lib/calc/spendenrechner';
import { formatDuration, formatEuro } from '@/lib/calc/format';
import { currentLevel } from '@/lib/data/levels';
import { impactBeispiel } from '@/lib/data/impactBeispiele';
import { StatusChip } from './StatusChip';
import { SpendenBestaetigung } from './SpendenBestaetigung';

interface EinrichtungFuerRechner {
  slug: string;
  name: string;
  typ: string;
  kinderAnzahl: number;
  aktuellesKapital: number;
  zielKapital: number;
}

const BETRAG_PRESETS = [25, 50, 100, 250];

export function SpendenRechner({ einrichtung }: { einrichtung: EinrichtungFuerRechner }) {
  const [betrag, setBetrag] = useState(50);
  const [frequenz, setFrequenz] = useState<'einmalig' | 'jaehrlich'>('einmalig');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  // kapitalStand ist der jeweils aktuelle Live-Stand (startet beim Seitenlade-
  // Snapshot, wandert nach jeder erfolgreichen Spende weiter). altesKapital
  // hält den Vorher-Stand der zuletzt gebuchten Spende separat fest, damit er
  // nicht durch das Update von kapitalStand überschrieben wird, bevor die
  // Bestätigung ihn anzeigt — sonst zeigt eine zweite Spende wieder den
  // Seitenlade-Stand statt des tatsächlichen Vorher-Werts.
  const [kapitalStand, setKapitalStand] = useState(einrichtung.aktuellesKapital);
  const [altesKapital, setAltesKapital] = useState(einrichtung.aktuellesKapital);
  const [neuesKapital, setNeuesKapital] = useState<number | null>(null);
  const [spendeId, setSpendeId] = useState<string | null>(null);

  async function handleSpenden() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/einrichtungen/${einrichtung.slug}/spenden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betrag, frequenz }),
      });
      if (!res.ok) throw new Error('request_failed');
      const { einrichtung: updated, spende } = await res.json();
      setAltesKapital(kapitalStand);
      setNeuesKapital(updated.aktuellesKapital);
      setKapitalStand(updated.aktuellesKapital);
      setSpendeId(spende.id);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  const jahre = computeYearsToGoal({
    startCapital: kapitalStand,
    targetCapital: einrichtung.zielKapital,
    donation: betrag,
    frequency: frequenz,
  });

  const annualDonationPerChild = (frequenz === 'jaehrlich' ? betrag : 0) / einrichtung.kinderAnzahl;
  const level = currentLevel(annualDonationPerChild);

  // Wirkungs-Zeile: X = Spendenbetrag × ANNUAL_PAYOUT_RATE (1%) — dieselbe
  // Ausschüttungsquote, mit der auch capitalForAnnualPayout rechnet. Bei
  // "jährlich" gilt dieselbe Formel je gespendetem Betrag (nicht kumuliert
  // über die Jahre) — siehe Fußnote, die das ehrlich einordnet.
  const jahresertrag = betrag * ANNUAL_PAYOUT_RATE;
  const wirkungsBeispiel = impactBeispiel(einrichtung.typ, jahresertrag);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div role="group" aria-label="Betrag-Vorschläge" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {BETRAG_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`pill ${betrag === preset ? 'pill-primary' : 'pill-secondary'}`}
            aria-pressed={betrag === preset}
            onClick={() => setBetrag(preset)}
          >
            {preset} €
          </button>
        ))}
      </div>

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

      <div data-testid="impact-beispiel">
        <p>
          {frequenz === 'jaehrlich'
            ? `Jede deiner jährlichen Spenden erwirtschaftet je gespendetem Betrag dauerhaft ~${formatEuro(jahresertrag)}/Jahr — das ist z. B. ${wirkungsBeispiel}, jedes Jahr aufs Neue.`
            : `Deine Spende erwirtschaftet dauerhaft ~${formatEuro(jahresertrag)}/Jahr — das ist z. B. ${wirkungsBeispiel}, jedes Jahr aufs Neue.`}
        </p>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Formel: {formatEuro(betrag)} × 1 % jährliche Ausschüttungsquote = {formatEuro(jahresertrag)}/Jahr. Dein
          Spendenbetrag selbst bleibt dauerhaft im Finanztopf angelegt — ausgeschüttet wird nur dieser jährliche
          Ertrag, Jahr für Jahr aufs Neue, ohne dass das Kapital schrumpft. Die Beispiele oben stehen dafür, wofür
          solche wiederkehrenden Ausschüttungen über viele Spenden hinweg eingesetzt werden.
          {frequenz === 'jaehrlich' && ' Bei jährlicher Spende gilt diese Rechnung für jeden gespendeten Jahresbetrag erneut.'}
        </p>
      </div>

      {level && <StatusChip tone={level.tone}>{level.name}-Spender:in</StatusChip>}

      <button
        type="button"
        className="pill pill-primary"
        onClick={handleSpenden}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Wird gebucht …' : 'Jetzt spenden'}
      </button>

      {status === 'error' && (
        <p className="negative">Spende konnte nicht gebucht werden. Bitte erneut versuchen.</p>
      )}

      {status === 'done' && neuesKapital !== null && spendeId && (
        <SpendenBestaetigung
          betrag={betrag}
          frequenz={frequenz}
          einrichtungName={einrichtung.name}
          altesKapital={altesKapital}
          neuesKapital={neuesKapital}
          zielKapital={einrichtung.zielKapital}
          spendeId={spendeId}
        />
      )}
    </div>
  );
}
