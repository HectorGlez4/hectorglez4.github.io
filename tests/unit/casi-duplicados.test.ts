import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ } from './ayuda/construir.js';
import { escribirCita, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { casiDuplicados, formatearCasiDuplicados } from '../../tools/lib/casiDuplicados.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 29.4 — `npm run obra -- casi-duplicados`: los pares dentro de cada Obra publicada, sin
 * escribir nada. Un Corpus temporal con dos Obras de Séneca, con pares en cada una, y un texto
 * repetido entre las dos Obras, que no es un par: entre Obras distintas no se mira.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const REPETIDA_ENTRE_OBRAS = 'La ira es una locura breve que no sabe gobernarse a sí misma.';

async function corpusConDosObras(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-casi-duplicados-'));
  temporales.push(raiz);
  const corpus = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', '_revision', 'obras']) {
    await mkdir(join(corpus, dir), { recursive: true });
  }
  await writeFile(
    join(corpus, 'autores', 'seneca.yml'),
    'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\nordenAlfabetico: Séneca\n',
    'utf8',
  );
  await writeFile(
    join(corpus, 'obras', 'seneca--cartas-a-lucilio.yml'),
    'autor: "seneca"\ntitulo: "Cartas a Lucilio"\nformas:\n  - "cartas a lucilio"\n',
    'utf8',
  );
  await writeFile(
    join(corpus, 'obras', 'seneca--de-la-ira.yml'),
    'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
    'utf8',
  );
  const cita = (slug: string, texto: string, obra: string) =>
    escribirCita(join(corpus, 'citas'), slug.replace(/^seneca-/u, 'seneca--'), {
      texto,
      autor: 'seneca',
      slug,
      procedencia: { obra, año: 64 },
      estadoDerechos: 'dominio-público',
    });
  // Cartas a Lucilio: una repetida, una contenida y una casi igual; más una suelta.
  await cita('seneca-a-repetida', 'No es que tengamos poco tiempo, es que perdemos mucho.', 'Cartas a Lucilio');
  await cita('seneca-b-repetida', '¡No es que tengamos poco tiempo; es que perdemos MUCHO!', 'Cartas a Lucilio');
  await cita(
    'seneca-c-larga',
    'Mientras se espera vivir, la vida pasa, y nadie devuelve los años ni te restituye a ti mismo.',
    'Cartas a Lucilio',
  );
  await cita('seneca-d-corta', 'Mientras se espera vivir, la vida pasa, y nadie devuelve los años', 'Cartas a Lucilio');
  await cita(
    'seneca-e-julio',
    'Cultivo una rosa blanca en julio como enero para el amigo sincero que me da su mano franca.',
    'Cartas a Lucilio',
  );
  await cita(
    'seneca-f-junio',
    'Cultivo una rosa blanca en junio como enero para el amigo sincero que me da su mano franca.',
    'Cartas a Lucilio',
  );
  await cita('seneca-g-suelta', REPETIDA_ENTRE_OBRAS, 'Cartas a Lucilio');
  // De la ira: un solo par, y la repetida de la otra Obra.
  await cita('seneca-h-ira', REPETIDA_ENTRE_OBRAS, 'De la ira');
  await cita('seneca-i-ira', 'Ningún animal es más feroz que el hombre que se deja llevar por su cólera.', 'De la ira');
  await cita('seneca-j-ira', 'Ningún animal es más feroz que el hombre que se deja llevar por su cólera', 'De la ira');
  return corpus;
}

async function correr(corpus: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar('npx', ['tsx', join(RAIZ, 'tools/obra.ts'), ...argumentos, '--corpus', corpus], {
      cwd: RAIZ,
    });
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (fallo) {
    const f = fallo as { code?: number; stdout?: string; stderr?: string };
    return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
  }
}

/** El árbol entero del Corpus, fichero a fichero y byte a byte. */
async function arbol(dir: string): Promise<Record<string, string>> {
  const salida: Record<string, string> = {};
  for (const nombre of (await readdir(dir, { recursive: true })).sort()) {
    const ruta = join(dir, nombre);
    try {
      salida[nombre] = await readFile(ruta, 'utf8');
    } catch {
      salida[nombre] = '<directorio>';
    }
  }
  return salida;
}

