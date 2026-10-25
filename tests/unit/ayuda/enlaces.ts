import { ATRIBUTO_DE_ZONA, ATRIBUTO_SIN_ZONA } from '../../../src/lib/medicion.ts';

/**
 * Historia 23.7 — un tokenizador mínimo de HTML, con pila de etiquetas, para preguntar a `dist/`
 * por los enlaces y las Zonas de salida interna sin depender de un analizador que no es
 * dependencia del proyecto (`parse5` llega con otros paquetes, pero no está declarado).
 *
 * Lo justo para el marcado que emite Astro, que cierra lo que abre:
 *
 *   · las etiquetas vacías (`<br>`, `<meta>`, `<link>`…) y las que se cierran solas (`<x/>`) no
 *     entran en la pila;
 *   · el contenido de `<script>`, `<style>`, `<textarea>` y `<title>` se salta entero, igual que
 *     los comentarios y las declaraciones (`<!doctype>`): un `<a` dentro de un guion no es un
 *     enlace;
 *   · los valores de atributo entre comillas pueden llevar `>` dentro;
 *   · una etiqueta de cierre saca de la pila la última abierta con su nombre, y una que no casa
 *     con ninguna abierta se ignora;
 *   · el marcado que el analizador del navegador **reordenaría** al construir el DOM no se emula:
 *     se rechaza, lanzando con el motivo. Emular a medias es peor que no emular, porque el DOM
 *     puede darle a un enlace otra zona —o un duplicado sin ninguna— que la que le da la pila, y la
 *     prueba de `dist/` lo daría por medido. Se rechaza un bloque (`<div>`, `<ul>`, `<section>`…)
 *     que cerraría un `<p>` abierto; un `<li>`, `<dd>` o `<dt>` que cerraría el anterior; un
 *     `<button>` dentro de otro; un encabezado dentro de otro; un `<a>` dentro de otro sin una marca
 *     de formato entre los dos (`td`, `th`, `caption`, `object`…: ahí el navegador corre el
 *     algoritmo de adopción, que clona); un elemento suelto dentro de una tabla (que el navegador
 *     saca de ella); y una etiqueta de cierre que deja abierto algo de dentro (un `<a>` así se
 *     reconstruye después, clonado, fuera de su sitio). Astro cierra lo que abre, así que el rechazo
 *     solo salta ante un marcado nuevo, y entonces la prueba lo nombra en vez de pasar en falso.
 *
 * Lo prueban fragmentos escritos a mano en `tests/unit/medicion.test.ts`, para que la prueba de
 * `dist/` no pase en vacío.
 */

/** Un elemento abierto: su etiqueta, en minúsculas, y sus atributos, con las entidades resueltas. */
export interface Elemento {
  etiqueta: string;
  atributos: ReadonlyMap<string, string>;
}

/** Lo que declara el contenedor más cercano de un enlace: una zona o una exención. */
export type Declaracion = { zona: string } | { sinZona: string };

/** Un `<a>` de la página. */
export interface EnlaceDeLaPagina {
  /** Su `href`, tal como va escrito (con las entidades resueltas), o `undefined` si no lo lleva. */
  href: string | undefined;
  /** Su `target`, si lo lleva. */
  target?: string;
  /** Si está dentro de `<main>`. */
  enMain: boolean;
  /**
   * La declaración más cercana —en el propio enlace o en un antepasado—, como la toma la escucha
   * del fichero con `closest`: si un elemento lleva las dos, manda la exención. `null` si no hay.
   */
  declaracion: Declaracion | null;
}

const VACIAS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const TEXTO_CRUDO = new Set(['script', 'style', 'textarea', 'title']);
/** Las etiquetas que, al abrirse, cierran el `<p>` abierto (WHATWG, «close a p element»). */
const CIERRAN_P = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'center',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'listing',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'pre',
  'search',
  'section',
  'summary',
  'table',
  'ul',
  'xmp',
]);
/** Los límites del ámbito por omisión (WHATWG, «has an element in scope»), sin los de MathML y SVG. */
const LIMITES_DE_AMBITO = new Set(['applet', 'caption', 'html', 'marquee', 'object', 'table', 'td', 'template', 'th']);
/** Las que ponen una marca en la lista de elementos de formato: un `<a>` de antes de ellas no cuenta. */
const MARCAS_DE_FORMATO = new Set(['applet', 'caption', 'marquee', 'object', 'td', 'template', 'th']);
/** Los elementos «especiales» que pueden quedar en la pila (WHATWG): cortan la búsqueda de `li`, `dd` y `dt`. */
const ESPECIALES = new Set([
  ...CIERRAN_P,
  ...LIMITES_DE_AMBITO,
  'body',
  'button',
  'colgroup',
  'frameset',
  'head',
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
  'select',
  'tbody',
  'tfoot',
  'thead',
  'tr',
]);
/** Dentro de estas, lo que no es estructura de tabla el navegador lo saca fuera («foster parenting»). */
const CONTEXTO_DE_TABLA = new Set(['table', 'tbody', 'tfoot', 'thead', 'tr']);
const ESTRUCTURA_DE_TABLA = new Set(['caption', 'col', 'colgroup', 'script', 'style', 'tbody', 'td', 'template', 'tfoot', 'th', 'thead', 'tr']);
const ENCABEZADO = /^h[1-6]$/;

