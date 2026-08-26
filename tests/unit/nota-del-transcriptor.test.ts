import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — la nota del transcriptor, y la puerta que **no** se pone.
 *
 * Décima forma, y la primera que llega de una Fuente distinta. Al abrir Project Gutenberg —que
 * estaba admitido desde siempre y con un solo documento en ciento cuarenta y tres— entraron con
 * ella sus propias marcas:
 *
 *     * Las páginas en blanco han sido eliminadas.
 *     * Los errores de imprenta han sido corregidos.
 *
 * Eso lo escribió quien transcribió el libro, no el Autor, y es la trampa de siempre: está
 * literal en el documento, así que la 11.2 lo daría por bueno. Confirma lo que la 80.ª ya había
 * anotado: **cada vez que se abre una puerta nueva entra con ella una forma nueva de aparato**.
 *
 * ## Y una segunda forma que se midió y se descartó
 *
 * El mismo documento trae **títulos de sección en versales** —«MÉTODO HISTÓRICO DE ELEVACIÓN
 * CIENTÍFICA Y CULTURAL»—, y la tentación era cerrar «toda línea entera en mayúsculas». Medirlo
 * lo impidió: de las cinco candidatas que casan esa forma, **dos son epitafios citados dentro de
 * la obra**, y ésos son texto del Autor:
 *
 *     UN HOMBRE QUE NO EN VANO HA ESPERADO EN DIOS
 *
 * Una puerta que se lleva por delante texto legítimo es peor que no tenerla, porque el descarte
 * no se ve: la candidata simplemente no aparece. Así que los títulos en versales **se descartan a
 * mano al leer**, como los ítems numerados de la 99.ª, y esta prueba deja constancia de que la
 * puerta se consideró y se rechazó con la medida delante.
 *
 * Medido: **2 candidatas de 6123, y cero de las 1273 Citas publicadas.**
 */
describe('FR-24 — la nota del transcriptor no es texto del Autor', () => {
  it('la nota sobre las páginas en blanco es aparato', () => {
    expect(esAparatoDeLaFuente('* Las páginas en blanco han sido eliminadas.')).toBe(true);
  });

  it('y la de los errores de imprenta también', () => {
    expect(esAparatoDeLaFuente('* Los errores de imprenta han sido corregidos.')).toBe(true);
  });

  it('y la que se anuncia por su nombre, con asterisco o sin él', () => {
    expect(esAparatoDeLaFuente('Nota del transcriptor: se ha respetado la ortografía.')).toBe(true);
  });

  it('un epitafio en versales NO es aparato: lo escribió el Autor', () => {
    // Esta es la puerta que no se puso, y la prueba existe para que no se ponga después.
    expect(esAparatoDeLaFuente('UN HOMBRE QUE NO EN VANO HA ESPERADO EN DIOS')).toBe(false);
  });

  it('ni una frase que hable de erratas dentro del discurso', () => {
    expect(
      esAparatoDeLaFuente('Los errores de imprenta de aquella edición desesperaban al autor.'),
    ).toBe(false);
  });
  /**
   * Y la familia crece: al leer aparecieron tres variantes más que las dos primeras no cazaban
   * —la ortografía actualizada, las notas renumeradas, las tildes puestas a las mayúsculas—.
   *
   * En vez de seguir enumerando fórmulas, se midió la forma genérica: **la línea que abre con
   * asterisco**. De 6123 candidatas la cumplen **cinco, y las cinco son notas del transcriptor**;
   * de las 1273 Citas publicadas, **ninguna**. Enumerar variantes deja siempre la sexta fuera;
   * esta forma es a la vez más ancha y más segura, porque el asterisco inicial es de la Fuente y
   * nunca del Autor.
   */
  it('cualquier nota del transcriptor abierta con asterisco es aparato', () => {
    for (const nota of [
      '* La ortografía del texto original ha sido actualizada de acuerdo con las normas.',
      '* Las notas a pie de página han sido renumeradas y colocadas al final del libro.',
      '* Se han puesto tildes a las mayúsculas y se han espaciado las rayas.',
    ]) {
      expect(esAparatoDeLaFuente(nota), nota).toBe(true);
    }
  });

  it('pero un asterisco dentro de la frase no la convierte en nota', () => {
    expect(esAparatoDeLaFuente('La regla vale siempre * salvo cuando no vale.')).toBe(false);
  });
});
