import { expect, test, type Page } from '@playwright/test';
import { citaConTarjetaCompleta, citaSinObra, textoDe } from './ayuda/corpus.ts';

/**
 * Historia 30.3 — «Cómo citar» en la Página de Cita, en el navegador (FR-58, UX-DR119).
 *
 * Las formas literales las fija `tests/unit/atribucion.test.ts` y el marcado construido
 * `tests/unit/como-citar.test.ts`. Aquí, lo que solo se ve con el guion corriendo o sin él: la
 * fecha del visitante, los botones, «Copiado.», el portapapeles denegado y el orden del foco.
 */

const COMPLETA = citaConTarjetaCompleta();
const SIN_OBRA = citaSinObra();

/** La fecha de hoy del navegador en los tres estilos, como la escribe `fechaDeConsulta`. */
async function hoyEn(page: Page): Promise<{ larga: string; mla: string }> {
  return page.evaluate(() => {
    const d = new Date();
    const meses = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
    const mes = meses[d.getMonth()];
    const corto = mes.length < 5 ? mes : `${mes.slice(0, d.getMonth() === 8 ? 4 : 3)}.`;
    return { larga: `${d.getDate()} de ${mes} de ${d.getFullYear()}`, mla: `${d.getDate()} ${corto} ${d.getFullYear()}` };
  });
}

const desplegable = (page: Page) => page.locator('details.desplegable', { has: page.locator('[data-como-citar]') });
const resumen = (page: Page) => desplegable(page).locator('summary');
const region = (page: Page) => page.locator('[data-como-citar] > [role="status"]');

