import { ATRIBUTO_DE_ZONA, ATRIBUTO_SIN_ZONA } from '../../../src/lib/medicion.ts';
import { recorrerElementos, type Elemento } from '../../../tools/lib/html.ts';

/**
 * Historia 23.7 — los enlaces de una página construida y su Zona de salida interna.
 *
 * El tokenizador con pila (`recorrerElementos`) vive en `tools/lib/html.ts` desde la Historia 26.8,
 * porque lo usa también el build; aquí se reexporta para las pruebas.
 */
export { recorrerElementos, type Elemento };

/** Lo que declara el contenedor más cercano de un enlace: una zona o una exención. */
export type Declaracion = { zona: string } | { sinZona: string };

/** Un `<a>` de la página. */
export interface EnlaceDeLaPagina {
  /** Su `href`, tal como va escrito (con las entidades resueltas), o `undefined` si no lo lleva. */
  href: string | undefined;
  /** Su `target`, si lo lleva. */
  target?: string;
  /** Si está dentro de `<main>`. */
  enMain: boolean;
  /**
   * La declaración más cercana —en el propio enlace o en un antepasado—, como la toma la escucha
   * del fichero con `closest`: si un elemento lleva las dos, manda la exención. `null` si no hay.
   */
  declaracion: Declaracion | null;
}

/** La declaración de zona de un elemento, si la lleva: la exención manda, como en el fichero. */
export function declaracionDe(elemento: Elemento): Declaracion | null {
  const sinZona = elemento.atributos.get(ATRIBUTO_SIN_ZONA);
  if (sinZona !== undefined) return { sinZona };
  const zona = elemento.atributos.get(ATRIBUTO_DE_ZONA);
  if (zona !== undefined) return { zona };
  return null;
}

/** Cada `<a>` de la página, con su `href`, si está en `<main>` y la declaración más cercana. */
export function enlacesDe(html: string): EnlaceDeLaPagina[] {
  const enlaces: EnlaceDeLaPagina[] = [];
  recorrerElementos(html, (elemento, antepasados) => {
    if (elemento.etiqueta !== 'a') return;
    let declaracion: Declaracion | null = null;
    for (const candidato of [elemento, ...[...antepasados].reverse()]) {
      declaracion = declaracionDe(candidato);
      if (declaracion !== null) break;
    }
    enlaces.push({
      href: elemento.atributos.get('href'),
      ...(elemento.atributos.has('target') ? { target: elemento.atributos.get('target') } : {}),
      enMain: antepasados.some((e) => e.etiqueta === 'main'),
      declaracion,
    });
  });
  return enlaces;
}
