import Link from 'next/link';

export function Nav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <nav
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}
      >
        <Link href="/" className="eyebrow" style={{ color: 'var(--cream)' }}>
          Deutsche Bildungsstiftung
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/" className="pill pill-secondary">Startseite</Link>
          <Link href="/einrichtungen" className="pill pill-secondary">Einrichtungen</Link>
          <Link href="/statistik" className="pill pill-secondary">Statistik</Link>
          <Link href="/solidaritaetsfonds" className="pill pill-secondary">Solidaritätsfonds</Link>
        </div>
      </nav>
    </header>
  );
}
