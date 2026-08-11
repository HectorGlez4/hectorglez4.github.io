import { expect, test } from '@playwright/test';

/** Historias 5.1 y 5.2 — Imagen de Cita y selección de plantilla. */

const CITA = '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los';

async function abrirDialogo(page: import('@playwright/test').Page) {
  await page.goto(CITA);
  await page.getByRole('button', { name: 'Descargar como imagen' }).click();
  await expect(page.locator('[data-dialogo]')).toBeVisible();
  // Se espera a que el lienzo tenga algo pintado.
  await page.waitForFunction(() => {
    const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
    if (!l) return false;
    const d = l.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    return d[3] === 255;
  });
}

/** Los píxeles del lienzo, como cadena, para comparar composiciones. */
async function huella(page: import('@playwright/test').Page) {
  return page.locator('[data-lienzo]').evaluate((l) => (l as HTMLCanvasElement).toDataURL());
}

test.describe('Historia 5.1 — la acción y el diálogo', () => {
  test('el generador no se descarga hasta pulsar la acción', async ({ page }) => {
    // Se miran todas las respuestas y no solo las de tipo `script`: un `import()`
    // dinámico no siempre se clasifica como tal, y filtrar por tipo dejaba pasar
    // justamente la petición que esta prueba existe para vigilar.
    const descargados: string[] = [];
    page.on('response', (r) => descargados.push(r.url()));

    await page.goto(CITA, { waitUntil: 'networkidle' });
    expect(descargados.filter((u) => u.includes('imagen.js'))).toHaveLength(0);

    /*
     * Se espera a que el diálogo pinte y después se consulta la lista ya registrada, en
     * lugar de encadenar un `waitForResponse` al clic: la respuesta puede llegar antes de
     * que ese oyente se instale, y entonces la espera agota su tiempo por una carrera y
     * no porque falte la petición.
     */
    await page.getByRole('button', { name: 'Descargar como imagen' }).click();
    await page.waitForFunction(() => {
      const l = document.querySelector('[data-lienzo]') as HTMLCanvasElement | null;
      return !!l && l.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255;
    });

    // Las dos mitades del criterio: no antes de pulsar, y sí al pulsar.
    expect(descargados.filter((u) => u.includes('imagen.js')).length).toBeGreaterThan(0);
  });

  test('se abre con la previsualización real del texto de esa Cita', async ({ page }) => {
    await abrirDialogo(page);

    // La previsualización se compone con los datos de esta Cita, no con un ejemplo.
    const datos = await page.locator('[data-imagen]').evaluate((n) => ({
      texto: (n as HTMLElement).dataset.texto,
      autor: (n as HTMLElement).dataset.autor,
      tamaño: (n as HTMLElement).dataset.tamano,
    }));
    expect(datos.texto).toContain('La libertad, Sancho');
    expect(datos.autor).toBe('Miguel de Cervantes');
    expect(Number(datos.tamaño)).toBeGreaterThan(0);
  });

  test('el lienzo tiene proporción apta para redes', async ({ page }) => {
    await abrirDialogo(page);
    const medidas = await page
      .locator('[data-lienzo]')
      .evaluate((l) => ({ w: (l as HTMLCanvasElement).width, h: (l as HTMLCanvasElement).height }));
    expect(medidas.w).toBe(medidas.h);
    expect(medidas.w).toBeGreaterThanOrEqual(1000);
  });

  test('el tamaño tipográfico viene del módulo de tramos, no del generador', async ({ page }) => {
    await page.goto(CITA);
    // 91 caracteres → tramo lg → 52px en la imagen, según UX-DR19.
    const tamaño = await page
      .locator('[data-imagen]')
      .evaluate((n) => (n as HTMLElement).dataset.tamano);
    expect(tamaño).toBe('52');

    // Y el generador no lleva ningún tamaño codificado a mano.
    const fuente = await (await page.request.get('/islas/imagen.js')).text();
    expect(fuente).toMatch(/datos\.tamaño/);
    expect(fuente).not.toMatch(/font\s*=\s*`400 (44|52|64|42|34)px/);
  });

  test('la previsualización y el fichero descargado son el mismo lienzo', async ({ page }) => {
    await abrirDialogo(page);
    const antes = await huella(page);

    // Descargar redibuja y exporta ese mismo lienzo: no hay dos caminos que diverjan.
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar', exact: true }).click();
    await descarga;

    expect(await huella(page)).toBe(antes);
  });

  test('la descarga emite el evento por el módulo de medición', async ({ page }) => {
    await page.goto(CITA);
    await page.evaluate(() => {
      (window as unknown as { __emitidos: string[] }).__emitidos = [];
      (window as unknown as { __medir: unknown }).__medir = (e: string) =>
        (window as unknown as { __emitidos: string[] }).__emitidos.push(e);
    });

    await page.getByRole('button', { name: 'Descargar como imagen' }).click();
    await expect(page.locator('[data-dialogo]')).toBeVisible();

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar', exact: true }).click();
    await descarga;

    expect(
      await page.evaluate(() => (window as unknown as { __emitidos: string[] }).__emitidos),
    ).toContain('descarga-de-imagen');
  });

  test('la Página de Cita sigue siendo utilizable con el diálogo abierto', async ({ page }) => {
    await abrirDialogo(page);
    // La Cita y su atribución siguen en el documento y accesibles.
    await expect(page.locator('h1')).toContainText('La libertad, Sancho');
    await expect(page.locator('.autor')).toBeAttached();
  });

  test('todo lo que ofrece la imagen está disponible como texto copiable', async ({ page }) => {
    // UX-DR26 — la imagen nunca es la única vía al contenido.
    await page.goto(CITA);
    await expect(page.getByRole('button', { name: 'Copiar la cita' })).toBeVisible();
  });
});

test.describe('Historia 5.2 — plantillas', () => {
  test('hay tres, cada una con la previsualización de esa Cita', async ({ page }) => {
    await abrirDialogo(page);
    const botones = page.locator('[data-plantillas] .plantilla');
    await expect(botones).toHaveCount(3);
  });

  test('los botones de plantilla son zonas de toque de 44px', async ({ page }) => {
    /*
     * Regresión. Los crea el guion, y Astro acota los estilos del componente con un
     * atributo que solo pone al renderizar: sin `:global` salían sin estilo ninguno y
     * medían unos 20px de alto. No lo veía ninguna prueba de accesibilidad porque todas
     * miran la página con el diálogo cerrado.
     */
    await abrirDialogo(page);
    const altos = await page
      .locator('[data-plantillas] .plantilla')
      .evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().height));

    expect(altos).toHaveLength(3);
    for (const alto of altos) expect(alto).toBeGreaterThanOrEqual(44);
  });

  test('cambiar de plantilla cambia la composición', async ({ page }) => {
    await abrirDialogo(page);
    const primera = await huella(page);

    await page.locator('[data-plantillas] .plantilla').nth(1).click();
    await expect(page.locator('[data-plantillas] .plantilla').nth(1)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await huella(page)).not.toBe(primera);
  });

  test('el contenido textual y la atribución son idénticos en todas', async ({ page }) => {
    await abrirDialogo(page);

    // Las plantillas solo cambian color y adorno: el generador compone el texto una vez
    // y no lo toca según la plantilla.
    const fuente = await (await page.request.get('/islas/imagen.js')).text();
    const plantillas = /export const PLANTILLAS = \[([\s\S]*?)\];/.exec(fuente)![1];

    // Ninguna plantilla declara texto, autor ni procedencia propios.
    expect(plantillas).not.toMatch(/texto|autor|procedencia|marca/);
    // Solo color y adorno.
    for (const clave of ['fondo', 'tinta', 'apagada', 'filete']) {
      expect(plantillas).toContain(clave);
    }
  });

  test('se cierra con Escape', async ({ page }) => {
    await abrirDialogo(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-dialogo]')).toBeHidden();
  });

  test('se cierra al tocar fuera', async ({ page }) => {
    await abrirDialogo(page);
    // Una esquina del fondo atenuado, fuera del contenido del diálogo.
    await page.locator('[data-dialogo]').click({ position: { x: 2, y: 2 } });
    await expect(page.locator('[data-dialogo]')).toBeHidden();
  });

  test('se cierra con el botón', async ({ page }) => {
    await abrirDialogo(page);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.locator('[data-dialogo]')).toBeHidden();
  });

  test('la descarga es directa, sin paso intermedio ni registro', async ({ page }) => {
    await abrirDialogo(page);

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar', exact: true }).click();
    const fichero = await descarga;

    expect(fichero.suggestedFilename()).toMatch(/\.png$/);
    // Ni formulario, ni correo, ni confirmación entre pulsar y obtener el fichero.
    expect(await page.locator('[data-dialogo] input, [data-dialogo] form').count()).toBe(0);
  });

  test('el fondo se atenúa, que es la única profundidad del producto', async ({ page }) => {
    await abrirDialogo(page);
    const opacidad = await page.evaluate(() => {
      const d = document.querySelector('[data-dialogo]')!;
      return getComputedStyle(d, '::backdrop').backgroundColor;
    });
    expect(opacidad).toMatch(/rgba?\(/);
  });
});
