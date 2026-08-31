import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import sharp from 'sharp';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  type CorpusDePrueba,
} from './ayuda/construir.js';
import { SITIO } from '../../src/lib/dominio.ts';
import { LADO, svgDePieza, type CitaEnPieza } from '../../src/lib/pieza.ts';
import { nombreDePieza, nombreDePiezaDeColeccion } from '../../tools/lib/piezas.ts';
import { REDES } from '../../src/lib/redes.ts';
import { MAX_CARACTERES_IMAGEN, MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 13.3 — la matriz entera de la orden que anuncia una Colección, sobre disco.
 *
 * Lo puro está en `coleccion-en-pieza.test.ts` y `pieza.test.ts`. Aquí se mide lo que solo se
 * ve ejecutando la orden: que el enlace del texto para publicar sea **la Página de Colección y
 * no una Cita**, que una Colección por debajo de su umbral no componga nada, que una retirada
 * tampoco, que lo excluido salga dicho con su motivo, que cada rechazo lleve el código que le
 * toca —2 para lo que la orden no supo leer, 1 para lo que entendió y rechazó— y el criterio
 * que atraviesa la épica: al terminar, el corpus no ha cambiado ni un byte.
 */

const NOMBRE = 'Frases cortas para reflexionar';
const CRITERIO = 'Citas de una sola frase que se sostienen fuera de su obra.';
const SLUG_COLECCION = 'frases-cortas';

/** La procedencia que trae `citaValida`, ya compuesta como la escribe `atribucion.ts`. */
const PROCEDENCIA = 'Sobre la brevedad de la vida, 49';

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const slugDe = (i: number) => `seneca-fragmento-numero-${i}`;

function textoBreve(i: number): string {
  return `Fragmento número ${i} sobre la brevedad de la vida.`;
}

/** Una Cita que pasa del corte de FR-10, para las filas de exclusión de la matriz. */
function textoLargo(i: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido. ';
  return `${i}. ${base.repeat(4).slice(0, MAX_CARACTERES_IMAGEN + 40).trim()}`;
}

/** Los textos de las `n` primeras Citas breves, indexados como los quiere `corpusCon`. */
function breves(n: number): Record<number, string> {
  return Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, textoBreve(i + 1)]));
}

/** Un nombre que se reparte en dos líneas del lienzo, como uno real puede hacerlo. */
const NOMBRE_LARGO =
  'Frases cortas para reflexionar sobre el paso del tiempo y la brevedad de la vida';

interface OpcionesDeCorpus {
  /** Los miembros que declara el fichero. Por omisión, todas las Citas en orden. */
  miembros?: string[];
  /** La Colección se escribe en `_colecciones-retiradas/` en vez de en `colecciones/`. */
  retirada?: boolean;
  slugColeccion?: string;
  /** El nombre que declara el fichero. Por omisión, `NOMBRE`. */
  nombre?: string;
  /** El fichero de la Colección, literal, para los casos que el esquema debe rechazar. */
  ficheroDeColeccion?: string;
  extras?: CorpusDePrueba;
}

function corpusCon(
  textos: Record<number, string>,
  opciones: OpcionesDeCorpus = {},
): CorpusDePrueba {
  const corpus: CorpusDePrueba = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
  };
  for (const [i, texto] of Object.entries(textos)) {
    corpus[`citas/seneca--fragmento-${i}.md`] = citaValida({ slug: slugDe(Number(i)), texto });
  }

  const miembros =
    opciones.miembros ?? Object.keys(textos).map((i) => slugDe(Number(i)));
  const directorio = opciones.retirada ? '_colecciones-retiradas' : 'colecciones';
  corpus[`${directorio}/${opciones.slugColeccion ?? SLUG_COLECCION}.yml`] =
    opciones.ficheroDeColeccion ??
    coleccionValida({ nombre: opciones.nombre ?? NOMBRE, criterio: CRITERIO, miembros });

  return { ...corpus, ...opciones.extras };
}