test.describe('Historia 30.3 — «Cómo citar», con JavaScript', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('cerrado al cargar; abierto, tres Referencias con la fecha de hoy y sus tres botones', async ({ page }) => {
    expect(COMPLETA, 'el Corpus de hoy no trae una Cita con Tarjeta completa').toBeDefined();
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
    await resumen(page).click();
    await expect(desplegable(page)).toHaveAttribute('open', '');

    const hoy = await hoyEn(page);
    const referencias = desplegable(page).locator('[data-referencia]');
    await expect(referencias).toHaveCount(3);
    await expect(referencias.nth(0)).toContainText(`Recuperado el ${hoy.larga} de `);
    await expect(referencias.nth(1)).toContainText(`Consultado el ${hoy.mla}.`);
    await expect(referencias.nth(2)).toContainText(`Consultado el ${hoy.larga}. `);
    for (let n = 0; n < 3; n++) await expect(referencias.nth(n)).toContainText(textoDe(COMPLETA!.slug));
    await expect(desplegable(page).locator('[data-sin-fecha]')).toHaveCount(0);
    for (const rotulo of ['APA', 'MLA', 'Chicago']) {
      await expect(page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true })).toBeVisible();
    }
  });

  test('«Copiar APA» copia la Referencia que se lee, dice «Copiado.» dos segundos y lo anuncia', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    const boton = page.getByRole('button', { name: 'Copiar APA', exact: true });
    const leida = await desplegable(page).locator('[data-referencia]').first().textContent();
    await expect(region(page)).toHaveText('');

    await boton.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(leida);
    await expect(boton.locator('[data-etiqueta]')).toHaveText('Copiado.');
    await expect(boton).toHaveAccessibleName('Copiar APA');
    await expect(region(page)).toHaveText('Copiado.');
    await expect(boton.locator('[data-etiqueta]')).toHaveText('Copiar APA', { timeout: 4000 });
    await expect(region(page)).toHaveText('');
  });

  test('copiar dos veces vuelve a anunciarse: la región pasa por vacía', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    await page.evaluate(() => {
      const r = document.querySelector('[data-como-citar] > [role="status"]')!;
      const textos: string[] = [];
      (window as unknown as { __textos: string[] }).__textos = textos;
      new MutationObserver(() => textos.push(r.textContent ?? '')).observe(r, { childList: true, characterData: true, subtree: true });
    });
    const boton = page.getByRole('button', { name: 'Copiar MLA', exact: true });
    await boton.click();
    await expect(region(page)).toHaveText('Copiado.');
    await boton.click();
    await page.waitForFunction(
      () => (window as unknown as { __textos: string[] }).__textos.filter((t) => t === 'Copiado.').length === 2,
    );
    const textos = await page.evaluate(() => (window as unknown as { __textos: string[] }).__textos);
    expect(textos.slice(textos.indexOf('Copiado.') + 1)).toContain('');
  });

  test('con el portapapeles denegado no dice «Copiado.» ni ningún error, y la Referencia sigue', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denegado')), readText: () => Promise.resolve('') },
        configurable: true,
      });
    });
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    const boton = page.getByRole('button', { name: 'Copiar Chicago', exact: true });
    await boton.click();
    await page.waitForTimeout(300);
    await expect(region(page)).toHaveText('');
    await expect(boton.locator('[data-etiqueta]')).toHaveText('Copiar Chicago');
    await expect(desplegable(page).locator('[data-referencia]').nth(2)).toBeVisible();
    expect(await page.locator('[role="alert"]').count()).toBe(0);
  });

  test('el foco: la Tarjeta de Obra, el rótulo y, abierto, los tres botones', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    // El último enlace de la Tarjeta de Obra, y de ahí el Tabulador.
    await page.locator('section.tarjeta-de-obra a').last().focus();
    await page.keyboard.press('Tab');
    await expect(resumen(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(desplegable(page)).toHaveAttribute('open', '');
    for (const rotulo of ['APA', 'MLA', 'Chicago']) {
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true })).toBeFocused();
    }
  });

  test('sin Obra, el desplegable va tras «Compartir en» y sus Referencias no llevan título', async ({ page }) => {
    test.skip(SIN_OBRA === undefined, 'el Corpus de hoy no trae ninguna Cita sin Obra');
    await page.goto(`/cita/${SIN_OBRA!.slug}/`);
    const anterior = await page.locator('div.desplegables').evaluate((n) => {
      let previo = n.previousElementSibling;
      while (previo !== null && ['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(previo.tagName)) {
        previo = previo.previousElementSibling;
      }
      return previo?.hasAttribute('data-compartir') ?? false;
    });
    expect(anterior).toBe(true);
    await resumen(page).click();
    await expect(desplegable(page).locator('[data-referencia] i')).toHaveCount(1);
    await expect(desplegable(page).locator('[data-referencia] i')).toHaveText('Sabiduría de Bolsillo');
  });

  test('el primer filete a 4 × unidad de la Tarjeta de Obra', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    const distancia = await page.locator('div.desplegables').evaluate((n) => {
      const antes = document.querySelector('section.tarjeta-de-obra')!.getBoundingClientRect();
      return n.getBoundingClientRect().top - antes.bottom;
    });
    expect(Math.round(distancia)).toBe(32);
  });
});

test.describe('Historia 30.3 — «Cómo citar», sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('abre y cierra; sin fecha, con tres líneas «Sin fecha…» y sin botones visibles', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
    await resumen(page).click();
    await expect(desplegable(page)).toHaveAttribute('open', '');
    const referencias = desplegable(page).locator('[data-referencia]');
    await expect(referencias).toHaveCount(3);
    for (let n = 0; n < 3; n++) {
      await expect(referencias.nth(n)).toBeVisible();
      await expect(referencias.nth(n)).not.toContainText(/Recuperado el|Consultado el/);
    }
    await expect(desplegable(page).getByText('Sin fecha de consulta: añade la de hoy.')).toHaveCount(3);
    for (const rotulo of ['APA', 'MLA', 'Chicago']) {
      await expect(page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true })).toBeHidden();
    }
    // Seleccionable: el texto se puede seleccionar entero.
    const seleccion = await referencias.first().evaluate((n) => {
      const rango = document.createRange();
      rango.selectNodeContents(n);
      const s = getSelection()!;
      s.removeAllRanges();
      s.addRange(rango);
      return s.toString();
    });
    expect(seleccion).toContain(textoDe(COMPLETA!.slug));
    await resumen(page).click();
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
  });
});
