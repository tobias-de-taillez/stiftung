import { listEinrichtungen } from '@/lib/server/einrichtungenService';
import { EinrichtungenFilter } from '@/components/EinrichtungenFilter';

export default async function EinrichtungenPage() {
  const einrichtungen = await listEinrichtungen();

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Einrichtungen</h1>
        <p className="muted">Tagespflege, Kita und Schulen — jede Einrichtung mit eigenem Finanztopf.</p>
      </div>
      <EinrichtungenFilter einrichtungen={einrichtungen} />
    </div>
  );
}
