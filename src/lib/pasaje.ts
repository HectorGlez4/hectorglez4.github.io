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
  const { texto, inicio, fin, parrafos } = pasaje;
  return parrafos.map((lineas) =>
    lineas.map(([desde, hasta]) => {
      const segmentos: SegmentoDelPasaje[] = [];
      const cortes = [desde, Math.min(Math.max(inicio, desde), hasta), Math.min(Math.max(fin, desde), hasta), hasta];
      for (let i = 0; i < 3; i += 1) {
        if (cortes[i + 1] > cortes[i]) segmentos.push({ texto: texto.slice(cortes[i], cortes[i + 1]), deLaCita: i === 1 });
      }
      return segmentos;
    }),
  );
}
