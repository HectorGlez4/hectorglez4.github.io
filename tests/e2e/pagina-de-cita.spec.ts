import { expect, test } from '@playwright/test';

/**
 * Historia 2.1 — Página de Cita.
 *
 * Se prueba contra el sitio construido, no contra `astro dev`: lo que debe cumplir los
 * criterios es el artefacto que se despliega.
 */

/** Una Cita corta: cae en el tramo xl. 23 caracteres. */
const CORTA = '/cita/antonio-machado-hoy-es-siempre-todavia';
/** Una Cita de 90 caracteres: tramo lg. */
const MEDIA = '/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los';
/** Procedencia con obra pero sin año — parcial. */
const PARCIAL = '/cita/antonio-machado-todo-necio-confunde-valor-y-precio';
/** Procedencia con referencia y sin obra. */
const SIN_OBRA = '/cita/concepcion-arenal-odia-el-delito-y-compadece-al-delincuente';

test.describe('Historia 2.1 — la Cita y su atribución', () => {
  test('el texto de la Cita es el primer elemento visible sin desplazar', async ({ page }, info) => {
    test.skip(info.project.name !== 'movil', 'El criterio se enuncia sobre 360×640.');

    await page.goto(CORTA);
    const cita = page.locator('blockquote .texto');
    await expect(cita).toBeVisible();

    const caja = await cita.boundingBox();
    expect(caja).not.toBeNull();
    // Enteramente dentro de la primera pantalla de 640px, sin desplazar.
    expect(caja!.y).toBeGreaterThan(0);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(640);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('la Cita se compone con comillas angulares', async ({ page }) => {
    await page.goto(CORTA);
    const texto = await page.locator('blockquote .texto').innerText();
    expect(texto.startsWith('«')).toBe(true);
    expect(texto.endsWith('»')).toBe(true);
  });

  test('el nombre del Autor está enlazado a su página', async ({ page }) => {
    await page.goto(CORTA);
    const enlace = page.locator('figcaption a').first();
    await expect(enlace).toHaveText('Antonio Machado');
    await expect(enlace).toHaveAttribute('href', '/autor/antonio-machado');
  });

  test('se muestran la obra y el año cuando la Cita tiene procedencia', async ({ page }) => {
    await page.goto(MEDIA);
    await expect(page.locator('.procedencia')).toContainText('Don Quijote de la Mancha');
    await expect(page.locator('.procedencia')).toContainText('1615');
  });

  test('la ausencia de obra se declara y el bloque no se omite', async ({ page }) => {
    await page.goto(SIN_OBRA);
    const procedencia = page.locator('.procedencia');
    await expect(procedencia).toBeVisible();
    await expect(procedencia).toContainText('Sin obra documentada');
  });

  test('la ausencia de año se declara sin inventarlo', async ({ page }) => {
    await page.goto(PARCIAL);
    const procedencia = page.locator('.procedencia');
    await expect(procedencia).toContainText('Proverbios y cantares');
    await expect(procedencia).toContainText('Sin año documentado');
    // No hay ningún año inferido en la línea.
    expect(await procedencia.innerText()).not.toMatch(/\b1[5-9]\d{2}\b/);
  });
});

test.describe('Historia 2.1 — tramos tipográficos', () => {
  test('una Cita corta usa un tamaño mayor que una larga', async ({ page }) => {
    const tamaño = async (ruta: string) => {
      await page.goto(ruta);
      return page
        .locator('blockquote .texto')
        .evaluate((n) => Number.parseFloat(getComputedStyle(n).fontSize));
    };

    const corta = await tamaño(CORTA);
    const media = await tamaño(MEDIA);
    expect(corta).toBeGreaterThan(media);
  });

  test('el tramo se anuncia en el marcado', async ({ page }) => {
    await page.goto(CORTA);
    await expect(page.locator('blockquote')).toHaveAttribute('data-tramo', 'xl');
    await page.goto(MEDIA);
    await expect(page.locator('blockquote')).toHaveAttribute('data-tramo', 'lg');
  });

  test('el suelo de 23px no se cruza en ningún viewport', async ({ page }) => {
    for (const ruta of [CORTA, MEDIA, PARCIAL, SIN_OBRA]) {
      await page.goto(ruta);
      const px = await page
        .locator('blockquote .texto')
        .evaluate((n) => Number.parseFloat(getComputedStyle(n).fontSize));
      expect(px, `${ruta} baja del suelo legible`).toBeGreaterThanOrEqual(23);
    }
  });

  test('en móvil el tramo baja un escalón respecto a escritorio', async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'La comparación se hace una sola vez.');

    await page.goto(CORTA);
    const enEscritorio = await page
      .locator('blockquote .texto')
      .evaluate((n) => Number.parseFloat(getComputedStyle(n).fontSize));

    await page.setViewportSize({ width: 360, height: 640 });
    const enMovil = await page
      .locator('blockquote .texto')
      .evaluate((n) => Number.parseFloat(getComputedStyle(n).fontSize));

    expect(enEscritorio).toBe(44);
    expect(enMovil).toBe(36);
  });
});

