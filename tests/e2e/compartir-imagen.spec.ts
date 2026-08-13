import { expect, test } from '@playwright/test';

/** Historia 10.2 — la imagen sale por la hoja del sistema cuando la hay. */

const CITA = '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los';

/**
 * Instala una hoja del sistema de mentira antes de que cargue la página.
 *
 * El navegador de las pruebas no trae Web Share, así que sin esto solo se podría probar
 * el camino de descarga — que es la mitad del criterio. Lo que se simula es la API del
 * navegador, no el código del producto: lo que se ejecuta es el de verdad.
 */
async function conHojaDelSistema(
  page: import('@playwright/test').Page,
  comportamiento: 'acepta' | 'cancela' | 'falla' = 'acepta',
) {
  await page.addInitScript((modo) => {
    const ventana = window as unknown as { __compartido: unknown[] };
    ventana.__compartido = [];

    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (datos: { files?: File[] }) => Array.isArray(datos?.files) && datos.files.length > 0,
    });

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (datos: { files?: File[] }) => {
        if (modo === 'cancela') {
          const abortada = new Error('cancelada por el visitante');
          abortada.name = 'AbortError';
          throw abortada;
        }
        if (modo === 'falla') throw new Error('la hoja no abrió');

        const fichero = datos.files![0];
        ventana.__compartido.push({
          nombre: fichero.name,
          tipo: fichero.type,
          tamaño: fichero.size,
          contenido: [...new Uint8Array(await fichero.arrayBuffer())].slice(0, 8).join(','),
        });
      },
    });
  }, comportamiento);
}

async function abrirYComponer(page: import('@playwright/test').Page) {
  await page.goto(CITA);
  await page.locator('[data-abrir]').click();
  await page.waitForFunction(() => {
    const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
    return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
  });
}

test.describe('Historia 10.2 — con hoja del sistema', () => {
  test('la acción abre la hoja con la imagen ya adjunta', async ({ page }) => {
    await conHojaDelSistema(page);
    await abrirYComponer(page);
    await page.locator('[data-descargar]').click();

    /*
     * Se espera a que la hoja reciba, en vez de leer justo después del clic: el
     * manejador es asíncrono —compone el blob y construye el fichero— y encadenar la
     * lectura al clic agotaba el tiempo por una carrera y no por faltar la compartición.
     */
    await page.waitForFunction(
      () => (window as unknown as { __compartido: unknown[] }).__compartido.length > 0,
    );

    const compartido = await page.evaluate(
      () => (window as unknown as { __compartido: { nombre: string; tipo: string; tamaño: number }[] }).__compartido,
    );

    expect(compartido).toHaveLength(1);
    expect(compartido[0].tipo).toBe('image/png');
    expect(compartido[0].nombre).toMatch(/\.png$/);
    expect(compartido[0].tamaño).toBeGreaterThan(1000);
  });

  test('la acción se nombra por lo que hace, sin avisos ni controles deshabilitados', async ({ page }) => {
    await conHojaDelSistema(page);
    await page.goto(CITA);

    await expect(page.locator('[data-abrir]')).toHaveText('Compartir como imagen');
    await expect(page.locator('[data-abrir]')).toBeEnabled();
    // Ni rastro de un aviso de compatibilidad.
    expect(await page.locator('body').innerText()).not.toMatch(/no compatible|no admite|tu navegador/i);
  });

  test('cerrar la hoja sin elegir destino no registra nada ni enseña error', async ({ page }) => {
    await conHojaDelSistema(page, 'cancela');
    await page.addInitScript(() => {
      const ventana = window as unknown as { __medido: string[] };
      ventana.__medido = [];
      (window as unknown as { __medir: unknown }).__medir = (evento: string) =>
        ventana.__medido.push(evento);
    });

    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));

    await abrirYComponer(page);
    await page.locator('[data-descargar]').click();
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => (window as unknown as { __medido: string[] }).__medido)).toEqual([]);
    expect(errores).toEqual([]);
    expect(await page.locator('body').innerText()).not.toMatch(/error/i);
  });

  test('si la hoja falla por otra razón, la imagen se descarga igualmente', async ({ page }) => {
    await conHojaDelSistema(page, 'falla');
    await abrirYComponer(page);

    const descarga = page.waitForEvent('download');
    await page.locator('[data-descargar]').click();
    expect((await descarga).suggestedFilename()).toMatch(/\.png$/);
  });
});

test.describe('Historia 10.2 — sin hoja del sistema, la v1 intacta', () => {
  test('la misma acción descarga el fichero', async ({ page }) => {
    await abrirYComponer(page);
    const descarga = page.waitForEvent('download');
    await page.locator('[data-descargar]').click();
    expect((await descarga).suggestedFilename()).toMatch(/\.png$/);
  });

  test('la etiqueta es la de siempre y el control está activo', async ({ page }) => {
    await page.goto(CITA);
    await expect(page.locator('[data-abrir]')).toHaveText('Descargar como imagen');
    await expect(page.locator('[data-abrir]')).toBeEnabled();
  });
});

