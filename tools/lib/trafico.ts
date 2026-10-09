/**
 * Qué se le pide a Search Analytics y cómo se agrega el tráfico orgánico — Historia 20.2.
 *
 * Hermano puro de `tools/lib/indexacion.ts`, y con la misma frontera (AD-22): aquí no entra
 * la red. Esto compone las peticiones, reparte las filas que ya devolvió la fuente entre las
 * familias y compone la entrada de la serie. Quien pregunta es `tools/trafico.ts`, y es lo
 * único que no se puede probar sin credencial.
 *
 * ── La familia sale del censo, nunca del prefijo de ruta ─────────────────────────────
 *
 * La clave `page` de cada fila se pasa a ruta con `rutaNormalizada` y se busca en el censo
 * de lo publicado (`censoPorFamilia`), normalizado igual. Que una ruta empiece por
 * `/autor/` no la hace de la familia Autor: una página 2 de un listado, una Cita ya retirada
 * a `corpus/_revision/` o una forma que el sitio no publica empiezan igual y no son ninguna
 * página publicada. Todo lo que no casa se suma en `fueraDelCenso`, que se escribe y se
 * informa: **nunca se descarta en silencio**.
 *
 * ── Ausencia antes que cero ──────────────────────────────────────────────────────────
 *
 * Un mes cuya consulta falló no se escribe; una familia cuya consulta por página falló va a
 * `sinLeer` con su motivo. Una familia leída **sin filas** sí es un cero, y se escribe: es
 * lo que la fuente dijo. `componerLecturaDeTrafico` es la puerta que lo garantiza.
 */

import { rutaNormalizada } from '../../src/lib/superficies.ts';
import {
  FAMILIAS,
  NOMBRE_DE_FAMILIA,
  VARIABLE_DE_CREDENCIALES,
  type CensoPorFamilia,
  type Familia,
  type FamiliaSinLeer,
} from './indexacion.ts';

/**
 * Los meses que conserva la fuente — restricción externa. Search Analytics guarda 16 meses
 * de datos, así que pedir más no lee más: devuelve meses vacíos que parecerían ceros.
 */
export const MESES_QUE_CONSERVA_LA_FUENTE = 16;

/** El máximo de filas por petición que admite la fuente. Se pagina con `startRow`. */
export const FILAS_POR_PAGINA = 25_000;

/**
 * Un tope de páginas por mes, para que una respuesta que nunca acorta no deje la orden en
 * un bucle. Son 1.000.000 de filas: el sitio publica menos de dos mil URL.
 */
export const PAGINAS_MAXIMAS_POR_MES = 40;

/**
 * El estado de los datos que se pide: solo los **definitivos**.
 *
 * `all` incluye los de los últimos días, que la fuente aún corrige; escribirlos haría que
 * una relectura del mismo mes cambiara cifras ya pasadas sin que nada hubiera pasado en el
 * sitio. Con `final` el mes en curso llega algo más corto —sin sus dos o tres últimos días—
 * y por eso se marca `parcial`.
 */
export const ESTADO_DE_LOS_DATOS = 'final';

/**
 * Los días que tarda la fuente en dar por definitivos los datos de una jornada.
 *
 * Con `dataState: final` los últimos días aún no salen, así que un mes cuyo último día cae
 * dentro de este retardo llega incompleto aunque ya haya terminado: el día 2 de octubre,
 * septiembre todavía está a medias. Por eso conviene registrar a partir del día
 * `RETARDO_DE_DATOS_FINALES_EN_DIAS + 1` de cada mes, que es cuando el anterior se cierra.
 */
export const RETARDO_DE_DATOS_FINALES_EN_DIAS = 3;

/** El motivo de un mes cuyo total llega sin filas: no es un cero, es que aún no hay datos. */
export const MOTIVO_SIN_DATOS_DEFINITIVOS =
  'la fuente aún no tiene datos definitivos de este mes (el total llegó sin filas)';

/** Un mes que leer: su clave `AAAA-MM` y el rango de días que se pide. */
export interface MesALeer {
  mes: string;
  desde: string;
  hasta: string;
  /** El mes en curso. */
  enCurso: boolean;
  /**
   * Su entrada lleva `parcial: true`: es el mes en curso, o su último día cae dentro del
   * retardo de los datos definitivos (`RETARDO_DE_DATOS_FINALES_EN_DIAS`).
   */
  parcial: boolean;
}

const DIA_MS = 86_400_000;

