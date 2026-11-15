/**
 * Qué Obras curar primero — Historia 33.3, FR-62.
 *
 *   npm run obra -- curar-primero [--corpus corpus]
 *
 * Héctor cura las ediciones en venta ficha a ficha (`npm run obra -- edicion`), y esta orden le
 * dice por dónde empezar: las Obras publicadas **con edición cotejada** —la edición en venta
 * nunca va sola (FR-54)— y, desde la Historia 35.9 (FR-62 v9.1), las **con derechos vigentes**,
 * cuyas ediciones van solas (FR-70), también la de un Personaje sin Autor; con cuántas ediciones
 * declara ya cada una y cuántas son de una tienda sin marca, ordenadas por la demanda de la ventana de 28 días más reciente de
 * `corpus/serie-de-demanda.yml`. No propone ediciones ni tiendas, ni sugiere encender un Modelo
 * ni solicitar una cuenta: eso es de Héctor.
 *
 * **Solo lectura (AD-24).** No escribe nada, no pide credenciales ni red, y ningún módulo de
 * `src/`, `integraciones/` ni `astro.config.mjs` importa este fichero, lee la serie o recibe su
 * resultado. El cálculo es puro (`ventanaDeCuracion`, `componerCuracion`, `lineasDeCuracion`) y
 * la lectura de disco entra por efectos inyectados con valor por omisión (AD-22).
 *
 * **Ausencia antes que cero.** Sin ninguna ventana de 28 días legible —la serie vacía, solo
 * mensuales o una entrada que no se deja leer— cada candidata sale «sin cifra» con ese motivo,
 * nunca con 0, y no se recurre a otra ventana. Una Obra sin Citas en una ventana leída, o una
 * ventana leída sin filas (`vacia: true`), sí da 0: eso es una lectura. Con cifra, la demanda es
 * **provisional** —la serie no cuenta la Página de Obra— y **cota inferior** —las Citas con
 * menos de `MIN_IMPRESIONES_POR_FILA` impresiones van a `resto` y no se atribuyen—.
 */

import { colgarObras, congelacionVigente, type ObraResuelta } from '../../src/lib/obras.ts';
import { obrasDeLosDatos } from '../../src/lib/publicado.ts';
import { TIENDAS, tieneMarca, type Tienda } from '../../src/lib/ingreso.ts';
import type { CongelacionDeObras } from '../../src/lib/umbrales.ts';
import {
  leerAutores,
  leerCitas,
  leerEntradasDeLaSerieDeDemanda,
  leerFichasDeObra,
  type AutorEnCorpus,
  type CitaEnCorpus,
  type Rutas,
} from './corpus.ts';
import type { FichaDeObra } from '../../src/lib/obras.ts';
import {
  CLASES_DE_VENTANA,
  FAMILIAS_DE_LA_DEMANDA,
  MIN_IMPRESIONES_POR_FILA,
  esJornadaDeSerie,
} from './demanda.ts';
import type { Resultado } from './gestion.ts';

/** El error del lector ya nombra el fichero: la etiqueta no lo repite. */
const SERIE = 'la serie de demanda';
const NADA_ESCRITO = 'No se ha escrito nada.';

/** Una fila de `citas` de la ventana elegida, ya validada. */
interface FilaDeCita {
  cita: string;
  clics: number;
  impresiones: number;
}

/** La ventana de 28 días con la que se ordena, o por qué no hay ninguna. */
export type VentanaDeCuracion =
  | {
      conCifra: true;
      desde: string;
      hasta: string;
      /** Cuántas ventanas de 28 días legibles trae la serie. */
      de: number;
      vacia: boolean;
      citas: FilaDeCita[];
    }
  | { conCifra: false; motivo: string };

const esEnteroNoNegativo = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** «campo: valor» para el parte, o «sin «campo»» si no lo declara: nunca «undefined». */
const declarado = (campo: string, valor: unknown): string =>
  valor === undefined || valor === null
    ? `no declara «${campo}»`
    : `declara «${campo}: ${typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}»`;