describe('Historia 29.4 — casiDuplicados', () => {
  it('pares solo dentro de cada Obra, la Obra con más pares primero y por clase', async () => {
    const corpus = await corpusConDosObras();
    const resultado = await casiDuplicados(rutasDelCorpus(corpus));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const { parte } = resultado;
    expect(parte.obras.map((o) => o.obra)).toEqual(['seneca--cartas-a-lucilio', 'seneca--de-la-ira']);
    const [cartas, ira] = parte.obras;
    expect(cartas.pares.map((p) => [p.clase, ...p.slugs])).toEqual([
      ['repetidas', 'seneca-a-repetida', 'seneca-b-repetida'],
      ['contenida', 'seneca-c-larga', 'seneca-d-corta'],
      ['casi-iguales', 'seneca-e-julio', 'seneca-f-junio'],
    ]);
    expect(cartas.pares[1].contenida).toBe('seneca-d-corta');
    expect(cartas.pares[2].palabra).toEqual(['julio', 'junio']);
    expect(ira.pares.map((p) => [p.clase, ...p.slugs])).toEqual([['repetidas', 'seneca-i-ira', 'seneca-j-ira']]);
    // La repetida entre Obras distintas no es un par.
    const todos = parte.obras.flatMap((o) => o.pares.flatMap((p) => p.slugs));
    expect(todos).not.toContain('seneca-g-suelta');
    expect(todos).not.toContain('seneca-h-ira');
    expect(parte.resumen).toEqual({
      recorridas: 2,
      conPares: 2,
      pares: { repetidas: 2, contenida: 1, 'casi-iguales': 1 },
    });

    const texto = formatearCasiDuplicados(parte);
    expect(texto).toContain('npm run documentar -- --retirar <slug> "<motivo>"');
    expect(texto).toContain('conservar las dos');
    expect(texto).toContain('npm run documentar -- <slug> <documento> --texto "…"');
    expect(texto.indexOf('retirar una')).toBeLessThan(texto.indexOf('conservar las dos'));
    expect(texto.indexOf('conservar las dos')).toBeLessThan(texto.indexOf('restituir el literal'));
  });

  it('el orden lo dan el número de pares y la clase, no el nombre ni el slug', async () => {
    // La Obra con más pares se llama «zzz» y su casi igual tiene los slugs que van primero: un
    // orden solo por nombre o solo por slug pondría «aaa» delante y la casi igual antes que la
    // repetida.
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-casi-duplicados-orden-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', '_revision', 'obras']) {
      await mkdir(join(corpus, dir), { recursive: true });
    }
    await writeFile(
      join(corpus, 'autores', 'seneca.yml'),
      'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\nordenAlfabetico: Séneca\n',
      'utf8',
    );
    for (const [nombre, titulo] of [['aaa', 'Aaa'], ['zzz', 'Zzz']]) {
      await writeFile(
        join(corpus, 'obras', `seneca--${nombre}.yml`),
        `autor: "seneca"\ntitulo: "${titulo}"\nformas:\n  - "${nombre}"\n`,
        'utf8',
      );
    }
    const cita = (slug: string, texto: string, obra: string) =>
      escribirCita(join(corpus, 'citas'), slug.replace(/^seneca-/u, 'seneca--'), {
        texto,
        autor: 'seneca',
        slug,
        procedencia: { obra, año: 64 },
        estadoDerechos: 'dominio-público',
      });
    await cita('seneca-0-julio', 'Cultivo una rosa blanca en julio como enero para el amigo sincero que me da su mano franca.', 'Zzz');
    await cita('seneca-1-junio', 'Cultivo una rosa blanca en junio como enero para el amigo sincero que me da su mano franca.', 'Zzz');
    await cita('seneca-8-repetida', 'No es que tengamos poco tiempo, es que perdemos mucho.', 'Zzz');
    await cita('seneca-9-repetida', '¡No es que tengamos poco tiempo; es que perdemos MUCHO!', 'Zzz');
    await cita('seneca-a-ira', 'Ningún animal es más feroz que el hombre que se deja llevar por su cólera.', 'Aaa');
    await cita('seneca-b-ira', 'Ningún animal es más feroz que el hombre que se deja llevar por su cólera', 'Aaa');

    const resultado = await casiDuplicados(rutasDelCorpus(corpus));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.parte.obras.map((o) => o.obra)).toEqual(['seneca--zzz', 'seneca--aaa']);
    expect(resultado.parte.obras[0].pares.map((p) => [p.clase, ...p.slugs])).toEqual([
      ['repetidas', 'seneca-8-repetida', 'seneca-9-repetida'],
      ['casi-iguales', 'seneca-0-julio', 'seneca-1-junio'],
    ]);
  });

  it('una ficha nombrada recorre solo esa', async () => {
    const corpus = await corpusConDosObras();
    const resultado = await casiDuplicados(rutasDelCorpus(corpus), ['seneca--de-la-ira']);
    expect(resultado.ok && resultado.parte.obras.map((o) => o.obra)).toEqual(['seneca--de-la-ira']);
  });

  it('sin pares, el parte lo dice', async () => {
    const corpus = await corpusConDosObras();
    for (const slug of ['a-repetida', 'c-larga', 'e-julio', 'i-ira']) {
      await rm(join(corpus, 'citas', `seneca--${slug}.md`));
    }
    const resultado = await casiDuplicados(rutasDelCorpus(corpus));
    expect(resultado.ok && resultado.parte.obras).toEqual([]);
    expect(resultado.ok && formatearCasiDuplicados(resultado.parte)).toContain('Ningún par');
    const cli = await correr(corpus, ['casi-duplicados']);
    expect(cli.codigo, cli.error).toBe(0);
    expect(cli.salida).toContain('Ningún par');
  });

  it('una ficha nombrada sin Citas publicadas se dice, no pasa por recorrida', async () => {
    const corpus = await corpusConDosObras();
    await writeFile(
      join(corpus, 'obras', 'seneca--sin-citas.yml'),
      'autor: "seneca"\ntitulo: "Sin citas"\nformas:\n  - "sin citas"\n',
      'utf8',
    );
    const resultado = await casiDuplicados(rutasDelCorpus(corpus), ['seneca--sin-citas']);
    expect(resultado.ok && resultado.parte.sinCitas).toEqual(['seneca--sin-citas']);
    expect(resultado.ok && resultado.parte.resumen.recorridas).toBe(0);
    expect(resultado.ok && formatearCasiDuplicados(resultado.parte)).toContain(
      'seneca--sin-citas: sin Citas publicadas; no se recorre.',
    );
    const todas = await casiDuplicados(rutasDelCorpus(corpus));
    expect(todas.ok && todas.parte.sinCitas).toBeUndefined();
  });

  it('un Corpus sin obras/ no tiene Obras que recorrer, y no es un fallo', async () => {
    const corpus = await corpusConDosObras();
    await rm(join(corpus, 'obras'), { recursive: true });
    const resultado = await casiDuplicados(rutasDelCorpus(corpus));
    expect(resultado.ok && resultado.parte.resumen).toEqual({
      recorridas: 0,
      conPares: 0,
      pares: { repetidas: 0, contenida: 0, 'casi-iguales': 0 },
    });
  });

  it('un Corpus ilegible no da parte', async () => {
    const corpus = await corpusConDosObras();
    await writeFile(join(corpus, 'citas', 'seneca--rota.md'), '---\ntexto: "sin cerrar\n: :\n---\n', 'utf8');
    const resultado = await casiDuplicados(rutasDelCorpus(corpus));
    expect(resultado.ok).toBe(false);
  });
});

