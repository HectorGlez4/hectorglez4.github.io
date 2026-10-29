import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  ETIQUETAS_DE_RESULTADO,
  FILTROS_DE_CITA,
  OPCIONES_DE_PAGEFIND,
  ORDEN_DE_CITA,
} from '../../src/lib/tipoDeResultado.ts';
import { MARCA } from '../../src/lib/marca.ts';
import { ASENTAMIENTO_DE_BUSQUEDA, EVENTOS } from '../../src/lib/medicion.ts';
import { tramoDe } from '../../src/lib/vocabulario.ts';
import { recuentoDeCitas, temaEnFrase } from '../../src/lib/recuentos.ts';
import { RUTA_DEL_MAPA_DE_OBRAS } from '../../src/lib/busqueda.ts';
import { citaConLosDosBloques, temaBajoUmbral, textoDe } from './ayuda/corpus.ts';
import { citasPorObra, filtrosDeLaBusqueda, obrasDelAutor, type ConjuntoPublicable } from '../../src/lib/publicado.ts';
import { clavesDeOrden, ordenDeLaListaDeObras, porSlug as porSlugDeCita, rutaDeLaObra } from '../../src/lib/obras.ts';
import { CITAS_POR_PAGINA } from '../../src/lib/umbrales.ts';
import { conjuntoDeLosDatos, leerDatosDelCorpus } from '../../tools/lib/alcance.ts';
import { leerDocumentosDeFuente, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { posicionesDeCitas } from '../../tools/lib/posiciones.ts';
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
   * 26.2; antes `.de-obra`), el Autor debajo y el nombre accesible «Obra: {título}, {Autor}» —sin
   * «de» desde la 27.2, como el de la Cita—. Los demás, como estaban.
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
      expect(obra.nombre).toBe(`Obra: ${obra.titulo}, Antonio Machado`);
    }

    // Los de otro tipo, como hoy: sin la clase. Desde la 27.1 la Cita lleva también su Autor
    // debajo y su nombre accesible (lo mira la prueba de la 27.1); los demás, ni una cosa ni otra.
    const otros = page.locator('[data-resultados] .resultado:not(:has([data-tipo="obra"]))');
    expect(await otros.count()).toBeGreaterThan(0);
    expect(await otros.locator('.en-sans').count()).toBe(0);
    const niObraNiCita = page.locator(
      '[data-resultados] .resultado:not(:has([data-tipo="obra"])):not(:has([data-tipo="cita"]))',
    );
    expect(await niObraNiCita.locator('.r-autor').count()).toBe(0);
    expect(await niObraNiCita.locator('a[aria-label]').count()).toBe(0);
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
     * 156.ª «El error». Se mira la prosa del mensaje, no el índice que la acompaña: tampoco las
     * opciones de los selectores de la 27.2, que son los mismos Temas.
     */
    const texto = await page.locator('main').evaluate((main) => {
      const copia = main.cloneNode(true) as HTMLElement;
      copia.querySelectorAll('.chips, select').forEach((indice) => indice.remove());
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
    // Historia 27.2 — el recuento dice el total de Pagefind, no los pintados (que son 30 como mucho).
    const total = (await page.evaluate(async (opciones) => {
      const pf = await import('/pagefind/pagefind.js' as string);
      await pf.init();
      await pf.options(opciones);
      return (await pf.search('no hay camino')).results.length;
    }, OPCIONES_DE_PAGEFIND)) as number;
    expect(total).toBeGreaterThan(0);
    await expect(page.locator('[role="status"]')).toHaveText(total === 1 ? 'Un resultado.' : `${total} resultados.`);
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

/*
 * Historia 26.3, NFR-13 — el Directorio de Autores responde por su título, y el listado entero va
 * fuera del índice: el nombre de un Autor da su página, nunca el Directorio.
 */
test.describe('Historia 26.3 — el Directorio de Autores en la búsqueda', () => {
  /** Todas las direcciones del índice real para un término, con las opciones de la búsqueda propia. */
  async function direcciones(page: Page, termino: string): Promise<string[]> {
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

  test('buscar «autores» devuelve `/autores/`, rotulado «Directorio»', async ({ page }) => {
    await buscar(page, 'autores');
    const directorio = (await resultados(page)).find((r) => r.href.replace(/\/?$/, '/') === '/autores/');
    expect(directorio, '«autores» no devuelve el Directorio entre los resultados pintados').toBeDefined();
    expect(directorio!.tipo).toBe('directorio');
    expect(directorio!.etiqueta).toBe(ETIQUETAS_DE_RESULTADO.directorio);
    expect(directorio!.titulo).toBe('Autores');
  });

  test('el nombre de un Autor leído de `/autores/` da su Página de Autor, y no el Directorio', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/autores/');
    const fila = page.locator('main li.fila-de-bloque[data-zona="directorio"] a').first();
    const nombre = (await fila.locator('.nombre').textContent())!.trim();
    const pagina = (await fila.getAttribute('href'))!;
    expect(nombre).not.toBe('');

    await page.goto('/buscar/');
    const urls = await direcciones(page, nombre);
    expect(urls, nombre).toContain(pagina.replace(/\/?$/, '/'));
    expect(urls, nombre).not.toContain('/autores/');
  });
});


/*
 * Historia 26.4, NFR-13 — el Directorio de Obras responde por su título, como el de Autores, y su
 * listado va fuera del índice: el título de una Obra da su Página de Obra, nunca `/obras/`.
 */
test.describe('Historia 26.4 — el Directorio de Obras en la búsqueda', () => {
  /** Todas las direcciones del índice real para un término, con las opciones de la búsqueda propia. */
  async function direcciones(page: Page, termino: string): Promise<string[]> {
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

  test('buscar «obras» devuelve `/obras/`, rotulado «Directorio»', async ({ page }) => {
    await buscar(page, 'obras');
    const directorio = (await resultados(page)).find((r) => r.href.replace(/\/?$/, '/') === '/obras/');
    expect(directorio, '«obras» no devuelve el Directorio entre los resultados pintados').toBeDefined();
    expect(directorio!.tipo).toBe('directorio');
    expect(directorio!.etiqueta).toBe(ETIQUETAS_DE_RESULTADO.directorio);
    expect(directorio!.titulo).toBe('Obras');
  });

  test('el título de una Obra indexable leído de `/obras/` da su Página de Obra, y no el Directorio', async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.goto('/obras/');
    const filas = page.locator('main ul.lista-de-obras[data-zona="directorio"] a');
    const total = await filas.count();
    expect(total).toBeGreaterThan(0);

    // La primera fila cuya Página de Obra se indexa, leída de lo servido: ninguna lista fija.
    let elegida: { titulo: string; href: string } | undefined;
    for (let i = 0; i < total && elegida === undefined; i += 1) {
      const fila = filas.nth(i);
      const href = (await fila.getAttribute('href'))!;
      const html = await (await request.get(href)).text();
      if (/<meta name="robots" content="noindex/.test(html)) continue;
      elegida = { titulo: (await fila.locator('.titulo').evaluate((e) => e.firstChild?.textContent ?? '')).trim(), href };
    }
    expect(elegida, 'ninguna Obra de `/obras/` se indexa').toBeDefined();
    expect(elegida!.titulo).not.toBe('');

    await page.goto('/buscar/');
    const urls = await direcciones(page, elegida!.titulo);
    expect(urls, elegida!.titulo).toContain(elegida!.href.replace(/\/?$/, '/'));
    expect(urls, elegida!.titulo).not.toContain('/obras/');
  });
});

/*
 * Historia 27.1 (FR-7, AD-11, AD-25) — cada Página de Cita declara a Pagefind su Autor, su Obra y
 * sus Temas publicados, el metadato `autor` y su clave de orden; el resultado de Cita lleva su
 * Autor debajo. Lo esperado sale del Corpus en disco con los mismos dueños que el build
 * (`filtrosDeLaBusqueda`, `citasPorObra`), nunca de una lista escrita aquí.
 */
test.describe('Historia 27.1 — la Cita declara sus filtros y su resultado lleva su Autor', () => {
  const RAIZ_DEL_CORPUS = join(new URL('../..', import.meta.url).pathname, 'corpus');

  /** El Corpus en disco, leído una vez por proceso: el conjunto y el orden del libro. */
  let leido: Promise<{ conjunto: ConjuntoPublicable; porObra: Map<string, { slug: string }[]> }> | undefined;
  const corpus = () =>
    (leido ??= (async () => {
      const rutas = rutasDelCorpus(RAIZ_DEL_CORPUS);
      const datos = await leerDatosDelCorpus(rutas);
      const conjunto = conjuntoDeLosDatos(datos);
      const posiciones = posicionesDeCitas(datos.citas, await leerDocumentosDeFuente(rutas));
      return { conjunto, porObra: citasPorObra(conjunto.citas, posiciones) };
    })());

  const recuentos = (opciones: readonly { valor: string; recuento: number }[]) =>
    Object.fromEntries(opciones.map((o) => [o.valor, o.recuento]));

  /** Por slug, con el mismo dueño que la cola «sin documento» y el hueco «sin Obra» (`porSlug` de `obras.ts`). */
  const porSlug = (a: string, b: string) => porSlugDeCita({ slug: a }, { slug: b });

  // (a) Los recuentos de `filters()` del índice de verdad son los de `filtrosDeLaBusqueda`.
  test('los recuentos de `filters()` son los de `filtrosDeLaBusqueda`, valor a valor, también de las Obras con `noindex`', async ({ page }) => {
    test.setTimeout(120_000);
    const { conjunto } = await corpus();
    const esperado = filtrosDeLaBusqueda(conjunto);
    await page.goto('/buscar/');
    const filtros = (await page.evaluate(async () => {
      const pf = await import('/pagefind/pagefind.js' as string);
      await pf.init();
      return pf.filters();
    })) as Record<string, Record<string, number>>;

    expect(filtros[FILTROS_DE_CITA.autor]).toEqual(recuentos(esperado.autores));
    expect(filtros[FILTROS_DE_CITA.obra]).toEqual(recuentos(esperado.obras));
    expect(filtros[FILTROS_DE_CITA.tema]).toEqual(recuentos(esperado.temas));
    // No en vacío, y con las Obras que no se indexan dentro: el Corpus tiene Obras de una sola Cita.
    expect(esperado.autores.length).toBeGreaterThan(1);
    expect(esperado.obras.some((o) => o.recuento === 1)).toBe(true);
  });

  // (b) Filtrar por una Obra y ordenar por la clave da el orden de su Página de Obra.
  test('filtrar por una Obra y ordenar por la clave da sus Citas en el orden de su Página de Obra, que no es el de slug', async ({ page, request }) => {
    test.setTimeout(180_000);
    const { conjunto, porObra } = await corpus();
    const documentadas = new Set(conjunto.citas.filter((c) => c.fuente !== undefined).map((c) => c.slug));
    const candidata = [...porObra]
      .filter(
        ([, citas]) =>
          citas.length > CITAS_POR_PAGINA &&
          citas.some((c) => documentadas.has(c.slug)) &&
          citas.map((c) => c.slug).join() !== citas.map((c) => c.slug).sort(porSlug).join(),
      )
      .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
    expect(candidata, 'El Corpus no tiene ninguna Obra documentada de más de una página cuyo orden del libro no sea el de slug.').toBeDefined();
    const [nombre, citas] = candidata!;

    // Lo que sirve el sitio: las Páginas de Obra 1…n, en su orden.
    const paginas = Math.ceil(citas.length / CITAS_POR_PAGINA);
    const delHtml: string[] = [];
    for (let pagina = 1; pagina <= paginas; pagina++) {
      const html = await (await request.get(rutaDeLaObra({ nombre }, pagina))).text();
      const listado = /<ul class="(?:[^"]*\s)?listado(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/ul>/u.exec(html)?.[1] ?? '';
      expect(listado, `${rutaDeLaObra({ nombre }, pagina)}: sin listado`).not.toBe('');
      delHtml.push(...[...listado.matchAll(/href="(\/cita\/[^"]+)"/gu)].map((m) => m[1].replace(/\/?$/, '/')));
    }
    expect(delHtml).toEqual(citas.map((c) => `/cita/${c.slug}/`));

    const devueltas = (await (async () => {
      await page.goto('/buscar/');
      return page.evaluate(
        async ({ obra, clave, orden }) => {
          const pf = await import('/pagefind/pagefind.js' as string);
          await pf.init();
          const { results } = await pf.search(null, { filters: { [clave]: obra }, sort: { [orden]: 'asc' } });
          const datos = await Promise.all(results.map((r: { data: () => Promise<{ url: string }> }) => r.data()));
          return datos.map((d) => d.url);
        },
        { obra: nombre, clave: FILTROS_DE_CITA.obra, orden: ORDEN_DE_CITA },
      );
    })()) as string[];
    expect(devueltas.map((u) => u.replace(/\/?$/, '/'))).toEqual(delHtml);
    expect(delHtml).not.toEqual([...delHtml].sort(porSlug));
  });

  // (e) Filtrar por Autores y ordenar por la clave cruza los rangos: Directorio, lista de obras, «sin Obra».
  test('filtrar por dos Autores y ordenar por la clave da cada Autor entero, sus Obras en el orden de su lista y «sin Obra» al final', async ({ page }) => {
    test.setTimeout(180_000);
    const { conjunto, porObra } = await corpus();
    const claves = clavesDeOrden(conjunto.autores, conjunto.citas, porObra);
    const delAutor = (slug: string) => conjunto.citas.filter((c) => c.autor === slug);
    const obrasDe = (slug: string) => new Set(delAutor(slug).flatMap((c) => (c.obra ? [c.obra.nombre] : [])));

    // Un Autor con Citas sin Obra y con Obras —con más de una si lo hay—, el de menos Citas.
    const conHueco = [...new Set(conjunto.citas.filter((c) => c.obra === undefined).map((c) => c.autor))]
      .filter((slug) => obrasDe(slug).size > 0)
      .sort(
        (a, b) =>
          Number(obrasDe(b).size > 1) - Number(obrasDe(a).size > 1) ||
          delAutor(a).length - delAutor(b).length ||
          (a < b ? -1 : 1),
      )[0];
    expect(conHueco, 'El Corpus no tiene ningún Autor con Obras y con Citas sin Obra.').toBeDefined();
    // Y el último del Directorio —el de las claves más altas—, o el primero si el último es el mismo.
    const porClave = [...claves].sort((a, b) => Number(a[1]) - Number(b[1]));
    const autorDe = new Map(conjunto.citas.map((c) => [c.slug, c.autor]));
    const ultimo = autorDe.get(porClave[porClave.length - 1][0])!;
    const otro = ultimo !== conHueco ? ultimo : autorDe.get(porClave[0][0])!;
    expect(otro).not.toBe(conHueco);

    await page.goto('/buscar/');
    const devueltas = ((await page.evaluate(
      async ({ autores, clave, orden }) => {
        const pf = await import('/pagefind/pagefind.js' as string);
        await pf.init();
        const { results } = await pf.search(null, { filters: { [clave]: { any: autores } }, sort: { [orden]: 'asc' } });
        const datos = await Promise.all(results.map((r: { data: () => Promise<{ url: string }> }) => r.data()));
        return datos.map((d) => d.url);
      },
      { autores: [conHueco!, otro], clave: FILTROS_DE_CITA.autor, orden: ORDEN_DE_CITA },
    )) as string[]).map((u) => /^\/cita\/([^/]+)\/?$/u.exec(new URL(u, 'http://x').pathname)?.[1] ?? u);

    // Las de los dos, cada una una vez.
    expect([...devueltas].sort()).toEqual([...delAutor(conHueco!), ...delAutor(otro)].map((c) => c.slug).sort());
    // Cada Autor en un bloque, en el orden de sus claves de Directorio.
    const bloques = devueltas.map((slug) => autorDe.get(slug)!).filter((a, i, todos) => i === 0 || todos[i - 1] !== a);
    expect(bloques).toHaveLength(2);
    expect(bloques[1]).toBe(Number(claves.get(delAutor(otro)[0].slug)) > Number(claves.get(delAutor(conHueco!)[0].slug)) ? otro : conHueco);
    // Dentro del Autor con hueco: sus Obras en el orden de su lista, cada una en el del libro, y «sin Obra» detrás, por slug.
    const suyas = devueltas.filter((slug) => autorDe.get(slug) === conHueco);
    const obraDe = new Map(delAutor(conHueco!).map((c) => [c.slug, c.obra]));
    const obras = [...new Map(delAutor(conHueco!).flatMap((c) => (c.obra ? [[c.obra.nombre, c.obra] as const] : []))).values()];
    const esperadas = [
      ...ordenDeLaListaDeObras(obras).flatMap((o) => porObra.get(o.nombre)!.map((c) => c.slug)),
      ...delAutor(conHueco!).filter((c) => c.obra === undefined).map((c) => c.slug).sort(porSlug),
    ];
    expect(suyas).toEqual(esperadas);
    expect(obraDe.get(suyas[suyas.length - 1])).toBeUndefined();
  });

  /** Lo que pinta un resultado, con la familia del título y su nombre accesible. */
  async function pintados(page: Page) {
    return page.locator('[data-resultados] .resultado').evaluateAll((ns) =>
      ns.map((n) => ({
        tipo: n.querySelector('.clase')!.getAttribute('data-tipo')!,
        titulo: n.querySelector('.titulo')!.textContent!.trim(),
        familia: getComputedStyle(n.querySelector('.titulo')!).fontFamily,
        autor: n.querySelector('.r-autor')?.textContent?.trim(),
        estiloDelAutor: (() => {
          const linea = n.querySelector('.r-autor');
          if (linea === null) return undefined;
          const e = getComputedStyle(linea);
          return { familia: e.fontFamily, tamano: e.fontSize, peso: e.fontWeight, caja: e.textTransform, color: e.color };
        })(),
        href: n.querySelector('a')!.getAttribute('href')!,
        nombre: n.querySelector('a')!.getAttribute('aria-label'),
      })),
    );
  }

  /** Lo que los tokens dan computado en la página: la serif, y la línea de Autor `{typography.author}`/`{colors.on-surface-variant}`. */
  async function tokens(page: Page) {
    return page.evaluate(() => {
      const sonda = document.createElement('span');
      sonda.style.cssText =
        'font-family: var(--sans); font-size: var(--autor); font-weight: 600; text-transform: uppercase; color: var(--tinta-apagada)';
      const serif = document.createElement('span');
      serif.style.fontFamily = 'var(--serif)';
      document.body.append(sonda, serif);
      const e = getComputedStyle(sonda);
      const resultado = {
        serif: getComputedStyle(serif).fontFamily,
        autor: { familia: e.fontFamily, tamano: e.fontSize, peso: e.fontWeight, caja: e.textTransform, color: e.color },
      };
      sonda.remove();
      serif.remove();
      return resultado;
    });
  }

  // (c) Con el índice de verdad: un resultado de Cita lleva el nombre de su Autor debajo.
  test('un resultado de Cita lleva su Autor debajo, el título en la serif y el nombre «Cita: {título}, {Autor}»', async ({ page }) => {
    const { conjunto } = await corpus();
    const nombres = new Map(conjunto.autores.map((a) => [a.slug, a.nombre]));
    const autorDeCita = new Map(conjunto.citas.map((c) => [c.slug, c.autor]));
    // La consulta sale del Corpus: las cinco primeras palabras largas de una Cita con Obra, que
    // Pagefind devuelve casando todas; ninguna frase escrita aquí.
    const palabras = (texto: string) => texto.toLowerCase().match(/\p{L}{5,}/gu) ?? [];
    const elegida = [...conjunto.citas]
      .sort((a, b) => porSlug(a.slug, b.slug))
      .find((c) => c.obra !== undefined && palabras(c.texto).length >= 5);
    expect(elegida, 'El Corpus no tiene ninguna Cita con Obra y cinco palabras largas.').toBeDefined();
    const FRASE = palabras(elegida!.texto).slice(0, 5).join(' ');
    await buscar(page, FRASE);
    const esperado = await tokens(page);
    const slugDe = (href: string) => new URL(href, 'http://x').pathname.split('/')[2];
    const citas = (await pintados(page)).filter((r) => r.tipo === 'cita');
    expect(citas.length).toBeGreaterThan(0);
    for (const cita of citas) {
      const autor = nombres.get(autorDeCita.get(slugDe(cita.href))!);
      expect(autor, cita.href).toBeDefined();
      expect(cita.autor, cita.href).toBe(autor);
      // La línea de Autor con los tokens del de Obra, y el título en la serif: de los tokens, no de un nombre de fuente.
      expect(cita.estiloDelAutor, cita.href).toEqual(esperado.autor);
      expect(cita.familia, cita.href).toBe(esperado.serif);
      expect(cita.titulo, cita.href).toMatch(/^«.*»$/su);
      expect(cita.nombre, cita.href).toBe(`Cita: ${cita.titulo}, ${autor}`);
    }
    expect(citas.map((c) => slugDe(c.href)), FRASE).toContain(elegida!.slug);
    // La línea de Autor no ensancha la página: tampoco en el móvil, donde también corre.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Desde la 27.2, los dos selectores de Autor y de Tema, y ningún otro control de filtro: el de
    // Obra (27.3) solo existe con un Autor elegido.
    expect(await page.locator('fieldset select').count()).toBe(2);
    expect(await page.locator('#filtro-de-obra').count()).toBe(0);
    expect(await page.locator('input[type="checkbox"], input[type="radio"]').count()).toBe(0);
  });

  /*
   * El metadato `autor` va dentro de un `data-pagefind-ignore` (forma A): Pagefind lo recoge como
   * metadato y su texto no entra en el contenido de la página, así que el nombre no puntúa dos
   * veces. Lo que se compara es el contenido indexado contra el cuerpo de la página sin lo ignorado.
   */
  test('el nombre del metadato `autor` no entra en el contenido indexado de la Cita', async ({ page }) => {
    const { conjunto } = await corpus();
    const nombres = new Map(conjunto.autores.map((a) => [a.slug, a.nombre]));
    const deAutor = (slug: string) => conjunto.citas.filter((c) => c.autor === slug).length;
    // La del Autor con menos Citas: filtrar por él y pedir sus datos carga pocas páginas.
    const cita = conjunto.citas
      .filter((c) => c.obra !== undefined && (nombres.get(c.autor) ?? '').length > 3)
      .sort((a, b) => deAutor(a.autor) - deAutor(b.autor) || porSlug(a.slug, b.slug))[0];
    expect(cita, 'El Corpus no tiene ninguna Cita con Obra de un Autor con nombre').toBeDefined();
    const nombre = nombres.get(cita.autor)!;
    await page.goto('/buscar/');
    const indexado = (await page.evaluate(
      async ({ clave, autor, url }) => {
        const pf = await import('/pagefind/pagefind.js' as string);
        await pf.init();
        const { results } = await pf.search(null, { filters: { [clave]: autor } });
        const datos = await Promise.all(results.map((r: { data: () => Promise<{ url: string; content: string; meta: Record<string, string> }> }) => r.data()));
        return datos.find((d) => d.url.replace(/\/?$/, '/') === url);
      },
      { clave: FILTROS_DE_CITA.autor, autor: cita.autor, url: `/cita/${cita.slug}/` },
    )) as { content: string; meta: Record<string, string> } | undefined;
    expect(indexado, cita.slug).toBeDefined();
    expect(indexado!.meta.autor).toBe(nombre);

    await page.goto(`/cita/${cita.slug}/`);
    const enElCuerpo = await page.evaluate(() => {
      const cuerpo = document.querySelector('main[data-pagefind-body]')!.cloneNode(true) as HTMLElement;
      for (const fuera of cuerpo.querySelectorAll('[data-pagefind-ignore], script, style')) fuera.remove();
      return cuerpo.textContent ?? '';
    });
    const veces = (texto: string) => texto.split(nombre).length - 1;
    // No en vacío: el nombre está en el cuerpo —en la Atribución—, y por tanto en el contenido.
    expect(veces(enElCuerpo), cita.slug).toBeGreaterThan(0);
    expect(veces(indexado!.content), cita.slug).toBeGreaterThan(0);
    // Si el texto del metadato se indexara, el contenido traería el nombre una vez más que el cuerpo sin lo ignorado.
    expect(veces(indexado!.content), cita.slug).toBeLessThanOrEqual(veces(enElCuerpo));
  });

  // (d) Con un Pagefind de mentira: una Cita sin metadato de Autor —un índice viejo— no lo inventa.
  test('una Cita sin metadato de Autor no lleva línea ni nombre accesible; la Obra, sin «de» desde la 27.2', async ({ page }) => {
    await page.route('**/pagefind/pagefind.js', (ruta) =>
      ruta.fulfill({
        contentType: 'text/javascript',
        body: [
          'export async function options() {}',
          'export async function init() {}',
          'const D = [',
          "  { url: '/cita/vieja/', meta: { title: '«Una cita vieja»' }, filters: { tipo: ['cita'] } },",
          "  { url: '/cita/blanca/', meta: { title: '«Una cita en blanco»', autor: '  ' }, filters: { tipo: ['cita'] } },",
          "  { url: '/cita/nueva/', meta: { title: '«Una cita nueva»', autor: 'José Martí' }, filters: { tipo: ['cita'] } },",
          "  { url: '/obra/a/b/', meta: { title: 'Ismaelillo', autor: 'José Martí' }, filters: { tipo: ['obra'] } },",
          "  { url: '/rara/', meta: { title: 'Rara', autor: 'José Martí' }, filters: { tipo: ['desconocido'] } },",
          '];',
          'export async function search() { return { results: D.map((d) => ({ data: async () => d })) }; }',
        ].join('\n'),
      }),
    );
    await buscar(page, 'algo');
    const [vieja, blanca, nueva, obra, rara] = await pintados(page);
    for (const r of [vieja, blanca]) {
      expect(r.autor, r.href).toBeUndefined();
      expect(r.nombre, r.href).toBeNull();
    }
    expect(nueva.autor).toBe('José Martí');
    expect(nueva.nombre).toBe('Cita: «Una cita nueva», José Martí');
    expect(obra.autor).toBe('José Martí');
    expect(obra.nombre).toBe('Obra: Ismaelillo, José Martí');
    // Un tipo que no está en la tabla se rotula como Cita, pero no es una: sin línea de Autor.
    expect(rara.autor).toBeUndefined();
    expect(rara.nombre).toBeNull();
  });
});

/*
 * Historia 27.2 — la búsqueda se acota por Autor y por Tema, en el navegador y con el índice de
 * verdad. Lo que se elige sale del Corpus en disco por las mismas funciones del build
 * (`filtrosDeLaBusqueda`); ninguna cifra ni ningún nombre escritos aquí.
 */
test.describe('Historia 27.2 — la búsqueda se acota por Autor y por Tema', () => {
  const RAIZ_DEL_CORPUS = join(new URL('../..', import.meta.url).pathname, 'corpus');
  let leido: Promise<ConjuntoPublicable> | undefined;
  const conjunto = () =>
    (leido ??= (async () => conjuntoDeLosDatos(await leerDatosDelCorpus(rutasDelCorpus(RAIZ_DEL_CORPUS))))());

  const AUTOR = '#filtro-de-autor';
  const TEMA = '#filtro-de-tema';
  const QUITAR = '[data-quitar]';
  const slugDe = (href: string) => new URL(href, 'http://x').pathname.split('/')[2];

  /** El Autor con más Citas (desempate por slug): pasa de la tanda de 30. */
  async function elAutorMayor() {
    const { autores } = filtrosDeLaBusqueda(await conjunto());
    return [...autores].sort((a, b) => b.recuento - a.recuento || (a.valor < b.valor ? -1 : 1))[0];
  }

  test('el selector de Autor, sin texto, da sus Citas —solo Citas— y el recuento «N citas de {Autor}.»', async ({ page }) => {
    test.setTimeout(60_000);
    const autor = await elAutorMayor();
    expect(autor.recuento).toBeGreaterThan(30);
    const autorDe = new Map((await conjunto()).citas.map((c) => [c.slug, c.autor]));
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor.valor);
    await expect(page.locator('[data-estado]')).toHaveText(`${autor.recuento} citas de ${autor.rotulo}.`, { timeout: 10_000 });
    const pintados = await resultados(page);
    expect(pintados).toHaveLength(30);
    for (const r of pintados) {
      expect(r.tipo, r.href).toBe('cita');
      expect(autorDe.get(slugDe(r.href)), r.href).toBe(autor.valor);
    }
    await expect(page.locator(QUITAR)).toBeVisible();
  });

  test('Autor y Tema: su cruce, con «N citas de {Autor} sobre {tema}.»', async ({ page }) => {
    test.setTimeout(60_000);
    const filtros = filtrosDeLaBusqueda(await conjunto());
    // El par con más Citas que quepan en una tanda, para comparar el conjunto entero.
    const cruces = new Map<string, string[]>();
    for (const [slug, deCita] of filtros.porCita) {
      for (const tema of deCita.temas) {
        const clave = `${deCita.autor}|${tema}`;
        cruces.set(clave, [...(cruces.get(clave) ?? []), slug]);
      }
    }
    const [clave, slugs] = [...cruces.entries()]
      .filter(([, s]) => s.length >= 2 && s.length <= 30)
      .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
    const [autor, tema] = clave.split('|');
    const rotulo = (opciones: readonly { valor: string; rotulo: string }[], valor: string) => opciones.find((o) => o.valor === valor)!.rotulo;
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor);
    await page.locator(TEMA).selectOption(tema);
    await expect(page.locator('[data-estado]')).toHaveText(
      `${slugs.length} citas de ${rotulo(filtros.autores, autor)} sobre ${temaEnFrase(rotulo(filtros.temas, tema))}.`,
      { timeout: 10_000 },
    );
    expect((await resultados(page)).map((r) => slugDe(r.href)).sort()).toEqual([...slugs].sort());
  });

  test('Tema y texto: el recuento nombra el Tema y el texto, y solo salen Citas de ese Tema', async ({ page }) => {
    test.setTimeout(60_000);
    const filtros = filtrosDeLaBusqueda(await conjunto());
    const tema = [...filtros.temas].sort((a, b) => b.recuento - a.recuento || (a.valor < b.valor ? -1 : 1))[0];
    await buscar(page, 'vida');
    await page.locator(TEMA).selectOption(tema.valor);
    await expect(page.locator('[data-estado]')).toHaveText(
      new RegExp(`^(?:\\d+ citas|Una cita) sobre ${temaEnFrase(tema.rotulo)} con «vida»\\.$`, 'u'),
      { timeout: 10_000 },
    );
    const pintados = await resultados(page);
    expect(pintados.length).toBeGreaterThan(0);
    for (const r of pintados) {
      expect(r.tipo, r.href).toBe('cita');
      expect(filtros.porCita.get(slugDe(r.href))?.temas, r.href).toContain(tema.valor);
    }
  });

  test('«Quitar los filtros»: los selectores a «Todos…», el botón fuera, el foco al campo y el texto conservado', async ({ page }) => {
    const autor = await elAutorMayor();
    await buscar(page, 'vida');
    await expect(page.locator(QUITAR)).toBeHidden();
    await page.locator(AUTOR).selectOption(autor.valor);
    await expect(page.locator('[data-estado]')).toHaveText(/ de /u, { timeout: 10_000 });
    await page.locator(QUITAR).click();
    await expect(page.locator(QUITAR)).toBeHidden();
    await expect(page.locator('[data-consulta]')).toBeFocused();
    await expect(page.locator('[data-consulta]')).toHaveValue('vida');
    await expect(page.locator(AUTOR)).toHaveValue('');
    await expect(page.locator(TEMA)).toHaveValue('');
    await expect(page.locator('[data-estado]')).toHaveText(/^(?:Un resultado|\d+ resultados)\.$/u, { timeout: 10_000 });
  });

  test('una ráfaga de cambios del selector de Autor —las flechas sobre el selector cerrado— lanza una sola búsqueda', async ({ page }) => {
    // Un Pagefind de prueba que cuenta sus búsquedas: lo que se ejecuta es el guion de la página.
    await page.route('**/pagefind/pagefind.js', (ruta) =>
      ruta.fulfill({
        contentType: 'text/javascript',
        body: [
          'export async function options() {}',
          'export async function init() {}',
          'export async function search(q, o) {',
          '  (globalThis.__busquedas ??= []).push(o?.filters?.autor ?? null);',
          "  return { results: [{ data: async () => ({ url: '/cita/una/', meta: { title: 'Una', autor: 'Nadie' }, filters: { tipo: ['cita'] } }) }] };",
          '}',
        ].join('\n'),
      }),
    );
    await page.goto('/buscar/');
    /*
     * Cinco cambios en menos de la pausa, como los que da recorrer con las flechas un selector
     * cerrado (`input` y `change` por opción). Se despachan en la página y no con el teclado: cómo
     * responde a las flechas un selector nativo depende del sistema —en unos cambia el valor, en
     * otros abre la lista—, y lo que se mide es la pausa de la isla, no eso.
     */
    const elegido = await page.locator(AUTOR).evaluate(async (selector: HTMLSelectElement) => {
      for (let i = 1; i <= 5; i++) {
        selector.selectedIndex = i;
        selector.dispatchEvent(new Event('input', { bubbles: true }));
        selector.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));
      }
      return selector.value;
    });
    expect(elegido).not.toBe('');
    await expect(page.locator('[data-estado]')).toHaveText(/^Una cita de /u, { timeout: 10_000 });
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (globalThis as { __busquedas?: unknown[] }).__busquedas)).toEqual([elegido]);
  });

  test('la tabulación sigue el orden del documento: campo, Autor, Tema, «Quitar los filtros» y los resultados', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'El orden de tabulación se mira en Chromium.');
    const autor = await elAutorMayor();
    // Historia 27.3 — si el Autor tiene Obras, su selector va entre el de Autor y el de Tema.
    const conObras = autor.valor in filtrosDeLaBusqueda(await conjunto()).mapaDeObras;
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor.valor);
    await expect(page.locator('[data-estado]')).toHaveText(/ de /u, { timeout: 10_000 });
    if (conObras) await expect(page.locator('#filtro-de-obra')).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-consulta]').focus();
    for (const siguiente of [AUTOR, ...(conObras ? ['#filtro-de-obra'] : []), TEMA, QUITAR, '[data-resultados] .resultado a >> nth=0']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(siguiente)).toBeFocused();
    }
  });

  test('Pagefind no se descarga al cargar, y sí al elegir un filtro sin tocar el campo', async ({ page }) => {
    const descargados: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') descargados.push(r.url());
    });
    await page.goto('/buscar/', { waitUntil: 'networkidle' });
    expect(descargados.filter((u) => u.includes('pagefind'))).toHaveLength(0);
    const temas = filtrosDeLaBusqueda(await conjunto()).temas;
    const respuesta = page.waitForResponse((r) => r.url().includes('/pagefind/pagefind.js'), { timeout: 10_000 });
    await page.locator(TEMA).selectOption(temas[0].valor);
    await respuesta;
    await expect(page.locator('[data-consulta]')).not.toBeFocused();
  });

  test('el ejemplo del campo es «no hay camino», y da resultados', async ({ page }) => {
    await page.goto('/buscar/');
    await expect(page.locator('[data-consulta]')).toHaveAttribute('placeholder', 'Por ejemplo: no hay camino');
    await expect(page.locator('label[for="consulta"]')).toHaveText('Escribe un fragmento, un autor o un tema.');
    await buscar(page, 'no hay camino');
    expect((await resultados(page)).length).toBeGreaterThan(0);
  });

  test('lo pintado sale de los tokens: campo, fieldset, selectores, «Quitar los filtros» y recuento', async ({ page }) => {
    test.setTimeout(60_000);
    const autor = await elAutorMayor();
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor.valor);
    await expect(page.locator('[data-estado]')).toHaveText(`${autor.recuento} citas de ${autor.rotulo}.`, { timeout: 10_000 });
    const { medido, esperado } = await page.evaluate(() => {
      /** Lo que da el navegador a una caja de prueba con esos estilos: los tokens, resueltos. */
      const resolver = (estilos: Record<string, string>) => {
        const prueba = document.createElement('div');
        for (const [propiedad, valor] of Object.entries(estilos)) prueba.style.setProperty(propiedad, valor);
        document.body.append(prueba);
        const calculado = getComputedStyle(prueba);
        const fuera = Object.fromEntries(Object.keys(estilos).map((p) => [p, calculado.getPropertyValue(p)]));
        prueba.remove();
        return fuera;
      };
      const de = (selector: string, propiedades: string[]) => {
        const calculado = getComputedStyle(document.querySelector(selector)!);
        return Object.fromEntries(propiedades.map((p) => [p, calculado.getPropertyValue(p)]));
      };
      const t = resolver({
        'font-family': 'var(--sans)',
        'font-size': 'var(--cuerpo-lg)',
        'margin-top': 'calc(var(--unidad) * 3)',
        'margin-bottom': 'calc(var(--unidad) * 2)',
        'border-top-style': 'solid',
        'border-top-width': 'var(--grosor-filete)',
        'border-top-color': 'var(--contorno)',
        'border-top-left-radius': 'var(--radio)',
        'background-color': 'var(--papel)',
        color: 'var(--siena)',
        'outline-color': 'var(--tinta-apagada)',
        'line-height': 'var(--pie)',
      });
      const fieldset = document.querySelector('fieldset')!.getBoundingClientRect();
      const quitar = document.querySelector('[data-quitar]')!.getBoundingClientRect();
      const estado = document.querySelector('[data-estado]')!.getBoundingClientRect();
      const lista = document.querySelector('[data-resultados]')!.getBoundingClientRect();
      return {
        medido: {
          campo: de('[data-consulta]', ['font-family', 'font-size']),
          fieldset: de('fieldset', ['border-top-width', 'padding-top', 'padding-left', 'margin-top']),
          entreSelectores: de('.selector + .selector', ['margin-top'])['margin-top'],
          select: de('#filtro-de-autor', ['border-top-width', 'border-top-color', 'border-top-left-radius', 'background-color', 'font-family']),
          quitar: { ...de('[data-quitar]', ['color', 'border-top-color', 'margin-top']), aSuAncho: quitar.width < fieldset.width },
          estado: { ...de('[data-estado]', ['font-size', 'color', 'margin-top']), encimaDeLaLista: estado.bottom <= lista.top },
        },
        esperado: {
          campo: { 'font-family': t['font-family'], 'font-size': t['font-size'] },
          fieldset: { 'border-top-width': '0px', 'padding-top': '0px', 'padding-left': '0px', 'margin-top': t['margin-top'] },
          entreSelectores: t['margin-bottom'],
          select: {
            'border-top-width': t['border-top-width'],
            'border-top-color': t['border-top-color'],
            'border-top-left-radius': t['border-top-left-radius'],
            'background-color': t['background-color'],
            'font-family': t['font-family'],
          },
          quitar: { color: t.color, 'border-top-color': t.color, 'margin-top': t['margin-bottom'], aSuAncho: true },
          estado: { 'font-size': t['line-height'], color: t['outline-color'], 'margin-top': t['margin-top'], encimaDeLaLista: true },
        },
      };
    });
    // `line-height` y `outline-color` solo sirven de vehículo para resolver `--pie` y `--tinta-apagada`.
    expect(medido).toEqual(esperado);

    // La región se recorta a la fila de la sombra: una frase de antes más larga que la nueva —la que
    // dice durante la pausa del tecleo— no se pinta sobre el primer resultado.
    const recorte = await page.evaluate(() => {
      const estado = document.querySelector<HTMLElement>('[data-estado]')!;
      document.querySelector('.sombra')!.textContent = 'Corta.';
      estado.textContent = 'Una frase de antes mucho más larga que la nueva. '.repeat(12);
      return {
        abajo: estado.getBoundingClientRect().bottom,
        fila: estado.parentElement!.getBoundingClientRect().bottom,
        primero: document.querySelector('[data-resultados] li')!.getBoundingClientRect().top,
      };
    });
    expect(recorte.abajo).toBeLessThanOrEqual(recorte.fila + 0.5);
    expect(recorte.abajo).toBeLessThanOrEqual(recorte.primero);
  });

  test('a 360 px los selectores caben a todo el ancho y a la zona de toque, sin desplazamiento lateral', async ({ page }) => {
    test.skip(page.viewportSize()?.width !== 360, 'Se mide en el proyecto móvil, a 360 px.');
    const autor = await elAutorMayor();
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor.valor);
    await expect(page.locator(QUITAR)).toBeVisible({ timeout: 10_000 });
    const medidas = await page.evaluate(() => {
      const fieldset = document.querySelector('fieldset')!;
      const selects = [...fieldset.querySelectorAll('select')];
      const campo = document.querySelector('[data-consulta]')!;
      return {
        fieldset: fieldset.getBoundingClientRect().height,
        anchoDelCampo: campo.getBoundingClientRect().width,
        selects: selects.map((s) => ({
          ancho: s.getBoundingClientRect().width,
          alto: s.getBoundingClientRect().height,
          cuerpo: getComputedStyle(s).fontSize,
        })),
        quitar: document.querySelector('[data-quitar]')!.getBoundingClientRect().height,
        desborda: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    // Historia 27.2 — lo que ocupan los dos selectores a 360 px, con el valor a 17 px.
    test.info().annotations.push({ type: 'alto del fieldset a 360 px', description: `${medidas.fieldset} px` });
    console.log(`Historia 27.2 — fieldset a 360 px: ${medidas.fieldset} px de alto (${JSON.stringify(medidas)})`);
    expect(medidas.desborda).toBe(false);
    for (const select of medidas.selects) {
      expect(select.cuerpo).toBe('17px');
      expect(select.alto).toBeGreaterThanOrEqual(44);
      expect(Math.abs(select.ancho - medidas.anchoDelCampo)).toBeLessThanOrEqual(1);
    }
    expect(medidas.quitar).toBeGreaterThanOrEqual(44);
  });
});

