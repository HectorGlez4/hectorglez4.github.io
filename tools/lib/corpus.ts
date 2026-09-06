/**
 * Acceso al corpus desde las herramientas de `tools/`.
 *
 * Es la única capa del proyecto que lee y escribe `corpus/`. La derivación de `src/lib/`
 * no toca el disco (AD-5) y la presentación consume las colecciones de Astro, nunca los
 * ficheros (AD-11). Aquí sí, porque el alta y la auditoría trabajan sobre ficheros.
 *
 * AD-10 — no hay otro almacén que git. Estas funciones escriben ficheros y nada más.
 */

import { appendFile, readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import type { AutorAdmisible, CitaAdmisible } from '../../src/lib/admision.ts';
import type {
  ClaseDeObjetivo,
  ObjetivoDeTema,
  ObjetivoDeTradicion,
} from '../../src/lib/objetivo.ts';
import { FICHERO_DEL_CENSO, type DocumentosDeFuente } from './cotejo.ts';
import { analizarDocumento } from './documento.ts';
/*
 * Solo los tipos, y a propósito: quien decide qué se inspecciona y cómo se agrega es
 * `indexacion.ts`, que es puro y no toca disco. Esta capa escribe lo que le den. Al ser
 * `import type`, TypeScript lo borra al compilar y no queda dependencia en ejecución.
 */
import type { LecturaDeFamilia, LecturaDeIndexacion, RepartoDeEstado } from './indexacion.ts';
/*
 * Y lo mismo con el registro de peticiones (18.3): quién decide si una URL se puede pedir
 * es `tools/lib/rastreo.ts`, que es puro. Esta capa escribe lo que le den.
 */
import type { PeticionDeRastreo } from './rastreo.ts';

/**
 * El registro de sesiones de sembrado — Historia 11.3. Su nombre tiene un solo dueño,
 * igual que el del censo de cotejo.
 */
export const FICHERO_DE_SESIONES = 'sesiones-de-sembrado.yml';

/**
 * Las fijaciones de jornada de la Cita del Día — FR-9, y donde escribe el lote (13.1).
 *
 * Su nombre tiene un solo dueño, como el del censo de cotejo y el de las sesiones. Lo
 * consumen el sitio —que lo importa como JSON desde `src/pages/`— y la orden que fija
 * jornadas; que las dos partes hablen del mismo fichero es lo que hace que componer por
 * adelantado y componer el día sean la misma cosa.
 */
export const FICHERO_DE_PORTADA = 'portada.json';

/**
 * La serie de indexación por familia — Historia 16.1. Su nombre tiene un solo dueño.
 *
 * Vecino de `sesiones-de-sembrado.yml` y de la misma clase: metadato del Corpus, no
 * colección. Lo que mide y por qué **reemplaza** en vez de añadir está escrito en su
 * cabecera, unas líneas más abajo.
 */
export const FICHERO_DE_INDEXACION = 'serie-de-indexacion.yml';

/**
 * El registro de peticiones de rastreo — Historia 18.3. Su nombre tiene un solo dueño.
 *
 * Vecino de la serie de indexación y su contrario en lo único que importa no confundir:
 * aquélla **reemplaza** por fecha porque mide un estado, y éste **solo añade** porque
 * registra actos. Está escrito en las dos cabeceras.
 */
export const FICHERO_DE_PETICIONES = 'peticiones-de-rastreo.yml';

/**
 * La lista de candidatos por época — Historia 19.5. Su nombre tiene un solo dueño.
 *
 * Vecino de la serie de indexación y de la misma clase que ella: **reemplaza**, porque lo
 * que guarda es lo que la Fuente dice hoy, no un acto que se acumule. Se regenera con
 * `npm run epocas -- --registrar` y no se edita a mano; su cabecera lo dice.
 */
export const FICHERO_DE_CANDIDATOS = 'candidatos-por-epoca.yml';

/**
 * El registro de descartes de candidatos — Historia 19.5. Su nombre tiene un solo dueño.
 *
 * Es el contrario del anterior y son vecinos, así que la confusión sería silenciosa: aquél
 * reemplaza porque lo escribe la Fuente, y **éste solo añade** porque lo escribe el editor.
 * Un descarte es un acto con motivo y con fecha; regenerarlo sería borrar el criterio por el
 * que un candidato dejó de proponerse, y la sesión siguiente volvería a proponerlo.
 */
export const FICHERO_DE_DESCARTES = 'descartes-de-candidatos.yml';

export interface Rutas {
  raiz: string;
  citas: string;
  autores: string;
  temas: string;
  /**
   * Las Colecciones — Historia 12.2, AD-18.
   *
   * Sí es colección de Astro, a diferencia de `fuentes/`: `src/content.config.ts` la
   * declara con esta misma base. Se versiona vacía con su `.gitkeep` hasta que el dueño
   * del Corpus cure la primera; ver la nota de `src/content.config.ts`.
   */
  colecciones: string;
  /**
   * Donde va un documento de Fuente retirado — AD-2, como las Colecciones.
   *
   * Se retira el documento que no da ninguna Cita: un entremés, una crónica, un índice.
   * **Se mueve y no se borra** porque el fichero lleva dentro la dirección de la que salió,
   * así que volver atrás es copiarlo, y porque borrar deja al Corpus sin memoria de lo que
   * ya se probó: sin esto, la sesión siguiente vuelve a recuperar lo mismo.
   */
  fuentesRetiradas: string;
  /**
   * Donde va una Colección despublicada — Historia 12.4.
   *
   * Es `corpus/_revision/` para Colecciones, y el paralelo es literal: AD-2 dice que lo no
   * publicado vive **fuera** del árbol construido, y que publicar y despublicar son mover
   * el fichero. Ninguna base de `src/content.config.ts` apunta aquí, así que una Colección
   * retirada no la carga nadie, y su criterio y su lista de miembros siguen enteros para
   * cuando se quiera volver a publicar: se mueve de vuelta.
   *
   * No se borra, y no es una preferencia. `AGENTS.md` lo prohíbe expresamente porque git es
   * el único almacén del contenido; una Colección es contenido editorial —un criterio y una
   * curación— tanto como una Cita.
   *
   * **No se versiona vacío con `.gitkeep`**, a diferencia de sus tres hermanos, y la
   * excepción queda escrita para que no se lea como olvido: el directorio lo crea `mover` la
   * primera vez que se retira algo, y hoy no hay ninguna Colección real que retirar. Con el
   * directorio versionado, `git status --porcelain corpus/` dejaría de estar vacío por un
   * hueco que todavía no le hace falta a nadie. Cuando se despublique la primera Colección
   * de verdad, el directorio entra en el repositorio con su fichero dentro.
   */
  coleccionesRetiradas: string;
  revision: string;
  /**
   * Los documentos de Fuente que produce `tools/recuperar.ts` (AD-23).
   *
   * Vive dentro de `corpus/` porque es contenido versionado, pero **no es una colección**:
   * es texto de terceros y ninguna base de `src/content.config.ts` apunta aquí, así que
   * nada de esto llega al sitio construido. Las rutas del corpus tienen un solo dueño, y
   * es este.
   *
   * La Historia 11.2 sí lo hace leer al build, aunque no como colección:
   * `integraciones/cotejo.ts` coteja el texto de cada Cita contra el cuerpo de su
   * documento antes de construir nada.
   */
  fuentes: string;
  /**
   * El censo de Citas anteriores a la v3 que todavía no tienen documento — Historia 11.2.
   *
   * Va junto a `corpus/portada.json`, que ya es metadato del Corpus y no colección.
   */
  pendientesDeCotejo: string;
  /**
   * El registro de sesiones de sembrado — Historia 11.3.
   *
   * Va junto a `corpus/portada.json` y `corpus/pendientes-de-cotejo.yml`: metadato del
   * Corpus, no colección.
   */
  sesionesDeSembrado: string;
  /**
   * La serie de indexación por familia — Historia 16.1.
   *
   * Metadato del Corpus como sus vecinos, y con el mismo aislamiento: ninguna base de
   * `src/content.config.ts` apunta aquí y **ningún módulo de `src/lib/` lo lee**, ni
   * siquiera por parámetro (AD-24). Si el sitio lo leyera, `dist/` pasaría a ser función de
   * lo que el buscador opinó ayer y dos construcciones del mismo commit dejarían de dar el
   * mismo sitio.
   */
  serieDeIndexacion: string;
  /**
   * El registro de peticiones de rastreo — Historia 18.3, FR-46.
   *
   * Metadato del Corpus como sus vecinos y con el mismo aislamiento (AD-24): ninguna base
   * de `src/content.config.ts` apunta aquí y ningún módulo de `src/lib/` lo lee. Lo que se
   * pidió rastrear es una decisión editorial sobre el sitio, nunca una entrada del sitio.
   */
  peticionesDeRastreo: string;
  /**
   * La lista de candidatos por época — Historia 19.5.
   *
   * Metadato del Corpus como sus vecinos y con el mismo aislamiento (AD-24): ninguna base de
   * `src/content.config.ts` apunta aquí y ningún módulo de `src/lib/` lo lee. La lista de
   * quién **podría** entrar en el Corpus no es contenido del sitio, y si el build la leyera,
   * `dist/` pasaría a ser función de lo que la Fuente categorizó ayer.
   */
  candidatosPorEpoca: string;
  /**
   * El registro de descartes de candidatos — Historia 19.5.
   *
   * Al lado del anterior y con el mismo aislamiento. Por qué un candidato no da Citas es una
   * decisión editorial sobre lo que **no** entra, y nada de eso se publica.
   */
  descartesDeCandidatos: string;
  /**
   * Las fijaciones de jornada de la Cita del Día — FR-9, Historia 13.1.
   *
   * Metadato del Corpus y no colección, como sus dos vecinos: vive en la raíz de `corpus/`,
   * fuera de `citas/`, `autores/` y `temas/`, y ninguna base de `src/content.config.ts`
   * apunta aquí. El sitio lo importa como JSON desde `src/pages/`, que es la excepción que
   * el propio fichero declara en su comentario.
   *
   * **No hay un segundo calendario, y esta ruta es la razón de que no lo haya.** El lote
   * fija jornadas aquí, que es donde `src/lib/citaDelDia.ts` ya las lee y donde ya tienen
   * prioridad sobre la rotación desde la v1. Componer por adelantado y componer el día
   * derivan del mismo dato, así que no hay ningún desempate que diseñar.
   */
  portada: string;
}

export function rutasDelCorpus(raizCorpus: string): Rutas {
  return {
    raiz: raizCorpus,
    citas: join(raizCorpus, 'citas'),
    autores: join(raizCorpus, 'autores'),
    temas: join(raizCorpus, 'temas'),
    colecciones: join(raizCorpus, 'colecciones'),
    coleccionesRetiradas: join(raizCorpus, '_colecciones-retiradas'),
    fuentesRetiradas: join(raizCorpus, '_fuentes-retiradas'),
    revision: join(raizCorpus, '_revision'),
    fuentes: join(raizCorpus, 'fuentes'),
    pendientesDeCotejo: join(raizCorpus, FICHERO_DEL_CENSO),
    sesionesDeSembrado: join(raizCorpus, FICHERO_DE_SESIONES),
    serieDeIndexacion: join(raizCorpus, FICHERO_DE_INDEXACION),
    peticionesDeRastreo: join(raizCorpus, FICHERO_DE_PETICIONES),
    candidatosPorEpoca: join(raizCorpus, FICHERO_DE_CANDIDATOS),
    descartesDeCandidatos: join(raizCorpus, FICHERO_DE_DESCARTES),
    portada: join(raizCorpus, FICHERO_DE_PORTADA),
  };
}

/**
 * Los ficheros de un directorio del corpus, **incluidos los de sus subdirectorios**.
 *
 * La recursión no es comodidad: es lo que hace que estas funciones enumeren exactamente
 * lo que publica `src/content.config.ts`, cuyas colecciones globan `**\/*.md` y
 * `**\/*.{yml,yaml}`. Con un `readdir` plano, una Cita en `corpus/citas/sub/` se
 * publicaba —la colección la cargaba y su página se generaba— y en cambio no la veía ni
 * el cotejo del build, ni la auditoría, ni la detección de duplicados, ni el índice de
 * slugs ocupados del alta. Era un camino de publicación que esquivaba todas las puertas.
 */
async function ficherosDe(dir: string, extensiones: string[]): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entradas = await readdir(dir, { recursive: true });
  return entradas
    .filter((e) => extensiones.includes(extname(e)))
    .map((e) => join(dir, e))
    .sort();
}