const ENTIDADES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
const resolverEntidades = (texto: string) =>
  texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entera, nombre: string) => {
    if (nombre[0] === '#') {
      const codigo = nombre[1] === 'x' || nombre[1] === 'X' ? parseInt(nombre.slice(2), 16) : parseInt(nombre.slice(1), 10);
      // Fuera de Unicode `fromCodePoint` lanza: la entidad se deja tal cual, y la prueba informa.
      return Number.isFinite(codigo) && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : entera;
    }
    return ENTIDADES[nombre.toLowerCase()] ?? entera;
  });

/**
 * Recorre el HTML y llama a `visitar` por cada etiqueta de apertura, con el elemento y sus
 * antepasados abiertos, del más lejano al más cercano.
 */
export function recorrerElementos(
  html: string,
  visitar: (elemento: Elemento, antepasados: readonly Elemento[]) => void,
): void {
  // Expresiones pegajosas (`y`): leen en la posición de `lastIndex` sin trocear el HTML.
  const CIERRE = /<\/([a-zA-Z][\w:-]*)[^>]*>/y;
  const APERTURA = /<([a-zA-Z][\w:-]*)/y;
  const ESPACIOS = /\s*/y;
  const NOMBRE = /[^\s"'>/=]+/y;
  const SIN_COMILLAS = /[^\s>]*/y;
  const leer = (expresion: RegExp, desde: number) => {
    expresion.lastIndex = desde;
    return expresion.exec(html);
  };
  const saltarEspacios = (desde: number) => desde + leer(ESPACIOS, desde)![0].length;

  const pila: Elemento[] = [];
  /** Si hay abierto alguno de `nombres` antes de llegar, de dentro afuera, a un elemento que `corta`. */
  const abierto = (nombres: readonly string[], corta: (etiqueta: string) => boolean) => {
    for (let k = pila.length - 1; k >= 0; k--) {
      if (nombres.includes(pila[k].etiqueta)) return true;
      if (corta(pila[k].etiqueta)) return false;
    }
    return false;
  };
  const rechazar = (motivo: string, desde: number): never => {
    throw new Error(
      `El navegador reordenaría este marcado al construir el DOM, y el tokenizador no lo emula: ${motivo}, en «${html.slice(desde, desde + 80)}».`,
    );
  };
  /** Lo que el navegador haría distinto de la pila al abrir `etiqueta`, si algo: entonces se rechaza. */
  const revisarApertura = (etiqueta: string, desde: number) => {
    const actual = pila.at(-1)?.etiqueta;
    if (actual !== undefined && CONTEXTO_DE_TABLA.has(actual) && !ESTRUCTURA_DE_TABLA.has(etiqueta)) {
      rechazar(`<${etiqueta}> suelto dentro de <${actual}>, que el navegador saca de la tabla`, desde);
    }
    if (etiqueta === 'a' && abierto(['a'], (e) => MARCAS_DE_FORMATO.has(e))) {
      rechazar('un <a> dentro de otro <a>', desde);
    }
    const cortaLaLista = (e: string) => ESPECIALES.has(e) && e !== 'address' && e !== 'div' && e !== 'p';
    if (etiqueta === 'li' && abierto(['li'], cortaLaLista)) rechazar('un <li> que cerraría el <li> abierto', desde);
    if ((etiqueta === 'dd' || etiqueta === 'dt') && abierto(['dd', 'dt'], cortaLaLista)) {
      rechazar(`un <${etiqueta}> que cerraría el <dd> o <dt> abierto`, desde);
    }
    if (etiqueta === 'button' && abierto(['button'], (e) => LIMITES_DE_AMBITO.has(e))) {
      rechazar('un <button> dentro de otro', desde);
    }
    if (CIERRAN_P.has(etiqueta) && abierto(['p'], (e) => LIMITES_DE_AMBITO.has(e) || e === 'button')) {
      rechazar(`un <${etiqueta}> que cerraría el <p> abierto`, desde);
    }
    if (ENCABEZADO.test(etiqueta) && actual !== undefined && ENCABEZADO.test(actual)) {
      rechazar(`un <${etiqueta}> dentro de un <${actual}>`, desde);
    }
  };
  let i = 0;
  while (i < html.length) {
    const menor = html.indexOf('<', i);
    if (menor < 0) break;
    i = menor;
    if (html.startsWith('<!--', i)) {
      const fin = html.indexOf('-->', i + 4);
      i = fin < 0 ? html.length : fin + 3;
      continue;
    }
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const fin = html.indexOf('>', i);
      i = fin < 0 ? html.length : fin + 1;
      continue;
    }
    const cierre = leer(CIERRE, i);
    if (cierre) {
      const nombre = cierre[1].toLowerCase();
      const indice = pila.map((e) => e.etiqueta).lastIndexOf(nombre);
      if (indice >= 0 && indice < pila.length - 1) {
        rechazar(`</${nombre}> con <${pila.at(-1)!.etiqueta}> aún abierto dentro`, i);
      }
      if (indice >= 0) pila.length = indice;
      i += cierre[0].length;
      continue;
    }
    const apertura = leer(APERTURA, i);
    if (!apertura) {
      // Un `<` suelto en el texto.
      i++;
      continue;
    }
    const etiqueta = apertura[1].toLowerCase();
    revisarApertura(etiqueta, i);
    let j = i + apertura[0].length;
    const atributos = new Map<string, string>();
    let sola = false;
    for (;;) {
      j = saltarEspacios(j);
      if (j >= html.length) break;
      if (html[j] === '>') {
        j++;
        break;
      }
      if (html.startsWith('/>', j)) {
        sola = true;
        j += 2;
        break;
      }
      if (html[j] === '/') {
        j++;
        continue;
      }
      const leido = leer(NOMBRE, j);
      if (!leido) {
        // Una comilla o un `=` sin nombre delante: no es un atributo, se salta.
        j++;
        continue;
      }
      const nombre = leido[0];
      j = saltarEspacios(j + nombre.length);
      let valor = '';
      if (html[j] === '=') {
        j = saltarEspacios(j + 1);
        const comilla = html[j];
        if (comilla === '"' || comilla === "'") {
          const fin = html.indexOf(comilla, j + 1);
          valor = html.slice(j + 1, fin < 0 ? html.length : fin);
          j = fin < 0 ? html.length : fin + 1;
        } else {
          valor = leer(SIN_COMILLAS, j)![0];
          j += valor.length;
        }
      }
      const clave = nombre.toLowerCase();
      if (!atributos.has(clave)) atributos.set(clave, resolverEntidades(valor));
    }
    i = j;
    const elemento: Elemento = { etiqueta, atributos };
    visitar(elemento, [...pila]);
    if (sola || VACIAS.has(etiqueta)) continue;
    if (TEXTO_CRUDO.has(etiqueta)) {
      const fin = new RegExp(`</${etiqueta}`, 'gi');
      fin.lastIndex = i;
      i = fin.exec(html)?.index ?? html.length;
      continue;
    }
    pila.push(elemento);
  }
}

