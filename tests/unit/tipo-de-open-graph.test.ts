import { describe, expect, it } from 'vitest';
import { tipoDeOpenGraph } from '../../src/lib/tipoDeResultado.ts';

/**
 * FR-19 — qué clase de página dice ser cada superficie al compartirse.
 *
 * `Armazon` declaraba `og:type="article"` para **todas**: la portada, el buscador, los Temas,
 * las Colecciones y las Páginas de Autor incluidas. Se vio contándolo en vivo, y es sencillamente
 * falso: `article` es del Open Graph para una pieza de contenido con autor y fecha, y un listado
 * no lo es. La portada declarándose artículo es el caso que mejor lo enseña.
 *
 * La regla es de una línea y por eso vive aquí y no repartida por las páginas: **una Cita es un
 * artículo, todo lo demás es un sitio**. Un Tema, una Colección y una Página de Autor son
 * listados; la portada, el buscador y el 404 no llevan tipo y caen del mismo lado.
 */
describe('FR-19 — el tipo de Open Graph sale de la clase de superficie', () => {
  it('una Cita es un artículo: tiene autor, obra y año', () => {
    expect(tipoDeOpenGraph('cita')).toBe('article');
  });

  it('un Tema, una Colección y un Autor son listados, no artículos', () => {
    expect(tipoDeOpenGraph('tema')).toBe('website');
    expect(tipoDeOpenGraph('coleccion')).toBe('website');
    expect(tipoDeOpenGraph('autor')).toBe('website');
  });

  it('y una superficie sin tipo —la portada, el buscador, el 404— también', () => {
    // Es el caso que destapó el fallo: la portada se declaraba artículo.
    expect(tipoDeOpenGraph(undefined)).toBe('website');
  });
});
