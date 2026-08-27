import { describe, expect, it } from 'vitest';

import { esTrozoDeCitaAjena } from '../../tools/lib/extraccion.ts';

/**
 * Historia 11.1 — la frase que abre una comilla y no la cierra es de otro.
 *
 * La 144.ª apartó **a mano** una candidata excelente porque cerraba una comilla que no
 * abría: eso es el final de una cita dentro del texto, y publicarla atribuiría al Autor lo
 * que quizá copió. Se anotó la regla y no se implementó.
 *
 * De la 147.ª a la 151.ª el mismo peligro apareció en cuatro obras seguidas, sin relación
 * entre ellas, y siempre con la misma forma: **una comilla sin pareja**. Cuatro veces es un
 * género, no una casualidad.
 *
 * El caso espejo vale igual y por la misma razón: si la frase **abre** comilla y no la
 * cierra, la cita continúa más allá de la frase, así que lo entrecomillado —que es lo que
 * la frase dice— es de otro.
 *
 * Medido antes de escribirla, que es lo que decide si una medida asciende a puerta:
 * **0 de 1595 Citas publicadas** llevan comillas descompensadas, y **351 de 19 036
 * candidatas** sí. No muerde nada de lo bueno.
 *
 * Lo que NO hace, a propósito: no mira la comilla recta `"`, que en estos documentos abre y
 * cierra con el mismo carácter y no se puede saber cuál es cuál sin contar todo el párrafo.
 */
describe('11.1 — una comilla sin pareja delata palabras ajenas', () => {
  it('aparta la frase que abre comilla angular y no la cierra', () => {
    expect(
      esTrozoDeCitaAjena('Decía Séneca: «no es que tengamos poco tiempo para vivir'),
    ).toBe(true);
  });

  it('aparta la frase que abre comilla inglesa y no la cierra', () => {
    expect(
      esTrozoDeCitaAjena('“Las pasiones envejecen y cambian, los partidos se debilitan.'),
    ).toBe(true);
  });

  it('y también la que cierra sin abrir, que es el caso de la 144.ª', () => {
    expect(
      esTrozoDeCitaAjena('basta asirse de una palabra ambigua para contrariar al legislador.»'),
    ).toBe(true);
  });

  it('deja pasar la cita entera, que sí está equilibrada', () => {
    expect(
      esTrozoDeCitaAjena('El proverbio dice «a buena hambre no hay pan duro», y acierta.'),
    ).toBe(false);
  });

  it('deja pasar dos entrecomillados en la misma frase', () => {
    expect(
      esTrozoDeCitaAjena('Entre «lo justo» y «lo útil» hay toda la distancia de un carácter.'),
    ).toBe(false);
  });

  it('deja pasar la frase sin comillas', () => {
    expect(
      esTrozoDeCitaAjena('Es necesario obrar para vivir, y es necesario saber para obrar.'),
    ).toBe(false);
  });

  it('no se fija en la comilla recta, que no dice de qué lado está', () => {
    expect(esTrozoDeCitaAjena('Lo llamaban "rastacueros" sin saber por qué.')).toBe(false);
    expect(esTrozoDeCitaAjena('Y entonces dijo: "no hay tal cosa')).toBe(false);
  });

  it('el cierre de un entrecomillado anidado no cuenta como huérfano', () => {
    expect(
      esTrozoDeCitaAjena('Escribió «lo que llaman “virtud” es costumbre» y se quedó tan ancho.'),
    ).toBe(false);
  });
});
