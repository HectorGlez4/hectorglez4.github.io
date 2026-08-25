import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import {
  asignarCitas,
  coleccionesParaHuecos,
  crearColeccion,
  despublicarColeccion,
  estadoDeColeccion,
  solapeDeColeccion,
  inventarioDeColecciones,
  inventarioDeRetiradas,
  publicarColeccion,
  quitarCitas,
} from '../../tools/lib/curacion.ts';
import { leerColecciones, rutasDelCorpus, type Rutas } from '../../tools/lib/corpus.ts';
import { lineaDeHueco } from '../../src/lib/formato.ts';
import { verHuecos } from '../../src/lib/huecos.ts';
import type { Cita } from '../../src/lib/publicado.ts';
import { MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';

/**
 * Historia 12.4 — la curación de una Colección, sobre la matriz de entrada y salida.
 *
 * Todo esto ocurre sobre un corpus temporal recién creado, nunca sobre `corpus/`: la
 * herramienta escribe ficheros, y una prueba que escribiera en el corpus real dejaría
 * basura versionada si se interrumpe. Es además criterio de aceptación de la historia —el
 * corpus de Citas no cambia ni un byte— y aquí se comprueba de verdad, comparando el
 * contenido de `citas/` y `_revision/` antes y después de cada operación.
 *
 * Lo que estas pruebas fijan no es que la herramienta valide: es **qué añade sobre escribir
 * el fichero a mano**. Nombre y criterio los juzga el mismo esquema que el build, y eso se
 * comprueba en `colecciones-build.test.ts`. Lo de aquí es lo que ningún esquema puede ver
 * porque no es de un fichero sino de la relación entre varios: si el slug asignado es una
 * Cita, y si esa Cita está publicada.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const NOMBRE = 'Frases cortas para reflexionar';
const SLUG = 'frases-cortas-para-reflexionar';
const CRITERIO = 'Citas de una sola frase que se sostienen fuera de su obra.';

const slugDeCita = (i: number) => `seneca-frase-numero-${i}`;
const slugEnRevision = (i: number) => `seneca-candidata-numero-${i}`;

function cita(slug: string, texto: string): string {
  return ['---', `texto: "${texto}"`, 'autor: "seneca"', `slug: "${slug}"`, 'temas:', '  - el-tiempo', '---', ''].join('\n');
}

/** Un corpus temporal con `publicadas` Citas en `citas/` y `enRevision` en `_revision/`. */
async function corpusDePrueba({ publicadas = 0, enRevision = 0 } = {}): Promise<Rutas> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-curacion-'));
  temporales.push(raiz);
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  for (const dir of [rutas.citas, rutas.autores, rutas.temas, rutas.colecciones, rutas.revision]) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(join(rutas.temas, 'el-tiempo.yml'), 'nombre: El tiempo\n', 'utf8');

  for (let i = 0; i < publicadas; i += 1) {
    await writeFile(
      join(rutas.citas, `seneca--frase-${i}.md`),
      cita(slugDeCita(i), `Frase número ${i}, escrita para esta prueba.`),
      'utf8',
    );
  }
  for (let i = 0; i < enRevision; i += 1) {
    await writeFile(
      join(rutas.revision, `seneca--candidata-${i}.md`),
      cita(slugEnRevision(i), `Candidata número ${i}, todavía sin aprobar.`),
      'utf8',
    );
  }
  return rutas;
}

/** El contenido literal de un directorio, para comparar antes y después byte a byte. */
async function instantanea(directorio: string): Promise<Record<string, string>> {
  if (!existsSync(directorio)) return {};
  const entradas = await readdir(directorio, { recursive: true, withFileTypes: true });
  const contenido: Record<string, string> = {};
  for (const entrada of entradas.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    contenido[ruta] = await readFile(ruta, 'utf8');
  }
  return contenido;
}

/** Las Citas del corpus, publicadas y en revisión, tal cual están en el disco. */
async function citasEnDisco(rutas: Rutas) {
  return {
    publicadas: await instantanea(rutas.citas),
    enRevision: await instantanea(rutas.revision),
  };
}

