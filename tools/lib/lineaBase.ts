/**
 * La lectura de la línea base, pura — FR-56, AD-9, AD-13, AD-14, AD-22, Historia 23.10.
 *
 * `npm run medicion` sin subcomando lee de D1 cinco recuentos agrupados y `d1 info`
 * (`leer`, en `tools/lib/medicion.ts`); aquí se decide todo lo que se hace con ellos, sin tocar
 * nada: los descuentos, el censo, los tramos de cada serie, las tasas, las líneas base, las firmas,
 * las ventanas y el informe. Se prueba con respuestas fijas en `tests/unit/linea-base.test.ts`.
 *
 * Las reglas que lo sostienen, cada una en su sitio de abajo:
 *
 *   · **Ausencia antes que cero.** Una consulta que no se leyó no da ninguna cifra: lo que depende
 *     de ella sale «sin leer», nombrándola, y una tasa sin denominador dice «sin denominador».
 *   · **La superficie es la página donde ocurrió**, resuelta contra el censo de hoy y la declaración
 *     de `src/lib/superficies.ts`, nunca por el prefijo de la ruta (AD-13). Lo que no casa se cuenta
 *     aparte y se nombra.
 *   · **Las series se parten por los cortes que las nombran** (`CORTES_DE_SERIE`), y los tramos no
 *     se suman: la jornada de llegada se informa aparte, como «cambió».
 *   · **Los umbrales y las listas se leen de `src/lib/umbrales.ts`, nunca se copian**: entran como
 *     parámetros con su valor por omisión, para que las pruebas recorran cada estado.
 *   · **Ninguna cifra se compara con las metas de SM-3…SM-7**, que están en suspenso, y una línea
 *     base se dice «cerrada», nunca «buena»: eso lo anota Héctor en `DESPLIEGUE.md` §3.
 *
 * Solo recuentos por jornada, ruta, evento y campo: ni sesiones ni recorridos (NFR-11). Ningún
 * módulo de `src/` importa ni nombra este (AD-14).
 */

import { DESTINO_DE_IMAGEN, DESTINO_OPACO, DESTINOS_VALIDOS } from '../../src/lib/destinos.ts';
import { REDES_VALIDAS, type Red } from '../../src/lib/redes.ts';
import {
  LINEA_BASE_DE_LOS_DIRECTORIOS,
  SUPERFICIES,
  esServicioPorForma,
  rutaNormalizada,
  superficieDeLineaBase,
  superficieDeclaradaDe,
  type Superficie,
} from '../../src/lib/superficies.ts';
import {
  CORTES_DE_SERIE,
  CUOTA_DE_BYTES_POR_BASE_EN_D1,
  CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1,
  DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS,
  DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO,
  DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS,
  MIN_LECTURAS_DE_LINEA_BASE,
  MIN_RUTAS_DE_CITA_EN_RAFAGA,
  PASADAS_QUE_ESCRIBEN_EN_PRODUCCION,
  SM12_CON_FACEBOOK,
  type CorteLlegado,
  type PasadaEnProduccion,
  type SerieDeMedicion,
} from '../../src/lib/umbrales.ts';
import { EVENTOS, MARCAS_DE_OBRA, PRIMERA, TRAMOS, type Zona } from '../../src/lib/vocabulario.ts';
import {
  CONSULTAS_DE_LA_LECTURA,
  FORMA_DE_JORNADA,
  QUE_LEE,
  RUTA_DE_COMPROBACION,
  jornadaAnterior,
  jornadaUtc,
  textoDeRecorridos,
  vecesQueRecorre,
  type ConsultaDeLaLectura,
  type CuotaLeida,
  type Filas,
  type GastoDeLaLectura,
  type Leido,
} from './medicion.ts';

// ── Lo leído ──────────────────────────────────────────────────────────────────────────────

/** Una fila de una de las cinco consultas: un recuento agrupado, con los campos que la agrupan. */
export interface Recuento {
  jornada: string;
  ruta: string;
  evento: string;
  n: number;
  origen: string | null;
  via: string | null;
  indexable: string | null;
  zona: string | null;
  destino: string | null;
  primera: string | null;
  tramo: string | null;
  filtros: string | null;
  consulta: string | null;
}

/** El evento de las consultas que no lo agrupan, porque leen uno solo. */
const EVENTO_IMPLICITO: { readonly [C in ConsultaDeLaLectura]?: string } = {
  salidas: EVENTOS.salidaInterna,
  busquedas: EVENTOS.busqueda,
  sinResultados: EVENTOS.busquedaSinResultados,
};

const CAMPOS_DE_TEXTO = ['origen', 'via', 'indexable', 'zona', 'destino', 'primera', 'tramo', 'filtros', 'consulta'] as const;

/**
 * Los recuentos de una consulta, o por qué no se dejan leer. Una sola fila sin forma —una jornada
 * que no es jornada, un recuento que no es un entero— invalida la consulta entera: leer las demás
 * y callar esa daría una cifra menor sin decirlo.
 */
export function recuentosDe(consulta: ConsultaDeLaLectura, filas: readonly Record<string, unknown>[]): Leido<Recuento[]> {
  const recuentos: Recuento[] = [];
  for (const fila of filas) {
    const { jornada, ruta, n } = fila;
    const evento = EVENTO_IMPLICITO[consulta] ?? fila.evento;
    const conForma =
      typeof jornada === 'string' &&
      FORMA_DE_JORNADA.test(jornada) &&
      typeof ruta === 'string' &&
      typeof evento === 'string' &&
      typeof n === 'number' &&
      Number.isInteger(n) &&
      n >= 0 &&
      CAMPOS_DE_TEXTO.every((campo) => fila[campo] === undefined || fila[campo] === null || typeof fila[campo] === 'string');
    if (!conForma) {
      return { ok: false, motivo: `una fila sin forma de recuento (con ${Object.keys(fila).join(', ') || 'nada'}).` };
    }
    const texto = (campo: (typeof CAMPOS_DE_TEXTO)[number]) => (typeof fila[campo] === 'string' ? (fila[campo] as string) : null);
    recuentos.push({
      jornada,
      ruta,
      evento,
      n,
      origen: texto('origen'),
      via: texto('via'),
      indexable: texto('indexable'),
      zona: texto('zona'),
      destino: texto('destino'),
      primera: texto('primera'),
      tramo: texto('tramo'),
      filtros: texto('filtros'),
      consulta: texto('consulta'),
    });
  }
  return { ok: true, valor: recuentos };
}

// ── Los descuentos ────────────────────────────────────────────────────────────────────────

/** Una pasada en producción, con los registros que se le descontaron en esta lectura. */
export interface DescuentoDePasada extends PasadaEnProduccion {
  registros: number;
}

/** La ruta como se compara: normalizada, o tal cual si `rutaNormalizada` no la admite. */
function rutaComparable(ruta: string): string {
  try {
    return rutaNormalizada(ruta);
  } catch {
    return ruta;
  }
}

/**
 * Fuera las balizas de prueba —además de en el SQL— y cada (jornada, ruta) de cada pasada que
 * escribe en producción: los registros de esas rutas en esa jornada, y ninguno más. Las rutas se
 * comparan normalizadas, con o sin barra final.
 */
export function descontar(
  recuentos: readonly Recuento[],
  pasadas: readonly PasadaEnProduccion[] = PASADAS_QUE_ESCRIBEN_EN_PRODUCCION,
): { quedan: Recuento[]; comprobacion: number; porPasada: number[] } {
  const comprobacion = rutaComparable(RUTA_DE_COMPROBACION);
  const claves = pasadas.map((pasada) => new Set(pasada.rutas.map((ruta) => `${pasada.jornada} ${rutaComparable(ruta)}`)));
  const porPasada = pasadas.map(() => 0);
  let deComprobacion = 0;
  const quedan: Recuento[] = [];
  for (const recuento of recuentos) {
    const ruta = rutaComparable(recuento.ruta);
    if (ruta === comprobacion) {
      deComprobacion += recuento.n;
      continue;
    }
    const pasada = claves.findIndex((clave) => clave.has(`${recuento.jornada} ${ruta}`));
    if (pasada >= 0) {
      porPasada[pasada] += recuento.n;
      continue;
    }
    quedan.push(recuento);
  }
  return { quedan, comprobacion: deComprobacion, porPasada };
}

// ── El censo y la superficie ──────────────────────────────────────────────────────────────

/** Las clases de lo que no está en el censo, además del nombre de una superficie de servicio o ajena. */
export const PAGINAS_2_O_MAS = 'páginas 2+';
export const YA_NO_SE_PUBLICA = 'ya no se publica';
export const SIN_SUPERFICIE_DECLARADA = 'sin superficie declarada';

/** Dónde ocurrió un registro: una superficie del censo, o la clase de lo que queda fuera. */
export type Lugar = { dentro: true; superficie: Superficie } | { dentro: false; clase: string };

/**
 * El censo de la medición — AD-13: las rutas que el sitio publica hoy (`rutasPublicadas`: la
 * portada y toda Obra, se indexe o no), normalizadas y sin el servicio por forma. Cada lectura
 * reatribuye el pasado con el censo de hoy, como la serie de tráfico.
 */
export function censoDeLaMedicion(
  rutas: Iterable<string>,
  superficies: readonly Superficie[] = SUPERFICIES,
): Set<string> {
  return new Set([...rutas].map(rutaNormalizada).filter((ruta) => !esServicioPorForma(ruta, superficies)));
}

/**
 * La superficie donde ocurrió un registro, por la declaración de `src/lib/superficies.ts` y el
 * censo, **nunca por el prefijo de la ruta**. Fuera del censo, la clase: «páginas 2+» (servicio por
 * forma), «ya no se publica» (una superficie de producto que el censo de hoy no tiene: una Cita o
 * un Autor retirados, una Obra absorbida), la de servicio o ajena por su nombre (la búsqueda, la
 * página 404) o «sin superficie declarada» (la dirección rota que sirve el 404, o una ruta que
 * `rutaNormalizada` no admite).
 */
export function lugarDe(ruta: string, censo: ReadonlySet<string>, superficies: readonly Superficie[] = SUPERFICIES): Lugar {
  let normalizada: string;
  try {
    normalizada = rutaNormalizada(ruta);
  } catch {
    return { dentro: false, clase: SIN_SUPERFICIE_DECLARADA };
  }
  const superficie = superficieDeclaradaDe(normalizada, superficies);
  if (superficie === undefined) return { dentro: false, clase: SIN_SUPERFICIE_DECLARADA };
  if (esServicioPorForma(normalizada, superficies)) return { dentro: false, clase: PAGINAS_2_O_MAS };
  if (censo.has(normalizada)) return { dentro: true, superficie };
  if (superficie.caracter === 'producto') return { dentro: false, clase: YA_NO_SE_PUBLICA };
  return { dentro: false, clase: superficie.nombre };
}

// ── Las jornadas y los tramos ─────────────────────────────────────────────────────────────

