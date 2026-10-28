import { expect, test, type Page } from '@playwright/test';
import { rutaDelDirectorioDeObras } from '../../src/lib/superficies.ts';

/**
 * Historia 26.4 — Todas las Obras, bajo su Autor, en el navegador.
 *
 * Lo que solo se ve con una página delante: que las letras y «Volver a las letras» llevan el foco
 * a su destino, con guion y sin él; las medidas de la cabecera de grupo y de las filas; que la
 * serif solo viste el nombre del Autor; que a 320 px nada se recorta ni desborda; y que cada fila
 * lleva a su Página de Obra en la misma pestaña. Los ejemplos salen de la página servida, nunca de
 * una lista fija: el Corpus crece cada día.
 */

const RUTA = rutaDelDirectorioDeObras();

/** Lo que tiene el foco ahora: su etiqueta, su `id` y su texto. */
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

  const letra = letras.nth(1);
  const destino = (await letra.getAttribute('href'))!.slice(1);
  const inicial = (await letra.textContent())!.replace('Obras de autores por la ', '').trim();
  await expect(letra).toHaveAccessibleName(`Obras de autores por la ${inicial}`);

  await letra.click();
  await expect.poll(() => foco(page)).toEqual({ etiqueta: 'h2', id: destino, texto: inicial });

  const grupo = page.locator(`section.grupo:has(> h2[id="${destino}"])`);
  await grupo.getByRole('link', { name: 'Volver a las letras' }).click();
  await expect.poll(() => foco(page).then((f) => f && { etiqueta: f.etiqueta, id: f.id })).toEqual({
    etiqueta: 'nav',
    id: 'letras',
  });
}

test.describe('Historia 26.4 — las letras de salto', () => {
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
});

