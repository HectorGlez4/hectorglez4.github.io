/**
 * Las Fuentes admitidas para extraer candidatas — FR-23.
 *
 * Una Fuente es de dónde sale el **texto transcrito**, y no es lo mismo que la
 * Procedencia: la Procedencia es la obra y el año en que la Cita se publicó; la Fuente es
 * la edición digital de la que se copió. Confundirlas produciría Citas cuya procedencia
 * es «Wikisource», que no documenta nada.
 *
 * El conjunto es cerrado y cada entrada dice si su licencia permite reutilizar. La
 * Épica 9 es explícita sobre lo que **no** se hace: rastrear sitios de citas. Sus
 * compilaciones están protegidas y —lo decisivo— publican texto y nombre sin obra ni año,
 * así que cada Cita extraída de ahí moriría en `corpus/_revision/`.
 *
 * Este módulo es puro y no toca la red (AD-22). Aquí solo se decide **a qué Fuente
 * pertenece** una dirección; quien la pide es `tools/recuperar.ts` y nadie más.
 */

import { NOMBRES_DE_FUENTE_DE_BIOGRAFIA, revisionExacta } from '../../src/lib/biografia.ts';

export interface Fuente {
  id: string;
  nombre: string;
  /** La licencia tal y como la declara la Fuente. Se copia en cada candidata. */
  licencia: string;
  permiteReutilizacion: boolean;
  /** Por qué no, cuando no. Es lo que se le dice al editor al detener el proceso. */
  razon?: string;
  /**
   * Anfitriones por los que se reconoce una dirección de esta Fuente.
   *
   * Se incluyen las variantes móviles: una URL copiada del móvil (`es.m.wikisource.org`)
   * es la misma Fuente y la misma obra, y rechazarla obligaría a reescribirla a mano —
   * que es exactamente el gesto que esta historia quiere quitar de en medio.
   */
  anfitriones: readonly string[];
  /**
   * Historia 17.1 — una Fuente cuyo contenido **cambia**: un artículo de enciclopedia que
   * edita cualquiera. Solo se admite por revisión, y por eso declara `revision`: una Fuente
   * mutable sin direccionamiento por revisión no entra en el conjunto (ver
   * `fuentesMalDeclaradas`, que `tests/unit/extraccion.test.ts` exige vacía).
   *
   * De una Fuente mutable no sale ninguna Cita: su documento es una **biografía**, se
   * versiona en `corpus/biografias/` y el cotejo de Citas no lo lee nunca.
   */
  mutable?: true;
  revision?: DireccionamientoPorRevision;
}

/**
 * Cómo se dirige **una revisión concreta** de una Fuente mutable — Historia 17.1.
 *
 * La dirección viva de un artículo devuelve lo que diga hoy, y la página renderizada de una
 * revisión resuelve plantillas y transclusiones en vivo: ninguna de las dos es un documento
 * fijo. El texto de origen de una revisión sí lo es, byte a byte, y es lo único que se pide.
 */
export interface DireccionamientoPorRevision {
  /** La revisión que una dirección pide, o `undefined` si no pide ninguna. */
  revisionDe(url: string): number | undefined;
  /**
   * El título que la dirección **teclea**, si teclea alguno (`title=` o `/wiki/Título`).
   *
   * No es el título del documento: ese lo declara la Fuente (`declaracion`). Este solo sirve
   * para negarse cuando lo tecleado y lo declarado no son el mismo artículo.
   */
  tituloPedido(url: string): string | undefined;
  /** Donde la Fuente **declara** el título y la fecha de esa revisión. */
  declaracion(revision: number): string;
  /** La única dirección de texto que se descarga: el texto de origen de esa revisión. */
  origen(revision: number): string;
  /** El enlace permanente que se escribe en la cabecera, y que se publicará con la atribución. */
  enlacePermanente(titulo: string, revision: number): string;
  /** La licencia del texto de una revisión, según su fecha (`AAAA-MM-DD`). */
  licenciaEn(fecha: string): string;
}

/*
 * El único analizador de revisión del proyecto vive en `src/lib/biografia.ts` desde la
 * Historia 17.2, porque el build también lee la revisión de una biografía. Se reexporta aquí
 * para que `tools/` lo siga encontrando donde estaba.
 */
export { revisionExacta };

/** El enlace permanente por ruta: `/wiki/Especial:EnlacePermanente/N` o `/wiki/Special:PermanentLink/N`. */
const RUTA_DE_ENLACE_PERMANENTE = /^\/wiki\/(?:Especial:EnlacePermanente|Special:PermanentLink)\/([^/]+)$/u;

function rutaLegible(url: URL): string | undefined {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
}

