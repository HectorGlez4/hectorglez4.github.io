import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { aYaml } from '../../tools/lib/corpus.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { altoDeTarjeta } from '../../tools/lib/tarjetaDelVerso.ts';
import { ALTO } from '../../src/lib/tarjeta.ts';

/**
 * Historia 29.1 — `npx tsx tools/lineas.ts formas|tarjeta`, de punta a punta sobre un Corpus
 * temporal: de esa salida salen el reparto por forma y las cifras con que Héctor decide la
 * Tarjeta Social del verso, así que su filtro, su orden, su umbral y sus códigos se fijan aquí
 * y no solo en una pasada a mano.
 */

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '../..');
const FIXTURES = join(RAIZ, 'tests/unit/ayuda/lineas');
const VERSO = 'wikisource-es--versos-sencillos--versos-sencillos-i.txt';
const PROSA = 'gutenberg--a-flor-de-piel-frases.txt';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function lineas(...argumentos: string[]): Promise<{ codigo: number; salida: string; error: string }> {
  try {
    const { stdout, stderr } = await ejecutar('npx', ['tsx', 'tools/lineas.ts', ...argumentos], {
      cwd: RAIZ,
    });
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (fallo) {
    const f = fallo as { code?: number; stdout?: string; stderr?: string };
    return { codigo: f.code ?? -1, salida: f.stdout ?? '', error: f.stderr ?? '' };
  }
}

/** Las cuatro primeras estrofas de *Versos sencillos* I, en una línea, como se publican hoy. */
const ESTROFA =
  'Yo vengo de todas partes, Y hacia todas partes voy: Arte soy entre las artes, En los montes, monte soy.';
/** Dos estrofas, ocho versos, ~200 caracteres: con saltos pasa de 630 px. */
const DOS_ESTROFAS =
  'Yo soy un hombre sincero De donde crece la palma. Y antes de morirme quiero Echar mis versos del alma. ' +
  'Yo vengo de todas partes, Y hacia todas partes voy: Arte soy entre las artes, En los montes, monte soy.';
/** Un solo verso: se localiza en el documento de verso, pero no gana ningún salto. */
const UN_VERSO = 'Yo sé los nombres extraños';
const DE_PROSA = '¿Para qué ahondar en las cosas? ¿Para qué meditar demasiado en ellas?';

function cita(slug: string, texto: string, obra: string, id: string | undefined): string {
  return `---\n${aYaml({
    texto,
    autor: 'jose-marti',
    temas: ['la-vida'],
    slug,
    procedencia: { obra },
    estadoDerechos: 'dominio-público',
    ...(id !== undefined ? { fuente: { id, url: 'https://es.wikisource.org/wiki/X' } } : {}),
  })}---\n`;
}

async function corpusDePrueba(): Promise<string> {
  const corpus = await mkdtemp(join(tmpdir(), 'lineas-cli-'));
  temporales.push(corpus);
  await mkdir(join(corpus, 'fuentes'), { recursive: true });
  await mkdir(join(corpus, 'citas', 'jose-marti'), { recursive: true });
  await copyFile(join(FIXTURES, VERSO), join(corpus, 'fuentes', VERSO));
  await copyFile(join(FIXTURES, PROSA), join(corpus, 'fuentes', PROSA));
  const citas: [string, string, string, string | undefined][] = [
    ['jose-marti-yo-vengo-de-todas-partes', ESTROFA, 'Versos sencillos', 'wikisource-es'],
    ['jose-marti-yo-soy-un-hombre-sincero', DOS_ESTROFAS, 'Versos sencillos', 'wikisource-es'],
    ['jose-marti-yo-se-los-nombres', UN_VERSO, 'Versos sencillos', 'wikisource-es'],
    ['jose-marti-para-que-ahondar', DE_PROSA, 'A Flor De Piel: Frases', 'gutenberg'],
    ['jose-marti-sin-fuente', ESTROFA, 'Versos sencillos', undefined],
  ];
  for (const [slug, texto, obra, id] of citas) {
    await writeFile(join(corpus, 'citas', 'jose-marti', `${slug}.md`), cita(slug, texto, obra, id));
  }
  return corpus;
}

describe('tools/lineas.ts — la invocación', () => {
  it.each([
    [[]],
    [['otra']],
    [['formas', 'tarjeta']],
    [['formas', '--desconocida']],
    [['formas', '--corpus=corpus']],
    [['formas', '--corpus']],
    [['formas', '--corpus', 'a', '--corpus', 'b']],
    [['tarjeta', '--detalle']],
  ])('%j sale con 2 y dice el uso', async (argumentos) => {
    const hecho = await lineas(...argumentos);
    expect(hecho.codigo).toBe(2);
    expect(hecho.error).toMatch(/Uso: npx tsx tools\/lineas\.ts/);
  });

  it('un Corpus que no se deja leer sale con 1', async () => {
    const corpus = await corpusDePrueba();
    // Un directorio con nombre de documento: `readFile` lo rechaza.
    await mkdir(join(corpus, 'fuentes', 'wikisource-es--roto.txt'));
    const hecho = await lineas('formas', '--corpus', corpus);
    expect(hecho.codigo).toBe(1);
    expect(hecho.error).toMatch(/El Corpus no se deja leer/);
  });
});

describe('tools/lineas.ts formas', () => {
  it('reparte por Fuente y forma, y separa la declaración no válida de lo calculado', async () => {
    const corpus = await corpusDePrueba();
    await writeFile(
      join(corpus, 'fuentes', 'wikisource-es--mal-declarado.txt'),
      componerDocumento(
        {
          fuente: 'wikisource-es',
          obra: 'Mal declarado',
          lineas: 'poesia',
          url: 'https://es.wikisource.org/wiki/Mal_declarado',
          recuperado: '2026-11-07',
        },
        'Mal declarado',
        'Una línea.\nOtra línea.\nY otra más.\nY la última.',
      ),
    );
    const hecho = await lineas('formas', '--detalle', '--corpus', corpus);
    expect(hecho.codigo, hecho.error).toBe(0);
    expect(hecho.salida).toMatch(/Forma de las líneas de 3 documentos/);
    expect(hecho.salida).toMatch(/gutenberg \(1\):\n {2}prosa-ajustada +1 {3}\(declarada 0, calculada 1\)/);
    expect(hecho.salida).toMatch(/ {2}verso +1 {3}\(declarada 0, calculada 1\)/);
    expect(hecho.salida).toMatch(
      / {2}indeterminada +1 {3}\(declarada 0, calculada 0, declaración no válida 1\)/,
    );
    expect(hecho.salida).toMatch(
      /Declaran una forma fuera del conjunto \(el build rompe por ellas\): 1\n {2}corpus\/fuentes\/wikisource-es--mal-declarado\.txt \(«lineas: poesia»\)/,
    );
    expect(hecho.salida).toMatch(/Documentos de verso:\n {2}verso\twikisource-es--versos-sencillos--versos-sencillos-i/);
  });
});

describe('tools/lineas.ts tarjeta', () => {
  it('cuenta solo las Citas que ganan un salto, con su alto, y lista las que pasan de 630 px', async () => {
    const corpus = await corpusDePrueba();
    const hecho = await lineas('tarjeta', '--corpus', corpus);
    expect(hecho.codigo, hecho.error).toBe(0);

    // Ni la de un solo verso, ni la de prosa, ni la que no tiene Fuente.
    expect(hecho.salida).toMatch(/Citas publicadas que ganarían saltos de verso: 2\n {2}de documento verso: 2\n/);
    expect(hecho.salida).toMatch(/Admiten Imagen \(Tarjeta con texto\): 2/);
    expect(hecho.salida).not.toMatch(/jose-marti-yo-se-los-nombres|jose-marti-para-que-ahondar|jose-marti-sin-fuente/);

    const estrofa = 'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';
    const dos = `Yo soy un hombre sincero\nDe donde crece la palma.\nY antes de morirme quiero\nEchar mis versos del alma.\n${estrofa}`;
    const altoEstrofa = altoDeTarjeta(estrofa, true) as number;
    const altoDos = altoDeTarjeta(dos, true) as number;
    const altoDosSin = altoDeTarjeta(DOS_ESTROFAS, true) as number;
    expect(altoEstrofa).toBeLessThanOrEqual(ALTO);
    expect(altoDos).toBeGreaterThan(ALTO);

    // Ordenadas por alto con saltos, de mayor a menor; el alto de hoy sale del texto sin saltos.
    const filas = hecho.salida.split('\n').filter((l) => l.startsWith('  jose-marti-'));
    expect(filas).toEqual([
      `  jose-marti-yo-soy-un-hombre-sincero · ${[...dos].length} · 8 · 8 · ${altoDosSin} · ${altoDos}`,
      `  jose-marti-yo-vengo-de-todas-partes · ${[...estrofa].length} · 4 · 4 · ${altoDeTarjeta(ESTROFA, true)} · ${altoEstrofa}`,
      `  jose-marti-yo-soy-un-hombre-sincero · ${altoDos} px`,
    ]);
    expect(hecho.salida).toMatch(new RegExp(`Pasan de ${ALTO} px con saltos: 1\\n {2}jose-marti-yo-soy-un-hombre-sincero · ${altoDos} px`));
  });
});