/** La jornada UTC `dias` después (o antes) de otra. */
export function desplazarJornada(jornada: string, dias: number): string {
  const instante = new Date(`${jornada}T00:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() + dias);
  return jornadaUtc(instante);
}

/** Las jornadas de `desde` a `hasta`, las dos incluidas; ninguna si `desde` va después. */
export function jornadasEntre(desde: string, hasta: string): string[] {
  const jornadas: string[] = [];
  for (let jornada = desde; jornada <= hasta; jornada = desplazarJornada(jornada, 1)) jornadas.push(jornada);
  return jornadas;
}

/** Un tramo de una serie: de `desde` —sin él, desde el principio— a `hasta`, las dos incluidas. */
export interface Tramo {
  numero: number;
  desde?: string;
  hasta: string;
}

/** Una jornada de llegada: no entra en ningún tramo, y se informa aparte con sus motivos. */
export interface Cambio {
  jornada: string;
  motivos: string[];
}

/** Una serie partida por sus cortes. */
export interface SeriePartida {
  serie: SerieDeMedicion;
  /** Los cortes que la nombran y llegaron antes de hoy, en orden. */
  cortes: CorteLlegado[];
  /** Los que la nombran con jornada de hoy o posterior: no abren tramo todavía. */
  pendientes: CorteLlegado[];
  /** Los tramos, que no se suman: el último es el vigente. */
  tramos: Tramo[];
  cambios: Cambio[];
  vigente: Tramo;
}

const enTramo = (tramo: Tramo) => (jornada: string) =>
  (tramo.desde === undefined || jornada >= tramo.desde) && jornada <= tramo.hasta;

/**
 * Parte una serie solo por los cortes que la nombran, sin suponer cuántos hay: cada tramo nuevo
 * empieza la primera jornada UTC completa tras la llegada, la jornada de llegada no entra en
 * ninguno —es un «cambió», con los motivos de todos los cortes de esa jornada— y el último tramo
 * acaba la víspera de hoy, la última jornada cerrada. Un corte de hoy o de después no abre tramo.
 */
export function partirSerie(serie: SerieDeMedicion, cortes: readonly CorteLlegado[], hoy: string): SeriePartida {
  const deLaSerie = cortes
    .filter((corte) => corte.series.includes(serie))
    .sort((a, b) => (a.jornada < b.jornada ? -1 : a.jornada > b.jornada ? 1 : 0));
  const llegados = deLaSerie.filter((corte) => corte.jornada < hoy);
  const pendientes = deLaSerie.filter((corte) => corte.jornada >= hoy);
  const jornadas = [...new Set(llegados.map((corte) => corte.jornada))];
  const cambios = jornadas.map((jornada) => ({
    jornada,
    motivos: llegados.filter((corte) => corte.jornada === jornada).map((corte) => corte.que),
  }));
  const tramos: Tramo[] = [];
  let desde: string | undefined;
  for (const jornada of jornadas) {
    tramos.push({ numero: tramos.length + 1, ...(desde === undefined ? {} : { desde }), hasta: jornadaAnterior(jornada) });
    desde = desplazarJornada(jornada, 1);
  }
  tramos.push({ numero: tramos.length + 1, ...(desde === undefined ? {} : { desde }), hasta: jornadaAnterior(hoy) });
  return { serie, cortes: llegados, pendientes, tramos, cambios, vigente: tramos[tramos.length - 1] };
}

// ── Las tasas ─────────────────────────────────────────────────────────────────────────────

/**
 * Una tasa: calculada con su numerador y su denominador, sin denominador —nunca un 0 %— o sin leer,
 * nombrando las consultas que faltan. «Por encima» es el complemento de una tasa que pasa de uno
 * —más salidas que lecturas: balizas perdidas o partidas por la medianoche UTC—, que no se calcula:
 * daría un porcentaje negativo.
 */
export type Tasa =
  | { estado: 'calculada'; numerador: number; denominador: number }
  | { estado: 'sin-denominador'; numerador: number }
  | { estado: 'sin-leer'; faltan: ConsultaDeLaLectura[] }
  | { estado: 'por-encima'; numerador: number; denominador: number };

export type Direccion = 'sube' | 'baja' | 'igual';

/** Hacia dónde va una tasa frente a su referencia; sin dirección si a alguna le falta denominador. */
export function direccionDe(tasa: Tasa, referencia: Tasa): Direccion | undefined {
  if (tasa.estado !== 'calculada' || referencia.estado !== 'calculada') return undefined;
  // Productos cruzados: sin dividir, dos tasas iguales salen iguales.
  const a = tasa.numerador * referencia.denominador;
  const b = referencia.numerador * tasa.denominador;
  return a > b ? 'sube' : a < b ? 'baja' : 'igual';
}

// ── Las ventanas: qué se juzga así ────────────────────────────────────────────────────────

/**
 * La unidad de las búsquedas, que no es una superficie: SM-6 y SM-13 se cierran con búsquedas
 * asentadas. Ninguna superficie puede declararla como su `lineaBase`: sus lecturas se medirían con
 * las búsquedas (lo juzgan `problemasDeLaLectura` y `tests/unit/superficies.test.ts`).
 */
export const UNIDAD_DE_LAS_BUSQUEDAS = 'las búsquedas';

/** La superficie que emite la vista de Cita, de la declaración. */
const paginaDeCitaEn = (superficies: readonly Superficie[]) =>
  superficies.find((superficie) => superficie.vista === EVENTOS.vistaDeCita);

/** La portada, de la declaración. */
const portadaEn = (superficies: readonly Superficie[]) => superficieDeclaradaDe('/', superficies);

/**
 * La unidad de una superficie que la lectura necesita. Sin ella, un rótulo que ninguna superficie
 * declara, nunca un error al cargar el módulo: `tools/medicion.ts` lo importa para todos sus
 * subcomandos, y `problemasDeLaLectura` nombra la que falta antes de leer nada.
 */
function unidadDeclarada(superficie: Superficie | undefined, que: string): string {
  return superficie === undefined ? `(sin declarar: ${que})` : superficieDeLineaBase(superficie);
}

/** La unidad de línea base de la Página de Cita, de su declaración: la que emite la vista de Cita. */
export const unidadDeLaPaginaDeCita = (superficies: readonly Superficie[] = SUPERFICIES) =>
  unidadDeclarada(paginaDeCitaEn(superficies), 'la vista de Cita');

/** La de la portada, de su declaración. */
export const unidadDeLaPortada = (superficies: readonly Superficie[] = SUPERFICIES) =>
  unidadDeclarada(portadaEn(superficies), 'la portada');

export const UNIDAD_DE_LA_PAGINA_DE_CITA = unidadDeLaPaginaDeCita();
export const UNIDAD_DE_LA_PORTADA = unidadDeLaPortada();

/** Una tasa que una ventana juzga: SM-5, SM-7, la continuación, la de cada zona, SM-6 o SM-13. */
export type TasaDeJuicio = 'sm5' | 'sm7' | 'continuacion' | 'continuacion-por-zona' | 'sm6' | 'sm13';

/** Una tasa que se juzga por ventanas «contra su propia serie», con la llegada que la mueve. */
export interface JuicioPorVentanas {
  nombre: string;
  /** La unidad de línea base que acumula el mínimo de cada ventana. */
  unidad: string;
  /** La jornada en que llegó en vivo lo que se juzga, de su constante; `undefined` mientras no la tenga. */
  llegada: string | undefined;
  /** De dónde sale la llegada: su constante, o la historia que la dará. */
  deDondeLlega: string;
  tasas: readonly TasaDeJuicio[];
  /** La señal compuesta: una tasa que sube mientras otra baja. */
  senal?: { sube: TasaDeJuicio; baja: TasaDeJuicio };
  /** Lo que se dice mientras ninguna superficie declare la unidad. */
  sinUnidad?: string;
  /**
   * La llegada es la que **hace medible** la unidad (los Directorios, que no existen antes de la
   * 26): su línea base empieza la primera jornada UTC completa tras ella —sin la llegada, «no ha
   * empezado»—, y las ventanas se juzgan frente a esa línea base, nunca frente a una serie de antes
   * que no puede tener lecturas.
   */
  haceMedible?: true;
}

/**
 * Las tasas que una historia de cierre juzga por ventanas, frente a su línea base o a su serie de
 * antes, con las unidades de la declaración de superficies que se le dé. **Una tasa nueva que se
 * juzgue así entra aquí por su historia**, con su llegada: una llegada sin constante todavía es
 * `undefined`, y su historia la enchufa. `JUICIOS_POR_VENTANAS` es la tabla con la declaración de
 * `src/lib/superficies.ts`.
 */
export const juiciosPorVentanas = (superficies: readonly Superficie[] = SUPERFICIES): readonly JuicioPorVentanas[] => [
  {
    nombre: 'SM-C3',
    unidad: unidadDeLaPaginaDeCita(superficies),
    llegada: undefined,
    deDondeLlega: 'sin constante todavía: la da la Épica 25',
    tasas: ['sm7', 'sm5'],
    senal: { sube: 'sm7', baja: 'sm5' },
  },
  {
    nombre: 'SM-C5',
    unidad: unidadDeLaPaginaDeCita(superficies),
    llegada: DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS,
    deDondeLlega: 'DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS',
    tasas: ['continuacion', 'sm5'],
    senal: { sube: 'continuacion', baja: 'sm5' },
  },
  {
    nombre: 'la continuación de los Directorios',
    unidad: LINEA_BASE_DE_LOS_DIRECTORIOS,
    llegada: DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS,
    deDondeLlega: 'DESPLIEGUE_DE_OBRA_Y_DIRECTORIOS',
    tasas: ['continuacion'],
    sinUnidad: 'sin lecturas: los Directorios entran con la 26',
    haceMedible: true,
  },
  {
    nombre: 'la continuación de la portada por zona',
    unidad: unidadDeLaPortada(superficies),
    llegada: DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO,
    deDondeLlega: 'DESPLIEGUE_DE_LA_PORTADA_DE_RETORNO',
    tasas: ['continuacion-por-zona'],
  },
  {
    nombre: 'SM-6',
    unidad: UNIDAD_DE_LAS_BUSQUEDAS,
    llegada: DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS,
    deDondeLlega: 'DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS',
    tasas: ['sm6'],
  },
  {
    nombre: 'SM-13',
    unidad: UNIDAD_DE_LAS_BUSQUEDAS,
    llegada: DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS,
    deDondeLlega: 'DESPLIEGUE_DE_LA_BUSQUEDA_CON_FILTROS',
    tasas: ['sm13'],
  },
];

export const JUICIOS_POR_VENTANAS: readonly JuicioPorVentanas[] = juiciosPorVentanas();

// ── Lo que sale ───────────────────────────────────────────────────────────────────────────

/** Lo que entra en la composición: lo que trajo `leer`, con el censo ya sacado del Corpus. */
export interface EntradaDeLaLectura {
  hoy: string;
  /** Las rutas que el sitio publica hoy (`rutasPublicadas`). */
  censo: Iterable<string>;
  consultas: { readonly [C in ConsultaDeLaLectura]: Filas };
  cuota: CuotaLeida;
  /** Lo que la lectura gastó de la cuota de lectura: estimación y medida (Historia 23.13). */
  gasto: GastoDeLaLectura;
}

/** Los valores de `src/lib/umbrales.ts` y la declaración de superficies, que las pruebas cambian. */
export interface OpcionesDeLaLectura {
  superficies?: readonly Superficie[];
  cortes?: readonly CorteLlegado[];
  pasadas?: readonly PasadaEnProduccion[];
  /** `MIN_LECTURAS_DE_LINEA_BASE`; se distingue un `undefined` pasado a propósito de no pasarlo. */
  minimo?: number | undefined;
  conFacebook?: boolean;
  minRutasEnRafaga?: number;
  juicios?: readonly JuicioPorVentanas[];
}

/** Las cifras de una superficie del censo en el tramo vigente de la lectura. */
export interface CifrasDeSuperficie {
  nombre: string;
  unidad: string;
  /** Vistas de una carga: máx(vista de Cita + vista de superficie, vista de Obra) por ruta, jornada y origen. */
  vistas?: number;
  lecturas?: number;
  salidas?: number;
  /** Todas sus acciones, sin mirar `primera` ni destino: todo registro se reparte, también estos. */
  acciones?: number;
  continuacion: Tasa;
  porZona: { zona: string; continuacion: Tasa }[];
}

/** Las cifras de una unidad de línea base que junta más de una superficie. */
export interface CifrasDeUnidad {
  unidad: string;
  superficies: string[];
  lecturas?: number;
  continuacion: Tasa;
}

/** Lo que no está en el censo, por clase y evento. */
export interface FueraDelCenso {
  clase: string;
  porEvento: { evento: string; n: number }[];
}

/** Las tasas de acción de una superficie: las de la Página de Cita se llaman SM-5 y SM-7. */
export interface TasasDeAccion {
  lecturas?: number;
  conAccion: Tasa;
  conComparticion: Tasa;
  continuacion: Tasa;
  /** 1 − la continuación. */
  sinContinuacion: Tasa;
}

export type MarcaDeLaJornada = 'indexable' | 'no indexable' | 'nula' | 'cambió' | 'sin marca';
export const MARCAS_DE_LA_JORNADA: readonly MarcaDeLaJornada[] = ['indexable', 'no indexable', 'cambió', 'nula', 'sin marca'];

/** Las cifras de la Obra con una marca, en el tramo vigente de la lectura. */
export interface CifrasDeObra {
  marca: MarcaDeLaJornada;
  vistasDeObra?: number;
  lecturas?: number;
  salidas?: number;
  acciones?: number;
  continuacion: Tasa;
}

/** SM-8 en un tramo o en una jornada de llegada: vistas por red y evento. */
export interface TramoDeSm8 {
  tramo?: Tramo;
  cambio?: Cambio;
  porRed: { red: string; porEvento: { evento: string; n: number }[] }[];
}

/** SM-12 de un destino. */
export interface DestinoDeSm12 {
  destino: string;
  tasa: Tasa;
  /** Fuera de la comparación entre destinos, y por qué. */
  fuera?: string;
}

export interface Busquedas {
  asentadas?: number;
  porTramo: { tramo: string; n: number }[];
  porFiltros: { filtros: string; n: number }[];
  sm6: Tasa;
  sm13: Tasa;
  /** Las consultas sin resultados, por recuento; `undefined` si no se leyeron. */
  sinResultados?: { consulta: string; n: number }[];
}

/** La comparación de una firma mecánica con el resto de pares (ruta, jornada) de la unidad. */
export interface Firma {
  firma: 'Threads' | 'ráfaga';
  aplica: boolean;
  pares: number;
  lecturas: number;
  vistas: number;
  restoPares: number;
  restoLecturas: number;
  restoVistas: number;
  /** Las jornadas de ráfaga. */
  jornadas?: string[];
}

export interface LineaBase {
  unidad: string;
  serie: 'lectura' | 'busqueda';
  superficies: string[];
  estado: 'sin-leer' | 'no-ha-empezado' | 'sin-minimo' | 'abierta' | 'cerrada';
  faltan?: ConsultaDeLaLectura[];
  /** La constante de la llegada que la hace medible y que aún no llegó (`haceMedible`). */
  esperando?: string;
  desde?: string;
  acumulado?: number;
  minimo?: number;
  cerradaEl?: string;
  /** Jornadas de llegada de sus juicios dentro del tramo: «cambió», no cuentan. */
  saltadas: string[];
  /** Las jornadas que cuenta. */
  jornadas: string[];
  firmas?: Firma[];
}

export interface Ventana {
  desde: string;
  hasta: string;
  acumulado: number;
  tasas: { tasa: string; valor: Tasa; direccion?: Direccion }[];
  /** «sin dirección»: a una de las dos tasas de la señal le falta dirección; no es «no se da». */
  senal?: 'se da' | 'salta' | 'no se da' | 'sin dirección';
  /**
   * La llegada de lo que se juzga, si la ventana acaba antes de ella: la línea base se cerró antes
   * de que llegara, y esa ventana no juzga lo que llega.
   */
  antesDeLaLlegada?: string;
}

/** Un bloque que un cambio cortó antes de reunir el mínimo: no se juzga, y se nombra. */
export interface VentanaCortada {
  desde: string;
  hasta: string;
  acumulado: number;
  /** La jornada de llegada que la cortó. */
  por: string;
}

export interface JuicioLeido {
  juicio: JuicioPorVentanas;
  /** Por qué no hay ventanas, si no las hay. */
  sinVentanas?: string;
  referencia?: 'linea-base' | 'serie-de-antes';
  referencias: { tasa: string; valor: Tasa }[];
  /** Lo que reúne la serie de antes en su unidad: puede quedar por debajo del mínimo, y se dice. */
  referenciaAcumulada?: number;
  ventanas: Ventana[];
  /** Los bloques que una llegada cortó sin el mínimo: ninguna ventana junta días de los dos lados. */
  cortadas: VentanaCortada[];
  enCurso?: { desde: string; acumulado: number };
}

export interface LecturaDeMedicion {
  hoy: string;
  /** Lo que no se leyó, con su motivo: consultas y cifras de `d1 info`. */
  sinLeer: { que: string; motivo: string }[];
  cuota: CuotaLeida;
  gasto: GastoDeLaLectura;
  descuentos: { comprobacion: number; pasadas: DescuentoDePasada[]; incompletos: ConsultaDeLaLectura[] };
  series: { readonly [S in SerieDeMedicion]: SeriePartida };
  sm8: { tramos: TramoDeSm8[] } | { faltan: ConsultaDeLaLectura[] };
  superficies: CifrasDeSuperficie[];
  unidades: CifrasDeUnidad[];
  fueraDelCenso: FueraDelCenso[];
  /** Las consultas que no se leyeron y faltan en lo de fuera del censo. */
  fueraDelCensoSinLeer: ConsultaDeLaLectura[];
  obra: CifrasDeObra[] | { faltan: ConsultaDeLaLectura[] };
  cita?: TasasDeAccion;
  portada?: TasasDeAccion;
  obraTasas?: TasasDeAccion;
  sm12: { destinos: DestinoDeSm12[]; imagenCuadrada?: number } | { faltan: ConsultaDeLaLectura[] };
  busquedas: Busquedas;
  minimo?: number;
  lineasBase: LineaBase[];
  juicios: JuicioLeido[];
}

// ── La composición ────────────────────────────────────────────────────────────────────────

const VISTAS_DE_CARGA = [EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie] as const;
const [PRIMERA_SI] = PRIMERA;
const [MARCA_INDEXABLE, MARCA_NO_INDEXABLE] = MARCAS_DE_OBRA;
const [TRAMO_SIN_RESULTADOS] = TRAMOS;
const ZONA_DE_RESULTADO: Zona = 'resultado';
const THREADS: Red = 'threads';
const FACEBOOK: Red = 'facebook';
const ACCIONES_DE_SM5: readonly string[] = [EVENTOS.copiado, EVENTOS.descargaDeImagen];
const COMPARTICIONES: readonly string[] = [EVENTOS.comparticionDeEnlace, EVENTOS.comparticionDeImagen];

const sumar = (recuentos: readonly Recuento[] | undefined, filtro: (r: Recuento) => boolean): number | undefined =>
  recuentos === undefined ? undefined : recuentos.reduce((total, r) => (filtro(r) ? total + r.n : total), 0);

/**
 * Las vistas de una carga, por (ruta, jornada, origen): máx(vista de Cita + vista de superficie,
 * vista de Obra). La Obra indexable emite dos vistas por carga —la de superficie y la de Obra— y
 * contar eventos la contaría dos veces; así sale una por carga en toda superficie.
 */
function vistasDeCargaPorPar(recuentos: readonly Recuento[], filtro: (r: Recuento) => boolean) {
  const porClave = new Map<string, { ruta: string; jornada: string; origen: string | null; carga: number; obra: number }>();
  for (const r of recuentos) {
    if (!filtro(r)) continue;
    const esDeCarga = (VISTAS_DE_CARGA as readonly string[]).includes(r.evento);
    if (!esDeCarga && r.evento !== EVENTOS.vistaDeObra) continue;
    const ruta = rutaComparable(r.ruta);
    const clave = `${r.jornada} ${ruta} ${r.origen ?? ''}`;
    const actual = porClave.get(clave) ?? { ruta, jornada: r.jornada, origen: r.origen, carga: 0, obra: 0 };
    if (esDeCarga) actual.carga += r.n;
    else actual.obra += r.n;
    porClave.set(clave, actual);
  }
  return [...porClave.values()].map((v) => ({ ...v, vistas: Math.max(v.carga, v.obra) }));
}

function tasaDe(numerador: number | undefined, denominador: number | undefined, faltan: ConsultaDeLaLectura[]): Tasa {
  if (numerador === undefined || denominador === undefined) return { estado: 'sin-leer', faltan };
  if (denominador === 0) return { estado: 'sin-denominador', numerador };
  return { estado: 'calculada', numerador, denominador };
}

/**
 * 1 − una tasa, con el mismo denominador. De una que pasa de uno no se calcula: el porcentaje
 * saldría negativo, y se dice por qué.
 */
function complemento(tasa: Tasa): Tasa {
  if (tasa.estado !== 'calculada') return tasa;
  if (tasa.numerador > tasa.denominador) return { ...tasa, estado: 'por-encima' };
  return { ...tasa, numerador: tasa.denominador - tasa.numerador };
}

const ordenarPorClave = <T>(mapa: Map<string, T>, orden: readonly string[] = []): [string, T][] =>
  [...mapa].sort(([a], [b]) => {
    const ia = orden.indexOf(a);
    const ib = orden.indexOf(b);
    if (ia !== ib) return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    return a < b ? -1 : a > b ? 1 : 0;
  });

/** Una jornada AAAA-MM-DD que existe en el calendario: «2026-11-3» o «2026-02-30» no lo son. */
export function esJornadaReal(jornada: unknown): jornada is string {
  if (typeof jornada !== 'string' || !FORMA_DE_JORNADA.test(jornada)) return false;
  const instante = new Date(`${jornada}T00:00:00Z`);
  return !Number.isNaN(instante.getTime()) && jornadaUtc(instante) === jornada;
}

/** Los valores con que se compone la lectura: los de las opciones, o los del repositorio. */
export interface ValoresDeLaLectura {
  superficies: readonly Superficie[];
  cortes: readonly CorteLlegado[];
  pasadas: readonly PasadaEnProduccion[];
  minimo: number | undefined;
  conFacebook: boolean;
  minRutasEnRafaga: number;
  juicios: readonly JuicioPorVentanas[];
}

/**
 * Las opciones resueltas: lo que no se pasa sale de `src/lib/umbrales.ts` y de la declaración de
 * superficies, y la tabla de juicios, de las superficies que se den.
 */
export function valoresDeLaLectura(opciones: OpcionesDeLaLectura = {}): ValoresDeLaLectura {
  const superficies = opciones.superficies ?? SUPERFICIES;
  return {
    superficies,
    cortes: opciones.cortes ?? CORTES_DE_SERIE,
    pasadas: opciones.pasadas ?? PASADAS_QUE_ESCRIBEN_EN_PRODUCCION,
    minimo: 'minimo' in opciones ? opciones.minimo : MIN_LECTURAS_DE_LINEA_BASE,
    conFacebook: opciones.conFacebook ?? SM12_CON_FACEBOOK,
    minRutasEnRafaga: opciones.minRutasEnRafaga ?? MIN_RUTAS_DE_CITA_EN_RAFAGA,
    juicios: opciones.juicios ?? juiciosPorVentanas(superficies),
  };
}

/**
 * Lo que una persona escribe a mano y la lectura lee —los cortes, las pasadas, el mínimo, el umbral
 * de la ráfaga, las llegadas de los juicios— y la declaración de superficies, juzgado antes de
 * usarlo. Las jornadas se comparan como texto, así que una mal escrita no fallaría: no descontaría
 * nada o partiría la serie el día equivocado, en silencio. Devuelve cada problema, nombrando la
 * constante. Es puro: la cáscara lo pregunta **antes de leer nada de D1**, para no gastar cinco
 * recorridos de la tabla en una lectura que no se va a componer.
 */
export function problemasDeLaLectura(valores: Omit<ValoresDeLaLectura, 'conFacebook'>): string[] {
  const problemas: string[] = [];
  const noEsJornada = (jornada: unknown) => `«${String(jornada)}» no es una jornada AAAA-MM-DD que exista`;
  for (const corte of valores.cortes) {
    if (!esJornadaReal(corte.jornada)) problemas.push(`CORTES_DE_SERIE, «${corte.que}»: ${noEsJornada(corte.jornada)}.`);
    if (corte.series.length === 0) problemas.push(`CORTES_DE_SERIE, «${corte.que}»: no nombra ninguna serie.`);
  }
  for (const pasada of valores.pasadas) {
    const cual = `PASADAS_QUE_ESCRIBEN_EN_PRODUCCION, la ${pasada.pasada || '(sin nombre)'}`;
    if (pasada.pasada.trim() === '') problemas.push(`${cual}: no dice qué pasada es.`);
    if (!esJornadaReal(pasada.jornada)) problemas.push(`${cual}: ${noEsJornada(pasada.jornada)}.`);
    if (pasada.rutas.length === 0) problemas.push(`${cual}: no nombra ninguna ruta, así que no descontaría nada.`);
    for (const ruta of pasada.rutas) {
      // Como la guarda el receptor: un camino sin `?…` ni `#…` que alguna superficie declara. Otra
      // cosa no casaría con ningún registro, y su pasada contaría como visitas sin decirlo.
      let declarada = false;
      try {
        declarada = !/[?#]/.test(ruta) && superficieDeclaradaDe(ruta, valores.superficies) !== undefined;
      } catch {
        declarada = false;
      }
      if (!declarada) problemas.push(`${cual}: «${ruta}» no es una ruta del sitio.`);
    }
  }
  if (valores.minimo !== undefined && !(Number.isInteger(valores.minimo) && valores.minimo > 0)) {
    problemas.push(`MIN_LECTURAS_DE_LINEA_BASE: «${valores.minimo}» no es un entero positivo.`);
  }
  if (!(Number.isInteger(valores.minRutasEnRafaga) && valores.minRutasEnRafaga > 0)) {
    problemas.push(`MIN_RUTAS_DE_CITA_EN_RAFAGA: «${valores.minRutasEnRafaga}» no es un entero positivo.`);
  }
  if (paginaDeCitaEn(valores.superficies) === undefined) {
    problemas.push('src/lib/superficies.ts no declara ninguna superficie que emita la vista de Cita: la lectura no sabe cuál es la Página de Cita.');
  }
  if (portadaEn(valores.superficies) === undefined) {
    problemas.push('src/lib/superficies.ts no declara la portada (/): la lectura no sabe cuál es su unidad.');
  }
  for (const juicio of valores.juicios) {
    if (juicio.llegada !== undefined && !esJornadaReal(juicio.llegada)) {
      problemas.push(`${juicio.deDondeLlega} (la llegada de ${juicio.nombre}): ${noEsJornada(juicio.llegada)}.`);
    }
  }
  for (const superficie of valores.superficies) {
    if (superficieDeLineaBase(superficie) === UNIDAD_DE_LAS_BUSQUEDAS) {
      problemas.push(
        `src/lib/superficies.ts, ${superficie.nombre}: su línea base se llama «${UNIDAD_DE_LAS_BUSQUEDAS}», la de las búsquedas.`,
      );
    }
  }
  return problemas;
}

