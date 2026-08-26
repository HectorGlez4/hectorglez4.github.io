import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — la línea del índice de capítulos.
 *
 * Novena forma de aparato, y **la que más produce de golpe**: la página raíz de una obra con
 * capítulos es su tabla de contenidos, y cada línea sale como candidata perfectamente formada.
 *
 *     Capítulo I - De la penitencia que a imitación de Beltenebros principió y no concluyó
 *     nuestro buen caballero don Quijote
 *
 * Un solo documento dio **sesenta**. Y son la trampa de siempre: el cotejo de la 11.2 las daría
 * por buenas, porque están literales en el documento —las escribió la Fuente al componer el
 * índice, no el Autor al escribir la obra—.
 *
 * **Y enseña un límite de la heurística del tamaño.** `ES_INDICE_POR_DEBAJO_DE` distingue índice
 * de texto por lo que pesa la página, y funciona mientras el índice sea una lista escueta. Éste
 * pesaba **8,2 KB** porque sus sesenta títulos son largos, así que pasó por texto. El tamaño no
 * basta; lo que delata un índice es **de qué están hechas sus líneas**.
 *
 * La forma es estrecha a propósito: la palabra de división, su número —romano o árabe— y un
 * separador. Una frase que hable de un capítulo, o que empiece por «Capítulo aparte merece…», no
 * la cumple.
 *
 * Medido antes de escribirla: **60 candidatas de 4981, y cero de las 1266 Citas publicadas**.
 */
describe('FR-24 — la línea del índice no es texto del Autor', () => {
  it('la entrada de un índice de capítulos es aparato', () => {
    expect(
      esAparatoDeLaFuente(
        'Capítulo I - De la penitencia que a imitación de Beltenebros principió y no concluyó ' +
          'nuestro buen caballero don Quijote',
      ),
    ).toBe(true);
  });

  it('también con número árabe y con dos puntos', () => {
    expect(esAparatoDeLaFuente('Capítulo 12: De lo que sucedió después')).toBe(true);
  });

  it('y con las otras palabras con que se divide una obra', () => {
    expect(esAparatoDeLaFuente('Libro III — De la naturaleza de las cosas')).toBe(true);
    expect(esAparatoDeLaFuente('Acto II. Sale el caballero')).toBe(true);
  });

  it('pero una frase que habla de un capítulo no es un índice', () => {
    expect(
      esAparatoDeLaFuente('Capítulo aparte merece la costumbre de juzgar sin haber leído.'),
    ).toBe(false);
  });

  it('ni una frase que menciona un capítulo por su número dentro del discurso', () => {
    expect(
      esAparatoDeLaFuente('En el capítulo III se demuestra que la razón no basta sin el hábito.'),
    ).toBe(false);
  });
});
