'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Logout-Button (Task 6): postet /api/admin/logout (löscht das
 * Session-Cookie), dann Redirect zur Login-Seite. router.refresh() räumt
 * den RSC-Baum der bisherigen Admin-Seite auf, bevor die Login-Seite
 * (außerhalb der (geschuetzt)-Gruppe) rendert.
 */
export function AdminLogoutButton() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'fehler'>('idle');

  async function handleLogout() {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      // Nur bei erfolgreichem Löschen des Cookies weiterleiten — sonst bliebe
      // die Session bestehen, während die Login-Seite Abmeldung suggeriert.
      if (!res.ok) throw new Error('logout_failed');
      router.push('/admin/login');
      router.refresh();
    } catch {
      setStatus('fehler');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.4rem', justifyItems: 'end' }}>
      <button type="button" className="pill pill-secondary" onClick={handleLogout} disabled={status === 'loading'}>
        Abmelden
      </button>
      {status === 'fehler' && <p className="negative" style={{ margin: 0 }}>Abmelden fehlgeschlagen. Bitte erneut versuchen.</p>}
    </div>
  );
}
