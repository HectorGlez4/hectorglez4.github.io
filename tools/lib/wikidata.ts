/**
 * Las revisiones fijas de Wikidata — Historia 32.1, AD-31.
 *
 * La Ficha técnica de la Página de Obra (32.2) dirá género, lengua y año de publicación, y los
 * toma de Wikidata. Leer Wikidata en vivo haría que dos construcciones del mismo commit dieran
 * dos sitios distintos, así que se lee **una revisión fija**, versionada en
 * `corpus/wikidata/{Q}--r{N}.json`: un documento por (entidad, revisión), CC0, que solo escribe
 * la cáscara de red, `tools/recuperar.ts` (AD-22). Este módulo no pide nada: lee lo descargado
 * y decide.
 *
 * Wikidata **no es una Fuente de texto** (FR-23): no está en `FUENTES` de `tools/lib/fuentes.ts`,
 * ninguna Cita puede declararla, y el cotejo de Citas, las posiciones y `extraer` no leen
 * `corpus/wikidata/`. Tampoco es la Fuente mutable de una biografía.
 *
 * Una entidad de Obra remite a otras —su autor (P50), su género (P136), su lengua (P407)—, y la
 * etiqueta en español de cada una sale de **su** revisión vigente, declarada en
 * `corpus/wikidata/vigentes.yml` (`Q: revisión`). Ese fichero tiene dos escritores con nombre,
 * aquí, sobre un solo serializador: `anadirVigentes`, que solo añade y lo usa solo `recuperar`,
 * y `sustituirVigente`, que lo usa solo `npm run obra -- wikidata-vigente`.
 *
 * Quien ata una entidad a una Ficha de Obra es `npm run obra -- wikidata`, que coteja su autor
 * con `cotejarAutorDeLaEntidad`; el build repite las mismas comprobaciones desde el cargador
 * `fichasTecnicas` de `src/content.config.ts`, segunda excepción con nombre a que `src/` no
 * importe de `tools/lib/`.
 */

import { existsSync } from 'node:fs';
import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parsearYaml } from 'yaml';
import { revisionExacta } from '../../src/lib/biografia.ts';
import { esElMismoAutor } from './documento.ts';
import { leerAutores, leerFichasDeObra, rutasDelCorpus, type Rutas } from './corpus.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Direcciones
// ─────────────────────────────────────────────────────────────────────────────

/** El identificador del espacio de Wikidata en los documentos y en los mensajes. */
export const FUENTE_WIKIDATA = 'wikidata';
export const NOMBRE_DE_WIKIDATA = 'Wikidata';

/** La licencia de los datos de Wikidata: dominio público por renuncia. */
export const LICENCIA_DE_WIKIDATA = 'CC0 1.0';

const ANFITRION = 'www.wikidata.org';
const ANFITRIONES_DE_WIKIDATA = ['www.wikidata.org', 'm.wikidata.org'] as const;

/** Una entidad de elemento: «Q» y su número, sin ceros a la izquierda. */
const ENTIDAD = /^Q[1-9]\d*$/u;

export function esEntidad(valor: string): boolean {
  return ENTIDAD.test(valor);
}

/**
 * Si una dirección es de Wikidata. La coincidencia es **exacta de anfitrión o de subdominio
 * real**, como en `fuenteDeUrl`: `wikidata.org.example.com` no es Wikidata. Solo `http` y `https`.
 */
export function esDireccionDeWikidata(url: string): boolean {
  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return false;
  }
  if (analizada.protocol !== 'http:' && analizada.protocol !== 'https:') return false;
  const anfitrion = analizada.hostname.toLowerCase().replace(/\.$/u, '');
  if (anfitrion === '') return false;
  return ANFITRIONES_DE_WIKIDATA.some((a) => anfitrion === a || anfitrion.endsWith(`.${a}`));
}

const API = `https://${ANFITRION}/w/api.php?action=query&prop=revisions`;
const PROPIEDADES_DE_REVISION = '&rvprop=ids|timestamp&format=json&formatversion=2';

/** Donde Wikidata **declara** la entidad y la fecha de una revisión. */
export function direccionDeLaDeclaracion(revision: number): string {
  return `${API}&revids=${revision}${PROPIEDADES_DE_REVISION}`;
}

/** Donde Wikidata dice cuál es hoy la revisión de una entidad (para las referidas sin vigente). */
export function direccionDeLaRevisionActual(entidad: string): string {
  return `${API}&titles=${entidad}${PROPIEDADES_DE_REVISION}`;
}

