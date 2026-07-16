import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { SpendenRechner } from '@/components/SpendenRechner';
import { formatEuro } from '@/lib/calc/format';
import { getEinrichtungBySlug } from '@/lib/server/einrichtungenService';

export default async function EinrichtungDetailPage({ params }: { params: { slug: string } }) {
  const einrichtung = await getEinrichtungBySlug(params.slug);
  if (!einrichtung) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/einrichtungen/${einrichtung!.slug}`;
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 180 });

  return (
    <div style={{ padding: '2rem 0', display: 'grid', gap: '1.5rem' }}>
      <div>
        <p className="eyebrow">{einrichtung!.typ}</p>
        <h1>{einrichtung!.name}</h1>
        <p className="muted">{einrichtung!.ort} · {einrichtung!.kinderAnzahl} Kinder</p>
      </div>

      <Card>
        <p className="eyebrow">Finanztopf</p>
        <ProgressBar
          value={einrichtung!.aktuellesKapital}
          max={einrichtung!.zielKapital}
          label={`${formatEuro(einrichtung!.aktuellesKapital)} von ${formatEuro(einrichtung!.zielKapital)} (Ziel: finanzielle Unabhängigkeit)`}
        />
      </Card>

      <Card>
        <p className="eyebrow">Spendenrechner</p>
        <SpendenRechner einrichtung={einrichtung!} />
      </Card>

      <Card>
        <p className="eyebrow">Für Vorträge & Events</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR-Code zu ${einrichtung!.name}`}
            width={140}
            height={140}
            style={{ borderRadius: 'var(--radius-sm)', background: 'var(--qr-bg)', padding: '8px' }}
          />
          <p className="muted" style={{ maxWidth: '32ch' }}>
            QR-Code scannen, um direkt auf dieser Seite zu landen — praktisch für Vorträge oder Spendenaktionen vor Ort.
          </p>
        </div>
      </Card>
    </div>
  );
}
