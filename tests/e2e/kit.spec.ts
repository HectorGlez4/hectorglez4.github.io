import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { caracterDe, rutaNormalizada } from '../../src/lib/superficies.ts';

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

  test('tampoco lo encuentra la búsqueda propia', async ({ page }) => {
    /*
     * `noindex` habla con el buscador de fuera y no con el de dentro. Sin excluirlo del
     * índice de Pagefind, el Kit aparecía entre los resultados del propio sitio: una
     * herramienta sin enlaces entrantes dejaba de ser privada por la puerta de atrás, y
     * de paso ensuciaba las búsquedas con una página que no es contenido.
     */
    await page.goto('/buscar');
    await page.locator('[data-consulta]').fill('kit del día');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-resultados]')!.children.length > 0 ||
        !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
      undefined,
      { timeout: 10_000 },
    );

    const enlaces = await page.locator('[data-resultados] a').evaluateAll((ns) =>
      ns.map((n) => n.getAttribute('href')),
    );
    expect(enlaces).not.toContain('/kit');
  });

  test('ninguna página pública enlaza al Kit', () => {
    /*
     * «Pública» y no «ninguna», y la distinción se volvió real en la Historia 13.1: `/lote`
     * enlaza al Kit a propósito —son la misma herramienta en dos momentos— y a `/lote`
     * tampoco llega ningún enlace desde el producto. Quien decide cuáles no cuentan es la
     * declaración única de `src/lib/superficies.ts`, no una lista de excepciones escrita
     * aquí: una superficie ajena nueva quedaría exenta sola, y una de producto que enlazara
     * al Kit seguiría poniendo esto en rojo.
     */
    const enlazan: string[] = [];

    (function recorrer(dir: string) {
      for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
          recorrer(ruta);
          continue;
        }
        if (!entrada.endsWith('.html')) continue;

        const relativa = ruta.slice(dist.length).replace(/\.html$/, '').replace(/\/index$/, '/');
        // Lo que el build genera y nadie declara —una sonda de otra prueba— no es una
        // superficie del sitio y no se juzga aquí.
        let ajena = false;
        try {
          ajena = caracterDe(rutaNormalizada(relativa)) === 'ajena';
        } catch {
          continue;
        }
        if (ajena) continue;

        if (/href="\/kit"/.test(readFileSync(ruta, 'utf8'))) enlazan.push(relativa);
      }
    })(dist);

    expect(enlazan, 'páginas del producto que enlazan al Kit').toEqual([]);
  });

  test('y el enlace que sí existe sale de una superficie que tampoco es alcanzable', () => {
    // Sin esto, la comprobación de arriba se volvería verde el día que nadie enlazara al
    // Kit por ningún lado, y dejaría de vigilar nada.
    const lote = readFileSync(join(dist, 'lote.html'), 'utf8');
    expect(lote).toContain('href="/kit"');
    expect(caracterDe('/lote')).toBe('ajena');
  });
});
