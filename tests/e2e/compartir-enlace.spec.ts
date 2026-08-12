import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DESTINOS } from '../../src/lib/compartir.ts';
import { enlaceConOrigen } from '../../src/lib/redes.ts';

/** Historia 10.3 — compartir el enlace a un destino. */

const CITA = '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los';
const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Instala una hoja del sistema que solo sabe de texto y enlace, sin ficheros. */
async function conHojaDeEnlace(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const ventana = window as unknown as { __compartido: unknown[] };
    ventana.__compartido = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (datos: unknown) => {
        ventana.__compartido.push(datos);
      },
    });
  });
}

test.describe('Historia 10.3 — sin hoja del sistema', () => {
  test('se ven destinos concretos, no un control deshabilitado', async ({ page }) => {
    await page.goto(CITA);
    const destinos = page.locator('[data-destinos] a');
    await expect(destinos).toHaveCount(DESTINOS.length);
    await expect(destinos.first()).toBeVisible();
    await expect(page.locator('[data-hoja]')).toBeHidden();
  });

  test('cada destino lleva la Cita y el Autor en el enlace', async ({ page }) => {
    await page.goto(CITA);
    for (const destino of DESTINOS) {
      const href = (await page.locator(`[data-destino="${destino.id}"]`).getAttribute('href'))!;
      const legible = decodeURIComponent(href);
      expect(legible, destino.id).toContain('La libertad, Sancho');
      expect(legible, destino.id).toContain('Miguel de Cervantes');
      expect(legible, destino.id).toContain('/cita/miguel-de-cervantes');
    }
  });

  test('ningún destino pide instalar nada ni registrarse en el sitio', async ({ page }) => {
    await page.goto(CITA);
    for (const destino of DESTINOS) {
      const href = (await page.locator(`[data-destino="${destino.id}"]`).getAttribute('href'))!;
      expect(href, destino.id).toMatch(/^(https:\/\/|mailto:)/);
    }
    // Y en la propia página no ha aparecido ningún formulario de registro.
    expect(await page.locator('body').innerText()).not.toMatch(/regístrate|crea una cuenta|instala/i);
  });

  test('los destinos funcionan con JavaScript desactivado', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const pagina = await contexto.newPage();
    await pagina.goto(`http://localhost:4321${CITA}`);

    // Son enlaces de verdad compuestos en el build, no algo que arme un guion al pulsar.
    await expect(pagina.locator('[data-destinos] a')).toHaveCount(DESTINOS.length);
    await expect(pagina.locator('[data-destinos]')).toBeVisible();
    await contexto.close();
  });
});

test.describe('Historia 10.3 — con hoja del sistema', () => {
  test('se ofrece la hoja y se esconde la lista', async ({ page }) => {
    await conHojaDeEnlace(page);
    await page.goto(CITA);
    await expect(page.locator('[data-hoja]')).toBeVisible();
    await expect(page.locator('[data-destinos]')).toBeHidden();
  });

  test('la hoja recibe el enlace y el texto', async ({ page }) => {
    await conHojaDeEnlace(page);
    await page.goto(CITA);
    await page.locator('[data-hoja]').click();
    await page.waitForFunction(
      () => (window as unknown as { __compartido: unknown[] }).__compartido.length > 0,
    );

    const [compartido] = (await page.evaluate(
      () => (window as unknown as { __compartido: { text: string; url: string }[] }).__compartido,
    )) as { text: string; url: string }[];

    expect(compartido.url).toContain('/cita/miguel-de-cervantes');
    expect(compartido.text).toContain('La libertad, Sancho');
    expect(compartido.text).toContain('Miguel de Cervantes');
    // Nunca solo la dirección.
    expect(compartido.text).not.toBe(compartido.url);
  });
});

test.describe('Historia 10.3 — lo que se comparte es la canónica', () => {
  test('el enlace compartido no arrastra marca de origen', async ({ page }) => {
    await page.goto(enlaceConOrigen(CITA, 'tiktok'));

    for (const destino of DESTINOS) {
      const href = decodeURIComponent(
        (await page.locator(`[data-destino="${destino.id}"]`).getAttribute('href'))!,
      );
      // Llegar con marca no debe propagar la marca a quien reciba el enlace: el
      // buscador vería tantas páginas como veces se compartiera.
      expect(href, destino.id).not.toContain('?de=');
    }
  });

  test('solo existe la URL canónica, con marca y sin ella', async ({ page }) => {
    await page.goto(enlaceConOrigen(CITA, 'x'));
    const canonica = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonica).not.toContain('?');

    const compartida = decodeURIComponent(
      (await page.locator('[data-destino="telegram"]').getAttribute('href'))!,
    );
    expect(compartida).toContain(canonica!);
  });
});