/** La declaración de zona de un elemento, si la lleva: la exención manda, como en el fichero. */
export function declaracionDe(elemento: Elemento): Declaracion | null {
  const sinZona = elemento.atributos.get(ATRIBUTO_SIN_ZONA);
  if (sinZona !== undefined) return { sinZona };
  const zona = elemento.atributos.get(ATRIBUTO_DE_ZONA);
  if (zona !== undefined) return { zona };
  return null;
}

/** Cada `<a>` de la página, con su `href`, si está en `<main>` y la declaración más cercana. */
export function enlacesDe(html: string): EnlaceDeLaPagina[] {
  const enlaces: EnlaceDeLaPagina[] = [];
  recorrerElementos(html, (elemento, antepasados) => {
    if (elemento.etiqueta !== 'a') return;
    let declaracion: Declaracion | null = null;
    for (const candidato of [elemento, ...[...antepasados].reverse()]) {
      declaracion = declaracionDe(candidato);
      if (declaracion !== null) break;
    }
    enlaces.push({
      href: elemento.atributos.get('href'),
      ...(elemento.atributos.has('target') ? { target: elemento.atributos.get('target') } : {}),
      enMain: antepasados.some((e) => e.etiqueta === 'main'),
      declaracion,
    });
  });
  return enlaces;
}
