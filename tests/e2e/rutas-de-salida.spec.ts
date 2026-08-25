import { expect, test, type APIRequestContext } from '@playwright/test';
import { citaDeAutorConUnaSola, temaBajoUmbral } from './ayuda/corpus.ts';

/** Historia 2.6 — rutas de salida desde cada Cita. */

const CON_HERMANAS = '/cita/antonio-machado-hoy-es-siempre-todavia';
/*
 * La Cita de un Autor sin ninguna otra **se deriva**: estaba fijada, y era cierta hasta que una
 * siembra dio cinco Citas mas a ese Autor y la prueba paso a afirmar que quien tiene seis no
 * tiene hermanas.
 */
const AUTOR_DE_UNA = citaDeAutorConUnaSola();

test.describe('Historia 2.6 — hacia dónde seguir', () => {
  test('se ven hasta cuatro Citas más del mismo Autor', async ({ page }) => {
    await page.goto(CON_HERMANAS);
    const hermanas = page.locator('.hermanas li');
    const cuantas = await hermanas.count();

    expect(cuantas).toBeGreaterThan(0);
    expect(cuantas).toBeLessThanOrEqual(4);

    for (const href of await page
      .locator('.hermanas a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!))) {
      expect(href).toMatch(/^\/cita\/antonio-machado-/);
      // Y nunca la Cita en la que ya estamos.
      expect(href).not.toBe(CON_HERMANAS);
    }
  });

  test('se ven los chips de los Temas publicados', async ({ page }) => {
    await page.goto(CON_HERMANAS);
    const chips = page.locator('.chip');
    expect(await chips.count()).toBeGreaterThan(0);
    for (const href of await chips.evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!))) {
      expect(href).toMatch(/^\/(tema|autor)\//);
    }
  });

  test('no se renderiza ningún chip de un Tema sin página', async ({ page, request }) => {
    // Esta Cita pertenece además a «La adversidad», que se queda por debajo del umbral.
    test.skip(AUTOR_DE_UNA === undefined, 'Hoy ningún Autor del Corpus tiene una sola Cita.');
    await page.goto(AUTOR_DE_UNA!);
    const hrefs = await page.locator('.chip').evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));

    /*
     * El Tema sin página se deriva: estaba fijado como «La adversidad», que hoy tiene 65 Citas
     * y su página. El bucle de abajo cubre la intención general —ningún chip lleva a un 404—
     * y esta línea sigue siendo la comprobación concreta cuando la condición existe.
     */
    const bajoUmbral = temaBajoUmbral();
    if (bajoUmbral !== undefined) expect(hrefs).not.toContain(`/tema/${bajoUmbral}`);
    for (const href of hrefs) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });

  test('un Autor con una sola Cita no se queda sin salidas', async ({ page }) => {
    test.skip(AUTOR_DE_UNA === undefined, 'Hoy ningún Autor del Corpus tiene una sola Cita.');
    await page.goto(AUTOR_DE_UNA!);
    // No hay hermanas que ofrecer...
    expect(await page.locator('.hermanas li').count()).toBe(0);
    // ...pero la sección de salidas no está vacía.
    const salidas = page.locator('nav[aria-label="Seguir leyendo"] a');
    expect(await salidas.count()).toBeGreaterThan(0);
  });

  /*
   * Estas dos recorren **todas** las Páginas de Cita, y con 848 el navegador ya no llega: se
   * caían por tiempo agotado, no por lo que afirman. Así que piden el HTML en vez de navegar.
   *
   * **El cambio de fidelidad hay que decirlo**: se mira el HTML servido y no el DOM ya
   * montado. En un sitio estático son lo mismo dentro de `main` —nada inyecta enlaces ahí
   * después de cargar—, y si algún día algo lo hiciera, estas dos dejarían de verlo. A cambio
   * dejan de tardar más cada sesión, que era lo que iba a acabar borrándolas.
   */
  function enlacesInternosDe(html: string): string[] {
    const dentroDeMain = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? '';
    return [...dentroDeMain.matchAll(/<a\b[^>]*\shref="(\/[^"]*)"/gi)].map((m) => m[1]);
  }

  async function rutasDeCita(peticion: APIRequestContext): Promise<string[]> {
    const sitemap = await (await peticion.get('/sitemap-0.xml')).text();
    return [...sitemap.matchAll(/<loc>[^<]*(\/cita\/[^<]+)<\/loc>/g)].map((m) => m[1]);
  }

  test('ninguna Página de Cita publicada queda sin enlaces salientes', async ({ request }) => {
    const rutas = await rutasDeCita(request);
    expect(rutas.length).toBeGreaterThan(30);

    for (const ruta of rutas) {
      const internos = enlacesInternosDe(await (await request.get(ruta)).text());
      expect(internos.length, `${ruta} no tiene enlaces salientes`).toBeGreaterThan(0);
    }
  });

  test('ningún enlace saliente apunta a una página que no existe', async ({ request }) => {
    const destinos = new Set<string>();
    for (const ruta of await rutasDeCita(request)) {
      for (const href of enlacesInternosDe(await (await request.get(ruta)).text())) {
        destinos.add(href);
      }
    }

    expect(destinos.size).toBeGreaterThan(0);
    for (const destino of destinos) {
      expect((await request.get(destino, { maxRedirects: 0 })).status(), destino).toBe(200);
    }
  });

  test('la selección no usa ningún motor de recomendación', async ({ page }) => {
    // Deriva de Autor y de Tema y nada más: dos cargas seguidas dan el mismo orden.
    await page.goto(CON_HERMANAS);
    const primera = await page.locator('.hermanas a').allTextContents();
    await page.reload();
    const segunda = await page.locator('.hermanas a').allTextContents();
    expect(segunda).toEqual(primera);
  });
});