const huella = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** La huella del PNG que sale de componer estas Citas con este título, para comparar. */
async function huellaDe(citas: CitaEnPieza[], titulo?: string): Promise<string> {
  return huella(await sharp(Buffer.from(svgDePieza(citas, { titulo }))).png().toBuffer());
}

/** Las Citas breves `1..n`, tal y como las compone el lienzo desde este corpus. */
const enPieza = (indices: number[]): CitaEnPieza[] =>
  indices.map((i) => ({ texto: textoBreve(i), autor: 'Séneca', procedencia: PROCEDENCIA }));

async function enDisco(corpus: CorpusDePrueba): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-pieza-coleccion-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones', '_colecciones-retiradas', '_revision']) {
    await mkdir(join(directorio, dir), { recursive: true });
  }
  for (const [ruta, contenido] of Object.entries(corpus)) {
    const destino = join(directorio, ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, contenido, 'utf8');
  }
  return directorio;
}

async function correrCrudo(argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar(
      'npx',
      ['tsx', join(RAIZ, 'tools/pieza.ts'), ...argumentos],
      { cwd: RAIZ },
    );
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

const correr = (corpus: string, argumentos: string[]) =>
  correrCrudo([...argumentos, '--corpus', corpus]);

/** El contenido literal de un directorio, para comparar antes y después byte a byte. */
async function instantanea(directorio: string): Promise<Record<string, string>> {
  if (!existsSync(directorio)) return {};
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const contenido: Record<string, string> = {};
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    contenido[ruta] = await readFile(ruta, 'utf8');
  }
  return contenido;
}

const corpusEnDisco = async (corpus: string) => ({
  publicadas: await instantanea(join(corpus, 'citas')),
  autores: await instantanea(join(corpus, 'autores')),
  colecciones: await instantanea(join(corpus, 'colecciones')),
  retiradas: await instantanea(join(corpus, '_colecciones-retiradas')),
});

/** Un destino temporal para el PNG, fuera del repositorio. */
async function destino(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-pieza-coleccion-salida-'));
  temporales.push(raiz);
  return join(raiz, 'pieza.png');
}

/** Cuántas Citas dice el parte que entraron, que es lo que la salida promete auditar. */
function cuantasEntraron(salida: string): number {
  const contadas = /compuesta con (\d+) de sus (\d+) Citas/.exec(salida);
  expect(contadas, salida).not.toBeNull();
  return Number(contadas![1]);
}

