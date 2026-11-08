import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RAIZ, TIENDA_DE_PRUEBA } from './ayuda/construir.js';
import { escribirCita, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { declararEdicion } from '../../tools/lib/obras.ts';
import * as wd from './ayuda/wikidata.ts';
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
    'nombre: Séneca\nañoFallecimiento: 65\nsemblanza: Filósofo.\nordenAlfabetico: Séneca\n',
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

describe('Historia 22.8 — congelar y levantar', () => {
  /** Una copia de `umbrales.ts` del repositorio: la orden nunca toca el de verdad aquí. */
  async function umbralesDePrueba(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'sabiduria-umbrales-'));
    temporales.push(dir);
    const fichero = join(dir, 'umbrales.ts');
    await writeFile(fichero, await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8'), 'utf8');
    return fichero;
  }

  /** Cartas con 3 Citas y una suelta: 3 de 4 es el 75 %, indexable. */
  async function corpusConObraIndexable(): Promise<string> {
    const corpus = await corpusConCita();
    for (const [slug, obra] of [
      ['seneca-b', 'Cartas a Lucilio'],
      ['seneca-c', 'Cartas a Lucilio'],
      ['seneca-d', undefined],
    ] as const) {
      await escribirCita(join(corpus, 'citas'), slug.replace('seneca-', 'seneca--'), {
        texto: `Texto ${slug}.`,
        autor: 'seneca',
        slug,
        ...(obra === undefined ? {} : { procedencia: { obra, año: 64 } }),
        estadoDerechos: 'dominio-público',
      });
    }
    expect((await correr(corpus, ['sembrar'])).codigo).toBe(0);
    return corpus;
  }

  it('el repositorio queda sin congelar', async () => {
    expect(await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8')).toContain(
      'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;',
    );
  });

  it('congelar escribe la jornada y la lista indexable vigente, y solo ese bloque', async () => {
    const corpus = await corpusConObraIndexable();
    const umbrales = await umbralesDePrueba();
    const original = await readFile(umbrales, 'utf8');

    const hecho = await correr(corpus, ['congelar', '--umbrales', umbrales]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('1 Obra(s) indexable(s)');
    const congelado = await readFile(umbrales, 'utf8');
    expect(congelado).toMatch(
      /export const CONGELACION_DE_OBRAS: CongelacionDeObras \| undefined = \{\n {2}desde: '\d{4}-\d{2}-\d{2}',\n {2}indexables: \[\n {4}'seneca--cartas-a-lucilio',\n {2}\],\n\};/,
    );
    // Fuera del bloque, nada cambia.
    const fuera = (texto: string) => texto.replace(/export const CONGELACION_DE_OBRAS[\s\S]*?;\n(?=\n)/, '');
    expect(fuera(congelado)).toBe(fuera(original));

    // Congelar dos veces se niega, y no escribe.
    const otra = await correr(corpus, ['congelar', '--umbrales', umbrales]);
    expect(otra.codigo).toBe(1);
    expect(otra.error).toMatch(/ya está congelada desde el/);
    expect(await readFile(umbrales, 'utf8')).toBe(congelado);

    // Levantar la devuelve a `undefined`: el fichero queda como estaba.
    const levantada = await correr(corpus, ['levantar', '--umbrales', umbrales]);
    expect(levantada.codigo, levantada.error).toBe(0);
    expect(await readFile(umbrales, 'utf8')).toBe(original);

    // Y levantar sin congelación se niega, sin escribir.
    const nada = await correr(corpus, ['levantar', '--umbrales', umbrales]);
    expect(nada.codigo).toBe(1);
    expect(nada.error).toMatch(/no está congelada/);
    expect(await readFile(umbrales, 'utf8')).toBe(original);
  });

  it('congelar sin ninguna Obra indexable hoy se niega con 1 y no escribe', async () => {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);
    const umbrales = await umbralesDePrueba();
    const original = await readFile(umbrales, 'utf8');
    const hecho = await correr(corpus, ['congelar', '--umbrales', umbrales]);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toMatch(/no se indexa ninguna Obra/);
    expect(await readFile(umbrales, 'utf8')).toBe(original);
  });

  it('el analizador de la declaración: el mismo que usa el aviso para leer `desde`', async () => {
    const { leerCongelacionDeclarada, constanteNumerica } = await import('../../tools/lib/obras.ts');
    const original = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    expect(leerCongelacionDeclarada(original)).toEqual({ estado: 'declarada', congelacion: undefined });
    expect(leerCongelacionDeclarada('export const OTRA = 1;')).toEqual({ estado: 'sin-bloque' });
    const congelado = original.replace(
      'CongelacionDeObras | undefined = undefined;',
      "CongelacionDeObras | undefined = {\n  desde: '2026-12-06',\n  indexables: [\n    'a--b',\n    'c--d',\n  ],\n};",
    );
    expect(leerCongelacionDeclarada(congelado)).toEqual({
      estado: 'declarada',
      congelacion: { desde: '2026-12-06', indexables: ['a--b', 'c--d'] },
    });
    const roto = original.replace(
      'CongelacionDeObras | undefined = undefined;',
      "CongelacionDeObras | undefined = {\n  desde: '2026-12-06',\n  indexables: LISTA,\n};",
    );
    expect(leerCongelacionDeclarada(roto).estado).toBe('ilegible');
    expect(constanteNumerica(original, 'MAX_PROPORCION_OBRA_DEL_AUTOR')).toBe(0.9);
    expect(constanteNumerica(original, 'MIN_CITAS_OBRA_INDEXABLE')).toBe(2);
  });

  it('un fichero sin el bloque se niega con 1 y no lo toca', async () => {
    const corpus = await corpusConCita();
    const umbrales = await umbralesDePrueba();
    await writeFile(umbrales, 'export const OTRA = 1;\n', 'utf8');
    const hecho = await correr(corpus, ['congelar', '--umbrales', umbrales]);
    expect(hecho.codigo).toBe(1);
    expect(await readFile(umbrales, 'utf8')).toBe('export const OTRA = 1;\n');
  });

  it.each([
    ['congelar con un argumento de más', ['congelar', 'ya']],
    ['levantar con una bandera que no existe', ['levantar', '--forzar']],
  ])('%s sale con 2', async (_caso, argumentos) => {
    const corpus = await corpusConCita();
    expect((await correr(corpus, argumentos)).codigo).toBe(2);
  });
});

