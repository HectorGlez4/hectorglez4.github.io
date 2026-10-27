/**
 * La Tarjeta de Obra de una Página de Cita, leída del HTML de `dist/` — Historia 24.4.
 *
 * Un solo lector para las tres pruebas que la miran (`tarjeta-de-obra`, `ediciones-en-venta` y
 * `obra-pagina`): dos que la recortaran cada una a su manera podrían comparar subárboles
 * distintos y dar por iguales dos tarjetas que no lo son.
 */
import { decodificar } from './listado.js';

const APERTURA = '<section class="tarjeta-de-obra"';

/** Cuántas Tarjetas de Obra hay en una página: la apertura de su sección, contada. */
export function cuantasTarjetasDeObra(html: string): number {
  return html.split(APERTURA).length - 1;
}

/**
 * El subárbol `section.tarjeta-de-obra` completo —de su apertura a su cierre, con las secciones
 * que tuviera dentro emparejadas—, o `undefined` si la página no lo tiene. Lanza si la sección
 * no se cierra.
 */
export function tarjetaDeObraDe(html: string): string | undefined {
  const inicio = html.indexOf(APERTURA);
  if (inicio === -1) return undefined;
  const ETIQUETA = /<(\/?)section\b[^>]*>/g;
  ETIQUETA.lastIndex = inicio;
  let abiertas = 0;
  for (let m = ETIQUETA.exec(html); m !== null; m = ETIQUETA.exec(html)) {
    abiertas += m[1] === '/' ? -1 : 1;
    if (abiertas === 0) return html.slice(inicio, m.index + m[0].length);
  }
  throw new Error(`La Tarjeta de Obra no se cierra: «${html.slice(inicio, inicio + 200)}»`);
}

/** Un texto de marcado sin etiquetas, decodificado y con los espacios colapsados. */
function soloTexto(marcado: string): string {
  return decodificar(marcado.replace(/<[^>]*>/g, ''))
    .replace(/ /g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** El marcado sin los elementos `span` que lleven `atributo` (no anidan otros `span`). */
const sinSpansCon = (marcado: string, atributo: RegExp) =>
  marcado.replace(/<span\b([^>]*)>[^<]*<\/span>/g, (entero, atributos: string) => (atributo.test(atributos) ? '' : entero));

const OCULTO_AL_LECTOR = /\baria-hidden="true"/;
const SOLO_PARA_LECTORES = /\bclass="solo-para-lectores"/;

export interface TarjetaDeObraLeida {
  /** Los atributos de la etiqueta de apertura de la sección, tal como salen. */
  apertura: string;
  /** El rótulo: su etiqueta (`h2`, `h3`), su `id` y su texto. */
  rotulo: { etiqueta: string; id: string | undefined; texto: string } | undefined;
  /** El texto de `p.titulo`, y si lleva algún enlace dentro. */
  titulo: { texto: string; conEnlace: boolean } | undefined;
  /** `p.hechos` como lo ve quien mira (sin lo solo para lectores) y como lo oye el lector (sin lo `aria-hidden`). */
  hechos: { vista: string; lector: string; marcado: string } | undefined;
  /** El contenido de `ul.filas`. */
  filas: string | undefined;
}

/** Las piezas de una Tarjeta de Obra ya recortada por `tarjetaDeObraDe`. */
export function leerTarjetaDeObra(subarbol: string): TarjetaDeObraLeida {
  const apertura = /^<section\b([^>]*)>/.exec(subarbol)?.[1] ?? '';
  const rotulo = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/.exec(subarbol);
  const titulo = /<p class="titulo"[^>]*>([\s\S]*?)<\/p>/.exec(subarbol)?.[1];
  const hechos = /<p class="hechos"[^>]*>([\s\S]*?)<\/p>/.exec(subarbol)?.[1];
  const filas = /<ul class="filas"[^>]*>([\s\S]*?)<\/ul>/.exec(subarbol)?.[1];
  return {
    apertura,
    rotulo:
      rotulo === null
        ? undefined
        : { etiqueta: rotulo[1], id: /\bid="([^"]*)"/.exec(rotulo[2])?.[1], texto: soloTexto(rotulo[3]) },
    titulo: titulo === undefined ? undefined : { texto: soloTexto(titulo), conEnlace: /<a\b/.test(titulo) },
    hechos:
      hechos === undefined
        ? undefined
        : {
            // Sin colapsar: lo que se compara son las pausas exactas, « · » y «, ».
            vista: decodificar(sinSpansCon(hechos, SOLO_PARA_LECTORES).replace(/<[^>]*>/g, '')),
            lector: decodificar(sinSpansCon(hechos, OCULTO_AL_LECTOR).replace(/<[^>]*>/g, '')),
            marcado: hechos,
          },
    filas,
  };
}

/** El texto de un enlace como lo ve quien mira y como lo oye el lector (sin lo `aria-hidden`). */
export function textosDelEnlace(marcado: string): { vista: string; lector: string } {
  return { vista: soloTexto(marcado), lector: soloTexto(sinSpansCon(marcado, OCULTO_AL_LECTOR)) };
}
