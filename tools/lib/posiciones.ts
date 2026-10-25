/**
 * Dónde cae cada Cita en sus documentos de Fuente — Historia 24.1, AD-23.
 *
 * La Página de Obra lista sus Citas en el orden del libro, y ese orden necesita saber en qué
 * documento y en qué posición aparece el texto de cada una. Ese dato no se guarda en ninguna
 * parte: se recalcula en cada construcción con **lo mismo** que usa el cotejo —el mismo lector
 * de Citas y de documentos (`tools/lib/corpus.ts`), el mismo casado de cada Cita con los
 * documentos de su obra (`documentosDeCita`) y el mismo localizador (`localizar`)—. Si fueran
 * otros, una Cita podría estar cotejada y no tener sitio en su libro.
 *
 * Aquí no se ordena ni se elige: se entrega, por el `slug` del frontmatter de cada Cita, una
 * aparición por documento de su obra en que aparece su texto, sin el texto. Quien ordena es
 * `src/lib/obras.ts` (`ordenDelLibro`), que recibe esto por parámetro. Quien lo cablea al build
 * es el cargador `posiciones` de `src/content.config.ts`, que no hace nada más.
 *
 * Sin red (AD-22) y sin escribir nada en `corpus/`.
 */

import type { AparicionDeCita } from '../../src/lib/obras.ts';
import {
  colapsarEspacios,
  documentoDeCita,
  documentosDeCita,
  localizar,
  type DocumentosDeFuente,
} from './cotejo.ts';
import { leerCitas, leerDocumentosDeFuente, rutasDelCorpus } from './corpus.ts';

/**
 * Lo que de una Cita hace falta para situarla, tal y como sale del frontmatter. Los campos se
 * miran con su tipo en la mano: el esquema de la colección `citas` es quien rechaza una Cita mal
 * formada, y esto no tiene que adelantarse a decirlo con otro mensaje.
 */
export interface CitaParaSituar {
  slug?: unknown;
  texto?: unknown;
  procedencia?: unknown;
  fuente?: unknown;
}

/** La Fuente de una Cita, si declara un identificador. */
function fuenteDe(cita: CitaParaSituar): { id: string } | undefined {
  const fuente = cita.fuente as { id?: unknown } | null | undefined;
  return typeof fuente === 'object' && fuente !== null && typeof fuente.id === 'string' && fuente.id !== ''
    ? { id: fuente.id }
    : undefined;
}

/** La obra de la Procedencia de una Cita, que es la mitad del nombre de su documento. */
function obraDe(cita: CitaParaSituar): string | undefined {
  const procedencia = cita.procedencia as { obra?: unknown } | null | undefined;
  return typeof procedencia === 'object' && procedencia !== null && typeof procedencia.obra === 'string'
    ? procedencia.obra
    : undefined;
}

/**
 * Las apariciones de cada Cita en los documentos de su obra, por el `slug` de su frontmatter.
 *
 * Pura. Una Cita sin documento —la del censo, sin Fuente u obra—, con el texto vacío o que no
 * aparece queda con la lista vacía; un documento ilegible (`null`) o una biografía mal colocada
 * no entra, como en el cotejo. Las Citas se agrupan por el documento corto de su obra
 * (`documentoDeCita`), que es lo único de lo que depende `documentosDeCita`: así cada cuerpo se
 * colapsa una sola vez por grupo, y se suelta en cuanto el grupo termina.
 */
export function posicionesDeCitas(
  citas: readonly CitaParaSituar[],
  documentos: DocumentosDeFuente,
): Map<string, AparicionDeCita[]> {
  const posiciones = new Map<string, AparicionDeCita[]>();
  const porGrupo = new Map<string, { fuente: { id: string }; obra: string; citas: CitaParaSituar[] }>();

  for (const cita of citas) {
    if (typeof cita.slug !== 'string') continue;
    posiciones.set(cita.slug, []);
    const fuente = fuenteDe(cita);
    const obra = obraDe(cita);
    const grupo = documentoDeCita(fuente, obra);
    if (grupo === undefined || fuente === undefined || obra === undefined) continue;
    const delGrupo = porGrupo.get(grupo) ?? { fuente, obra, citas: [] };
    delGrupo.citas.push(cita);
    porGrupo.set(grupo, delGrupo);
  }

  for (const { fuente, obra, citas: delGrupo } of porGrupo.values()) {
    const cuerpos = documentosDeCita(fuente, obra, documentos).flatMap((nombre) => {
      const cuerpo = documentos.get(nombre);
      return typeof cuerpo === 'string' ? [{ nombre, cuerpo: colapsarEspacios(cuerpo) }] : [];
    });
    for (const cita of delGrupo) {
      const buscado = typeof cita.texto === 'string' ? colapsarEspacios(cita.texto) : '';
      const apariciones: AparicionDeCita[] = [];
      for (const { nombre, cuerpo } of cuerpos) {
        const posicion = localizar(buscado, cuerpo);
        if (posicion !== -1) apariciones.push({ documento: nombre, posicion });
      }
      posiciones.set(cita.slug as string, apariciones);
    }
  }

  return posiciones;
}

/**
 * Las posiciones de las Citas publicadas de un Corpus en disco: `corpus/citas/` y
 * `corpus/fuentes/`, con los lectores del cotejo. Lanza, nombrando el fichero, ante un
 * frontmatter que no se deja analizar, igual que el cotejo.
 */
export async function leerPosicionesDelCorpus(
  raizDelCorpus: string,
): Promise<Map<string, AparicionDeCita[]>> {
  const rutas = rutasDelCorpus(raizDelCorpus);
  const [citas, documentos] = await Promise.all([leerCitas(rutas.citas), leerDocumentosDeFuente(rutas)]);
  return posicionesDeCitas(citas, documentos);
}
