import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Historia 8.1 — el Kit Diario de Publicación. */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

test.describe('Historia 8.1 — el material del día, ya compuesto', () => {
  test('la Imagen está dibujada sin pulsar nada', async ({ page }) => {
    await page.goto('/kit');

    // Se comprueba que el lienzo tiene píxeles, no solo que el elemento existe: un canvas
    // vacío también está «visible» y no sirve para publicar nada.
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });
  });

  test('el pie de atribución está escrito y se puede copiar', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/kit');

    const boton = page.locator('[data-copiar]').first();
    await expect(boton).toBeVisible();

    const carga = await boton.getAttribute('data-carga');
    expect(carga).toMatch(/^«.+» — .+\.$/);

    await boton.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(carga);
  });

  test('trae el enlace a la Página de Cita, y esa página existe', async ({ page, request }) => {
    await page.goto('/kit');
    const href = await page.locator('[data-enlace-cita]').first().getAttribute('href');
    expect(href).toMatch(/^\/cita\//);
    expect((await request.get(href!, { maxRedirects: 0 })).status()).toBe(200);
  });

  test('la Cita del Kit es la misma que la de la portada', async ({ page }) => {
    await page.goto('/');
    const enPortada = await page.locator('.ir a').getAttribute('href');

    await page.goto('/kit');
    const enElKit = await page.locator('[data-enlace-cita]').first().getAttribute('href');

    // Si el Kit publicara otra, las cuentas y el sitio contarían cosas distintas ese día.
    expect(enElKit).toBe(enPortada);
  });

  test('la imagen se lleva con el mismo gesto que en una Página de Cita', async ({ page }) => {
    await page.goto('/kit');
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar la imagen' }).first().click();
    const fichero = await descarga;
    expect(fichero.suggestedFilename()).toMatch(/\.png$/);
  });
});

test.describe('Historia 8.1 — el Kit no es una superficie del sitio', () => {
  test('se declara noindex', async ({ page }) => {
    await page.goto('/kit');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('no aparece en el sitemap', async ({ request }) => {
    const indice = await (await request.get('/sitemap-index.xml')).text();
    for (const mapa of [...indice.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)) {
      expect(await (await request.get(mapa)).text()).not.toContain('/kit');
    }
  });

  test('ninguna página pública enlaza al Kit', () => {
    const enlazan: string[] = [];

    (function recorrer(dir: string) {
      for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
          recorrer(ruta);
          continue;
        }
        if (!entrada.endsWith('.html') || entrada === 'kit.html') continue;
        if (/href="\/kit"/.test(readFileSync(ruta, 'utf8'))) enlazan.push(ruta.slice(dist.length));
      }
    })(dist);

    expect(enlazan, 'páginas que enlazan al Kit').toEqual([]);
  });
});
