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
    for (const ruta of paginasDeCita()) {
      const meta = metadatos(readFileSync(join(dist, `${ruta}.html`), 'utf8'));
      const camino = new URL(meta['og:image']).pathname;

      const respuesta = await request.get(camino);
      expect(respuesta.status(), `${camino} no se sirve`).toBe(200);
      expect(respuesta.headers()['content-type']).toContain('image/png');

      const bytes = await respuesta.body();
      // La cabecera IHDR de un PNG trae ancho y alto en los bytes 16..24.
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
      // Una tarjeta de cuatro bytes sería técnicamente accesible y visualmente nada.
      expect(bytes.length).toBeGreaterThan(5000);
    }
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
