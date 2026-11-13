/**
 * La puerta de la atribuida, como relación entre ficheros — Historia 35.1b, AD-32.
 *
 * El esquema (`src/lib/admision.ts`) juzga cada atribuida sola: sus atestiguaciones contadas por
 * dominio registrable, su origen, una sola línea, no apta para portada. Lo que relaciona
 * ficheros vive aquí, puro, y lo llaman el build (`integraciones/clases.ts`), el alta
 * (`tools/alta.ts`) y la aprobación (`tools/lib/revision.ts`) con el mismo conjunto: lo
 * publicado más lo que la pasada publica.
 *
 *   · **La puerta cerrada.** Mientras alguna de las cinco constantes que la gobiernan esté en
 *     `undefined` —`MAX_CARACTERES_DE_ATRIBUIDA`, `MAX_ATRIBUIDAS_POR_OBRA`,
 *     `MAX_ATRIBUIDAS_POR_DUEÑO`, `MIN_ATESTIGUACIONES_DE_ATRIBUIDA` (`src/lib/umbrales.ts`) y
 *     `BUZON_DE_PETICIONES` (`src/lib/dominio.ts`)— no se publica ninguna atribuida, y el motivo
 *     nombra las que faltan. Las fija Héctor; ningún agente.
 *   · **Los topes**, con la puerta abierta: el texto en puntos de código, las atribuidas de una
 *     Obra cuyo dueño tiene derechos vigentes y las de un dueño (Autor o, sin él, Personaje) con
 *     derechos vigentes.
 *   · **La figura pública sin Obra**: una atribuida de Autor y sin Personaje solo si ese Autor es
 *     `autor` de alguna Ficha de Obra activa (pregunta 23).
 *   · **Los duplicados entre clases**, con `parecidoEntre` —la única medida—, contra lo publicado
 *     de las dos clases y, en las órdenes, contra las candidatas de `corpus/_revision/` y el lote.
 *
 * Los valores entran por parámetro, y por omisión son los del árbol, para que las pruebas
 * unitarias no parcheen nada. Qué es atribuida lo dice solo `esAtribuida` de `src/lib/clase.ts`.
 */

import {
  MAX_ATRIBUIDAS_POR_DUEÑO,
  MAX_ATRIBUIDAS_POR_OBRA,
  MAX_CARACTERES_DE_ATRIBUIDA,
  MIN_ATESTIGUACIONES_DE_ATRIBUIDA,
} from '../../src/lib/umbrales.ts';
import { BUZON_DE_PETICIONES } from '../../src/lib/dominio.ts';
import {
  claseDe,
  derechosVigentes,
  dueñoAutor,
  esAtribuida,
  type DueñoDeDerechos,
  type ReferenciaDeDerechos,
} from '../../src/lib/clase.ts';
import { dueñoDeCita, dueñoDeFicha, fichaDeCita, indiceDeFichas, type FichaDeObra } from '../../src/lib/obras.ts';
import { formaParaComparar, parecidoEntre, type FormaParaComparar } from './parecido.ts';
import { motivoDeAtestiguacionesEscasas } from '../../src/lib/admision.ts';
import type { PlanDeFicha } from './obras.ts';

/** Los cinco valores que gobiernan la puerta. Sin alguno, está cerrada. */
export interface ValoresDeLaPuerta {
  maxCaracteres?: number;
  maxPorObra?: number;
  maxPorDueño?: number;
  minAtestiguaciones?: number;
  buzon?: string;
}

/** Los valores del árbol, de `src/lib/umbrales.ts` y `src/lib/dominio.ts`. */
export const VALORES_DEL_ARBOL: ValoresDeLaPuerta = {
  ...(MAX_CARACTERES_DE_ATRIBUIDA !== undefined ? { maxCaracteres: MAX_CARACTERES_DE_ATRIBUIDA } : {}),
  ...(MAX_ATRIBUIDAS_POR_OBRA !== undefined ? { maxPorObra: MAX_ATRIBUIDAS_POR_OBRA } : {}),
  ...(MAX_ATRIBUIDAS_POR_DUEÑO !== undefined ? { maxPorDueño: MAX_ATRIBUIDAS_POR_DUEÑO } : {}),
  ...(MIN_ATESTIGUACIONES_DE_ATRIBUIDA !== undefined ? { minAtestiguaciones: MIN_ATESTIGUACIONES_DE_ATRIBUIDA } : {}),
  ...(BUZON_DE_PETICIONES !== undefined ? { buzon: BUZON_DE_PETICIONES } : {}),
};

