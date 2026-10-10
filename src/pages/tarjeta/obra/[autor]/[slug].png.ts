/**
 * La Tarjeta Social de cada Página de Obra, como PNG — FR-19, Historia 22.7.
 *
 *   /tarjeta/obra/{slug-autor}/{slug-obra}.png
 *
 * Una por Obra **publicada** —indexable o no: la Página de Obra la declara en todas sus
 * páginas—, con los dos segmentos de su ruta (`segmentosDeObra`). Qué lleva lo decide
 * `datosDeTarjetaDeObra` en `src/lib/tarjeta.ts`: solo hechos del Corpus (AD-28).
 *
 * AD-16 — función del contenido: la entrada es la Obra resuelta (su ficha y las Citas que la
 * componen) y el fichero de su Autor, del que sale el nombre. Nada de fecha ni de calendario,
 * así que el mismo Corpus da los mismos bytes.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { autoresPublicados, conjuntoPublicable, obrasPublicadas } from '../../../../lib/publicado.ts';
import { segmentosDeObra } from '../../../../lib/obras.ts';
import {
  datosDeTarjetaDeObra,
  svgDeTarjetaDeListado,
  type DatosDeTarjetaDeListado,
} from '../../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();
  // Los mismos Autores que la Página de Obra: los publicados.
  const autores = new Map(
    autoresPublicados(conjunto.autores, conjunto.citas).map((a) => [a.slug, a]),
  );

  return obrasPublicadas(conjunto).map((obra) => {
    const autor = autores.get(obra.autor);
    // La Tarjeta firmaría con un hueco: el build se para, como la Página de Obra.
    if (autor === undefined) {
      throw new Error(`La Obra «${obra.nombre}» es de «${obra.autor}», que no tiene Página de Autor publicada.`);
    }
    const { autor: segmentoDeAutor, obra: segmentoDeObra } = segmentosDeObra(obra.nombre);
    return {
      params: { autor: segmentoDeAutor, slug: segmentoDeObra },
      props: { ...datosDeTarjetaDeObra(obra, autor) },
    };
  });
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
