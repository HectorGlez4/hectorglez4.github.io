/**
 * El índice de subpáginas de una Obra paginada — Historia 24.9, AD-23.
 *
 * Una Obra que la Fuente publica en varias páginas se versiona en un documento por página
 * (`{fuente}--{obra}--{página}.txt`), y el nombre de la página no dice dónde cae en el libro:
 * *Novelas ejemplares* nombra sus páginas por título, así que el orden natural de
 * `compararDocumentos` (Historia 24.1) pone «El coloquio de los perros», que lo cierra, antes que
 * «La gitanilla», que lo abre. El orden lo **declara la Fuente**, en la página de la obra que
 * enlaza sus subpáginas, igual que declara la obra y el año de cada documento.
 *
 * Este módulo es puro y sin red (AD-22): lee el wikitexto de esa página —lo descarga
 * `tools/recuperar.ts --indice`, una vez— y saca de él, en orden, los títulos que enlaza; los
 * escribe y los vuelve a leer en un fichero propio, `corpus/fuentes/{fuente}--{obra}.indice.yml`,
 * **junto a los documentos de la Obra y aparte de ellos**: no es `.txt`, así que ningún lector de
 * documentos —el cotejo, `extraer`, el cargador de posiciones— lo toma por uno, y de él no sale
 * ninguna candidata ni ninguna posición. Y casa esos títulos con los documentos versionados por
 * la dirección que cada documento declara en su cabecera.
 *
 * Aquí no se ordena ninguna Cita: se entrega, por Obra, la lista de sus documentos en el orden
 * de su índice. Quien ordena es `ordenDelLibro` de `src/lib/obras.ts`, que la recibe por
 * parámetro como las posiciones.
 */

import { parse as parsearYaml, stringify as escribirYaml } from 'yaml';
import { obraDelDocumento } from '../../src/lib/obras.ts';
import { mismoTitulo } from './fuentes.ts';

/** La extensión de un índice: no es `.txt`, así que ningún lector de documentos lo ve. */
export const EXTENSION_DE_INDICE = '.indice.yml';

/**
 * La Obra de un documento en el nombre de los ficheros, `{fuente}--{obra}`: su dueño es
 * `src/lib/obras.ts`, que ordena con ella; aquí se reexporta para quien nombra índices.
 */
export { obraDelDocumento };

/** El nombre del fichero del índice de una Obra: `{fuente}--{obra}.indice.yml`. */
export function nombreDeIndice(obra: string): string {
  return `${obra}${EXTENSION_DE_INDICE}`;
}

/** La Obra de un fichero de índice, por su ruta o su nombre; `undefined` si no es un índice. */
export function obraDeIndice(ruta: string): string | undefined {
  const nombre = ruta.split(/[\\/]/u).pop() ?? ruta;
  if (!nombre.endsWith(EXTENSION_DE_INDICE)) return undefined;
  const obra = nombre.slice(0, -EXTENSION_DE_INDICE.length);
  return obra === '' ? undefined : obra;
}

/**
 * Un título de MediaWiki en la forma con que se comparan dos: guiones bajos por espacios,
 * colapsados, sin ancla y con la primera letra en mayúscula, que es como la Fuente canoniza el
 * espacio principal («vidas paralelas/Pericles» y «Vidas_paralelas/Pericles» son la misma página).
 */
export function tituloCanonico(titulo: string): string {
  const sinAncla = titulo.split('#')[0] ?? '';
  const limpio = mismoTitulo(sinAncla);
  return limpio === '' ? '' : limpio.charAt(0).toLocaleUpperCase('es') + limpio.slice(1);
}

/** El título de una página de la Fuente por su dirección `…/wiki/{título}`; `undefined` si no tiene esa forma. */
export function tituloDeDireccion(direccion: string): string | undefined {
  let ruta: string;
  try {
    ruta = new URL(direccion).pathname;
  } catch {
    return undefined;
  }
  if (!ruta.startsWith('/wiki/')) return undefined;
  let crudo = ruta.slice('/wiki/'.length);
  try {
    crudo = decodeURIComponent(crudo);
  } catch {
    // Una codificación rota se compara tal cual: no casará con nada, y eso es lo honrado.
  }
  const titulo = tituloCanonico(crudo);
  return titulo === '' ? undefined : titulo;
}

