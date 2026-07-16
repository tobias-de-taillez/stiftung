import { Card } from '@/components/Card';
import { SolidaritaetsfondsPanel } from '@/components/SolidaritaetsfondsPanel';
import { getFondsBestand } from '@/lib/server/solidaritaetsfondsService';

export default async function SolidaritaetsfondsPage() {
  const bestand = await getFondsBestand();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Solidaritätsfonds</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Wer nicht gezielt an eine Einrichtung spenden möchte, spendet hier
          allgemein. Die Verteilung folgt dem Leitbild-Prinzip: Einrichtungen
          mit dem größten Pro-Kind-Abstand zu ihrem Ziel bekommen
          überproportional mehr — kein Geld bleibt ungenutzt liegen, solange
          irgendwo Bedarf besteht.
        </p>
      </div>
      <Card>
        <p className="eyebrow">Wie die Verteilung rechnet</p>
        <p className="muted">
          Bedarf pro Einrichtung = Zielkapital ÷ Kinderanzahl − aktuelles
          Kapital ÷ Kinderanzahl (mindestens 0). Der Fonds-Bestand wird
          proportional zum Bedarf aufgeteilt — wer pro Kind am wenigsten hat,
          bekommt den größten Anteil.
        </p>
      </Card>
      <SolidaritaetsfondsPanel initialBestand={bestand} />
    </div>
  );
}
