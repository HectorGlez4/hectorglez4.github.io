import { expect, test, type Page } from '@playwright/test';
import { citaConTarjetaCompleta, textoDe } from './ayuda/corpus.ts';
import { EVENTOS } from '../../src/lib/vocabulario.ts';
import { denegarPortapapeles, emitidosDeCopiar, escriturasDenegadas, espiarMedicion } from './ayuda/espia.ts';

/**
 * Historia 30.4 — «Inserta esta cita» en la Página de Cita, en el navegador (FR-57, UX-DR120).
 *
 * El Fragmento literal lo fija `tests/unit/atribucion.test.ts` y el marcado construido
 * `tests/unit/inserta-esta-cita.test.ts`. Aquí, lo que solo se ve con el guion corriendo o sin él:
 * el botón, «Copiado.», el portapapeles denegado, el orden del foco y que el Fragmento, pegado en
 * otra página, se lee sin pedirle nada al sitio.
 */

const COMPLETA = citaConTarjetaCompleta();

const desplegable = (page: Page) => page.locator('details.desplegable', { has: page.locator('[data-inserta-esta-cita]') });
const resumen = (page: Page) => desplegable(page).locator('summary');
const campo = (page: Page) => page.locator('#fragmento-para-insertar');
const region = (page: Page) => page.locator('[data-inserta-esta-cita] > [role="status"]');
const boton = (page: Page) => page.getByRole('button', { name: 'Copiar el fragmento', exact: true });

