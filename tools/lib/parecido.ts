/**
 * El parecido entre dos Citas — AD-3 (enmendado v9), FR-14, Historia 29.4.
 *
 * **Único dueño.** Hasta la 29.4 la misma pregunta —«¿son estas dos la misma Cita?»— tenía tres
 * respuestas: `revisar` solo veía la repetida exacta, el alta veía además la contenida con una
 * función propia, y `documentar --texto` medía el parecido con otra. Tres medidas para una
 * pregunta acaban discrepando: una Cita que el alta aparta pasa la revisión, o una corrección que
 * `documentar` admite la habría señalado el alta. Aquí vive la única medida, `parecidoEntre`, y la
 * distancia de edición y la contención no se calculan en ningún otro módulo (lo fija
 * `tests/unit/parecido.test.ts`).
 *
 * Todo se juzga sobre la **forma canónica** de `normalizar` (AD-3): la misma de la búsqueda, y la
 * que pliega el salto de verso (AD-29), así que una Cita con sus saltos y la misma de corrido son
 * repetidas. Las clases, con su precedencia:
 *
 * 1. **repetidas** — la misma forma canónica, no vacía.
 * 2. **contenida** — la forma de una está dentro de la de la otra, y la más corta tiene al menos
 *    `MIN_CARACTERES_PARA_CONTENCION` caracteres canónicos (Historia 15.2: «la diligencia es madre
 *    de la buena ventura» publicada, y después la misma sentencia con su segunda mitad; el índice
 *    de iguales dijo cero duplicados y `slugLibre` renombró la segunda a `-2` en silencio). Sin el
 *    suelo, «Yo sé quién soy» quedaría atrapada por cualquier Cita larga, y un aviso que salta de
 *    más es un aviso que se aprende a ignorar.
 * 3. **casi iguales** — `parecidoDeTextos ≥ MIN_PARECIDO_PARA_CORREGIR`: la misma Cita con una
 *    palabra cambiada («en julio»/«en junio»), que es lo que la corrección de `documentar --texto`
 *    admite y lo que, publicado dos veces, es un duplicado con otra URL.
 *
 * La contención gana a la casi igualdad porque dice qué hacer: un fragmento al que le falta una
 * palabra final puede pasar el 0,85, y llamarlo «contenida» dice que es la otra Cita recortada.
 *
 * Nada de esto decide: **señala**. Retirar, conservar las dos o restituir el literal lo decide una
 * persona. Y la comparación no lee ninguna clase de Cita ni filtra por Autor (AD-32): quien la
 * llama decide contra qué conjunto compara.
 */

import { normalizar } from '../../src/lib/normalizar.ts';
import { MIN_CARACTERES_PARA_CONTENCION } from '../../src/lib/umbrales.ts';

/**
 * Cuánto tiene que parecerse el texto corregido al publicado para que sea **la misma Cita**.
 *
 * El caso real que obliga a que exista `--texto` está en el censo: el Corpus dice «Hombres
 * necios que acusáis a la mujer sin razón, sin ver que sois la ocasión de lo mismo que
 * culpáis.» y las *Redondillas* dicen lo mismo con una coma más y un punto y coma final. No
 * es una paráfrasis: es la misma Cita con la puntuación normalizada al teclearla en la v1, y
 * ese es el patrón general del censo. Sin esta salida, la única sería retirar Citas
 * verdaderas por una coma.
 *
 * El parecido se mide sobre la **forma canónica de AD-3**, que es la definición que el
 * proyecto ya tiene de «dos textos son la misma Cita» y la que usa la detección de
 * duplicados de FR-14. Eso hace que una corrección que solo toca signos o acentos —el caso
 * de las *Redondillas*— valga 1, sin margen de duda, y que lo que el umbral juzgue de verdad
 * sean las diferencias de **palabras**, que son las que pueden convertir una Cita en otra.
 *
 * 0,85 deja restituir una palabra elidida o una forma verbal en un texto de la longitud
 * habitual —una frase de 100 caracteres canónicos admite 15 de corrección— y se queda muy
 * por encima de lo que puntúan dos Citas distintas de la misma página: «El sabio hace luego
 * lo que el necio al fin» contra «Haga al principio el cuerdo lo que el necio al fin»
 * —justamente el par que descubrió el problema— se queda en 0,60. Entre las dos cosas hay
 * espacio de sobra, y el umbral vive en esa holgura y no pegado a ningún caso concreto.
 *
 * No es la puerta: la puerta es que el texto nuevo **aparezca literal en el documento**, que
 * es lo que impide inventárselo. Esto es lo que impide lo otro, cambiar una Cita por otra
 * distinta de la misma página, que sí aparecería literal. Desde la 29.4 es también el umbral
 * de la clase «casi iguales» de `parecidoEntre`: la misma medida para corregir y para señalar.
 */
export const MIN_PARECIDO_PARA_CORREGIR = 0.85;

