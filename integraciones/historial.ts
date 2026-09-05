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
 * ── Una sola invocación, y no una por fichero ────────────────────────────────────────
 *
 * `git log -1` por fichero serían mil setecientos procesos en el camino crítico del build.
 * Un solo `git log --name-only` recorre el historial en orden inverso y la **primera** vez
 * que aparece un fichero es su último cambio: sobre el repositorio real, con los cuatro
 * directorios del Corpus como ámbito, son **149 KB de salida y 0,06 s** medidos.
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
 * y `--name-only` sobre una raíz lista el árbol **entero**. O sea que en CI, sin darse
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

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { realpath } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerAutores, leerCitas, leerColecciones, leerTemas, rutasDelCorpus } from '../tools/lib/corpus.ts';
import {
  coberturaInsuficiente,
  fechasPorSuperficie,
  type CorpusParaFechar,
  type FechaDeCambio,
} from '../tools/lib/cambios.ts';

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

/**
 * La fecha del último cambio de cada fichero del Corpus, en UTC y por su ruta absoluta.
 *
 * `tope` es la raíz del **repositorio**, no la del proyecto, porque es a ella a la que
 * `git log` refiere las rutas que imprime. Los ámbitos llegan en absoluto y se traducen a
 * relativos contra la misma raíz, así que un proyecto que viva en un subdirectorio del
 * repositorio funciona igual.
 *
 * Absoluta porque así es como las nombra quien lee el corpus, y comparar rutas escritas de
 * dos maneras es el fallo silencioso clásico de esta clase de cruce —`tools/avisar.ts` ya
 * lo resuelve igual, con `resolve`—.
 *
 * En UTC porque el sitemap tiene que declarar lo mismo se construya donde se construya:
 * `%cI` trae el instante con el desfase de quien commiteó, y publicarlo tal cual haría que
 * el mismo commit se anunciara con dos cadenas distintas desde Madrid y desde el CI.
 */
export async function fechasDeLosFicheros(
  tope: string,
  ambitos: readonly string[],
): Promise<Map<string, FechaDeCambio>> {
  const { stdout } = await ejecutar(
    'git',
    [
      'log',
      `--pretty=format:${MARCA}%cI`,
      '--name-only',
      /*
       * `-z` no es cosmético: sin él git **entrecomilla en C** cualquier ruta con
       * caracteres que considere raros —`"corpus/citas/caf\303\251.md"`—, y el bucle de
       * abajo resolvería ese literal, con comillas y escapes incluidos, contra la raíz. La
       * fecha de ese fichero desaparecería sin que nada fallara. Hoy no dispara porque los
       * slugs son `^[a-z0-9-]+$`, pero nada obliga a que los **nombres de fichero** lo
       * sean, y el día que entre uno con un acento el sitemap perdería su fecha en
       * silencio. Con `-z` las rutas salen tal cual, terminadas en NUL.
       */
      '-z',
      // Un `log.showSignature = true` en la configuración de quien construye metería las
      // líneas de la verificación GPG en medio de la salida, y algunas parecerían nombres
      // de fichero. Se apaga aquí en vez de confiar en que nadie lo tenga puesto.
      '--no-show-signature',
      // Sin detección de renombrados: es cara y su heurística puede dar resultados
      // distintos según el tamaño del historial. Un renombrado sale como alta del nombre
      // nuevo, que para lo que aquí se mide es la respuesta correcta de todos modos.
      '--no-renames',
      '--',
      /*
       * Los **ámbitos** —los cuatro directorios del Corpus—, y no los mil setecientos
       * ficheros uno a uno: una lista de argumentos de ese tamaño roza el límite del
       * sistema y reventaría el día que el Corpus crezca lo suficiente, con un error que
       * nadie relacionaría con el sitemap. Lo que sobre en la respuesta no casa con
       * ninguna superficie y se descarta solo.
       */
      ...ambitos.map((ruta) => relative(tope, ruta).split('\\').join('/')),
    ],
    { cwd: tope, maxBuffer: TOPE_DE_SALIDA },
  );

  const fechas = new Map<string, FechaDeCambio>();
  let fecha: FechaDeCambio | undefined;

  /*
   * Con `-z`, la salida es: `\u0001<instante>\n` seguido de las rutas del commit, cada una
   * terminada en NUL, y un NUL de más antes del siguiente commit. O sea que el primer
   * trozo de cada commit trae pegados la cabecera y su primera ruta, separadas por el
   * único salto de línea que `--pretty=format:` emite.
   */
  for (const trozo of stdout.split('\0')) {
    let fichero = trozo;

    if (fichero.startsWith(MARCA)) {
      const salto = fichero.indexOf('\n');
      const cabecera = (salto === -1 ? fichero.slice(MARCA.length) : fichero.slice(MARCA.length, salto)).trim();
      const momento = new Date(cabecera);
      // Una cabecera que no se deja leer no contamina el resto: se descarta ese commit.
      fecha = Number.isNaN(momento.getTime()) ? undefined : momento.toISOString();
      fichero = salto === -1 ? '' : fichero.slice(salto + 1);
    }

    // Sin `trim`: con `-z` la ruta viene literal, y un nombre con espacio al principio o al
    // final es un nombre distinto. Recortarlo sería reintroducir el fallo que `-z` cierra.
    if (fichero === '' || fecha === undefined) continue;

    // `git log` va del presente al pasado, así que la primera aparición manda y las
    // siguientes son historia anterior del mismo fichero.
    const absoluta = resolve(tope, fichero);
    if (!fechas.has(absoluta)) fechas.set(absoluta, fecha);
  }

  return fechas;
}

