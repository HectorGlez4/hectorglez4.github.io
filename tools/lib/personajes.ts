/**
 * Los Personajes del Corpus — Historia 35.2, AD-1, AD-4 v9.1, AD-33.
 *
 * Un Personaje (Batman) dice Citas atribuidas sin ser un Autor: no tiene años ni tradición, y
 * sus derechos están siempre vigentes. Vive en `corpus/personajes/{slug}.yml` y **comparte un
 * solo espacio de slugs con los Autores** —activos y retirados—, porque el prefijo de una Cita
 * es el de su dueño (`dueñoPorPrefijo`) y un slug de los dos no diría de quién es.
 *
 * Aquí viven la regla pura de la puerta del build (`fallosDePersonajes`) y las órdenes de
 * `tools/personaje.ts`. Ninguna escribe un campo tecleado como tal: el nombre y el universo se
 * dan al crear, la clave la propone la regla de `tools/lib/claves.ts` y solo `clave` escribe
 * `ordenRevisado`; la biografía se **lee** de su documento. Sobre el Corpus real, `clave`,
 * `semblanza` y `biografia` son actos de Héctor, nunca de un agente.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { personajeAdmisible } from '../../src/lib/admision.ts';
import { slugDePersonaje } from '../../src/lib/slug.ts';
import { proponerClave, ordenFijarClaveDePersonaje } from './claves.ts';
import {
  escribirPersonaje,
  leerPersonajes,
  type PersonajeEnCorpus,
  type Rutas,
} from './corpus.ts';
import { biografiaDeclarable, type Resultado } from './gestion.ts';

// ─── La puerta del build ─────────────────────────────────────────────────────────────

/** Lo que la puerta necesita de cada fichero: su slug y su ruta, como se nombra en el fallo. */
interface FicheroConSlug {
  slug: string;
  ruta: string;
}

/**
 * Las líneas de fallo de los Personajes, en el orden de las rutas:
 *
 *   · un Personaje con el slug de un Autor —activo o retirado—, nombrando los dos ficheros;
 *   · una Cita que declara un `personaje` que no está en `corpus/personajes/`, nombrando el
 *     fichero de la Cita y el slug.
 */
export function fallosDePersonajes(entrada: {
  personajes: readonly FicheroConSlug[];
  autores: readonly FicheroConSlug[];
  citas: readonly (FicheroConSlug & { personaje?: unknown })[];
}): string[] {
  const porRuta = <E extends { ruta: string }>(a: E, b: E) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0);
  const fallos: string[] = [];
  const autoresPorSlug = new Map<string, string[]>();
  for (const autor of entrada.autores) {
    autoresPorSlug.set(autor.slug, [...(autoresPorSlug.get(autor.slug) ?? []), autor.ruta]);
  }
  for (const personaje of [...entrada.personajes].sort(porRuta)) {
    for (const ruta of (autoresPorSlug.get(personaje.slug) ?? []).sort()) {
      fallos.push(
        `${personaje.ruta}: el Personaje «${personaje.slug}» tiene el slug del Autor ${ruta}. ` +
          'Autores y Personajes comparten un solo espacio de slugs: el prefijo de una Cita dice de ' +
          'quién es, y con dos dueños no lo diría.',
      );
    }
  }
  const conocidos = new Set(entrada.personajes.map((p) => p.slug));
  for (const cita of [...entrada.citas].sort(porRuta)) {
    if (typeof cita.personaje !== 'string' || conocidos.has(cita.personaje)) continue;
    fallos.push(
      `${cita.ruta}: la Cita declara el Personaje «${cita.personaje}», que no existe en ` +
        'corpus/personajes/. Créelo con «npx tsx tools/personaje.ts crear» o corrija la Cita.',
    );
  }
  return fallos;
}

// ─── Las órdenes ─────────────────────────────────────────────────────────────────────

/** Los motivos de un esquema que no se sostiene, como los da Zod. */
function motivosDe(issues: readonly { path: readonly PropertyKey[]; message: string }[]): string[] {
  return issues.map((i) => (i.path.length > 0 ? `${i.path.map(String).join('.')}: ${i.message}` : i.message));
}

/**
 * Dónde está ya un slug, si está: la ficha de un Autor activo o retirado, o la de otro
 * Personaje. Mira la existencia del fichero (`existsSync`): un directorio que no se deja leer
 * no lanza y deja el slug por libre; el build, que lee los dos directorios, lo rompe después.
 */