test.describe('Historia 26.4 — las filas y las cabeceras de grupo', () => {
  test('cada fila, leída de la página servida, lleva a su Página de Obra en la misma pestaña', async ({ page, request }) => {
    await page.goto(RUTA);
    const filas = await page.locator('main ul.lista-de-obras[data-zona="directorio"] a').evaluateAll((as) =>
      as.map((a) => ({ href: a.getAttribute('href')!, target: a.getAttribute('target') })),
    );
    expect(filas.length, 'el Directorio no tiene ninguna fila').toBeGreaterThan(0);
    for (const { href, target } of filas) {
      expect(href).toMatch(/^\/obra\/[^/]+\/[^/]+\/$/u);
      expect(target, href).toBeNull();
    }
    for (const { href } of [filas[0], filas[Math.floor(filas.length / 2)], filas.at(-1)!]) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
    const cabeceras = await page.locator('main section.autor > h3[data-zona="directorio"] a').evaluateAll((as) =>
      as.map((a) => ({ href: a.getAttribute('href')!, target: a.getAttribute('target') })),
    );
    expect(cabeceras.length).toBeGreaterThan(0);
    for (const { href, target } of cabeceras) {
      expect(href).toMatch(/^\/autor\/[^/]+\/$/u);
      expect(target, href).toBeNull();
    }
  });

  test('las medidas y la tipografía salen de los tokens, y la serif solo viste al Autor', async ({ page }) => {
    await page.goto(RUTA);
    const m = await page.evaluate(() => {
      const sonda = (css: string) => {
        const d = document.createElement('div');
        d.style.cssText = css;
        document.body.append(d);
        const c = getComputedStyle(d);
        const r = { familia: c.fontFamily, cuerpo: c.fontSize, color: c.color, ancho: c.width, altoMinimo: c.minHeight };
        d.remove();
        return r;
      };
      const unidad = (n: number) => parseFloat(sonda(`width: calc(var(--unidad) * ${n})`).ancho);
      const estilo = (e: Element) => {
        const c = getComputedStyle(e);
        return { familia: c.fontFamily, cuerpo: c.fontSize, peso: c.fontWeight, color: c.color, subrayado: c.textDecorationLine };
      };
      const uno = (selector: string) => {
        const e = document.querySelector(selector);
        if (e === null) throw new Error(`no hay ${selector}`);
        return e;
      };
      const caja = (e: Element) => e.getBoundingClientRect();
      // Un grupo con al menos dos Autores, si lo hay, para medir el aire entre Autores.
      const grupos = [...document.querySelectorAll('section.grupo')];
      const conDos = grupos.find((g) => g.querySelectorAll(':scope > section.autor').length > 1);
      const autoresDe = (g: Element) => [...g.querySelectorAll(':scope > section.autor')];
      const primero = autoresDe(grupos[0])[0];
      const enlaceDelAutor = uno('section.autor > h3 a');
      const lista = primero.querySelector(':scope > ul.lista-de-obras')!;
      const entreAutores =
        conDos === undefined
          ? undefined
          : caja(autoresDe(conDos)[1]).top - caja(autoresDe(conDos)[0]).bottom;
      return {
        tokens: {
          serif: sonda('font-family: var(--serif)').familia,
          sans: sonda('font-family: var(--sans)').familia,
          titularSm: sonda('font-size: var(--titular-sm)').cuerpo,
          tinta: sonda('color: var(--tinta)').color,
          u1: unidad(1),
          u2: unidad(2),
          u4: unidad(4),
          zonaDeToque: parseFloat(sonda('min-height: var(--zona-de-toque)').altoMinimo),
        },
        h1: estilo(uno('main h1')),
        h3: estilo(uno('section.autor > h3')),
        enlaceDelAutor: { ...estilo(enlaceDelAutor), alto: caja(enlaceDelAutor).height },
        letra: estilo(uno('#letras a')),
        titulo: estilo(uno('ul.lista-de-obras .titulo')),
        recuento: estilo(uno('ul.lista-de-obras .recuento')),
        volver: estilo(uno('section.grupo .volver a')),
        // La primera fila, a `--unidad` del bloque del Autor; el primer Autor, a 2× del rótulo.
        filaBajoElAutor: caja(lista).top - caja(primero.querySelector(':scope > h3')!).bottom,
        autorBajoElRotulo: caja(primero).top - caja(grupos[0].querySelector(':scope > h2')!).bottom,
        entreAutores,
        serifFuera: [...document.querySelectorAll('main *')]
          .filter((e) => e.closest('section.autor > h3') === null && (e as HTMLElement).innerText?.trim())
          .filter((e) => getComputedStyle(e).fontFamily === getComputedStyle(enlaceDelAutor).fontFamily)
          .map((e) => e.tagName.toLowerCase() + '.' + e.className),
      };
    });
    const t = m.tokens;

    expect(m.h3).toMatchObject({ familia: t.serif, cuerpo: t.titularSm, peso: '600' });
    expect(m.enlaceDelAutor).toMatchObject({ familia: t.serif, color: t.tinta, subrayado: 'underline' });
    expect(m.enlaceDelAutor.alto).toBeGreaterThanOrEqual(t.zonaDeToque);
    for (const pieza of [m.h1, m.letra, m.titulo, m.recuento, m.volver]) expect(pieza.familia).toBe(t.sans);
    expect(m.serifFuera, 'la serif fuera del nombre del Autor').toEqual([]);

    expect(m.filaBajoElAutor).toBeCloseTo(t.u1, 0);
    expect(m.autorBajoElRotulo).toBeCloseTo(t.u2, 0);
    if (m.entreAutores !== undefined) expect(m.entreAutores).toBeCloseTo(t.u4, 0);
  });

  test('a 320 px nada se recorta: el título más largo parte línea, el recuento no se encoge y no hay desplazamiento horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(RUTA);
    const m = await page.evaluate(() => {
      const titulos = [...document.querySelectorAll<HTMLElement>('ul.lista-de-obras .titulo')];
      const largo = titulos.reduce((a, b) => ((b.textContent ?? '').length > (a.textContent ?? '').length ? b : a));
      const alturaDeLinea = (e: HTMLElement) => parseFloat(getComputedStyle(e).lineHeight);
      const recuento = largo.parentElement!.querySelector<HTMLElement>('.recuento')!;
      return {
        texto: largo.textContent,
        lineasDelTitulo: largo.getBoundingClientRect().height / alturaDeLinea(largo),
        lineasDelRecuento: recuento.getBoundingClientRect().height / alturaDeLinea(recuento),
        recuentoEntero: recuento.getBoundingClientRect().width + 0.5 >= recuento.scrollWidth,
        encoge: getComputedStyle(recuento).flexShrink,
        espacio: getComputedStyle(recuento).whiteSpace,
        anchoDelDocumento: document.documentElement.scrollWidth,
        ventana: window.innerWidth,
      };
    });
    expect(m.lineasDelTitulo, m.texto ?? '').toBeGreaterThan(1.5);
    expect(m.lineasDelRecuento).toBeLessThan(1.5);
    expect(m.recuentoEntero).toBe(true);
    expect(m.encoge).toBe('0');
    expect(m.espacio).not.toBe('nowrap');
    expect(m.anchoDelDocumento).toBeLessThanOrEqual(m.ventana);
  });
});