/** Días naturales entre dos fechas locales, sin que el cambio de hora los descuadre. */
function diasEntre(desde: Date, hasta: Date): number {
  const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / DIA_MS);
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** La jornada **local** de un momento, como `fechaLocal` de `tools/lib/corpus.ts`. */
export function jornadaLocal(momento: Date): string {
  return `${momento.getFullYear()}-${dosCifras(momento.getMonth() + 1)}-${dosCifras(momento.getDate())}`;
}

/**
 * Los `n` meses que terminan en el de `hoy`, del más antiguo al más reciente.
 *
 * Cada mes pasado se pide entero; el actual, hasta hoy. Leerlos todos en cada pasada hace
 * que la primera lectura rellene el pasado sin una orden aparte, y que releer agosto en
 * septiembre corrija agosto.
 */
export function mesesALeer(hoy: Date, n: number = MESES_QUE_CONSERVA_LA_FUENTE): MesALeer[] {
  if (!Number.isInteger(n) || n < 1 || n > MESES_QUE_CONSERVA_LA_FUENTE) {
    throw new Error(
      `${n} no es un número de meses que leer: va de 1 a ${MESES_QUE_CONSERVA_LA_FUENTE}, ` +
        'que son los que conserva la fuente.',
    );
  }
  const meses: MesALeer[] = [];
  for (let atras = n - 1; atras >= 0; atras -= 1) {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
    const ultimo = new Date(primero.getFullYear(), primero.getMonth() + 1, 0);
    const enCurso = atras === 0;
    meses.push({
      mes: `${primero.getFullYear()}-${dosCifras(primero.getMonth() + 1)}`,
      desde: jornadaLocal(primero),
      hasta: enCurso ? jornadaLocal(hoy) : jornadaLocal(ultimo),
      enCurso,
      parcial: enCurso || diasEntre(ultimo, hoy) <= RETARDO_DE_DATOS_FINALES_EN_DIAS,
    });
  }
  return meses;
}

/** Lo que se le pide a `searchanalytics.query`, sin la propiedad, que va aparte. */
export interface PeticionDeTrafico {
  startDate: string;
  endDate: string;
  dataState: string;
  /** Solo la búsqueda web: sin declararlo, depende del valor por omisión de la fuente. */
  type: string;
  aggregationType?: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
}

/** El tipo de búsqueda que se pide, explícito. */
export const TIPO_DE_BUSQUEDA = 'web';

/**
 * El total del mes: **sin dimensiones**, agregado por propiedad.
 *
 * No es la suma por página, y no se compone así a propósito. Difieren **en los dos
 * sentidos**: la consulta por página omite las filas anonimizadas, así que su suma puede
 * quedarse por debajo; y agrega por página —una búsqueda que muestra dos URL del sitio
 * cuenta dos impresiones— donde el total agrega por propiedad y cuenta una, así que su suma
 * también puede quedar por encima. El total es el del sitio; la diferencia con Σ familias +
 * `fueraDelCenso` es real y está escrita en la cabecera.
 */
export function peticionDeTotal(mes: MesALeer): PeticionDeTrafico {
  return {
    startDate: mes.desde,
    endDate: mes.hasta,
    dataState: ESTADO_DE_LOS_DATOS,
    type: TIPO_DE_BUSQUEDA,
  };
}

/**
 * Un rango de días que pedir: un mes de esta serie o una ventana de la de demanda
 * (Historia 20.3). La consulta por página solo necesita los dos extremos.
 */
export interface RangoDeDias {
  desde: string;
  hasta: string;
}

/** Una página de la consulta por `page`. Nunca por consulta: esos clics vienen anonimizados. */
export function peticionPorPagina(rango: RangoDeDias, startRow: number): PeticionDeTrafico {
  return {
    startDate: rango.desde,
    endDate: rango.hasta,
    dataState: ESTADO_DE_LOS_DATOS,
    type: TIPO_DE_BUSQUEDA,
    aggregationType: 'byPage',
    dimensions: ['page'],
    rowLimit: FILAS_POR_PAGINA,
    startRow,
  };
}

/** Una fila tal y como la devuelve la fuente (`Schema$ApiDataRow`). */
export interface FilaDeTrafico {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
}

/**
 * Las cuatro cifras de un agregado. `ctr` y `posicion` se omiten cuando no hubo ninguna
 * impresión: no son cero, no existen.
 */
export interface Metricas {
  clics: number;
  impresiones: number;
  ctr?: number;
  posicion?: number;
}

/** Lo que no casa con ninguna familia del censo. */
export interface FueraDelCenso {
  clics: number;
  impresiones: number;
}

interface Acumulado {
  clics: number;
  impresiones: number;
  /** Las impresiones de las filas que traen posición: el denominador de la media. */
  impresionesConPosicion: number;
  posicionPonderada: number;
}

