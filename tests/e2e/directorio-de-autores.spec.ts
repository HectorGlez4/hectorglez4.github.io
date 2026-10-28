import { expect, test, type Page } from '@playwright/test';
import { rutaDelDirectorioDeAutores } from '../../src/lib/superficies.ts';

/**
 * Historia 26.3 — Todos los Autores, de la A a la Z, en el navegador.
 *
 * Lo que solo se ve con una página delante: que las letras y «Volver a las letras» llevan el foco
 * a su destino, con guion y sin él; que a 360 px caben seis letras por fila y todas a la vista
 * sin deslizar la rejilla; y que cada Fila lleva a su Página de Autor en la misma pestaña. Los
 * ejemplos salen de la página servida, nunca de una lista fija: el Corpus crece cada día.
 */

const RUTA = rutaDelDirectorioDeAutores();

/** Lo que tiene el foco ahora: su etiqueta, su `id` y su nombre accesible visible. */
async function foco(page: Page) {
  return page.evaluate(() => {
    const n = document.activeElement as HTMLElement | null;
    return n === null ? null : { etiqueta: n.tagName.toLowerCase(), id: n.id, texto: n.textContent?.trim() ?? '' };
  });
}

/** Pulsa una letra y luego el «Volver a las letras» de su grupo, mirando el foco cada vez. */
async function recorrerUnaLetra(page: Page) {
  await page.goto(RUTA);
  const letras = page.getByRole('navigation', { name: 'Letras' }).getByRole('link');
  const cuantas = await letras.count();
  expect(cuantas, 'el Directorio no tiene letras').toBeGreaterThan(1);

  // La segunda letra, para que el salto sea un salto de verdad y no el comienzo de la lista.
  const letra = letras.nth(1);
  const destino = (await letra.getAttribute('href'))!.slice(1);
  const inicial = (await letra.textContent())!.replace('Autores por la ', '').trim();
  await expect(letra).toHaveAccessibleName(`Autores por la ${inicial}`);

  await letra.click();
  await expect.poll(() => foco(page)).toEqual({ etiqueta: 'h2', id: destino, texto: inicial });

  const grupo = page.locator(`section.grupo:has(> h2[id="${destino}"])`);
  await grupo.getByRole('link', { name: 'Volver a las letras' }).click();
  await expect.poll(() => foco(page).then((f) => f && { etiqueta: f.etiqueta, id: f.id })).toEqual({
    etiqueta: 'nav',
    id: 'letras',
  });
}

test.describe('Historia 26.3 — las letras de salto', () => {
  test('con guion: la letra lleva el foco a su grupo, y «Volver a las letras», a las letras', async ({ page }) => {
    await recorrerUnaLetra(page);
  });

  test('sin guion, igual: son anclas de la propia página', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexto.newPage();
    try {
      await recorrerUnaLetra(page);
    } finally {
      await contexto.close();
    }
  });

  test('a 360 px, seis letras por fila y todas a la vista sin deslizar la rejilla', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(RUTA);
    const medida = await page.evaluate(() => {
      const lista = document.querySelector('#letras ul') as HTMLElement;
      const cajas = [...lista.querySelectorAll('a')].map((a) => a.getBoundingClientRect());
      const primeraFila = cajas.filter((c) => Math.abs(c.top - cajas[0].top) < 1).length;
      return {
        primeraFila,
        total: cajas.length,
        desborda: lista.scrollWidth > lista.clientWidth,
        fueraDeLaVentana: cajas.filter((c) => c.right > window.innerWidth || c.left < 0).length,
        lados: cajas.map((c) => [Math.round(c.width), Math.round(c.height)]),
      };
    });
    expect(medida.primeraFila).toBe(Math.min(6, medida.total));
    expect(medida.desborda).toBe(false);
    expect(medida.fueraDeLaVentana).toBe(0);
    for (const [ancho, alto] of medida.lados) {
      expect(ancho).toBeGreaterThanOrEqual(44);
      expect(alto).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Historia 26.3 — las Filas de Autor', () => {
  test('cada Fila, leída de la página servida, lleva a su Página de Autor en la misma pestaña', async ({ page, request }) => {
    await page.goto(RUTA);
    const filas = await page.locator('main li.fila-de-bloque[data-zona="directorio"] a').evaluateAll((as) =>
      as.map((a) => ({ href: a.getAttribute('href')!, target: a.getAttribute('target') })),
    );
    expect(filas.length, 'el Directorio no tiene ninguna Fila').toBeGreaterThan(0);
    for (const { href, target } of filas) {
      expect(href).toMatch(/^\/autor\/[^/]+\/$/u);
      expect(target, href).toBeNull();
    }
    // Una muestra servida de verdad: la primera, la del medio y la última.
    for (const { href } of [filas[0], filas[Math.floor(filas.length / 2)], filas.at(-1)!]) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });
});
