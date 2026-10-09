/**
 * Qué Autores y qué Citas reciben impresiones y clics — Historia 20.3, FR-49.
 *
 * Hermano puro de `tools/lib/trafico.ts`, y con la misma frontera (AD-22): aquí no entra la
 * red. Esto decide qué ventanas se leen, reparte las filas por página que ya devolvió la
 * fuente entre Autores, Citas y familias, y compone la entrada de la serie. Quien pregunta es
 * `tools/demanda.ts`.
 *
 * ── Por página, nunca por consulta ───────────────────────────────────────────────────
 *
 * Search Analytics anonimiza las consultas poco frecuentes: agregar por consulta perdería
 * justo la cola larga de la que vive un sitio de Citas. Por página, las filas llegan enteras.
 *
 * ── De qué Autor es una ruta ─────────────────────────────────────────────────────────
 *
 * Una ruta es de Cita si, tras `rutaNormalizada`, es `/cita/<slug>`, esté la Cita publicada o
 * ya retirada. Su Autor sale del slug —el de `corpus/autores/` que sea prefijo más largo de
 * `<slug>-`, por `autorPorPrefijo`—, no del censo: una Cita retirada sigue diciendo qué Autor
 * se buscaba. Una ruta de Cita sin ningún prefijo de Autor va a `sinAutor` y se nombra en el
 * informe; **nunca se descarta en silencio**.
 *
 * Las tres cuentas son disjuntas: cada fila de Cita del host canónico cae en `citas`, en
 * `resto` o en `sinAutor`, y Σ `citas` + `resto` = Σ `autores`. La Página de Autor no suma a
 * su Autor: cuenta en la familia Autor, que es otra pregunta.
 */

import { rutaNormalizada } from '../../src/lib/superficies.ts';
import { autorPorPrefijo } from './autoria.ts';
import {
  FAMILIAS,
  NOMBRE_DE_FAMILIA,
  type CensoPorFamilia,
  type Familia,
} from './indexacion.ts';
import {
  MESES_QUE_CONSERVA_LA_FUENTE,
  RETARDO_DE_DATOS_FINALES_EN_DIAS,
  agregarPorFamilia,
  jornadaLocal,
  lineaDeMetricas,
  mesesALeer,
  motivosSinCredenciales,
  type FilaDeTrafico,
  type FueraDelCenso,
  type Metricas,
} from './trafico.ts';

/**
 * Por debajo de estas impresiones, una Cita no se versiona en `citas`: se suma en `resto`.
 *
 * Con miles de Citas y la mayoría vistas una o dos veces, versionarlas todas haría de cada
 * entrada un listado de ruido. Sus impresiones no se pierden: cuentan en su Autor y en
 * `resto`, que dice cuántas Citas, clics e impresiones se quedaron fuera.
 */
export const MIN_IMPRESIONES_POR_FILA = 5;

/** Los días de la ventana móvil. */
export const DIAS_DE_LA_VENTANA = 28;

/** Las dos clases de ventana de la serie. */
export const CLASES_DE_VENTANA = ['28-dias', 'mes'] as const;
export type ClaseDeVentana = (typeof CLASES_DE_VENTANA)[number];

/** Una ventana que leer. La clave de reemplazo de la serie es el par `desde`–`hasta`. */
export interface Ventana {
  desde: string;
  hasta: string;
  clase: ClaseDeVentana;
}

