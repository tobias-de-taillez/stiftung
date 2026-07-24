'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useTransientesErgebnis } from '@/lib/hooks/useTransientesErgebnis';

interface EinrichtungFuerRechner {
  slug: string;
  name: string;
  typ: string;
  kinderAnzahl: number;
  topfwertCent: number;
  zielKapitalCent: number;
  // Steuert die Verfügbarkeit von Verwendungsart B (Spec §3.1): ohne
  // verifizierten Träger gibt es kein Konto, auf das ausgezahlt werden könnte.
  verifiziert: boolean;
}

interface SpendenErgebnis {
  betragCent: number;
  frequenz: 'einmalig' | 'jaehrlich';
  verwendungsart: 'vermoegen' | 'direkt';
  altesTopfwertCent: number;
  neuesTopfwertCent: number;
  zuwendungId: string;
  meilensteine: string[];
}

const BETRAG_PRESETS = [25, 50, 100, 250];

export function SpendenRechner({
  einrichtung,
  widmungWortlaut,
}: {
  einrichtung: EinrichtungFuerRechner;
  widmungWortlaut: string;
}) {
  const router = useRouter();

  // Snapshot der zuletzt GEBUCHTEN Spende (Fix 4027022 beibehalten): Die
  // Bestätigung/Quittung/Share-Text zeigt diesen eingefrorenen Stand, nicht
  // die Live-States, die der Regler nach der Buchung beliebig weiterändert.
  // altes/neuesTopfwertCent kommen für Verwendungsart A direkt vom Server
  // (topfwertVorherCent/topfwertNachherCent) — kein clientseitiges Tracken
  // eines "Vorher"-Werts mehr nötig.
  // useTransientesErgebnis statt useState: Der erste router.refresh() nach
  // der Hydration remountet diesen Subtree (Next 14 + loading.tsx, siehe
  // lib/hooks/useTransientesErgebnis.ts) — plain useState ließ die gerade
  // gezeigte Bestätigung ~20 ms nach dem Erscheinen wieder verschwinden.
  // Der Slug im Key verhindert, dass die Bestätigung einer anderen
  // Einrichtung restauriert wird. Alle übrigen States unten restaurieren
  // sich aus diesem Ergebnis — es friert Betrag/Frequenz/Verwendungsart und
  // den Nachher-Topfwert der Buchung ein.
  const [ergebnis, setErgebnis] = useTransientesErgebnis<SpendenErgebnis>(`spende.${einrichtung.slug}`);

  // lib/calc/spendenrechner.ts ist Euro-basiert (unverändert) — hier EINMAL
  // am Komponentenkopf von Cent nach Euro ableiten, statt jeden Aufruf
  // einzeln umzurechnen. topfStandCent ist der LIVE-Stand (wandert nach jeder
  // erfolgreichen Verwendungsart-A-Spende weiter, damit eine zweite Spende in
  // derselben Sitzung mit dem tatsächlichen Topf statt dem Seitenlade-
  // Snapshot rechnet). Verwendungsart B kauft keine Anteile — der Topf ändert
  // sich dadurch nicht.
  const [topfStandCent, setTopfStandCent] = useState(
    ergebnis?.neuesTopfwertCent ?? einrichtung.topfwertCent
  );
  const topfEuro = topfStandCent / 100;
  const zielEuro = einrichtung.zielKapitalCent / 100;

  const [betrag, setBetrag] = useState(ergebnis ? ergebnis.betragCent / 100 : 50);
  const [frequenz, setFrequenz] = useState<'einmalig' | 'jaehrlich'>(ergebnis?.frequenz ?? 'einmalig');
  const [verwendungsart, setVerwendungsart] = useState<'vermoegen' | 'direkt'>(
    ergebnis?.verwendungsart ?? 'vermoegen'
  );
  // Nach dem Refresh-Remount mit restauriertem Ergebnis direkt im
  // done-Zustand starten, sonst bliebe die restaurierte Bestätigung
  // unsichtbar (Render-Bedingung: status === 'done' && ergebnis).
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(ergebnis ? 'done' : 'idle');

  async function handleSpenden() {
    setStatus('loading');
    try {
      const betragCent = Math.round(betrag * 100);
      const res = await fetch(`/api/einrichtungen/${einrichtung.slug}/spenden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betragCent, verwendungsart }),
      });
      if (!res.ok) throw new Error('request_failed');
      const json = await res.json();

      const neuesErgebnis: SpendenErgebnis =
        json.verwendungsart === 'direkt'
          ? {
              // spendeDirekt liefert weder Topf- noch Meilenstein-Info — eine
              // Direktausschüttung kauft keine Anteile, der Topf bleibt
              // unverändert.
              betragCent,
              frequenz,
              verwendungsart: 'direkt',
              altesTopfwertCent: topfStandCent,
              neuesTopfwertCent: topfStandCent,
              zuwendungId: json.zuwendungId,
              meilensteine: [],
            }
          : {
              betragCent,
              frequenz,
              verwendungsart: 'vermoegen',
              altesTopfwertCent: json.topfwertVorherCent,
              neuesTopfwertCent: json.topfwertNachherCent,
              zuwendungId: json.zuwendungId,
              meilensteine: json.erreichteMeilensteine ?? [],
            };
      // Für 'direkt' ist neuesTopfwertCent === topfStandCent — das Set ist
      // dort ein No-op, deshalb branchfrei.
      setTopfStandCent(neuesErgebnis.neuesTopfwertCent);
      // setErgebnis sichert den Wert zugleich als Remount-Snapshot (siehe
      // useTransientesErgebnis) — muss deshalb VOR router.refresh() stehen.
      setErgebnis(neuesErgebnis);
      setStatus('done');
      // Server-Sektionen auf derselben Seite (Finanztopf-Karte, Transparenz-
      // Historie in app/einrichtungen/[slug]/page.tsx) lesen direkt aus der DB
      // und werden sonst erst nach einem manuellen Reload aktuell.
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  // Wachstums-Projektionen ergeben nur für Verwendungsart A einen Sinn — eine
  // Direktspende wird nicht angelegt und wächst nicht (Spec §3.1).
  const zeigeProjektion = verwendungsart === 'vermoegen';

  // "Bei Zielerreichung" — Jahre bis zum Ziel MIT der Spende (nicht ohne).
  const jahre = computeYearsToGoal({
    startCapital: topfEuro,
    targetCapital: zielEuro,
    donation: betrag,
    frequency: frequenz,
  });
  const zielErreichbar = isFinite(jahre);

  const zukunftswertMeinerSpende = zielErreichbar
    ? frequenz === 'jaehrlich'
      ? futureValueWithAnnualDonation(0, betrag, NET_GROWTH_RATE, jahre)
      : zukunftswert(betrag, jahre)
    : 0;

  const verkuerzung = verkuerzungMonate({ startCapital: topfEuro, targetCapital: zielEuro }, betrag, frequenz);

  const dauerhaftAbSofort = dauerhafteJahresfoerderung(betrag);

  // Spender-Badge (Task 30): absolute Schwellen auf den Spendenbetrag selbst.
  const level = currentLevel(betrag);
  const naechstesLevel = nextLevel(betrag);

  const jahresertrag = betrag * ANNUAL_PAYOUT_RATE;
  const wirkungsBeispiel = impactBeispiel(einrichtung.typ, jahresertrag);

  const betragZuNiedrig = betrag < 5;

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

      {/*
        Verwendungsart-Wahl (Spec §3.1 "Voreinstellung"): zwei sichtbare
        Radio-Karten nebeneinander, A vorausgewählt und nicht versteckt.
        Verwendungsart B ist ohne verifizierten Träger deaktiviert — es gibt
        strukturell kein Konto, auf das ausgezahlt werden könnte.
      */}
      <div role="radiogroup" aria-label="Verwendungsart" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <label
          style={{
            display: 'block',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${verwendungsart === 'vermoegen' ? 'var(--turquoise)' : 'var(--border)'}`,
            background: 'var(--surface)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input
              type="radio"
              name="verwendungsart"
              value="vermoegen"
              checked={verwendungsart === 'vermoegen'}
              onChange={() => setVerwendungsart('vermoegen')}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              <strong>Dauerhaft anlegen</strong> — deine Spende wird dem Vermögen zugeführt und fördert die Einrichtung
              jedes Jahr aus ihren Erträgen.
            </span>
          </div>
        </label>
        <label
          style={{
            display: 'block',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${verwendungsart === 'direkt' ? 'var(--turquoise)' : 'var(--border)'}`,
            background: 'var(--surface)',
            cursor: einrichtung.verifiziert ? 'pointer' : 'not-allowed',
            opacity: einrichtung.verifiziert ? 1 : 0.7,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <input
              type="radio"
              name="verwendungsart"
              value="direkt"
              checked={verwendungsart === 'direkt'}
              disabled={!einrichtung.verifiziert}
              onChange={() => setVerwendungsart('direkt')}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              <strong>Direkt auszahlen</strong> — deine Spende wird nicht angelegt, sondern gesammelt und monatlich an
              die Einrichtung ausgezahlt.
              {!einrichtung.verifiziert && (
                <span className="muted" style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  Erst verfügbar, wenn die Einrichtung ihren Zugang abgeholt hat.
                </span>
              )}
            </span>
          </div>
        </label>
      </div>

      {/*
        Widmungswortlaut (Spec §3.1 Doku-Pflicht): sichtbar unter der
        A-Auswahl, Checkbox-frei — die Erklärung ist die Auswahl selbst,
        Zeitpunkt + Version speichert der Server bei der Buchung. Nur bei
        gewähltem A: eine Direktspende (B) gibt keine Vermögens-Erklärung ab,
        die Kenntnisnahme-Zeile wäre dort schlicht falsch.
      */}
      {verwendungsart === 'vermoegen' && (
        <div data-testid="widmungstext" style={{ fontSize: '0.8rem' }}>
          <p className="muted" style={{ margin: 0 }}>{widmungWortlaut}</p>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>Mit deiner Spende gibst du diese Erklärung ab.</p>
        </div>
      )}

      {betragZuNiedrig ? (
        <p className="muted" data-testid="betrag-hinweis">Wähle einen Betrag ab 5 €.</p>
      ) : zeigeProjektion && zielErreichbar ? (
        <div data-testid="zukunftswert-hero">
          <p className="hero-number" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
            {frequenz === 'jaehrlich'
              ? `Deine jährlichen ${formatEuro(betrag)} wachsen bis zur Zielerreichung zusammen auf ~${formatEuro(zukunftswertMeinerSpende)} an.`
              : `Deine ${formatEuro(betrag)} sind bei Zielerreichung auf ~${formatEuro(zukunftswertMeinerSpende)} angewachsen.`}
          </p>
          <ProgressBar
            value={zukunftswertMeinerSpende}
            max={zielEuro}
            label={`${formatEuro(zukunftswertMeinerSpende)} von ${formatEuro(zielEuro)} — dein Anteil am Ziel`}
          />
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Angenommene Netto-Wachstumsrate: {NET_GROWTH_RATE * 100} % pro Jahr, konstant bis zur
            Zielerreichung — eine Modellrechnung auf Basis des heutigen Finanzmodells, keine garantierte Prognose.
          </p>
        </div>
      ) : zeigeProjektion ? (
        <div data-testid="dauerfoerderung-perspektive">
          <p className="hero-number" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)' }}>
            Dein Beitrag trägt schon ab sofort dauerhaft mit ~{formatEuro(dauerhaftAbSofort)}/Jahr bei.
          </p>
          <p className="muted">
            Diese Zahl ist eine ehrliche Untergrenze: Sie wächst mit, sobald der Finanztopf wächst — für
            dieses Ziel lässt sich der Zeitpunkt der vollen Kapitalreife derzeit nicht seriös vorhersagen.
          </p>
        </div>
      ) : null}

      {!betragZuNiedrig && zeigeProjektion && zielErreichbar && verkuerzung > 0 && (
        <p data-testid="verkuerzung" className="muted">
          Und verkürzen den Weg zum Ziel um {formatMonate(verkuerzung)}.
        </p>
      )}

      {zeigeProjektion && (
        <div data-testid="years-result">
          <p className="muted" style={{ fontSize: '0.9rem' }}>{formatDuration(jahre)} bis zum Ziel von {formatEuro(zielEuro)}</p>
        </div>
      )}

      {!betragZuNiedrig && zeigeProjektion && (
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
      )}

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

      {status === 'done' && ergebnis && (
        <SpendenBestaetigung
          betragCent={ergebnis.betragCent}
          frequenz={ergebnis.frequenz}
          verwendungsart={ergebnis.verwendungsart}
          einrichtungName={einrichtung.name}
          altesTopfwertCent={ergebnis.altesTopfwertCent}
          neuesTopfwertCent={ergebnis.neuesTopfwertCent}
          zielKapitalCent={einrichtung.zielKapitalCent}
          zuwendungId={ergebnis.zuwendungId}
          meilensteine={ergebnis.meilensteine}
          widmungWortlaut={ergebnis.verwendungsart === 'vermoegen' ? widmungWortlaut : null}
        />
      )}
    </div>
  );
}
