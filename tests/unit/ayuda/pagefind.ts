import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recorrerElementos } from '../../../tools/lib/html.ts';
import { decodificar } from './listado.ts';

/**
 * Lo que Pagefind recoge de una página construida, y el índice que genera — Historia 27.1.
 *
 * Dos lectores para las pruebas de Vitest, que son las que corre el CI:
 *
 *   · `metadatosDe`, los `data-pagefind-meta` de una clave en el HTML de `dist/`, contados con el
 *     tokenizador de elementos —un segundo elemento con la misma clave, en cualquier orden de
 *     atributos, cuenta— y con su texto decodificado, para que un nombre con «&» no falle por el
 *     escapado;
 *   · `indiceDe`, el `pagefind.js` **generado** de una copia construida con `conBusqueda`,
 *     cargado en Node: los filtros, el metadato y la clave de orden que Pagefind recogió de verdad,
 *     y no los atributos que el HTML declara. Es lo que deja de ser cierto si una versión de
 *     Pagefind deja de recogerlos dentro de un `data-pagefind-ignore` sin valor o de un `hidden`, o
 *     lee la clave como texto: el HTML seguiría igual y solo el índice lo diría.
 */

/** Las claves de un `data-pagefind-meta` («clave:valor, otra» o «clave» con el valor por contenido). */
const clavesDeMeta = (meta: string) =>
  meta
    .split(',')
    .map((parte) => parte.trim().split(/[:[]/u)[0].trim())
    .filter((clave) => clave !== '');

/**
 * Los metadatos `clave` de una página: cuántos elementos lo declaran y el texto de los que lo
 * llevan por contenido (`<span data-pagefind-meta="clave">texto</span>`), decodificado.
 */
export function metadatosDe(html: string, clave: string): { elementos: number; valores: string[] } {
  let elementos = 0;
  recorrerElementos(html, (elemento) => {
    const meta = elemento.atributos.get('data-pagefind-meta');
    if (meta !== undefined && clavesDeMeta(meta).includes(clave)) elementos++;
  });
  const patron = new RegExp(`<([a-z]+)\\b[^>]*\\bdata-pagefind-meta="${clave}"[^>]*>([^<]*)</\\1>`, 'gu');
  const valores = [...html.matchAll(patron)].map((m) => decodificar(m[2]));
  return { elementos, valores };
}

/** El registro de una página en el índice, como lo devuelve `data()`. */
export interface RegistroDelIndice {
  url: string;
  content: string;
  meta: Record<string, string>;
  filters: Record<string, string[]>;
}

/** Lo que de la API de `pagefind.js` usan las pruebas. */
export interface IndiceDePagefind {
  filters(): Promise<Record<string, Record<string, number>>>;
  search(
    termino: string | null,
    opciones?: { filters?: Record<string, unknown>; sort?: Record<string, 'asc' | 'desc'> },
  ): Promise<{ results: { data(): Promise<RegistroDelIndice> }[] }>;
}

/**
 * El índice generado en `{proyecto}/dist/pagefind/`, cargado en Node con su propio `pagefind.js`
 * y su WebAssembly. `pagefind.js` pide sus trozos con `fetch` a direcciones relativas a sí mismo,
 * que en Node son `file:`: mientras dura la carga, un `fetch` que las sirve del disco (y deja el
 * resto al de verdad). Las URL de los resultados salen con `baseUrl: '/'`, como en el sitio.
 */
export async function indiceDe(proyecto: string): Promise<IndiceDePagefind & { soltar(): void }> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (direccion: string | URL | Request, opciones?: RequestInit) => {
    const url = new URL(direccion instanceof Request ? direccion.url : String(direccion));
    if (url.protocol !== 'file:') return original(direccion, opciones);
    try {
      return new Response(await readFile(fileURLToPath(url)), { status: 200 });
    } catch {
      return new Response(null, { status: 404 });
    }
  }) as typeof fetch;
  const carpeta = join(proyecto, 'dist', 'pagefind');
  const modulo = (await import(/* @vite-ignore */ pathToFileURL(join(carpeta, 'pagefind.js')).href)) as IndiceDePagefind & {
    options(o: Record<string, unknown>): Promise<void>;
    init(): Promise<void>;
  };
  await modulo.options({ basePath: `${pathToFileURL(carpeta).href}/`, baseUrl: '/' });
  await modulo.init();
  return {
    filters: () => modulo.filters(),
    search: (termino, opciones) => modulo.search(termino, opciones),
    soltar: () => {
      globalThis.fetch = original;
    },
  };
}