describe('Historia 13.3 — una Colección anuncia su propia Pieza', () => {
  it('compone el PNG, enlaza a su Página y no toca el corpus', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const antes = await corpusEnDisco(corpus);
    const png = await destino();

    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    const bytes = await readFile(png);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(LADO);
    expect(bytes.readUInt32BE(20)).toBe(LADO);

    /*
     * El criterio de aceptación central: **un** enlace, marcado por red, y a la Página de
     * Colección. Que no sea el de ninguna Cita es la diferencia entera con la 13.2, así que
     * se comprueba por las dos caras.
     */
    const marcados = [...hecha.salida.matchAll(/\?de=([a-z]+)/g)].map((m) => m[1]);
    expect(marcados).toEqual(['instagram']);
    expect(hecha.salida).toContain(`${SITIO}/coleccion/${SLUG_COLECCION}/?de=instagram`);
    expect(hecha.salida).not.toContain('/cita/');

    expect(await corpusEnDisco(corpus)).toEqual(antes);
  });

  it('el PNG lleva el nombre de la Colección, no su slug ni ningún título', async () => {
    /*
     * La aserción que hace cierto «la Pieza lleva el nombre de la Colección». Sin ella, una
     * Pieza sin título —o con el slug por título— sale igual de válida: firma, ancho y alto
     * no distinguen. Se compara el fichero que compuso la orden contra el que compone
     * `svgDePieza` desde los datos que el corpus declara, y contra las dos formas de fallar.
     */
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const png = await destino();
    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    const entraron = enPieza(
      Array.from({ length: cuantasEntraron(hecha.salida) }, (_, i) => i + 1),
    );
    const compuesta = huella(await readFile(png));

    expect(compuesta, 'la Pieza no es la que componen estos datos').toBe(
      await huellaDe(entraron, NOMBRE),
    );
    expect(compuesta, 'la Pieza va sin título').not.toBe(await huellaDe(entraron));
    expect(compuesta, 'la Pieza lleva el slug de la Colección').not.toBe(
      await huellaDe(entraron, SLUG_COLECCION),
    );
  });

  it('entran las primeras del orden declarado, que es curación y no ordenación', async () => {
    const total = MIN_CITAS_POR_COLECCION;
    const alReves = Array.from({ length: total }, (_, i) => slugDe(total - i));
    const corpus = await enDisco(corpusCon(breves(total), { miembros: alReves }));
    const png = await destino();

    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'x',
      '--salida',
      png,
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    // La primera atribución del texto para publicar es la del **último** slug del corpus,
    // que es el primero que declara la Colección. Ordenar por slug daría el 1.
    const entraron = cuantasEntraron(hecha.salida);
    expect(entraron).toBeGreaterThanOrEqual(2);
    expect(hecha.salida).toContain(`«${textoBreve(total)}» — Séneca, ${PROCEDENCIA}.`);
    expect(hecha.salida).not.toContain(`«${textoBreve(1)}» —`);
  });

  it('lo que no cabe queda fuera y la salida lo dice con su motivo', async () => {
    const total = MIN_CITAS_POR_COLECCION;
    const corpus = await enDisco(corpusCon(breves(total)));
    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'threads',
      '--salida',
      await destino(),
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    const entraron = cuantasEntraron(hecha.salida);
    expect(entraron).toBeLessThan(total);
    expect(hecha.salida).toContain('Quedan fuera de la Pieza');
    // Cada una nombrada: excluir sin decirlo sería perder.
    for (let i = entraron + 1; i <= total; i += 1) {
      expect(hecha.salida, `no se dice que «${slugDe(i)}» quedó fuera`).toContain(slugDe(i));
    }
    expect(hecha.salida).toContain('no cabe en el lienzo');
  });

  it('un miembro que pasa del corte de FR-10 queda fuera, y la Pieza se compone igual', async () => {
    const total = MIN_CITAS_POR_COLECCION;
    // La larga la primera del orden declarado: si no se excluyera, sería la que entra.
    const miembros = [slugDe(99), ...Array.from({ length: total }, (_, i) => slugDe(i + 1))];
    const corpus = await enDisco(
      corpusCon({ ...breves(total), 99: textoLargo(99) }, { miembros }),
    );
    const png = await destino();

    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);

    expect(hecha.codigo, hecha.error).toBe(0);
    expect(existsSync(png)).toBe(true);
    expect(hecha.salida).toContain(slugDe(99));
    expect(hecha.salida).toContain('FR-10');
    expect(hecha.salida).toContain(String(MAX_CARACTERES_IMAGEN));
  });

  it('repetir la misma orden da el mismo PNG byte a byte', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const png = await destino();
    const orden = ['coleccion', SLUG_COLECCION, '--red', 'facebook', '--salida', png];

    const primera = await correr(corpus, orden);
    expect(primera.codigo, primera.error).toBe(0);
    const antes = huella(await readFile(png));

    const segunda = await correr(corpus, orden);
    expect(segunda.codigo, segunda.error).toBe(0);
    expect(huella(await readFile(png))).toBe(antes);
  });

  it('sin --salida cae en piezas/, que git ignora: la salida no se versiona', async () => {
    /*
     * El único caso que escribe en el repositorio de verdad, porque es el único modo de
     * comprobar que `.gitignore` cubre **esta** ruta. El slug de la Colección lleva sufijo
     * aleatorio porque el nombre es determinista a propósito y dos ejecuciones de la suite
     * chocarían en el mismo fichero; el borrado va en `finally`.
     */
    const slug = `frases-cortas-${randomBytes(4).toString('hex')}`;
    const corpus = await enDisco(
      corpusCon(breves(MIN_CITAS_POR_COLECCION), { slugColeccion: slug }),
    );
    const hecha = await correr(corpus, ['coleccion', slug, '--red', 'tiktok']);

    const relativa = /(piezas\/[^\s]+\.png)/.exec(hecha.salida)?.[1];
    const absoluta = relativa === undefined ? undefined : join(RAIZ, relativa);
    try {
      expect(hecha.codigo, hecha.error).toBe(0);
      expect(relativa, hecha.salida).toBeDefined();
      expect(existsSync(absoluta!)).toBe(true);

      const ignorado = await ejecutar('git', ['check-ignore', relativa!], { cwd: RAIZ });
      expect(ignorado.stdout.trim()).toBe(relativa);

      // Y aquí la afirmación **sí** es cierta, así que el parte la hace: la otra mitad de la
      // pareja, para que quitar la línea de los dos casos no pase inadvertido.
      expect(hecha.salida).toContain('No se versiona');
    } finally {
      if (absoluta !== undefined) await rm(absoluta, { force: true });
    }
  });
});

