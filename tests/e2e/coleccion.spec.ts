import { expect, test } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { superficiesDelBarrido } from '../../src/lib/superficies.ts';

/**
 * Historia 12.3 — la Página de Colección, mirada en el navegador.
 *
 * Lo que solo se ve mirando: la jerarquía visual, que la serif esté donde debe y en ningún
 * otro sitio, y que la página sea utilizable a 360 px. El resto del criterio —presentación
 * con el componente compartido, canónica, umbral, miembro retirado— se demuestra sobre el
 * HTML construido en `tests/unit/coleccion-pagina.test.ts`, que además corre en el CI.
 *
 * **Por qué la mitad de este fichero puede saltarse.** `corpus/colecciones/` está vacío a
 * propósito: curar es de Héctor y la herramienta llega en la Historia 12.4. Estas pruebas
 * corren contra el sitio real construido, así que hoy no hay ninguna Página de Colección
 * que visitar. Sembrar una de mentira en el corpus está prohibido por la especificación
 * —contaminaría el contenido publicado—, y no comprobar nada tampoco sirve. Se deriva del
 * `dist/` recién construido: en cuanto exista la primera Colección, estas pruebas se
 * ejecutan solas sin tocar nada. Las que **no** dependen de que exista —la derivación del
 * barrido y el comportamiento de la portada sin Colecciones— corren siempre.
 */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Las rutas que el sitio construyó de verdad, igual que en el barrido de accesibilidad. */
function rutasConstruidas(): string[] {
  const rutas: string[] = [];

  function recorrer(dir: string, prefijo: string) {
    for (const entrada of readdirSync(dir)) {
      const completa = join(dir, entrada);
      if (statSync(completa).isDirectory()) {
        recorrer(completa, `${prefijo}/${entrada}`);
        continue;
      }
      if (!entrada.endsWith('.html')) continue;
      const sinExtension = entrada.replace(/\.html$/, '');
      rutas.push(sinExtension === 'index' ? `${prefijo}/` : `${prefijo}/${sinExtension}`);
    }
  }

  recorrer(dist, '');
  return rutas;
}

const RUTAS = rutasConstruidas();

/** Las Páginas de Colección construidas: primeras páginas, sin las 2+. */
const COLECCIONES = RUTAS.filter((ruta) => /^\/coleccion\/[^/]+$/.test(ruta)).sort();
const PRIMERA: string | undefined = COLECCIONES[0];

const SIN_COLECCIONES =
  'No hay ninguna Colección publicada en el corpus: corpus/colecciones/ está vacío a ' +
  'propósito hasta que se cure la primera con la herramienta de la Historia 12.4.';

/**
 * La Colección que se mira, exigida y no supuesta.
 *
 * Solo la llaman pruebas que ya se han saltado si no hay ninguna, así que el `throw` no
 * puede ocurrir; está para que el tipo sea `string` sin un `!` que tape un descuido futuro.
 */
function laColeccion(): string {
  if (PRIMERA === undefined) throw new Error(SIN_COLECCIONES);
  return PRIMERA;
}

test.describe('Historia 12.3 — la familia entra sola en el barrido', () => {
  test('la declaración basta: nadie escribe la ruta en ninguna lista', () => {
    /*
     * El criterio de aceptación, comprobado por el mecanismo y no por el resultado.
     * `tests/e2e/accesibilidad.spec.ts` construye su barrido llamando exactamente a esta
     * función con las rutas del `dist/`, así que demostrar aquí que reconoce una ruta de
     * Colección demuestra que el barrido la recogerá el día que exista.
     *
     * La lista es **sintética y cerrada**, no `[...RUTAS, …]`. La derivación devuelve la
     * primera muestra de cada familia en orden alfabético, así que partir del `dist/` real
     * ataría la aserción al corpus: el día que exista `/coleccion/aforismos`, la muestra
     * dejaría de ser la que aquí se nombra y la prueba fallaría por algo que no está
     * midiendo.
     */
    const SITIO_DE_JUGUETE = [
      '/',
      '/404',
      '/buscar',
      '/cita/una-cita',
      '/autor/un-autor',
      '/tema/un-tema',
      '/coleccion/una-coleccion',
      '/coleccion/una-coleccion/2',
    ];

    expect(superficiesDelBarrido(SITIO_DE_JUGUETE)).toContain('/coleccion/una-coleccion');
    // Y la página 2 de una Colección no entra en el barrido, como en Autor y Tema.
    expect(superficiesDelBarrido(SITIO_DE_JUGUETE)).not.toContain('/coleccion/una-coleccion/2');
    // Y sin ninguna ruta de Colección construida, la familia no aparece: nadie la escribe.
    expect(
      superficiesDelBarrido(SITIO_DE_JUGUETE.filter((r) => !r.startsWith('/coleccion/'))),
    ).not.toContain('/coleccion/una-coleccion');
  });

  test('y si el sitio ya trae alguna, el barrido la recoge sin excepción', () => {
    test.skip(PRIMERA === undefined, SIN_COLECCIONES);
    expect(superficiesDelBarrido(RUTAS)).toContain(laColeccion());
  });
});