describe('Historia 29.4 — npm run obra -- casi-duplicados', () => {
  it('sale con 0, el --json se analiza con la forma declarada, y el Corpus no cambia', async () => {
    const corpus = await corpusConDosObras();
    const antes = await arbol(corpus);

    const parte = await correr(corpus, ['casi-duplicados']);
    expect(parte.codigo, parte.error).toBe(0);
    expect(parte.salida).toContain('seneca--cartas-a-lucilio («Cartas a Lucilio»): 3 pares');

    const json = await correr(corpus, ['casi-duplicados', '--json']);
    expect(json.codigo, json.error).toBe(0);
    const leido = JSON.parse(json.salida);
    expect(leido.resumen.pares).toEqual({ repetidas: 2, contenida: 1, 'casi-iguales': 1 });
    expect(leido.obras[0]).toMatchObject({ obra: 'seneca--cartas-a-lucilio', titulo: 'Cartas a Lucilio' });
    expect(Object.keys(leido.obras[0].pares[0]).sort()).toEqual(['clase', 'parecido', 'slugs', 'textos']);

    expect(await arbol(corpus)).toEqual(antes);
  });

  it('una ficha inexistente sale con 1 y no informa de ninguna', async () => {
    const corpus = await corpusConDosObras();
    const r = await correr(corpus, ['casi-duplicados', 'no-existe']);
    expect(r.codigo).toBe(1);
    expect(r.salida).toBe('');
    expect(r.error).toContain('no-existe');
  });

  it('un Corpus ilegible o inexistente sale con 1', async () => {
    const corpus = await corpusConDosObras();
    await writeFile(join(corpus, 'citas', 'seneca--rota.md'), '---\ntexto: "sin cerrar\n: :\n---\n', 'utf8');
    expect((await correr(corpus, ['casi-duplicados'])).codigo).toBe(1);
    expect((await correr(join(corpus, 'no-hay'), ['casi-duplicados'])).codigo).toBe(1);
  });

  it.each([
    ['una bandera desconocida', ['casi-duplicados', '--jsno']],
    ['--json repetida', ['casi-duplicados', '--json', '--json']],
    ['--corpus repetida', ['casi-duplicados', '--corpus', 'otro']],
  ])('%s sale con 2', async (_caso, argumentos) => {
    const corpus = await corpusConDosObras();
    const r = await correr(corpus, argumentos);
    expect(r.codigo).toBe(2);
    expect(r.salida).toBe('');
  });
});
