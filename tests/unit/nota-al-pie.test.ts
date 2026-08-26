import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — la nota al pie y la palabra partida por el renglón.
 *
 * Dos formas más de aparato, las dos encontradas leyendo candidatas de un artículo de prensa
 * del XIX, y las dos con la misma trampa que el folio: **el cotejo de la 11.2 las daría por
 * buenas**, porque están literales en el documento. Las escribió la Fuente, no el Autor.
 *
 *   · **La flecha de retorno de la nota.** Wikisource pone `↑` al pie para volver a la llamada,
 *     y la línea entera —«↑ Almanaque de Galicia, para uso de la juventud elegante»— sale como
 *     candidata perfectamente formada. No es una frase del Autor: es la bibliografía de una nota.
 *
 *   · **La palabra partida por el final de renglón.** La edición transcrita conserva el guion con
 *     que el impresor cortaba la palabra al acabar la línea, y la sentencia queda cercenada:
 *     «¡Cuántos pobres pajarillos no son en tales ocasio-».
 *
 * **Se descarta la candidata entera; no se recompone la palabra.** Unir «ocasio-» con lo que
 * siguiera sería reconstruir texto que la Fuente no da junto —NFR-12 prohíbe que el sistema
 * altere el texto— y además dejaría una Cita que ya no aparece literal en su documento, así que
 * la 11.2 la rechazaría después. Es el mismo precio que se paga con el resto del aparato.
 *
 * Medido antes de escribir la puerta: **una candidata en revisión con la flecha y una con la
 * palabra partida, y ninguna Cita publicada con ninguna de las dos.** Se llega a tiempo otra vez.
 */
describe('FR-24 — la nota al pie y el renglón cortado no son texto del Autor', () => {
  it('la línea de retorno de una nota es aparato', () => {
    expect(
      esAparatoDeLaFuente(
        '↑ Almanaque de Galicia, para uso de la juventud elegante y de buen tono.',
      ),
    ).toBe(true);
  });

  it('y también si la flecha viene con el número de la nota', () => {
    expect(esAparatoDeLaFuente('↑ 3 Véase la edición de 1881, página cuarta.')).toBe(true);
  });

  it('una frase que termina en palabra partida por el renglón es aparato', () => {
    expect(
      esAparatoDeLaFuente('¡Cuántos pobres pajarillos no son en tales ocasio-'),
    ).toBe(true);
  });

  it('un guion de inciso al final no es una palabra partida', () => {
    /*
     * La forma tiene que ser estrecha o se llevaría por delante frases sanas: lo que delata el
     * corte de renglón es que el guion viene **pegado a letras**, sin espacio delante.
     */
    expect(esAparatoDeLaFuente('Y entonces calló —')).toBe(false);
  });

  it('una palabra compuesta con guion en medio tampoco', () => {
    expect(
      esAparatoDeLaFuente('El acuerdo franco-alemán no resolvió nada de lo que prometía.'),
    ).toBe(false);
  });

  it('ni una flecha en medio de la frase, que no es el retorno de una nota', () => {
    // El retorno abre la línea. En medio, la flecha es del Autor y se respeta.
    expect(esAparatoDeLaFuente('La cuenta salía así: uno ↑ dos, y nadie la entendió.')).toBe(false);
  });
});
