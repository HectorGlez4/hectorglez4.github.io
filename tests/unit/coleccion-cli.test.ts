import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { AUTOR_VALIDO, RAIZ, TEMA_VALIDO, citaValida, construirConCorpus, limpiar, paginaConstruida, type CorpusDePrueba } from './ayuda/construir.js';
import { MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 12.4 — la orden de curación sobre disco, y su relación con la puerta.
 *
 * Lo puro está en `curacion.test.ts`. Aquí se mide lo que solo se ve ejecutando la orden de
 * verdad: que lea el corpus que se le indica, que un rechazo salga con **código distinto de
 * cero** —estas órdenes se encadenan en guiones y un rechazo con código 0 dejaría al guion
 * creyendo que salió bien—, y las dos mitades de «comodidad, no puerta»:
 *
 *   · lo que la orden escribe **construye**, y su Página de Colección aparece en `dist/`;
 *   · el mismo fichero editado a mano saltándose la orden **rompe el build igual**.
 *
 * Y el criterio de aceptación que atraviesa la historia entera: al terminar cualquier
 * operación, el corpus de Citas no ha cambiado ni un byte. Se comprueba comparando el
 * contenido de `citas/` y `_revision/` con el de antes de empezar. Nada de esto toca
 * `corpus/`: todo ocurre en corpus temporales.
 */

const temporales: string[] = [];
afterEach(async () => {
  await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.splice(0).map(limpiar));
});

const NOMBRE = 'Frases cortas para reflexionar';
const SLUG = 'frases-cortas-para-reflexionar';
const CRITERIO = 'Citas de una sola frase que se sostienen fuera de su obra.';

const slugDe = (i: number) => `seneca-fragmento-numero-${i}`;

function textoDe(i: number): string {
  return `Fragmento número ${i} sobre la brevedad de la vida, escrito para esta prueba.`;
}

/**
 * Un corpus de Citas publicables, en el formato que entiende `construirConCorpus`.
 *
 * Se compone una sola vez y sirve para las dos cosas: se escribe a disco para que la orden
 * opere sobre él, y se le añade lo que la orden produzca para construir el sitio. Así lo
 * que se construye es literalmente lo que la orden curó, y no una copia parecida.
 */
function corpusConCitas(cuantas: number): CorpusDePrueba {
  const corpus: CorpusDePrueba = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
  };
  for (let i = 0; i < cuantas; i += 1) {
    corpus[`citas/seneca--fragmento-${i}.md`] = citaValida({ slug: slugDe(i), texto: textoDe(i) });
  }
  return corpus;
}

/** Escribe un corpus en un directorio temporal y devuelve su raíz. */
async function enDisco(corpus: CorpusDePrueba): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-coleccion-cli-'));
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

async function correrOrden(fichero: string, argumentos: string[]) {
  try {
    const { stdout, stderr } = await ejecutar('npx', ['tsx', join(RAIZ, fichero), ...argumentos], {
      cwd: RAIZ,
    });
    return { codigo: 0, salida: stdout, error: stderr };
  } catch (e) {
    const fallo = e as { code?: number; stdout?: string; stderr?: string };
    return { codigo: fallo.code ?? 1, salida: fallo.stdout ?? '', error: fallo.stderr ?? '' };
  }
}

/** La vista de huecos sobre un corpus dado: es la otra mitad de «se lee igual». */
const correrHuecos = (corpus: string, argumentos: string[] = []) =>
  correrOrden('tools/huecos.ts', [...argumentos, '--corpus', corpus]);

async function correr(corpus: string, argumentos: string[]) {
  return correrOrden('tools/coleccion.ts', [...argumentos, '--corpus', corpus]);
}

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

const citasEnDisco = async (corpus: string) => ({
  publicadas: await instantanea(join(corpus, 'citas')),
  enRevision: await instantanea(join(corpus, '_revision')),
});

