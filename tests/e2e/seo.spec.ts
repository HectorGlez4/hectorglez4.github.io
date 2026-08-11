import { expect, test } from '@playwright/test';

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
    // Un Tema bajo umbral y las páginas 2+ de un listado, que son `noindex`.
    expect(rutas).not.toContain('/tema/la-amistad');
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
    expect(datos.isPartOf.name).toBe('Don Quijote de la Mancha');
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
    const objetivo = new Set(await rutasDelSitemap(request));
    const MAXIMO_DE_SALTOS = 3;

    const visitadas = new Set<string>();
    let frontera = ['/'];

    for (let salto = 0; salto <= MAXIMO_DE_SALTOS && frontera.length > 0; salto += 1) {
      const siguiente: string[] = [];

      for (const ruta of frontera) {
        if (visitadas.has(ruta)) continue;
        visitadas.add(ruta);

        await page.goto(ruta);
        const enlaces = await page.evaluate(() =>
          [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')!),
        );
        for (const enlace of enlaces) {
          if (!visitadas.has(enlace)) siguiente.push(enlace);
        }
      }

      frontera = [...new Set(siguiente)];
    }

    const inalcanzables = [...objetivo].filter((r) => !visitadas.has(r));
    expect(inalcanzables, `no se alcanzan en ${MAXIMO_DE_SALTOS} saltos`).toEqual([]);
  });
});
