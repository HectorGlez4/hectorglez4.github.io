import { describe, expect, it } from 'vitest';
import {
  autorDeLaCategoria,
  categoriasDeAutorDeWikitexto,
} from '../../tools/lib/documento.ts';

/**
 * Historia 19.8 — el clásico firma con un solo nombre.
 *
 * Medido el 07/09/2026 contra las 2.295 categorías de Wikisource-es que empiezan por uno de
 * los doce géneros: 53 llevan nombre de una sola palabra, 3 en minúscula y 50 en mayúscula,
 * y de esas 50 son personas 48.
 */
describe('Historia 19.8 — una palabra en mayúscula es un nombre', () => {
  it('el mononímico declara, que es media Épica 19', () => {
    for (const nombre of ['Platón', 'Homero', 'Esopo', 'Séneca', 'Virgilio', 'Safo']) {
      expect(autorDeLaCategoria(`[[Categoría:Obras de ${nombre}]]`)).toBe(nombre);
    }
  });

  it('el género en minúscula sigue fuera, sin enumerar nada', () => {
    // La lista de lo que no es un Autor no se acaba nunca: por eso la señal es la mayúscula
    // y no un catálogo de excepciones.
    for (const genero of ['teatro', 'amor', 'consulta', 'esoterismo', 'juventud', 'referencia']) {
      expect(autorDeLaCategoria(`[[Categoría:Obras de ${genero}]]`)).toBeUndefined();
    }
  });

  it('lo de dos palabras no cambia: ni lo que entraba ni lo que no', () => {
    expect(autorDeLaCategoria('[[Categoría:Ensayos de Antonio Machado]]')).toBe('Antonio Machado');
    expect(autorDeLaCategoria('[[Categoría:Obras de la Edad Media]]')).toBeUndefined();
    expect(autorDeLaCategoria('[[Categoría:Cuentos de Navidad]]')).toBe('Navidad');
  });

  it('el falso positivo medido está, y su modo de fallo es negarse, no atribuir', () => {
    /*
     * «Cuentos de Marineda» es la ciudad inventada de Pardo Bazán, y «Cuentos de Nasrudin»,
     * el personaje. Son los dos únicos de las 50 que no son personas, y la prueba los fija
     * para que el día que alguien afloje más la regla vea lo que ya cuesta.
     *
     * No se atribuye nada por esto: lo declarado lo compara después la puerta de FR-23
     * contra el --autor de la orden, y lo que hace es **negar la siembra**, no firmarla.
     */
    expect(autorDeLaCategoria('[[Categoría:Cuentos de Marineda]]')).toBe('Marineda');
    expect(autorDeLaCategoria('[[Categoría:Cuentos de Nasrudin]]')).toBe('Nasrudin');
  });

  it('la categoría se versiona literal, no interpretada', () => {
    const wikitexto = '{{listaref}}\n[[Categoría:Obras de Platón]]\n[[Categoría:Clasicismo]]';
    expect(categoriasDeAutorDeWikitexto(wikitexto)).toEqual(['[[Categoría:Obras de Platón]]']);
  });

  it('una categoría vacía no declara a nadie', () => {
    expect(autorDeLaCategoria('[[Categoría:Obras de ]]')).toBeUndefined();
  });
});