describe('Historia 12.4 — el ciclo completo de curación, por la orden', () => {
  it('crear, asignar hasta pasar el umbral, comprobar el estado y despublicar', async () => {
    const corpus = await enDisco(corpusConCitas(MIN_CITAS_POR_COLECCION));
    const citasAntes = await citasEnDisco(corpus);

    const creada = await correr(corpus, ['crear', NOMBRE, '--criterio', CRITERIO]);
    expect(creada.codigo, creada.error).toBe(0);
    expect(creada.salida).toContain(`faltan ${MIN_CITAS_POR_COLECCION}`);

    const miembros = Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i));
    const asignadas = await correr(corpus, ['asignar', SLUG, ...miembros]);
    expect(asignadas.codigo, asignadas.error).toBe(0);

    const estado = await correr(corpus, ['estado', SLUG]);
    expect(estado.codigo, estado.error).toBe(0);
    expect(estado.salida).toContain('Se publica');
    expect(estado.salida).toContain(`Miembros resueltos:  ${MIN_CITAS_POR_COLECCION}`);

    const listado = await correr(corpus, ['listar']);
    expect(listado.codigo, listado.error).toBe(0);
    expect(listado.salida).toContain(NOMBRE);

    const despublicada = await correr(corpus, ['despublicar', SLUG]);
    expect(despublicada.codigo, despublicada.error).toBe(0);
    // Despublicar es **mover**, como retirar una Cita (AD-2): el fichero sale del árbol
    // construido y sigue existiendo. Borrarlo está prohibido —git es el único almacén.
    expect(await readdir(join(corpus, 'colecciones'))).toEqual([]);
    expect(await readdir(join(corpus, '_colecciones-retiradas'))).toEqual([`${SLUG}.yml`]);

    // Y el criterio de aceptación que atraviesa la historia entera.
    expect(await citasEnDisco(corpus)).toEqual(citasAntes);
  });

  it('los rechazos salen con código distinto de cero', async () => {
    const corpus = await enDisco({
      ...corpusConCitas(2),
      '_revision/seneca--candidata.md': citaValida({
        slug: 'seneca-candidata-en-revision',
        texto: 'Candidata que todavía no ha pasado por la revisión.',
      }),
    });
    await correr(corpus, ['crear', NOMBRE, '--criterio', CRITERIO]);

    const enRevision = await correr(corpus, ['asignar', SLUG, 'seneca-candidata-en-revision']);
    expect(enRevision.codigo).not.toBe(0);
    expect(enRevision.error).toContain('no está publicada');

    const conErrata = await correr(corpus, ['asignar', SLUG, 'seneca-fragmento-numero-99']);
    expect(conErrata.codigo).not.toBe(0);
    expect(conErrata.error).toContain('seneca-fragmento-numero-99');

    const repetida = await correr(corpus, ['crear', NOMBRE, '--criterio', 'Otro criterio.']);
    expect(repetida.codigo).not.toBe(0);

    // Una orden que no se reconoce tampoco hace «lo de por omisión» saliendo con 0.
    const desconocida = await correr(corpus, ['curar']);
    expect(desconocida.codigo).not.toBe(0);
    expect(desconocida.error).toContain('Uso:');
  });

  it('el corpus de Citas no cambia ni un byte, tampoco cuando la orden rechaza', async () => {
    const corpus = await enDisco({
      ...corpusConCitas(3),
      '_revision/seneca--candidata.md': citaValida({
        slug: 'seneca-candidata-en-revision',
        texto: 'Candidata que todavía no ha pasado por la revisión.',
      }),
    });
    const antes = await citasEnDisco(corpus);

    await correr(corpus, ['crear', NOMBRE, '--criterio', CRITERIO]);
    await correr(corpus, ['asignar', SLUG, slugDe(0), slugDe(1)]);
    await correr(corpus, ['asignar', SLUG, 'seneca-candidata-en-revision']);
    await correr(corpus, ['quitar', SLUG, slugDe(0)]);
    await correr(corpus, ['estado', SLUG]);
    await correr(corpus, ['despublicar', SLUG]);

    expect(await citasEnDisco(corpus)).toEqual(antes);
  });
});

