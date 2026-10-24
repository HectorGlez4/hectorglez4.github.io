import { expect, test } from '@playwright/test';
import { MARCA } from '../../src/lib/marca.ts';
import { apuntarGuiones, fueraDeLaListaAlCargar } from './ayuda/guiones.ts';

/** Historia 4.3 — la página 404 como puerta de entrada. */

const INEXISTENTE = '/cita/esta-url-no-corresponde-a-nada';

test.describe('Historia 4.3 — el 404 no es un muro', () => {
  test('una URL que no existe devuelve 404 de verdad', async ({ request }) => {
    const respuesta = await request.get(INEXISTENTE, { maxRedirects: 0 });
    expect(respuesta.status()).toBe(404);
    // Y sirve la página propia, no la del alojamiento.
    expect(await respuesta.text()).toContain(MARCA);
  });

  test('trae el campo de búsqueda', async ({ page }) => {
    await page.goto(INEXISTENTE);
    const campo = page.locator('input[type="search"]');
    await expect(campo).toBeVisible();
    await expect(page.locator('form[role="search"]')).toHaveAttribute('action', '/buscar/');
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
    /*
     * Se mira la **prosa de la página**, no el catálogo de Temas que lleva debajo.
     *
     * La 156.ª publicó un Tema llamado «El error» —asunto legítimo de un catálogo de
     * sabiduría, con dieciséis Citas de ocho firmas— y esta prueba se puso roja: el chip del
     * Tema aparece en `main` y la palabra casaba. La promesa que esta prueba guarda es que
     * **al visitante no se le enseña jerga técnica**, y un enlace rotulado «El error» dentro
     * de un índice de Temas no es jerga: es el índice funcionando.
     *
     * El defecto estaba en el alcance, no en la señal, y llevaba ahí desde el principio:
     * funcionaba sólo porque ningún Tema se llamaba así todavía. Apretar el alcance conserva
     * la promesa entera; renombrar el Tema habría dejado que un patrón escribiera el
     * catálogo.
     */
    const texto = await page.locator('main').evaluate((main) => {
      const copia = main.cloneNode(true) as HTMLElement;
      copia.querySelectorAll('.chips').forEach((chips) => chips.remove());
      return copia.textContent ?? '';
    });

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

  test('tampoco descarga más guion que los declarados', async ({ page, baseURL }) => {
    /*
     * Historia 23.1 — de «no descarga ningún fichero de script» a «solo los guiones externos
     * declarados», como pide la Historia 23.1: al cargar, a lo sumo el de medición, que es lo
     * único de la lista cerrada de `src/lib/guiones.ts` que se pide sin tocar nada. Contra este
     * servidor, construido desde la 23.2 con el punto final del receptor local
     * (`playwright.config.ts`), se pide el fichero de medición —lo exige
     * `receptor-local.spec.ts`, que además lo ve llegar al D1 local—, y esta prueba lo admite por
     * estar en la lista.
     * `tests/e2e/receptor.spec.ts` exige además que sea exactamente uno.
     */
    const pedidos = apuntarGuiones(page, baseURL!);
    await page.goto(INEXISTENTE, { waitUntil: 'networkidle' });
    expect(fueraDeLaListaAlCargar(pedidos), `el 404 pidió ${pedidos.join(', ')}`).toEqual([]);
  });

  test('no está en el sitemap', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('/404');
  });
});
