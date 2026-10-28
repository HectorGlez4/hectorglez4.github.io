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

/**
 * Lo que la página pinta con los tokens de `DESIGN.md`, medido en el navegador: la familia, el
 * cuerpo, el peso y el color de cada pieza, el subrayado de lo que mueve dentro de la página, y el
 * ritmo vertical en múltiplos de `--unidad`. Cada valor esperado sale de rasterizar el propio token
 * en una sonda de la misma página, nunca de un número escrito aquí: si el token cambia, la prueba
 * lo sigue; si una pieza deja de usarlo, falla.
 */
test.describe('Historia 26.3 — los tokens y el ritmo del Directorio', () => {
  test('tipografía, color, subrayado y espaciado salen de los tokens', async ({ page }) => {
    await page.goto(RUTA);
    const m = await page.evaluate(() => {
      const sonda = (css: string) => {
        const d = document.createElement('div');
        d.style.cssText = css;
        document.body.append(d);
        const c = getComputedStyle(d);
        const r = { familia: c.fontFamily, cuerpo: c.fontSize, color: c.color, ancho: c.width };
        d.remove();
        return r;
      };
      const unidad = (n: number) => sonda(`width: calc(var(--unidad) * ${n})`).ancho;
      const de = (selector: string) => {
        const e = document.querySelector(selector);
        if (e === null) throw new Error(`no hay ${selector}`);
        const c = getComputedStyle(e);
        return {
          familia: c.fontFamily,
          cuerpo: c.fontSize,
          peso: c.fontWeight,
          color: c.color,
          subrayado: c.textDecorationLine,
          cifras: c.fontVariantNumeric,
          margenArriba: c.marginTop,
          margenDeDesplazamiento: c.scrollMarginTop,
          hueco: c.columnGap,
          filete: c.borderTopStyle,
        };
      };
      const grupos = [...document.querySelectorAll('section.grupo')].map((g) => getComputedStyle(g).marginTop);
      return {
        tokens: {
          serif: sonda('font-family: var(--serif)').familia,
          sans: sonda('font-family: var(--sans)').familia,
          titularSm: sonda('font-size: var(--titular-sm)').cuerpo,
          titularMd: sonda('font-size: var(--titular-md)').cuerpo,
          cuerpoMd: sonda('font-size: var(--cuerpo-md)').cuerpo,
          pie: sonda('font-size: var(--pie)').cuerpo,
          tinta: sonda('color: var(--tinta)').color,
          apagada: sonda('color: var(--tinta-apagada)').color,
          siena: sonda('color: var(--siena)').color,
          u1: unidad(1),
          u2: unidad(2),
          u4: unidad(4),
          u5: unidad(5),
        },
        h1: de('main h1'),
        nombre: de('li.fila-de-bloque .nombre'),
        hechos: de('li.fila-de-bloque .hechos'),
        fila: de('li.fila-de-bloque a'),
        letra: de('#letras a'),
        rejilla: de('#letras ul'),
        rotulo: de('section.grupo h2'),
        lista: de('section.grupo > ul'),
        volverP: de('section.grupo .volver'),
        volver: de('section.grupo .volver a'),
        grupos,
      };
    });
    const t = m.tokens;

    // La serif solo en el nombre del Autor; el `h1`, las letras, los hechos y «Volver», en Inter.
    expect(m.nombre).toMatchObject({ familia: t.serif, cuerpo: t.titularSm, peso: '400', color: t.tinta });
    expect(m.h1).toMatchObject({ familia: t.sans, cuerpo: t.titularMd, peso: '600', color: t.tinta });
    expect(m.hechos).toMatchObject({ familia: t.sans, cuerpo: t.pie, color: t.apagada });
    expect(m.hechos.cifras).toContain('tabular-nums');
    expect(m.letra).toMatchObject({ familia: t.sans, cuerpo: t.cuerpoMd, peso: '600', color: t.siena, subrayado: 'none' });
    expect(m.volver).toMatchObject({ familia: t.sans, cuerpo: t.cuerpoMd, color: t.siena, subrayado: 'underline' });
    expect(m.fila.subrayado).toBe('none');

    // El ritmo: rejilla a `--unidad`; primer grupo a 4×, los demás a 5×; lista a 2× con filete;
    // «Volver» a 2×; y el rótulo deja 2× de aire al recibir el salto.
    expect(m.rejilla.hueco).toBe(t.u1);
    expect(m.grupos.length).toBeGreaterThan(0);
    expect(m.grupos[0]).toBe(t.u4);
    for (const margen of m.grupos.slice(1)) expect(margen).toBe(t.u5);
    expect(m.lista).toMatchObject({ margenArriba: t.u2, filete: 'solid' });
    expect(m.volverP.margenArriba).toBe(t.u2);
    expect(m.rotulo.margenDeDesplazamiento).toBe(t.u2);
  });
});
