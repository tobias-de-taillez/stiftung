import Link from 'next/link';
import { Card } from '@/components/Card';
import { SpendenTicker } from '@/components/SpendenTicker';
import { KennzahlHero } from '@/components/KennzahlHero';
import { MiniBalkenwald } from '@/components/MiniBalkenwald';
import { capitalForAnnualPayout, NET_GROWTH_RATE } from '@/lib/calc/spendenrechner';
import { formatEuro } from '@/lib/calc/format';
import { statistik, listEinrichtungen } from '@/lib/server/einrichtungenService';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const beispielZiel = capitalForAnnualPayout(20000);
  const [stats, einrichtungen] = await Promise.all([statistik(), listEinrichtungen()]);
  const zielEinrichtung = stats.bottom5[0];
  const zielHref = zielEinrichtung ? `/einrichtungen/${zielEinrichtung.slug}` : '/einrichtungen';
  // Verdopplungszeit aus der bestehenden Konstante NET_GROWTH_RATE abgeleitet
  // (keine zweite Marketing-Zahl): t = ln(2) / ln(1 + r).
  const verdopplungsjahre = Math.round(Math.log(2) / Math.log(1 + NET_GROWTH_RATE));
  const balkenwaldDaten = einrichtungen.map((e) => ({ slug: e.slug, name: e.name, kapital: e.aktuellesKapital }));

  return (
    <div style={{ padding: '3rem 0', display: 'grid', gap: '2rem' }}>
      {/*
        Hero-Grid (Task 35): links Text/Mission/CTAs, rechts der
        Visual-Slot (Kennzahl-Komposition + Live-Ticker) — füllt die zuvor
        leere rechte Hälfte bei 1080px-Containerbreite. Unter 800px fällt
        .hero-grid (globals.css) auf einspaltig zurück.
      */}
      <section className="hero-grid">
        <div>
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
          <p className="muted">
            {stats.anzahlEinrichtungen} Einrichtungen · {stats.gesamtKinder} Kinder ·{' '}
            {formatEuro(stats.gesamtKapital)} Bildungskapital · {stats.anzahlSpenden} Spenden bisher
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link href={zielHref} className="pill pill-primary">Jetzt spenden</Link>
            <Link href="/einrichtungen" className="pill pill-secondary">Einrichtung finden</Link>
            <Link href="/statistik" className="pill pill-secondary">Statistik ansehen</Link>
            <Link href="/solidaritaetsfonds" className="pill pill-secondary">Solidaritätsfonds</Link>
          </div>
        </div>

        <div className="hero-visual">
          <Card>
            <KennzahlHero gesamtKapital={stats.gesamtKapital} />
            {/*
              Bewusst kein <p> (statt eyebrow-typisch): der Live-Zahlen-Absatz
              im linken Grid-Teil ist ebenfalls ein <p> und matcht denselben
              /Einrichtungen/-Text — screen.getByText(..., { selector: 'p' })
              im Landing-Test würde sonst zwei Treffer finden.
            */}
            <div className="eyebrow" style={{ marginTop: '1.5rem' }}>
              {einrichtungen.length} Einrichtungen im Überblick
            </div>
            <MiniBalkenwald einrichtungen={balkenwaldDaten} />
          </Card>
          <SpendenTicker />
        </div>
      </section>

      <Card>
        <p className="eyebrow">So wirkt Ihre Spende</p>
        <p style={{ maxWidth: '60ch' }}>
          Schon 5 € wachsen für immer weiter: Bei einer Netto-Wachstumsrate
          von {Math.round(NET_GROWTH_RATE * 100)} % pro Jahr verdoppelt sich
          jede gespendete Summe rein rechnerisch alle rund {verdopplungsjahre}{' '}
          Jahre — das Kapital wird nie ausgegeben, nur sein Ertrag.
        </p>
      </Card>

      <Card>
        <p className="eyebrow">Wie das Modell funktioniert</p>
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
