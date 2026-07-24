import { Card } from '@/components/Card';
import { KontenUebersicht } from '@/components/KontenUebersicht';
import { AdminAktionen } from '@/components/AdminAktionen';
import { kontenLage } from '@/lib/server/kontenService';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const lage = await kontenLage();

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Dashboard</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Kontenlage und Verwaltungsaktionen. Änderungen wirken sofort auf die öffentliche Seite — kein
          Bestätigungsschritt dazwischen.
        </p>
      </div>
      <Card>
        <KontenUebersicht lage={lage} />
      </Card>
      <AdminAktionen lage={lage} />
    </div>
  );
}
