/**
 * Qué clase de superficie es un resultado de la búsqueda propia, y cómo se rotula.
 *
 * Existía repartido en dos sitios y ninguno era dueño: la unión de tipos vivía en las
 * `Props` de `Armazon.astro` y la tabla de rótulos, escrita a mano, en el guion en línea de
 * `src/pages/buscar.astro` **y otra vez** en `tests/e2e/busqueda.spec.ts`. Con tres copias,
 * añadir la Página de Colección dejaba dos de ellas sin enterarse: la del guion habría
 * rotulado cada Colección como «Cita» —el `||` de reserva se lo traga— y la de la prueba
 * habría roto el día que Héctor curase la primera Colección, por un motivo que no tiene
 * nada que ver con lo que estaría haciendo.
 *
 * Aquí la tabla es el dueño y el tipo se **deriva** de ella: quitar una entrada estrecha la
 * unión y `astro check` se para en la página que declara ese tipo. No hay forma de añadir
 * una superficie de producto al índice interno y olvidarse del rótulo.
 *
 * Esto no decide **si** una superficie se indexa —eso sale entero de
 * `src/lib/superficies.ts`, y sigue siendo un solo sitio—, sino cómo se lee su resultado
 * cuando ya está indexada.
 */
export const ETIQUETAS_DE_RESULTADO = {
  cita: 'Cita',
  autor: 'Autor',
  tema: 'Tema',
  coleccion: 'Colección',
} as const;

/** Los tipos que existen, derivados de la tabla y no declarados aparte. */
export type TipoDeResultado = keyof typeof ETIQUETAS_DE_RESULTADO;

/** El tipo por el que responde un resultado sin metadato, o con uno que no reconocemos. */
export const TIPO_POR_OMISION: TipoDeResultado = 'cita';

/**
 * Qué clase de página dice ser una superficie al compartirse — FR-19.
 *
 * `Armazon` declaraba `og:type="article"` para **todas** las páginas del sitio: la portada, el
 * buscador, los Temas, las Colecciones y las Páginas de Autor incluidas. Se vio contándolo en
 * vivo sobre el dominio, y es sencillamente falso: en el Open Graph `article` es una pieza de
 * contenido con autor y fecha, y un listado no lo es. La portada declarándose artículo es el caso
 * que mejor lo enseña.
 *
 * La regla cabe en una línea —**una Cita es un artículo, todo lo demás es un sitio**— y por eso
 * vive aquí, junto a la tabla de la que sale la unión de tipos, y no repartida por cada página:
 * una superficie nueva que olvide declararlo cae del lado correcto sin hacer nada.
 *
 * Las superficies sin tipo —la portada, el buscador, el 404— llegan con `undefined` y caen
 * también en `website`. Ojo con la tentación de reusar `TIPO_POR_OMISION` aquí: aquel es «cita»
 * a propósito, porque un **resultado de búsqueda** sin metadato casi siempre lo es, y aplicarlo a
 * esto devolvería justo el `article` que este cambio viene a quitar de la portada.
 */
export function tipoDeOpenGraph(tipo: TipoDeResultado | undefined): 'article' | 'website' {
  return tipo === 'cita' ? 'article' : 'website';
}