function ocupante(rutas: Rutas, slug: string): string | undefined {
  return [rutas.autores, rutas.autoresRetirados, rutas.personajes]
    .flatMap((dir) => [join(dir, `${slug}.yml`), join(dir, `${slug}.yaml`)])
    .find((ruta) => existsSync(ruta));
}

/**
 * Crea un Personaje con su nombre y su universo, y la clave que propone la regla fija.
 *
 * Se niega, con 1 y sin escribir nada, si el esquema no lo admite o si su slug ya es el de un
 * Autor —activo o retirado— o de otro Personaje: un solo espacio de slugs.
 */
export async function crearPersonaje(
  rutas: Rutas,
  datos: { nombre?: string; universo?: string },
): Promise<Resultado> {
  const propuesta = proponerClave(datos.nombre ?? '');
  const ficha = {
    nombre: datos.nombre,
    universo: datos.universo,
    ...(propuesta.clave !== undefined ? { ordenAlfabetico: propuesta.clave } : {}),
  };
  const validado = personajeAdmisible.safeParse(ficha);
  if (!validado.success) return { ok: false, motivos: [...motivosDe(validado.error.issues), 'No se ha escrito nada.'] };

  const slug = slugDePersonaje(validado.data.nombre);
  if (slug === '') {
    return { ok: false, motivos: [`«${validado.data.nombre}» no deja ningún slug.`, 'No se ha escrito nada.'] };
  }
  const yaEsta = ocupante(rutas, slug);
  if (yaEsta !== undefined) {
    return {
      ok: false,
      motivos: [
        `El slug «${slug}» ya lo ocupa ${yaEsta}. Autores y Personajes comparten un solo espacio de ` +
          'slugs, también con los Autores retirados: el prefijo de una Cita dice de quién es.',
        'No se ha escrito nada.',
      ],
    };
  }

  const ruta = await escribirPersonaje(rutas, slug, ficha);
  const clave =
    propuesta.clave === undefined
      ? `La regla de la última palabra no da clave de orden para «${validado.data.nombre}»: la fija ` +
        `Héctor con ${ordenFijarClaveDePersonaje(slug)}.`
      : `Clave de orden: «${propuesta.clave}», sin revisar.` +
        (propuesta.marcada ? ` El nombre tiene tres palabras o más: la confirma o corrige Héctor con ${ordenFijarClaveDePersonaje(slug)}.` : '');
  return { ok: true, ruta, mensaje: `Personaje «${slug}» creado.\n${clave}` };
}

/** El Personaje por su slug, o el motivo de no encontrarlo. */
async function personajeDe(
  rutas: Rutas,
  slug: string,
): Promise<{ ok: true; personaje: PersonajeEnCorpus } | { ok: false; motivos: string[] }> {
  let personajes: PersonajeEnCorpus[];
  try {
    personajes = await leerPersonajes(rutas);
  } catch (error) {
    return { ok: false, motivos: [error instanceof Error ? error.message : String(error), 'No se ha escrito nada.'] };
  }
  const personaje = personajes.find((p) => p.slug === slug);
  if (personaje === undefined) {
    return { ok: false, motivos: [`El Personaje «${slug}» no existe en ${rutas.personajes}.`, 'No se ha escrito nada.'] };
  }
  return { ok: true, personaje };
}

/** La ficha tal como se escribe: sin slug ni ruta, con lo que traiga. */
function enFichero(personaje: PersonajeEnCorpus): Record<string, unknown> {
  const { slug: _slug, ruta: _ruta, ...resto } = personaje;
  return resto;
}

/** Valida la ficha nueva y la escribe; si no se sostiene, nada se escribe. */
async function reescribir(rutas: Rutas, slug: string, ficha: Record<string, unknown>, mensaje: string): Promise<Resultado> {
  const validado = personajeAdmisible.safeParse(ficha);
  if (!validado.success) return { ok: false, motivos: [...motivosDe(validado.error.issues), 'No se ha escrito nada.'] };
  const ruta = await escribirPersonaje(rutas, slug, ficha);
  return { ok: true, ruta, mensaje };
}

/**
 * La semblanza propia de un Personaje: el texto y quién responde de él. Se niega si el
 * Personaje ya lleva la semblanza de su biografía (AD-26): nunca las dos.
 */
