import { describe, expect, it } from 'vitest';
import { autorDeLaCategoria } from '../../tools/lib/documento.ts';

/**
 * Historia 19.10 — los géneros que faltaban.
 *
 * Medido el 13/09/2026: 262 categorías entre los cinco géneros nuevos, y ninguna que no
 * sea persona. Lo que estas pruebas vigilan de verdad no es lo que entra, sino lo que se
 * midió y se dejó fuera.
 */
describe('Historia 19.10 — los cinco géneros nuevos declaran Autor', () => {
  it('la tragedia, que es lo que dejaba mudo a Sófocles', () => {
    expect(autorDeLaCategoria('[[Categoría:Tragedias de Sófocles]]')).toBe('Sófocles');
  });

  it('el teatro, que trae a Aristófanes y a Esquilo', () => {
    expect(autorDeLaCategoria('[[Categoría:Teatro de Aristófanes]]')).toBe('Aristófanes');
    expect(autorDeLaCategoria('[[Categoría:Teatro de Esquilo]]')).toBe('Esquilo');
  });

  it('la comedia, la fábula, la epístola y el soneto', () => {
    expect(autorDeLaCategoria('[[Categoría:Comedias de Molière]]')).toBe('Molière');
    expect(autorDeLaCategoria('[[Categoría:Fábulas de Esopo]]')).toBe('Esopo');
    expect(autorDeLaCategoria('[[Categoría:Epístolas de Bartolomé Mitre]]')).toBe('Bartolomé Mitre');
    expect(autorDeLaCategoria('[[Categoría:Sonetos de Alfonsina Storni]]')).toBe('Alfonsina Storni');
  });
});

describe('Historia 19.10 — y los tres que se midieron y no entran', () => {
  /*
   * Son los frecuentes —137, 55 y 292 categorías— y los tres nombran a quien NO escribió.
   * Esta prueba existe para que añadirlos por simetría cueste ponerla en rojo a mano.
   */
  it('«Traducciones de …» nombra al traductor, no al Autor', () => {
    expect(autorDeLaCategoria('[[Categoría:Traducciones de Alejo García Moreno]]')).toBeUndefined();
  });

  it('«Ilustraciones de …» nombra al ilustrador', () => {
    expect(autorDeLaCategoria('[[Categoría:Ilustraciones de Apeles Mestres]]')).toBeUndefined();
  });

  it('«Documentos de …» nombra al retratado, no a quien firma', () => {
    expect(autorDeLaCategoria('[[Categoría:Documentos de Abraham Lincoln]]')).toBeUndefined();
  });

  it('ni los que nombran un lugar o un Estado', () => {
    for (const c of ['Historia de Alemania', 'Leyes de Chile', 'Tratados de Bolivia']) {
      expect(autorDeLaCategoria(`[[Categoría:${c}]]`)).toBeUndefined();
    }
  });

  it('un título de libro no pasa, y lo para la guarda de la 19.8', () => {
    expect(
      autorDeLaCategoria('[[Categoría:Fábulas de Esopo, filósofo moral, y de otros famosos autores]]'),
    ).toBeUndefined();
  });
});
