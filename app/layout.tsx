import type { Metadata } from 'next'
import { Inter, Itim, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const itim = Itim({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-itim',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0E8F6E',
  interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
  title: 'Cahier Numérique - Gestion de Boutique',
  description: 'Gérez votre boutique simplement, comme un cahier physique.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cahier Numérique',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-any.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icons/favicon-32.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

import { FeatureProvider } from '@/context/FeatureContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${itim.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-[#141210] text-gray-900 min-h-screen">
        <FeatureProvider>
          {children}
        </FeatureProvider>
        
        {/* Enregistrement du Service Worker pour le support PWA */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              var registerSW = function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(reg) {
                    console.log('SW enregistré scope:', reg.scope);
                  },
                  function(err) {
                    console.error('SW échec enregistrement:', err);
                  }
                );
              };
              if (document.readyState === 'complete') {
                registerSW();
              } else {
                window.addEventListener('load', registerSW);
              }
            }
          `}
        </Script>
      </body>
    </html>
  )
}
