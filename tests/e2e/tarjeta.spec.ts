import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pedir, porTandas } from './ayuda/tandas.ts';

/** Historia 10.1 — la Tarjeta Social, vista como la ve un validador de previsualización. */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Todas las Páginas de Cita construidas, por su ruta pública. */
function paginasDeCita(): string[] {
  /*
   * Se listan carpetas, no ficheros: con `build.format: 'directory'` cada Página de Cita
   * es `dist/cita/<slug>/index.html`. Filtrando por `.html` esto devolvía la lista vacía,
   * y las comprobaciones que recorren la lista pasaban en verde sin mirar ni una tarjeta.
   */
  return readdirSync(join(dist, 'cita'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `/cita/${e.name}`);
}

/** Las cabeceras `<meta>` de una página, como diccionario. */
function metadatos(html: string): Record<string, string> {
  const encontrados: Record<string, string> = {};
  for (const etiqueta of html.match(/<meta[^>]+>/g) ?? []) {
    const clave = etiqueta.match(/(?:property|name)="([^"]+)"/)?.[1];
    const valor = etiqueta.match(/content="([^"]*)"/)?.[1];
    if (clave && valor !== undefined) encontrados[clave] = valor;
  }
  return encontrados;
}

test.describe('Historia 10.1 — toda Cita publicada declara su Tarjeta', () => {
  test('cada Página de Cita declara una imagen propia, no un genérico del sitio', () => {
    const imagenes = new Set<string>();

    /*
     * Antes que nada, que haya algo que mirar. Cuando `paginasDeCita()` devolvía la lista
     * vacía —filtraba por `.html` y las páginas pasaron a ser carpetas—, el bucle no corría
     * y la comparación final quedaba en `0 === 0`: verde sin haber visto una sola Tarjeta.
     */
    expect(paginasDeCita().length, 'no hay Páginas de Cita que mirar').toBeGreaterThan(100);

    for (const ruta of paginasDeCita()) {
      const html = readFileSync(join(dist, ruta, 'index.html'), 'utf8');
      const meta = metadatos(html);
      const imagen = meta['og:image'];

      expect(imagen, `${ruta} no declara imagen`).toBeTruthy();
      expect(imagen).toContain(`/tarjeta/${ruta.replace('/cita/', '')}.png`);
      imagenes.add(imagen!);
    }

    // Ninguna repetida: si hubiera un genérico del sitio, todas apuntarían a la misma.
    expect(imagenes.size).toBe(paginasDeCita().length);
  });

  test('declara lo que un validador necesita para componer la previsualización', () => {
    const html = readFileSync(join(dist, paginasDeCita()[0], 'index.html'), 'utf8');
    const meta = metadatos(html);

    expect(meta['og:title']).toBeTruthy();
    expect(meta['og:description']).toBeTruthy();
    expect(meta['og:url']).toMatch(/^https:\/\//);
    // Sin `twitter:card`, X muestra la miniatura cuadrada aunque la imagen sea apaisada.
    expect(meta['twitter:card']).toBe('summary_large_image');
    expect(meta['og:image:width']).toBe('1200');
    expect(meta['og:image:height']).toBe('630');
  });

  test('la imagen declarada es absoluta: la resuelve el servidor de la red, no la página', () => {
    for (const ruta of paginasDeCita()) {
      const meta = metadatos(readFileSync(join(dist, ruta, 'index.html'), 'utf8'));
      expect(meta['og:image']).toMatch(/^https:\/\//);
    }
  });
});

test.describe('Historia 10.1 — ninguna imagen inaccesible', () => {
  test('cada Tarjeta declarada existe, se sirve como PNG y mide 1200×630', async ({ baseURL }) => {
    /*
     * Ésta es una **prueba de barrido**: recorre el Corpus entero, no una página.
     *
     * El presupuesto por defecto de Playwright son 30 s y vale para las pruebas que miran una
     * cosa. Éstas crecen con el Corpus, y la cuenta lo dice sin lugar a dudas: el recorrido de
     * NFR-5 tardaba 11,2 s con 1230 páginas y **20,5 s con 1466**; la de Tarjetas baja una imagen
     * por Cita publicada, y son más de mil trescientas.
     *
     * Las dos se pararon por tiempo —la 94.ª, la 114.ª y la 117.ª— y las dos se paralelizaron ya.
     * Seguir exprimiendo el paralelismo sería el tercer parche al mismo problema: **lo que hay no
     * es una prueba lenta, son dos clases de prueba con costes distintos**, y eso se declara.
     *
     * `test.slow()` triplica el presupuesto de ésta y solo de ésta. No toca ningún umbral del
     * producto —`MAX_SALTOS_DESDE_LA_PORTADA` sigue en 3— ni cambia lo que se comprueba: cambia
     * cuánto se le deja tardar a una prueba que mira mil cosas en vez de una. Se revierte
     * borrando la línea.
     */
    test.slow();

    /*
     * Se piden por tandas y no de una en una — 114.ª sesión.
     *
     * Esta prueba baja **una imagen por Cita publicada**, y son más de mil trescientas. Aislada
     * tardaba 7,9 s de los 30 que tiene; en la tanda completa, compitiendo por el servidor, se
     * pasaba y moría por tiempo. No fallaba la aserción: **no llegaba a evaluarla**, que es la
     * peor forma de rojo porque no dice nada.
     *
     * Es el mismo caso que el recorrido de NFR-5 en la 94.ª y el mismo arreglo: **cambia cuántas
     * se miran a la vez, y nada más**. Se comprueba lo mismo de cada tarjeta, una por una, y el
     * mensaje de error sigue nombrando el camino que falló.
     *
     * El coste crece con el Corpus, así que subir el tiempo máximo solo compraría unas sesiones.
     */
    const A_LA_VEZ = 12;
    const rutas = paginasDeCita();
    /*
     * Se cuentan las revisadas y se comprueba al final, porque el riesgo propio de repartir en
     * tandas es **saltarse alguna sin que nada chille**: una tanda mal cortada deja tarjetas sin
     * mirar y la prueba pasa igual, verde y vacía.
     *
     * Y conviene decir cómo se comprobó esto, porque el primer intento no valió: rompí una tarjeta
     * de `dist/` a 200 bytes esperando ver el rojo, y salió verde. No porque la prueba no mire,
     * sino porque el `webServer` corre `npm run build` antes de servir y **regeneró la tarjeta**.
     * Lo que probé fue que el build repara, no que la prueba detecta. Esta cuenta sí es
     * comprobable sin pelearse con el build.
     */
    let revisadas = 0;
    /*
     * Lo que falla se anota con su camino y se afirma una vez al final, como `sinImagen` más
     * abajo: con un `expect` por comprobación eran más de veintiséis mil, y su coste —no el de
     * bajar las imágenes— era el que llevaba esta prueba a los 90 s (`tests/e2e/ayuda/tandas.ts`).
     */
    const problemas: string[] = [];

    const revisar = async (ruta: string) => {
      const meta = metadatos(readFileSync(join(dist, ruta, 'index.html'), 'utf8'));
      const camino = new URL(meta['og:image']).pathname;

      // Con el `fetch` de Node y no el `request` de Playwright: `tests/e2e/ayuda/tandas.ts`.
      const respuesta = await pedir(baseURL, camino);
      const bytes = Buffer.from(await respuesta.arrayBuffer());
      const tipo = respuesta.headers.get('content-type') ?? '';
      const fallos: string[] = [];
      if (respuesta.status !== 200) fallos.push(`no se sirve (${respuesta.status})`);
      if (!tipo.includes('image/png')) fallos.push(`se sirve como «${tipo}»`);

      // La cabecera IHDR de un PNG trae ancho y alto en los bytes 16..24.
      if (bytes.length < 24 || bytes.subarray(1, 4).toString() !== 'PNG') fallos.push('no es un PNG');
      else if (bytes.readUInt32BE(16) !== 1200 || bytes.readUInt32BE(20) !== 630) {
        fallos.push(`mide ${bytes.readUInt32BE(16)}×${bytes.readUInt32BE(20)}`);
      }
      // Una tarjeta de cuatro bytes sería técnicamente accesible y visualmente nada.
      if (bytes.length <= 5000) fallos.push(`pesa ${bytes.length} bytes`);

      if (fallos.length > 0) problemas.push(`${camino}: ${fallos.join(', ')}`);
      revisadas += 1;
    };

    for (let desde = 0; desde < rutas.length; desde += A_LA_VEZ) {
      await Promise.all(rutas.slice(desde, desde + A_LA_VEZ).map(revisar));
    }

    expect(problemas, 'Tarjetas declaradas que no se sirven como PNG de 1200×630').toEqual([]);
    expect(revisadas, 'se han quedado tarjetas sin mirar').toBe(rutas.length);
    expect(rutas.length, 'no hay tarjetas que mirar').toBeGreaterThan(100);
  });

  test('toda página que el sitemap anuncia declara una imagen, sea propia o de marca', async ({
    request,
    baseURL,
  }) => {
    /*
     * La comprobación que faltaba, y por qué se escribe por el **sitemap** y no por una lista.
     *
     * Hasta la 159.ª, `og:image` se comprobaba superficie por superficie: las Páginas de Cita
     * arriba, y las de Tema, Autor y Colección desde la 53.ª. Cada vez que aparecía una
     * superficie nueva había que acordarse de añadirla, y `/buscar` llevaba desde siempre en el
     * sitemap **sin imagen ninguna**: quien la compartía obtenía un enlace pelado. Nadie lo vio
     * porque no había nada que mirase el conjunto.
     *
     * El sitemap es la lista de lo que el sitio ofrece al mundo, así que es el censo correcto:
     * una superficie nueva entra aquí sola el día que se publica, sin que nadie se acuerde.
     *
     * El 404 y las superficies de trabajo —`/kit`, `/lote`— **no** están en el sitemap a
     * propósito y por eso quedan fuera: no son páginas que se compartan.
     */
    const sitemap = await request.get('/sitemap-0.xml');
    expect(sitemap.status()).toBe(200);
    /*
     * La ruta se pide **tal y como la anuncia el sitemap**, con su barra final. Quitarla
     * no era cosmético: cada una de las 1.715 pasaba a ser un 301 que había que seguir, y
     * la prueba se quedaba sin contexto antes de acabar.
     */
    const rutas = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1]!).pathname,
    );
    expect(rutas.length, 'el sitemap no anuncia nada').toBeGreaterThan(100);

    const sinImagen: string[] = [];
    // Por tandas y con el `fetch` de Node, como el barrido de arriba: `tests/e2e/ayuda/tandas.ts`.
    await porTandas(rutas, async (ruta) => {
      const respuesta = await pedir(baseURL, ruta);
      if (respuesta.status !== 200) return void (await respuesta.arrayBuffer());
      const imagen = metadatos(await respuesta.text())['og:image'];
      if (!imagen?.startsWith('https://')) sinImagen.push(ruta);
    });

    expect(sinImagen, 'páginas anunciadas y sin previsualización').toEqual([]);
  });

  test('una Cita en revisión no tiene tarjeta: las rutas salen del conjunto publicable', () => {
    const tarjetas = readdirSync(join(dist, 'tarjeta')).filter(
      // Desde la 55.ª sesión, en este directorio cae también `portada.png` —la Tarjeta del
      // sitio, que no es de ninguna Cita— y los subdirectorios `tema/`, `coleccion/` y
      // `autor/`, que `readdirSync` no lista como `.png`. La cuenta sigue siendo de Citas.
      (f) => f.endsWith('.png') && f !== 'portada.png',
    );
    expect(tarjetas.length).toBe(paginasDeCita().length);
  });
});
