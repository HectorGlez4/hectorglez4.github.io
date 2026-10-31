/**
 * Cuándo cambió de verdad cada fichero del Corpus — Historia 18.4.
 *
 * Es la capa que toca el disco y los procesos: lee `corpus/`, le pregunta a git y le pasa
 * las dos cosas a `tools/lib/cambios.ts`, que es puro y donde vive la decisión. El reparto
 * es el mismo que el del cotejo —`integraciones/cotejo.ts` lee y `tools/lib/cotejo.ts`
 * juzga— y el mismo que el de la forma de las Colecciones.
 *
 * ── Por qué vive aquí y no en `tools/lib/` ───────────────────────────────────────────
 *
 * Estuvo en `tools/lib/historial.ts` y era el **único** fichero de ese directorio que
 * lanzaba un proceso, mientras su propia cabecera decía seguir el reparto de arriba. No
 * era una violación de AD-22 —que habla de la red—, pero sí una desviación del patrón que
 * decía seguir, y esa desviación tenía consecuencia: allí no había forma de saber cuál es
 * la raíz del proyecto, así que se suponía `process.cwd()`. Aquí no hace falta suponerlo,
 * porque Astro la entrega en el gancho `astro:config:setup`, que es exactamente lo que ya
 * hacen `integraciones/cotejo.ts` y `integraciones/colecciones.ts`.
 *
 * ── Preguntar a git no es salir a la red ─────────────────────────────────────────────
 *
 * AD-22 prohíbe que la construcción pida nada por la red, y esto corre **dentro** del
 * build, así que la distinción no es retórica. Git es historia versionada en el disco, no
 * un servicio: `npm run build` sigue funcionando sin internet. Es el mismo razonamiento
 * que ya dejó escrito `tools/avisar.ts`, y la misma técnica —`execFile` promisificado, sin
 * dependencia nueva—.
 *
 * ── Dos invocaciones, y no una por fichero ───────────────────────────────────────────
 *
 * `git log -1` por fichero serían miles de procesos en el camino crítico del build. Desde la
 * Historia 24.8 la fecha no es la del último cambio del fichero sino la del último cambio **de
 * los campos que cada superficie pinta**, así que hace falta saber qué cambió en cada commit:
 * un solo `git log --raw` da, por commit y fichero, el blob de antes y el de después, y un solo
 * `git cat-file --batch` trae el contenido de los blobs que hay que analizar —los de
 * `corpus/fuentes/` no: un documento solo cuenta como «cambió»—. Medido el 2026-10-27 en la
 * rama: unas 6.800 transiciones y 6.200 blobs distintos, 0,26 s el `git log --raw`.
 *
 * Lo que sí es O(Corpus) y conviene tener escrito: `corpusParaFechar` **vuelve a leer y a
 * analizar el Corpus entero** —mil seiscientas y pico Citas, con su frontmatter— encima de
 * lo que ya leen las colecciones de contenido de Astro para construir las páginas. Son dos
 * lecturas completas por construcción y dos construcciones al día, camino de unos 2.000
 * ficheros. Hoy no se nota junto a lo que tarda el build; el día que se note, lo que hay
 * que compartir es esa lectura, no la invocación de git, que es la barata de las dos.
 *
 * ── El modo de fallo que hay que temer, y por qué se comprueba antes de nada ─────────
 *
 * Un checkout superficial —`fetch-depth: 1`, que es lo que `actions/checkout` hace por
 * omisión— **no devuelve el vacío**: devuelve un commit injertado que git trata como raíz,
 * y `--raw` sobre una raíz lista el árbol **entero**. O sea que en CI, sin darse
 * cuenta, todos los ficheros del Corpus tendrían la fecha del último commit y el sitemap
 * publicaría 1.715 fechas idénticas indistinguibles de una fecha de build. Es exactamente
 * la mentira que la historia existe para no cometer, y llega disfrazada de éxito: en local
 * el resultado es correcto y nadie ve la diferencia.
 *
 * Por eso se pregunta primero si la copia es superficial y, si lo es, **no se declara
 * ninguna fecha** y se avisa. El sitemap queda como estaba —sin `lastmod`—, que es pobre y
 * honesto. `.github/workflows/publicar.yml` pide historial completo en el trabajo que
 * construye; esta comprobación es lo que hace que olvidarlo se note en vez de mentir.
 *
 * ── Y el modo de fallo mudo, que es el hermano callado del anterior ──────────────────
 *
 * El otro extremo no revienta y tampoco miente: no dice nada. `git log -- <ámbito que no
 * casa>` sale con código 0 y salida vacía, y con eso las 1.715 fechas se omiten una a una
 * como si cada superficie fuera un caso legítimo de «fecha indeterminable». Por eso, antes
 * de devolver, se compara lo fechado con lo que hay que fechar —`coberturaInsuficiente`,
 * en el módulo puro— y se avisa con el mismo énfasis que en el caso superficial.
 */

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { readdir, realpath } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import type { AstroIntegration } from 'astro';
import {
  leerAutores,
  leerCitas,
  leerColecciones,
  leerFichasDeObra,
  leerTemas,
  rutasDelCorpus,
  separarFrontmatter,
} from '../tools/lib/corpus.ts';
import { colgarObras } from '../src/lib/obras.ts';
import {
  VERSION_OPACA,
  bajasDelHistorial,
  coberturaInsuficiente,
  fechasPorSuperficie,
  ficherosDelCorpus,
  type CorpusParaFechar,
  type FechaDeCambio,
  type TransicionFechada,
  type Version,
} from '../tools/lib/cambios.ts';
import { FAMILIAS_DE_FICHERO, type FamiliaDeFichero } from '../tools/lib/avisar.ts';
import { obraDeIndice } from '../tools/lib/indice.ts';

