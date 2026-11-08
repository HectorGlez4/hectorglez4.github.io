/**
 * El pasaje de una Cita: el párrafo —o la estrofa— de su documento del que sale — Historia
 * 31.1, AD-30.
 *
 * Es el **único dueño** del trozo. No localiza nada: recibe la posición que dio `localizar`
 * (la misma que sitúa la Cita en el orden del libro, `tools/lib/posiciones.ts`), la lleva al
 * crudo con `tramoEnCrudo` y delimita el trozo según la forma de las líneas del documento, que
 * dice `formaDeLasLineas` (las dos de la 29.1, AD-29). Así no hay un segundo localizador ni una
 * segunda definición de «párrafo» que pudieran situar la Cita en otro trozo que el que la
 * coteja y la ordena.
 *
 * El trozo, por forma:
 *   · `verso` y `prosa-ajustada`: el bloque entre líneas en blanco (una línea en blanco es la
 *     que solo trae espacio), con sus saltos interiores tal cual;
 *   · `prosa-por-lineas`: la línea;
 *   · `verso-espaciado` e `indeterminada`: ninguno — un bloque no dice ahí qué es un párrafo.
 * Una Cita que cruza bloques toma desde el primero que la contiene hasta el último, enteros y
 * seguidos, con lo que haya entre ellos tal cual. Del trozo solo se quita el blanco de los dos
 * extremos: nunca se recorta dentro, se corrige ni se completa.
 *
 * Si se ofrece lo decide un solo punto con nombre, `ofrecePasaje`, que la 35.4 ampliará.
 *
 * Puro: sin disco, sin red y sin escribir nada en `corpus/` (AD-22).
 */

import { equivalentes } from '../../src/lib/normalizar.ts';
import type { PasajeDeAparicion } from '../../src/lib/obras.ts';
import { tramoEnCrudo, type Colapsado } from './cotejo.ts';
import { FORMAS_DE_LINEAS, type FormaDeLineas } from './lineas.ts';

/** Por qué una aparición no trae pasaje. */
export type MotivoSinPasaje = 'forma-sin-parrafo' | 'sin-tope' | 'no-dice-mas' | 'pasa-del-tope';

/** Las formas cuyo trozo es el bloque entre líneas en blanco. */
const FORMAS_POR_BLOQUES: readonly FormaDeLineas[] = [FORMAS_DE_LINEAS[0], FORMAS_DE_LINEAS[3]];
/** La forma cuyo trozo es la línea. */
const FORMA_POR_LINEAS: FormaDeLineas = FORMAS_DE_LINEAS[2];

const BLANCO = /\s/u;

/** Si un tramo del crudo solo trae espacio (una línea en blanco). */
function enBlanco(crudo: string, desde: number, hasta: number): boolean {
  for (let i = desde; i < hasta; i += 1) if (!BLANCO.test(crudo[i])) return false;
  return true;
}

/**
 * Las líneas del crudo, `[inicio, fin)` en UTF-16 y sin el `\n` que las cierra. Se guardan las
 * del último crudo, como `mapaDelCrudo` de `cotejo.ts`: quien pregunta recorre las Citas de un
 * documento seguidas (`posicionesDeCitas`).
 */
let ultimasLineas: { crudo: string; lineas: { inicio: number; fin: number }[] } | undefined;
function lineasDelCrudo(crudo: string): { inicio: number; fin: number }[] {
  if (ultimasLineas !== undefined && ultimasLineas.crudo === crudo) return ultimasLineas.lineas;
  const lineas: { inicio: number; fin: number }[] = [];
  let inicio = 0;
  for (let i = 0; i <= crudo.length; i += 1) {
    if (i === crudo.length || crudo[i] === '\n') {
      lineas.push({ inicio, fin: i });
      inicio = i + 1;
    }
  }
  ultimasLineas = { crudo, lineas };
  return lineas;
}

