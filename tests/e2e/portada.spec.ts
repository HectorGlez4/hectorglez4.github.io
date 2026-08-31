import { expect, test } from '@playwright/test';
import { MARCA } from '../../src/lib/marca.ts';

/** Historia 4.1 — portada con Cita del Día. */

test.describe('Historia 4.1 — la portada', () => {
  test('muestra una Cita destacada enlazada a su Página de Cita', async ({ page, request }) => {
    await page.goto('/');
    const bloque = page.locator('.del-dia blockquote .texto');
    await expect(bloque).toBeVisible();

    const enlace = page.locator('.ir a');
    const href = await enlace.getAttribute('href');
    expect(href).toMatch(/^\/cita\//);
    expect((await request.get(href!, { maxRedirects: 0 })).status()).toBe(200);
  });

  test('la Cita destacada es una de las marcadas como aptas para portada', async ({ page }) => {
    await page.goto('/');
    const href = (await page.locator('.ir a').getAttribute('href'))!;
    const slug = href.replace('/cita/', '').replace(/\/$/, '');

    /*
     * Se contrasta contra el corpus en disco, no contra una lista repetida en la prueba
     * ni contra un fichero que el sitio publique para poder probarse: el producto no
     * necesita exponer el conjunto apto, así que no debe hacerlo solo para esto.
     */
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = new URL('../../corpus/citas/', import.meta.url).pathname;

    const aptas = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .filter((c) => /aptaParaPortada:\s*true/.test(c))
      .map((c) => /slug:\s*"([^"]+)"/.exec(c)?.[1]);

    expect(aptas.length).toBeGreaterThan(0);
    expect(aptas).toContain(slug);
  });

  test('ofrece el acceso a la búsqueda y entradas a los Temas publicados', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header a[href="/buscar/"]')).toBeVisible();

    const temas = page.locator('a[href^="/tema/"]');
    expect(await temas.count()).toBeGreaterThan(0);
  });

  test('dos visitantes de la misma jornada ven la misma Cita', async ({ browser }) => {
    // Dos contextos independientes, sin estado compartido: es lo que distingue una
    // selección hecha en el build de una hecha en el cliente.
    const uno = await browser.newContext();
    const otro = await browser.newContext();

    const leer = async (contexto: import('@playwright/test').BrowserContext) => {
      const pagina = await contexto.newPage();
      await pagina.goto('http://localhost:4321/');
      const texto = await pagina.locator('.del-dia blockquote .texto').innerText();
      await pagina.close();
      return texto;
    };

    expect(await leer(uno)).toBe(await leer(otro));
    await uno.close();
    await otro.close();
  });

  test('el contenido está en el HTML inicial y no descarga scripts', async ({ page, request }) => {
    const scripts: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(scripts).toHaveLength(0);

    // Y el texto de la Cita viaja en el HTML, sin ejecutar nada.
    const html = await (await request.get('/')).text();
    const texto = await page.locator('.del-dia blockquote .texto').innerText();
    expect(html).toContain(texto.slice(1, 30));
  });

  test('un único h1 y la Cita del Día no compite con él', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    // En la portada el h1 es la marca; la Cita del Día no es el título de la página.
    await expect(page.locator('h1')).toHaveText(MARCA);
  });
});
