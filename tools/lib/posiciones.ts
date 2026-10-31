/**
 * Dónde cae cada Cita en sus documentos de Fuente — Historia 24.1, AD-23.
 *
 * La Página de Obra lista sus Citas en el orden del libro, y ese orden necesita saber en qué
 * documento y en qué posición aparece el texto de cada una. Ese dato no se guarda en ninguna
 * parte: se recalcula en cada construcción con **lo mismo** que usa el cotejo —el mismo lector
 * de Citas y de documentos (`tools/lib/corpus.ts`), el mismo casado de cada Cita con los
 * documentos de su obra (`documentosDeCita`) y el mismo localizador (`localizar`)—. Si fueran
 * otros, una Cita podría estar cotejada y no tener sitio en su libro.
 *
 * Aquí no se ordena ni se elige: se entrega, por el `slug` del frontmatter de cada Cita, una
 * aparición por documento de su obra en que aparece su texto, sin el texto. Quien ordena es
 * `src/lib/obras.ts` (`ordenDelLibro`), que recibe esto por parámetro. Quien lo cablea al build
 * es el cargador `posiciones` de `src/content.config.ts`, que no hace nada más.
 *
 * Sin red (AD-22) y sin escribir nada en `corpus/`.
 */

import type { AparicionDeCita } from '../../src/lib/obras.ts';
import {
  colapsarEspacios,
  documentoDeCita,
  documentosDeCita,
  localizar,
  type DocumentosDeFuente,
} from './cotejo.ts';
import { leerCitas, leerDocumentosDeFuente, leerOrdenDeLosIndices, rutasDelCorpus } from './corpus.ts';

/**
 * Lo que de una Cita hace falta para situarla, tal y como sale del frontmatter. Los campos se
 * miran con su tipo en la mano: el esquema de la colección `citas` es quien rechaza una Cita mal
 * formada, y esto no tiene que adelantarse a decirlo con otro mensaje.
 */
export interface CitaParaSituar {
  slug?: unknown;
  texto?: unknown;
  procedencia?: unknown;
  fuente?: unknown;
}

/** La Fuente de una Cita, si declara un identificador. */
function fuenteDe(cita: CitaParaSituar): { id: string } | undefined {
  const fuente = cita.fuente as { id?: unknown } | null | undefined;
  return typeof fuente === 'object' && fuente !== null && typeof fuente.id === 'string' && fuente.id !== ''
    ? { id: fuente.id }
    : undefined;
}

/** La obra de la Procedencia de una Cita, que es la mitad del nombre de su documento. */
function obraDe(cita: CitaParaSituar): string | undefined {
  const procedencia = cita.procedencia as { obra?: unknown } | null | undefined;
  return typeof procedencia === 'object' && procedencia !== null && typeof procedencia.obra === 'string'
    ? procedencia.obra
    : undefined;
}

/**
 * Las apariciones de cada Cita en los documentos de su obra, por el `slug` de su frontmatter.
 *
 * Pura. Una Cita sin documento —la del censo, sin Fuente u obra—, con el texto vacío o que no
 * aparece queda con la lista vacía; un documento ilegible (`null`) o una biografía mal colocada
 * no entra, como en el cotejo. Las Citas se agrupan por el documento corto de su obra
 * (`documentoDeCita`), que es lo único de lo que depende `documentosDeCita`: así cada cuerpo se
 * colapsa una sola vez por grupo, y se suelta en cuanto el grupo termina.
 */