/** Una fecha `AAAA-MM-DD` de un día que existe. */
export function esJornadaDeSerie(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

/** La clave de reemplazo de una ventana: el par `desde`–`hasta`. */
export const claveDeVentana = (v: { desde: unknown; hasta: unknown }): string =>
  `${String(v.desde)}–${String(v.hasta)}`;

/**
 * Las ventanas de una pasada.
 *
 * Siempre la de 28 días: termina en el último día con datos definitivos —hoy menos
 * `RETARDO_DE_DATOS_FINALES_EN_DIAS`— y empieza 27 días antes. Dos lecturas el mismo día dan
 * la misma ventana, y la segunda reemplaza a la primera. El día es el del calendario local de
 * quien ejecuta; la fuente fecha en hora del Pacífico, así que los extremos pueden quedar
 * desplazados un día respecto de lo que se vivió aquí.
 *
 * En la **primera lectura** —la serie no tiene ninguna entrada `mes`— se leen además los
 * meses **cerrados** de los 16 que conserva la fuente: ni el mes en curso ni uno cuyo último
 * día caiga dentro del retardo. Así la serie empieza con el pasado que la fuente aún guarda.
 *
 * Con `rellenar` (`--rellenar`) se piden los meses cerrados de los 16 que **falten** en la
 * serie —los de `registradas`, por su clave `desde`–`hasta`, no se repiten—. Es la vuelta
 * atrás de un mes que falló en la primera lectura, y la única forma de que la serie mensual
 * crezca después de ella. Del más antiguo al más reciente, y la ventana de 28 días al final.
 */
export function ventanasALeer(
  hoy: Date,
  primeraLectura: boolean,
  opciones: { rellenar?: boolean; registradas?: ReadonlySet<string> } = {},
): Ventana[] {
  const hasta = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() - RETARDO_DE_DATOS_FINALES_EN_DIAS,
  );
  const desde = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate() - (DIAS_DE_LA_VENTANA - 1));
  const movil: Ventana = { desde: jornadaLocal(desde), hasta: jornadaLocal(hasta), clase: '28-dias' };
  if (!primeraLectura && opciones.rellenar !== true) return [movil];

  const registradas = opciones.registradas ?? new Set<string>();
  const meses = mesesALeer(hoy, MESES_QUE_CONSERVA_LA_FUENTE)
    .filter((mes) => !mes.parcial)
    .map((mes): Ventana => ({ desde: mes.desde, hasta: mes.hasta, clase: 'mes' }))
    .filter((v) => !registradas.has(claveDeVentana(v)));
  return [...meses, movil];
}

/** La demanda de un Autor: las filas de sus Citas, todas, también las de debajo del umbral. */
export interface DemandaDeAutor {
  autor: string;
  clics: number;
  impresiones: number;
}

/** La demanda de una Cita con al menos `MIN_IMPRESIONES_POR_FILA` impresiones. */
export interface DemandaDeCita {
  cita: string;
  clics: number;
  impresiones: number;
}

/** Las rutas de Cita sin prefijo de Autor del Corpus. */
export interface SinAutor {
  rutas: number;
  clics: number;
  impresiones: number;
}

/** Las Citas por debajo del umbral, que no se versionan una a una. */
export interface Resto {
  /**
   * Cuántas **Citas** —tras fundir las formas con y sin barra de una misma ruta—, no cuántas
   * filas de la fuente. El nombre es el de la forma de la serie, fijada en el spec.
   */
  filas: number;
  clics: number;
  impresiones: number;
}

/** El reparto de una ventana. */
export interface AgregadoDeDemanda {
  /** Por impresiones descendentes; a igualdad, por slug. */
  autores: DemandaDeAutor[];
  /** Solo las de `MIN_IMPRESIONES_POR_FILA` o más, por impresiones descendentes. */
  citas: DemandaDeCita[];
  sinAutor: SinAutor;
  resto: Resto;
  familias: Partial<Record<Familia, Metricas>>;
  fueraDelCenso: FueraDelCenso;
  /** Solo para el informe —no se escribe—: los slugs que fueron a `sinAutor`. */
  slugsSinAutor: string[];
  /** Solo para el informe —no se escribe—: toda Cita con clic, también bajo el umbral. */
  citasConClic: DemandaDeCita[];
}

/**
 * El slug de Cita de una clave `page`, o `undefined` si no es una ruta de Cita del host
 * canónico.
 *
 * El host se juzga como en el reparto por familia: la propiedad es `sc-domain:` y trae también
 * `www.`, `http:` y otros subdominios, que no son la URL publicada. Esas filas cuentan en
 * `fueraDelCenso` y no en ningún Autor.
 */
