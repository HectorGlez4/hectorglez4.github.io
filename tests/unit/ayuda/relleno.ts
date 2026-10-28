import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MIN_CITAS_POR_TEMA } from '../../../src/lib/umbrales.ts';
import type { Rutas } from '../../../tools/lib/corpus.ts';

/**
 * Historia 26.8 — un Tema publicado de relleno, para las pruebas de las órdenes que publican.
 *
 * Desde la 26.8, `aprobar` y `darDeAltaLote` no publican una Cita sin ningún Tema publicado
 * (NFR-5): sin Tema, una Cita queda fuera de alcance en cuanto deja la página 1 de su Autor. Las
 * pruebas que miden **otra cosa** de esas órdenes —el slug libre, el duplicado, la Ficha de Obra,
 * la Fuente— necesitan que su candidata tenga un Tema con página, y esto lo siembra:
 * `MIN_CITAS_POR_TEMA` Citas publicadas de un Autor de relleno, todas del mismo Tema, con nombres
 * de fichero y slugs que empiezan por `zz-relleno` para que queden al final de cualquier listado
 * y se puedan apartar (`ficherosPublicados`, `sinRelleno`). La candidata solo tiene que declarar
 * `TEMA_PUBLICADO`.
 *
 * Lo que la regla misma exige —la 15.ª, la que no llega, el punto fijo— lo prueban
 * `revision.test.ts` y `alta.test.ts` sin relleno.
 */

export const TEMA_PUBLICADO = 'con-pagina';
/** Nombre del Tema de relleno, como lo declara su fichero. */
export const NOMBRE_DEL_TEMA_PUBLICADO = 'Con página';
const PREFIJO_DE_FICHERO = 'zz-relleno--';
const PREFIJO_DE_SLUG = 'zz-relleno-';

const pad = (n: number) => String(n).padStart(3, '0');

/** Siembra el Tema de relleno y sus `MIN_CITAS_POR_TEMA` Citas publicadas. */
export async function sembrarTemaPublicado(rutas: Rutas): Promise<void> {
  await mkdir(rutas.temas, { recursive: true });
  await mkdir(rutas.citas, { recursive: true });
  await writeFile(join(rutas.temas, `${TEMA_PUBLICADO}.yml`), `nombre: ${NOMBRE_DEL_TEMA_PUBLICADO}\n`, 'utf8');
  for (let i = 1; i <= MIN_CITAS_POR_TEMA; i += 1) {
    await writeFile(
      join(rutas.citas, `${PREFIJO_DE_FICHERO}${pad(i)}.md`),
      [
        '---',
        `texto: "Relleno número ${pad(i)}, para que el Tema de la prueba tenga página."`,
        'autor: "relleno"',
        'temas:',
        `  - "${TEMA_PUBLICADO}"`,
        `slug: "${PREFIJO_DE_SLUG}${pad(i)}"`,
        'estadoDerechos: "dominio-público"',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
  }
}

/** Si un nombre de fichero de `corpus/citas/` es del relleno. */
export const esRelleno = (nombre: string): boolean => nombre.startsWith(PREFIJO_DE_FICHERO);

/** Los ficheros de `corpus/citas/` sin el relleno: lo que la prueba publicó. */
export async function ficherosPublicados(rutas: Pick<Rutas, 'citas'>): Promise<string[]> {
  return (await readdir(rutas.citas)).filter((nombre) => !esRelleno(nombre));
}

/** Unas Citas leídas sin las del relleno. */
export function sinRelleno<C extends { slug: string }>(citas: C[]): C[] {
  return citas.filter((c) => !c.slug.startsWith(PREFIJO_DE_SLUG));
}
