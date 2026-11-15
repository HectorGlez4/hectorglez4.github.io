import { expect, test, type Locator, type Page } from '@playwright/test';
import { autorConBiografia, autorDe, citaConLosDosBloques } from './ayuda/corpus.ts';

/**
 * Historia 36.1 — los paneles de la Página de Cita y de la de Autor, en el navegador.
 *
 * Lo que solo se ve calculado: el contraste de lo que va sobre cada tinte (AA: 4,5:1 el texto,
 * también lo apagado y el siena de lo que actúa; 3:1 el contorno del chip sobre el de Tema), la
 * Ficha de Cita con sus 44 px y su radio de 12 px, el anillo de foco en siena sobre una Ficha y
 * una Fila dentro de cada panel, el `<summary>` dentro del panel de las herramientas con el trato
 * del Rótulo de panel en tinta, y que a 360 × 640 el texto de la Cita sigue siendo lo primero que
 * se ve (CAP-1). Qué bloque cae en qué panel lo fija `tests/unit/paneles.test.ts` sobre `dist/`.
 *
 * Las páginas salen del Corpus (`tests/e2e/ayuda/corpus.ts`): una Cita con «De la misma obra» y
 * «Más de», y su Autor, que tiene Lista de Obras porque su Obra tiene cuatro Citas o más.
 */

const CITA = citaConLosDosBloques();
const AUTOR = CITA === undefined ? undefined : autorDe(CITA);
const BIOGRAFIA = autorConBiografia();

/** La razón de contraste WCAG entre dos colores calculados (`rgb(…)`, sin transparencia). */
async function contraste(page: Page, delante: string, detras: string): Promise<number> {
  return page.evaluate(
    ([a, b]) => {
      const lum = (color: string) => {
        const [r, g, bl] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      };
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    },
    [delante, detras] as const,
  );
}

/** El color calculado de una propiedad personalizada de `tokens.css`. */
const token = (page: Page, nombre: string) =>
  page.evaluate((n) => {
    const muestra = document.createElement('div');
    muestra.style.color = `var(${n})`;
    document.body.append(muestra);
    const color = getComputedStyle(muestra).color;
    muestra.remove();
    return color;
  }, nombre);

const estilo = (l: Locator, propiedad: string) =>
  l.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), propiedad);

/** Pone el foco en el elemento como lo pone el teclado, y devuelve su anillo. */
async function anillo(page: Page, l: Locator): Promise<{ estilo: string; color: string; visible: boolean }> {
  await page.keyboard.press('Tab');
  await l.focus();
  return l.evaluate((e) => {
    const s = getComputedStyle(e);
    return { estilo: s.outlineStyle, color: s.outlineColor, visible: e.matches(':focus-visible') };
  });
}

