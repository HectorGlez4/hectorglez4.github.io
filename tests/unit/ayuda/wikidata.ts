/**
 * Revisiones de Wikidata de prueba, construidas a mano — Historia 32.1.
 *
 * Las pruebas no tocan la red: una entidad es el objeto que serviría `Special:EntityData`, con las
 * declaraciones, los rangos y las etiquetas que cada caso necesita, y un documento es esa entidad
 * con la cabecera que escribe `tools/recuperar.ts`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  componerDocumentoDeWikidata,
  componerVigentes,
  enlacePermanenteDeWikidata,
  nombreDeDocumentoDeWikidata,
} from '../../../tools/lib/wikidata.ts';

export type Rango = 'normal' | 'preferred' | 'deprecated';

export interface DeclaracionDePrueba {
  rango?: Rango;
  /** Sin valor («novalue») o valor desconocido («somevalue»). */
  snak?: 'value' | 'novalue' | 'somevalue';
}

/** Una declaración que remite a otra entidad de elemento. */
export function aEntidad(id: string, { rango = 'normal', snak = 'value' }: DeclaracionDePrueba = {}) {
  return {
    rank: rango,
    type: 'statement',
    mainsnak: {
      snaktype: snak,
      property: 'P0',
      ...(snak === 'value'
        ? {
            datavalue: {
              type: 'wikibase-entityid',
              value: { 'entity-type': 'item', id, 'numeric-id': Number(id.slice(1)) },
            },
          }
        : {}),
    },
  };
}

/** Una declaración de tiempo (`+1605-01-01T00:00:00Z`) con su precisión (9 es el año). */
export function aTiempo(time: string, precision = 9, { rango = 'normal' }: DeclaracionDePrueba = {}) {
  return {
    rank: rango,
    type: 'statement',
    mainsnak: {
      snaktype: 'value',
      property: 'P577',
      datavalue: { type: 'time', value: { time, precision, timezone: 0, calendarmodel: 'x' } },
    },
  };
}

export function entidad(
  id: string,
  revision: number,
  {
    es,
    otras = {},
    claims = {},
  }: { es?: string; otras?: Record<string, string>; claims?: Record<string, unknown[]> } = {},
): Record<string, unknown> {
  const labels: Record<string, { language: string; value: string }> = {};
  if (es !== undefined) labels.es = { language: 'es', value: es };
  for (const [lengua, valor] of Object.entries(otras)) labels[lengua] = { language: lengua, value: valor };
  return { type: 'item', id, lastrevid: revision, modified: '2024-01-01T00:00:00Z', labels, claims };
}

/** El texto del documento que `recuperar` versionaría para esa entidad. */
export function documento(datos: Record<string, unknown>, fecha = '2024-05-01'): string {
  const id = String(datos.id);
  const revision = Number(datos.lastrevid);
  return componerDocumentoDeWikidata({
    entidad: id,
    revision,
    fechaDeRevision: fecha,
    url: enlacePermanenteDeWikidata(id, revision),
    recuperado: '2026-11-07',
    datos,
  });
}

/** Escribe documentos y, si se dan, las vigentes en `corpus/wikidata/` de un Corpus de prueba. */
export async function sembrarWikidata(
  corpus: string,
  entidades: Record<string, unknown>[],
  vigentes?: Record<string, number>,
): Promise<void> {
  const carpeta = join(corpus, 'wikidata');
  await mkdir(carpeta, { recursive: true });
  for (const datos of entidades) {
    await writeFile(
      join(carpeta, nombreDeDocumentoDeWikidata(String(datos.id), Number(datos.lastrevid))),
      documento(datos),
      'utf8',
    );
  }
  if (vigentes !== undefined) {
    await writeFile(join(carpeta, 'vigentes.yml'), componerVigentes(new Map(Object.entries(vigentes))), 'utf8');
  }
}

/** La respuesta de `Special:EntityData/{Q}.json?revision=N`. */
export function respuestaDeDatos(datos: Record<string, unknown>): string {
  return JSON.stringify({ entities: { [String(datos.id)]: datos } });
}

/** La respuesta de la API (`formatversion=2`) que declara una revisión de una página. */
export function respuestaDeRevision(titulo: string, revision: number, { ns = 0, timestamp = '2024-05-01T10:00:00Z' } = {}) {
  return JSON.stringify({
    batchcomplete: true,
    query: { pages: [{ pageid: 1, ns, title: titulo, revisions: [{ revid: revision, parentid: 1, timestamp }] }] },
  });
}
