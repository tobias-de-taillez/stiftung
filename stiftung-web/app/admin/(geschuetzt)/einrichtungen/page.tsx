import { AdminEinrichtungenListe } from '@/components/AdminEinrichtungenListe';
import { listEinrichtungenMitTopf } from '@/lib/server/uebersichtService';

// Prisma-Read direkt im Server Component (kein fetch()) — force-dynamic
// verhindert, dass Next die Route trotz dynamischer Daten prerendert.
export const dynamic = 'force-dynamic';

export default async function AdminEinrichtungenPage() {
  const einrichtungen = await listEinrichtungenMitTopf();

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Einrichtungen</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Topfwert, Status und Auszahlungspfad je Einrichtung. Schließen überträgt den gesamten Topf
          unwiderruflich in den Solidaritätsfonds.
        </p>
      </div>
      <AdminEinrichtungenListe einrichtungen={einrichtungen} />
    </div>
  );
}
