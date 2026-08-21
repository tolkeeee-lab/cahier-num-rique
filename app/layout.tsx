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
  themeColor: '#fdfaf2',
  interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
  title: 'CumuluShop — Plateforme E-Commerce & Vente Intelligente IA',
  description: 'Plateforme e-commerce intelligente propulsée par l’IA NVIDIA : sourcing de produits gagnants, studio créatif publicitaire, gestion de commandes et caisse.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CumuluShop',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
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
