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
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  async function handleLogout() {
    setStatus('loading');
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  }

  return (
    <button type="button" className="pill pill-secondary" onClick={handleLogout} disabled={status === 'loading'}>
      Abmelden
    </button>
  );
}
