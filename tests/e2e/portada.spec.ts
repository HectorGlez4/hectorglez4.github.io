import { expect, test, type Page } from '@playwright/test';
import { MARCA } from '../../src/lib/marca.ts';
import { entradaDeLoDescargado } from '../../src/lib/guiones.ts';
import { rutaDeCita, rutaDelDirectorioDeObras } from '../../src/lib/superficies.ts';
import { OBRAS_DE_LA_PORTADA } from '../../src/lib/umbrales.ts';
import { apuntarGuiones, fueraDeLaListaAlCargar } from './ayuda/guiones.ts';
import { censoDeCotejo } from './ayuda/corpus.ts';

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

  test('no descarga más guion que los declarados', async ({ page, baseURL }) => {
    /*
     * Historia 23.1 — de «no descarga ningún fichero de script» a «solo los guiones externos
     * declarados», como enmienda la Historia 4.1: al cargar, a lo sumo el de medición, que es lo
     * único de la lista cerrada de `src/lib/guiones.ts` que se pide sin tocar nada. Contra este
     * servidor, construido desde la 23.2 con el punto final del receptor local
     * (`playwright.config.ts`), se pide el fichero de medición —lo exige
     * `receptor-local.spec.ts`, que además lo ve llegar al D1 local—, y esta prueba lo admite por
     * estar en la lista.
     * `tests/e2e/receptor.spec.ts` exige además que sea exactamente uno.
     */
    const pedidos = apuntarGuiones(page, baseURL!);
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(fueraDeLaListaAlCargar(pedidos), `la portada pidió ${pedidos.join(', ')}`).toEqual([]);
  });

  test('el contenido está en el HTML inicial', async ({ page, request }) => {
    await page.goto('/');

    // El texto de la Cita viaja en el HTML, sin ejecutar nada.
    const html = await (await request.get('/')).text();
    const texto = await page.locator('.del-dia blockquote .texto').innerText();
    expect(html).toContain(texto.slice(1, 30));
  });

  test('un único h1, la marca de la cabecera, y la Cita del Día no compite con él', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    // Historia 28.1 — en la portada el h1 es la marca, en la cabecera y con `aria-current`;
    // `main` no lleva ninguno, y la Cita del Día no es el título de la página.
    const titulo = page.locator('header.cabecera h1');
    await expect(titulo).toHaveCount(1);
    await expect(titulo).toHaveText(MARCA);
    await expect(titulo.locator('a.marca')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('main h1')).toHaveCount(0);
  });
});

/** Una Página de Cita del Corpus servido, la misma que miden las pruebas de la cabecera. */
const CITA = rutaDeCita('miguel-de-cervantes-la-libertad-sancho-es-uno-de-los');

/** `--unidad` resuelto en la página, en px CSS. */
const unidad = (page: Page) =>
  page.evaluate(() => {
    const sonda = document.createElement('div');
    sonda.style.cssText = 'height: var(--unidad)';
    document.body.append(sonda);
    const alto = sonda.getBoundingClientRect().height;
    sonda.remove();
    return alto;
  });

