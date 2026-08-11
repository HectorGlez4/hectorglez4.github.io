import { expect, test } from '@playwright/test';

/** Historia 4.3 — la página 404 como puerta de entrada. */

const INEXISTENTE = '/cita/esta-url-no-corresponde-a-nada';

test.describe('Historia 4.3 — el 404 no es un muro', () => {
  test('una URL que no existe devuelve 404 de verdad', async ({ request }) => {
    const respuesta = await request.get(INEXISTENTE, { maxRedirects: 0 });
    expect(respuesta.status()).toBe(404);
    // Y sirve la página propia, no la del alojamiento.
    expect(await respuesta.text()).toContain('Sabiduría Diaria');
  });

  test('trae el campo de búsqueda', async ({ page }) => {
    await page.goto(INEXISTENTE);
    const campo = page.locator('input[type="search"]');
    await expect(campo).toBeVisible();
    await expect(page.locator('form[role="search"]')).toHaveAttribute('action', '/buscar');
  });

  test('trae la Cita del Día, la misma que la portada', async ({ page }) => {
    await page.goto(INEXISTENTE);
    const enElCuatroCientos = await page.locator('.del-dia blockquote .texto').innerText();

    await page.goto('/');
    const enLaPortada = await page.locator('.del-dia blockquote .texto').innerText();

    expect(enElCuatroCientos).toBe(enLaPortada);
  });

  test('la Cita del Día enlaza a su página', async ({ page, request }) => {
    await page.goto(INEXISTENTE);
    const href = (await page.locator('.ir a').getAttribute('href'))!;
    expect((await request.get(href, { maxRedirects: 0 })).status()).toBe(200);
  });

  test('no contiene texto de error técnico', async ({ page }) => {
    await page.goto(INEXISTENTE);
    const texto = await page.locator('main').innerText();

    expect(texto).not.toMatch(/\b404\b/);
    expect(texto).not.toMatch(/error|not found|excepci|servidor|solicitada/i);
    // Frases completas con punto final, sin exclamaciones (UX-DR21).
    expect(texto).not.toMatch(/[!¡]/);
  });

  test('usa el mismo armazón y los mismos tokens que el resto', async ({ page }) => {
    await page.goto(INEXISTENTE);

    await expect(page.locator('header .marca')).toBeVisible();
    await expect(page.locator('footer.pie')).toBeVisible();

    // El mismo papel y la misma tinta: no hay una hoja de estilos de error aparte.
    const fondo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(fondo);
  });

  test('mantiene la alineación de columna del resto del sitio', async ({ page }) => {
    await page.goto(INEXISTENTE);
    const bordes = await page.evaluate(() =>
      ['.marca', 'h1', '.pie p'].map((s) =>
        Math.round(document.querySelector(s)!.getBoundingClientRect().left),
      ),
    );
    expect(new Set(bordes).size).toBe(1);
  });

  test('tampoco descarga scripts', async ({ page }) => {
    const scripts: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto(INEXISTENTE, { waitUntil: 'networkidle' });
    expect(scripts).toHaveLength(0);
  });

  test('no está en el sitemap', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('/404');
  });
});
