import { expect, test } from '@playwright/test';
import { REDES, enlaceConOrigen } from '../../src/lib/redes.ts';

/** Historia 8.2 — la marca de origen no cambia nada de lo que ve el visitante. */

const CITA = '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los';

test.describe('Historia 8.2 — el Kit ofrece un enlace por red', () => {
  test('hay uno por cuenta y cada uno lleva su marca', async ({ page }) => {
    await page.goto('/kit');
    const enlaces = page.locator('[data-redes]').first().locator('a');
    await expect(enlaces).toHaveCount(REDES.length);

    const marcas = new Set<string>();
    for (const red of REDES) {
      const enlace = page.locator(`[data-red="${red.id}"]`).first();
      const href = (await enlace.getAttribute('href'))!;
      expect(href).toContain(`?de=${red.id}`);
      marcas.add(href);
    }
    expect(marcas.size, 'dos redes comparten la misma marca').toBe(REDES.length);
  });

  test('los enlaces marcados llevan a la Página de Cita de verdad', async ({ page, request }) => {
    await page.goto('/kit');
    const href = (await page.locator('[data-red="instagram"]').first().getAttribute('href'))!;
    // El alojamiento estático ignora la cadena de consulta y sirve la misma página.
    expect((await request.get(href, { maxRedirects: 0 })).status()).toBe(200);
  });
});

test.describe('Historia 8.2 — para el buscador y para el visitante, la misma página', () => {
  test('la canónica es idéntica con marca y sin ella', async ({ page }) => {
    const canonicaDe = async (ruta: string) => {
      await page.goto(ruta);
      return page.locator('link[rel="canonical"]').getAttribute('href');
    };

    const sinMarca = await canonicaDe(CITA);
    for (const red of REDES) {
      expect(await canonicaDe(enlaceConOrigen(CITA, red.id)), `con ${red.id}`).toBe(sinMarca);
    }
    // Y la canónica no arrastra la marca: si lo hiciera, el buscador vería cinco páginas.
    expect(sinMarca).not.toContain('?');
  });

  test('el visitante no percibe ninguna diferencia', async ({ page }) => {
    const contenidoDe = async (ruta: string) => {
      await page.goto(ruta);
      return page.locator('main, .pagina').first().innerText();
    };

    const sinMarca = await contenidoDe(CITA);
    const conMarca = await contenidoDe(enlaceConOrigen(CITA, 'tiktok'));
    expect(conMarca).toBe(sinMarca);
  });

  test('la marca no deja rastro en el navegador del visitante', async ({ page }) => {
    await page.goto(enlaceConOrigen(CITA, 'facebook'));
    expect(await page.context().cookies()).toEqual([]);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  });
});
