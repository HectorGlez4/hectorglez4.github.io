/**
 * La Tarjeta Social de cada Página de Tema, como PNG — FR-19.
 *
 *   /tarjeta/tema/{slug}.png
 *
 * Hermana de `/tarjeta/{slug}.png`, y por el mismo motivo: una previsualización de red no
 * ejecuta JavaScript, así que necesita una URL que ya exista. Hasta aquí solo la Página de Cita
 * declaraba `og:image`, y un Tema compartido salía sin imagen.
 *
 * **Las rutas salen de `temasPublicados`, no de `conjunto.temas`.** Un Tema por debajo del
 * umbral no tiene página, y una tarjeta sin página sería un fichero que no enlaza nadie — la
 * clase de huérfano que la Historia 2.7 vigila.
 *
 * La bajada es **la misma descripción que declara la página**, compuesta igual. Que la
 * previsualización prometa una cosa y la página diga otra es el fallo que esto evita.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { conjuntoPublicable, temasPublicados } from '../../../lib/publicado.ts';
import { svgDeTarjetaDeListado } from '../../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();

  return temasPublicados(conjunto.temas, conjunto.citas).map((tema) => ({
    params: { slug: tema.slug },
    props: {
      titulo: tema.nombre,
      bajada:
        `Citas sobre ${tema.nombre.toLocaleLowerCase('es')}, de varios autores, ` +
        'con su procedencia documentada.',
    },
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