/**
 * El informe de la lectura, como datos: lo que dice `lineasDeLecturaDeMedicion`. No escribe nada y
 * no lee nada que no reciba. Lanza, nombrando cada uno, si un valor escrito a mano no se sostiene
 * (`problemasDeLaLectura`): una cifra calculada sobre una jornada mal escrita sería peor que ninguna.
 */
export function componerLecturaDeMedicion(
  entrada: EntradaDeLaLectura,
  opciones: OpcionesDeLaLectura = {},
): LecturaDeMedicion {
  const valores = valoresDeLaLectura(opciones);
  const { superficies, cortes, pasadas, minimo, conFacebook, minRutasEnRafaga, juicios } = valores;
  const { hoy } = entrada;
  if (!esJornadaReal(hoy)) throw new Error(`«${hoy}» no es una jornada AAAA-MM-DD.`);
  const problemas = problemasDeLaLectura(valores);
  if (problemas.length > 0) {
    throw new Error(
      ['Lo que la lectura lee de src/lib/umbrales.ts y src/lib/superficies.ts no se sostiene:', ...problemas.map((p) => `  ${p}`)].join(
        '\n',
      ),
    );
  }

  // Lo leído, descontado.
  const sinLeer: { que: string; motivo: string }[] = [];
  const datos: { [C in ConsultaDeLaLectura]?: Recuento[] } = {};
  let comprobacion = 0;
  const porPasada = pasadas.map(() => 0);
  for (const nombre of CONSULTAS_DE_LA_LECTURA) {
    const filas = entrada.consultas[nombre];
    if (!filas.ok) {
      sinLeer.push({ que: QUE_LEE[nombre], motivo: filas.motivo });
      continue;
    }
    const leidos = recuentosDe(nombre, filas.filas);
    if (!leidos.ok) {
      sinLeer.push({ que: QUE_LEE[nombre], motivo: leidos.motivo });
      continue;
    }
    const descontado = descontar(leidos.valor, pasadas);
    comprobacion += descontado.comprobacion;
    descontado.porPasada.forEach((n, i) => (porPasada[i] += n));
    datos[nombre] = descontado.quedan;
  }
  if (!entrada.cuota.escritas.ok) sinLeer.push({ que: 'las filas escritas en 24 h (d1 info)', motivo: entrada.cuota.escritas.motivo });
  if (!entrada.cuota.tamaño.ok) sinLeer.push({ que: 'el tamaño de la base (d1 info)', motivo: entrada.cuota.tamaño.motivo });
  const faltan = (...necesarias: ConsultaDeLaLectura[]) => necesarias.filter((nombre) => datos[nombre] === undefined);

  // El censo y la superficie de cada ruta, una vez cada una.
  const censo = censoDeLaMedicion(entrada.censo, superficies);
  const lugares = new Map<string, Lugar>();
  const lugar = (ruta: string) => {
    let visto = lugares.get(ruta);
    if (visto === undefined) {
      visto = lugarDe(ruta, censo, superficies);
      lugares.set(ruta, visto);
    }
    return visto;
  };
  const superficieDe = (r: Recuento) => {
    const l = lugar(r.ruta);
    return l.dentro ? l.superficie : undefined;
  };
  const deUnidad = (unidad: string) => (r: Recuento) => {
    const s = superficieDe(r);
    return s !== undefined && superficieDeLineaBase(s) === unidad;
  };
  const deSuperficie = (nombre: string) => (r: Recuento) => superficieDe(r)?.nombre === nombre;
  const esDeObra = (r: Recuento) => superficieDe(r)?.vistaConMarca !== undefined;

  // Las series.
  const series = {
    sm8: partirSerie('sm8', cortes, hoy),
    lectura: partirSerie('lectura', cortes, hoy),
    busqueda: partirSerie('busqueda', cortes, hoy),
  } as const;
  const enLectura = enTramo(series.lectura.vigente);
  const enBusqueda = enTramo(series.busqueda.vigente);
  const conJornada =
    (enPeriodo: (jornada: string) => boolean, filtro: (r: Recuento) => boolean = () => true) =>
    (r: Recuento) =>
      enPeriodo(r.jornada) && filtro(r);

  const { vistasYLecturas, salidas, acciones, busquedas, sinResultados } = datos;
  const esLectura = (r: Recuento) => r.evento === EVENTOS.lectura;

  // SM-8: las vistas de Cita y de superficie con marca de origen, de toda ruta, por tramo.
  let sm8: LecturaDeMedicion['sm8'];
  if (vistasYLecturas === undefined) {
    sm8 = { faltan: ['vistasYLecturas'] };
  } else {
    const deSm8 = vistasYLecturas.filter(
      (r) => (VISTAS_DE_CARGA as readonly string[]).includes(r.evento) && r.origen !== null,
    );
    const porRed = (enPeriodo: (jornada: string) => boolean) => {
      const redes = new Map<string, Map<string, number>>();
      for (const r of deSm8) {
        if (!enPeriodo(r.jornada)) continue;
        const red = redes.get(r.origen!) ?? new Map<string, number>();
        red.set(r.evento, (red.get(r.evento) ?? 0) + r.n);
        redes.set(r.origen!, red);
      }
      return ordenarPorClave(redes, REDES_VALIDAS).map(([red, eventos]) => ({
        red,
        porEvento: ordenarPorClave(eventos, VISTAS_DE_CARGA).map(([evento, n]) => ({ evento, n })),
      }));
    };
    const tramos: TramoDeSm8[] = [];
    series.sm8.tramos.forEach((tramo, i) => {
      tramos.push({ tramo, porRed: porRed(enTramo(tramo)) });
      const cambio = series.sm8.cambios[i];
      if (cambio !== undefined) tramos.push({ cambio, porRed: porRed((jornada) => jornada === cambio.jornada) });
    });
    sm8 = { tramos };
  }

  // Las superficies del censo, en el tramo vigente de la lectura.
  const zonasDe = (filtro: (r: Recuento) => boolean) => {
    const zonas = new Map<string, number>();
    for (const r of salidas ?? []) if (filtro(r) && r.zona !== null) zonas.set(r.zona, (zonas.get(r.zona) ?? 0) + r.n);
    return zonas;
  };
  // Solo las superficies con lectura —las que declaran una vista—: en las demás no hay continuación
  // que medir. Todas se informan, también a cero.
  const conLectura = (s: Superficie) => s.vista !== undefined || s.vistaConMarca !== undefined;
  const cifrasDeSuperficies: CifrasDeSuperficie[] = superficies.filter(conLectura).map((superficie) => {
    const filtro = conJornada(enLectura, deSuperficie(superficie.nombre));
    const lecturas = sumar(vistasYLecturas, (r) => esLectura(r) && filtro(r));
    const deSalidas = sumar(salidas, filtro);
    const deAcciones = sumar(acciones, filtro);
    return {
      nombre: superficie.nombre,
      unidad: superficieDeLineaBase(superficie),
      ...(vistasYLecturas === undefined
        ? {}
        : { vistas: vistasDeCargaPorPar(vistasYLecturas, filtro).reduce((total, par) => total + par.vistas, 0) }),
      ...(lecturas === undefined ? {} : { lecturas }),
      ...(deSalidas === undefined ? {} : { salidas: deSalidas }),
      ...(deAcciones === undefined ? {} : { acciones: deAcciones }),
      continuacion: tasaDe(deSalidas, lecturas, faltan('salidas', 'vistasYLecturas')),
      porZona: ordenarPorClave(zonasDe(filtro)).map(([zona, n]) => ({
        zona,
        continuacion: tasaDe(n, lecturas, faltan('vistasYLecturas')),
      })),
    };
  });
  const unidades: CifrasDeUnidad[] = [];
  for (const unidad of new Set(superficies.filter(conLectura).map(superficieDeLineaBase))) {
    const suyas = superficies.filter((s) => conLectura(s) && superficieDeLineaBase(s) === unidad);
    if (suyas.length < 2) continue;
    const filtro = conJornada(enLectura, deUnidad(unidad));
    const lecturas = sumar(vistasYLecturas, (r) => esLectura(r) && filtro(r));
    unidades.push({
      unidad,
      superficies: suyas.map((s) => s.nombre),
      ...(lecturas === undefined ? {} : { lecturas }),
      continuacion: tasaDe(sumar(salidas, filtro), lecturas, faltan('salidas', 'vistasYLecturas')),
    });
  }

  // Lo que no está en el censo, por clase y evento: en el tramo vigente de la lectura, y las
  // búsquedas en el de la búsqueda.
  const fuera = new Map<string, Map<string, number>>();
  for (const nombre of CONSULTAS_DE_LA_LECTURA) {
    const enPeriodo = nombre === 'busquedas' || nombre === 'sinResultados' ? enBusqueda : enLectura;
    for (const r of datos[nombre] ?? []) {
      if (!enPeriodo(r.jornada)) continue;
      const l = lugar(r.ruta);
      if (l.dentro) continue;
      const clase = fuera.get(l.clase) ?? new Map<string, number>();
      clase.set(r.evento, (clase.get(r.evento) ?? 0) + r.n);
      fuera.set(l.clase, clase);
    }
  }
  const fueraDelCenso: FueraDelCenso[] = ordenarPorClave(fuera, [PAGINAS_2_O_MAS, YA_NO_SE_PUBLICA]).map(
    ([clase, eventos]) => ({ clase, porEvento: ordenarPorClave(eventos).map(([evento, n]) => ({ evento, n })) }),
  );

  // La Obra, por la marca de sus vistas de Obra de cada jornada.
  let obra: LecturaDeMedicion['obra'];
  const marcaDe = new Map<string, Set<string | null>>();
  if (vistasYLecturas !== undefined) {
    for (const r of vistasYLecturas) {
      if (r.evento !== EVENTOS.vistaDeObra || r.n === 0 || !esDeObra(r)) continue;
      const clave = `${r.jornada} ${rutaComparable(r.ruta)}`;
      const marcas = marcaDe.get(clave) ?? new Set<string | null>();
      marcas.add(r.indexable === MARCA_INDEXABLE || r.indexable === MARCA_NO_INDEXABLE ? r.indexable : null);
      marcaDe.set(clave, marcas);
    }
  }
  const marcaDeLaJornada = (r: Recuento): MarcaDeLaJornada => {
    const marcas = marcaDe.get(`${r.jornada} ${rutaComparable(r.ruta)}`);
    if (marcas === undefined || marcas.size === 0) return 'sin marca';
    if (marcas.size > 1) return 'cambió';
    const [marca] = marcas;
    return marca === MARCA_INDEXABLE ? 'indexable' : marca === MARCA_NO_INDEXABLE ? 'no indexable' : 'nula';
  };
  if (vistasYLecturas === undefined) {
    obra = { faltan: ['vistasYLecturas'] };
  } else {
    obra = MARCAS_DE_LA_JORNADA.map((marca) => {
      const filtro = conJornada(enLectura, (r) => esDeObra(r) && marcaDeLaJornada(r) === marca);
      const lecturas = sumar(vistasYLecturas, (r) => esLectura(r) && filtro(r));
      const deSalidas = sumar(salidas, filtro);
      const deAcciones = sumar(acciones, filtro);
      return {
        marca,
        vistasDeObra: sumar(vistasYLecturas, (r) => r.evento === EVENTOS.vistaDeObra && filtro(r)),
        ...(lecturas === undefined ? {} : { lecturas }),
        ...(deSalidas === undefined ? {} : { salidas: deSalidas }),
        ...(deAcciones === undefined ? {} : { acciones: deAcciones }),
        continuacion: tasaDe(deSalidas, lecturas, faltan('salidas')),
      };
    });
  }

  // Las tasas de acción de una superficie, en unas jornadas.
  const tasasDeAccion = (filtroDeLugar: (r: Recuento) => boolean, enPeriodo: (jornada: string) => boolean): TasasDeAccion => {
    const filtro = conJornada(enPeriodo, filtroDeLugar);
    const lecturas = sumar(vistasYLecturas, (r) => esLectura(r) && filtro(r));
    // SM-5: el copiado y la descarga **sin destino** —la elegida—: la que impone el navegador
    // llega con destino y no es una lectura con acción.
    const conAccion = sumar(
      acciones,
      (r) => ACCIONES_DE_SM5.includes(r.evento) && r.primera === PRIMERA_SI && r.destino === null && filtro(r),
    );
    const conComparticion = sumar(acciones, (r) => COMPARTICIONES.includes(r.evento) && r.primera === PRIMERA_SI && filtro(r));
    const continuacion = tasaDe(sumar(salidas, filtro), lecturas, faltan('salidas', 'vistasYLecturas'));
    return {
      ...(lecturas === undefined ? {} : { lecturas }),
      conAccion: tasaDe(conAccion, lecturas, faltan('acciones', 'vistasYLecturas')),
      conComparticion: tasaDe(conComparticion, lecturas, faltan('acciones', 'vistasYLecturas')),
      continuacion,
      sinContinuacion: complemento(continuacion),
    };
  };
  const unidadesConCita = superficies.filter((s) => s.vista === EVENTOS.vistaDeCita);
  const portadaDeclarada = superficieDeclaradaDe('/', superficies);
  const deLasCitas = (r: Recuento) => {
    const s = superficieDe(r);
    return s !== undefined && s.vista === EVENTOS.vistaDeCita;
  };
  const cita = unidadesConCita.length > 0 ? tasasDeAccion(deLasCitas, enLectura) : undefined;
  const portada = portadaDeclarada ? tasasDeAccion(deSuperficie(portadaDeclarada.nombre), enLectura) : undefined;
  const obraTasas = superficies.some((s) => s.vistaConMarca !== undefined) ? tasasDeAccion(esDeObra, enLectura) : undefined;

  // SM-12: lecturas con `via` = D entre las comparticiones con destino D, de toda ruta.
  let sm12: LecturaDeMedicion['sm12'];
  const faltanSm12 = faltan('vistasYLecturas', 'acciones');
  if (faltanSm12.length > 0) {
    sm12 = { faltan: faltanSm12 };
  } else {
    const destinos: DestinoDeSm12[] = DESTINOS_VALIDOS.map((destino) => {
      const numerador = sumar(vistasYLecturas, (r) => esLectura(r) && r.via === destino && enLectura(r.jornada));
      const denominador = sumar(acciones, (r) => {
        if (!enLectura(r.jornada) || r.destino !== destino) return false;
        if (r.evento === EVENTOS.comparticionDeEnlace) return true;
        // La Imagen cuadrada se informa aparte: su `opaco` no es la hoja de «Más opciones…».
        if (r.evento === EVENTOS.comparticionDeImagen) return destino !== DESTINO_OPACO;
        // Las descargas impuestas cuentan en el botón de la Historia, nunca en el `opaco`.
        return r.evento === EVENTOS.descargaDeImagen && destino === DESTINO_DE_IMAGEN;
      });
      const tasa = tasaDe(numerador, denominador, []);
      return destino === FACEBOOK && !conFacebook
        ? {
            destino,
            tasa,
            fuera:
              'fuera de la comparación mientras SM12_CON_FACEBOOK esté apagada: no consta todavía que ?via= ' +
              'sobreviva al clic en la tarjeta de Facebook (25.7)',
          }
        : { destino, tasa };
    });
    sm12 = {
      destinos,
      imagenCuadrada: sumar(
        acciones,
        (r) => r.evento === EVENTOS.comparticionDeImagen && r.destino === DESTINO_OPACO && enLectura(r.jornada),
      ),
    };
  }

  // Las búsquedas, en el tramo vigente de la búsqueda.
  const asentadasEn = (enPeriodo: (jornada: string) => boolean, filtro: (r: Recuento) => boolean = () => true) =>
    sumar(busquedas, (r) => enPeriodo(r.jornada) && filtro(r));
  const clavesConBusqueda = (enPeriodo: (jornada: string) => boolean) => {
    const claves = new Set<string>();
    for (const r of busquedas ?? []) {
      if (!enPeriodo(r.jornada) || r.n === 0) continue;
      const l = lugar(r.ruta);
      claves.add(l.dentro ? l.superficie.nombre : l.clase);
    }
    return claves;
  };
  const sm6En = (enPeriodo: (jornada: string) => boolean) =>
    tasaDe(asentadasEn(enPeriodo, (r) => r.tramo === TRAMO_SIN_RESULTADOS.rotulo), asentadasEn(enPeriodo), faltan('busquedas'));
  const sm13En = (enPeriodo: (jornada: string) => boolean) => {
    const claves = clavesConBusqueda(enPeriodo);
    const seguidas = sumar(salidas, (r) => {
      if (!enPeriodo(r.jornada) || r.zona !== ZONA_DE_RESULTADO) return false;
      const l = lugar(r.ruta);
      return claves.has(l.dentro ? l.superficie.nombre : l.clase);
    });
    return tasaDe(busquedas === undefined ? undefined : seguidas, asentadasEn(enPeriodo), faltan('salidas', 'busquedas'));
  };
  const porCampo = (campo: 'tramo' | 'filtros', orden: readonly string[]) => {
    const mapa = new Map<string, number>();
    for (const r of busquedas ?? []) {
      if (!enBusqueda(r.jornada)) continue;
      const valor = r[campo] ?? 'nulo';
      mapa.set(valor, (mapa.get(valor) ?? 0) + r.n);
    }
    return ordenarPorClave(mapa, orden);
  };
  const sinResultadosPorConsulta = new Map<string, number>();
  for (const r of sinResultados ?? []) {
    if (enBusqueda(r.jornada) && r.consulta !== null) {
      sinResultadosPorConsulta.set(r.consulta, (sinResultadosPorConsulta.get(r.consulta) ?? 0) + r.n);
    }
  }
  const asentadas = asentadasEn(enBusqueda);
  const busquedasLeidas: Busquedas = {
    ...(asentadas === undefined ? {} : { asentadas }),
    porTramo: porCampo('tramo', TRAMOS.map((t) => t.rotulo)).map(([tramo, n]) => ({ tramo, n })),
    porFiltros: porCampo('filtros', []).map(([filtros, n]) => ({ filtros, n })),
    sm6: sm6En(enBusqueda),
    sm13: sm13En(enBusqueda),
    ...(sinResultados === undefined
      ? {}
      : {
          sinResultados: [...sinResultadosPorConsulta]
            .sort(([a, na], [b, nb]) => nb - na || (a < b ? -1 : a > b ? 1 : 0))
            .map(([consulta, n]) => ({ consulta, n })),
        }),
  };

  // Las líneas base: una por unidad de lectura, y la de las búsquedas.
  const llegadasDe = (unidad: string, tramo: Tramo) =>
    [...new Set(juicios.filter((j) => j.unidad === unidad && j.llegada !== undefined).map((j) => j.llegada!))]
      .filter(enTramo(tramo))
      .sort();
  const acumuladoPorJornada = (unidad: string): Map<string, number> | undefined => {
    const fuente = unidad === UNIDAD_DE_LAS_BUSQUEDAS ? busquedas : vistasYLecturas;
    if (fuente === undefined) return undefined;
    const filtro = unidad === UNIDAD_DE_LAS_BUSQUEDAS ? () => true : (r: Recuento) => esLectura(r) && deUnidad(unidad)(r);
    const mapa = new Map<string, number>();
    for (const r of fuente) if (filtro(r)) mapa.set(r.jornada, (mapa.get(r.jornada) ?? 0) + r.n);
    return mapa;
  };
  const unidadesDeLectura = [...new Set(superficies.filter(conLectura).map(superficieDeLineaBase))];
  const lineaBaseDe = (unidad: string): LineaBase => {
    const serie = unidad === UNIDAD_DE_LAS_BUSQUEDAS ? 'busqueda' : 'lectura';
    const tramo = series[serie].vigente;
    const base = {
      unidad,
      serie,
      superficies: superficies.filter((s) => conLectura(s) && superficieDeLineaBase(s) === unidad).map((s) => s.nombre),
      saltadas: [] as string[],
      jornadas: [] as string[],
    } as const;
    const porJornada = acumuladoPorJornada(unidad);
    if (porJornada === undefined) {
      return { ...base, estado: 'sin-leer', faltan: [serie === 'busqueda' ? 'busquedas' : 'vistasYLecturas'] };
    }
    if (tramo.desde === undefined) return { ...base, estado: 'no-ha-empezado' };
    // Empieza la primera jornada UTC completa tras la llegada que la hace medible: la del tramo
    // vigente o, si una llegada de su unidad la hace medible después (los Directorios), la siguiente
    // a esa llegada; sin esa llegada, todavía no ha empezado.
    let desde = tramo.desde;
    const medible = juicios.find((j) => j.unidad === unidad && j.haceMedible === true);
    if (medible !== undefined) {
      if (medible.llegada === undefined || medible.llegada >= hoy) {
        return { ...base, estado: 'no-ha-empezado', esperando: medible.deDondeLlega };
      }
      if (medible.llegada >= desde) desde = desplazarJornada(medible.llegada, 1);
    }
    const saltadas = llegadasDe(unidad, tramo);
    const jornadas: string[] = [];
    let acumulado = 0;
    let cerradaEl: string | undefined;
    for (const jornada of jornadasEntre(desde, tramo.hasta)) {
      if (saltadas.includes(jornada)) continue;
      jornadas.push(jornada);
      acumulado += porJornada.get(jornada) ?? 0;
      if (minimo !== undefined && acumulado >= minimo) {
        cerradaEl = jornada;
        break;
      }
    }
    const comun = { ...base, desde, acumulado, saltadas, jornadas };
    if (minimo === undefined) return { ...comun, estado: 'sin-minimo' };
    return cerradaEl === undefined
      ? { ...comun, estado: 'abierta', minimo }
      : { ...comun, estado: 'cerrada', minimo, cerradaEl };
  };

  // Las firmas de cada línea base de lectura, sobre sus jornadas.
  const firmasDe = (lineaBase: LineaBase): Firma[] | undefined => {
    if (vistasYLecturas === undefined || lineaBase.jornadas.length === 0) return undefined;
    const jornadas = new Set(lineaBase.jornadas);
    const filtro = (r: Recuento) => jornadas.has(r.jornada) && deUnidad(lineaBase.unidad)(r);
    const pares = new Map<string, { jornada: string; porOrigen: Map<string | null, number>; lecturas: number; deCita: boolean }>();
    const par = (ruta: string, jornada: string) => {
      const clave = `${jornada} ${rutaComparable(ruta)}`;
      let actual = pares.get(clave);
      if (actual === undefined) {
        const l = lugar(ruta);
        actual = { jornada, porOrigen: new Map(), lecturas: 0, deCita: l.dentro && l.superficie.vista === EVENTOS.vistaDeCita };
        pares.set(clave, actual);
      }
      return actual;
    };
    for (const v of vistasDeCargaPorPar(vistasYLecturas, filtro)) {
      const p = par(v.ruta, v.jornada);
      p.porOrigen.set(v.origen, (p.porOrigen.get(v.origen) ?? 0) + v.vistas);
    }
    for (const r of vistasYLecturas) if (esLectura(r) && filtro(r)) par(r.ruta, r.jornada).lecturas += r.n;
    const todos = [...pares.values()];
    const vistasDe = (p: (typeof todos)[number]) => [...p.porOrigen.values()].reduce((a, b) => a + b, 0);
    const comparar = (firma: Firma['firma'], conFirma: (p: (typeof todos)[number]) => boolean, extra: Partial<Firma> = {}): Firma => {
      const dentro = todos.filter(conFirma);
      const resto = todos.filter((p) => !conFirma(p));
      return {
        firma,
        aplica: true,
        pares: dentro.length,
        lecturas: dentro.reduce((a, p) => a + p.lecturas, 0),
        vistas: dentro.reduce((a, p) => a + vistasDe(p), 0),
        restoPares: resto.length,
        restoLecturas: resto.reduce((a, p) => a + p.lecturas, 0),
        restoVistas: resto.reduce((a, p) => a + vistasDe(p), 0),
        ...extra,
      };
    };
    // Threads: exactamente dos vistas de carga con su marca, una sin ella y ninguna con otra.
    const threads = comparar('Threads', (p) => {
      for (const [origen, n] of p.porOrigen) {
        if (origen === THREADS ? n !== 2 : origen === null ? n !== 1 : n !== 0) return false;
      }
      return p.porOrigen.get(THREADS) === 2 && p.porOrigen.get(null) === 1;
    });
    // Ráfaga: solo la Página de Cita; la jornada en que el umbral de rutas o más tienen una sola vista.
    const tieneCitas = superficies.some((s) => s.vista === EVENTOS.vistaDeCita && superficieDeLineaBase(s) === lineaBase.unidad);
    if (!tieneCitas) {
      return [threads, { firma: 'ráfaga', aplica: false, pares: 0, lecturas: 0, vistas: 0, restoPares: 0, restoLecturas: 0, restoVistas: 0 }];
    }
    const conUnaPorJornada = new Map<string, number>();
    for (const p of todos) if (p.deCita && vistasDe(p) === 1) conUnaPorJornada.set(p.jornada, (conUnaPorJornada.get(p.jornada) ?? 0) + 1);
    const deRafaga = new Set([...conUnaPorJornada].filter(([, n]) => n >= minRutasEnRafaga).map(([jornada]) => jornada));
    const rafaga = comparar('ráfaga', (p) => p.deCita && deRafaga.has(p.jornada) && vistasDe(p) === 1, {
      jornadas: [...deRafaga].sort(),
    });
    return [threads, rafaga];
  };

  const lineasBase = [...unidadesDeLectura, UNIDAD_DE_LAS_BUSQUEDAS].map((unidad) => {
    const lineaBase = lineaBaseDe(unidad);
    if (lineaBase.serie !== 'lectura') return lineaBase;
    const firmas = firmasDe(lineaBase);
    return firmas === undefined ? lineaBase : { ...lineaBase, firmas };
  });

  // Las ventanas de cada juicio.
  const tasaEn = (tasa: TasaDeJuicio | { zona: string }, unidad: string, jornadas: ReadonlySet<string>): Tasa => {
    const enPeriodo = (jornada: string) => jornadas.has(jornada);
    if (typeof tasa === 'object') {
      const filtro = conJornada(enPeriodo, deUnidad(unidad));
      return tasaDe(
        sumar(salidas, (r) => r.zona === tasa.zona && filtro(r)),
        sumar(vistasYLecturas, (r) => esLectura(r) && filtro(r)),
        faltan('salidas', 'vistasYLecturas'),
      );
    }
    if (tasa === 'sm6') return sm6En(enPeriodo);
    if (tasa === 'sm13') return sm13En(enPeriodo);
    const deAccion = tasasDeAccion(deUnidad(unidad), enPeriodo);
    if (tasa === 'sm5') return deAccion.conAccion;
    if (tasa === 'sm7') return deAccion.conComparticion;
    return deAccion.continuacion;
  };
  const nombreDeTasa = (tasa: TasaDeJuicio | { zona: string }) =>
    typeof tasa === 'object'
      ? `continuación desde ${tasa.zona}`
      : { sm5: 'SM-5', sm7: 'SM-7', continuacion: 'continuación', 'continuacion-por-zona': 'continuación', sm6: 'SM-6', sm13: 'SM-13' }[tasa];
  const juiciosLeidos: JuicioLeido[] = juicios.map((juicio) => {
    const sin = (sinVentanas: string): JuicioLeido => ({ juicio, sinVentanas, referencias: [], ventanas: [], cortadas: [] });
    const lineaBase = lineasBase.find((l) => l.unidad === juicio.unidad);
    if (lineaBase === undefined || (lineaBase.serie === 'lectura' && lineaBase.superficies.length === 0)) {
      return sin(juicio.sinUnidad ?? `ninguna superficie declara la unidad «${juicio.unidad}»`);
    }
    if (lineaBase.estado === 'sin-leer') return sin(`sin leer: ${(lineaBase.faltan ?? []).map((f) => QUE_LEE[f]).join(' y ')}`);
    if (lineaBase.estado === 'no-ha-empezado' || lineaBase.desde === undefined) {
      return sin(
        lineaBase.esperando === undefined
          ? 'la línea base no ha empezado: no hay tramo vigente con principio'
          : `la línea base no ha empezado: espera ${lineaBase.esperando}, la llegada que la hace medible`,
      );
    }
    if (minimo === undefined) return sin('sin mínimo declarado (MIN_LECTURAS_DE_LINEA_BASE): no hay ventanas');
    // La continuación por zona necesita las salidas para saber qué zonas hay: sin ellas, se nombran.
    if (juicio.tasas.includes('continuacion-por-zona') && salidas === undefined) return sin(`sin leer: ${QUE_LEE.salidas}`);
    const tramo = series[lineaBase.serie].vigente;
    const porJornada = acumuladoPorJornada(juicio.unidad)!;
    const saltadas = new Set(lineaBase.saltadas);
    // La llegada «antes de la línea base» es la que cae dentro de ella —desde su principio y antes
    // de su cierre—. La que la hace medible cae la víspera de su principio, y se juzga frente a ella.
    const llegadaEnTramo =
      juicio.llegada !== undefined && juicio.llegada >= lineaBase.desde && juicio.llegada <= tramo.hasta
        ? juicio.llegada
        : undefined;
    const antesDelCierre =
      llegadaEnTramo !== undefined && (lineaBase.cerradaEl === undefined || llegadaEnTramo < lineaBase.cerradaEl);
    let inicio: string;
    let referenciaDe: ReadonlySet<string>;
    let referencia: JuicioLeido['referencia'];
    if (antesDelCierre) {
      inicio = desplazarJornada(llegadaEnTramo!, 1);
      referenciaDe = new Set(jornadasEntre(lineaBase.desde, jornadaAnterior(llegadaEnTramo!)).filter((j) => !saltadas.has(j)));
      referencia = 'serie-de-antes';
    } else if (lineaBase.cerradaEl !== undefined) {
      inicio = desplazarJornada(lineaBase.cerradaEl, 1);
      referenciaDe = new Set(lineaBase.jornadas);
      referencia = 'linea-base';
    } else {
      return sin('la línea base no se ha cerrado todavía');
    }
    const tasas = juicio.tasas.flatMap<TasaDeJuicio | { zona: string }>((tasa) =>
      tasa === 'continuacion-por-zona'
        ? ordenarPorClave(zonasDe(conJornada(enTramo(tramo), deUnidad(juicio.unidad)))).map(([zona]) => ({ zona }))
        : [tasa],
    );
    if (tasas.length === 0) return sin('ninguna salida con zona en el tramo: no hay continuación por zona que juzgar');
    const referencias = tasas.map((tasa) => ({ tasa: nombreDeTasa(tasa), valor: tasaEn(tasa, juicio.unidad, referenciaDe) }));
    const referenciaAcumulada = [...referenciaDe].reduce((total, jornada) => total + (porJornada.get(jornada) ?? 0), 0);
    const ventanas: Ventana[] = [];
    const cortadas: VentanaCortada[] = [];
    let actual: string[] = [];
    let acumulado = 0;
    // La señal de la ventana anterior, para «salta»: una llegada en medio rompe la cadena.
    let anterior: Ventana['senal'];
    for (const jornada of jornadasEntre(inicio, tramo.hasta)) {
      if (saltadas.has(jornada)) {
        // Un cambio corta el bloque en curso: ninguna ventana junta jornadas de los dos lados de una
        // llegada. Lo cortado no reúne el mínimo, no se juzga y se nombra.
        if (actual.length > 0) cortadas.push({ desde: actual[0], hasta: actual[actual.length - 1], acumulado, por: jornada });
        actual = [];
        acumulado = 0;
        anterior = undefined;
        continue;
      }
      actual.push(jornada);
      acumulado += porJornada.get(jornada) ?? 0;
      if (acumulado < minimo) continue;
      const enLaVentana = new Set(actual);
      const valores = tasas.map((tasa, i) => {
        const valor = tasaEn(tasa, juicio.unidad, enLaVentana);
        const direccion = direccionDe(valor, referencias[i].valor);
        return { tasa: nombreDeTasa(tasa), valor, ...(direccion === undefined ? {} : { direccion }) };
      });
      const ventana: Ventana = { desde: actual[0], hasta: actual[actual.length - 1], acumulado, tasas: valores };
      // Una línea base cerrada antes de la llegada da ventanas antes de ella: se juzgan, como pide
      // «contadas desde el cierre», pero se dice que no juzgan lo que llega.
      if (juicio.llegada !== undefined && ventana.hasta < juicio.llegada) ventana.antesDeLaLlegada = juicio.llegada;
      if (juicio.senal !== undefined) {
        const sube = valores[tasas.indexOf(juicio.senal.sube)]?.direccion;
        const baja = valores[tasas.indexOf(juicio.senal.baja)]?.direccion;
        // Sin una de las dos direcciones la señal no se puede juzgar, y no se escribe «no se da»,
        // que afirmaría una ausencia como un hecho. Tampoco deja pasar la cadena: dos ventanas con
        // la señal separadas por una sin juzgar no son «dos seguidas», así que la siguiente que la
        // dé vuelve a «se da», como tras una llegada.
        if (sube === undefined || baja === undefined) {
          ventana.senal = 'sin dirección';
        } else if (sube === 'sube' && baja === 'baja') {
          ventana.senal = anterior === 'se da' || anterior === 'salta' ? 'salta' : 'se da';
        } else {
          ventana.senal = 'no se da';
        }
        anterior = ventana.senal;
      }
      ventanas.push(ventana);
      actual = [];
      acumulado = 0;
    }
    return {
      juicio,
      referencia,
      referencias,
      ...(referencia === 'serie-de-antes' ? { referenciaAcumulada } : {}),
      ventanas,
      cortadas,
      ...(actual.length > 0 ? { enCurso: { desde: actual[0], acumulado } } : {}),
    };
  });

  return {
    hoy,
    sinLeer,
    cuota: entrada.cuota,
    gasto: entrada.gasto,
    descuentos: {
      comprobacion,
      pasadas: pasadas.map((pasada, i) => ({ ...pasada, registros: porPasada[i] })),
      incompletos: faltan(...CONSULTAS_DE_LA_LECTURA),
    },
    series,
    sm8,
    superficies: cifrasDeSuperficies,
    unidades,
    fueraDelCenso,
    fueraDelCensoSinLeer: faltan(...CONSULTAS_DE_LA_LECTURA),
    obra,
    ...(cita === undefined ? {} : { cita }),
    ...(portada === undefined ? {} : { portada }),
    ...(obraTasas === undefined ? {} : { obraTasas }),
    sm12,
    busquedas: busquedasLeidas,
    ...(minimo === undefined ? {} : { minimo }),
    lineasBase,
    juicios: juiciosLeidos,
  };
}