/** Los miembros que el fichero de la Colección declara, leídos del YAML escrito. */
async function miembrosDeclarados(
  rutas: Rutas,
  slug = SLUG,
  extension = '.yml',
): Promise<string[]> {
  const contenido = await readFile(join(rutas.colecciones, `${slug}${extension}`), 'utf8');
  return ((parsearYaml(contenido) as { miembros?: string[] }).miembros ?? []).slice();
}

async function conColeccion(opciones: { publicadas?: number; enRevision?: number } = {}) {
  const rutas = await corpusDePrueba(opciones);
  const creada = await crearColeccion(rutas, { nombre: NOMBRE, criterio: CRITERIO });
  expect(creada.ok, creada.ok ? '' : creada.motivos.join(' ')).toBe(true);
  return rutas;
}

describe('Historia 12.4 — crear una Colección', () => {
  it('escribe corpus/colecciones/{slug}.yml con el slug derivado del nombre', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await crearColeccion(rutas, { nombre: NOMBRE, criterio: CRITERIO });

    expect(resultado.ok).toBe(true);
    expect(await readdir(rutas.colecciones)).toEqual([`${SLUG}.yml`]);

    const contenido = await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8');
    expect(contenido).toContain(`nombre: ${JSON.stringify(NOMBRE)}`);
    expect(contenido).toContain(`criterio: ${JSON.stringify(CRITERIO)}`);
    // Una Colección recién creada no tiene miembros, y la convención del corpus es que un
    // campo sin valor **se omite**: ni lista vacía escrita, ni `null`. El esquema lo lee
    // como lista vacía por su `.default([])`.
    expect(contenido).not.toContain('miembros');
    expect(contenido).not.toMatch(/null|:\s*""/);
  });

  it('nace sin publicarse, y dice cuántas Citas le faltan', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await crearColeccion(rutas, { nombre: NOMBRE, criterio: CRITERIO });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain(`faltan ${MIN_CITAS_POR_COLECCION}`);
  });

  it('sin criterio se rechaza con la regla del esquema, no con una copia', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await crearColeccion(rutas, { nombre: NOMBRE });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    // La misma frase que rompe el build en `colecciones-build.test.ts`: la herramienta
    // pregunta a la puerta en vez de llevar su propio mensaje, que divergiría.
    expect(resultado.motivos.join(' ')).toContain('falta el criterio de la Colección');
    expect(await readdir(rutas.colecciones)).toEqual([]);
  });

  it('un nombre sin letras ni dígitos se rechaza: el slug es la URL', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await crearColeccion(rutas, { nombre: '¿?', criterio: CRITERIO });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('no produce ningún slug');
    expect(await readdir(rutas.colecciones)).toEqual([]);
  });

  it('crear una repetida se rechaza sin tocar la que ya está', async () => {
    const rutas = await conColeccion({ publicadas: 3 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0)]);
    const antes = await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8');

    const resultado = await crearColeccion(rutas, {
      nombre: NOMBRE,
      criterio: 'Otro criterio completamente distinto.',
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain(`«${SLUG}» ya existe`);
    // Ni el criterio nuevo ni la pérdida de la lista de miembros: el fichero está igual.
    expect(await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8')).toBe(antes);
  });
});

