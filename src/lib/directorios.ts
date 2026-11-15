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
 *
 * Historia 35.5, UX-DR140, UX-DR141 — los dos Directorios devuelven además, **aparte**, su sección
 * «Personajes» (`personajes`), que la página pinta tras la A–Z: los Personajes de
 * `personajesPublicados`, por su clave de orden con el mismo `agruparPorClave`, y en `/obras/` las
 * Obras que no caen bajo ningún Autor, bajo su Personaje dueño. Sin Personajes publicados la
 * sección es la lista vacía y no se pinta nada. Las cifras de siempre —`autores`, `citas`, `obras`—
 * son de la A–Z: un Personaje no se cuenta nunca como Autor.
 */

import { compararPorClave, inicialDeClave } from './normalizar.ts';
import {
  autoresPublicados,
  citasDeAutor,
  citasDePersonaje,
  obrasDeLasCitas,
  obrasDelAutor,
  obrasDelPersonaje,
  personajesPublicados,
  type Autor,
  type Cita,
  type Personaje,
} from './publicado.ts';
import type { ObraResuelta } from './obras.ts';
import { hechosDeFilaDeAutor, hechosDeFilaDePersonaje } from './atribucion.ts';
import { rutaDeAutor, rutaDePersonaje } from './superficies.ts';

/** Una Fila de Autor, ya compuesta: lo que pinta y a dónde lleva. */
export interface FilaDelDirectorioDeAutores {
  slug: string;
  nombre: string;
  ruta: string;
  /**
   * «1547–1616», «Fallecido en 65», «N. 1950» de un Autor vivo; ausente si `añosDeAutor` no da
   * ninguno (`hechosDeFilaDeAutor`): un Autor vivo sin año de nacimiento (Historia 35.1). En la
   * Fila de Personaje (35.5), «personaje de {universo}» (`hechosDeFilaDePersonaje`).
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
  /**
   * El `id` del rótulo del grupo: «letra-» y la inicial en minúscula («letra-ñ»); en la sección
   * «Personajes» (35.5), con su prefijo («personajes-letra-b»), para no chocar con la A–Z.
   */
  ancla: string;
  entradas: T[];
}

export interface DirectorioDeAutores {
  grupos: GrupoDeLetra<FilaDelDirectorioDeAutores>[];
  /** Cuántos Autores lista la A–Z: los Personajes no cuentan. */
  autores: number;
  /** Cuántas Citas publicadas suman sus Autores: las de los Personajes no cuentan. */
  citas: number;
  /**
   * Historia 35.5 — la sección «Personajes», tras la A–Z: cada Personaje publicado con su Fila,
   * agrupado por la inicial de su clave, con anclas `personajes-letra-…`. Vacía sin Personajes.
   */
  personajes: GrupoDeLetra<FilaDelDirectorioDeAutores>[];
}

/**
 * El prefijo de las anclas de la sección «Personajes» de los dos Directorios — Historia 35.5: sus
 * letras saltan a `personajes-letra-b`, nunca a la `letra-b` de la A–Z.
 */
export const PREFIJO_DE_LAS_ANCLAS_DE_PERSONAJES = 'personajes-';

/**
 * El ancla de una inicial: un `id` en minúsculas, con la ñ tal cual; con `prefijo`, delante
 * (`PREFIJO_DE_LAS_ANCLAS_DE_PERSONAJES`, Historia 35.5).
 */
export function anclaDeLetra(inicial: string, prefijo = ''): string {
  return `${prefijo}letra-${inicial.toLocaleLowerCase('es')}`;
}

/** Lo que `agruparPorClave` dice de lo que agrupa: quién es, su prefijo de ancla y su orden de claves. */
export interface QueSeAgrupa {
  /** «el Autor», «el Personaje»: lo que nombran los mensajes. */
  entidad: string;
  /** El prefijo de las anclas de sus letras (`anclaDeLetra`). */
  prefijo: string;
  /** La orden que propone las claves que faltan. */
  orden: string;
}

const AUTORES: QueSeAgrupa = { entidad: 'el Autor', prefijo: '', orden: 'npx tsx tools/autor.ts proponer-claves' };

