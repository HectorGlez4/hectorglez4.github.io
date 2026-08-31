import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMINIO, SITIO } from '../../src/lib/dominio.ts';

/** Historia 7.1 — lo construido se declara en el dominio definitivo. */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

test.describe('Historia 7.1 — el dominio en lo que se despliega', () => {
  test('el artefacto lleva el fichero que el hospedaje exige', () => {
    // Sin él, GitHub Pages descarta el dominio propio en el siguiente despliegue.
    expect(readFileSync(join(dist, 'CNAME'), 'utf8').trim()).toBe(DOMINIO);
  });

  test('el sitemap declara el dominio definitivo en todas sus entradas', async ({ request }) => {
    const indice = await (await request.get('/sitemap-index.xml')).text();
    const mapas = [...indice.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(mapas.length).toBeGreaterThan(0);

    for (const mapa of mapas) {
      expect(mapa.startsWith(`${SITIO}/`), `el índice apunta a ${mapa}`).toBe(true);
      const cuerpo = await (await request.get(new URL(mapa).pathname)).text();
      const entradas = [...cuerpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      expect(entradas.length).toBeGreaterThan(0);
      for (const entrada of entradas) {
        // La portada es el único `<loc>` sin ruta detrás: sale como el origen y su barra.
        const enElDominio = entrada === SITIO || entrada.startsWith(`${SITIO}/`);
        expect(enElDominio, `entrada fuera del dominio: ${entrada}`).toBe(true);
      }
    }
  });

  test('cada página publicada se declara canónica en el dominio definitivo', async ({ request }) => {
    const indice = await (await request.get('/sitemap-index.xml')).text();
    const mapa = indice.match(/<loc>([^<]+)<\/loc>/)![1];
    const cuerpo = await (await request.get(new URL(mapa).pathname)).text();
    const rutas = [...cuerpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

    for (const ruta of rutas) {
      const html = await (await request.get(ruta)).text();
      const canonica = html.match(/<link rel="canonical" href="([^"]+)"/)![1];
      expect(canonica.startsWith(`${SITIO}/`), `${ruta} se declara en ${canonica}`).toBe(true);
    }
  });

  test('ninguna página se declara en un origen relativo o vacío', async ({ request }) => {
    for (const ruta of ['/', '/buscar', '/404']) {
      const html = await (await request.get(ruta)).text();
      const canonica = html.match(/<link rel="canonical" href="([^"]+)"/)![1];
      expect(canonica).toMatch(/^https:\/\//);
    }
  });
});