/**
 * Los prefijos que sacan un enlace del espacio principal: espacios de nombres de la Fuente y
 * prefijos de otros proyectos. Un enlace así no es una subpágina de la obra («Autor:Plutarco»,
 * «Categoría:Novelas»). Una lista cerrada, y no «todo lo que lleve dos puntos»: un título del
 * espacio principal puede llevarlos.
 */
const PREFIJOS_FUERA_DEL_LIBRO = new Set([
  'categoría', 'category', 'autor', 'author', 'archivo', 'file', 'imagen', 'image', 'índice',
  'index', 'página', 'page', 'plantilla', 'template', 'portal', 'wikisource', 'ayuda', 'help',
  'especial', 'special', 'usuario', 'user', 'mediawiki', 'módulo', 'module', 'discusión', 'talk',
  'anexo', 'w', 'wikt', 'wikipedia', 'wikiquote', 'commons', 'c', 's', 'd', 'q', 'b', 'n', 'v',
  'wikidata', 'wikilibros', 'meta', 'mw', 'oldwikisource',
]);

/** Si un destino de enlace sale del libro: un espacio de nombres o un prefijo de proyecto o de idioma. */
function saleDelLibro(destino: string): boolean {
  const dosPuntos = destino.replace(/^:/u, '').indexOf(':');
  if (dosPuntos === -1) return false;
  const prefijo = destino.replace(/^:/u, '').slice(0, dosPuntos).trim().toLocaleLowerCase('es');
  return PREFIJOS_FUERA_DEL_LIBRO.has(prefijo) || /^[a-z]{2,3}(-[a-z]+)?$/u.test(prefijo);
}

/** Las entidades de un atributo HTML que pueden aparecer en un `href`. */
function sinEntidades(valor: string): string {
  return valor
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&#0*39;|&apos;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>');
}

/**
 * Los títulos que una página de la Fuente enlaza, **en el orden en que los pinta** y sin
 * repetir — Historia 24.9.
 *
 * Lee la página **ya pintada por la Fuente** (`?action=render`, solo el contenido, sin el marco
 * del sitio), no su wikitexto: el índice de muchas obras no está escrito en la página sino
 * transcluido del escaneo —*Recuerdos de provincia* pinta las páginas 221 a 223 de su
 * facsímil, que son el índice impreso—, y lo que la Fuente declara es lo que pinta. De cada
 * enlace `href` a `/wiki/{título}` del mismo anfitrión (relativo o absoluto) se toma el título,
 * descodificado. Fuera quedan los enlaces a otro anfitrión (otros proyectos), los que no son
 * `/wiki/…` (edición, páginas rojas), los espacios de nombres —«Autor:», «Categoría:»,
 * «Página:»…—, las anclas y la propia página. No elige nada más: qué títulos son documentos
 * versionados lo decide después `documentosEnElOrdenDelIndice`, por dirección.
 */
export function paginasDelIndice(html: string, direccionDelIndice: string): string[] {
  const base = new URL(direccionDelIndice);
  const propio = tituloDeDireccion(direccionDelIndice);
  const vistos = new Set<string>();
  const paginas: string[] = [];
  for (const enlace of html.matchAll(/<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/giu)) {
    const crudo = sinEntidades(enlace[1] ?? enlace[2] ?? '');
    let destino: URL;
    try {
      destino = new URL(crudo, base);
    } catch {
      continue;
    }
    if (destino.host !== base.host || destino.search !== '') continue;
    destino.hash = '';
    const titulo = tituloDeDireccion(destino.toString());
    if (titulo === undefined || titulo === propio || saleDelLibro(titulo) || vistos.has(titulo)) continue;
    vistos.add(titulo);
    paginas.push(titulo);
  }
  return paginas;
}

/** Lo que un índice versionado declara. */
export interface IndiceDeObra {
  /** El identificador de la Fuente que lo publica. */
  fuente: string;
  /** La dirección de la página de la obra de la que salió. */
  url: string;
  /** El día en que se recuperó, `AAAA-MM-DD`. */
  recuperado: string;
  /** Los títulos que esa página enlaza, en su orden. */
  paginas: string[];
}

