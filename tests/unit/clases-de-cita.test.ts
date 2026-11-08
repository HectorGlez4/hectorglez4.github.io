/**
 * El registro de clases de Cita — Historia 35.1.
 *
 * `corpus/clases-de-cita.yml` solo añade: lo escriben el alta, la aprobación y la siembra, y el
 * build lo lee solo para romper. Aquí: su lectura y su escritura, la siembra idempotente y sus
 * códigos, la puerta pura (`fallosDeClases`), que el commit solo añade respecto de su primer
 * padre, que el CI tiene el historial para comprobarlo y que el registro no fecha ni avisa.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CABECERA_DE_CLASES,
  FICHERO_DE_CLASES,
  leerRegistroDeClases,
  registrarClases,
  rutasDelCorpus,
} from '../../tools/lib/corpus.ts';
import {
  anotarTrasInterrupcion,
  entradasQueFaltan,
  fallosDeClases,
  ORDEN_SEMBRAR_CLASES,
  PublicacionInterrumpida,
  sembrarRegistro,
} from '../../tools/lib/clases.ts';
import { analizarArgumentos } from '../../tools/clases.ts';
import { FAMILIAS_DE_FICHERO, familiaDeFichero } from '../../tools/lib/avisar.ts';
import { CLASE_ATRIBUIDA } from '../../src/lib/clase.ts';

const ejecutar = promisify(execFile);
const RAIZ_DEL_REPO = join(import.meta.dirname, '..', '..');
const ATRIBUIDA = CLASE_ATRIBUIDA;

const temporales: string[] = [];
afterEach(async () => {
  for (const dir of temporales.splice(0)) await rm(dir, { recursive: true, force: true });
});

async function corpusDePrueba(citas: Record<string, string> = {}): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'clases-'));
  temporales.push(raiz);
  await mkdir(join(raiz, 'citas'), { recursive: true });
  for (const [nombre, contenido] of Object.entries(citas)) await writeFile(join(raiz, 'citas', nombre), contenido, 'utf8');
  return raiz;
}

const cita = (slug: string, extra = '') =>
  `---\ntexto: "Una sentencia."\nautor: "seneca"\nslug: "${slug}"\nprocedencia:\n  obra: "Cartas"\nestadoDerechos: "dominio-público"\n${extra}---\n`;

describe('35.1 — el registro se lee y solo se añade', () => {
  it('sin fichero se lee vacío; registrar crea la cabecera y añade una línea por entrada', async () => {
    const rutas = rutasDelCorpus(await corpusDePrueba());
    expect(await leerRegistroDeClases(rutas)).toEqual([]);
    await registrarClases(rutas, []);
    expect(existsSync(rutas.clasesDeCita)).toBe(false);
    await registrarClases(rutas, [{ slug: 'seneca-una', clase: 'siempre', fecha: '2026-11-07' }]);
    await registrarClases(rutas, [{ slug: 'seneca-dos', clase: ATRIBUIDA, fecha: '2026-11-08' }]);
    const texto = await readFile(rutas.clasesDeCita, 'utf8');
    expect(texto).toBe(
      `${CABECERA_DE_CLASES}  - { slug: "seneca-una", clase: siempre, fecha: "2026-11-07" }\n` +
        `  - { slug: "seneca-dos", clase: ${ATRIBUIDA}, fecha: "2026-11-08" }\n`,
    );
    expect(await leerRegistroDeClases(rutas)).toEqual([
      { slug: 'seneca-una', clase: 'siempre', fecha: '2026-11-07' },
      { slug: 'seneca-dos', clase: ATRIBUIDA, fecha: '2026-11-08' },
    ]);
  });

  it('una entrada sin forma, o un registro ilegible, no escribe nada', async () => {
    const rutas = rutasDelCorpus(await corpusDePrueba());
    await expect(registrarClases(rutas, [{ slug: 'Mal', clase: 'siempre', fecha: '2026-11-07' }])).rejects.toThrow(/slug/u);
    await expect(
      registrarClases(rutas, [{ slug: 'bien', clase: 'otra' as never, fecha: '2026-11-07' }]),
    ).rejects.toThrow(/clase/u);
    expect(existsSync(rutas.clasesDeCita)).toBe(false);
    await writeFile(rutas.clasesDeCita, 'otra: []\n', 'utf8');
    await expect(leerRegistroDeClases(rutas)).rejects.toThrow(/clases:/u);
    await expect(registrarClases(rutas, [{ slug: 'bien', clase: 'siempre', fecha: '2026-11-07' }])).rejects.toThrow();
    expect(await readFile(rutas.clasesDeCita, 'utf8')).toBe('otra: []\n');
  });

  it('un registro vacío —una primera escritura cortada— se lee vacío y el siguiente añadido le pone la cabecera', async () => {
    const rutas = rutasDelCorpus(await corpusDePrueba({ 'seneca--a.md': cita('seneca-a') }));
    for (const vacio of ['', '\n  \n']) {
      await writeFile(rutas.clasesDeCita, vacio, 'utf8');
      expect(await leerRegistroDeClases(rutas)).toEqual([]);
      expect(await sembrarRegistro(rutas, '2026-11-07')).toMatchObject({ añadidas: 1 });
      const texto = await readFile(rutas.clasesDeCita, 'utf8');
      // Solo añade: lo que había sigue delante, byte a byte.
      expect(texto).toBe(`${vacio}${CABECERA_DE_CLASES}  - { slug: "seneca-a", clase: siempre, fecha: "2026-11-07" }\n`);
      expect(await leerRegistroDeClases(rutas)).toEqual([{ slug: 'seneca-a', clase: 'siempre', fecha: '2026-11-07' }]);
    }
  });

  it('tras una pasada interrumpida anota lo ya publicado y lo cuenta; sin nada publicado, el fallo sube tal cual', async () => {
    const rutas = rutasDelCorpus(await corpusDePrueba());
    const causa = new Error('disco lleno');
    expect(await anotarTrasInterrupcion(rutas, [], causa)).toBe(causa);
    expect(existsSync(rutas.clasesDeCita)).toBe(false);

    const anotada = await anotarTrasInterrupcion(rutas, [{ slug: 'seneca-a', clase: 'siempre', fecha: '2026-11-07' }], causa);
    expect(anotada).toBeInstanceOf(PublicacionInterrumpida);
    expect((anotada as PublicacionInterrumpida).registroSinAnotar).toBeUndefined();
    expect((anotada as Error).message).toMatch(/tras publicar 1 Cita \(seneca-a\): disco lleno\..*Se anotaron/su);
    expect((anotada as Error).message).not.toMatch(/No se ha escrito nada/u);
    expect((await leerRegistroDeClases(rutas)).map((e) => e.slug)).toEqual(['seneca-a']);

    await writeFile(rutas.clasesDeCita, 'otra: []\n', 'utf8');
    const sinAnotar = await anotarTrasInterrupcion(rutas, [{ slug: 'seneca-b', clase: 'siempre', fecha: '2026-11-07' }], causa);
    expect((sinAnotar as PublicacionInterrumpida).registroSinAnotar).toMatch(/clases:/u);
    expect((sinAnotar as Error).message).toContain(`No se anotaron en corpus/clases-de-cita.yml`);
    expect((sinAnotar as Error).message).toContain(ORDEN_SEMBRAR_CLASES);
  });
});

describe('35.1 — la siembra', () => {
  it('añade como de siempre lo que falta, y la segunda vez nada', async () => {
    const rutas = rutasDelCorpus(await corpusDePrueba({ 'seneca--b.md': cita('seneca-b'), 'seneca--a.md': cita('seneca-a') }));
    expect(await sembrarRegistro(rutas, '2026-11-07')).toMatchObject({ añadidas: 2 });
    const primera = await readFile(rutas.clasesDeCita, 'utf8');
    expect(await sembrarRegistro(rutas, '2026-11-08')).toMatchObject({ añadidas: 0 });
    expect(await readFile(rutas.clasesDeCita, 'utf8')).toBe(primera);
    expect((await leerRegistroDeClases(rutas)).map((e) => [e.slug, e.clase])).toEqual([
      ['seneca-a', 'siempre'],
      ['seneca-b', 'siempre'],
    ]);
  });

  it('la bandera --corpus repetida es un error de la forma', () => {
    expect(analizarArgumentos(['sembrar', '--corpus', 'a', '--corpus', 'b'])).toEqual({ error: 'Bandera repetida: «--corpus».' });
    expect(analizarArgumentos(['sembrar', '--corpus', 'a'])).toEqual({ corpus: 'a' });
    expect(analizarArgumentos(['sembrar'])).toEqual({ corpus: 'corpus' });
    expect(analizarArgumentos(['sembrar', '--corpus'])).toEqual({ error: 'Falta el valor de «--corpus».' });
    expect(analizarArgumentos(['sembrar', '--corpus', '--otra'])).toEqual({ error: 'Falta el valor de «--corpus».' });
  });

  it('se niega sin escribir ante una atribuida sin registrar', () => {
    expect(() =>
      entradasQueFaltan([{ slug: 'x', ruta: 'corpus/citas/x.md', clase: ATRIBUIDA }], [], '2026-11-07'),
    ).toThrow(/atribuida.*No se ha escrito nada/su);
  });

  it('la orden: 0 al sembrar, 0 la segunda vez, 2 con un argumento desconocido, 1 con un registro ilegible', async () => {
    const raiz = await corpusDePrueba({ 'seneca--a.md': cita('seneca-a') });
    const orden = (...args: string[]) =>
      ejecutar('npx', ['tsx', join(RAIZ_DEL_REPO, 'tools/clases.ts'), ...args], { cwd: RAIZ_DEL_REPO }).then(
        (r) => ({ codigo: 0, salida: r.stdout }),
        (e: { code: number; stdout: string; stderr: string }) => ({ codigo: e.code, salida: `${e.stdout}${e.stderr}` }),
      );
    expect(await orden('sembrar', '--corpus', raiz)).toMatchObject({ codigo: 0, salida: expect.stringMatching(/1 Cita añadida/u) });
    expect(await orden('sembrar', '--corpus', raiz)).toMatchObject({ codigo: 0, salida: expect.stringMatching(/0 añadidas/u) });
    expect((await orden('sembrar', '--otra')).codigo).toBe(2);
    expect((await orden()).codigo).toBe(2);
    await writeFile(join(raiz, FICHERO_DE_CLASES), 'clases: [roto\n', 'utf8');
    expect((await orden('sembrar', '--corpus', raiz)).codigo).toBe(1);
  }, 60_000);
});

describe('35.1 — la puerta pura', () => {
  const autores = [
    { slug: 'cervantes', ruta: 'corpus/autores/cervantes.yml', añoFallecimiento: 1616 },
    { slug: 'viva', ruta: 'corpus/autores/viva.yml', vivo: true },
    { slug: 'reciente', ruta: 'corpus/autores/reciente.yml', añoFallecimiento: 1980 },
  ];
  const entrada = (slug: string, clase: 'siempre' | typeof ATRIBUIDA = 'siempre') => ({ slug, clase, fecha: '2026-11-07' });

  it('el Corpus de siempre, registrado, no falla', () => {
    expect(fallosDeClases([{ slug: 'a', ruta: 'corpus/citas/a.md', autor: 'cervantes' }], autores, [entrada('a')])).toEqual([]);
  });

  it('nombra la que falta, la de clase distinta, el slug con dos clases y los derechos que no casan', () => {
    const fallos = fallosDeClases(
      [
        { slug: 'falta', ruta: 'corpus/citas/falta.md', autor: 'cervantes' },
        { slug: 'distinta', ruta: 'corpus/citas/distinta.md', autor: 'cervantes' },
        { slug: 'doble', ruta: 'corpus/citas/doble.md', autor: 'cervantes' },
        { slug: 'de-viva', ruta: 'corpus/citas/de-viva.md', autor: 'viva' },
        { slug: 'sin-derechos', ruta: 'corpus/citas/sin-derechos.md', autor: 'cervantes', clase: ATRIBUIDA },
      ],
      autores,
      [entrada('distinta', ATRIBUIDA), entrada('doble'), entrada('doble', ATRIBUIDA), entrada('de-viva'), entrada('sin-derechos', ATRIBUIDA)],
    ).join('\n');
    expect(fallos).toContain(`corpus/citas/falta.md: la Cita «falta» no está en corpus/clases-de-cita.yml. Anótela con: ${ORDEN_SEMBRAR_CLASES}`);
    expect(fallos).toMatch(/distinta\.md: la Cita «distinta» es siempre y el registro la anota como atribuida/u);
    expect(fallos).toMatch(/el slug «doble» está registrado con dos clases/u);
    expect(fallos).toMatch(/de-viva\.md: .*corpus\/autores\/viva\.yml.*no es de dominio público/u);
    expect(fallos).toMatch(/sin-derechos\.md: .*atribuida y su Autor \(corpus\/autores\/cervantes\.yml\) no tiene derechos/u);
    // Un Autor sin ninguno de los dos campos lo rechaza su esquema: la puerta no le inventa motivo.
    expect(
      fallosDeClases(
        [{ slug: 'x', ruta: 'corpus/citas/x.md', autor: 'sin-anos' }],
        [{ slug: 'sin-anos', ruta: 'corpus/autores/sin-anos.yml' }],
        [entrada('x')],
      ),
    ).toEqual([]);
  });

  it('dos entradas de la misma clase valen; la atribuida de un Autor vivo, o con Personaje, también', () => {
    expect(
      fallosDeClases(
        [
          { slug: 'a', ruta: 'corpus/citas/a.md', autor: 'cervantes' },
          { slug: 'b', ruta: 'corpus/citas/b.md', autor: 'viva', clase: ATRIBUIDA },
          { slug: 'c', ruta: 'corpus/citas/c.md', autor: 'cervantes', clase: ATRIBUIDA, personaje: 'sancho' },
        ],
        autores,
        [entrada('a'), entrada('a'), entrada('b', ATRIBUIDA), entrada('c', ATRIBUIDA)],
      ),
    ).toEqual([]);
  });

  it('con plazo, la de siempre de un Autor protegido falla; sin año de referencia, lanza', () => {
    const citas = [{ slug: 'r', ruta: 'corpus/citas/r.md', autor: 'reciente' }];
    expect(fallosDeClases(citas, autores, [entrada('r')], { plazo: 70, año: 2026 }).join('\n')).toMatch(/r\.md: .*no es de dominio público/u);
    expect(() => fallosDeClases(citas, autores, [entrada('r')], { plazo: 70 })).toThrow(/AÑO_DE_REFERENCIA/u);
  });
});

describe('35.1 — el registro solo añade, y no fecha ni avisa', () => {
  const RUTA = `corpus/${FICHERO_DE_CLASES}`;

  it('el fichero del árbol empieza, byte a byte, por el del primer padre', async () => {
    const actual = readFileSync(join(RAIZ_DEL_REPO, RUTA), 'utf8');
    let padre: string;
    try {
      padre = (await ejecutar('git', ['rev-parse', '--verify', 'HEAD^1'], { cwd: RAIZ_DEL_REPO })).stdout.trim();
    } catch {
      // Sin padre —una copia superficial—: en el CI es un fallo, porque el trabajo pide el historial.
      if (process.env.CI) throw new Error('Sin HEAD^1: el CI tiene que traer el historial (fetch-depth: 0).');
      console.warn(`Sin HEAD^1: se omite la comprobación de que ${RUTA} solo añade.`);
      return;
    }
    let anterior: string;
    try {
      anterior = (await ejecutar('git', ['show', `${padre}:${RUTA}`], { cwd: RAIZ_DEL_REPO, maxBuffer: 64 * 1024 * 1024 })).stdout;
    } catch {
      // El padre no tiene el fichero: es el commit que lo crea, y todo es añadido.
      return;
    }
    expect(actual.startsWith(anterior), `${RUTA} reescribe lo que el commit padre ya tenía`).toBe(true);
  });

  it('el trabajo construir del CI trae el historial entero', () => {
    const flujo = readFileSync(join(RAIZ_DEL_REPO, '.github/workflows/publicar.yml'), 'utf8');
    const inicio = flujo.indexOf('\n  construir:\n');
    expect(inicio).toBeGreaterThan(-1);
    // El trabajo va hasta la cabecera del siguiente: dos espacios, un nombre y dos puntos.
    const trabajo = flujo.slice(inicio + 1).split(/\n {2}[a-z][\w-]*:\n/u)[0];
    expect(trabajo).toMatch(/^\s+fetch-depth: 0$/mu);
  });

  it('no es familia de ningún fichero, y el diff del aviso y del historial no lo ve', () => {
    expect(familiaDeFichero(RUTA)).toBeUndefined();
    expect(FAMILIAS_DE_FICHERO.some(([directorio]) => RUTA.startsWith(`${directorio}/`))).toBe(false);
  });
});
