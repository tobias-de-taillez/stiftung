import Link from 'next/link';
import { Card } from '@/components/Card';
import { capitalForAnnualPayout } from '@/lib/calc/spendenrechner';
import { formatEuro } from '@/lib/calc/format';

export default function Page() {
  const beispielZiel = capitalForAnnualPayout(20000);

  return (
    <div style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      <section>
        <p className="eyebrow">Deutsche Bildungsstiftung</p>
        <h1 className="hero-number" style={{ maxWidth: '18ch' }}>
          Gemeinsam zur Bildungsrevolution
        </h1>
        <p style={{ maxWidth: '60ch', fontSize: '1.1rem' }}>
          Bildung darf niemals vom Geldbeutel der Familie abhängen. Wir bauen
          unabhängiges, dauerhaftes Bildungskapital auf, damit jede
          Bildungs- und Betreuungseinrichtung in Deutschland ihre Kinder
          fördern kann — unabhängig davon, wie reich ihr Umfeld ist.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/einrichtungen" className="pill pill-primary">Einrichtung finden</Link>
          <Link href="/statistik" className="pill pill-secondary">Statistik ansehen</Link>
          <Link href="/solidaritaetsfonds" className="pill pill-secondary">Solidaritätsfonds</Link>
        </div>
      </section>

      <Card>
        <p className="eyebrow">So wirkt Ihre Spende</p>
        <p style={{ maxWidth: '60ch' }}>
          Für eine jährliche Ausschüttung von 20.000 € an eine Einrichtung
          braucht der Finanztopf ein Kapital von{' '}
          <strong>{formatEuro(beispielZiel)}</strong> — bei einer
          Netto-Wachstumsrate von 6 % pro Jahr wächst jede Spende dauerhaft
          weiter, ohne dass das Kapital verbraucht wird.
        </p>
      </Card>
    </div>
  );
}
