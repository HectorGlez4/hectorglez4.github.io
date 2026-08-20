import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida, type CorpusDePrueba } from './ayuda/construir.js';
import { SITIO } from '../../src/lib/dominio.ts';
import { LADO, svgDePieza, type CitaEnPieza } from '../../src/lib/pieza.ts';
import { nombreDePieza } from '../../tools/lib/piezas.ts';
import { REDES } from '../../src/lib/redes.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 13.2 — la matriz entera de la orden que compone una Pieza, sobre disco.
 *
 * Lo puro está en `pieza.test.ts`. Aquí se mide lo que solo se ve ejecutando la orden de
 * verdad: que lea el corpus que se le indica, que cada rechazo salga con **el código que le
 * toca** —2 para lo que la orden no supo leer, 1 para lo que entendió y rechazó—, que el PNG
 * salga con las cabeceras que dice, que el texto para publicar lleve **un** enlace marcado,
 * y el criterio que atraviesa la historia: al terminar cualquier operación, el corpus no ha
 * cambiado ni un byte. Nada de esto toca `corpus/`: todo ocurre en corpus temporales.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const slugDe = (i: number, sufijo = '') => `seneca-fragmento-numero-${i}${sufijo}`;

/** La procedencia que trae `citaValida`, ya compuesta como la escribe `atribucion.ts`. */
const PROCEDENCIA = 'Sobre la brevedad de la vida, 49';

/** Una Cita corta, de las que caben de sobra apiladas. */
function textoBreve(i: number): string {
  return `Fragmento número ${i} sobre la brevedad de la vida.`;
}

/** Una Cita justo por debajo del corte de FR-10: válida, pero voluminosa. */
function textoAlBorde(i: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido. ';
  const relleno = base.repeat(3).slice(0, MAX_CARACTERES_IMAGEN - 8).trim();
  return `${i}. ${relleno}`;
}

function corpusCon(
  textos: Record<number, string>,
  extras: CorpusDePrueba = {},
  sufijo = '',
): CorpusDePrueba {
  const corpus: CorpusDePrueba = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
  };
  for (const [i, texto] of Object.entries(textos)) {
    corpus[`citas/seneca--fragmento-${i}.md`] = citaValida({
      slug: slugDe(Number(i), sufijo),
      texto,
    });
  }
  return { ...corpus, ...extras };
}

/**
 * La huella del PNG que sale de componer estas Citas, para comparar con la del que compuso
 * la orden. Se comparan huellas y no los búferes porque el diff de dos PNG de noventa kilos
 * tarda minutos en renderizarse cuando la prueba falla, que es justo cuando hay prisa.
 */
async function huellaDe(citas: CitaEnPieza[]): Promise<string> {
  return huella(await sharp(Buffer.from(svgDePieza(citas))).png().toBuffer());
}

const huella = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Escribe un corpus en un directorio temporal y devuelve su raíz. */
async function enDisco(corpus: CorpusDePrueba): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-pieza-cli-'));
  temporales.push(raiz);
  const directorio = join(raiz, 'corpus');
  for (const dir of ['citas', 'autores', 'temas', 'colecciones', '_revision']) {
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
  enRevision: await instantanea(join(corpus, '_revision')),
  autores: await instantanea(join(corpus, 'autores')),
});

/** Un destino temporal para el PNG, fuera del repositorio. */
async function destino(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-pieza-salida-'));
  temporales.push(raiz);
  return join(raiz, 'pieza.png');
}

