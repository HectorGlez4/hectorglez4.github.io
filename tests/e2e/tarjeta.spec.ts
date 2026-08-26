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