/**
 * La revisión de una dirección de MediaWiki: `oldid=<entero>`, en `/w/index.php?title=…&oldid=N`
 * o en `/wiki/Título?oldid=N`, o el enlace permanente por ruta.
 *
 * Un `diff=` no es un enlace permanente: compara dos revisiones y su `oldid` es solo una de
 * ellas. Un `direction=` tampoco: pide la revisión **siguiente o anterior** a ese `oldid`, no
 * esa. Ni vale un `oldid` que no sea una revisión exacta: «más o menos esa revisión» es la
 * dirección viva con otro nombre.
 */
function revisionDeMediaWiki(url: string): number | undefined {
  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return undefined;
  }
  if (analizada.searchParams.has('diff') || analizada.searchParams.has('direction')) {
    return undefined;
  }

  const ruta = rutaLegible(analizada);
  const porRuta = ruta === undefined ? null : RUTA_DE_ENLACE_PERMANENTE.exec(ruta);
  const valores = analizada.searchParams.getAll('oldid');
  if (porRuta !== null) return valores.length === 0 ? revisionExacta(porRuta[1]) : undefined;

  if (valores.length !== 1) return undefined;
  return revisionExacta(valores[0]);
}

/** El título tecleado en una dirección de MediaWiki, con los guiones bajos como espacios. */
function tituloDeMediaWiki(url: string): string | undefined {
  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return undefined;
  }
  const ruta = rutaLegible(analizada);
  if (ruta === undefined || RUTA_DE_ENLACE_PERMANENTE.test(ruta)) return undefined;

  const crudo =
    analizada.searchParams.get('title') ??
    (ruta.startsWith('/wiki/') ? ruta.slice('/wiki/'.length) : undefined);
  const titulo = crudo === undefined ? undefined : mismoTitulo(crudo);
  return titulo === undefined || titulo === '' ? undefined : titulo;
}

/** Un título de MediaWiki normalizado para comparar: guiones bajos por espacios, colapsados. */
export function mismoTitulo(titulo: string): string {
  return titulo.replace(/_/gu, ' ').replace(/\s+/gu, ' ').trim();
}

/**
 * Wikipedia cambió de licencia el 29 de junio de 2023: lo publicado antes es CC BY-SA 3.0,
 * lo publicado desde entonces es CC BY-SA 4.0. La licencia de un documento es la de **su**
 * revisión, no la que la Fuente declara hoy.
 */
export const CAMBIO_A_CC_BY_SA_4 = '2023-06-29';

function direccionamientoDeMediaWiki(anfitrion: string): DireccionamientoPorRevision {
  return {
    revisionDe: revisionDeMediaWiki,
    tituloPedido: tituloDeMediaWiki,
    declaracion: (revision) =>
      `https://${anfitrion}/w/api.php?action=query&prop=revisions|info&revids=${revision}` +
      '&rvprop=timestamp|ids&format=json',
    origen: (revision) => `https://${anfitrion}/w/index.php?oldid=${revision}&action=raw`,
    enlacePermanente: (titulo, revision) =>
      `https://${anfitrion}/w/index.php?title=${encodeURIComponent(titulo.replace(/ /gu, '_'))}` +
      `&oldid=${revision}`,
    licenciaEn: (fecha) => (fecha < CAMBIO_A_CC_BY_SA_4 ? 'CC BY-SA 3.0' : 'CC BY-SA 4.0'),
  };
}

export const FUENTES: readonly Fuente[] = [
  {
    id: 'wikisource-es',
    nombre: 'Wikisource en español',
    licencia: 'CC BY-SA 4.0',
    permiteReutilizacion: true,
    anfitriones: ['es.wikisource.org', 'es.m.wikisource.org'],
  },
  {
    id: 'gutenberg',
    nombre: 'Project Gutenberg',
    licencia: 'dominio público',
    permiteReutilizacion: true,
    anfitriones: ['gutenberg.org', 'www.gutenberg.org', 'm.gutenberg.org'],
  },
  {
    id: 'cervantes-virtual',
    nombre: 'Biblioteca Virtual Miguel de Cervantes',
    licencia: 'CC BY-NC-SA 4.0',
    permiteReutilizacion: false,
    razon:
      'su licencia excluye el uso comercial, y el Corpus se publica sin esa restricción: ' +
      'una Cita con esa procedencia contaminaría las condiciones de todo el conjunto.',
    anfitriones: ['cervantesvirtual.com', 'www.cervantesvirtual.com'],
  },
  {
    /*
     * Historia 17.1 — la Fuente de la semblanza de un Autor (17.2). Su texto es prosa original
     * de contribuyentes vivos y cambia cada día, así que solo entra **por revisión**: el
     * documento es el wikitexto de un `oldid` concreto, que no cambia nunca.
     */
    id: 'wikipedia-es',
    // El nombre lo publica la página en la atribución de la semblanza, y su dueño es
    // `src/lib/biografia.ts` (Historia 17.2): de ahí lo toma esta entrada.
    nombre: NOMBRES_DE_FUENTE_DE_BIOGRAFIA['wikipedia-es']!,
    licencia: 'CC BY-SA 4.0',
    permiteReutilizacion: true,
    anfitriones: ['es.wikipedia.org', 'es.m.wikipedia.org'],
    mutable: true,
    revision: direccionamientoDeMediaWiki('es.wikipedia.org'),
  },
];

