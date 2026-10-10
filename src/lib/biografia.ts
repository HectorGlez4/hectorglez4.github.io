/**
 * El documento de biografía tal y como lo lee el build — Historias 17.1 y 17.2.
 *
 * La 17.1 escribió el lector en `tools/lib/documento.ts`, y el sitio no puede importar de
 * `tools/`. La 17.2 publica la atribución de la semblanza —Fuente, revisión, enlace
 * permanente y licencia—, y eso exige leer la cabecera **en el build**. Dos lectores de la
 * misma cabecera empezarían idénticos y divergirían a la primera corrección, y entonces una
 * biografía valdría para la puerta y no para la página. Por eso el lector vive aquí y
 * `tools/lib/documento.ts` lo reutiliza.
 *
 * AD-5 — puro: recibe el contenido ya leído y devuelve datos. Quien lee el disco es el
 * cargador de `src/content.config.ts` y, en `tools/`, `leerDocumentosDeBiografia`.
 */

/** La marca de clase que lleva un documento de biografía en su cabecera. */
export const CLASE_BIOGRAFIA = 'biografia';

/** Lo que separa cabecera, declaración y cuerpo en un documento versionado. */
export const SEPARADOR = '---';

/**
 * El nombre visible de cada Fuente de biografía, por su identificador.
 *
 * Su dueño es este módulo y no `tools/lib/fuentes.ts`, que lo **toma** de aquí: la página lo
 * escribe en la atribución y no puede importar de `tools/`. Copiarlo en los dos sitios
 * dejaría que la herramienta dijera «Wikipedia en español» y la página otra cosa.
 */
export const NOMBRES_DE_FUENTE_DE_BIOGRAFIA: Readonly<Record<string, string>> = Object.freeze({
  'wikipedia-es': 'Wikipedia en español',
});

/**
 * La escritura de cada licencia que puede llevar una biografía, en español — Historia 17.2.
 *
 * La atribución enlaza la licencia a su texto: CC BY-SA pide identificarla «con un URI o
 * hipervínculo», y un nombre suelto no lo cumple. Un solo dueño, como el nombre de la Fuente:
 * una licencia que no esté aquí no se publica, y la puerta del build lo dice antes.
 */
export const ENLACES_DE_LICENCIA: Readonly<Record<string, string>> = Object.freeze({
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/deed.es',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
});

/**
 * Una revisión escrita como entero positivo, y nada más — Historia 17.1.
 *
 * El **único** analizador de revisión del proyecto: lo usan la dirección (`oldid=N`), la
 * cabecera del documento (`revision: N`) y la respuesta de la Fuente. Dos analizadores
 * empezarían idénticos y divergirían a la primera corrección, y entonces una revisión
 * valdría al pedirla y no al leerla. `0`, `012`, `12a`, `prev` y lo que no quepa en un
 * entero seguro no son revisiones. Vive aquí desde la 17.2 porque el build también la lee;
 * `tools/lib/fuentes.ts` la reexporta.
 */
export function revisionExacta(valor: string | number | undefined): number | undefined {
  const texto = typeof valor === 'number' ? String(valor) : valor;
  if (texto === undefined || !/^[1-9]\d{0,15}$/u.test(texto)) return undefined;
  const revision = Number(texto);
  return Number.isSafeInteger(revision) ? revision : undefined;
}

/**
 * La cabecera de un **documento de biografía** — Historia 17.1.
 *
 * Un documento de biografía no es el de una obra: no declara obra ni año, y de él no sale
 * ninguna Cita. Lo que lo identifica es el artículo y **la revisión**, porque su Fuente es
 * mutable y lo único fijo de ella es el texto de origen de un `oldid` concreto. Los campos
 * de obra se declaran ausentes a propósito: así quien lee `cabecera.obra` de un documento
 * analizado tiene que contar con que no lo haya, en vez de recibir el título del artículo
 * haciéndose pasar por una obra.
 */
export interface CabeceraDeBiografia {
  clase: 'biografia';
  fuente: string;
  /** El título del artículo, tal y como lo da la dirección pedida o la redirección. */
  titulo: string;
  /** La revisión (`oldid`) cuyo texto de origen es el cuerpo. Forma parte del nombre. */
  revision: number;
  /** El enlace permanente de esa revisión. */
  url: string;
  /** La dirección que se pidió, cuando no es el enlace permanente. */
  pedido?: string;
  /** La fecha de la revisión que la Fuente declara, `AAAA-MM-DD`. */
  fechaDeRevision: string;
  /** La licencia del texto **de esa revisión**, según su fecha. */
  licencia: string;
  recuperado: string;
  obra?: never;
  año?: never;
  traductor?: never;
  añoDeTraduccion?: never;
}

/** Las tres zonas de un documento versionado, con los campos de la cabecera ya separados. */
export interface DocumentoPartido {
  /** Los campos de la cabecera, con la clave en minúsculas. */
  campos: ReadonlyMap<string, string>;
  declaracion: string;
  cuerpo: string;
}

