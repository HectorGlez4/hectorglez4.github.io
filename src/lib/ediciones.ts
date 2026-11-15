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
  /** La clave de la tienda en `TIENDAS`: su identidad, porque dos nombres pueden coincidir (33.2). */
  claveDeTienda: string;
  descripcion?: string;
}

/** Un grupo de «Dónde leer esta obra»: las ediciones de un formato, con su rótulo. */
export interface GrupoDeEdiciones {
  formato: FormatoDeEdicion;
  rotulo: 'Electrónica' | 'Impresa';
  ediciones: readonly EdicionEnVenta[];
}

/** El orden de los grupos y su rótulo — UX-DR127: «Electrónica» antes que «Impresa». */
const GRUPOS: readonly { formato: FormatoDeEdicion; rotulo: GrupoDeEdiciones['rotulo'] }[] = [
  { formato: 'electronica', rotulo: 'Electrónica' },
  { formato: 'impresa', rotulo: 'Impresa' },
];

/**
 * Las ediciones en venta repartidas por formato — Historia 33.2, UX-DR127, FR-35.
 *
 * La regla, entera y en un solo sitio: «Electrónica» antes que «Impresa»; dentro de cada formato,
 * por tienda en el orden de `ordenDeTiendas` (las claves de `TIENDAS`, en el orden en que Héctor
 * las declara) y, a igual tienda, en el orden de la ficha; un formato sin ediciones no da grupo.
 * Una clave que no está en el orden **lanza**: ordenarla al final en silencio pintaría una
 * edición de una tienda que nadie declaró. Un formato sin grupo en `GRUPOS` también lanza: un
 * formato nuevo de `FORMATOS_DE_EDICION` no puede desaparecer de la página sin que nadie lo vea.
 *
 * Pregunta abierta de la Épica 33: si el orden de las tiendas dentro de un formato es el de
 * `TIENDAS` o el de la ficha. Aquí rige el de `TIENDAS` `[ASSUMPTION]`, aceptado por delegación de
 * Héctor (2026-11-14) y pendiente de `bmad-ux`; cambiarlo es cambiar esta función y sus pruebas.
 */
export function edicionesPorFormato(
  ediciones: readonly EdicionEnVenta[],
  ordenDeTiendas: readonly string[],
): GrupoDeEdiciones[] {
  const posicion = (clave: string): number => {
    const i = ordenDeTiendas.indexOf(clave);
    if (i === -1) {
      throw new Error(
        `Una edición en venta es de la tienda «${clave}», que no está en el orden de las tiendas ` +
          '(TIENDAS de src/lib/ingreso.ts): no hay dónde ponerla.',
      );
    }
    return i;
  };
  const indexadas = ediciones.map((edicion, i) => {
    if (!GRUPOS.some((grupo) => grupo.formato === edicion.formato)) {
      throw new Error(
        `Una edición en venta es de formato «${edicion.formato}», que no tiene grupo en «Dónde leer ` +
          'esta obra» (GRUPOS de src/lib/ediciones.ts): no hay dónde ponerla.',
      );
    }
    return { edicion, i, tienda: posicion(edicion.claveDeTienda) };
  });
  return GRUPOS.flatMap(({ formato, rotulo }) => {
    const delFormato = indexadas
      .filter(({ edicion }) => edicion.formato === formato)
      .sort((a, b) => a.tienda - b.tienda || a.i - b.i)
      .map(({ edicion }) => edicion);
    return delFormato.length === 0 ? [] : [{ formato, rotulo, ediciones: delFormato }];
  });
}