describe('Historia 13.3 — no se anuncia lo que no está publicado', () => {
  it('una Colección por debajo de su umbral se rechaza diciendo qué le falta', async () => {
    const bajoUmbral = MIN_CITAS_POR_COLECCION - 1;
    const corpus = await enDisco(corpusCon(breves(bajoUmbral)));
    const antes = await corpusEnDisco(corpus);
    const png = await destino();

    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain(`${bajoUmbral} publicadas`);
    expect(fallida.error).toContain('faltan 1');
    expect(fallida.error).toContain('no está publicada');
    expect(existsSync(png)).toBe(false);
    expect(await corpusEnDisco(corpus)).toEqual(antes);
  });

  it('una Colección retirada se rechaza: lo despublicado no se anuncia', async () => {
    const corpus = await enDisco(
      corpusCon(breves(MIN_CITAS_POR_COLECCION), { retirada: true }),
    );
    const png = await destino();

    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('retirada');
    expect(fallida.error).toContain('_colecciones-retiradas/');
    expect(existsSync(png)).toBe(false);
  });

  it('un slug con errata se rechaza nombrándolo, y no se confunde con una retirada', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const fallida = await correr(corpus, [
      'coleccion',
      'frases-cortas-con-errata',
      '--red',
      'instagram',
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('frases-cortas-con-errata');
    expect(fallida.error).toContain('no está en corpus/colecciones/');
    expect(fallida.error).not.toContain('retirada');
  });

  it('si no llegan a dos las que caben, no hay Pieza', async () => {
    /*
     * Quince miembros resueltos —así que la Colección **sí** se publica— de los que solo uno
     * admite Imagen. Una Pieza reúne al menos dos, así que no se compone ninguna, y la salida
     * enumera por qué se cayó cada una: si no, «no se puede» sería indistinguible de un fallo.
     */
    const total = MIN_CITAS_POR_COLECCION;
    const textos: Record<number, string> = { 1: textoBreve(1) };
    for (let i = 2; i <= total; i += 1) textos[i] = textoLargo(i);

    const corpus = await enDisco(corpusCon(textos));
    const png = await destino();
    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('al menos 2 Citas');
    expect(fallida.error).toContain('FR-10');
    expect(existsSync(png)).toBe(false);
  });
});

describe('Historia 13.3 — la red, el slug y las banderas', () => {
  it('sin --red es error de uso: sale con 2 y enumera las cuentas', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const fallida = await correr(corpus, ['coleccion', SLUG_COLECCION]);
    expect(fallida.codigo).toBe(2);
    for (const red of REDES) expect(fallida.error).toContain(red.id);
  });

  it('una red que no es de las cinco se rechaza enumerando las válidas', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'mastodon',
    ]);
    expect(fallida.codigo).toBe(1);
    for (const red of REDES) expect(fallida.error).toContain(red.id);
  });

  it('sin slug, o con dos, es error de uso: una Pieza anuncia una Colección', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    expect((await correr(corpus, ['coleccion', '--red', 'instagram'])).codigo).toBe(2);
    expect(
      (await correr(corpus, ['coleccion', SLUG_COLECCION, 'otra', '--red', 'instagram'])).codigo,
    ).toBe(2);
  });

  it('un slug con forma de ruta se rechaza antes de derivar ningún fichero', async () => {
    // Sin esto el PNG saldría de `piezas/`, donde ya no está ignorado por git.
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const fallida = await correr(corpus, ['coleccion', '../../fuera', '--red', 'instagram']);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('no tiene forma de slug');
  });

  it('una bandera desconocida se rechaza antes de tocar nada', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--formato',
      'vertical',
    ]);
    expect(fallida.codigo).toBe(2);
  });
});

