import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { citaConTarjetaCompleta, fichasDeObraPorCita } from './ayuda/corpus.ts';
import { denegarPortapapeles, emitidosDeCopiar, escriturasDenegadas, espiarMedicion } from './ayuda/espia.ts';
import { EVENTOS } from '../../src/lib/vocabulario.ts';
import { segmentosDeObra } from '../../src/lib/obras.ts';
import { ETIQUETAS_DEL_BARRIDO } from '../../src/lib/superficies.ts';
import { desviacionDelBarrido, sinDecidir } from './ayuda/barrido.ts';

/**
 * Historia 32.5 — «Cómo citar» en la página 1 de la Obra, en el navegador (FR-58, UX-DR129).
 *
 * Las formas literales las fija `tests/unit/atribucion.test.ts` y el marcado construido
 * `tests/unit/como-citar-obra-build.test.ts`. Aquí, lo que solo se ve con el guion de la isla
 * `CopiarReferencia` corriendo o sin él: la fecha del visitante, los botones, «Copiado.» por la
 * región del `<details>`, el evento por pulsación, el portapapeles denegado, el orden del foco y
 * axe. La Obra es la de la primera Cita con Tarjeta de Obra completa del Corpus de hoy.
 */

const CITA = citaConTarjetaCompleta();
const FICHA = CITA === undefined ? undefined : fichasDeObraPorCita().get(CITA.slug);
const OBRA = FICHA === undefined ? undefined : `/obra/${segmentosDeObra(FICHA).autor}/${segmentosDeObra(FICHA).obra}/`;

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

test.beforeAll(() => {
  expect(OBRA, 'el Corpus de hoy no trae una Obra con Tarjeta completa').toBeDefined();
});