function slugDeCitaDePagina(pagina: string | undefined, dominio: string): string | undefined {
  if (pagina === undefined) return undefined;
  try {
    const url = new URL(pagina);
    if (url.protocol !== 'https:' || url.host !== dominio) return undefined;
    // Decodificada y en minúsculas antes de atribuir: `/cita/S%C3%A9neca-…` y `/cita/Seneca-…`
    // no son otra Cita. Una secuencia `%` rota se deja como llegó.
    let camino = url.pathname;
    try {
      camino = decodeURIComponent(camino);
    } catch {
      // se queda sin decodificar
    }
    const ruta = rutaNormalizada(camino.toLowerCase());
    const coincide = /^\/cita\/([^/]+)$/.exec(ruta);
    return coincide?.[1];
  } catch {
    return undefined;
  }
}

const porImpresiones = <T extends { impresiones: number }>(clave: (x: T) => string) =>
  (a: T, b: T) => b.impresiones - a.impresiones || clave(a).localeCompare(clave(b));

/**
 * Reparte las filas por página de una ventana entre Autores, Citas y familias.
 *
 * La familia la decide `agregarPorFamilia` de la serie de tráfico —censo, host canónico y
 * `fueraDelCenso` incluidos—, así que una Cita retirada cuenta en su Autor y, en el reparto
 * por familia, en `fueraDelCenso`. Las filas que la fuente parta en dos formas de la misma
 * ruta (con y sin barra) se juntan en una sola Cita antes de aplicar el umbral.
 */
export function agregarDemanda(
  filas: readonly FilaDeTrafico[],
  opciones: { slugsDeAutores: readonly string[]; censo: CensoPorFamilia; dominio: string },
): AgregadoDeDemanda {
  const { familias, fueraDelCenso } = agregarPorFamilia(filas, opciones.censo, opciones.dominio);

  const porCita = new Map<string, { clics: number; impresiones: number }>();
  for (const fila of filas) {
    const slug = slugDeCitaDePagina(fila.keys?.[0] ?? undefined, opciones.dominio);
    if (slug === undefined) continue;
    const acumulado = porCita.get(slug) ?? { clics: 0, impresiones: 0 };
    acumulado.clics += fila.clicks ?? 0;
    acumulado.impresiones += fila.impressions ?? 0;
    porCita.set(slug, acumulado);
  }

  const autores = new Map<string, DemandaDeAutor>();
  const citas: DemandaDeCita[] = [];
  const citasConClic: DemandaDeCita[] = [];
  const sinAutor: SinAutor = { rutas: 0, clics: 0, impresiones: 0 };
  const resto: Resto = { filas: 0, clics: 0, impresiones: 0 };
  const slugsSinAutor: string[] = [];

  for (const [cita, { clics, impresiones }] of porCita) {
    const autor = autorPorPrefijo(cita, opciones.slugsDeAutores);
    if (autor === undefined) {
      sinAutor.rutas += 1;
      sinAutor.clics += clics;
      sinAutor.impresiones += impresiones;
      slugsSinAutor.push(cita);
      continue;
    }
    const suyo = autores.get(autor) ?? { autor, clics: 0, impresiones: 0 };
    suyo.clics += clics;
    suyo.impresiones += impresiones;
    autores.set(autor, suyo);

    if (clics > 0) citasConClic.push({ cita, clics, impresiones });
    if (impresiones >= MIN_IMPRESIONES_POR_FILA) {
      citas.push({ cita, clics, impresiones });
    } else {
      resto.filas += 1;
      resto.clics += clics;
      resto.impresiones += impresiones;
    }
  }

  return {
    autores: [...autores.values()].sort(porImpresiones((a) => a.autor)),
    citas: citas.sort(porImpresiones((c) => c.cita)),
    sinAutor,
    resto,
    familias,
    fueraDelCenso,
    slugsSinAutor: slugsSinAutor.sort(),
    citasConClic: citasConClic.sort(
      (a, b) => b.clics - a.clics || b.impresiones - a.impresiones || a.cita.localeCompare(b.cita),
    ),
  };
}