/** El slug de un Autor o Tema es el nombre de su fichero. Una sola fuente, sin duplicar. */
export function slugDeFichero(ruta: string): string {
  return basename(ruta, extname(ruta));
}

export interface AutorEnCorpus extends AutorAdmisible {
  slug: string;
  ruta: string;
  /**
   * Cómo titula la **Fuente** a este Autor, cuando no coincide con su nombre en el Corpus.
   *
   * Es un alias explícito para el cruce por época de la Historia 19.5, y nada más: no se
   * publica, no entra en el esquema de la colección de Astro —el build lo descarta, que es lo
   * que se quiere— y no interviene en ninguna puerta de admisión.
   *
   * Existe porque el cruce compara el slug derivado del título de Wikisource contra el nombre
   * del fichero, y los dos no tienen por qué coincidir: la Fuente titula «Autor:Santa Teresa
   * de Jesús» y el Corpus tiene `teresa-de-jesus.yml`. Sin el alias, el día que esa categoría
   * entre, Teresa se cuenta como pendiente estando sembrada y la época no puede terminarse
   * nunca. Se escribe a mano y no se adivina: una heurística que quitara «Santa» o «Fray»
   * fundiría a dos Autores distintos sin avisar. Ver `slugsSembrados` en `lib/epocas.ts`.
   */
  tituloEnFuente?: string;
}

export async function leerAutores(rutas: Rutas): Promise<AutorEnCorpus[]> {
  const ficheros = await ficherosDe(rutas.autores, ['.yml', '.yaml']);
  return Promise.all(
    ficheros.map(async (ruta) => ({
      // `tituloEnFuente` no está en el esquema de admisión —no es una puerta ni se publica—,
      // así que se declara aquí para que el cruce por época lo vea con tipo y no por casualidad.
      ...(parsearYaml(await readFile(ruta, 'utf8')) as AutorAdmisible & {
        tituloEnFuente?: string;
      }),
      slug: slugDeFichero(ruta),
      ruta,
    })),
  );
}

export async function leerTemas(rutas: Rutas): Promise<{ slug: string; nombre: string; ruta: string }[]> {
  const ficheros = await ficherosDe(rutas.temas, ['.yml', '.yaml']);
  return Promise.all(
    ficheros.map(async (ruta) => ({
      ...(parsearYaml(await readFile(ruta, 'utf8')) as { nombre: string }),
      slug: slugDeFichero(ruta),
      ruta,
    })),
  );
}

export interface ColeccionEnCorpus {
  /** El identificador de la Colección: ver `slugDeColeccion`. */
  slug: string;
  ruta: string;
  /**
   * `nombre` y `criterio` son opcionales **aquí y solo aquí**. El esquema del build los
   * exige; esta función existe para poder leer un corpus a medio escribir y decir qué le
   * falta, y para eso tiene que poder representar que faltan. Anunciarlos como `string`
   * con un cast sería mentir justo en el caso para el que se escribió.
   */
  nombre?: string;
  criterio?: string;
  miembros: string[];
}

/**
 * El slug de una Colección: su ruta dentro de `corpus/colecciones/`, sin extensión.
 *
 * Es **exactamente** el identificador que le da el cargador de Astro, y por eso se deriva
 * así y no con `slugDeFichero`. Las dos formas coinciden en la raíz y discrepan en cuanto
 * hay un subdirectorio: `corpus/colecciones/sub/a.yml` sería `a` por basename y `sub/a`
 * para Astro, y la herramienta y el sitio hablarían de Colecciones distintas con el mismo
 * nombre. Una sola regla, y es la del cargador.
 *
 * Que un slug con `/` no llegue nunca a existir lo garantiza la puerta del build
 * (`tools/lib/colecciones.ts`), que rechaza los subdirectorios: la URL de una Colección es
 * `/coleccion/{slug}` y una barra dentro partiría la ruta. Aquí se **describe** lo que hay
 * en el disco, incluso cuando está mal; rechazarlo es cosa de la puerta.
 */
export function slugDeColeccion(rutas: Rutas, ruta: string): string {
  const relativa = relative(rutas.colecciones, ruta).split('\\').join('/');
  return relativa.slice(0, relativa.length - extname(relativa).length);
}

/**
 * Las Colecciones del corpus, en la línea de `leerTemas` — Historia 12.2.
 *
 * Lee la **declaración**, no la pertenencia: resolverla es intersectar con el conjunto
 * publicable y de eso se ocupa `src/lib/publicado.ts` (AD-11). Aquí se leen ficheros y
 * nada más, que es lo único que esta capa hace.
 *
 * Sobrevive a un corpus a medio escribir, y de forma **uniforme**: lo que no tenga la
 * forma esperada se representa como ausente o como lista vacía, y nunca se deja pasar tal
 * cual. Un YAML que no sea un mapa —una lista, o un escalar suelto— se lee como Colección
 * sin campos: sin esa comprobación, esparcir una cadena daba un objeto con índices de
 * caracteres por claves. Lo que **sí** se rechaza aquí es un fichero que ni siquiera se
 * deja analizar, y nombrándolo: leerlo a medias daría una auditoría que miente.
 *
 * Nada de esto es tolerancia con el corpus publicado: la puerta que rechaza estas formas
 * es el esquema de `src/content.config.ts`, y las pruebas de build lo fijan. La tolerancia
 * es de la herramienta, que existe para arreglar lo que el build rechaza.
 */
/**
 * El contenido de un fichero de Colección **tal cual lo da el analizador** — Historia 12.4.
 *
 * `leerColecciones` describe una Colección con los cuatro campos que sabe nombrar, y por
 * eso descarta lo que no reconoce: es lo que necesita quien enumera. Quien va a
 * **reescribir** el fichero necesita lo contrario —el juego de claves real— porque el
 * `.strict()` del esquema existe justamente para cazar un `miembos:` mal tecleado, y un
 * objeto reconstruido de tres campos nunca se lo enseña. Sin esto, curar un fichero que el
 * build habría rechazado lo reescribía perdiendo en silencio lo que no se reconoció.
 *
 * Devuelve `unknown` a propósito: aquí no se juzga la forma, se lee. Quien juzga es el
 * esquema de admisión.
 */
export async function leerColeccionBruta(ruta: string): Promise<unknown> {
  try {
    return parsearYaml(await readFile(ruta, 'utf8'));
  } catch (fallo) {
    throw new Error(
      `${ruta} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
    );
  }
}

export async function leerColecciones(rutas: Rutas): Promise<ColeccionEnCorpus[]> {
  const ficheros = await ficherosDe(rutas.colecciones, ['.yml', '.yaml']);
  return Promise.all(
    ficheros.map(async (ruta) => {
      const leido = await leerColeccionBruta(ruta);

      const datos =
        leido !== null && typeof leido === 'object' && !Array.isArray(leido)
          ? (leido as Record<string, unknown>)
          : {};

      return {
        // Un campo ausente se omite del objeto, nunca se escribe como cadena vacía: es la
        // misma convención con la que se escriben los ficheros.
        ...(typeof datos.nombre === 'string' ? { nombre: datos.nombre } : {}),
        ...(typeof datos.criterio === 'string' ? { criterio: datos.criterio } : {}),
        miembros: Array.isArray(datos.miembros)
          ? datos.miembros.filter((m): m is string => typeof m === 'string')
          : [],
        slug: slugDeColeccion(rutas, ruta),
        ruta,
      };
    }),
  );
}

export interface CitaEnCorpus extends CitaAdmisible {
  ruta: string;
}

/** Lee las Citas de un directorio. `citas/` son las publicadas; `_revision/`, las que no. */
export async function leerCitas(directorio: string): Promise<CitaEnCorpus[]> {
  const ficheros = await ficherosDe(directorio, ['.md']);
  const leidas = await Promise.all(
    ficheros.map(async (ruta) => {
      const bruto = await readFile(ruta, 'utf8');
      let datos: Record<string, unknown> | null;
      try {
        datos = separarFrontmatter(bruto);
      } catch (fallo) {
        /*
         * Un frontmatter que no es YAML salía por la traza del analizador, sin nombrar el
         * fichero. Quien construye leía el error de una librería que no ha instalado a
         * propósito y no sabía en cuál de las mil Citas mirar. No se lee a medias: una
         * Cita que no se deja analizar no se puede cotejar ni auditar.
         */
        throw new Error(
          `${ruta} no tiene un frontmatter YAML válido: ` +
            `${fallo instanceof Error ? fallo.message : String(fallo)}`,
        );
      }
      return datos ? { ...(datos as unknown as CitaAdmisible), ruta } : null;
    }),
  );
  return leidas.filter((c): c is CitaEnCorpus => c !== null);
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function separarFrontmatter(contenido: string): Record<string, unknown> | null {
  const encontrado = FRONTMATTER.exec(contenido);
  if (!encontrado) return null;
  return parsearYaml(encontrado[1]) as Record<string, unknown>;
}

/**
 * Serializa a YAML omitiendo los campos sin valor.
 *
 * La convención del proyecto es explícita: un campo opcional ausente se omite del
 * fichero, nunca se escribe como cadena vacía ni como `null`. La distinción entre
 * Procedencia completa, parcial y ausente es de **presencia de campos**, así que un
 * `obra: ""` escrito por comodidad convertiría una procedencia parcial en una que
 * miente. El filtrado ocurre aquí, en el único sitio que escribe ficheros.
 */
export function aYaml(objeto: Record<string, unknown>, sangria = ''): string {
  let salida = '';
  for (const [clave, valor] of Object.entries(objeto)) {
    if (valor === undefined || valor === null || valor === '') continue;

    if (Array.isArray(valor)) {
      if (valor.length === 0) continue;
      salida += `${sangria}${clave}:\n`;
      for (const elemento of valor) {
        /*
         * Una lista de objetos, y no solo de escalares — Historia 16.1.
         *
         * Hasta aquí toda lista del corpus era de cadenas (miembros de Colección, temas de
         * una Cita) y un objeto dentro salía como `[object Object]`: un fichero corrupto
         * escrito en silencio. El reparto por estado de cobertura de la serie de indexación
         * es la primera lista de objetos que se escribe, así que la capacidad entra aquí, en
         * el único sitio que escribe ficheros, en vez de en un segundo serializador.
         *
         * El `- ` ocupa el sitio de los dos primeros espacios de la primera clave, igual que
         * hace el registro de sesiones al componer su entrada; las demás claves cuelgan
         * sangradas de él.
         */
        if (elemento !== null && typeof elemento === 'object' && !Array.isArray(elemento)) {
          const anidado = aYaml(elemento as Record<string, unknown>, `${sangria}    `);
          if (anidado === '') continue;
          salida += `${sangria}  -${anidado.slice(sangria.length + 3)}`;
        } else {
          salida += `${sangria}  - ${escalar(elemento)}\n`;
        }
      }
    } else if (typeof valor === 'object') {
      const anidado = aYaml(valor as Record<string, unknown>, `${sangria}  `);
      if (anidado === '') continue;
      salida += `${sangria}${clave}:\n${anidado}`;
    } else {
      salida += `${sangria}${clave}: ${escalar(valor)}\n`;
    }
  }
  return salida;
}

function escalar(valor: unknown): string {
  if (typeof valor === 'string') return JSON.stringify(valor);
  return String(valor);
}

/** Escribe una Cita como fichero markdown con el texto en el frontmatter (NFR-12). */
export async function escribirCita(
  directorio: string,
  nombreFichero: string,
  cita: Record<string, unknown>,
): Promise<string> {
  await mkdir(directorio, { recursive: true });
  const ruta = join(directorio, `${nombreFichero}.md`);
  await writeFile(ruta, `---\n${aYaml(cita)}---\n`, 'utf8');
  return ruta;
}

export async function escribirAutor(
  rutas: Rutas,
  slug: string,
  autor: Record<string, unknown>,
): Promise<string> {
  await mkdir(rutas.autores, { recursive: true });
  const ruta = join(rutas.autores, `${slug}.yml`);
  await writeFile(ruta, aYaml(autor), 'utf8');
  return ruta;
}

export async function escribirTema(
  rutas: Rutas,
  slug: string,
  tema: Record<string, unknown>,
): Promise<string> {
  await mkdir(rutas.temas, { recursive: true });
  const ruta = join(rutas.temas, `${slug}.yml`);
  await writeFile(ruta, aYaml(tema), 'utf8');
  return ruta;
}

/**
 * Escribe un fichero de Colección — Historia 12.4.
 *
 * Vuelca el fichero entero, como `escribirAutor` y `escribirTema`: es el precio de que la
 * herramienta sea comodidad y no un editor de texto, y la consecuencia que conviene saber
 * es que un comentario escrito a mano dentro del fichero no sobrevive a una asignación.
 *
 * El orden de las claves es el de la ficha —nombre, criterio, miembros— y no el de la
 * estructura que se le pase. `aYaml` omite una lista vacía, así que una Colección recién
 * creada sale sin la clave `miembros`, que es exactamente la convención del corpus: un
 * campo sin valor se omite, y el esquema ya lo lee como lista vacía.
 *
 * **Recibe la ruta, no el slug**, y no es un detalle de comodidad. Componerla aquí como
 * `{slug}.yml` daba un fichero nuevo cuando el original se llamaba `{slug}.yaml` —las dos
 * extensiones son la misma Colección para el cargador de Astro y para `slugDeColeccion`—:
 * la Colección quedaba duplicada, la orden informaba de éxito y la construcción siguiente
 * moría por la puerta de slug repetido de la Historia 12.2. Se escribe donde estaba, que es
 * lo que ya hacía bien `despublicarColeccion` moviendo el fichero que el lector devolvió.
 */
export async function escribirColeccion(
  ruta: string,
  coleccion: { nombre: string; criterio: string; miembros: string[] },
): Promise<string> {
  await mkdir(dirname(ruta), { recursive: true });
  await writeFile(
    ruta,
    aYaml({
      nombre: coleccion.nombre,
      criterio: coleccion.criterio,
      miembros: coleccion.miembros,
    }),
    'utf8',
  );
  return ruta;
}

/**
 * El fichero de portada tal cual está escrito, sin interpretar — Historia 13.1.
 *
 * Devuelve el JSON **en bruto** por el mismo motivo por el que `leerColeccionBruta`
 * devuelve el YAML en bruto: quien lo vaya a reescribir tiene que ver el juego de claves
 * real, no uno reconstruido. El fichero lleva un `_comentario` que explica su prioridad
 * sobre la rotación, y un lector que solo supiera nombrar `fijaciones` lo habría borrado
 * en la primera escritura.
 *
 * Un fichero **ausente** no es un fallo: un corpus recién hecho todavía no lo tiene, y
 * fijar la primera jornada es lo que lo crea. Un fichero ilegible sí, y se dice nombrándolo
 * en vez de devolver medio dato.
 */
export async function leerPortada(
  rutas: Rutas,
): Promise<{ ruta: string; bruto: unknown; ausente: boolean }> {
  if (!existsSync(rutas.portada)) return { ruta: rutas.portada, bruto: undefined, ausente: true };

  const crudo = await readFile(rutas.portada, 'utf8');
  try {
    return { ruta: rutas.portada, bruto: JSON.parse(crudo), ausente: false };
  } catch (fallo) {
    throw new Error(
      `${rutas.portada} no es JSON legible: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
    );
  }
}

