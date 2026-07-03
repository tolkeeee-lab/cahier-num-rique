import type { Metadata } from 'next'
import { Inter, Caveat, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#064e3b',
}

export const metadata: Metadata = {
  title: 'Cahier Numérique - Gestion de Boutique',
  description: 'Gérez votre boutique simplement, comme un cahier physique.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${caveat.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased bg-[#141210] text-gray-900 min-h-screen">
        {children}
        
        {/* Enregistrement du Service Worker pour le support PWA */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(reg) {
                    console.log('SW enregistré scope:', reg.scope);
                  },
                  function(err) {
                    console.error('SW echec enregistrement:', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
