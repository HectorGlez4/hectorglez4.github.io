import { expect, test } from '@playwright/test';
import { temaBajoUmbral } from './ayuda/corpus.ts';

/**
 * Historia 2.5 — Página de Tema con umbral de publicación.
 *
 * Comprueba el criterio **en los dos sentidos** contra el corpus real y no contra datos
 * fabricados: un Tema que llega al umbral tiene página, y uno que no llega, no la tiene.
 *
 * El lado de abajo **se deriva**, y eso costó una lección. Estaba fijado a mano —«La amistad»,
 * que en el corpus de 231 Citas no llegaba— y el encabezado de este fichero lo daba por estable:
 * «el corpus sembrado deja seis Temas por debajo». Con 761 Citas **los doce Temas se publican**,
 * y estas pruebas llevaban varias sesiones afirmando que un Tema publicado no debía tener página.
 *
 * Cambiar un nombre fijado por otro sería el mismo fallo esperando a la siguiente siembra. Se le
 * pregunta al Corpus; y cuando no hay ninguno por debajo, la prueba **se salta diciéndolo**, que
 * es distinto de pasar.
 */

/* «La vida» tiene 118 Citas: el lado de arriba no necesita derivarse para ser cierto. */
const PUBLICADO = '/tema/la-vida';

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
  const bajoUmbral = temaBajoUmbral();
  const sinCondicion = `Hoy no hay ningún Tema por debajo del umbral: los ${
    bajoUmbral === undefined ? 'declarados' : ''
  } se publican todos. No hay nada que comprobar aquí, y decirlo es más honrado que pasar.`;

  test('no tiene página', async ({ request }) => {
    test.skip(bajoUmbral === undefined, sinCondicion);
    expect((await request.get(`/tema/${bajoUmbral}`)).status()).toBe(404);
  });

  test('no aparece en el sitemap', async ({ request }) => {
    test.skip(bajoUmbral === undefined, sinCondicion);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain(`/tema/${bajoUmbral}`);
  });

  test('el sitemap solo contiene Temas que existen', async ({ request }) => {
    // La divergencia que AD-11 impide: una superficie publica un Tema que otra no.
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const temas = [...sitemap.matchAll(/<loc>[^<]*\/tema\/([^<\/]+)\/<\/loc>/g)].map((m) => m[1]);
    expect(temas.length).toBeGreaterThan(0);

    for (const tema of temas) {
      expect((await request.get(`/tema/${tema}/`)).status(), tema).toBe(200);
    }
  });
});
