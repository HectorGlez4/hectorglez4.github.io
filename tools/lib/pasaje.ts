/**
 * El pasaje de una Cita —el párrafo o la estrofa de su documento del que sale— y el incipit de
 * una Obra —su comienzo, cortado en frase o verso— — Historias 31.1 y 32.3, AD-30.
 *
 * Son los dos únicos textos de `corpus/fuentes/` que se publican, y este módulo es el **único
 * dueño** de los dos cortes. El incipit va al final del módulo (`incipitDe`, `ofreceIncipit`).
 *
 * Del pasaje, es el **único dueño** del trozo. No localiza nada: recibe la posición que dio `localizar`
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
import { colapsarEspacios, tramoEnCrudo, type Colapsado } from './cotejo.ts';
import { esFormaDeVerso, esPieDeLicencia, FORMAS_DE_LINEAS, type FormaDeLineas } from './lineas.ts';

/** Por qué una aparición no trae pasaje. */
export type MotivoSinPasaje = 'forma-sin-parrafo' | 'sin-tope' | 'no-dice-mas' | 'pasa-del-tope';

/** Las formas cuyo trozo es el bloque entre líneas en blanco. */
const FORMAS_POR_BLOQUES: readonly FormaDeLineas[] = [FORMAS_DE_LINEAS[0], FORMAS_DE_LINEAS[3]];
/** La forma cuyo trozo es la línea. */
const FORMA_POR_LINEAS: FormaDeLineas = FORMAS_DE_LINEAS[2];
/** La forma cuyo bloque es un solo párrafo de una línea, con sus saltos interiores literales. */
const FORMA_AJUSTADA: FormaDeLineas = FORMAS_DE_LINEAS[3];

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
  const parrafos = parrafosDelTrozo({ crudo, lineas, primera, ultima, a, b, porBloques, ajustada: forma === FORMA_AJUSTADA });
  return { pasaje: { texto, inicio: tramo.inicio - a, fin: tramo.fin - a, parrafos } };
}

/**
 * Cómo se pinta el trozo — Historia 31.2, AD-29: los párrafos y, dentro, las líneas, como
 * tramos `[desde, hasta)` UTF-16 sobre `texto`. Es aquí, y solo aquí, donde un salto del
 * documento se interpreta; quien pinta solo corta `texto` por estos tramos.
 *   · `verso`: cada bloque entre líneas en blanco es un párrafo, y cada línea suya, una línea;
 *   · `prosa-ajustada`: cada bloque es un párrafo de una sola línea, con sus `\n` interiores
 *     dentro del tramo, literales;
 *   · `prosa-por-lineas`: cada línea es un párrafo de una línea.
 * Las líneas en blanco no entran en ningún tramo: separan párrafos. El `\r` de un final de línea
 * CRLF tampoco: queda entre tramos, como el `\n`.
 */
function parrafosDelTrozo(opciones: {
  crudo: string;
  lineas: readonly { inicio: number; fin: number }[];
  primera: number;
  ultima: number;
  a: number;
  b: number;
  porBloques: boolean;
  ajustada: boolean;
}): [number, number][][] {
  const { crudo, lineas, primera, ultima, a, b, porBloques, ajustada } = opciones;
  const parrafos: [number, number][][] = [];
  let actual: [number, number][] | undefined;
  for (let n = primera; n <= ultima; n += 1) {
    const desde = Math.max(lineas[n].inicio, a);
    let hasta = Math.min(lineas[n].fin, b);
    // El `\r` de un final de línea CRLF no es de la línea: se queda fuera del tramo, entre líneas,
    // y no se publica delante de cada `<br>`. Los `\r` interiores de un bloque ajustado sí son
    // literales, porque quedan dentro del tramo de su bloque.
    while (hasta > desde && crudo[hasta - 1] === '\r') hasta -= 1;
    if (hasta <= desde || enBlanco(crudo, desde, hasta)) {
      actual = undefined;
      continue;
    }
    const tramo: [number, number] = [desde - a, hasta - a];
    if (!porBloques || actual === undefined) {
      actual = [tramo];
      parrafos.push(actual);
    } else if (ajustada) {
      actual[0] = [actual[0][0], tramo[1]];
    } else {
      actual.push(tramo);
    }
  }
  return parrafos;
}

// ─────────────────────────────────────────────────────────────────────────────
// El incipit — Historia 32.3, AD-30
// ─────────────────────────────────────────────────────────────────────────────

/** Por qué una Obra con incipit declarado no lo enseña. */
export type MotivoSinIncipit = 'sin-tope' | 'primera-no-cabe' | 'forma-indeterminada' | 'sin-texto';

/** La forma ante la que no se sabe qué es una frase ni un verso. */
const FORMA_INDETERMINADA: FormaDeLineas = FORMAS_DE_LINEAS[4];

/**
 * El fin de una frase en un párrafo ya colapsado: `.`, `?`, `!` o `…`, cero o más cierres, y
 * luego espacio o fin. El fin de párrafo también la cierra, y eso lo pone quien recorre.
 */
