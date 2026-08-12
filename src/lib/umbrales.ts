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
 * Suelo de Autores de tradición latinoamericana, en porcentaje — §6.1 del PRD.
 *
 * El suelo es explícito porque el sesgo hacia España es el resultado por defecto de
 * cualquier curación no vigilada: se llega a él sin decidirlo, empezando por los autores
 * que uno tiene más a mano.
 */
export const SUELO_TRADICION_LATINOAMERICANA = 40;
