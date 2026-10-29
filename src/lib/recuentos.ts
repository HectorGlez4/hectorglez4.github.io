/**
 * Los recuentos de Autores y de Obras con su unidad — Historias 26.3, 26.4 y 26.6.
 *
 * Vivían en `src/lib/atribucion.ts`, que importa `superficies.ts` y `marca.ts` y por eso no puede
 * viajar al navegador. La 26.6 los necesita también en el guion del filtro del Directorio —«14
 * autores.», «1 obra.»—, y dos copias de la misma concordancia divergirían a la primera
 * corrección: la meta diría «1 autor» y el recuento anunciado «1 autores». Así que se mudan aquí,
 * a un módulo **sin importaciones**, apto para el cliente, y `atribucion.ts` los reexporta para
 * la meta y la Tarjeta Social, que no cambian.
 *
 * AD-5 — Derivación pura.
 */

/**
 * «1 autor», «135 autores»: el recuento de Autores con su unidad, en singular cuando es uno —
 * Historia 26.3. Un solo dueño para la meta del Directorio de Autores, su Tarjeta Social y el
 * recuento de su filtro (26.6), que dicen la misma cifra y no pueden escribirla de dos maneras.
 */
export function recuentoDeAutores(m: number): string {
  return m === 1 ? '1 autor' : `${m} autores`;
}

/**
 * «1 obra», «5 obras»: el recuento de Obras con su unidad, en singular cuando es una — Historia
 * 26.4. Un solo dueño para la meta del Directorio de Obras, su Tarjeta Social y el recuento de su
 * filtro (26.6).
 */
export function recuentoDeObras(k: number): string {
  return k === 1 ? '1 obra' : `${k} obras`;
}
