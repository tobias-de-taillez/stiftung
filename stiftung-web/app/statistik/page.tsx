import Link from 'next/link';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/BarChart';
import { formatEuro } from '@/lib/calc/format';
import { statistik } from '@/lib/server/einrichtungenService';

function fortschrittProzent(aktuellesKapital: number, zielKapital: number): number {
  if (zielKapital <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (aktuellesKapital / zielKapital) * 100)));
}

export const dynamic = 'force-dynamic';

export default async function StatistikPage() {
  const stats = await statistik();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Statistik</h1>
        <p className="muted">
          {stats.anzahlEinrichtungen} Einrichtungen · {stats.gesamtKinder} Kinder ·{' '}
          {formatEuro(stats.gesamtKapital)} Gesamtkapital
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card>
          <p className="eyebrow">Ø Volumen pro Einrichtung</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuro(stats.durchschnittlichesVolumen)}</p>
        </Card>
        <Card>
          <p className="eyebrow">Zufluss letzte 12 Monate</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuro(stats.zuflussLetztesJahr)}</p>
        </Card>
        <Card>
          <p className="eyebrow">Simulierter Jahresertrag (6%)</p>
          <p className="hero-number" style={{ fontSize: '1.8rem' }}>{formatEuro(stats.simulierterJahresertrag)}</p>
          <p className="muted" style={{ fontSize: '0.8rem' }}>Simuliert auf Basis des Gesamtkapitals — kein realer Auszahlungs-Flow (folgt mit Payment/KYC).</p>
        </Card>
      </div>

      <Card>
        <p className="eyebrow">Förderung pro Kind — Top 5</p>
        <BarChart
          data={stats.top5.map((e) => ({ label: e.name, value: Math.round(e.foerderungProKind) }))}
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
                  <span className="muted"> — {e.ort} · {e.typ} · {fortschrittProzent(e.aktuellesKapital, e.zielKapital)} %</span>
                  <br />
                  <span>{formatEuro(e.foerderungProKind)} pro Kind</span>
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
                  <span className="muted"> — {e.ort} · {e.typ} · {fortschrittProzent(e.aktuellesKapital, e.zielKapital)} %</span>
                  <br />
                  <span>{formatEuro(e.foerderungProKind)} pro Kind</span>
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
    </div>
  );
}