test.describe('Historia 10.4 — la compartición del enlace se mide', () => {
  /** Espía en el hueco del módulo de medición, que es por donde pasa todo (AD-13). */
  async function conEspia(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
      const ventana = window as unknown as { __emitidos: unknown[] };
      ventana.__emitidos = [];
      (window as unknown as { __medir: unknown }).__medir = (
        evento: string,
        datos: string,
        destino: string,
      ) => ventana.__emitidos.push({ evento, datos, destino });
    });
  }

  const emitidos = (page: import('@playwright/test').Page) =>
    page.evaluate(
      () =>
        (window as unknown as { __emitidos: { evento: string; destino: string }[] }).__emitidos,
    );

  test('un destino elegido en el sitio se registra con su nombre', async ({ page }) => {
    await conEspia(page);
    await page.goto(CITA);

    // Se anula la navegación: lo que se comprueba es el evento, no que se abra Telegram.
    await page.route('**/t.me/**', (ruta) => ruta.abort());
    await page.locator('[data-destino="telegram"]').click({ modifiers: [] });

    const [evento] = await emitidos(page);
    expect(evento.evento).toBe('comparticion-de-enlace');
    expect(evento.destino).toBe('telegram');
  });

  test('por la hoja del sistema el destino es opaco', async ({ page }) => {
    await conHojaDeEnlace(page);
    await conEspia(page);
    await page.goto(CITA);
    await page.locator('[data-hoja]').click();
    await page.waitForFunction(
      () => (window as unknown as { __emitidos: unknown[] }).__emitidos.length > 0,
    );

    const [evento] = await emitidos(page);
    expect(evento.evento).toBe('comparticion-de-enlace');
    expect(evento.destino).toBe('opaco');
  });

  test('la compartición de enlace y la de imagen se distinguen', async ({ page }) => {
    await conHojaDeEnlace(page);
    await conEspia(page);
    await page.goto(CITA);
    await page.locator('[data-hoja]').click();
    await page.waitForFunction(
      () => (window as unknown as { __emitidos: unknown[] }).__emitidos.length > 0,
    );

    expect((await emitidos(page))[0].evento).toBe('comparticion-de-enlace');
    expect((await emitidos(page))[0].evento).not.toBe('comparticion-de-imagen');
  });
});

test.describe('Historia 10.3 — los controles no son contenido buscable', () => {
  /*
   * El índice de Pagefind se construye sobre `dist/`, así que se llevaba dentro las
   * etiquetas de los botones y el código de los guiones en línea, que viven dentro de
   * `<main>`. Con el destino «X» de esta historia, la búsqueda de una consulta
   * inexistente empezó a devolver el corpus entero — lo destapó la prueba de la
   * Historia 3.2, no esta.
   *
   * Se mide sobre el marcado construido y no buscando las palabras: Pagefind responde a
   * un término que no conoce con lo que más se le parece, así que buscar «telegram»
   * devuelve Citas aunque el índice no contenga esa palabra. Eso mediría la difusidad
   * del buscador y no lo que aquí importa. Que la búsqueda vacía vuelva a comportarse
   * lo vigila la prueba de la Historia 3.2, que es la que lo destapó.
   */
  test('la parte indexable de una Página de Cita es la Cita, y nada más', () => {
    const html = readFileSync(
      join(dist, 'cita', 'miguel-de-cervantes-la-libertad-sancho-es-uno-de-los.html'),
      'utf8',
    );

    // Lo indexable es `<main>` menos los subárboles marcados para ignorar. Se quitan
    // esos y los guiones, y lo que queda es lo que Pagefind se lleva.
    const cuerpo = html.slice(html.indexOf('data-pagefind-body'), html.indexOf('</main>'));
    const indexable = cuerpo
      .replace(/<div[^>]*data-pagefind-ignore[\s\S]*?<\/div>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<[^>]+>/g, ' ');

    expect(indexable).toContain('La libertad, Sancho');
    for (const control of ['Copiar la cita', 'WhatsApp', 'Telegram', 'querySelector']) {
      expect(indexable, `«${control}» se indexa`).not.toContain(control);
    }
  });
});