const ejecutar = promisify(execFile);

/**
 * La marca que separa la cabecera de cada commit de la lista de sus ficheros.
 *
 * Un carácter de control, y no una línea de guiones: los nombres de fichero del Corpus son
 * slugs, pero nada impide que un día entre uno raro, y una marca que pudiera aparecer en
 * un nombre convertiría un fichero en una fecha sin que nada fallara.
 */
const MARCA = '\u0001';

/** La salida de `git log` cabe de sobra, pero un Corpus que crezca no debe truncarse en silencio. */
const TOPE_DE_SALIDA = 128 * 1024 * 1024;

/** Lo que se sabe del repositorio que gobierna una raíz: dónde empieza, o por qué no fiarse. */
export interface EstadoDelRepositorio {
  /**
   * La raíz del repositorio —`--show-toplevel`—, ya canonizada.
   *
   * Hace falta porque `git log` imprime **rutas relativas a la raíz del repositorio**, y no
   * al directorio desde el que se le pregunta. Cruzarlas contra el corpus resolviéndolas
   * sobre otra cosa solo casa mientras las dos coincidan, y es el fallo mudo perfecto: no
   * hay excepción, no hay salida vacía, simplemente ninguna ruta empareja.
   */
  tope?: string;
  /**
   * Por qué **no** hay que fiarse del historial, o la ausencia si sí hay que fiarse.
   *
   * Un motivo escrito y no un booleano: quien lo consume lo mete en el aviso, y «la copia
   * es superficial» y «aquí no hay repositorio» piden mirar sitios distintos. También
   * contesta cuando no hay git en la máquina, con el mismo trato: no es que el historial
   * esté truncado, es que no lo hay, y en los dos casos lo correcto es no declarar ninguna
   * fecha. Esto corre dentro del build y no puede tumbarlo.
   */
  motivo?: string;
}

/**
 * Dónde empieza el repositorio y si su historial sirve — las dos cosas, de una vez.
 *
 * Van en la misma invocación porque son la misma pregunta hecha al mismo git: `rev-parse`
 * acepta las dos consultas y contesta una por línea, así que preguntarlas por separado
 * serían dos procesos para saber lo mismo.
 *
 * Las rutas se canonizan con `realpath` porque en macOS `/tmp` es un enlace a `/private/tmp`
 * y git contesta siempre con la forma física: sin esto, un proyecto bajo el directorio
 * temporal —que es donde corren las pruebas de build— cruzaría `/var/folders/…` contra
 * `/private/var/folders/…` y no casaría ni una ruta.
 */
