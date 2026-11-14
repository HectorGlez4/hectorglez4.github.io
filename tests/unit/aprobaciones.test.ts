import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { parse as parsearYaml } from 'yaml';
import {
  CABECERA_DE_APROBACIONES,
  analizarAprobaciones,
  fallosDeAprobaciones,
  leerAprobaciones,
  mismoAgente,
  problemaDeLosAgentes,
  registrarAprobaciones,
  type AprobacionRegistrada,
} from '../../tools/lib/aprobaciones.ts';
import { FICHERO_DE_APROBACIONES, rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { FAMILIAS_DE_FICHERO, familiaDeFichero } from '../../tools/lib/avisar.ts';
import { instantesDeLasAprobaciones } from '../../integraciones/clases.ts';

/**
 * Historia 35.11 — el registro de aprobaciones de la traducción propia,
 * `corpus/aprobaciones-de-atribuidas.yml`: su analizador, su escritor (solo añade, se relee, lleva su
 * cabecera), la regla de los dos agentes, la puerta pura del build (`fallosDeAprobaciones`) con sus
 * instantes, el fichero del árbol, y los instantes leídos de un historial de git real sobre un
 * repositorio temporal. La puerta construida está en `clase-build.test.ts`; las órdenes que lo
 * escriben, en `revision.test.ts`, `alta.test.ts` y `atribuida-cli.test.ts`.
 */

const ejecutar = promisify(execFile);
const RAIZ = resolve(import.meta.dirname, '..', '..');

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function corpusVacio(): Promise<Rutas> {
  const base = await mkdtemp(join(tmpdir(), 'sabiduria-aprobaciones-'));
  temporales.push(base);
  return rutasDelCorpus(join(base, 'corpus'));
}

const entrada = (slug: string, propone = 'agente-a', aprueba = 'agente-b', fecha = '2026-11-14'): AprobacionRegistrada => ({
  slug,
  propone,
  aprueba,
  fecha,
});

describe('35.11 — los dos agentes', () => {
  it('se comparan recortados y en minúsculas', () => {
    expect(mismoAgente('Ana', ' ana ')).toBe(true);
    expect(mismoAgente('Ana', 'Beatriz')).toBe(false);
  });

  it.each<[string, string | undefined, string | undefined, RegExp | undefined]>([
    ['dos distintos', 'Ana', 'Beatriz', undefined],
    ['falta uno', 'Ana', undefined, /falta --aprueba/u],
    ['faltan los dos', undefined, undefined, /falta --propone y falta --aprueba/u],
    ['uno en blanco', '  ', 'b', /--propone está en blanco/u],
    ['uno con salto de línea', 'a\nb', 'c', /--propone va en una sola línea/u],
    ['el mismo', 'Ana', ' ANA', /dicen el mismo \(«Ana»\)/u],
  ])('%s', (_, propone, aprueba, motivo) => {
    const problema = problemaDeLosAgentes(propone, aprueba);
    if (motivo === undefined) expect(problema).toBeUndefined();
    else expect(problema).toMatch(motivo);
  });
});

describe('35.11 — el analizador y el escritor', () => {
  it('la cabecera con la lista vacía se lee vacía; un fichero sin la clave o con una entrada mal formada lanza', () => {
    expect(analizarAprobaciones(CABECERA_DE_APROBACIONES)).toEqual([]);
    expect(() => analizarAprobaciones('otra: cosa\n')).toThrow(/falta la clave «aprobaciones:»/u);
    const con = (e: unknown) => `aprobaciones:\n  - ${JSON.stringify(e)}\n`;
    expect(analizarAprobaciones(con(entrada('buzz-x')))).toEqual([entrada('buzz-x')]);
    expect(() => analizarAprobaciones(con({ ...entrada('buzz-x'), slug: 'Buzz X' }))).toThrow(/slug con forma de slug/u);
    expect(() => analizarAprobaciones(con({ ...entrada('buzz-x'), propone: '' }))).toThrow(/quién propone/u);
    expect(() => analizarAprobaciones(con({ ...entrada('buzz-x'), aprueba: 3 }))).toThrow(/quién aprueba/u);
    expect(() => analizarAprobaciones(con({ ...entrada('buzz-x'), fecha: '2026-02-30' }))).toThrow(/fecha AAAA-MM-DD/u);
    expect(() => analizarAprobaciones(con({ ...entrada('buzz-x'), nota: 'x' }))).toThrow(/campos que el registro no tiene \(nota\)/u);
    expect(() => analizarAprobaciones('aprobaciones: [roto\n')).toThrow(/no es YAML válido/u);
  });

  it('el primer añadido crea el fichero con su cabecera; los siguientes solo añaden al final, y se releen', async () => {
    const rutas = await corpusVacio();
    expect(await leerAprobaciones(rutas)).toEqual([]);
    await registrarAprobaciones(rutas, [entrada('buzz-x')]);
    const primero = await readFile(rutas.aprobacionesDeAtribuidas, 'utf8');
    expect(primero.startsWith(CABECERA_DE_APROBACIONES)).toBe(true);
    expect(primero.endsWith('  - { slug: "buzz-x", propone: "agente-a", aprueba: "agente-b", fecha: "2026-11-14" }\n')).toBe(true);
    await registrarAprobaciones(rutas, [entrada('buzz-x', 'agente-c', 'agente-d', '2026-11-15'), entrada('buzz-y')]);
    const segundo = await readFile(rutas.aprobacionesDeAtribuidas, 'utf8');
    expect(segundo.startsWith(primero)).toBe(true);
    expect(await leerAprobaciones(rutas)).toEqual([entrada('buzz-x'), entrada('buzz-x', 'agente-c', 'agente-d', '2026-11-15'), entrada('buzz-y')]);
  });

  it('un lote vacío no escribe nada; dos agentes iguales o una entrada mal formada no crean ni el fichero', async () => {
    const rutas = await corpusVacio();
    await registrarAprobaciones(rutas, []);
    expect(existsSync(rutas.aprobacionesDeAtribuidas)).toBe(false);
    await expect(registrarAprobaciones(rutas, [entrada('buzz-x', 'Ana', 'ana')])).rejects.toThrow(/dicen el mismo/u);
    await expect(registrarAprobaciones(rutas, [entrada('buzz-x', 'a', 'b', 'mañana')])).rejects.toThrow(/fecha/u);
    expect(existsSync(rutas.aprobacionesDeAtribuidas)).toBe(false);
  });

  it('un registro sin su clave no se toca: el añadido se niega sin escribir', async () => {
    const rutas = await corpusVacio();
    await mkdir(rutas.raiz, { recursive: true });
    await writeFile(rutas.aprobacionesDeAtribuidas, 'otra: cosa\n', 'utf8');
    await expect(registrarAprobaciones(rutas, [entrada('buzz-x')])).rejects.toThrow(/falta la clave/u);
    expect(await readFile(rutas.aprobacionesDeAtribuidas, 'utf8')).toBe('otra: cosa\n');
  });

  it('un registro vacío —una primera escritura cortada— recibe la cabecera en el mismo añadido', async () => {
    const rutas = await corpusVacio();
    await mkdir(rutas.raiz, { recursive: true });
    await writeFile(rutas.aprobacionesDeAtribuidas, '', 'utf8');
    await registrarAprobaciones(rutas, [entrada('buzz-x')]);
    expect((await readFile(rutas.aprobacionesDeAtribuidas, 'utf8')).startsWith(CABECERA_DE_APROBACIONES)).toBe(true);
  });
});

describe('35.11 — la puerta pura del build', () => {
  const propia = (slug: string, texto?: number | 'sin-commitear') => ({
    slug,
    ruta: `corpus/citas/${slug}.md`,
    ...(texto !== undefined ? { texto } : {}),
  });

  it('sin entrada suya, rompe nombrando el fichero y el registro', () => {
    expect(fallosDeAprobaciones([propia('buzz-x')], [])).toEqual([
      expect.stringMatching(/^corpus\/citas\/buzz-x\.md: es una traducción propia publicada y corpus\/aprobaciones-de-atribuidas\.yml no anota su aprobación/u),
    ]);
  });

  it('una entrada suya con el mismo agente dos veces rompe; una de otra Cita no rompe nada (un solo sentido)', () => {
    const fallos = fallosDeAprobaciones(
      [propia('buzz-x')],
      [{ entrada: entrada('buzz-x', 'Ana', ' ana ') }, { entrada: entrada('retirada', 'a', 'a') }],
    );
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toMatch(/buzz-x\.md: .*con el mismo agente para proponer y aprobar \(«Ana»\)/u);
  });

  it.each<[string, number | 'sin-commitear', (number | 'sin-commitear')[], boolean]>([
    ['entrada en el mismo commit que el texto', 100, [100], true],
    ['entrada en un commit posterior', 100, [200], true],
    ['texto cambiado en un commit posterior a la entrada', 200, [100], false],
    ['una entrada vieja y otra posterior', 200, [100, 300], true],
    ['entrada sin commitear y texto commiteado', 100, ['sin-commitear'], true],
    ['texto y entrada sin commitear', 'sin-commitear', ['sin-commitear'], true],
    ['texto sin commitear y entrada commiteada', 'sin-commitear', [100], false],
  ])('%s', (_, texto, instantes, pasa) => {
    const fallos = fallosDeAprobaciones(
      [propia('buzz-x', texto)],
      instantes.map((instante) => ({ entrada: entrada('buzz-x'), instante })),
    );
    if (pasa) expect(fallos).toEqual([]);
    else expect(fallos[0]).toMatch(/su texto cambió .* a la última aprobación/u);
  });

  it('sin instante del texto —sin historial fiable— solo mira la existencia y los agentes', () => {
    expect(fallosDeAprobaciones([propia('buzz-x')], [{ entrada: entrada('buzz-x') }])).toEqual([]);
  });
});

describe('35.11 — el fichero del árbol', () => {
  const RUTA = `corpus/${FICHERO_DE_APROBACIONES}`;

  it(`${RUTA} es su cabecera y la lista vacía`, () => {
    const contenido = readFileSync(join(RAIZ, RUTA), 'utf8');
    expect(contenido).toBe(CABECERA_DE_APROBACIONES);
    expect(parsearYaml(contenido)).toEqual({ aprobaciones: null });
  });

  it(`${RUTA} empieza, byte a byte, por el del primer padre`, async () => {
    const actual = readFileSync(join(RAIZ, RUTA), 'utf8');
    let padre: string;
    try {
      padre = (await ejecutar('git', ['rev-parse', '--verify', 'HEAD^1'], { cwd: RAIZ })).stdout.trim();
    } catch {
      if (process.env.CI) throw new Error('Sin HEAD^1: el CI tiene que traer el historial (fetch-depth: 0).');
      console.warn(`Sin HEAD^1: se omite la comprobación de que ${RUTA} solo añade.`);
      return;
    }
    let anterior: string;
    try {
      anterior = (await ejecutar('git', ['show', `${padre}:${RUTA}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 })).stdout;
    } catch {
      return; // El padre no lo tiene: es el commit que lo crea.
    }
    expect(actual.startsWith(anterior), `${RUTA} reescribe lo que el commit padre ya tenía`).toBe(true);
  });

  it(`${RUTA} no es familia de ningún fichero: no fecha ni avisa`, () => {
    expect(familiaDeFichero(RUTA)).toBeUndefined();
    expect(FAMILIAS_DE_FICHERO.some(([directorio]) => RUTA.startsWith(`${directorio}/`))).toBe(false);
  });

  it('ningún módulo de src/ nombra el registro ni tools/lib/aprobaciones (AD-24)', async () => {
    const ficheros = (await readdir(join(RAIZ, 'src'), { recursive: true })).filter((f) => /\.(ts|astro|mjs|js)$/u.test(String(f)));
    for (const fichero of ficheros) {
      const contenido = readFileSync(join(RAIZ, 'src', String(fichero)), 'utf8');
      expect(contenido, String(fichero)).not.toContain(FICHERO_DE_APROBACIONES);
      expect(contenido, String(fichero)).not.toContain('tools/lib/aprobaciones');
    }
  });
});

describe('35.11 — los instantes, de un historial de git real', () => {
  /** Un repositorio temporal con su Corpus; cada commit lleva una fecha propia, para que el orden sea el de los commits. */
  async function repositorio() {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-aprobaciones-git-'));
    temporales.push(raiz);
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    await mkdir(rutas.citas, { recursive: true });
    const git = (...args: string[]) =>
      ejecutar('git', ['-c', 'user.name=Prueba', '-c', 'user.email=prueba@ejemplo.org', '-c', 'commit.gpgsign=false', ...args], {
        cwd: raiz,
      });
    await git('init', '-q');
    let segundo = 0;
    const commit = async () => {
      segundo += 10;
      const fecha = `2026-11-14T10:00:${String(segundo).padStart(2, '0')}Z`;
      await git('add', '-A');
      await ejecutar(
        'git',
        ['-c', 'user.name=Prueba', '-c', 'user.email=prueba@ejemplo.org', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', `c${segundo}`],
        { cwd: raiz, env: { ...process.env, GIT_AUTHOR_DATE: fecha, GIT_COMMITTER_DATE: fecha } },
      );
    };
    const cita = join(rutas.citas, 'buzz--x.md');
    const escribirCita = (texto: string, extra = '') => writeFile(cita, `---\ntexto: "${texto}"\nslug: "buzz-x"\n${extra}---\n`, 'utf8');
    const anotar = async (n: number) => {
      const lineas = Array.from({ length: n }, (_, i) => `  - { slug: "buzz-x", propone: "a${i}", aprueba: "b${i}", fecha: "2026-11-14" }\n`);
      await writeFile(rutas.aprobacionesDeAtribuidas, `${CABECERA_DE_APROBACIONES}${lineas.join('')}`, 'utf8');
    };
    const juzgar = async (texto: string) => {
      const entradas = await leerAprobaciones(rutas);
      const instantes = await instantesDeLasAprobaciones(raiz, rutas.aprobacionesDeAtribuidas, [{ slug: 'buzz-x', ruta: cita, texto }], entradas);
      if ('motivo' in instantes) throw new Error(instantes.motivo);
      return fallosDeAprobaciones(
        [{ slug: 'buzz-x', ruta: 'corpus/citas/buzz--x.md', texto: instantes.textos.get('buzz-x')! }],
        entradas.map((e, i) => ({ entrada: e, ...(instantes.entradas[i] !== undefined ? { instante: instantes.entradas[i]! } : {}) })),
      );
    };
    return { escribirCita, anotar, commit, juzgar };
  }

  it('la Cita y su entrada en el mismo commit pasan; un texto cambiado en un commit posterior rompe', async () => {
    const r = await repositorio();
    await r.escribirCita('Primera letra.');
    await r.anotar(1);
    await r.commit();
    expect(await r.juzgar('Primera letra.')).toEqual([]);
    await r.escribirCita('Segunda letra.');
    await r.commit();
    expect((await r.juzgar('Segunda letra.'))[0]).toMatch(/su texto cambió en un commit posterior/u);
    // Una entrada nueva en un commit posterior lo arregla.
    await r.anotar(2);
    await r.commit();
    expect(await r.juzgar('Segunda letra.')).toEqual([]);
  });

  it('texto y entrada sin commitear pasan; el texto sin commitear sin entrada nueva rompe', async () => {
    const r = await repositorio();
    await r.escribirCita('Primera letra.');
    await r.anotar(1);
    await r.commit();
    await r.escribirCita('Retraducida.');
    expect((await r.juzgar('Retraducida.'))[0]).toMatch(/su texto cambió sin commitear/u);
    await r.anotar(2);
    expect(await r.juzgar('Retraducida.')).toEqual([]);
  });

  it('una Cita sin commitear con su entrada sin commitear pasa; un cambio que no toca el texto no cuenta', async () => {
    const r = await repositorio();
    await r.escribirCita('Primera letra.');
    await r.anotar(1);
    expect(await r.juzgar('Primera letra.')).toEqual([]);
    await r.commit();
    // Reescribir el fichero con el mismo texto (otro campo) no es un cambio de texto.
    await r.escribirCita('Primera letra.', 'aptaParaPortada: true\n');
    await r.commit();
    expect(await r.juzgar('Primera letra.')).toEqual([]);
  });

  it('fuera de un repositorio dice por qué no se fía del historial', async () => {
    const base = await mkdtemp(join(tmpdir(), 'sabiduria-aprobaciones-sin-git-'));
    temporales.push(base);
    const instantes = await instantesDeLasAprobaciones(base, join(base, 'corpus', FICHERO_DE_APROBACIONES), [], []);
    expect('motivo' in instantes).toBe(true);
  });
});
