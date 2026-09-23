import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cahier de Caisse Intelligent',
    short_name: 'Cahier Caisse',
    description: 'Cahier de caisse digital de proximité pour boutiquiers et grossistes en Afrique de l\'Ouest',
    start_url: '/journal',
    scope: '/',
    display: 'standalone',
    background_color: '#141210',
    theme_color: '#064e3b',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