describe('Historia 12.4 — solo se asignan Citas publicadas', () => {
  it('una Cita publicada queda en la lista, y la Cita no se toca', async () => {
    const rutas = await conColeccion({ publicadas: 3 });
    const antes = await citasEnDisco(rutas);

    const resultado = await asignarCitas(rutas, SLUG, [slugDeCita(0), slugDeCita(1)]);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    expect(await miembrosDeclarados(rutas)).toEqual([slugDeCita(0), slugDeCita(1)]);
    expect(await citasEnDisco(rutas)).toEqual(antes);
  });

  it('una Cita en revisión se rechaza diciendo que no está publicada', async () => {
    const rutas = await conColeccion({ publicadas: 3, enRevision: 1 });
    const antes = await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8');

    const resultado = await asignarCitas(rutas, SLUG, [slugEnRevision(0)]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    const motivos = resultado.motivos.join(' ');
    expect(motivos).toContain(slugEnRevision(0));
    expect(motivos).toContain('no está publicada');
    expect(motivos).toContain('_revision');
    // Y el fichero de la Colección sigue exactamente igual: no es una vía para adelantar
    // contenido en revisión, ni siquiera a medias.
    expect(await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8')).toBe(antes);
  });

  it('un slug con errata se rechaza nombrándolo', async () => {
    const rutas = await conColeccion({ publicadas: 3 });

    const resultado = await asignarCitas(rutas, SLUG, ['seneca-frase-numero-99']);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('«seneca-frase-numero-99»');
    expect(resultado.motivos.join(' ')).toContain('no existe en el corpus');
  });

  it('asignar dos veces la misma no la duplica', async () => {
    const rutas = await conColeccion({ publicadas: 3 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0)]);

    const resultado = await asignarCitas(rutas, SLUG, [slugDeCita(0), slugDeCita(1)]);

    expect(resultado.ok).toBe(true);
    expect(await miembrosDeclarados(rutas)).toEqual([slugDeCita(0), slugDeCita(1)]);
  });

  it('un lote con un slug malo no asigna los buenos', async () => {
    const rutas = await conColeccion({ publicadas: 3, enRevision: 1 });

    const resultado = await asignarCitas(rutas, SLUG, [
      slugDeCita(0),
      slugEnRevision(0),
      slugDeCita(1),
    ]);

    expect(resultado.ok).toBe(false);
    expect(await miembrosDeclarados(rutas)).toEqual([]);
  });

  it('una Colección que no existe se rechaza nombrándola', async () => {
    const rutas = await corpusDePrueba({ publicadas: 1 });

    const resultado = await asignarCitas(rutas, 'la-que-no-esta', [slugDeCita(0)]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('«la-que-no-esta»');
  });

  it('escribe en el fichero que existe, aunque su extensión sea .yaml', async () => {
    /*
     * `.yml` y `.yaml` son **la misma** Colección para el cargador de Astro y para
     * `slugDeColeccion`. Componer el destino como `{slug}.yml` creaba un fichero nuevo junto
     * al original, dejaba los dos en el corpus, informaba de éxito, y la construcción
     * siguiente moría por la puerta de slug repetido de la 12.2.
     */
    const rutas = await corpusDePrueba({ publicadas: 2 });
    await writeFile(
      join(rutas.colecciones, 'guardada.yaml'),
      'nombre: "Guardada en yaml"\ncriterio: "Una razón."\n',
      'utf8',
    );

    const resultado = await asignarCitas(rutas, 'guardada', [slugDeCita(0)]);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    expect(await readdir(rutas.colecciones)).toEqual(['guardada.yaml']);
    expect(await miembrosDeclarados(rutas, 'guardada', '.yaml')).toEqual([slugDeCita(0)]);
  });

  it('una clave que el esquema no reconoce se rechaza, y no se pierde al reescribir', async () => {
    /*
     * `leerColecciones` descarta lo que no sabe nombrar, así que validar un objeto
     * reconstruido de tres campos nunca le enseñaba al `.strict()` el juego de claves real:
     * un `miembos:` mal tecleado —que el build **sí** rechaza— pasaba la comprobación y se
     * perdía en el volcado. Lo que se juzga es el fichero.
     */
    const rutas = await corpusDePrueba({ publicadas: 2 });
    const conErrata =
      'nombre: "Con errata"\ncriterio: "Una razón."\nmiembos:\n  - seneca-frase-numero-0\n';
    await writeFile(join(rutas.colecciones, 'con-errata.yml'), conErrata, 'utf8');

    const resultado = await asignarCitas(rutas, 'con-errata', [slugDeCita(1)]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('no reconoce «miembos»');
    expect(await readFile(join(rutas.colecciones, 'con-errata.yml'), 'utf8')).toBe(conErrata);
  });

  it('«miembros:» sin nada debajo también se rechaza con su regla, no se traga', async () => {
    const rutas = await corpusDePrueba({ publicadas: 2 });
    const conNulo = 'nombre: "Con nulo"\ncriterio: "Una razón."\nmiembros:\n';
    await writeFile(join(rutas.colecciones, 'con-nulo.yml'), conNulo, 'utf8');

    const resultado = await asignarCitas(rutas, 'con-nulo', [slugDeCita(0)]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('«miembros» es una lista de slugs');
    expect(await readFile(join(rutas.colecciones, 'con-nulo.yml'), 'utf8')).toBe(conNulo);
  });

  it('la misma Cita dos veces en la misma orden se cuenta una vez', async () => {
    const rutas = await conColeccion({ publicadas: 2 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0)]);

    const resultado = await asignarCitas(rutas, SLUG, [slugDeCita(0), slugDeCita(0)]);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    // Decía «2 ya estaban» y enumeraba una sola: el recuento y la lista salían del mismo
    // dato sin deduplicar el primero.
    expect(resultado.mensaje).toContain('1 ya estaba en la lista');
    expect(await miembrosDeclarados(rutas)).toEqual([slugDeCita(0)]);
  });

  it('una Colección a medio escribir se rechaza antes de tocarla', async () => {
    /*
     * El fichero se vuelca entero al escribirlo. Asignarle un miembro a una Colección sin
     * criterio la dejaría igual de rota y además reescrita, y quien pidió asignar querría
     * saber que su corpus no construye.
     */
    const rutas = await corpusDePrueba({ publicadas: 1 });
    const aMedias = 'nombre: "A medio escribir"\n';
    await writeFile(join(rutas.colecciones, 'a-medias.yml'), aMedias, 'utf8');

    const resultado = await asignarCitas(rutas, 'a-medias', [slugDeCita(0)]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('no cumple el esquema');
    expect(resultado.motivos.join(' ')).toContain('falta el criterio de la Colección');
    expect(await readFile(join(rutas.colecciones, 'a-medias.yml'), 'utf8')).toBe(aMedias);
  });
});

describe('Historia 12.4 — quitar miembros no toca ninguna Cita', () => {
  it('quita el miembro y deja las Citas intactas', async () => {
    const rutas = await conColeccion({ publicadas: 3 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0), slugDeCita(1)]);
    const antes = await citasEnDisco(rutas);

    const resultado = await quitarCitas(rutas, SLUG, [slugDeCita(0)]);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    expect(await miembrosDeclarados(rutas)).toEqual([slugDeCita(1)]);
    expect(await citasEnDisco(rutas)).toEqual(antes);
  });

  it('quitar lo que no es miembro se rechaza en vez de no hacer nada', async () => {
    const rutas = await conColeccion({ publicadas: 3 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0)]);

    const resultado = await quitarCitas(rutas, SLUG, [slugDeCita(2)]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('no es miembro');
    expect(await miembrosDeclarados(rutas)).toEqual([slugDeCita(0)]);
  });
});

describe('Historia 12.4 — el estado se lee como la vista de huecos', () => {
  const todos = (n: number) => Array.from({ length: n }, (_, i) => slugDeCita(i));

  it('por debajo del umbral dice cuántas faltan, con la línea de la vista de huecos', async () => {
    const rutas = await conColeccion({ publicadas: 4 });
    await asignarCitas(rutas, SLUG, todos(4));

    const resultado = await estadoDeColeccion(rutas, SLUG);
    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    if (!resultado.ok) return;

    /*
     * No se compara contra una cadena escrita a mano: se compone el informe de huecos del
     * mismo corpus y se exige que la línea sea **la misma**. Es la garantía que pide la
     * historia —que «le faltan once» se diga una sola vez— y falla en cuanto una de las dos
     * vistas cambie su redacción por su cuenta.
     */
    const colecciones = coleccionesParaHuecos(await leerColecciones(rutas), citasDe(4));
    const informe = verHuecos([], [], [], [], colecciones);
    expect(informe.colecciones).toHaveLength(1);
    expect(resultado.mensaje).toContain(lineaDeHueco(informe.colecciones[0]));
    expect(resultado.mensaje).toContain(`faltan ${MIN_CITAS_POR_COLECCION - 4}`);
  });

  it('por encima del umbral dice que se publica, y no habla de lo que falta', async () => {
    const rutas = await conColeccion({ publicadas: MIN_CITAS_POR_COLECCION + 3 });
    await asignarCitas(rutas, SLUG, todos(MIN_CITAS_POR_COLECCION + 3));

    const resultado = await estadoDeColeccion(rutas, SLUG);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain('Se publica');
    expect(resultado.mensaje).not.toMatch(/faltan/);

    // Y la vista de huecos, que solo enumera lo que falta, no la menciona.
    const colecciones = coleccionesParaHuecos(
      await leerColecciones(rutas),
      citasDe(MIN_CITAS_POR_COLECCION + 3),
    );
    expect(verHuecos([], [], [], [], colecciones).colecciones).toEqual([]);
  });

  it('el umbral se mide sobre lo resuelto, y los declarados que no resuelven se enseñan', async () => {
    const rutas = await conColeccion({ publicadas: 2 });
    await asignarCitas(rutas, SLUG, todos(2));
    // Escrito a mano, que es como llega una errata al fichero: la orden no la habría dejado
    // entrar, pero el fichero es de quien lo edita y el estado tiene que verla.
    await writeFile(
      join(rutas.colecciones, `${SLUG}.yml`),
      `nombre: ${JSON.stringify(NOMBRE)}\ncriterio: ${JSON.stringify(CRITERIO)}\n` +
        `miembros:\n  - ${slugDeCita(0)}\n  - ${slugDeCita(1)}\n  - seneca-frase-con-errata\n`,
      'utf8',
    );

    const resultado = await estadoDeColeccion(rutas, SLUG);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain('Miembros declarados: 3');
    expect(resultado.mensaje).toContain('Miembros resueltos:  2');
    expect(resultado.mensaje).toContain('seneca-frase-con-errata');
    expect(resultado.mensaje).toContain(`faltan ${MIN_CITAS_POR_COLECCION - 2}`);
  });

  it('el inventario ordena por slug y dice de cada una si se publica', async () => {
    const rutas = await conColeccion({ publicadas: MIN_CITAS_POR_COLECCION });
    await asignarCitas(rutas, SLUG, todos(MIN_CITAS_POR_COLECCION));
    await crearColeccion(rutas, { nombre: 'Aforismos', criterio: 'Los más breves.' });

    const inventario = await inventarioDeColecciones(rutas);
    expect(inventario.map((c) => c.slug)).toEqual(['aforismos', SLUG]);
    expect(inventario[0].faltan).toBe(MIN_CITAS_POR_COLECCION);
    expect(inventario[1].faltan).toBe(0);
    expect(inventario[1].publicadas).toBe(MIN_CITAS_POR_COLECCION);
  });
});

describe('Historia 12.4 — despublicar no borra ni cambia ninguna Cita', () => {
  it('mueve el fichero fuera del árbol construido y deja las Citas intactas', async () => {
    const rutas = await conColeccion({ publicadas: MIN_CITAS_POR_COLECCION, enRevision: 2 });
    await asignarCitas(
      rutas,
      SLUG,
      Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDeCita(i)),
    );
    const antes = await citasEnDisco(rutas);
    const declarado = await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8');

    const resultado = await despublicarColeccion(rutas, SLUG);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    // Deja de existir para el sitio: `corpus/colecciones/` es la base de la colección de
    // Astro y ya no está ahí.
    expect(await readdir(rutas.colecciones)).toEqual([]);
    // Y no se ha borrado: sigue entera, con su criterio y sus miembros, donde se puso.
    expect(await readdir(rutas.coleccionesRetiradas)).toEqual([`${SLUG}.yml`]);
    expect(await readFile(join(rutas.coleccionesRetiradas, `${SLUG}.yml`), 'utf8')).toBe(declarado);
    // Ni una Cita borrada, ni una movida de `citas/` a `_revision/`, ni un byte distinto.
    expect(await citasEnDisco(rutas)).toEqual(antes);
    expect(Object.keys(antes.publicadas)).toHaveLength(MIN_CITAS_POR_COLECCION);
  });

  it('volver a publicarla es mover el fichero de vuelta, y el mensaje lo dice', async () => {
    const rutas = await conColeccion({ publicadas: 1 });
    const resultado = await despublicarColeccion(rutas, SLUG);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain('corpus/colecciones/');
    expect(resultado.mensaje).toContain('No se ha borrado nada');
  });

  it('una Colección que no existe se rechaza sin mover nada', async () => {
    const rutas = await corpusDePrueba();
    const resultado = await despublicarColeccion(rutas, 'la-que-no-esta');

    expect(resultado.ok).toBe(false);
    expect(existsSync(rutas.coleccionesRetiradas)).toBe(false);
  });

  it('crear con el slug de una retirada se rechaza, y la retirada sigue intacta', async () => {
    /*
     * Sin esta comprobación se creaba la segunda y entonces **no se podía despublicar**:
     * `mover` se niega a pisar el destino —y hace bien— pero lanzaba, así que salía una
     * traza de Node en lugar del rechazo redactado que la orden promete.
     */
    const rutas = await conColeccion({ publicadas: 1 });
    await despublicarColeccion(rutas, SLUG);
    const retirada = await readFile(join(rutas.coleccionesRetiradas, `${SLUG}.yml`), 'utf8');

    const resultado = await crearColeccion(rutas, { nombre: NOMBRE, criterio: 'Otro criterio.' });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('despublicada');
    expect(await readdir(rutas.colecciones)).toEqual([]);
    expect(await readFile(join(rutas.coleccionesRetiradas, `${SLUG}.yml`), 'utf8')).toBe(retirada);
  });

  it('un choque al mover sale como rechazo redactado, nunca como excepción', async () => {
    // El camino que quedaba abierto: dos ficheros con el mismo slug, uno en cada sitio.
    const rutas = await conColeccion({ publicadas: 1 });
    await despublicarColeccion(rutas, SLUG);
    await writeFile(
      join(rutas.colecciones, `${SLUG}.yml`),
      `nombre: ${JSON.stringify(NOMBRE)}\ncriterio: ${JSON.stringify(CRITERIO)}\n`,
      'utf8',
    );

    const resultado = await despublicarColeccion(rutas, SLUG);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain('No se mueve');
  });
});

describe('Historia 12.4 — publicar, el espejo de despublicar', () => {
  it('devuelve el fichero a corpus/colecciones/ con todo lo suyo', async () => {
    const rutas = await conColeccion({ publicadas: 3 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0), slugDeCita(1)]);
    const declarado = await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8');
    await despublicarColeccion(rutas, SLUG);

    const resultado = await publicarColeccion(rutas, SLUG);

    expect(resultado.ok, resultado.ok ? '' : resultado.motivos.join(' ')).toBe(true);
    expect(await readdir(rutas.colecciones)).toEqual([`${SLUG}.yml`]);
    expect(await readdir(rutas.coleccionesRetiradas)).toEqual([]);
    expect(await readFile(join(rutas.colecciones, `${SLUG}.yml`), 'utf8')).toBe(declarado);
  });

  it('poner el fichero de vuelta no es publicarla: lo dice quien lo hace', async () => {
    // Quien publica sigue siendo el umbral sobre el recuento resuelto. Una Colección que
    // volvió con dos miembros vuelve sin publicarse, y decir «publicada» ahí sería mentir.
    const rutas = await conColeccion({ publicadas: 3 });
    await asignarCitas(rutas, SLUG, [slugDeCita(0)]);
    await despublicarColeccion(rutas, SLUG);

    const resultado = await publicarColeccion(rutas, SLUG);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toContain(`faltan ${MIN_CITAS_POR_COLECCION - 1}`);
  });

  it('lo que no está retirado se rechaza nombrándolo', async () => {
    const rutas = await conColeccion({ publicadas: 1 });
    const resultado = await publicarColeccion(rutas, SLUG);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivos.join(' ')).toContain(`«${SLUG}»`);
  });

  it('el inventario de retiradas las enseña, que es a donde remiten los rechazos', async () => {
    const rutas = await conColeccion({ publicadas: 1 });
    await despublicarColeccion(rutas, SLUG);

    expect((await inventarioDeColecciones(rutas)).map((c) => c.slug)).toEqual([]);
    expect((await inventarioDeRetiradas(rutas)).map((c) => c.slug)).toEqual([SLUG]);
  });
});