test.describe('Historia 32.5 — «Cómo citar» de la Obra, con JavaScript', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('cerrado al cargar; abierto, tres Referencias de la Obra con la fecha de hoy y sus tres botones', async ({ page }) => {
    await page.goto(OBRA!);
    await expect(desplegable(page)).toHaveCount(1);
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
    await resumen(page).click();
    await expect(desplegable(page)).toHaveAttribute('open', '');
    const hoy = await hoyEn(page);
    const referencias = desplegable(page).locator('[data-referencia]');
    await expect(referencias).toHaveCount(3);
    await expect(referencias.nth(0)).toContainText(`Recuperado el ${hoy.larga} de `);
    await expect(referencias.nth(1)).toContainText(`Consultado el ${hoy.mla}.`);
    await expect(referencias.nth(2)).toContainText(`Consultado el ${hoy.larga}. `);
    for (let n = 0; n < 3; n++) {
      await expect(referencias.nth(n).locator('i').first()).toHaveText(CITA!.titulo);
      await expect(referencias.nth(n)).toContainText(OBRA!);
    }
    await expect(desplegable(page).locator('[data-sin-fecha]')).toHaveCount(0);
    for (const rotulo of ['APA', 'MLA', 'Chicago']) {
      await expect(page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true })).toBeVisible();
    }
  });

  test('cada botón copia exactamente la Referencia que se lee, dice «Copiado.», lo anuncia dentro del `<details>` y pide un evento por pulsación', async ({ page }) => {
    await espiarMedicion(page);
    await page.goto(OBRA!);
    await resumen(page).click();
    await expect(region(page)).toHaveText('');
    // La región es la del bloque, dentro del `<details>`: lo de fuera sería inerte con un diálogo.
    expect(await region(page).evaluate((r) => r.closest('details') !== null)).toBe(true);
    const referencias = desplegable(page).locator('[data-referencia]');
    for (const [n, rotulo] of ['APA', 'MLA', 'Chicago'].entries()) {
      const boton = page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true });
      await boton.click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await referencias.nth(n).textContent());
      await expect(boton.locator('[data-etiqueta]')).toHaveText('Copiado.');
      await expect(boton).toHaveAccessibleName(`Copiar ${rotulo}`);
      await expect(region(page)).toHaveText('Copiado.');
    }
    await expect(page.getByRole('button', { name: 'Copiar Chicago', exact: true }).locator('[data-etiqueta]')).toHaveText(
      'Copiar Chicago',
      { timeout: 4000 },
    );
    await expect(region(page)).toHaveText('');
    expect(await emitidosDeCopiar(page)).toEqual(
      Array.from({ length: 3 }, () => ({ evento: EVENTOS.copiadoDeReferencia, datos: null, destino: null })),
    );
  });

  test('solo el botón que anunció lo último vacía la región: otra copia a medio plazo no se borra con el temporizador de la anterior', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 9, 10, 0) });
    await page.goto(OBRA!);
    await resumen(page).click();
    // El reloj, parado: solo avanza con `runFor` (también el fotograma de `anunciar`).
    await page.clock.pauseAt(new Date(2026, 10, 9, 10, 0, 5));
    const apa = page.getByRole('button', { name: 'Copiar APA', exact: true });
    const mla = page.getByRole('button', { name: 'Copiar MLA', exact: true });
    await apa.click();
    await expect(apa.locator('[data-etiqueta]')).toHaveText('Copiado.');
    await page.clock.runFor(100);
    await expect(region(page)).toHaveText('Copiado.');
    await page.clock.runFor(1400);
    await mla.click();
    await expect(mla.locator('[data-etiqueta]')).toHaveText('Copiado.');
    await page.clock.runFor(100);
    await expect(region(page)).toHaveText('Copiado.');
    // Vence el temporizador de APA (2 s desde su pulsación): APA vuelve, la región sigue con MLA.
    await page.clock.runFor(500);
    await expect(apa.locator('[data-etiqueta]')).toHaveText('Copiar APA');
    await expect(mla.locator('[data-etiqueta]')).toHaveText('Copiado.');
    await expect(region(page)).toHaveText('Copiado.');
    // Vence el de MLA (2 s desde la suya): entonces sí se vacía.
    await page.clock.runFor(1500);
    await expect(mla.locator('[data-etiqueta]')).toHaveText('Copiar MLA');
    await expect(region(page)).toHaveText('');
  });

  test('una página abierta desde ayer copia la fecha del día en que se pulsa', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 8, 23, 59));
    await page.goto(OBRA!);
    await resumen(page).click();
    const referencia = desplegable(page).locator('[data-referencia]').first();
    await expect(referencia).toContainText('Recuperado el 8 de noviembre de 2026 de ');
    await page.clock.setFixedTime(new Date(2026, 10, 9, 0, 1));
    await page.getByRole('button', { name: 'Copiar APA', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Recuperado el 9 de noviembre de 2026 de ');
  });

  test('con el portapapeles denegado no dice «Copiado.» ni pide nada, y la Referencia sigue', async ({ page }) => {
    await espiarMedicion(page);
    await denegarPortapapeles(page);
    await page.goto(OBRA!);
    await resumen(page).click();
    const mla = page.getByRole('button', { name: 'Copiar MLA', exact: true });
    await mla.click();
    await expect.poll(() => escriturasDenegadas(page)).toBe(1);
    await page.waitForTimeout(300);
    await expect(mla).not.toHaveAttribute('data-estado', 'copiado');
    await expect(mla.locator('[data-etiqueta]')).toHaveText('Copiar MLA');
    await expect(region(page)).toHaveText('');
    await expect(desplegable(page).locator('[data-referencia]').nth(1)).toBeVisible();
    expect(await emitidosDeCopiar(page)).toEqual([]);
  });

  test('el foco: desde «de {Autor}», el `<summary>` de «Cómo citar» llega tras los anteriores y antes del listado', async ({ page }) => {
    await page.goto(OBRA!);
    await page.locator('.cabecera-de-obra p.de a').focus();
    const enfocados: string[] = [];
    for (let n = 0; n < 12; n++) {
      await page.keyboard.press('Tab');
      const que = await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        if (e === null) return '';
        if (e.tagName === 'SUMMARY') return `summary:${e.textContent?.replace(/\s*›\s*$/u, '').trim()}`;
        if (e.closest('ul.listado') !== null) return 'listado';
        return e.tagName.toLowerCase();
      });
      enfocados.push(que);
      if (que === 'listado') break;
    }
    const comoCitar = enfocados.indexOf('summary:Cómo citar');
    expect(comoCitar, enfocados.join(', ')).toBeGreaterThan(-1);
    // Es el último `<summary>` antes del listado, y el listado llega justo después.
    expect(enfocados.slice(comoCitar + 1, comoCitar + 2), enfocados.join(', ')).toEqual(['listado']);
    expect(enfocados.slice(0, comoCitar).filter((e) => e === 'listado')).toEqual([]);
    // Abierto, los tres botones siguen al rótulo.
    await resumen(page).focus();
    await page.keyboard.press('Enter');
    for (const rotulo of ['APA', 'MLA', 'Chicago']) {
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true })).toBeFocused();
    }
  });

  test('axe de página entera, con «Cómo citar» cerrado y abierto, sin infracciones', async ({ page }) => {
    const auditar = async () => {
      const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
      expect(await desviacionDelBarrido(page, resultado)).toEqual({ faltan: [], sobran: [] });
      expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(sinDecidir(resultado)).toEqual([]);
    };
    await page.goto(OBRA!);
    await auditar();
    await resumen(page).click();
    await expect(desplegable(page)).toHaveAttribute('open', '');
    await auditar();
  });

  test('la página 2 no lleva «Cómo citar»', async ({ page }) => {
    const respuesta = await page.goto(`${OBRA!}2/`);
    test.skip(respuesta?.status() !== 200, 'la Obra de hoy tiene una sola página');
    await expect(page.locator('[data-como-citar]')).toHaveCount(0);
  });
});

test.describe('Historia 32.5 — «Cómo citar» de la Obra, sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('abre y cierra; sin fecha, con tres líneas «Sin fecha…» y sin botones visibles', async ({ page }) => {
    await page.goto(OBRA!);
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
    await resumen(page).click();
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
  });
});
