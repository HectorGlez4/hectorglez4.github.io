/**
 * Los Directorios — Historias 26.3 y 26.4: qué listan `/autores/` y `/obras/`, y en qué orden.
 *
 * AD-5 — derivación pura: recibe Autores y Citas ya leídos y no toca disco. Las páginas solo
 * pintan lo que esto devuelve; no ordenan, no agrupan y no cuentan nada.
 *
 * AD-3 — el orden y las iniciales tienen un solo dueño, la función hermana de
 * `src/lib/normalizar.ts` (`compararPorClave`, `inicialDeClave`), y los dos Directorios la usan
 * por un solo ayudante, `agruparPorClave`. Aquí no se compara ningún nombre de Autor: ni
 * `localeCompare`, ni el orden por nombre en que `autoresPublicados` devuelve sus Autores.
 * Cervantes va en la C porque su clave es «Cervantes», no porque su nombre empiece por M.
 *
 * AD-11 — la lista de Autores son los de `autoresPublicados`, y el recuento de cada uno, sus Citas
 * publicadas (`citasDeAutor`): lo mismo que lista su página, no las documentadas que cuenta la
 * Tarjeta Social de Autor. Las Obras de cada Autor en `/obras/` son `obrasDelAutor`, la misma
 * llamada que su Página de Autor.
 */

import { compararPorClave, inicialDeClave } from './normalizar.ts';
import { autoresPublicados, citasDeAutor, obrasDelAutor, type Autor, type Cita } from './publicado.ts';
import type { ObraResuelta } from './obras.ts';
import { hechosDeFilaDeAutor } from './atribucion.ts';
import { rutaDeAutor } from './superficies.ts';

/** Una Fila de Autor, ya compuesta: lo que pinta y a dónde lleva. */
export interface FilaDelDirectorioDeAutores {
  slug: string;
  nombre: string;
  ruta: string;
  /**
   * «1547–1616», «Fallecido en 65»; ausente si no consta el año de **fallecimiento**
   * (`hechosDeFilaDeAutor`): un nacimiento solo no se pinta. El esquema exige el fallecimiento,
   * así que con el Corpus siempre consta.
   */
  años?: string;
  /** «12 citas», «1 cita». */
  recuento: string;
}

/**
 * Un grupo de letra: su inicial, el ancla a la que salta su letra y sus entradas en orden. Es de
 * cualquier Directorio —Autores o Obras—, y por eso sus miembros son `entradas`.
 */
export interface GrupoDeLetra<T> {
  /** La inicial de la clave: de la A a la Z sin tilde, o la Ñ. */
  inicial: string;
  /** El `id` del rótulo del grupo: «letra-» y la inicial en minúscula («letra-ñ»). */
  ancla: string;
  entradas: T[];
}

export interface DirectorioDeAutores {
  grupos: GrupoDeLetra<FilaDelDirectorioDeAutores>[];
  /** Cuántos Autores lista. */
  autores: number;
  /** Cuántas Citas publicadas suman. */
  citas: number;
}

/** El ancla de una inicial: un `id` en minúsculas, con la ñ tal cual. */
export function anclaDeLetra(inicial: string): string {
  return `letra-${inicial.toLocaleLowerCase('es')}`;
}

/**
 * Ordena unos Autores por su clave de orden —y, a igual clave, por slug— y los agrupa por la
 * inicial de la clave, con la entrada que `fila` compone para cada uno — Historias 26.3 y 26.4.
 *
 * Es el único sitio donde un Directorio ordena y agrupa: el de Autores y el de Obras lo llaman
 * con sus Autores y su fila, y por eso no pueden ordenar ni agrupar distinto. Una inicial sin
 * Autores no tiene grupo.
 *
 * **Lanza** si un Autor no tiene clave, o su clave no da inicial: el build ya lo para antes, en
 * `integraciones/claves.ts`, y llegar aquí sin ella significaría que esa puerta no corrió.
 * Adivinar un sitio en la lista escondería el fallo. Lanza también si una inicial ya cerrada se
 * reabre (ver abajo). `directorio` nombra al que pregunta en los dos mensajes.
 */
