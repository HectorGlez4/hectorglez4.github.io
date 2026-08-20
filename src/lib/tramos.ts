/**
 * AD-8 — Una sola definición de los tramos tipográficos.
 *
 * La Página de Cita y el generador de Imagen consumen esta tabla. Lo que impide es que
 * cada uno calcule el tramo por su cuenta y la previsualización mienta respecto al
 * fichero que el visitante descarga.
 *
 * Reparto con el CSS, para que quede claro qué vive dónde:
 *
 *   · Aquí vive **qué tramo corresponde a cada longitud**, incluido el corte en 300
 *     caracteres que oculta la acción de Imagen, y el tamaño en píxeles que usa el
 *     lienzo del generador, que necesita números.
 *   · En `styles/tokens.css` viven los tamaños de los tokens `quote-*` de la página,
 *     porque son tokens de DESIGN.md y UX-DR2 los quiere declarados una sola vez.
 *
 * Los dos conjuntos de números son distintos (44px en página, 64px en imagen), así que
 * no hay ninguna cifra duplicada entre ambos sitios y no hay nada que pueda divergir. Lo
 * compartido —el tramo— sale de aquí para los dos.
 *
 * AD-5 — Derivación pura.
 */

import { MAX_CARACTERES_IMAGEN } from './umbrales.ts';

export type NombreDeTramo = 'xl' | 'lg' | 'md' | 'sm';

export interface Tramo {
  /** Se escribe como `data-tramo` en el marcado; el CSS resuelve el tamaño. */
  nombre: NombreDeTramo;
  /** Tamaño en píxeles para el lienzo del generador de Imagen (UX-DR19). */
  pixelesEnImagen: number;
  /**
   * Tamaño en píxeles para la Tarjeta Social.
   *
   * Es un número distinto y no un factor sobre el anterior porque el lienzo es distinto:
   * la Imagen es cuadrada de 1080 y la Tarjeta es 1200×630, mucho más ancha y menos
   * alta. Vive aquí, en la tabla, por lo mismo que el otro: dos superficies que compongan
   * la misma Cita tienen que partir del mismo tramo, o una dirá que cabe y la otra no.
   */
  pixelesEnTarjeta: number;
  /**
   * Tamaño en píxeles para la Pieza de Canal de varias Citas — Historia 13.2.
   *
   * Tercera columna y no un factor sobre las otras dos, por lo que ya dice la cabecera de
   * este módulo: el lienzo es distinto. La Pieza es cuadrada de 1080 como la Imagen, pero
   * **apila varias Citas** en ella, así que el alto que le toca a cada una es una fracción
   * del que tiene una Cita sola. Calcularlo en la plantilla —«la mitad del de la Imagen»,
   * «un poco menos si son cuatro»— es exactamente la decisión que AD-8 le quitó a la
   * plantilla: en cuanto la Pieza pudiera bajar el cuerpo para que algo quepa, «no cabe»
   * dejaría de ser una respuesta y NFR-12 se negociaría sola.
   */
  pixelesEnPieza: number;
  /** Falso por encima de `MAX_CARACTERES_IMAGEN`: la acción no se ofrece (FR-10). */
  admiteImagen: boolean;
}

/**
 * La tabla de UX-DR19. El orden importa: se recorre buscando el primer tramo cuyo
 * máximo alcance la longitud del texto.
 */
const TABLA: { hasta: number; tramo: Tramo }[] = [
  {
    hasta: 80,
    tramo: { nombre: 'xl', pixelesEnImagen: 64, pixelesEnTarjeta: 56, pixelesEnPieza: 44, admiteImagen: true },
  },
  {
    hasta: 160,
    tramo: { nombre: 'lg', pixelesEnImagen: 52, pixelesEnTarjeta: 46, pixelesEnPieza: 36, admiteImagen: true },
  },
  {
    hasta: 240,
    tramo: { nombre: 'md', pixelesEnImagen: 42, pixelesEnTarjeta: 38, pixelesEnPieza: 30, admiteImagen: true },
  },
  /*
   * 34px es el suelo legible **de la Imagen de Cita**, que compone una sola Cita a pantalla
   * completa: por debajo de ahí no se baja y se deja de ofrecer imagen (FR-10).
   *
   * No es un suelo del lienzo en abstracto, y conviene que quede escrito ahora que hay una
   * tercera columna: la Pieza usa el mismo lado de 1080 y compone a 26px sin violar nada,
   * porque su unidad de lectura es otra —varias Citas apiladas, leídas como un conjunto— y
   * su suelo propio es ese. Cada columna declara el suyo; lo que la regla prohíbe es que la
   * plantilla lo calcule.
   */
  {
    hasta: MAX_CARACTERES_IMAGEN,
    tramo: { nombre: 'sm', pixelesEnImagen: 34, pixelesEnTarjeta: 32, pixelesEnPieza: 26, admiteImagen: true },
  },
];

/** El tramo por encima del corte: se compone igual en la página, pero sin imagen. */
const SIN_IMAGEN: Tramo = {
  nombre: 'sm',
  pixelesEnImagen: 0,
  pixelesEnTarjeta: 0,
  pixelesEnPieza: 0,
  admiteImagen: false,
};

/**
 * Tramo que corresponde a un texto por su longitud.
 *
 * Se mide en caracteres del texto tal como se publica, sin normalizar: lo que decide el
 * tamaño es lo que ocupa en pantalla, y los acentos ocupan.
 */
export function tramoDe(texto: string): Tramo {
  const longitud = [...texto].length;
  for (const { hasta, tramo } of TABLA) {
    if (longitud <= hasta) return tramo;
  }
  return SIN_IMAGEN;
}

/** Atajo para la condición que más se consulta: si se ofrece la acción de Imagen. */
export function admiteImagen(texto: string): boolean {
  return tramoDe(texto).admiteImagen;
}
