import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  fijarJornadas,
  inventarioDeJornadas,
  soltarJornadas,
} from '../../tools/lib/jornadas.ts';
import { rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { RAIZ } from './ayuda/construir.js';

/**
 * Historia 13.1 — fijar jornadas, sobre la matriz de entrada y salida.
 *
 * Todo esto ocurre sobre corpus temporales, nunca sobre `corpus/`: la herramienta escribe
 * ficheros, y fijar una jornada de verdad en el repositorio es de Héctor, no de una prueba.
 * Es criterio de aceptación de la historia que `git status --porcelain corpus/` quede vacío
 * al terminar la suite.
 *
 * Lo que se fija aquí no es que la herramienta valide por validar: es **lo que añade sobre
 * editar `corpus/portada.json` a mano**, que es lo que ningún esquema puede ver porque no
 * es de un fichero sino de la relación entre varios —si el slug es una Cita, si está
 * publicada y si está marcada apta para portada— más lo único que se sabe mirando el
 * calendario: que la jornada no haya pasado.
 */

const ejecutar = promisify(execFile);

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

/** Una jornada que no pasa nunca, y su día anterior, para no depender de la fecha real. */
const HOY = '2026-08-19';
const MANANA = '2026-08-20';
const PASADO = '2026-08-21';
const AYER = '2026-08-18';

const APTA = 'seneca-la-vida-si-sabes-usarla-es-larga';
const OTRA_APTA = 'seneca-no-es-que-tengamos-poco-tiempo';
const SIN_MARCAR = 'seneca-cada-uno-es-hijo-de-sus-obras';
const EN_REVISION = 'seneca-candidata-sin-aprobar';

function cita(slug: string, apta: boolean): string {
  return [
    '---',
    'texto: "No es que tengamos poco tiempo, es que perdemos mucho."',
    'autor: "seneca"',
    `slug: "${slug}"`,
    'temas: []',
    ...(apta ? ['aptaParaPortada: true'] : []),
    '---',
    '',
  ].join('\n');
}

/**
 * Un corpus temporal con las tres clases de Cita que la matriz distingue, y el
 * `portada.json` que se le indique. Sin `portada`, el fichero **no existe**: es el estado de
 * un corpus recién hecho, y fijar la primera jornada tiene que crearlo.
 */
async function corpusDePrueba(portada?: unknown): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-jornadas-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));

  await mkdir(rutas.citas, { recursive: true });
  await mkdir(rutas.revision, { recursive: true });
  await writeFile(join(rutas.citas, 'seneca--larga.md'), cita(APTA, true), 'utf8');
  await writeFile(join(rutas.citas, 'seneca--poco-tiempo.md'), cita(OTRA_APTA, true), 'utf8');
  await writeFile(join(rutas.citas, 'seneca--hijo.md'), cita(SIN_MARCAR, false), 'utf8');
  await writeFile(join(rutas.revision, 'seneca--candidata.md'), cita(EN_REVISION, true), 'utf8');

  if (portada !== undefined) {
    await writeFile(rutas.portada, `${JSON.stringify(portada, null, 2)}\n`, 'utf8');
  }
  return rutas;
}

/** Lo que el fichero de portada dice ahora mismo, tal cual está escrito. */
async function portadaDe(rutas: Rutas): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(rutas.portada, 'utf8')) as Record<string, unknown>;
}

const fijacionesDe = async (rutas: Rutas) =>
  (await portadaDe(rutas)).fijaciones as Record<string, string>;

