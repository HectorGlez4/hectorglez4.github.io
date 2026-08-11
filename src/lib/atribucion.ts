/**
 * El texto plano que se lleva el visitante — FR-3.
 *
 * Vive en `src/lib/` y no dentro del botón porque lo consumen dos superficies: el copiado
 * (Historia 2.2) y la Imagen de Cita (Historia 5.1), que debe mostrar la misma atribución
 * que se copia. Si cada una lo compusiera por su cuenta, una publicaría «Séneca, Cartas a
 * Lucilio» y la otra «Séneca — Cartas a Lucilio, 65», y nadie se enteraría hasta verlas
 * juntas.
 *
 * AD-5 — Derivación pura.
 */

import type { Cita, Autor } from './publicado.ts';

/**
 * Cita y atribución juntas, en texto plano y sin marcado.
 *
 * El formato es el de una cita bibliográfica corta, que es lo que Lucía va a pegar en una
 * presentación: comillas angulares, raya, Autor, y la procedencia que conste. Lo que no
 * consta no se escribe — nunca una obra inferida (FR-2).
 */
export function textoParaCopiar(cita: Cita, autor: Autor): string {
  const { obra, año } = cita.procedencia;

  const fuente = [obra, año].filter((x) => x !== undefined).join(', ');

  return fuente === ''
    ? `«${cita.texto}» — ${autor.nombre}.`
    : `«${cita.texto}» — ${autor.nombre}, ${fuente}.`;
}
