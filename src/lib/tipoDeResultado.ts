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
