/**
 * AD-3 — Una sola normalización canónica de texto.
 *
 * La búsqueda, la detección de duplicados y la generación de slugs consumen esta
 * función y ninguna implementa la suya. La divergencia que eso impide es concreta: que
 * la búsqueda considere iguales «café» y «cafe» mientras la detección de duplicados los
 * considere distintos, y que el desacuerdo solo aparezca en producción.
 *
 * AD-5 — Derivación pura: sin lecturas de disco, sin Astro, sin componentes.
 */

/**
 * Signos que se eliminan. Incluye los que el español usa y el inglés no —comillas
 * angulares, apertura de interrogación y exclamación—, porque el corpus está en
 * español y una expresión pensada para el inglés los dejaría pasar.
 */
const PUNTUACION = /[¡!¿?"'“”‘’«»(){}\[\]<>.,;:…—–\-_/\\|@#$%^&*+=~`]/gu;

/** Marcas diacríticas combinantes que deja al descubierto la descomposición NFD. */
const DIACRITICOS = /\p{M}+/gu;

/**
 * Forma canónica de un texto: minúsculas, sin diacríticos, sin puntuación y con los
 * espacios colapsados.
 *
 * Sobre la eñe: descomponer en NFD convierte «ñ» en «n». En español la eñe es una letra
 * propia y no una ene acentuada, así que lingüísticamente es una pérdida. Se acepta a
 * propósito, porque el propósito de esta función lo exige: FR-7 promete que el visitante
 * encuentre «escribiendo como se escribe de verdad, sin acentos», y quien busca «español»
 * teclea «espanol». Conservar la eñe rompería esa búsqueda. Lo que AD-3 prohíbe no es
 * tomar esta decisión, sino tomarla dos veces y distinta en cada sitio.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(PUNTUACION, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Las palabras de un texto en forma canónica. La búsqueda por fragmento de FR-7 y la
 * derivación de slugs de AD-4 trabajan sobre palabras, no sobre la cadena entera.
 */
export function palabras(texto: string): string[] {
  const canonico = normalizar(texto);
  return canonico === '' ? [] : canonico.split(' ');
}

/**
 * Dos textos son el mismo a efectos del corpus cuando su forma canónica coincide.
 * Es la comparación que usa la detección de duplicados de FR-14: distinta puntuación,
 * distinta acentuación y distintas mayúsculas describen la misma Cita.
 */
export function equivalentes(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}
