import { describe, expect, it } from 'vitest';

import { esAparatoDeLaFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — la lista de lecturas recomendadas que el Autor deja al final de un capítulo.
 *
 * Hermana de la **ficha bibliográfica** que ya guarda `ficha-bibliografica.test.ts`, y distinta:
 * aquélla la escribe el redactor de una sección de reseñas y la delata el aparato de librero
 * —tomos, formato, precio en pesetas—. Ésta la escribe **el Autor**, es un plan de estudios, y no
 * lleva precio ninguno:
 *
 *     Las historias y las costumbres de los germanos (uno).--SALUSTIO: Conjuración de Catilina.
 *     Teatro selecto (dos).--HUMBOLDT: Colón y el descubrimiento de América (dos).
 *
 * Que la escriba el Autor no la hace Cita: es un índice, y un índice no dice nada suelto. La forma
 * que la delata es el **nombre en versales seguido de dos puntos detrás de una raya doble**, que es
 * como la Fuente transcribe la lista del original.
 *
 * Medido antes de escribirla: **0 de 1558 Citas publicadas** y **10 de 14 745 candidatas**, y las
 * diez son listas de lecturas.
 *
 * La medida estuvo a punto de no hacerse bien: el primer conteo sobre el conjunto en revisión
 * devolvió **0 porque el comando falló** —«argument list too long» con catorce mil ficheros—, y un
 * cero de un comando roto se lee igual que un cero de verdad. Es el mismo defecto que la 124.ª
 * encontró en la puerta y la 138.ª en la sonda de fechas.
 */
describe('FR-24 — la lista de lecturas no es texto del Autor', () => {
  it('caza la lista con el nombre en versales tras la raya doble', () => {
    expect(
      esAparatoDeLaFuente(
        'Las historias y las costumbres de los germanos (uno).--SALUSTIO: Conjuración de Catilina.',
      ),
    ).toBe(true);
  });

  it('y la que encadena varios autores', () => {
    expect(
      esAparatoDeLaFuente(
        'Teatro selecto (dos).--HUMBOLDT: Colón y el descubrimiento de América (dos).',
      ),
    ).toBe(true);
  });

  it('pero una frase que nombra a alguien en versales no lo es', () => {
    // El Autor puede escribir un nombre en versales dentro de su prosa; lo que delata la lista
    // es la RAYA DOBLE delante, que es como la Fuente separa las entradas del indice.
    expect(
      esAparatoDeLaFuente('SÓCRATES enseñó a dudar de la religión de sus padres, y le dieron cicuta.'),
    ).toBe(false);
  });

  it('ni una que use dos puntos para explicarse', () => {
    expect(
      esAparatoDeLaFuente('No hay más que una regla: mirar cada cosa del modo en que mejor se ve.'),
    ).toBe(false);
  });

  it('ni un inciso con raya doble sin nombre detrás', () => {
    expect(
      esAparatoDeLaFuente('El sabio--decía--hace luego lo que el necio deja para el final.'),
    ).toBe(false);
  });
});
