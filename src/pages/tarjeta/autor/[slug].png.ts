/**
 * La Tarjeta Social de cada Página de Autor, como PNG — FR-19.
 *
 *   /tarjeta/autor/{slug}.png
 *
 * Historia 17.2, AD-28 — **solo hechos del Corpus**: nombre, años y recuento de Citas
 * documentadas, para todos los Autores. Qué lleva lo decide `datosDeTarjetaDeAutor` en
 * `src/lib/tarjeta.ts`, que explica por qué la semblanza no entra nunca.
 *
 * Las rutas salen de `autoresPublicados`, no de `conjunto.autores`: un Autor declarado y sin
 * ninguna Cita publicada **no tiene página** —hoy hay uno así— y su tarjeta sería un fichero
 * que no enlaza nadie.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { autoresPublicados, conjuntoPublicable } from '../../../lib/publicado.ts';
import {
  datosDeTarjetaDeAutor,
  svgDeTarjetaDeListado,
  type DatosDeTarjetaDeListado,
} from '../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();

  return autoresPublicados(conjunto.autores, conjunto.citas).map((autor) => ({
    params: { slug: autor.slug },
    props: { ...datosDeTarjetaDeAutor(autor, conjunto.citas) },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const svg = svgDeTarjetaDeListado(props as DatosDeTarjetaDeListado);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
