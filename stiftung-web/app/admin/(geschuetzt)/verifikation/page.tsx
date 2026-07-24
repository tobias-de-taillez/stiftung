import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { VerifikationQueue } from '@/components/VerifikationQueue';
import { RECHTSFORM_LABELS, type Rechtsform } from '@/lib/verrechnung/traeger';
import { offeneAntraege } from '@/lib/server/verifikationsService';
import { prisma } from '@/lib/server/prismaClient';

// Prisma-Reads direkt im Server Component — ohne force-dynamic könnte Next
// diese Route trotz dynamischer Daten prerendern (gleiches Muster wie
// app/einrichtungen/[slug]/page.tsx und app/admin/(geschuetzt)/page.tsx).
export const dynamic = 'force-dynamic';

export default async function VerifikationPage() {
  const [antraege, traeger] = await Promise.all([
    offeneAntraege(),
    prisma.traeger.findMany({
      include: { einrichtungen: { select: { slug: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Verifikation</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Offene Anträge auf Zugang (KYC simuliert) — genehmigen oder ablehnen. Darunter der aktuelle Status
          aller Träger.
        </p>
      </div>

      <VerifikationQueue antraege={antraege} />

      <Card>
        <p className="eyebrow">Träger</p>
        {traeger.length === 0 ? (
          <p className="muted">Noch keine Träger erfasst.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Träger</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Einrichtungen</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Rechtsform</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '0.4rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {traeger.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: '0.4rem' }}>{t.name}</td>
                    <td style={{ padding: '0.4rem' }}>
                      {t.einrichtungen.length > 0 ? t.einrichtungen.map((e) => e.name).join(', ') : '—'}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      {RECHTSFORM_LABELS[t.rechtsform as Rechtsform] ?? t.rechtsform}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <StatusChip tone={t.verifiziert ? 'positive' : 'muted'}>
                        {t.verifiziert ? 'Zugang abgeholt' : 'Zugang noch nicht abgeholt'}
                      </StatusChip>
                    </td>
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