describe('Historia 13.1 — fijar varias jornadas de una sentada', () => {
  it('deja las jornadas escritas en corpus/portada.json, que es de donde sale la Cita del Día', async () => {
    const rutas = await corpusDePrueba();

    const resultado = await fijarJornadas(
      rutas,
      [
        { jornada: MANANA, cita: APTA },
        { jornada: PASADO, cita: OTRA_APTA },
      ],
      HOY,
    );

    expect(resultado.ok, JSON.stringify(resultado)).toBe(true);
    // Lo escrito es el mismo fichero que importan la portada, la 404 y el Kit: no hay un
    // segundo almacén de jornadas al que mirar.
    expect(await fijacionesDe(rutas)).toEqual({ [MANANA]: APTA, [PASADO]: OTRA_APTA });
  });

  it('fijar hoy mismo se admite: la jornada en curso todavía se construye', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await fijarJornadas(rutas, [{ jornada: HOY, cita: APTA }], HOY);
    expect(resultado.ok).toBe(true);
    expect(await fijacionesDe(rutas)).toEqual({ [HOY]: APTA });
  });

  it('las escribe ordenadas por jornada, y no por el orden en que se compuso el lote', async () => {
    const rutas = await corpusDePrueba();
    await fijarJornadas(
      rutas,
      [
        { jornada: PASADO, cita: APTA },
        { jornada: MANANA, cita: OTRA_APTA },
      ],
      HOY,
    );
    // El fichero se lee con los ojos: un calendario desordenado no se lee.
    expect(Object.keys(await fijacionesDe(rutas))).toEqual([MANANA, PASADO]);
  });

  it('crea el fichero si no existía, con su comentario, y no nace mudo', async () => {
    const rutas = await corpusDePrueba();
    expect(existsSync(rutas.portada)).toBe(false);

    await fijarJornadas(rutas, [{ jornada: MANANA, cita: APTA }], HOY);

    const portada = await portadaDe(rutas);
    expect(typeof portada._comentario).toBe('string');
    expect(portada._comentario).toContain('prioridad');
  });
});

describe('Historia 13.1 — el lote es reanudable', () => {
  it('fijar preserva lo ya fijado: retomarlo otro día continúa donde se dejó', async () => {
    const rutas = await corpusDePrueba({
      _comentario: 'el de siempre',
      fijaciones: { [MANANA]: APTA },
    });

    await fijarJornadas(rutas, [{ jornada: PASADO, cita: OTRA_APTA }], HOY);

    expect(await fijacionesDe(rutas)).toEqual({ [MANANA]: APTA, [PASADO]: OTRA_APTA });
  });

  it('y preserva también lo que no es una fijación: el comentario del fichero sobrevive', async () => {
    // La lección de la 12.4: se valida y se reescribe el fichero real, no un objeto
    // reconstruido de las claves que el lector supo nombrar. Con la versión anterior de esa
    // idea, cada escritura se llevaba por delante lo que no entendía.
    const rutas = await corpusDePrueba({
      _comentario: 'Fijaciones manuales de la Cita del Día.',
      _otraClave: ['algo', 'que', 'nadie', 'nombra'],
      fijaciones: {},
    });

    await fijarJornadas(rutas, [{ jornada: MANANA, cita: APTA }], HOY);

    const portada = await portadaDe(rutas);
    expect(portada._comentario).toBe('Fijaciones manuales de la Cita del Día.');
    expect(portada._otraClave).toEqual(['algo', 'que', 'nadie', 'nombra']);
  });

  it('volver a fijar una jornada la sustituye, que es como se recompone su material', async () => {
    const rutas = await corpusDePrueba({ fijaciones: { [MANANA]: APTA } });

    const resultado = await fijarJornadas(rutas, [{ jornada: MANANA, cita: OTRA_APTA }], HOY);

    expect(resultado.ok).toBe(true);
    expect(await fijacionesDe(rutas)).toEqual({ [MANANA]: OTRA_APTA });
    // Nada que recomponer a mano: no hay material guardado que pudiera quedarse viejo.
    if (resultado.ok) expect(resultado.mensaje).toContain('recompone');
  });

  it('soltar una jornada la devuelve a la rotación sin tocar las demás', async () => {
    const rutas = await corpusDePrueba({
      fijaciones: { [MANANA]: APTA, [PASADO]: OTRA_APTA },
    });

    const resultado = await soltarJornadas(rutas, [MANANA]);

    expect(resultado.ok).toBe(true);
    expect(await fijacionesDe(rutas)).toEqual({ [PASADO]: OTRA_APTA });
  });

  it('soltar también deja el fichero ordenado por jornada', async () => {
    /*
     * El invariante de «se lee con los ojos» lo fija `fijar`, pero si solo lo respetara él,
     * la primera vez que se soltara una jornada el fichero dejaría de estar ordenado y nada
     * fallaría. Las dos órdenes escriben por el mismo sitio.
     */
    const rutas = await corpusDePrueba({
      fijaciones: { [PASADO]: OTRA_APTA, [AYER]: APTA, [MANANA]: APTA },
    });

    await soltarJornadas(rutas, [AYER]);

    expect(Object.keys(await fijacionesDe(rutas))).toEqual([MANANA, PASADO]);
  });

  it('soltar una jornada que no está fijada se rechaza en vez de mentir', async () => {
    const rutas = await corpusDePrueba({ fijaciones: { [MANANA]: APTA } });

    const resultado = await soltarJornadas(rutas, [PASADO]);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join('\n')).toContain(PASADO);
    expect(await fijacionesDe(rutas)).toEqual({ [MANANA]: APTA });
  });
});