describe('Historia 13.2 — componer una Pieza de varias Citas', () => {
  it('compone el PNG, dice el texto para publicar y no toca el corpus', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const antes = await corpusEnDisco(corpus);
    const png = await destino();

    const hecha = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      '--salida',
      png,
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    const bytes = await readFile(png);
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBe(LADO);
    expect(bytes.readUInt32BE(20)).toBe(LADO);
    expect(bytes.length).toBeGreaterThan(5000);

    // El texto para publicar lleva las dos Citas con su atribución, la misma que se lleva
    // el visitante al copiar: comillas angulares, raya, Autor y procedencia.
    expect(hecha.salida).toContain(`«${textoBreve(1)}» — Séneca, Sobre la brevedad de la vida, 49.`);
    expect(hecha.salida).toContain(`«${textoBreve(2)}» — Séneca, Sobre la brevedad de la vida, 49.`);

    expect(await corpusEnDisco(corpus)).toEqual(antes);
  });

  it('el PNG lleva el nombre del Autor y su procedencia, no el slug ni un hueco', async () => {
    /*
     * La aserción que faltaba, y es el criterio central de la épica. Comprobar firma, ancho,
     * alto y peso deja pasar la Pieza que compone «SENECA» —el slug en versalitas— y sin obra
     * ni año: sale un PNG perfectamente válido con la atribución equivocada. Se compara el
     * fichero que compuso la orden contra el que compone `svgDePieza` desde los datos que el
     * corpus declara, y se comprueba que **no** coincide con las dos formas de equivocarse.
     */
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const png = await destino();
    const hecha = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      '--salida',
      png,
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    const bien = [1, 2].map((i) => ({
      texto: textoBreve(i),
      autor: 'Séneca',
      procedencia: PROCEDENCIA,
    }));
    const compuesta = huella(await readFile(png));
    expect(compuesta, 'la Pieza no es la que componen estos datos').toBe(await huellaDe(bien));

    const conElSlug = bien.map((c) => ({ ...c, autor: 'seneca' }));
    expect(compuesta, 'la Pieza lleva el slug del Autor').not.toBe(await huellaDe(conElSlug));

    const sinProcedencia = bien.map((c) => ({ ...c, procedencia: undefined }));
    expect(compuesta, 'la Pieza va sin procedencia').not.toBe(await huellaDe(sinProcedencia));
  });

  it('una Cita sin la clave «procedencia» se compone en vez de reventar', async () => {
    /*
     * `leerCitas` devuelve el frontmatter **sin validar**, así que la clave puede faltar. La
     * guarda de la imagen y la del texto para publicar tienen que ser la misma: con una sola,
     * la orden moría con un `TypeError` crudo justo donde promete rechazos redactados.
     */
    const corpus = await enDisco(
      corpusCon({ 1: textoBreve(1) }, {
        'citas/seneca--sin-procedencia.md': citaValida({
          slug: 'seneca-sin-procedencia',
          texto: textoBreve(2),
          procedencia: undefined,
        }),
      }),
    );
    const png = await destino();
    const hecha = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      'seneca-sin-procedencia',
      '--salida',
      png,
    ]);

    expect(hecha.codigo, hecha.error).toBe(0);
    expect(hecha.error).not.toContain('TypeError');
    // Lo que no consta no se escribe: la atribución termina en el Autor (FR-2).
    expect(hecha.salida).toContain(`«${textoBreve(2)}» — Séneca.`);
  });

  it('el enlace de destino es uno solo y va marcado con la red', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const png = await destino();

    const hecha = await correr(corpus, [
      'componer',
      '--red',
      'threads',
      slugDe(1),
      slugDe(2),
      '--salida',
      png,
    ]);
    expect(hecha.codigo, hecha.error).toBe(0);

    /*
     * Uno solo, y ese es el contenido de la regla: una Pieza de varias Citas no puede
     * enlazar a una de ellas sin favorecerla, así que enlaza a la portada, que es la única
     * superficie que las contiene a todas. Dos enlaces serían dos destinos.
     */
    const marcados = [...hecha.salida.matchAll(/\?de=([a-z]+)/g)].map((m) => m[1]);
    expect(marcados).toEqual(['threads']);
    expect(hecha.salida).toContain(`${SITIO}/?de=threads`);
    // Y ningún enlace a una Cita concreta: el destino es la portada.
    expect(hecha.salida).not.toContain('/cita/');
  });

  it('repetir la misma orden da el mismo PNG byte a byte, y lo sobrescribe', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const png = await destino();
    const orden = ['componer', '--red', 'x', slugDe(1), slugDe(2), '--salida', png];

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
     * comprobar que `.gitignore` cubre **esta** ruta. Los slugs llevan sufijo aleatorio para
     * que el nombre derivado sea único —es determinista a propósito, así que dos ejecuciones
     * de la suite chocarían en el mismo fichero— y el borrado va en `finally`, para que una
     * aserción fallida no deje el PNG en el árbol de trabajo.
     */
    const sufijo = `-${randomBytes(4).toString('hex')}`;
    const corpus = await enDisco(
      corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }, {}, sufijo),
    );
    const hecha = await correr(corpus, [
      'componer',
      '--red',
      'facebook',
      slugDe(1, sufijo),
      slugDe(2, sufijo),
    ]);

    const relativa = /(piezas\/[^\s]+\.png)/.exec(hecha.salida)?.[1];
    const absoluta = relativa === undefined ? undefined : join(RAIZ, relativa);
    try {
      expect(hecha.codigo, hecha.error).toBe(0);
      expect(relativa, hecha.salida).toBeDefined();
      expect(existsSync(absoluta!)).toBe(true);

      /*
       * Y lo que hace cierto el criterio: git lo ignora. Comprobarlo con `git check-ignore` y
       * no leyendo `.gitignore` es lo único que prueba que la regla escrita **cubre esta
       * ruta**; una entrada mal puesta se lee igual de bien y no ignora nada.
       */
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

describe('Historia 13.2 — la orden rechaza en vez de descartar en silencio', () => {
  it('una Cita que pasa del corte de FR-10 se rechaza nombrando el slug y la regla', async () => {
    const larga = `${'a '.repeat(MAX_CARACTERES_IMAGEN).trim()}`;
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: larga }));
    const antes = await corpusEnDisco(corpus);

    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      '--salida',
      await destino(),
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain(slugDe(2));
    expect(fallida.error).toContain('FR-10');
    expect(fallida.error).toContain(String(MAX_CARACTERES_IMAGEN));
    expect(await corpusEnDisco(corpus)).toEqual(antes);
  });

  it('un apilado que no cabe se rechaza diciendo cuántas caben, y no compone nada', async () => {
    const textos = Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [i, textoAlBorde(i)]));
    const corpus = await enDisco(corpusCon(textos));
    const png = await destino();

    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      ...[1, 2, 3, 4, 5, 6].map((i) => slugDe(i)),
      '--salida',
      png,
    ]);

    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toMatch(/caben \d+/);
    // Ausencia antes que mutilación: no hay pieza a medio componer que publicar igual.
    expect(existsSync(png)).toBe(false);
  });

  it('una sola Cita no es una Pieza: para eso está la Imagen de Cita', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1) }));
    const fallida = await correr(corpus, ['componer', '--red', 'instagram', slugDe(1)]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('Imagen de Cita');
  });

  it('un slug inexistente se rechaza nombrándolo', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      'seneca-esta-no-existe',
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('seneca-esta-no-existe');
    expect(fallida.error).toContain('no existe en el corpus');
  });

  it('una Cita en revisión se rechaza diciendo dónde está', async () => {
    const corpus = await enDisco(
      corpusCon(
        { 1: textoBreve(1), 2: textoBreve(2) },
        {
          '_revision/seneca--en-revision.md': citaValida({
            slug: 'seneca-en-revision',
            texto: textoBreve(9),
          }),
        },
      ),
    );
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      'seneca-en-revision',
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('seneca-en-revision');
    expect(fallida.error).toContain('corpus/_revision/');
  });

  it('un Autor que no está en el corpus se rechaza: la Pieza no se compone sin atribución', async () => {
    /*
     * La única rama que protege el criterio central de la épica —«ninguna Cita aparece sin
     * Autor»—, y sin esta prueba no la ejercitaba nadie: todos los corpus de aquí traen su
     * `autores/seneca.yml`.
     */
    const corpus = await enDisco(
      corpusCon({ 1: textoBreve(1) }, {
        'citas/seneca--huerfana.md': citaValida({
          slug: 'seneca-huerfana',
          texto: textoBreve(3),
          autor: 'autor-que-no-existe',
        }),
      }),
    );
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      'seneca-huerfana',
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('autor-que-no-existe');
    expect(fallida.error).toContain('sin atribución');
  });

  it('un Autor sin nombre en su ficha se rechaza por la misma razón', async () => {
    const corpus = await enDisco(
      corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }, {
        'autores/seneca.yml': 'nombre: ""\nañoFallecimiento: 65\nsemblanza: Filósofo estoico.\n',
      }),
    );
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('no tiene nombre');
  });

  it('texto más ancho que el lienzo se rechaza nombrando la Cita: saldría cortado', async () => {
    /*
     * El alto se apila y se comprueba; el ancho no fallaba: `repartirEnLineas` no parte
     * palabras, así que una indivisible se sale por el lado y el PNG sale **bien** con la
     * palabra cortada. Mutilación silenciosa, que es lo que la historia entera evita.
     */
    const corpus = await enDisco(
      corpusCon({ 1: textoBreve(1), 2: `Nada ${'a'.repeat(120)}` }),
    );
    const png = await destino();
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      '--salida',
      png,
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain(slugDe(2));
    expect(fallida.error).toContain('más ancho que el lienzo');
    expect(existsSync(png)).toBe(false);
  });

  it('un slug con forma de ruta se rechaza antes de derivar ningún fichero', async () => {
    // Sin esto el PNG saldría de `piezas/`, donde ya no está ignorado por git.
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      '../../fuera',
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('no tiene forma de slug');
  });

  it('un slug repetido se rechaza: una Cita no se anuncia dos veces en la misma Pieza', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      slugDe(1),
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain(slugDe(1));
    expect(fallida.error).toContain('dos veces');
  });
});

