import { expect, test, type Page } from '@playwright/test';
import { ETIQUETAS_DE_RESULTADO, OPCIONES_DE_PAGEFIND } from '../../src/lib/tipoDeResultado.ts';
import { MARCA } from '../../src/lib/marca.ts';
import { ASENTAMIENTO_DE_BUSQUEDA, EVENTOS } from '../../src/lib/medicion.ts';
import { tramoDe } from '../../src/lib/vocabulario.ts';
import { citaConLosDosBloques, temaBajoUmbral, textoDe } from './ayuda/corpus.ts';
import { emitidos as emitidosEn, espiarMedicion } from './ayuda/espia.ts';

/** Historias 3.1 y 3.2 — búsqueda y resultado vacío. */

/** Escribe la consulta y espera a que la lista se estabilice. */
async function buscar(page: import('@playwright/test').Page, consulta: string) {
  await page.goto('/buscar/');
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

/*
 * Historia 24.6, NFR-13 — el pie de la Página de Cita va bajo `data-pagefind-ignore="all"`: el
 * texto de una Cita del pie encuentra su propia página, nunca las que la ofrecen al pie.
 */
test.describe('Historia 24.6 — el pie no entra en la búsqueda', () => {
  /** Minúsculas y sin acentos, como compara el buscador. */
  const plano = (texto: string) =>
    texto
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
  const palabras = (texto: string) =>
    plano(texto)
      .replace(/[«»"“”.,;:¡!¿?()]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  /** Si el texto de una Cita trae todas las palabras de la consulta (también como parte de otra). */
  const traeTodas = (texto: string, consulta: string) => palabras(consulta).every((p) => plano(texto).includes(p));

  test('el fragmento de una tarjeta del pie no devuelve ninguna página que la ofrezca al pie', async ({ page, request }) => {
    const slug = citaConLosDosBloques();
    expect(slug, 'El Corpus no tiene ninguna Cita con los dos bloques del pie.').toBeDefined();
    const ruta = `/cita/${slug}/`;
    await page.goto(ruta);
    const hrefs = await page
      .locator('nav.salidas .de-la-misma-obra li.tarjeta a, nav.salidas .mas-del-autor li.tarjeta a')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    // Una tarjeta cuyas primeras palabras no estén también en la Cita que se lee: si lo están, la
    // página que la ofrece saldría por su propio texto, que es lo correcto, y la prueba no diría nada.
    const elegida = hrefs
      .map((href) => {
        const otra = href.split('/')[2];
        return { href, consulta: palabras(textoDe(otra)).slice(0, 6).join(' ') };
      })
      .find(({ consulta }) => !traeTodas(textoDe(slug!), consulta));
    expect(elegida, `${ruta}: ninguna tarjeta del pie se distingue por sus primeras palabras`).toBeDefined();
    const { href, consulta } = elegida!;
    await buscar(page, consulta);
    const citas = (await resultados(page)).filter((r) => r.tipo === 'cita').map((r) => r.href.replace(/\/?$/, '/'));
    expect(citas, consulta).toContain(href);
    expect(citas, consulta).not.toContain(ruta);
    // Y ninguna otra: toda página de los resultados que ofrece la tarjeta al pie tiene que haber
    // salido por su propio texto.
    for (const resultado of citas.filter((c) => c !== href)) {
      const html = await (await request.get(resultado)).text();
      const pie = /<nav class="salidas"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
      if (!pie.includes(`href="${href}"`)) continue;
      expect(traeTodas(textoDe(resultado.split('/')[2]), consulta), `${resultado} sale por el pie con «${consulta}»`).toBe(true);
    }
  });
});

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

  /*
   * Historia 22.7 — el resultado de Obra: rótulo «Obra», título en la sans (`.en-sans` desde la
   * 26.2; antes `.de-obra`), el Autor debajo y el nombre accesible «Obra: {título}, de {Autor}».
   * Los demás, como estaban.
   */
  test('un resultado de Obra lleva el título en la sans y el Autor debajo', async ({ page }) => {
    await buscar(page, 'proverbios y cantares');
    const obras = await page
      .locator('[data-resultados] .resultado')
      .evaluateAll((ns) =>
        ns
          .filter((n) => n.querySelector('.clase')!.getAttribute('data-tipo') === 'obra')
          .map((n) => {
            const titulo = n.querySelector('.titulo')!;
            return {
              etiqueta: n.querySelector('.clase')!.textContent!.trim(),
              deObra: titulo.classList.contains('en-sans'),
              familia: getComputedStyle(titulo).fontFamily,
              titulo: titulo.textContent!.trim(),
              autor: n.querySelector('.r-autor')?.textContent?.trim(),
              nombre: n.querySelector('a')!.getAttribute('aria-label'),
            };
          }),
      );
    expect(obras.length).toBeGreaterThan(0);
    for (const obra of obras) {
      expect(obra.etiqueta).toBe(ETIQUETAS_DE_RESULTADO.obra);
      expect(obra.deObra).toBe(true);
      expect(obra.familia).not.toMatch(/Georgia|Source Serif/);
      expect(obra.autor).toBe('Antonio Machado');
      expect(obra.nombre).toBe(`Obra: ${obra.titulo}, de Antonio Machado`);
    }

    // Los de otro tipo, como hoy: sin la clase, sin línea de Autor, sin nombre accesible propio.
    const otros = page.locator('[data-resultados] .resultado:not(:has([data-tipo="obra"]))');
    expect(await otros.count()).toBeGreaterThan(0);
    expect(await otros.locator('.en-sans, .r-autor').count()).toBe(0);
    expect(await otros.locator('a[aria-label]').count()).toBe(0);
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

    await page.goto('/buscar/');
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

  test('se emite el evento de búsqueda sin resultados al asentarse, con la consulta y sin visitante', async ({
    page,
  }) => {
    // Se resuelve la consulta antes de instalar el espía, porque buscar la mueve de página.
    const consulta = await buscarSinResultados(page);
    test.skip(consulta === undefined, 'Ninguna consulta de prueba devuelve hoy cero resultados.');
    // Se instala un espía en el hueco del módulo de medición, que es por donde pasa todo.
    await espiarMedicion(page);
    await page.goto('/buscar/');

    await page.locator('[data-consulta]').fill(consulta!);
    await page.waitForFunction(
      () => !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
      undefined,
      { timeout: 10_000 },
    );

    // Historia 23.8 — teclear no emite: la búsqueda cuenta cuando se asienta.
    await page.waitForTimeout(300);
    expect(await emitidosEn(page)).toEqual([]);

    await page.locator('[data-consulta]').press('Enter');
    await expect.poll(async () => (await emitidosEn(page)).length).toBe(2);
    const emitidos = await emitidosEn(page);
    expect(emitidos[0]).toEqual({ evento: EVENTOS.busqueda, datos: tramoDe(0), destino: ASENTAMIENTO_DE_BUSQUEDA.sinFiltros });
    expect(emitidos[1].evento).toBe(EVENTOS.busquedaSinResultados);
    expect(emitidos[1].datos).toBe(consulta);
  });

  test('con resultados no se muestra la salida', async ({ page }) => {
    await buscar(page, 'no hay camino');
    await expect(page.locator('[data-salida]')).toBeHidden();
  });
});

test.describe('Historia 22.10 — el recuento y la búsqueda sin resultados se anuncian', () => {
  test('la región role="status" está desde la carga, vacía y no oculta', async ({ page }) => {
    await page.goto('/buscar/');
    const region = page.locator('[role="status"]');
    await expect(region).toHaveCount(1);
    await expect(region).toHaveText('');
    await expect(region).not.toHaveAttribute('hidden', /.*/);
    expect(await region.evaluate((n) => getComputedStyle(n).display)).not.toBe('none');
  });

  test('con resultados anuncia el recuento', async ({ page }) => {
    await buscar(page, 'no hay camino');
    const cuantos = await page.locator('[data-resultados] .resultado').count();
    await expect(page.locator('[role="status"]')).toHaveText(
      cuantos === 1 ? 'Un resultado.' : `${cuantos} resultados.`,
    );
  });

  test('sin resultados anuncia la frase de la salida, sin pintarla dos veces', async ({ page }) => {
    /*
     * Pagefind contesta a casi cualquier consulta con lo que más se le parece, así que el
     * caso vacío no se puede pedir al índice real: se sirve un Pagefind que no encuentra nada.
     * Lo que se ejecuta es el guion de la página, no un doble suyo.
     */
    await page.route('**/pagefind/pagefind.js', (ruta) =>
      ruta.fulfill({
        contentType: 'text/javascript',
        body: 'export async function options() {}\nexport async function init() {}\nexport async function search() { return { results: [] }; }',
      }),
    );
    await buscar(page, 'consulta que no está');

    const region = page.locator('[role="status"]');
    await expect(region).toHaveText('No encontramos esa frase. Prueba con menos palabras.');
    await expect(page.locator('.sugerencia')).toBeVisible();
    // La región se aparta de la vista: la frase ya se ve en la salida.
    expect(await region.evaluate((n) => n.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  });

  test('tras una búsqueda vacía, la siguiente con resultados vuelve a enseñar el recuento', async ({
    page,
  }) => {
    // Un Pagefind de prueba: nada para «nada», un resultado para lo demás.
    await page.route('**/pagefind/pagefind.js', (ruta) =>
      ruta.fulfill({
        contentType: 'text/javascript',
        body: [
          'export async function options() {}',
          'export async function init() {}',
          'export async function search(q) {',
          "  if (q === 'nada') return { results: [] };",
          "  return { results: [{ data: async () => ({ url: '/cita/una/', meta: { title: 'Una' } }) }] };",
          '}',
        ].join('\n'),
      }),
    );
    await buscar(page, 'nada');
    const estado = page.locator('[data-estado]');
    await expect(estado).toHaveText('No encontramos esa frase. Prueba con menos palabras.');

    await page.locator('[data-consulta]').fill('algo');
    await expect(estado).toHaveText('Un resultado.');
    await expect(estado).toBeVisible();
    await expect(estado).not.toHaveClass(/solo-para-lectores/);
    expect(await estado.evaluate((n) => n.getBoundingClientRect().width)).toBeGreaterThan(1);
  });
});

/*
 * Historia 26.2 (AD-17, AD-19) — el tipo de un resultado no casa como texto, y la portada tiene el
 * suyo. Hasta la 26.2 el tipo viajaba en `data-pagefind-meta="tipo:…"`, y desde Pagefind 1.5 la
 * metadata se busca: «cita» daba 4.559 resultados y 215 de los 400 primeros de «obra» no tenían la
 * palabra. Ahora viaja como filtro, y la portada solo indexa su `h1`.
 */
test.describe('Historia 26.2 — el tipo no casa como texto y la portada tiene el suyo', () => {
  /*
   * (a) Con el Pagefind real, importado en la página y con las opciones de la búsqueda propia, en
   * el orden en que las aplica la isla (`init()` al cargar, `options()` antes de cada búsqueda). Un
   * resultado que casa solo por metadato trae `locations` vacío: ninguno puede salir así.
   * «coleccion», sin tilde, es el valor literal que llevaba el metadato de antes.
   */
  const TERMINOS = ['obra', 'cita', 'autor', 'tema', 'colección', 'coleccion', 'directorio', 'portada', MARCA];

  test('buscar el nombre de un tipo, o el del sitio, no devuelve ninguna página solo por su tipo', async ({ page }) => {
    test.setTimeout(600_000);
    await page.goto('/buscar/');
    const porTermino = await page.evaluate(
      async ({ terminos, opciones }) => {
        const pf = await import('/pagefind/pagefind.js' as string);
        await pf.init();
        const salida: Record<string, { total: number; sinCoincidencia: string[] }> = {};
        for (const termino of terminos) {
          await pf.options(opciones);
          const { results } = await pf.search(termino);
          const sinCoincidencia: string[] = [];
          // Todos sus datos, por tandas: «cita» llegó a dar miles.
          for (let i = 0; i < results.length; i += 200) {
            const datos = await Promise.all(results.slice(i, i + 200).map((r: { data: () => Promise<unknown> }) => r.data()));
            for (const dato of datos as { url: string; locations: number[] }[]) {
              if (dato.locations.length === 0) sinCoincidencia.push(dato.url);
            }
          }
          salida[termino] = { total: results.length, sinCoincidencia };
        }
        return salida;
      },
      { terminos: TERMINOS, opciones: OPCIONES_DE_PAGEFIND },
    );
    // Todos los términos a la vez: el parte nombra cada uno que falla, no solo el primero.
    const fallos = TERMINOS.flatMap((termino) => {
      const { total, sinCoincidencia } = porTermino[termino];
      return sinCoincidencia.length === 0
        ? []
        : [`«${termino}»: ${sinCoincidencia.length} de ${total} sin el término (${sinCoincidencia.slice(0, 3).join(', ')}…)`];
    });
    expect(fallos).toEqual([]);
    // Y no en vacío: un índice roto, o uno que no devuelve nada, pasaría lo de arriba sin mirar.
    // Estas palabras salen en el contenido de muchas páginas, y la marca en el `h1` de la portada.
    // «directorio» y «portada» pueden no salir en ningún contenido todavía (los Directorios son de
    // la 26.3), y por eso no se les exige resultado: su prueba es que ninguno salga por su tipo.
    const vacios = ['obra', 'cita', 'autor', 'tema', 'colección', MARCA].filter((termino) => porTermino[termino].total === 0);
    expect(vacios, 'términos sin ningún resultado').toEqual([]);
  });

  /** Lo que pinta un resultado del tipo dado, con su presentación calculada. */
  async function pintadosDe(page: Page) {
    return page.locator('[data-resultados] .resultado').evaluateAll((ns) =>
      ns.map((n) => {
        const titulo = n.querySelector('.titulo')!;
        const estilo = getComputedStyle(titulo);
        return {
          tipo: n.querySelector('.clase')!.getAttribute('data-tipo')!,
          rotulo: n.querySelector('.clase')!.textContent!.trim(),
          titulo: titulo.textContent!.trim(),
          enSans: titulo.classList.contains('en-sans'),
          familia: estilo.fontFamily,
          peso: estilo.fontWeight,
          cuerpo: estilo.fontSize,
          autor: n.querySelector('.r-autor')?.textContent?.trim(),
          href: n.querySelector('a')!.getAttribute('href')!,
          nombre: n.querySelector('a')!.getAttribute('aria-label'),
        };
      }),
    );
  }

  // (b) Con el índice de verdad: la portada responde por su nombre, rotulada «Portada».
  test('buscar el nombre del sitio da la portada, rotulada «Portada» y con el título en Inter', async ({ page }) => {
    await buscar(page, MARCA);
    const portada = (await pintadosDe(page)).find((r) => r.href === '/');
    expect(portada, `«${MARCA}» no devuelve la portada`).toBeDefined();
    expect(portada!.tipo).toBe('portada');
    expect(portada!.rotulo).toBe(ETIQUETAS_DE_RESULTADO.portada);
    expect(portada!.titulo).toBe(MARCA);
    expect(portada!.enSans).toBe(true);
    expect(portada!.familia).toMatch(/Inter/);
    expect(portada!.familia).not.toMatch(/Georgia|Source Serif/);
    expect(portada!.peso).toBe('400');
    expect(portada!.nombre).toBe(`Portada: ${MARCA}`);
    expect(portada!.autor).toBeUndefined();
  });

  /**
   * Todas las direcciones que da el índice real para un término, con las opciones de la búsqueda
   * propia: no solo las 30 que pinta `/buscar/`, porque una portada en el puesto 31 seguiría
   * respondiendo por lo que no es suyo, y una página destino por debajo de la 30 no es un fallo.
   */
  async function todasLasDirecciones(page: Page, termino: string): Promise<string[]> {
    return page.evaluate(
      async ({ termino, opciones }) => {
        const pf = await import('/pagefind/pagefind.js' as string);
        await pf.init();
        await pf.options(opciones);
        const { results } = await pf.search(termino);
        const urls: string[] = [];
        for (let i = 0; i < results.length; i += 200) {
          const datos = await Promise.all(results.slice(i, i + 200).map((r: { data: () => Promise<unknown> }) => r.data()));
          for (const dato of datos as { url: string }[]) urls.push(dato.url.replace(/\/?$/, '/'));
        }
        return urls;
      },
      { termino, opciones: OPCIONES_DE_PAGEFIND },
    );
  }

  // (c) Lo que la portada enseña ya tiene su página en el índice: la portada no sale por ello.
  test('el texto de la Cita del Día y el nombre de un Autor de la portada dan su página, no la portada', async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('/');
    // El Corpus publicado trae Citas aptas para portada, así que la Cita del Día está: si faltara,
    // la mitad de esta prueba no miraría nada, y eso se dice en vez de saltarlo.
    const delDia = page.locator('section.del-dia');
    await expect(delDia, 'la portada no pinta la Cita del Día').toHaveCount(1);
    const texto = (await delDia.locator('.texto').first().textContent())!.replace(/[«»]/g, '').trim();
    // Cinco palabras, o el texto entero si es más corto: se mira la lista entera del índice, así
    // que un arranque común («No hay nada que…») no deja el destino fuera por su puesto.
    const fragmento = texto.split(/\s+/).slice(0, 5).join(' ');
    const destino = (await delDia.getByRole('link', { name: 'Ver esta cita' }).getAttribute('href'))!;

    const autor = page.locator('ul.autores a').first();
    const nombre = (await autor.textContent())!.trim();
    const pagina = (await autor.getAttribute('href'))!;

    const deLaCita = await todasLasDirecciones(page, fragmento);
    expect(deLaCita, fragmento).toContain(destino.replace(/\/?$/, '/'));
    expect(deLaCita, fragmento).not.toContain('/');
    const delAutor = await todasLasDirecciones(page, nombre);
    expect(delAutor, nombre).toContain(pagina.replace(/\/?$/, '/'));
    expect(delAutor, nombre).not.toContain('/');
  });

  // (d) Con un Pagefind de mentira: cómo se pintan los tipos nuevos frente a una Cita.
  test('un resultado de Directorio o de Portada lleva su rótulo, el título en Inter 400 con el cuerpo de una Cita y su nombre accesible', async ({ page }) => {
    await page.route('**/pagefind/pagefind.js', (ruta) =>
      ruta.fulfill({
        contentType: 'text/javascript',
        body: [
          'export async function options() {}',
          'export async function init() {}',
          'const D = [',
          "  { url: '/cita/una/', meta: { title: 'Una cita' }, filters: { tipo: ['cita'] } },",
          "  { url: '/autores/', meta: { title: 'Autores' }, filters: { tipo: ['directorio'] } },",
          `  { url: '/', meta: { title: ${JSON.stringify(MARCA)} }, filters: { tipo: ['portada'] } },`,
          "  { url: '/rara/', meta: { title: 'Rara' }, filters: { tipo: ['desconocido'] } },",
          '];',
          'export async function search() { return { results: D.map((d) => ({ data: async () => d })) }; }',
        ].join('\n'),
      }),
    );
    await buscar(page, 'algo');
    const [cita, directorio, portada, rara] = await pintadosDe(page);

    expect(directorio.rotulo).toBe(ETIQUETAS_DE_RESULTADO.directorio);
    expect(directorio.nombre).toBe('Directorio: Autores');
    expect(portada.rotulo).toBe(ETIQUETAS_DE_RESULTADO.portada);
    expect(portada.nombre).toBe(`Portada: ${MARCA}`);
    for (const r of [directorio, portada]) {
      expect(r.enSans, r.href).toBe(true);
      expect(r.familia, r.href).toMatch(/Inter/);
      expect(r.peso, r.href).toBe('400');
      expect(r.cuerpo, r.href).toBe(cita.cuerpo);
      expect(r.autor, r.href).toBeUndefined();
    }

    expect(cita.rotulo).toBe(ETIQUETAS_DE_RESULTADO.cita);
    expect(cita.enSans).toBe(false);
    expect(cita.familia).not.toMatch(/^Inter/);
    expect(cita.nombre).toBeNull();
    expect(rara.tipo).toBe('desconocido');
    expect(rara.rotulo).toBe(ETIQUETAS_DE_RESULTADO.cita);
    expect(rara.enSans).toBe(false);
    expect(rara.nombre).toBeNull();
  });
});
