// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// El dominio es provisional hasta que se contrate el definitivo. Vive aquí y en
// ningún otro sitio: la canónica de cada página y el sitemap lo derivan de `site`.
const SITIO = process.env.SITE_URL ?? 'https://sabiduriadebolsillo.com';

// https://astro.build/config
export default defineConfig({
  site: SITIO,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      /*
       * Fuera del sitemap va todo lo que la página declara `noindex`; anunciarlo sería
       * pedirle al buscador que indexe justo lo que se le pide que no indexe.
       *
       *   · Las páginas 2+ de un listado (FR-5). Las Citas que contienen ya están en el
       *     sitemap por su cuenta, así que no se pierde nada.
       *   · `/buscar`, que es una herramienta y no contenido.
       */
      filter: (pagina) =>
        !/\/(?:autor|tema)\/[^/]+\/\d+$/.test(pagina) && !/\/buscar$/.test(pagina),
    }),
  ],

  // UX-DR3 — las dos familias de DESIGN.md por la Fonts API, con `latin-ext` para que
  // los diacríticos españoles y las comillas angulares « » tengan cobertura completa.
  // Sin `latin-ext`, la eñe y las vocales acentuadas caerían al tipo de reserva y la
  // Cita se compondría con dos fuentes distintas en la misma línea.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Source Serif 4',
      cssVariable: '--fuente-serif',
      subsets: ['latin', 'latin-ext'],
      weights: [400, 600],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--fuente-sans',
      subsets: ['latin', 'latin-ext'],
      weights: [400, 600],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
