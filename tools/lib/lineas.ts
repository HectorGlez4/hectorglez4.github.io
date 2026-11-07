/**
 * El salto de verso: qué forma tienen las líneas de un documento y quién escribe el `texto`
 * de una Cita con sus saltos — AD-29, Historia 29.1.
 *
 * Un salto de documento no dice por sí solo que haya verso: Gutenberg parte a ~72 columnas
 * —y algún tomo a ~40—, Wikisource pone a veces una línea en blanco entre verso y verso, y
 * otras un párrafo por línea. Por eso hay **un dueño** de la forma, `formaDeLasLineas`, que
 * juzga solo el cuerpo y ante la duda dice `indeterminada`, y **un escritor** del `texto`,
 * `textoConSaltos`, que solo toca el espacio en blanco y solo pone un salto donde un documento
 * de verso lo tiene. Ningún otro módulo interpreta un salto de documento: lo fija
 * `tests/unit/lineas.test.ts`, con la lista exacta de quien importa de aquí.
 *
 * `cotejo.ts` y este módulo se importan mutuamente; ninguno usa en lo alto del módulo un valor
 * del otro, así que el orden de evaluación da igual.
 */

import { colapsarEspacios, localizar, rachasDeEspacio, tramoEnCrudo } from './cotejo.ts';

// ─────────────────────────────────────────────────────────────────────────────
// La forma de las líneas
// ─────────────────────────────────────────────────────────────────────────────

/** El conjunto cerrado de formas. El orden es el del parte de `tools/lineas.ts`. */
export const FORMAS_DE_LINEAS = [
  'verso',
  'verso-espaciado',
  'prosa-por-lineas',
  'prosa-ajustada',
  'indeterminada',
] as const;

export type FormaDeLineas = (typeof FORMAS_DE_LINEAS)[number];

export function esFormaDeLineas(valor: unknown): valor is FormaDeLineas {
  return typeof valor === 'string' && (FORMAS_DE_LINEAS as readonly string[]).includes(valor);
}

/** Las dos formas de las que sale un salto de verso. */
export function esFormaDeVerso(forma: FormaDeLineas): boolean {
  return forma === FORMAS_DE_LINEAS[0] || forma === FORMAS_DE_LINEAS[1];
}

/** Las cifras del clasificador. Afinarlas es afinar la espina: van con su motivo. */
const CLASIFICADOR = {
  /** Menos líneas que estas no dejan ver ninguna forma. */
  minLineas: 4,
  /** Fracción de líneas internas «partidas a ancho» que delata un ajuste. */
  minFraccionAjustada: 0.5,
  /** Con menos líneas internas que estas, el ajuste es sospecha y no veredicto. */
  minLineasParaAjuste: 30,
  /** Una línea más larga que esto, al final del cuerpo, se tolera como pie. */
  largoDePie: 90,
  /** La mediana y el percentil 90 del largo de un verso. */
  maxMedianaDeVerso: 55,
  maxP90DeVerso: 75,
  /** Fracción de bloques (o de líneas) que decide la forma. */
  minFraccionDeForma: 0.9,
  /** Bloques de una línea que hacen falta para ver un verso espaciado. */
  minBloquesEspaciados: 4,
  /** Cuántas líneas largas se toleran como mucho en cada extremo (nota delante, pie detrás). */
  maxLargasEnUnExtremo: 1,
  /** Desde cuántas líneas se toleran líneas largas en medio (las acotaciones de una pieza). */
  minLineasConAcotaciones: 100,
  /** Y cuántas, como fracción de las líneas. */
  maxFraccionDeAcotaciones: 0.01,
  /**
   * La fracción de entradas de índice («1. …», «XII -») —o de líneas que empiezan por las mismas
   * tres palabras— que ya no deja ver un verso.
   */
  maxFraccionDeIndice: 0.2,
  /** La mediana a partir de la cual un bloque de una línea es un párrafo. */
  minMedianaDeParrafo: 100,
} as const;

/**
 * El pie de licencia que Wikisource pega al final de casi todo cuerpo: «Esta obra se encuentra
 * en dominio público…» y la línea «Public domain…». No es de la obra y no dice nada de su forma.
 */
