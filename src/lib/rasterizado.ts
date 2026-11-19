/**
 * Cómo se codifica una Tarjeta Social: el único dueño (FR-19).
 *
 * Los nueve endpoints de `src/pages/tarjeta/` y las pruebas que comparan bytes llaman a
 * `pngDeTarjeta`, y nadie más escribe `sharp(svg).png()` para una tarjeta. `tarjeta.ts` compone
 * el SVG y sigue puro (AD-5): no importa `sharp`; rasterizar es cosa de este módulo.
 *
 * **Por qué con paleta.** Con las opciones por omisión de `sharp` (RGBA, compresión 6) cada
 * tarjeta pesaba unos 60 KB (514 MiB en 9.107 tarjetas), y las Tarjetas Sociales eran el 56 % de `dist/`: el 19/11/2026
 * `dist/` pasó `TOPE_DE_PESO_DE_DIST` y `npm run build` se paró. Una tarjeta son colores planos
 * con texto suavizado —unos 496 colores, casi todos rampas de borde entre tres o cuatro tintas—,
 * así que en RGB sin alfa y con paleta de 256 colores (cuantización a calidad 100, sin tramado,
 * compresión 9) pesa un 56 % menos, y en una muestra de 203 tarjetas construidas ningún canal se
 * movió más de 3/255: la cuantización solo funde pasos vecinos de esas rampas. Lo vigila una
 * prueba de `tests/unit/tarjeta.test.ts`, que compara con el raster sin pérdida. Decisión de Héctor del 19/11/2026,
 * elegida frente a la recompresión sin pérdida (un 27 % menos).
 *
 * El alfa se aplana sobre el papel (`flatten`): toda tarjeta pinta hoy un fondo opaco de lienzo
 * entero, y así una que algún día no lo pinte sale sobre papel y no sobre negro.
 *
 * Sin tramado (`dither: 0`) porque el tramado añadiría ruido en los fondos planos, y bytes.
 * `quality` y `effort` ya implican paleta en `sharp`; `palette: true` se escribe igual para que
 * se lea. La salida es determinista: el mismo SVG da los mismos bytes en dos procesos.
 *
 * No rasteriza el icono del sitio, la Pieza de Canal ni la Imagen de Cita del cliente.
 */
import sharp from 'sharp';
import { PALETA } from './lienzo.ts';

/** El PNG de una Tarjeta Social a partir de su SVG. Lanza si `sharp` no puede leerlo. */
export async function pngDeTarjeta(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .flatten({ background: PALETA.papel })
    .png({ palette: true, quality: 100, effort: 10, dither: 0, compressionLevel: 9 })
    .toBuffer();
}
