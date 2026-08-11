import { expect, test } from '@playwright/test';

/** Historias 3.1 y 3.2 — búsqueda y resultado vacío. */

/** Escribe la consulta y espera a que la lista se estabilice. */
async function buscar(page: import('@playwright/test').Page, consulta: string) {
  await page.goto('/buscar');
  await page.locator('[data-consulta]').fill(consulta);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-resultados]')!.children.length > 0 ||
      !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
    undefined,
    { timeout: 10_000 },
  );
}

async function resultados(page: import('@playwright/test').Page) {
  return page.locator('[data-resultados] .resultado').evaluateAll((ns) =>
    ns.map((n) => ({
      tipo: n.querySelector('.clase')!.getAttribute('data-tipo'),
      titulo: n.querySelector('.titulo')!.textContent!.trim(),
      href: n.querySelector('a')!.getAttribute('href')!,
    })),
  );
}

test.describe('Historia 3.1 — encontrar', () => {
  test('un fragmento de tres o más palabras localiza la Cita', async ({ page }) => {
    await buscar(page, 'no hay camino');
    const citas = (await resultados(page)).filter((r) => r.tipo === 'cita');
    expect(citas.some((r) => r.titulo.includes('Caminante, no hay camino'))).toBe(true);
  });

  test('sin acentos devuelve lo mismo que con acentos', async ({ page }) => {
    await buscar(page, 'todavía');
    const conAcento = (await resultados(page)).map((r) => r.href).sort();

    await buscar(page, 'todavia');
    const sinAcento = (await resultados(page)).map((r) => r.href).sort();

    expect(sinAcento).toEqual(conAcento);
    expect(sinAcento.length).toBeGreaterThan(0);
  });

  test('mayúsculas y minúsculas dan el mismo resultado', async ({ page }) => {
    await buscar(page, 'CAMINANTE');
    const enMayusculas = (await resultados(page)).map((r) => r.href).sort();

    await buscar(page, 'caminante');
    const enMinusculas = (await resultados(page)).map((r) => r.href).sort();

    expect(enMayusculas).toEqual(enMinusculas);
    expect(enMinusculas.length).toBeGreaterThan(0);
  });

  test('los resultados distinguen si la coincidencia es de Cita, Autor o Tema', async ({ page }) => {
    await buscar(page, 'machado');
    const tipos = new Set((await resultados(page)).map((r) => r.tipo));
    expect(tipos.has('autor')).toBe(true);

    await buscar(page, 'no hay camino');
    const conTodo = await resultados(page);
    expect(new Set(conTodo.map((r) => r.tipo))).toEqual(new Set(['cita', 'autor', 'tema']));
    // Y la etiqueta que se lee corresponde al tipo.
    for (const r of conTodo) expect(['Cita', 'Autor', 'Tema']).toContain(
      { cita: 'Cita', autor: 'Autor', tema: 'Tema' }[r.tipo!],
    );
  });

  test('todo resultado lleva a una página que existe', async ({ page, request }) => {
    await buscar(page, 'vida');
    for (const r of await resultados(page)) {
      expect((await request.get(r.href, { maxRedirects: 0 })).status(), r.href).toBe(200);
    }
  });

  test('el índice no contiene nada no publicado', async ({ page }) => {
    // Un Tema por debajo del umbral no tiene página, así que no hay nada que indexar.
    await buscar(page, 'amistad');
    for (const r of await resultados(page)) {
      expect(r.href).not.toContain('/tema/la-amistad');
    }
  });

  test('la marca del sitio no convierte cada página en un resultado', async ({ page }) => {
    // Sin acotar el índice al contenido principal, «sabiduría» devolvía las 54 páginas
    // porque la marca está en la cabecera de todas.
    await buscar(page, 'sabiduria');
    expect((await resultados(page)).length).toBeLessThan(10);
  });
});

test.describe('Historia 3.1 — la búsqueda no se carga hasta que hace falta', () => {
  test('una página cargada sin interactuar no ha descargado el código de búsqueda', async ({
    page,
  }) => {
    const descargados: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') descargados.push(r.url());
    });

    await page.goto('/buscar', { waitUntil: 'networkidle' });
    expect(descargados.filter((u) => u.includes('pagefind'))).toHaveLength(0);
  });

  test('al enfocar el campo, se carga', async ({ page }) => {
    const descargados: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') descargados.push(r.url());
    });

    await page.goto('/buscar');
    await page.locator('[data-consulta]').focus();
    await page.waitForResponse((r) => r.url().includes('pagefind'), { timeout: 10_000 });

    expect(descargados.filter((u) => u.includes('pagefind')).length).toBeGreaterThan(0);
  });
});

test.describe('Historia 3.2 — resultado vacío con salida', () => {
  const SIN_RESULTADOS = 'xylofonorquesta inexistente';

  test('se ofrecen Temas y Autores destacados', async ({ page }) => {
    await buscar(page, SIN_RESULTADOS);

    const salida = page.locator('[data-salida]');
    await expect(salida).toBeVisible();
    expect(await salida.locator('a[href^="/tema/"]').count()).toBeGreaterThan(0);
    expect(await salida.locator('a[href^="/autor/"]').count()).toBeGreaterThan(0);
  });

  test('el mensaje sugiere reformular con menos palabras', async ({ page }) => {
    await buscar(page, SIN_RESULTADOS);
    await expect(page.locator('.sugerencia')).toContainText('Prueba con menos palabras');
  });

  test('no aparece ningún texto de error técnico', async ({ page }) => {
    await buscar(page, SIN_RESULTADOS);
    const texto = await page.locator('main').innerText();
    expect(texto).not.toMatch(/error|excepci|failed|undefined|null|0 resultados/i);
  });

  test('no es un callejón sin salida: todas las salidas llevan a algún sitio', async ({
    page,
    request,
  }) => {
    await buscar(page, SIN_RESULTADOS);
    const hrefs = await page
      .locator('[data-salida] a')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('href')!));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect((await request.get(href, { maxRedirects: 0 })).status(), href).toBe(200);
    }
  });

  test('se emite el evento de búsqueda sin resultados, con la consulta y sin visitante', async ({
    page,
  }) => {
    await page.goto('/buscar');
    // Se instala un espía en el hueco del módulo de medición, que es por donde pasa todo.
    await page.evaluate(() => {
      (window as unknown as { __emitidos: unknown[] }).__emitidos = [];
      (window as unknown as { __medir: unknown }).__medir = (evento: string, datos: string) => {
        (window as unknown as { __emitidos: unknown[] }).__emitidos.push({ evento, datos });
      };
    });

    await page.locator('[data-consulta]').fill(SIN_RESULTADOS);
    await page.waitForFunction(
      () => !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
      undefined,
      { timeout: 10_000 },
    );

    const emitidos = await page.evaluate(
      () => (window as unknown as { __emitidos: { evento: string; datos: string }[] }).__emitidos,
    );

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].evento).toBe('busqueda-sin-resultados');
    expect(emitidos[0].datos).toBe(SIN_RESULTADOS);
  });

  test('con resultados no se muestra la salida', async ({ page }) => {
    await buscar(page, 'no hay camino');
    await expect(page.locator('[data-salida]')).toBeHidden();
  });
});