export async function estadoDelRepositorio(raiz: string): Promise<EstadoDelRepositorio> {
  try {
    const { stdout } = await ejecutar(
      'git',
      ['rev-parse', '--is-shallow-repository', '--show-toplevel'],
      { cwd: raiz },
    );
    const [superficial = '', tope = ''] = stdout.split('\n').map((linea) => linea.trim());

    if (superficial === 'true') {
      return {
        motivo:
          'la copia del repositorio es superficial, así que git no conoce cuándo cambió cada fichero',
      };
    }
    if (tope === '') {
      return { motivo: 'git no dijo dónde empieza el repositorio' };
    }
    return { tope: await realpath(tope) };
  } catch (fallo) {
    return {
      motivo: `no se pudo preguntar a git — ${fallo instanceof Error ? fallo.message : String(fallo)}`,
    };
  }
}

/** Un blob vacío de git: la «versión» de un fichero que no existe en ese lado. */
const BLOB_NULO = /^0+$/u;

/** Una entrada de `git log --raw` o `git diff --raw`: un fichero, su blob de antes y el de después. */
export interface EntradaCruda {
  fichero: string;
  antes: string | null;
  despues: string | null;
}

/**
 * Las entradas de una salida `--raw -z` de git, con la cabecera de cada commit si la hay.
 *
 * Con `-z` cada trozo va terminado en NUL: `:<modo> <modo> <blob> <blob> <estado>` y, en el
 * trozo siguiente, la ruta tal cual —sin comillas de C—. Con `git log`, la cabecera de cada commit
 * —`\u0001<instante>`— va pegada a la primera de sus líneas por el único salto de línea que emite
 * `--pretty=format:`. Un trozo que no se entiende no contamina el resto: se salta.
 */
export function entradasCrudas(salida: string): { fecha: FechaDeCambio | undefined; entrada: EntradaCruda }[] {
  const resultado: { fecha: FechaDeCambio | undefined; entrada: EntradaCruda }[] = [];
  let fecha: FechaDeCambio | undefined;
  let meta: string[] | undefined;
  for (const bruto of salida.split('\0')) {
    let trozo = bruto;
    if (trozo.startsWith(MARCA)) {
      const salto = trozo.indexOf('\n');
      const cabecera = (salto === -1 ? trozo.slice(MARCA.length) : trozo.slice(MARCA.length, salto)).trim();
      const momento = new Date(cabecera);
      // Una cabecera que no se deja leer no contamina el resto: se descarta ese commit.
      fecha = Number.isNaN(momento.getTime()) ? undefined : momento.toISOString();
      trozo = salto === -1 ? '' : trozo.slice(salto + 1);
      meta = undefined;
    }
    if (trozo === '') continue;
    if (meta === undefined && trozo.startsWith(':')) {
      meta = trozo.slice(1).split(' ');
      continue;
    }
    if (meta !== undefined) {
      // Sin `trim`: con `-z` la ruta viene literal, y un nombre con espacio al principio o al
      // final es un nombre distinto.
      const [, , viejo = '', nuevo = ''] = meta;
      resultado.push({
        fecha,
        entrada: {
          fichero: trozo,
          antes: viejo === '' || BLOB_NULO.test(viejo) ? null : viejo,
          despues: nuevo === '' || BLOB_NULO.test(nuevo) ? null : nuevo,
        },
      });
      meta = undefined;
    }
  }
  return resultado;
}

/**
 * Los campos de una versión de un fichero del Corpus: el frontmatter de un `.md` o el YAML de un
 * `.yml`, analizados como los lee `tools/lib/corpus.ts`. Lo que no se deja analizar, o no es un
 * objeto, es **opaco**, y cuenta como cambio de todos los campos: antes fechar de más que mentir
 * de menos.
 */
export function analizarVersion(fichero: string, contenido: string): Version {
  try {
    const extension = extname(fichero);
    const datos =
      extension === '.md'
        ? separarFrontmatter(contenido)
        : extension === '.yml' || extension === '.yaml'
          ? (parsearYaml(contenido) as unknown)
          : undefined;
    if (datos === null || datos === undefined || typeof datos !== 'object' || Array.isArray(datos)) {
      return VERSION_OPACA;
    }
    return datos as Record<string, unknown>;
  } catch {
    return VERSION_OPACA;
  }
}

/**
 * Las versiones de unos blobs, leídas con **un solo** `git cat-file --batch` y analizadas por la
 * extensión del fichero al que pertenecen. Un blob que git no encuentra es opaco.
 */
