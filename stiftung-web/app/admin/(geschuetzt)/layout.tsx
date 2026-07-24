import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ADMIN_COOKIE, pruefeSessionToken } from '@/lib/server/adminSession';
import { StatusChip } from '@/components/StatusChip';
import { AdminLogoutButton } from '@/components/AdminLogoutButton';

// Route-Group (geschuetzt): umschließt Dashboard/Verifikation/Einrichtungen/
// Journal, NICHT /admin/login (liegt als Geschwister-Segment außerhalb der
// Gruppe, siehe app/admin/login/page.tsx). Die Middleware (Task 2) prüft nur
// die Cookie-Präsenz und matcht zudem NICHT das bloße "/admin" (ihr Muster
// verlangt einen Slash danach) — dieser RSC-Guard ist deshalb der einzige
// Ort, der /admin selbst schützt UND die Signatur (nicht nur Präsenz) prüft.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!pruefeSessionToken(token)) {
    redirect('/admin/login');
  }

  return (
    <div style={{ padding: '1.5rem 0', display: 'grid', gap: '1.5rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <StatusChip tone="forecast">Admin</StatusChip>
          <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/admin" className="pill pill-secondary">Dashboard</Link>
            <Link href="/admin/verifikation" className="pill pill-secondary">Verifikation</Link>
            <Link href="/admin/einrichtungen" className="pill pill-secondary">Einrichtungen</Link>
            <Link href="/admin/journal" className="pill pill-secondary">Journal</Link>
          </nav>
        </div>
        <AdminLogoutButton />
      </header>
      {children}
    </div>
  );
}
