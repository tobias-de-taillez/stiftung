import { Card } from '@/components/Card';
import { SolidaritaetsfondsPanel } from '@/components/SolidaritaetsfondsPanel';
import { kontenLage } from '@/lib/server/kontenService';

export const dynamic = 'force-dynamic';

export default async function SolidaritaetsfondsPage() {
  const lage = await kontenLage();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Solidaritätsfonds</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Wer nicht gezielt an eine Einrichtung spenden möchte, spendet hier
          allgemein. Die Verteilung folgt dem Leitbild-Prinzip: Einrichtungen
          mit dem geringsten Finanzvolumen pro Kind bekommen überproportional
          mehr — kein Geld bleibt ungenutzt liegen, solange irgendwo Bedarf
          besteht.
        </p>
      </div>
      <Card>
        <p className="eyebrow">Wie die Kaskade rechnet</p>
        <p className="muted">
          Jede Einrichtung bekommt eine Rangposition <code>p</code> zwischen 0
          und 1: 0 ist das ärmste, 1 das reichste Finanzvolumen pro Kind. Die
          Skala wird an den mittleren 90 % gebildet (P5–P95, sogenannte
          Winsorisierung) und nur aus verifizierten Einrichtungen berechnet —
          unverifizierte werden daran gemessen, verzerren die Skala aber
          nicht.
        </p>
        <p className="muted">
          Aus <code>p</code> ergibt sich die Solidaritätsabgabe: 0 % für die
          Ärmsten bis 1 % für die Reichsten, linear dazwischen.
        </p>
        <p className="muted">
          Die Umverteilung nimmt 1 % des Fonds und verteilt es proportional
          zu <code>1 − p</code> — wer arm ist, bekommt den größeren Anteil.
        </p>
        <p>
          Der Jahresabschluss rechnet mit dem Stichtagswert — auch in einem
          Verlustjahr. Es wird keine Rendite gebucht, nur der Kurs gestellt.
        </p>
      </Card>
      <SolidaritaetsfondsPanel lage={lage} />
    </div>
  );
}
