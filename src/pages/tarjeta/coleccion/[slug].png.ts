/**
 * La Tarjeta Social de cada Página de Colección, como PNG — FR-19.
 *
 *   /tarjeta/coleccion/{slug}.png
 *
 * La bajada es **el criterio**, literal y sin adjetivar, por lo mismo que la página lo emite
 * literal en su `<meta>`: NFR-12 prohíbe que el sistema altere lo que el editor guardó, y
 * UX-DR32 prohíbe componer una frase que adjetive las Citas.
 *
 * Es además el dato que mejor explica esta página a quien ve el enlace antes de abrirlo —«por
 * qué están juntas»— y hasta ahora solo viajaba en el texto de la previsualización.
 *
 * Las rutas salen de `coleccionesPublicadas`: una Colección por debajo del umbral no tiene
 * página, y su tarjeta sería un huérfano.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { conjuntoPublicable } from '../../../lib/publicado.ts';
import { svgDeTarjetaDeListado } from '../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();

  return conjunto.colecciones.map((coleccion) => ({
    params: { slug: coleccion.slug },
    props: { titulo: coleccion.nombre, bajada: coleccion.criterio },
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
