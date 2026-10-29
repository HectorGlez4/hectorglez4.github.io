import { expect, test, type Page } from '@playwright/test';
import {
  autorConBiografia,
  autorEnUnaPagina,
  autorEnVariasPaginas,
  citaConTituloDeObraMasLargo,
  citaSinObra,
  paginasDeAutor,
} from './ayuda/corpus.ts';
import { apuntarGuiones, fueraDeLaListaAlCargar } from './ayuda/guiones.ts';
import { comprobarNombresDeTarjetas } from './ayuda/tarjetas.ts';

/** Historia 2.3 — Página de Autor. */

const MACHADO = '/autor/antonio-machado';

/*
 * El Autor de las pruebas que miran el listado entero **se deriva**: el que estaba fijado tenía
 * 36 Citas y la página son 50, hasta que una siembra lo dejó en 51. `MACHADO` se queda solo donde
 * lo que se comprueba es su semblanza, que no depende de cuántas Citas tenga.
 */
const enUnaPagina = autorEnUnaPagina();

test.describe('Historia 2.3 — ficha y listado de Autor', () => {
  test('se ve la semblanza en un párrafo breve', async ({ page }) => {
    await page.goto(MACHADO);
    const semblanza = page.locator('.semblanza');
    await expect(semblanza).toBeVisible();
    await expect(semblanza).toContainText('Poeta sevillano');
  });

  test('se ven todas sus Citas publicadas, cada una enlazada a su página', async ({ page, request }) => {
    test.skip(enUnaPagina === undefined, 'Ningún Autor del Corpus cabe hoy en una sola página.');
    await page.goto(`/autor/${enUnaPagina!.slug}`);
    const enlaces = page.locator('.listado li a');

    // El número sale del sitio construido, no de una constante repetida en la prueba.
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    const patron = new RegExp(`/cita/(${enUnaPagina!.slug}-[^<]+)<`, 'g');
    const suyas = [...sitemap.matchAll(patron)].length;

    await expect(enlaces).toHaveCount(suyas);
    for (const href of await enlaces.evaluateAll((ns) => ns.map((n) => n.getAttribute('href')))) {
      expect(href).toMatch(new RegExp(`^/cita/${enUnaPagina!.slug}-`));
    }
  });

  test('el listado es una lista real', async ({ page }) => {
    await page.goto(MACHADO);
    await expect(page.locator('ul.listado')).toHaveCount(1);
    expect(await page.locator('.listado > li').count()).toBeGreaterThan(0);
  });

  test('un único h1, y es el nombre del Autor', async ({ page }) => {
    await page.goto(MACHADO);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Antonio Machado');
  });

  test('el nombre del Autor va en serif; el resto no', async ({ page }) => {
    await page.goto(MACHADO);
    const serif = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim() !== '')
        .filter((n) => getComputedStyle(n).fontFamily.includes('Source Serif'))
        .map((n) => n.tagName.toLowerCase()),
    );
    // El h1 (nombre de Autor) y los fragmentos de Cita de las tarjetas. Nada más.
    expect(new Set(serif)).toEqual(new Set(['h1', 'span']));
    expect(await page.locator('.semblanza').evaluate((n) => getComputedStyle(n).fontFamily)).not.toContain(
      'Source Serif',
    );
  });

  test('no aparece ninguna Cita en revisión', async ({ page, request }) => {
    await page.goto(MACHADO);
    const hrefs = await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));

    // Cada enlace del listado existe de verdad: ninguna tarjeta apunta a un 404.
    for (const href of hrefs) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });

  test('un Autor sin Citas publicadas no tiene página ni entra en el sitemap', async ({ request }) => {
    expect((await request.get('/autor/un-autor-que-no-existe/')).status()).toBe(404);

    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('/autor/un-autor-que-no-existe');
  });

  test('con pocas Citas no aparece paginación', async ({ page }) => {
    test.skip(enUnaPagina === undefined, 'Ningún Autor del Corpus cabe hoy en una sola página.');
    await page.goto(`/autor/${enUnaPagina!.slug}`);
    await expect(page.locator('nav[aria-label*="Paginación"]')).toHaveCount(0);
  });

  test('la tarjeta entera es zona de toque de al menos 44px', async ({ page }) => {
    await page.goto(MACHADO);
    const alturas = await page
      .locator('.listado li a')
      .evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().height));
    for (const alto of alturas) expect(alto).toBeGreaterThanOrEqual(44);
  });

  test('la página de Autor tampoco descarga más guion que los declarados', async ({ page, baseURL }) => {
    /*
     * Historia 23.1 — de «no descarga ningún fichero de script» a «solo los guiones externos
     * declarados»; la 17.4 conserva su criterio y solo cambia su prueba. Al cargar, a lo sumo el
     * de medición, que es lo único de la lista cerrada de `src/lib/guiones.ts` que se pide sin
     * tocar nada. Contra este
     * servidor, construido desde la 23.2 con el punto final del receptor local
     * (`playwright.config.ts`), se pide el fichero de medición —lo exige
     * `receptor-local.spec.ts`, que además lo ve llegar al D1 local—, y esta prueba lo admite por
     * estar en la lista.
     * `tests/e2e/receptor.spec.ts` exige además que sea exactamente uno.
     */
    const pedidos = apuntarGuiones(page, baseURL!);
    await page.goto(MACHADO, { waitUntil: 'networkidle' });
    expect(fueraDeLaListaAlCargar(pedidos), `la página de Autor pidió ${pedidos.join(', ')}`).toEqual([]);
  });
});

