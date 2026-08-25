/**
 * La Tarjeta Social de cada Página de Autor, como PNG — FR-19.
 *
 *   /tarjeta/autor/{slug}.png
 *
 * La bajada es **la semblanza**, literal: es lo que el editor escribió sobre ese Autor y lo que
 * su página emite en el `<meta>`. Componer otra frase aquí haría que la previsualización y la
 * página dijeran cosas distintas del mismo Autor.
 *
 * Las rutas salen de `autoresPublicados`, no de `conjunto.autores`: un Autor declarado y sin
 * ninguna Cita publicada **no tiene página** —hoy hay uno así— y su tarjeta sería un fichero
 * que no enlaza nadie.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { autoresPublicados, conjuntoPublicable } from '../../../lib/publicado.ts';
import { svgDeTarjetaDeListado } from '../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();

  return autoresPublicados(conjunto.autores, conjunto.citas).map((autor) => ({
    params: { slug: autor.slug },
    props: { titulo: autor.nombre, bajada: autor.semblanza },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const svg = svgDeTarjetaDeListado(props as Parameters<typeof svgDeTarjetaDeListado>[0]);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
