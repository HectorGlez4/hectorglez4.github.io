/**
 * La geometría de la Tarjeta Social de una Cita en verso — Historia 29.1, solo para medir.
 *
 * La 29.1 no decide la Tarjeta del verso: da a Héctor las cifras para decidirla. Por eso la
 * cuenta vive en `tools/` y `src/lib/tarjeta.ts` no se toca: aquí se repite su geometría
 * (margen, interlineado, filete y atribución) y `tests/unit/lineas.test.ts` la contrasta con
 * `svgDeTarjeta` real sobre un texto sin saltos de cada tramo, para que no pueda divergir sin
 * que nada falle. Puro.
 */

import { ANCHO } from '../../src/lib/tarjeta.ts';
import { repartirEnLineas } from '../../src/lib/lienzo.ts';
import { tramoDe } from '../../src/lib/tramos.ts';

/** El margen de `svgDeTarjeta`, que allí es privado. Lo vigila la prueba de contraste. */
const MARGEN_DE_TARJETA = 80;
const ANCHO_UTIL = ANCHO - MARGEN_DE_TARJETA * 2;

/**
 * Las líneas de la Tarjeta con el texto en verso: cada verso se reparte por separado —un verso
 * nunca se une al siguiente— y las comillas angulares abren el primero y cierran el último.
 * Sin saltos es exactamente el reparto de `svgDeTarjeta`.
 */
export function lineasDeTarjetaEnVerso(texto: string, cuerpo: number): string[] {
  const versos = texto.split('\n');
  return versos.flatMap((verso, i) => {
    const abierto = i === 0 ? `«${verso}` : verso;
    const cerrado = i === versos.length - 1 ? `${abierto}»` : abierto;
    return repartirEnLineas(cerrado, cuerpo, ANCHO_UTIL);
  });
}

/**
 * El alto que pediría la Tarjeta para no salirse: los dos márgenes, el texto, el aire hasta el
 * filete (40) y la atribución (24 + 34, y 30 más con procedencia). Con el `cuerpo` de `tramoDe`.
 * `undefined` si la Cita no admite Imagen: entonces la Tarjeta no lleva texto.
 */
export function altoDeTarjeta(texto: string, conProcedencia: boolean): number | undefined {
  const tramo = tramoDe(texto);
  if (!tramo.admiteImagen) return undefined;
  const cuerpo = tramo.pixelesEnTarjeta;
  const lineas = lineasDeTarjetaEnVerso(texto, cuerpo).length;
  return (
    2 * MARGEN_DE_TARJETA + lineas * Math.round(cuerpo * 1.3) + 40 + 24 + 34 + (conProcedencia ? 30 : 0)
  );
}
