import type { Page } from '@playwright/test';
import { OPCIONES_DE_PAGEFIND } from '../../../src/lib/tipoDeResultado.ts';

/*
 * Historia 28.4 — vivía dentro de `tests/e2e/busqueda.spec.ts`; sale aquí porque lo usa también
 * `tests/e2e/temas-colecciones-autores-de-la-portada.spec.ts`, sobre un sitio de prueba servido en
 * otro puerto, y dos copias de la consulta divergirían a la primera corrección.
 */

/**
 * Todas las direcciones que da el índice real para un término, con las opciones de la búsqueda
 * propia: no solo las 30 que pinta `/buscar/`, porque una portada en el puesto 31 seguiría
 * respondiendo por lo que no es suyo, y una página destino por debajo de la 30 no es un fallo.
 * Cada dirección, con barra final. La página tiene que estar ya en el sitio que sirve el índice.
 */
export async function todasLasDirecciones(page: Page, termino: string): Promise<string[]> {
  return page.evaluate(
    async ({ termino, opciones }) => {
      const pf = await import('/pagefind/pagefind.js' as string);
      await pf.init();
      await pf.options(opciones);
      const { results } = await pf.search(termino);
      const urls: string[] = [];
      for (let i = 0; i < results.length; i += 200) {
        const datos = await Promise.all(results.slice(i, i + 200).map((r: { data: () => Promise<unknown> }) => r.data()));
        for (const dato of datos as { url: string }[]) urls.push(dato.url.replace(/\/?$/, '/'));
      }
      return urls;
    },
    { termino, opciones: OPCIONES_DE_PAGEFIND },
  );
}
