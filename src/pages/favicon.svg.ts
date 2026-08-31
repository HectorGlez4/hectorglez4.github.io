/**
 * El icono del sitio, como vector.
 *
 *   /favicon.svg
 *
 * Se genera en vez de vivir en `public/` para que salga de la misma función que los PNG:
 * `svgDelIcono()`. Con el fichero estático que había, el vector y el ráster eran dos
 * dibujos que nadie ataba, y el que había era además el de la plantilla de Astro.
 */
import type { APIRoute } from 'astro';
import { svgDelIcono } from '../lib/marca.ts';

export const GET: APIRoute = () =>
  new Response(svgDelIcono(), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