describe('Historia 13.2 — la red, y las banderas que la orden no conoce', () => {
  it('sin --red es error de uso: sale con 2 y enumera las cuentas', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, ['componer', slugDe(1), slugDe(2)]);
    expect(fallida.codigo).toBe(2);
    for (const red of REDES) expect(fallida.error).toContain(red.id);
  });

  it('una red que no es de las cinco se rechaza enumerando las válidas', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'mastodon',
      slugDe(1),
      slugDe(2),
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('mastodon');
    for (const red of REDES) expect(fallida.error).toContain(red.id);
  });

  it('una bandera desconocida se rechaza antes de tocar nada', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const antes = await corpusEnDisco(corpus);

    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      '--formato',
      'vertical',
      slugDe(1),
      slugDe(2),
    ]);

    expect(fallida.codigo).toBe(2);
    expect(fallida.error).toContain('--formato');
    expect(await corpusEnDisco(corpus)).toEqual(antes);
  });

  it('--corpus sin valor no cae al corpus real', async () => {
    /*
     * El guardián heredado de `cli.ts`: una opción con valor a la que no le sigue ninguno
     * dejaría a `raizDeCorpusDe` cayendo a `corpus/`, y la orden compondría una Pieza con
     * las Citas de verdad creyendo obedecer.
     */
    const fallida = await correrCrudo(['componer', '--red', 'instagram', slugDe(1), '--corpus']);
    expect(fallida.codigo).toBe(2);
    expect(fallida.error).toContain('--corpus');
  });

  it('una orden que no existe sale con el uso y código 2', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, ['rasterizar', '--red', 'instagram', slugDe(1)]);
    expect(fallida.codigo).toBe(2);
    expect(fallida.error).toContain('Uso:');
  });
});

