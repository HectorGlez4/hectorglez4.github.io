import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  citaConLosDosBloques,
  citaDeAutorConUnaSola,
  citaSinMasDelAutor,
  citaSinMismaObra,
  temaBajoUmbral,
} from './ayuda/corpus.ts';

/**
 * Historia 2.6 — rutas de salida desde cada Cita; Historia 24.6 — al pie, más de la misma obra y
 * más del Autor.
 *
 * Las Citas se derivan del Corpus, nunca se fijan a mano: una siembra cambia qué Cita tiene qué
 * bloques, y una fijada acabaría afirmando lo que ya no es.
 */

const AUTOR_DE_UNA = citaDeAutorConUnaSola();
const DOS_BLOQUES = ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaConLosDosBloques());
const SIN_MISMA_OBRA = ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaSinMismaObra());
const SIN_MAS_DEL_AUTOR = ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaSinMasDelAutor());

const NAV = 'nav.salidas[aria-label="Seguir leyendo"]';

/** Lo que pinta el pie de la página abierta: grupos, rótulos, tarjetas y cierres. */
async function leerPie(page: Page) {
  return page.locator(NAV).evaluate((nav) =>
    [...nav.querySelectorAll(':scope > section')].map((seccion) => ({
      clase: seccion.className.split(/\s+/)[0],
      rotulo: { etiqueta: seccion.querySelector('.rotulo')?.tagName.toLowerCase(), texto: seccion.querySelector('.rotulo')?.textContent?.trim() },
      tarjetas: [...seccion.querySelectorAll('li.tarjeta a')].map((a) => ({
        href: a.getAttribute('href')!,
        obra: a.querySelector('.obra')?.textContent ?? undefined,
        autor: a.querySelector('.autor')?.textContent ?? undefined,
      })),
      cierre: ((a) => (a === null ? undefined : { href: a.getAttribute('href')!, texto: (a.textContent ?? '').replace(/\s+/g, ' ').trim() }))(
        seccion.querySelector('li.fila-de-bloque a'),
      ),
    })),
  );
}

test.describe('Historia 24.6 — al pie, más de la misma obra y más del Autor', () => {
  test('con los dos bloques: en su orden, con su `h2`, sin repetir la propia ni la siguiente, y con cierres que llevan a una página', async ({
    page,
    request,
  }) => {
    expect(DOS_BLOQUES, 'El Corpus no tiene ninguna Cita de una Obra de 4 o más cuyo Autor tenga Citas fuera de ella.').toBeDefined();
    await page.goto(DOS_BLOQUES!);
    const grupos = await leerPie(page);
    expect(grupos.map((g) => g.clase)).toEqual(['de-la-misma-obra', 'mas-del-autor', 'temas-de-la-cita'].slice(0, grupos.length));
    expect(grupos.slice(0, 2).map((g) => g.clase)).toEqual(['de-la-misma-obra', 'mas-del-autor']);
    for (const g of grupos) expect(g.rotulo.etiqueta, g.clase).toBe('h2');
    const [misma, mas] = grupos;
    expect(misma.rotulo.texto).toBe('De la misma obra');
    expect(misma.tarjetas.length).toBeGreaterThan(0);
    expect(misma.tarjetas.length).toBeLessThanOrEqual(3);
    expect(mas.tarjetas.length).toBeGreaterThan(0);
    expect(mas.tarjetas.length).toBeLessThanOrEqual(4);

    const autor = (await page.locator('figcaption .autor a').first().textContent())!.trim();
    const titulo = await page.locator('.tarjeta-de-obra .titulo').textContent();
    expect(mas.rotulo.texto?.toLowerCase()).toBe(`más de ${autor}`.toLowerCase());
    const siguiente = await page.locator('.tarjeta-de-obra li[data-zona="siguiente"] a').getAttribute('href');
    const todas = [...misma.tarjetas, ...mas.tarjetas].map((t) => t.href);
    expect(todas).not.toContain(new URL(page.url()).pathname);
    if (siguiente !== null) expect(todas).not.toContain(siguiente);
    expect(new Set(todas).size).toBe(todas.length);
    // «De la misma obra» sin atribución; «Más de» con la Obra, nunca la de esta Cita, y sin Autor.
    for (const t of misma.tarjetas) expect([t.obra, t.autor]).toEqual([undefined, undefined]);
    for (const t of mas.tarjetas) {
      expect(t.autor).toBeUndefined();
      expect(t.obra).not.toBe(titulo);
    }

    expect(misma.cierre?.texto).toMatch(new RegExp(`^Las \\d+ citas de .+ ›$`));
    expect(misma.cierre?.href).toMatch(/^\/obra\//);
    expect(mas.cierre?.texto).toMatch(new RegExp(`^Las \\d+ citas de ${autor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ›$`));
    expect(mas.cierre?.href).toMatch(/^\/autor\//);
    for (const href of [misma.cierre!.href, mas.cierre!.href, ...todas]) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
    // Las tarjetas de «Más de» son del mismo Autor: su página lo dice.
    for (const href of mas.tarjetas.map((t) => t.href)) {
      await page.goto(href);
      expect((await page.locator('figcaption .autor a').first().textContent())!.trim(), href).toBe(autor);
    }
  });

  test('una Cita de una Obra de dos no tiene «De la misma obra»', async ({ page }) => {
    expect(SIN_MISMA_OBRA, 'El Corpus no tiene ninguna Cita de una Obra de dos con Citas del Autor fuera de ella.').toBeDefined();
    await page.goto(SIN_MISMA_OBRA!);
    await expect(page.locator(`${NAV} .de-la-misma-obra`)).toHaveCount(0);
    await expect(page.locator(`${NAV} .mas-del-autor li.tarjeta`).first()).toBeVisible();
  });

  test('una Cita cuyo Autor es todo una Obra no tiene «Más de {Autor}»', async ({ page }) => {
    test.skip(SIN_MAS_DEL_AUTOR === undefined, 'Hoy ningún Autor del Corpus tiene todas sus Citas en una Obra de 4 o más.');
    await page.goto(SIN_MAS_DEL_AUTOR!);
    await expect(page.locator(`${NAV} .mas-del-autor`)).toHaveCount(0);
    await expect(page.locator(`${NAV} .de-la-misma-obra li.tarjeta`).first()).toBeVisible();
  });

  test('un Autor con una sola Cita no tiene «Más de {Autor}», y la página sigue teniendo salidas', async ({ page }) => {
    test.skip(AUTOR_DE_UNA === undefined, 'Hoy ningún Autor del Corpus tiene una sola Cita.');
    await page.goto(AUTOR_DE_UNA!);
    await expect(page.locator('.mas-del-autor')).toHaveCount(0);
    expect(await page.locator('main a[href^="/"]').count()).toBeGreaterThan(0);
  });
});

test.describe('Historia 2.6 — hacia dónde seguir', () => {
  test('no se renderiza ningún chip de un Tema sin página', async ({ page, request }) => {
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
});