/** El nombre de cada constante, en el orden en que se nombran. */
const NOMBRES: readonly [keyof ValoresDeLaPuerta, string][] = [
  ['maxCaracteres', 'MAX_CARACTERES_DE_ATRIBUIDA'],
  ['maxPorObra', 'MAX_ATRIBUIDAS_POR_OBRA'],
  ['maxPorDueño', 'MAX_ATRIBUIDAS_POR_DUEÑO'],
  ['minAtestiguaciones', 'MIN_ATESTIGUACIONES_DE_ATRIBUIDA'],
  ['buzon', 'BUZON_DE_PETICIONES'],
];

/**
 * Si una constante tiene un valor con el que la puerta puede juzgar: un tope o un mínimo es un
 * entero positivo, y el buzón, una cadena con contenido. Un `0`, un negativo, un decimal, un
 * `NaN` o un buzón en blanco no abren la puerta: cuentan como sin valor.
 */
function conValor(valor: number | string | undefined): boolean {
  if (valor === undefined) return false;
  if (typeof valor === 'number') return Number.isInteger(valor) && valor > 0;
  return valor.trim() !== '';
}

/** Las constantes sin valor, por su nombre. Vacía, la puerta está abierta. */
export function constantesSinValor(valores: ValoresDeLaPuerta = VALORES_DEL_ARBOL): string[] {
  return NOMBRES.filter(([clave]) => !conValor(valores[clave])).map(([, nombre]) => nombre);
}

/**
 * Por qué no se publica ninguna atribuida: la puerta cerrada, con las constantes que faltan.
 * `undefined` si la puerta está abierta.
 */
export function motivoPuertaCerrada(valores: ValoresDeLaPuerta = VALORES_DEL_ARBOL): string | undefined {
  const faltan = constantesSinValor(valores);
  if (faltan.length === 0) return undefined;
  return (
    `la puerta de la atribuida está cerrada: ${faltan.length === 1 ? 'no tiene valor' : 'no tienen valor'} ` +
    `${faltan.join(', ')} (src/lib/umbrales.ts y src/lib/dominio.ts; un tope o un mínimo vale si es un entero ` +
    'positivo, y el buzón si tiene contenido). Las fija Héctor (Historia 35.1b).'
  );
}

/** Lo que el juicio necesita de cada Cita: publicada, en revisión o del lote. */
export interface CitaParaAtribuidas {
  slug: string;
  /** La ruta de su fichero, para nombrarla en el build. */
  ruta?: string;
  texto: string;
  autor?: string;
  personaje?: string;
  clase?: unknown;
  procedencia?: { obra?: string } | null;
  /**
   * Sus atestiguaciones, tal como las declara: el mínimo de dominios se juzga aquí también, con
   * el valor de la puerta, para que las órdenes que la abren por parámetro lo apliquen igual que
   * el esquema con el del árbol.
   */
  atestiguaciones?: unknown;
  /**
   * El texto de su Variante, si la declara — Historia 35.6: el tope de caracteres la juzga como
   * al texto, y los duplicados comparan las dos formas contra las de cada otra Cita.
   */
  variante?: string;
}

/**
 * El texto de la Variante de una Cita leída en bruto, o `undefined` si no declara ninguna (o no
 * tiene forma: eso lo dice el esquema) — Historia 35.6. Lo usan el build, el alta y la aprobación
 * para pasarla al juicio y al aviso de duplicados.
 */
export function textoDeVariante(cita: { variante?: unknown }): string | undefined {
  const v = cita.variante;
  if (v === null || typeof v !== 'object') return undefined;
  const t = (v as { texto?: unknown }).texto;
  return typeof t === 'string' && t !== '' ? t : undefined;
}

/** Un fallo del juicio: las Citas a que se debe, su ruta si es una y el motivo. */
export interface FalloDeAtribuida {
  slugs: string[];
  ruta?: string;
  motivo: string;
}