describe('Historia 12.4 — la orden no escribe donde no debe', () => {
  it('una bandera con errata se rechaza en vez de caer al corpus de verdad', async () => {
    /*
     * `raizDeCorpusDe` cae a `corpus` cuando no encuentra `--corpus`, así que un `--corpuss`
     * ignorado en silencio habría hecho que esta misma orden **sembrara una Colección en el
     * corpus real** — lo contrario exacto de lo que la historia prohíbe. Importa más aquí
     * que en las órdenes hermanas porque esta escribe contenido nuevo.
     */
    const antes = await readdir(join(RAIZ, 'corpus', 'colecciones'));

    const resultado = await correrOrden('tools/coleccion.ts', [
      'crear',
      NOMBRE,
      '--criterio',
      CRITERIO,
      '--corpuss',
      '/tmp/no-existe',
    ]);

    expect(resultado.codigo).toBe(2);
    expect(resultado.error).toContain('«--corpuss» no es una opción de esta orden');
    expect(await readdir(join(RAIZ, 'corpus', 'colecciones'))).toEqual(antes);
    /*
     * Antes esto decía `expect(antes).toEqual(['.gitkeep'])`, y valía mientras el corpus real
     * no tuviera ninguna Colección. Desde el tramo de Colecciones de la Meta las tiene, y esa
     * línea fijaba un estado transitorio del Corpus en vez de un comportamiento de la orden:
     * habría empezado a fallar por la primera Colección curada, que es exactamente lo que la
     * historia quería que ocurriese.
     *
     * Lo que sí es comportamiento, y es más fuerte que lo de antes, es que la orden rechazada
     * no haya dejado **su** fichero: el guardián de arriba dice que el directorio no cambió, y
     * este dice que lo que la orden iba a escribir no está ahí.
     */
    expect(antes).not.toContain(`${SLUG}.yml`);
  });

  it('crear con el slug de una despublicada se rechaza redactado, sin traza de Node', async () => {
    const corpus = await enDisco(corpusConCitas(1));
    await correr(corpus, ['crear', NOMBRE, '--criterio', CRITERIO]);
    await correr(corpus, ['despublicar', SLUG]);

    const repetida = await correr(corpus, ['crear', NOMBRE, '--criterio', 'Otro criterio.']);

    expect(repetida.codigo).toBe(1);
    expect(repetida.error).toContain('despublicada');
    expect(repetida.error).not.toContain('at ');
  });

  it('un fichero de Colección ilegible sale como rechazo, no como excepción', async () => {
    const corpus = await enDisco(corpusConCitas(1));
    await writeFile(join(corpus, 'colecciones', 'rota.yml'), 'nombre: "sin cerrar\n', 'utf8');

    const resultado = await correr(corpus, ['listar']);

    expect(resultado.codigo).toBe(1);
    expect(resultado.error).toContain('no es YAML válido');
    expect(resultado.error).not.toContain('at Object.');
  });
});

describe('Historia 12.4 — listar dice de cada una si se publica', () => {
  it('la que llega al umbral y la que no se distinguen, y las retiradas aparecen', async () => {
    const corpus = await enDisco(corpusConCitas(MIN_CITAS_POR_COLECCION));
    await correr(corpus, ['crear', NOMBRE, '--criterio', CRITERIO]);
    await correr(corpus, [
      'asignar',
      SLUG,
      ...Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i)),
    ]);
    await correr(corpus, ['crear', 'Aforismos', '--criterio', 'Los más breves.']);

    const listado = await correr(corpus, ['listar']);
    expect(listado.codigo, listado.error).toBe(0);
    expect(listado.salida).toContain(`se publica (umbral ${MIN_CITAS_POR_COLECCION})`);
    expect(listado.salida).toContain(`faltan ${MIN_CITAS_POR_COLECCION}`);
    // Ordenadas por slug: «aforismos» antes que «frases-…».
    expect(listado.salida.indexOf('Aforismos')).toBeLessThan(listado.salida.indexOf(NOMBRE));

    await correr(corpus, ['despublicar', SLUG]);
    const conRetiradas = await correr(corpus, ['listar']);
    expect(conRetiradas.salida).toContain('Despublicadas');
    expect(conRetiradas.salida).toContain(NOMBRE);
  });
});