/*
 * Historia 27.3 (FR-7, AD-11, UX-DR87) — la búsqueda se acota también por una Obra del Autor
 * elegido. Lo esperado sale del Corpus en disco con los dueños del build: el mapa y los recuentos
 * de `filtrosDeLaBusqueda`, el orden de la Lista de Obras de `obrasDelAutor`, y el orden de las
 * Citas de una Obra de su propia Página de Obra, la superficie que la búsqueda tiene que repetir.
 */
test.describe('Historia 27.3 — la búsqueda se acota también por una Obra del Autor elegido', () => {
  const RAIZ_DEL_CORPUS = join(new URL('../..', import.meta.url).pathname, 'corpus');
  let leido: Promise<ConjuntoPublicable> | undefined;
  const conjunto = () =>
    (leido ??= (async () => conjuntoDeLosDatos(await leerDatosDelCorpus(rutasDelCorpus(RAIZ_DEL_CORPUS))))());

  const AUTOR = '#filtro-de-autor';
  const OBRA = '#filtro-de-obra';
  const TEMA = '#filtro-de-tema';
  const QUITAR = '[data-quitar]';
  const slugDe = (href: string) => new URL(href, 'http://x').pathname.split('/')[2];
  const porValor = (a: { valor: string }, b: { valor: string }) => (a.valor < b.valor ? -1 : a.valor > b.valor ? 1 : 0);

  /** El Autor con más Obras (desempate por slug), sus opciones esperadas y su nombre. */
  async function elAutorConMasObras() {
    const filtros = filtrosDeLaBusqueda(await conjunto());
    const [slug, obras] = Object.entries(filtros.mapaDeObras).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
    const recuento = new Map(filtros.obras.map((o) => [o.valor, o.recuento]));
    return {
      slug,
      nombre: filtros.autores.find((a) => a.valor === slug)!.rotulo,
      obras: obras.map(([valor, titulo]) => ({ valor, titulo, recuento: recuento.get(valor)! })),
    };
  }

  /** Las opciones del selector de Obra como se ven: valor y texto. */
  const opcionesDeObra = (page: Page) =>
    page.locator(`${OBRA} option`).evaluateAll((os) => os.map((o) => ({ valor: (o as HTMLOptionElement).value, rotulo: o.textContent })));

  test('sin Autor no hay selector de Obra ni se pide el mapa: al cargar, al enfocar, al teclear ni con un Tema', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('request', (r) => pedidos.push(new URL(r.url()).pathname));
    await page.goto('/buscar/?q=vida', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-estado]')).not.toBeEmpty({ timeout: 10_000 });
    await page.locator('[data-consulta]').focus();
    await page.locator('[data-consulta]').fill('camino');
    await page.locator('[data-consulta]').fill('vida');
    // El Tema con más Citas: con «vida» da resultados, y el recuento lo nombra.
    const tema = [...filtrosDeLaBusqueda(await conjunto()).temas].sort((a, b) => b.recuento - a.recuento || porValor(a, b))[0];
    await page.locator(TEMA).selectOption(tema.valor);
    await expect(page.locator('[data-estado]')).toHaveText(/ sobre /u, { timeout: 10_000 });
    await page.waitForTimeout(500);
    expect(await page.locator(OBRA).count()).toBe(0);
    expect(pedidos).not.toContain(RUTA_DEL_MAPA_DE_OBRAS);
    // El HTML no trae ni el mapa ni ninguna opción de Obra.
    const html = await (await page.request.get('/buscar/')).text();
    const { obras } = await elAutorConMasObras();
    for (const obra of obras) expect(html, obra.valor).not.toContain(obra.valor);
  });

  test('al elegir un Autor, «Obra» aparece entre Autor y Tema con sus Obras en el orden de su lista y su recuento, sin mover el foco', async ({ page }) => {
    test.setTimeout(60_000);
    const autor = await elAutorConMasObras();
    expect(autor.obras.length).toBeGreaterThan(1);
    // El orden del mapa es el de `obrasDelAutor`: el de su Página de Autor.
    expect(autor.obras.map((o) => o.valor)).toEqual(obrasDelAutor((await conjunto()).citas, autor.slug).obras.map((o) => o.nombre));
    const mapa = page.waitForResponse((r) => new URL(r.url()).pathname === RUTA_DEL_MAPA_DE_OBRAS, { timeout: 10_000 });
    await page.goto('/buscar/');
    await page.locator(AUTOR).focus();
    await page.locator(AUTOR).selectOption(autor.slug);
    expect((await mapa).headers()['content-type']).toMatch(/^application\/json/u);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(AUTOR)).toBeFocused();
    expect(await page.locator('fieldset select').evaluateAll((ss) => ss.map((s) => s.id))).toEqual([
      'filtro-de-autor',
      'filtro-de-obra',
      'filtro-de-tema',
    ]);
    await expect(page.locator(`label[for="filtro-de-obra"]`)).toHaveText('Obra');
    expect(await opcionesDeObra(page)).toEqual([
      { valor: '', rotulo: 'Todas sus obras' },
      ...autor.obras.map((o) => ({ valor: o.valor, rotulo: `${o.titulo} (${recuentoDeCitas(o.recuento)})` })),
    ]);
  });

  test('elegir una Obra da «N citas de {Autor} en {título}.» y solo sus Citas, en el orden de su Página de Obra', async ({ page }) => {
    test.setTimeout(60_000);
    const filtros = filtrosDeLaBusqueda(await conjunto());
    // La Obra con más Citas que quepan en una tanda (y en la página 1 de su Página de Obra).
    const obra = [...filtros.obras]
      .filter((o) => o.recuento >= 2 && o.recuento <= Math.min(30, CITAS_POR_PAGINA))
      .sort((a, b) => b.recuento - a.recuento || porValor(a, b))[0];
    const titulo = Object.values(filtros.mapaDeObras)
      .flat()
      .find(([valor]) => valor === obra.valor)![1];
    const nombre = filtros.autores.find((a) => a.valor === obra.autor)!.rotulo;
    const pagina = await (await page.request.get(rutaDeLaObra({ nombre: obra.valor }))).text();
    const delLibro = [...new Set([...pagina.matchAll(/href="\/cita\/([^"/#?]+)\/?"/gu)].map((m) => decodeURIComponent(m[1])))];
    expect(delLibro).toHaveLength(obra.recuento);

    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(obra.autor);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    await page.locator(OBRA).selectOption(obra.valor);
    await expect(page.locator('[data-estado]')).toHaveText(`${obra.recuento} citas de ${nombre} en ${titulo}.`, { timeout: 10_000 });
    const pintados = await resultados(page);
    expect(pintados.every((r) => r.tipo === 'cita')).toBe(true);
    expect(pintados.map((r) => slugDe(r.href))).toEqual(delLibro);
  });

  test('cambiar el Autor rehace el selector con las suyas; quitarlo, o «Quitar los filtros», lo quita', async ({ page }) => {
    test.setTimeout(60_000);
    const filtros = filtrosDeLaBusqueda(await conjunto());
    const [primero, segundo] = Object.keys(filtros.mapaDeObras).sort();
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(primero);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    await page.locator(OBRA).selectOption(filtros.mapaDeObras[primero][0][0]);
    await expect(page.locator('[data-estado]')).toHaveText(/ en /u, { timeout: 10_000 });
    // Otro Autor: la Obra fuera al momento, y de vuelta con las del nuevo.
    await page.locator(AUTOR).selectOption(segundo);
    expect(await page.locator(OBRA).count()).toBe(0);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    expect((await opcionesDeObra(page)).slice(1).map((o) => o.valor)).toEqual(filtros.mapaDeObras[segundo].map(([valor]) => valor));
    await expect(page.locator(OBRA)).toHaveValue('');
    // Sin Autor, sin Obra.
    await page.locator(AUTOR).selectOption('');
    await expect(page.locator(OBRA)).toHaveCount(0);
    // «Quitar los filtros» también la quita.
    await page.locator(AUTOR).selectOption(primero);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    await page.locator(QUITAR).click();
    await expect(page.locator(OBRA)).toHaveCount(0);
    await expect(page.locator('[data-consulta]')).toBeFocused();
  });

  test('un Autor sin Obras no tiene selector de Obra', async ({ page }) => {
    const filtros = filtrosDeLaBusqueda(await conjunto());
    const sinObras = filtros.autores.filter((a) => !(a.valor in filtros.mapaDeObras)).sort(porValor)[0];
    test.skip(sinObras === undefined, 'El Corpus no tiene hoy ningún Autor sin Obras: lo cubre el entorno simulado de medicion.test.ts.');
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(sinObras!.valor);
    await expect(page.locator('[data-estado]')).toContainText(` de ${sinObras!.rotulo}.`, { timeout: 10_000 });
    await page.waitForTimeout(1_000);
    await expect(page.locator(OBRA)).toHaveCount(0);
  });

  test('la tabulación con Obra: campo, Autor, Obra, Tema, «Quitar los filtros» y los resultados', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'El orden de tabulación se mira en Chromium.');
    const autor = await elAutorConMasObras();
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor.slug);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    await page.locator(OBRA).selectOption(autor.obras[0].valor);
    await expect(page.locator('[data-estado]')).toHaveText(/ en /u, { timeout: 10_000 });
    await page.locator('[data-consulta]').focus();
    for (const siguiente of [AUTOR, OBRA, TEMA, QUITAR, '[data-resultados] .resultado a >> nth=0']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(siguiente)).toBeFocused();
    }
  });

  test('a 360 px: los tres selectores y «Quitar los filtros», a todo el ancho y sin desplazamiento lateral; se anota su alto', async ({ page }) => {
    test.skip(page.viewportSize()?.width !== 360, 'Se mide en el proyecto móvil, a 360 px.');
    const autor = await elAutorConMasObras();
    await page.goto('/buscar/');
    await page.locator(AUTOR).selectOption(autor.slug);
    await expect(page.locator(OBRA)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(QUITAR)).toBeVisible();
    const medidas = await page.evaluate(() => {
      const fieldset = document.querySelector('fieldset')!;
      const campo = document.querySelector('[data-consulta]')!;
      return {
        fieldset: fieldset.getBoundingClientRect().height,
        anchoDelCampo: campo.getBoundingClientRect().width,
        selects: [...fieldset.querySelectorAll('select')].map((s) => ({
          ancho: s.getBoundingClientRect().width,
          alto: s.getBoundingClientRect().height,
        })),
        quitar: document.querySelector('[data-quitar]')!.getBoundingClientRect().height,
        desborda: document.documentElement.scrollWidth > window.innerWidth,
        // Lo visible del formulario: las opciones de un selector cerrado no se pintan.
        nowrap: [...fieldset.querySelectorAll('*')].filter((e) => {
          const r = e.getBoundingClientRect();
          if (r.width <= 1 || r.height <= 1 || e.closest('.solo-para-lectores')) return false;
          return getComputedStyle(e).whiteSpace.includes('nowrap');
        }).length,
      };
    });
    // UX-DR87 estimó unos 252 px para los tres selectores y «Quitar los filtros».
    test.info().annotations.push({ type: 'alto del fieldset con tres selectores a 360 px', description: `${medidas.fieldset} px` });
    console.log(`Historia 27.3 — fieldset con tres selectores a 360 px: ${medidas.fieldset} px de alto (${JSON.stringify(medidas)})`);
    expect(medidas.selects).toHaveLength(3);
    expect(medidas.desborda).toBe(false);
    expect(medidas.nowrap).toBe(0);
    for (const select of medidas.selects) {
      expect(select.alto).toBeGreaterThanOrEqual(44);
      expect(Math.abs(select.ancho - medidas.anchoDelCampo)).toBeLessThanOrEqual(1);
    }
    expect(medidas.quitar).toBeGreaterThanOrEqual(44);
  });
});
