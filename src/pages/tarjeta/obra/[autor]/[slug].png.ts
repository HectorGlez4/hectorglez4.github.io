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
import { pngDeTarjeta } from '../../../../lib/rasterizado.ts';
import {
  autoresPublicados,
  conjuntoPublicable,
  obrasPublicadas,
  mensajeDeDueñoSinPagina,
  personajesPublicados,
} from '../../../../lib/publicado.ts';
import { segmentosDeObra } from '../../../../lib/obras.ts';
import {
  datosDeTarjetaDeObra,
  svgDeTarjetaDeListado,
  type DatosDeTarjetaDeListado,
} from '../../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();
  // Los mismos dueños que la Página de Obra: los Autores y los Personajes publicados.
  const autores = new Map(
    autoresPublicados(conjunto.autores, conjunto.citas).map((a) => [a.slug, a]),
  );
  const personajes = new Map(
    personajesPublicados(conjunto.personajes, conjunto.citas).map((p) => [p.slug, p]),
  );

  return obrasPublicadas(conjunto).map((obra) => {
    // Historia 35.4 — «{n} citas de {dueño}, {año}»: el Autor de la Obra o su Personaje.
    const dueño = (obra.dueño.tipo === 'personaje' ? personajes : autores).get(obra.dueño.slug);
    // La Tarjeta firmaría con un hueco: el build se para, como la Página de Obra.
    if (dueño === undefined) {
      throw new Error(mensajeDeDueñoSinPagina(obra));
    }
    const { autor: segmentoDeAutor, obra: segmentoDeObra } = segmentosDeObra(obra.nombre);
    return {
      params: { autor: segmentoDeAutor, slug: segmentoDeObra },
      props: { ...datosDeTarjetaDeObra(obra, dueño) },
    };
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const svg = svgDeTarjetaDeListado(props as DatosDeTarjetaDeListado);
  const png = await pngDeTarjeta(svg);

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
