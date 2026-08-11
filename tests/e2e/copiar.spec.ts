import { expect, test } from '@playwright/test';

/** Historia 2.2 — Copiado con atribución. */

const CON_PROCEDENCIA = '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los';
const SIN_OBRA = '/cita/concepcion-arenal-odia-el-delito-y-compadece-al-delincuente';

const ESPERADO =
  '«La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron ' +
  'los cielos.» — Miguel de Cervantes, Don Quijote de la Mancha, 1615.';

test.describe('Historia 2.2 — copiar', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('una pulsación copia el texto y la atribución juntos', async ({ page }) => {
    await page.goto(CON_PROCEDENCIA);
    await page.getByRole('button', { name: 'Copiar la cita' }).click();

    const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
    expect(portapapeles).toBe(ESPERADO);
  });

  test('lo copiado es texto plano, sin marcado', async ({ page }) => {
    await page.goto(CON_PROCEDENCIA);
    await page.getByRole('button', { name: 'Copiar la cita' }).click();

    const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
    expect(portapapeles).not.toMatch(/[<>]/);
    expect(portapapeles).not.toMatch(/&[a-z]+;/);
  });

  test('nunca se copia una procedencia que no consta', async ({ page }) => {
    await page.goto(SIN_OBRA);
    await page.getByRole('button', { name: 'Copiar la cita' }).click();

    const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
    expect(portapapeles).toBe('«Odia el delito y compadece al delincuente.» — Concepción Arenal.');
    // Ni obra inventada ni la coletilla de la página sobre la ausencia.
    expect(portapapeles).not.toContain('Sin obra documentada');
  });

  test('el propio botón confirma durante dos segundos, sin notificación flotante', async ({
    page,
  }) => {
    await page.goto(CON_PROCEDENCIA);
    const boton = page.getByRole('button', { name: 'Copiar la cita' });
    await boton.click();

    await expect(page.getByRole('button', { name: 'Copiado.' })).toBeVisible();
    // Sin ningún elemento flotante añadido al documento.
    expect(await page.locator('[role="status"], [role="alert"], .toast').count()).toBe(0);

    // Y vuelve a su estado tras los dos segundos.
    await expect(page.getByRole('button', { name: 'Copiar la cita' })).toBeVisible({
      timeout: 4000,
    });
  });

  test('si el portapapeles falla, el texto se ofrece seleccionable y sin error técnico', async ({
    page,
  }) => {
    await page.goto(CON_PROCEDENCIA);
    // Se rompe el portapapeles a propósito: es lo que ocurre de verdad en contextos no
    // seguros y cuando el permiso está denegado.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('denegado')) },
        configurable: true,
      });
    });

    await page.getByRole('button', { name: 'Copiar la cita' }).click();

    const campo = page.locator('[data-respaldo-texto]');
    await expect(campo).toBeVisible();
    await expect(campo).toHaveValue(ESPERADO);

    // Sin mensaje de error técnico en ninguna parte de la página.
    const texto = await page.locator('body').innerText();
    expect(texto).not.toMatch(/error|denegado|failed|excepción/i);
  });

  test('la acción es alcanzable con teclado y su foco es visible', async ({ page }) => {
    await page.goto(CON_PROCEDENCIA);
    const boton = page.getByRole('button', { name: 'Copiar la cita' });
    await boton.focus();

    const contorno = await boton.evaluate((n) => getComputedStyle(n).outlineWidth);
    expect(contorno).not.toBe('0px');
  });

  test('la zona de toque llega a 44px', async ({ page }) => {
    await page.goto(CON_PROCEDENCIA);
    const caja = await page.getByRole('button', { name: 'Copiar la cita' }).boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
  });
});
