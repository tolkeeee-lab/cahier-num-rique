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
  title: 'Cahier Numérique - Gestion de Boutique',
  description: 'Gérez votre boutique simplement, comme un cahier physique.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cahier Caisse',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon-192.png',
    apple: [
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
                // NUKE THE OLD PWA CACHE BRUTE FORCE
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (let registration of registrations) {
                    registration.update();
                  }
                });

                navigator.serviceWorker.register('/sw.js').then(
                  function(reg) {
                    console.log('SW enregistré scope:', reg.scope);

                    // Vérification périodique des mises à jour
                    setInterval(() => {
                      reg.update();
                    }, 1000 * 60 * 5); // toutes les 5 minutes

                    // Si un nouveau SW est déjà en attente
                    if (reg.waiting) {
                       reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }

                    // Détection d'un nouveau SW en cours d'installation
                    reg.addEventListener('updatefound', () => {
                      const newWorker = reg.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Un nouveau service worker est prêt. On force son activation.
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      }
                    });
                  },
                  function(err) {
                    console.error('SW échec enregistrement:', err);
                  }
                );

                // Rafraîchir la page uniquement quand le NOUVEAU service worker prend le contrôle
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  if (refreshing) return;
                  refreshing = true;
                  window.location.reload();
                });
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
