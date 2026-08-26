import { expect, test, type Page } from '@playwright/test';
import { superficiesInalcanzables } from '../../src/lib/publicado.ts';
import { MAX_SALTOS_DESDE_LA_PORTADA } from '../../src/lib/umbrales.ts';
import { procedenciaDe, temaBajoUmbral } from './ayuda/corpus.ts';

/** Historia 2.7 — fundamentos de SEO. */

async function rutasDelSitemap(request: import('@playwright/test').APIRequestContext) {
  const xml = await (await request.get('/sitemap-0.xml')).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

test.describe('Historia 2.7 — sitemap', () => {
  test('contiene todas las Páginas de Cita, Autor y Tema publicadas', async ({ request }) => {
    const rutas = await rutasDelSitemap(request);

    expect(rutas).toContain('/');
    expect(rutas.filter((r) => r.startsWith('/cita/')).length).toBeGreaterThan(30);
    expect(rutas).toContain('/autor/antonio-machado');
    expect(rutas).toContain('/tema/la-vida');
  });

  test('todo lo que anuncia existe de verdad', async ({ request }) => {
    for (const ruta of await rutasDelSitemap(request)) {
      expect((await request.get(ruta, { maxRedirects: 0 })).status(), ruta).toBe(200);
    }
  });

  test('no contiene nada no publicado', async ({ request }) => {
    const rutas = await rutasDelSitemap(request);
    /*
     * Dos cosas que no deben estar. La segunda —las páginas 2+ de un listado, que son
     * `noindex`— vale siempre. La primera necesita que exista un Tema bajo umbral, y hoy no
     * existe: se deriva en vez de fijarse, y si no hay ninguno, no se afirma nada sobre él.
     */
    const bajoUmbral = temaBajoUmbral();
    if (bajoUmbral !== undefined) expect(rutas).not.toContain(`/tema/${bajoUmbral}`);
    expect(rutas.filter((r) => /\/(autor|tema)\/[^/]+\/\d+$/.test(r))).toEqual([]);
  });

  test('nada de lo que anuncia se declara no indexable', async ({ request }) => {
    // La contradicción que hay que evitar: pedir que se indexe una página marcada
    // `noindex`. Basta con una para que el sitemap deje de ser fiable.
    for (const ruta of await rutasDelSitemap(request)) {
      const html = await (await request.get(ruta)).text();
      expect(html, ruta).not.toMatch(/name="robots"[^>]*noindex/);
    }
  });
});

test.describe('Historia 2.7 — cabecera de cada página', () => {
  test('cada página declara su propia canónica', async ({ request }) => {
    for (const ruta of await rutasDelSitemap(request)) {
      const html = await (await request.get(ruta)).text();
      const canonica = /<link rel="canonical" href="([^"]+)"/.exec(html);
      expect(canonica, `${ruta} no declara canónica`).not.toBeNull();
      expect(new URL(canonica![1]).pathname, ruta).toBe(ruta);
    }
  });

  test('el idioma es `es`, sin variante regional', async ({ request }) => {
    for (const ruta of await rutasDelSitemap(request)) {
      const html = await (await request.get(ruta)).text();
      // Astro añade su atributo de ámbito al `<html>`, así que no se ancla al `>`.
      expect(html, ruta).toMatch(/<html lang="es"[\s>]/);
      // Y sin variante regional: ni `es-ES` ni `es-MX`. El sitio es panhispánico.
      expect(html, ruta).not.toMatch(/<html lang="es-/);
    }
  });
});

test.describe('Historia 2.7 — datos estructurados', () => {
  test('la Página de Cita expone la cita y su autor', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los');

    const datos = JSON.parse(
      await page.locator('script[type="application/ld+json"]').innerText(),
    );

    expect(datos['@type']).toBe('Quotation');
    expect(datos.text).toContain('La libertad, Sancho');
    expect(datos.creator['@type']).toBe('Person');
    expect(datos.creator.name).toBe('Miguel de Cervantes');
    // Del Corpus y no fijado: la obra la declara la Fuente, y este título cambió al resembrar.
    expect(datos.isPartOf.name).toBe(
      procedenciaDe('miguel-de-cervantes-la-libertad-sancho-es-uno-de-los').obra,
    );
    expect(datos.inLanguage).toBe('es');
  });

  test('no se declara una obra que no consta', async ({ page }) => {
    await page.goto('/cita/concepcion-arenal-odia-el-delito-y-compadece-al-delincuente');
    const datos = JSON.parse(
      await page.locator('script[type="application/ld+json"]').innerText(),
    );
    // Sin obra documentada: `isPartOf` no debe existir, ni siquiera vacío.
    expect(datos.isPartOf).toBeUndefined();
    expect(datos.creator.name).toBe('Concepción Arenal');
  });

  test('los datos estructurados no son JavaScript ejecutable', async ({ page }) => {
    const scripts: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los', {
      waitUntil: 'networkidle',
    });
    expect(scripts).toHaveLength(0);
  });
});

