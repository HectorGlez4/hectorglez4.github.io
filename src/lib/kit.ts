/**
 * El material del Kit Diario de Publicación — FR-21.
 *
 * El Kit es una herramienta de Héctor, no una superficie del sitio: `noindex`, fuera del
 * sitemap y sin ningún enlace entrante, como la herramienta de curación. Existe para que
 * publicar a diario cueste dos minutos y no requiera ninguna decisión, que es lo que
 * separa publicar todos los días de publicar tres veces por semana.
 *
 * Aquí solo se decide **qué Cita compone el material**. El texto de atribución sale de
 * `atribucion.ts` y el tamaño del lienzo de `tramos.ts`, los mismos que consumen la
 * Página de Cita y la Imagen: si el Kit compusiera lo suyo, publicaría una atribución
 * distinta de la que se lleva el visitante y nadie lo vería hasta compararlas.
 *
 * AD-5 — Derivación pura.
 */

import { citaDelDia, type Jornada, type SeleccionDeCitaDelDia } from './citaDelDia.ts';
import { tramoDe } from './tramos.ts';
import type { Cita } from './publicado.ts';

export interface MaterialDelKit {
  /** La Cita del Día, la misma que la portada. Siempre está, admita imagen o no. */
  delDia: SeleccionDeCitaDelDia;
  /**
   * Una Cita apta para Imagen, solo cuando la del Día no lo es.
   *
   * No sustituye a la del Día en el Kit: se ofrece **además**, con su material completo.
   * Sustituirla en silencio haría que el Kit publicara una Cita distinta de la que está
   * en la portada ese día, y las dos superficies dejarían de contar lo mismo.
   */
  alternativa: SeleccionDeCitaDelDia | null;
}

/**
 * El material de una jornada.
 *
 * La alternativa se elige con la **misma rotación** que la Cita del Día, aplicada al
 * subconjunto que admite Imagen. Reutilizarla en vez de coger «la primera que quepa» da
 * dos propiedades gratis: es estable dentro de la jornada —abrir el Kit dos veces da lo
 * mismo— y recorre todas antes de repetir ninguna, así que una racha de Citas largas no
 * publica cuatro días seguidos la misma alternativa.
 */
export function materialDelKit(
  aptas: Cita[],
  jornada: Jornada,
  fijaciones: Record<string, string> = {},
): MaterialDelKit | null {
  const delDia = citaDelDia(aptas, jornada, fijaciones);
  if (delDia === null) return null;

  if (tramoDe(delDia.cita.texto).admiteImagen) return { delDia, alternativa: null };

  const conImagen = aptas.filter((c) => tramoDe(c.texto).admiteImagen);
  return { delDia, alternativa: citaDelDia(conImagen, jornada) };
}
