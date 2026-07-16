'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { formatEuro } from '@/lib/calc/format';

interface EinrichtungListItem {
  id: string;
  slug: string;
  name: string;
  typ: string;
  ort: string;
  kinderAnzahl: number;
  aktuellesKapital: number;
  zielKapital: number;
}

type TypFilter = 'alle' | 'tagespflege' | 'kita' | 'schule';

export function EinrichtungenFilter({ einrichtungen }: { einrichtungen: EinrichtungListItem[] }) {
  const [suche, setSuche] = useState('');
  const [typ, setTyp] = useState<TypFilter>('alle');

  const gefiltert = useMemo(() => {
    return einrichtungen.filter((e) => {
      const passtTyp = typ === 'alle' || e.typ === typ;
      const passtSuche =
        suche.trim() === '' ||
        e.name.toLowerCase().includes(suche.toLowerCase()) ||
        e.ort.toLowerCase().includes(suche.toLowerCase());
      return passtTyp && passtSuche;
    });
  }, [suche, typ, einrichtungen]);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Suche</span>
          <input
            aria-label="Suche"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name oder Ort"
            style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          />
        </label>
        <label>
          <span className="eyebrow" style={{ display: 'block' }}>Typ</span>
          <select
            aria-label="Typ"
            value={typ}
            onChange={(e) => setTyp(e.target.value as TypFilter)}
            style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--cream)' }}
          >
            <option value="alle">Alle</option>
            <option value="tagespflege">Tagespflege</option>
            <option value="kita">Kita</option>
            <option value="schule">Schule</option>
          </select>
        </label>
      </div>

      {gefiltert.length === 0 ? (
        <Card><p>Keine Einrichtung gefunden. Suche oder Filter anpassen.</p></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {gefiltert.map((e) => (
            <Link key={e.id} href={`/einrichtungen/${e.slug}`} style={{ textDecoration: 'none' }}>
              <Card>
                <p className="eyebrow">{e.typ}</p>
                <h2 style={{ margin: '0.25rem 0' }}>{e.name}</h2>
                <p className="muted" style={{ margin: '0 0 0.75rem' }}>{e.ort} · {e.kinderAnzahl} Kinder</p>
                <ProgressBar
                  value={e.aktuellesKapital}
                  max={e.zielKapital}
                  label={`${formatEuro(e.aktuellesKapital)} von ${formatEuro(e.zielKapital)}`}
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