/** La única dirección de datos que se descarga: la entidad tal como era en esa revisión. */
export function direccionDeLosDatos(entidad: string, revision: number): string {
  return `https://${ANFITRION}/wiki/Special:EntityData/${entidad}.json?revision=${revision}`;
}

/** El enlace permanente de la revisión, el que se escribe en el documento. */
export function enlacePermanenteDeWikidata(entidad: string, revision: number): string {
  return `https://${ANFITRION}/w/index.php?title=${entidad}&oldid=${revision}`;
}

/** La orden exacta que versiona una revisión. */
export function ordenQueRecupera(entidad: string, revision: number): string {
  return `npx tsx tools/recuperar.ts "${enlacePermanenteDeWikidata(entidad, revision)}"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que la API declara
// ─────────────────────────────────────────────────────────────────────────────

export type RevisionDeclarada =
  | { ok: true; entidad: string; revision: number; fecha: string }
  | { ok: false; motivo: string };

interface PaginaDeLaApi {
  ns?: unknown;
  title?: unknown;
  missing?: unknown;
  invalid?: unknown;
  revisions?: unknown;
}

function paginasDe(respuesta: string): PaginaDeLaApi[] | { motivo: string } {
  let datos: unknown;
  try {
    datos = JSON.parse(respuesta);
  } catch {
    return { motivo: 'Wikidata no contestó con datos legibles sobre la revisión.' };
  }
  const consulta = (datos as { query?: unknown } | null)?.query;
  if (typeof consulta !== 'object' || consulta === null) return [];
  const { badrevids, pages } = consulta as { badrevids?: unknown; pages?: unknown };
  if (badrevids !== undefined && !(Array.isArray(badrevids) && badrevids.length === 0)) return [];
  if (Array.isArray(pages)) return pages.filter((p): p is PaginaDeLaApi => typeof p === 'object' && p !== null);
  if (typeof pages === 'object' && pages !== null) {
    return Object.values(pages).filter((p): p is PaginaDeLaApi => typeof p === 'object' && p !== null);
  }
  return [];
}

function revisionDeLaPagina(
  pagina: PaginaDeLaApi,
  revision: number | undefined,
): { revision: number; fecha: string } | undefined {
  if (!Array.isArray(pagina.revisions)) return undefined;
  for (const r of pagina.revisions) {
    if (typeof r !== 'object' || r === null) continue;
    const revid = revisionExacta((r as { revid?: unknown }).revid as number);
    const timestamp = (r as { timestamp?: unknown }).timestamp;
    if (revid === undefined || typeof timestamp !== 'string') continue;
    if (revision !== undefined && revid !== revision) continue;
    const fecha = /^(\d{4}-\d{2}-\d{2})T/u.exec(timestamp)?.[1];
    if (fecha === undefined) continue;
    return { revision: revid, fecha };
  }
  return undefined;
}

/**
 * La respuesta a `direccionDeLaDeclaracion(N)`: de qué entidad es la revisión N y de qué día.
 *
 * Una revisión que Wikidata no reconoce llega en `badrevids` o en ninguna página. Una de otro
 * espacio de nombres —una propiedad, una página de discusión— no es una entidad de elemento, y
 * se niega: de ella no sale ninguna Ficha técnica.
 */
export function revisionDeclarada(respuesta: string, revision: number): RevisionDeclarada {
  const paginas = paginasDe(respuesta);
  if (!Array.isArray(paginas)) return { ok: false, motivo: paginas.motivo };
  for (const pagina of paginas) {
    const suya = revisionDeLaPagina(pagina, revision);
    if (suya === undefined) continue;
    const titulo = typeof pagina.title === 'string' ? pagina.title.trim() : '';
    if (pagina.ns !== 0 || !esEntidad(titulo)) {
      return {
        ok: false,
        motivo:
          `La revisión ${revision} es de «${titulo === '' ? 'sin título' : titulo}», que no es una ` +
          'entidad de elemento de Wikidata («Q…», espacio principal). No se ha versionado nada.',
      };
    }
    return { ok: true, entidad: titulo, revision, fecha: suya.fecha };
  }
  return {
    ok: false,
    motivo:
      `Wikidata no reconoce la revisión ${revision}: no existe, se ocultó o se borró. ` +
      'No se ha versionado nada.',
  };
}

/** La respuesta a `direccionDeLaRevisionActual(Q)`: la revisión de hoy de esa entidad. */
export function revisionActual(respuesta: string, entidad: string): RevisionDeclarada {
  const paginas = paginasDe(respuesta);
  if (!Array.isArray(paginas)) return { ok: false, motivo: paginas.motivo };
  for (const pagina of paginas) {
    if (pagina.title !== entidad || pagina.ns !== 0 || pagina.missing !== undefined) continue;
    const suya = revisionDeLaPagina(pagina, undefined);
    if (suya !== undefined) return { ok: true, entidad, revision: suya.revision, fecha: suya.fecha };
  }
  return { ok: false, motivo: `Wikidata no declara ninguna revisión de ${entidad}.` };
}

/**
 * La entidad que sirve `Special:EntityData` para esa revisión, o por qué no vale.
 *
 * Una entidad fusionada se sirve con el identificador de la que la absorbió, y una revisión que
 * no es la pedida sería otro documento con el nombre de este: las dos cosas se niegan nombrando
 * lo servido.
 */
export function entidadServida(
  respuesta: string,
  entidad: string,
  revision: number,
): { ok: true; datos: Record<string, unknown> } | { ok: false; motivo: string } {
  let json: unknown;
  try {
    json = JSON.parse(respuesta);
  } catch {
    return { ok: false, motivo: `Wikidata no sirvió datos legibles de ${entidad} en la revisión ${revision}.` };
  }
  const entidades = (json as { entities?: unknown } | null)?.entities;
  const servidas =
    typeof entidades === 'object' && entidades !== null ? Object.values(entidades as Record<string, unknown>) : [];
  const datos = servidas[0];
  if (servidas.length !== 1 || typeof datos !== 'object' || datos === null) {
    return { ok: false, motivo: `Wikidata no sirvió una sola entidad para ${entidad}, revisión ${revision}.` };
  }
  const { id, lastrevid } = datos as { id?: unknown; lastrevid?: unknown };
  if (id !== entidad || lastrevid !== revision) {
    return {
      ok: false,
      motivo:
        `Se pidió ${entidad} en la revisión ${revision} y Wikidata sirvió ${String(id)} en la ` +
        `revisión ${String(lastrevid)}. No es el mismo documento: no se ha versionado nada.`,
    };
  }
  return { ok: true, datos: datos as Record<string, unknown> };
}

// ─────────────────────────────────────────────────────────────────────────────
// El documento versionado
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentoDeWikidata {
  fuente: typeof FUENTE_WIKIDATA;
  entidad: string;
  revision: number;
  fechaDeRevision: string;
  licencia: typeof LICENCIA_DE_WIKIDATA;
  url: string;
  pedido?: string;
  recuperado: string;
  /** La entidad tal como la sirve `Special:EntityData` para esa revisión, entera. */
  datos: Record<string, unknown>;
}

export function nombreDeDocumentoDeWikidata(entidad: string, revision: number): string {
  return `${entidad}--r${revision}.json`;
}

const NOMBRE_DE_DOCUMENTO = /^(Q[1-9]\d*)--r([1-9]\d*)\.json$/u;

/** La (entidad, revisión) que dice el nombre de un fichero, si lo es de un documento. */
export function revisionDelNombre(nombre: string): { entidad: string; revision: number } | undefined {
  const m = NOMBRE_DE_DOCUMENTO.exec(nombre);
  if (m === null) return undefined;
  const revision = revisionExacta(m[2]);
  return revision === undefined ? undefined : { entidad: m[1], revision };
}

/** El texto del documento, con sus campos siempre en el mismo orden. */
export function componerDocumentoDeWikidata(documento: Omit<DocumentoDeWikidata, 'fuente' | 'licencia'>): string {
  const ordenado = {
    fuente: FUENTE_WIKIDATA,
    entidad: documento.entidad,
    revision: documento.revision,
    fechaDeRevision: documento.fechaDeRevision,
    licencia: LICENCIA_DE_WIKIDATA,
    url: documento.url,
    ...(documento.pedido !== undefined && documento.pedido !== documento.url ? { pedido: documento.pedido } : {}),
    recuperado: documento.recuperado,
    datos: documento.datos,
  };
  return `${JSON.stringify(ordenado, null, 2)}\n`;
}

export type LecturaDeDocumento =
  | { ok: true; documento: DocumentoDeWikidata }
  | { ok: false; motivo: string };

/**
 * Analiza el texto de un documento y comprueba que es coherente: forma de la cabecera, nombre
 * del fichero, cabecera y `datos.id`/`datos.lastrevid` dicen la misma entidad y revisión.
 */
export function leerDocumentoDeWikidata(nombre: string, texto: string): LecturaDeDocumento {
  const delNombre = revisionDelNombre(nombre);
  if (delNombre === undefined) {
    return { ok: false, motivo: `«${nombre}» no tiene nombre de documento de Wikidata («Q…--rN.json»).` };
  }
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: `${nombre} no es JSON legible.` };
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ok: false, motivo: `${nombre} no es un documento de Wikidata.` };
  }
  const d = json as Record<string, unknown>;
  if (d.fuente !== FUENTE_WIKIDATA) {
    return { ok: false, motivo: `${nombre} no es un documento de Wikidata: no declara «fuente: wikidata».` };
  }
  const datos = d.datos;
  const bien =
    typeof d.entidad === 'string' &&
    typeof d.revision === 'number' &&
    typeof d.fechaDeRevision === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/u.test(d.fechaDeRevision) &&
    d.licencia === LICENCIA_DE_WIKIDATA &&
    typeof d.url === 'string' &&
    (d.pedido === undefined || typeof d.pedido === 'string') &&
    typeof d.recuperado === 'string' &&
    typeof datos === 'object' &&
    datos !== null &&
    !Array.isArray(datos);
  if (!bien) {
    return { ok: false, motivo: `${nombre} no tiene la forma de un documento de Wikidata.` };
  }
  const servida = datos as { id?: unknown; lastrevid?: unknown };
  if (
    d.entidad !== delNombre.entidad ||
    d.revision !== delNombre.revision ||
    servida.id !== delNombre.entidad ||
    servida.lastrevid !== delNombre.revision
  ) {
    return {
      ok: false,
      motivo:
        `${nombre} no es de ${delNombre.entidad} en la revisión ${delNombre.revision}: su cabecera dice ` +
        `${String(d.entidad)} r${String(d.revision)} y sus datos ${String(servida.id)} ` +
        `r${String(servida.lastrevid)}.`,
    };
  }
  return { ok: true, documento: d as unknown as DocumentoDeWikidata };
}

/** Lee el documento de (entidad, revisión) de una carpeta, o dice por qué no. */
export async function documentoDeLaCarpeta(
  carpeta: string,
  entidad: string,
  revision: number,
): Promise<LecturaDeDocumento & { ausente?: true }> {
  const nombre = nombreDeDocumentoDeWikidata(entidad, revision);
  const ruta = join(carpeta, nombre);
  if (!existsSync(ruta)) {
    return { ok: false, ausente: true, motivo: `Falta el documento ${ruta}.` };
  }
  let texto: string;
  try {
    texto = await readFile(ruta, 'utf8');
  } catch (fallo) {
    return { ok: false, motivo: `No se pudo leer ${ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}` };
  }
  return leerDocumentoDeWikidata(nombre, texto);
}

/** Los documentos versionados de una revisión, por el sufijo de su nombre (las revisiones son únicas en Wikidata). */
export async function documentosDeLaRevision(carpeta: string, revision: number): Promise<string[]> {
  if (!existsSync(carpeta)) return [];
  return (await readdir(carpeta)).filter((n) => revisionDelNombre(n)?.revision === revision).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// Las declaraciones y la extracción
// ─────────────────────────────────────────────────────────────────────────────

/** Autor, género, lengua de la obra y fecha de publicación. P364 (lengua original de una película) no se lee. */
export const P_AUTOR = 'P50';
export const P_GENERO = 'P136';
export const P_LENGUA = 'P407';
export const P_PUBLICACION = 'P577';

interface Declaracion {
  rank?: unknown;
  mainsnak?: { snaktype?: unknown; datavalue?: { value?: unknown; type?: unknown } };
}

/**
 * Las declaraciones de una propiedad que cuentan, en el orden de la revisión: fuera las
 * `deprecated`; si queda alguna `preferred`, solo esas; y solo las que traen valor
 * (`snaktype: value`), nunca «sin valor» ni «valor desconocido».
 */
export function declaraciones(datos: Record<string, unknown>, propiedad: string): Declaracion[] {
  const claims = (datos as { claims?: unknown }).claims;
  if (typeof claims !== 'object' || claims === null) return [];
  const todas = (claims as Record<string, unknown>)[propiedad];
  if (!Array.isArray(todas)) return [];
  const vivas = todas.filter(
    (d): d is Declaracion => typeof d === 'object' && d !== null && (d as Declaracion).rank !== 'deprecated',
  );
  const preferidas = vivas.filter((d) => d.rank === 'preferred');
  return (preferidas.length > 0 ? preferidas : vivas).filter((d) => d.mainsnak?.snaktype === 'value');
}

/** Las entidades de elemento a las que remiten las declaraciones que cuentan, sin repetir. */
function entidadesDe(datos: Record<string, unknown>, propiedad: string): string[] {
  const vistas: string[] = [];
  for (const d of declaraciones(datos, propiedad)) {
    const valor = d.mainsnak?.datavalue?.value as { id?: unknown } | undefined;
    const id = valor?.id;
    if (typeof id === 'string' && esEntidad(id) && !vistas.includes(id)) vistas.push(id);
  }
  return vistas;
}

/**
 * Las entidades a las que remite la de una Obra y que la Ficha técnica o el cotejo leerán:
 * autor, género y lengua, con las reglas de rango. Una entidad que nadie leerá no se recupera.
 */
export function entidadesReferidas(datos: Record<string, unknown>): string[] {
  const todas: string[] = [];
  for (const propiedad of [P_AUTOR, P_GENERO, P_LENGUA]) {
    for (const id of entidadesDe(datos, propiedad)) if (!todas.includes(id)) todas.push(id);
  }
  return todas;
}

/** La etiqueta en español de una entidad, si la tiene. Nunca otra lengua ni el identificador. */
export function etiquetaEnEspanol(datos: Record<string, unknown>): string | undefined {
  const labels = (datos as { labels?: unknown }).labels;
  if (typeof labels !== 'object' || labels === null) return undefined;
  const es = (labels as Record<string, unknown>).es as { value?: unknown } | undefined;
  const valor = typeof es?.value === 'string' ? es.value.trim() : '';
  return valor === '' ? undefined : valor;
}

/** Dónde se busca la revisión vigente de una entidad referida. */
export type DatosVigentes = (entidad: string) => Record<string, unknown> | undefined;

export interface FichaTecnica {
  generos: string[];
  lenguas: string[];
  año?: number;
}

/** El año de un valor de tiempo de Wikidata (`+1605-01-01T00:00:00Z`, `-0049-…`), con su signo. */
function añoDelTiempo(valor: unknown): number | undefined {
  const { time, precision } = (valor ?? {}) as { time?: unknown; precision?: unknown };
  if (typeof time !== 'string' || typeof precision !== 'number' || precision < 9) return undefined;
  const m = /^([+-])(\d+)-/u.exec(time);
  if (m === null) return undefined;
  const año = Number(m[2]) * (m[1] === '-' ? -1 : 1);
  return Number.isSafeInteger(año) ? año + 0 : undefined;
}

function etiquetasDe(ids: string[], vigentes: DatosVigentes): string[] {
  const etiquetas: string[] = [];
  for (const id of ids) {
    const datos = vigentes(id);
    const etiqueta = datos === undefined ? undefined : etiquetaEnEspanol(datos);
    if (etiqueta !== undefined && !etiquetas.includes(etiqueta)) etiquetas.push(etiqueta);
  }
  return etiquetas;
}

/**
 * Lo que la Ficha técnica dirá de una Obra, de su revisión fija.
 *
 * Géneros (P136) y lenguas (P407), en el orden de la revisión y sin repetir, cada uno por la
 * etiqueta en español de **su** revisión vigente; sin vigente, sin documento o sin etiqueta en
 * español, se omite. El año de P577, solo si queda **exactamente una** declaración y su
 * precisión llega al año (≥ 9): con dos o más, aunque digan lo mismo, ninguno (pregunta 13).
 */
export function fichaTecnicaDe(datos: Record<string, unknown>, vigentes: DatosVigentes): FichaTecnica {
  const fechas = declaraciones(datos, P_PUBLICACION);
  const año = fechas.length === 1 ? añoDelTiempo(fechas[0].mainsnak?.datavalue?.value) : undefined;
  return {
    generos: etiquetasDe(entidadesDe(datos, P_GENERO), vigentes),
    lenguas: etiquetasDe(entidadesDe(datos, P_LENGUA), vigentes),
    ...(año !== undefined ? { año } : {}),
  };
}

export type CotejoDeAutor =
  | { ok: true; persona: string; etiqueta: string }
  | { ok: false; motivo: string };

/**
 * Si el autor (P50) de la entidad es el Autor de la ficha — la única función que lo decide, la
 * usan la orden que ata y el cargador del build.
 *
 * Concuerda si la etiqueta en español de la revisión vigente de alguna de sus personas concuerda
 * con el `nombre` del Autor según `esElMismoAutor`, la misma comparación de `extraer` y
 * `documentar`. Sin P50, sin vigente o sin etiqueta en español, no hay con qué cotejar, y se niega.
 */
export function cotejarAutorDeLaEntidad(
  datos: Record<string, unknown>,
  nombreDelAutor: string,
  vigentes: (entidad: string) => { ok: true; datos: Record<string, unknown> } | { ok: false; motivo: string },
): CotejoDeAutor {
  const entidad = String((datos as { id?: unknown }).id);
  const personas = entidadesDe(datos, P_AUTOR);
  if (personas.length === 0) {
    return { ok: false, motivo: `${entidad} no declara autor (${P_AUTOR}): no hay con qué cotejar a «${nombreDelAutor}».` };
  }
  const ajenas: string[] = [];
  const faltas: string[] = [];
  for (const persona of personas) {
    const vigente = vigentes(persona);
    if (!vigente.ok) {
      faltas.push(vigente.motivo);
      continue;
    }
    const etiqueta = etiquetaEnEspanol(vigente.datos);
    if (etiqueta === undefined) {
      faltas.push(`${persona}, autor de ${entidad}, no tiene etiqueta en español en su revisión vigente.`);
      continue;
    }
    if (esElMismoAutor(etiqueta, nombreDelAutor)) return { ok: true, persona, etiqueta };
    ajenas.push(`«${etiqueta}» (${persona})`);
  }
  if (ajenas.length > 0) {
    return {
      ok: false,
      motivo:
        `${entidad} declara por autor a ${ajenas.join(', ')} y el Autor de la ficha es ` +
        `«${nombreDelAutor}». No son el mismo: atarla describiría otra obra.` +
        // Con varios autores, el que falta podría ser justo el que concuerda: se dice también.
        (faltas.length > 0 ? `\nDe sus otros autores no se pudo cotejar:\n${faltas.join('\n')}` : ''),
    };
  }
  return { ok: false, motivo: faltas.join('\n') };
}

/**
 * Las fichas que remiten a una entidad por autor, género o lengua: las que cambiar su vigente
 * fecharía (la 32.2 lo usará en la relación de superficies).
 */
export function obrasQueRemitenA(
  entidad: string,
  fichas: readonly { nombre: string; datos: Record<string, unknown> }[],
): string[] {
  return fichas
    .filter((f) => entidadesReferidas(f.datos).includes(entidad))
    .map((f) => f.nombre)
    .sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// vigentes.yml
// ─────────────────────────────────────────────────────────────────────────────

const CABECERA_DE_VIGENTES = [
  '# Las revisiones vigentes de las entidades de Wikidata a las que remiten las Obras — Historia 32.1, AD-31.',
  '#',
  '# Por cada entidad referida (autor P50, género P136, lengua P407), la revisión de la que salen su',
  '# etiqueta en español y el cotejo del autor: `Q…: revisión`, ordenado por el número de la entidad.',
  '# Cada revisión tiene su documento en corpus/wikidata/{Q}--r{N}.json.',
  '#',
  '# No se escribe a mano. Lo amplía solo `npx tsx tools/recuperar.ts` con las referidas que falten,',
  '# y solo añade: nunca toca una entidad que ya es vigente. Cambiar la revisión vigente de una',
  '# entidad es `npm run obra -- wikidata-vigente <Q> <N>`, que dice cuántas Obras remiten a ella.',
  '',
].join('\n');

export type Vigentes = ReadonlyMap<string, number>;

/** El texto de `vigentes.yml`: la cabecera y el mapa ordenado por número de entidad; vacío, `{}`. */
export function componerVigentes(vigentes: Vigentes): string {
  const entradas = [...vigentes].sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
  const cuerpo = entradas.length === 0 ? '{}\n' : entradas.map(([q, n]) => `${q}: ${n}\n`).join('');
  return `${CABECERA_DE_VIGENTES}${cuerpo}`;
}

/** Analiza `vigentes.yml`. Lanza nombrando el fichero si no se deja leer. */
export function analizarVigentes(texto: string, ruta = 'vigentes.yml'): Map<string, number> {
  let bruto: unknown;
  try {
    bruto = parsearYaml(texto);
  } catch (fallo) {
    throw new Error(`${ruta} no es YAML válido: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  }
  if (bruto === null || bruto === undefined) return new Map();
  if (typeof bruto !== 'object' || Array.isArray(bruto)) {
    throw new Error(`${ruta} no es un mapa «Q…: revisión».`);
  }
  const vigentes = new Map<string, number>();
  for (const [clave, valor] of Object.entries(bruto as Record<string, unknown>)) {
    const revision = typeof valor === 'number' ? revisionExacta(valor) : undefined;
    if (!esEntidad(clave) || revision === undefined) {
      throw new Error(`${ruta} trae «${clave}: ${String(valor)}», que no es «Q…: revisión».`);
    }
    vigentes.set(clave, revision);
  }
  return vigentes;
}