/** Las `n` Citas publicadas del corpus de prueba, como las ve la resolución. */
function citasDe(n: number): Cita[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: slugDeCita(i),
    texto: `Frase número ${i}, escrita para esta prueba.`,
    autor: 'seneca',
    temas: ['el-tiempo'],
    procedencia: {},
    aptaParaPortada: false,
  }));
}

/**
 * Historia 15.2 — cuánto de una Colección ya se ve en otra parte.
 *
 * La regla salió del trabajo y tardó dieciséis Colecciones en formularse: **una Colección tiene
 * que traer una lista que no se pueda ver ya en otra parte**. Si sus miembros son los mismos que
 * los de un Tema o los de una Página de Autor, la página no añade superficie: la repite, que es
 * la forma cara de la «vía barata de multiplicar páginas indexables» que `umbrales.ts` nombra.
 *
 * Descartó «la fortuna» —14 de 26 candidatas salían del Tema «la adversidad»— y destapó que «El
 * uniforme y la sotana» reunía las 16 Citas de un Autor que tiene 16. Pero vivía en la bitácora,
 * y una regla que solo vive en prosa no protege a nadie: la primera vez que hizo falta llevaba
 * dieciséis Colecciones sin aplicarse.
 *
 * Así que se mide y se informa, **sin umbral y sin bloquear**. El sistema no tiene criterio para
 * decidir cuánto solape es demasiado —a veces reunir lo que un Tema dispersa es justo el trabajo
 * editorial— pero sí puede poner el número delante. Es la misma línea que la Historia 1.6 con los
 * duplicados: se señala, decide quien cura.
 */
