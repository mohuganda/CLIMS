import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';

import { AppRoot } from '@/providers/AppRoot';

export const metadata: Metadata = {
  title: { default: 'CLIMS', template: '%s · CLIMS' },
  description: 'CLIMS: stock, order and hotspot management for last-mile condom distribution.',
  // An internal tool behind a sign-in: nothing here is for search engines.
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/favicon.ico', sizes: '32x32' }] },
};

export const viewport: Viewport = {
  themeColor: '#fafafb',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // The Content-Security-Policy carries a nonce that is new for every request
  // (see src/proxy.ts), so no page can be rendered ahead of time at build.
  await connection();

  return (
    // The theme class is put on <html> in the browser, from the visitor's saved choice.
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
