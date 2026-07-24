'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { formatEuroFromCent } from '@/lib/calc/format';
import type { EinrichtungMitTopf } from '@/lib/server/uebersichtService';

/**
 * Einrichtungsverwaltung (Task 7): Liste aller offenen Einrichtungen mit
 * Topfwert/Status/Auszahlungspfad; Schließen-Bestätigung 1:1 aus
 * TraegerPanel übernommen, nur jetzt pro Zeile (bestaetigenSlug statt eines
 * einzelnen bool-States) und gegen /api/admin/... statt /api/....
 */
export function AdminEinrichtungenListe({ einrichtungen }: { einrichtungen: EinrichtungMitTopf[] }) {
  const router = useRouter();
  const [bestaetigenSlug, setBestaetigenSlug] = useState<string | null>(null);
  const [ladendSlug, setLadendSlug] = useState<string | null>(null);
  const [fehlerSlug, setFehlerSlug] = useState<string | null>(null);

  async function handleSchliessen(slug: string) {
    setLadendSlug(slug);
    setFehlerSlug(null);
    try {
      const res = await fetch(`/api/admin/einrichtungen/${slug}/schliessen`, { method: 'POST' });
      if (!res.ok) throw new Error('request_failed');
      setBestaetigenSlug(null);
      router.refresh();
    } catch {
      setFehlerSlug(slug);
    } finally {
      setLadendSlug(null);
    }
  }

  if (einrichtungen.length === 0) {
    return (
      <Card>
        <p className="muted">Keine Einrichtungen vorhanden.</p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {einrichtungen.map((e) => (
        <Card key={e.slug}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{e.name}</p>
              <p className="muted" style={{ margin: '0.25rem 0' }}>
                {e.ort} · {e.traegerName ?? 'Träger noch nicht erfasst'}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                <StatusChip tone={e.verifiziert ? 'positive' : 'muted'}>
                  {e.verifiziert ? 'Zugang abgeholt' : 'Zugang noch nicht abgeholt'}
                </StatusChip>
                <StatusChip tone="forecast">
                  {e.auszahlungspfad === 'mittelweitergabe' ? 'Mittelweitergabe (§ 58 AO)' : 'Förderguthaben (§ 57 AO)'}
                </StatusChip>
              </div>
              <p style={{ margin: 0 }}>{formatEuroFromCent(e.topfwertCent)}</p>
            </div>
            <div>
              <button
                type="button"
                className="pill pill-secondary"
                onClick={() => setBestaetigenSlug(e.slug)}
              >
                Einrichtung schließen
              </button>
            </div>
          </div>

          {bestaetigenSlug === e.slug && (
            <div
              style={{ marginTop: '1rem', padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}
            >
              <p>
                {`Der gesamte Topf — ${formatEuroFromCent(e.topfwertCent)} — geht in den Solidaritätsfonds über. Das lässt sich nicht rückgängig machen.`}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="pill pill-primary"
                  onClick={() => handleSchliessen(e.slug)}
                  disabled={ladendSlug === e.slug}
                >
                  Ja, endgültig schließen
                </button>
                <button type="button" className="pill pill-secondary" onClick={() => setBestaetigenSlug(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {fehlerSlug === e.slug && <p className="negative">Aktion fehlgeschlagen. Bitte erneut versuchen.</p>}
        </Card>
      ))}
    </div>
  );
}
