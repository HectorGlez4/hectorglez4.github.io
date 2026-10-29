/**
 * La Tarjeta Social del Directorio de Autores, como PNG — Historia 26.3, UX-DR79, FR-19.
 *
 *   /tarjeta/directorio/autores.png
 *
 * Fuera del espacio `/tarjeta/{slug}.png` de las Citas, y una sola, sin parámetro de ruta, como
 * la de la portada. La ruta la declara `TARJETA_DEL_DIRECTORIO_DE_AUTORES` en
 * `src/lib/superficies.ts`; la página la pide por esa constante.
 *
 * Solo hechos del Corpus: «Autores» y cuántos lista el Directorio, con la misma cuenta que la
 * página (`directorioDeAutores`). Ninguna semblanza (AD-28): la imagen sale del sitio sin enlace
 * ni licencia. Se compone en el build (AD-15), y dos construcciones del mismo commit dan los
 * mismos bytes.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { conjuntoPublicable } from '../../../lib/publicado.ts';
import { directorioDeAutores } from '../../../lib/directorios.ts';
import { datosDeTarjetaDelDirectorioDeAutores, svgDeTarjetaDeListado } from '../../../lib/tarjeta.ts';

export const GET: APIRoute = async () => {
  const conjunto = await conjuntoPublicable();
  const { autores } = directorioDeAutores(conjunto.autores, conjunto.citas);
  const svg = svgDeTarjetaDeListado(datosDeTarjetaDelDirectorioDeAutores(autores));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
