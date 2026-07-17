'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { formatEuro } from '@/lib/calc/format';
import { ZeitrafferErgebnis, type ZeitrafferErgebnisProps } from './ZeitrafferErgebnis';

export function SolidaritaetsfondsPanel({ initialBestand }: { initialBestand: number }) {
  const router = useRouter();
  const [bestand, setBestand] = useState(initialBestand);
  const [betrag, setBetrag] = useState(50);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [verteilung, setVerteilung] = useState<{ slug: string; name: string; anteil: number }[] | null>(null);
  // Ergebnis der Jahres-Simulation (Task 32): trägt den kompletten
  // /api/simulation/jahr-Response an ZeitrafferErgebnis weiter, das daraus die
  // inszenierte Sequenz baut. `nummer` dient dort als React-`key`, damit ein
  // erneutes Simulieren eine frische Instanz (und damit eine frische Sequenz)
  // statt eines Timer-Neuaufsatzes bekommt.
  const [zeitraffer, setZeitraffer] = useState<(ZeitrafferErgebnisProps & { nummer: number }) | null>(null);

  async function handleSpenden() {
    setStatus('loading');
    try {
      const res = await fetch('/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betrag }),
      });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setBestand(json.bestand);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  async function handleVerteilen() {
    setStatus('loading');
    try {
      const res = await fetch('/api/solidaritaetsfonds/verteilen', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setVerteilung(json.verteilung);
      setBestand((b) => Math.round((b - json.verteiltGesamt) * 100) / 100);
      setStatus('idle');
      // Die Verteilung ändert das Kapital betroffener Einrichtungen in der DB
      // (z. B. deren Finanztopf-Karte auf der Detailseite) — router.refresh()
      // holt server-gerenderte Sektionen dieser Route neu, ohne den lokalen
      // Panel-State (bestand/verteilung) zu verlieren.
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleSimulieren() {
    setStatus('loading');
    try {
      const res = await fetch('/api/simulation/jahr', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setZeitraffer({
        nummer: json.nummer,
        fondsErtrag: json.fondsErtrag,
        kapitalErtrag: json.kapitalErtrag,
        verteiltGesamt: json.verteiltGesamt,
        verteilung: json.verteilung,
        neuerFondsBestand: json.neuerFondsBestand,
        meilensteine: json.meilensteine,
      });
      setBestand(json.neuerFondsBestand);
      setStatus('idle');
      // Die Jahres-Simulation verändert Kapitalstände und ggf. Meilensteine
      // von Einrichtungen in der DB — router.refresh() aus demselben Grund
      // wie in handleVerteilen oben.
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card>
      <StatusChip tone="forecast">Spielgeld — echte Buchung, kein echtes Geld</StatusChip>
      <p className="eyebrow" style={{ marginTop: '0.75rem' }}>Aktueller Bestand</p>
      <p className="hero-number" style={{ fontSize: '2.4rem' }}>{formatEuro(bestand)}</p>

      <label style={{ display: 'block', marginTop: '1rem' }}>
        <span className="eyebrow" style={{ display: 'block' }}>Allgemein spenden</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            aria-label="Betrag für den Solidaritätsfonds"
            type="number"
            min={5}
            value={betrag}
            onChange={(e) => setBetrag(Number(e.target.value) || 0)}
            style={{ width: '6rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <button type="button" className="pill pill-primary" onClick={handleSpenden} disabled={status === 'loading'}>
            In den Fonds einzahlen
          </button>
        </div>
      </label>

      <button
        type="button"
        className="pill pill-secondary"
        style={{ marginTop: '1rem' }}
        onClick={handleVerteilen}
        disabled={status === 'loading' || bestand <= 0}
      >
        Jetzt verteilen
      </button>

      <button
        type="button"
        className="pill pill-secondary"
        style={{ marginTop: '1rem', marginLeft: '0.75rem' }}
        onClick={handleSimulieren}
        disabled={status === 'loading'}
      >
        Jahr simulieren (+6 %)
      </button>

      {status === 'error' && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}

      {zeitraffer && <ZeitrafferErgebnis key={zeitraffer.nummer} {...zeitraffer} />}

      {verteilung && (
        <div style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Letzte Verteilung</p>
          {verteilung.length === 0 ? (
            <p className="muted">Kein Bedarf — alle Einrichtungen haben ihr Pro-Kind-Ziel erreicht.</p>
          ) : (
            <ul>
              {verteilung.map((v) => (
                <li key={v.slug}>{v.name}: {formatEuro(v.anteil)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