/**
 * Vuelca el fichero de portada entero.
 *
 * **Recibe la ruta que devolvió el lector**, como `escribirColeccion` y por la misma
 * lección: componer la ruta aquí es cómo se acaba escribiendo en un fichero distinto del
 * que se leyó. Y recibe el objeto entero, con las claves que traía, para que reescribir las
 * fijaciones no se lleve por delante nada de lo demás.
 *
 * Dos espacios de sangría y salto final, que es exactamente como está escrito el fichero
 * versionado: así una escritura que no cambia nada no ensucia `git status`.
 *
 * **Se escribe a un temporal y se renombra.** `writeFile` sobre el fichero definitivo lo
 * trunca antes de escribirlo, así que una interrupción a media escritura —un Ctrl-C, un
 * disco lleno— lo deja cortado y se pierden **todas** las fijaciones, en el único sitio
 * donde viven: no hay copia en ninguna parte, solo la de git, que es de la última vez que
 * alguien acordó commitear. El renombrado dentro del mismo directorio es atómico, así que
 * quien lea el fichero lee el de antes o el de después, nunca uno a medias.
 */
export async function escribirPortada(
  ruta: string,
  contenido: Record<string, unknown>,
): Promise<string> {
  await mkdir(dirname(ruta), { recursive: true });
  const temporal = `${ruta}.escribiendo`;
  await writeFile(temporal, `${JSON.stringify(contenido, null, 2)}\n`, 'utf8');
  await rename(temporal, ruta);
  return ruta;
}

/**
 * Publicar es mover el fichero (AD-2). No existe ningún campo que cambiar.
 * Retirar una Cita es el mismo movimiento al revés — nunca un borrado.
 *
 * **Nunca sobrescribe.** `rename` sustituye el destino en silencio, y esta función es el
 * único sitio por el que se escribe en `corpus/citas/`: la aprobación por lote llegó a
 * pisar una Cita publicada cuyo slug coincidía con el de una candidata —dos Citas del
 * mismo Autor que empiezan igual generan el mismo slug— y la Cita desapareció sin decir
 * nada, con su URL sirviendo otro texto. Que el fallo salte aquí es lo que hace que la
 * próxima puerta que escriba en el corpus herede la salvaguarda sin acordarse de ella.
 */
export async function mover(origen: string, destinoDir: string): Promise<string> {
  await mkdir(destinoDir, { recursive: true });
  const destino = join(destinoDir, basename(origen));

  if (existsSync(destino)) {
    throw new Error(
      `No se mueve ${basename(origen)}: ya existe ${destino}. Resuelva el nombre antes de mover.`,
    );
  }

  await rename(origen, destino);
  return destino;
}

/**
 * El nombre de fichero que fija la espina: `{slug-autor}--{fragmento}.md`. Se deriva del
 * slug ya calculado, no del texto, para que fichero y URL no puedan divergir.
 */
export function nombreDeFicheroDeCita(slugAutor: string, slugCita: string): string {
  const fragmento = slugCita.startsWith(`${slugAutor}-`)
    ? slugCita.slice(slugAutor.length + 1)
    : slugCita;
  return `${slugAutor}--${fragmento}`;
}

/**
 * Los documentos de Fuente versionados, por nombre sin extensión — Historia 11.2.
 *
 * El valor es el **cuerpo**, nunca el fichero entero: cotejar contra el documento
 * completo dejaría pasar una Cita cuyo texto coincidiera con una línea de la ficha o de
 * la cabecera de auditoría. `null` es un fichero que ocupa el nombre y no se deja
 * analizar; no es lo mismo que faltar, y merece otro mensaje.
 */
export async function leerDocumentosDeFuente(rutas: Rutas): Promise<DocumentosDeFuente> {
  const ficheros = await ficherosDe(rutas.fuentes, ['.txt']);
  const documentos = new Map<string, string | null>();
  for (const ruta of ficheros) {
    const analizado = analizarDocumento(await readFile(ruta, 'utf8'));
    documentos.set(slugDeFichero(ruta), analizado === undefined ? null : analizado.cuerpo);
  }
  return documentos;
}

/**
 * El censo tal y como está escrito — Historia 11.6.
 *
 * Darle de baja a una Cita es borrar **una línea** de un fichero que es dos tercios
 * comentario, así que quien la borra necesita el texto literal y no la lista de slugs.
 * `undefined` cuando el fichero no está, que es lo mismo que dice `leerCensoDeCotejo`:
 * censo ausente es censo vacío, y no hay ninguna baja que dar.
 */
export async function leerCensoBruto(rutas: Rutas): Promise<string | undefined> {
  if (!existsSync(rutas.pendientesDeCotejo)) return undefined;
  return readFile(rutas.pendientesDeCotejo, 'utf8');
}

/**
 * Reescribe el censo entero, **a un temporal y renombrando**.
 *
 * La misma cautela que `escribirPortada`, y por la misma razón elevada al cuadrado: el
 * censo es el que decide qué Citas se publican sin cotejar, y `writeFile` sobre el fichero
 * definitivo lo trunca antes de escribirlo. Una interrupción a media escritura lo dejaría
 * cortado, y un censo cortado no es un censo con menos entradas: es un YAML que
 * `leerCensoDeCotejo` se niega a leer, con lo que la construcción se para sin que nadie
 * sepa por qué. El renombrado dentro del mismo directorio es atómico.
 */
export async function escribirCenso(rutas: Rutas, contenido: string): Promise<string> {
  await mkdir(dirname(rutas.pendientesDeCotejo), { recursive: true });
  const temporal = `${rutas.pendientesDeCotejo}.escribiendo`;
  await writeFile(temporal, contenido, 'utf8');
  await rename(temporal, rutas.pendientesDeCotejo);
  return rutas.pendientesDeCotejo;
}

/**
 * Los slugs del censo de pendientes de cotejo — Historia 11.2.
 *
 * Un censo ausente se lee como censo vacío, y es la lectura segura: significa «ninguna
 * Cita está exenta», así que un corpus al que le falte el fichero rompe la construcción
 * en vez de dejar pasar lo que el censo amparaba.
 */
export async function leerCensoDeCotejo(rutas: Rutas): Promise<string[]> {
  if (!existsSync(rutas.pendientesDeCotejo)) return [];

  const nombre = `corpus/${FICHERO_DEL_CENSO}`;
  const contenido = await readFile(rutas.pendientesDeCotejo, 'utf8');

  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    // Sin esto, una coma mal puesta salía por la traza del analizador de YAML, sin
    // nombrar el fichero: quien construye leía un error de una librería que no ha
    // instalado a propósito y no sabía dónde mirar.
    throw new Error(
      `${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'El censo decide qué Citas se publican sin cotejar, así que no se lee a medias.',
    );
  }

  if (leido === null || leido === undefined) return [];

  const citas = (leido as { citas?: unknown }).citas;
  if (citas === undefined || citas === null) return [];

  /*
   * Que `citas` no sea una lista **no** se puede leer como censo vacío. Una errata de
   * sangrado convertiría las 38 exenciones legítimas en 38 fallos que nadie ha causado,
   * y el mensaje hablaría de las Citas en vez de del fichero que está mal escrito.
   */
  if (!Array.isArray(citas)) {
    throw new Error(
      `${nombre}: «citas» tiene que ser una lista de slugs, y es ${typeof citas}. ` +
        'Escríbala como «citas:» y una línea «  - slug» por Cita.',
    );
  }

  const slugs: string[] = [];
  for (const [i, entrada] of citas.entries()) {
    if (typeof entrada !== 'string' || entrada.trim() === '') {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «citas» no es un slug (${JSON.stringify(entrada)}). ` +
          'Cada entrada es el slug de una Cita publicada, escrito tal cual.',
      );
    }
    slugs.push(entrada.trim());
  }

  const repetidos = slugs.filter((slug, i) => slugs.indexOf(slug) !== i);
  if (repetidos.length > 0) {
    // Un slug repetido descuadra el recuento contra el tope sin amparar nada nuevo.
    throw new Error(
      `${nombre}: «${[...new Set(repetidos)].join('», «')}» aparece más de una vez. ` +
        'Cada Cita se censa una sola vez.',
    );
  }

  return slugs;
}

// ─────────────────────────────────────────────────────────────────────────────
// El registro de sesiones de sembrado — Historia 11.3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La cabecera del registro, y su **único dueño**.
 *
 * `corpus/sesiones-de-sembrado.yml` se versiona con exactamente este texto, y una prueba
 * lo comprueba. Estuvo escrito dos veces —aquí y en el fichero— y las dos copias
 * divergieron en el primer cambio: quien leía el fichero del repositorio y quien creaba
 * uno nuevo en un corpus de pruebas aprendían reglas distintas del mismo registro.
 *
 * Que la orden sepa crearlo no es comodidad: un corpus de pruebas —o un clon al que le
 * falte el fichero— tiene que poder registrar su primera sesión sin que nadie escriba la
 * cabecera a mano, y un registro sin su razón de ser escrita arriba se toma por accesorio
 * y se deja de rellenar.
 */
