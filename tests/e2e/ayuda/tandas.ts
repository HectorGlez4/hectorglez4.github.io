import { expect } from '@playwright/test';

/**
 * Los barridos del Corpus entero por HTTP — puerta de la fusión de las Épicas 24 y 26.
 *
 * Una prueba que recorre lo que el sitemap anuncia pide una página por ruta, y son 4.875; la de
 * Tarjetas baja además un PNG por Cita, 4.421 y 284 MB. Pedidas con el `request` de Playwright,
 * cada respuesta cruza el canal del controlador de Playwright —y con `trace: 'retain-on-failure'`
 * se graba entera en la traza—: medido en la tanda de `seo.spec.ts` y `tarjeta.spec.ts` con cinco
 * trabajadores, un recorrido del sitemap tardaba de 18 a 37 s aun por tandas de doce, y el de
 * Tarjetas pasaba de los 90 s de `test.slow()`. Morían por tiempo **sin llegar a evaluar la
 * aserción**, y con una sola tanda en marcha pasaban: no era el servidor. Contra el mismo
 * `tests/servidor.mjs`, con el `fetch` de Node, ocho recorridos del sitemap a la vez acaban en
 * menos de 5 s y los 4.421 PNG en menos de 1 s.
 *
 * Así que estos barridos piden con `fetch`, y anotan lo que falla con su ruta para afirmarlo una
 * vez al final, en vez de un `expect` por ruta y comprobación: cada `expect` de Playwright captura
 * su pila y abre un paso, y con miles costaba más que las peticiones —la de Tarjetas, con `fetch`
 * y un `expect` por comprobación, seguía en 14 s aislada; anotando, en 2 s, como los recorridos
 * del sitemap—. Lo que se comprueba es lo mismo —el estado, la cabecera y los bytes que el
 * servidor de las pruebas sirve por HTTP—, de cada ruta, y el rojo las nombra todas a la vez.
 */

/** La ruta como URL absoluta contra el servidor de las pruebas (`use.baseURL`). */
function absoluta(baseURL: string | undefined, ruta: string): URL {
  if (baseURL === undefined) throw new Error('el barrido necesita `use.baseURL` en playwright.config.ts');
  return new URL(ruta, baseURL);
}

/**
 * Pide una ruta con el `fetch` de Node. Con `seguir: false` no sigue redirecciones —lo que en el
 * `request` de Playwright es `maxRedirects: 0`—, así que un 301 llega como 301.
 */
export function pedir(baseURL: string | undefined, ruta: string, { seguir = true } = {}): Promise<Response> {
  return fetch(absoluta(baseURL, ruta), { redirect: seguir ? 'follow' : 'manual' });
}

/** Cuántas peticiones de un barrido van a la vez. */
export const A_LA_VEZ = 12;

/**
 * Revisa cada ruta, `A_LA_VEZ` a la vez — el arreglo de la Tarjeta en la 114.ª sesión: cambia
 * cuántas se miran a la vez, y nada más. Se cuentan las revisadas y se exige al final que sean
 * todas, porque el riesgo propio de repartir en tandas es saltarse alguna sin que nada chille.
 */
export async function porTandas<T>(rutas: readonly T[], revisar: (ruta: T) => Promise<void>): Promise<void> {
  let revisadas = 0;
  for (let desde = 0; desde < rutas.length; desde += A_LA_VEZ) {
    await Promise.all(
      rutas.slice(desde, desde + A_LA_VEZ).map(async (ruta) => {
        await revisar(ruta);
        revisadas += 1;
      }),
    );
  }
  expect(revisadas, 'se han quedado rutas sin mirar').toBe(rutas.length);
}
