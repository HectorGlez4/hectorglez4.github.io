/**
 * El filtro de los Directorios — Historia 26.6, FR-55, UX-DR58, UX-DR81, UX-DR85, UX-DR86.
 *
 * La decisión entera, sin DOM: qué filas, bloques y grupos quedan con lo tecleado, cuántas filas
 * son y qué frase se anuncia. El guion de `src/components/FiltroDelDirectorio.astro` lee el modelo
 * de la página, llama a esto y solo pinta; las pruebas unitarias juzgan aquí la matriz entera sin
 * un navegador delante.
 *
 * **Cómo casa** (decisión de Héctor del 2026-10-18): por **subcadena** de lo normalizado, nunca
 * por principio de palabra —«mar» encuentra a Josefa Amar y Borbón—, con la misma tolerancia a
 * tildes, mayúsculas y eñe que la búsqueda, porque las dos pasan por `normalizar` (AD-3): nadie
 * la copia ni pliega tildes por su cuenta. Lo que normaliza a vacío —el campo vacío, solo
 * espacios, solo signos— es la consulta vacía: todo vuelve.
 *
 * **Qué casa**: en `/autores/`, el nombre de cada Autor (una fila); en `/obras/`, el título de
 * cada Obra (una fila) y el nombre de su Autor (la cabecera de su bloque): si casa la cabecera,
 * quedan todas sus Obras; si solo casa alguna Obra, quedan la cabecera y esas Obras. Un bloque sin
 * filas que queden desaparece, y un grupo sin bloques, con su letra.
 *
 * Importa solo `normalizar.ts` y `recuentos.ts`, que no importan nada: viaja al navegador.
 *
 * AD-5 — Derivación pura.
 */
import { normalizar } from './normalizar.ts';
import { recuentoDeAutores, recuentoDeObras } from './recuentos.ts';

/** Los dos Directorios que filtran. */
export type DirectorioFiltrable = 'autores' | 'obras';

/** La etiqueta visible del campo de cada Directorio (`EXPERIENCE.md`, «Etiqueta visible»). */
export const ETIQUETA_DEL_FILTRO: Readonly<Record<DirectorioFiltrable, string>> = {
  autores: 'Escribe parte del nombre.',
  obras: 'Escribe parte del título o del autor.',
};

/**
 * Un bloque del Directorio: en `/obras/`, un Autor —su nombre es la `cabecera`— con los títulos de
 * sus Obras en `filas`; en `/autores/`, el grupo entero, sin cabecera, con un nombre por fila.
 */
export interface BloqueFiltrable {
  cabecera?: string;
  filas: readonly string[];
}

/** Un grupo de letra: sus bloques, en orden. */
export interface GrupoFiltrable {
  bloques: readonly BloqueFiltrable[];
}

/** Lo que queda de cada grupo, bloque y fila, en el mismo orden que el modelo. */
export interface ResultadoDelFiltro {
  /** Lo tecleado normaliza a vacío: todo vuelve, y la región se vacía. */
  vacia: boolean;
  /** Cuántas filas quedan: Autores en `/autores/`, Obras en `/obras/`. */
  filas: number;
  grupos: { visible: boolean; bloques: { visible: boolean; filas: boolean[] }[] }[];
}

/**
 * El filtro de un Directorio: normaliza **una vez** el modelo leído de la página y devuelve la
 * función que, con lo tecleado, dice qué queda. Normalizar cada fila por tecla no se notaría con
 * el Corpus de hoy, pero no hay por qué hacerlo.
 */
export function filtroDe(modelo: readonly GrupoFiltrable[]): (tecleado: string) => ResultadoDelFiltro {
  const normalizado = modelo.map((grupo) =>
    grupo.bloques.map((bloque) => ({
      cabecera: bloque.cabecera === undefined ? undefined : normalizar(bloque.cabecera),
      filas: bloque.filas.map(normalizar),
    })),
  );

  return (tecleado) => {
    const consulta = normalizar(tecleado);
    const vacia = consulta === '';
    let filas = 0;
    const grupos = normalizado.map((bloques) => {
      const deBloques = bloques.map((bloque) => {
        const todas = vacia || (bloque.cabecera !== undefined && bloque.cabecera.includes(consulta));
        const deFilas = bloque.filas.map((fila) => todas || fila.includes(consulta));
        const quedan = deFilas.filter(Boolean).length;
        filas += quedan;
        return { visible: quedan > 0, filas: deFilas };
      });
      return { visible: deBloques.some((bloque) => bloque.visible), bloques: deBloques };
    });
    return { vacia, filas, grupos };
  };
}

/** Lo tecleado tal como se cita en una frase o un enlace: recortado, nunca normalizado. */
function citado(tecleado: string): string {
  return tecleado.trim();
}

/**
 * La frase que anuncia la región del filtro — `EXPERIENCE.md § Campo de filtro del Directorio`:
 * el recuento con su punto final y sus singulares («14 autores.», «1 obra.») o, a cero, la frase
 * que dice qué no casó, con lo tecleado tal cual —recortado, con sus tildes y sus signos—. La
 * región lo recibe por `textContent`: lo tecleado es texto, nunca marcado.
 */
export function fraseDelFiltro(directorio: DirectorioFiltrable, n: number, tecleado: string): string {
  if (n > 0) return `${directorio === 'autores' ? recuentoDeAutores(n) : recuentoDeObras(n)}.`;
  return directorio === 'autores'
    ? `Ningún autor tiene «${citado(tecleado)}» en el nombre.`
    : `Ninguna obra tiene «${citado(tecleado)}» en el título ni en su autor.`;
}

/** El texto del enlace a cero: «Buscar «{lo tecleado}» en las citas». */
export function textoDeBuscarEnLasCitas(tecleado: string): string {
  return `Buscar «${citado(tecleado)}» en las citas`;
}

/**
 * A dónde lleva el enlace a cero: la `/buscar/` de hoy (`base`, de `rutaDeLaBusqueda()`) con lo
 * tecleado en `q`, codificado: un `&`, un `#` o un `<` tecleados no pueden partir la dirección.
 */
export function rutaDeBuscarEnLasCitas(base: string, tecleado: string): string {
  return `${base}?q=${encodeURIComponent(citado(tecleado))}`;
}
