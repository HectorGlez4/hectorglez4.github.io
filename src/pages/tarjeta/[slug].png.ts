/**
 * La Tarjeta Social de cada Cita, como PNG — FR-19.
 *
 *   /tarjeta/{slug}.png
 *
 * Se genera en el build, una por Cita publicada. Es lo contrario de AD-7 —que decidió
 * componer la Imagen de Cita en el cliente para no pregenerar miles de ficheros— y no lo
 * contradice: una previsualización de red no ejecuta JavaScript ni pulsa nada, así que
 * necesita una URL que ya exista. Lo que AD-7 evita es pregenerar lo que casi nadie va a
 * pedir; esto se pide cada vez que alguien pega un enlace.
 *
 * PNG y no SVG porque los validadores de previsualización de las redes no aceptan SVG:
 * una tarjeta en SVG se reporta como imagen inaccesible, que es justo lo que el último
 * criterio comprueba.
 *
 * Las rutas salen del conjunto publicable (AD-11): una Cita en revisión no tiene página,
 * y tampoco tarjeta.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { conjuntoPublicable } from '../../lib/publicado.ts';
import { svgDeTarjeta } from '../../lib/tarjeta.ts';

export const getStaticPaths = (async () => {
  const conjunto = await conjuntoPublicable();
  const autores = new Map(conjunto.autores.map((a) => [a.slug, a]));

  return conjunto.citas.map((cita) => {
    const { obra, año } = cita.procedencia;
    return {
      params: { slug: cita.slug },
      props: {
        texto: cita.texto,
        autor: autores.get(cita.autor)!.nombre,
        procedencia: [obra, año].filter((x) => x !== undefined).join(', ') || undefined,
      },
    };
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const svg = svgDeTarjeta(props as Parameters<typeof svgDeTarjeta>[0]);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
