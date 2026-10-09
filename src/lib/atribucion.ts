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
 * La procedencia compuesta —obra y año, en ese orden— o `undefined` si no consta ninguna.
 *
 * Tiene dueño único por lo mismo que el texto de copiar: desde la Historia 13.2 la consumen
 * dos cosas —el texto que se publica y la Pieza de Canal, que la escribe **dentro de la
 * imagen**—, y con dos redacciones la imagen diría «Cartas a Lucilio 65» mientras el pie dice
 * «Cartas a Lucilio, 65». Nadie lo vería hasta tener las dos delante.
 *
 * `procedencia` se lee tolerando su ausencia. En el sitio siempre está —el esquema le pone
 * un valor por omisión— pero `tools/lib/corpus.ts` devuelve el frontmatter **sin validar**, y
 * una Cita escrita a mano sin la clave llegaría aquí a reventar por destructuración: un
 * `TypeError` crudo en una orden que promete rechazos redactados. Lo que no consta no se
 * escribe, que es la regla de siempre (FR-2).
 */
export function procedenciaCompuesta(cita: Cita): string | undefined {
  const { obra, año } = cita.procedencia ?? {};
  return [obra, año].filter((x) => x !== undefined).join(', ') || undefined;
}

/**
 * Cita y atribución juntas, en texto plano y sin marcado.
 *
 * El formato es el de una cita bibliográfica corta, que es lo que Lucía va a pegar en una
 * presentación: comillas angulares, raya, Autor, y la procedencia que conste. Lo que no
 * consta no se escribe — nunca una obra inferida (FR-2).
 */
/**
 * La frase de la traducción —traductor y, si consta, su año—, con el arranque que cada
 * superficie pide: «Traducción de» en la Atribución, «trad. de» en lo copiado — Historia
 * 19.1, UX-DR51. Un solo dueño para que las dos digan lo mismo hasta la coma. `undefined`
 * cuando la Cita no declara traducción.
 */
export function fraseDeTraduccion(
  cita: Cita,
  forma: 'Traducción de' | 'trad. de',
): string | undefined {
  const traduccion = cita.procedencia?.traduccion;
  if (traduccion === undefined) return undefined;
  return (
    `${forma} ${traduccion.traductor}` +
    (traduccion.año !== undefined ? `, ${traduccion.año}` : '')
  );
}

export function textoParaCopiar(cita: Cita, autor: Autor): string {
  const partes = [autor.nombre];
  const fuente = procedenciaCompuesta(cita);
  if (fuente !== undefined) partes.push(fuente);

  /*
   * Historia 19.1, UX-DR51 — la traducción va detrás de la obra y con su propio año:
   * «— Horacio, Odas, trad. de Germán Salinas, 1909.» Solo lo copiado y la Atribución la
   * nombran; `procedenciaCompuesta`, que es lo que rasterizan la Imagen y la Pieza, no.
   */
  const traduccion = fraseDeTraduccion(cita, 'trad. de');
  if (traduccion !== undefined) partes.push(traduccion);

  return `«${cita.texto}» — ${partes.join(', ')}.`;
}
