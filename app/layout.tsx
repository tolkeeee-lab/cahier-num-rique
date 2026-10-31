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
  manifest: '/manifest.json?v=3',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cahier Numérique',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png?v=3', sizes: '48x48', type: 'image/png' },
      { url: '/icons/pwa-192.png?v=3', sizes: '192x192', type: 'image/png' },
      { url: '/icons/pwa-512.png?v=3', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-any.svg?v=3', type: 'image/svg+xml' },
    ],
    shortcut: '/icons/favicon-32.png?v=3',
    apple: [
      { url: '/icons/pwa-apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
      { url: '/icons/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
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
                navigator.serviceWorker.register('/sw.js?v=3').then(
                  function(reg) {
                    console.log('SW enregistré scope:', reg.scope);
                    reg.update(); // Force vérification de mise à jour immédiate
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
