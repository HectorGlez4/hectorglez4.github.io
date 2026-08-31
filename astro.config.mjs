// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITIO } from './src/lib/dominio.ts';
import { anunciableEnElSitemap } from './src/lib/superficies.ts';
import cotejoDeCitas from './integraciones/cotejo.ts';
import formaDeLasColecciones from './integraciones/colecciones.ts';
import coberturaTipografica from './integraciones/cobertura.ts';

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

  /*
   * La barra final es parte de la ruta, y estas dos líneas van juntas.
   *
   * `format: 'directory'` publica `tema/la-vida/index.html` en vez de `tema/la-vida.html`,
   * y eso es lo que decide qué sirve el hospedaje. Con `'file'` respondía `/tema/la-vida`
   * y `/tema/la-vida/` daba **404**: ningún enlace del sitio la escribía con barra, pero
   * cualquiera pegado desde fuera con una barra de más caía en la página de error. Con
   * `'directory'`, GitHub Pages sirve la forma con barra y redirige la otra con un 301, así
   * que responden las dos y ninguna se pierde.
   *
   * `trailingSlash: 'always'` es la otra mitad, y sin ella el arreglo sale al revés: el
   * sitio seguiría anunciándose —canónica, sitemap, RSS— en la forma sin barra, que ahora
   * es la que redirige. Cada enlace interno pagaría un salto y la canónica apuntaría a una
   * URL que no sirve directa; el buscador acabaría indexando la forma con barra igual, pero
   * sin que nadie lo hubiera decidido. Los constructores de `src/lib/superficies.ts`
   * escriben esa misma forma, y `tests/unit/barra-final.test.ts` impide volver a la otra.
   */
  trailingSlash: 'always',

  server: { port: PUERTO_DEL_SERVIDOR },
  build: { format: 'directory' },
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

    /*
     * Ninguna página se publica con un carácter que las fuentes declaradas abajo no sepan
     * componer.
     *
     * Va aquí, y no en el esquema de contenido, porque lo que se juzga es la página ya
     * compuesta: un carácter puede entrar por una Cita, por un rótulo de `src/lib/` o por
     * una plantilla, y solo el HTML final los tiene todos. Es la puerta que vuelve segura
     * la decisión de bajar `subsets` a `latin`: sin ella, una Cita con una `ő` se
     * publicaría componiéndose en Georgia a mitad de línea, sin que nada fallara ni
     * avisara.
     */
    coberturaTipografica(),

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

  /*
   * UX-DR3 — las dos familias de DESIGN.md por la Fonts API.
   *
   * Solo el subconjunto `latin` y solo el estilo `normal`. Las dos restricciones se
   * miden en la Cita: cada cara que se declara aquí es un `.woff2` **precargado**, y los
   * precargados compiten por el ancho de banda en el camino crítico. Con `latin-ext` y
   * las cursivas eran ocho ficheros y 460 KiB; el LCP en móvil salía a 3,2 s con un HTML
   * de 22 KiB. Ahora son dos ficheros y ~99 KiB.
   *
   * Lo que se retiró no se usaba, y no es una apuesta:
   *
   * - `latin-ext` **no** cubre lo español. Este comentario decía lo contrario —que sin él
   *   «la eñe y las vocales acentuadas caerían al tipo de reserva»— y era falso: `ñ á é
   *   í ó ú ü`, las angulares « » y los signos de apertura ¿ ¡ viven todos en
   *   U+0000–U+00FF, que es `latin`. `latin-ext` empieza en U+0100 y cubre el polaco, el
   *   rumano o el húngaro, que el corpus no tiene.
   * - Las cursivas no las selecciona nadie. La familia serif se aplica a texto de Cita,
   *   nombre de Autor y nombre de Tema, y ninguna regla del sitio pide `font-style:
   *   italic`. Se descargaban cuatro caras que ningún elemento podía llegar a componer.
   *   `styles` va explícito en las dos familias porque su valor por omisión es
   *   `['normal', 'italic']`: Inter no declaraba estilos y traía cursivas igual.
   *
   * Que siga siendo verdad no depende de que alguien lo recuerde. `coberturaTipografica()`
   * —arriba, en `integrations`— rompe el build si una página publicada contiene un
   * carácter que las caras declaradas aquí no saben componer. Ampliar esta lista ensancha
   * la puerta sola: la puerta lee los `unicode-range` que este bloque emite, no una copia.
   */
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Source Serif 4',
      cssVariable: '--fuente-serif',
      subsets: ['latin'],
      weights: [400, 600],
      styles: ['normal'],
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--fuente-sans',
      subsets: ['latin'],
      weights: [400, 600],
      styles: ['normal'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
