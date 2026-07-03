import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cahier de Caisse Intelligent',
    short_name: 'Cahier Caisse',
    description: 'Cahier de caisse digital de proximité pour boutiquiers et grossistes en Afrique de l\'Ouest',
    start_url: '/journal',
    display: 'standalone',
    background_color: '#141210',
    theme_color: '#064e3b',
    icons: [
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      }
    ],
  }
}