/** Una entrada de la serie, antes de escribirse. */
export interface LecturaDeVentana extends Ventana, AgregadoDeDemanda {
  /** La jornada local en la que se leyó. */
  leidoEl: string;
  propiedad: string;
  /**
   * La fuente contestó sin ninguna fila. Es una lectura real —toda ventana que se pide ya
   * salió del retardo de los datos definitivos—, y se escribe: «sin demanda» no es «no
   * leído». Ausente cuando hubo filas.
   */
  vacia?: true;
}

/** Una ventana que no se leyó, con su motivo. No se escribe: se informa. */
export interface VentanaSinLeer extends Ventana {
  motivo: string;
}

/** Lo que devuelve una pasada. */
export interface LecturaDeDemanda {
  propiedad: string;
  leidoEl: string;
  /** Si la serie no tenía ninguna entrada `mes` y por eso se pidieron también los meses. */
  primeraLectura: boolean;
  /** Si se pidieron los meses cerrados que faltaban (`--rellenar`). */
  rellenar?: boolean;
  ventanas: LecturaDeVentana[];
  sinLeer: VentanaSinLeer[];
}

const sumaDe = (xs: readonly { clics: number; impresiones: number }[]) =>
  xs.reduce((s, x) => ({ clics: s.clics + x.clics, impresiones: s.impresiones + x.impresiones }), {
    clics: 0,
    impresiones: 0,
  });

/**
 * Compone la entrada de una ventana, y se niega a lo que la serie no podría releer igual: una
 * ventana mal formada o al revés, una clase que no existe, y un reparto en el que Σ `citas` +
 * `resto` no sea Σ `autores` — que sería una Cita contada en un sitio y no en el otro.
 */
export function componerLecturaDeDemanda(entrada: {
  ventana: Ventana;
  momento: Date;
  propiedad: string;
  agregado: AgregadoDeDemanda;
  /** La fuente contestó sin filas. */
  vacia?: boolean;
}): LecturaDeVentana {
  const { ventana, agregado } = entrada;
  if (!esJornadaDeSerie(ventana.desde) || !esJornadaDeSerie(ventana.hasta)) {
    throw new Error(
      `La ventana ${ventana.desde}–${ventana.hasta} no tiene la forma AAAA-MM-DD en sus dos ` +
        'extremos, y la serie reemplaza por ese par.',
    );
  }
  if (ventana.desde > ventana.hasta) {
    throw new Error(`La ventana ${ventana.desde}–${ventana.hasta} empieza después de terminar.`);
  }
  if (!CLASES_DE_VENTANA.includes(ventana.clase)) {
    throw new Error(`«${String(ventana.clase)}» no es una clase de ventana: ${CLASES_DE_VENTANA.join(', ')}.`);
  }
  const deAutores = sumaDe(agregado.autores);
  const deCitas = sumaDe([...agregado.citas, agregado.resto]);
  if (deAutores.clics !== deCitas.clics || deAutores.impresiones !== deCitas.impresiones) {
    throw new Error(
      `En ${ventana.desde}–${ventana.hasta}, las Citas y el resto suman ${deCitas.impresiones} ` +
        `impresiones y los Autores ${deAutores.impresiones}: alguna Cita quedaría contada en ` +
        'un sitio y no en el otro.',
    );
  }
  return {
    desde: ventana.desde,
    hasta: ventana.hasta,
    clase: ventana.clase,
    leidoEl: jornadaLocal(entrada.momento),
    propiedad: entrada.propiedad,
    ...(entrada.vacia === true ? { vacia: true as const } : {}),
    ...agregado,
  };
}

const NOMBRE_DE_CLASE: Record<ClaseDeVentana, string> = {
  '28-dias': 'últimos 28 días con datos definitivos',
  mes: 'mes cerrado',
};

/**
 * El informe en pantalla. Lo comparten la consulta y el registro.
 *
 * Lo que no se leyó sale nombrado con su motivo, nunca como cero; y lo que no tiene Autor
 * sale nombrado por su slug.
 */
