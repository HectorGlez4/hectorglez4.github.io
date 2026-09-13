/**
 * Qué superficies cambian cuando cambia un fichero del Corpus — FR-38, AD-27.
 *
 * Éste es el único dueño del mapeo. `tools/avisar.ts` averigua qué ficheros tocó git y
 * entrega aquí datos ya leídos; este módulo no toca disco ni red. Mantener el cruce puro
 * permite probar las cuatro familias sin fabricar un repositorio ni enviar un aviso.
 */
import {
  rutaDeAutor,
  rutaDeCita,
  rutaDeColeccion,
  rutaDeTema,
} from '../../src/lib/superficies.ts';

export type FamiliaAvisable = 'cita' | 'autor' | 'tema' | 'coleccion';

/**
 * Los únicos directorios del Corpus cuyo contenido llega al HTML público.
 *
 * La misma tabla alimenta el filtro de `git diff` y el reconocimiento posterior: si se
 * añade otra familia publicable, no puede quedar visible para una mitad del aviso e
 * invisible para la otra.
 */
export const DIRECTORIOS_AVISABLES = [
  ['corpus/citas', 'cita'],
  ['corpus/autores', 'autor'],
  ['corpus/temas', 'tema'],
  ['corpus/colecciones', 'coleccion'],
] as const satisfies readonly (readonly [string, FamiliaAvisable])[];

/** Reconoce solo las cuatro familias publicables; el metadato vecino no emite aviso. */
export function familiaDeFichero(fichero: string): FamiliaAvisable | undefined {
  const relativa = fichero.split('\\').join('/');
  return DIRECTORIOS_AVISABLES.find(([directorio]) =>
    relativa.startsWith(`${directorio}/`)
  )?.[1];
}

export interface CitaAvisable {
  slug: string;
  autor?: string;
  temas: string[];
}

export interface ColeccionAvisable {
  slug: string;
  miembros: string[];
}

export interface CambioAvisable {
  familia: FamiliaAvisable;
  slug: string;
  /** Las dos formas importan si una edición cambia Autor, Temas o incluso el slug. */
  citaAntes?: CitaAvisable;
  citaDespues?: CitaAvisable;
}

function añadirCita(rutas: Set<string>, cita: CitaAvisable): void {
  rutas.add(rutaDeCita(cita.slug));
  if (cita.autor !== undefined) rutas.add(rutaDeAutor(cita.autor));
  for (const tema of cita.temas) rutas.add(rutaDeTema(tema));
}

/**
 * Compone las rutas cuyo HTML puede haber cambiado.
 *
 * La portada va siempre: enumera Autores, Temas y Colecciones y, además, cambia con la
 * jornada aunque git no toque el Corpus. Los efectos transitivos tampoco se omiten: el
 * nombre de un Autor aparece en sus Citas y en las tarjetas de Tema y Colección; el de un
 * Tema aparece en los chips de sus Citas; y una Cita miembro cambia su Colección.
 */
export function rutasAfectadas(
  cambios: readonly CambioAvisable[],
  citas: readonly CitaAvisable[],
  colecciones: readonly ColeccionAvisable[],
): string[] {
  const rutas = new Set<string>();
  if (cambios.length > 0) rutas.add('/');

  const añadirColeccionesDe = (slugs: ReadonlySet<string>) => {
    for (const coleccion of colecciones) {
      if (coleccion.miembros.some((slug) => slugs.has(slug))) {
        rutas.add(rutaDeColeccion(coleccion.slug));
      }
    }
  };

  for (const cambio of cambios) {
    if (cambio.familia === 'cita') {
      const formas = [cambio.citaAntes, cambio.citaDespues].filter(
        (cita): cita is CitaAvisable => cita !== undefined,
      );
      for (const cita of formas) añadirCita(rutas, cita);
      añadirColeccionesDe(new Set(formas.map((cita) => cita.slug)));
      continue;
    }

    if (cambio.familia === 'autor') {
      rutas.add(rutaDeAutor(cambio.slug));
      const suyas = citas.filter((cita) => cita.autor === cambio.slug);
      for (const cita of suyas) añadirCita(rutas, cita);
      añadirColeccionesDe(new Set(suyas.map((cita) => cita.slug)));
      continue;
    }

    if (cambio.familia === 'tema') {
      rutas.add(rutaDeTema(cambio.slug));
      for (const cita of citas.filter((entrada) => entrada.temas.includes(cambio.slug))) {
        rutas.add(rutaDeCita(cita.slug));
      }
      continue;
    }

    rutas.add(rutaDeColeccion(cambio.slug));
  }

  return [...rutas];
}
