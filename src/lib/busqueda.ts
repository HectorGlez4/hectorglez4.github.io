/**
 * La búsqueda con filtros de `/buscar/` — Historia 27.2, FR-7, UX-DR87, UX-DR88, UX-DR89.
 *
 * La decisión pura de la búsqueda, sin DOM, como `src/lib/filtroDelDirectorio.ts` lo es del filtro
 * de los Directorios: qué frase dice el recuento, qué `filters` se le pasan a Pagefind y qué
 * combinación de filtros (`filtrosUsados`) viaja en la `busqueda` asentada. La pinta el guion
 * empaquetado de `src/components/Busqueda.astro`, que la importa, y `buscar.astro` toma de aquí los
 * textos fijos del campo. Apta para el cliente: solo importa módulos que también lo son, y el grafo
 * entero de lo que arrastra el guion lo fija `tests/unit/busqueda-con-filtros.test.ts`.
 *
 * AD-5 — Derivación pura.
 */

import { temaEnFrase } from './recuentos.ts';
import { FILTROS_DE_CITA } from './tipoDeResultado.ts';
import { filtrosUsados, type Filtros } from './vocabulario.ts';

/**
 * El ejemplo del campo de `/buscar/`: un fragmento que da resultados con el Corpus de verdad —lo
 * comprueba `tests/unit/busqueda-con-filtros.test.ts` sobre `corpus/`—. Un ejemplo que no
 * encontrara nada enseñaría a buscar algo que la búsqueda no sabe responder.
 */
export const EJEMPLO_DE_LA_BUSQUEDA = 'no hay camino';

/** El texto de ejemplo del campo (`placeholder`): «Por ejemplo: no hay camino». */
export const TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA = `Por ejemplo: ${EJEMPLO_DE_LA_BUSQUEDA}`;

/** La etiqueta visible del campo de `/buscar/`. */
export const ETIQUETA_DE_LA_BUSQUEDA = 'Escribe un fragmento, un autor o un tema.';

/**
 * Lo que está elegido en los selectores: el **valor** de cada filtro (el slug del Autor, el del
 * Tema), vacío si está en «Todos…».
 */
export interface FiltrosElegidos {
  autor: string;
  tema: string;
}

/** Si hay algún filtro elegido. */
export function hayFiltros(elegidos: FiltrosElegidos): boolean {
  return elegidos.autor !== '' || elegidos.tema !== '';
}

/**
 * Los `filters` que se le pasan a Pagefind: `autor` y `tema` con los valores que escribe la 27.1
 * en cada Página de Cita (`FILTROS_DE_CITA`), solo los elegidos. Sin ninguno, un objeto vacío.
 */
export function filtrosDePagefind(elegidos: FiltrosElegidos): Record<string, string> {
  const filtros: Record<string, string> = {};
  if (elegidos.autor !== '') filtros[FILTROS_DE_CITA.autor] = elegidos.autor;
  if (elegidos.tema !== '') filtros[FILTROS_DE_CITA.tema] = elegidos.tema;
  return filtros;
}

/**
 * La combinación de filtros que viaja en la `busqueda` asentada (Historia 23.8), del vocabulario
 * cerrado: «ninguno», «autor», «tema» o «autor-tema». La Obra llega con la 27.3.
 */
export function combinacionDeFiltros(elegidos: FiltrosElegidos): Filtros {
  // Sin Obra, toda combinación de Autor y Tema es válida: `filtrosUsados` no devuelve `null`.
  return filtrosUsados({ autor: elegidos.autor !== '', obra: false, tema: elegidos.tema !== '' })!;
}

/**
 * Los valores de los filtros en una cadena, para la clave del asentamiento
 * (`asentamientoDeBusqueda`): otro Autor con la misma combinación es otro estado. Sin filtros,
 * `undefined`, y la clave queda como la de la 23.8.
 */
export function valoresDeFiltros(elegidos: FiltrosElegidos): string | undefined {
  return hayFiltros(elegidos) ? `${elegidos.autor}|${elegidos.tema}` : undefined;
}

/** Lo que el recuento necesita: el total, el texto tal como se buscó y los **nombres** elegidos. */
export interface DatosDelRecuento {
  total: number;
  texto: string;
  /** El nombre del Autor elegido, tal como se lee; sin filtro de Autor, se omite. */
  autor?: string;
  /** El nombre del Tema elegido, tal como se lee («La prudencia»); sin filtro de Tema, se omite. */
  tema?: string;
}

/**
 * La frase del recuento de `/buscar/` — Historia 27.2, UX-DR89, `EXPERIENCE.md § Búsqueda`.
 *
 * Sin filtros, la de siempre: «28 resultados.», «Un resultado.». Con filtros nombra lo filtrado,
 * en este orden: «222 citas de José Martí.», «8 citas de José Martí sobre la prudencia.», «6 citas
 * sobre el saber con «escuela».», «Una cita de Séneca.». El Tema va en minúscula con la regla de
 * la 24.5 (`temaEnFrase`), y el texto, recortado en sus extremos, entre comillas angulares. El
 * total es el de la respuesta de Pagefind, no los pintados.
 *
 * Lo tecleado entra en la frase y la frase en la página **solo por `textContent`**: aquí no se
 * escapa nada porque nada de esto se pinta como HTML.
 */
export function fraseDelRecuento({ total, texto, autor, tema }: DatosDelRecuento): string {
  if (autor === undefined && tema === undefined) {
    return total === 1 ? 'Un resultado.' : `${total} resultados.`;
  }
  const recortado = texto.trim();
  return (
    (total === 1 ? 'Una cita' : `${total} citas`) +
    (autor !== undefined ? ` de ${autor}` : '') +
    (tema !== undefined ? ` sobre ${temaEnFrase(tema)}` : '') +
    (recortado !== '' ? ` con «${recortado}»` : '') +
    '.'
  );
}
