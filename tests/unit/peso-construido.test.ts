import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { FICHEROS_QUE_ROTAN_CON_LA_JORNADA } from '../../tools/lib/peso.ts';
import { milesEnEspañol } from '../../src/lib/formato.ts';

/**
 * Historia 24.2 — el paso final de `npm run build`, sobre un `dist/` de verdad.
 *
 * Se construye una copia con `npm run build` —la orden entera: Astro, Pagefind y el paso— y
 * con el aviso y el tope rebajados **en la copia** bajo el peso del fixture, que es la única
 * forma de ver la construcción detenerse sin engordar el sitio (AD-21: nunca en el árbol).
 * Después, en la misma copia, se vuelve a parchear su `umbrales.ts` y se corre solo el paso,
 * que es barato, para los demás veredictos. Las decisiones puras se prueban en
 * `tests/unit/peso.test.ts`.
 */

const ejecutar = promisify(execFile);

/** `umbrales.ts` del árbol, tal cual: los valores de Héctor. */
const UMBRALES_DEL_ARBOL = readFileSync(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');

/**
 * `umbrales.ts` con el aviso, el tope o el tope de PNG cambiados. Cada sustitución tiene que
 * encontrar su línea exactamente una vez: si la declaración cambiara de forma, el parche no
 * pondría nada y la prueba mediría los valores de siempre creyendo medir otros.
 */
function umbralesCon(cambios: { aviso?: number; tope?: number; png?: number }): string {
  const lineas: [RegExp, string | undefined][] = [
    [
      /^export const AVISO_DE_PESO_DE_DIST = .*;$/mu,
      cambios.aviso === undefined ? undefined : `export const AVISO_DE_PESO_DE_DIST = ${cambios.aviso};`,
    ],
    [
      /^export const TOPE_DE_PESO_DE_DIST = .*;$/mu,
      cambios.tope === undefined ? undefined : `export const TOPE_DE_PESO_DE_DIST = ${cambios.tope};`,
    ],
    [
      /^export const TOPE_DE_PNG_DE_DIST: number \| undefined = .*;$/mu,
      cambios.png === undefined
        ? undefined
        : `export const TOPE_DE_PNG_DE_DIST: number | undefined = ${cambios.png};`,
    ],
  ];
  let fuente = UMBRALES_DEL_ARBOL;
  for (const [patron, linea] of lineas) {
    if (linea === undefined) continue;
    const veces = fuente.match(new RegExp(patron.source, 'gmu'))?.length ?? 0;
    if (veces !== 1) {
      throw new Error(`${patron} aparece ${veces} veces en src/lib/umbrales.ts en vez de una.`);
    }
    fuente = fuente.replace(patron, linea);
  }
  return fuente;
}

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida({ aptaParaPortada: true }),
  'citas/seneca--la-vida-si-sabes-usarla.md': citaValida({
    texto: 'La vida, si sabes usarla, es larga.',
    slug: 'seneca-la-vida-si-sabes-usarla',
    aptaParaPortada: true,
  }),
};

/** Fuera de Actions, para que la salida no dependa de dónde corra la suite. */
const SIN_ACTIONS = { GITHUB_ACTIONS: '' };

interface Salida {
  codigo: number;
  stdout: string;
  stderr: string;
}