describe('Historia 15.2 — el solape de una Colección con lo ya visible', () => {
  it('mide cuántos miembros comparte con el Tema que más repite', () => {
    // Tres Autores distintos bajo un mismo Tema: así el Tema manda sin empatar con nadie.
    const citas = [
      { slug: 'a', autor: 'seneca', temas: ['el-tiempo'] },
      { slug: 'b', autor: 'machado', temas: ['el-tiempo'] },
      { slug: 'c', autor: 'marti', temas: ['el-tiempo'] },
      { slug: 'd', autor: 'gracian', temas: ['la-vida'] },
    ];

    const solape = solapeDeColeccion(['a', 'b', 'c', 'd'], citas);

    expect(solape.mayor?.clase).toBe('tema');
    expect(solape.mayor?.slug).toBe('el-tiempo');
    expect(solape.mayor?.miembros).toBe(3);
    expect(solape.mayor?.porcentaje).toBe(75);
  });

  it('en empate gana el Autor, porque su Página siempre las enseña todas', () => {
    /*
     * Tres del mismo Autor y del mismo Tema: los dos solapan en tres. Gana el Autor a propósito,
     * y no por el orden en que se leyó nada: la Página de Autor **siempre existe** y enseña
     * **todas** sus Citas, mientras que un Tema es una lista ya curada que puede no incluirlas.
     * De las dos duplicaciones posibles, la del Autor es la segura.
     */
    const citas = [
      { slug: 'a', autor: 'seneca', temas: ['el-tiempo'] },
      { slug: 'b', autor: 'seneca', temas: ['el-tiempo'] },
      { slug: 'c', autor: 'seneca', temas: ['el-tiempo'] },
    ];

    expect(solapeDeColeccion(['a', 'b', 'c'], citas).mayor?.clase).toBe('autor');
  });

  it('y también con la Página de Autor, que fue el caso que destapó la regla', () => {
    // Dieciséis Citas de un Autor que tiene dieciséis: la Colección repetía su Página.
    const citas = Array.from({ length: 16 }, (_, i) => ({
      slug: `g-${i}`,
      autor: 'gonzalez-prada',
      temas: ['la-libertad'],
    }));

    const solape = solapeDeColeccion(
      citas.map((c) => c.slug),
      citas,
    );

    expect(solape.mayor?.clase).toBe('autor');
    expect(solape.mayor?.porcentaje).toBe(100);
  });

  it('gana el mayor de los dos: un Autor que repite más que cualquier Tema', () => {
    const citas = [
      { slug: 'a', autor: 'seneca', temas: ['el-tiempo'] },
      { slug: 'b', autor: 'seneca', temas: ['la-vida'] },
      { slug: 'c', autor: 'seneca', temas: ['la-virtud'] },
    ];

    expect(solapeDeColeccion(['a', 'b', 'c'], citas).mayor?.clase).toBe('autor');
  });

  it('una Colección repartida no declara solape mayor que el de su parte más gruesa', () => {
    const citas = [
      { slug: 'a', autor: 'seneca', temas: ['el-tiempo'] },
      { slug: 'b', autor: 'machado', temas: ['la-vida'] },
      { slug: 'c', autor: 'marti', temas: ['la-libertad'] },
      { slug: 'd', autor: 'gracian', temas: ['la-virtud'] },
    ];

    expect(solapeDeColeccion(['a', 'b', 'c', 'd'], citas).mayor?.porcentaje).toBe(25);
  });

  it('sin miembros no hay solape que medir, y no revienta', () => {
    expect(solapeDeColeccion([], []).mayor).toBeUndefined();
  });
});

