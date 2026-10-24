/**
 * Las anotaciones de GitHub Actions: el escapado que exigen sus órdenes de flujo.
 *
 * Vive aparte porque lo usan pasos de dominios distintos —el informe de los Modelos de
 * Ingreso (`tools/lib/ingresos.ts`) y el peso de `dist/` (`tools/lib/peso.ts`)— y ninguno de
 * los dos tiene por qué cargar con el otro para escapar una línea. Puro: ni disco ni proceso.
 */

/**
 * El escapado que exigen las órdenes de flujo de GitHub Actions.
 *
 * Una anotación es **una línea**: un salto de línea la parte y lo que va detrás se pierde o se
 * imprime como texto suelto, así que el aviso deja de verse justo donde se mira. Y el `%` es el
 * carácter de escape del propio formato, de modo que un aviso que lo lleve sale corrompido si
 * no se escapa primero.
 *
 * Un `::` dentro del texto **no** se toca, y es deliberado: el mensaje de una orden de flujo es
 * todo lo que sigue al primer `::`, así que los siguientes son literales. Escaparlos
 * reescribiría el aviso —que es lo que alguien va a leer para decidir— a cambio de nada.
 */
export function escaparAnotacion(texto: string): string {
  return texto
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}
