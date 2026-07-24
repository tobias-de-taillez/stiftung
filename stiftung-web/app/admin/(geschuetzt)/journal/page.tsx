import { Card } from '@/components/Card';
import { formatEuroFromCent } from '@/lib/calc/format';
import { buchungsLabel } from '@/lib/data/buchungsLabels';
import { buchungsJournal } from '@/lib/server/uebersichtService';

// Prisma-Read direkt im Server Component — force-dynamic verhindert
// Prerendering trotz dynamischer Daten (gleiches Muster wie die anderen
// Admin-Seiten).
export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  // buchungsJournal() liefert per Default die neuesten 100 (Task-Vorgabe:
  // "für die Demo reicht neueste 100" — kein Limit-Parameter hier nötig).
  const eintraege = await buchungsJournal();

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Journal</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Die neuesten 100 Buchungen über alle Konten hinweg — jeder Geld- und Kursvorgang, nicht nur die
          spender:innen-sichtbaren.
        </p>
      </div>
      <Card>
        {eintraege.length === 0 ? (
          <p className="muted">Noch keine Buchungen.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Datum</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Typ</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Einrichtung</th>
                  <th scope="col" style={{ textAlign: 'right', padding: '0.4rem' }}>Betrag</th>
                </tr>
              </thead>
              <tbody>
                {eintraege.map((e) => (
                  <tr key={e.id}>
                    <td style={{ padding: '0.4rem' }}>{e.createdAt.toLocaleDateString('de-DE')}</td>
                    <td style={{ padding: '0.4rem' }}>{buchungsLabel(e.typ)}</td>
                    <td style={{ padding: '0.4rem' }}>{e.einrichtungName ?? 'Solidaritätsfonds'}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(e.betragCent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