export function posicionesDeCitas(
  citas: readonly CitaParaSituar[],
  documentos: DocumentosDeFuente,
): Map<string, AparicionDeCita[]> {
  const posiciones = new Map<string, AparicionDeCita[]>();
  const porGrupo = new Map<string, { fuente: { id: string }; obra: string; citas: CitaParaSituar[] }>();

  for (const cita of citas) {
    if (typeof cita.slug !== 'string') continue;
    posiciones.set(cita.slug, []);
    const fuente = fuenteDe(cita);
    const obra = obraDe(cita);
    const grupo = documentoDeCita(fuente, obra);
    if (grupo === undefined || fuente === undefined || obra === undefined) continue;
    const delGrupo = porGrupo.get(grupo) ?? { fuente, obra, citas: [] };
    delGrupo.citas.push(cita);
    porGrupo.set(grupo, delGrupo);
  }

  for (const { fuente, obra, citas: delGrupo } of porGrupo.values()) {
    const cuerpos = documentosDeCita(fuente, obra, documentos).flatMap((nombre) => {
      const cuerpo = documentos.get(nombre);
      return typeof cuerpo === 'string' ? [{ nombre, cuerpo: colapsarEspacios(cuerpo) }] : [];
    });
    for (const cita of delGrupo) {
      const buscado = colapsarEspacios(typeof cita.texto === 'string' ? cita.texto : '');
      const apariciones: AparicionDeCita[] = [];
      for (const { nombre, cuerpo } of cuerpos) {
        const posicion = localizar(buscado, cuerpo);
        if (posicion !== -1) apariciones.push({ documento: nombre, posicion });
      }
      posiciones.set(cita.slug as string, apariciones);
    }
  }

  return posiciones;
}

/**
 * Las posiciones de las Citas publicadas de un Corpus en disco: `corpus/citas/` y
 * `corpus/fuentes/`, con los lectores del cotejo. Lanza, nombrando el fichero, ante un
 * frontmatter que no se deja analizar, igual que el cotejo.
 */
export async function leerPosicionesDelCorpus(
  raizDelCorpus: string,
): Promise<Map<string, AparicionDeCita[]>> {
  const rutas = rutasDelCorpus(raizDelCorpus);
  const [citas, documentos] = await Promise.all([leerCitas(rutas.citas), leerDocumentosDeFuente(rutas)]);
  return posicionesDeCitas(citas, documentos);
}

/**
 * El orden de los índices de subpáginas de un Corpus en disco — Historia 24.9: por Obra
 * (`{fuente}--{obra}`), sus documentos en el orden que declara la Fuente. Lo lee
 * `leerOrdenDeLosIndices`, que no toma ningún índice por documento ni lee ningún cuerpo.
 */
export async function leerOrdenDeLosIndicesDelCorpus(raizDelCorpus: string): Promise<Map<string, string[]>> {
  return leerOrdenDeLosIndices(rutasDelCorpus(raizDelCorpus));
}

/** El identificador de la única entrada de la colección `indices`. */
export const ENTRADA_DEL_ORDEN_DE_LOS_INDICES = 'orden';

/**
 * Lleva el orden de los índices al almacén de la colección `indices` — Historia 24.9. Es el
 * cuerpo de su cargador en `src/content.config.ts`, con el patrón de `guardarPosiciones`: lee y
 * analiza todo antes de tocar el almacén.
 *
 * Es **una sola entrada**, `{ porObra }`, y está siempre, también sin ningún índice: así la
 * colección nunca está vacía y nadie consulta una colección vacía (Astro avisa de eso en cada
 * construcción de un Corpus sin índices).
 */
export async function guardarOrdenDeLosIndices(opciones: {
  leer: () => Promise<Map<string, string[]>>;
  analizar: (entrada: EntradaDePosiciones) => Promise<Record<string, unknown>>;
  almacen: AlmacenDePosiciones;
}): Promise<void> {
  const { leer, analizar, almacen } = opciones;
  const id = ENTRADA_DEL_ORDEN_DE_LOS_INDICES;
  const data = await analizar({ id, data: { porObra: Object.fromEntries(await leer()) } });
  almacen.clear();
  almacen.set({ id, data });
}

/** Una entrada del almacén de la colección `posiciones`. */
interface EntradaDePosiciones {
  id: string;
  data: Record<string, unknown>;
}

/** Lo que del almacén del cargador (`store`) usa `guardarPosiciones`. */
export interface AlmacenDePosiciones {
  clear(): void;
  set(entrada: EntradaDePosiciones): unknown;
}

