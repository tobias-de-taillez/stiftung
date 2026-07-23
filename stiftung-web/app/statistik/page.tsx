import Link from 'next/link';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/BarChart';
import { SpendenTicker } from '@/components/SpendenTicker';
import { StatusChip } from '@/components/StatusChip';
import { formatEuroFromCent } from '@/lib/calc/format';
import { NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';
import { poolStatistik } from '@/lib/server/uebersichtService';
import { kaskadenlaeufe } from '@/lib/server/kaskadeService';

function fortschrittProzent(topfwertCent: number, zielKapitalCent: number): number {
  if (zielKapitalCent <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (topfwertCent / zielKapitalCent) * 100)));
}

export const dynamic = 'force-dynamic';

export default async function StatistikPage() {
  const [stats, laeufe] = await Promise.all([poolStatistik(), kaskadenlaeufe()]);
  // Serverseitig gerundet (Task 19): poolStatistik() liefert kein eigenes
  // Ø-Feld, die Division passiert hier auf dem Server, nicht im Client.
  const durchschnittlichesVolumenCent =
    stats.anzahlEinrichtungen > 0 ? Math.round(stats.poolwertCent / stats.anzahlEinrichtungen) : 0;

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Statistik</h1>
        <p className="muted">
          {stats.anzahlEinrichtungen} Einrichtungen · {stats.gesamtKinder} Kinder ·{' '}
          {formatEuroFromCent(stats.poolwertCent)} Gesamtkapital
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card>
          <p className="eyebrow">Ø Volumen pro Einrichtung</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuroFromCent(durchschnittlichesVolumenCent)}</p>
        </Card>
        <Card>
          <p className="eyebrow">Zufluss letzte 12 Monate</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuroFromCent(stats.zuflussLetztesJahrCent)}</p>
        </Card>
        <Card>
          <p className="eyebrow">Simulierter Jahresertrag ({Math.round(NET_GROWTH_RATE * 100)} %)</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuroFromCent(stats.simulierterJahresertragCent)}</p>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Projektion auf Basis des aktuellen Poolwerts (kanonische Anlage-Annahme) — kein Buchungswert.
          </p>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Kaskadenlauf-Historie</p>
        {laeufe.length === 0 ? (
          <p className="muted">Noch keine Kaskadenläufe.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.4rem' }}>Nr.</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem' }}>Poolwert</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem' }}>Direktförderung</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem' }}>Abgaben</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem' }}>Umverteilung</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem' }}>Management-Bewegung</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem' }}>Datum</th>
                </tr>
              </thead>
              <tbody>
                {laeufe.map((l) => (
                  <tr key={l.id}>
                    <td style={{ padding: '0.4rem' }}>{l.nummer}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(l.poolwertCent)}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(l.direktspendenCent)}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(l.abgabenCent)}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>
                      {formatEuroFromCent(l.umverteilungCent)}
                      {l.keineVerteilungGrund === 'alleGleich' && (
                        <>
                          {' '}
                          <StatusChip tone="positive">Verteilungsgleichheit</StatusChip>
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>{formatEuroFromCent(l.managementBewegungCent)}</td>
                    <td style={{ textAlign: 'right', padding: '0.4rem' }}>{l.createdAt.toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="eyebrow">Förderung pro Kind — Top 5</p>
        <BarChart
          data={stats.top5.map((e) => ({ label: e.name, value: Math.round(e.foerderungProKindCent / 100) }))}
          xAxisLabel="Einrichtung"
          yAxisLabel="Förderung pro Kind (€)"
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <Card>
          <h2>Am besten gefördert</h2>
          <ol style={{ display: 'grid', gap: '0.6rem', paddingLeft: '1.2rem' }}>
            {stats.top5.map((e) => (
              <li key={e.id}>
                <Link href={`/einrichtungen/${e.slug}`} style={{ textDecoration: 'none' }}>
                  <strong>{e.name}</strong>
                  <span className="muted"> — {e.ort} · {e.typ} · {fortschrittProzent(e.topfwertCent, e.zielKapitalCent)} %</span>
                  <br />
                  <span>{formatEuroFromCent(e.foerderungProKindCent)} pro Kind</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2>Größter Förderbedarf</h2>
          <ol style={{ display: 'grid', gap: '0.6rem', paddingLeft: '1.2rem' }}>
            {stats.bottom5.map((e) => (
              <li key={e.id}>
                <Link href={`/einrichtungen/${e.slug}`} style={{ textDecoration: 'none' }}>
                  <strong>{e.name}</strong>
                  <span className="muted"> — {e.ort} · {e.typ} · {fortschrittProzent(e.topfwertCent, e.zielKapitalCent)} %</span>
                  <br />
                  <span>{formatEuroFromCent(e.foerderungProKindCent)} pro Kind</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Solidaritätsfonds</p>
        <p>Nicht direkt zugeordnete Spenden werden nach Bedarf verteilt — wer pro Kind am wenigsten hat, bekommt am meisten.</p>
        <a href="/solidaritaetsfonds" className="pill pill-secondary">Zum Solidaritätsfonds</a>
      </Card>

      <SpendenTicker />
    </div>
  );
}
