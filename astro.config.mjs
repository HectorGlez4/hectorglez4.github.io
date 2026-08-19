// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITIO } from './src/lib/dominio.ts';
import { anunciableEnElSitemap } from './src/lib/superficies.ts';
import cotejoDeCitas from './integraciones/cotejo.ts';
import formaDeLasColecciones from './integraciones/colecciones.ts';

// El dominio no se escribe aquí: sale de `public/CNAME`, el fichero que el hospedaje
// exige, a través de `src/lib/dominio.ts`. La canónica de cada página y el sitemap lo
// derivan de `site`, así que el sitio se declara siempre donde de verdad responde.

/*
 * El puerto del servidor de desarrollo sale de `PORT` cuando viene puesto, y sigue siendo
 * 4321 cuando no. No es capricho del entorno: `playwright.config.ts` levanta su propio
 * servidor en 4321 con `reuseExistingServer: false`, así que una previsualización sentada
 * ahí rompería la puerta de las pruebas de extremo a extremo. Sólo afecta a `astro dev`;
 * `astro build` no abre ningún puerto.
 *
 * «Puesto» se decide por que la variable traiga un entero, y no por que el número sea
 * distinto de cero. `Number(process.env.PORT) || 4321` daba 4321 con `PORT=0`, y cero es
 * justamente el valor con el que se pide «dame un puerto libre»: quien lo declarase para
 * esquivar un 4321 ocupado se ataba al 4321 ocupado. Lo que no es un entero —cadena vacía
 * o texto— sí es «no puesto», y cae al valor por defecto en vez de arrastrar un `NaN`.
 *
 * `tests/servidor.mjs` lee `PUERTO` y **no** `PORT`, y esa diferencia es deliberada: si
 * leyera `PORT`, el servidor que levanta Playwright se ataría a otro puerto mientras su
 * `url` sigue esperando el 4321.
 */
const puertoDeclarado = process.env.PORT?.trim();
const PUERTO_DEL_SERVIDOR =
  puertoDeclarado !== undefined &&
  puertoDeclarado !== '' &&
  Number.isInteger(Number(puertoDeclarado))
    ? Number(puertoDeclarado)
    : 4321;

// https://astro.build/config
export default defineConfig({
  site: SITIO,
  trailingSlash: 'never',

  server: { port: PUERTO_DEL_SERVIDOR },
  build: { format: 'file' },
  integrations: [
    /*
     * Historia 11.2 — ninguna Cita se publica sin aparecer en su documento.
     *
     * Va aquí porque es el único sitio por el que pasan todas las construcciones: una
     * Cita escrita a mano directamente en `corpus/citas/` cruza la misma puerta que una
     * sembrada. Rompe el build; no avisa.
     */
    cotejoDeCitas(),

    /*
     * Historia 12.2 — dos ficheros de Colección no pueden derivar el mismo identificador.
     *
     * Va aquí por lo mismo que el cotejo: un esquema juzga un fichero a la vez y esto es
     * una relación entre ficheros, que sin puerta se pierde en silencio.
     */
    formaDeLasColecciones(),

    sitemap({
      /*
       * Historia 12.1 — aquí no se decide nada.
       *
       * Este filtro tenía tres expresiones regulares propias —la paginación, `/buscar` y
       * `/kit`— y era el tercero de los tres sitios donde se declaraba si una superficie
       * es publicable. Que el sitemap tuviera su propia lista es lo que permitía que una
       * página se declarase `noindex` en el armazón y siguiera anunciándose aquí, o al
       * revés. Ahora consume la declaración única de `src/lib/superficies.ts`, la misma
       * de la que salen el `noindex` y el índice de la búsqueda propia.
       *
       * Ante una ruta que nadie ha declarado, `anunciableEnElSitemap` devuelve `false` en
       * vez de romper, y es deliberado: por aquí pasan también las páginas sonda que las
       * pruebas de build añaden al proyecto temporal —`tests/unit/aislamiento-de-revision.
       * test.ts`—, que no son superficies del sitio y no tienen por qué declararse. El
       * silencio nunca publica de más.
       *
       * Quien sí grita por una superficie sin declarar es `Armazon.astro`, que rompe el
       * build al construirla, y la que sostiene la garantía en el repositorio es la
       * comprobación estructural de `tests/unit/publicable-y-alcanzable.test.ts`: compara
       * los ficheros de `src/pages/` con las declaraciones y falla si sobra alguno. Este
       * filtro no es una puerta, y por eso no finge serlo.
       *
       * Esta línea sí está vigilada, y desde el camino que el CI recorre: la misma prueba
       * construye un sitio y coteja su `dist/sitemap-0.xml` contra lo que la declaración
       * dice anunciable. Borrarla dejaba antes el build, `astro check` y `npm test` en
       * verde mientras el sitio anunciaba `/buscar`, `/kit`, la 404 y las páginas 2+.
       */
      filter: anunciableEnElSitemap,
    }),
  ],

  // UX-DR3 — las dos familias de DESIGN.md por la Fonts API, con `latin-ext` para que
  // los diacríticos españoles y las comillas angulares « » tengan cobertura completa.
  // Sin `latin-ext`, la eñe y las vocales acentuadas caerían al tipo de reserva y la
  // Cita se compondría con dos fuentes distintas en la misma línea.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Source Serif 4',
      cssVariable: '--fuente-serif',
      subsets: ['latin', 'latin-ext'],
      weights: [400, 600],
      styles: ['normal', 'italic'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--fuente-sans',
      subsets: ['latin', 'latin-ext'],
      weights: [400, 600],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