describe('Historia 13.1 — lo que se rechaza al fijar', () => {
  it('una jornada ya vencida: fijar el pasado no publica nada', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const resultado = await fijarJornadas(rutas, [{ jornada: AYER, cita: APTA }], HOY);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join('\n')).toMatch(/ya pasó/);
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('una jornada mal formada, diciendo la forma que se espera', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    for (const mala of ['24-08-2026', '2026-8-4', 'mañana', '2026-08-24T00:00:00Z']) {
      const resultado = await fijarJornadas(rutas, [{ jornada: mala, cita: APTA }], HOY);
      expect(resultado.ok, mala).toBe(false);
      if (!resultado.ok) expect(resultado.motivos.join('\n'), mala).toContain('AAAA-MM-DD');
    }
  });

  it('una jornada que casa con la forma y no existe en el calendario', async () => {
    // `2026-02-31` pasa la expresión regular y no es ningún día. Sin esta comprobación, la
    // rotación calculaba un índice `NaN` y la selección salía `undefined` a cuatro marcos
    // de distancia de la errata que lo causó.
    const rutas = await corpusDePrueba({ fijaciones: {} });
    const resultado = await fijarJornadas(rutas, [{ jornada: '2026-02-31', cita: APTA }], HOY);
    expect(resultado.ok).toBe(false);
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('un slug que no es ninguna Cita del corpus, nombrándolo', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const resultado = await fijarJornadas(
      rutas,
      [{ jornada: MANANA, cita: 'seneca-esta-no-existe' }],
      HOY,
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivos.join('\n')).toContain('seneca-esta-no-existe');
      expect(resultado.motivos.join('\n')).toMatch(/no existe/);
    }
  });

  it('una Cita que sigue en revisión, diciendo que no está publicada', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const resultado = await fijarJornadas(rutas, [{ jornada: MANANA, cita: EN_REVISION }], HOY);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivos.join('\n')).toContain('corpus/_revision/');
  });

  it('una Cita publicada pero sin marcar apta para portada, nombrando la regla', async () => {
    /*
     * El rechazo que más falta hace. Sin él, la fijación se escribe, no falla nada y el día
     * que toca sale otra Cita: `citaDelDia` busca la fijada **entre las aptas** y, si no
     * está, rota para no dejar la portada muda.
     */
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const resultado = await fijarJornadas(rutas, [{ jornada: MANANA, cita: SIN_MARCAR }], HOY);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      const motivos = resultado.motivos.join('\n');
      expect(motivos).toContain('apta para portada');
      expect(motivos).toContain('tools/portada.ts marcar');
    }
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('la misma jornada dos veces con dos Citas distintas, sin adivinar cuál manda', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const resultado = await fijarJornadas(
      rutas,
      [
        { jornada: MANANA, cita: APTA },
        { jornada: MANANA, cita: OTRA_APTA },
      ],
      HOY,
    );

    expect(resultado.ok).toBe(false);
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('un lote con un par malo no fija los buenos: se escribe entero o no se escribe', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const resultado = await fijarJornadas(
      rutas,
      [
        { jornada: MANANA, cita: APTA },
        { jornada: PASADO, cita: 'seneca-esta-no-existe' },
      ],
      HOY,
    );

    expect(resultado.ok).toBe(false);
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('fijar la misma Cita en dos jornadas se admite, pero se avisa', async () => {
    // No es un error —una Cita que funcionó puede volver a salir— pero casi siempre es un
    // descuido al pegar una lista, y cuando se descubre ya se publicó dos veces lo mismo.
    const rutas = await corpusDePrueba({ fijaciones: { [MANANA]: APTA } });

    const resultado = await fijarJornadas(rutas, [{ jornada: PASADO, cita: APTA }], HOY);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.mensaje).toContain('Aviso');
      expect(resultado.mensaje).toContain(APTA);
    }
    // Y se fija igual: es un aviso, no una puerta.
    expect(await fijacionesDe(rutas)).toEqual({ [MANANA]: APTA, [PASADO]: APTA });
  });

  it('un portada.json que no se entiende se rechaza sin reescribirlo', async () => {
    // Fijar sobre un `fijaciones` que resultó ser una lista lo dejaría igual de roto y
    // además reescrito, y quien pidió fijar querría saber que su portada no está como cree.
    const rutas = await corpusDePrueba({ _comentario: 'el de siempre', fijaciones: ['ups'] });
    const antes = await readFile(rutas.portada, 'utf8');

    const resultado = await fijarJornadas(rutas, [{ jornada: MANANA, cita: APTA }], HOY);

    expect(resultado.ok).toBe(false);
    expect(await readFile(rutas.portada, 'utf8')).toBe(antes);
  });
});