export const CABECERA_DE_SESIONES = [
  '# Sesiones de sembrado — Historia 11.3',
  '#',
  '# DE AQUÍ SALE LA CADENCIA DE SEMBRADO que declara la Historia 11.4. No es un registro',
  '# accesorio ni un cuaderno de incidencias: es la única serie medida de sesiones',
  '# corridas que existe, y sin ella la cadencia que §14.3 del PRD dejó abierta se',
  '# cerraría con una estimación en vez de con sesiones contadas.',
  '#',
  '# Se escribe SOLO POR AÑADIDO: cada sesión es una entrada nueva al final y ninguna',
  '# anterior se reescribe. Lo que se apunta es la decisión de la sesión —cuándo se',
  '# corrió, qué objetivo propuso la política y de qué hueco salía— y el RESULTADO MEDIDO',
  '# del Corpus en ese momento, que la orden deriva de los ficheros y nadie teclea. De la',
  '# diferencia entre dos entradas consecutivas salen las Citas por sesión; de la serie de',
  '# `procedenciaCompleta`, si una sesión fue de las que la 11.4 considera fallidas: SM-C1',
  '# baja mientras el número de Citas sube.',
  '#',
  '#   npx tsx tools/objetivo.ts --registrar',
  '#   npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]',
  '#',
  '# CONSULTAR EL OBJETIVO NO REGISTRA NADA. `npx tsx tools/objetivo.ts` a secas propone y',
  '# calla: consultar no es sembrar, y un registro que se llenara de consultas no mediría',
  '# cadencia ninguna. La bandera es la que dice «he corrido una sesión con este objetivo».',
  '#',
  '# EL 2026-09-05 CAMBIÓ UNA MEDIDA DE NOMBRE, y por eso hay dos claves donde había una.',
  '# `tradicionLatinoamericana` se medía sobre el Corpus entero y solo la llevan las entradas',
  '# anteriores a esa fecha; desde la Historia 19.2 la medida se llama',
  '# `tradicionLatinoamericanaSobreHispanicos` y su denominador son todos los Autores menos',
  '# los de tradición `otra`. Las dos series NO son comparables término a término: bajo una',
  '# sola clave el cambio habría puesto un salto de +15 puntos en una sesión que no admitió a',
  '# nadie, y de aquí se leen justamente las diferencias entre entradas consecutivas.',
  '#',
  '# Una entrada sin `motivo` es una sesión en la que se aceptó el objetivo propuesto; con',
  '# `motivo`, una en la que el editor conservó la última palabra. Una anulación sin motivo',
  '# se rechaza con código de error: sin motivo no hay registro, solo una desviación sin',
  '# dueño.',
  '#',
  '# Este fichero es metadato del Corpus y no una colección: vive en la raíz de `corpus/`,',
  '# junto a `portada.json` y `pendientes-de-cotejo.yml`, y ninguna base de',
  '# `src/content.config.ts` apunta aquí, así que nada de esto llega al sitio construido.',
  '',
  'sesiones:',
  '',
].join('\n');

const dosCifras = (numero: number) => String(numero).padStart(2, '0');

/**
 * La jornada **local** de un momento, en formato ISO.
 *
 * No `toISOString()`: eso da UTC, y en la península cualquier sesión posterior a las
 * 22:00 quedaba fechada al día siguiente. Sobre lo único que este fichero existe para
 * medir —cada cuánto se siembra— eso no es un redondeo, es un sesgo sistemático que
 * reparte sesiones a jornadas en las que nadie sembró.
 */
export function fechaLocal(momento: Date): string {
  return `${momento.getFullYear()}-${dosCifras(momento.getMonth() + 1)}-${dosCifras(momento.getDate())}`;
}

/** La hora local, para que dos sesiones de la misma jornada queden ordenadas. */
export function horaLocal(momento: Date): string {
  return `${dosCifras(momento.getHours())}:${dosCifras(momento.getMinutes())}`;
}

/**
 * El resultado medido del Corpus en el momento de la sesión — Historia 11.4.
 *
 * Lo deriva la orden de los ficheros del Corpus; no se teclea ninguno. Un resultado que
 * se escribe a mano mide lo que quien lo escribe cree recordar, y el criterio de cierre
 * de la épica —que SM-C1 no baje mientras sube el número de Citas— se apoya justo en que
 * estas tres cifras sean comparables entre entradas.
 */
export interface ResultadoDeLaSesion {
  /** Citas publicadas en `corpus/citas/`. */
  citasPublicadas: number;
  /** Porcentaje de Citas publicadas con Procedencia completa — SM-C1. */
  procedenciaCompleta: number;
  /**
   * Porcentaje de Autores de tradición latinoamericana **sobre el Corpus entero**.
   *
   * **Nombre histórico: solo lo llevan las entradas anteriores al 2026-09-05.** Desde la v6
   * la medida se llama `tradicionLatinoamericanaSobreHispanicos` y tiene otro denominador.
   * El campo se conserva —el registro se escribe solo por añadido y las entradas viejas no se
   * reescriben— precisamente para que **el nombre identifique la medida**: dos denominadores
   * distintos bajo la misma clave habrían puesto un escalón de +15 puntos en la serie de la
   * Historia 11.4, en una sesión que no admitió a nadie, y la cabecera del registro enseña a
   * leer diferencias entre entradas consecutivas.
   */
  tradicionLatinoamericana?: number;
  /**
   * Porcentaje de Autores de tradición latinoamericana **sobre la base del suelo** — todos
   * los Autores menos los de tradición `otra`, con los que no la declaran dentro.
   *
   * Lo escriben las sesiones desde el 2026-09-05 (Historia 19.2). La serie vieja vive bajo
   * `tradicionLatinoamericana` y **no es comparable término a término** con ésta: por eso son
   * dos claves y no una, siguiendo el precedente de AD-24 para la serie hermana de
   * indexación, donde cada entrada declara sobre qué se midió.
   *
   * Ausente cuando la base está vacía: un 0 sería el artefacto de no dividir por cero, no una
   * medición.
   */
  tradicionLatinoamericanaSobreHispanicos?: number;
}

/**
 * Una sesión de sembrado corrida, con el objetivo que la política propuso.
 *
 * `elegido` y `motivo` aparecen **solo** cuando el editor anuló la propuesta. Una entrada
 * sin `motivo` es una sesión en la que el objetivo propuesto se aceptó tal cual: es la
 * diferencia entre las dos, y se lee de un vistazo sin más campos que la digan.
 *
 * `tema` y `tradicion` guardan los ejes **estructurados** que la política ya calculó, y
 * no solo la frase. Sin ellos, la Historia 11.4 tendría que analizar prosa en español
 * para saber a qué Tema se dedicó una sesión.
 */
export interface SesionDeSembrado {
  /** Cuándo se corrió. Por omisión, ahora. Se guarda en hora local, no en UTC. */
  momento?: Date;
  clase: ClaseDeObjetivo;
  propuesto: string;
  hueco: string;
  tema?: ObjetivoDeTema;
  tradicion?: ObjetivoDeTradicion;
  elegido?: string;
  motivo?: string;
  resultado: ResultadoDeLaSesion;
}

/** Una entrada ya escrita en el registro, tal y como se relee. */
export interface SesionRegistrada {
  fecha: string;
  hora?: string;
  clase: string;
  propuesto: string;
  hueco?: string;
  tema?: { slug: string; nombre: string; publicadas: number; faltan: number };
  tradicion?: { nombre: string; porcentaje?: number; suelo: number; autoresQueFaltan?: number };
  elegido?: string;
  motivo?: string;
  resultado?: ResultadoDeLaSesion;
}

/**
 * Las sesiones de un registro ya leído, comprobando que el fichero sea lo que dice ser.
 *
 * Nada de esto es paranoia: un registro vacío, o al que le falte la clave `sesiones:`,
 * deja que `appendFile` escriba una lista huérfana al final del fichero. El YAML sigue
 * siendo válido, todo lector ve **cero** sesiones, y la serie de la que la Historia 11.4
 * saca la cadencia desaparece sin que nada se queje.
 */
