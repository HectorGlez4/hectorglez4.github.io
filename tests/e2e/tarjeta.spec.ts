import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Historia 10.1 — la Tarjeta Social, vista como la ve un validador de previsualización. */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Todas las Páginas de Cita construidas, por su ruta pública. */
function paginasDeCita(): string[] {
  return readdirSync(join(dist, 'cita'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `/cita/${f.replace(/\.html$/, '')}`);
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

    for (const ruta of paginasDeCita()) {
      const html = readFileSync(join(dist, `${ruta}.html`), 'utf8');
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
    const html = readFileSync(join(dist, `${paginasDeCita()[0]}.html`), 'utf8');
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
      const meta = metadatos(readFileSync(join(dist, `${ruta}.html`), 'utf8'));
      expect(meta['og:image']).toMatch(/^https:\/\//);
    }
  });
});

test.describe('Historia 10.1 — ninguna imagen inaccesible', () => {
  test('cada Tarjeta declarada existe, se sirve como PNG y mide 1200×630', async ({ request }) => {
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

    const revisar = async (ruta: string) => {
      const meta = metadatos(readFileSync(join(dist, `${ruta}.html`), 'utf8'));
      const camino = new URL(meta['og:image']).pathname;

      const respuesta = await request.get(camino);
      expect(respuesta.status(), `${camino} no se sirve`).toBe(200);
      expect(respuesta.headers()['content-type'], camino).toContain('image/png');

      const bytes = await respuesta.body();
      // La cabecera IHDR de un PNG trae ancho y alto en los bytes 16..24.
      expect(bytes.subarray(1, 4).toString(), camino).toBe('PNG');
      expect(bytes.readUInt32BE(16), camino).toBe(1200);
      expect(bytes.readUInt32BE(20), camino).toBe(630);
      // Una tarjeta de cuatro bytes sería técnicamente accesible y visualmente nada.
      expect(bytes.length, camino).toBeGreaterThan(5000);
      revisadas += 1;
    };

    for (let desde = 0; desde < rutas.length; desde += A_LA_VEZ) {
      await Promise.all(rutas.slice(desde, desde + A_LA_VEZ).map(revisar));
    }

    expect(revisadas, 'se han quedado tarjetas sin mirar').toBe(rutas.length);
    expect(rutas.length, 'no hay tarjetas que mirar').toBeGreaterThan(100);
  });

  test('toda página que el sitemap anuncia declara una imagen, sea propia o de marca', async ({
    request,
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
    const rutas = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      new URL(m[1]!).pathname.replace(/\/$/, ''),
    );
    expect(rutas.length, 'el sitemap no anuncia nada').toBeGreaterThan(100);

    const sinImagen: string[] = [];
    for (const ruta of rutas) {
      const respuesta = await request.get(ruta === '' ? '/' : ruta);
      if (respuesta.status() !== 200) continue;
      const imagen = metadatos(await respuesta.text())['og:image'];
      if (!imagen?.startsWith('https://')) sinImagen.push(ruta === '' ? '/' : ruta);
    }

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
