/**
 * La Tarjeta Social de cada Página de Personaje, como PNG — Historia 35.3b, UX-DR134.
 *
 *   /tarjeta/personaje/{slug}.png
 *
 * AD-28 — **solo hechos del Corpus**: el nombre y «personaje de {universo}», con la plantilla de
 * listado de la de Autor. Qué lleva lo decide `datosDeTarjetaDePersonaje` en `src/lib/tarjeta.ts`,
 * que explica por qué no entran la semblanza ni un recuento.
 *
 * Las rutas salen de `personajesPublicados`, se indexe su página o no: toda página de Personaje
 * —la 1 y las 2+, también bajo `MIN_CITAS_POR_PERSONAJE`— declara esta tarjeta en su `og:image`.
 * Un Personaje declarado sin Citas publicadas no tiene página, y su tarjeta no la enlazaría nadie.
 * Con el Corpus de hoy, sin Personajes, no construye ninguna.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { conjuntoPublicable, personajesPublicados } from '../../../lib/publicado.ts';
import {
  datosDeTarjetaDePersonaje,
  svgDeTarjetaDeListado,
  type DatosDeTarjetaDeListado,
} from '../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();

  return personajesPublicados(conjunto.personajes, conjunto.citas).map((personaje) => ({
    params: { slug: personaje.slug },
    props: { ...datosDeTarjetaDePersonaje(personaje) },
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
