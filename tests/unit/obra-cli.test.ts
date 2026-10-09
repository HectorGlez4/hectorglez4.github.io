import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ } from './ayuda/construir.js';
import { escribirCita } from '../../tools/lib/corpus.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 22.1 — `npm run obra` sobre disco: los códigos de salida.
 *
 * 1 es lo que la invocación dice (una ficha que todavía se resuelve); 2 es su forma (sin
 * nombre, sin motivo, una bandera que no existe). Nada de esto toca `corpus/`.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusConCita(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-obra-cli-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'obras']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  await writeFile(
    join(corpus, 'autores', 'seneca.yml'),
    'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\n',
    'utf8',
  );
  await escribirCita(join(corpus, 'citas'), 'seneca--a', {
    texto: 'Texto.',
    autor: 'seneca',
    slug: 'seneca-a',
    procedencia: { obra: 'Cartas a Lucilio', año: 64 },
    estadoDerechos: 'dominio-público',
  });
  return corpus;
}

async function correr(corpus: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/obra.ts'), ...argumentos, '--corpus', corpus],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (fallo) {
    const f = fallo as { code?: number; stdout?: string; stderr?: string };
    return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
  }
}

describe('Historia 22.1 — npm run obra', () => {
  it('sembrar crea la ficha y la segunda vez no crea ninguna', async () => {
    const corpus = await corpusConCita();

    const primera = await correr(corpus, ['sembrar']);
    expect(primera.codigo, primera.error).toBe(0);
    expect(primera.salida).toContain('Fichas de Obra creadas: 1');
    expect(await readdir(join(corpus, 'obras'))).toEqual(['seneca--cartas-a-lucilio.yml']);

    const segunda = await correr(corpus, ['sembrar']);
    expect(segunda.codigo, segunda.error).toBe(0);
    expect(segunda.salida).toContain('Fichas de Obra creadas: 0');
  });

  it('retirar una ficha que una Cita resuelve sale con 1 y no mueve nada', async () => {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);

    const hecho = await correr(corpus, ['retirar', 'seneca--cartas-a-lucilio', '--motivo', 'x']);
    expect(hecho.codigo).toBe(1);
    expect(await readdir(join(corpus, 'obras'))).toEqual(['seneca--cartas-a-lucilio.yml']);
  });

  it('retirar una ficha sin Citas sale con 0 y la mueve a _obras-retiradas', async () => {
    const corpus = await corpusConCita();
    await writeFile(
      join(corpus, 'obras', 'seneca--de-la-ira.yml'),
      'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
      'utf8',
    );

    const hecho = await correr(corpus, ['retirar', '--motivo', 'sin Citas', 'seneca--de-la-ira']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await readdir(join(corpus, 'obras'))).toEqual([]);
    expect(await readdir(join(corpus, '_obras-retiradas'))).toEqual(['seneca--de-la-ira.yml']);
  });

  it('retirar una ficha que no existe sale con 1', async () => {
    const corpus = await corpusConCita();
    const hecho = await correr(corpus, ['retirar', 'seneca--nada', '--motivo', 'x']);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toContain('No hay ninguna Ficha de Obra');
  });

  it.each([
    ['sin nombre', ['retirar', '--motivo', 'x']],
    ['sin motivo', ['retirar', 'seneca--cartas-a-lucilio']],
    ['con un motivo en blanco', ['retirar', 'seneca--cartas-a-lucilio', '--motivo', '   ']],
    ['con dos nombres', ['retirar', 'a--b', 'c--d', '--motivo', 'x']],
    ['con una bandera que no existe', ['sembrar', '--seco']],
    ['sin suborden', []],
  ])('%s sale con 2', async (_caso, argumentos) => {
    const corpus = await corpusConCita();
    const hecho = await correr(corpus, argumentos);
    expect(hecho.codigo).toBe(2);
  });
});