test.describe('Historia 28.1 — la portada abre con las cifras del Corpus y un campo para buscar', () => {
  test('`main` abre con la línea de cifras del Corpus real: con censo, nunca «cada una»', async ({ page }) => {
    await page.goto('/');
    const primero = page.locator('main > .pagina > :first-child');
    await expect(primero).toHaveClass(/(^|\s)cifras(\s|$)/);
    const linea = (await primero.innerText()).trim();
    const numero = String.raw`\d{1,3}(?:\.\d{3})*`;
    // La forma la decide el censo de hoy, no una foto del Corpus: el día que la 11.4 lo vacíe, la
    // línea correcta pasa a la de «cada una» y la prueba la sigue juzgando.
    if (censoDeCotejo().length > 0) {
      expect(linea).toMatch(new RegExp(`^${numero} citas de ${numero} autores; ${numero} cotejadas con el texto de su fuente\\.$`));
      expect(linea).not.toContain('cada una');
    } else {
      expect(linea).toMatch(new RegExp(`^${numero} citas de ${numero} autores, cada una cotejada con el texto de su fuente\\.$`));
    }
  });

  test('tras «Saltar al contenido.», el siguiente Tab va al campo de búsqueda', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('a.saltar')).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.locator('main input[name="q"]')).toBeFocused();
  });

  test('escribir y pulsar «Buscar» lleva a /buscar/?q=…, sin pedir ningún guion fuera de la lista', async ({ page, baseURL }) => {
    const pedidos = apuntarGuiones(page, baseURL!);
    await page.goto('/', { waitUntil: 'networkidle' });
    // Al cargar, la portada no pide Pagefind ni nada que no sea la medición.
    expect(fueraDeLaListaAlCargar(pedidos), `la portada pidió ${pedidos.join(', ')}`).toEqual([]);
    await page.locator('main input[name="q"]').fill('tiempo libre');
    await page.locator('main form[role="search"]').getByRole('button', { name: 'Buscar' }).click();
    await page.waitForURL(/\/buscar\/\?q=tiempo\+libre$/);
    // La búsqueda arranca con lo escrito: el campo de `/buscar/` lo trae y pinta resultados o la salida.
    await expect(page.locator('[data-consulta]')).toHaveValue('tiempo libre');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-resultados]')!.children.length > 0 ||
        !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
      undefined,
      { timeout: 10_000 },
    );
    // Lo que se pidió al enviar y al llegar está todo en la lista cerrada.
    expect(pedidos.filter((pedido) => entradaDeLoDescargado(pedido) === undefined)).toEqual([]);
  });

  test('el campo se envía también con Intro', async ({ page }) => {
    await page.goto('/');
    await page.locator('main input[name="q"]').fill('amistad');
    await page.locator('main input[name="q"]').press('Enter');
    await page.waitForURL(/\/buscar\/\?q=amistad$/);
    await expect(page.locator('[data-consulta]')).toHaveValue('amistad');
  });

  test('la línea de cifras va en `body-md` y tinta apagada, sin cifra destacada', async ({ page }) => {
    await page.goto('/');
    const estilo = await page.evaluate(() => {
      const linea = document.querySelector('main .cifras')!;
      const raiz = getComputedStyle(document.documentElement);
      const resuelto = (propiedad: string, valor: string) => {
        const sonda = document.createElement('span');
        sonda.style.setProperty(propiedad, valor);
        document.body.append(sonda);
        const r = getComputedStyle(sonda).getPropertyValue(propiedad);
        sonda.remove();
        return r;
      };
      const s = getComputedStyle(linea);
      return {
        cuerpo: s.fontSize,
        cuerpoEsperado: resuelto('font-size', raiz.getPropertyValue('--cuerpo-md').trim()),
        color: s.color,
        colorEsperado: resuelto('color', raiz.getPropertyValue('--tinta-apagada').trim()),
        peso: s.fontWeight,
        interlineado: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
        destacados: linea.querySelectorAll('*').length,
      };
    });
    expect(estilo.cuerpo).toBe(estilo.cuerpoEsperado);
    expect(estilo.color).toBe(estilo.colorEsperado);
    expect(estilo.peso).toBe('400');
    expect(estilo.interlineado).toBeCloseTo(1.6, 2);
    expect(estilo.destacados).toBe(0);
  });

  test('el campo funciona también sin JavaScript', async ({ browser, baseURL }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false, baseURL });
    try {
      const page = await contexto.newPage();
      await page.goto('/');
      await page.locator('main input[name="q"]').fill('amistad');
      await page.locator('main form[role="search"]').getByRole('button', { name: 'Buscar' }).click();
      await page.waitForURL(/\/buscar\/\?q=amistad$/);
    } finally {
      await contexto.close();
    }
  });

  test('las distancias: campo a 3 ×, Cita del Día a 6 ×, cada sección a 6 × y su contenido a 2 ×', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const u = await unidad(page);
    const m = await page.evaluate(() => {
      const caja = (e: Element) => e.getBoundingClientRect();
      const cifras = document.querySelector('main .cifras')!;
      const formulario = document.querySelector('main form[role="search"]')!;
      const delDia = document.querySelector('main .del-dia')!;
      const rotuloDelDia = delDia.querySelector('h2')!;
      const secciones = [...document.querySelectorAll('main .pagina > section:not(.del-dia)')].map((s) => ({
        rotulo: s.querySelector('h2')!.textContent!.trim(),
        arriba: caja(s).top,
        anterior: caja(s.previousElementSibling!).bottom,
        rotuloAbajo: caja(s.querySelector('h2')!).bottom,
        contenido: caja(s.querySelector('h2')!.nextElementSibling!).top,
      }));
      return {
        campo: caja(formulario).top - caja(cifras).bottom,
        delDia: caja(delDia).top - caja(formulario).bottom,
        // «La cita de hoy» a 3 × de su contenido (el `h2` y su margen son de `CitaDelDia.astro`).
        rotuloDelDia: rotuloDelDia.textContent!.trim(),
        bajoElRotuloDelDia: caja(rotuloDelDia.nextElementSibling!).top - caja(rotuloDelDia).bottom,
        secciones,
      };
    });
    expect(Math.abs(m.campo - 3 * u), `campo: ${m.campo}`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(m.delDia - 6 * u), `Cita del Día: ${m.delDia}`).toBeLessThanOrEqual(0.5);
    expect(m.rotuloDelDia).toBe('La cita de hoy');
    expect(Math.abs(m.bajoElRotuloDelDia - 3 * u), `«La cita de hoy» → la Cita: ${m.bajoElRotuloDelDia}`).toBeLessThanOrEqual(0.5);
    expect(m.secciones.map((s) => s.rotulo)).toEqual(expect.arrayContaining(['Temas', 'Autores']));
    for (const s of m.secciones) {
      expect(Math.abs(s.arriba - s.anterior - 6 * u), `${s.rotulo}: ${s.arriba - s.anterior}`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(s.contenido - s.rotuloAbajo - 2 * u), `${s.rotulo}: ${s.contenido - s.rotuloAbajo}`).toBeLessThanOrEqual(0.5);
    }
  });

  test('a 360 × 640, el texto de la Cita del Día empieza en la primera pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const { arriba, linea } = await page.evaluate(() => {
      const texto = document.querySelector('main .del-dia .texto')!;
      const s = getComputedStyle(texto);
      const interlineado = parseFloat(s.lineHeight);
      return {
        arriba: texto.getBoundingClientRect().top,
        linea: Number.isNaN(interlineado) ? parseFloat(s.fontSize) * 1.2 : interlineado,
      };
    });
    test.info().annotations.push({ type: 'medida', description: `la Cita del Día empieza a ${arriba.toFixed(2)} px` });
    // Al menos su primera línea entera dentro de la primera pantalla, no solo su borde.
    expect(arriba + linea).toBeLessThanOrEqual(640);
  });

  for (const ancho of [360, 1280]) {
    test(`a ${ancho} px la marca ocupa la misma caja en la portada que en una Página de Cita`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      const caja = async (ruta: string) => {
        await page.goto(ruta);
        await page.evaluate(() => document.fonts.ready);
        return page.evaluate(() => {
          const r = document.querySelector('header.cabecera a.marca')!.getBoundingClientRect();
          return { x: r.x, y: r.y, ancho: r.width, alto: r.height };
        });
      };
      const enLaCita = await caja(CITA);
      const enLaPortada = await caja('/');
      for (const clave of ['x', 'y', 'ancho', 'alto'] as const) {
        expect(Math.abs(enLaPortada[clave] - enLaCita[clave]), `${clave}: ${enLaPortada[clave]} frente a ${enLaCita[clave]}`).toBeLessThanOrEqual(0.5);
      }
      // Y la cabecera de la portada va, como la de toda página, en dos filas bajo 600 px y en una
      // desde ahí: la caja igual de la marca no lo dice por sí sola.
      const enlaces = await page.evaluate(() =>
        [...document.querySelectorAll('header.cabecera nav[aria-label="Principal"] a')].map((a) => {
          const r = a.getBoundingClientRect();
          return { arriba: r.top, abajo: r.bottom };
        }),
      );
      expect(enlaces).toHaveLength(3);
      const bajoLaMarca = enLaPortada.y + enLaPortada.alto;
      for (const enlace of enlaces) {
        if (ancho < 600) expect(enlace.arriba, 'un enlace en la fila de la marca').toBeGreaterThanOrEqual(bajoLaMarca);
        else expect(enlace.arriba, 'un enlace bajo la fila de la marca').toBeLessThan(bajoLaMarca);
      }
    });
  }
});

