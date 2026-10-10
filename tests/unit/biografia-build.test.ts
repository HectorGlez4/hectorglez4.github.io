import { afterAll, describe, expect, it } from 'vitest';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { componerBiografia } from '../../tools/lib/documento.ts';

/**
 * Historia 17.1 — la puerta de la revisión, puesta de verdad.
 *
 * `biografia.test.ts` prueba el criterio sin construir. Esto construye y exige que el build
 * **rompa** cuando el Autor declara una biografía que no es la revisión versionada, con el
 * patrón de `cotejo-build.test.ts`.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const DOCUMENTO = 'wikipedia-es--seneca--r123';

const BIOGRAFIA = componerBiografia(
  {
    fuente: 'wikipedia-es',
    titulo: 'Séneca',
    revision: 123,
    fechaDeRevision: '2024-05-01',
    licencia: 'CC BY-SA 4.0',
    url: 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
    recuperado: '2026-10-10',
  },
  'Séneca',
  'Lucio Anneo Séneca fue un filósofo hispanorromano.',
);

function autorConBiografia(documento: string, revision: number): string {
  return `${AUTOR_VALIDO}biografia:\n  documento: ${documento}\n  revision: ${revision}\n`;
}

const CORPUS_BASE = {
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--el-tiempo.md': citaValida(),
  [`biografias/${DOCUMENTO}.txt`]: BIOGRAFIA,
};

describe('Historia 17.1 — la revisión que declara un Autor es la versionada, o el build rompe', () => {
  it('el documento existe y es la revisión declarada: construye', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia(DOCUMENTO, 123),
    });
    expect(salida).not.toMatch(/Regla incumplida/);
    expect(codigo).toBe(0);
  });

  /*
   * El esquema exige ya que el sufijo del nombre sea la revisión declarada, así que para
   * llegar a la puerta con una revisión distinta el Autor declara la del nombre y es la
   * **cabecera** del documento la que dice otra.
   */
  it('revisión distinta: rompe nombrando el Autor, el documento y las dos revisiones', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia('wikipedia-es--seneca--r124', 124),
      'biografias/wikipedia-es--seneca--r124.txt': BIOGRAFIA,
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toContain('corpus/biografias/wikipedia-es--seneca--r124.txt');
    expect(salida).toMatch(/revisión 124/);
    expect(salida).toMatch(/revisión 123/);
    // Roto solo por la biografía: el titular la nombra y el resumen limpio no sale.
    expect(salida).toMatch(/1 incumplimiento \(es de la biografía de un Autor\)/);
    expect(salida).not.toMatch(/pendientes de cotejo/);
  });

  it('documento inexistente: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia('wikipedia-es--seneca--r999', 999),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toMatch(/wikipedia-es--seneca--r999\.txt.*no existe/s);
  });

  it('documento ilegible: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [`biografias/${DOCUMENTO}.txt`]: 'esto no es un documento\n',
      'autores/seneca.yml': autorConBiografia(DOCUMENTO, 123),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toMatch(/no tiene la forma que produce la recuperación/);
  });

  it('documento de una Fuente no mutable: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [`biografias/wikisource-es--seneca--r123.txt`]: BIOGRAFIA.replace(
        'fuente: wikipedia-es',
        'fuente: wikisource-es',
      ),
      'autores/seneca.yml': autorConBiografia('wikisource-es--seneca--r123', 123),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no es la biografía de una Fuente mutable/);
  });

  it('nombre y cabecera discrepantes: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'biografias/wikipedia-es--lucio-anneo-seneca--r123.txt': BIOGRAFIA,
      'autores/seneca.yml': autorConBiografia('wikipedia-es--lucio-anneo-seneca--r123', 123),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(`corpus/biografias/${DOCUMENTO}.txt`);
    expect(salida).toMatch(/tienen que decir lo mismo/);
  });
});
