import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cahier Numérique',
    short_name: 'Cahier Num.',
    description: 'Cahier de caisse digital de proximité pour boutiquiers et grossistes en Afrique de l\'Ouest',
    start_url: '/journal',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141210',
    theme_color: '#0E8F6E',
    icons: [
      {
        src: '/icons/favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icons/favicon-48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-any.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
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
    ],
  }
}