/**
 * Las Fuentes mutables que no declaran cómo se dirige una revisión. Tiene que estar vacía.
 *
 * Una Fuente mutable sin revisión solo se podría recuperar por su dirección viva, y entonces
 * el documento versionado y el que la Fuente sirve hoy dejarían de ser el mismo sin que nada
 * fallara. `fuenteDeUrl` no reconoce ninguna de estas: no entran en el conjunto.
 */
export function fuentesMalDeclaradas(fuentes: readonly Fuente[] = FUENTES): Fuente[] {
  return fuentes.filter((f) => f.mutable === true && f.revision === undefined);
}

export function fuenteDe(id: string): Fuente | undefined {
  return FUENTES.find((f) => f.id === id);
}

/**
 * La Fuente a la que pertenece una dirección, o `undefined` si no pertenece a ninguna.
 *
 * La coincidencia es **exacta de anfitrión o de subdominio real**, nunca de subcadena:
 * `gutenberg.org.example.com` termina en `example.com` y no es Project Gutenberg, pero
 * un `endsWith('gutenberg.org')` lo daría por bueno y traería texto de cualquiera con la
 * licencia de una Fuente admitida escrita al lado.
 *
 * Solo `http` y `https`. `file:`, `data:` y `javascript:` no son Fuentes: son formas de
 * que la recuperación lea algo que nadie publicó.
 */
export function fuenteDeUrl(url: string): Fuente | undefined {
  let analizada: URL;
  try {
    analizada = new URL(url);
  } catch {
    return undefined;
  }

  if (analizada.protocol !== 'http:' && analizada.protocol !== 'https:') return undefined;

  // El punto final del FQDN («es.wikisource.org.») designa el mismo anfitrión.
  const anfitrion = analizada.hostname.toLowerCase().replace(/\.$/u, '');
  if (anfitrion === '') return undefined;

  return FUENTES.find(
    (fuente) =>
      // Una Fuente mutable sin direccionamiento por revisión no entra en el conjunto.
      !(fuente.mutable === true && fuente.revision === undefined) &&
      fuente.anfitriones.some((a) => anfitrion === a || anfitrion.endsWith(`.${a}`)),
  );
}

/** Cuánto se espera antes del reintento número `n`, en milisegundos. */
const ESPERA_BASE_MS = 1500;

/**
 * Repite lo que falla por rachas, y se rinde a tiempo.
 *
 * Wikisource limita la tasa **por rachas**: la misma dirección contesta 200, 503 y 200 en tres
 * intentos seguidos. Un 503 dice «ahora no», no «esto no existe», y reintentar es de las pocas
 * respuestas honestas que admite.
 *
 * Hace falta porque el fallo no se queda en el fallo. Cuando el wikitexto no llega, `recuperar`
 * versiona el documento igual —con un aviso— y lo deja sin el metadato que la Fuente declara,
 * **el Autor incluido**; dos pasos más allá, la puerta de FR-23 informa de que «el documento no
 * declara autor» de una página que sí lo declara.
 *
 * Se espera **más en cada intento**, para no empujar a quien acaba de decir que no. Y hay tope:
 * sin él, una Fuente caída dejaría la orden colgada para siempre, que es peor que un aviso
 * porque no se puede leer.
 *
 * La espera se inyecta para que las pruebas no duerman de verdad.
 */
export async function conReintentos<T>(
  intentar: () => Promise<T>,
  logrado: (resultado: T) => boolean,
  opciones: { intentos?: number; esperar?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const intentos = opciones.intentos ?? 3;
  const esperar =
    opciones.esperar ?? ((ms: number) => new Promise<void>((listo) => setTimeout(listo, ms)));

  let ultimo = await intentar();
  for (let n = 1; n < intentos && !logrado(ultimo); n += 1) {
    await esperar(ESPERA_BASE_MS * n);
    ultimo = await intentar();
  }
  return ultimo;
}