/** Por qué una entrada de 28 días no se deja leer, o `undefined` si se deja. */
function problemaDeVentana(entrada: Record<string, unknown>): string | undefined {
  const { desde, hasta, citas, vacia } = entrada;
  for (const [campo, valor] of [['desde', desde], ['hasta', hasta]] as const) {
    if (!esJornadaDeSerie(valor)) return `${declarado(campo, valor)}, y no es un día AAAA-MM-DD que exista`;
  }
  if ((desde as string) > (hasta as string)) return `la ventana ${String(desde)}–${String(hasta)} empieza después de terminar`;
  if (vacia !== undefined && vacia !== true) return `${declarado('vacia', vacia)}, que solo puede valer true`;
  if (citas === undefined || citas === null) return undefined;
  if (!Array.isArray(citas)) return '«citas» no es una lista';
  // Una ventana leída sin filas no trae filas: las dos cosas a la vez se contradicen.
  if (vacia === true && citas.length > 0) return '«vacia: true» y a la vez filas en «citas»';
  // El escritor funde cada Cita en una fila: repetida, se contaría dos veces en su Obra.
  const vistas = new Set<string>();
  for (const [j, fila] of citas.entries()) {
    if (fila === null || typeof fila !== 'object' || Array.isArray(fila)) return `la fila ${j + 1} de «citas» no es una fila`;
    const { cita, clics, impresiones } = fila as Record<string, unknown>;
    if (typeof cita !== 'string') return `la fila ${j + 1} de «citas» no declara «cita» como texto`;
    if (!esEnteroNoNegativo(clics) || !esEnteroNoNegativo(impresiones)) {
      return `la fila ${j + 1} de «citas» no trae clics e impresiones enteros y no negativos`;
    }
    if (vistas.has(cita)) return `la fila ${j + 1} de «citas» repite «${cita}»`;
    vistas.add(cita);
  }
  return undefined;
}

/**
 * Elige la ventana: la `28-dias` de `hasta` más reciente, y a igual `hasta` la de `desde` más
 * reciente. Las mensuales nunca se usan y nunca se suman ventanas. Una entrada que no se deja
 * leer y puede ser de 28 días —una de esa clase mal formada, o una cuya clase no se sabe— deja
 * todo «sin cifra» nombrándola: elegir otra ventana sería esconder que esa no se leyó.
 */
export function ventanaDeCuracion(entradas: readonly unknown[]): VentanaDeCuracion {
  if (entradas.length === 0) {
    return { conCifra: false, motivo: 'la serie de demanda no tiene ninguna ventana leída' };
  }
  const legibles: Record<string, unknown>[] = [];
  for (const [i, entrada] of entradas.entries()) {
    const n = i + 1;
    if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
      return { conCifra: false, motivo: `la entrada ${n} de la serie de demanda no es una lectura` };
    }
    const registro = entrada as Record<string, unknown>;
    const { clase } = registro;
    if (!(CLASES_DE_VENTANA as readonly unknown[]).includes(clase)) {
      return {
        conCifra: false,
        motivo:
          `la entrada ${n} de la serie de demanda ${declarado('clase', clase)}, que no es ` +
          `${CLASES_DE_VENTANA.map((c) => `«${c}»`).join(' ni ')}, y podría ser de 28 días`,
      };
    }
    if (clase !== '28-dias') continue;
    const problema = problemaDeVentana(registro);
    if (problema !== undefined) {
      return {
        conCifra: false,
        motivo: `la entrada ${n} de la serie de demanda, de 28 días, no se deja leer: ${problema}`,
      };
    }
    // La serie reemplaza por el par `desde`–`hasta`: dos entradas con el mismo par son un
    // registro roto, y quedarse con la primera escondería cuál de las dos se leyó.
    const otra = legibles.findIndex((v) => v.desde === registro.desde && v.hasta === registro.hasta);
    if (otra !== -1) {
      return {
        conCifra: false,
        motivo:
          `las entradas ${entradas.indexOf(legibles[otra]) + 1} y ${n} de la serie de demanda son la ` +
          `misma ventana de 28 días, ${String(registro.desde)}–${String(registro.hasta)}`,
      };
    }
    legibles.push(registro);
  }
  if (legibles.length === 0) {
    return {
      conCifra: false,
      motivo: 'la serie de demanda no tiene ninguna ventana de 28 días leída (solo mensuales, que no se usan)',
    };
  }
  const elegida = legibles.reduce((mejor, v) => {
    const [h, hm] = [v.hasta as string, mejor.hasta as string];
    if (h !== hm) return h > hm ? v : mejor;
    return (v.desde as string) > (mejor.desde as string) ? v : mejor;
  });
  return {
    conCifra: true,
    desde: elegida.desde as string,
    hasta: elegida.hasta as string,
    de: legibles.length,
    vacia: elegida.vacia === true,
    citas: ((elegida.citas as FilaDeCita[] | undefined) ?? []).map(({ cita, clics, impresiones }) => ({
      cita,
      clics,
      impresiones,
    })),
  };
}

