import type { Page } from '@playwright/test';
import { entradaDeLoDescargado } from '../../../src/lib/guiones.ts';

/**
 * Lo que una página descarga como guion, juzgado contra la lista cerrada de
 * `src/lib/guiones.ts` — Historia 23.1.
 *
 * Una sola copia para las pruebas de cada superficie (`pagina-de-cita`, `portada`,
 * `pagina-de-autor`, `pagina-404`, `seo`) y para `receptor.spec.ts`, que es la que corre contra
 * un sitio construido con punto final.
 */

/**
 * Apunta cada guion que pide la página —`<script src>`, `import()`, un worker—, en su orden. Lo
 * del mismo origen que `origen` se apunta como ruta con su consulta; lo de otro origen, entero,
 * para que ninguna entrada de la lista lo reconozca.
 */
export function apuntarGuiones(page: Page, origen: string): string[] {
  const pedidos: string[] = [];
  page.on('request', (peticion) => {
    if (peticion.resourceType() !== 'script') return;
    const url = new URL(peticion.url());
    pedidos.push(url.origin === new URL(origen).origin ? `${url.pathname}${url.search}` : url.href);
  });
  return pedidos;
}

/**
 * De lo pedido **al cargar**, lo que no es el guion de medición: lo único de la lista que una
 * página pide sin que nadie la toque (la Imagen se pide al pulsar y Pagefind al enfocar). Vacío
 * es lo correcto, con punto final y sin él.
 */
export function fueraDeLaListaAlCargar(pedidos: readonly string[]): string[] {
  return pedidos.filter((pedido) => entradaDeLoDescargado(pedido)?.id !== 'medicion');
}
