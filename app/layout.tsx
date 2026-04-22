import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal OS',
  description: 'Your daily dashboard — agenda, tasks, weather, FX, news.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Personal OS',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0e1014',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts loaded at runtime via stylesheet link, not build time
            via next/font. Avoids needing build-server access to Google. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="console-ambient">
        <div className="relative z-10 min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