export function agruparPorClave<A extends Pick<Autor, 'slug' | 'ordenAlfabetico'>, T>(
  autores: readonly A[],
  fila: (autor: A) => T,
  directorio = 'el Directorio',
): GrupoDeLetra<T>[] {
  const ordenables = autores.map((autor) => {
    const clave = autor.ordenAlfabetico;
    const inicial = clave === undefined ? undefined : inicialDeClave(clave);
    if (clave === undefined || inicial === undefined) {
      throw new Error(
        [
          `El Autor «${autor.slug}» tiene Citas publicadas y ${
            clave === undefined ? 'no tiene clave de orden (ordenAlfabetico)' : `su clave «${clave}» no da inicial`
          }, así que ${directorio} no sabe dónde ponerlo.`,
          'Lo para antes `integraciones/claves.ts`; si se llega aquí, esa puerta no corrió.',
          'La clave la propone `npx tsx tools/autor.ts proponer-claves`.',
        ].join(' '),
      );
    }
    return { autor, clave, inicial };
  });

  ordenables.sort((a, b) =>
    compararPorClave({ clave: a.clave, slug: a.autor.slug }, { clave: b.clave, slug: b.autor.slug }),
  );

  const grupos: GrupoDeLetra<T>[] = [];
  for (const { autor, inicial } of ordenables) {
    const entrada = fila(autor);
    const ultimo = grupos.at(-1);
    if (ultimo !== undefined && ultimo.inicial === inicial) {
      ultimo.entradas.push(entrada);
    } else {
      /*
       * Los grupos se abren en el orden de `compararPorClave`, así que dependen de que ese orden
       * y `inicialDeClave` —las dos de `src/lib/normalizar.ts`— no se contradigan nunca. Si un
       * día lo hicieran, una inicial ya cerrada volvería a abrirse: dos grupos de la misma letra,
       * dos `id` repetidos y una letra de salto que solo alcanza el primero. Se para aquí, con
       * el Autor que la reabre, en vez de publicar la página rota.
       */
      if (grupos.some((grupo) => grupo.inicial === inicial)) {
        throw new Error(
          `El Autor «${autor.slug}» reabre la letra «${inicial}» en ${directorio} después de ` +
            `otra: el orden de las claves (compararPorClave) y sus iniciales (inicialDeClave) no ` +
            'concuerdan, y `src/lib/normalizar.ts` es quien tiene que volver a ponerlos de acuerdo.',
        );
      }
      grupos.push({ inicial, ancla: anclaDeLetra(inicial), entradas: [entrada] });
    }
  }
  return grupos;
}

/**
 * El Directorio de Autores: todo Autor con al menos una Cita publicada, por su clave de orden
 * y, a igual clave, por slug, agrupado por la inicial de la clave en el orden resultante
 * (`agruparPorClave`, que lanza si un Autor publicado no tiene clave).
 */
export function directorioDeAutores(autores: readonly Autor[], citas: readonly Cita[]): DirectorioDeAutores {
  const publicados = autoresPublicados([...autores], [...citas]);
  let total = 0;
  const grupos = agruparPorClave(
    publicados,
    (autor): FilaDelDirectorioDeAutores => {
      const suyas = citasDeAutor(citas, autor.slug).length;
      total += suyas;
      return {
        slug: autor.slug,
        nombre: autor.nombre,
        ruta: rutaDeAutor(autor.slug),
        ...hechosDeFilaDeAutor(autor, suyas),
      };
    },
    'el Directorio de Autores',
  );
  return { grupos, autores: publicados.length, citas: total };
}

/** Un Autor del Directorio de Obras, ya compuesto: su cabecera de grupo y su Lista de Obras. */
export interface AutorDelDirectorioDeObras {
  slug: string;
  nombre: string;
  /** Su Página de Autor: la cabecera de su grupo enlaza a ella. */
  ruta: string;
  /** Sus Obras, en el orden de su Página de Autor (`obrasDelAutor`). Nunca vacía. */
  obras: ObraResuelta[];
}

export interface DirectorioDeObras {
  grupos: GrupoDeLetra<AutorDelDirectorioDeObras>[];
  /** Cuántas Obras lista: todas las de `obrasPublicadas`, cada una una vez. */
  obras: number;
  /** Cuántos Autores tienen grupo: los publicados con alguna Obra. */
  autores: number;
  /** La suma de los recuentos de las Obras listadas: las Citas que la página pinta. */
  citas: number;
}

/**
 * El Directorio de Obras — Historia 26.4, FR-55: toda Obra de `obrasPublicadas` —también la que
 * no se indexa, y también con `CONGELACION_DE_OBRAS`: aquí no se consulta ninguna regla de
 * Obra—, bajo su Autor, con los Autores en el orden del Directorio de Autores y las Obras de cada
 * uno en el de su Página de Autor.
 *
 * Las Obras de cada Autor salen de `obrasDelAutor(citas, slug).obras`, la misma llamada que su
 * Página de Autor, así que las dos secuencias no pueden divergir. Un Autor publicado sin Obras no
 * tiene grupo, y una inicial sin ningún Autor con Obras no tiene letra. Lanza, como el de
 * Autores, si un Autor con Obras no tiene clave.
 */
export function directorioDeObras(autores: readonly Autor[], citas: readonly Cita[]): DirectorioDeObras {
  const obrasPorAutor = new Map<string, ObraResuelta[]>();
  for (const autor of autoresPublicados([...autores], [...citas])) {
    const suyas = obrasDelAutor(citas, autor.slug).obras;
    if (suyas.length > 0) obrasPorAutor.set(autor.slug, suyas);
  }
  const conObras = autores.filter((autor) => obrasPorAutor.has(autor.slug));

  const grupos = agruparPorClave(
    conObras,
    (autor): AutorDelDirectorioDeObras => ({
      slug: autor.slug,
      nombre: autor.nombre,
      ruta: rutaDeAutor(autor.slug),
      obras: obrasPorAutor.get(autor.slug) ?? [],
    }),
    'el Directorio de Obras',
  );

  const obras = [...obrasPorAutor.values()].flat();
  return {
    grupos,
    obras: obras.length,
    autores: obrasPorAutor.size,
    citas: obras.reduce((suma, obra) => suma + obra.recuento, 0),
  };
}
