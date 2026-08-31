/**
 * El icono del sitio, como PNG, en los tamaños declarados.
 *
 *   /icono/{lado}.png
 *
 * PNG además del vector porque los dos consumidores que importan no se conforman con SVG:
 * el icono del resultado de búsqueda de Google, que documenta un cuadrado múltiplo de 48, y
 * iOS al añadir a la pantalla de inicio. Es el mismo motivo por el que la Tarjeta Social se
 * rasteriza (FR-19), y se hace igual: el SVG entra en `sharp` y sale el PNG.
 *
 * Los lados salen de `TAMANOS_DEL_ICONO` y no de una lista escrita aquí: el armazón declara
 * esas mismas rutas en sus `<link>`, y una lista por su cuenta las dejaría apuntando a un
 * 404 el día que cambiara.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { PALETA } from '../../lib/lienzo.ts';
import { TAMANOS_DEL_ICONO, svgDelIcono } from '../../lib/marca.ts';

export const getStaticPaths = (() =>
  TAMANOS_DEL_ICONO.map((lado) => ({ params: { tamano: String(lado) } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const lado = Number(params.tamano);
  /*
   * Se aplana sobre el papel, y no es cosmética: el `rx` de la marca deja las cuatro
   * esquinas fuera del rectángulo, así que el PNG salía con alfa 0 ahí. iOS **compone el
   * apple-touch-icon sobre negro** antes de aplicar su propia máscara, de modo que el icono
   * de la pantalla de inicio aparecía con las esquinas negras dentro de otro redondeo. Y
   * contradecía lo que `svgDelIcono` declara de sí misma: que el fondo es opaco.
   *
   * El vector conserva el `rx` —ahí el redondeo sí se ve y el alfa no estorba—; lo que se
   * aplana es el ráster, que es el que acaba compuesto por otro.
   */
  const png = await sharp(Buffer.from(svgDelIcono()))
    .resize(lado, lado)
    .flatten({ background: PALETA.papel })
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