const FIN_DE_FRASE = /[.?!…][»”"’')\]]*(?= |$)/gu;

/**
 * Si se ofrece un incipit — Historia 32.3. Es el **único** punto que lo decide: sin tope
 * (`MAX_CARACTERES_DEL_INCIPIT` en `undefined`), no; si la primera unidad —la primera frase o el
 * primer verso— pasa del tope en puntos de código, no (el incipit nunca se recorta); igual al
 * tope, sí. Recibe un objeto para que la 35.9 lo amplíe (la Obra con derechos vigentes).
 */
export function ofreceIncipit(opciones: {
  tope: number | undefined;
  primera: string;
}): { ofrece: true } | { ofrece: false; motivo: Exclude<MotivoSinIncipit, 'forma-indeterminada' | 'sin-texto'> } {
  const { tope, primera } = opciones;
  if (tope === undefined) return { ofrece: false, motivo: 'sin-tope' };
  // Un tope que no es un entero positivo no es un tope: con `NaN` ninguna comparación cortaría y
  // saldría el documento entero. Lo da Héctor en `umbrales.ts`; mal dado, se para la construcción.
  if (!Number.isInteger(tope) || tope < 1) {
    throw new RangeError(`MAX_CARACTERES_DEL_INCIPIT ha de ser un entero positivo, y vale ${String(tope)}.`);
  }
  if ([...primera].length > tope) return { ofrece: false, motivo: 'primera-no-cabe' };
  return { ofrece: true };
}

/** Una unidad del incipit: una frase o un verso, y si con ella acaba el párrafo (o el verso). */
interface UnidadDeIncipit {
  texto: string;
  cierraParrafo: boolean;
}

/**
 * Las unidades desde un desplazamiento del crudo, en orden y perezosas: se para antes del pie de
 * licencia de Wikisource y al fin del documento. La primera línea empieza en `inicio`; si esa línea
 * entera es el pie —el `desde` cayó en él—, no hay ninguna unidad.
 */
function* unidadesDesde(crudo: string, forma: FormaDeLineas, inicio: number): Generator<UnidadDeIncipit> {
  const lineas = lineasDelCrudo(crudo);
  const primera = lineaDe(lineas, inicio);
  const verso = esFormaDeVerso(forma);
  const porBloques = forma === FORMA_AJUSTADA;
  let parrafo: string[] = [];

  function* soltarParrafo(): Generator<UnidadDeIncipit> {
    const texto = colapsarEspacios(parrafo.join(' '));
    parrafo = [];
    if (texto === '') return;
    let desde = 0;
    for (const fin of texto.matchAll(FIN_DE_FRASE)) {
      const hasta = fin.index + fin[0].length;
      const frase = texto.slice(desde, hasta).trim();
      desde = hasta;
      if (frase !== '') yield { texto: frase, cierraParrafo: desde >= texto.length };
    }
    const resto = texto.slice(desde).trim();
    if (resto !== '') yield { texto: resto, cierraParrafo: true };
  }

  for (let n = primera; n < lineas.length; n += 1) {
    const linea = crudo.slice(n === primera ? inicio : lineas[n].inicio, lineas[n].fin);
    if (esPieDeLicencia(n === primera ? crudo.slice(lineas[n].inicio, lineas[n].fin) : linea)) break;
    const enBlancoLaLinea = enBlanco(linea, 0, linea.length);
    if (verso) {
      if (!enBlancoLaLinea) yield { texto: colapsarEspacios(linea), cierraParrafo: true };
    } else if (enBlancoLaLinea) {
      yield* soltarParrafo();
    } else {
      parrafo.push(linea);
      // En `prosa-por-lineas` el párrafo es la línea; en `prosa-ajustada`, el bloque.
      if (!porBloques) yield* soltarParrafo();
    }
  }
  if (!verso) yield* soltarParrafo();
}

/**
 * El incipit de un documento desde la posición de su `desde`, o por qué no lo hay — Historia 32.3,
 * AD-30.
 *
 * `posicion` es la que dio `localizar(desde, colapsarEspacios(crudo))`, y `desde` está colapsado:
 * el comienzo en el crudo es el `inicio` de `tramoEnCrudo` con los dos. Las unidades, por forma:
 *   · `verso` y `verso-espaciado`: cada línea no en blanco, y el texto los une con un `\n`
 *     (también entre estrofas);
 *   · `prosa-ajustada` y `prosa-por-lineas`: la frase, que acaba tras `.`, `?`, `!` o `…` con sus
 *     cierres y un espacio o el fin, o en fin de párrafo (la línea en blanco en `prosa-ajustada`;
 *     el fin de línea en `prosa-por-lineas`); el texto une los párrafos con un `\n` y colapsa a uno
 *     todo otro espacio —los saltos interiores de `prosa-ajustada` son espacio—;
 *   · `indeterminada`: ninguno.
 * Se toman unidades enteras mientras el texto quepa en `tope` puntos de código. Nunca a media
 * palabra ni a media frase, y nada se recorta dentro. Si se ofrece lo decide `ofreceIncipit`, con
 * la primera unidad.
 */
export function incipitDe(opciones: {
  crudo: string;
  forma: FormaDeLineas;
  posicion: number;
  desde: Colapsado;
  tope: number | undefined;
}): { incipit: string } | { motivo: MotivoSinIncipit } {
  const { crudo, forma, posicion, desde, tope } = opciones;
  if (forma === FORMA_INDETERMINADA) return { motivo: 'forma-indeterminada' };
  const inicio = tramoEnCrudo(crudo, posicion, posicion + desde.length).inicio;
  const unidades = unidadesDesde(crudo, forma, inicio);
  const primera = unidades.next();
  // Sin ninguna unidad —el `desde` cayó en el pie de licencia—, no hay texto que ofrecer.
  if (primera.done === true) return { motivo: 'sin-texto' };
  const decision = ofreceIncipit({ tope, primera: primera.value.texto });
  if (!decision.ofrece) return { motivo: decision.motivo };

  let texto = primera.value.texto;
  let anterior = primera.value;
  for (const unidad of unidades) {
    const siguiente = `${texto}${anterior.cierraParrafo ? '\n' : ' '}${unidad.texto}`;
    if ([...siguiente].length > (tope as number)) break;
    texto = siguiente;
    anterior = unidad;
  }
  return { incipit: texto };
}