describe('Historia 13.2 — la ruta de salida se valida antes de rasterizar nada', () => {
  it('una extensión que no es .png se rechaza', async () => {
    // Escribir bytes PNG con nombre de JPEG engaña a quien lo abra después, y en un módulo
    // cuyo lema es «nada se escribe hasta que todo valida» no puede pasar sin decir nada.
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      '--salida',
      join(tmpdir(), 'notas.jpg'),
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('.png');
  });

  it('un directorio se rechaza en vez de salir como EISDIR después de componer', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const carpeta = await mkdtemp(join(tmpdir(), 'sabiduria-pieza-dir-'));
    temporales.push(carpeta);

    const fallida = await correr(corpus, [
      'componer',
      '--red',
      'instagram',
      slugDe(1),
      slugDe(2),
      '--salida',
      carpeta,
    ]);
    expect(fallida.codigo).toBe(1);
    expect(fallida.error).toContain('directorio');
  });
});

describe('Historia 13.2 — el nombre derivado del fichero', () => {
  /*
   * Con el corpus real la rama del repuesto **no es el caso raro**: los slugs pasan de los
   * cincuenta caracteres y tres Citas ya se salen del tope. Se prueba directamente porque
   * por la orden no se distingue: las dos ramas producen un PNG y ninguna aserción de arriba
   * mira el nombre.
   */
  const TOPE = 180;
  const largo = (n: number) => `seneca-${'palabra-'.repeat(8)}${n}`;

  it('con pocos slugs, el nombre los lleva enteros y separados', () => {
    expect(nombreDePieza(['seneca-uno', 'seneca-dos'])).toBe('pieza-seneca-uno--seneca-dos.png');
  });

  it('una selección larga cabe en el tope, medido en bytes', () => {
    const nombre = nombreDePieza([largo(1), largo(2), largo(3), largo(4)]);
    expect(Buffer.byteLength(nombre)).toBeLessThanOrEqual(TOPE);
    expect(nombre.endsWith('.png')).toBe(true);
  });

  it('un solo slug desmedido tampoco se pasa del tope', () => {
    // El repuesto no volvía a medirse, así que esquivaba el límite solo cuando el primer
    // slug era corto — justo el caso que no hacía falta esquivar.
    const nombre = nombreDePieza(['seneca-' + 'a'.repeat(400), 'seneca-dos']);
    expect(Buffer.byteLength(nombre)).toBeLessThanOrEqual(TOPE);
  });

  it('mide en bytes y no en caracteres: los acentos ocupan dos', () => {
    const conAcentos = `seneca-${'ñá-'.repeat(60)}fin`;
    expect(conAcentos.length).toBeLessThan(Buffer.byteLength(conAcentos));
    expect(Buffer.byteLength(nombreDePieza([conAcentos, 'seneca-dos']))).toBeLessThanOrEqual(TOPE);
  });

  it('dos selecciones largas que empiezan igual no comparten fichero', () => {
    const a = nombreDePieza([largo(1), largo(2), largo(3), largo(4)]);
    const b = nombreDePieza([largo(1), largo(2), largo(3), largo(5)]);
    expect(a).not.toBe(b);
  });

  it('es determinista: la misma selección da siempre el mismo nombre', () => {
    const seleccion = [largo(1), largo(2), largo(3), largo(4)];
    expect(nombreDePieza(seleccion)).toBe(nombreDePieza([...seleccion]));
  });
});

describe('Historia 13.2 — el parte no afirma lo que no sabe del destino', () => {
  /*
   * El parte decía siempre «no se versiona: piezas/ está en .gitignore». Con `--salida` el
   * fichero cae donde diga quien llamó —incluido, perfectamente, dentro del repositorio— y esa
   * frase pasa de informar a tranquilizar sin motivo, justo sobre lo único que AD-15 pide
   * vigilar. Ninguna prueba la miraba: era una cadena fija en el mensaje de éxito.
   */
  it('con --salida no afirma que el fichero esté ignorado', async () => {
    const corpus = await enDisco(corpusCon({ 1: textoBreve(1), 2: textoBreve(2) }));
    const hecha = await correr(corpus, ['componer', '--red', 'instagram', slugDe(1), slugDe(2), '--salida', await destino()]);

    expect(hecha.codigo, hecha.error).toBe(0);
    expect(hecha.salida).not.toContain('No se versiona');
    // Y sí dice de quién es la responsabilidad, que es la información que queda cierta.
    expect(hecha.salida).toContain('--salida');
    expect(hecha.salida).toContain('puede no cubrirlo');
  });
});
