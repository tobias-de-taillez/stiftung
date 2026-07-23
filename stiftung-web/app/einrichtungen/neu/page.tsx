import { EinrichtungAnlegen } from '@/components/EinrichtungAnlegen';

// Dünner Server-Wrapper: kein DB-Read hier (Stufe 1 lebt nur im Browser,
// Spec §3.0) — deshalb kein force-dynamic und keine loading.tsx/error.tsx
// nötig, anders als bei app/einrichtungen/[slug]/page.tsx.
export default function NeueEinrichtungPage() {
  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1>Einrichtung anlegen</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>
          Trag deine Einrichtung ein und spende — erst mit deiner Spende entsteht der Finanztopf, davor bleibt alles
          nur eine Vorschau in deinem Browser.
        </p>
      </div>
      <EinrichtungAnlegen />
    </div>
  );
}
