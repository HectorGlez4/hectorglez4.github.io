import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ } from './ayuda/construir.js';
import { escribirCita } from '../../tools/lib/corpus.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';

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

async function correr(corpus: string, argumentos: string[], corpusDelante = false) {
  // Con un «--» en los argumentos, `--corpus` tiene que ir delante: detrás sería posicional.
  const conCorpus = corpusDelante
    ? [argumentos[0], '--corpus', corpus, ...argumentos.slice(1)]
    : [...argumentos, '--corpus', corpus];
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/obra.ts'), ...conCorpus],
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

  it('titular una grafía inventada sale con 1 y una declarada con 0', async () => {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);

    const inventada = await correr(corpus, ['titular', 'seneca--cartas-a-lucilio', 'Obras de Séneca']);
    expect(inventada.codigo).toBe(1);
    expect(inventada.error).toContain('no la declara ninguna Cita publicada');

    const declarada = await correr(corpus, ['titular', 'seneca--cartas-a-lucilio', 'Cartas a Lucilio']);
    expect(declarada.codigo, declarada.error).toBe(0);
  });

  it('reunir fichas de Autores distintos sale con 1', async () => {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);
    await writeFile(
      join(corpus, 'obras', 'horacio--odas.yml'),
      'autor: "horacio"\ntitulo: "Odas"\nformas:\n  - "odas"\n',
      'utf8',
    );
    const hecho = await correr(corpus, ['reunir', 'seneca--cartas-a-lucilio', 'horacio--odas']);
    expect(hecho.codigo).toBe(1);
    expect(await readdir(join(corpus, 'obras'))).toEqual(['horacio--odas.yml', 'seneca--cartas-a-lucilio.yml']);
  });

  it('restituir-grafia sobre una Cita fuera del censo sale con 1', async () => {
    const corpus = await corpusConCita();
    const hecho = await correr(corpus, ['restituir-grafia', 'seneca-a']);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toContain('no está en el censo');
  });

  it('separar dos fichas del mismo Autor sale con 0 y escribe distintaDe', async () => {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);
    await writeFile(
      join(corpus, 'obras', 'seneca--cartas-a-lucilio-i.yml'),
      'autor: "seneca"\ntitulo: "Cartas a Lucilio I"\nformas:\n  - "cartas a lucilio i"\n',
      'utf8',
    );
    const hecho = await correr(corpus, ['separar', 'seneca--cartas-a-lucilio', 'seneca--cartas-a-lucilio-i']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await readFile(join(corpus, 'obras', 'seneca--cartas-a-lucilio.yml'), 'utf8')).toContain(
      'distintaDe:\n  - "cartas a lucilio i"\n',
    );
  });

  it('restituir-grafia sobre una Cita del censo con documento sale con 0', async () => {
    const corpus = await corpusConCita();
    await mkdir(join(corpus, 'fuentes'), { recursive: true });
    await writeFile(join(corpus, 'pendientes-de-cotejo.yml'), 'citas:\n  - seneca-a\n', 'utf8');
    await writeFile(
      join(corpus, 'fuentes', 'wikisource-es--cartas-a-lucilio.txt'),
      componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: 'Cartas a  lucilio',
          url: 'https://es.wikisource.org/wiki/Cartas_a_Lucilio',
          recuperado: '2026-08-21',
        },
        'Cartas a lucilio\n|autor=Séneca',
        'Cuerpo.',
      ),
      'utf8',
    );
    const hecho = await correr(corpus, ['restituir-grafia', 'seneca-a']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await readFile(join(corpus, 'citas', 'seneca--a.md'), 'utf8')).toContain('obra: "Cartas a lucilio"');
  });

  it('todo lo que va detrás de un «--» es posicional', async () => {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);
    // «--Cartas» sería una bandera desconocida (2); detrás de «--» es la grafía, y se rechaza (1).
    const hecho = await correr(corpus, ['titular', 'seneca--cartas-a-lucilio', '--', '--Cartas'], true);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toContain('«--Cartas» no la declara ninguna Cita publicada');
  });

  it.each([
    ['restituir-grafia sin slug', ['restituir-grafia']],
    ['restituir-grafia con dos slugs', ['restituir-grafia', 'a', 'b']],
    ['reunir con una sola ficha', ['reunir', 'seneca--a']],
    ['separar con tres fichas', ['separar', 'a--b', 'c--d', 'e--f']],
    ['titular sin grafía', ['titular', 'seneca--cartas-a-lucilio']],
    ['titular con una bandera que no existe', ['titular', 'a--b', 'X', '--forzar']],
  ])('%s sale con 2', async (_caso, argumentos) => {
    const corpus = await corpusConCita();
    const hecho = await correr(corpus, argumentos);
    expect(hecho.codigo).toBe(2);
  });
});