/** Una Obra que se propone curar. */
export interface CandidataDeCuracion {
  /** El nombre de su ficha: la identidad que toma `npm run obra -- edicion`. */
  ficha: string;
  titulo: string;
  /** El nombre de su Autor en `corpus/autores/`, o su slug si la ficha no lo trae. */
  autor: string;
  /** Cuántas ediciones declara ya su ficha; 0 si no declara ninguna. */
  ediciones: number;
  /** De ellas, cuántas son de una tienda declarada sin marca (Historia 33.1). */
  deTiendaSinMarca: number;
  /** Si la familia Obra está congelada (SM-11). */
  congelada: boolean;
  /**
   * Historia 35.9 — si la Obra tiene derechos vigentes: se propone aunque no tenga edición
   * cotejada, porque sus ediciones en venta van solas (FR-70), y la línea lo dice.
   */
  derechosVigentes: boolean;
  /** Ausentes cuando no hay cifra: nunca un 0 por una lectura que no existe. */
  impresiones?: number;
  clics?: number;
}

export type InformeDeCuracion =
  | { congelada: true; desde: string }
  | {
      congelada: false;
      candidatas: CandidataDeCuracion[];
      /**
       * Obras publicadas que no se proponen: sin derechos vigentes y sin edición cotejada, donde la
       * edición en venta iría sola.
       */
      fuera: number;
      ventana: VentanaDeCuracion;
      /** Filas de la ventana cuyo slug no es una Cita publicada o no resuelve a ninguna Obra. */
      noCuentan: number;
    };

/**
 * Las candidatas y su orden. `citas` son las Citas publicadas con su Obra colgada (`colgarObras`),
 * con el filtro de `obrasDelConjunto`: de un Autor publicado o, sin Autor, de un Personaje;
 * `obras`, las publicadas (`obrasDeLosDatos(...).publicadas`). Se proponen las cotejadas y las de
 * derechos vigentes (Historia 35.9); las demás cuentan en `fuera`.
 */
