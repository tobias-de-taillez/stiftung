import { AdminEinrichtungenListe } from '@/components/AdminEinrichtungenListe';
import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { listEinrichtungenMitTopf, listGeschlosseneEinrichtungen } from '@/lib/server/uebersichtService';

// Prisma-Read direkt im Server Component (kein fetch()) — force-dynamic
// verhindert, dass Next die Route trotz dynamischer Daten prerendert.
export const dynamic = 'force-dynamic';

export default async function AdminEinrichtungenPage() {
  const [einrichtungen, geschlossene] = await Promise.all([
    listEinrichtungenMitTopf(),
    listGeschlosseneEinrichtungen(),
  ]);

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

      {geschlossene.length > 0 && (
        <section style={{ display: 'grid', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Geschlossen</h2>
          <p className="muted" style={{ maxWidth: '60ch', margin: 0 }}>
            Bereits aufgelöste Einrichtungen — ihr Topf ist vollständig in den Solidaritätsfonds
            übergegangen. Die Schließungsbuchung steht im Journal.
          </p>
          {geschlossene.map((e) => (
            <Card key={e.id}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{e.name}</p>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>{e.ort}</p>
                </div>
                <StatusChip tone="muted">Geschlossen am {e.geschlossenAm}</StatusChip>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
