import { expect, test } from '@playwright/test';

/**
 * Historia 2.5 — Página de Tema con umbral de publicación.
 *
 * El corpus sembrado deja «La vida» con 17 Citas y «El saber» con 15 —los dos por encima
 * del umbral— y otros seis Temas por debajo. Eso permite comprobar el criterio en los dos
 * sentidos contra el corpus real y no contra datos fabricados.
 */

const PUBLICADO = '/tema/la-vida';
const BAJO_UMBRAL = '/tema/la-amistad';

test.describe('Historia 2.5 — un Tema por encima del umbral', () => {
  test('se ven Citas de varios Autores, cada una enlazada a su página', async ({ page }) => {
    await page.goto(PUBLICADO);
    const tarjetas = page.locator('.listado li');
    expect(await tarjetas.count()).toBeGreaterThanOrEqual(15);

    const autores = await page
      .locator('.listado li .autor')
      .evaluateAll((ns) => ns.map((n) => n.textContent!.trim()));
    expect(new Set(autores).size).toBeGreaterThan(1);

    for (const href of await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!))) {
      expect(href).toMatch(/^\/cita\//);
    }
  });

  test('el nombre del Tema es el h1 y va en serif', async ({ page }) => {
    await page.goto(PUBLICADO);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('La vida');
    expect(await page.locator('h1').evaluate((n) => getComputedStyle(n).fontFamily)).toContain(
      'Source Serif',
    );
  });

  test('está en el sitemap', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toContain('/tema/la-vida');
  });

  test('cada enlace del listado existe', async ({ page, request }) => {
    await page.goto(PUBLICADO);
    const hrefs = await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));
    for (const href of hrefs) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });
});

test.describe('Historia 2.5 — un Tema por debajo del umbral', () => {
  test('no tiene página', async ({ request }) => {
    expect((await request.get(BAJO_UMBRAL)).status()).toBe(404);
  });

  test('no aparece en el sitemap', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('/tema/la-amistad');
  });

  test('el sitemap solo contiene Temas que existen', async ({ request }) => {
    // La divergencia que AD-11 impide: una superficie publica un Tema que otra no.
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const temas = [...sitemap.matchAll(/<loc>[^<]*\/tema\/([^<\/]+)<\/loc>/g)].map((m) => m[1]);
    expect(temas.length).toBeGreaterThan(0);

    for (const tema of temas) {
      expect((await request.get(`/tema/${tema}`)).status(), tema).toBe(200);
    }
  });
});
