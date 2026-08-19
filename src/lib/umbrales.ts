/**
 * AD-9 — Los umbrales son configuración con nombre.
 *
 * Ningún literal numérico de regla de negocio aparece fuera de este módulo. Lo que
 * impide es concreto: que un umbral viva como literal en tres sitios y una revisión
 * futura cambie dos de ellos.
 *
 * Ojo con lo que AD-9 **no** cierra: que el número tenga nombre no dice quién lo aplica.
 * De eso se ocupa AD-11 y su dueño único del conjunto publicable, `publicado.ts`.
 */

/**
 * Citas publicadas que necesita un Tema para publicarse — FR-6.
 *
 * Por debajo de esto un Tema es una página con cuatro entradas, que ni ayuda al visitante
 * ni sostiene una consulta de buscador.
 */
export const MIN_CITAS_POR_TEMA = 15;

/**
 * Longitud máxima de una Cita para ofrecer Imagen — FR-10, UX-DR19.
 *
 * Por encima, el texto no cabe en la imagen sin bajar de un tamaño legible, y recortarlo
 * está prohibido: la acción no se ofrece.
 */
export const MAX_CARACTERES_IMAGEN = 300;

/** Entradas por página en los listados de Autor y de Tema — FR-5. */
export const CITAS_POR_PAGINA = 50;

/** Citas del mismo Autor que ofrece una Página de Cita como ruta de salida — UX-DR17. */
export const MAX_CITAS_RELACIONADAS = 4;

/**
 * Saltos de enlace interno desde la portada en los que toda superficie publicada debe
 * alcanzarse — NFR-5, AD-11 extendido.
 *
 * Publicable y alcanzable son el mismo conjunto: una página anunciada a la que no llega
 * ningún enlace es una página que solo existe para el buscador. Tres saltos es lo que hoy
 * cuesta lo más hondo del sitio —portada, Autor o Tema, Cita—, y dejarlo acotado impide
 * que una superficie nueva se cuelgue de una cadena cada vez más larga.
 */
export const MAX_SALTOS_DESDE_LA_PORTADA = 3;

/**
 * Suelo de Autores de tradición latinoamericana, en porcentaje — §6.1 del PRD.
 *
 * El suelo es explícito porque el sesgo hacia España es el resultado por defecto de
 * cualquier curación no vigilada: se llega a él sin decidirlo, empezando por los autores
 * que uno tiene más a mano.
 */
export const SUELO_TRADICION_LATINOAMERICANA = 40;

/**
 * Tope de bytes de guion en línea que puede llevar una Página de Cita — AD-6, NFR-2.
 *
 * Existía como literal dentro de la prueba de la Historia 2.1, que además solo medía
 * construcciones **sin** medición configurada: el guion que instala `medicion.ts` no
 * entraba en la cuenta y creció dos veces sin que nadie lo viera. Con nombre y en un solo
 * sitio, las dos pruebas —la de la página y la de la página con medición— parten del
 * mismo número, y subirlo es una decisión visible en el diff.
 *
 * No cuenta el `application/ld+json` de los datos estructurados: no es JavaScript
 * ejecutable y el navegador no lo interpreta.
 *
 * Subido de 6144 a 6656 en la v2, por el motivo que la propia prueba de la Historia 2.1
 * dejó previsto —«se sube cuando una isla nueva entra a propósito, no cuando algo engorda
 * por su cuenta»—: la Historia 10.3 añadió una tercera isla, la de compartir enlace.
 * Antes de subirlo se compactó el guion de medición, que pasó de 952 a 572 bytes; el tope
 * nuevo deja unos 400 de margen, suficiente para no ir justo y poco para que un
 * crecimiento futuro pase inadvertido.
 */
export const MAX_BYTES_DE_GUION = 6656;

/**
 * Citas publicadas **resueltas** que necesita una Colección para publicarse — FR de la
 * Épica 12, §14.4 del PRD.
 *
 * **VALOR PROVISIONAL.** El PRD deja este umbral abierto a propósito y dice de dónde
 * saldrá el definitivo: de curar las tres o cuatro primeras Colecciones y ver cuántas
 * Citas reúne de verdad un criterio editorial que merezca página. Hasta entonces esto es
 * un marcador de posición con nombre, no una decisión tomada.
 *
 * Arranca igual que `MIN_CITAS_POR_TEMA` porque las dos superficies alimentan la misma
 * contra-métrica —la mediana de Citas por agregación publicada— y empezar igualadas
 * garantiza que una Colección no pueda hundir esa mediana por debajo de lo que un Tema ya
 * puede. Es el arranque prudente: la vía barata de multiplicar páginas indexables es
 * fabricar Colecciones de cinco Citas, y este número existe para cerrarla. El definitivo
 * puede bajar —una Colección es curada a mano y no acumula por deriva como un Tema— pero
 * esa rebaja se decide con Colecciones curadas delante, no aquí.
 *
 * Se aplica al recuento **resuelto**, jamás al declarado: quien lo aplica es
 * `coleccionesPublicadas` en `src/lib/publicado.ts` (AD-11), y es el único sitio.
 */
export const MIN_CITAS_POR_COLECCION = 15;
