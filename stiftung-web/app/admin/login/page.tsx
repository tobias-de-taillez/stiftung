import { AdminLogin } from '@/components/AdminLogin';

export default function AdminLoginPage() {
  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem', maxWidth: '28rem', margin: '0 auto' }}>
      <div>
        <h1>Admin-Anmeldung</h1>
        <p className="muted">
          Nur für die Vereinsverwaltung. Spenden, Einrichtungen anlegen und Anträge stellen läuft über die
          öffentliche Seite — dafür ist keine Anmeldung nötig.
        </p>
      </div>
      <AdminLogin />
    </div>
  );
}