/**
 * Cuánto se parecen dos textos, entre 0 y 1, sobre su forma canónica.
 *
 * Distancia de edición normalizada por la longitud del más largo. Se cuenta por caracteres
 * y no por palabras porque una corrección típica del censo cambia media palabra —una `s`
 * final, una tilde que en forma canónica ni se ve— y un parecido por palabras la contaría
 * como palabra entera cambiada, castigando más una corrección menor en un texto corto que
 * una reescritura en uno largo.
 */
export function parecidoDeTextos(a: string, b: string): number {
  return parecidoCanonico(normalizar(a), normalizar(b));
}

/**
 * El parecido como se escribe en cualquier parte de la curación —el alta, `revisar` y el parte de
 * casi duplicados—: dos decimales con coma («0,91»). Una sola forma para la misma medida.
 */
export function cifraDeParecido(parecido: number): string {
  // Redondear 0,995 o más daría «1,00», la cifra de las repetidas: lo que no es igual no se
  // escribe como igual, y se queda en «0,99».
  const cifra = parecido < 1 && parecido >= 0.995 ? 0.99 : parecido;
  return cifra.toFixed(2).replace('.', ',');
}

function parecidoCanonico(uno: string, otro: string): number {
  if (uno === otro) return 1;
  if (uno === '' || otro === '') return 0;
  return 1 - distanciaDeEdicion(uno, otro) / Math.max(uno.length, otro.length);
}

/** Distancia de Levenshtein, con una sola fila viva: los textos de una Cita son cortos. */
function distanciaDeEdicion(uno: string, otro: string): number {
  let fila = Array.from({ length: otro.length + 1 }, (_, i) => i);

  for (let i = 1; i <= uno.length; i += 1) {
    const siguiente = [i];
    for (let j = 1; j <= otro.length; j += 1) {
      siguiente[j] = Math.min(
        fila[j] + 1,
        siguiente[j - 1] + 1,
        fila[j - 1] + (uno[i - 1] === otro[j - 1] ? 0 : 1),
      );
    }
    fila = siguiente;
  }

  return fila[otro.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// La forma precalculada, para recorrer conjuntos grandes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un texto ya normalizado, para compararlo muchas veces sin normalizarlo cada vez.
 *
 * `revisar` compara cientos de miles de candidatas; normalizar cada texto una sola vez y guardar
 * aquí lo que los descartes necesitan —las palabras y los trigramas, calculados la primera vez que
 * hacen falta— es lo que hace viable el recorrido. No cambia ningún veredicto: `parecidoEntre`
 * acepta el texto o su forma y responde lo mismo.
 */
export class FormaParaComparar {
  readonly canonica: string;
  #palabras: string[] | undefined;
  #trigramas: Float64Array | undefined;

  constructor(texto: string) {
    this.canonica = normalizar(texto);
  }

  get palabras(): string[] {
    this.#palabras ??= this.canonica === '' ? [] : this.canonica.split(' ');
    return this.#palabras;
  }

  /** Los trigramas de la forma canónica, codificados y ordenados (con repeticiones). */
  get trigramas(): Float64Array {
    if (this.#trigramas === undefined) {
      const c = this.canonica;
      const n = Math.max(0, c.length - 2);
      const codigos = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        codigos[i] = (c.charCodeAt(i) * 65536 + c.charCodeAt(i + 1)) * 65536 + c.charCodeAt(i + 2);
      }
      this.#trigramas = codigos.sort();
    }
    return this.#trigramas;
  }
}

export function formaParaComparar(texto: string): FormaParaComparar {
  return new FormaParaComparar(texto);
}

export type Comparable = string | FormaParaComparar;

function forma(x: Comparable): FormaParaComparar {
  return typeof x === 'string' ? new FormaParaComparar(x) : x;
}

// ─────────────────────────────────────────────────────────────────────────────
// La medida
// ─────────────────────────────────────────────────────────────────────────────

export type ClaseDeCoincidencia = 'repetidas' | 'contenida' | 'casi-iguales';

/** Las clases en su orden de precedencia: es también el orden en que se listan. */
export const CLASES_DE_COINCIDENCIA: readonly ClaseDeCoincidencia[] = ['repetidas', 'contenida', 'casi-iguales'];

export interface Coincidencia {
  clase: ClaseDeCoincidencia;
  /** `parecidoDeTextos` de las dos: 1 si son repetidas. */
  parecido: number;
  /** En la contenida, cuál de las dos está dentro de la otra. */
  contenida?: 'a' | 'b';
  /**
   * Si las dos formas tienen las mismas palabras salvo una, en la misma posición: cuál es en cada
   * una («julio»/«junio»). Es lo que quien decide necesita ver para saber si es una errata.
   */
  palabra?: { a: string; b: string };
}

/**
 * La única medida de parecido: cómo coinciden dos Citas, o `undefined` si no coinciden.
 *
 * Los descartes por longitud son exactos y no cambian ningún veredicto: la distancia de edición
 * es al menos la diferencia de longitudes, así que si esa sola ya baja el parecido de 0,85 no hay
 * casi igualdad; y con la más corta por debajo de `MIN_CARACTERES_PARA_CONTENCION` no hay
 * contención. El de trigramas también es exacto (lema de los q-gramas: cada operación de edición
 * destruye como mucho tres trigramas, así que dos textos a distancia `k` comparten al menos
 * `max − 2 − 3k`), y evita la distancia de edición en casi todos los pares que no se parecen.
 *
 * `hasta` corta la precedencia en una clase: con `'contenida'` solo se mira la repetida y la
 * contenida, que es lo que aparta el alta frente a todo el Corpus, sin calcular trigramas de cada
 * Cita. No cambia el veredicto de las clases que sí mira.
 */
export function parecidoEntre(
  a: Comparable,
  b: Comparable,
  hasta: ClaseDeCoincidencia = 'casi-iguales',
): Coincidencia | undefined {
  const fa = forma(a);
  const fb = forma(b);
  const ca = fa.canonica;
  const cb = fb.canonica;
  // Una forma canónica vacía no coincide con nada: no hay texto que comparar.
  if (ca === '' || cb === '') return undefined;
  if (ca === cb) return { clase: 'repetidas', parecido: 1 };
  if (hasta === 'repetidas') return undefined;

  const larga = Math.max(ca.length, cb.length);
  const corta = Math.min(ca.length, cb.length);

  if (corta >= MIN_CARACTERES_PARA_CONTENCION) {
    const aEnB = ca.length < cb.length && cb.includes(ca);
    const bEnA = !aEnB && cb.length < ca.length && ca.includes(cb);
    if (aEnB || bEnA) {
      // Dentro de la otra, la distancia de edición es justo la diferencia de longitudes.
      return {
        clase: 'contenida',
        parecido: 1 - (larga - corta) / larga,
        contenida: aEnB ? 'a' : 'b',
      };
    }
  }

  if (hasta !== 'casi-iguales') return undefined;
  const tope = distanciaMaxima(larga);
  if (larga - corta > tope) return undefined;
  if (comunes(fa.trigramas, fb.trigramas) < larga - 2 - 3 * tope) return undefined;
  const parecido = parecidoCanonico(ca, cb);
  if (parecido < MIN_PARECIDO_PARA_CORREGIR) return undefined;
  const palabra = palabraDistinta(fa.palabras, fb.palabras);
  return { clase: 'casi-iguales', parecido, ...(palabra !== undefined ? { palabra } : {}) };
}

/** La mayor distancia de edición que deja el parecido en el umbral, con la misma aritmética. */
function distanciaMaxima(larga: number): number {
  let d = Math.ceil((1 - MIN_PARECIDO_PARA_CORREGIR) * larga) + 1;
  while (d > 0 && 1 - d / larga < MIN_PARECIDO_PARA_CORREGIR) d -= 1;
  return d;
}

/** Trigramas comunes, contando repeticiones, de dos listas ordenadas. */
function comunes(x: Float64Array, y: Float64Array): number {
  let i = 0;
  let j = 0;
  let n = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      n += 1;
      i += 1;
      j += 1;
    } else if (x[i] < y[j]) i += 1;
    else j += 1;
  }
  return n;
}

