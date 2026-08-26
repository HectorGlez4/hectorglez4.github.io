import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — la ficha bibliográfica de una sección de reseñas.
 *
 * Decimotercera forma. El volumen que la abrió no es solo un ensayo: incluye la sección de
 * **reseñas de libros** de la revista donde se publicó, y cada ficha sale como candidata:
 *
 *     Federico de Castro.--Madrid, 1895; un tomo en 4.º, 2,50 pesetas.
 *     --Comentarios al Código civil español.--Madrid, 1890-98; cinco tomos en 4.º, 51 pesetas.
 *
 * Es la trampa de siempre: está literal en el documento y la 11.2 la daría por buena. La escribió
 * el redactor de la sección bibliográfica, no el Autor.
 *
 * **Lo que la delata es el aparato de librero**, no el tema: el número de tomos con su formato
 * («un tomo en 4.º»), el precio en pesetas, o el pie de imprenta con ciudad y año seguido de punto
 * y coma. Una frase que hable de libros, de Madrid o de dinero no lo cumple, y hay prueba de las
 * tres cosas.
 *
 * Medido antes de escribirla: **13 candidatas de 7209, y cero de las 1360 Citas publicadas.**
 */
describe('FR-24 — la ficha de una reseña no es texto del Autor', () => {
  it('la ficha con tomos, formato y precio es aparato', () => {
    expect(esAparatoDeLaFuente('Federico de Castro.--Madrid, 1895; un tomo en 4.º, 2,50 pesetas.')).toBe(
      true,
    );
  });

  it('y la que lista varios tomos', () => {
    expect(
      esAparatoDeLaFuente(
        '--Comentarios al Código civil español.--Madrid, 1890-98; cinco tomos en 4.º, 51 pesetas.',
      ),
    ).toBe(true);
  });

  it('basta el precio en pesetas para delatarla', () => {
    expect(esAparatoDeLaFuente('Barcelona, 1901; 3,75 pesetas.')).toBe(true);
  });

  it('pero una frase del Autor sobre libros no lo es', () => {
    expect(
      esAparatoDeLaFuente('Los libros de la infancia son los que más tarde se releen con provecho.'),
    ).toBe(false);
  });

  it('ni una que hable de dinero sin ser ficha', () => {
    // El Autor puede hablar de pesetas: lo que delata la ficha es el aparato de librero entero.
    expect(
      esAparatoDeLaFuente('Ganaba dos pesetas al día y con ellas mantenía a cinco hijos.'),
    ).toBe(false);
  });

  it('ni una que mencione una ciudad y un año', () => {
    expect(esAparatoDeLaFuente('En Madrid, 1895, se discutía lo mismo que hoy.')).toBe(false);
  });
});