export async function versionesDeBlobs(
  tope: string,
  pedidos: ReadonlyMap<string, string>,
): Promise<Map<string, Version>> {
  const versiones = new Map<string, Version>();
  if (pedidos.size === 0) return versiones;
  const salida = await new Promise<Buffer>((listo, fallo) => {
    const proceso = spawn('git', ['cat-file', '--batch'], { cwd: tope });
    const trozos: Buffer[] = [];
    let error = '';
    proceso.stdout.on('data', (trozo: Buffer) => trozos.push(trozo));
    proceso.stderr.on('data', (trozo) => (error += String(trozo)));
    proceso.on('error', fallo);
    /*
     * Si git sale antes de leerlo todo —un repositorio roto, un proceso matado—, escribir en su
     * entrada da EPIPE, y un `'error'` sin escucha tumbaría el proceso entero en vez de rechazar
     * esta promesa: se saltaría el «no rompe nunca» de `fechasDeLasSuperficies`. El código de
     * salida ya dice que falló.
     */
    proceso.stdin.on('error', () => undefined);
    proceso.on('close', (codigo) => {
      if (codigo === 0) listo(Buffer.concat(trozos));
      else fallo(new Error(`git cat-file salió con ${codigo}${error.trim() === '' ? '' : ` (${error.trim()})`}`));
    });
    proceso.stdin.end(`${[...pedidos.keys()].join('\n')}\n`);
  });

  let posicion = 0;
  while (posicion < salida.length) {
    const salto = salida.indexOf(0x0a, posicion);
    if (salto === -1) break;
    const [blob = '', tipo, tamano] = salida.toString('utf8', posicion, salto).split(' ');
    posicion = salto + 1;
    if (tipo === 'missing' || tamano === undefined) {
      versiones.set(blob, VERSION_OPACA);
      continue;
    }
    const bytes = Number(tamano);
    const contenido = salida.toString('utf8', posicion, posicion + bytes);
    posicion += bytes + 1;
    versiones.set(blob, analizarVersion(pedidos.get(blob) ?? '', contenido));
  }
  return versiones;
}

/** Qué leer del historial además de los ámbitos. */
export interface OpcionesDelHistorial {
  /**
   * Los directorios —en absoluto— cuyos blobs **no** se leen: sus transiciones son opacas.
   * `corpus/fuentes/`, que pesa 155 MB y del que solo importa que un documento cambió.
   */
  opacos?: readonly string[];
  /** Un rango de revisiones —`desde..hasta`—; sin él, todo lo alcanzable desde `HEAD`. */
  rango?: string;
}

/**
 * Las transiciones de cada fichero del Corpus, en UTC y por su ruta absoluta — Historia 24.8.
 *
 * `tope` es la raíz del **repositorio**, no la del proyecto, porque es a ella a la que git refiere
 * las rutas que imprime. Los ámbitos llegan en absoluto y se traducen a relativos contra la misma
 * raíz, así que un proyecto que viva en un subdirectorio del repositorio funciona igual.
 * Absoluta porque así es como las nombra quien lee el corpus, y comparar rutas escritas de dos
 * maneras es el fallo silencioso clásico de esta clase de cruce. En UTC porque el sitemap tiene
 * que declarar lo mismo se construya donde se construya.
 *
 * Los commits de fusión no traen líneas con `--raw` sin `-m`: lo que cambiaron sus padres aparece
 * en sus propios commits, pero lo que solo cambió la fusión —la resolución de un conflicto— no
 * aparece (diferido en la 24.8). Y la simplificación de historia por defecto de un `git log`
 * acotado a rutas sigue un solo padre cuando la fusión es idéntica a él en esas rutas: las ramas
 * que pode no llegaron al árbol final, o llegaron igual por el padre que sí se sigue.
 *
 * Un cambio solo de modo —el mismo blob antes y después, un `chmod`— no es una transición: no
 * cambió nada que ninguna superficie pinte, tampoco en un documento opaco.
 */