export async function declararSemblanzaPropia(
  rutas: Rutas,
  slug: string,
  texto: string,
  responde: string,
): Promise<Resultado> {
  const leido = await personajeDe(rutas, slug);
  if (!leido.ok) return leido;
  const actual = leido.personaje;
  if (actual.biografia !== undefined || actual.semblanza !== undefined) {
    return {
      ok: false,
      motivos: [
        `«${slug}» ya lleva la semblanza de su biografía (${actual.biografia?.documento ?? 'sin documento'}). ` +
          'Un Personaje lleva una de las dos, nunca las dos.',
        'No se ha escrito nada.',
      ],
    };
  }
  return reescribir(
    rutas,
    slug,
    { ...enFichero(actual), semblanzaPropia: { texto, responde } },
    `Personaje «${slug}»: semblanza propia, de la que responde ${responde}.`,
  );
}

/**
 * La biografía de un Personaje y la semblanza que se coteja contra ella (AD-26): las dos van
 * juntas, así que la orden pide la semblanza si el Personaje no la tiene. La revisión se lee del
 * documento, como para el Autor (`biografiaDeclarable`); que la semblanza sea literal de su cuerpo
 * lo comprueba el build (`integraciones/cotejo.ts`). Se niega ante una semblanza propia: nunca
 * las dos.
 */
export async function declararBiografiaDePersonaje(
  rutas: Rutas,
  slug: string,
  documento: string,
  semblanza: string | undefined,
): Promise<Resultado> {
  const leido = await personajeDe(rutas, slug);
  if (!leido.ok) return leido;
  const actual = leido.personaje;
  if (actual.semblanzaPropia !== undefined) {
    return {
      ok: false,
      motivos: [
        `«${slug}» lleva una semblanza propia. Un Personaje lleva la de su biografía o la propia, nunca las dos.`,
        'No se ha escrito nada.',
      ],
    };
  }
  const texto = semblanza ?? actual.semblanza;
  if (texto === undefined) {
    return {
      ok: false,
      motivos: [
        `«${slug}» no tiene semblanza, y la biografía va con ella: dé el texto literal de esa revisión ` +
          'con --semblanza "<texto>".',
        'No se ha escrito nada.',
      ],
    };
  }
  const leida = await biografiaDeclarable(rutas, documento);
  if (!leida.ok) return { ok: false, motivos: [...leida.motivos, 'No se ha escrito nada.'] };
  const { nombre, cabecera } = leida;
  return reescribir(
    rutas,
    slug,
    { ...enFichero(actual), semblanza: texto, biografia: { documento: nombre, revision: cabecera.revision } },
    `Personaje «${slug}»: biografía ${nombre} (${cabecera.titulo}, revisión ${cabecera.revision}, ` +
      `${cabecera.licencia}). El build coteja la semblanza literal contra ella.`,
  );
}

/** Las líneas de `listar`: cada Personaje, su universo y su clave; y cuántas faltan. */
export async function listarPersonajes(rutas: Rutas): Promise<Resultado> {
  let personajes: PersonajeEnCorpus[];
  try {
    personajes = await leerPersonajes(rutas);
  } catch (error) {
    return { ok: false, motivos: [error instanceof Error ? error.message : String(error)] };
  }
  const lineas = personajes
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => {
      const clave =
        p.ordenAlfabetico === undefined
          ? 'sin clave'
          : `«${p.ordenAlfabetico}»\t${p.ordenRevisado === undefined ? 'sin revisar' : `revisada el ${p.ordenRevisado}`}`;
      return `${p.slug}\t${p.nombre}\t${p.universo}\t${clave}`;
    });
  const sinClave = personajes.filter((p) => p.ordenAlfabetico === undefined).length;
  const sinRevisar = personajes.filter((p) => p.ordenAlfabetico !== undefined && p.ordenRevisado === undefined).length;
  lineas.push(
    `Claves de orden: faltan ${sinClave} y ${sinRevisar} ${sinRevisar === 1 ? 'está' : 'están'} sin revisar, ` +
      `de ${personajes.length} ${personajes.length === 1 ? 'Personaje' : 'Personajes'}.`,
  );
  return { ok: true, ruta: rutas.personajes, mensaje: lineas.join('\n') };
}