const PIE_DE_LICENCIA = /^(?:Esta obra se encuentra en dominio público|Public domain)/u;

/**
 * Una entrada de índice: «Capítulo IV», un número o un romano en mayúsculas seguidos de signo
 * («1. La tradición eterna», «I. Retrato»), o una línea que acaba en un guion suelto («XII -»).
 * Un índice de una entrada por línea tiene líneas cortas y no es verso. Un romano **solo** en
 * su línea no cuenta: es el número de un poema dentro de una serie (los *Proverbios y
 * cantares* de Machado).
 */
const ENTRADA_DE_INDICE =
  /^(?:Cap[íi]tulo|Cap\.|Libro|Parte)\s+(?:\d+|[IVXLCDM]+)\b|^(?:\d+|[IVXLCDM]+)\s*[.)\-–—:]|\s[-–—]$/u;
/** Lo que se ve al final de un verso: signo de cierre. */
const ACABA_EN_SIGNO = /[.,;:!?¡¿»”"')\]—–-]$/u;
const EMPIEZA_EN_MINUSCULA = /^\p{Ll}/u;

/**
 * La forma de las líneas de un documento, desde su cuerpo y sin red.
 *
 * La cabecera `lineas:` válida **manda**: es lo que `recuperar` escribe desde la v9. Una
 * declarada fuera del conjunto da `indeterminada` (y el build rompe por ella, en el cotejo).
 * Sin declaración, se calcula, de forma conservadora: nunca `verso` ni `verso-espaciado` un
 * documento ajustado a ancho fijo; ante la duda, `indeterminada`. No mira de qué Fuente es.
 */
export function formaDeLasLineas(documento: { cuerpo: string; lineas?: string }): FormaDeLineas {
  if (documento.lineas !== undefined) {
    return esFormaDeLineas(documento.lineas) ? documento.lineas : 'indeterminada';
  }
  return formaCalculada(documento.cuerpo);
}

function formaCalculada(cuerpo: string): FormaDeLineas {
  const todas = cuerpo.split(/\r?\n/u).map((l) => l.trim());
  // Fuera el pie de licencia y lo que haya en blanco detrás de la obra.
  let hasta = todas.length;
  while (hasta > 0 && (todas[hasta - 1] === '' || PIE_DE_LICENCIA.test(todas[hasta - 1]))) hasta -= 1;
  const lineas = todas.slice(0, hasta);

  const bloques: string[][] = [];
  let actual: string[] = [];
  for (const linea of lineas) {
    if (linea === '') {
      if (actual.length > 0) bloques.push(actual);
      actual = [];
    } else {
      actual.push(linea);
    }
  }
  if (actual.length > 0) bloques.push(actual);

  const llenas = bloques.flat();
  if (llenas.length < CLASIFICADOR.minLineas) return 'indeterminada';

  // ── Ajuste a ancho fijo: la línea se partió porque la palabra siguiente no cabía.
  let internas = 0;
  let partidas = 0;
  for (const bloque of bloques) {
    if (bloque.length < 3) continue;
    const maximo = bloque.reduce((m, l) => Math.max(m, l.length), 0);
    for (let i = 0; i < bloque.length - 1; i += 1) {
      internas += 1;
      const linea = bloque[i];
      const siguiente = bloque[i + 1];
      const primera = siguiente.split(/\s+/u)[0] ?? '';
      const noCabe = linea.length + 1 + primera.length > maximo;
      if (noCabe && !ACABA_EN_SIGNO.test(linea) && EMPIEZA_EN_MINUSCULA.test(siguiente)) partidas += 1;
    }
  }
  if (internas > 0 && partidas / internas >= CLASIFICADOR.minFraccionAjustada) {
    return internas >= CLASIFICADOR.minLineasParaAjuste ? 'prosa-ajustada' : 'indeterminada';
  }

  // ── Verso: líneas cortas. Se toleran las largas de los extremos (una nota editorial delante,
  // un pie que no es el de licencia detrás) y, en un documento largo, unas pocas en medio —las
  // acotaciones de una pieza en verso—; una larga en medio de un texto corto ya no es verso: es
  // la carta o la nota que no hay que tomar por poema.
  let desdeLargas = 0;
  while (
    desdeLargas < Math.min(CLASIFICADOR.maxLargasEnUnExtremo, llenas.length) &&
    llenas[desdeLargas].length > CLASIFICADOR.largoDePie
  ) {
    desdeLargas += 1;
  }
  let hastaLargas = llenas.length;
  while (
    llenas.length - hastaLargas < CLASIFICADOR.maxLargasEnUnExtremo &&
    hastaLargas > desdeLargas &&
    llenas[hastaLargas - 1].length > CLASIFICADOR.largoDePie
  ) {
    hastaLargas -= 1;
  }
  const delCuerpo = llenas.slice(desdeLargas, hastaLargas);
  const largasEnMedio = delCuerpo.filter((l) => l.length > CLASIFICADOR.largoDePie).length;
  const cortas = delCuerpo.filter((l) => l.length <= CLASIFICADOR.largoDePie);
  const largos = cortas.map((l) => l.length).sort((a, b) => a - b);
  const deUnaLinea = bloques.filter((b) => b.length === 1).length;
  const fraccionDeUnaLinea = deUnaLinea / bloques.length;
  const toleradas =
    delCuerpo.length >= CLASIFICADOR.minLineasConAcotaciones
      ? Math.floor(delCuerpo.length * CLASIFICADOR.maxFraccionDeAcotaciones)
      : 0;
  const indice = cortas.filter((l) => ENTRADA_DE_INDICE.test(l)).length;
  // Un índice de subpáginas repite el título de la obra al principio de cada entrada.
  const prefijos = new Map<string, number>();
  for (const l of cortas) {
    const prefijo = l.split(/\s+/u).slice(0, 3).join(' ');
    prefijos.set(prefijo, (prefijos.get(prefijo) ?? 0) + 1);
  }
  let repetido = 0;
  for (const n of prefijos.values()) repetido = Math.max(repetido, n);

  if (
    largos.length >= CLASIFICADOR.minLineas &&
    largasEnMedio <= toleradas &&
    !pareceIndice(indice, cortas.length) &&
    !pareceIndice(repetido, cortas.length)
  ) {
    const mediana = cuantil(largos, 0.5);
    const p90 = cuantil(largos, 0.9);
    if (mediana <= CLASIFICADOR.maxMedianaDeVerso && p90 <= CLASIFICADOR.maxP90DeVerso) {
      if (
        fraccionDeUnaLinea >= CLASIFICADOR.minFraccionDeForma &&
        deUnaLinea >= CLASIFICADOR.minBloquesEspaciados
      ) {
        return 'verso-espaciado';
      }
      const enVarias = bloques.filter((b) => b.length > 1).reduce((n, b) => n + b.length, 0);
      if (enVarias / llenas.length >= CLASIFICADOR.minFraccionDeForma) return 'verso';
    }
  }

  // ── Prosa por líneas: un párrafo por línea.
  if (fraccionDeUnaLinea >= CLASIFICADOR.minFraccionDeForma) {
    const todosLosLargos = llenas.map((l) => l.length).sort((a, b) => a - b);
    if (cuantil(todosLosLargos, 0.5) >= CLASIFICADOR.minMedianaDeParrafo) return 'prosa-por-lineas';
  }

  return 'indeterminada';
}

/** Si tantas entradas de índice entre tantas líneas hacen un índice: tres al menos, y una fracción. */
function pareceIndice(entradas: number, lineas: number): boolean {
  return entradas >= 3 && entradas / lineas >= CLASIFICADOR.maxFraccionDeIndice;
}

/** El cuantil `q` de una lista ya ordenada, por el método del rango más cercano. */
function cuantil(ordenados: readonly number[], q: number): number {
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.ceil(q * ordenados.length) - 1));
  return ordenados[i];
}

