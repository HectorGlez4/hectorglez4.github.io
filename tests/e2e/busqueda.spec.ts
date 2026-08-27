import { expect, test, type Page } from '@playwright/test';
import { ETIQUETAS_DE_RESULTADO } from '../../src/lib/tipoDeResultado.ts';
import { temaBajoUmbral } from './ayuda/corpus.ts';

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
      tipo: n.querySelector('.clase')!.getAttribute('data-tipo')!,
      etiqueta: n.querySelector('.clase')!.textContent!.trim(),
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

  test('los resultados distinguen de qué clase de superficie es la coincidencia', async ({
    page,
  }) => {
    await buscar(page, 'machado');
    const tipos = new Set((await resultados(page)).map((r) => r.tipo));
    expect(tipos.has('autor')).toBe(true);

    await buscar(page, 'no hay camino');
    const conTodo = await resultados(page);

    /*
     * Contención y no igualdad de conjuntos. Esto afirmaba `toEqual(new Set(['cita',
     * 'autor', 'tema']))`, y era una bomba con fecha: el día que se cure la primera
     * Colección aparecería un cuarto tipo y esta prueba se caería por algo que no está
     * midiendo. Lo que la historia promete es que las clases **se distinguen**, no cuántas
     * hay; que no aparezca ninguna desconocida se afirma justo debajo, y esa sí es la
     * garantía que interesa conservar.
     */
    for (const exigido of ['cita', 'autor', 'tema']) {
      expect([...new Set(conTodo.map((r) => r.tipo))], exigido).toContain(exigido);
    }

    // Ninguna clase sin declarar, y el rótulo que se lee es el de la tabla que pinta la
    // página. La tabla se importa: escribirla aquí a mano era la tercera copia.
    for (const r of conTodo) {
      expect(Object.keys(ETIQUETAS_DE_RESULTADO), r.href).toContain(r.tipo);
      expect(r.etiqueta, r.href).toBe(
        ETIQUETAS_DE_RESULTADO[r.tipo as keyof typeof ETIQUETAS_DE_RESULTADO],
      );
    }
  });

  test('todo resultado lleva a una página que existe', async ({ page, request }) => {
    await buscar(page, 'vida');
    for (const r of await resultados(page)) {
      expect((await request.get(r.href, { maxRedirects: 0 })).status(), r.href).toBe(200);
    }
  });

  test('el índice no contiene nada no publicado', async ({ page }) => {
    // Un Tema por debajo del umbral no tiene página, así que no hay nada que indexar. Cuál es
    // se deriva del Corpus: fijarlo a mano caducó en cuanto la siembra lo cruzó.
    const bajoUmbral = temaBajoUmbral();
    test.skip(
      bajoUmbral === undefined,
      'Hoy todos los Temas declarados se publican: no hay ninguno cuya ausencia comprobar.',
    );

    await buscar(page, bajoUmbral!.replace(/^(el|la|los|las)-/, ''));
    for (const r of await resultados(page)) {
      expect(r.href).not.toContain(`/tema/${bajoUmbral}`);
    }
  });

  test('la marca del sitio no convierte cada página en un resultado', async ({ page, request }) => {
    /*
     * Sin acotar el índice al contenido principal, «sabiduría» devolvía **todas** las páginas
     * porque la marca está en la cabecera de cada una. Eso es lo que se comprueba.
     *
     * El listón estaba calibrado a mano —«menos de 10»— sobre un sitio de 54 páginas. Con 806
     * hay Citas que hablan de la sabiduría de verdad, y trece resultados no son «todas»: son
     * los que la palabra merece. Se compara con el tamaño del sitio en vez de con un número.
     */
    await buscar(page, 'sabiduria');
    const paginas = ((await (await request.get('/sitemap-0.xml')).text()).match(/<loc>/g) ?? [])
      .length;
    expect(paginas).toBeGreaterThan(100);
    expect((await resultados(page)).length).toBeLessThan(paginas / 10);
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
  /*
   * La consulta que no encuentra nada **se le pregunta al sitio**, no se fija.
   *
   * Van dos veces que una literal caduca. La primera era «xylofonorquesta inexistente» y dejó
   * de dar cero al crecer el Corpus; se cambió por «zzzzzzzz», y en la 89.ª esa también empezó
   * a encontrar algo —sin que ninguna Cita contenga esas letras—.
   *
   * La causa es que **Pagefind casa por fragmentos**: cuanto más grande el Corpus, más cerca
   * está cualquier cadena de parecerse a algo. Así que no hay literal que sobreviva, y elegir
   * otra sería el mismo fallo por tercera vez: lo que hay que quitar de la prueba no es la
   * cadena, es la costumbre de fijarla.
   *
   * Se prueban varias y se usa la primera que hoy dé cero. Si ninguna da cero, la prueba se
   * salta **diciendo por qué**: el estado vacío seguirá existiendo, pero este Corpus ya no
   * sabría cómo llegar a él, y eso es una noticia, no un aprobado.
   */
  const CANDIDATAS = ['zzzzzzzz', 'wkjhgfdsa', 'qqqjjjxxxzzz', 'ñññmmmkkk', 'xzqwvbnmlkjhgf'];

  let sinResultados: string | undefined;

  /** Busca con la primera consulta que hoy no encuentre nada, y devuelve cuál fue. */
  async function buscarSinResultados(page: Page): Promise<string | undefined> {
    for (const consulta of sinResultados === undefined ? CANDIDATAS : [sinResultados]) {
      await buscar(page, consulta);
      if (await page.locator('[data-salida]').isVisible()) {
        sinResultados = consulta;
        return consulta;
      }
    }
    return undefined;
  }

  test('se ofrecen Temas y Autores destacados', async ({ page }) => {
    const consulta = await buscarSinResultados(page);
    test.skip(consulta === undefined, 'Ninguna consulta de prueba devuelve hoy cero resultados.');

    const salida = page.locator('[data-salida]');
    await expect(salida).toBeVisible();
    expect(await salida.locator('a[href^="/tema/"]').count()).toBeGreaterThan(0);
    expect(await salida.locator('a[href^="/autor/"]').count()).toBeGreaterThan(0);
  });

  test('el mensaje sugiere reformular con menos palabras', async ({ page }) => {
    const consulta = await buscarSinResultados(page);
    test.skip(consulta === undefined, 'Ninguna consulta de prueba devuelve hoy cero resultados.');
    await expect(page.locator('.sugerencia')).toContainText('Prueba con menos palabras');
  });

  test('no aparece ningún texto de error técnico', async ({ page }) => {
    const consulta = await buscarSinResultados(page);
    test.skip(consulta === undefined, 'Ninguna consulta de prueba devuelve hoy cero resultados.');
    /*
     * Igual que en `pagina-404.spec.ts`, y aquí el argumento es aún más claro: la prueba de
     * arriba **exige** que la salida ofrezca enlaces a Temas. Uno de ellos se llama desde la
     * 156.ª «El error». Se mira la prosa del mensaje, no el índice que la acompaña.
     */
    const texto = await page.locator('main').evaluate((main) => {
      const copia = main.cloneNode(true) as HTMLElement;
      copia.querySelectorAll('.chips').forEach((chips) => chips.remove());
      return copia.textContent ?? '';
    });
    expect(texto).not.toMatch(/error|excepci|failed|undefined|null|0 resultados/i);
  });

  test('no es un callejón sin salida: todas las salidas llevan a algún sitio', async ({
    page,
    request,
  }) => {
    const consulta = await buscarSinResultados(page);
    test.skip(consulta === undefined, 'Ninguna consulta de prueba devuelve hoy cero resultados.');
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
    // Se resuelve la consulta antes de instalar el espía, porque buscar la mueve de página.
    const consulta = await buscarSinResultados(page);
    test.skip(consulta === undefined, 'Ninguna consulta de prueba devuelve hoy cero resultados.');
    await page.goto('/buscar');
    // Se instala un espía en el hueco del módulo de medición, que es por donde pasa todo.
    await page.evaluate(() => {
      (window as unknown as { __emitidos: unknown[] }).__emitidos = [];
      (window as unknown as { __medir: unknown }).__medir = (evento: string, datos: string) => {
        (window as unknown as { __emitidos: unknown[] }).__emitidos.push({ evento, datos });
      };
    });

    await page.locator('[data-consulta]').fill(consulta!);
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
    expect(emitidos[0].datos).toBe(consulta);
  });

  test('con resultados no se muestra la salida', async ({ page }) => {
    await buscar(page, 'no hay camino');
    await expect(page.locator('[data-salida]')).toBeHidden();
  });
});