function analizarRegistro(nombre: string, contenido: string): SesionRegistrada[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De este registro sale la cadencia de sembrado, así que no se lee a medias.',
    );
  }

  if (leido === null || leido === undefined || typeof leido !== 'object' || Array.isArray(leido)) {
    throw new Error(
      `${nombre}: falta la clave «sesiones:» en la raíz del fichero. Añadir una sesión a ` +
        'un fichero vacío o sin esa clave dejaría una lista huérfana que ningún lector ' +
        'cuenta. Restaure la cabecera del registro y vuelva a intentarlo.',
    );
  }

  if (!('sesiones' in leido)) {
    throw new Error(
      `${nombre}: falta la clave «sesiones:» en la raíz del fichero. Las entradas cuelgan ` +
        'de ella; sin la clave, lo que se añada no lo cuenta nadie.',
    );
  }

  const sesiones = (leido as { sesiones: unknown }).sesiones;
  if (sesiones === null || sesiones === undefined) return [];

  if (!Array.isArray(sesiones)) {
    throw new Error(
      `${nombre}: «sesiones» tiene que ser una lista de sesiones, y es ${typeof sesiones}. ` +
        'Escríbala como «sesiones:» y una entrada «  - fecha: …» por sesión.',
    );
  }

  for (const [i, entrada] of sesiones.entries()) {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «sesiones» no es una sesión ` +
          `(${JSON.stringify(entrada)}). Cada entrada lleva al menos fecha, clase y el ` +
          'objetivo propuesto.',
      );
    }
  }

  return sesiones as SesionRegistrada[];
}

/**
 * Las sesiones ya registradas. Un registro que no existe se lee como registro vacío.
 *
 * Lo consume la propia orden para no anotar dos veces la misma sesión, y lo consumirá la
 * Historia 11.4 para derivar la cadencia.
 */
export async function leerSesionesDeSembrado(rutas: Rutas): Promise<SesionRegistrada[]> {
  if (!existsSync(rutas.sesionesDeSembrado)) return [];
  return analizarRegistro(
    `corpus/${FICHERO_DE_SESIONES}`,
    await readFile(rutas.sesionesDeSembrado, 'utf8'),
  );
}

/**
 * Añade una sesión al registro. **Solo añade**: nunca reescribe lo que ya está.
 *
 * Se escribe con `appendFile` y no releyendo y volviendo a volcar el fichero a propósito.
 * Un volcado convertiría el registro en algo que se puede reordenar, reescribir o perder
 * en un fallo a medio camino, y lo que hace útil a este fichero para la Historia 11.4 es
 * justamente que las entradas viejas no se tocan. De paso conserva los comentarios, que
 * ningún serializador de YAML preserva.
 *
 * Lo que sí se hace antes de escribir es **comprobar el resultado en memoria**: se
 * compone el fichero que quedaría, se analiza, y solo si la lista crece exactamente en la
 * sesión nueva se añaden esos bytes al final. Así ningún fallo de forma llega al disco.
 */
export async function registrarSesionDeSembrado(
  rutas: Rutas,
  sesion: SesionDeSembrado,
): Promise<string> {
  const ruta = rutas.sesionesDeSembrado;
  const nombre = `corpus/${FICHERO_DE_SESIONES}`;

  if (!existsSync(ruta)) {
    await mkdir(rutas.raiz, { recursive: true });
    try {
      // `wx` falla si el fichero apareció entretanto, en vez de truncar lo que otra
      // ejecución acabara de añadir. `writeFile` a secas sí lo truncaba.
      await writeFile(ruta, CABECERA_DE_SESIONES, { encoding: 'utf8', flag: 'wx' });
    } catch (fallo) {
      if ((fallo as NodeJS.ErrnoException).code !== 'EEXIST') throw fallo;
    }
  }

  const anterior = await readFile(ruta, 'utf8');
  const cuantasHabia = analizarRegistro(nombre, anterior).length;

  const momento = sesion.momento ?? new Date();
  const entrada: Record<string, unknown> = {
    fecha: fechaLocal(momento),
    hora: horaLocal(momento),
    clase: sesion.clase,
    propuesto: sesion.propuesto,
    hueco: sesion.hueco,
    tema: sesion.tema,
    tradicion: sesion.tradicion,
    elegido: sesion.elegido,
    motivo: sesion.motivo,
    resultado: { ...sesion.resultado },
  };

  // `- ` ocupa el sitio de los dos primeros espacios de la primera clave: la entrada es un
  // elemento de la lista `sesiones` y el resto de sus claves cuelgan sangradas de él.
  const claves = aYaml(entrada, '    ');
  const bloque = `  -${claves.slice(3)}`;

  const salto = anterior === '' || anterior.endsWith('\n') ? '' : '\n';
  const añadido = `${salto}${bloque}`;

  const quedaria = analizarRegistro(nombre, `${anterior}${añadido}`);
  if (quedaria.length !== cuantasHabia + 1) {
    throw new Error(
      `${nombre}: añadir la sesión al final no la deja colgando de «sesiones:» ` +
        `(había ${cuantasHabia} y quedarían ${quedaria.length}). El registro se escribe ` +
        'solo por añadido, así que la lista tiene que ser lo último del fichero. No se ha ' +
        'escrito nada.',
    );
  }

  await appendFile(ruta, añadido, 'utf8');
  return ruta;
}

/**
 * La cabecera de la serie de indexación — Historia 16.1.
 *
 * Va aquí y no solo en el fichero del repositorio por lo mismo que la de sesiones: un
 * corpus de pruebas, o un clon al que le falte el fichero, tiene que poder anotar su
 * primera lectura sin que nadie escriba la cabecera a mano.
 *
 * Y dice lo que la diferencia de su vecina, que es lo único que hay que saber para no
 * confundirlas: aquélla **añade** porque mide hechos acumulables —sesiones corridas—, y
 * ésta **reemplaza** porque mide un estado.
 */
export const CABECERA_DE_INDEXACION = [
  '# Serie de indexación por familia — Historia 16.1, Épica 16',
  '#',
  '# QUÉ MIDE. Cuántas de las URL publicadas de cada familia —Cita, Autor, Tema,',
  '# Colección— dice el buscador que tiene indexadas. Es el instrumento de la Épica 16: sin',
  '# esta serie no se sabe si el remedio de la 16.2 o el de la 16.3 sirvieron de algo, y la',
  '# pregunta que abre la épica —por qué el buscador descarta lo que descarta— SOLO se',
  '# contesta comparando el reparto POR FAMILIA a lo largo del tiempo. El total engaña: el',
  '# remedio no es el mismo para las páginas de una frase que para las de agregación.',
  '#',
  '# La cifra que se compara con la meta de indexación es la de la familia CITA, nunca el',
  '# agregado del sitio.',
  '#',
  '# JUNTO AL RECUENTO VA EL DIAGNÓSTICO. `estados` reparte la muestra de cada familia por el',
  '# estado de cobertura que declara el buscador, y es lo que distingue «Descubierta,',
  '# actualmente sin indexar» —ni siquiera ha pasado— de «Rastreada, actualmente sin indexar»',
  '# —pasó y la descartó—. Las dos suman al mismo `noIndexadas` y piden remedios distintos.',
  '#',
  '# DE DÓNDE SALE. De la API de inspección de URL de Search Console, una URL por petición,',
  '# con techo de 2.000 al día y 600 por minuto por propiedad. No hay informe de cobertura',
  '# que pedir: por eso se compone URL a URL y por eso, en cuanto el sitio pase de ~2.000',
  '# páginas, la lectura será por MUESTRA. El tamaño de muestra va escrito en cada familia',
  '# de cada entrada, para que una comparación entre jornadas sepa qué compara. El dato es',
  '# el del último rastreo del buscador y no el de ahora: esta serie mide CON RETARDO.',
  '#',
  '#   npx tsx tools/indexacion.ts              # consulta e informa. NO escribe nada.',
  '#   npx tsx tools/indexacion.ts --registrar  # además anota la entrada de hoy.',
  '#',
  '# POR QUÉ REEMPLAZA EN VEZ DE AÑADIR, a diferencia de sesiones-de-sembrado.yml. Esto',
  '# mide un ESTADO, no una sesión: es idempotente por fecha, y una segunda lectura de la',
  '# misma jornada sustituye a la primera en vez de sumarse. Su vecina mide hechos',
  '# acumulables —sesiones corridas— y por eso solo añade; dos lecturas del mismo día no',
  '# son dos estados, son la misma pregunta hecha dos veces.',
  '#',
  '# Y lo mismo la separa de peticiones-de-rastreo.yml (Historia 18.3), que está justo al',
  '# lado: aquél registra ACTOS —qué URL se pidió rastrear y qué día— y por eso SOLO AÑADE,',
  '# porque pedir la misma URL dos días son dos peticiones. Ésta mide un estado y reemplaza.',
  '# Cruzar los dos es lo que dice si una familia se movió porque se pidió o porque le tocaba.',
  '#',
  '# AUSENCIA ANTES QUE CERO. Una familia cuya lectura no se logró SE OMITE de `familias` y',
  '# aparece en `sinLeer` con su motivo. Jamás se escribe cero: el fallo de esa API es',
  '# parcial —cuota agotada, espera vencida— y el cero real es casi el estado de partida, así',
  '# que un cero fabricado sería indistinguible del cero de verdad.',
  '#',
  '# Este fichero es metadato del Corpus y no una colección: vive en la raíz de `corpus/`,',
  '# junto a `portada.json` y `sesiones-de-sembrado.yml`, y ninguna base de',
  '# `src/content.config.ts` apunta aquí. Además NINGÚN módulo de `src/lib/` lo lee, ni',
  '# siquiera por parámetro (AD-24): si el sitio lo leyera, dos construcciones del mismo',
  '# commit dejarían de dar el mismo `dist/`.',
  '',
  'lecturas:',
  '',
].join('\n');

/** La clave de la que cuelgan las entradas. Se comprueba antes de reescribir el fichero. */
const CLAVE_DE_LECTURAS = 'lecturas';

/** Una entrada ya escrita en la serie, tal y como se relee. */
export interface LecturaRegistrada {
  fecha: string;
  hora?: string;
  propiedad: string;
  publicadas: number;
  inspeccionadas: number;
  /**
   * Solo las familias **leídas**. Una que no se leyó no tiene clave aquí.
   *
   * `estados` es opcional al releer y obligatorio al escribir, y la asimetría es
   * deliberada: una entrada anterior al reparto por estado de cobertura sigue siendo una
   * lectura válida y comparable en lo que sí trae, y romper al leerla convertiría una
   * mejora del formato en una serie ilegible.
   */
  familias?: Record<string, Omit<LecturaDeFamilia, 'estados'> & { estados?: RepartoDeEstado[] }>;
  /** Solo las que no se leyeron, con su motivo. Ausente cuando se leyeron todas. */
  sinLeer?: Record<string, string>;
}

/**
 * Las entradas de una serie ya leída, comprobando que el fichero sea lo que dice ser.
 *
 * Es la misma comprobación que la del registro de sesiones y por el mismo motivo, con una
 * agravante: este escritor **reescribe** el fichero entero en vez de añadir al final. Leer
 * mal lo que había no dejaría una lista huérfana, que es reparable — dejaría la serie
 * anterior fuera del fichero nuevo. Nada se escribe hasta que esto entiende lo que hay.
 */
function analizarSerie(nombre: string, contenido: string): LecturaRegistrada[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De esta serie sale la comparación por familia entre jornadas, y una lectura nueva ' +
        'reescribe el fichero: no se lee a medias.',
    );
  }

  if (leido === null || leido === undefined || typeof leido !== 'object' || Array.isArray(leido)) {
    throw new Error(
      `${nombre}: falta la clave «${CLAVE_DE_LECTURAS}:» en la raíz del fichero. Las entradas ` +
        'cuelgan de ella; sin la clave, no hay serie que reemplazar ni que comparar. ' +
        'Restaure la cabecera y vuelva a intentarlo.',
    );
  }

  if (!(CLAVE_DE_LECTURAS in leido)) {
    throw new Error(
      `${nombre}: falta la clave «${CLAVE_DE_LECTURAS}:» en la raíz del fichero. Las entradas ` +
        'cuelgan de ella; sin la clave, lo que se escriba no lo cuenta nadie.',
    );
  }

  const lecturas = (leido as Record<string, unknown>)[CLAVE_DE_LECTURAS];
  if (lecturas === null || lecturas === undefined) return [];

  if (!Array.isArray(lecturas)) {
    throw new Error(
      `${nombre}: «${CLAVE_DE_LECTURAS}» tiene que ser una lista de lecturas, y es ` +
        `${typeof lecturas}. Escríbala como «${CLAVE_DE_LECTURAS}:» y una entrada ` +
        '«  - fecha: …» por jornada.',
    );
  }

  for (const [i, entrada] of lecturas.entries()) {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_LECTURAS}» no es una lectura ` +
          `(${JSON.stringify(entrada)}). Cada entrada lleva al menos fecha y propiedad.`,
      );
    }
    if (typeof (entrada as Record<string, unknown>).fecha !== 'string') {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_LECTURAS}» no declara «fecha». La ` +
          'serie es idempotente por fecha, así que sin ella no se sabe a cuál de las ' +
          'entradas sustituye una lectura nueva.',
      );
    }
  }

  return lecturas as LecturaRegistrada[];
}

/**
 * La serie ya registrada. Una serie que no existe se lee como serie vacía.
 *
 * La consumen la propia orden —para saber a qué entrada reemplaza— y quien compare dos
 * jornadas. Una familia que no se leyó **no aparece** en `familias`: eso es lo que hay que
 * leer como «no se sabe», y nunca como cero.
 */
export async function leerSerieDeIndexacion(rutas: Rutas): Promise<LecturaRegistrada[]> {
  if (!existsSync(rutas.serieDeIndexacion)) return [];
  return analizarSerie(
    `corpus/${FICHERO_DE_INDEXACION}`,
    await readFile(rutas.serieDeIndexacion, 'utf8'),
  );
}

/** Una entrada, serializada como elemento de la lista `lecturas`. */
function bloqueDeLectura(entrada: Record<string, unknown>): string {
  // `- ` ocupa el sitio de los dos primeros espacios de la primera clave, igual que en el
  // registro de sesiones: la entrada es un elemento de la lista y sus claves cuelgan de él.
  return `  -${aYaml(entrada, '    ').slice(3)}`;
}

/**
 * Anota la lectura de hoy, **reemplazando** la que ya hubiera de la misma jornada.
 *
 * A diferencia de `registrarSesionDeSembrado`, que solo añade, esto reescribe el fichero:
 * la serie mide un estado y dos lecturas del mismo día no son dos estados. La consecuencia
 * que conviene saber es que **un comentario escrito a mano entre las entradas no
 * sobrevive** — como en los ficheros de Colección, que también se vuelcan enteros. Lo que
 * sí sobrevive es la cabecera: se conserva **el texto que el fichero tenga** por encima de
 * «lecturas:», no la constante de arriba, para que una nota añadida allí no se pierda.
 *
 * Se compone el fichero entero en memoria, se analiza, y solo si contiene exactamente las
 * entradas que debe se toca el disco. La escritura es a un temporal y un `rename`, que en
 * el mismo sistema de ficheros es atómico: un fallo a media escritura no puede dejar la
 * serie truncada, que es el riesgo nuevo de reescribir en vez de añadir.
 */
export async function registrarLecturaDeIndexacion(
  rutas: Rutas,
  lectura: LecturaDeIndexacion,
): Promise<string> {
  const ruta = rutas.serieDeIndexacion;
  const nombre = `corpus/${FICHERO_DE_INDEXACION}`;

  if (!existsSync(ruta)) {
    await mkdir(rutas.raiz, { recursive: true });
    try {
      // `wx` por lo mismo que en el registro de sesiones: si el fichero apareció
      // entretanto, se falla en vez de truncar lo que otra ejecución acabara de escribir.
      await writeFile(ruta, CABECERA_DE_INDEXACION, { encoding: 'utf8', flag: 'wx' });
    } catch (fallo) {
      if ((fallo as NodeJS.ErrnoException).code !== 'EEXIST') throw fallo;
    }
  }

  const anterior = await readFile(ruta, 'utf8');
  const habia = analizarSerie(nombre, anterior);

  const momento = lectura.momento ?? new Date();
  const fecha = fechaLocal(momento);

  /*
   * La cabecera es lo que hay por encima de la línea «lecturas:», ella incluida. Se busca
   * al principio de línea y sin sangrar: «  lecturas:» dentro de una entrada no es la clave
   * de la raíz, y cortar por ahí habría partido el fichero por la mitad.
   */
  const marca = anterior.match(/^lecturas:[^\S\n]*$/m);
  if (marca?.index === undefined) {
    throw new Error(
      `${nombre}: no se encuentra la línea «${CLAVE_DE_LECTURAS}:» de la que cuelgan las ` +
        'entradas. La serie se reescribe entera en cada lectura y esa línea es la frontera ' +
        'entre la cabecera —que se conserva— y las entradas —que se vuelven a volcar—. ' +
        'No se ha escrito nada.',
    );
  }
  const cabecera = anterior.slice(0, marca.index + marca[0].length) + '\n';

  const conservadas = habia.filter((entrada) => entrada.fecha !== fecha);
  const nueva: Record<string, unknown> = {
    fecha,
    hora: horaLocal(momento),
    propiedad: lectura.propiedad,
    publicadas: lectura.publicadas,
    inspeccionadas: lectura.inspeccionadas,
    familias: lectura.familias,
    // `aYaml` omite un objeto sin claves, así que una lectura sin fallos no escribe
    // «sinLeer» en absoluto: la ausencia de la clave es «se leyeron todas».
    sinLeer: lectura.sinLeer,
  };

  const contenido =
    cabecera +
    [...conservadas.map((e) => bloqueDeLectura(e as unknown as Record<string, unknown>)),
      bloqueDeLectura(nueva),
    ].join('');

  const quedaria = analizarSerie(nombre, contenido);
  if (quedaria.length !== conservadas.length + 1) {
    throw new Error(
      `${nombre}: la serie recompuesta no tiene las entradas que debería ` +
        `(había ${habia.length}, se conservan ${conservadas.length} y quedarían ` +
        `${quedaria.length}). No se ha escrito nada.`,
    );
  }
  const deLaJornada = quedaria.filter((e) => e.fecha === fecha);
  if (deLaJornada.length !== 1) {
    throw new Error(
      `${nombre}: la jornada ${fecha} quedaría con ${deLaJornada.length} entradas y esta ` +
        'serie es idempotente por fecha. No se ha escrito nada.',
    );
  }

  /*
   * «Ausencia antes que cero», reafirmada sobre **lo que va a disco** y no solo sobre lo que
   * se compuso en memoria.
   *
   * `componerLectura` ya vigila la entrada en memoria, pero entre ella y el fichero está
   * `aYaml`, que omite lo que no tiene valor: una familia cuyo objeto quedara vacío, o un
   * motivo que llegara en blanco, desaparecería aquí de las dos listas y la entrada diría en
   * silencio que esa familia no existe. Se comprueba releyendo lo escrito, que es el único
   * sitio donde esa pérdida se ve.
   */
  const escrita = deLaJornada[0];
  const familiasEnDisco = Object.keys(escrita.familias ?? {});
  const sinLeerEnDisco = Object.keys(escrita.sinLeer ?? {});

  for (const familia of Object.keys(lectura.familias)) {
    if (!familiasEnDisco.includes(familia)) {
      throw new Error(
        `${nombre}: la familia «${familia}» se leyó y no ha llegado al fichero. Una familia ` +
          'que desaparece sin decirlo se lee después como si no existiera. No se ha escrito nada.',
      );
    }
  }
  for (const familia of Object.keys(lectura.sinLeer)) {
    if (!sinLeerEnDisco.includes(familia)) {
      throw new Error(
        `${nombre}: la familia «${familia}» no se leyó y su motivo no ha llegado al fichero. ` +
          'Sin motivo escrito, su ausencia es indistinguible de que no exista. No se ha ' +
          'escrito nada.',
      );
    }
  }
  const enAmbas = familiasEnDisco.filter((familia) => sinLeerEnDisco.includes(familia));
  if (enAmbas.length > 0) {
    throw new Error(
      `${nombre}: ${enAmbas.join(', ')} quedaría a la vez como leída y como sin leer. ` +
        'No se ha escrito nada.',
    );
  }

  /*
   * El temporal lleva el PID. Con un nombre fijo, dos ejecuciones a la vez se pisaban el
   * fichero intermedio, y el que muriera entre el volcado y el `rename` dejaba un
   * `serie-de-indexacion.yml.nueva` huérfano que nadie sigue — y que el criterio de la
   * historia, un `git status --short` limpio, no perdona. El patrón está en `.gitignore`
   * por si aun así queda uno.
   */
  const temporal = `${ruta}.${process.pid}.nueva`;
  await writeFile(temporal, contenido, 'utf8');
  await rename(temporal, ruta);
  return ruta;
}

/**
 * La cabecera del registro de peticiones de rastreo — Historia 18.3.
 *
 * Va aquí y no solo en el fichero del repositorio por lo mismo que las otras dos: un corpus
 * de pruebas, o un clon al que le falte el fichero, tiene que poder anotar su primera
 * petición sin que nadie escriba la cabecera a mano.
 *
 * Y dice **por qué añade en vez de reemplazar**, que es lo único que hay que saber para no
 * confundirlo con su vecina. Están uno al lado del otro en `corpus/` y la confusión sería
 * silenciosa: quien tomara éste por idempotente creería que la segunda petición de una URL
 * sustituye a la primera, y quien tomara aquélla por acumulable creería que la serie perdió
 * entradas.
 */
export const CABECERA_DE_PETICIONES = [
  '# Peticiones de rastreo — Historia 18.3, Épica 18, FR-46',
  '#',
  '# QUÉ REGISTRA. Qué URL se pidió rastrear y qué día. Nada más: con la URL y la fecha se',
  '# cruza con corpus/serie-de-indexacion.yml, que es para lo único que existe. Cuando la',
  '# serie muestre movimiento en una familia, esto es lo que dirá si esas URL entraron',
  '# PORQUE SE PIDIERON o porque les tocaba — y eso es lo que decide si pedir rastreo sirve',
  '# de algo o es teatro.',
  '#',
  '# POR QUÉ AÑADE EN VEZ DE REEMPLAZAR, al revés que serie-de-indexacion.yml. Su vecina',
  '# mide un ESTADO —cuántas URL están indexadas hoy— y por eso es idempotente por fecha:',
  '# una segunda lectura de la misma jornada sustituye a la primera. Esto registra ACTOS.',
  '# Pedir rastreo de la misma URL dos días son DOS PETICIONES, y borrar la primera perdería',
  '# justo el dato de si repetir sirve. Solo se añade al final; ninguna entrada anterior se',
  '# reescribe.',
  '#',
  '# LA PIDE UNA PERSONA; ESTO SOLO LA ANOTA. La solicitud se cursa a mano en Search',
  '# Console: la API de inspección informa y no solicita, y la Indexing API solo admite',
  '# ofertas de empleo y retransmisiones en directo. No hay vía legítima de automatizarla, y',
  '# si algún día la hay es una decisión de producto y no de implementación.',
  '#',
  '# LA DECENA, NO EL MILLAR. La selección es corta y deliberada: §4.17 declara que pedir',
  '# rastreo de 1.715 URL no es una petición, es ruido. La orden se niega a anotar un lote',
  '# que no quepa en una decena, y se niega a anotar una URL que el sitio no publique.',
  '#',
  '#   npx tsx tools/rastreo.ts                              # lista lo pedido. NO escribe.',
  '#   npx tsx tools/rastreo.ts --registrar <url> [<url>...] # anota lo que ya se pidió.',
  '#',
  '# SE ANOTA LA RUTA Y NO LA URL ENTERA. El dominio tiene un solo dueño —src/lib/dominio.ts,',
  '# que lo lee de public/CNAME— y repetirlo en cada línea sería un segundo sitio donde',
  '# quedarse apuntando al dominio anterior. La orden acepta la URL entera al teclearla.',
  '#',
  '# Este fichero es metadato del Corpus y no una colección: vive en la raíz de `corpus/`,',
  '# junto a `portada.json` y `serie-de-indexacion.yml`, y ninguna base de',
  '# `src/content.config.ts` apunta aquí. Ningún módulo de `src/lib/` lo lee (AD-24).',
  '',
  'peticiones:',
  '',
].join('\n');

/** La clave de la que cuelgan las entradas. Se comprueba antes de añadir nada. */
const CLAVE_DE_PETICIONES = 'peticiones';

/** Una petición ya escrita en el registro, tal y como se relee. */
export interface PeticionRegistrada {
  fecha: string;
  ruta: string;
}

/**
 * Las peticiones de un registro ya leído, comprobando que el fichero sea lo que dice ser.
 *
 * La misma comprobación que la del registro de sesiones y por el mismo motivo: un fichero
 * vacío, o al que le falte la clave `peticiones:`, deja que `appendFile` escriba una lista
 * huérfana al final. El YAML sigue siendo válido, todo lector ve **cero** peticiones, y el
 * registro con el que se iba a cruzar la serie desaparece sin que nada se queje.
 */
function analizarPeticiones(nombre: string, contenido: string): PeticionRegistrada[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De este registro sale la distinción entre lo que el buscador rastreó porque se le ' +
        'pidió y lo que rastreó solo, así que no se lee a medias.',
    );
  }

  if (leido === null || leido === undefined || typeof leido !== 'object' || Array.isArray(leido)) {
    throw new Error(
      `${nombre}: falta la clave «${CLAVE_DE_PETICIONES}:» en la raíz del fichero. Añadir una ` +
        'petición a un fichero vacío o sin esa clave dejaría una lista huérfana que ningún ' +
        'lector cuenta. Restaure la cabecera del registro y vuelva a intentarlo.',
    );
  }

  if (!(CLAVE_DE_PETICIONES in leido)) {
    throw new Error(
      `${nombre}: falta la clave «${CLAVE_DE_PETICIONES}:» en la raíz del fichero. Las ` +
        'entradas cuelgan de ella; sin la clave, lo que se añada no lo cuenta nadie.',
    );
  }

  const peticiones = (leido as Record<string, unknown>)[CLAVE_DE_PETICIONES];
  if (peticiones === null || peticiones === undefined) return [];

  if (!Array.isArray(peticiones)) {
    throw new Error(
      `${nombre}: «${CLAVE_DE_PETICIONES}» tiene que ser una lista de peticiones, y es ` +
        `${typeof peticiones}. Escríbala como «${CLAVE_DE_PETICIONES}:» y una entrada ` +
        '«  - fecha: …» por petición.',
    );
  }

  for (const [i, entrada] of peticiones.entries()) {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_PETICIONES}» no es una petición ` +
          `(${JSON.stringify(entrada)}). Cada entrada lleva su fecha y su ruta, que es todo ` +
          'lo que hace falta para cruzarla con la serie.',
      );
    }
    for (const clave of ['fecha', 'ruta']) {
      if (typeof (entrada as Record<string, unknown>)[clave] !== 'string') {
        throw new Error(
          `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_PETICIONES}» no declara «${clave}». ` +
            'Una petición sin las dos cosas no se puede cruzar con nada, que es lo único ' +
            'para lo que este registro existe.',
        );
      }
    }
  }

  return peticiones as PeticionRegistrada[];
}

