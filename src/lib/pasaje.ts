/**
 * Cómo se reparte un pasaje para pintarlo — Historia 31.2, AD-29, AD-30.
 *
 * Puro y sin interpretar nada: el pasaje trae ya sus párrafos y sus líneas como tramos
 * `[desde, hasta)` sobre su `texto` —los calcula `tools/lib/pasaje.ts`, el único que sabe qué
 * es un salto del documento—, y aquí solo se corta `texto` por esos tramos y por el tramo de la
 * Cita, `[inicio, fin)`. No busca saltos ni nombra ninguna forma de las líneas: quien pinta
 * (`LeeElPasaje.astro`) pone un `<p>` por párrafo, un `<br>` entre líneas y un `<mark>` por
 * segmento de la Cita.
 */
import type { PasajeDeAparicion } from './obras.ts';

/** Un trozo de una línea del pasaje: de la Cita o de su contexto. */
export interface SegmentoDelPasaje {
  texto: string;
  deLaCita: boolean;
}

/** Los párrafos del pasaje, sus líneas y, en cada línea, sus segmentos, en orden. */
export type PartesDelPasaje = SegmentoDelPasaje[][][];

/**
 * El pasaje repartido en párrafos → líneas → segmentos. Una línea que cruza el tramo de la Cita
 * da hasta tres segmentos —antes, la Cita, después—; nunca uno vacío. Lo que queda fuera de los
 * tramos de los párrafos —las líneas en blanco entre bloques— no se pinta.
 */
export function partesDelPasaje(pasaje: Pick<PasajeDeAparicion, 'texto' | 'inicio' | 'fin' | 'parrafos'>): PartesDelPasaje {
  const { texto: delPasaje, inicio, fin, parrafos } = pasaje;
  return parrafos.map((lineas) =>
    lineas.map(([desde, hasta]) => {
      const segmentos: SegmentoDelPasaje[] = [];
      const cortes = [desde, Math.min(Math.max(inicio, desde), hasta), Math.min(Math.max(fin, desde), hasta), hasta];
      for (let i = 0; i < 3; i += 1) {
        if (cortes[i + 1] > cortes[i]) segmentos.push({ texto: delPasaje.slice(cortes[i], cortes[i + 1]), deLaCita: i === 1 });
      }
      return segmentos;
    }),
  );
}

/** Lo que no es blanco. */
const NO_BLANCO = /\S/u;

/**
 * Por qué un pasaje no se puede pintar tal como llega, o `undefined` si se puede. Lo juzga el
 * esquema de `posiciones` (`src/content.config.ts`) antes de que ninguna página lo lea, porque
 * `partesDelPasaje` corta sin mirar: un tramo fuera del texto, uno que pisa al anterior o un
 * trozo de texto que no cae en ningún tramo publicarían texto repetido o perderían palabras —de
 * la Cita, también— sin que nada lo dijera.
 *   · el tramo de la Cita, `inicio < fin ≤ largo`;
 *   · cada tramo, `desde < hasta ≤ largo`, sin pisar al anterior;
 *   · lo que queda fuera de los tramos —entre ellos, antes del primero y tras el último— es solo
 *     blanco: así la unión de los tramos dice todo `texto` y, con él, toda la Cita.
 */
export function problemaDeLosParrafos(
  pasaje: Pick<PasajeDeAparicion, 'texto' | 'inicio' | 'fin' | 'parrafos'>,
): string | undefined {
  const { texto: delPasaje, inicio, fin, parrafos } = pasaje;
  if (!(inicio < fin && fin <= delPasaje.length)) return 'el tramo de la Cita no cabe en su pasaje: hace falta inicio < fin ≤ largo del texto';
  if (parrafos.length === 0 || parrafos.some((lineas) => lineas.length === 0)) return 'hace falta al menos un párrafo, y cada uno con al menos una línea';
  let anterior = 0;
  for (const lineas of parrafos) {
    for (const [desde, hasta] of lineas) {
      if (!(Number.isInteger(desde) && Number.isInteger(hasta) && anterior <= desde && desde < hasta && hasta <= delPasaje.length)) {
        return `el tramo [${desde}, ${hasta}) no es un tramo de su texto: hace falta 0 ≤ desde < hasta ≤ largo, crecientes y sin solaparse`;
      }
      if (NO_BLANCO.test(delPasaje.slice(anterior, desde))) return `el texto entre ${anterior} y ${desde} no cae en ningún tramo y no es blanco`;
      anterior = hasta;
    }
  }
  if (NO_BLANCO.test(delPasaje.slice(anterior))) return `el texto desde ${anterior} no cae en ningún tramo y no es blanco`;
  return undefined;
}
