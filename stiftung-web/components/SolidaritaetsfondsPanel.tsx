'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { KaskadenErgebnis } from './KaskadenErgebnis';
import { formatEuroFromCent } from '@/lib/calc/format';
import type { KontenLage } from '@/lib/server/kontenService';
import type { KaskadenlaufErgebnis } from '@/lib/server/kaskadeService';

// Kein lokaler Kontenlage-Spiegel: die Kontenübersicht rendert direkt aus dem
// `lage`-Prop (Muster TraegerPanel, Task 16). `router.refresh()` nach jeder
// Aktion holt einen frischen `lage`-Prop vom Server — das genügt, weil hier
// (anders als beim alten Fondsbestand) keine Aktion ihre komplette neue
// Kontenlage in der eigenen Response mitliefert (Jahresabschluss/Auszahlungs-
// lauf liefern nur Teilausschnitte). Nur die transienten Aktions-Ergebnisse
// (Kurs-Zeile, Kaskaden-Ergebnis, Auszahlungslauf-Zeile) sind lokaler State.
type MarktjahrErgebnis = { einrichtungsDepotDeltaCent: number; soliDepotDeltaCent: number };
type AuszahlungErgebnis = { summeCent: number; anzahl: number };

async function postJson(url: string, body?: unknown, method: 'POST' | 'PUT' = 'POST'): Promise<Response> {
  return fetch(url, {
    method,
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
}

export function SolidaritaetsfondsPanel({ lage }: { lage: KontenLage }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const [spendeBetrag, setSpendeBetrag] = useState(50);
  const [capBetrag, setCapBetrag] = useState(lage.managementCapCent / 100);

  const [marktjahrErgebnis, setMarktjahrErgebnis] = useState<MarktjahrErgebnis | null>(null);
  const [kaskadeErgebnis, setKaskadeErgebnis] = useState<KaskadenlaufErgebnis | null>(null);
  const [auszahlungErgebnis, setAuszahlungErgebnis] = useState<AuszahlungErgebnis | null>(null);

  async function handleSpenden() {
    setStatus('loading');
    try {
      const betragCent = Math.round(spendeBetrag * 100);
      const res = await postJson('/api/solidaritaetsfonds/spenden', { betragCent });
      if (!res.ok) throw new Error('failed');
      await res.json();
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleMarktjahr() {
    setStatus('loading');
    try {
      const res = await postJson('/api/simulation/marktjahr');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setMarktjahrErgebnis({
        einrichtungsDepotDeltaCent: json.einrichtungsDepotDeltaCent,
        soliDepotDeltaCent: json.soliDepotDeltaCent,
      });
      setStatus('idle');
      // Der Kurs wird nur gestellt, nicht gebucht — kein Topf ändert sich
      // (Spec §2). router.refresh() holt trotzdem den frischen Poolwert/
      // Fondswert für die Kontenübersicht.
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleJahresabschluss() {
    setStatus('loading');
    try {
      const res = await postJson('/api/simulation/jahresabschluss');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setKaskadeErgebnis(json);
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleAuszahlungslauf() {
    setStatus('loading');
    try {
      const res = await postJson('/api/auszahlungen/lauf');
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setAuszahlungErgebnis({ summeCent: json.summeCent, anzahl: json.anzahl });
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleCapSpeichern() {
    setStatus('loading');
    try {
      const capCent = Math.round(capBetrag * 100);
      const res = await postJson('/api/management/cap', { capCent }, 'PUT');
      if (!res.ok) throw new Error('failed');
      await res.json();
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card>
      <StatusChip tone="forecast">Spielgeld — echte Buchung, kein echtes Geld</StatusChip>

      <p className="eyebrow" style={{ marginTop: '0.75rem' }}>Solidaritätsfonds</p>
      <p className="hero-number" style={{ fontSize: '2.4rem' }}>{formatEuroFromCent(lage.soliFondsCent)}</p>

      <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <caption className="eyebrow" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
            Kontenübersicht
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Konto</th>
              <th scope="col" style={{ textAlign: 'right', padding: '0.4rem' }}>Stand</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.4rem' }}>Einrichtungs-Depot</td>
              <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.etfMarktwertCent)}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.4rem' }}>
                Verrechnungskonto
                {lage.offeneDirektausschuettungenCent > 0 && (
                  <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                    davon durchlaufend: {formatEuroFromCent(lage.offeneDirektausschuettungenCent)}
                  </span>
                )}
              </td>
              <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.verrechnungskontoCent)}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.4rem' }}>Soli-Depot</td>
              <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.soliDepotCent)}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.4rem' }}>Soli-Verrechnungskonto</td>
              <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.soliVerrechnungskontoCent)}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.4rem' }}>
                Management-Konto
                <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                  Cap: {formatEuroFromCent(lage.managementCapCent)}
                </span>
              </td>
              <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(lage.managementKontoCent)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: '0.4rem', fontWeight: 700 }}>Poolwert</td>
              <td style={{ textAlign: 'right', padding: '0.4rem', fontWeight: 700 }}>{formatEuroFromCent(lage.poolwertCent)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <label style={{ display: 'block', marginTop: '1.5rem' }}>
        <span className="eyebrow" style={{ display: 'block' }}>Allgemein spenden</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            aria-label="Betrag für den Solidaritätsfonds"
            type="number"
            min={5}
            value={spendeBetrag}
            onChange={(e) => setSpendeBetrag(Number(e.target.value) || 0)}
            style={{ width: '6rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <button type="button" className="pill pill-primary" onClick={handleSpenden} disabled={status === 'loading'}>
            In den Fonds einzahlen
          </button>
        </div>
      </label>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <button type="button" className="pill pill-secondary" onClick={handleMarktjahr} disabled={status === 'loading'}>
          Marktjahr simulieren (+7 % Kurs)
        </button>
        <button type="button" className="pill pill-secondary" onClick={handleJahresabschluss} disabled={status === 'loading'}>
          Jahresabschluss ausführen (Kaskade)
        </button>
        <button type="button" className="pill pill-secondary" onClick={handleAuszahlungslauf} disabled={status === 'loading'}>
          Auszahlungslauf (Monat)
        </button>
      </div>

      <label style={{ display: 'block', marginTop: '1.5rem' }}>
        <span className="eyebrow" style={{ display: 'block' }}>Management-Cap ändern</span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            aria-label="Management-Cap in Euro"
            type="number"
            min={0}
            value={capBetrag}
            onChange={(e) => setCapBetrag(Number(e.target.value) || 0)}
            style={{ width: '7rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
          <button type="button" className="pill pill-secondary" onClick={handleCapSpeichern} disabled={status === 'loading'}>
            Cap speichern
          </button>
        </div>
      </label>

      {status === 'error' && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}

      {marktjahrErgebnis && (
        <p style={{ marginTop: '1rem' }}>
          {`Kurs: Einrichtungs-Depot +${formatEuroFromCent(marktjahrErgebnis.einrichtungsDepotDeltaCent)}, Soli-Depot +${formatEuroFromCent(marktjahrErgebnis.soliDepotDeltaCent)} — kein einziger Topf wurde geschrieben.`}
        </p>
      )}

      {kaskadeErgebnis && <KaskadenErgebnis key={kaskadeErgebnis.nummer} {...kaskadeErgebnis} />}

      {auszahlungErgebnis && (
        <p style={{ marginTop: '1rem' }}>
          {auszahlungErgebnis.anzahl > 0
            ? `${formatEuroFromCent(auszahlungErgebnis.summeCent)} in ${auszahlungErgebnis.anzahl} Auszahlungen überwiesen.`
            : 'Nichts offen.'}
        </p>
      )}
    </Card>
  );
}