/**
 * Las peticiones ya registradas. Un registro que no existe se lee como registro vacío.
 *
 * Lo consumen la propia orden —para listar lo pedido sin escribir nada— y quien cruce el
 * registro con la serie de indexación.
 */
export async function leerPeticionesDeRastreo(rutas: Rutas): Promise<PeticionRegistrada[]> {
  if (!existsSync(rutas.peticionesDeRastreo)) return [];
  return analizarPeticiones(
    `corpus/${FICHERO_DE_PETICIONES}`,
    await readFile(rutas.peticionesDeRastreo, 'utf8'),
  );
}

/**
 * Añade peticiones al registro. **Solo añade**: nunca reescribe lo que ya está.
 *
 * Sigue punto por punto a `registrarSesionDeSembrado`, que es el precedente de una serie
 * append-only en este proyecto: se crea con `wx` para no truncar lo que otra ejecución
 * acabara de escribir, se lee antes de escribir, se compone en memoria el fichero que
 * quedaría, se analiza, y solo si la lista crece exactamente en lo añadido se tocan esos
 * bytes del final. Así ningún fallo de forma llega al disco.
 *
 * Es lo contrario de `registrarLecturaDeIndexacion`, que reescribe el fichero entero: aquél
 * mide un estado y éste registra actos. La consecuencia buena de solo añadir es que las
 * entradas viejas no se pueden perder en un fallo a media escritura, y que los comentarios
 * escritos a mano sobreviven — ningún serializador de YAML los preserva.
 *
 * Un lote vacío no escribe nada y no es un error: quien valida la selección es
 * `tools/lib/rastreo.ts`, y llegar aquí sin peticiones significa que no había ninguna que
 * anotar.
 */
