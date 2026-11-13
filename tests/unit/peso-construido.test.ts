import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import { descodificarCbor, diferenciasDeIndice, esFicheroDeIndice, indiceDe } from './ayuda/indice-de-pagefind.ts';
import { milesEnEspañol } from '../../src/lib/formato.ts';
import { TOPE_DE_PESO_DE_DIST } from '../../src/lib/umbrales.ts';

/**
 * Historia 24.2 — el paso final de `npm run build`, sobre un `dist/` de verdad.
 *
 * Se construye una copia con `npm run build` —la orden entera: Astro, Pagefind y el paso— y
 * con el aviso y el tope rebajados **en la copia** bajo el peso del fixture, que es la única
 * forma de ver la construcción detenerse sin engordar el sitio (AD-21: nunca en el árbol).
 * Después, en la misma copia, se vuelve a parchear su `umbrales.ts` y se corre solo el paso,
 * que es barato, para los demás veredictos. Cada prueba escribe los umbrales que necesita
 * antes de correrlo, así que no depende de lo que dejó la anterior y corre igual sola
 * (`-t`). Las decisiones puras se prueban en `tests/unit/peso.test.ts`.
 */

const ejecutar = promisify(execFile);

/** `umbrales.ts` del árbol, tal cual: los valores de Héctor. */
const UMBRALES_DEL_ARBOL = readFileSync(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');

/**
 * `umbrales.ts` con el aviso, el tope o el tope de PNG cambiados. Cada sustitución tiene que
 * encontrar su línea exactamente una vez: si la declaración cambiara de forma, el parche no
 * pondría nada y la prueba mediría los valores de siempre creyendo medir otros.
 */
function umbralesCon(cambios: { aviso?: number; tope?: number; png?: number; filtros?: number }): string {
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
    [
      /^export const AVISO_DE_BYTES_DE_FILTROS_Y_MAPA = .*;$/mu,
      cambios.filtros === undefined ? undefined : `export const AVISO_DE_BYTES_DE_FILTROS_Y_MAPA = ${cambios.filtros};`,
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

/** Como lo corre el flujo de publicación, que es donde el aviso tiene que verse. */
const EN_ACTIONS = { GITHUB_ACTIONS: 'true' };

/**
 * Las líneas que escribe el paso por stderr: el aviso, el error y el fallo de lectura, con o
 * sin anotación. Se juzga por línea y no el stderr entero, para que un aviso del propio Node o
 * de `tsx` —una deprecación tras una actualización— no tumbe estas pruebas por otra cosa.
 */
const LINEA_DEL_PASO = /^(?:::(?:warning|error)::)?(?:Aviso de |dist\/ |No se pudo medir )/mu;

interface Salida {
  codigo: number;
  stdout: string;
  stderr: string;
}

/** Corre solo el paso, con `cwd` donde busca `dist/`. */
async function correrElPaso(
  script: string,
  cwd: string,
  entorno: Record<string, string> = SIN_ACTIONS,
): Promise<Salida> {
  try {
    const { stdout, stderr } = await ejecutar(join(RAIZ, 'node_modules', '.bin', 'tsx'), [script], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', ...entorno },
      maxBuffer: 16 * 1024 * 1024,
    });
    return { codigo: 0, stdout, stderr };
  } catch (error) {
    const e = error as {
      code?: number | string | null;
      signal?: string | null;
      stdout?: string;
      stderr?: string;
    };
    // Un código que no es un número es que el paso ni arrancó (`ENOENT`, sin `tsx`), y una
    // señal es que alguien lo mató: nada de eso es un veredicto, y tomarlo por un 1 haría pasar
    // en falso las pruebas que esperan un 1.
    if (typeof e.code === 'string' || (e.signal ?? null) !== null) throw error;
    return { codigo: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

/**
 * Cada fichero de `dist/` con su tamaño y su huella: si el paso tocara algo, cambiaría.
 *
 * El listado lo da `find -L`, no el recorrido del paso: así el número de ficheros que el paso
 * informa se coteja con otra forma de contarlos, y un fallo de la suya no se repite aquí.
 */
async function huellaDe(dist: string): Promise<Map<string, string>> {
  const { stdout } = await ejecutar('find', ['-L', '.', '-type', 'f'], { cwd: dist });
  const huella = new Map<string, string>();
  for (const linea of stdout.split('\n').filter((l) => l !== '')) {
    const ruta = linea.replace(/^\.\//u, '');
    const contenido = await readFile(join(dist, ruta));
    huella.set(ruta, `${contenido.length}:${createHash('sha256').update(contenido).digest('hex')}`);
  }
  return huella;
}

/** Escribe en la copia el `umbrales.ts` que necesita una prueba, antes de correr el paso. */
async function conUmbrales(proyecto: string, cambios: Parameters<typeof umbralesCon>[0]): Promise<void> {
  await writeFile(join(proyecto, 'src/lib/umbrales.ts'), umbralesCon(cambios), 'utf8');
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
    await conUmbrales(proyecto, { aviso: 1, tope: 2 });
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(1);
    expect(salida.stderr).toMatch(/^dist\/ pesa /mu);
    expect(salida.stderr).toContain('TOPE_DE_PESO_DE_DIST');
    expect(salida.stderr).not.toMatch(/^\s+at /mu);
    expect(salida.stdout).toContain('Peso de dist/:');
  });

  it('aviso bajo y tope alto: sale con 0 y avisa por stderr', async () => {
    await conUmbrales(proyecto, { aviso: 1 });
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).toMatch(/^Aviso de peso: /mu);
    expect(salida.stderr).toContain('AVISO_DE_PESO_DE_DIST');
    // Con el tope que tiene, en bytes, y quién decide: lo que el criterio pide del aviso.
    expect(salida.stderr).toContain(`del tope de ${milesEnEspañol(TOPE_DE_PESO_DE_DIST)} bytes`);
    expect(salida.stderr).toContain('TOPE_DE_PESO_DE_DIST');
    expect(salida.stderr).toContain('no decide nada');
    expect(salida.stderr).toContain('lo decide Héctor');
    expect(salida.stdout).not.toContain('Aviso');
  });

  it('en GitHub Actions el aviso sale anotado con ::warning:: y no rompe', async () => {
    await conUmbrales(proyecto, { aviso: 1 });
    const salida = await correrElPaso(paso, proyecto, EN_ACTIONS);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).toMatch(/^::warning::Aviso de peso: /mu);
    expect(salida.stdout).not.toMatch(/^::/mu);
  });

  it('en GitHub Actions el tope sale anotado con ::error:: y sale con 1', async () => {
    await conUmbrales(proyecto, { aviso: 1, tope: 2 });
    const salida = await correrElPaso(paso, proyecto, EN_ACTIONS);
    expect(salida.codigo, salida.stderr).toBe(1);
    expect(salida.stderr).toMatch(/^::error::dist\/ pesa /mu);
    expect(salida.stdout).not.toMatch(/^::/mu);
  });

  it('con los valores de Héctor: sale con 0, las cifras por stdout y ningún aviso', async () => {
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), UMBRALES_DEL_ARBOL, 'utf8');
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).not.toMatch(LINEA_DEL_PASO);
    expect(salida.stdout).toContain('Rotan con la jornada, aparte:');
    expect(salida.stdout).toContain('Tarjetas Sociales (tarjeta/):');
    expect(salida.stdout).toContain('sin tope (TOPE_DE_PNG_DE_DIST no tiene valor)');
  });

  it('con tope de PNG 1: sale con 0 y avisa del PNG', async () => {
    const png = [...huellaAntes.keys()].filter((ruta) => ruta.endsWith('.png')).length;
    expect(png).toBeGreaterThan(1);
    await conUmbrales(proyecto, { png: 1 });
    const salida = await correrElPaso(paso, proyecto);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stderr).toContain(`Aviso de PNG: dist/ trae ${milesEnEspañol(png)} PNG`);
    expect(salida.stderr).toContain('TOPE_DE_PNG_DE_DIST');
    expect(salida.stderr).not.toContain('Aviso de peso');
  });

  it('Historia 27.3 — informa los filtros de Pagefind y el mapa; con el aviso por debajo de lo medido, avisa y sale con 0', async () => {
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), UMBRALES_DEL_ARBOL, 'utf8');
    const conValores = await correrElPaso(paso, proyecto);
    expect(conValores.codigo, conValores.stderr).toBe(0);
    expect(conValores.stdout).toMatch(/^Filtros de Pagefind y mapa de Obras de \/buscar\/: filtros \(pagefind\/filter\/\) [\d.]+ bytes/mu);
    expect(conValores.stdout).toContain('mapa (buscar/obras.json) ');
    expect(conValores.stdout).toContain('(AVISO_DE_BYTES_DE_FILTROS_Y_MAPA).');
    expect(conValores.stderr).not.toContain('Aviso de filtros y mapa');

    await conUmbrales(proyecto, { filtros: 1 });
    const bajo = await correrElPaso(paso, proyecto);
    expect(bajo.codigo, bajo.stderr).toBe(0);
    expect(bajo.stderr).toMatch(/^Aviso de filtros y mapa: /mu);
    const anotado = await correrElPaso(paso, proyecto, EN_ACTIONS);
    expect(anotado.codigo, anotado.stderr).toBe(0);
    expect(anotado.stderr).toMatch(/^::warning::Aviso de filtros y mapa: /mu);
  });

  it('el paso no altera dist/: mismos ficheros, tamaños y contenido antes y después', async () => {
    // Con los dos desenlaces: el que avisa y el que se detiene sobre el tope.
    for (const cambios of [{ aviso: 1 }, { aviso: 1, tope: 2 }]) {
      const antes = await huellaDe(dist);
      await conUmbrales(proyecto, cambios);
      await correrElPaso(paso, proyecto);
      expect(await huellaDe(dist)).toEqual(antes);
    }
  });

  it('sigue los enlaces simbólicos, como el empaquetado del despliegue, y salta los bucles', async () => {
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), UMBRALES_DEL_ARBOL, 'utf8');
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-peso-'));
    aLimpiar.push(raiz);
    const conEnlaces = join(raiz, 'dist');
    await mkdir(join(conEnlaces, 'sub'), { recursive: true });
    await writeFile(join(conEnlaces, 'a.txt'), '0123456789', 'utf8');
    await writeFile(join(conEnlaces, 'sub', 'c.txt'), '01234', 'utf8');
    await symlink('a.txt', join(conEnlaces, 'b.txt'));
    await symlink('sub', join(conEnlaces, 'enlace'));
    await symlink('..', join(conEnlaces, 'sub', 'vuelta'));
    // a.txt, b.txt → a.txt, sub/c.txt y enlace/c.txt: 30 bytes en 4 ficheros; sub/vuelta, no.
    const salida = await correrElPaso(paso, raiz);
    expect(salida.codigo, salida.stderr).toBe(0);
    expect(salida.stdout).toContain('Peso de dist/: 30 bytes (<0,1 MiB) en 4 ficheros, sin pagefind/');

    await symlink('no-existe.txt', join(conEnlaces, 'roto.txt'));
    const roto = await correrElPaso(paso, raiz);
    expect(roto.codigo).toBe(1);
    expect(roto.stderr).toContain('No se pudo medir el peso de dist/');
    // El fichero sigue saliendo en `ls`: el mensaje dice que es un enlace roto y adónde apunta.
    expect(roto.stderr).toContain('roto.txt es un enlace simbólico roto: apunta a «no-existe.txt»');
  });

  it('lo que no es fichero ni directorio hace fallar la lectura, en vez de saltarse', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-peso-'));
    aLimpiar.push(raiz);
    await mkdir(join(raiz, 'dist'));
    await writeFile(join(raiz, 'dist', 'a.txt'), '0123456789', 'utf8');
    await ejecutar('mkfifo', [join(raiz, 'dist', 'tuberia')]);
    const salida = await correrElPaso(paso, raiz);
    expect(salida.codigo).toBe(1);
    expect(salida.stderr).toContain('No se pudo medir el peso de dist/');
    expect(salida.stderr).toContain('tuberia no es un fichero ni un directorio');
    expect(salida.stdout).toBe('');
  });

  it('sin dist/ que medir, con un dist/ vacío o con uno que no se deja leer, lo dice y sale con 1', async () => {
    await writeFile(join(proyecto, 'src/lib/umbrales.ts'), UMBRALES_DEL_ARBOL, 'utf8');
    const vacio = await mkdtemp(join(tmpdir(), 'sabiduria-peso-'));
    aLimpiar.push(vacio);
    const sinDist = await correrElPaso(paso, vacio);
    expect(sinDist.codigo).toBe(1);
    expect(sinDist.stderr).toContain('No se pudo medir el peso de dist/');
    expect(sinDist.stderr).not.toMatch(/^\s+at /mu);
    expect(sinDist.stdout).toBe('');

    const anotado = await correrElPaso(paso, vacio, EN_ACTIONS);
    expect(anotado.codigo).toBe(1);
    expect(anotado.stderr).toMatch(/^::error::No se pudo medir el peso de dist\/ /u);

    await mkdir(join(vacio, 'dist', 'vacia'), { recursive: true });
    const distVacio = await correrElPaso(paso, vacio);
    expect(distVacio.codigo).toBe(1);
    expect(distVacio.stderr).toContain('dist/ no trae ningún fichero');
    // Sin nada medido no hay cifras: ni «0 bytes» ni margen hasta el aviso.
    expect(distVacio.stdout).toBe('');

    await writeFile(join(vacio, 'dist', 'index.html'), '<!doctype html>', 'utf8');
    const soloLaPortada = await correrElPaso(paso, vacio);
    expect(soloLaPortada.codigo).toBe(1);
    expect(soloLaPortada.stderr).toContain('dist/ solo trae ficheros que rotan con la jornada (index.html)');
    expect(soloLaPortada.stdout).toBe('');

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

/**
 * Historia 26.12, AD-12 — la jornada no cambia el contenido de nada juzgado, sobre una
 * construcción real.
 *
 * Dos `npm run build` del mismo commit en dos jornadas cuya Cita del Día difiere: fuera de
 * `FICHEROS_QUE_ROTAN_CON_LA_JORNADA`, todo `dist/` es idéntico byte a byte salvo los ficheros de
 * índice de `pagefind/`, que se comparan descodificados y con su orden normalizado
 * (`tests/unit/ayuda/indice-de-pagefind.ts`). Pagefind 1.5.2 no es determinista ni en dos
 * construcciones del mismo día —baraja el orden de los filtros y de sus valores, y con él los
 * hashes de los nombres y unos bytes de lo comprimido—, así que la línea de lo juzgado del paso
 * puede variar esos bytes y no se compara (decisión de Héctor, Spec Change Log de la 26.12). La 24.2
 * aplazó esta prueba porque entonces la Cita del Día entraba en el índice, hasta que la 26.2 la
 * sacó. La prueba pura vive en `tests/unit/peso.test.ts`; la del HTML y los veredictos, en
 * `tests/unit/dos-jornadas.test.ts`.
 */
describe('Historia 26.12 — dos jornadas, la misma medida', () => {
  const JORNADAS = ['2026-10-24', '2026-10-25'] as const;
  interface Construida {
    codigo: number;
    salida: string;
    dist: string;
    huella: Map<string, string>;
  }
  const construcciones: Construida[] = [];
  /** Testigo: la primera jornada con otra Cita en el Corpus. Su índice tiene que salir distinto. */
  let testigo: Construida | undefined;

  beforeAll(async () => {
    const construir = async (corpus: Record<string, string>, jornada: string): Promise<Construida> => {
      const resultado = await construirConCorpus(corpus, { conNpmRunBuild: true, jornada, entorno: SIN_ACTIONS });
      aLimpiar.push(resultado.proyecto);
      const dist = join(resultado.proyecto, 'dist');
      return { ...resultado, dist, huella: existsSync(dist) ? await huellaDe(dist) : new Map() };
    };
    for (const jornada of JORNADAS) construcciones.push(await construir(CORPUS, jornada));
    testigo = await construir(
      {
        ...CORPUS,
        'citas/seneca--mientras-se-espera-vivir.md': citaValida({
          texto: 'Mientras se espera vivir, la vida pasa.',
          slug: 'seneca-mientras-se-espera-vivir',
        }),
      },
      JORNADAS[0],
    );
  }, 900_000);

  /**
   * Las dos construcciones de las jornadas, exigidas antes de mirarlas: si falta una o no salió
   * bien, la prueba lo dice con la salida del build, no con un `TypeError`.
   */
  function lasDos(): [Construida, Construida] {
    expect(construcciones, 'beforeAll no dejó las dos construcciones de las jornadas').toHaveLength(JORNADAS.length);
    for (const [i, { codigo, salida }] of construcciones.entries()) expect(codigo, `${JORNADAS[i]}:\n${salida}`).toBe(0);
    return [construcciones[0], construcciones[1]];
  }

  function elTestigo(): Construida {
    expect(testigo, 'beforeAll no dejó la construcción testigo').toBeDefined();
    expect(testigo!.codigo, testigo!.salida).toBe(0);
    return testigo!;
  }

  /**
   * El veredicto del paso, sin las cifras: el código de salida, la clase que dice la línea de lo
   * juzgado (por debajo del aviso, en el aviso o sobre el tope) y si avisó o se detuvo por stderr.
   * Las cifras pueden variar los pocos bytes de recomprimir el índice; el veredicto, no.
   */
  function veredicto({ codigo, salida }: Construida): string {
    const linea = salida.match(/^Juzgado sin lo que rota: .*$/mu)?.[0];
    expect(linea, salida).toBeDefined();
    const clase = /hasta el aviso\.$/u.test(linea!)
      ? 'por debajo del aviso'
      : /hasta el tope\.$/u.test(linea!)
        ? 'aviso'
        : /pasa del tope en .*\.$/u.test(linea!)
          ? 'sobre el tope'
          : undefined;
    expect(clase, linea).toBeDefined();
    const aviso = /^(?:::warning::)?Aviso de peso: /mu.test(salida);
    const tope = /^(?:::error::)?dist\/ pesa .* pasa el tope /mu.test(salida);
    return `código ${codigo}; ${clase}; ${aviso ? 'con' : 'sin'} aviso; ${tope ? 'con' : 'sin'} tope`;
  }

  it('las dos construyen, y la Cita del Día cambia de verdad', () => {
    const [una, otra] = lasDos();
    expect(una.huella.get('index.html')).toBeDefined();
    expect(otra.huella.get('index.html'), 'index.html no cambia: las dos jornadas dan la misma Cita del Día').not.toBe(
      una.huella.get('index.html'),
    );
  });

  it('fuera de lo que rota y del índice de pagefind/, dist/ es idéntico byte a byte', () => {
    const [una, otra] = lasDos();
    const rutas = new Set([...una.huella.keys(), ...otra.huella.keys()]);
    const cambian = [...rutas]
      .filter((ruta) => !FICHEROS_QUE_ROTAN_CON_LA_JORNADA.includes(ruta) && !esFicheroDeIndice(ruta))
      .filter((ruta) => una.huella.get(ruta) !== otra.huella.get(ruta))
      .sort();
    expect(cambian, `Cambian entre ${JORNADAS.join(' y ')}: ${cambian.join(', ')}`).toEqual([]);
    // Lo de pagefind/ que no es índice —el guion, la interfaz, el wasm— sí entra byte a byte.
    expect([...una.huella.keys()].some((ruta) => ruta.startsWith('pagefind/') && !esFicheroDeIndice(ruta))).toBe(true);
  });

  it('el índice de pagefind/, descodificado y normalizado, es el mismo en las dos jornadas', async () => {
    const [una, otra] = lasDos();
    const indice = await indiceDe(una.dist);
    for (const clase of ['pagefind-entry.json', 'pf_meta', 'filter', 'index', 'fragment']) {
      expect(indice.get(clase)?.length ?? 0, clase).toBeGreaterThan(0);
    }
    const diferencias = diferenciasDeIndice(indice, await indiceDe(otra.dist));
    expect(diferencias, `El índice cambia entre ${JORNADAS.join(' y ')}:\n${diferencias.join('\n')}`).toEqual([]);
  });

  it('el veredicto del paso es el mismo en las dos jornadas', () => {
    const [una, otra] = lasDos();
    expect(veredicto(una)).toBe('código 0; por debajo del aviso; sin aviso; sin tope');
    expect(veredicto(otra)).toBe(veredicto(una));
  });

  it('la comparación ve un cambio real: con otra Cita en el Corpus, el índice sale distinto', async () => {
    const [una] = lasDos();
    const diferencias = diferenciasDeIndice(await indiceDe(una.dist), await indiceDe(elTestigo().dist));
    expect(diferencias.length).toBeGreaterThan(0);
    expect(diferencias.some((d) => d.startsWith('fragment: solo en la segunda'))).toBe(true);
  });

  it('el descodificador de CBOR lee lo que el índice usa, y rechaza lo mal formado', () => {
    const de = (...bytes: number[]) => descodificarCbor(Uint8Array.from(bytes));
    // {"a": [1, -2, "x"], 3: h'ff'} en longitud definida, y [1, 2] y "ab" en indefinida.
    expect(de(0xa2, 0x61, 0x61, 0x83, 0x01, 0x21, 0x61, 0x78, 0x03, 0x41, 0xff)).toEqual({
      mapa: [
        ['a', [1, -2, 'x']],
        [3, 'ff'],
      ],
    });
    expect(de(0x9f, 0x01, 0x02, 0xff)).toEqual([1, 2]);
    expect(de(0xbf, 0x61, 0x61, 0x01, 0xff)).toEqual({ mapa: [['a', 1]] });
    expect(de(0x7f, 0x61, 0x61, 0x61, 0x62, 0xff)).toBe('ab');
    expect(de(0x19, 0x01, 0xea)).toBe(490);
    expect(de(0xf9, 0x3c, 0x00)).toBe(1);
    expect(de(0xc1, 0x01)).toEqual({ etiqueta: 1, valor: 1 });
    // Los simples sin nombre no se confunden con un texto.
    expect(de(0xf0)).toEqual({ simple: 16 });
    expect(de(0xf8, 0x20)).toEqual({ simple: 32 });
    expect(de(0xf0)).not.toEqual(de(0x6a, ...Buffer.from('simple(16)')));
    // Lo mal formado lanza.
    expect(() => de(0x01, 0x02)).toThrow(/sobran/);
    expect(() => de(0x1f)).toThrow(/indefinida en el tipo mayor 0/);
    expect(() => de(0x3f)).toThrow(/indefinida en el tipo mayor 1/);
    expect(() => de(0xdf, 0x01)).toThrow(/indefinida en el tipo mayor 6/);
    expect(() => de(0x82, 0x01, 0xff)).toThrow(/«break» fuera/);
    expect(() => de(0xa1, 0x61, 0x61, 0xff)).toThrow(/«break» fuera/);
    expect(() => de(0xbf, 0x61, 0x61, 0xff)).toThrow(/«break» fuera/);
    expect(() => de(0xff)).toThrow(/«break» fuera/);
    expect(() => de(0x7f, 0x41, 0x61, 0xff)).toThrow(/trozo mal formado/);
    expect(() => de(0x83, 0x01)).toThrow(/truncado/);
  });
});
