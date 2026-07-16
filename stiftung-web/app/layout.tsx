import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Deutsche Bildungsstiftung',
  description: 'Wir verwandeln jeden gespendeten Euro in dauerhaft arbeitendes Bildungskapital.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