function palabraDistinta(pa: string[], pb: string[]): { a: string; b: string } | undefined {
  if (pa.length !== pb.length) return undefined;
  let distinta: { a: string; b: string } | undefined;
  for (let i = 0; i < pa.length; i += 1) {
    if (pa[i] === pb[i]) continue;
    if (distinta !== undefined) return undefined;
    distinta = { a: pa[i], b: pb[i] };
  }
  return distinta;
}

// ─────────────────────────────────────────────────────────────────────────────
// La contención en conjuntos grandes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las formas de un conjunto que **podrían** contener a una dada, para no comparar contra todas.
 *
 * Es un descarte, no un veredicto: el veredicto sigue siendo `parecidoEntre`. Si una forma está
 * dentro de otra, cada palabra suya que no sea la primera ni la última está entera en la otra —la
 * primera y la última pueden caer a media palabra—, así que basta mirar las formas que contienen
 * su palabra interior más rara. Con 288.594 candidatas, comparar contra todas no termina; contra
 * esa lista, sí.
 */
export function indiceDeContencion(formas: readonly FormaParaComparar[]): (f: FormaParaComparar) => number[] {
  const porPalabra = new Map<string, number[]>();
  formas.forEach((f, indice) => {
    for (const p of new Set(f.palabras)) {
      const lista = porPalabra.get(p);
      if (lista === undefined) porPalabra.set(p, [indice]);
      else lista.push(indice);
    }
  });
  const todas = formas.map((_, i) => i);

  return (f) => {
    if (f.canonica.length < MIN_CARACTERES_PARA_CONTENCION) return [];
    const interiores = f.palabras.slice(1, -1);
    if (interiores.length === 0) {
      return todas.filter((i) => formas[i].canonica.length > f.canonica.length);
    }
    let rara: number[] | undefined;
    for (const p of interiores) {
      const lista = porPalabra.get(p) ?? [];
      if (rara === undefined || lista.length < rara.length) rara = lista;
      if (rara.length === 0) break;
    }
    return (rara ?? []).filter((i) => formas[i].canonica.length > f.canonica.length);
  };
}