describe('Historia 15.2 — duplicar es que las dos listas sean la misma', () => {
  /*
   * La primera versión de esta medida solo miraba «qué parte de la Colección se ve en la
   * superficie», y con eso «Refranes de Sancho» —veinte Citas de un Autor con sesenta y siete—
   * salía al 100 % y parecía un duplicado. No lo es: enseña veinte de sesenta y siete, y esas
   * veinte juntas no se ven en ninguna otra parte. Lo que hay que mirar son las **dos**
   * direcciones, y la que manda es la más floja de las dos.
   */
  const deUnAutor = (cuantas: number, desde = 0) =>
    Array.from({ length: cuantas }, (_, i) => ({
      slug: `c-${desde + i}`,
      autor: 'cervantes',
      temas: ['la-vida'],
    }));

  it('una Colección que es un recorte de un Autor grande no se declara duplicada', () => {
    const citas = deUnAutor(67);
    const veinte = citas.slice(0, 20).map((c) => c.slug);

    const solape = solapeDeColeccion(veinte, citas);

    expect(solape.mayor?.porcentaje).toBe(100);
    expect(solape.mayor?.tamañoDeLaSuperficie).toBe(67);
    // La otra dirección es la que desmiente la alarma: cubre menos de un tercio de su Autor.
    expect(solape.mayor?.porcentajeDeLaSuperficie).toBeLessThan(35);
  });

  it('una Colección que agota a su Autor sí lo declara en las dos direcciones', () => {
    const citas = deUnAutor(16);

    const solape = solapeDeColeccion(
      citas.map((c) => c.slug),
      citas,
    );

    expect(solape.mayor?.porcentaje).toBe(100);
    expect(solape.mayor?.porcentajeDeLaSuperficie).toBe(100);
  });

  it('gana la superficie que más duplica, no la que más miembros comparte', () => {
    /*
     * Ocho miembros: siete de un Autor con cuarenta Citas, y los ocho bajo un Tema que solo
     * tiene ocho. El Autor comparte más miembros (7) pero el Tema es el que repite la lista
     * entera, y es el que hay que enseñar.
     */
    const citas = [
      ...Array.from({ length: 40 }, (_, i) => ({
        slug: `a-${i}`,
        autor: 'seneca',
        temas: i < 7 ? ['el-espejo'] : ['otro'],
      })),
      { slug: 'z', autor: 'machado', temas: ['el-espejo'] },
    ];
    const miembros = [...Array.from({ length: 7 }, (_, i) => `a-${i}`), 'z'];

    const solape = solapeDeColeccion(miembros, citas);

    expect(solape.mayor?.clase).toBe('tema');
    expect(solape.mayor?.slug).toBe('el-espejo');
    expect(solape.mayor?.porcentajeDeLaSuperficie).toBe(100);
  });
});
