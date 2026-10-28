/**
 * Los Directorios — Historia 26.3: qué lista `/autores/` y en qué orden.
 *
 * AD-5 — derivación pura: recibe Autores y Citas ya leídos y no toca disco. La página solo pinta
 * lo que esto devuelve; no ordena, no agrupa y no cuenta nada.
 *
 * AD-3 — el orden y las iniciales tienen un solo dueño, la función hermana de
 * `src/lib/normalizar.ts` (`compararPorClave`, `inicialDeClave`). Aquí no se compara ningún
 * nombre: ni `localeCompare`, ni el orden por nombre en que `autoresPublicados` devuelve sus
 * Autores. Cervantes va en la C porque su clave es «Cervantes», no porque su nombre empiece por M.
 *
 * AD-11 — la lista son los Autores de `autoresPublicados`, y el recuento de cada uno, sus Citas
 * publicadas (`citasDeAutor`): lo mismo que lista su página, no las documentadas que cuenta la
 * Tarjeta Social de Autor.
 */

import { compararPorClave, inicialDeClave } from './normalizar.ts';
import { autoresPublicados, citasDeAutor, type Autor, type Cita } from './publicado.ts';
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
 * cualquier Directorio —Autores hoy, Obras en la 26.4—, y por eso sus miembros son `entradas`.
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
 * El Directorio de Autores: todo Autor con al menos una Cita publicada, por su clave de orden
 * y, a igual clave, por slug, agrupado por la inicial de la clave en el orden resultante. Una
 * inicial sin Autores no tiene grupo.
 *
 * **Lanza** si un Autor publicado no tiene clave, o su clave no da inicial: el build ya lo para
 * antes, en `integraciones/claves.ts`, y llegar aquí sin ella significaría que esa puerta no
 * corrió. Adivinar un sitio en la lista escondería el fallo.
 */
export function directorioDeAutores(autores: readonly Autor[], citas: readonly Cita[]): DirectorioDeAutores {
  const publicados = autoresPublicados([...autores], [...citas]);

  const ordenables = publicados.map((autor) => {
    const clave = autor.ordenAlfabetico;
    const inicial = clave === undefined ? undefined : inicialDeClave(clave);
    if (clave === undefined || inicial === undefined) {
      throw new Error(
        [
          `El Autor «${autor.slug}» tiene Citas publicadas y ${
            clave === undefined ? 'no tiene clave de orden (ordenAlfabetico)' : `su clave «${clave}» no da inicial`
          }, así que el Directorio de Autores no sabe dónde ponerlo.`,
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

  const grupos: GrupoDeLetra<FilaDelDirectorioDeAutores>[] = [];
  let total = 0;
  for (const { autor, inicial } of ordenables) {
    const suyas = citasDeAutor(citas, autor.slug).length;
    total += suyas;
    const fila: FilaDelDirectorioDeAutores = {
      slug: autor.slug,
      nombre: autor.nombre,
      ruta: rutaDeAutor(autor.slug),
      ...hechosDeFilaDeAutor(autor, suyas),
    };
    const ultimo = grupos.at(-1);
    if (ultimo !== undefined && ultimo.inicial === inicial) {
      ultimo.entradas.push(fila);
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
          `El Autor «${autor.slug}» reabre la letra «${inicial}» del Directorio de Autores después de ` +
            `otra: el orden de las claves (compararPorClave) y sus iniciales (inicialDeClave) no ` +
            'concuerdan, y `src/lib/normalizar.ts` es quien tiene que volver a ponerlos de acuerdo.',
        );
      }
      grupos.push({ inicial, ancla: anclaDeLetra(inicial), entradas: [fila] });
    }
  }

  return { grupos, autores: ordenables.length, citas: total };
}