test.describe('Historia 10.2 — se comprueba compartir ficheros, no compartir', () => {
  test('un navegador que solo comparte enlaces sigue descargando', async ({ page }) => {
    /*
     * Es el caso que el criterio señala. `navigator.share` a secas existe en navegadores
     * que no admiten ficheros: darlo por bueno abriría la hoja sin la imagen, y el
     * visitante creería haber publicado la Cita habiendo publicado una dirección.
     */
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {} });
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: (datos: { files?: File[] }) => datos?.files === undefined,
      });
    });

    await page.goto(CITA);
    await expect(page.locator('[data-abrir]')).toHaveText('Descargar como imagen');

    await page.locator('[data-abrir]').click();
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });

    const descarga = page.waitForEvent('download');
    await page.locator('[data-descargar]').click();
    expect((await descarga).suggestedFilename()).toMatch(/\.png$/);
  });
});

test.describe('Historia 10.2 — el mismo fichero por los dos caminos', () => {
  test('lo compartido y lo descargado salen de la misma generación', async ({ page }) => {
    await conHojaDelSistema(page);
    await abrirYComponer(page);

    // Se generan los dos blobs desde el mismo lienzo, con el módulo de verdad.
    const iguales = await page.evaluate(async () => {
      // La isla se pide por su URL del sitio, que es como la carga el navegador de verdad.
      // El especificador va en una constante y no escrito ahí mismo a propósito: literal,
      // TypeScript lo leería como una ruta de disco desde la raíz del sistema y no
      // encontraría nada — `/islas/imagen.js` solo existe una vez servido el sitio.
      //
      // Los tipos entran por la anotación, leídos del fichero real (`allowJs` está activo
      // en la base de Astro). Así el contrato de la isla no se escribe dos veces: si
      // `imagen.js` cambia una firma, esta prueba deja de compilar sola.
      const RUTA_ISLA = '/islas/imagen.js';
      const g: typeof import('../../public/islas/imagen.js') = await import(RUTA_ISLA);
      const lienzo = document.querySelector('[data-lienzo]') as HTMLCanvasElement;
      const uno = await g.aBlob(lienzo);
      const otro = await g.aBlob(lienzo);
      const bytes = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())].join(',');
      return (await bytes(uno)) === (await bytes(otro));
    });

    expect(iguales).toBe(true);
  });
});

test.describe('Historia 10.4 — la compartición de la imagen se mide', () => {
  async function conEspia(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
      const ventana = window as unknown as { __emitidos: unknown[] };
      ventana.__emitidos = [];
      (window as unknown as { __medir: unknown }).__medir = (
        evento: string,
        datos: string,
        destino: string,
      ) => ventana.__emitidos.push({ evento, destino });
    });
  }

  const emitidos = (page: import('@playwright/test').Page) =>
    page.evaluate(
      () => (window as unknown as { __emitidos: { evento: string; destino: string }[] }).__emitidos,
    );

  test('compartida por la hoja: evento de compartición y destino opaco', async ({ page }) => {
    await conHojaDelSistema(page);
    await conEspia(page);
    await abrirYComponer(page);
    await page.locator('[data-descargar]').click();
    await page.waitForFunction(
      () => (window as unknown as { __emitidos: unknown[] }).__emitidos.length > 0,
    );

    const [evento] = await emitidos(page);
    expect(evento.evento).toBe('comparticion-de-imagen');
    expect(evento.destino).toBe('opaco');
  });

  test('descargada: sigue siendo el evento de descarga de la v1', async ({ page }) => {
    /*
     * Las dos mitades de SM-C3. Si compartir emitiera el mismo evento que descargar, no
     * habría forma de saber si la compartición creció a costa del copiado.
     */
    await conEspia(page);
    await abrirYComponer(page);

    const descarga = page.waitForEvent('download');
    await page.locator('[data-descargar]').click();
    await descarga;
    await page.waitForFunction(
      () => (window as unknown as { __emitidos: unknown[] }).__emitidos.length > 0,
    );

    const [evento] = await emitidos(page);
    expect(evento.evento).toBe('descarga-de-imagen');
    expect(evento.destino).toBeUndefined();
  });

  test('cancelar la hoja no emite ninguno de los dos', async ({ page }) => {
    await conHojaDelSistema(page, 'cancela');
    await conEspia(page);
    await abrirYComponer(page);
    await page.locator('[data-descargar]').click();
    await page.waitForTimeout(400);

    expect(await emitidos(page)).toEqual([]);
  });
});
