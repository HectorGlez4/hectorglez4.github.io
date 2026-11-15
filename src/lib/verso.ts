/**
 * El verso en las salidas — Historia 29.3 (AD-29).
 *
 * Desde la 29.1 el `texto` de una Cita puede guardar sus saltos de verso, un único U+000A
 * entre verso y verso (el esquema rechaza todo lo demás). Este módulo es el **único dueño**
 * de cómo se leen en lo que sale del sitio, y tiene dos funciones y ninguna más:
 *
 * - `versosDe`, los versos, para lo que sí admite saltos: el HTML —que pinta un solo
 *   componente, `src/components/TextoDeCita.astro`— y los lienzos de `src/` (`repartirEnLineas`
 *   de `src/lib/lienzo.ts`). `public/islas/imagen.js` parte por `'\n'` él mismo porque vive
 *   fuera del empaquetado y no puede importar de `src/`.
 * - `enUnaLinea`, con « / » entre versos, para lo que no admite saltos: el título de la
 *   pestaña, la meta descripción, el `text` del JSON-LD y la `description` del RSS.
 *
 * Las dos son puras y sin opciones, a propósito: las consumirán las Épicas 30, 31 y 34 tal
 * cual, y un parámetro nuevo sería un segundo criterio de qué es un verso. Ningún otro fichero
 * de `src/` ni de `public/islas/` parte un texto de Cita por el salto (lo vigila
 * `tests/unit/verso.test.ts`).
 */

/** Los versos del texto, en orden. Un texto sin saltos es un verso: `[texto]`. */
export function versosDe(texto: string): string[] {
  return texto.split('\n');
}

/** El texto en un solo renglón, con « / » donde había un salto. Sin saltos, el mismo texto. */
export function enUnaLinea(texto: string): string {
  return versosDe(texto).join(' / ');
}