// ─────────────────────────────────────────────────────────────────────────────
// El escritor del texto
// ─────────────────────────────────────────────────────────────────────────────

export interface TextoConSaltos {
  /** El texto tal y como se escribe en el fichero de la Cita. */
  texto: string;
  /** Cuántos saltos del texto recibido no respaldaba ningún documento de verso, y se perdieron. */
  descartados: number;
}

/**
 * El **único** escritor del `texto` de una Cita — AD-29.
 *
 * Solo toca el espacio en blanco: cada racha de espacio del texto queda en `' '` o, si la racha
 * correspondiente del documento contiene un salto, en un `\n` —uno, también al cruzar estrofa—.
 * Hay saltos solo cuando `documento` es de forma `verso` o `verso-espaciado` y el texto se
 * localiza en él; si no, una línea. Los saltos que el texto traía y el documento no respalda no
 * sobreviven: se cuentan en `descartados`. Lo escrito colapsa a lo mismo que lo recibido
 * (NFR-12): las letras y los invisibles no se tocan.
 */
export function textoConSaltos(
  texto: string,
  documento?: { cuerpo: string; forma: FormaDeLineas },
): TextoConSaltos {
  // Las rachas de espacio del texto, con las reglas de `colapsarEspacios` (las de `cotejo.ts`):
  // la k-ésima que deja espacio es el k-ésimo espacio del colapsado.
  const rachas = rachasDeEspacio(texto);

  let saltosDelDocumento: boolean[] | undefined;
  if (documento !== undefined && esFormaDeVerso(documento.forma)) {
    const buscado = colapsarEspacios(texto);
    const donde = localizar(buscado, colapsarEspacios(documento.cuerpo));
    if (donde !== -1) {
      saltosDelDocumento = [];
      for (let k = 0; k < buscado.length; k += 1) {
        if (buscado[k] !== ' ') continue;
        const enCrudo = tramoEnCrudo(documento.cuerpo, donde + k, donde + k + 1);
        saltosDelDocumento.push(documento.cuerpo.slice(enCrudo.inicio, enCrudo.fin).includes('\n'));
      }
    }
  }

  let descartados = 0;
  let resultado = '';
  let desde = 0;
  let k = 0;
  for (const racha of rachas) {
    resultado += texto.slice(desde, racha.inicio);
    desde = racha.fin;
    const conSalto = texto.slice(racha.inicio, racha.fin).includes('\n');
    if (!racha.dejaEspacio) {
      // En un extremo, o solo invisibles: el espacio se va, como en `colapsarEspacios`.
      if (conSalto) descartados += 1;
      resultado += racha.invisibles;
      continue;
    }
    const salto = saltosDelDocumento?.[k] === true;
    k += 1;
    if (!salto && conSalto) descartados += 1;
    resultado += racha.invisibles + (salto ? '\n' : ' ');
  }
  resultado += texto.slice(desde);
  return { texto: resultado, descartados };
}

