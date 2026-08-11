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
 * Slug de un Autor a partir de su nombre. «Séneca» da «seneca»; «Sor Juana Inés de la
 * Cruz» da «sor-juana-ines-de-la-cruz».
 */
export function slugDeAutor(nombre: string): string {
  return unir(normalizar(nombre));
}

/** Slug de un Tema. No participa en ninguna ruta de Cita — solo en la suya propia. */
export function slugDeTema(nombre: string): string {
  return unir(normalizar(nombre));
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
