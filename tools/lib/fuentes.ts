/**
 * Las Fuentes admitidas para extraer candidatas — FR-23.
 *
 * Una Fuente es de dónde sale el **texto transcrito**, y no es lo mismo que la
 * Procedencia: la Procedencia es la obra y el año en que la Cita se publicó; la Fuente es
 * la edición digital de la que se copió. Confundirlas produciría Citas cuya procedencia
 * es «Wikisource», que no documenta nada.
 *
 * El conjunto es cerrado y cada entrada dice si su licencia permite reutilizar. La
 * Épica 9 es explícita sobre lo que **no** se hace: rastrear sitios de citas. Sus
 * compilaciones están protegidas y —lo decisivo— publican texto y nombre sin obra ni año,
 * así que cada Cita extraída de ahí moriría en `corpus/_revision/`.
 */

export interface Fuente {
  id: string;
  nombre: string;
  /** La licencia tal y como la declara la Fuente. Se copia en cada candidata. */
  licencia: string;
  permiteReutilizacion: boolean;
  /** Por qué no, cuando no. Es lo que se le dice al editor al detener el proceso. */
  razon?: string;
}

export const FUENTES: readonly Fuente[] = [
  {
    id: 'wikisource-es',
    nombre: 'Wikisource en español',
    licencia: 'CC BY-SA 4.0',
    permiteReutilizacion: true,
  },
  {
    id: 'gutenberg',
    nombre: 'Project Gutenberg',
    licencia: 'dominio público',
    permiteReutilizacion: true,
  },
  {
    id: 'cervantes-virtual',
    nombre: 'Biblioteca Virtual Miguel de Cervantes',
    licencia: 'CC BY-NC-SA 4.0',
    permiteReutilizacion: false,
    razon:
      'su licencia excluye el uso comercial, y el Corpus se publica sin esa restricción: ' +
      'una Cita con esa procedencia contaminaría las condiciones de todo el conjunto.',
  },
];

export function fuenteDe(id: string): Fuente | undefined {
  return FUENTES.find((f) => f.id === id);
}
