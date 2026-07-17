'use client';

import { useState } from 'react';
import {
  ANNUAL_PAYOUT_RATE,
  NET_GROWTH_RATE,
  computeYearsToGoal,
  zukunftswert,
  futureValueWithAnnualDonation,
  dauerhafteJahresfoerderung,
  verkuerzungMonate,
} from '@/lib/calc/spendenrechner';
import { formatDuration, formatEuro, formatMonate } from '@/lib/calc/format';
import { currentLevel, nextLevel } from '@/lib/data/levels';
import { impactBeispiel } from '@/lib/data/impactBeispiele';
import { StatusChip } from './StatusChip';
import { ProgressBar } from './ProgressBar';
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

  // "Bei Zielerreichung" — Jahre bis zum Ziel MIT der Spende (nicht ohne),
  // wie im Task-29-Brief gefordert.
  const jahre = computeYearsToGoal({
    startCapital: kapitalStand,
    targetCapital: einrichtung.zielKapital,
    donation: betrag,
    frequency: frequenz,
  });
  const zielErreichbar = isFinite(jahre);

  // Zukunftswert MEINES Beitrags zum Zielzeitpunkt — bewusst unabhängig vom
  // Startkapital der Einrichtung (siehe zukunftswert()-Kommentar): Bei
  // "einmalig" wächst der einmalige Betrag über die Jahre; bei "jährlich"
  // ist es der Renten-Zukunftswert der wiederkehrenden Spenden (dieselbe
  // Formel wie computeYearsToGoal intern nutzt, mit Startkapital 0 aufgerufen
  // — keine Formel-Duplikation). Nur sinnvoll, wenn das Ziel erreichbar ist
  // (endliche jahre); bei Infinity würde die Formel selbst Infinity liefern.
  const zukunftswertMeinerSpende = zielErreichbar
    ? frequenz === 'jaehrlich'
      ? futureValueWithAnnualDonation(0, betrag, NET_GROWTH_RATE, jahre)
      : zukunftswert(betrag, jahre)
    : 0;

  // Verkürzung des Wegs zum Ziel durch die Spende, in Monaten (sekundäre
  // Botschaft). Bei unerreichbarem Ziel liefert die Funktion 0 (keine
  // ausweisbare Verkürzung) — wird dann ohnehin nicht angezeigt.
  const verkuerzung = verkuerzungMonate(
    { startCapital: kapitalStand, targetCapital: einrichtung.zielKapital },
    betrag,
    frequenz
  );

  // Dauerförderungs-Perspektive für den Fall, dass das Ziel unerreichbar ist
  // (Infinity darf laut Akzeptanzkriterium nie die Hauptbotschaft sein).
  // KORREKTUR aus dem Brief: Ohne definierten Zielzeitpunkt kann nur die "ab
  // sofort"-Untergrenze (jahre=0-Default) ausgewiesen werden, nicht die
  // gewachsene Ausschüttung — das wird im Text ehrlich als Untergrenze
  // benannt, die mit dem Kapital weiterwächst.
  const dauerhaftAbSofort = dauerhafteJahresfoerderung(betrag);

  // Spender-Badge (Task 30): absolute Schwellen auf den Spendenbetrag
  // selbst — unabhängig von Kinderzahl und Frequenz. Vorher war die
  // Schwelle als annualDonationPerChild definiert und griff bei
  // Einmalspenden nie (Zähler war dort immer 0) und lag bei großen
  // Einrichtungen faktisch unerreichbar hoch.
  const level = currentLevel(betrag);
  const naechstesLevel = nextLevel(betrag);

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

      {zielErreichbar ? (
        <div data-testid="zukunftswert-hero">
          <p className="hero-number" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
            {frequenz === 'jaehrlich'
              ? `Deine jährlichen ${formatEuro(betrag)} wachsen bis zur Zielerreichung zusammen auf ~${formatEuro(zukunftswertMeinerSpende)} an.`
              : `Deine ${formatEuro(betrag)} sind bei Zielerreichung auf ~${formatEuro(zukunftswertMeinerSpende)} angewachsen.`}
          </p>
          <ProgressBar
            value={zukunftswertMeinerSpende}
            max={einrichtung.zielKapital}
            label={`${formatEuro(zukunftswertMeinerSpende)} von ${formatEuro(einrichtung.zielKapital)} — dein Anteil am Ziel`}
          />
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Angenommene Netto-Wachstumsrate: {NET_GROWTH_RATE * 100} % pro Jahr, konstant bis zur
            Zielerreichung — eine Modellrechnung auf Basis des heutigen Finanzmodells, keine garantierte Prognose.
          </p>
        </div>
      ) : (
        // Fallback laut Akzeptanzkriterium: "nicht erreichbar" (Infinity)
        // erscheint nie als Hauptbotschaft — stattdessen die
        // Dauerförderungs-Perspektive (KORREKTUR: "ab sofort"-Untergrenze,
        // die mit dem Kapital weiterwächst, siehe dauerhafteJahresfoerderung()).
        <div data-testid="dauerfoerderung-perspektive">
          <p className="hero-number" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
            Dein Beitrag trägt schon ab sofort dauerhaft mit ~{formatEuro(dauerhaftAbSofort)}/Jahr bei.
          </p>
          <p className="muted">
            Diese Zahl ist eine ehrliche Untergrenze: Sie wächst mit, sobald der Finanztopf wächst — für
            dieses Ziel lässt sich der Zeitpunkt der vollen Kapitalreife derzeit nicht seriös vorhersagen.
          </p>
        </div>
      )}

      {zielErreichbar && verkuerzung > 0 && (
        <p data-testid="verkuerzung" className="muted">
          Und verkürzen den Weg zum Ziel um {formatMonate(verkuerzung)}.
        </p>
      )}

      <div data-testid="years-result">
        <p className="muted" style={{ fontSize: '0.9rem' }}>{formatDuration(jahre)} bis zum Ziel von {formatEuro(einrichtung.zielKapital)}</p>
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
      {naechstesLevel && (
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          noch {formatEuro(naechstesLevel.schwelleEuro - betrag)} bis {naechstesLevel.name}
        </p>
      )}

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
