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
 *   · una etiqueta de cierre saca de la pila hasta la última abierta con su nombre, y una que no
 *     casa con ninguna abierta se ignora.
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
      enMain: antepasados.some((e) => e.etiqueta === 'main'),
      declaracion,
    });
  });
  return enlaces;
}
