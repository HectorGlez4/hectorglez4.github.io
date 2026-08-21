/**
 * Extracción de candidatas desde una Fuente — FR-23.
 *
 * Puro y sin red: recibe el documento ya descargado y devuelve candidatas. La descarga
 * vive en `tools/extraer.ts`, que es una capa fina encima. Así lo que decide qué se
 * propone —y sobre todo qué no— se puede probar entero sin depender de que un servidor
 * de fuera esté disponible y diga hoy lo mismo que ayer.
 *
 * Lo que esta extracción **no** hace, y es la mitad del criterio: no completa la
 * Procedencia. Ni deduce el año de la fecha de fallecimiento del Autor, ni acepta un año
 * aproximado de la Fuente. Lo que no consta se omite; nunca se aproxima.
 *
 * Desde la Historia 11.5 tampoco propone lo que no se puede leer. Aquí y no en el cotejo:
 * el cotejo comprueba que una Cita es fiel a su documento, y un escaneo con el OCR roto
 * cumple eso perfectamente. Son dos puertas y las dos tienen que estar.
 */

import {
  SEÑALES,
  medirLegibilidad,
  type MedidaDeLegibilidad,
} from '../../src/lib/legibilidad.ts';
import { porcentajeEnEspañol } from '../../src/lib/formato.ts';
import { MAX_PROPORCION_ILEGIBLE } from '../../src/lib/umbrales.ts';
import { fuenteDe, type Fuente } from './fuentes.ts';

/** El documento tal y como lo entrega la Fuente, con su metadato de obra y año. */
export interface DocumentoDeFuente {
  /** Identificador de la Fuente en el conjunto cerrado. */
  fuente: string;
  /** Obra, tal y como la declara la Fuente. */
  obra: string;
  /** Año declarado por la Fuente. Puede venir aproximado; ver `añoExacto`. */
  año?: string | number;
  /**
   * Dirección concreta del documento, para poder volver a él.
   *
   * Obligatoria desde la Historia 11.2: `fuenteDeCita` la exige en el esquema, así que
   * una candidata sin ella nace inaprobable y el desacuerdo solo se veía al revisar,
   * lejos de donde se causó. Todo documento versionado la trae en su cabecera.
   */
  url: string;
  texto: string;
}

export interface Candidata {
  texto: string;
  autor: string;
  procedencia: { obra: string; año?: number };
  /** De dónde salió el texto y bajo qué licencia — el criterio lo exige por candidata. */
  fuente: { id: string; nombre: string; licencia: string; url: string };
}

export type Descarte =
  | { texto: string; motivo: 'no-esta-en-español' }
  | { texto: string; motivo: 'longitud' }
  | { texto: string; motivo: 'repetida' }
  | { texto: string; motivo: 'ilegible' };

export type ResultadoDeExtraccion =
  | { ok: true; candidatas: Candidata[]; descartadas: Descarte[] }
  | { ok: false; motivo: string };

/**
 * La ventana de longitud de una candidata.
 *
 * Por debajo del mínimo no es una Cita, es un fragmento de frase que no se sostiene fuera
 * de su párrafo. El máximo no es el corte de FR-10 —una Cita puede pasarlo y publicarse
 * igual, solo que sin Imagen—, sino el punto a partir del cual una frase suelta deja de
 * poder leerse como sentencia.
 */
export const MIN_CARACTERES_CANDIDATA = 40;
export const MAX_CARACTERES_CANDIDATA = 240;

/**
 * Palabras que solo son frecuentes en español, y las que delatan otra lengua.
 *
 * No es un identificador de idioma de propósito general y no pretende serlo. Es la
 * comprobación concreta que pide el criterio: una obra en español con pasajes en latín
 * —Gracián, Quevedo y media Edad de Oro citan en latín— no debe proponer esos pasajes.
 */
const ESPAÑOLAS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'por', 'con',
  'para', 'su', 'sus', 'es', 'se', 'no', 'al', 'lo', 'como', 'más', 'pero', 'sin',
  'sobre', 'ni', 'porque', 'cuando', 'quien', 'todo', 'todos', 'nada', 'hay', 'ser',
]);