test.describe('Historia 36.1 — la Página de Cita en paneles', () => {
  test.skip(CITA === undefined, 'El Corpus no tiene ninguna Cita con «De la misma obra» y «Más de».');

  test.beforeEach(async ({ page }) => {
    await page.goto(`/cita/${CITA}/`);
  });

  test('AA sobre cada tinte: rótulo, texto, apagado y siena; 3:1 del contorno del chip', async ({ page }) => {
    const [tinta, apagada, siena] = await Promise.all(['--tinta', '--tinta-apagada', '--siena'].map((n) => token(page, n)));
    const paneles = page.locator('.panel');
    const n = await paneles.count();
    expect(n).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < n; i += 1) {
      const panel = paneles.nth(i);
      const fondo = await estilo(panel, 'background-color');
      for (const color of [tinta, apagada, siena]) {
        expect(await contraste(page, color, fondo), `${color} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
      }
      const rotulo = panel.locator(':is(h2, h3).rotulo').first();
      if ((await rotulo.count()) > 0) {
        expect(await contraste(page, await estilo(rotulo, 'color'), fondo)).toBeGreaterThanOrEqual(4.5);
        expect(await estilo(rotulo, 'text-transform')).toBe('none');
        // En la tinta de su familia, no solo con contraste bastante.
        const clase = await panel.getAttribute('class');
        const deLaFamilia = ['obra', 'autor', 'tema'].find((f) => clase!.split(/\s+/).includes(`panel-${f}`));
        if (deLaFamilia !== undefined) {
          expect(await estilo(rotulo, 'color'), `rótulo del panel ${deLaFamilia}`).toBe(await token(page, `--sobre-contenedor-${deLaFamilia}`));
        }
      }
    }
    // El texto de la Ficha sobre su caja blanca.
    const ficha = page.locator('.salidas .tarjeta a').first();
    expect(await contraste(page, tinta, await estilo(ficha, 'background-color'))).toBeGreaterThanOrEqual(4.5);
    expect(await contraste(page, apagada, await estilo(ficha, 'background-color'))).toBeGreaterThanOrEqual(4.5);
    // El contorno del chip sobre el tinte de Tema.
    const tema = page.locator('.panel-tema');
    if ((await tema.count()) > 0) {
      const chip = tema.locator('.chip').first();
      expect(await contraste(page, await estilo(chip, 'border-top-color'), await estilo(tema, 'background-color'))).toBeGreaterThanOrEqual(3);
    }
  });

  test('la Ficha de Cita: 44 px de alto como mínimo, radio de 12 px, el fragmento en `--cita-xs` regular', async ({ page }) => {
    const fichas = page.locator('.salidas .tarjeta a');
    expect(await fichas.count()).toBeGreaterThan(0);
    for (const ficha of await fichas.all()) {
      const caja = await ficha.boundingBox();
      expect(caja!.height).toBeGreaterThanOrEqual(44);
      expect(await estilo(ficha, 'border-top-left-radius')).toBe('12px');
      expect(await estilo(ficha, 'box-shadow')).toBe('none');
    }
    const fragmento = page.locator('.salidas .tarjeta .fragmento').first();
    expect(await estilo(fragmento, 'font-size')).toBe('17px');
    expect(await estilo(fragmento, 'font-weight')).toBe('400');
    // La Cita principal conserva su tramo: ni caja ni el cuerpo de las fichas.
    const principal = page.locator('figure.bloque .texto').first();
    expect(Number.parseFloat(await estilo(principal, 'font-size'))).toBeGreaterThan(17);
    expect(await page.locator('.panel figure.bloque').count()).toBe(0);
  });

  test('el foco, visible y en siena, sobre una Ficha y una Fila dentro de cada panel', async ({ page }) => {
    const siena = await token(page, '--siena');
    const objetivos = [
      page.locator('.panel-obra .tarjeta-de-obra .fila-de-bloque a').first(),
      page.locator('.panel-obra .tarjeta a').first(),
      page.locator('.panel-obra .de-la-misma-obra .fila-de-bloque a').first(),
      page.locator('.panel-autor .tarjeta a').first(),
      page.locator('.panel-autor .fila-de-bloque a').first(),
      page.locator('.panel-herramientas summary').first(),
      page.locator('.panel-tema .chip').first(),
    ];
    for (const objetivo of objetivos) {
      if ((await objetivo.count()) === 0) continue;
      const a = await anillo(page, objetivo);
      expect(a).toEqual({ estilo: 'solid', color: siena, visible: true });
    }
    // La Ficha conserva su radio con el foco puesto: el anillo global no lo pisa.
    const ficha = page.locator('.panel .tarjeta a').first();
    await anillo(page, ficha);
    expect(await estilo(ficha, 'border-top-left-radius')).toBe('12px');
  });

  test('dentro del panel de las herramientas, el `<summary>` lleva el trato del Rótulo de panel, en tinta', async ({ page }) => {
    const tinta = await token(page, '--tinta');
    const resumenes = page.locator('.panel-herramientas details.desplegable > summary');
    expect(await resumenes.count()).toBeGreaterThan(0);
    for (const s of await resumenes.all()) {
      expect(await estilo(s, 'text-transform')).toBe('none');
      expect(await estilo(s, 'color')).toBe(tinta);
      expect((await s.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // Planos: ni filete encima del primero ni debajo del último; la divisoria, entre ellos.
    const desplegables = page.locator('.panel-herramientas details.desplegable');
    const n = await desplegables.count();
    expect(await estilo(desplegables.first(), 'border-top-width')).toBe('0px');
    expect(await estilo(desplegables.last(), 'border-bottom-width')).toBe('0px');
    if (n > 1) expect(await estilo(desplegables.nth(1), 'border-top-width')).toBe('1px');
    // Las etiquetas de estilo de «Cómo citar» (APA, MLA…) no son Rótulos de panel: sin el espaciado de 0,06em.
    const comoCitar = page.locator('.panel-herramientas details.desplegable', { has: page.locator('.como-citar') });
    if ((await comoCitar.count()) > 0) {
      await comoCitar.locator('summary').click();
      const etiqueta = comoCitar.locator('.como-citar .rotulo').first();
      expect(await estilo(etiqueta, 'letter-spacing')).toBe('normal');
      await comoCitar.locator('summary').click();
    }
    // Abierto, el campo de «Inserta esta cita» conserva su fondo y su contorno.
    await page.locator('.panel-herramientas details.desplegable > summary').last().click();
    const campo = page.locator('.panel-herramientas textarea').first();
    if ((await campo.count()) > 0) {
      expect(await estilo(campo, 'background-color')).toBe(await token(page, '--contenedor-bajo'));
      expect(await estilo(campo, 'border-top-color')).toBe(await token(page, '--contorno'));
    }
  });

  test('a 360 × 640, el texto de la Cita es lo primero visible y ningún panel va delante', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`/cita/${CITA}/`);
    const cita = page.locator('figure.bloque blockquote').first();
    const caja = await cita.boundingBox();
    expect(caja!.y).toBeLessThan(640);
    const primerPanel = await page.locator('.panel').first().boundingBox();
    expect(primerPanel!.y).toBeGreaterThan(caja!.y);
  });
});

test.describe('Historia 36.1 — la Página de Autor en paneles', () => {
  test.skip(AUTOR === undefined, 'El Corpus no tiene ninguna Cita con «De la misma obra» y «Más de».');

  test('la Ficha en el panel del Autor, la Lista en el de la Obra, AA sobre los dos y el listado en Fichas', async ({ page }) => {
    await page.goto(`/autor/${AUTOR}/`);
    const [tinta, apagada, siena] = await Promise.all(['--tinta', '--tinta-apagada', '--siena'].map((n) => token(page, n)));
    const autor = page.locator('.panel-autor');
    const obra = page.locator('.panel-obra');
    await expect(autor.locator('h1')).toHaveCount(1);
    await expect(obra.locator('.obras-del-autor')).toHaveCount(1);
    for (const panel of [autor, obra]) {
      const fondo = await estilo(panel, 'background-color');
      for (const color of [tinta, apagada, siena]) expect(await contraste(page, color, fondo)).toBeGreaterThanOrEqual(4.5);
    }
    expect(await estilo(autor.locator('h1'), 'color')).toBe(await token(page, '--sobre-contenedor-autor'));
    expect(await estilo(obra.locator('h2.rotulo'), 'color')).toBe(await token(page, '--sobre-contenedor-obra'));
    const fila = obra.locator('.lista-de-obras a').first();
    const a = await anillo(page, fila);
    expect(a).toEqual({ estilo: 'solid', color: siena, visible: true });
    // El listado, sobre el papel y en Fichas.
    expect(await page.locator('.panel .listado').count()).toBe(0);
    const ficha = page.locator('.listado .tarjeta a').first();
    expect(await estilo(ficha, 'border-top-left-radius')).toBe('12px');
    expect((await ficha.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test('con biografía, la atribución de la semblanza va en siena dentro del panel del Autor, a 4,5:1', async ({ page }) => {
    test.skip(BIOGRAFIA === undefined, 'El Corpus no tiene ningún Autor con biografía.');
    await page.goto(`/autor/${BIOGRAFIA}/`);
    const panel = page.locator('.panel-autor');
    // El enlace de la atribución, no el primero que haya: la semblanza propia no lleva atribución.
    const enlace = panel.locator('[data-pagefind-ignore] p a').first();
    await expect(enlace).toBeVisible();
    expect(await contraste(page, await estilo(enlace, 'color'), await estilo(panel, 'background-color'))).toBeGreaterThanOrEqual(4.5);
  });
});