const vacio = (): Acumulado => ({
  clics: 0,
  impresiones: 0,
  impresionesConPosicion: 0,
  posicionPonderada: 0,
});

function sumar(acumulado: Acumulado, fila: FilaDeTrafico): void {
  const impresiones = fila.impressions ?? 0;
  acumulado.clics += fila.clicks ?? 0;
  acumulado.impresiones += impresiones;
  // Una fila sin posición no entra en la media: contarla como posición 0 la mejoraría.
  if (typeof fila.position === 'number' && Number.isFinite(fila.position)) {
    acumulado.impresionesConPosicion += impresiones;
    acumulado.posicionPonderada += fila.position * impresiones;
  }
}

const redondear = (valor: number, decimales: number) => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

/**
 * CTR = clics / impresiones, con cuatro decimales; posición = media **ponderada por
 * impresiones**, con uno. Una media simple daría el mismo peso a una página vista una vez
 * en la posición 90 que a otra vista mil veces en la 8.
 */
function metricasDe(acumulado: Acumulado): Metricas {
  if (acumulado.impresiones === 0) {
    return { clics: acumulado.clics, impresiones: 0 };
  }
  return {
    clics: acumulado.clics,
    impresiones: acumulado.impresiones,
    ctr: redondear(acumulado.clics / acumulado.impresiones, 4),
    ...(acumulado.impresionesConPosicion === 0
      ? {}
      : {
          posicion: redondear(
            acumulado.posicionPonderada / acumulado.impresionesConPosicion,
            1,
          ),
        }),
  };
}

/**
 * El total del mes a partir de la respuesta sin dimensiones, o `undefined` si llegó **sin
 * filas**.
 *
 * Sin filas no es un cero: con `dataState: final` es lo que contesta la fuente cuando aún
 * no tiene datos definitivos del mes —los primeros días del mes en curso—. Un sitio con
 * cero impresiones de verdad no se distingue de eso, y escribir cero sería fabricarlo.
 */
export function metricasDeTotal(filas: readonly FilaDeTrafico[]): Metricas | undefined {
  if (filas.length === 0) return undefined;
  const acumulado = vacio();
  for (const fila of filas) sumar(acumulado, fila);
  return metricasDe(acumulado);
}

/**
 * La ruta normalizada de cada URL publicada, con su familia.
 *
 * Los dos lados pasan por `rutaNormalizada` —el censo lleva barra final y la clave `page`
 * es una URL completa—, así que se comparan en la misma forma.
 */
function familiaPorRuta(censo: CensoPorFamilia): Map<string, Familia> {
  const mapa = new Map<string, Familia>();
  for (const familia of FAMILIAS) {
    for (const ruta of censo[familia] ?? []) mapa.set(rutaNormalizada(ruta), familia);
  }
  return mapa;
}

/**
 * La familia de una clave `page`, o `undefined` si no casa con el censo.
 *
 * La clave tiene que ser una URL `https://` del host canónico, el de `DOMINIO`. La propiedad
 * es `sc-domain:`, así que también trae `www.`, `http:` y otros subdominios: no son la URL
 * publicada aunque la ruta coincida, y van fuera del censo.
 */
function familiaDePagina(
  mapa: Map<string, Familia>,
  dominio: string,
  pagina: string | undefined,
): Familia | undefined {
  if (pagina === undefined) return undefined;
  try {
    const url = new URL(pagina);
    if (url.protocol !== 'https:' || url.host !== dominio) return undefined;
    return mapa.get(rutaNormalizada(url.pathname));
  } catch {
    // Una clave que ni siquiera es una URL no es de ninguna familia: va fuera del censo.
    return undefined;
  }
}

/** Las familias con alguna URL publicada. Una sin publicar no tiene tráfico que medir. */
export function familiasPublicadas(censo: CensoPorFamilia): Familia[] {
  return FAMILIAS.filter((f) => (censo[f]?.length ?? 0) > 0);
}

/**
 * Reparte las filas por página entre las familias publicadas.
 *
 * Cada familia con URL publicadas sale siempre, también si no tiene ninguna fila: la
 * consulta se leyó bien y la fuente no trae nada suyo, y eso es un cero de verdad. Una
 * familia **sin** URL publicadas se omite, como en la indexación, para que «sin publicar»
 * no se lea como «sin tráfico». Lo que no casa con el censo —la portada, una página 2, una
 * Cita retirada, otro host— se suma aparte en `fueraDelCenso`.
 */