const AJENAS = new Set([
  // latín
  'est', 'non', 'quod', 'qui', 'sed', 'cum', 'atque', 'enim', 'nec', 'ipse', 'omnia',
  // inglés
  'the', 'and', 'of', 'to', 'is', 'that', 'it', 'with', 'for', 'not', 'this',
  // francés
  'le', 'les', 'des', 'est', 'pas', 'dans', 'pour', 'qui', 'vous', 'nous', 'être',
  // italiano
  'gli', 'che', 'della', 'sono', 'perché', 'anche', 'questo',
  // portugués
  'não', 'uma', 'você', 'mais', 'está', 'são', 'muito',
]);

function palabras(texto: string): string[] {
  return texto
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p !== '');
}

/**
 * Si el texto está en español.
 *
 * Se compara el peso de las palabras funcionales españolas contra el de las ajenas, en
 * vez de buscar solo las españolas: un pasaje en latín dentro de una obra en español
 * puede traer alguna palabra que coincida, y contar solo aciertos lo daría por bueno.
 */
export function estaEnEspañol(texto: string): boolean {
  const todas = palabras(texto);
  if (todas.length < 6) return false;

  let españolas = 0;
  let ajenas = 0;
  for (const palabra of todas) {
    if (ESPAÑOLAS.has(palabra)) españolas += 1;
    // Una palabra puede estar en las dos listas («que», «qui»); manda el desempate.
    else if (AJENAS.has(palabra)) ajenas += 1;
  }

  // Una frase española cualquiera pasa holgadamente de una función de cada diez palabras.
  return españolas > ajenas && españolas / todas.length >= 0.12;
}

/**
 * El año de la Fuente, solo si es exacto.
 *
 * «c. 1615», «hacia 1615», «1615?» y «1615-1620» son aproximaciones, y FR-2 no admite
 * Procedencia aproximada. Se devuelve `undefined` y la candidata queda con obra y sin
 * año: procedencia parcial, que es un estado legítimo del modelo. Lo que no es legítimo
 * es escribir 1615 como si constara.
 */
export function añoExacto(declarado: string | number | undefined): number | undefined {
  if (declarado === undefined) return undefined;
  if (typeof declarado === 'number') return Number.isInteger(declarado) ? declarado : undefined;

  const limpio = declarado.trim();
  return /^-?\d{1,4}$/.test(limpio) ? Number(limpio) : undefined;
}