describe('Historia 12.4 — la vista de huecos ve las Colecciones', () => {
  it('la que no llega al umbral sale con lo que le falta, y la que sí no sale', async () => {
    const corpus = await enDisco(corpusConCitas(MIN_CITAS_POR_COLECCION));
    await correr(corpus, ['crear', 'Aforismos', '--criterio', 'Los más breves.']);
    await correr(corpus, ['asignar', 'aforismos', slugDe(0), slugDe(1)]);

    const informe = await correrHuecos(corpus);
    expect(informe.codigo, informe.error).toBe(0);
    expect(informe.salida).toContain('Colecciones por debajo de su umbral');
    expect(informe.salida).toContain(`Aforismos`);
    expect(informe.salida).toContain(`faltan ${MIN_CITAS_POR_COLECCION - 2}`);

    // La misma línea que la orden de curación, palabra por palabra.
    const estado = await correr(corpus, ['estado', 'aforismos']);
    const linea = informe.salida
      .split('\n')
      .find((l) => l.startsWith('Aforismos'))!;
    expect(estado.salida).toContain(linea);

    await correr(corpus, [
      'asignar',
      'aforismos',
      ...Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i)),
    ]);
    const conUmbral = await correrHuecos(corpus);
    expect(conUmbral.salida).toContain('todas las Colecciones del corpus llegan a su umbral');
    expect(conUmbral.salida).not.toContain('Aforismos');
  });

  it('sin Colecciones el informe lo dice sin fingir que hay alguna', async () => {
    const corpus = await enDisco(corpusConCitas(2));
    const informe = await correrHuecos(corpus);

    expect(informe.codigo, informe.error).toBe(0);
    expect(informe.salida).toContain('todavía no hay Colecciones');
  });

  it('un fichero ilegible degrada su sección y no se lleva el resto del informe', async () => {
    /*
     * Los Temas y el equilibrio de tradición no dependen de ese fichero. Que un YAML mal
     * escrito matara el informe entero castigaría a quien consulta por un fallo que no le
     * atañe, y justo antes de una sesión de sembrado.
     */
    const corpus = await enDisco(corpusConCitas(2));
    await writeFile(join(corpus, 'colecciones', 'rota.yml'), 'nombre: "sin cerrar\n', 'utf8');

    const informe = await correrHuecos(corpus);

    expect(informe.codigo, informe.error).toBe(0);
    expect(informe.salida).toContain('rota.yml no es YAML válido');
    expect(informe.salida).toContain('Temas por debajo del umbral');
    expect(informe.salida).toContain('Equilibrio de tradición');
    expect(informe.salida).toContain('Objetivo de la sesión');
  });
});

describe('Historia 12.4 — comodidad, no puerta', () => {
  /**
   * Las dos mitades se miden sobre **el mismo fichero**: el que escribió la orden.
   *
   * Construir un fichero de Colección escrito a mano ya lo comprueba la Historia 12.2. Lo
   * que falta por demostrar aquí es que la orden y la puerta se llevan bien en las dos
   * direcciones: lo que la orden produce cruza la puerta, y lo que se le quita a ese mismo
   * fichero con un editor de texto la vuelve a cerrar. Si la orden escribiera algo que el
   * esquema no admite, la primera mitad se pondría roja; si el esquema dejara de exigir el
   * criterio, la segunda.
   */
  it('lo que la orden escribe construye, y su Página de Colección existe', async () => {
    const corpus = corpusConCitas(MIN_CITAS_POR_COLECCION);
    const directorio = await enDisco(corpus);

    await correr(directorio, ['crear', NOMBRE, '--criterio', CRITERIO]);
    await correr(directorio, [
      'asignar',
      SLUG,
      ...Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i)),
    ]);
    const curado = await readFile(join(directorio, 'colecciones', `${SLUG}.yml`), 'utf8');

    const resultado = await construirConCorpus({ ...corpus, [`colecciones/${SLUG}.yml`]: curado });
    aLimpiar.push(resultado.proyecto);

    expect(resultado.codigo, resultado.salida).toBe(0);
    expect(existsSync(paginaConstruida(resultado.proyecto, `/coleccion/${SLUG}/`))).toBe(true);
    // Ningún miembro se quedó sin resolver: la orden solo dejó entrar Citas publicadas, así
    // que el aviso de desajuste de la 12.2 no tiene nada que anunciar.
    expect(resultado.salida).not.toContain('sin resolver');
  });

  it('quitarle el criterio a mano a ese mismo fichero rompe el build igual', async () => {
    const corpus = corpusConCitas(MIN_CITAS_POR_COLECCION);
    const directorio = await enDisco(corpus);

    await correr(directorio, ['crear', NOMBRE, '--criterio', CRITERIO]);
    await correr(directorio, [
      'asignar',
      SLUG,
      ...Array.from({ length: MIN_CITAS_POR_COLECCION }, (_, i) => slugDe(i)),
    ]);
    const curado = await readFile(join(directorio, 'colecciones', `${SLUG}.yml`), 'utf8');
    const aMano = curado
      .split('\n')
      .filter((linea) => !linea.startsWith('criterio:'))
      .join('\n');
    expect(aMano).not.toBe(curado);

    const resultado = await construirConCorpus({ ...corpus, [`colecciones/${SLUG}.yml`]: aMano });
    aLimpiar.push(resultado.proyecto);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.salida).toContain(SLUG);
    expect(resultado.salida).toContain('falta el criterio de la Colección');
  });
});
