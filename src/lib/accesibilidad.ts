/**
 * Lo que oye el lector de pantalla y no se ve — Historia 22.10.
 *
 * El aviso de pestaña nueva va **dentro** del enlace, oculto a la vista, para que forme parte
 * de su nombre accesible (`EXPERIENCE.md § Interaction Primitives`). Lo llevan los tres
 * enlaces que abren pestaña nueva —«Apoyar el sitio», los destinos de «Compartir la cita» y
 * las ediciones en venta— y los tres lo toman de aquí: tres copias de la frase acabarían
 * diciéndose de tres maneras.
 *
 * Módulo neutro a propósito: `Sostener.astro` y `EdicionesEnVenta.astro` no pueden importar
 * `ingreso.ts`, y `compartir.ts` arrastra los constructores de direcciones de los destinos.
 *
 * Empieza por espacio porque se pega al rótulo del enlace.
 */
export const AVISO_DE_PESTAÑA_NUEVA = ' (se abre en una pestaña nueva)';