/** Las vigentes de un Corpus; sin fichero, ninguna. Lanza si el fichero no se deja leer. */
export async function leerVigentes(ruta: string): Promise<Map<string, number>> {
  if (!existsSync(ruta)) return new Map();
  return analizarVigentes(await readFile(ruta, 'utf8'), ruta);
}

async function escribirVigentes(ruta: string, vigentes: Vigentes): Promise<void> {
  const temporal = `${ruta}.escribiendo`;
  await writeFile(temporal, componerVigentes(vigentes), 'utf8');
  try {
    await rename(temporal, ruta);
  } catch (fallo) {
    await rm(temporal, { force: true }).catch(() => {});
    throw fallo;
  }
}

/**
 * Uno de los dos escritores de `vigentes.yml`, y lo usa solo `recuperar`: añade las entidades que
 * no son vigentes y **nunca toca** una que ya lo es. Devuelve las añadidas.
 */
export async function anadirVigentes(ruta: string, nuevas: Vigentes): Promise<string[]> {
  const actuales = await leerVigentes(ruta);
  const añadidas: string[] = [];
  for (const [entidad, revision] of nuevas) {
    if (actuales.has(entidad)) continue;
    actuales.set(entidad, revision);
    añadidas.push(entidad);
  }
  if (añadidas.length > 0 || !existsSync(ruta)) await escribirVigentes(ruta, actuales);
  return añadidas;
}