/**
 * Parte un documento versionado en cabecera, declaración y cuerpo. `undefined` si el fichero
 * no tiene esa forma: le faltan los separadores o una línea de cabecera no es `clave: valor`.
 *
 * Lo comparten los documentos de obra y los de biografía; qué campos exige cada clase lo
 * decide quien lo llama.
 */
export function partirDocumento(contenido: string): DocumentoPartido | undefined {
  const lineas = contenido.replace(/\r\n?/gu, '\n').split('\n');
  const primero = lineas.findIndex((linea) => linea.trim() === SEPARADOR);
  if (primero === -1) return undefined;
  const segundo = lineas.findIndex((linea, i) => i > primero && linea.trim() === SEPARADOR);
  if (segundo === -1) return undefined;

  const campos = new Map<string, string>();
  for (const linea of lineas.slice(0, primero)) {
    if (linea.trim() === '') continue;
    const dosPuntos = linea.indexOf(':');
    if (dosPuntos === -1) return undefined;
    campos.set(linea.slice(0, dosPuntos).trim().toLowerCase(), linea.slice(dosPuntos + 1).trim());
  }

  return {
    campos,
    declaracion: lineas.slice(primero + 1, segundo).join('\n').trim(),
    cuerpo: lineas.slice(segundo + 1).join('\n'),
  };
}

/**
 * La cabecera de biografía que declaran unos campos, o `undefined` si no la declaran entera.
 *
 * Exige título, revisión, enlace, fecha de revisión, licencia y fecha de recuperación. Una
 * biografía que declara obra o año es un documento a medio cambiar de clase, y tampoco vale.
 * No mira `clase`: eso lo decide quien llama, que distingue «no es biografía» de «es una
 * biografía mal formada».
 */
export function cabeceraDeBiografia(
  campos: ReadonlyMap<string, string>,
): CabeceraDeBiografia | undefined {
  const fuente = campos.get('fuente');
  const titulo = campos.get('titulo');
  const revision = revisionExacta(campos.get('revision'));
  const url = campos.get('url');
  const recuperado = campos.get('recuperado');
  if (campos.has('obra') || campos.has('año') || campos.has('ano')) return undefined;
  const fechaDeRevision = campos.get('fechaderevision');
  const licencia = campos.get('licencia');
  if (!fuente || !titulo || revision === undefined || !url || !recuperado) return undefined;
  if (!fechaDeRevision || !/^\d{4}-\d{2}-\d{2}$/u.test(fechaDeRevision) || !licencia) {
    return undefined;
  }
  const pedido = campos.get('pedido');
  return {
    clase: CLASE_BIOGRAFIA,
    fuente,
    titulo,
    revision,
    fechaDeRevision,
    licencia,
    url,
    recuperado,
    ...(pedido !== undefined && pedido !== '' ? { pedido } : {}),
  };
}

/**
 * La biografía entera —cabecera y cuerpo— de un documento, o `undefined` si el documento no
 * es una biografía bien formada. Es lo que lee el cargador del build.
 */
export function leerBiografia(
  contenido: string,
): { cabecera: CabeceraDeBiografia; cuerpo: string } | undefined {
  const partido = partirDocumento(contenido);
  if (partido === undefined || partido.campos.get('clase') !== CLASE_BIOGRAFIA) return undefined;
  const cabecera = cabeceraDeBiografia(partido.campos);
  return cabecera === undefined ? undefined : { cabecera, cuerpo: partido.cuerpo };
}

/**
 * Lo que la página necesita de la biografía de un Autor para atribuir su semblanza —
 * Historia 17.2: de quién es el texto, qué revisión, dónde se lee y bajo qué licencia.
 */
export interface AtribucionDeSemblanza {
  /** El título del artículo, de la cabecera: lo que la atribución nombra entre comillas. */
  titulo: string;
  /** El nombre visible de la Fuente: «Wikipedia en español». */
  fuente: string;
  revision: number;
  /** El enlace permanente de esa revisión, tal como lo escribió la recuperación. */
  url: string;
  /** La licencia de **esa** revisión, de su cabecera: CC BY-SA 3.0 o 4.0 según su fecha. */
  licencia: string;
  /** La escritura de esa licencia: ver `ENLACES_DE_LICENCIA`. */
  urlDeLicencia: string;
}

/**
 * La atribución que se publica para una cabecera de biografía, o `undefined` si su Fuente no
 * tiene nombre declarado o su licencia no tiene escritura enlazable: una atribución a medias
 * no atribuye nada.
 */
export function atribucionDeBiografia(
  cabecera: Pick<CabeceraDeBiografia, 'fuente' | 'titulo' | 'revision' | 'url' | 'licencia'>,
): AtribucionDeSemblanza | undefined {
  const fuente = NOMBRES_DE_FUENTE_DE_BIOGRAFIA[cabecera.fuente];
  const urlDeLicencia = ENLACES_DE_LICENCIA[cabecera.licencia];
  if (fuente === undefined || urlDeLicencia === undefined) return undefined;
  return {
    titulo: cabecera.titulo,
    fuente,
    revision: cabecera.revision,
    url: cabecera.url,
    licencia: cabecera.licencia,
    urlDeLicencia,
  };
}