/**
 * Si ninguna consulta tiene forma: ninguna dio recuentos —falló, o trajo filas sin forma—. Entonces la
 * orden sale con 1, como cuando `wrangler` no contesta (Historia 23.13): las cifras de `d1 info` ya no
 * bastan para que «se leyera algo», porque `d1 info` es la precondición de toda lectura.
 */
export function ningunaConsultaConForma(lectura: LecturaDeMedicion): boolean {
  return lectura.descuentos.incompletos.length === CONSULTAS_DE_LA_LECTURA.length;
}

// ── El informe ────────────────────────────────────────────────────────────────────────────

const entero = (n: number) => n.toLocaleString('es-ES');

const porcentaje = (numerador: number, denominador: number) =>
  `${((100 * numerador) / denominador).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

const lista = (partes: readonly string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(partes);

const nombresDe = (faltan: readonly ConsultaDeLaLectura[]) => lista(faltan.map((f) => QUE_LEE[f]));

/** Una tasa en el informe: el porcentaje con su numerador y su denominador, o por qué no lo hay. */
export function textoDeTasa(tasa: Tasa): string {
  switch (tasa.estado) {
    case 'calculada':
      return `${porcentaje(tasa.numerador, tasa.denominador)} (${entero(tasa.numerador)} de ${entero(tasa.denominador)})`;
    case 'sin-denominador':
      return `sin denominador (${entero(tasa.numerador)} sobre ninguna)`;
    case 'sin-leer':
      return `sin leer (${nombresDe(tasa.faltan)})`;
    case 'por-encima':
      return (
        `no se calcula: la tasa de la que es complemento pasa del 100 % (${entero(tasa.numerador)} de ` +
        `${entero(tasa.denominador)}), con más salidas que lecturas —balizas perdidas o partidas por la medianoche UTC—`
      );
  }
}

const cifra = (valor: number | undefined) => (valor === undefined ? 'sin leer' : entero(valor));

/**
 * Un texto que llega de D1 tal cual lo escribió un visitante —la consulta sin resultados, sobre
 * todo—, sin caracteres de control, de dirección, de anchura cero ni separadores de línea: uno de
 * ellos partiría el informe en líneas falsas, lo reordenaría o metería secuencias de escape en la
 * terminal de quien lo lee. El receptor ya lo recorta a `MAX_CONSULTA` caracteres.
 */
export function legible(texto: string): string {
  return texto.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/g, '\ufffd');
}

/**
 * Un tramo en el informe. Vacío, es o el vigente que empieza hoy —la llegada fue ayer y aún no
 * tiene ninguna jornada cerrada— o uno entre dos llegadas seguidas.
 */
const textoDeTramo = (tramo: Tramo, hoy: string) => {
  if (tramo.desde !== undefined && tramo.desde > tramo.hasta) {
    return tramo.hasta === jornadaAnterior(hoy)
      ? `tramo ${tramo.numero} (empieza el ${tramo.desde}: aún no tiene ninguna jornada cerrada)`
      : `tramo ${tramo.numero} (vacío: dos llegadas seguidas)`;
  }
  return `tramo ${tramo.numero} (${tramo.desde === undefined ? 'desde el principio' : `desde el ${tramo.desde}`} hasta el ${tramo.hasta})`;
};

const textoDeCambio = (cambio: Cambio) => `${cambio.jornada}, cambió: ${lista(cambio.motivos)}`;

const NOMBRE_DE_SERIE: { readonly [S in SerieDeMedicion]: string } = {
  sm8: 'SM-8 (CORTES_DE_SM8)',
  lectura: 'la lectura',
  busqueda: 'la búsqueda',
};

/**
 * La cuota de lectura en el informe (Historia 23.13): lo leído en 24 h antes de leer frente a la
 * cuota, la estimación de esta lectura —N × sus recorridos declarados, una cota inferior— y, aparte,
 * la medida —la suma de los `rows_read` que D1 dio de cada sentencia—, frente a la cuota.
 */
export function lineasDelGasto(gasto: GastoDeLaLectura): string[] {
  const veces = vecesQueRecorre(gasto.recorridos);
  const sinMedir =
    gasto.sinMedir === 0
      ? ''
      : `; ${entero(gasto.sinMedir)} de ellas no trajeron rows_read, así que la medida se queda corta`;
  return [
    `  Filas leídas en 24 h, según d1 info, antes de leer: ${entero(gasto.leidas24h)} de ${entero(gasto.cuota)} al día ` +
      `(CUOTA_DE_FILAS_LEIDAS_POR_DIA_EN_D1, por cuenta), ${porcentaje(gasto.leidas24h, gasto.cuota)}. Se dejaron otras ` +
      `${entero(gasto.reserva)} de reserva para el resto del día.`,
    `  Esta lectura, estimación: ${entero(gasto.estimacion)} filas, ${entero(gasto.filas)} filas de la tabla × ${veces} ` +
      `recorridos (${textoDeRecorridos(gasto.recorridos)}). Es una cota inferior: rows_read cuenta también los índices.`,
    `  Esta lectura, medida: ${entero(gasto.medida)} filas, la suma de los rows_read de sus ${entero(gasto.enviadas)} ` +
      `sentencias${sinMedir}; ${porcentaje(gasto.medida, gasto.cuota)} de la cuota de lectura.`,
    `  Al pasar la de lectura, las consultas fallan hasta las 00:00 UTC, y quizá —sin confirmar— también las ` +
      'escrituras del receptor.',
  ];
}

/** El informe, en líneas. Termina diciendo que no se escribió nada. */
export function lineasDeLecturaDeMedicion(lectura: LecturaDeMedicion): string[] {
  const lineas: string[] = [];
  const ultima = jornadaAnterior(lectura.hoy);
  lineas.push(
    `Lectura de la línea base — jornadas UTC cerradas hasta el ${ultima}; la de hoy (${lectura.hoy}) no entra.`,
  );

  if (lectura.sinLeer.length > 0) {
    lineas.push('', 'Sin leer —lo que depende de ello se omite y se nombra, nunca se escribe como cero—:');
    for (const { que, motivo } of lectura.sinLeer) lineas.push(`  ${que}: ${motivo}`);
  }

  // La cuota.
  lineas.push('', 'Cuota de D1 (plan gratuito)');
  const { escritas, tamaño } = lectura.cuota;
  lineas.push(
    escritas.ok
      ? `  Filas escritas en 24 h, según d1 info: ${entero(escritas.valor)} de ${entero(CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1)} ` +
          `al día (CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1), ${porcentaje(escritas.valor, CUOTA_DE_FILAS_ESCRITAS_POR_DIA_EN_D1)}. ` +
          'Peca por exceso: cubre lo escrito desde las 00:00 UTC y algo más.'
      : `  Filas escritas en 24 h: sin leer (${escritas.motivo})`,
  );
  lineas.push(
    tamaño.ok
      ? `  Tamaño de la base: ${entero(tamaño.valor)} bytes de ${entero(CUOTA_DE_BYTES_POR_BASE_EN_D1)} ` +
          `(CUOTA_DE_BYTES_POR_BASE_EN_D1), ${porcentaje(tamaño.valor, CUOTA_DE_BYTES_POR_BASE_EN_D1)}.`
      : `  Tamaño de la base: sin leer (${tamaño.motivo})`,
  );
  lineas.push(
    '  Al pasar cualquiera de las dos, las escrituras fallan en silencio —el Worker se traga el error—: pasada la de ' +
      'filas escritas, hasta las 00:00 UTC, cuando se renueva; pasada la de tamaño, hasta que se borren filas o cambie ' +
      'el plan, porque esa no se renueva sola.',
  );
  lineas.push(...lineasDelGasto(lectura.gasto));

  // Los descuentos.
  const sinContar =
    lectura.descuentos.incompletos.length > 0 ? ` (sin contar ${nombresDe(lectura.descuentos.incompletos)}, que no se leyeron)` : '';
  lineas.push('', 'Descuentos');
  lineas.push(
    `  Balizas de prueba (${RUTA_DE_COMPROBACION}): ${entero(lectura.descuentos.comprobacion)} registros${sinContar}, ` +
      'además de los que ya aparta el SQL.',
  );
  if (lectura.descuentos.pasadas.length === 0) {
    lineas.push('  Pasadas que escriben en producción (PASADAS_QUE_ESCRIBEN_EN_PRODUCCION): ninguna anotada.');
  } else {
    lineas.push('  Pasadas que escriben en producción (PASADAS_QUE_ESCRIBEN_EN_PRODUCCION):');
    for (const pasada of lectura.descuentos.pasadas) {
      lineas.push(
        `    la ${pasada.pasada}, el ${pasada.jornada}, en ${lista([...pasada.rutas])}: ${entero(pasada.registros)} registros descontados${sinContar}.`,
      );
    }
    lineas.push(
      '    Cada pasada descuenta todos los registros de sus rutas en su jornada, también los de visitantes de verdad: ' +
        'la tabla no los distingue. Si dos comparten ruta y jornada, lo compartido se cuenta en la primera.',
    );
  }

  // Los cortes.
  lineas.push('', 'Cortes de serie (CORTES_DE_SERIE de src/lib/umbrales.ts)');
  for (const serie of ['sm8', 'lectura', 'busqueda'] as const) {
    const partida = lectura.series[serie];
    const cabeza = `  ${NOMBRE_DE_SERIE[serie]}: `;
    if (partida.cortes.length === 0) {
      lineas.push(`${cabeza}ningún corte ha llegado todavía; la serie va entera, en un solo tramo.`);
    } else {
      lineas.push(
        `${cabeza}${partida.tramos.length} tramos, que no se suman. Vigente: ${textoDeTramo(partida.vigente, lectura.hoy)}. ` +
          `Cambió, y no entra en ningún tramo: ${partida.cambios.map((c) => `${c.jornada} (${lista(c.motivos)})`).join('; ')}.`,
      );
    }
    for (const pendiente of partida.pendientes) {
      lineas.push(`    El corte del ${pendiente.jornada} (${pendiente.que}) es de hoy o posterior: aún no abre tramo.`);
    }
  }

  // SM-8.
  lineas.push('', 'SM-8 — vistas de Cita y de superficie con marca de origen, de toda ruta (sin la vista de Obra)');
  if ('faltan' in lectura.sm8) {
    lineas.push(`  Sin leer (${nombresDe(lectura.sm8.faltan)}).`);
  } else {
    if (lectura.series.sm8.cortes.length === 0) {
      lineas.push('  Ningún corte de CORTES_DE_SM8 ha llegado: la serie va entera, sin partir.');
    }
    for (const parte of lectura.sm8.tramos) {
      const cabeza = parte.tramo !== undefined ? textoDeTramo(parte.tramo, lectura.hoy) : textoDeCambio(parte.cambio!);
      const redes = parte.porRed.map(
        ({ red, porEvento }) => `${legible(red)}: ${porEvento.map(({ evento, n }) => `${evento} ${entero(n)}`).join(', ')}`,
      );
      lineas.push(`  ${cabeza}: ${redes.length === 0 ? 'ninguna vista con marca' : redes.join('; ')}.`);
    }
    lineas.push(
      '  Los tramos no se suman como una sola serie.',
      '  Threads no se lee como personas mientras no conste quién publica sus enlaces.',
    );
  }

  // Las superficies.
  const vigente = lectura.series.lectura.vigente;
  lineas.push(
    '',
    `Superficies con lectura — ${textoDeTramo(vigente, lectura.hoy)} de la lectura, resueltas contra el censo de hoy; todas, también a cero`,
  );
  for (const s of lectura.superficies) {
    lineas.push(
      `  ${s.nombre}: vistas ${cifra(s.vistas)}, lecturas ${cifra(s.lecturas)}, salidas ${cifra(s.salidas)}, ` +
        `acciones ${cifra(s.acciones)}; ` +
        `continuación ${textoDeTasa(s.continuacion)}.`,
    );
    if (s.porZona.length > 0) {
      lineas.push(`    por zona: ${s.porZona.map(({ zona, continuacion }) => `${legible(zona)} ${textoDeTasa(continuacion)}`).join('; ')}.`);
    }
  }
  for (const u of lectura.unidades) {
    lineas.push(
      `  ${u.unidad} (línea base de ${lista(u.superficies)}): lecturas ${cifra(u.lecturas)}; continuación ${textoDeTasa(u.continuacion)}.`,
    );
  }
  lineas.push('  La continuación es cota inferior: lo que se abre en pestaña nueva no se mide.');

  // Fuera del censo.
  lineas.push('', 'Fuera del censo —se cuenta aparte y se nombra, nunca se descarta—');
  if (lectura.fueraDelCenso.length === 0) lineas.push('  nada.');
  for (const { clase, porEvento } of lectura.fueraDelCenso) {
    lineas.push(`  ${clase}: ${porEvento.map(({ evento, n }) => `${evento} ${entero(n)}`).join(', ')}.`);
  }
  if (lectura.fueraDelCenso.some(({ clase }) => clase === YA_NO_SE_PUBLICA)) {
    lineas.push(
      `  «${YA_NO_SE_PUBLICA}» junta lo retirado —una Cita, un Autor, una Obra absorbida— con las direcciones con forma ` +
        'de página que nunca se publicaron, como una errata en un enlace: el censo de hoy no las distingue.',
    );
  }
  if (lectura.fueraDelCensoSinLeer.length > 0) lineas.push(`  Sin contar ${nombresDe(lectura.fueraDelCensoSinLeer)}, que no se leyeron.`);

  // La Obra.
  lineas.push('', 'La Obra, por la marca de sus vistas de Obra de cada ruta y jornada (nunca desde git)');
  if ('faltan' in lectura.obra) {
    lineas.push(`  Sin leer (${nombresDe(lectura.obra.faltan)}): sin las vistas de Obra no hay marca con que partirla.`);
  } else {
    for (const o of lectura.obra) {
      lineas.push(
        `  ${o.marca}: vistas de Obra ${cifra(o.vistasDeObra)}, lecturas ${cifra(o.lecturas)}, salidas ${cifra(o.salidas)}, ` +
          `acciones ${cifra(o.acciones)}; continuación ${textoDeTasa(o.continuacion)}.`,
      );
    }
  }

  // La Página de Cita.
  if (lectura.cita !== undefined) {
    const { conAccion, conComparticion, continuacion, sinContinuacion, lecturas } = lectura.cita;
    lineas.push('', `La Página de Cita — sobre sus lecturas (${cifra(lecturas)}), resueltas contra el censo`);
    lineas.push(
      `  SM-5, lecturas con su primera acción —copiado o descarga sin destino—: ${textoDeTasa(conAccion)}.`,
      `  SM-7, lecturas con su primera compartición: ${textoDeTasa(conComparticion)}; cota inferior en Chrome para Android.`,
      `  Continuación: ${textoDeTasa(continuacion)}; cota inferior.`,
      `  SM-3, 1 − la continuación: ${textoDeTasa(sinContinuacion)}; cota superior, porque la continuación es inferior.`,
      `  SM-C3: SM-5 ${textoDeTasa(conAccion)} junto a SM-7 ${textoDeTasa(conComparticion)}.`,
      `  SM-C5: la continuación ${textoDeTasa(continuacion)} junto a SM-5 ${textoDeTasa(conAccion)}.`,
    );
  }
  for (const [nombre, tasas] of [
    ['La portada', lectura.portada],
    ['La Obra', lectura.obraTasas],
  ] as const) {
    if (tasas === undefined) continue;
    lineas.push(
      `  ${nombre}, aparte y sin llamarse SM-5 ni SM-7: lecturas ${cifra(tasas.lecturas)}; con acción ${textoDeTasa(tasas.conAccion)}; ` +
        `con compartición ${textoDeTasa(tasas.conComparticion)}; continuación ${textoDeTasa(tasas.continuacion)}.`,
    );
  }
  lineas.push('  Las metas de SM-3 a SM-7 están en suspenso hasta su línea base: ninguna cifra de aquí se compara con ellas.');

  // SM-12.
  lineas.push('', 'SM-12 — lecturas con via entre las comparticiones de su destino, de toda ruta, sin mirar primera');
  if ('faltan' in lectura.sm12) {
    lineas.push(`  Sin leer (${nombresDe(lectura.sm12.faltan)}).`);
  } else {
    // Los que se comparan, y después, aparte, los que quedan fuera de la comparación, con su motivo.
    for (const d of lectura.sm12.destinos.filter((destino) => destino.fuera === undefined)) {
      lineas.push(`  ${d.destino}: ${textoDeTasa(d.tasa)}.`);
    }
    for (const d of lectura.sm12.destinos.filter((destino) => destino.fuera !== undefined)) {
      lineas.push(`  Aparte, ${d.destino}: ${textoDeTasa(d.tasa)}; ${d.fuera}.`);
    }
    lineas.push(
      `  La Imagen cuadrada (comparticion-de-imagen con destino ${DESTINO_OPACO}), fuera de todo destino: ${cifra(lectura.sm12.imagenCuadrada)}.`,
      `  ${DESTINO_DE_IMAGEN} cuenta en su denominador las descargas impuestas por el navegador; las de ${DESTINO_OPACO}, nunca.`,
      '  En Chrome para Android la cifra puede quedar por encima de la real, y puede pasar de uno.',
    );
  }

  // Las búsquedas.
  const b = lectura.busquedas;
  lineas.push('', `Búsquedas — ${textoDeTramo(lectura.series.busqueda.vigente, lectura.hoy)} de la búsqueda`);
  lineas.push(`  Asentadas: ${cifra(b.asentadas)}.`);
  if (b.porTramo.length > 0) lineas.push(`  Por tramo: ${b.porTramo.map(({ tramo, n }) => `${legible(tramo)} ${entero(n)}`).join(', ')}.`);
  if (b.porFiltros.length > 0) {
    lineas.push(`  Por filtros: ${b.porFiltros.map(({ filtros, n }) => `${legible(filtros)} ${entero(n)}`).join(', ')}.`);
  }
  lineas.push(
    `  SM-6, en el tramo 0: ${textoDeTasa(b.sm6)}.`,
    `  SM-13, salidas desde un resultado: ${textoDeTasa(b.sm13)}; cota inferior —el resultado abierto en pestaña nueva no se mide—.`,
    '  SM-6 y SM-13 no se comparan por firma: la búsqueda asentada no lleva tiempo mínimo ni marca, y /buscar/ no emite vista.',
  );
  if (b.sinResultados === undefined) {
    lineas.push('  Consultas sin resultados (FR-8): sin leer.');
  } else if (b.sinResultados.length === 0) {
    lineas.push('  Consultas sin resultados (FR-8): ninguna.');
  } else {
    const mostradas = b.sinResultados.slice(0, 40);
    lineas.push(
      `  Consultas sin resultados (FR-8), por recuento: ${mostradas.map(({ consulta, n }) => `«${legible(consulta)}» ${entero(n)}`).join(', ')}` +
        (b.sinResultados.length > mostradas.length ? ` y ${entero(b.sinResultados.length - mostradas.length)} más.` : '.'),
    );
  }

  // Las líneas base.
  lineas.push(
    '',
    `Líneas base (MIN_LECTURAS_DE_LINEA_BASE: ${
      lectura.minimo === undefined ? 'sin mínimo declarado; ninguna se cierra' : entero(lectura.minimo)
    })`,
  );
  for (const l of lectura.lineasBase) {
    const quien = l.superficies.length > 1 ? `${l.unidad} (${lista(l.superficies)})` : l.unidad;
    const unidadDeMedida = l.serie === 'busqueda' ? 'búsquedas asentadas' : 'lecturas';
    let estado: string;
    // Un tramo que empieza hoy —la llegada fue ayer— aún no tiene ninguna jornada cerrada.
    const empiezaHoy = l.desde !== undefined && l.desde > ultima;
    switch (l.estado) {
      case 'sin-leer':
        estado = `sin leer (${nombresDe(l.faltan ?? [])})`;
        break;
      case 'no-ha-empezado':
        estado =
          l.esperando === undefined
            ? 'no ha empezado: su serie aún no tiene ningún corte llegado; empieza la primera jornada UTC completa ' +
              'tras DESPLIEGUE_DE_LA_LECTURA'
            : `no ha empezado: empieza la primera jornada UTC completa tras ${l.esperando}, la llegada que la hace medible`;
        break;
      case 'sin-minimo':
        estado = empiezaHoy
          ? `sin mínimo declarado: empieza el ${l.desde} y aún no tiene ninguna jornada cerrada; no se cierra`
          : `sin mínimo declarado: ${entero(l.acumulado ?? 0)} ${unidadDeMedida} desde el ${l.desde}; no se cierra`;
        break;
      case 'abierta':
        estado = empiezaHoy
          ? `abierta: empieza el ${l.desde} y aún no tiene ninguna jornada cerrada (mínimo: ${entero(l.minimo ?? 0)} ${unidadDeMedida})`
          : `abierta desde el ${l.desde}: ${entero(l.acumulado ?? 0)} de ${entero(l.minimo ?? 0)} ${unidadDeMedida}`;
        break;
      case 'cerrada':
        estado = `cerrada el ${l.cerradaEl}, desde el ${l.desde}, con ${entero(l.acumulado ?? 0)} ${unidadDeMedida}`;
        break;
    }
    lineas.push(`  ${quien}: ${estado}.`);
    if (l.saltadas.length > 0) lineas.push(`    No cuentan, porque cambiaron: ${lista(l.saltadas)}.`);
    for (const f of l.firmas ?? []) {
      if (!f.aplica) {
        lineas.push(`    Firma ${f.firma}: no aplica.`);
        continue;
      }
      if (f.pares === 0) {
        lineas.push(`    Firma ${f.firma}: ningún par (ruta, jornada) la tiene.`);
        continue;
      }
      const razon = (lecturas: number, vistas: number, pares: number) =>
        `${vistas === 0 ? 'sin vistas' : (lecturas / vistas).toLocaleString('es-ES', { maximumFractionDigits: 2 })} ` +
        `(${entero(lecturas)} lecturas / ${entero(vistas)} vistas, ${entero(pares)} pares)`;
      lineas.push(
        `    Firma ${f.firma}${f.jornadas && f.jornadas.length > 0 ? ` (${lista(f.jornadas)})` : ''}: lecturas/vistas ` +
          `${razon(f.lecturas, f.vistas, f.pares)} frente al resto ${razon(f.restoLecturas, f.restoVistas, f.restoPares)}.`,
      );
    }
  }
  lineas.push(
    '  «Cerrada» dice que reunió el mínimo, nunca que sea buena: la da por buena Héctor, y lo anota en DESPLIEGUE.md §3.',
  );

  // Las ventanas.
  lineas.push('', 'Ventanas — cada tasa frente a su línea base o a su serie de antes');
  for (const j of lectura.juicios) {
    const cabeza = `  ${j.juicio.nombre} (${j.juicio.unidad}; llegada: ${
      j.juicio.llegada === undefined ? j.juicio.deDondeLlega : `${j.juicio.llegada}, ${j.juicio.deDondeLlega}`
    })`;
    if (j.sinVentanas !== undefined) {
      lineas.push(`${cabeza}: ${j.sinVentanas}.`);
      continue;
    }
    lineas.push(
      `${cabeza}: ${
        j.referencia === 'serie-de-antes'
          ? 'llegó antes del cierre de la línea base, así que se cuenta desde la jornada siguiente a la llegada, que no entra, frente a la serie propia de antes'
          : 'desde el cierre de la línea base, frente a ella'
      }.`,
    );
    lineas.push(
      `    Referencia: ${j.referencias.length === 0 ? 'ninguna tasa' : j.referencias.map(({ tasa, valor }) => `${legible(tasa)} ${valor.estado === 'calculada' ? textoDeTasa(valor) : `sin referencia (${textoDeTasa(valor)})`}`).join('; ')}.`,
    );
    if (j.referenciaAcumulada !== undefined) {
      const deMedida = j.juicio.unidad === UNIDAD_DE_LAS_BUSQUEDAS ? 'búsquedas asentadas' : 'lecturas';
      const minimo = lectura.minimo ?? 0;
      lineas.push(
        `    La serie de antes reúne ${entero(j.referenciaAcumulada)} ${deMedida}` +
          (j.referenciaAcumulada < minimo
            ? `, por debajo del mínimo de una ventana (${entero(minimo)}): la dirección se lee frente a una referencia más corta que cada ventana.`
            : '.'),
      );
    }
    for (const v of j.ventanas) {
      const tasas = v.tasas.map(
        ({ tasa, valor, direccion }) => `${legible(tasa)} ${textoDeTasa(valor)}${direccion === undefined ? ', sin dirección' : `, ${direccion}`}`,
      );
      const senal =
        v.senal === undefined
          ? '.'
          : v.senal === 'sin dirección'
            ? '; la señal no se puede juzgar: a una de sus dos tasas le falta dirección.'
            : `; la señal ${v.senal}.`;
      const antes =
        v.antesDeLaLlegada === undefined ? '' : ` Antes de la llegada del ${v.antesDeLaLlegada}: no juzga lo que llega.`;
      lineas.push(`    ${v.desde} – ${v.hasta} (${entero(v.acumulado)}): ${tasas.join('; ')}${senal}${antes}`);
    }
    for (const c of j.cortadas) {
      lineas.push(
        `    ${c.desde} – ${c.hasta} (${entero(c.acumulado)}): cortada por el cambio del ${c.por} sin reunir el mínimo; no se juzga, ` +
          'y la ventana siguiente empieza tras el cambio.',
      );
    }
    if (j.ventanas.length === 0) lineas.push('    Ninguna ventana completa todavía.');
    if (j.enCurso !== undefined) {
      lineas.push(`    En curso desde el ${j.enCurso.desde}: ${entero(j.enCurso.acumulado)} de ${entero(lectura.minimo ?? 0)}.`);
    }
  }
  lineas.push('  Basta la dirección, sin umbral de magnitud; que una señal salte no apaga nada.');

  lineas.push('', 'Consulta: no se ha escrito nada.');
  return lineas;
}
