'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';

/**
 * Admin-Login-Formular (Task 6): postet gegen /api/admin/login. Erfolg →
 * router.push('/admin') + router.refresh() (der Layout-Guard liest dann
 * das frisch gesetzte Cookie). 401/Netzwerkfehler → Fehlbanner, Feld bleibt
 * erhalten (kein Datenverlust bei Tippfehler).
 */
export function AdminLogin() {
  const router = useRouter();
  const [passwort, setPasswort] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwort }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('idle');
      router.push('/admin');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <Card>
      <p className="eyebrow">Admin-Anmeldung</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Passwort</span>
          <input
            aria-label="Passwort"
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--cream)',
            }}
          />
        </label>

        {status === 'error' && <p className="negative" role="alert">Anmeldung fehlgeschlagen. Bitte erneut versuchen.</p>}

        <button type="submit" className="pill pill-primary" disabled={status === 'loading' || passwort === ''}>
          {status === 'loading' ? 'Wird geprüft …' : 'Anmelden'}
        </button>
      </form>
    </Card>
  );
}
