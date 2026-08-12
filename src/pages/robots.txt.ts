/**
 * `/robots.txt` — LC-2.
 *
 * Es una ruta del sitio y no un fichero de `public/` para que la línea `Sitemap:` salga
 * del mismo dominio que la canónica de cada página. Copiada a mano, sobreviviría a un
 * cambio de dominio apuntando al anterior.
 */
import type { APIRoute } from 'astro';
import { robots } from '../lib/buscadores.ts';

export const GET: APIRoute = ({ site }) =>
  new Response(robots(site!.origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
