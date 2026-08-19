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
import { basename, extname, join } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import type { AutorAdmisible, CitaAdmisible } from '../../src/lib/admision.ts';
import type {
  ClaseDeObjetivo,
  ObjetivoDeTema,
  ObjetivoDeTradicion,
} from '../../src/lib/objetivo.ts';
import { FICHERO_DEL_CENSO, type DocumentosDeFuente } from './cotejo.ts';
import { analizarDocumento } from './documento.ts';

/**
 * El registro de sesiones de sembrado — Historia 11.3. Su nombre tiene un solo dueño,
 * igual que el del censo de cotejo.
 */
export const FICHERO_DE_SESIONES = 'sesiones-de-sembrado.yml';

export interface Rutas {
  raiz: string;
  citas: string;
  autores: string;
  temas: string;
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
}

export function rutasDelCorpus(raizCorpus: string): Rutas {
  return {
    raiz: raizCorpus,
    citas: join(raizCorpus, 'citas'),
    autores: join(raizCorpus, 'autores'),
    temas: join(raizCorpus, 'temas'),
    revision: join(raizCorpus, '_revision'),
    fuentes: join(raizCorpus, 'fuentes'),
    pendientesDeCotejo: join(raizCorpus, FICHERO_DEL_CENSO),
    sesionesDeSembrado: join(raizCorpus, FICHERO_DE_SESIONES),
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
}

export async function leerAutores(rutas: Rutas): Promise<AutorEnCorpus[]> {
  const ficheros = await ficherosDe(rutas.autores, ['.yml', '.yaml']);
  return Promise.all(
    ficheros.map(async (ruta) => ({
      ...(parsearYaml(await readFile(ruta, 'utf8')) as AutorAdmisible),
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
      for (const elemento of valor) salida += `${sangria}  - ${escalar(elemento)}\n`;
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
  /** Porcentaje de Autores de tradición latinoamericana. */
  tradicionLatinoamericana: number;
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
  tradicion?: { nombre: string; porcentaje: number; suelo: number; autoresQueFaltan?: number };
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
