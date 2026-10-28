import type { Familia } from './superficies.ts';

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
 *
 * Desde la Historia 26.7 las claves son **las familias con resultado más `portada`**, y lo ata el
 * `satisfies`: las familias las declara `src/lib/superficies.ts` (`FAMILIAS`) y una familia nueva
 * sin rótulo para `astro check`. La importación es solo de tipo, así que esta tabla no arrastra
 * `superficies.ts` al guion de `/buscar/`.
 */
export const ETIQUETAS_DE_RESULTADO = {
  cita: 'Cita',
  autor: 'Autor',
  tema: 'Tema',
  coleccion: 'Colección',
  // Historia 22.4 — las Obras indexables entran en Pagefind con su tipo. Desde la 22.7 el
  // resultado lleva el título en Inter y el Autor debajo (metadato `autor` de la Cabecera de
  // Obra), y se lee «Obra: {título}, de {Autor}»; lo pinta `src/pages/buscar.astro`.
  obra: 'Obra',
  // Historia 26.2 — los Directorios (`/autores/` y `/obras/`, desde la 26.3) y la portada. La
  // portada responde solo por su `h1`, que es `MARCA` (`src/lib/marca.ts`): el rótulo no la
  // repite, y su título en el índice sale de ese `h1`, no de esta tabla.
  directorio: 'Directorio',
  portada: 'Portada',
} as const satisfies Record<Familia | 'portada', string>;

/** Los tipos que existen, derivados de la tabla y no declarados aparte. */
export type TipoDeResultado = keyof typeof ETIQUETAS_DE_RESULTADO;

/** El tipo por el que responde un resultado sin filtro de tipo, o con uno que no reconocemos. */
export const TIPO_POR_OMISION: TipoDeResultado = 'cita';

/**
 * El nombre del filtro de Pagefind por el que viaja el tipo — Historia 26.2, AD-17, AD-19.
 *
 * Hasta la 26.2 el tipo iba en `data-pagefind-meta="tipo:…"`, y desde Pagefind 1.5 la metadata
 * **se busca** por omisión: buscar «obra» o «cita» devolvía toda página de ese tipo aunque no
 * dijera la palabra (medido el 2026-10-26: «cita» daba 4.559 resultados, y 215 de los 400
 * primeros de «obra» no la tenían en el contenido). Un peso 0 en `metaWeights` no lo arregla:
 * quita su efecto en el orden, no la coincidencia, y la página sigue saliendo.
 *
 * Un **filtro** no entra en el texto que se busca, llega en el fragmento de cada resultado
 * (`data().filters`, sin descargar el índice de filtros) y lo escribe un atributo, así que una
 * prueba sobre `dist/` lo cuenta. Lo escribe solo `Armazon.astro`
 * (`data-pagefind-filter="tipo:…"` en su `<main>`) y lo lee solo `src/pages/buscar.astro`.
 * Consecuencia para la Épica 27: `pf.filters()` trae también esta clave.
 */
export const FILTRO_DE_TIPO = 'tipo';

/**
 * Los tipos cuyo título de resultado va en la sans (Inter) — UX-DR91, UX-DR104.
 *
 * La serif es solo para texto de Cita, nombre de Autor y nombre de Tema, y el título de una Obra
 * (Historia 22.7), el de un Directorio y el de la portada —la marca— no son ninguno de los tres.
 * Su resultado se pinta como el de Obra —mismo cuerpo y peso, otra familia— y se lee
 * «{rótulo}: {título}»; solo la Obra añade la línea de su Autor y el «, de {Autor}».
 */
export const TIPOS_CON_TITULO_EN_SANS: readonly TipoDeResultado[] = ['obra', 'directorio', 'portada'];

/**
 * Las opciones con que la búsqueda propia configura Pagefind — el único sitio donde se hace.
 *
 * Pagefind 1.5 busca la metadata, y todo `data-pagefind-meta` salvo `title` declara aquí su
 * peso (lo exige una prueba sobre `dist/` de `tests/unit/publicable-y-alcanzable.test.ts`). Hoy es
 * uno: `autor`, que la Cabecera de Obra escribe para pintar la línea del resultado (Historia 22.7)
 * y pesa 0; la Épica 27 lo usará igual para el Autor bajo la Cita, con el mismo campo y por la
 * misma razón. Un peso 0 quita la **puntuación**, no la coincidencia: `autor` no estorba solo
 * porque su texto ya está en el cuerpo indexado, y un valor que no deba casar como texto va en un
 * filtro o bajo `data-pagefind-ignore`, nunca en un metadato. `title` no se nombra: conserva el 5
 * que Pagefind le da por omisión. El tipo no está aquí porque no es metadato sino filtro
 * (`FILTRO_DE_TIPO`), y un filtro no se busca.
 *
 * `src/pages/buscar.astro` las aplica con `options()` antes de **cada** `search()`: el
 * `destroy()` del reintento de la 23.8 deja a cero las opciones del módulo, y la instancia que
 * se crea después buscaría sin pesos.
 */
export const OPCIONES_DE_PAGEFIND = { ranking: { metaWeights: { autor: 0 } } } as const;

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
 * Las superficies sin tipo —el buscador, el 404— llegan con `undefined` y caen también en
 * `website`, igual que la portada y los Directorios con el suyo (Historia 26.2). Ojo con la
 * tentación de reusar `TIPO_POR_OMISION` aquí: aquel es «cita» a propósito, porque un
 * **resultado de búsqueda** sin metadato casi siempre lo es, y aplicarlo a esto devolvería justo
 * el `article` que este cambio viene a quitar de la portada.
 */
export function tipoDeOpenGraph(tipo: TipoDeResultado | undefined): 'article' | 'website' {
  return tipo === 'cita' ? 'article' : 'website';
}
