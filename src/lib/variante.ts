/**
 * Las regiones de la Variante de una Cita atribuida — Historia 35.6, AD-34.
 *
 * Una frase con dos doblajes —el de Latinoamérica y el de España— es **una** Cita: el texto
 * principal da el slug y la URL, y la Variante es un campo de la atribuida (`variante:
 * {texto, region, origen}`) que la Página de Cita lee bajo la atribución, «En España: «…»».
 * Este módulo es el único dueño del conjunto cerrado de regiones y de su rótulo: el esquema
 * (`src/lib/admision.ts`) juzga la clave y `src/lib/atribucion.ts` compone la línea con el
 * rótulo. Una región nueva entra aquí, con su rótulo, y en ningún otro sitio.
 *
 * Puro (AD-5): sin dependencias.
 */

/** Cada región admitida, con el rótulo con que la línea la nombra. */
export const REGIONES_DE_VARIANTE = { espana: 'España' } as const;

export type RegionDeVariante = keyof typeof REGIONES_DE_VARIANTE;

/** Las claves admitidas, en el orden en que se declaran. */
export const CLAVES_DE_REGION = Object.keys(REGIONES_DE_VARIANTE) as RegionDeVariante[];

/** Si un valor es la clave de una región admitida. */
export function esRegionDeVariante(valor: unknown): valor is RegionDeVariante {
  return typeof valor === 'string' && Object.hasOwn(REGIONES_DE_VARIANTE, valor);
}
