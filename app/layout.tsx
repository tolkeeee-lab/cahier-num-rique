import type { Metadata } from 'next'
import { Inter, Playpen_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playpen = Playpen_Sans({
  subsets: ['latin'],
  variable: '--font-playpen',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Cahier Numérique - Gestion de Boutique',
  description: 'Gérez votre boutique simplement, comme un cahier physique.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${playpen.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased bg-[#f4efe6] text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
