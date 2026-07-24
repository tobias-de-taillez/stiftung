'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';

export interface VerifikationAntragFormProps {
  traegerId: string | null;
  slug: string;
}

const RECHTSFORMEN = (Object.entries(RECHTSFORM_LABELS) as [Rechtsform, string][]).filter(
  ([value]) => value !== 'unbekannt'
);

// Sprechende Fehltexte für die 409/400-Antworten von
// POST /api/traeger/[id]/verifikation/antrag (Design-Spec §6/Fehlerbehandlung).
const FEHLERTEXTE: Record<string, string> = {
  bereits_verifiziert: 'Dieser Träger ist bereits verifiziert.',
  antrag_offen: 'Es läuft bereits ein Antrag.',
  invalid_rechtsform: 'Bitte eine gültige Rechtsform auswählen.',
  invalid_gemeinnuetzig: 'Bitte den Gemeinnützigkeits-Status angeben.',
  traeger_nicht_gefunden: 'Für diese Einrichtung wurde kein Träger gefunden.',
};
const FEHLER_FALLBACK = 'Antrag konnte nicht gestellt werden. Bitte erneut versuchen.';

/**
 * "Zugang abholen"-Antragsformular (Task 8, ersetzt den alten Direkt-KYC-
 * Toggle): stellt nur noch den Antrag (Design-Spec §6) — die Genehmigung
 * liegt beim Admin (VerifikationQueue). Bei 201 zeigt router.refresh() der
 * Detailseite den neuen offenerAntrag-Stand ("Antrag in Prüfung").
 */
export function VerifikationAntragForm({ traegerId, slug }: VerifikationAntragFormProps) {
  const router = useRouter();
  const [rechtsform, setRechtsform] = useState<Rechtsform>('verein');
  const [gemeinnuetzig, setGemeinnuetzig] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [fehler, setFehler] = useState<string | null>(null);

  if (!traegerId) {
    return (
      <p className="muted" data-testid="kein-traeger-hinweis">
        Für diese Einrichtung ist noch kein Träger erfasst — das legt erst die nächste Spende an.
      </p>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setFehler(null);
    try {
      const res = await fetch(`/api/traeger/${traegerId}/verifikation/antrag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechtsform, gemeinnuetzig }),
      });
      if (res.status === 201) {
        setStatus('idle');
        router.refresh();
        return;
      }
      const json = await res.json().catch(() => ({}));
      setFehler(FEHLERTEXTE[json.error] ?? FEHLER_FALLBACK);
      setStatus('error');
    } catch {
      setFehler(FEHLER_FALLBACK);
      setStatus('error');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid={`verifikation-antrag-form-${slug}`}
      style={{ marginTop: '1rem', padding: '1rem', background: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}
    >
      <p className="eyebrow" style={{ marginTop: 0 }}>Zugang abholen</p>
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        <span className="eyebrow" style={{ display: 'block' }}>Rechtsform</span>
        <select
          aria-label="Rechtsform"
          value={rechtsform}
          onChange={(e) => setRechtsform(e.target.value as Rechtsform)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
        >
          {RECHTSFORMEN.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" checked={gemeinnuetzig} onChange={(e) => setGemeinnuetzig(e.target.checked)} />
        gemeinnützig
      </label>
      <button
        type="submit"
        className="pill pill-primary"
        style={{ marginTop: '0.75rem' }}
        disabled={status === 'loading'}
      >
        Antrag stellen
      </button>
      {fehler && (
        <p className="negative" role="alert" style={{ marginTop: '0.75rem' }}>{fehler}</p>
      )}
    </form>
  );
}