export interface EntradaDelJuicio {
  /** El conjunto entero: lo publicado más lo que la pasada publica, de las dos clases. */
  citas: readonly CitaParaAtribuidas[];
  autores: readonly { slug: string; vivo?: unknown; añoFallecimiento?: unknown }[];
  fichas: readonly FichaDeObra[];
  /** Autores que la pasada hace `autor` de una Ficha nueva: cuentan como con Obra. */
  autoresConFichaNueva?: readonly string[];
  /** Lo que, además de `citas`, se compara para los duplicados: candidatas de revisión y lote. */
  comparables?: readonly CitaParaAtribuidas[];
  /** Solo se juzgan estas atribuidas (por slug); por omisión, todas las de `citas`. */
  juzgar?: ReadonlySet<string>;
  valores?: ValoresDeLaPuerta;
  referencia?: ReferenciaDeDerechos;
}

/** Los puntos de código de un texto, como `MAX_CARACTERES_IMAGEN`, en su forma NFC. */
function puntosDeCodigo(texto: string): number {
  return [...texto.normalize('NFC')].length;
}

/** Las direcciones de una lista de atestiguaciones tal como llega del fichero. */
function urlsDe(atestiguaciones: unknown): string[] {
  if (!Array.isArray(atestiguaciones)) return [];
  return atestiguaciones
    .map((a) => (a !== null && typeof a === 'object' ? (a as { url?: unknown }).url : undefined))
    .filter((u): u is string => typeof u === 'string');
}

/**
 * La Ficha de Obra que un plan crea en la pasada, como la leerá el build cuando esté escrita:
 * así los topes por Obra cuentan juntas las atribuidas de una Obra nueva aunque su ficha aún no
 * esté en el disco (y en seco, que nunca la escribe). `undefined` si el plan no crea ninguna.
 */
export function fichaPlaneada(plan: PlanDeFicha | undefined, autor?: string): FichaDeObra | undefined {
  if (plan === undefined || !plan.ok || plan.accion !== 'crear') return undefined;
  return {
    nombre: plan.nombre,
    ruta: plan.nombre,
    titulo: plan.titulo,
    formas: [plan.forma],
    ...(plan.dueño.tipo === 'autor'
      ? { autor: plan.dueño.slug }
      : { personaje: plan.dueño.slug, personajes: [plan.dueño.slug], ...(autor !== undefined ? { autor } : {}) }),
  };
}

/**
 * Si el plan deja al Autor con una Ficha de Obra activa que hoy no está en el disco: la crea a su
 * nombre o restaura una retirada. Un plan `existente` no da ninguna —o ya está en el disco, o la
 * obra no deja forma y no la necesita—.
 */
export function planDaFichaAlAutor(plan: PlanDeFicha | undefined): boolean {
  if (plan === undefined || !plan.ok) return false;
  if (plan.accion === 'crear') return plan.dueño.tipo === 'autor';
  return plan.accion === 'restaurar';
}

/**
 * Los fallos de las atribuidas de un conjunto. Con la puerta cerrada, uno por atribuida con el
 * motivo de las constantes y nada más; con la puerta abierta, los topes, la figura sin Obra y
 * los duplicados entre clases.
 */