const CABECERA_DEL_FICHERO = [
  '# Índice de subpáginas de una Obra paginada (Historia 24.9, AD-23): el orden de sus',
  '# documentos lo declara la Fuente. Lo escribe «npx tsx tools/recuperar.ts --indice <url>»',
  '# y no se edita a mano; no es un documento y ningún cotejo lo lee.',
].join('\n');

/** El texto del fichero de un índice. */
export function componerIndice(indice: IndiceDeObra): string {
  const cuerpo = escribirYaml(
    { fuente: indice.fuente, url: indice.url, recuperado: indice.recuperado, paginas: indice.paginas },
    { lineWidth: 0 },
  );
  return `${CABECERA_DEL_FICHERO}\n${cuerpo}`;
}

/** Un índice leído de su fichero, o `undefined` si no tiene la forma que escribe `componerIndice`. */
export function analizarIndice(texto: string): IndiceDeObra | undefined {
  let dato: unknown;
  try {
    dato = parsearYaml(texto);
  } catch {
    return undefined;
  }
  if (typeof dato !== 'object' || dato === null) return undefined;
  const { fuente, url, recuperado, paginas } = dato as Record<string, unknown>;
  if (typeof fuente !== 'string' || fuente === '') return undefined;
  if (typeof url !== 'string' || tituloDeDireccion(url) === undefined) return undefined;
  if (typeof recuperado !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(recuperado)) return undefined;
  if (!Array.isArray(paginas) || paginas.length === 0) return undefined;
  if (!paginas.every((p): p is string => typeof p === 'string' && tituloCanonico(p) !== '')) return undefined;
  return { fuente, url, recuperado, paginas };
}

/** Lo que de un documento versionado hace falta para casarlo con su índice: su nombre y su cabecera. */
export interface DocumentoParaIndice {
  nombre: string;
  url?: string;
  pedido?: string;
}

/**
 * Los documentos de una Obra **en el orden de su índice** — Historia 24.9.
 *
 * Cada documento casa con su índice por la dirección que declara su cabecera —la final y, si
 * hubo redirección, la pedida—, comparada como título de la Fuente. Va primero el documento de
 * la propia página del índice, si está versionado: es la portada del libro, lo que la Fuente
 * pinta antes de enlazar ninguna subpágina. Detrás, los que el índice enlaza, en su orden. Un
 * documento que el índice no enlaza no entra en la lista —`ordenDelLibro` lo pone detrás, en el
 * orden natural de la 24.1—, y un título del índice sin documento no deja hueco.
 *
 * Solo casan documentos de la Fuente del índice cuyo nombre es de su Obra: quien llama pasa los
 * de la Obra, y aquí se vuelve a exigir para que un índice no ordene lo que no es suyo.
 */
export function documentosEnElOrdenDelIndice(
  obra: string,
  indice: IndiceDeObra,
  documentos: readonly DocumentoParaIndice[],
): string[] {
  const rango = new Map<string, number>();
  const propio = tituloDeDireccion(indice.url);
  if (propio !== undefined) rango.set(propio, -1);
  indice.paginas.forEach((pagina, i) => {
    const titulo = tituloCanonico(pagina);
    if (!rango.has(titulo)) rango.set(titulo, i);
  });

  const situados: { nombre: string; rango: number }[] = [];
  for (const documento of documentos) {
    if (obraDelDocumento(documento.nombre) !== obra) continue;
    const titulos = [documento.url, documento.pedido]
      .map((direccion) => (direccion === undefined ? undefined : tituloDeDireccion(direccion)))
      .filter((titulo): titulo is string => titulo !== undefined);
    const rangos = titulos.map((titulo) => rango.get(titulo)).filter((r): r is number => r !== undefined);
    if (rangos.length > 0) situados.push({ nombre: documento.nombre, rango: Math.min(...rangos) });
  }
  return situados
    .sort((a, b) => a.rango - b.rango || (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0))
    .map((s) => s.nombre);
}
