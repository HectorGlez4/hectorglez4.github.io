import { describe, expect, it } from 'vitest';
import { cierreDeLosAutores } from '../../src/lib/atribucion.ts';

/**
 * Historia 28.4 — el cierre de los Autores de la portada, puro: «Los {m} autores, de la A a la Z»
 * hacia `/autores/`, con la m de la línea de cifras. Sin glifo: el «›» lo pone la portada.
 */
describe('Historia 28.4 — el cierre de los Autores de la portada', () => {
  it('«Los {m} autores, de la A a la Z», con punto de millar, y «El 1 autor, de la A a la Z»', () => {
    expect(cierreDeLosAutores(1)).toBe('El 1 autor, de la A a la Z');
    expect(cierreDeLosAutores(2)).toBe('Los 2 autores, de la A a la Z');
    expect(cierreDeLosAutores(1234)).toBe('Los 1.234 autores, de la A a la Z');
  });

  it('no lleva el glifo de avance', () => {
    expect(cierreDeLosAutores(10)).not.toMatch(/[›→]/);
  });

  it('lanza con un recuento que no es un entero de 1 en adelante', () => {
    for (const m of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => cierreDeLosAutores(m), String(m)).toThrow(/cierreDeLosAutores/);
    }
  });
});
