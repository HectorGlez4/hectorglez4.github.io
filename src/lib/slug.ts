/**
 * AD-4 — El slug de una Cita es inmutable y no deriva del Tema.
 *
 * Se deriva del slug del Autor más un fragmento normalizado del texto, se escribe en el
 * fichero al crearlo y **no se recalcula nunca**. Los Temas no participan en ninguna ruta
 * de Cita: reasignar una Cita a otro Tema no puede cambiar su URL, que es exactamente lo
 * que FR-1 prohíbe.
 *
 * Que estas funciones existan no contradice la inmutabilidad. Se invocan una sola vez,
 * en el alta (Historia 1.5), y su resultado se escribe al fichero. El build lee el slug
 * del fichero; nunca lo vuelve a derivar. Si alguien las llamara en tiempo de build,
 * cambiar el texto de una Cita movería su URL y rompería los enlaces entrantes.
 *
 * AD-5 — Derivación pura.
 */

import { normalizar, palabras } from './normalizar.js';

/**
 * Cuántas palabras del texto entran en el slug. Siete da URL legibles —el criterio de
 * NFR-4— y suficientes para distinguir dos Citas del mismo Autor sin llegar a la ristra
 * ilegible en que se convierte una Cita larga entera.
 */
const PALABRAS_EN_FRAGMENTO = 7;

/** Une trozos ya canónicos con guiones, sin dejar guiones dobles ni en los extremos. */
function unir(...trozos: string[]): string {
  return trozos
    .map((t) => t.trim().replace(/\s+/gu, '-'))
    .filter((t) => t !== '')
    .join('-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-|-$/gu, '');
}

/**
 * La canonización de un nombre propio, con un solo dueño.
 *
 * Autor, Tema y obra la comparten. Estaba escrita dos veces —idéntica— cuando llegó la
 * tercera, y tres copias de una regla de canonización son tres sitios donde puede
 * divergir: bastaría con que una añadiera el recorte de un signo para que el mismo
 * nombre diera dos rutas distintas según quién lo derive.
 */
function slugDeNombre(nombre: string): string {
  return unir(normalizar(nombre));
}

/**
 * Slug de un Autor a partir de su nombre. «Séneca» da «seneca»; «Sor Juana Inés de la
 * Cruz» da «sor-juana-ines-de-la-cruz».
 */
export function slugDeAutor(nombre: string): string {
  return slugDeNombre(nombre);
}

/** Slug de un Tema. No participa en ninguna ruta de Cita — solo en la suya propia. */
export function slugDeTema(nombre: string): string {
  return slugDeNombre(nombre);
}

/**
 * Slug de una obra. Nombra el documento de Fuente de la Historia 11.1
 * (`{id-de-fuente}--{slug-de-obra}.txt`) y no participa en ninguna ruta del sitio.
 */
export function slugDeObra(nombre: string): string {
  return slugDeNombre(nombre);
}

/**
 * Slug de una Colección a partir de su nombre — Historia 12.4.
 *
 * El nombre es largo a propósito. `tools/lib/corpus.ts` ya exporta un `slugDeColeccion`
 * que hace algo **distinto**: deriva el identificador de una Colección de la **ruta de su
 * fichero**, porque es así como lo deriva el cargador de Astro. Dos funciones con el mismo
 * nombre, una que parte del nombre y otra de la ruta, serían un cambio de una por la otra
 * esperando a que alguien importe la que no era; y el que se equivocara compilaría, porque
 * las dos toman una cadena como primer argumento.
 *
 * Aquí se deriva **una sola vez**, al crear la Colección, y el resultado es el nombre del
 * fichero. A partir de ahí el slug es la URL pública de la Colección y no se recalcula
 * aunque el nombre cambie, por lo mismo que no se recalcula el de un Autor (AD-4).
 */
export function slugDeNombreDeColeccion(nombre: string): string {
  return slugDeNombre(nombre);
}

/**
 * Slug de una Cita: slug del Autor más las primeras palabras del texto en forma canónica.
 *
 * No recibe los Temas de la Cita, y es deliberado: la firma hace imposible derivar la URL
 * de un dato que puede cambiar. Lo que AD-4 prohíbe no puede ni escribirse.
 */
export function slugDeCita(slugAutor: string, texto: string): string {
  const fragmento = palabras(texto).slice(0, PALABRAS_EN_FRAGMENTO).join('-');
  return unir(slugAutor, fragmento);
}

/**
 * Resuelve una colisión añadiendo un discriminador numérico.
 *
 * Dos Citas del mismo Autor que empiezan igual producen el mismo slug base. Quien da de
 * alta necesita una URL distinta sin tocar la de la Cita que ya existe —cambiarla
 * rompería enlaces entrantes—, así que la nueva es la que lleva el sufijo.
 *
 * `ocupados` son los slugs ya presentes en el corpus.
 */
export function slugLibre(base: string, ocupados: Iterable<string>): string {
  const tomados = new Set(ocupados);
  if (!tomados.has(base)) return base;

  for (let n = 2; ; n += 1) {
    const candidato = `${base}-${n}`;
    if (!tomados.has(candidato)) return candidato;
  }
}
