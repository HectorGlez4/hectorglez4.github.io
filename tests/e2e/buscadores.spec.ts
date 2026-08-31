import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITIO } from '../../src/lib/dominio.ts';
import { RUTA_DEL_SITEMAP } from '../../src/lib/buscadores.ts';

/** Historia 7.2 — los tres canales dicen lo mismo. */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Toda página construida, con su ruta pública y si se declara indexable. */
function paginasConstruidas(): { ruta: string; indexable: boolean }[] {
  const salida: { ruta: string; indexable: boolean }[] = [];

  function recorrer(dir: string) {
    for (const entrada of readdirSync(dir)) {
      const completa = join(dir, entrada);
      if (statSync(completa).isDirectory()) {
        recorrer(completa);
        continue;
      }
      if (!entrada.endsWith('.html')) continue;

      const html = readFileSync(completa, 'utf8');
      const relativa = completa.slice(dist.length).replace(/\.html$/, '');
      /*
       * El `index` final se quita a cualquier profundidad y deja la barra puesta: con
       * `build.format: 'directory'` **toda** página es un `index.html` dentro de su
       * carpeta, y la ruta que anuncia el sitemap es la que acaba en barra. Comparado
       * contra `'/index'` a secas, cada página del sitio salía como `/cita/x/index`, no
       * casaba con nada anunciado y las 1.715 se declaraban huérfanas.
       */
      salida.push({
        ruta: relativa.replace(/(^|\/)index$/, '/'),
        indexable: !/<meta name="robots" content="noindex/.test(html),
      });
    }
  }

  recorrer(dist);
  return salida;
}

/** Las rutas que el sitemap anuncia. */
async function rutasDelSitemap(request: import('@playwright/test').APIRequestContext) {
  const indice = await (await request.get(RUTA_DEL_SITEMAP)).text();
  const mapas = [...indice.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const rutas: string[] = [];
  for (const mapa of mapas) {
    const cuerpo = await (await request.get(mapa)).text();
    rutas.push(...[...cuerpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname || '/'));
  }
  return rutas;
}

test.describe('Historia 7.2 — robots.txt', () => {
  test('existe y se sirve como texto', async ({ request }) => {
    const respuesta = await request.get('/robots.txt');
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()['content-type']).toContain('text/plain');
  });

  test('declara la ubicación del sitemap, y ahí hay un sitemap de verdad', async ({ request }) => {
    const texto = await (await request.get('/robots.txt')).text();
    const anunciado = texto.match(/^Sitemap: (\S+)$/m)?.[1];
    expect(anunciado, 'no declara ningún sitemap').toBeTruthy();
    expect(anunciado).toBe(`${SITIO}${RUTA_DEL_SITEMAP}`);

    const sitemap = await request.get(new URL(anunciado!).pathname);
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<loc>');
  });

  test('no bloquea ninguna página que el sitemap anuncia', async ({ request }) => {
    const texto = await (await request.get('/robots.txt')).text();
    const bloqueadas = [...texto.matchAll(/^Disallow: (\S+)$/gm)].map((m) => m[1]);
    const anunciadas = await rutasDelSitemap(request);

    for (const ruta of anunciadas) {
      const choca = bloqueadas.find((patron) => ruta.startsWith(patron));
      expect(choca, `${ruta} está anunciada y bloqueada por «Disallow: ${choca}»`).toBeUndefined();
    }
  });

  test('tampoco bloquea lo que se pide no indexar: si no se rastrea, no se lee el noindex', async ({ request }) => {
    const texto = await (await request.get('/robots.txt')).text();
    expect(texto).not.toMatch(/^Disallow: \S/m);
  });
});

test.describe('Historia 7.2 — los tres coinciden', () => {
  test('todo lo anunciado en el sitemap se declara indexable', async ({ request }) => {
    const anunciadas = new Set(await rutasDelSitemap(request));
    const noIndexables = paginasConstruidas()
      .filter((p) => !p.indexable && anunciadas.has(p.ruta))
      .map((p) => p.ruta);

    expect(noIndexables, 'anunciadas en el sitemap y marcadas noindex').toEqual([]);
  });

  test('nada de lo que se pide no indexar aparece en el sitemap', async ({ request }) => {
    const anunciadas = new Set(await rutasDelSitemap(request));
    const coladas = paginasConstruidas()
      .filter((p) => !p.indexable)
      .filter((p) => anunciadas.has(p.ruta))
      .map((p) => p.ruta);

    expect(coladas).toEqual([]);
  });

  test('toda página indexable está anunciada: ninguna se queda sin canal', async ({ request }) => {
    const anunciadas = new Set(await rutasDelSitemap(request));
    const huerfanas = paginasConstruidas()
      .filter((p) => p.indexable && !anunciadas.has(p.ruta))
      .map((p) => p.ruta);

    expect(huerfanas, 'indexables que el sitemap no anuncia').toEqual([]);
  });
});