test.describe('Historia 12.3 — la portada sin Colecciones, que es el estado de hoy', () => {
  test('no hay sección vacía ni promesa de que la habrá', async ({ page }) => {
    test.skip(PRIMERA !== undefined, 'El corpus ya publica alguna Colección.');

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Colecciones' })).toHaveCount(0);
    await expect(page.locator('a[href^="/coleccion/"]')).toHaveCount(0);
    // Y la portada sigue teniendo sus salidas: la ausencia no se ha llevado nada por delante.
    await expect(page.getByRole('heading', { name: 'Autores' })).toHaveCount(1);
  });

  test('con Colecciones publicadas, cada una tiene su chip a un salto', async ({ page }) => {
    test.skip(PRIMERA === undefined, SIN_COLECCIONES);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Colecciones' })).toHaveCount(1);
    for (const ruta of COLECCIONES) {
      await expect(page.locator(`a[href="${ruta}"]`), ruta).toHaveCount(1);
    }
  });
});

test.describe('Historia 12.3 — la Página de Colección', () => {
  test.beforeEach(() => {
    test.skip(PRIMERA === undefined, SIN_COLECCIONES);
  });

  test('el nombre es el único h1, y va en Source Serif', async ({ page }) => {
    await page.goto(laColeccion());
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.locator('h1').evaluate((n) => getComputedStyle(n).fontFamily)).toContain(
      'Source Serif',
    );
  });

  test('la serif no aparece en nada más que el nombre y el texto de las Citas', async ({
    page,
  }) => {
    /*
     * UX-DR31 — la serif está reservada al texto de Cita, al nombre de Autor, al de Tema y,
     * desde esta historia, al de Colección. El criterio editorial y la paginación van en
     * Inter. Se mide sobre la fuente calculada de todo el contenido, que es la única forma
     * de cazar una regla que se cuele por herencia.
     */
    await page.goto(laColeccion());
    const conSerif = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((n) => getComputedStyle(n).fontFamily.includes('Source Serif'))
        .map((n) => `${n.tagName.toLowerCase()}.${n.className}`),
    );

    for (const elemento of conSerif) {
      expect(elemento, `serif fuera de lo permitido: ${elemento}`).toMatch(/^(h1|span\.fragmento)/);
    }
    expect(conSerif.some((e) => e.startsWith('h1'))).toBe(true);
  });

  test('la jerarquía baja del nombre a las Citas y del listado al criterio', async ({ page }) => {
    await page.goto(laColeccion());

    const tamaños = await page.evaluate(() => {
      const px = (sel: string) => {
        const n = document.querySelector(sel);
        return n ? Number.parseFloat(getComputedStyle(n).fontSize) : 0;
      };
      return {
        nombre: px('h1'),
        fragmento: px('.listado .fragmento'),
        criterio: px('.criterio p'),
      };
    });

    // El nombre manda sobre las Citas, y el criterio va por debajo de todo lo citado.
    expect(tamaños.nombre).toBeGreaterThan(tamaños.fragmento);
    expect(tamaños.criterio).toBeLessThan(tamaños.fragmento);
  });

  test('el criterio va al pie, después del listado y no antes', async ({ page }) => {
    await page.goto(laColeccion());
    const enOrden = await page.evaluate(() => {
      const listado = document.querySelector('.listado');
      const criterio = document.querySelector('.criterio');
      if (!listado || !criterio) return false;
      // `DOCUMENT_POSITION_FOLLOWING` — el criterio va después del listado en el documento.
      return (listado.compareDocumentPosition(criterio) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(enOrden).toBe(true);
  });

  test('cada tarjeta enlaza a la Página de Cita, y ninguna se queda en la Colección', async ({
    page,
    request,
  }) => {
    await page.goto(laColeccion());
    const destinos = await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));

    expect(destinos.length).toBeGreaterThan(0);
    for (const destino of destinos) {
      expect(destino).toMatch(/^\/cita\//);
      expect((await request.get(destino, { maxRedirects: 0 })).status(), destino).toBe(200);
    }
  });

  test('a 360 px no hay desplazamiento horizontal y todo se puede tocar', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(laColeccion());

    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);

    const altos = await page
      .locator('main a')
      .evaluateAll((ns) =>
        ns.map((n) => n.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => r.height),
      );
    expect(altos.length).toBeGreaterThan(0);
    for (const alto of altos) expect(alto).toBeGreaterThanOrEqual(44);
  });

  test('está en el sitemap y no se declara `noindex`', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toContain(laColeccion());

    await page.goto(laColeccion());
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test('no hay migas de pan ni enlace de vuelta desde la Página de Cita', async ({ page }) => {
    // UX-DR34 se recortó en validación: la Colección enlaza a las Citas y no al revés.
    await page.goto(laColeccion());
    await expect(page.locator('nav[aria-label*="miga" i], nav[aria-label*="ruta" i]')).toHaveCount(
      0,
    );

    const primeraCita = await page.locator('.listado li a').first().getAttribute('href');
    await page.goto(primeraCita!);
    await expect(page.locator('a[href^="/coleccion/"]')).toHaveCount(0);
  });
});