export async function historialDeLosFicheros(
  tope: string,
  ambitos: readonly string[],
  opciones: OpcionesDelHistorial = {},
): Promise<Map<string, TransicionFechada[]>> {
  const { stdout } = await ejecutar(
    'git',
    [
      'log',
      `--pretty=format:${MARCA}%cI`,
      '--raw',
      /*
       * `-z` no es cosmético: sin él git **entrecomilla en C** cualquier ruta con caracteres que
       * considere raros —`"corpus/citas/caf\303\251.md"`—, y se resolvería ese literal, con
       * comillas y escapes incluidos, contra la raíz. Con `-z` las rutas salen tal cual.
       */
      '-z',
      // Los blobs enteros: abreviados, `cat-file` podría no saber cuál es.
      '--no-abbrev',
      // Un `log.showSignature = true` de quien construye metería la verificación GPG en medio.
      '--no-show-signature',
      // Sin detección de renombrados: es cara y su heurística depende del tamaño del historial.
      // Un renombrado sale como baja del nombre viejo y alta del nuevo, que es lo que se mide.
      '--no-renames',
      ...(opciones.rango === undefined ? [] : [opciones.rango]),
      '--',
      /*
       * Los **ámbitos** —los directorios del Corpus—, y no los miles de ficheros uno a uno: una
       * lista de argumentos de ese tamaño roza el límite del sistema. Lo que sobre en la
       * respuesta no casa con ninguna superficie y se descarta solo.
       */
      ...ambitos.map((ruta) => relative(tope, ruta).split('\\').join('/')),
    ],
    { cwd: tope, maxBuffer: TOPE_DE_SALIDA },
  );

  const opacos = (opciones.opacos ?? []).map((directorio) => `${resolve(directorio)}${sep}`);
  const esOpaco = (absoluta: string) => opacos.some((directorio) => absoluta.startsWith(directorio));

  const crudas: { fecha: FechaDeCambio; absoluta: string; entrada: EntradaCruda; opaca: boolean }[] = [];
  const pedidos = new Map<string, string>();
  for (const { fecha, entrada } of entradasCrudas(stdout)) {
    if (fecha === undefined || soloDeModo(entrada)) continue;
    const absoluta = resolve(tope, entrada.fichero);
    const opaca = esOpaco(absoluta);
    crudas.push({ fecha, absoluta, entrada, opaca });
    if (opaca) continue;
    for (const blob of [entrada.antes, entrada.despues]) {
      if (blob !== null && !pedidos.has(blob)) pedidos.set(blob, entrada.fichero);
    }
  }

  const versiones = await versionesDeBlobs(tope, pedidos);
  const version = (blob: string | null, opaca: boolean): Version | null =>
    blob === null ? null : opaca ? VERSION_OPACA : (versiones.get(blob) ?? VERSION_OPACA);

  const historial = new Map<string, TransicionFechada[]>();
  for (const { fecha, absoluta, entrada, opaca } of crudas) {
    const transicion: TransicionFechada = {
      fecha,
      antes: version(entrada.antes, opaca),
      despues: version(entrada.despues, opaca),
    };
    const lista = historial.get(absoluta);
    if (lista === undefined) historial.set(absoluta, [transicion]);
    else lista.push(transicion);
  }
  return historial;
}

/** Una entrada cuyo contenido no cambió —mismo blob en los dos lados—: solo cambió el modo. */
export function soloDeModo(entrada: EntradaCruda): boolean {
  return entrada.antes !== null && entrada.antes === entrada.despues;
}

/**
 * Los documentos de `corpus/fuentes/` en disco, por su ruta absoluta: `.txt`, con subdirectorios,
 * y los índices de subpáginas (`.indice.yml`, Historia 24.9), que la relación compone en su Obra.
 */
async function documentosEnDisco(directorio: string): Promise<string[]> {
  if (!existsSync(directorio)) return [];
  const entradas = await readdir(directorio, { recursive: true });
  return entradas
    .filter((entrada) => extname(entrada) === '.txt' || obraDeIndice(entrada) !== undefined)
    .map((entrada) => resolve(directorio, entrada))
    .sort();
}

/**
 * El corpus leído con lo justo para fechar superficies.
 *
 * Lee las **declaraciones** y no aplica ningún umbral: quién se anuncia lo decide el filtro
 * del sitemap (AD-11, Historia 12.1) y aquí solo se pone fecha a lo que aquél deje pasar. Los
 * documentos de `corpus/fuentes/` se listan del disco —solo los nombres; ninguno se lee—, salvo
 * que se den: `tools/avisar.ts` los da de `git ls-tree` para una revisión que no extrae.
 */