test.describe('Historia 17.3 — la Lista de Obras', () => {
  const UNAMUNO = '/autor/miguel-de-unamuno/';

  test('cada entrada es un enlace de al menos 44 px a su Página de Obra, que existe', async ({
    page,
    request,
  }) => {
    await page.goto(UNAMUNO);
    await expect(page.getByRole('heading', { level: 2, name: 'Su obra en este Corpus' })).toBeVisible();
    const enlaces = page.locator('.lista-de-obras li a');
    expect(await enlaces.count()).toBeGreaterThan(0);

    const filas = await enlaces.evaluateAll((ns) =>
      ns.map((n) => ({
        href: n.getAttribute('href')!,
        alto: n.getBoundingClientRect().height,
        subrayado: getComputedStyle(n).textDecorationLine,
      })),
    );
    for (const { href, alto, subrayado } of filas) {
      expect(href).toMatch(/^\/obra\/miguel-de-unamuno\/[^/]+\/$/);
      expect(alto, href).toBeGreaterThanOrEqual(44);
      expect(subrayado, href).toBe('none');
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });

  test('Historia 26.4 — cada entrada enseña la unidad: «N citas», o «1 cita»', async ({ page }) => {
    await page.goto(UNAMUNO);
    // Lo que se ve: sin la coma oculta, que es solo para el lector de pantalla.
    const recuentos = await page.locator('.lista-de-obras li .recuento').evaluateAll((ns) =>
      ns.map((n) => {
        const copia = n.cloneNode(true) as HTMLElement;
        copia.querySelectorAll('.oculto').forEach((o) => o.remove());
        return (copia.textContent ?? '').trim();
      }),
    );
    expect(recuentos.length).toBeGreaterThan(0);
    for (const recuento of recuentos) {
      expect(recuento).toMatch(/^(1 cita|(?!1 )\d+ citas)$/u);
    }
  });

  test('la página 2 no la lleva', async ({ page, request }) => {
    const segunda = '/autor/miguel-de-unamuno/2/';
    test.skip((await request.get(segunda)).status() !== 200, 'Unamuno cabe hoy en una sola página.');
    await page.goto(segunda);
    await expect(page.locator('.lista-de-obras')).toHaveCount(0);
  });
});

test.describe('Historia 17.4 — la ficha abre la página, y solo la primera', () => {
  /** h1 entero y borde superior de la semblanza dentro del primer viewport, sin desplazar. */
  async function fichaSinDesplazar(page: import('@playwright/test').Page, ruta: string) {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(ruta);
    const alto = page.viewportSize()!.height;

    const h1 = await page.locator('h1').boundingBox();
    expect(h1, 'h1').not.toBeNull();
    expect(h1!.y, 'h1').toBeGreaterThanOrEqual(0);
    expect(h1!.y + h1!.height, 'h1').toBeLessThanOrEqual(alto);

    const semblanza = await page.locator('.semblanza').boundingBox();
    expect(semblanza, '.semblanza').not.toBeNull();
    expect(semblanza!.y, '.semblanza').toBeGreaterThanOrEqual(0);
    expect(semblanza!.y, '.semblanza').toBeLessThan(alto);

    // Sin muro, modal ni aviso previo: nada se interpone.
    await expect(page.locator('dialog[open], [role="dialog"], [aria-modal="true"]')).toHaveCount(0);
  }

  test('a 360 × 640, el nombre y la semblanza se ven sin desplazar', async ({ page }) => {
    await fichaSinDesplazar(page, MACHADO);
  });

  test('a 360 × 640, también con la atribución de una semblanza ajena', async ({ page }) => {
    const slug = autorConBiografia();
    test.skip(slug === undefined, 'Ningún Autor del Corpus declara hoy biografía.');
    await fichaSinDesplazar(page, `/autor/${slug}/`);
  });

  test('la ficha va antes del catálogo', async ({ page }) => {
    await page.goto(MACHADO);
    const orden = await page.evaluate(() => {
      const rotulo = [...document.querySelectorAll('h2')].find(
        (n) => n.textContent?.trim() === 'Citas documentadas',
      );
      const listado = rotulo?.parentElement?.querySelector(':scope > ul.listado') ?? null;
      const y = (n: Element | null | undefined) =>
        n == null ? -1 : n.getBoundingClientRect().top + window.scrollY;
      return [
        y(document.querySelector('h1')),
        y(document.querySelector('.ficha .años')),
        y(document.querySelector('.ficha .semblanza')),
        y(document.querySelector('.obras-del-autor')),
        y(rotulo),
        y(listado),
      ];
    });
    for (const y of orden) expect(y).toBeGreaterThanOrEqual(0);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  test('la página 2 conserva solo el nombre y el listado, y no se indexa', async ({ page }) => {
    const autor = autorEnVariasPaginas();
    test.skip(autor === undefined, 'Ningún Autor del Corpus pasa hoy de una página.');
    await page.goto(`/autor/${autor!.slug}/2/`);
    await expect(page.locator('h1')).toHaveCount(1);
    for (const selector of ['.años', '.semblanza', '.lista-de-obras', '.obras-del-autor']) {
      await expect(page.locator(selector), selector).toHaveCount(0);
    }
    await expect(page.getByText('Semblanza tomada de')).toHaveCount(0);
    expect(await page.locator('.listado > li').count()).toBeGreaterThan(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

/**
 * Historia 24.3 — la línea de Obra de la Tarjeta de Cita, pintada.
 *
 * La prueba unitaria fija la regla `.obra` en la hoja y lo que lleva cada Tarjeta en `dist/`;
 * esto mide lo que el navegador hace con ellas a 320 px, con la Inter que el sitio carga y la
 * Obra de título más largo del Corpus, que se deriva —resuelta como en el build, por su ficha— y
 * no se fija. Los valores esperados salen de los tokens de la propia página.
 */
test.describe('Historia 24.3 — la línea de Obra en el listado de Autor', () => {
  const larga = citaConTituloDeObraMasLargo();
  const sinObra = citaSinObra();

  /** Abre la página del listado de `autor` que lleva la Tarjeta de `slug`, y la devuelve. */
  async function abrirLaPaginaDe(page: Page, autor: string, slug: string) {
    const enlace = page.locator(`.listado li a[href="/cita/${slug}/"]`);
    const paginas = paginasDeAutor(autor);
    for (let n = 1; n <= paginas; n += 1) {
      const ruta = n === 1 ? `/autor/${autor}/` : `/autor/${autor}/${n}/`;
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status(), ruta).toBe(200);
      const cuantas = await enlace.count();
      expect(cuantas, `${ruta}: la Tarjeta de ${slug} sale más de una vez`).toBeLessThanOrEqual(1);
      if (cuantas === 1) return enlace;
    }
    throw new Error(`Ninguna de las ${paginas} páginas de /autor/${autor}/ lleva la Tarjeta de ${slug}.`);
  }

  test('a 320 px el título más largo sale entero en Inter apagada, parte en líneas y no desborda', async ({ page }) => {
    test.skip(larga === undefined, 'Ninguna Cita del Corpus resuelve una Ficha de Obra.');
    const { slug, autor, titulo } = larga!;
    await page.setViewportSize({ width: 320, height: 640 });
    const enlace = await abrirLaPaginaDe(page, autor, slug);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.mouse.move(0, 0);

    const medida = await enlace.evaluate((a) => {
      const obra = a.querySelector(':scope > .obra');
      const fragmento = a.querySelector(':scope > .fragmento');
      if (obra === null || fragmento === null) return undefined;
      const sonda = document.createElement('span');
      sonda.style.cssText = 'color: var(--tinta-apagada); font-family: var(--sans); font-size: var(--pie)';
      document.body.append(sonda);
      const tokens = getComputedStyle(sonda);
      const esperado = { color: tokens.color, familia: tokens.fontFamily, tamaño: tokens.fontSize };
      sonda.remove();
      const e = getComputedStyle(obra);
      const caja = obra.getBoundingClientRect();
      // El ancho que el título ocuparía en una sola línea, con su misma fuente: si no cabe en la
      // caja, tiene que partir en varias. Así no hay umbral de caracteres que fijar.
      const enUnaLinea = document.createElement('span');
      enUnaLinea.style.cssText = `position: absolute; visibility: hidden; white-space: nowrap; font: ${e.font}`;
      enUnaLinea.textContent = obra.textContent;
      document.body.append(enUnaLinea);
      const natural = enUnaLinea.getBoundingClientRect().width;
      enUnaLinea.remove();
      const primera = e.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
      const raiz = document.documentElement;
      return {
        esperado,
        texto: obra.textContent ?? '',
        color: e.color,
        familia: e.fontFamily,
        primera,
        cargada: [...document.fonts].some(
          (f) => f.family.replace(/^["']|["']$/g, '') === primera && f.status === 'loaded',
        ),
        tamaño: e.fontSize,
        peso: e.fontWeight,
        transformacion: e.textTransform,
        espaciado: e.letterSpacing,
        lineas: Math.round(caja.height / parseFloat(e.lineHeight)),
        natural,
        disponible: caja.width,
        derecha: caja.right,
        ancho: raiz.clientWidth,
        desborde: raiz.scrollWidth - raiz.clientWidth,
        hueco: caja.top - fragmento.getBoundingClientRect().bottom,
        unidad: parseFloat(getComputedStyle(raiz).getPropertyValue('--unidad')),
      };
    });
    expect(medida, 'la Tarjeta no lleva fragmento y línea de Obra').toBeDefined();
    const m = medida!;
    // El título de la ficha, entero y al pie de la letra: ni recortado ni el de otra Obra.
    expect(m.texto).toBe(titulo);
    expect(m.familia).toBe(m.esperado.familia);
    // La Inter que el sitio declara y carga, no un respaldo del sistema con el mismo nombre de pila.
    expect(m.primera).toMatch(/^Inter(-|$)/);
    expect(m.cargada, `la cara «${m.primera}» no está cargada`).toBe(true);
    expect(m.color).toBe(m.esperado.color);
    expect(m.tamaño).toBe(m.esperado.tamaño);
    expect(m.peso).toBe('400');
    expect(m.transformacion).toBe('none');
    expect(m.espaciado).toBe('normal');
    expect(m.hueco).toBeCloseTo(m.unidad, 0);
    expect(m.derecha).toBeLessThanOrEqual(m.ancho);
    expect(m.desborde).toBe(0);
    // Un título que no cabe en una línea ocupa más, nunca se recorta (NFR-12); uno que cabe, una.
    if (m.natural > m.disponible) expect(m.lineas).toBeGreaterThan(1);
    else expect(m.lineas).toBe(1);

    // Y el nombre de cada Tarjeta de esa página: fragmento y Obra, sin el Autor.
    const vistas = await comprobarNombresDeTarjetas(page, [['fragmento'], ['fragmento', 'obra']]);
    expect(vistas.conObra).toBeGreaterThan(0);
  });

  test('una Cita sin Obra: solo el fragmento, sin pausa, sin hueco y sin rótulo', async ({ page }) => {
    test.skip(sinObra === undefined, 'Todas las Citas del Corpus llevan Obra.');
    const { slug, autor, texto } = sinObra!;
    const enlace = await abrirLaPaginaDe(page, autor, slug);
    const hijos = await enlace.evaluate((a) => [...a.children].map((h) => h.className));
    expect(hijos).toEqual(['fragmento']);
    await expect(enlace).not.toContainText(/sin obra/i);
    // El nombre es el fragmento y nada más: ninguna coma colgando al final.
    const fragmento = (await enlace.locator('.fragmento').textContent()) ?? '';
    expect(texto.startsWith(fragmento.replace(/^«|…?»$/g, ''))).toBe(true);
    expect(await enlace.evaluate((a) => a.textContent)).toBe(fragmento);
  });
});
