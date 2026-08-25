import { expect, test } from '@playwright/test';
import { autorEnUnaPagina } from './ayuda/corpus.ts';

/** Historia 2.3 — Página de Autor. */

const MACHADO = '/autor/antonio-machado';

/*
 * El Autor de las pruebas que miran el listado entero **se deriva**: el que estaba fijado tenía
 * 36 Citas y la página son 50, hasta que una siembra lo dejó en 51. `MACHADO` se queda solo donde
 * lo que se comprueba es su semblanza, que no depende de cuántas Citas tenga.
 */
const enUnaPagina = autorEnUnaPagina();

test.describe('Historia 2.3 — ficha y listado de Autor', () => {
  test('se ve la semblanza en un párrafo breve', async ({ page }) => {
    await page.goto(MACHADO);
    const semblanza = page.locator('.semblanza');
    await expect(semblanza).toBeVisible();
    await expect(semblanza).toContainText('Poeta sevillano');
  });

  test('se ven todas sus Citas publicadas, cada una enlazada a su página', async ({ page, request }) => {
    test.skip(enUnaPagina === undefined, 'Ningún Autor del Corpus cabe hoy en una sola página.');
    await page.goto(`/autor/${enUnaPagina!.slug}`);
    const enlaces = page.locator('.listado li a');

    // El número sale del sitio construido, no de una constante repetida en la prueba.
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const patron = new RegExp(`/cita/(${enUnaPagina!.slug}-[^<]+)<`, 'g');
    const suyas = [...sitemap.matchAll(patron)].length;

    await expect(enlaces).toHaveCount(suyas);
    for (const href of await enlaces.evaluateAll((ns) => ns.map((n) => n.getAttribute('href')))) {
      expect(href).toMatch(new RegExp(`^/cita/${enUnaPagina!.slug}-`));
    }
  });

  test('el listado es una lista real', async ({ page }) => {
    await page.goto(MACHADO);
    await expect(page.locator('ul.listado')).toHaveCount(1);
    expect(await page.locator('.listado > li').count()).toBeGreaterThan(0);
  });

  test('un único h1, y es el nombre del Autor', async ({ page }) => {
    await page.goto(MACHADO);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Antonio Machado');
  });

  test('el nombre del Autor va en serif; el resto no', async ({ page }) => {
    await page.goto(MACHADO);
    const serif = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim() !== '')
        .filter((n) => getComputedStyle(n).fontFamily.includes('Source Serif'))
        .map((n) => n.tagName.toLowerCase()),
    );
    // El h1 (nombre de Autor) y los fragmentos de Cita de las tarjetas. Nada más.
    expect(new Set(serif)).toEqual(new Set(['h1', 'span']));
    expect(await page.locator('.semblanza').evaluate((n) => getComputedStyle(n).fontFamily)).not.toContain(
      'Source Serif',
    );
  });

  test('no aparece ninguna Cita en revisión', async ({ page, request }) => {
    await page.goto(MACHADO);
    const hrefs = await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));

    // Cada enlace del listado existe de verdad: ninguna tarjeta apunta a un 404.
    for (const href of hrefs) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });

  test('un Autor sin Citas publicadas no tiene página ni entra en el sitemap', async ({ request }) => {
    expect((await request.get('/autor/un-autor-que-no-existe')).status()).toBe(404);

    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('/autor/un-autor-que-no-existe');
  });

  test('con pocas Citas no aparece paginación', async ({ page }) => {
    test.skip(enUnaPagina === undefined, 'Ningún Autor del Corpus cabe hoy en una sola página.');
    await page.goto(`/autor/${enUnaPagina!.slug}`);
    await expect(page.locator('nav[aria-label*="Paginación"]')).toHaveCount(0);
  });

  test('la tarjeta entera es zona de toque de al menos 44px', async ({ page }) => {
    await page.goto(MACHADO);
    const alturas = await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().height));
    for (const alto of alturas) expect(alto).toBeGreaterThanOrEqual(44);
  });

  test('la página de Autor tampoco descarga scripts', async ({ page }) => {
    const scripts: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto(MACHADO, { waitUntil: 'networkidle' });
    expect(scripts).toHaveLength(0);
  });
});