export async function corpusParaFechar(
  raiz: string,
  opciones: { documentos?: readonly string[] } = {},
): Promise<CorpusParaFechar> {
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  const [leidas, autores, temas, colecciones, fichas, documentos] = await Promise.all([
    leerCitas(rutas.citas),
    leerAutores(rutas),
    leerTemas(rutas),
    leerColecciones(rutas),
    leerFichasDeObra(rutas),
    opciones.documentos === undefined ? documentosEnDisco(rutas.fuentes) : Promise.resolve(opciones.documentos),
  ]);
  // Historia 22.4 — la Obra de cada Cita, resuelta como la resuelve el sitio.
  const citas = colgarObras(leidas, fichas);

  return {
    citas: citas.map((cita) => {
      const obraDeclarada = cita.procedencia?.obra;
      const fuente = (cita.fuente as { id?: unknown } | null | undefined)?.id;
      return {
        slug: cita.slug,
        autor: cita.autor,
        ...(cita.obra !== undefined ? { obra: cita.obra.nombre } : {}),
        ...(typeof obraDeclarada === 'string' ? { obraDeclarada } : {}),
        ...(typeof fuente === 'string' && fuente !== '' ? { fuente } : {}),
        // El frontmatter se lee crudo, sin el `default([])` del esquema: una Cita sin `temas`
        // llega con el campo ausente y no con la lista vacía.
        temas: cita.temas ?? [],
        ruta: resolve(cita.ruta),
      };
    }),
    autores: autores.map((autor) => ({ slug: autor.slug, ruta: resolve(autor.ruta) })),
    temas: temas.map((tema) => ({ slug: tema.slug, ruta: resolve(tema.ruta) })),
    colecciones: colecciones.map((coleccion) => ({
      slug: coleccion.slug,
      miembros: coleccion.miembros,
      ruta: resolve(coleccion.ruta),
    })),
    obras: fichas.map((ficha) => ({
      nombre: ficha.nombre,
      autor: ficha.autor,
      formas: ficha.formas,
      ruta: resolve(ficha.ruta),
    })),
    documentos: documentos.map((documento) => resolve(documento)),
  };
}

/** La cabecera común de los dos avisos, que dicen lo mismo por dos motivos distintos. */
const SIN_FECHAS = 'Sitemap: ninguna entrada llevará «lastmod» — ';

/**
 * La fecha de último cambio de cada superficie anunciable — lo que consume el sitemap.
 *
 * **No rompe nunca, y eso es parte del contrato.** `@astrojs/sitemap` descarta el sitemap
 * entero si su `serialize` lanza, así que una excepción aquí no dejaría un sitemap sin
 * fechas: dejaría al sitio **sin sitemap**, que es mucho peor que el problema que esta
 * historia viene a arreglar. Ante cualquier tropiezo se avisa y se devuelve el mapa vacío,
 * con el que cada entrada omite su campo.
 *
 * La raíz se canoniza antes de nada para que las rutas del corpus y las que devuelve git
 * se escriban de la misma manera; el porqué está en `estadoDelRepositorio`.
 */
