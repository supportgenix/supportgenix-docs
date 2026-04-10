import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    alpinejs(),
    sitemap(),
    mdx(),
  ],
  image: {
    // Add your remote image domains here if needed
    // domains: ['yourdomain.com'],
    // remotePatterns: [{ protocol: 'https', hostname: 'yourdomain.com' }],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@components': '/src/components',
        '../../components': '/src/components',
      },
    },
  },
  output: 'static',
});
