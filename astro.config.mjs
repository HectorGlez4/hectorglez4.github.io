// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// El dominio es provisional hasta que se contrate el definitivo. Vive aquí y en
// ningún otro sitio: la canónica de cada página y el sitemap lo derivan de `site`.
const SITIO = process.env.SITE_URL ?? 'https://sabiduria-diaria.es';

// https://astro.build/config
export default defineConfig({
  site: SITIO,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
});
