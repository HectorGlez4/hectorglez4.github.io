/**
 * Historia 35.9 — los Autores para resolver Obras en las pruebas puras.
 *
 * `resolverObras` y `colgarObras` reciben los Autores como parámetro obligatorio: cada Obra
 * resuelta dice si tiene derechos vigentes, y lo decide su dueño. Las pruebas que no miran los
 * derechos pasan `CUALQUIER_AUTOR`: todo slug es un Autor sin `vivo` ni año de fallecimiento, así
 * que ninguna Obra de un Autor tiene derechos vigentes —sin plazo, un Autor que no vive no los
 * tiene— y la de un Personaje los tiene siempre, como en el sitio.
 */
import type { AutorParaDerechos } from '../../../src/lib/obras.ts';

class CualquierAutor extends Map<string, AutorParaDerechos> {
  override get(slug: string): AutorParaDerechos {
    return { slug };
  }

  override has(): boolean {
    return true;
  }
}

/** Todo slug es un Autor de dominio público, sin años: para las pruebas que no miran los derechos. */
export const CUALQUIER_AUTOR: ReadonlyMap<string, AutorParaDerechos> = new CualquierAutor();
