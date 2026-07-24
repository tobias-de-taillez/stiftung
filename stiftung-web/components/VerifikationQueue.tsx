'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import type { OffenerAntrag } from '@/lib/server/verifikationsService';

/**
 * Verifikations-Warteschlange (Task 7, Design-Spec §6): pro offenem Antrag
 * Träger, Einrichtungen, vorgeschlagene Rechtsform und gemeinnützig-Flag —
 * Genehmigen/Ablehnen posten auf /api/admin/verifikation/antraege/[id] und
 * holen den Stand danach über router.refresh() neu (kein lokaler Spiegel,
 * gleiches Muster wie TraegerPanel/AdminAktionen). ladendId sperrt nur die
 * Buttons der gerade bearbeiteten Zeile, nicht die ganze Liste.
 */
export function VerifikationQueue({ antraege }: { antraege: OffenerAntrag[] }) {
  const router = useRouter();
  const [ladendId, setLadendId] = useState<string | null>(null);
  const [fehlerId, setFehlerId] = useState<string | null>(null);

  async function entscheiden(antragId: string, entscheidung: 'genehmigt' | 'abgelehnt') {
    setLadendId(antragId);
    setFehlerId(null);
    try {
      const res = await fetch(`/api/admin/verifikation/antraege/${antragId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entscheidung }),
      });
      if (!res.ok) throw new Error('request_failed');
      router.refresh();
    } catch {
      setFehlerId(antragId);
    } finally {
      setLadendId(null);
    }
  }

  return (
    <Card>
      <p className="eyebrow">Verifikations-Warteschlange</p>
      {antraege.length === 0 ? (
        <p className="muted">Keine offenen Anträge.</p>
      ) : (
        <ul style={{ display: 'grid', gap: '1rem', listStyle: 'none', padding: 0, margin: '1rem 0 0' }}>
          {antraege.map((a) => (
            <li
              key={a.antragId}
              style={{ padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>{a.traegerName}</p>
              <p className="muted" style={{ margin: '0.25rem 0' }}>
                {a.einrichtungen.map((e) => e.name).join(', ')}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                <StatusChip tone="forecast">{a.rechtsformLabel}</StatusChip>
                <StatusChip tone={a.gemeinnuetzig ? 'positive' : 'muted'}>
                  {a.gemeinnuetzig ? 'gemeinnützig' : 'nicht gemeinnützig'}
                </StatusChip>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="pill pill-primary"
                  onClick={() => entscheiden(a.antragId, 'genehmigt')}
                  disabled={ladendId === a.antragId}
                >
                  Genehmigen
                </button>
                <button
                  type="button"
                  className="pill pill-secondary"
                  onClick={() => entscheiden(a.antragId, 'abgelehnt')}
                  disabled={ladendId === a.antragId}
                >
                  Ablehnen
                </button>
              </div>
              {fehlerId === a.antragId && (
                <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
