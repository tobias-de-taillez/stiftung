import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '3rem 0' }}>
      <p className="eyebrow">Fehler 404</p>
      <h1>Seite nicht gefunden</h1>
      <p className="muted">Diese Seite oder Einrichtung existiert nicht (mehr).</p>
      <Link href="/" className="pill pill-primary">Zur Startseite</Link>
    </div>
  );
}
