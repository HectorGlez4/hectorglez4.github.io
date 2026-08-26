import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — el número de página que abre el renglón de una composición a dos columnas.
 *
 * Hermano del folio intercalado que guarda `numero-de-pagina.test.ts`, y **no el mismo**: aquél
 * va dentro de la frase y entre guiones —«…que envenenase la vida, -61- adoración que…»—; éste
 * abre el renglón, y detrás viene el texto de dos columnas que el OCR entrelazó:
 *
 *     109 Su ejemplo es por sí sólo una Su ejemplo es por sí solo una influencia social influencia
 *     127 para cuanto dice referencia á para cuanto hace referencia á las necesidades materiales
 *
 * Es la peor clase de basura porque **es español legible**: la puerta de la 11.5 mide caracteres
 * ajenos y OCR roto, no repetición, así que la deja pasar entera. Leída deprisa parece una Cita
 * con una errata.
 *
 * ## Lo que se midió antes de elegir la regla
 *
 * La firma obvia era la **repetición** —una secuencia de cuatro palabras que aparece dos veces—.
 * Medida, caza **17 de las 1497 Citas publicadas**, y las diecisiete son buenas: son anáfora.
 *
 *     «Aun en el nombre es peligroso comunicar con los malos, y hasta en el nombre es útil
 *      comunicar con los buenos.»
 *     «…no los premios que se piden por los servicios, sino los premios que se piden por los…»
 *
 * Diecisiete Citas legítimas muertas para cazar treinta y cuatro. Esa regla queda **medida y
 * descartada**, junto a las líneas en mayúsculas, el verso colapsado y la palabra pegada.
 *
 * La que sí sirve es la **etiqueta de página** con que abre el renglón, sin depender de la
 * repetición: **0 de 1497 publicadas** y **34 de 11 095 candidatas**, y las 34 son doblado real.
 */
describe('FR-24 — la columna entrelazada abre con su número de página', () => {
  it('caza el renglón de dos columnas entrelazadas', () => {
    expect(
      esAparatoDeLaFuente(
        '109 Su ejemplo es por sí sólo una Su ejemplo es por sí solo una influencia social influencia social',
      ),
    ).toBe(true);
  });

  it('y el que trae la errata de la otra columna', () => {
    expect(
      esAparatoDeLaFuente(
        '127 para cuanto dice referencia á para cuanto hace referencia á las necesidades materiales',
      ),
    ).toBe(true);
  });

  it('basta el número al abrir, sin repetición ninguna', () => {
    // La repetición no es la regla —mata anáforas—: la regla es la etiqueta de página. Un
    // renglón de una sola columna con su número delante es igual de basura y no repite nada.
    expect(esAparatoDeLaFuente('45 á la cual debe siempre beneficios que agradece')).toBe(true);
  });

  it('pero una Cita que empieza por palabra no lo es, lleve números o no', () => {
    expect(
      esAparatoDeLaFuente('En 1868 el pueblo español pasó de la categoría de esclavo a la de soberano.'),
    ).toBe(false);
  });

  it('ni una frase cuyo sujeto es un número escrito con letra', () => {
    expect(esAparatoDeLaFuente('Cien años no bastan para deshacer lo que un día levantó.')).toBe(
      false,
    );
  });

  it('y una frase limpia sigue pasando', () => {
    expect(
      esAparatoDeLaFuente('Admirar es sentirse crecer en la emulación de los más grandes.'),
    ).toBe(false);
  });
});