export async function registrarPeticionesDeRastreo(
  rutas: Rutas,
  peticiones: readonly PeticionDeRastreo[],
): Promise<string> {
  const ruta = rutas.peticionesDeRastreo;
  const nombre = `corpus/${FICHERO_DE_PETICIONES}`;

  /*
   * Antes de tocar el disco, y no después: con el `wx` por delante, un lote vacío creaba el
   * fichero con su cabecera y cero peticiones, que es exactamente lo contrario de «un lote
   * vacío no escribe nada». Dejaba en `corpus/` un registro que nadie pidió y que un
   * `git status` presenta como trabajo de la jornada.
   */
  if (peticiones.length === 0) return ruta;

  if (!existsSync(ruta)) {
    await mkdir(rutas.raiz, { recursive: true });
    try {
      // `wx` falla si el fichero apareció entretanto, en vez de truncar lo que otra
      // ejecución acabara de añadir.
      await writeFile(ruta, CABECERA_DE_PETICIONES, { encoding: 'utf8', flag: 'wx' });
    } catch (fallo) {
      if ((fallo as NodeJS.ErrnoException).code !== 'EEXIST') throw fallo;
    }
  }

  const anterior = await readFile(ruta, 'utf8');
  const cuantasHabia = analizarPeticiones(nombre, anterior).length;

  // `- ` ocupa el sitio de los dos primeros espacios de la primera clave: cada entrada es un
  // elemento de la lista `peticiones` y el resto de sus claves cuelgan sangradas de él.
  const bloques = peticiones
    .map((peticion) => `  -${aYaml({ fecha: peticion.fecha, ruta: peticion.ruta }, '    ').slice(3)}`)
    .join('');

  const salto = anterior === '' || anterior.endsWith('\n') ? '' : '\n';
  const añadido = `${salto}${bloques}`;

  const quedaria = analizarPeticiones(nombre, `${anterior}${añadido}`);
  if (quedaria.length !== cuantasHabia + peticiones.length) {
    throw new Error(
      `${nombre}: añadir al final no deja las peticiones colgando de ` +
        `«${CLAVE_DE_PETICIONES}:» (había ${cuantasHabia}, se añaden ${peticiones.length} y ` +
        `quedarían ${quedaria.length}). El registro se escribe solo por añadido, así que la ` +
        'lista tiene que ser lo último del fichero. No se ha escrito nada.',
    );
  }

  await appendFile(ruta, añadido, 'utf8');
  return ruta;
}

/**
 * La cabecera de la lista de candidatos por época — Historia 19.5.
 *
 * Va aquí y no solo en el fichero del repositorio por lo mismo que las otras tres: un corpus
 * de pruebas, o un clon al que le falte el fichero, tiene que poder recuperar su primera
 * época sin que nadie escriba la cabecera a mano.
 *
 * Y lo primero que dice es lo único que hay que saber antes de tocarlo: **se regenera, no se
 * edita**.
 */
export const CABECERA_DE_CANDIDATOS = [
  '# Candidatos por época — Historia 19.5, Épica 19',
  '#',
  '# SE REGENERA, NO SE EDITA. Esta lista NO es un catálogo del proyecto: es lo que las',
  '# categorías de Wikisource-es contestan cuando se les pregunta. Un nombre añadido a mano',
  '# aquí desaparece en la siguiente recuperación, y uno borrado a mano vuelve. Para que un',
  '# candidato deje de proponerse se DESCARTA CON MOTIVO, que es el fichero de al lado.',
  '#',
  '#   npx tsx tools/epocas.ts                # recupera, cruza contra el Corpus e informa.',
  '#   npx tsx tools/epocas.ts --registrar    # además versiona la lista recuperada.',
  '#',
  '# DE DÓNDE SALE. De `list=categorymembers` sobre las categorías con las que la propia',
  '# Fuente clasifica a sus autores por época. La lista se deriva y no se escribe porque una',
  '# lista escrita se queda vieja en cuanto la Fuente crece, y nadie la mantiene: derivándola,',
  '# crecer la Fuente crece el plan.',
  '#',
  '# QUÉ ES `dominioPublico`. Que la Fuente clasifica a ese autor en DP-Autores-100, o sea',
  '# muerto hace más de cien años. Es SEÑAL Y NO PERMISO: entra en el informe y jamás en una',
  '# puerta automática. Admitir sigue siendo del editor, y la puerta de admisión no se mueve',
  '# —dominio público, año de fallecimiento, Procedencia y cotejo siguen exactamente igual—.',
  '# Quien no la lleva se mira A MANO; no se admite solo.',
  '#',
  '# LAS ÉPOCAS SE SOLAPAN A PROPÓSITO. La Antigüedad contiene a Grecia y a Roma, y un autor',
  '# cuenta en cada época en la que la Fuente lo clasificó. Fundirlas en un conjunto único',
  '# borraría lo que se quiere medir, que es la cobertura POR ÉPOCA hasta agotarla.',
  '#',
  '# UNA ÉPOCA QUE NO SE PUDO RECUPERAR CONSERVA SU ENTRADA ANTERIOR. La red se cae y el',
  '# bucle no: se trabaja con lo versionado y la orden dice que no se actualizó. Por eso',
  '# `recuperada` va en cada época y no en la raíz del fichero.',
  '#',
  '# Este fichero es metadato del Corpus y no una colección: vive en la raíz de `corpus/`,',
  '# junto a `portada.json` y `serie-de-indexacion.yml`, y ninguna base de',
  '# `src/content.config.ts` apunta aquí. Además NINGÚN módulo de `src/lib/` lo lee (AD-24):',
  '# quién PODRÍA entrar en el Corpus no es contenido del sitio.',
  '',
  'epocas:',
  '',
].join('\n');

/**
 * La cabecera del registro de descartes — Historia 19.5.
 *
 * Dice **por qué añade en vez de reemplazar**, que es lo único que hay que saber para no
 * confundirlo con su vecino, que está justo al lado y hace lo contrario.
 */
export const CABECERA_DE_DESCARTES = [
  '# Descartes de candidatos — Historia 19.5, Épica 19',
  '#',
  '# QUÉ ES. Los candidatos de una época que NO van a dar Citas, con el motivo escrito. Un',
  '# candidato descartado deja de contar como pendiente y la época puede llegar a estar',
  '# terminada; uno SALTADO no deja rastro y se vuelve a mirar cada sesión, hasta que alguien',
  '# se cansa. Esa es la diferencia entera, y es la que impide dar una época por terminada por',
  '# cansancio en vez de por la cuenta.',
  '#',
  '#   npx tsx tools/epocas.ts --descartar <slug> --motivo "por qué no da Citas"',
  '#',
  '# SIN MOTIVO NO HAY DESCARTE. La orden se niega con código de error: un descarte sin motivo',
  '# es una desviación sin dueño, exactamente como una anulación de objetivo sin motivo en',
  '# sesiones-de-sembrado.yml.',
  '#',
  '# EL DESCARTE ES POR AUTOR, NO POR ÉPOCA. Un autor cuya prosa no da sentencia suelta no la',
  '# da en ninguna de las categorías en las que la Fuente lo haya clasificado. `epoca` queda',
  '# escrita porque dice desde dónde se miró, no porque acote dónde vale.',
  '#',
  '# POR QUÉ SOLO AÑADE, a diferencia de candidatos-por-epoca.yml, que está justo al lado.',
  '# Aquél lo escribe la FUENTE y se regenera entero; éste lo escribe el EDITOR y registra',
  '# actos. Regenerarlo borraría el criterio por el que un candidato dejó de proponerse, y la',
  '# sesión siguiente volvería a proponerlo — que es el bucle que este fichero existe para',
  '# cortar. Es la misma distinción que separa a serie-de-indexacion.yml de',
  '# peticiones-de-rastreo.yml.',
  '#',
  '# DESCARTAR NO ES CONDENAR. Si un día aparece obra suya en español con sentencia suelta, se',
  '# siembra y ya está: el cruce cuenta como sembrado a quien está en el Corpus, mire lo que',
  '# mire este registro.',
  '#',
  '# Metadato del Corpus y no colección, como sus vecinos. Ningún módulo de `src/lib/` lo lee.',
  '',
  'descartes:',
  '',
].join('\n');

const CLAVE_DE_EPOCAS = 'epocas';
const CLAVE_DE_DESCARTES = 'descartes';

/** Una época tal y como se relee del fichero versionado. */
export interface EpocaRegistrada {
  id: string;
  nombre?: string;
  categoria?: string;
  recuperada?: string;
  candidatos?: {
    nombre: string;
    slug: string;
    /**
     * El identificador de página en la Fuente, que sobrevive a un renombrado del título.
     *
     * Opcional porque una lista versionada antes de la revisión de la 19.5 no lo lleva: ahí
     * el cruce se queda con el slug, que es lo único que había.
     */
    idDePagina?: number;
    pagina?: string;
    dominioPublico?: boolean;
  }[];
}

/** Un descarte tal y como se relee del registro. */
export interface DescarteRegistrado {
  fecha?: string;
  epoca?: string;
  candidato: string;
  /** El identificador de página del candidato en la Fuente. Ver `Candidato.idDePagina`. */
  idDePagina?: number;
  nombre?: string;
  motivo: string;
}

/**
 * La raíz de un fichero de lista, comprobando que sea lo que dice ser.
 *
 * Nada de esto es paranoia, y es la misma comprobación que ya hacen sus tres vecinos: un
 * fichero vacío, o al que le falte su clave de raíz, deja que lo que se escriba quede como
 * una lista huérfana. El YAML sigue siendo válido, todo lector ve **cero** entradas, y la
 * época que se creía cubierta desaparece sin que nada se queje.
 */
function listaDeLaRaiz(nombre: string, contenido: string, clave: string): unknown[] {
  let leido: unknown;
  try {
    leido = parsearYaml(contenido);
  } catch (fallo) {
    throw new Error(
      `${nombre} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}. ` +
        'De este fichero sale la cobertura por época, así que no se lee a medias.',
    );
  }

  if (leido === null || leido === undefined || typeof leido !== 'object' || Array.isArray(leido)) {
    throw new Error(
      `${nombre}: falta la clave «${clave}:» en la raíz del fichero. Lo que se escriba en un ` +
        'fichero vacío o sin esa clave queda como una lista huérfana que ningún lector cuenta. ' +
        'Restaure la cabecera y vuelva a intentarlo.',
    );
  }

  if (!(clave in leido)) {
    throw new Error(
      `${nombre}: falta la clave «${clave}:» en la raíz del fichero. Las entradas cuelgan de ` +
        'ella; sin la clave, lo que se añada no lo cuenta nadie.',
    );
  }

  const lista = (leido as Record<string, unknown>)[clave];
  if (lista === null || lista === undefined) return [];

  if (!Array.isArray(lista)) {
    throw new Error(
      `${nombre}: «${clave}» tiene que ser una lista, y es ${typeof lista}. Escríbala como ` +
        `«${clave}:» y una entrada «  - …» por elemento.`,
    );
  }

  return lista;
}