describe('Historia 13.3 — lo declarado que no resuelve se cuenta en la salida', () => {
  it('un miembro con errata se nombra: no desaparece del parte', async () => {
    /*
     * Es la única exclusión que el curador no provocó, y la que no se ve: no la elige la
     * selección, no cuenta para el umbral y no sale en «quedan fuera». Sin esta línea, una
     * Colección que declara dieciséis miembros con uno mal escrito anuncia «3 de sus 15» y el
     * decimosexto no existe para nadie.
     */
    const total = MIN_CITAS_POR_COLECCION;
    const miembros = [
      ...Array.from({ length: total }, (_, i) => slugDe(i + 1)),
      'seneca-fragmento-con-errata',
    ];
    const corpus = await enDisco(corpusCon(breves(total), { miembros }));

    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      await destino(),
    ]);

    expect(hecha.codigo, hecha.error).toBe(0);
    expect(hecha.salida).toContain('seneca-fragmento-con-errata');
    expect(hecha.salida).toContain('corpus/_revision/');
  });
});

describe('Historia 13.3 — el nombre de la Colección, de punta a punta', () => {
  it('un nombre que se reparte en dos líneas se compone entero', async () => {
    const corpus = await enDisco(
      corpusCon(breves(MIN_CITAS_POR_COLECCION), { nombre: NOMBRE_LARGO }),
    );
    const png = await destino();
    const hecha = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);

    expect(hecha.codigo, hecha.error).toBe(0);
    const entraron = enPieza(
      Array.from({ length: cuantasEntraron(hecha.salida) }, (_, i) => i + 1),
    );
    // El PNG es el que compone el nombre **entero**: una línea perdida daría otra huella.
    expect(huella(await readFile(png))).toBe(await huellaDe(entraron, NOMBRE_LARGO));
    expect(hecha.salida).toContain(NOMBRE_LARGO);
  });

  it('una Colección cuyo fichero no cumple el esquema se rechaza con el motivo del esquema', async () => {
    /*
     * `leerColecciones` declara `nombre` opcional —existe para describir un corpus a medio
     * escribir— así que esta rama es alcanzable, y el nombre es justamente lo que la Pieza
     * anuncia. Se pregunta al esquema del build en vez de redactar aquí un rechazo propio.
     */
    const corpus = await enDisco(
      corpusCon(breves(MIN_CITAS_POR_COLECCION), {
        ficheroDeColeccion: coleccionValida({
          nombre: undefined,
          criterio: CRITERIO,
          miembros: Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i + 1)),
        }),
      }),
    );
    const png = await destino();
    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      png,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('nombre');
    expect(existsSync(png)).toBe(false);
  });
});

