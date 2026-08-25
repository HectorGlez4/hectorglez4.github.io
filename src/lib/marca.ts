/**
 * El nombre del producto, con un solo dueño — LC-5.
 *
 * Estaba repetido en ocho superficies y en la marca de agua del generador de imagen.
 * Repetido, un renombrado es un rastreo que siempre olvida un sitio: la Épica 6 existe
 * precisamente porque olvidar uno después de que haya una URL indexada cuesta una
 * migración. Aquí el nombre se cambia en una línea y cambia en todas partes.
 *
 * `public/islas/imagen.js` no puede importar de aquí —vive fuera del empaquetado, con
 * URL estable, para que el `import()` diferido de AD-6 funcione—. La marca le llega en
 * un atributo de datos, que es el mismo puente que AD-8 usa para el tamaño tipográfico.
 */

export const MARCA = 'Sabiduría de Bolsillo';

/**
 * Lo que el sitio dice ser, en una línea.
 *
 * Se nombra aquí y se usa en tres: la etiqueta `description` de la portada, el `description`
 * del `WebSite` de datos estructurados y la bajada de su Tarjeta Social. Escritas aparte, un
 * retoque a una dejaría a las otras diciendo algo distinto sobre el mismo sitio — y quien lo
 * notaría sería un buscador, o quien pegue el enlace.
 */
export const DESCRIPCION_DEL_SITIO =
  'Citas célebres en español, cada una con su autor y la obra de la que procede, cuando consta.';

/**
 * El título de pestaña de una superficie: su parte propia y la marca detrás.
 *
 * Sin parte devuelve la marca sola. La portada no lleva separador colgando y tampoco
 * necesita un caso especial en la página.
 */
export function tituloDe(parte?: string): string {
  return parte === undefined || parte === '' ? MARCA : `${parte} | ${MARCA}`;
}
