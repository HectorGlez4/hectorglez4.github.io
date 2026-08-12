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
 */

import { fuenteDe, type Fuente } from './fuentes.ts';

/** El documento tal y como lo entrega la Fuente, con su metadato de obra y año. */
export interface DocumentoDeFuente {
  /** Identificador de la Fuente en el conjunto cerrado. */
  fuente: string;
  /** Obra, tal y como la declara la Fuente. */
  obra: string;
  /** Año declarado por la Fuente. Puede venir aproximado; ver `añoExacto`. */
  año?: string | number;
  /** Dirección concreta del documento, para poder volver a él. */
  url?: string;
  texto: string;
}

export interface Candidata {
  texto: string;
  autor: string;
  procedencia: { obra: string; año?: number };
  /** De dónde salió el texto y bajo qué licencia — el criterio lo exige por candidata. */
  fuente: { id: string; nombre: string; licencia: string; url?: string };
}

export type Descarte =
  | { texto: string; motivo: 'no-esta-en-español' }
  | { texto: string; motivo: 'longitud' }
  | { texto: string; motivo: 'repetida' };

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
export function extraerCandidatas(
  documento: DocumentoDeFuente,
  autor: string,
): ResultadoDeExtraccion {
  const fuente: Fuente | undefined = fuenteDe(documento.fuente);
  if (fuente === undefined) {
    return {
      ok: false,
      motivo:
        `«${documento.fuente}» no es una Fuente admitida. Las admitidas están en ` +
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

  if (documento.obra.trim() === '') {
    return {
      ok: false,
      motivo:
        'El documento no declara obra. Sin obra, la Procedencia habría que inferirla, y ' +
        'FR-2 no lo admite.',
    };
  }

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
        ...(documento.url !== undefined ? { url: documento.url } : {}),
      },
    });
  }

  return { ok: true, candidatas, descartadas };
}