/**
 * Lleva las posiciones al almacén de la colección — Historia 24.1. Es el cuerpo del cargador
 * `posiciones` de `src/content.config.ts`, que solo le pasa su lector, su `parseData` y su
 * `store`.
 *
 * Primero lee y analiza **todo**; solo entonces vacía el almacén y lo llena, sin ninguna espera
 * en medio. Así nadie lo lee a medias, y una lectura o un análisis que fallen —un frontmatter a
 * medio escribir en `astro dev`— lo dejan como estaba.
 */
export async function guardarPosiciones(opciones: {
  leer: () => Promise<Map<string, AparicionDeCita[]>>;
  analizar: (entrada: EntradaDePosiciones) => Promise<Record<string, unknown>>;
  almacen: AlmacenDePosiciones;
}): Promise<void> {
  const { leer, analizar, almacen } = opciones;
  const entradas: EntradaDePosiciones[] = [];
  for (const [slug, apariciones] of await leer()) {
    entradas.push({ id: slug, data: await analizar({ id: slug, data: { apariciones } }) });
  }
  almacen.clear();
  for (const entrada of entradas) almacen.set(entrada);
}

/** Lo que del vigilante de ficheros de `astro dev` usa la relectura: el `watcher` del cargador. */
export interface VigilanteDeFicheros {
  add(ruta: string): unknown;
  on(evento: 'add' | 'change' | 'unlink', oyente: (ruta: string) => void): unknown;
}

/** Si una ruta es una de las carpetas o está dentro de alguna, separador incluido. */
function estaDentro(ruta: string, carpetas: readonly string[]): boolean {
  return carpetas.some((carpeta) => {
    if (ruta.slice(0, carpeta.length) !== carpeta) return false;
    const siguiente = ruta.slice(carpeta.length, carpeta.length + 1);
    // `corpus/citas-borrador` comparte el prefijo con `corpus/citas` y no es suya.
    return siguiente === '' || siguiente === '/' || siguiente === '\\';
  });
}

/**
 * En `astro dev`, volver a situar las Citas cuando cambia una de ellas o un documento — Historia
 * 24.1. Es la relectura del cargador `posiciones` de `src/content.config.ts`, que solo la cablea.
 *
 * Cada relectura recorre el Corpus y sus documentos enteros, así que:
 *   · solo la dispara un cambio **dentro** de las carpetas vigiladas;
 *   · una ráfaga —un `git checkout`, una tanda de aprobaciones— se resuelve en **una**,
 *     `esperaMs` después del último cambio;
 *   · nunca hay dos a la vez: cada una espera a que acabe la anterior;
 *   · la que falla —un frontmatter a medio escribir— se dice con `avisar` y no deja ninguna
 *     promesa rechazada sin tratar, ni impide la siguiente. Conservar lo anterior es cosa de
 *     `releer` (`guardarPosiciones`), que solo toca el almacén cuando ya lo tiene todo.
 *
 * Devuelve la espera de la cadena en curso, para quien necesite saber cuándo ha terminado.
 */
export function releerAlCambiar(opciones: {
  vigilante: VigilanteDeFicheros;
  carpetas: readonly string[];
  releer: () => Promise<void>;
  esperaMs: number;
  avisar: (mensaje: string) => void;
}): { terminado: () => Promise<void> } {
  const { vigilante, carpetas, releer, esperaMs, avisar } = opciones;
  let pendiente: ReturnType<typeof setTimeout> | undefined;
  let enCurso: Promise<void> = Promise.resolve();

  const encadenar = () => {
    pendiente = undefined;
    enCurso = enCurso.then(releer).catch((error: unknown) => {
      avisar(
        `No se pudieron volver a situar las Citas: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  };
  const alCambiar = (ruta: string) => {
    if (!estaDentro(ruta, carpetas)) return;
    clearTimeout(pendiente);
    pendiente = setTimeout(encadenar, esperaMs);
  };

  for (const carpeta of carpetas) vigilante.add(carpeta);
  vigilante.on('add', alCambiar);
  vigilante.on('change', alCambiar);
  vigilante.on('unlink', alCambiar);

  return { terminado: () => enCurso };
}