function analizarEpocas(nombre: string, contenido: string): EpocaRegistrada[] {
  const lista = listaDeLaRaiz(nombre, contenido, CLAVE_DE_EPOCAS);

  for (const [i, entrada] of lista.entries()) {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_EPOCAS}» no es una época ` +
          `(${JSON.stringify(entrada)}). Cada entrada lleva al menos su id y sus candidatos.`,
      );
    }
    if (typeof (entrada as Record<string, unknown>).id !== 'string') {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_EPOCAS}» no declara «id». Sin id no se ` +
          'sabe a qué época sustituye una recuperación nueva.',
      );
    }
  }

  return lista as EpocaRegistrada[];
}

function analizarDescartes(nombre: string, contenido: string): DescarteRegistrado[] {
  const lista = listaDeLaRaiz(nombre, contenido, CLAVE_DE_DESCARTES);

  for (const [i, entrada] of lista.entries()) {
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      throw new Error(
        `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_DESCARTES}» no es un descarte ` +
          `(${JSON.stringify(entrada)}). Cada entrada lleva su candidato y su motivo.`,
      );
    }
    for (const clave of ['candidato', 'motivo']) {
      const valor = (entrada as Record<string, unknown>)[clave];
      if (typeof valor !== 'string' || valor.trim() === '') {
        throw new Error(
          `${nombre}: la entrada ${i + 1} de «${CLAVE_DE_DESCARTES}» no declara «${clave}». ` +
            'Un descarte sin motivo escrito es indistinguible de un candidato saltado, que es ' +
            'justo lo que este registro existe para separar.',
        );
      }
    }
  }

  return lista as DescarteRegistrado[];
}

/**
 * Las épocas ya versionadas. Un fichero que no existe se lee como lista vacía.
 *
 * Es lo que se usa **cuando la Fuente no responde**: se trabaja con lo versionado y la orden
 * dice que no se actualizó. Una lista que solo existiera en memoria no dejaría rastro de qué
 * se decidió con qué.
 */
export async function leerCandidatosPorEpoca(rutas: Rutas): Promise<EpocaRegistrada[]> {
  if (!existsSync(rutas.candidatosPorEpoca)) return [];
  return analizarEpocas(
    `corpus/${FICHERO_DE_CANDIDATOS}`,
    await readFile(rutas.candidatosPorEpoca, 'utf8'),
  );
}

/** Los descartes ya escritos. Un registro que no existe se lee como registro vacío. */
export async function leerDescartesDeCandidatos(rutas: Rutas): Promise<DescarteRegistrado[]> {
  if (!existsSync(rutas.descartesDeCandidatos)) return [];
  return analizarDescartes(
    `corpus/${FICHERO_DE_DESCARTES}`,
    await readFile(rutas.descartesDeCandidatos, 'utf8'),
  );
}

/** Una época, serializada como elemento de la lista `epocas`. */
function bloqueDeEpoca(entrada: Record<string, unknown>): string {
  // `- ` ocupa el sitio de los dos primeros espacios de la primera clave, como en los otros
  // tres registros: la entrada es un elemento de la lista y sus claves cuelgan de él.
  return `  -${aYaml(entrada, '    ').slice(3)}`;
}

/**
 * Versiona las épocas recuperadas, **reemplazando** la entrada anterior de cada una.
 *
 * Reemplaza y no añade porque esto guarda **lo que la Fuente dice hoy**, no un acto: dos
 * recuperaciones de la misma época no son dos listas, son la misma pregunta hecha dos veces.
 * Es la misma clase que `registrarLecturaDeIndexacion`, y por lo mismo se conserva **el
 * texto que el fichero tenga** por encima de «epocas:» en vez de la constante de arriba,
 * para que una nota añadida allí no se pierda.
 *
 * **Las épocas que no se recuperaron conservan su entrada tal cual.** Es lo que sostiene la
 * promesa de la historia: la red se cae, y el bucle sigue trabajando con lo versionado.
 *
 * Se compone el fichero entero en memoria, se analiza, y solo si contiene exactamente las
 * épocas que debe se toca el disco, con escritura a temporal y `rename` —atómico en el mismo
 * sistema de ficheros—, que es el riesgo nuevo de reescribir en vez de añadir.
 */
export async function registrarCandidatosPorEpoca(
  rutas: Rutas,
  recuperadas: readonly EpocaRegistrada[],
  opciones: { admitirVaciado?: boolean } = {},
): Promise<string> {
  const ruta = rutas.candidatosPorEpoca;
  const nombre = `corpus/${FICHERO_DE_CANDIDATOS}`;

  /*
   * Antes de tocar el disco, y no después: sin esto, una ejecución en la que la Fuente no
   * contestó ninguna época crearía el fichero con su cabecera y cero épocas — un fichero que
   * nadie pidió y que un `git status` presenta como trabajo de la jornada.
   */
  if (recuperadas.length === 0) return ruta;

  if (!existsSync(ruta)) {
    await mkdir(rutas.raiz, { recursive: true });
    try {
      // `wx` por lo mismo que en los otros tres registros: si el fichero apareció
      // entretanto, se falla en vez de truncar lo que otra ejecución acabara de escribir.
      await writeFile(ruta, CABECERA_DE_CANDIDATOS, { encoding: 'utf8', flag: 'wx' });
    } catch (fallo) {
      if ((fallo as NodeJS.ErrnoException).code !== 'EEXIST') throw fallo;
    }
  }

  const anterior = await readFile(ruta, 'utf8');
  const habia = analizarEpocas(nombre, anterior);

  /*
   * La cabecera es lo que hay por encima de la línea «epocas:», ella incluida. Se busca al
   * principio de línea y sin sangrar: una «  epocas:» dentro de una entrada no es la clave de
   * la raíz, y cortar por ahí partiría el fichero por la mitad.
   */
  const marca = anterior.match(/^epocas:[^\S\n]*$/m);
  if (marca?.index === undefined) {
    throw new Error(
      `${nombre}: no se encuentra la línea «${CLAVE_DE_EPOCAS}:» de la que cuelgan las ` +
        'entradas. La lista se reescribe entera en cada recuperación y esa línea es la ' +
        'frontera entre la cabecera —que se conserva— y las entradas —que se vuelven a ' +
        'volcar—. No se ha escrito nada.',
    );
  }
  const cabecera = anterior.slice(0, marca.index + marca[0].length) + '\n';

  /*
   * **Una entrada de n candidatos no se sustituye por una de cero.** Red independiente, y
   * puesta aquí a propósito: las dos comprobaciones de más abajo cotejan lo recuperado contra
   * lo que va a disco —`0 === 0` pasa— y ninguna mira contra lo que *había*. El fallo medido:
   * una categoría renombrada contesta 200 sin `error` y sin `query`, el lector la tomaba por
   * vacía, y la lista buena de una época quedaba sustituida por una vacía sellada con la
   * fecha de hoy, con código de salida 0 y sin un aviso.
   *
   * Se puede vaciar a propósito —una categoría que de verdad se queda sin nadie— pero
   * entonces se dice con la bandera. Un vaciado deliberado es un acto; uno silencioso es una
   * época que se declara terminada sin estarlo.
   */
  if (opciones.admitirVaciado !== true) {
    for (const recuperada of recuperadas) {
      const antes = habia.find((e) => e.id === recuperada.id)?.candidatos?.length ?? 0;
      const ahora = recuperada.candidatos?.length ?? 0;
      if (antes > 0 && ahora === 0) {
        throw new Error(
          `${nombre}: la época ${recuperada.id} tenía ${antes} candidatos versionados y la ` +
            'recuperación trae 0. Una lista que mengua sola se lee después como una época más ' +
            'cerca de estar terminada de lo que está. No se ha escrito nada.',
        );
      }
    }
  }

  const sustituidas = new Set(recuperadas.map((epoca) => epoca.id));
  const conservadas = habia.filter((epoca) => !sustituidas.has(epoca.id));
  const quedan = [...conservadas, ...recuperadas].sort((a, b) => a.id.localeCompare(b.id, 'es'));

  const contenido =
    cabecera + quedan.map((e) => bloqueDeEpoca(e as unknown as Record<string, unknown>)).join('');

  const escritas = analizarEpocas(nombre, contenido);
  if (escritas.length !== quedan.length) {
    throw new Error(
      `${nombre}: la lista recompuesta no tiene las épocas que debería (había ${habia.length}, ` +
        `se recuperan ${recuperadas.length} y quedarían ${escritas.length}). No se ha escrito ` +
        'nada.',
    );
  }

  /*
   * Y se comprueba **sobre lo que va a disco** que ninguna época recuperada perdió candidatos
   * por el camino. Entre la lista compuesta y el fichero está `aYaml`, que omite lo que no
   * tiene valor: una época cuya lista quedara vacía diría en silencio que la categoría no
   * tiene a nadie, que es indistinguible de una época agotada.
   */
  for (const recuperada of recuperadas) {
    const enDisco = escritas.find((e) => e.id === recuperada.id);
    const cuantos = enDisco?.candidatos?.length ?? 0;
    const esperados = recuperada.candidatos?.length ?? 0;
    if (cuantos !== esperados) {
      throw new Error(
        `${nombre}: la época ${recuperada.id} se recuperó con ${esperados} candidatos y al ` +
          `fichero llegan ${cuantos}. Una lista que mengua sola se lee después como una época ` +
          'más cerca de estar terminada de lo que está. No se ha escrito nada.',
      );
    }
  }

  // El temporal lleva el PID, por lo mismo que el de la serie de indexación: con un nombre
  // fijo, dos ejecuciones a la vez se pisan el fichero intermedio.
  const temporal = `${ruta}.${process.pid}.nueva`;
  await writeFile(temporal, contenido, 'utf8');
  await rename(temporal, ruta);
  return ruta;
}

/**
 * Añade un descarte al registro. **Solo añade**: nunca reescribe lo que ya está.
 *
 * Sigue punto por punto a `registrarPeticionesDeRastreo`, que es el precedente de un registro
 * de actos en este proyecto. Lo que un descarte protege es el criterio: sin él escrito, el
 * candidato que no dio Citas vuelve a proponerse la sesión siguiente.
 */
export async function registrarDescarteDeCandidato(
  rutas: Rutas,
  descarte: DescarteRegistrado,
): Promise<string> {
  const ruta = rutas.descartesDeCandidatos;
  const nombre = `corpus/${FICHERO_DE_DESCARTES}`;

  if (descarte.motivo.trim() === '') {
    throw new Error(
      `${nombre}: un descarte sin motivo no se registra. Sin motivo escrito es indistinguible ` +
        'de un candidato saltado, y saltarse a uno es como una época se da por terminada sin ' +
        'estarlo. No se ha escrito nada.',
    );
  }

  if (!existsSync(ruta)) {
    await mkdir(rutas.raiz, { recursive: true });
    try {
      await writeFile(ruta, CABECERA_DE_DESCARTES, { encoding: 'utf8', flag: 'wx' });
    } catch (fallo) {
      if ((fallo as NodeJS.ErrnoException).code !== 'EEXIST') throw fallo;
    }
  }

  const anterior = await readFile(ruta, 'utf8');
  const cuantosHabia = analizarDescartes(nombre, anterior).length;

  const bloque = `  -${aYaml(
    {
      fecha: descarte.fecha,
      epoca: descarte.epoca,
      candidato: descarte.candidato,
      /*
       * La clave estable, cuando se sabe. El slug se deriva del título del wiki y el título
       * se mueve: sin esto, un renombrado en la Fuente descasa el descarte y el candidato
       * vuelve a proponerse, que es el bucle que este registro existe para cortar.
       */
      idDePagina: descarte.idDePagina,
      nombre: descarte.nombre,
      motivo: descarte.motivo,
    },
    '    ',
  ).slice(3)}`;

  const salto = anterior === '' || anterior.endsWith('\n') ? '' : '\n';
  const añadido = `${salto}${bloque}`;

  const quedaria = analizarDescartes(nombre, `${anterior}${añadido}`);
  if (quedaria.length !== cuantosHabia + 1) {
    throw new Error(
      `${nombre}: añadir el descarte al final no lo deja colgando de «${CLAVE_DE_DESCARTES}:» ` +
        `(había ${cuantosHabia} y quedarían ${quedaria.length}). El registro se escribe solo ` +
        'por añadido, así que la lista tiene que ser lo último del fichero. No se ha escrito ' +
        'nada.',
    );
  }

  await appendFile(ruta, añadido, 'utf8');
  return ruta;
}