/**
 * El otro escritor, y lo usa solo `wikidata-vigente`: cambia la revisión de una entidad que ya
 * es vigente. Lanza si no lo es o si ya es esa revisión; quien llama lo comprueba antes.
 */
export async function sustituirVigente(ruta: string, entidad: string, revision: number): Promise<number> {
  const actuales = await leerVigentes(ruta);
  const anterior = actuales.get(entidad);
  if (anterior === undefined) throw new Error(`${entidad} no es vigente en ${ruta}.`);
  if (anterior === revision) throw new Error(`${entidad} ya es vigente en la revisión ${revision}.`);
  actuales.set(entidad, revision);
  await escribirVigentes(ruta, actuales);
  return anterior;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que leen la orden y el build
// ─────────────────────────────────────────────────────────────────────────────

/** Las vigentes de un Corpus con sus documentos, leídos una vez. */
export interface WikidataDelCorpus {
  vigentes: Map<string, number>;
  /** La revisión vigente de una entidad, o por qué no la hay. */
  vigente(entidad: string): { ok: true; datos: Record<string, unknown> } | { ok: false; motivo: string };
  /** Las vigentes cuyo documento falta o no se deja leer. */
  rotas: string[];
}

export async function leerWikidataDelCorpus(rutas: Rutas): Promise<WikidataDelCorpus> {
  const vigentes = await leerVigentes(rutas.vigentesDeWikidata);
  const documentos = new Map<string, Record<string, unknown>>();
  const rotas: string[] = [];
  for (const [entidad, revision] of vigentes) {
    const lectura = await documentoDeLaCarpeta(rutas.wikidata, entidad, revision);
    if (lectura.ok) documentos.set(entidad, lectura.documento.datos);
    else rotas.push(`${entidad}: ${revision} — ${lectura.motivo}`);
  }
  return {
    vigentes,
    rotas,
    vigente: (entidad) => {
      const revision = vigentes.get(entidad);
      if (revision === undefined) {
        return {
          ok: false,
          motivo:
            `${entidad} no tiene revisión vigente en ${rutas.vigentesDeWikidata}. Al recuperar la ` +
            'entidad de la Obra, `recuperar` versiona también las referidas que falten.',
        };
      }
      const datos = documentos.get(entidad);
      return datos === undefined
        ? { ok: false, motivo: `La revisión vigente ${revision} de ${entidad} no tiene documento legible.` }
        : { ok: true, datos };
    },
  };
}

/** Lo que la Ficha técnica de una Obra lleva al almacén del build. */
export interface FichaTecnicaDeObra extends FichaTecnica {
  entidad: string;
  revision: number;
}

/**
 * Las Fichas técnicas de un Corpus en disco, por nombre de ficha — el cuerpo del cargador
 * `fichasTecnicas` de `src/content.config.ts`. Repite lo que comprueba la orden que ata: que el
 * documento de la ficha exista y sea de esa entidad y esa revisión, que su autor tenga vigente y
 * concuerde con el Autor de la ficha, y que ninguna otra ficha activa declare la misma entidad;
 * y además que `vigentes.yml` se deje leer y cada vigente tenga su documento. Lanza `Regla incumplida: …` nombrando la ficha (o `vigentes.yml`).
 */
export async function leerFichasTecnicasDelCorpus(raizDelCorpus: string): Promise<Map<string, FichaTecnicaDeObra>> {
  const rutas = rutasDelCorpus(raizDelCorpus);
  let wikidata: WikidataDelCorpus;
  try {
    wikidata = await leerWikidataDelCorpus(rutas);
  } catch (fallo) {
    throw new Error(`Regla incumplida: ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  }
  const problemas: string[] = wikidata.rotas.map(
    (rota) => `${rutas.vigentesDeWikidata} declara una vigente sin su documento: ${rota}`,
  );

  let fichas: Awaited<ReturnType<typeof leerFichasDeObra>>;
  let autores: Awaited<ReturnType<typeof leerAutores>>;
  try {
    [fichas, autores] = await Promise.all([leerFichasDeObra(rutas), leerAutores(rutas)]);
  } catch (fallo) {
    throw new Error(`Regla incumplida: Wikidata (AD-31): ${fallo instanceof Error ? fallo.message : String(fallo)}`);
  }
  const nombres = new Map(autores.map((a) => [a.slug, a.nombre]));
  const salida = new Map<string, FichaTecnicaDeObra>();
  // Una entidad describe una sola Obra (la misma regla que la orden que ata): dos fichas activas
  // que la declaran —una editada a mano, una retirada que vuelve— serían dos Obras con la misma
  // Ficha técnica.
  const primeraQueLaDeclara = new Map<string, string>();

  for (const ficha of fichas) {
    if (ficha.wikidata === undefined) continue;
    const { entidad, revision } = ficha.wikidata;
    const otra = primeraQueLaDeclara.get(entidad);
    if (otra !== undefined) {
      problemas.push(`${ficha.ruta}: ${entidad} ya la declara ${otra}; una entidad de Wikidata es una sola Obra.`);
    } else {
      primeraQueLaDeclara.set(entidad, ficha.ruta);
    }
    const lectura = await documentoDeLaCarpeta(rutas.wikidata, entidad, revision);
    if (!lectura.ok) {
      problemas.push(`${ficha.ruta} declara wikidata ${entidad} r${revision}: ${lectura.motivo}`);
      continue;
    }
    const nombre = nombres.get(ficha.autor);
    if (nombre === undefined) {
      problemas.push(`${ficha.ruta}: su Autor «${ficha.autor}» no existe.`);
      continue;
    }
    const cotejo = cotejarAutorDeLaEntidad(lectura.documento.datos, nombre, wikidata.vigente);
    if (!cotejo.ok) {
      problemas.push(`${ficha.ruta} declara wikidata ${entidad} r${revision}: ${cotejo.motivo}`);
      continue;
    }
    const tecnica = fichaTecnicaDe(lectura.documento.datos, (q) => {
      const v = wikidata.vigente(q);
      return v.ok ? v.datos : undefined;
    });
    salida.set(ficha.nombre, { entidad, revision, ...tecnica });
  }

  if (problemas.length > 0) {
    throw new Error(`Regla incumplida: Wikidata (AD-31):\n${problemas.map((p) => `  · ${p}`).join('\n')}`);
  }
  return salida;
}

/** Lo que del almacén del cargador usa `guardarFichasTecnicas` (el patrón de `guardarPosiciones`). */
export interface AlmacenDeFichasTecnicas {
  clear(): void;
  set(entrada: { id: string; data: Record<string, unknown> }): unknown;
}

/** Lee y analiza todo antes de tocar el almacén: una lectura que falla lo deja como estaba. */
export async function guardarFichasTecnicas(opciones: {
  leer: () => Promise<Map<string, FichaTecnicaDeObra>>;
  analizar: (entrada: { id: string; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  almacen: AlmacenDeFichasTecnicas;
}): Promise<void> {
  const { leer, analizar, almacen } = opciones;
  const entradas: { id: string; data: Record<string, unknown> }[] = [];
  for (const [id, ficha] of await leer()) {
    entradas.push({ id, data: await analizar({ id, data: { ...ficha } }) });
  }
  almacen.clear();
  for (const entrada of entradas) almacen.set(entrada);
}