/** Parte el texto en sentencias, respetando las comillas angulares y los puntos suspensivos. */
function sentencias(texto: string): string[] {
  return texto
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[«"¿¡A-ZÁÉÍÓÚÑ])/u)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/**
 * Candidatas de un documento.
 *
 * Se detiene entera —sin proponer ni una— cuando la licencia de la Fuente no permite
 * reutilizar. Devolver «las que se puedan» sería peor que no devolver nada: dejaría en
 * revisión candidatas que nadie puede publicar y que alguien acabaría aprobando.
 */
/**
 * Si de esa Fuente se puede extraer, y si no, por qué no.
 *
 * Vive aparte porque la puerta se cruza dos veces: aquí, y antes de derivar nada en
 * `tools/extraer.ts`. Con el mensaje escrito en un solo sitio, una Fuente cuya licencia
 * no permite reutilizar recibe la misma explicación se detenga donde se detenga.
 */
export function fuenteUtilizable(
  id: string,
): { ok: true; fuente: Fuente } | { ok: false; motivo: string } {
  const fuente: Fuente | undefined = fuenteDe(id);
  if (fuente === undefined) {
    return {
      ok: false,
      motivo:
        `«${id}» no es una Fuente admitida. Las admitidas están en ` +
        'tools/lib/fuentes.ts, cada una con su licencia.',
    };
  }

  if (!fuente.permiteReutilizacion) {
    return {
      ok: false,
      motivo:
        `${fuente.nombre} no admite extracción: ${fuente.razon} ` +
        `(licencia declarada: ${fuente.licencia}). No se ha escrito ninguna candidata.`,
    };
  }

  return { ok: true, fuente };
}

/**
 * Si un texto pasa la puerta de legibilidad — Historia 11.5.
 *
 * Vale igual para el documento entero y para una candidata suelta, con el mismo umbral, y
 * el desnivel entre los dos casos es el que se busca: ver `MAX_PROPORCION_ILEGIBLE`.
 */
export function esLegible(medida: MedidaDeLegibilidad): boolean {
  return medida.proporcion <= MAX_PROPORCION_ILEGIBLE;
}

/** El porcentaje de una medida, escrito como lo escribe el proyecto: «4,3 %». */
function comoPorcentaje(proporcion: number): string {
  return porcentajeEnEspañol(Number((proporcion * 100).toFixed(1)));
}

/**
 * Por qué se rechaza un documento entero, con la medida y con lo que se vio.
 *
 * La medida va en el mensaje a propósito. Sin ella, «no se puede leer» es un veredicto sin
 * apelación posible: quien siembra no sabe si el documento está roto del todo o si le ha
 * faltado un pelo, ni si el umbral es el que hay que discutir.
 */
function motivoDeIlegible(medida: MedidaDeLegibilidad): string {
  const vistas = SEÑALES.filter((s) => medida.señales[s] > 0).join(', ');
  return (
    `El documento no se puede leer: ${medida.sospechosas} de sus ${medida.palabras} palabras ` +
    `traen señales de OCR roto (${comoPorcentaje(medida.proporcion)} %, por encima del ` +
    `${comoPorcentaje(MAX_PROPORCION_ILEGIBLE)} % admitido).\n` +
    `Señales vistas: ${vistas}. Por ejemplo: ${medida.ejemplos.map((e) => `«${e}»`).join(', ')}.\n` +
    'No se ha escrito ninguna candidata: una Cita sacada de aquí saldría mutilada y con la ' +
    'firma de su Autor, y el cotejo literal la daría por buena porque la basura está en el ' +
    'documento.\n' +
    'El documento se queda versionado tal cual. Recuperar es archivar lo que la Fuente da; ' +
    'lo que no puede es sembrar, y corregirlo a mano sería inventar lo que la edición decía.'
  );
}

export function extraerCandidatas(
  documento: DocumentoDeFuente,
  autor: string,
): ResultadoDeExtraccion {
  const utilizable = fuenteUtilizable(documento.fuente);
  if (!utilizable.ok) return utilizable;
  const { fuente } = utilizable;

  if (documento.obra.trim() === '') {
    return {
      ok: false,
      motivo:
        'El documento no declara obra. Sin obra, la Procedencia habría que inferirla, y ' +
        'FR-2 no lo admite.',
    };
  }

  /*
   * La puerta del documento entero, antes de proponer nada.
   *
   * Se detiene entero y no candidata a candidata porque cuando la edición está rota lo que
   * falla no son unas frases sino el testimonio: las que salieran limpias lo estarían por
   * suerte, y aprobarlas sería fiarse de un documento que ya se sabe que miente.
   */
  const medida = medirLegibilidad(documento.texto);
  if (!esLegible(medida)) return { ok: false, motivo: motivoDeIlegible(medida) };

  const año = añoExacto(documento.año);
  const descartadas: Descarte[] = [];
  const candidatas: Candidata[] = [];
  const vistas = new Set<string>();

  for (const sentencia of sentencias(documento.texto)) {
    const longitud = [...sentencia].length;

    if (longitud < MIN_CARACTERES_CANDIDATA || longitud > MAX_CARACTERES_CANDIDATA) {
      descartadas.push({ texto: sentencia, motivo: 'longitud' });
      continue;
    }

    if (!estaEnEspañol(sentencia)) {
      descartadas.push({ texto: sentencia, motivo: 'no-esta-en-español' });
      continue;
    }

    /*
     * Y la puerta por candidata, para el documento que solo está roto a trozos. Se
     * descarta entera: jamás se «arregla» el texto para que pase, porque corregir un OCR a
     * ojo es inventar lo que la edición decía. Ausencia antes que mutilación.
     */
    if (!esLegible(medirLegibilidad(sentencia))) {
      descartadas.push({ texto: sentencia, motivo: 'ilegible' });
      continue;
    }

    const clave = sentencia.toLocaleLowerCase('es');
    if (vistas.has(clave)) {
      descartadas.push({ texto: sentencia, motivo: 'repetida' });
      continue;
    }
    vistas.add(clave);

    candidatas.push({
      texto: sentencia,
      autor,
      procedencia: año === undefined ? { obra: documento.obra } : { obra: documento.obra, año },
      fuente: {
        id: fuente.id,
        nombre: fuente.nombre,
        licencia: fuente.licencia,
        url: documento.url,
      },
    });
  }

  return { ok: true, candidatas, descartadas };
}
