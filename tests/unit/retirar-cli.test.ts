import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/**
 * `tools/retirar.ts` por la boca por la que se usa — Historia 11.1, AD-2.
 *
 * `retirar-fuente.test.ts` ya prueba la lógica, y por eso este fichero existe: **la lógica
 * estaba bien y la orden no arrancaba**. El filtro de argumentos decía
 *
 *     .filter((a, i) => !a.startsWith('--') && i !== conCorpus + 1)
 *
 * y cuando no se pasa `--corpus`, `indexOf` devuelve `-1`, así que `conCorpus + 1` es **0** y
 * la condición descartaba el argumento **0** — el único que hay—. La orden respondía siempre
 * con su propio modo de empleo.
 *
 * Nunca se vio porque la única prueba que había llamaba a la función, no a la orden, y porque
 * las veces que la usé a mano fue con `--corpus`. Una herramienta se prueba por donde se la
 * usa: si la puerta no abre, da igual lo bien amueblada que esté la casa.
 */
describe('tools/retirar.ts — la orden, no solo la función', () => {
  async function corpusDePrueba(): Promise<string> {
    const raiz = await mkdtemp(join(tmpdir(), 'retirar-cli-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const carpeta of ['fuentes', 'citas', '_revision', 'autores', 'temas', 'colecciones']) {
      await mkdir(join(corpus, carpeta), { recursive: true });
    }
    await writeFile(
      join(corpus, 'fuentes', 'wikisource-es--obra-de-prueba.txt'),
      ['fuente: wikisource-es', 'obra: Obra de prueba', 'url: https://es.wikisource.org/wiki/Obra',
       'recuperado: 2026-08-26', '---', 'Encabezado', '---', 'Un cuerpo cualquiera.', ''].join('\n'),
      'utf8',
    );
    return corpus;
  }

  const retirar = (corpus: string, ...args: string[]) =>
    ejecutar('npx', ['tsx', join(RAIZ, 'tools/retirar.ts'), ...args], {
      cwd: resolve(corpus, '..'),
    });

  it('retira sin que haya que pasarle --corpus', async () => {
    const corpus = await corpusDePrueba();

    const { stdout } = await retirar(corpus, 'wikisource-es--obra-de-prueba.txt');

    expect(stdout).not.toContain('Uso:');
    expect(stdout).toContain('wikisource-es--obra-de-prueba.txt');
  });

  it('y sigue retirando cuando sí se le pasa --corpus', async () => {
    // El arreglo no puede romper la forma que sí funcionaba.
    const corpus = await corpusDePrueba();

    const { stdout } = await retirar(corpus, 'wikisource-es--obra-de-prueba.txt', '--corpus', 'corpus');

    expect(stdout).not.toContain('Uso:');
    expect(stdout).toContain('wikisource-es--obra-de-prueba.txt');
  });

  it('sin argumentos sí enseña el modo de empleo, que para eso está', async () => {
    const corpus = await corpusDePrueba();

    await expect(retirar(corpus)).rejects.toMatchObject({
      stderr: expect.stringContaining('Uso:'),
    });
  });
});
