import Link from 'next/link';
import { NavLink } from './NavLink';

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
          <NavLink href="/">Startseite</NavLink>
          <NavLink href="/einrichtungen">Einrichtungen</NavLink>
          <NavLink href="/statistik">Statistik</NavLink>
          <NavLink href="/solidaritaetsfonds">Solidaritätsfonds</NavLink>
        </div>
      </nav>
    </header>
  );
}