export function fallosDeAtribuidas(entrada: EntradaDelJuicio): FalloDeAtribuida[] {
  const valores = entrada.valores ?? VALORES_DEL_ARBOL;
  const atribuidas = entrada.citas.filter((c) => esAtribuida(c));
  const juzgadas = atribuidas.filter((c) => entrada.juzgar === undefined || entrada.juzgar.has(c.slug));
  if (juzgadas.length === 0) return [];
  const deUna = (c: CitaParaAtribuidas, motivo: string): FalloDeAtribuida => ({
    slugs: [c.slug],
    ...(c.ruta !== undefined ? { ruta: c.ruta } : {}),
    motivo,
  });

  const cerrada = motivoPuertaCerrada(valores);
  if (cerrada !== undefined) return juzgadas.map((c) => deUna(c, cerrada));

  const fallos: FalloDeAtribuida[] = [];
  const autorPorSlug = new Map(entrada.autores.map((a) => [a.slug, a]));
  const juzgada = (slug: string) => juzgadas.some((c) => c.slug === slug);

  // ── El mínimo de dominios, con el valor de la puerta (el esquema lo juzga con el del árbol) ──
  for (const c of juzgadas) {
    if (c.atestiguaciones === undefined) continue;
    const motivo = motivoDeAtestiguacionesEscasas(urlsDe(c.atestiguaciones), valores.minAtestiguaciones);
    if (motivo !== undefined) fallos.push(deUna(c, `la atribuida «${c.slug}»: ${motivo}`));
  }

  // ── El texto ──
  for (const c of juzgadas) {
    const n = puntosDeCodigo(c.texto);
    if (n > valores.maxCaracteres!) {
      fallos.push(
        deUna(
          c,
          `la atribuida «${c.slug}» tiene ${n} caracteres y el tope es ${valores.maxCaracteres} ` +
            '(MAX_CARACTERES_DE_ATRIBUIDA).',
        ),
      );
    }
  }
  // ── La Variante, con el mismo tope que el texto (Historia 35.6) ──
  for (const c of juzgadas) {
    if (typeof c.variante !== 'string') continue;
    const n = puntosDeCodigo(c.variante);
    if (n > valores.maxCaracteres!) {
      fallos.push(
        deUna(
          c,
          `la variante de la atribuida «${c.slug}» tiene ${n} caracteres y el tope es ${valores.maxCaracteres} ` +
            '(MAX_CARACTERES_DE_ATRIBUIDA).',
        ),
      );
    }
  }

  // ── Los derechos de un dueño ──
  const tieneDerechos = (dueño: { tipo: 'autor' | 'personaje'; slug: string }): boolean => {
    if (dueño.tipo === 'personaje') return derechosVigentes({ tipo: 'personaje' }, entrada.referencia);
    const autor = autorPorSlug.get(dueño.slug);
    if (autor === undefined) return false;
    const comoDueño: DueñoDeDerechos = dueñoAutor(autor);
    return derechosVigentes(comoDueño, entrada.referencia);
  };

  // ── Por Obra ──
  const indice = indiceDeFichas(entrada.fichas);
  const porObra = new Map<string, { ficha: FichaDeObra; slugs: string[] }>();
  for (const c of atribuidas) {
    const ficha = fichaDeCita(c, indice);
    if (ficha === undefined) continue;
    const grupo = porObra.get(ficha.nombre) ?? { ficha, slugs: [] };
    grupo.slugs.push(c.slug);
    porObra.set(ficha.nombre, grupo);
  }
  for (const { ficha, slugs } of [...porObra.values()].sort((a, b) => (a.ficha.nombre < b.ficha.nombre ? -1 : 1))) {
    if (slugs.length <= valores.maxPorObra! || !slugs.some(juzgada)) continue;
    // El dueño de la ficha, por su única regla (`dueñoDeFicha`): su Personaje si es la de un
    // Personaje (35.2), cuyo `autor` es solo informativo, y si no su Autor.
    if (!tieneDerechos(dueñoDeFicha(ficha))) continue;
    fallos.push({
      slugs,
      // El build nombra el fichero de la ficha; las órdenes, cada Cita por su slug.
      ruta: ficha.ruta,
      motivo:
        `la Obra «${ficha.nombre}» tendría ${slugs.length} atribuidas y el tope es ${valores.maxPorObra} ` +
        `(MAX_ATRIBUIDAS_POR_OBRA): ${slugs.join(', ')}.`,
    });
  }

  // ── Por dueño ──
  const porDueño = new Map<string, { dueño: { tipo: 'autor' | 'personaje'; slug: string }; slugs: string[] }>();
  for (const c of atribuidas) {
    if (c.autor === undefined && c.personaje === undefined) continue;
    const dueño = dueñoDeCita(c);
    const k = `${dueño.tipo}:${dueño.slug}`;
    const grupo = porDueño.get(k) ?? { dueño, slugs: [] };
    grupo.slugs.push(c.slug);
    porDueño.set(k, grupo);
  }
  for (const { dueño, slugs } of [...porDueño.values()].sort((a, b) => (a.dueño.slug < b.dueño.slug ? -1 : 1))) {
    if (slugs.length <= valores.maxPorDueño! || !slugs.some(juzgada)) continue;
    if (!tieneDerechos(dueño)) continue;
    fallos.push({
      slugs,
      motivo:
        `${dueño.tipo === 'autor' ? 'el Autor' : 'el Personaje'} «${dueño.slug}» tendría ${slugs.length} atribuidas ` +
        `y el tope es ${valores.maxPorDueño} (MAX_ATRIBUIDAS_POR_DUEÑO): ${slugs.join(', ')}.`,
    });
  }

  // ── La figura pública sin Obra (pregunta 23) ──
  // Con Obra es **dueño** de una ficha (`dueñoDeFicha`): el `autor` de la ficha de un Personaje es
  // solo informativo, y no le da Obra al Autor que nombra.
  const conObra = new Set([
    ...entrada.fichas.flatMap((f) => (f.personaje === undefined && f.autor !== undefined ? [f.autor] : [])),
    ...(entrada.autoresConFichaNueva ?? []),
  ]);
  for (const c of juzgadas) {
    if (c.personaje !== undefined || c.autor === undefined) continue;
    if (conObra.has(c.autor)) continue;
    fallos.push(
      deUna(
        c,
        `la atribuida «${c.slug}» es del Autor «${c.autor}», sin Personaje, y ese Autor no es autor de ninguna ` +
          'Ficha de Obra: una figura pública sin Obra no tiene atribuidas (pregunta 23).',
      ),
    );
  }

  // ── Los duplicados entre clases ──
  const otras = [...entrada.citas, ...(entrada.comparables ?? [])];
  // Desde la 35.6 cada Cita aporta sus formas —texto y, si la declara, Variante—, y la juzgada
  // coincide con otra si cualquiera de las suyas coincide con cualquiera de las de la otra.
  for (const c of juzgadas) {
    const suyas = formasDe(c);
    for (const otra of otras) {
      // Por identidad, no por slug: una candidata con el texto exacto de una publicada del mismo
      // dueño tiene su mismo slug (la aprobación la renombraría), y es justo el duplicado que se veda.
      if (otra === c) continue;
      if (typeof otra.texto !== 'string') continue;
      const deLaOtra = formasDe(otra);
      let coincidencia: ReturnType<typeof parecidoEntre> = undefined;
      for (const suya of suyas) {
        for (const ajena of deLaOtra) {
          coincidencia = parecidoEntre(suya, ajena);
          if (coincidencia !== undefined) break;
        }
        if (coincidencia !== undefined) break;
      }
      if (coincidencia === undefined) continue;
      fallos.push(
        deUna(
          c,
          `la atribuida «${c.slug}» coincide con «${otra.slug}», de la clase ${claseDe(otra)} ` +
            `(parecido ${coincidencia.parecido.toFixed(2)}): no se publica un duplicado entre clases, ni con ` +
            '«--con-duplicados».',
        ),
      );
      break;
    }
  }
  return fallos;
}

/**
 * La forma de comparar de cada Cita, una vez por objeto: las órdenes juzgan cada atribuida contra
 * las mismas candidatas de `corpus/_revision/`, y rehacer la forma de cada una por atribuida
 * multiplicaría el trabajo.
 */
const FORMAS = new WeakMap<CitaParaAtribuidas, readonly FormaParaComparar[]>();
function formasDe(c: CitaParaAtribuidas): readonly FormaParaComparar[] {
  let f = FORMAS.get(c);
  if (f === undefined) {
    f = [
      formaParaComparar(c.texto),
      ...(typeof c.variante === 'string' && c.variante !== '' ? [formaParaComparar(c.variante)] : []),
    ];
    FORMAS.set(c, f);
  }
  return f;
}

/** Los motivos de una Cita en un conjunto de fallos. */
export function motivosDe(fallos: readonly FalloDeAtribuida[], slug: string): string[] {
  return fallos.filter((f) => f.slugs.includes(slug)).map((f) => f.motivo);
}

/** Una línea del build por fallo: la ruta (o las Citas) y el motivo. */
export function lineaDelBuild(fallo: FalloDeAtribuida): string {
  return `${fallo.ruta ?? fallo.slugs.join(', ')}: ${fallo.motivo}`;
}