export function agregarPorFamilia(
  filas: readonly FilaDeTrafico[],
  censo: CensoPorFamilia,
  dominio: string,
): { familias: Partial<Record<Familia, Metricas>>; fueraDelCenso: FueraDelCenso } {
  const mapa = familiaPorRuta(censo);
  const acumulados = Object.fromEntries(FAMILIAS.map((f) => [f, vacio()])) as Record<
    Familia,
    Acumulado
  >;
  const fuera = vacio();

  for (const fila of filas) {
    const familia = familiaDePagina(mapa, dominio, fila.keys?.[0] ?? undefined);
    sumar(familia === undefined ? fuera : acumulados[familia], fila);
  }

  return {
    familias: Object.fromEntries(
      familiasPublicadas(censo).map((f) => [f, metricasDe(acumulados[f])]),
    ) as Partial<Record<Familia, Metricas>>,
    fueraDelCenso: { clics: fuera.clics, impresiones: fuera.impresiones },
  };
}

/** Una entrada de la serie, antes de escribirse. */
export interface LecturaDeMes {
  /** La clave de reemplazo: `AAAA-MM`. */
  mes: string;
  /** La jornada local en la que se leyó. */
  leidoEl: string;
  propiedad: string;
  /** Solo en el mes en curso. Ausente es «mes cerrado». */
  parcial?: true;
  total: Metricas;
  /** Solo las familias leídas. */
  familias: Partial<Record<Familia, Metricas>>;
  /** Ausente cuando la consulta por página no se leyó. */
  fueraDelCenso?: FueraDelCenso;
  /** Solo las familias que no se leyeron, con su motivo. */
  sinLeer: Partial<Record<Familia, string>>;
}

/** Un mes entero que no se leyó, con su motivo. No se escribe: se informa. */
export interface MesSinLeer {
  mes: string;
  motivo: string;
}

/** Lo que devuelve una pasada: los meses leídos y los que no. */
export interface LecturaDeTrafico {
  propiedad: string;
  leidoEl: string;
  meses: LecturaDeMes[];
  sinLeer: MesSinLeer[];
}

/**
 * Compone la entrada de un mes, y es **la puerta de «ausencia antes que cero»**.
 *
 * Se niega a una familia a la vez leída y sin leer, a un motivo en blanco —`aYaml` omite
 * las cadenas vacías y la familia desaparecería de las dos listas al escribirse— y a una
 * familia que no esté en ninguna de las dos.
 */
export function componerLecturaDeTrafico(entrada: {
  mes: MesALeer;
  momento: Date;
  propiedad: string;
  /** El censo de hoy: decide qué familias tienen que aparecer en la entrada. */
  censo: CensoPorFamilia;
  total: Metricas;
  /** El reparto por página, si se leyó. */
  porPagina?: { familias: Partial<Record<Familia, Metricas>>; fueraDelCenso: FueraDelCenso };
  sinLeer: readonly FamiliaSinLeer[];
}): LecturaDeMes {
  const familias: Partial<Record<Familia, Metricas>> = { ...(entrada.porPagina?.familias ?? {}) };
  const sinLeer: Partial<Record<Familia, string>> = {};

  for (const { familia, motivo } of entrada.sinLeer) {
    if (motivo.trim() === '') {
      throw new Error(
        `La familia ${NOMBRE_DE_FAMILIA[familia]} llega sin leer y sin motivo en ${entrada.mes.mes}. ` +
          'Un motivo en blanco se omite al escribir el fichero, así que la familia ' +
          'desaparecería de la entrada sin que nadie lo dijera.',
      );
    }
    if (familias[familia] !== undefined) {
      throw new Error(
        `La familia ${NOMBRE_DE_FAMILIA[familia]} llega a la vez leída y sin leer en ` +
          `${entrada.mes.mes}. Una entrada no puede afirmar las dos cosas.`,
      );
    }
    sinLeer[familia] = motivo;
  }

  const publicadas = familiasPublicadas(entrada.censo);
  for (const familia of FAMILIAS) {
    if (!publicadas.includes(familia)) {
      if (familias[familia] !== undefined || sinLeer[familia] !== undefined) {
        throw new Error(
          `La familia ${NOMBRE_DE_FAMILIA[familia]} no tiene URL publicadas y llega en la ` +
            `entrada de ${entrada.mes.mes}. «Sin publicar» no es «sin tráfico».`,
        );
      }
      continue;
    }
    if (familias[familia] === undefined && sinLeer[familia] === undefined) {
      throw new Error(
        `La familia ${NOMBRE_DE_FAMILIA[familia]} no llega ni leída ni con un motivo de no ` +
          `haberse leído en ${entrada.mes.mes}. Se omitiría de la entrada sin decirlo.`,
      );
    }
  }

  return {
    mes: entrada.mes.mes,
    leidoEl: jornadaLocal(entrada.momento),
    propiedad: entrada.propiedad,
    ...(entrada.mes.parcial ? { parcial: true as const } : {}),
    total: entrada.total,
    familias,
    ...(entrada.porPagina === undefined ? {} : { fueraDelCenso: entrada.porPagina.fueraDelCenso }),
    sinLeer,
  };
}

