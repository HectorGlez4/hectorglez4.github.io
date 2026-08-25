import { describe, expect, it } from 'vitest';

import { extraerCandidatas } from '../../tools/lib/extraccion.ts';
import type { DocumentoDeFuente } from '../../tools/lib/extraccion.ts';

/**
 * FR-24 — los epígrafes interiores tampoco se pegan a la frase siguiente.
 *
 * Es el mismo defecto que arregló la 60.ª sesión con el título de la obra, un renglón más
 * abajo: un epígrafe no acaba en punto, así que el troceador lo pegaba a la frase que
 * venía detrás.
 *
 *   «Discurso Puede el hombre con ardimiento y con bondad ser valiente y virtuoso…»
 *
 * Medido sobre un solo documento de 222 KB: **42 candidatas envenenadas**, y no las peores
 * sino las mejores — 26 de ellas empiezan por «Discurso», que es justo la palabra con la
 * que ese libro anuncia el comentario sentencioso del Autor frente al relato histórico.
 *
 * Y como con el título, el daño no es perder candidatas: aprobar una publicaría una Cita
 * que empieza con un epígrafe de la Fuente, y el cotejo de la 11.2 la daría por buena,
 * porque ese texto **está** en el documento.
 *
 * **El arreglo no es una heurística sobre el epígrafe, sino respetar una estructura que la
 * Fuente ya declaraba**: el párrafo. `sentencias()` colapsaba todo el espacio en blanco
 * antes de trocear —`\s+` a un espacio—, y con él se llevaba por delante los saltos de
 * párrafo. Una frase no cruza un párrafo; un epígrafe es un párrafo entero. Trocear dentro
 * de cada párrafo y no a través de ellos hace innecesario adivinar qué es un epígrafe.
 */
describe('FR-24 — el epígrafe interior no se pega a la frase siguiente', () => {
  const documento = (texto: string): DocumentoDeFuente => ({
    fuente: 'wikisource-es',
    obra: 'Vida de Marco Bruto',
    url: 'https://es.wikisource.org/wiki/Marco_Bruto',
    texto,
  });

  const SENTENCIA =
    'Puede el hombre con ardimiento y con bondad ser valiente y virtuoso; mas faltándole ' +
    'el estudio, no sabrá ser virtuoso ni valiente.';

  it('ninguna candidata empieza por el epígrafe', () => {
    const resultado = extraerCandidatas(documento(`Discurso\n\n${SENTENCIA}`), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.every((c) => !c.texto.startsWith('Discurso'))).toBe(true);
  });

  it('y la sentencia que va detrás llega entera y sola', () => {
    const resultado = extraerCandidatas(documento(`Discurso\n\n${SENTENCIA}`), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.map((c) => c.texto)).toContain(SENTENCIA);
  });

  it('una frase que la Fuente partió en dos renglones sigue siendo una sola candidata', () => {
    /*
     * El corte es **por párrafo**, no por renglón. Wikisource parte líneas donde le cabe, y
     * cortar ahí trocearía media obra por la mitad de sus frases.
     */
    const partida =
      'Perder la libertad es de bestias;\ndejar que nos la quiten, de cobardes, y no hay quien lo ignore.';
    const resultado = extraerCandidatas(documento(partida), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.map((c) => c.texto)).toContain(
      'Perder la libertad es de bestias; dejar que nos la quiten, de cobardes, y no hay quien lo ignore.',
    );
  });

  it('dos frases del mismo párrafo siguen dando dos candidatas', () => {
    const dos =
      'El señor perpetuo de las edades es el dinero: o reina siempre, o quieren que siempre reine. ' +
      'Aquel hombre que pierde la honra por el negocio, pierde el negocio y la honra.';
    const resultado = extraerCandidatas(documento(dos), 'seneca');
    if (!resultado.ok) throw new Error('no hubo candidatas');

    expect(resultado.candidatas.map((c) => c.texto)).toContain(
      'El señor perpetuo de las edades es el dinero: o reina siempre, o quieren que siempre reine.',
    );
    expect(resultado.candidatas.map((c) => c.texto)).toContain(
      'Aquel hombre que pierde la honra por el negocio, pierde el negocio y la honra.',
    );
  });
});
