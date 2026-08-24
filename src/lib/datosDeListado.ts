/**
 * El `ItemList` de una página que lista Citas — Página de Autor y Página de Tema.
 *
 * Las 252 Páginas de Cita declaran cada una su `Quotation` desde la Historia de NFR-3, y
 * la portada declara el `WebSite`. Entre las dos faltaba el piso de en medio: las páginas
 * que agrupan. Sin ellas un buscador ve 252 hojas y un dominio, y tiene que adivinar que
 * `/autor/seneca` es la página **de** Séneca y no otra hoja más que lo menciona.
 *
 * Puro y sin disco, como exige AD-5: aquí solo se deriva. Quien lo emite son
 * `DatosDeAutor.astro` y `DatosDeTema.astro`, que son cáscaras finas encima de esto.
 *
 * ── La decisión que hay dentro ───────────────────────────────────────────────────────
 *
 * Estas páginas están paginadas (FR-5), así que hay que elegir qué enumera la lista de la
 * página 2 de un Autor con veinte Citas. Se enumeran **las de esta página, con su posición
 * global**, y no las veinte. Los motivos, por orden de peso:
 *
 * 1. Un `ItemList` que nombra veinte elementos en una página donde se ven seis dice algo
 *    que la página no dice. Es la misma clase de discrepancia que el `noindex` y el
 *    sitemap tuvieron hasta la Historia 12.1, y acabó publicando lo que no debía.
 * 2. Es lo que Google documenta para listas paginadas.
 *
 * La posición sí es global —la primera Cita de la página 2 es la número 7, no la 1—
 * porque `position` significa «lugar en la lista», y la lista es el Autor entero. Con
 * posiciones locales, tres páginas declararían tres elementos en la posición 1.
 */

import type { Cita } from './publicado.ts';

/** Un elemento del `ItemList`: la Cita, por su URL, con su lugar en la lista completa. */
export interface ElementoDeLista {
  '@type': 'ListItem';
  position: number;
  url: string;
}

export interface ListaDeCitas {
  '@type': 'ItemList';
  /** Cuántas Citas enumera **esta** página, que es lo que el visitante ve. */
  numberOfItems: number;
  itemListOrder: 'https://schema.org/ItemListOrderAscending';
  itemListElement: ElementoDeLista[];
}

export interface TramoDeLaLista {
  /** Página actual, desde 1, tal y como la da `paginate()` de Astro. */
  readonly actual: number;
  /** Cuántas Citas cabe en cada página. */
  readonly porPagina: number;
}

/**
 * El `ItemList` de las Citas de esta página, con posiciones referidas a la lista entera.
 *
 * `url` y no `item` con la `Quotation` incrustada: la Página de Cita ya la declara entera
 * y con su `@id`. Repetirla aquí sería el mismo dato en dos sitios —lo que este
 * repositorio evita en el sitemap, en el `noindex` y en los rangos de las fuentes— con la
 * diferencia de que aquí las dos copias las lee una máquina que tiene que decidir cuál
 * vale. Una URL no puede discrepar de sí misma.
 */
export function listaDeCitas(
  citas: readonly Cita[],
  origen: string | URL,
  tramo: TramoDeLaLista,
): ListaDeCitas {
  const primera = (tramo.actual - 1) * tramo.porPagina;

  return {
    '@type': 'ItemList',
    numberOfItems: citas.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: citas.map((cita, i) => ({
      '@type': 'ListItem',
      position: primera + i + 1,
      url: new URL(`/cita/${cita.slug}`, origen).href,
    })),
  };
}