describe('Historia 13.1 — lo que enseña el inventario', () => {
  it('ordena por jornada y distingue lo pasado de lo que queda por delante', async () => {
    const rutas = await corpusDePrueba({
      fijaciones: { [PASADO]: OTRA_APTA, [AYER]: APTA, [MANANA]: APTA },
    });

    const inventario = await inventarioDeJornadas(rutas, HOY);

    expect(inventario.ok).toBe(true);
    if (!inventario.ok) return;
    expect(inventario.jornadas.map((j) => j.jornada)).toEqual([AYER, MANANA, PASADO]);
    expect(inventario.jornadas.map((j) => j.pasada)).toEqual([true, false, false]);
  });

  it('avisa de la fijación que quedó muda por perder su marca de portada', async () => {
    // Es el modo silencioso: la fijación sigue escrita, no falla nada y ese día rota otra.
    const rutas = await corpusDePrueba({ fijaciones: { [MANANA]: SIN_MARCAR } });

    const inventario = await inventarioDeJornadas(rutas, HOY);

    expect(inventario.ok).toBe(true);
    if (!inventario.ok) return;
    expect(inventario.jornadas[0]).toMatchObject({ publicada: true, apta: false });
  });

  it('y de la que apunta a una Cita que ya no está publicada', async () => {
    const rutas = await corpusDePrueba({ fijaciones: { [MANANA]: EN_REVISION } });

    const inventario = await inventarioDeJornadas(rutas, HOY);

    expect(inventario.ok).toBe(true);
    if (!inventario.ok) return;
    expect(inventario.jornadas[0]).toMatchObject({ publicada: false, apta: false });
  });

  it('sin fijaciones, no se queda a medias: devuelve la lista vacía', async () => {
    const rutas = await corpusDePrueba();
    const inventario = await inventarioDeJornadas(rutas, HOY);
    expect(inventario.ok).toBe(true);
    if (inventario.ok) expect(inventario.jornadas).toEqual([]);
  });
});