test.describe('Historia 2.1 — cero JavaScript y HTML inicial', () => {
  test('la página no descarga ningún fichero de script', async ({ page }) => {
    /*
     * El criterio de la 2.1 dice «la página no envía JavaScript» y la 2.2 añade el botón
     * de copiar, que necesita algo. AD-6 resuelve la tensión: existen tres islas, cada
     * una hidratada bajo demanda. Lo que se exige, entonces, es que no se descargue
     * ningún script y que el contenido no dependa de que se ejecute nada —las dos cosas
     * que sostienen NFR-2 y NFR-7—, no que el HTML tenga cero bytes de JavaScript.
     */
    const scripts: string[] = [];
    page.on('response', (r) => {
      if (r.request().resourceType() === 'script') scripts.push(r.url());
    });

    await page.goto(CORTA, { waitUntil: 'networkidle' });
    expect(scripts, `la página descargó ${scripts.join(', ')}`).toHaveLength(0);

    // Y lo que hay en línea es la isla, no un armazón: se mide para que no crezca sin
    // que nadie lo note.
    const bytes = await page.evaluate(() =>
      [...document.querySelectorAll('script')].reduce((n, s) => n + s.textContent!.length, 0),
    );
    expect(bytes).toBeLessThan(2048);
  });

  test('el contenido no depende de que se ejecute JavaScript', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const pagina = await contexto.newPage();
    await pagina.goto(`http://localhost:4321${MEDIA}`);

    await expect(pagina.locator('h1')).toContainText('La libertad, Sancho');
    await expect(pagina.locator('.autor')).toContainText('Miguel de Cervantes');
    await expect(pagina.locator('.procedencia')).toContainText('Don Quijote');
    await contexto.close();
  });

  test('el texto, el Autor y la procedencia están en el HTML inicial', async ({ request }) => {
    // Sin navegador: se pide el HTML tal cual y se comprueba que ya lo trae todo. Es lo
    // que ve un rastreador que no ejecuta JavaScript (NFR-2).
    const html = await (await request.get(MEDIA)).text();
    expect(html).toContain('La libertad, Sancho');
    expect(html).toContain('Miguel de Cervantes');
    expect(html).toContain('Don Quijote de la Mancha');
  });
});

test.describe('Historia 2.1 — armazón y tratamiento visual', () => {
  test('la cabecera lleva solo marca y búsqueda, sin migas de pan', async ({ page }) => {
    await page.goto(CORTA);
    const enlaces = page.locator('header a');
    await expect(enlaces).toHaveCount(2);
    await expect(enlaces.nth(0)).toHaveAttribute('href', '/');
    await expect(enlaces.nth(1)).toHaveAttribute('href', '/buscar');
    await expect(page.locator('nav[aria-label*="miga" i], .migas, .breadcrumb')).toHaveCount(0);
  });

  test('no hay sombras ni elevación tonal en ninguna superficie', async ({ page }) => {
    await page.goto(CORTA);
    const conSombra = await page.evaluate(() =>
      [...document.querySelectorAll('*')].filter((n) => {
        const s = getComputedStyle(n);
        return s.boxShadow !== 'none' || s.textShadow !== 'none';
      }).length,
    );
    expect(conSombra).toBe(0);
  });

  test('cabecera, contenido y pie comparten el borde izquierdo', async ({ page }) => {
    // Regresión. Cada región calculaba su propio contenedor y salían tres columnas
    // distintas —marca en 651px, Cita en 595, pie en 737—, con `68ch` resolviéndose
    // distinto en cada una porque `ch` depende de la fuente del elemento. Ninguna
    // afirmación sobre el contenido fallaba; se veía mirando la página.
    await page.goto(MEDIA);
    const bordes = await page.evaluate(() =>
      ['.marca', '.texto', '.autor', '.pie p'].map((s) =>
        Math.round(document.querySelector(s)!.getBoundingClientRect().left),
      ),
    );
    expect(new Set(bordes).size, `bordes distintos: ${bordes.join(', ')}`).toBe(1);
  });

  test('un único h1 por página, y es la Cita', async ({ page }) => {
    await page.goto(CORTA);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Hoy es siempre todavía');
  });

  test('la Cita está marcada como cita con su atribución asociada', async ({ page }) => {
    await page.goto(CORTA);
    await expect(page.locator('figure > blockquote')).toHaveCount(1);
    await expect(page.locator('figure > figcaption')).toHaveCount(1);
  });

  test('la Cita no es un enlace', async ({ page }) => {
    await page.goto(CORTA);
    await expect(page.locator('blockquote a')).toHaveCount(0);
  });

  test('la serif solo se aplica a texto de Cita y nombre de Autor', async ({ page }) => {
    await page.goto(CORTA);
    const conSerif = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim() !== '')
        .filter((n) => getComputedStyle(n).fontFamily.includes('Source Serif'))
        .map((n) => `${n.tagName}.${n.className}`),
    );
    // En una Página de Cita, lo único en serif es el texto citado.
    expect(conSerif).toEqual(['H1.texto']);
  });
});

test.describe('Historia 2.1 — lo no publicado da 404', () => {
  test('una Cita en revisión no tiene página', async ({ request }) => {
    const respuesta = await request.get('/cita/una-cita-que-no-existe', { maxRedirects: 0 });
    expect(respuesta.status()).toBe(404);
  });
});

test.describe('Historia 2.1 — microcopia', () => {
  test('el texto propio del sitio no lleva exclamaciones, emoji ni contadores', async ({ page }) => {
    await page.goto(CORTA);
    // Todo el texto de la página menos la Cita, que es ajena y va como venga.
    const propio = await page.evaluate(() => {
      // Solo lo que el visitante lee. Se descuenta la Cita, que es ajena y va como
      // venga, y también el `<script>` y el respaldo oculto: un clon separado del
      // documento no tiene maquetación, así que `innerText` cae a `textContent` y
      // arrastraría el código fuente de la isla —donde un `if (!boton)` cuenta como
      // exclamación.
      const copia = document.body.cloneNode(true) as HTMLElement;
      for (const fuera of copia.querySelectorAll('blockquote, script, [hidden]')) fuera.remove();
      return copia.textContent ?? '';
    });

    expect(propio).not.toMatch(/[!¡]/);
    expect(propio).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
