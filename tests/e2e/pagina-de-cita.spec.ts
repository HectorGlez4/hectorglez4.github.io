import { expect, test, type Page } from '@playwright/test';
import { MAX_BYTES_DE_GUION } from '../../src/lib/umbrales.ts';
import {
  SIN_TARJETA_COMPLETA,
  citaConObraMasLarga,
  citaConProcedenciaCompleta,
  citaConTarjetaCompleta,
  citaConTituloDeObraMasLargo,
  citaSinObra,
  procedenciaDe,
} from './ayuda/corpus.ts';
import { apuntarGuiones, fueraDeLaListaAlCargar } from './ayuda/guiones.ts';

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
    await expect(enlace).toHaveAttribute('href', '/autor/antonio-machado/');
  });

  test('se muestran la obra y el año cuando la Cita tiene procedencia', async ({ page }) => {
    /*
     * La Cita se busca por su Procedencia y no se fija por su nombre. La que estaba fijada aquí
     * tiene hoy obra y **no** año —su documento de Gutenberg no lo declara— así que había
     * dejado de servir para comprobar que se enseñan los dos, y la prueba fallaba pidiendo un
     * 1615 que ninguna Fuente dice.
     */
    const completa = citaConProcedenciaCompleta();
    test.skip(completa === undefined, 'Ninguna Cita del Corpus declara obra y año a la vez.');

    await page.goto(`/cita/${completa!.slug}`);
    await expect(page.locator('.procedencia')).toContainText(completa!.obra);
    await expect(page.locator('.procedencia')).toContainText(String(completa!.año));
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

test.describe('Historia 2.1 — solo las islas declaradas y HTML inicial', () => {
  test('la página solo descarga los guiones externos declarados', async ({ page, baseURL }) => {
    /*
     * Historia 23.1 — de «no descarga ningún fichero de script» a «solo los guiones externos
     * declarados», como enmienda la Historia 2.1: al cargar, a lo sumo el de medición, que es lo
     * único de la lista cerrada de `src/lib/guiones.ts` que se pide sin tocar nada. Contra este
     * servidor, construido desde la 23.2 con el punto final del receptor local
     * (`playwright.config.ts`), se pide el fichero de medición —lo exige
     * `receptor-local.spec.ts`, que además lo ve llegar al D1 local—, y esta prueba lo admite por
     * estar en la lista.
     * `tests/e2e/receptor.spec.ts` exige además que sea exactamente uno.
     */
    const pedidos = apuntarGuiones(page, baseURL!);
    await page.goto(CORTA, { waitUntil: 'networkidle' });
    expect(fueraDeLaListaAlCargar(pedidos), `la Página de Cita pidió ${pedidos.join(', ')}`).toEqual([]);
  });

  test('el guion en línea cabe en MAX_BYTES_DE_GUION', async ({ page }) => {
    /*
     * El criterio de la 2.1 dice «la página no envía JavaScript» y la 2.2 añade el botón
     * de copiar, que necesita algo. AD-6 resuelve la tensión: existen tres islas, cada
     * una hidratada bajo demanda, y desde la 23.1 la medición se descarga aparte, de la
     * lista cerrada de `src/lib/guiones.ts`. Lo que se exige aquí es que lo que va en
     * línea no crezca sin que nadie lo note, y que el contenido no dependa de que se
     * ejecute nada —las dos cosas que sostienen NFR-2 y NFR-7—, no que el HTML tenga cero
     * bytes de JavaScript.
     */
    await page.goto(CORTA);

    /*
     * Lo que hay en línea son las tres islas —copiar, la Imagen y compartir— y el arranque
     * de la medición, no un armazón. El tope existe para que no crezca sin que nadie lo
     * note; se sube cuando una isla nueva entra a propósito, no cuando algo engorda por su
     * cuenta.
     *
     * Tras la 23.1 son unos 5,6 KB sin comprimir. El generador de verdad, que son decenas de
     * kilobytes, sigue fuera y solo se descarga al pulsar.
     *
     * El tope vive en `umbrales.ts` desde la v2 y no aquí: esta prueba mide la página
     * **sin** medición configurada, y hay otra que la mide **con** ella. Con el número
     * repetido en dos sitios, subir uno y olvidar el otro dejaba la segunda sin vigilar,
     * que es exactamente cómo el guion creció sin que nadie lo viera.
     */
    const bytes = await page.evaluate(() =>
      [...document.querySelectorAll('script')]
        // El `ld+json` de los datos estructurados no es JavaScript ejecutable: el
        // navegador no lo interpreta. Cuenta para el peso de la página, no para esto.
        .filter((s) => s.type !== 'application/ld+json')
        .reduce((n, s) => n + s.textContent!.length, 0),
    );
    expect(bytes).toBeLessThan(MAX_BYTES_DE_GUION);
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
    // La obra se lee del Corpus: la declara la Fuente y cambió al resembrar desde Gutenberg.
    expect(html).toContain(procedenciaDe(MEDIA.replace('/cita/', '')).obra!);
  });
});

test.describe('Historia 2.1 — armazón y tratamiento visual', () => {
  test('la cabecera lleva solo marca y búsqueda, sin migas de pan', async ({ page }) => {
    await page.goto(CORTA);
    const enlaces = page.locator('header a');
    await expect(enlaces).toHaveCount(2);
    await expect(enlaces.nth(0)).toHaveAttribute('href', '/');
    await expect(enlaces.nth(1)).toHaveAttribute('href', '/buscar/');
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

  test('la serif solo se aplica a texto de Cita y a nombres de Tema', async ({ page }) => {
    await page.goto(CORTA);

    /*
     * La regla de DESIGN.md es sobre qué es cada cosa, no sobre cuántas hay: la serif se
     * aplica al texto de una Cita, al nombre de un Autor y al nombre de un Tema, y a
     * nada más. En esta página eso son el texto citado, los fragmentos de las Citas
     * hermanas y los chips de Tema. Comprobarlo con una lista de etiquetas hacía que
     * añadir rutas de salida rompiera la prueba sin que nada estuviera mal.
     */
    const PERMITIDOS = ['.texto', '.hermanas a', '.chip'];

    const intrusos = await page.evaluate((permitidos) => {
      return [...document.querySelectorAll('body *')]
        .filter((n) => n.children.length === 0 && (n.textContent ?? '').trim() !== '')
        .filter((n) => getComputedStyle(n).fontFamily.includes('Source Serif'))
        .filter((n) => !permitidos.some((sel) => n.closest(sel) !== null))
        .map((n) => `${n.tagName.toLowerCase()}.${n.className}`);
    }, PERMITIDOS);

    expect(intrusos).toEqual([]);
    // Y la serif está de verdad aplicada donde debe: la prueba no pasa por vacío.
    expect(
      await page.locator('.texto').evaluate((n) => getComputedStyle(n).fontFamily),
    ).toContain('Source Serif');
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
      /*
       * `.cita` va con `blockquote`: el texto ajeno no solo está en la Cita de la página, sino
       * también en las tarjetas del listado «Más de este Autor». Faltaba, y la prueba empezó a
       * fallar el día que una Cita con exclamación —«¡Ah, cuando yo era niño…!»— entró en ese
       * listado. La regla es sobre el texto **propio** del sitio; una Cita no lo es, y NFR-12
       * prohíbe tocarla para que cumpla una regla de microcopia.
       */
      for (const fuera of copia.querySelectorAll('blockquote, .cita, .hermanas, script, [hidden]')) {
        fuera.remove();
      }
      return copia.textContent ?? '';
    });

    expect(propio).not.toMatch(/[!¡]/);
    expect(propio).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

/**
 * Historia 22.5 — la Atribución dice de qué obra sale, y se ve que es un enlace.
 *
 * Los enlaces en tinta (el nombre del Autor, el título de la Obra y «de {Autor}» en la Cabecera
 * de Obra) van subrayados **sin** `:hover`, que en móvil no existe, y sus zonas de toque no se
 * pisan a 360 px (WCAG 2.5.8). Se mide en los dos proyectos, a 360 px en ambos, con la Inter del
 * sitio y el cursor fuera de la página. Los valores esperados salen de los tokens de la propia
 * página y no se escriben aquí.
 *
 * La guardia que corre en CI sobre la hoja emitida está en `tests/unit/obra-pagina.test.ts`.
 */
test.describe('Historia 22.5 — los enlaces en tinta de la Atribución', () => {
  const completa = citaConProcedenciaCompleta();
  const larga = citaConObraMasLarga();
  const INEXISTENTE = '/esta-pagina-no-existe-22-5';

  /** Lo que valen `--tinta`, `--tinta-apagada` y `--grosor-filete` calculados en la página. */
  async function tokens(page: Page) {
    return page.evaluate(() => {
      const sonda = document.createElement('span');
      sonda.style.color = 'var(--tinta)';
      sonda.style.borderTop = 'var(--grosor-filete) solid';
      document.body.append(sonda);
      const tinta = getComputedStyle(sonda).color;
      const grosor = getComputedStyle(sonda).borderTopWidth;
      sonda.style.color = 'var(--tinta-apagada)';
      const apagada = getComputedStyle(sonda).color;
      sonda.remove();
      return { tinta, apagada, grosor };
    });
  }

  async function abrir(page: Page, ruta: string) {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(ruta);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.mouse.move(0, 0);
  }

  function estilo(n: Element) {
    const e = getComputedStyle(n);
    return {
      color: e.color,
      linea: e.textDecorationLine,
      grosor: e.textDecorationThickness,
    };
  }

  interface Caja {
    top: number;
    bottom: number;
    left: number;
    right: number;
    alto: number;
  }

  interface Zonas {
    nombre: Caja;
    /** La caja del texto del nombre, sin el relleno que agranda la zona. */
    textoDelNombre: Caja;
    linea: Caja;
    titulo: Caja[];
    fuente: Caja[];
    /** Por fragmento del título: el anillo de foco y lo que deja libre el interlineado. */
    anillo: { foco: boolean; arriba: number; abajo: number; holgura: number }[];
    tocaTitulo: boolean;
  }

  /**
   * Las zonas de toque de la Atribución en la página abierta, y el anillo de foco del título.
   * Sin enlace de Obra, `titulo` sale vacío; quien lo exija lo dice con su propio error.
   */
  async function zonas(page: Page): Promise<Zonas> {
    await page.locator('figcaption .procedencia').scrollIntoViewIfNeeded();
    return page.evaluate(() => {
      const caja = (r: DOMRect) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, alto: r.height });
      const nombre = document.querySelector('figcaption .autor a');
      const linea = document.querySelector('figcaption .procedencia');
      if (nombre === null || linea === null) throw new Error('La página no pinta la Atribución.');
      const n = getComputedStyle(nombre);
      const rn = nombre.getBoundingClientRect();
      const textoDelNombre = {
        ...caja(rn),
        top: rn.top + parseFloat(n.paddingTop),
        bottom: rn.bottom - parseFloat(n.paddingBottom),
      };
      const titulo = document.querySelector<HTMLElement>('figcaption .procedencia a');
      const trozos = titulo === null ? [] : [...titulo.getClientRects()].map(caja);
      const fuente = [...document.querySelectorAll('.fuente a')].flatMap((a) => [...a.getClientRects()].map(caja));

      let tocaTitulo = false;
      let anillo: { foco: boolean; arriba: number; abajo: number; holgura: number }[] = [];
      if (titulo !== null) {
        // La zona responde de verdad en su relleno: 1 px dentro del borde superior, por encima
        // de las letras, el toque cae en el enlace.
        const primero = trozos[0];
        const tocado = document.elementFromPoint(primero.left + primero.alto / 2, primero.top + 1);
        tocaTitulo = tocado === titulo || titulo.contains(tocado);

        titulo.focus();
        const t = getComputedStyle(titulo);
        const relleno = parseFloat(t.paddingTop);
        const fuera = parseFloat(t.outlineOffset) + parseFloat(t.outlineWidth);
        const interlineado = parseFloat(getComputedStyle(linea).lineHeight);
        anillo = trozos.map((trozo) => {
          const contenido = trozo.alto - relleno * 2;
          return {
            foco: titulo.matches(':focus-visible'),
            // Cuánto sale el anillo por encima y por debajo de la caja de contenido del texto.
            arriba: relleno + fuera,
            abajo: relleno + fuera,
            // Lo que separa la caja de contenido de esta línea de la de la siguiente.
            holgura: interlineado - contenido,
          };
        });
        titulo.blur();
      }
      return { nombre: caja(rn), textoDelNombre, linea: caja(linea.getBoundingClientRect()), titulo: trozos, fuente, anillo, tocaTitulo };
    });
  }

  /** Dos cajas se solapan si comparten área: tocarse en un borde no es solaparse. */
  function solapan(a: Caja, b: Caja): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }

  function exigirTitulo(z: Zonas, donde: string): Caja[] {
    if (z.titulo.length === 0) {
      throw new Error(`${donde}: la Atribución no trae enlace de Obra, y esta prueba lo necesita.`);
    }
    return z.titulo;
  }

  /** Las comprobaciones de zonas, las mismas en cada superficie que pinta la Atribución. */
  function comprobarZonas(z: Zonas, donde: string) {
    expect(z.nombre.alto, `${donde}: zona del nombre`).toBeGreaterThanOrEqual(44);
    expect(solapan(z.nombre, z.linea), `${donde}: el nombre pisa la línea de la Procedencia`).toBe(false);
    z.titulo.forEach((trozo, i) => {
      expect(trozo.alto, `${donde}: zona del título, fragmento ${i + 1}`).toBeGreaterThanOrEqual(24);
      expect(solapan(z.nombre, trozo), `${donde}: el nombre pisa el título, fragmento ${i + 1}`).toBe(false);
      for (const fuente of z.fuente) {
        expect(solapan(trozo, fuente), `${donde}: el título pisa la Línea de la Fuente`).toBe(false);
      }
    });
    if (z.titulo.length > 0) {
      expect(z.tocaTitulo, `${donde}: el relleno del título no recibe el toque`).toBe(true);
      for (const [i, a] of z.anillo.entries()) {
        expect(a.foco, `${donde}: el título no muestra el foco`).toBe(true);
        // El anillo no entra en la línea siguiente —ni en la anterior— del párrafo.
        expect(a.abajo, `${donde}: el anillo invade la línea siguiente, fragmento ${i + 1}`).toBeLessThanOrEqual(a.holgura);
        expect(a.arriba, `${donde}: el anillo invade la línea anterior, fragmento ${i + 1}`).toBeLessThanOrEqual(a.holgura);
      }
      // Ni la caja del texto del nombre.
      expect(Math.min(...z.titulo.map((t) => t.top))).toBeGreaterThan(z.textoDelNombre.bottom);
    }
  }

  test('el nombre y el título van en tinta y subrayados sin pasar el cursor', async ({ page }) => {
    test.skip(completa === undefined, 'Ninguna Cita del Corpus declara obra y año a la vez.');
    await abrir(page, `/cita/${completa!.slug}`);
    const { tinta, apagada, grosor } = await tokens(page);

    const nombre = await page.locator('figcaption .autor a').evaluate(estilo);
    const titulo = await page.locator('figcaption .procedencia a').evaluate(estilo);
    const linea = await page.locator('figcaption .procedencia').evaluate((n) => getComputedStyle(n).color);

    for (const [que, e] of [
      ['nombre', nombre],
      ['título', titulo],
    ] as const) {
      expect(e.color, que).toBe(tinta);
      expect(e.linea, que).toBe('underline');
      expect(e.grosor, que).toBe(grosor);
    }
    // El título, más oscuro que el resto de su línea.
    expect(linea).toBe(apagada);
    expect(titulo.color).not.toBe(linea);

    // Solo el título es enlace: el año queda fuera.
    await expect(page.locator('figcaption .procedencia a')).toHaveCount(1);
    await expect(page.locator('figcaption .procedencia a')).not.toContainText(String(completa!.año));
  });

  test('a 360 px, en la Página de Cita, las zonas no se pisan y el título tiene 24 px', async ({ page }) => {
    test.skip(completa === undefined, 'Ninguna Cita del Corpus declara obra y año a la vez.');
    await abrir(page, `/cita/${completa!.slug}`);
    const z = await zonas(page);
    exigirTitulo(z, completa!.slug);
    comprobarZonas(z, completa!.slug);
  });

  test('a 360 px, con el título más largo del Corpus, partido en varias líneas', async ({ page }) => {
    test.skip(larga === undefined, 'Ninguna Cita del Corpus declara obra y Fuente.');
    await abrir(page, `/cita/${larga!.slug}`);
    const z = await zonas(page);
    const trozos = exigirTitulo(z, larga!.slug);
    expect(trozos.length, `«${larga!.obra}» no parte a 360 px`).toBeGreaterThanOrEqual(2);
    // Es una Cita con Fuente: debajo va la Línea de la Fuente, y el título no puede pisarla.
    expect(z.fuente.length, `${larga!.slug} no trae Línea de la Fuente`).toBeGreaterThan(0);
    comprobarZonas(z, larga!.slug);
  });

  for (const [donde, ruta] of [
    ['la portada', '/'],
    ['la página 404', INEXISTENTE],
  ] as const) {
    test(`a 360 px, en ${donde}, las zonas de la Atribución tampoco se pisan`, async ({ page }) => {
      await abrir(page, ruta);
      // La Cita del Día puede no declarar obra: entonces se mide el nombre contra la línea.
      comprobarZonas(await zonas(page), donde);
    });
  }

  test('sin obra, la línea de la Procedencia no lleva enlace', async ({ page }) => {
    await abrir(page, SIN_OBRA);
    await expect(page.locator('figcaption .procedencia')).toContainText('Sin obra documentada');
    await expect(page.locator('figcaption .procedencia a')).toHaveCount(0);
  });

  test('en la Cabecera de Obra, «de {Autor}» sigue el mismo criterio, con 44 px de zona', async ({
    page,
  }) => {
    test.skip(completa === undefined, 'Ninguna Cita del Corpus declara obra y año a la vez.');
    await abrir(page, `/cita/${completa!.slug}`);
    const enCita = await page.locator('figcaption .autor a').evaluate(estilo);
    const obra = await page.locator('figcaption .procedencia a').getAttribute('href');
    expect(obra).toMatch(/^\/obra\//);

    await abrir(page, obra!);
    const { tinta, grosor } = await tokens(page);
    const de = page.locator('.cabecera-de-obra .de a');
    const enObra = await de.evaluate(estilo);
    const alto = await de.evaluate((n) => n.getBoundingClientRect().height);

    expect(enObra).toEqual(enCita);
    expect(enObra).toEqual({ color: tinta, linea: 'underline', grosor });
    expect(alto).toBeGreaterThanOrEqual(44);
  });
});

/**
 * Historia 24.4 — bajo la Cita, la obra de la que sale.
 *
 * La Tarjeta de Obra va entre la Línea de la Fuente y Copiar. Se mide en el navegador lo que la
 * prueba unitaria no ve: que el texto de la Cita sigue empezando en la primera pantalla de
 * 360 × 640 (que Copiar quede justo debajo es deuda aceptada que vigila SM-C5: su posición se
 * anota, y se exige que no pase de la segunda pantalla), los tokens calculados de la tarjeta y
 * de su fila, y la separación de las acciones de debajo. Las Citas salen del Corpus, nunca
 * fijadas a mano. Los valores esperados salen de los tokens de la propia página.
 */
test.describe('Historia 24.4 — la Tarjeta de Obra en la Página de Cita', () => {
  // La cara es obligatoria: si el Corpus de hoy no la tiene, fallan las pruebas que la piden, y
  // no el fichero entero al cargarse.
  const completa = ((c) => (c === undefined ? undefined : `/cita/${c.slug}/`))(citaConTarjetaCompleta());
  const larga = citaConTituloDeObraMasLargo();
  const conTarjeta = [completa ?? '(sin tarjeta completa)', ...(larga === undefined ? [] : [`/cita/${larga.slug}/`])];

  async function abrir(page: Page, ruta: string | undefined) {
    expect(ruta, SIN_TARJETA_COMPLETA).toBeDefined();
    await page.goto(ruta!);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  }

  for (const ruta of conTarjeta) {
    test(`${ruta}: la Cita empieza en la primera pantalla de 360 × 640 y Copiar va debajo de la tarjeta`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== 'movil', 'El criterio se enuncia sobre 360×640.');
      await abrir(page, ruta === '(sin tarjeta completa)' ? undefined : ruta);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const cita = await page.locator('blockquote .texto').boundingBox();
      const tarjeta = await page.locator('.tarjeta-de-obra').boundingBox();
      const copiar = await page.locator('button.copiar').boundingBox();
      expect(cita).not.toBeNull();
      expect(tarjeta).not.toBeNull();
      expect(copiar).not.toBeNull();
      expect(cita!.y, ruta).toBeGreaterThan(0);
      expect(cita!.y, ruta).toBeLessThan(640);
      expect(copiar!.y, ruta).toBeGreaterThanOrEqual(tarjeta!.y + tarjeta!.height);
      // «Justo debajo»: la deuda aceptada es que Copiar salga de la primera pantalla, no que se
      // vaya más allá de la segunda (medido el 2026-10-27: y = 756 y 867).
      expect(copiar!.y, `${ruta}: Copiar pasa de la segunda pantalla`).toBeLessThan(640 * 2);
      info.annotations.push({
        type: '24.4 a 360 × 640',
        description: `${ruta}: tarjeta de ${Math.round(tarjeta!.height)} px desde y = ${Math.round(tarjeta!.y)}; Copiar en y = ${Math.round(copiar!.y)} (${copiar!.y + copiar!.height <= 640 ? 'dentro' : 'fuera'} de la primera pantalla)`,
      });
    });
  }

  test('los tokens calculados de la tarjeta y de su fila', async ({ page }) => {
    await abrir(page, completa);
    const medida = await page.evaluate(() => {
      const seccion = document.querySelector('.tarjeta-de-obra') as HTMLElement;
      // Los tokens, resueltos en una sonda hermana de la tarjeta: hereda la misma letra, y
      // `68ch` se resuelve igual.
      const sonda = document.createElement('div');
      sonda.style.cssText =
        'width: var(--unidad); max-width: var(--medida-prosa); color: var(--tinta); background-color: var(--filete); ' +
        'border-top: var(--grosor-filete) solid; min-height: var(--zona-de-toque); font-family: var(--sans)';
      seccion.parentElement!.append(sonda);
      const s = getComputedStyle(sonda);
      const tokens = {
        unidad: parseFloat(s.width),
        medida: s.maxWidth,
        tinta: s.color,
        filete: s.backgroundColor,
        grosor: s.borderTopWidth,
        toque: s.minHeight,
        sans: s.fontFamily,
      };
      const tamaño = (token: string) => {
        sonda.style.fontSize = `var(${token})`;
        return parseFloat(getComputedStyle(sonda).fontSize);
      };
      const tamaños = { lg: tamaño('--cuerpo-lg'), md: tamaño('--cuerpo-md'), pie: tamaño('--pie') };
      sonda.style.color = 'var(--tinta-apagada)';
      const apagada = getComputedStyle(sonda).color;
      sonda.remove();

      const css = (selector: string) => getComputedStyle(seccion.querySelector(selector) ?? seccion);
      const sec = getComputedStyle(seccion);
      const titulo = css('.titulo');
      const hechos = css('.hechos');
      const filas = css('ul.filas');
      const li = css('li.fila-de-bloque');
      const a = css('li.fila-de-bloque a');
      const recorta = (e: CSSStyleDeclaration) =>
        e.whiteSpace === 'nowrap' || e.textOverflow === 'ellipsis' || e.overflow !== 'visible' || e.webkitLineClamp !== 'none';
      return {
        tokens: { ...tokens, ...tamaños, apagada },
        seccion: {
          margen: parseFloat(sec.marginTop),
          filete: [sec.borderTopWidth, sec.borderTopStyle, sec.borderTopColor],
          relleno: parseFloat(sec.paddingTop),
          maximo: sec.maxWidth,
          fondo: sec.backgroundColor,
          radio: sec.borderTopLeftRadius,
          recorta: recorta(sec),
        },
        titulo: {
          margen: parseFloat(titulo.marginTop),
          familia: titulo.fontFamily,
          tamaño: parseFloat(titulo.fontSize),
          peso: titulo.fontWeight,
          color: titulo.color,
          equilibrio: `${titulo.getPropertyValue('text-wrap')} ${titulo.getPropertyValue('text-wrap-style')}`,
          parte: titulo.overflowWrap,
          guiones: titulo.hyphens,
          recorta: recorta(titulo),
        },
        hechos: {
          margen: parseFloat(hechos.marginTop),
          familia: hechos.fontFamily,
          tamaño: parseFloat(hechos.fontSize),
          peso: hechos.fontWeight,
          interlineado: parseFloat(hechos.lineHeight),
          color: hechos.color,
          recorta: recorta(hechos),
        },
        filas: {
          margen: parseFloat(filas.marginTop),
          viñeta: filas.listStyleType,
          relleno: filas.paddingLeft,
          filete: [filas.borderTopWidth, filas.borderTopStyle, filas.borderTopColor],
        },
        fila: {
          filete: [li.borderBottomWidth, li.borderBottomStyle, li.borderBottomColor],
          display: a.display,
          alineado: a.alignItems,
          alto: a.minHeight,
          relleno: parseFloat(a.paddingTop),
          familia: a.fontFamily,
          tamaño: parseFloat(a.fontSize),
          interlineado: parseFloat(a.lineHeight),
          color: a.color,
          subrayado: a.textDecorationLine,
          recorta: recorta(a),
        },
      };
    });
    const { tokens: t } = medida;
    expect(medida.seccion).toEqual({
      margen: t.unidad * 4,
      filete: [t.grosor, 'solid', t.filete],
      relleno: t.unidad * 3,
      maximo: t.medida,
      fondo: 'rgba(0, 0, 0, 0)',
      radio: '0px',
      recorta: false,
    });
    expect(medida.titulo).toMatchObject({
      margen: t.unidad,
      familia: t.sans,
      tamaño: t.lg,
      peso: '600',
      color: t.tinta,
      parte: 'break-word',
      guiones: 'auto',
      recorta: false,
    });
    expect(medida.titulo.equilibrio).toContain('balance');
    expect(medida.hechos).toEqual({
      margen: t.unidad,
      familia: t.sans,
      tamaño: t.pie,
      peso: '400',
      interlineado: t.pie * 1.5,
      color: t.apagada,
      recorta: false,
    });
    expect(medida.filas).toEqual({
      margen: t.unidad * 2,
      viñeta: 'none',
      relleno: '0px',
      filete: [t.grosor, 'solid', t.filete],
    });
    expect(medida.fila.interlineado).toBeCloseTo(t.md * 1.4, 1);
    expect({ ...medida.fila, interlineado: undefined }).toEqual({
      filete: [t.grosor, 'solid', t.filete],
      display: 'flex',
      alineado: 'center',
      alto: t.toque,
      relleno: t.unidad * 1.25,
      familia: t.sans,
      tamaño: t.md,
      interlineado: undefined,
      color: t.tinta,
      subrayado: 'none',
      recorta: false,
    });
  });

  test('las acciones de debajo: Copiar a 32 px de la tarjeta, Imagen a 16 px de Copiar, cada botón en su línea', async ({
    page,
  }) => {
    await abrir(page, completa);
    const medida = await page.evaluate(() => {
      const caja = (n: Element | null) => (n as HTMLElement).getBoundingClientRect();
      const tarjeta = caja(document.querySelector('.tarjeta-de-obra'));
      const islas = [...document.querySelectorAll('main .isla')];
      const copiar = islas.find((n) => n.querySelector('button.copiar') !== null)!;
      const imagen = islas.find((n) => n.hasAttribute('data-imagen'))!;
      const botonCopiar = caja(copiar.querySelector('button.copiar'));
      const botonImagen = caja(imagen.querySelector('button[data-abrir]'));
      const columna = caja(document.querySelector('main article'));
      return {
        tarjetaACopiar: caja(copiar).top - tarjeta.bottom,
        copiarAImagen: caja(imagen).top - caja(copiar).bottom,
        unidad: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unidad')),
        enSuLinea: botonImagen.top >= botonCopiar.bottom,
        anchos: [botonCopiar.width, botonImagen.width],
        columna: columna.width,
      };
    });
    expect(Math.abs(medida.tarjetaACopiar - medida.unidad * 4), JSON.stringify(medida)).toBeLessThanOrEqual(1);
    expect(Math.abs(medida.copiarAImagen - medida.unidad * 2), JSON.stringify(medida)).toBeLessThanOrEqual(1);
    expect(medida.enSuLinea, JSON.stringify(medida)).toBe(true);
    for (const ancho of medida.anchos) expect(ancho, JSON.stringify(medida)).toBeLessThan(medida.columna);
  });

  test('sin Obra, Copiar sigue donde estaba: a 32 px de la Atribución o de la Línea de la Fuente', async ({ page }) => {
    const sinObra = citaSinObra();
    expect(sinObra, 'el Corpus no tiene ninguna Cita sin Obra').toBeDefined();
    await page.goto(`/cita/${sinObra!.slug}/`);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const medida = await page.evaluate(() => {
      const copiar = [...document.querySelectorAll('main .isla')].find((n) => n.querySelector('button.copiar') !== null)!;
      const anterior = copiar.previousElementSibling as HTMLElement;
      return {
        tarjetas: document.querySelectorAll('.tarjeta-de-obra').length,
        anterior: anterior.matches('figure, p.fuente'),
        hueco: copiar.getBoundingClientRect().top - anterior.getBoundingClientRect().bottom,
        unidad: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unidad')),
      };
    });
    expect(medida.tarjetas, JSON.stringify(medida)).toBe(0);
    expect(medida.anterior, JSON.stringify(medida)).toBe(true);
    expect(Math.abs(medida.hueco - medida.unidad * 4), JSON.stringify(medida)).toBeLessThanOrEqual(1);
  });
});
