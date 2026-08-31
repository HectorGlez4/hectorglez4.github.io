/**
 * El canal RSS de la Cita del Día.
 *
 * **Por qué la Cita del Día y no «las últimas Citas».** AD-2 dice que publicar es mover el
 * fichero, no marcar un campo: una Cita publicada no lleva fecha de alta ni la va a llevar.
 * Un canal de «lo último» necesitaría inventarse ese dato o leer el historial de git, y las
 * dos cosas están prohibidas —AD-5 exige derivación pura y `src/lib/` no lee disco—. La
 * Cita del Día sí tiene fecha: la jornada. Es lo único del corpus que la tiene.
 *
 * **Y se compone llamando a `citaDelDia`, no reimplementando la rotación.** Es la misma
 * decisión que tomó `lote.ts` con el Kit y por el mismo motivo: si este fichero tuviera su
 * propia idea de qué Cita tocó el martes, el martes tendría dos respuestas. Aquí se recorre
 * hacia atrás y allí hacia delante; el mecanismo es el mismo, incluidas las fijaciones de
 * `corpus/portada.json`, que siguen mandando sobre la rotación.
 *
 * **Sin marca de origen en los enlaces.** FR-22 cierra el conjunto de valores de `de` a las
 * cinco cuentas propias justamente para que la medición no registre lo que le pongan; un
 * `?de=rss` inventado aquí sería exactamente eso. El canal enlaza a la canónica, como debe.
 */

import { citaDelDia, type Jornada } from './citaDelDia.ts';
import type { Autor, Cita } from './publicado.ts';
import { rutaDeCita } from './superficies.ts';

const UN_DIA = 86_400_000;

/**
 * Cuántas jornadas ofrece el canal.
 *
 * Un mes: suficiente para que un lector que estuvo un par de semanas fuera recupere lo que
 * se perdió, y corto para que el fichero siga siendo pequeño. No es un archivo histórico
 * —para eso está el sitio entero, que sí se indexa—, es una ventana de recuperación.
 */
export const JORNADAS_DEL_CANAL = 30;

export interface EntradaDelCanal {
  jornada: Jornada;
  cita: Cita;
  autor: Autor;
}

/** La jornada de hace `atras` días. */
function jornadaAnterior(jornada: Jornada, atras: number): Jornada {
  return new Date(Date.parse(`${jornada}T00:00:00Z`) - atras * UN_DIA)
    .toISOString()
    .slice(0, 10);
}

/**
 * Las entradas del canal, de la más reciente a la más antigua.
 *
 * Empieza en la jornada dada —la de hoy— y retrocede. Una jornada cuya Cita ya no está apta
 * para portada no deja hueco: `citaDelDia` la resuelve con la rotación como cualquier otra,
 * porque una fijación caduca no bloquea la portada. Si el conjunto está vacío no hay canal,
 * que es distinto de un canal vacío y es lo que corresponde.
 */
export function entradasDelCanal(
  aptas: Cita[],
  autores: Autor[],
  jornada: Jornada,
  fijaciones: Record<string, string> = {},
  cuantas: number = JORNADAS_DEL_CANAL,
): EntradaDelCanal[] {
  if (aptas.length === 0) return [];
  const porSlug = new Map(autores.map((a) => [a.slug, a]));

  const entradas: EntradaDelCanal[] = [];
  for (let atras = 0; atras < cuantas; atras += 1) {
    const dia = jornadaAnterior(jornada, atras);
    const seleccion = citaDelDia(aptas, dia, fijaciones);
    if (!seleccion) continue;
    const autor = porSlug.get(seleccion.cita.autor);
    // Una Cita sin su Autor en el conjunto no se publica —lo impide la admisión—, pero si
    // llegara aquí se salta en vez de romper el canal entero por una entrada.
    if (!autor) continue;
    entradas.push({ jornada: dia, cita: seleccion.cita, autor });
  }
  return entradas;
}

/** Escapa lo que va como texto dentro de un elemento XML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** La fecha en el formato que pide RSS 2.0 (RFC 822), fijada al mediodía UTC. */
function fechaRfc822(jornada: Jornada): string {
  return new Date(`${jornada}T12:00:00Z`).toUTCString();
}

/**
 * El canal completo, listo para servir.
 *
 * Se compone a mano y no con `@astrojs/rss`: son treinta líneas de XML y traer una
 * dependencia para eso desentona en un sitio que no envía ni JavaScript al navegador
 * (AD-6). `robots.txt` ya se compone así en `buscadores.ts`.
 */
export function canalRss(
  entradas: EntradaDelCanal[],
  origen: string,
  titulo: string,
  descripcion: string,
): string {
  const items = entradas
    .map((e) => {
      const url = new URL(rutaDeCita(e.cita.slug), origen).href;
      return [
        '    <item>',
        `      <title>${escapar(e.autor.nombre)}</title>`,
        `      <link>${escapar(url)}</link>`,
        `      <guid isPermaLink="true">${escapar(url)}</guid>`,
        `      <pubDate>${fechaRfc822(e.jornada)}</pubDate>`,
        `      <description><![CDATA[«${e.cita.texto}» — ${e.autor.nombre}]]></description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapar(titulo)}</title>`,
    `    <link>${escapar(origen)}</link>`,
    `    <description>${escapar(descripcion)}</description>`,
    '    <language>es</language>',
    `    <atom:link href="${escapar(new URL('/rss.xml', origen).href)}" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