describe('Historia 32.1 — npm run obra -- wikidata y wikidata-vigente', () => {
  const FICHA = 'seneca--cartas-a-lucilio';
  const SENECA = wd.entidad('Q2054', 30, { es: 'Séneca' });
  const PRADA = wd.entidad('Q3', 31, { es: 'Manuel González Prada' });
  const NOVELA = wd.entidad('Q8261', 40, { es: 'novela' });
  const obra = (claims: Record<string, unknown[]>, revision = 100, id = 'Q480') =>
    wd.entidad(id, revision, { es: 'Cartas a Lucilio', claims });
  const CARTAS = obra({ P50: [wd.aEntidad('Q2054')], P136: [wd.aEntidad('Q8261')], P577: [wd.aTiempo('+0064-00-00T00:00:00Z')] });
  const doc = (corpus: string, nombre: string) => join(corpus, 'wikidata', nombre);
  const fichaYaml = (corpus: string) => readFile(join(corpus, 'obras', `${FICHA}.yml`), 'utf8');

  async function preparado(entidades: Record<string, unknown>[] = [CARTAS, SENECA, NOVELA], vigentes: Record<string, number> = { Q2054: 30, Q8261: 40 }) {
    const corpus = await corpusConCita();
    await correr(corpus, ['sembrar']);
    await wd.sembrarWikidata(corpus, entidades, vigentes);
    return corpus;
  }

  it('ata la entidad cuando el autor concuerda, y el parte da la Ficha técnica', async () => {
    const corpus = await preparado();
    const hecho = await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(await fichaYaml(corpus)).toMatch(/\nwikidata:\n {2}entidad: "Q480"\n {2}revision: 100\n$/);
    expect(hecho.salida).toContain('«Séneca» (Q2054) concuerda con «Séneca»');
    expect(hecho.salida).toContain('Géneros: novela');
    expect(hecho.salida).toContain('Año: 64');

    // La misma entidad y revisión otra vez: 1, nada escrito.
    const otra = await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')]);
    expect(otra.codigo).toBe(1);
    expect(otra.error).toMatch(/ya declara Q480 en la revisión 100/);
  });

  it('atar otra revisión de la misma entidad la sustituye y lo dice', async () => {
    const corpus = await preparado([CARTAS, obra({ P50: [wd.aEntidad('Q2054')] }, 101), SENECA, NOVELA]);
    expect((await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')])).codigo).toBe(0);
    const hecho = await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r101.json')]);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('Sustituye a Q480, revisión 100.');
    expect(await fichaYaml(corpus)).toMatch(/\nwikidata:\n {2}entidad: "Q480"\n {2}revision: 101\n$/);
  });

  it('atar con una vigente sin su documento se niega nombrándola y no escribe', async () => {
    const corpus = await preparado([CARTAS, SENECA, NOVELA], { Q2054: 30, Q8261: 40, Q9: 3 });
    const antes = await fichaYaml(corpus);
    const hecho = await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')]);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toMatch(/vigentes sin su documento/);
    expect(hecho.error).toContain('Q9: 3');
    expect(await fichaYaml(corpus)).toBe(antes);
  });

  it('atar una entidad que ya declara otra ficha se niega nombrándola', async () => {
    const corpus = await preparado();
    const OTRA = 'seneca--de-la-ira';
    await writeFile(
      join(corpus, 'obras', `${OTRA}.yml`),
      'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\nwikidata:\n  entidad: "Q480"\n  revision: 100\n',
      'utf8',
    );
    const antes = await fichaYaml(corpus);
    const hecho = await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')]);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toContain(`«${OTRA}» ya declara Q480`);
    expect(await fichaYaml(corpus)).toBe(antes);
  });

  it('un autor ajeno pone delante las dos partes y no escribe', async () => {
    const ajena = obra({ P50: [wd.aEntidad('Q3')] });
    const corpus = await preparado([ajena, PRADA], { Q3: 31 });
    const antes = await fichaYaml(corpus);
    const hecho = await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')]);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toContain('«Manuel González Prada»');
    expect(hecho.error).toContain('«Séneca»');
    expect(await fichaYaml(corpus)).toBe(antes);
  });

  it.each([
    ['el documento falta', async (c: string) => [FICHA, doc(c, 'Q480--r101.json')], /No existe el documento/],
    ['no está en corpus/wikidata/', async (c: string) => [FICHA, join(c, 'Q480--r100.json')], /no está en/],
    [
      'no es de Wikidata',
      async (c: string) => {
        await writeFile(doc(c, 'Q480--r100.json'), JSON.stringify({ fuente: 'wikipedia-es' }), 'utf8');
        return [FICHA, doc(c, 'Q480--r100.json')];
      },
      /no es un documento de Wikidata/,
    ],
    [
      'sin P50',
      async (c: string) => {
        await wd.sembrarWikidata(c, [obra({}, 101)]);
        return [FICHA, doc(c, 'Q480--r101.json')];
      },
      /no declara autor/,
    ],
    [
      'el autor sin vigente',
      async (c: string) => {
        await wd.sembrarWikidata(c, [obra({ P50: [wd.aEntidad('Q77')] }, 101)]);
        return [FICHA, doc(c, 'Q480--r101.json')];
      },
      /Q77 no tiene revisión vigente/,
    ],
    [
      'el autor sin etiqueta en español',
      async (c: string) => {
        await wd.sembrarWikidata(c, [obra({ P50: [wd.aEntidad('Q78')] }, 101), wd.entidad('Q78', 5, { otras: { en: 'Seneca' } })], {
          Q2054: 30,
          Q8261: 40,
          Q78: 5,
        });
        return [FICHA, doc(c, 'Q480--r101.json')];
      },
      /no tiene etiqueta en español/,
    ],
    ['la ficha no existe', async (c: string) => ['seneca--nada', doc(c, 'Q480--r100.json')], /No hay ninguna Ficha de Obra/],
  ])('atar cuando %s sale con 1 y no escribe', async (_caso, preparar, motivo) => {
    const corpus = await preparado();
    const argumentos = await preparar(corpus);
    const antes = await fichaYaml(corpus);
    const hecho = await correr(corpus, ['wikidata', ...argumentos]);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toMatch(motivo);
    expect(await fichaYaml(corpus)).toBe(antes);
  });

  it.each([
    ['sin documento', ['wikidata', FICHA]],
    ['con un argumento de más', ['wikidata', FICHA, 'a.json', 'b.json']],
    ['con una bandera que no existe', ['wikidata', FICHA, 'a.json', '--seco']],
    ['vigente sin revisión', ['wikidata-vigente', 'Q8261']],
    ['vigente con una entidad mal formada', ['wikidata-vigente', 'P31', '5']],
    ['vigente con una revisión mal formada', ['wikidata-vigente', 'Q8261', '05']],
  ])('%s sale con 2', async (_caso, argumentos) => {
    const corpus = await corpusConCita();
    expect((await correr(corpus, argumentos)).codigo).toBe(2);
  });

  it('wikidata-vigente sustituye la línea y nombra las Obras que remiten a ella', async () => {
    const corpus = await preparado([CARTAS, SENECA, NOVELA, wd.entidad('Q8261', 41, { es: 'novela epistolar' })]);
    expect((await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')])).codigo).toBe(0);
    const hecho = await correr(corpus, ['wikidata-vigente', 'Q8261', '41']);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toContain('pasa de 40 a 41');
    expect(hecho.salida).toContain('Remite a ella 1 Obra');
    expect(hecho.salida).toContain(`· ${FICHA}`);
    expect(await readFile(join(corpus, 'wikidata', 'vigentes.yml'), 'utf8')).toMatch(/\nQ2054: 30\nQ8261: 41\n$/);
  });

  it('wikidata-vigente se niega si con la revisión nueva el autor de una Obra dejaría de concordar', async () => {
    const corpus = await preparado([CARTAS, SENECA, NOVELA, wd.entidad('Q2054', 32, { otras: { en: 'Seneca' } })]);
    expect((await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')])).codigo).toBe(0);
    const antes = await readFile(join(corpus, 'wikidata', 'vigentes.yml'), 'utf8');
    const hecho = await correr(corpus, ['wikidata-vigente', 'Q2054', '32']);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toMatch(/el cotejo del autor dejaría de pasar/);
    expect(hecho.error).toContain(`${FICHA}.yml`);
    expect(hecho.error).toMatch(/no tiene etiqueta en español/);
    expect(await readFile(join(corpus, 'wikidata', 'vigentes.yml'), 'utf8')).toBe(antes);
  });

  it('wikidata-vigente con una revisión de más de 2^53 sale con 2', async () => {
    const corpus = await corpusConCita();
    expect((await correr(corpus, ['wikidata-vigente', 'Q8261', '9007199254740993'])).codigo).toBe(2);
  });

  it.each([
    ['una entidad no vigente', ['Q999', '1'], /no es vigente/, undefined],
    ['la misma revisión', ['Q8261', '40'], /ya es vigente en la revisión 40/, undefined],
    ['sin el documento de la revisión', ['Q8261', '41'], /Versiónela antes: npx tsx tools\/recuperar\.ts "https:\/\/www\.wikidata\.org\/w\/index\.php\?title=Q8261&oldid=41"/, undefined],
    ['con un documento que no es de esa entidad', ['Q8261', '42'], /no es de Q8261 en la revisión 42/, 'Q8261--r42.json'],
  ])('wikidata-vigente con %s sale con 1 y no escribe', async (_caso, argumentos, motivo, impostor) => {
    const corpus = await preparado();
    if (impostor !== undefined) {
      await writeFile(doc(corpus, impostor), wd.documento(wd.entidad('Q8261', 40, { es: 'novela' })), 'utf8');
    }
    const antes = await readFile(join(corpus, 'wikidata', 'vigentes.yml'), 'utf8');
    const hecho = await correr(corpus, ['wikidata-vigente', ...argumentos]);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toMatch(motivo);
    expect(await readFile(join(corpus, 'wikidata', 'vigentes.yml'), 'utf8')).toBe(antes);
  });

  it('titular, separar y edicion conservan wikidata; reunir conserva el de la destino y dice el de la absorbida', async () => {
    const corpus = await preparado();
    expect((await correr(corpus, ['wikidata', FICHA, doc(corpus, 'Q480--r100.json')])).codigo).toBe(0);
    const BLOQUE = 'wikidata:\n  entidad: "Q480"\n  revision: 100\n';

    expect((await correr(corpus, ['titular', FICHA, 'Cartas a Lucilio'])).codigo).toBe(0);
    expect(await fichaYaml(corpus)).toContain(BLOQUE);

    const OTRA = 'seneca--de-la-ira';
    await writeFile(
      join(corpus, 'obras', `${OTRA}.yml`),
      'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\nwikidata:\n  entidad: "Q777"\n  revision: 7\n',
      'utf8',
    );
    expect((await correr(corpus, ['separar', FICHA, OTRA])).codigo).toBe(0);
    expect(await fichaYaml(corpus)).toContain(BLOQUE);

    const reunida = await correr(corpus, ['reunir', FICHA, OTRA]);
    expect(reunida.codigo, reunida.error).toBe(0);
    expect(await fichaYaml(corpus)).toContain(BLOQUE);
    expect(await fichaYaml(corpus)).not.toContain('Q777');
    expect(reunida.salida).toContain(`La entidad de Wikidata de «${OTRA}» (Q777, revisión 7) no pasa a la reunida`);

    // `edicion`, con una tienda de prueba (el repositorio no declara ninguna): el último paso,
    // porque una ficha con ediciones de una tienda inventada ya no la lee el esquema del build.
    const edicion = await declararEdicion(
      rutasDelCorpus(corpus),
      FICHA,
      { tienda: TIENDA_DE_PRUEBA.clave, formato: 'impresa', url: `https://www.${TIENDA_DE_PRUEBA.dominio}/dp/X` },
      { tiendas: [{ ...TIENDA_DE_PRUEBA }], congelacion: null },
    );
    expect(edicion.ok, edicion.ok ? '' : edicion.motivos.join('\n')).toBe(true);
    expect(await fichaYaml(corpus)).toContain('ediciones:');
    expect(await fichaYaml(corpus)).toContain(BLOQUE);
  });
});