/**
 * Historia 13.1 — la orden sobre disco.
 *
 * Lo puro está arriba. Aquí se mide lo que solo se ve ejecutándola: que un rechazo salga con
 * **código distinto de cero** —estas órdenes se encadenan en guiones, y un rechazo con
 * código 0 dejaría al guion creyendo que salió bien— y que una bandera con errata no acabe
 * escribiendo en el corpus de verdad, que es la lección de la Historia 12.4.
 */
describe('Historia 13.1 — la orden jornada', () => {
  /**
   * Ejecuta la orden. `cwd` sirve para las pruebas del guardián de banderas: si el guardián
   * fallara, `raizDeCorpusDe` caería a `corpus` **relativo al directorio de trabajo**, así
   * que se ejecuta desde un temporal que tiene el suyo. Se invoca el `tsx` de la raíz por
   * ruta absoluta porque `npx` desde otro directorio intentaría resolverlo —o instalarlo—
   * en el equivocado.
   */
  async function correr(argumentos: string[], cwd = RAIZ) {
    try {
      const { stdout, stderr } = await ejecutar(
        join(RAIZ, 'node_modules/.bin/tsx'),
        [join(RAIZ, 'tools/jornada.ts'), ...argumentos],
        { cwd, env: { ...process.env, FECHA_JORNADA: HOY } },
      );
      return { codigo: 0, salida: stdout, error: stderr };
    } catch (e) {
      const fallo = e as { code?: number; stdout?: string; stderr?: string };
      return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
    }
  }

  /**
   * Un destino equivocado de verdad: un directorio de trabajo con su propio `corpus/`.
   *
   * La prueba anterior leía el `corpus/` **real** para comprobar que no había cambiado. Eso
   * detecta la regresión, pero no la impide: si el guardián volviera a fallar, la orden ya
   * habría escrito en el repositorio y el criterio de aceptación de la historia —`corpus/`
   * intacto— se habría roto durante la propia suite. Con esto, lo peor que puede pasar es
   * que escriba en un temporal.
   */
  async function dondeCaeriaPorOmision(): Promise<{ cwd: string; portada: string }> {
    const cwd = await mkdtemp(join(tmpdir(), 'sabiduria-jornada-cwd-'));
    temporales.push(cwd);
    const rutas = rutasDelCorpus(join(cwd, 'corpus'));
    await mkdir(rutas.citas, { recursive: true });
    await writeFile(rutas.portada, `${JSON.stringify({ fijaciones: {} }, null, 2)}\n`, 'utf8');
    return { cwd, portada: rutas.portada };
  }

  it('fija y lista sobre el corpus que se le indica', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });

    const fijado = await correr(['fijar', MANANA, APTA, PASADO, OTRA_APTA, '--corpus', rutas.raiz]);
    expect(fijado.codigo, fijado.error).toBe(0);
    expect(await fijacionesDe(rutas)).toEqual({ [MANANA]: APTA, [PASADO]: OTRA_APTA });

    const listado = await correr(['listar', '--corpus', rutas.raiz]);
    expect(listado.codigo, listado.error).toBe(0);
    expect(listado.salida).toContain(MANANA);
    expect(listado.salida).toContain(PASADO);
  });

  it('sin nada fijado lo dice, en vez de imprimir una lista vacía', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });
    const listado = await correr(['listar', '--corpus', rutas.raiz]);
    expect(listado.codigo).toBe(0);
    expect(listado.salida).toMatch(/No hay ninguna jornada fijada/);
  });

  it('un rechazo sale con código distinto de cero', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });
    const { codigo, error } = await correr(['fijar', AYER, APTA, '--corpus', rutas.raiz]);
    expect(codigo).not.toBe(0);
    expect(error).toMatch(/ya pasó/);
  });

  it('un número impar de argumentos se para: no se fija medio par', async () => {
    const rutas = await corpusDePrueba({ fijaciones: {} });
    const { codigo } = await correr(['fijar', MANANA, APTA, PASADO, '--corpus', rutas.raiz]);
    expect(codigo).toBe(2);
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('una bandera con errata sale con 2 y no escribe en el corpus por omisión', async () => {
    /*
     * El fallo que la Historia 12.4 cazó en su hermana: `--corpuss` se ignoraba, la orden
     * caía al corpus por omisión y escribía en `corpus/` de verdad. Aquí eso habría fijado
     * una jornada en el repositorio.
     */
    const rutas = await corpusDePrueba({ fijaciones: {} });
    const { cwd, portada } = await dondeCaeriaPorOmision();
    const antes = await readFile(portada, 'utf8');

    const { codigo } = await correr(['fijar', MANANA, APTA, '--corpuss', rutas.raiz], cwd);

    expect(codigo).toBe(2);
    expect(await readFile(portada, 'utf8')).toBe(antes);
    // Y el corpus real ni se mira: la orden se ejecutó desde otro directorio de trabajo.
    expect(await fijacionesDe(rutas)).toEqual({});
  });

  it('«--corpus» sin valor sale con 2 en vez de caer al corpus por omisión', async () => {
    /*
     * `opcion` devuelve `undefined` cuando a la opción no le sigue un valor —o le sigue otra
     * bandera—, y `raizDeCorpusDe` cae entonces a `corpus`. Es peor que una errata: la
     * bandera está bien escrita, así que quien la teclea cree haber dicho dónde escribir.
     */
    const { cwd, portada } = await dondeCaeriaPorOmision();
    const antes = await readFile(portada, 'utf8');

    for (const argumentos of [
      ['fijar', MANANA, APTA, '--corpus'],
      ['listar', '--corpus'],
    ]) {
      const { codigo, error } = await correr(argumentos, cwd);
      expect(codigo, argumentos.join(' ')).toBe(2);
      expect(error).toContain('necesita un valor');
    }
    expect(await readFile(portada, 'utf8')).toBe(antes);
  });

  it('soltar también se ejercita de verdad, y su error de uso sale con 2', async () => {
    const rutas = await corpusDePrueba({
      fijaciones: { [PASADO]: OTRA_APTA, [MANANA]: APTA },
    });

    const suelta = await correr(['soltar', MANANA, '--corpus', rutas.raiz]);
    expect(suelta.codigo, suelta.error).toBe(0);
    expect(await fijacionesDe(rutas)).toEqual({ [PASADO]: OTRA_APTA });

    // Una jornada que no está fijada es algo que la orden entendió y rechazó: código 1.
    const inexistente = await correr(['soltar', MANANA, '--corpus', rutas.raiz]);
    expect(inexistente.codigo).toBe(1);

    // No decir ninguna es un error de uso, y sale con 2 como en `fijar`.
    const sinArgumentos = await correr(['soltar', '--corpus', rutas.raiz]);
    expect(sinArgumentos.codigo).toBe(2);
    expect(sinArgumentos.error).toContain('npx tsx tools/jornada.ts soltar');
  });

  it('avisa cuando la jornada viene del entorno y no del calendario de quien la ejecuta', async () => {
    // Olvidada en la shell, `FECHA_JORNADA` cambia en silencio qué significa «ya pasó».
    const rutas = await corpusDePrueba({ fijaciones: {} });
    const { error } = await correr(['listar', '--corpus', rutas.raiz]);
    expect(error).toContain('FECHA_JORNADA');
  });

  it('una orden que no existe enseña el uso y sale con 2', async () => {
    const { codigo, error } = await correr(['componer']);
    expect(codigo).toBe(2);
    expect(error).toContain('npx tsx tools/jornada.ts fijar');
  });
});