/** Los Personajes de la sección «Personajes» — Historia 35.5. */
export const PERSONAJES_DEL_DIRECTORIO: QueSeAgrupa = {
  entidad: 'el Personaje',
  prefijo: PREFIJO_DE_LAS_ANCLAS_DE_PERSONAJES,
  orden: 'npx tsx tools/personaje.ts proponer-claves',
};

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
export function agruparPorClave<A extends { slug: string; ordenAlfabetico?: string }, T>(
  autores: readonly A[],
  fila: (autor: A) => T,
  directorio = 'el Directorio',
  /** Historia 35.5 — Autores por omisión; los Personajes de la sección, con `PERSONAJES_DEL_DIRECTORIO`. */
  queSeAgrupa: QueSeAgrupa = AUTORES,
): GrupoDeLetra<T>[] {
  const { entidad, prefijo, orden } = queSeAgrupa;
  const Entidad = entidad.charAt(0).toLocaleUpperCase('es') + entidad.slice(1);
  const ordenables = autores.map((autor) => {
    const clave = autor.ordenAlfabetico;
    const inicial = clave === undefined ? undefined : inicialDeClave(clave);
    if (clave === undefined || inicial === undefined) {
      throw new Error(
        [
          `${Entidad} «${autor.slug}» tiene Citas publicadas y ${
            clave === undefined ? 'no tiene clave de orden (ordenAlfabetico)' : `su clave «${clave}» no da inicial`
          }, así que ${directorio} no sabe dónde ponerlo.`,
          'Lo para antes `integraciones/claves.ts`; si se llega aquí, esa puerta no corrió.',
          `La clave la propone \`${orden}\`.`,
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
          `${Entidad} «${autor.slug}» reabre la letra «${inicial}» en ${directorio} después de ` +
            `otra: el orden de las claves (compararPorClave) y sus iniciales (inicialDeClave) no ` +
            'concuerdan, y `src/lib/normalizar.ts` es quien tiene que volver a ponerlos de acuerdo.',
        );
      }
      grupos.push({ inicial, ancla: anclaDeLetra(inicial, prefijo), entradas: [entrada] });
    }
  }
  return grupos;
}

/**
 * El Directorio de Autores: todo Autor con al menos una Cita publicada, por su clave de orden
 * y, a igual clave, por slug, agrupado por la inicial de la clave en el orden resultante
 * (`agruparPorClave`, que lanza si un Autor publicado no tiene clave).
 */
export function directorioDeAutores(
  autores: readonly Autor[],
  citas: readonly Cita[],
  /** Historia 35.5 — los Personajes del Corpus; cuáles se listan lo decide `personajesPublicados`. */
  personajes: readonly Personaje[] = [],
): DirectorioDeAutores {
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
  return { grupos, autores: publicados.length, citas: total, personajes: personajesDelDirectorio(personajes, citas) };
}

/**
 * La sección «Personajes» del Directorio de Autores — Historia 35.5, UX-DR140: cada Personaje
 * publicado con su Fila —«personaje de {universo}» donde van los años y sus Citas publicadas
 * (`citasDePersonaje`, las que lista su página)—, por su clave con `agruparPorClave`.
 */
function personajesDelDirectorio(
  personajes: readonly Personaje[],
  citas: readonly Cita[],
): GrupoDeLetra<FilaDelDirectorioDeAutores>[] {
  return agruparPorClave(
    personajesPublicados(personajes, citas),
    (personaje): FilaDelDirectorioDeAutores => ({
      slug: personaje.slug,
      nombre: personaje.nombre,
      ruta: rutaDePersonaje(personaje.slug),
      ...hechosDeFilaDePersonaje(personaje, citasDePersonaje(citas, personaje.slug).length),
    }),
    'el Directorio de Autores',
    PERSONAJES_DEL_DIRECTORIO,
  );
}

/**
 * Un Autor del Directorio de Obras, ya compuesto: su cabecera de grupo y su Lista de Obras. En la
 * sección «Personajes» (35.5), un Personaje, con la misma forma.
 */
export interface AutorDelDirectorioDeObras {
  slug: string;
  nombre: string;
  /** Su Página de Autor (o de Personaje): la cabecera de su grupo enlaza a ella. */
  ruta: string;
  /**
   * Sus Obras, en el orden de su Página de Autor (`obrasDelAutor`). En la de un Personaje, las de
   * su Página de Personaje (`obrasDelPersonaje`) que no van ya bajo ningún Autor. Nunca vacía.
   */
  obras: ObraResuelta[];
}

export interface DirectorioDeObras {
  grupos: GrupoDeLetra<AutorDelDirectorioDeObras>[];
  /** Cuántas Obras lista la A–Z de Autores: las de la sección «Personajes» no cuentan (35.5). */
  obras: number;
  /** Cuántos Autores tienen grupo: los publicados con alguna Obra. */
  autores: number;
  /** La suma de los recuentos de las Obras de la A–Z: las Citas que la página pinta bajo un Autor. */
  citas: number;
  /**
   * Historia 35.5 — la sección «Personajes»: las Obras que no caen bajo ningún Autor, bajo su
   * Personaje dueño, agrupado por la inicial de su clave. Vacía sin ellas.
   */
  personajes: GrupoDeLetra<AutorDelDirectorioDeObras>[];
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
export function directorioDeObras(
  autores: readonly Autor[],
  citas: readonly Cita[],
  /** Historia 35.5 — los Personajes del Corpus: los dueños de las Obras de la sección «Personajes». */
  personajes: readonly Personaje[] = [],
): DirectorioDeObras {
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
    personajes: obrasDeLosPersonajes(personajes, citas, new Set(obras.map((obra) => obra.nombre))),
  };
}

/**
 * La sección «Personajes» del Directorio de Obras — Historia 35.5, UX-DR141.
 *
 * Toda Obra publicada (`obrasDeLasCitas`) que no va ya bajo un Autor (`bajoUnAutor`) va aquí, una
 * vez, bajo su dueño, que tiene que ser un Personaje publicado: la Obra de un Personaje dicha
 * también con un Autor va solo bajo ese Autor. Cada Personaje lleva esas Obras en el orden de su
 * Página de Personaje (`obrasDelPersonaje`, con `ordenDeLaListaDeObras`), y los Personajes van por
 * su clave con `agruparPorClave`.
 *
 * **Lanza** si una Obra publicada no cae en ninguna sección —su dueño es un Autor que no la lista,
 * o un Personaje sin página, o uno cuya Lista de Obras no la trae—: la página no la pintaría y
 * `/obras/` dejaría de listar toda Obra (FR-55). La nombra.
 */
function obrasDeLosPersonajes(
  personajes: readonly Personaje[],
  citas: readonly Cita[],
  bajoUnAutor: ReadonlySet<string>,
): GrupoDeLetra<AutorDelDirectorioDeObras>[] {
  const publicados = new Map(personajesPublicados(personajes, citas).map((p) => [p.slug, p]));
  const sueltas = obrasDeLasCitas(citas).filter((obra) => !bajoUnAutor.has(obra.nombre));
  const porPersonaje = new Map<string, ObraResuelta[]>();
  for (const obra of sueltas) {
    const { tipo, slug } = obra.dueño;
    const delDueño = tipo === 'personaje' && publicados.has(slug) ? obrasDelPersonaje(citas, slug).obras : [];
    if (!delDueño.some((suya) => suya.nombre === obra.nombre)) {
      throw new Error(
        `La Obra «${obra.nombre}» está publicada y no cae en ninguna sección del Directorio de Obras: ` +
          (tipo === 'autor'
            ? `su dueño es el Autor «${slug}», cuya Lista de Obras no la trae.`
            : `su dueño es el Personaje «${slug}», ${publicados.has(slug) ? 'cuya Lista de Obras no la trae' : 'que no tiene página publicada'}.`),
      );
    }
    // Solo las suyas y sueltas: la de otro Personaje que también dice va bajo ese otro, una vez.
    porPersonaje.set(
      slug,
      delDueño.filter(
        (suya) => !bajoUnAutor.has(suya.nombre) && suya.dueño.tipo === 'personaje' && suya.dueño.slug === slug,
      ),
    );
  }
  return agruparPorClave(
    [...porPersonaje.keys()].map((slug) => publicados.get(slug)!),
    (personaje): AutorDelDirectorioDeObras => ({
      slug: personaje.slug,
      nombre: personaje.nombre,
      ruta: rutaDePersonaje(personaje.slug),
      obras: porPersonaje.get(personaje.slug) ?? [],
    }),
    'el Directorio de Obras',
    PERSONAJES_DEL_DIRECTORIO,
  );
}
