/**
 * Los recuentos de Autores, de Obras y de Citas con su unidad — Historias 26.3, 26.4, 26.6 y 27.3.
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

/**
 * «1 cita», «12 citas»: el recuento de Citas con su unidad, en singular cuando es una — Historia
 * 26.3. Un solo dueño para la Tarjeta de Obra, la Tarjeta Social de Obra, la Fila de Autor del
 * Directorio, la Lista de Obras y, desde la Historia 27.3, el rótulo de cada Obra del selector de
 * `/buscar/` («Maestros ambulantes (23 citas)»), que la lleva al navegador: por eso vive aquí.
 */
export function recuentoDeCitas(n: number): string {
  return n === 1 ? '1 cita' : `${n} citas`;
}

/**
 * El nombre de un Tema dentro de una frase, tras «sobre»: «Siguiente cita sobre la vida», no
 * «sobre La vida» — Historias 24.5 y 27.2.
 *
 * Solo la primera letra pasa a minúscula, con las reglas del español: los Temas empiezan por
 * artículo («La vida», «El deber»), y el resto se respeta para no rebajar un nombre propio
 * interior el día que lo haya. Es la **única** regla de esa minúscula: la usan la Fila
 * «Siguiente…» de la Tarjeta de Obra (por `src/lib/atribucion.ts`, que la reexporta) y el recuento
 * de `/buscar/` con un Tema elegido («8 citas de José Martí sobre la prudencia.»), que la lleva al
 * navegador. Por eso vive en este módulo sin importaciones (Historia 27.2).
 */
export function temaEnFrase(nombre: string): string {
  const [primera = '', ...resto] = nombre;
  return primera.toLocaleLowerCase('es') + resto.join('');
}