describe('Historia 13.3 — la guarda de --salida es de esta suborden, no de la vecina', () => {
  /*
   * `componerPiezaDeColeccion` llama a `motivosDeLaSalida` por su cuenta, y las pruebas que
   * ejercitaban esa guarda invocaban `componer`, que es **otra función**. Si la línea se
   * cayera de aquí, `--salida notas.jpg` escribiría bytes PNG con nombre de JPEG y un
   * directorio daría un `EISDIR` crudo, con toda la suite en verde.
   */
  it('una salida que no termina en .png se rechaza antes de rasterizar', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const jpg = (await destino()).replace(/\.png$/, '.jpg');
    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      jpg,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('.png');
    expect(existsSync(jpg)).toBe(false);
  });

  it('una salida que es un directorio se rechaza nombrándola', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const carpeta = dirname(await destino());
    const fallida = await correr(corpus, [
      'coleccion',
      SLUG_COLECCION,
      '--red',
      'instagram',
      '--salida',
      carpeta,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain(carpeta);
    /*
     * Y con el rechazo **redactado**, no con el `EISDIR` que sale solo. Sin esta línea la
     * prueba pasaba igual con la guarda quitada: escribir sobre un directorio también falla
     * con código 1, pero contestando con una traza de Node en una orden que promete motivos.
     */
    expect(fallida.error).toContain('indique la ruta del fichero PNG');
    expect(fallida.error).not.toContain('EISDIR');
  });
});

describe('Historia 13.3 — el nombre del fichero distingue las dos familias de Pieza', () => {
  it('conserva la Colección que anuncia, y no la resume como «y 1 más»', () => {
    expect(nombreDePiezaDeColeccion('frases-cortas')).toBe('pieza-coleccion-frases-cortas.png');

    const largo = `frases-cortas-${'a'.repeat(400)}`;
    const nombre = nombreDePiezaDeColeccion(largo);
    expect(nombre).toContain('pieza-coleccion-frases-cortas-');
    expect(nombre, 'el repuesto resume una lista que aquí no existe').not.toContain('y-1-mas');
    expect(Buffer.byteLength(nombre)).toBeLessThanOrEqual(180);
  });

  it('dos Colecciones de prefijo común y nombre largo no comparten fichero', () => {
    const base = 'frases-cortas-'.padEnd(300, 'a');
    expect(nombreDePiezaDeColeccion(`${base}1`)).not.toBe(nombreDePiezaDeColeccion(`${base}2`));
  });

  it('no puede chocar con el de una Pieza de Citas sueltas', () => {
    /*
     * `componer` une los slugs con guion doble, que ningún slug puede contener, y aquí el slug
     * va tras un guion simple. Con el nombre anterior —derivado de `['coleccion', slug]`— una
     * Pieza de las Citas «coleccion» y «frases-cortas» pisaba en silencio a la de la Colección
     * «frases-cortas», y el nombre es determinista a propósito.
     */
    expect(nombreDePiezaDeColeccion('frases-cortas')).not.toBe(
      nombreDePieza(['coleccion', 'frases-cortas']),
    );
  });
});

describe('Historia 13.3 — el parte no afirma lo que no sabe del destino', () => {
  /*
   * El parte decía siempre «no se versiona: piezas/ está en .gitignore». Con `--salida` el
   * fichero cae donde diga quien llamó —incluido, perfectamente, dentro del repositorio— y esa
   * frase pasa de informar a tranquilizar sin motivo, justo sobre lo único que AD-15 pide
   * vigilar. Ninguna prueba la miraba: era una cadena fija en el mensaje de éxito.
   */
  it('con --salida no afirma que el fichero esté ignorado', async () => {
    const corpus = await enDisco(corpusCon(breves(MIN_CITAS_POR_COLECCION)));
    const hecha = await correr(corpus, ['coleccion', SLUG_COLECCION, '--red', 'instagram', '--salida', await destino()]);

    expect(hecha.codigo, hecha.error).toBe(0);
    expect(hecha.salida).not.toContain('No se versiona');
    // Y sí dice de quién es la responsabilidad, que es la información que queda cierta.
    expect(hecha.salida).toContain('--salida');
    expect(hecha.salida).toContain('puede no cubrirlo');
  });
});
