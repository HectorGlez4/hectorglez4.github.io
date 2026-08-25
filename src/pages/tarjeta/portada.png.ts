/**
 * La Tarjeta Social de la portada, como PNG — FR-19.
 *
 *   /tarjeta/portada.png
 *
 * La que más falta hacía de las que no tenían imagen: es lo que se comparte cuando alguien
 * recomienda **el sitio entero**, y hasta hoy salía como un enlace pelado.
 *
 * Una sola, sin parámetro de ruta: la portada es una. Y su contenido sale de lo que la propia
 * página declara —`MARCA` y su descripción—, como el de las otras cuarenta y cuatro.
 *
 * `conMarca: false` porque aquí **el título ya es la marca**, y dibujarla al pie la enseñaría dos
 * veces. Es lo único en que esta tarjeta se aparta de sus hermanas, y por eso va declarado.
 *
 * **No hay tarjeta para `/buscar` ni para `/404`**, y no es un olvido: las dos se declaran
 * `noindex` en `superficies.ts`. Una previsualización para una página que nadie comparte ni
 * indexa es un fichero que no mira nadie.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { DESCRIPCION_DEL_SITIO, MARCA } from '../../lib/marca.ts';
import { svgDeTarjetaDeListado } from '../../lib/tarjeta.ts';

export const GET: APIRoute = async () => {
  const svg = svgDeTarjetaDeListado({
    titulo: MARCA,
    bajada: DESCRIPCION_DEL_SITIO,
    conMarca: false,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
