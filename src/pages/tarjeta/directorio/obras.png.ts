/**
 * La Tarjeta Social del Directorio de Obras, como PNG — Historia 26.4, UX-DR79, FR-19.
 *
 *   /tarjeta/directorio/obras.png
 *
 * Gemela de la de Autores: una sola, sin parámetro de ruta, declarada por
 * `TARJETA_DEL_DIRECTORIO_DE_OBRAS` en `src/lib/superficies.ts`, que es por donde la pide la
 * página.
 *
 * Solo hechos del Corpus: «Obras» y cuántas lista el Directorio, con la misma cuenta que la
 * página (`directorioDeObras`). Ninguna nota de Ficha de Obra ni semblanza (AD-28). Se compone en
 * el build (AD-15), y dos construcciones del mismo commit dan los mismos bytes.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { conjuntoPublicable } from '../../../lib/publicado.ts';
import { directorioDeObras } from '../../../lib/directorios.ts';
import { datosDeTarjetaDelDirectorioDeObras, svgDeTarjetaDeListado } from '../../../lib/tarjeta.ts';

export const GET: APIRoute = async () => {
  const conjunto = await conjuntoPublicable();
  const { obras } = directorioDeObras(conjunto.autores, conjunto.citas);
  const svg = svgDeTarjetaDeListado(datosDeTarjetaDelDirectorioDeObras(obras));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
