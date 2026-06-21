import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NavBar } from './nav';

export const metadata: Metadata = {
  title: 'Mise — Kitchen Brain',
  description: "Scan it in, see what's dying, get 3 good dinners.",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mise',
  },
};

export const viewport: Viewport = {
  themeColor: '#fbf7f0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <NavBar />
      </body>
    </html>
  );
}
