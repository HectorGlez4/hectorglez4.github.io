import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ, citaValida } from './ayuda/construir.js';

const ejecutar = promisify(execFile);

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** Historia 19.1 — la salud cuenta las traducidas sin traducción, sobre un corpus pequeño. */
describe('Historia 19.1 — tools/auditoria.ts --json', () => {
  it('un Séneca de tradición «otra», con documento y sin traducción, cuenta 1', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-auditoria-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', '_revision', 'fuentes']) {
      await mkdir(join(corpus, dir), { recursive: true });
    }
    await writeFile(
      join(corpus, 'autores', 'seneca.yml'),
      'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo estoico.\ntradicion: otra\n',
      'utf8',
    );
    // Con documento y sin traducción: cuenta.
    await writeFile(join(corpus, 'citas', 'seneca--una.md'), citaValida({ temas: [] }), 'utf8');
    // Sin documento: no puede traer traducción, y no cuenta.
    await writeFile(
      join(corpus, 'citas', 'seneca--otra.md'),
      citaValida({
        temas: [],
        slug: 'seneca-la-vida-si-sabes-usarla-es-larga',
        texto: 'La vida, si sabes usarla, es larga.',
        fuente: undefined,
      }),
      'utf8',
    );

    const { stdout } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/auditoria.ts'), '--json', '--corpus', corpus],
      { cwd: RAIZ },
    );
    const informe = JSON.parse(stdout) as {
      traducidasSinTraduccion: { total: number; porAutor: { autor: string; citas: number }[] };
    };
    expect(informe.traducidasSinTraduccion).toEqual({
      total: 1,
      porAutor: [{ autor: 'seneca', citas: 1 }],
    });
  });
});