export function componerCuracion(datos: {
  obras: readonly ObraResuelta[];
  citas: readonly { slug: string; obra?: Pick<ObraResuelta, 'nombre'> }[];
  autores: readonly { slug: string; nombre?: string }[];
  congelacion: CongelacionDeObras | undefined;
  entradas: readonly unknown[];
  tiendas?: readonly Tienda[];
}): InformeDeCuracion {
  if (datos.congelacion !== undefined) return { congelada: true, desde: datos.congelacion.desde };

  const tiendas = datos.tiendas ?? TIENDAS;
  const sinMarca = new Set(tiendas.filter((t) => !tieneMarca(t)).map((t) => t.clave));
  const nombres = new Map(datos.autores.map((a) => [a.slug, a.nombre]));
  const obraDe = new Map<string, string>();
  for (const cita of datos.citas) if (cita.obra !== undefined) obraDe.set(cita.slug, cita.obra.nombre);

  const ventana = ventanaDeCuracion(datos.entradas);
  const demanda = new Map<string, { impresiones: number; clics: number }>();
  let noCuentan = 0;
  if (ventana.conCifra) {
    for (const fila of ventana.citas) {
      const obra = obraDe.get(fila.cita);
      if (obra === undefined) {
        noCuentan += 1;
        continue;
      }
      const suma = demanda.get(obra) ?? { impresiones: 0, clics: 0 };
      suma.impresiones += fila.impresiones;
      suma.clics += fila.clics;
      demanda.set(obra, suma);
    }
  }

  const propuestas = datos.obras.filter((o) => o.edicionCotejada || o.derechosVigentes);
  const candidatas = propuestas.map((obra): CandidataDeCuracion => {
    const ediciones = obra.ediciones ?? [];
    // Historia 35.2 — una Obra de Personaje puede no saber su Autor: se nombra por su dueño.
    const quien = obra.autor ?? obra.dueño.slug;
    const nombre = nombres.get(quien);
    return {
      ficha: obra.nombre,
      titulo: obra.titulo,
      autor: nombre !== undefined && nombre.trim() !== '' ? nombre : quien,
      ediciones: ediciones.length,
      deTiendaSinMarca: ediciones.filter((e) => sinMarca.has(e.tienda)).length,
      congelada: false,
      derechosVigentes: obra.derechosVigentes,
      ...(ventana.conCifra ? (demanda.get(obra.nombre) ?? { impresiones: 0, clics: 0 }) : {}),
    };
  });

  const porFicha = (a: CandidataDeCuracion, b: CandidataDeCuracion) => a.ficha.localeCompare(b.ficha, 'es');
  candidatas.sort(
    ventana.conCifra
      ? (a, b) => b.impresiones! - a.impresiones! || b.clics! - a.clics! || porFicha(a, b)
      : porFicha,
  );

  return { congelada: false, candidatas, fuera: datos.obras.length - propuestas.length, ventana, noCuentan };
}

const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/** El parte, línea a línea. */
export function lineasDeCuracion(informe: InformeDeCuracion): string[] {
  if (informe.congelada) {
    return [
      `La familia Obra está congelada por SM-11 desde el ${informe.desde} (CONGELACION_DE_OBRAS ` +
        'en src/lib/umbrales.ts): mientras lo esté, no se curan ediciones en venta y no se propone ninguna Obra.',
    ];
  }
  const { candidatas, ventana } = informe;
  const lineas = [
    `Qué Obras curar primero: ${plural(candidatas.length, 'Obra publicada', 'Obras publicadas')} con edición cotejada ` +
      'o con derechos vigentes.',
  ];
  if (ventana.conCifra) {
    lineas.push(
      `Ventana de 28 días: ${ventana.desde} – ${ventana.hasta} (la más reciente de ${ventana.de}).`,
      'Demanda provisional y cota inferior: la serie no cuenta la Página de Obra (sus familias son ' +
        `${FAMILIAS_DE_LA_DEMANDA.join(', ')}) y las Citas con menos de ${MIN_IMPRESIONES_POR_FILA} ` +
        'impresiones van a `resto`, sin Obra.',
      ventana.vacia
        ? 'La ventana se leyó sin ninguna fila: cada 0 es una lectura, no una ausencia.'
        : 'Una Obra sin Citas en la ventana da 0: es una lectura (cota inferior), no una ausencia.',
    );
  } else {
    lineas.push(
      `Sin cifra: ${ventana.motivo}.`,
      'No hay orden por demanda que dar: la lista va por nombre de ficha, y ese orden no es de prioridad.',
    );
  }
  candidatas.forEach((c, i) => {
    const demanda = ventana.conCifra
      ? `${plural(c.impresiones!, 'impresión', 'impresiones')}, ${plural(c.clics!, 'clic', 'clics')}`
      : 'sin cifra';
    const ediciones =
      plural(c.ediciones, 'edición declarada', 'ediciones declaradas') +
      (c.deTiendaSinMarca > 0 ? ` (${c.deTiendaSinMarca} de tienda sin marca)` : '');
    // Historia 35.9 — la de derechos vigentes lo dice: sus ediciones van solas, sin cotejada.
    const vigentes = c.derechosVigentes ? ' · con derechos vigentes: sus ediciones van solas' : '';
    lineas.push(`${i + 1}. ${c.ficha} · ${c.titulo} · ${c.autor} — ${demanda} · ${ediciones}${vigentes}`);
  });
  lineas.push(
    `Fuera por no tener edición cotejada ni derechos vigentes: ${plural(informe.fuera, 'Obra', 'Obras')}.`,
  );
  if (ventana.conCifra) {
    lineas.push(
      `Citas de la ventana que no cuentan (no publicadas o sin Obra): ${informe.noCuentan}.`,
    );
  }
  return lineas;
}

