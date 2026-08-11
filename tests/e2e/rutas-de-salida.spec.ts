import { expect, test } from '@playwright/test';

/** Historia 2.6 — rutas de salida desde cada Cita. */

const CON_HERMANAS = '/cita/antonio-machado-hoy-es-siempre-todavia';
const AUTOR_DE_UNA = '/cita/rosalia-de-castro-yo-no-se-lo-que-busco-eternamente';

test.describe('Historia 2.6 — hacia dónde seguir', () => {
  test('se ven hasta cuatro Citas más del mismo Autor', async ({ page }) => {
    await page.goto(CON_HERMANAS);
    const hermanas = page.locator('.hermanas li');
    const cuantas = await hermanas.count();

    expect(cuantas).toBeGreaterThan(0);
    expect(cuantas).toBeLessThanOrEqual(4);

    for (const href of await page
      .locator('.hermanas a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!))) {
      expect(href).toMatch(/^\/cita\/antonio-machado-/);
      // Y nunca la Cita en la que ya estamos.
      expect(href).not.toBe(CON_HERMANAS);
    }
  });

  test('se ven los chips de los Temas publicados', async ({ page }) => {
    await page.goto(CON_HERMANAS);
    const chips = page.locator('.chip');
    expect(await chips.count()).toBeGreaterThan(0);
    for (const href of await chips.evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!))) {
      expect(href).toMatch(/^\/(tema|autor)\//);
    }
  });

  test('no se renderiza ningún chip de un Tema sin página', async ({ page, request }) => {
    // Esta Cita pertenece además a «La adversidad», que se queda por debajo del umbral.
    await page.goto(AUTOR_DE_UNA);
    const hrefs = await page.locator('.chip').evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));

    expect(hrefs).not.toContain('/tema/la-adversidad');
    for (const href of hrefs) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });

  test('un Autor con una sola Cita no se queda sin salidas', async ({ page }) => {
    await page.goto(AUTOR_DE_UNA);
    // No hay hermanas que ofrecer...
    expect(await page.locator('.hermanas li').count()).toBe(0);
    // ...pero la sección de salidas no está vacía.
    const salidas = page.locator('nav[aria-label="Seguir leyendo"] a');
    expect(await salidas.count()).toBeGreaterThan(0);
  });

  test('ninguna Página de Cita publicada queda sin enlaces salientes', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const rutas = [...sitemap.matchAll(/<loc>[^<]*(\/cita\/[^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(rutas.length).toBeGreaterThan(30);

    for (const ruta of rutas) {
      await page.goto(ruta);
      const internos = await page.evaluate(() =>
        [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href')!),
      );
      expect(internos.length, `${ruta} no tiene enlaces salientes`).toBeGreaterThan(0);
    }
  });

  test('ningún enlace saliente apunta a una página que no existe', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const rutas = [...sitemap.matchAll(/<loc>[^<]*(\/cita\/[^<]+)<\/loc>/g)].map((m) => m[1]);

    const destinos = new Set<string>();
    for (const ruta of rutas) {
      await page.goto(ruta);
      for (const href of await page.evaluate(() =>
        [...document.querySelectorAll('main a[href^="/"]')].map((a) => a.getAttribute('href')!),
      )) {
        destinos.add(href);
      }
    }

    expect(destinos.size).toBeGreaterThan(0);
    for (const destino of destinos) {
      expect((await request.get(destino, { maxRedirects: 0 })).status(), destino).toBe(200);
    }
  });

  test('la selección no usa ningún motor de recomendación', async ({ page }) => {
    // Deriva de Autor y de Tema y nada más: dos cargas seguidas dan el mismo orden.
    await page.goto(CON_HERMANAS);
    const primera = await page.locator('.hermanas a').allTextContents();
    await page.reload();
    const segunda = await page.locator('.hermanas a').allTextContents();
    expect(segunda).toEqual(primera);
  });
});