/** La línea que contiene un desplazamiento del crudo. */
function lineaDe(lineas: readonly { inicio: number; fin: number }[], desplazamiento: number): number {
  let bajo = 0;
  let alto = lineas.length - 1;
  while (bajo < alto) {
    const medio = Math.ceil((bajo + alto) / 2);
    if (lineas[medio].inicio <= desplazamiento) bajo = medio;
    else alto = medio - 1;
  }
  return bajo;
}

/**
 * Si se ofrece un pasaje — Historia 31.1. Es el **único** punto que lo decide, y decide en este
 * orden: sin tope (`MAX_CARACTERES_DEL_PASAJE` en `undefined`), no; si el trozo no dice más que
 * la Cita (forma canónica de `normalizar`, AD-3: un párrafo que solo añade el punto final no
 * cuenta), no; si pasa del tope en puntos de código, no. Igual al tope, sí. «No dice más» va
 * antes que el tope para que el recuento por motivo no dependa de su valor.
 *
 * Recibe un objeto para que la 35.4 lo amplíe (la Cita atribuida, la Obra con derechos).
 */
export function ofrecePasaje(opciones: {
  trozo: string;
  textoDeCita: string;
  tope: number | undefined;
}): { ofrece: true } | { ofrece: false; motivo: Exclude<MotivoSinPasaje, 'forma-sin-parrafo'> } {
  const { trozo, textoDeCita, tope } = opciones;
  if (tope === undefined) return { ofrece: false, motivo: 'sin-tope' };
  if (equivalentes(trozo, textoDeCita)) return { ofrece: false, motivo: 'no-dice-mas' };
  if ([...trozo].length > tope) return { ofrece: false, motivo: 'pasa-del-tope' };
  return { ofrece: true };
}

/**
 * El pasaje de una aparición, o por qué no lo hay — Historia 31.1, AD-30.
 *
 * `posicion` es la que dio `localizar(buscado, colapsarEspacios(crudo))`, y `buscado` el texto
 * de la Cita colapsado: el tramo de la Cita en el crudo sale de `tramoEnCrudo` con los dos.
 * `forma` es la de `formaDeLasLineas` sobre ese mismo documento. `inicio`/`fin` del pasaje son
 * UTF-16 sobre su `texto`, y `colapsarEspacios(texto.slice(inicio, fin)) === buscado`.
 */
export function pasajeDeAparicion(opciones: {
  crudo: string;
  forma: FormaDeLineas;
  posicion: number;
  buscado: Colapsado;
  textoDeCita: string;
  tope: number | undefined;
}): { pasaje: PasajeDeAparicion } | { motivo: MotivoSinPasaje } {
  const { crudo, forma, posicion, buscado, textoDeCita, tope } = opciones;
  const porBloques = FORMAS_POR_BLOQUES.includes(forma);
  if (!porBloques && forma !== FORMA_POR_LINEAS) return { motivo: 'forma-sin-parrafo' };

  const tramo = tramoEnCrudo(crudo, posicion, posicion + buscado.length);
  const lineas = lineasDelCrudo(crudo);
  let primera = lineaDe(lineas, tramo.inicio);
  let ultima = lineaDe(lineas, tramo.fin - 1);
  if (porBloques) {
    const enBlancoLaLinea = (n: number) => enBlanco(crudo, lineas[n].inicio, lineas[n].fin);
    while (primera > 0 && !enBlancoLaLinea(primera - 1)) primera -= 1;
    while (ultima < lineas.length - 1 && !enBlancoLaLinea(ultima + 1)) ultima += 1;
  }

  // Solo el blanco de los extremos: el tramo de la Cita empieza y acaba en un carácter que no
  // lo es, así que nunca queda fuera.
  let a = lineas[primera].inicio;
  let b = lineas[ultima].fin;
  while (a < tramo.inicio && BLANCO.test(crudo[a])) a += 1;
  while (b > tramo.fin && BLANCO.test(crudo[b - 1])) b -= 1;
  const texto = crudo.slice(a, b);

  const decision = ofrecePasaje({ trozo: texto, textoDeCita, tope });
  if (!decision.ofrece) return { motivo: decision.motivo };
  return { pasaje: { texto, inicio: tramo.inicio - a, fin: tramo.fin - a } };
}