export function lineasDeDemanda(lectura: LecturaDeDemanda): string[] {
  const lineas = [
    'Demanda medida por página',
    '═════════════════════════',
    '',
    `Propiedad: ${lectura.propiedad}`,
    `Leído el:  ${lectura.leidoEl}`,
    lectura.primeraLectura
      ? 'Primera lectura: la serie no tenía meses, así que se leen también los meses cerrados.'
      : lectura.rellenar === true
        ? 'Rellenar: se leen también los meses cerrados que faltan en la serie.'
        : 'La serie ya tiene sus meses: solo se lee la ventana de 28 días (los meses cerrados ' +
          'que falten se piden con --rellenar).',
    'Las ventanas de 28 días se solapan: no se suman entre sí ni con las mensuales.',
    'Son clics e impresiones de Search Console agregados por página, nunca por consulta.',
  ];

  for (const v of lectura.ventanas) {
    lineas.push('', `${v.desde} — ${v.hasta} (${NOMBRE_DE_CLASE[v.clase]})`);
    if (v.vacia === true) {
      lineas.push('  Vacía: la fuente contestó sin ninguna fila. Se escribe: sin demanda, no sin leer.');
      continue;
    }

    lineas.push('  Autores, por impresiones:');
    if (v.autores.length === 0) lineas.push('    (ninguna Cita con Autor tuvo impresiones)');
    for (const a of v.autores) {
      lineas.push(`    ${a.autor}: ${a.impresiones} impresiones, ${a.clics} clics`);
    }

    lineas.push('  Citas con al menos un clic:');
    if (v.citasConClic.length === 0) lineas.push('    (ninguna)');
    for (const c of v.citasConClic) {
      const bajo = c.impresiones < MIN_IMPRESIONES_POR_FILA ? ' —bajo el umbral: va en el resto—' : '';
      lineas.push(`    ${c.cita}: ${c.clics} clics, ${c.impresiones} impresiones${bajo}`);
    }

    lineas.push('  Por familia:');
    for (const familia of FAMILIAS) {
      const m = v.familias[familia];
      if (m !== undefined) {
        lineas.push(`    ${`${NOMBRE_DE_FAMILIA[familia]}:`.padEnd(10)} ${lineaDeMetricas(m)}`);
      }
    }
    lineas.push(
      `    Fuera del censo: ${v.fueraDelCenso.clics} clics, ${v.fueraDelCenso.impresiones} ` +
        'impresiones (portada, páginas 2+, Citas retiradas, otro host…)',
    );

    lineas.push(
      `  Resto —Citas con menos de ${MIN_IMPRESIONES_POR_FILA} impresiones, no versionadas una a ` +
        `una—: ${v.resto.filas} Citas, ${v.resto.clics} clics, ${v.resto.impresiones} impresiones`,
    );
    if (v.sinAutor.rutas === 0) {
      lineas.push('  Sin Autor: ninguna ruta de Cita sin prefijo de Autor del Corpus.');
    } else {
      lineas.push(
        `  Sin Autor —ningún slug de corpus/autores/ es su prefijo—: ${v.sinAutor.rutas} rutas, ` +
          `${v.sinAutor.clics} clics, ${v.sinAutor.impresiones} impresiones`,
      );
      for (const slug of v.slugsSinAutor) lineas.push(`    /cita/${slug}/`);
    }
  }

  if (lectura.sinLeer.length > 0) {
    lineas.push('', 'Ventanas sin leer —no se escriben; se conserva la entrada anterior si la había—');
    for (const v of lectura.sinLeer) {
      lineas.push(`  ${v.desde} — ${v.hasta} (${NOMBRE_DE_CLASE[v.clase]}): ${v.motivo}`);
    }
  }

  return lineas;
}

/** Lo que dice la serie de demanda cuando falta la credencial, sin repetir su valor. */
export const MOTIVOS_SIN_CREDENCIALES_DE_DEMANDA: readonly string[] = motivosSinCredenciales(
  'la demanda por página',
  'una ventana',
);