test.describe('Historia 30.4 — «Inserta esta cita», con JavaScript', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('cerrado al cargar; abierto, el campo con su rótulo y el botón a la vista', async ({ page }) => {
    expect(COMPLETA, 'el Corpus de hoy no trae una Cita con Tarjeta completa').toBeDefined();
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
    await resumen(page).click();
    await expect(desplegable(page)).toHaveAttribute('open', '');
    await expect(page.getByLabel('Pega este fragmento en tu página: lleva la cita, su autor y el enlace a esta página.')).toBeVisible();
    await expect(campo(page)).toHaveJSProperty('readOnly', true);
    const valor = await campo(page).inputValue();
    expect(valor.startsWith('<blockquote>\n<p>')).toBe(true);
    expect(valor).toMatch(new RegExp(`<a href="https?://[^"?#]+/cita/${COMPLETA!.slug}/">Sabiduría de Bolsillo</a></p>\\n</blockquote>$`));
    await expect(boton(page)).toBeVisible();
  });

  test('«Copiar el fragmento» copia el valor del campo, exacto; «Copiado.» dos segundos, anunciado, con el nombre fijo', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    const valor = await campo(page).inputValue();
    await expect(region(page)).toHaveText('');

    await boton(page).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(valor);
    await expect(boton(page).locator('[data-etiqueta]')).toHaveText('Copiado.');
    await expect(boton(page)).toHaveAccessibleName('Copiar el fragmento');
    await expect(region(page)).toHaveText('Copiado.');
    await expect(boton(page).locator('[data-etiqueta]')).toHaveText('Copiar el fragmento', { timeout: 4000 });
    await expect(region(page)).toHaveText('');
  });

  test('con el portapapeles denegado no dice «Copiado.» ni ningún error, y el campo sigue seleccionable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denegado')), readText: () => Promise.resolve('') },
        configurable: true,
      });
    });
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    await boton(page).click();
    await page.waitForTimeout(300);
    await expect(region(page)).toHaveText('');
    await expect(boton(page).locator('[data-etiqueta]')).toHaveText('Copiar el fragmento');
    await expect(campo(page)).toBeVisible();
    const seleccion = await campo(page).evaluate((n: HTMLTextAreaElement) => {
      n.focus();
      n.select();
      return n.value.slice(n.selectionStart, n.selectionEnd);
    });
    expect(seleccion).toBe(await campo(page).inputValue());
    expect(await page.locator('[role="alert"]').count()).toBe(0);
  });

  test('el foco: «Cómo citar», sus botones, «Inserta esta cita», el campo y «Copiar el fragmento»', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    const comoCitar = page.locator('details.desplegable', { has: page.locator('[data-como-citar]') }).locator('summary');
    await page.locator('section.tarjeta-de-obra a').last().focus();
    await page.keyboard.press('Tab');
    await expect(comoCitar).toBeFocused();
    await page.keyboard.press('Enter');
    for (const rotulo of ['APA', 'MLA', 'Chicago']) {
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: `Copiar ${rotulo}`, exact: true })).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(resumen(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(desplegable(page)).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    await expect(campo(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(boton(page)).toBeFocused();
  });

  test('pegado en otra página, con la red al sitio cortada, se lee y no pide nada', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    const fragmento = await campo(page).inputValue();

    const pedidas: string[] = [];
    await page.context().route('**/*', async (ruta) => {
      const url = ruta.request().url();
      if (url === 'http://otro.test/') {
        await ruta.fulfill({
          contentType: 'text/html; charset=utf-8',
          body: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Otro</title></head><body>${fragmento}</body></html>`,
        });
        return;
      }
      pedidas.push(url);
      await ruta.abort();
    });
    await page.goto('http://otro.test/');
    await expect(page.locator('blockquote')).toHaveCount(1);
    await expect(page.locator('blockquote p').first()).toHaveText(textoDe(COMPLETA!.slug));
    await expect(page.locator('blockquote a')).toHaveText('Sabiduría de Bolsillo');
    await page.waitForLoadState('networkidle');
    expect(pedidas).toEqual([]);
  });
});

test.describe('Historia 30.5 — copiar el Fragmento pide su evento', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('una vez por pulsación, «copiado-de-fragmento» sin datos ni destino', async ({ page }) => {
    await espiarMedicion(page);
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    await boton(page).click();
    await expect(region(page)).toHaveText('Copiado.');
    await boton(page).click();
    await expect(region(page)).toHaveText('Copiado.');
    expect(await emitidosDeCopiar(page)).toEqual([
      { evento: EVENTOS.copiadoDeFragmento, datos: null, destino: null },
      { evento: EVENTOS.copiadoDeFragmento, datos: null, destino: null },
    ]);
  });

  test('con el portapapeles denegado no pide nada', async ({ page }) => {
    await espiarMedicion(page);
    await denegarPortapapeles(page);
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await resumen(page).click();
    await boton(page).click();
    // La rama del rechazo corrió: se intentó escribir, y ni «Copiado.» ni el estado.
    await expect.poll(() => escriturasDenegadas(page)).toBe(1);
    await page.waitForTimeout(300);
    await expect(boton(page)).not.toHaveAttribute('data-estado', 'copiado');
    await expect(region(page)).toHaveText('');
    expect(await emitidosDeCopiar(page)).toEqual([]);
  });
});

test.describe('Historia 30.4 — «Inserta esta cita», sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('abre y cierra; el campo se enfoca y se selecciona; el botón no se ve', async ({ page }) => {
    await page.goto(`/cita/${COMPLETA!.slug}/`);
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
    await resumen(page).click();
    await expect(desplegable(page)).toHaveAttribute('open', '');
    await expect(campo(page)).toBeVisible();
    await campo(page).focus();
    await expect(campo(page)).toBeFocused();
    await page.keyboard.press('ControlOrMeta+a');
    const seleccion = await campo(page).evaluate((n: HTMLTextAreaElement) => n.value.slice(n.selectionStart, n.selectionEnd));
    expect(seleccion).toBe(await campo(page).inputValue());
    expect(seleccion).toContain('<blockquote>');
    await expect(boton(page)).toBeHidden();
    await resumen(page).click();
    await expect(desplegable(page)).not.toHaveAttribute('open', /.*/);
  });
});