/*
 * Historia 28.3 — las Obras de la portada, con el sitio de siempre (el Corpus real): el bloque, sus
 * filas de Autores distintos, la tipografía y los colores medidos, las filas que se tocan y el
 * cierre a `/obras/` con el número del Directorio de Obras.
 */
test.describe('Historia 28.3 — seis Obras que cambian con la jornada', () => {
  test('«Obras» va tras «La cita de hoy» y antes de «Temas», con filas de Autores distintos', async ({ page }) => {
    await page.goto('/');
    const rotulos = await page.locator('main h2').allTextContents();
    const i = rotulos.map((r) => r.trim()).indexOf('Obras');
    expect(rotulos.map((r) => r.trim()).slice(i - 1, i + 2)).toEqual(['La cita de hoy', 'Obras', 'Temas']);

    const filas = page.locator('main section[aria-labelledby="obras"] li[data-zona="obras-de-portada"] a');
    await expect(filas).toHaveCount(OBRAS_DE_LA_PORTADA);
    const hrefs = await filas.evaluateAll((enlaces) => enlaces.map((a) => a.getAttribute('href')!));
    for (const href of hrefs) expect(href).toMatch(/^\/obra\/[^/]+\/[^/]+\/$/);
    const autores = new Set(hrefs.map((h) => h.split('/')[2]));
    expect(autores.size).toBe(OBRAS_DE_LA_PORTADA);
    // En la misma pestaña.
    for (const target of await filas.evaluateAll((enlaces) => enlaces.map((a) => a.getAttribute('target')))) {
      expect(target).toBeNull();
    }
  });

  test('el título en Inter `body-lg` 600 y tinta; los hechos en `caption` y tinta apagada', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const raiz = getComputedStyle(document.documentElement);
      const resuelto = (propiedad: string, variable: string) => {
        const sonda = document.createElement('span');
        sonda.style.setProperty(propiedad, raiz.getPropertyValue(variable).trim());
        document.body.append(sonda);
        const r = getComputedStyle(sonda).getPropertyValue(propiedad);
        sonda.remove();
        return r;
      };
      const filas = [...document.querySelectorAll('main section[aria-labelledby="obras"] li')];
      return {
        esperado: {
          sans: resuelto('font-family', '--sans'),
          cuerpoLg: resuelto('font-size', '--cuerpo-lg'),
          pie: resuelto('font-size', '--pie'),
          tinta: resuelto('color', '--tinta'),
          apagada: resuelto('color', '--tinta-apagada'),
        },
        filas: filas.map((li) => {
          const titulo = getComputedStyle(li.querySelector('.titulo-de-obra')!);
          const hechos = getComputedStyle(li.querySelector('.hechos-de-obra')!);
          return {
            titulo: { familia: titulo.fontFamily, cuerpo: titulo.fontSize, peso: titulo.fontWeight, color: titulo.color },
            hechos: { familia: hechos.fontFamily, cuerpo: hechos.fontSize, color: hechos.color },
          };
        }),
      };
    });
    expect(m.filas.length).toBeGreaterThan(0);
    expect(m.esperado.sans).toMatch(/Inter/);
    for (const fila of m.filas) {
      expect(fila.titulo).toEqual({ familia: m.esperado.sans, cuerpo: m.esperado.cuerpoLg, peso: '600', color: m.esperado.tinta });
      expect(fila.hechos).toEqual({ familia: m.esperado.sans, cuerpo: m.esperado.pie, color: m.esperado.apagada });
    }
  });

  test('las filas se tocan, la lista va a 2 × de su rótulo y el cierre a 2 × de la lista, subrayado y con 44 px', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const u = await unidad(page);
    const m = await page.evaluate(() => {
      const seccion = document.querySelector('main section[aria-labelledby="obras"]')!;
      const caja = (e: Element) => e.getBoundingClientRect();
      const lista = seccion.querySelector('ul')!;
      const filas = [...lista.querySelectorAll(':scope > li')].map(caja);
      const cierre = seccion.querySelector('p[data-zona="obras-de-portada"]')!;
      const enlace = cierre.querySelector('a')!;
      return {
        bajoElRotulo: caja(lista).top - caja(seccion.querySelector('h2')!).bottom,
        juntas: filas.slice(1).map((f, i) => f.top - filas[i].bottom),
        cierre: caja(cierre).top - caja(lista).bottom,
        alto: caja(enlace).height,
        subrayado: getComputedStyle(enlace).textDecorationLine,
        texto: enlace.textContent!.replace(/\u00a0/g, ' ').trim(),
        href: enlace.getAttribute('href'),
      };
    });
    expect(Math.abs(m.bajoElRotulo - 2 * u), `rótulo → lista: ${m.bajoElRotulo}`).toBeLessThanOrEqual(0.5);
    for (const hueco of m.juntas) expect(Math.abs(hueco)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(m.cierre - 2 * u), `lista → cierre: ${m.cierre}`).toBeLessThanOrEqual(0.5);
    expect(m.alto).toBeGreaterThanOrEqual(44);
    expect(m.subrayado).toContain('underline');
    expect(m.href).toBe(rutaDelDirectorioDeObras());
    expect(m.texto).toMatch(/^Las [\d.]+ obras ›$/);
  });

  test('el número del cierre es el de Obras de /obras/', async ({ page }) => {
    await page.goto('/');
    const texto = (await page.locator('main p[data-zona="obras-de-portada"] a').textContent())!;
    const n = Number(/Las ([\d.]+) obras/.exec(texto)![1].replaceAll('.', ''));
    await page.goto(rutaDelDirectorioDeObras());
    const obras = await page
      .locator('main a[href^="/obra/"]')
      .evaluateAll((enlaces) => new Set(enlaces.map((a) => a.getAttribute('href'))).size);
    expect(n).toBe(obras);
  });
});
