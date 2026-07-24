'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { KontenUebersicht } from './KontenUebersicht';
import { formatEuroFromCent } from '@/lib/calc/format';
import type { KontenLage } from '@/lib/server/kontenService';

/**
 * Öffentliche Fonds-Seite (Task 8, entschärft): nur noch Lesen (über
 * KontenUebersicht, dieselbe Tabelle wie im Admin-Dashboard) + Spenden.
 * Marktjahr/Jahresabschluss/Auszahlungslauf/Cap-Edit sind nach
 * AdminAktionen gewandert (/api/admin/*, Admin-Session-Guard).
 */
export function SolidaritaetsfondsPanel({ lage }: { lage: KontenLage }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [spendeBetrag, setSpendeBetrag] = useState(50);

  async function handleSpenden() {
    setStatus('loading');
    try {
      const betragCent = Math.round(spendeBetrag * 100);
      const res = await fetch('/api/solidaritaetsfonds/spenden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betragCent }),
      });
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

      <div style={{ marginTop: '0.75rem' }}>
        <KontenUebersicht lage={lage} />
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

      {status === 'error' && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}
    </Card>
  );
}
