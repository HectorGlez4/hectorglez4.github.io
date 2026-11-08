/**
 * La clase de una Cita, como relación entre ficheros — Historia 35.1, AD-32.
 *
 * El esquema juzga una Cita a la vez: que la atribuida no lleve `estadoDerechos`, que la de
 * siempre no lleve Personaje. Lo que no puede ver son las relaciones, y aquí viven dos piezas:
 *
 *   · `fallosDeClases`, puro, el núcleo de la puerta del build (`integraciones/clases.ts`): toda
 *     Cita publicada está en el registro `corpus/clases-de-cita.yml` con la clase que dice su
 *     fichero, ningún slug tiene dos clases, una Cita de siempre es de un Autor de dominio
 *     público y una atribuida es de un dueño con derechos vigentes;
 *   · `sembrarRegistro`, la siembra idempotente: anota como de siempre las Citas publicadas que
 *     falten y nada más, y se niega sin escribir si una que falta es atribuida —esa la anota
 *     solo su alta—.
 *
 * Qué es cada clase y quién tiene derechos lo decide solo `src/lib/clase.ts`.
 */

import {
  claseDe,
  derechosVigentes,
  dueñoAutor,
  esAtribuida,
  esDeDominioPublico,
  type Clase,
  type ReferenciaDeDerechos,
} from '../../src/lib/clase.ts';
import {
  leerCitas,
  leerRegistroDeClases,
  registrarClases,
  type ClaseRegistrada,
  type Rutas,
} from './corpus.ts';

/** La orden que anota las Citas que faltan en el registro, tal como se teclea. */
export const ORDEN_SEMBRAR_CLASES = 'npx tsx tools/clases.ts sembrar';

/**
 * Una pasada del alta o de la aprobación que se interrumpió —un fallo al mover o escribir una
 * Cita, o al escribir su Ficha de Obra— **después** de publicar alguna. Lo escrito no se deshace,
 * así que la orden no puede decir «no se ha escrito nada»: dice qué Citas quedaron publicadas,
 * si se anotaron en `corpus/clases-de-cita.yml` y, si no, la orden que las anota — Historia 35.1.
 */
export class PublicacionInterrumpida extends Error {
  constructor(
    readonly causa: unknown,
    readonly publicadas: readonly string[],
    readonly registroSinAnotar: string | undefined,
  ) {
    const porque = causa instanceof Error ? causa.message : String(causa);
    const anotadas =
      registroSinAnotar === undefined
        ? 'Se anotaron en corpus/clases-de-cita.yml.'
        : `No se anotaron en corpus/clases-de-cita.yml (${registroSinAnotar}): anótelas con «${ORDEN_SEMBRAR_CLASES}» antes de construir.`;
    super(
      `La pasada se interrumpió tras publicar ${publicadas.length} ${publicadas.length === 1 ? 'Cita' : 'Citas'} ` +
        `(${publicadas.join(', ')}): ${porque}. Lo publicado no se deshace. ${anotadas}`,
    );
    this.name = 'PublicacionInterrumpida';
  }
}

/**
 * Tras un fallo a media pasada, anota en el registro lo que ya se publicó y devuelve el error que
 * lo cuenta; sin nada publicado, devuelve el fallo tal cual (no se escribió nada).
 */
export async function anotarTrasInterrupcion(
  rutas: Rutas,
  entradas: readonly ClaseRegistrada[],
  causa: unknown,
): Promise<unknown> {
  if (entradas.length === 0) return causa;
  let registroSinAnotar: string | undefined;
  try {
    await registrarClases(rutas, entradas);
  } catch (fallo) {
    registroSinAnotar = fallo instanceof Error ? fallo.message : String(fallo);
  }
  return new PublicacionInterrumpida(causa, entradas.map((e) => e.slug), registroSinAnotar);
}

/**
 * Por qué el alta y la aprobación dejan en revisión una Cita que deriva atribuida: su puerta,
 * con sus topes, llega con la Historia 35.1b. Hasta entonces nada se publica atribuido por orden.
 */
export const MOTIVO_PUERTA_CERRADA = 'la puerta de la atribuida está cerrada (Historia 35.1b)';

/** Por qué no se obedece una clase escrita en el lote: la clase se deriva, no se teclea. */
export const MOTIVO_CLASE_TECLEADA =
  'la clase no se teclea: el alta la deriva del Autor y del Personaje (Historia 35.1). Quite «clase» del lote.';

/** Por qué no se aprueba una candidata cuya clase escrita no es la que le corresponde. */
export const motivoClaseDistinta = (escrita: Clase, corresponde: Clase): string =>
  `la candidata dice ser ${escrita} y le corresponde ${corresponde}: la clase no se teclea (Historia 35.1).`;

/**
 * Los slugs registrados con una clase distinta de la dada: para el alta y la aprobación cuentan
 * como ocupados, porque una Cita no cambia de clase y su slug tampoco.
 */
export function slugsConOtraClase(registro: readonly ClaseRegistrada[], clase: Clase): string[] {
  return registro.filter((e) => e.clase !== clase).map((e) => e.slug);
}