/**
 * El corpus leído con lo justo para fechar superficies.
 *
 * Lee las **declaraciones** y no aplica ningún umbral: quién se anuncia lo decide el filtro
 * del sitemap (AD-11, Historia 12.1) y aquí solo se pone fecha a lo que aquél deje pasar.
 */
export async function corpusParaFechar(raiz: string): Promise<CorpusParaFechar> {
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  const [citas, autores, temas, colecciones] = await Promise.all([
    leerCitas(rutas.citas),
    leerAutores(rutas),
    leerTemas(rutas),
    leerColecciones(rutas),
  ]);

  return {
    citas: citas.map((cita) => ({
      slug: cita.slug,
      autor: cita.autor,
      // El frontmatter se lee crudo, sin el `default([])` del esquema: una Cita sin `temas`
      // llega con el campo ausente y no con la lista vacía.
      temas: cita.temas ?? [],
      ruta: resolve(cita.ruta),
    })),
    autores: autores.map((autor) => ({ slug: autor.slug, ruta: resolve(autor.ruta) })),
    temas: temas.map((tema) => ({ slug: tema.slug, ruta: resolve(tema.ruta) })),
    colecciones: colecciones.map((coleccion) => ({
      slug: coleccion.slug,
      miembros: coleccion.miembros,
      ruta: resolve(coleccion.ruta),
    })),
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

    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const ambitos = [rutas.citas, rutas.autores, rutas.temas, rutas.colecciones];

    const [corpus, fechas] = await Promise.all([
      corpusParaFechar(raiz),
      fechasDeLosFicheros(tope, ambitos),
    ]);

    /*
     * El guardián del fallo mudo. Que git conteste que sí y no diga nada deja el mapa
     * vacío y el sitemap exactamente como el de hoy, sin una sola línea en el registro:
     * la historia entera en nada, y en verde. Se avisa con el mismo énfasis que en el
     * caso superficial porque para quien mira el registro es la misma noticia.
     */
    const pobre = coberturaInsuficiente(corpus, fechas);
    if (pobre !== undefined) {
      avisar(
        `${SIN_FECHAS}${pobre}. Git contestó sin error, así que no es que el historial ` +
          'falte: es que las rutas que devuelve no casan con las del Corpus. Mira desde ' +
          `qué raíz se preguntó —${tope}— y qué ámbitos se le pasaron.`,
      );
    }

    return fechasPorSuperficie(corpus, fechas);
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
