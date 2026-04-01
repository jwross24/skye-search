import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SkyeSearch',
    short_name: 'SkyeSearch',
    description: 'Immigration-aware career companion for international PhD students',
    start_url: '/immigration',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#1e3a5f',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