/** Lo que la orden lee de disco; las pruebas lo sustituyen. */
export interface EfectosDeCuracion {
  leerCitas: (directorio: string) => Promise<CitaEnCorpus[]>;
  leerAutores: (rutas: Rutas) => Promise<AutorEnCorpus[]>;
  leerFichasDeObra: (rutas: Rutas) => Promise<FichaDeObra[]>;
  leerEntradas: (rutas: Rutas) => Promise<unknown[]>;
}

const EFECTOS: EfectosDeCuracion = {
  leerCitas,
  leerAutores,
  leerFichasDeObra,
  leerEntradas: leerEntradasDeLaSerieDeDemanda,
};

/**
 * La orden entera: lee, compone e informa. Código 1 —sin escribir, nada se escribe nunca— si el
 * Corpus, una ficha o el fichero de la serie no se dejan leer, nombrando qué.
 */
export async function curarPrimero(
  rutas: Rutas,
  efectos: Partial<EfectosDeCuracion> = {},
  opciones: { congelacion?: CongelacionDeObras | null; tiendas?: readonly Tienda[] } = {},
): Promise<Resultado> {
  const leer = { ...EFECTOS, ...efectos };
  const fallo = (que: string, error: unknown): Resultado => ({
    ok: false,
    motivos: [`No se pudo leer ${que}: ${error instanceof Error ? error.message : String(error)}`, NADA_ESCRITO],
  });

  let citas: CitaEnCorpus[];
  let autores: AutorEnCorpus[];
  let fichas: FichaDeObra[];
  let entradas: unknown[];
  try {
    citas = await leer.leerCitas(rutas.citas);
  } catch (error) {
    return fallo('las Citas publicadas', error);
  }
  try {
    autores = await leer.leerAutores(rutas);
  } catch (error) {
    return fallo('los Autores', error);
  }
  try {
    fichas = await leer.leerFichasDeObra(rutas);
  } catch (error) {
    return fallo('las fichas de Obra', error);
  }
  try {
    entradas = await leer.leerEntradas(rutas);
  } catch (error) {
    return fallo(SERIE, error);
  }

  const congelacion =
    opciones.congelacion === undefined ? congelacionVigente() : (opciones.congelacion ?? undefined);
  const delSitio = new Set(autores.map((a) => a.slug));
  // Historia 35.9 — el filtro de `obrasDelConjunto`: la Cita de un Personaje sin Autor cuenta por
  // su Personaje, para que su Obra, con derechos vigentes, reciba su demanda.
  // Colgar las Obras juzga sus derechos y lanza ante una ficha cuyo Autor no está, o ante un plazo
  // sin año: la orden se niega con su resultado, no sale por una traza.
  let colgadas: ReturnType<typeof colgarObras<CitaEnCorpus>>;
  let publicadas: ReturnType<typeof obrasDeLosDatos>['publicadas'];
  try {
    colgadas = colgarObras(citas, fichas, autores).filter((c) =>
      c.autor === undefined ? c.personaje !== undefined : delSitio.has(c.autor),
    );
    // `null`: sin congelación para las indexables, que esta orden no lee; las `publicadas` no
    // dependen de ella. La congelación de la orden es la de arriba, y corta antes de proponer.
    ({ publicadas } = obrasDeLosDatos({ citas, autores, fichas }, null));
  } catch (error) {
    return fallo('las fichas de Obra', error);
  }

  const informe = componerCuracion({
    obras: publicadas,
    citas: colgadas,
    autores,
    congelacion,
    entradas,
    ...(opciones.tiendas !== undefined ? { tiendas: opciones.tiendas } : {}),
  });
  return { ok: true, ruta: rutas.serieDeDemanda, mensaje: lineasDeCuracion(informe).join('\n') };
}
