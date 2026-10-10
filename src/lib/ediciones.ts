/**
 * Las ediciones en venta, como datos — Historia 22.9.
 *
 * Un módulo aparte, sin estado ni E/S, para que la forma de una edición tenga **una sola
 * declaración** que comparten el estado del Modelo (`src/lib/ingreso.ts`), la Obra
 * (`src/lib/obras.ts`) y los componentes que la pintan. Los componentes no pueden importar
 * `ingreso.ts` —lo vigila `tests/unit/ingreso-construido.test.ts`—, y de aquí solo toman tipos:
 * nada de este fichero dice si la afiliación está encendida ni dónde se admite.
 */

/** Los dos formatos de una edición en venta, como los escribe la ficha. */
export const FORMATOS_DE_EDICION = ['impresa', 'electronica'] as const;
export type FormatoDeEdicion = (typeof FORMATOS_DE_EDICION)[number];

/** Una edición lista para pintar: lo que recibe el componente, ya sin nada que decidir. */
export interface EdicionEnVenta {
  /** La dirección con la marca de su tienda, ya compuesta (`urlDeEdicion`). */
  href: string;
  formato: FormatoDeEdicion;
  /** El nombre de la tienda. */
  tienda: string;
  descripcion?: string;
}