/** Corre solo el paso, con `cwd` donde busca `dist/`. */
async function correrElPaso(script: string, cwd: string): Promise<Salida> {
  try {
    const { stdout, stderr } = await ejecutar(join(RAIZ, 'node_modules', '.bin', 'tsx'), [script], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', ...SIN_ACTIONS },
    });
    return { codigo: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { codigo: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

/** Cada fichero de `dist/` con su tamaño y su huella: si el paso tocara algo, cambiaría. */
async function huellaDe(dist: string): Promise<Map<string, string>> {
  const huella = new Map<string, string>();
  for (const entrada of await readdir(dist, { withFileTypes: true, recursive: true })) {
    if (!entrada.isFile()) continue;
    const fichero = join(entrada.parentPath, entrada.name);
    const contenido = await readFile(fichero);
    huella.set(
      relative(dist, fichero).split(sep).join('/'),
      `${contenido.length}:${createHash('sha256').update(contenido).digest('hex')}`,
    );
  }
  return huella;
}

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

describe('Historia 24.2 — el peso de dist/, construido', () => {
  let proyecto = '';
  let dist = '';
  let paso = '';
  let construccion = { codigo: 0, salida: '' };
  let huellaAntes = new Map<string, string>();

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS, {
      conNpmRunBuild: true,
      jornada: '2026-10-24',
      entorno: SIN_ACTIONS,
      ficheros: { 'src/lib/umbrales.ts': umbralesCon({ aviso: 1, tope: 2 }) },
    });
    aLimpiar.push(resultado.proyecto);
    proyecto = resultado.proyecto;
    dist = join(proyecto, 'dist');
    paso = join(proyecto, 'integraciones', 'peso.ts');
    construccion = resultado;
    huellaAntes = await huellaDe(dist);
  }, 300_000);

  it('npm run build sobre el tope sale con error, nombrando el peso, el tope y la constante', () => {
    expect(construccion.codigo, construccion.salida).not.toBe(0);
    // Lo que se juzga es lo desplegado sin los cinco que rotan, medido aquí por su cuenta.
    let juzgado = 0;
    for (const [ruta, huella] of huellaAntes) {
      if (!FICHEROS_QUE_ROTAN_CON_LA_JORNADA.includes(ruta)) juzgado += Number(huella.split(':')[0]);
    }
    expect(construccion.salida).toContain(`dist/ pesa ${milesEnEspañol(juzgado)} bytes`);
    expect(construccion.salida).toContain('pasa el tope de 2 bytes');
    expect(construccion.salida).toContain('TOPE_DE_PESO_DE_DIST en src/lib/umbrales.ts');
  });

  it('el paso corre tras Pagefind, y cuenta pagefind/ en los ficheros de dist/', () => {
    const dePagefind = [...huellaAntes.keys()].filter((ruta) => ruta.startsWith('pagefind/'));
    expect(dePagefind.length).toBeGreaterThan(0);
    let bytes = 0;
    for (const huella of huellaAntes.values()) bytes += Number(huella.split(':')[0]);
    expect(construccion.salida).toContain(`Peso de dist/: ${milesEnEspañol(bytes)} bytes (`);
    expect(construccion.salida).toContain(
      `en ${milesEnEspañol(huellaAntes.size)} ficheros, pagefind/ incluido.`,
    );
  });

  it('los cinco ficheros que rotan con la jornada existen en dist/', () => {
    for (const ruta of FICHEROS_QUE_ROTAN_CON_LA_JORNADA) {
      expect(huellaAntes.has(ruta), ruta).toBe(true);
    }
  });

  it('solo el paso, con el tope rebajado: sale con 1 y sin traza', async () => {
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(1);
    expect(salida.stderr).toContain('TOPE_DE_PESO_DE_DIST');
    expect(salida.stderr).not.toMatch(/^\s+at /mu);
    expect(salida.stdout).toContain('Peso de dist/:');
  });

  it('aviso bajo y tope alto: sale con 0 y avisa por stderr', async () => {
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), umbralesCon({ aviso: 1 }), 'utf8');
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).toMatch(/^Aviso de peso: /u);
    expect(salida.stderr).toContain('AVISO_DE_PESO_DE_DIST');
    expect(salida.stderr).toContain('no decide nada');
    expect(salida.stdout).not.toContain('Aviso');
  });

  it('con los valores de Héctor: sale con 0, las cifras por stdout y ningún aviso', async () => {
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), UMBRALES_DEL_ARBOL, 'utf8');
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).toBe('');
    expect(salida.stdout).toContain('Rotan con la jornada, aparte:');
    expect(salida.stdout).toContain('Tarjetas Sociales (tarjeta/):');
    expect(salida.stdout).toContain('sin tope (TOPE_DE_PNG_DE_DIST no tiene valor)');
  });

  it('con tope de PNG 1: sale con 0 y avisa del PNG', async () => {
    const png = [...huellaAntes.keys()].filter((ruta) => ruta.endsWith('.png')).length;
    expect(png).toBeGreaterThan(1);
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), umbralesCon({ png: 1 }), 'utf8');
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).toContain(`Aviso de PNG: dist/ trae ${milesEnEspañol(png)} PNG`);
    expect(salida.stderr).toContain('TOPE_DE_PNG_DE_DIST');
    expect(salida.stderr).not.toContain('Aviso de peso');
  });

  it('el paso no altera dist/: mismos ficheros, tamaños y contenido antes y después', async () => {
    expect(await huellaDe(dist)).toEqual(huellaAntes);
  });

  it('sin dist/ que medir, o con un dist/ que no se deja leer, lo dice y sale con 1', async () => {
    const vacio = await mkdtemp(join(tmpdir(), 'sabiduria-peso-'));
    aLimpiar.push(vacio);
    const sinDist = await correrElPaso(paso, vacio);
    expect(sinDist.codigo).toBe(1);
    expect(sinDist.stderr).toContain('No se pudo medir el peso de dist/');
    expect(sinDist.stderr).not.toMatch(/^\s+at /mu);
    expect(sinDist.stdout).toBe('');

    const conFichero = join(vacio, 'otro');
    await mkdir(conFichero);
    await writeFile(join(conFichero, 'dist'), 'no es un directorio', 'utf8');
    expect(existsSync(join(conFichero, 'dist'))).toBe(true);
    expect((await stat(join(conFichero, 'dist'))).isFile()).toBe(true);
    const ilegible = await correrElPaso(paso, conFichero);
    expect(ilegible.codigo).toBe(1);
    expect(ilegible.stderr).toContain('No se pudo medir el peso de dist/');
  });
});