test.describe('Historia 2.7 — nada huérfano', () => {
  test('toda página publicada se alcanza desde la portada en pocos saltos', async ({
    page,
    request,
  }) => {
    /*
     * Historia 12.1 — quién decide si algo es huérfano no vive aquí.
     *
     * Esta prueba tenía su propio recorrido a lo ancho y su propio literal de saltos. El
     * criterio —publicable y alcanzable son el mismo conjunto— es de `publicado.ts`, el
     * dueño del conjunto publicable (AD-11), y el tope tiene nombre en `umbrales.ts`
     * (AD-9). Aquí queda lo único que solo se puede hacer con un navegador delante:
     * recorrer el sitio de verdad y anotar de dónde sale cada enlace.
     */
    /*
     * Ésta es una **prueba de barrido**: recorre el Corpus entero, no una página.
     *
     * El presupuesto por defecto de Playwright son 30 s y vale para las pruebas que miran una
     * cosa. Éstas crecen con el Corpus, y la cuenta lo dice sin lugar a dudas: el recorrido de
     * NFR-5 tardaba 11,2 s con 1230 páginas y **20,5 s con 1466**; la de Tarjetas baja una imagen
     * por Cita publicada, y son más de mil trescientas.
     *
     * Las dos se pararon por tiempo —la 94.ª, la 114.ª y la 117.ª— y las dos se paralelizaron ya.
     * Seguir exprimiendo el paralelismo sería el tercer parche al mismo problema: **lo que hay no
     * es una prueba lenta, son dos clases de prueba con costes distintos**, y eso se declara.
     *
     * `test.slow()` triplica el presupuesto de ésta y solo de ésta. No toca ningún umbral del
     * producto —`MAX_SALTOS_DESDE_LA_PORTADA` sigue en 3— ni cambia lo que se comprueba: cambia
     * cuánto se le deja tardar a una prueba que mira mil cosas en vez de una. Se revierte
     * borrando la línea.
     */
    test.slow();

    const publicadas = await rutasDelSitemap(request);
    const enlaces = new Map<string, string[]>();

    /*
     * El recorrido va por tandas y no de una en una — 93.ª sesión.
     *
     * Medido: con 1230 páginas esta prueba tardaba **22 s de los 30** que tiene, y en la tanda
     * completa, compitiendo por el servidor, se pasaba y moría por tiempo. No fallaba la
     * aserción: **no llegaba a evaluarla**, que es la peor forma de rojo porque no dice nada.
     *
     * La causa es propia y de la sesión anterior: al enseñar el paginador los números de página,
     * la frontera de cada salto creció de golpe. Y el coste sube con el Corpus, así que subir el
     * tiempo máximo solo compraría unas cuantas sesiones.
     *
     * Lo que **no** se hace es cambiar el navegador por peticiones sueltas: el comentario de
     * arriba dice por qué está aquí y no en una prueba de unidad —recorrer el sitio de verdad—,
     * y eso se respeta. Lo que cambia es solo cuántas páginas se miran a la vez. La aserción, el
     * tope de saltos y lo que se cuenta como enlace son exactamente los de antes.
     *
     * Las pestañas se abren **una vez y se reparten el trabajo**, y eso tampoco es un detalle:
     * el primer intento abría y cerraba una pestaña por página y salió a **27,6 s**, peor que
     * los 22 s de ir de una en una. El coste que manda aquí no es esperar al servidor —que es lo
     * que yo había supuesto— sino construir el contexto de cada pestaña. Medir lo dijo; suponer,
     * no.
     */
    const A_LA_VEZ = 6;
    const contexto = page.context();
    const pestañas = [page, ...(await Promise.all(
      Array.from({ length: A_LA_VEZ - 1 }, () => contexto.newPage()),
    ))];

    const salientesDe = async (pestaña: Page, ruta: string) => {
      await pestaña.goto(ruta);
      return pestaña.evaluate(() =>
        [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')!),
      );
    };

    let frontera = ['/'];
    for (let salto = 0; salto <= MAX_SALTOS_DESDE_LA_PORTADA && frontera.length > 0; salto += 1) {
      const pendientes = frontera.filter((ruta) => !enlaces.has(ruta));
      const siguiente: string[] = [];

      for (let desde = 0; desde < pendientes.length; desde += A_LA_VEZ) {
        const tanda = pendientes.slice(desde, desde + A_LA_VEZ);
        const salientesDeLaTanda = await Promise.all(
          tanda.map((ruta, i) => salientesDe(pestañas[i], ruta)),
        );

        tanda.forEach((ruta, i) => enlaces.set(ruta, salientesDeLaTanda[i]));
        siguiente.push(...salientesDeLaTanda.flat());
      }

      frontera = [...new Set(siguiente)].filter((enlace) => !enlaces.has(enlace));
    }

    await Promise.all(pestañas.slice(1).map((p) => p.close()));

    const inalcanzables = superficiesInalcanzables(publicadas, enlaces);
    expect(inalcanzables, `no se alcanzan en ${MAX_SALTOS_DESDE_LA_PORTADA} saltos`).toEqual([]);
  });
});