export async function fechasDeLasSuperficies(
  raizDeclarada: string,
  avisar: (mensaje: string) => void = console.warn,
): Promise<Map<string, FechaDeCambio>> {
  try {
    const raiz = await realpath(raizDeclarada);
    const { tope, motivo } = await estadoDelRepositorio(raiz);
    if (tope === undefined) {
      avisar(
        `${SIN_FECHAS}${motivo}. El sitemap sale sin fechas en vez de con fechas ` +
          'inventadas; si esto es el CI, el trabajo que construye necesita «fetch-depth: 0».',
      );
      return new Map();
    }

    /*
     * Historia 22.8 — las Fichas de Obra se fechan con git como los demás ficheros. Historia
     * 24.8 — y los documentos de `corpus/fuentes/`, que ordenan la Página de Obra; sus blobs no
     * se leen: un documento solo cuenta como «cambió». Los ámbitos y sus familias salen de
     * `FAMILIAS_DE_FICHERO`, la misma tabla que filtra el diff del aviso y el historial del
     * ensayo: una familia nueva no puede fecharse en una lectura y no en la otra.
     */
    const ambitos: readonly (readonly [string, FamiliaDeFichero])[] = FAMILIAS_DE_FICHERO.map(
      ([directorio, familia]) => [resolve(raiz, directorio), familia] as const,
    );
    const opacos = ambitos.filter(([, familia]) => familia === 'documento').map(([directorio]) => directorio);

    const [vivo, historial] = await Promise.all([
      corpusParaFechar(raiz),
      historialDeLosFicheros(
        tope,
        ambitos.map(([directorio]) => directorio),
        { opacos },
      ),
    ]);

    // Historia 24.8 — lo que salió del Corpus fecha, con el commit que lo sacó, lo que componía.
    const familiaDe = (fichero: string) =>
      ambitos.find(([directorio]) => fichero.startsWith(`${directorio}${sep}`))?.[1];
    const corpus: CorpusParaFechar = {
      ...vivo,
      bajas: bajasDelHistorial(historial, familiaDe, new Set(ficherosDelCorpus(vivo))),
    };

    /*
     * El guardián del fallo mudo. Que git conteste que sí y no diga nada deja el mapa
     * vacío y el sitemap exactamente como el de hoy, sin una sola línea en el registro:
     * la historia entera en nada, y en verde. Se avisa con el mismo énfasis que en el
     * caso superficial porque para quien mira el registro es la misma noticia.
     */
    const pobre = coberturaInsuficiente(vivo, historial);
    if (pobre !== undefined) {
      avisar(
        `${SIN_FECHAS}${pobre}. Git contestó sin error, así que no es que el historial ` +
          'falte: es que las rutas que devuelve no casan con las del Corpus. Mira desde ' +
          `qué raíz se preguntó —${tope}— y qué ámbitos se le pasaron.`,
      );
    }

    return fechasPorSuperficie(corpus, historial);
  } catch (fallo) {
    avisar(
      `${SIN_FECHAS}no se pudo leer el historial del Corpus: ` +
        `${fallo instanceof Error ? fallo.message : String(fallo)}`,
    );
    return new Map();
  }
}

/**
 * La raíz del proyecto, que Astro entrega y no se supone.
 *
 * Empieza en `process.cwd()` por lo mismo que en el cotejo y en las Colecciones —hay que
 * poner algo antes de que el gancho corra—, pero el valor que vale es el de
 * `astro:config:setup`. Suponer el cwd es precisamente lo que rompía el cruce cuando esto
 * vivía en `tools/lib/`.
 */
let raizDelProyecto = process.cwd();

/** @type {Promise<Map<string, FechaDeCambio>> | undefined} */
let memoria: Promise<Map<string, FechaDeCambio>> | undefined;

/**
 * Las fechas del sitemap, leídas una sola vez — lo que consume el `serialize`.
 *
 * `serialize` se llama una vez por entrada del sitemap —hoy 1.715—, así que el mapa se
 * calcula en la primera y se reutiliza en las demás. Se guarda la **promesa** y no su
 * resultado: `serialize` se invoca en secuencia y con `await`, pero memorizar el valor
 * exigiría un candado para el caso de que dejara de ser así, y memorizar la promesa no.
 */
export function fechasDelSitemap(): Promise<Map<string, FechaDeCambio>> {
  memoria ??= fechasDeLasSuperficies(raizDelProyecto);
  return memoria;
}

/**
 * La integración que captura la raíz — Historia 18.4.
 *
 * No hace nada más, y eso es todo lo que tiene que hacer: sin ella, la lectura del
 * historial tendría que suponer que el directorio de trabajo es la raíz del proyecto, que
 * es la suposición que se cae en cuanto alguien construye desde otro sitio. Va enganchada
 * en `astro.config.mjs` junto a las otras tres por el mismo motivo que ellas: es el único
 * punto por el que pasan todas las construcciones.
 */
export default function historialDelCorpus(): AstroIntegration {
  return {
    name: 'historial-del-corpus',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raizDelProyecto = fileURLToPath(config.root);
        // Una segunda configuración en el mismo proceso —el servidor de desarrollo al
        // reiniciarse— no debe seguir contestando con el mapa de la raíz anterior.
        memoria = undefined;
      },
    },
  };
}
