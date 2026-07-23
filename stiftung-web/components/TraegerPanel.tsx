'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { formatEuroFromCent } from '@/lib/calc/format';
import { RECHTSFORM_LABELS, type Auszahlungspfad, type Rechtsform } from '@/lib/verrechnung/traeger';

export interface TraegerPanelProps {
  slug: string;
  traegerId: string | null;
  traegerName: string | null;
  rechtsformLabel: string;
  verifiziert: boolean;
  auszahlungspfad: Auszahlungspfad;
  topfwertCent: number;
}

/**
 * Träger-/Lebenszyklus-Panel (Task 16, vollständig neu): zeigt Rechtsträger,
 * Verifikationsstatus und Auszahlungspfad — beides Spielgeld-Aktionen
 * ("Zugang abholen" simuliert KYC, "Einrichtung schließen" überträgt den
 * Topf in den Solidaritätsfonds, Spec §3.3/§3.5).
 */
export function TraegerPanel({
  slug,
  traegerId,
  traegerName,
  rechtsformLabel,
  verifiziert,
  auszahlungspfad,
  topfwertCent,
}: TraegerPanelProps) {
  const router = useRouter();
  const [zugangFormOffen, setZugangFormOffen] = useState(false);
  const [rechtsform, setRechtsform] = useState<Rechtsform>('verein');
  const [gemeinnuetzig, setGemeinnuetzig] = useState(false);
  const [schliessenBestaetigen, setSchliessenBestaetigen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleZugangBestaetigen() {
    if (!traegerId) return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/traeger/${traegerId}/verifikation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiziert: true, rechtsform, gemeinnuetzig }),
      });
      if (!res.ok) throw new Error('request_failed');
      setZugangFormOffen(false);
      setStatus('idle');
      // Verifikationsstatus/Rechtsform/Auszahlungspfad stehen server-seitig
      // auf dieser Seite (Spendenrechner-Verwendungsart-B, dieses Panel
      // selbst) — router.refresh() holt sie neu. Achtung: Der ERSTE refresh()
      // nach der Hydration remountet den Client-Subtree (Next 14 +
      // loading.tsx, siehe lib/hooks/useTransientesErgebnis.ts) — die
      // Panel-Flags (z. B. eine offene Schließen-Bestätigung) fallen dabei
      // auf ihre Defaults zurück. Bewusst OHNE Remount-Snapshot: die Defaults
      // sind hier die natürlichen Ausgangszustände, es geht kein gerade
      // gezeigtes Aktions-Ergebnis verloren.
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  async function handleSchliessen() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/einrichtungen/${slug}/schliessen`, { method: 'POST' });
      if (!res.ok) throw new Error('request_failed');
      router.push('/einrichtungen');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card>
      <p className="eyebrow">Träger</p>
      <p>{traegerName ?? 'Träger noch nicht erfasst'}</p>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
        <StatusChip tone={verifiziert ? 'positive' : 'muted'}>
          {verifiziert ? 'Zugang abgeholt' : 'Zugang noch nicht abgeholt'}
        </StatusChip>
        <StatusChip tone="forecast">{rechtsformLabel}</StatusChip>
      </div>
      <p className="muted" style={{ fontSize: '0.9rem' }}>
        {auszahlungspfad === 'mittelweitergabe' ? 'Mittelweitergabe (§ 58 AO)' : 'Förderguthaben (§ 57 AO)'} — Der
        Auszahlungspfad hängt am Rechtsträger, nicht am Einrichtungstyp.
      </p>

      {!verifiziert && (
        <p className="muted" data-testid="unverifiziert-hinweis" style={{ fontSize: '0.85rem' }}>
          Dieser Topf wächst weiter und zahlt Solidaritätsabgabe, erhält aber keine Umverteilung und keine
          Direktförderung, bis der Zugang abgeholt ist.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {!verifiziert && (
          <button type="button" className="pill pill-secondary" onClick={() => setZugangFormOffen((offen) => !offen)}>
            Zugang abholen (KYC simulieren)
          </button>
        )}
        <button type="button" className="pill pill-secondary" onClick={() => setSchliessenBestaetigen(true)}>
          Einrichtung schließen
        </button>
      </div>

      {zugangFormOffen && !verifiziert && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            <span className="eyebrow" style={{ display: 'block' }}>Rechtsform</span>
            <select
              aria-label="Rechtsform"
              value={rechtsform}
              onChange={(e) => setRechtsform(e.target.value as Rechtsform)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
            >
              {Object.entries(RECHTSFORM_LABELS)
                .filter(([value]) => value !== 'unbekannt')
                .map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={gemeinnuetzig} onChange={(e) => setGemeinnuetzig(e.target.checked)} />
            gemeinnützig
          </label>
          <button
            type="button"
            className="pill pill-primary"
            style={{ marginTop: '0.75rem' }}
            onClick={handleZugangBestaetigen}
            disabled={status === 'loading' || !traegerId}
          >
            Zugang bestätigen
          </button>
        </div>
      )}

      {schliessenBestaetigen && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
          <p>
            {`Der gesamte Topf — ${formatEuroFromCent(topfwertCent)} — geht in den Solidaritätsfonds über. Das lässt sich nicht rückgängig machen.`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="pill pill-primary" onClick={handleSchliessen} disabled={status === 'loading'}>
              Ja, endgültig schließen
            </button>
            <button type="button" className="pill pill-secondary" onClick={() => setSchliessenBestaetigen(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {status === 'error' && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}
    </Card>
  );
}
