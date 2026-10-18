import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toast } from '@/components/client';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Badge Admin', template: '%s · Badge Admin' },
  icons: { icon: '/icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDEFF2' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers(); // her istek dinamik: CSP nonce her sayfada uygulanır
  return (
    <html lang="tr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Suspense><Toast /></Suspense>
      </body>
    </html>
  );
}
