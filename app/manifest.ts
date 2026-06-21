import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mise — Kitchen Brain',
    short_name: 'Mise',
    description: "Scan it in, see what's dying, get 3 good dinners.",
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf7f0',
    theme_color: '#fbf7f0',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