/** Un documento candidato de una Cita, tal y como lo lee quien escribe su `texto`. */
export interface DocumentoCandidato {
  nombre: string;
  cuerpo: string;
  /** La `lineas:` de su cabecera, en crudo. */
  lineas?: string;
}

/**
 * De qué documento salen los saltos de una Cita: el primero, en el orden de `documentosDeCita`,
 * de forma `verso` o `verso-espaciado` en que su texto se localiza. `undefined` si ninguno.
 */
export function documentoParaLosSaltos(
  texto: string,
  candidatos: readonly DocumentoCandidato[],
): { nombre: string; cuerpo: string; forma: FormaDeLineas } | undefined {
  const buscado = colapsarEspacios(texto);
  for (const candidato of candidatos) {
    const forma = formaDeLasLineas(candidato);
    if (!esFormaDeVerso(forma)) continue;
    if (localizar(buscado, colapsarEspacios(candidato.cuerpo)) === -1) continue;
    return { nombre: candidato.nombre, cuerpo: candidato.cuerpo, forma };
  }
  return undefined;
}

/** Lo que el parte dice de los saltos descartados, o nada si no hubo. */
export function parteDeSaltosDescartados(descartados: number): string | undefined {
  if (descartados === 0) return undefined;
  return (
    `${descartados} ${descartados === 1 ? 'salto tecleado no sobrevive' : 'saltos tecleados no sobreviven'}: ` +
    'ningún documento de verso de la Cita lo respalda, así que queda un espacio. Un salto de ' +
    'verso no se teclea; sale del documento (AD-29).'
  );
}
