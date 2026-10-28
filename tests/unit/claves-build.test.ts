import { afterAll, describe, expect, it } from 'vitest';
import { AUTOR_VALIDO, TEMA_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { REGLA_DE_CLAVE_DE_ORDEN } from '../../src/lib/admision.ts';

/**
 * Historia 26.1 — la clave de orden es puerta del build (AD-1, enmienda v8).
 *
 * Lo puro está en `claves.test.ts`; aquí se comprueba que la regla **es puerta** sobre un
 * proyecto construido de verdad: un Autor publicado sin clave rompe nombrando su fichero y la
 * orden que la propone, un Autor sin Citas publicadas construye sin ella, y una clave sin
 * forma rompe con la regla, se publique el Autor o no.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const SIN_CLAVE = AUTOR_VALIDO.replace(/^ordenAlfabetico: .*\n/mu, '');
const HORACIO = 'nombre: Horacio\nañoFallecimiento: -8\nsemblanza: Poeta latino.\n';

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

describe('Historia 26.1 — todo Autor publicado tiene su clave de orden', () => {
  it('el Autor de partida de las pruebas lleva clave', () => {
    expect(AUTOR_VALIDO).toMatch(/^ordenAlfabetico: \S/mu);
    expect(SIN_CLAVE).not.toContain('ordenAlfabetico');
  });

  it('un Autor publicado sin clave rompe el build nombrando su fichero y la orden que la propone', async () => {
    const r = await construirConCorpus({ ...BASE, 'autores/seneca.yml': SIN_CLAVE });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('corpus/autores/seneca.yml');
    expect(r.salida).toContain('npx tsx tools/autor.ts proponer-claves');
  });

  it('un Autor sin Citas publicadas —o con todas en revisión— construye sin clave', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'autores/horacio.yml': HORACIO,
      '_revision/horacio--carpe-diem.md': citaValida({
        texto: 'Aprovecha el día.',
        autor: 'horacio',
        slug: 'horacio-aprovecha-el-dia',
      }),
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
  });

  it('una clave sin forma rompe el build con el Autor, el campo y la regla, aunque no se publique', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'autores/horacio.yml': `${HORACIO}ordenAlfabetico: "1984"\n`,
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('horacio');
    expect(r.salida).toContain('ordenAlfabetico');
    expect(r.salida).toContain(REGLA_DE_CLAVE_DE_ORDEN);
  });
});