/** Lo que la puerta necesita de cada Cita publicada. */
export interface CitaParaClases {
  slug: string;
  /** La ruta de su fichero, como se nombra en el fallo (relativa a la raíz). */
  ruta: string;
  autor: string;
  clase?: unknown;
  personaje?: unknown;
}

/** Lo que la puerta necesita de cada Autor. */
export interface AutorParaClases {
  slug: string;
  ruta: string;
  vivo?: unknown;
  añoFallecimiento?: unknown;
}

/**
 * Las líneas de fallo de las clases: una por desacuerdo, en el orden de las rutas.
 *
 * Una Cita cuyo Autor no existe no se juzga aquí: ya la rechaza la referencia del esquema. Con
 * plazo de protección y sin año de referencia, `derechosVigentes` lanza, y el build con él.
 */
export function fallosDeClases(
  citas: readonly CitaParaClases[],
  autores: readonly AutorParaClases[],
  registro: readonly ClaseRegistrada[],
  referencia?: ReferenciaDeDerechos,
): string[] {
  const fallos: string[] = [];
  const clasesPorSlug = new Map<string, Set<string>>();
  for (const entrada of registro) {
    const clases = clasesPorSlug.get(entrada.slug) ?? new Set<string>();
    clases.add(entrada.clase);
    clasesPorSlug.set(entrada.slug, clases);
  }
  const autorPorSlug = new Map(autores.map((a) => [a.slug, a]));

  for (const [slug, clases] of [...clasesPorSlug].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (clases.size > 1) {
      fallos.push(
        `corpus/clases-de-cita.yml: el slug «${slug}» está registrado con dos clases ` +
          `(${[...clases].join(' y ')}). Una Cita no cambia de clase: se retira y se da de alta otra con otro slug.`,
      );
    }
  }

  for (const cita of [...citas].sort((a, b) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0))) {
    const suya = claseDe(cita);
    const registradas = clasesPorSlug.get(cita.slug);
    if (registradas === undefined) {
      fallos.push(
        `${cita.ruta}: la Cita «${cita.slug}» no está en corpus/clases-de-cita.yml. Anótela con: ${ORDEN_SEMBRAR_CLASES}`,
      );
    } else if (registradas.size === 1 && !registradas.has(suya)) {
      fallos.push(
        `${cita.ruta}: la Cita «${cita.slug}» es ${suya} y el registro la anota como ${[...registradas][0]}. ` +
          'Una Cita no cambia de clase: se retira y se da de alta otra con otro slug.',
      );
    }

    const autor = autorPorSlug.get(cita.autor);
    if (autor === undefined) continue;
    // Un Autor sin `vivo: true` ni `añoFallecimiento` lo rechaza su esquema, con su regla; aquí no
    // se le atribuye una razón («vive o su plazo no ha vencido») que no es la suya.
    if (autor.vivo !== true && typeof autor.añoFallecimiento !== 'number') continue;
    const dueño = dueñoAutor(autor);
    if (!esAtribuida(cita)) {
      if (!esDeDominioPublico(dueño, referencia)) {
        fallos.push(
          `${cita.ruta}: la Cita «${cita.slug}» es de siempre y su Autor (${autor.ruta}) no es de dominio ` +
            'público: o vive o su plazo de protección no ha vencido. Su Cita solo puede ser atribuida.',
        );
      }
    } else if (cita.personaje === undefined && !derechosVigentes(dueño, referencia)) {
      fallos.push(
        `${cita.ruta}: la Cita «${cita.slug}» es atribuida y su Autor (${autor.ruta}) no tiene derechos ` +
          'vigentes ni declara Personaje: una Cita de dominio público es de la clase de siempre, cotejada.',
      );
    }
  }
  return fallos;
}

/**
 * Las entradas que la siembra añadiría: cada Cita publicada sin entrada, con su clase y la
 * jornada dada. Lanza, sin que nadie escriba, si alguna de las que faltan es atribuida.
 */
export function entradasQueFaltan(
  citas: readonly { slug: string; ruta: string; clase?: unknown }[],
  registro: readonly ClaseRegistrada[],
  hoy: string,
): ClaseRegistrada[] {
  const registradas = new Set(registro.map((e) => e.slug));
  const faltan = [...citas]
    .filter((c) => !registradas.has(c.slug))
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const atribuidas = faltan.filter((c) => esAtribuida(c));
  if (atribuidas.length > 0) {
    throw new Error(
      `${atribuidas.map((c) => c.ruta).join(', ')}: ${atribuidas.length === 1 ? 'es una Cita atribuida' : 'son Citas atribuidas'} ` +
        'sin registrar. La siembra solo anota la clase de siempre: una atribuida la anota su alta. No se ha escrito nada.',
    );
  }
  return faltan.map((c) => ({ slug: c.slug, clase: claseDe(c), fecha: hoy }));
}

/** La siembra: lee el registro y las Citas publicadas y anota las que faltan, en un solo añadido. */
export async function sembrarRegistro(rutas: Rutas, hoy: string): Promise<{ añadidas: number; ruta: string }> {
  const registro = await leerRegistroDeClases(rutas);
  const citas = await leerCitas(rutas.citas);
  const nuevas = entradasQueFaltan(citas, registro, hoy);
  const ruta = await registrarClases(rutas, nuevas);
  return { añadidas: nuevas.length, ruta };
}