/** Una línea de informe con las cuatro cifras. La comparte la demanda (Historia 20.3). */
export function lineaDeMetricas(m: Metricas): string {
  const ctr = m.ctr === undefined ? '—' : `${(m.ctr * 100).toFixed(2)} %`;
  const posicion = m.posicion === undefined ? '—' : m.posicion.toFixed(1);
  return `${m.clics} clics, ${m.impresiones} impresiones, CTR ${ctr}, posición ${posicion}`;
}

/**
 * El informe en pantalla. Lo comparten la consulta y el registro.
 *
 * Lo que no se leyó —un mes entero o una familia de un mes— sale nombrado con su motivo,
 * nunca como cero.
 */
export function lineasDeTrafico(lectura: LecturaDeTrafico): string[] {
  const lineas = [
    'Tráfico orgánico por mes y familia',
    '══════════════════════════════════',
    '',
    `Propiedad: ${lectura.propiedad}`,
    `Leído el:  ${lectura.leidoEl}`,
    'Son clics de Search Console, no sesiones (SM-2).',
  ];

  for (const mes of lectura.meses) {
    lineas.push(
      '',
      `${mes.mes}${mes.parcial ? ' (parcial: mes en curso o dentro del retardo de los datos)' : ''}`,
    );
    lineas.push(`  Total:     ${lineaDeMetricas(mes.total)}`);
    for (const familia of FAMILIAS) {
      const leida = mes.familias[familia];
      if (leida !== undefined) {
        lineas.push(`  ${`${NOMBRE_DE_FAMILIA[familia]}:`.padEnd(10)} ${lineaDeMetricas(leida)}`);
      }
    }
    if (mes.fueraDelCenso !== undefined) {
      lineas.push(
        `  Fuera del censo: ${mes.fueraDelCenso.clics} clics, ` +
          `${mes.fueraDelCenso.impresiones} impresiones (portada, páginas 2+, retiradas, otro host…)`,
      );
    }
    for (const familia of FAMILIAS) {
      const motivo = mes.sinLeer[familia];
      if (motivo !== undefined) {
        lineas.push(`  ${NOMBRE_DE_FAMILIA[familia]} sin leer —no se escribe como cero—: ${motivo}`);
      }
    }
  }

  if (lectura.sinLeer.length > 0) {
    lineas.push('', 'Meses sin leer —no se escriben; se conserva la entrada anterior si la había—');
    for (const { mes, motivo } of lectura.sinLeer) lineas.push(`  ${mes}: ${motivo}`);
  }

  return lineas;
}

/**
 * Lo que se dice cuando falta la credencial, **sin repetir su valor**. El equivalente de
 * `MOTIVOS_SIN_CREDENCIALES` de la indexación, que habla de otra lectura, generalizado para
 * que la serie de demanda (Historia 20.3) diga lo mismo de lo suyo sin copiarlo.
 *
 * `queSeLee` es lo que no se puede preguntar («el tráfico orgánico»); `unidad`, lo que se
 * escribiría sin leer («un mes»).
 */
export function motivosSinCredenciales(queSeLee: string, unidad: string): readonly string[] {
  return [
    `Falta ${VARIABLE_DE_CREDENCIALES}: no hay con qué preguntar por ${queSeLee}.`,
    '',
    `No se ha escrito nada. Escribir ${unidad} sin leer sería un cero fabricado, y`,
    'la serie dejaría de significar lo que dice que significa.',
    '',
    'Es la misma credencial que la de `npm run indexacion`, y el paso manual está en',
    'DESPLIEGUE.md §5:',
    '  · una cuenta de servicio de Google con la API de Search Console habilitada;',
    `  · su clave JSON en ${VARIABLE_DE_CREDENCIALES} —el JSON entero, o la ruta del fichero—;`,
    '  · y la cuenta dada de alta como PROPIETARIA de la propiedad en Search Console, igual',
    '    que para la indexación.',
  ];
}

/** Lo que dice la serie de tráfico cuando falta la credencial. */
export const MOTIVOS_SIN_CREDENCIALES_DE_TRAFICO: readonly string[] = motivosSinCredenciales(
  'el tráfico orgánico',
  'un mes',
);
