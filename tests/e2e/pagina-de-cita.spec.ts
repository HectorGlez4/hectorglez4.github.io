import { expect, test, type Page } from '@playwright/test';
import { MAX_BYTES_DE_GUION } from '../../src/lib/umbrales.ts';
import {
  SIN_TARJETA_COMPLETA,
  citaConObraMasLarga,
  citaConProcedenciaCompleta,
  citaConLosDosBloques,
  citaConObraDeTextoMasLargo,
  citaConTarjetaCompleta,
  citaConTituloDeObraMasLargo,
  citaDeTramo,
  citaSinImagen,
  citaSinObra,
  estaPublicada,
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
  /*
   * Historia 26.5 — enmienda de este criterio (UX-DR112): la cabecera ya no lleva solo marca y
   * búsqueda, sino la marca y «Autores · Obras · Buscar». Sigue sin migas de pan.
   */
  test('la cabecera lleva marca, Autores, Obras y Buscar, sin migas de pan', async ({ page }) => {
    await page.goto(CORTA);
    const enlaces = page.locator('header a');
    await expect(enlaces).toHaveCount(4);
    for (const [i, destino] of ['/', '/autores/', '/obras/', '/buscar/'].entries()) {
      await expect(enlaces.nth(i)).toHaveAttribute('href', destino);
      await expect(enlaces.nth(i)).not.toHaveAttribute('target');
    }
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
     * nada más. En esta página eso son el texto citado, los fragmentos de las Tarjetas de
     * Cita de las Rutas de salida (Historia 24.6) y los chips de Tema. Comprobarlo con una
     * lista de etiquetas hacía que añadir rutas de salida rompiera la prueba sin que nada
     * estuviera mal.
     */
    const PERMITIDOS = ['.texto', '.tarjeta .fragmento', '.chip'];

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
       * prohíbe tocarla para que cumpla una regla de microcopia. Desde la 24.6 esas tarjetas son
       * las Tarjetas de Cita de las Rutas de salida.
       */
      for (const fuera of copia.querySelectorAll('blockquote, .cita, .salidas li.tarjeta, script, [hidden]')) {
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
 * Desde la Historia 30.1 la Tarjeta de Obra va tras Copiar, la Imagen y compartir, antes de las
 * Rutas de salida. Se mide en el navegador lo que la prueba unitaria no ve: que el texto de la
 * Cita sigue empezando en la primera pantalla de 360 × 640 y que Copiar va por encima de la
 * tarjeta (su posición se anota), el orden de tabulación, los tokens calculados de la tarjeta y
 * de su fila. Las Citas salen del Corpus, nunca fijadas a mano. Los valores esperados salen de los
 * tokens de la propia página.
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

  /*
   * Historia 30.1 — las de la medida: la cara completa, la de título de Obra más largo, la de texto
   * más largo con Obra (la Cita en verso más larga la sustituye cuando la Épica 29 llegue a la rama)
   * y las tres de la auditoría del 2026-11-05, si están publicadas.
   */
  const deTextoLargo = citaConObraDeTextoMasLargo();
  const AUDITORIA = [
    'antonio-machado-caminante-no-hay-camino-se-hace-camino',
    'jose-marti-yo-soy-un-hombre-sincero-de-donde',
    'jose-marti-yo-vengo-de-todas-partes-y-hacia',
  ];
  // Una de la auditoría que el Corpus de hoy no publica no se mide en silencio: se dice por qué.
  for (const slug of AUDITORIA.filter((s) => !estaPublicada(s))) {
    test(`/cita/${slug}/: la medida de la auditoría a 360 × 640`, () => {
      test.skip(true, `La Cita de la auditoría ${slug} no está publicada hoy: su medida no se repite.`);
    });
  }
  const medidas = [
    ...new Set([
      ...conTarjeta,
      ...(deTextoLargo === undefined ? [] : [`/cita/${deTextoLargo.slug}/`]),
      ...AUDITORIA.filter(estaPublicada).map((slug) => `/cita/${slug}/`),
    ]),
  ];

  for (const ruta of medidas) {
    test(`${ruta}: la Cita empieza en la primera pantalla de 360 × 640 y Copiar va por encima de la tarjeta`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== 'movil', 'El criterio se enuncia sobre 360×640.');
      await abrir(page, ruta === '(sin tarjeta completa)' ? undefined : ruta);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const cita = await page.locator('blockquote .texto').boundingBox();
      const copiar = await page.locator('button.copiar').boundingBox();
      const tarjeta = (await page.locator('.tarjeta-de-obra').count()) === 0 ? null : await page.locator('.tarjeta-de-obra').boundingBox();
      expect(cita).not.toBeNull();
      expect(copiar).not.toBeNull();
      expect(cita!.y, ruta).toBeGreaterThan(0);
      expect(cita!.y, ruta).toBeLessThan(640);
      // Las de `conTarjeta` la traen siempre: que falte es una regresión, no una Cita sin Obra.
      if (conTarjeta.includes(ruta)) expect(tarjeta, `${ruta}: sin .tarjeta-de-obra`).not.toBeNull();
      if (tarjeta !== null) expect(copiar!.y + copiar!.height, ruta).toBeLessThanOrEqual(tarjeta.y);
      // Sin tope para la larga: la cifra se anota, y la de la auditoría se compara en el spec.
      info.annotations.push({
        type: '30.1 a 360 × 640',
        description: `${ruta}: Copiar en y = ${Math.round(copiar!.y)} (${copiar!.y + copiar!.height <= 640 ? 'dentro' : 'fuera'} de la primera pantalla); ${tarjeta === null ? 'sin tarjeta' : `tarjeta desde y = ${Math.round(tarjeta.y)}`}`,
      });
    });
  }

  test('30.1 — el orden de tabulación es el del marcado: Atribución y Fuente, acciones, compartir, tarjeta, salidas y pie', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'escritorio', 'El teclado se recorre una vez, en escritorio.');
    await abrir(page, completa);
    // Historia 30.3 — tras la tarjeta, el bloque de desplegables («Cómo citar» e «Inserta esta cita», cerrados).
    const GRUPOS = ['atribucion', 'copiar', 'imagen', 'compartir', 'tarjeta', 'desplegables', 'salidas', 'pie'];
    const recorrido: { grupo: string; indice: number }[] = [];
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press('Tab');
      const foco = await page.evaluate(() => {
        const activo = document.activeElement;
        if (activo === null || activo === document.body) return null;
        const grupo = activo.closest('footer')
          ? 'pie'
          : activo.closest('article figure.bloque, article p.fuente')
            ? 'atribucion'
            : activo.closest('article .isla[data-compartir]')
              ? 'compartir'
              : activo.closest('article .isla[data-imagen]')
                ? 'imagen'
                : activo.closest('article .isla')?.querySelector('button.copiar')
                  ? 'copiar'
                  : activo.closest('article .tarjeta-de-obra')
                    ? 'tarjeta'
                    : activo.closest('article nav.salidas')
                      ? 'salidas'
                      : activo.closest('article .desplegables')
                        ? 'desplegables'
                      : activo.closest('article')
                        ? `article: ${activo.outerHTML.slice(0, 120)}`
                        : 'otro';
        const indice = [...document.querySelectorAll('*')].indexOf(activo);
        return { grupo, indice };
      });
      if (foco === null) break;
      recorrido.push(foco);
      if (foco.grupo === 'pie') break;
    }
    // El recorrido llega al pie: si no, lo de abajo fallaría por un orden que no es el problema.
    expect(recorrido.at(-1)?.grupo, JSON.stringify(recorrido.map((f) => f.grupo))).toBe('pie');
    // Ninguna parada del `article` fuera de sus grupos: una de más o fuera de sitio se nombra.
    expect(recorrido.filter((f) => f.grupo.startsWith('article: ')).map((f) => f.grupo)).toEqual([]);
    const dentro = recorrido.filter((f) => f.grupo !== 'otro');
    // Cada foco sigue al anterior en el marcado.
    const indices = dentro.map((f) => f.indice);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    // Y los grupos van en su orden, todos presentes en la cara completa.
    const grupos = dentro.map((f) => f.grupo).filter((g, i, todos) => i === 0 || todos[i - 1] !== g);
    expect(grupos).toEqual(GRUPOS);
  });

  test('24.5 — la tarjeta de la cara completa tiene dos filas, «Siguiente…» primero y del mismo trato', async ({
    page,
  }) => {
    await abrir(page, completa);
    const filas = await page.locator('.tarjeta-de-obra ul.filas > li').evaluateAll((lis) =>
      lis.map((li) => {
        const a = li.querySelector('a')!;
        const s = getComputedStyle(a);
        const l = getComputedStyle(li);
        return {
          deBloque: li.classList.contains('fila-de-bloque'),
          zona: li.getAttribute('data-zona'),
          href: a.getAttribute('href'),
          target: a.getAttribute('target'),
          texto: (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
          trato: [s.display, s.minHeight, s.fontFamily, s.fontSize, s.color, s.textDecorationLine].join(' | '),
          // El filete de debajo de cada fila: el de la primera lo mide «los tokens calculados…».
          filete: [l.borderBottomWidth, l.borderBottomStyle, l.borderBottomColor].join(' | '),
        };
      }),
    );
    expect(filas.map((f) => f.zona), completa).toEqual(['siguiente', 'tarjeta-de-obra']);
    expect(filas.every((f) => f.deBloque), completa).toBe(true);
    expect(filas[0].texto, completa).toBe('Siguiente cita de esta obra \u203A');
    expect(filas[0].href, completa).toMatch(/^\/cita\/[^/]+\/$/);
    expect(filas[0].href, completa).not.toBe(completa);
    expect(filas[1].href, completa).toMatch(/^\/obra\//);
    expect(filas.map((f) => f.target), completa).toEqual([null, null]);
    expect(filas[0].trato, completa).toBe(filas[1].trato);
    expect(filas[0].filete, completa).toBe(filas[1].filete);
    // La siguiente existe y es de la misma Obra: su propia tarjeta lleva a la misma página.
    const respuesta = await page.goto(filas[0].href!);
    expect(respuesta?.status(), filas[0].href!).toBe(200);
    expect(
      await page.locator('.tarjeta-de-obra li[data-zona="tarjeta-de-obra"] a').getAttribute('href'),
      filas[0].href!,
    ).toBe(filas[1].href);
  });

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

  // Historia 30.1 — las acciones bajo la Atribución, y la tarjeta tras compartir (UX-DR114). Desde
  // la 30.2 van en la Fila de acciones: se mide la fila y los botones, no la isla de Copiar, que
  // dentro de la fila es `display: contents` y no tiene caja.
  test('las acciones bajo la Fuente: la fila a 32 px, Imagen a 16 px de Copiar —debajo o al lado—, compartir a 24 px, y la tarjeta detrás', async ({
    page,
  }) => {
    await abrir(page, completa);
    const medida = await page.evaluate(() => {
      const caja = (n: Element | null) => (n as HTMLElement).getBoundingClientRect();
      const fila = document.querySelector('main article > .fila-de-acciones')!;
      const compartir = document.querySelector('main .isla[data-compartir]')!;
      const anterior = fila.previousElementSibling!;
      const tarjeta = caja(document.querySelector('.tarjeta-de-obra'));
      const botonCopiar = caja(fila.querySelector('button.copiar'));
      const botonImagen = caja(fila.querySelector('.isla[data-imagen] button[data-abrir]'));
      const columna = caja(document.querySelector('main article'));
      return {
        anterior: anterior.matches('p.fuente'),
        fuenteAFila: caja(fila).top - caja(anterior).bottom,
        filaEnCopiar: Math.abs(caja(fila).top - botonCopiar.top),
        enFila: window.innerWidth >= 600,
        copiarAImagen: botonImagen.top - botonCopiar.bottom,
        alLado: botonImagen.left - botonCopiar.right,
        mismaAltura: Math.abs(botonImagen.top - botonCopiar.top),
        filaACompartir: caja(compartir).top - caja(fila).bottom,
        compartirATarjeta: tarjeta.top - caja(compartir).bottom,
        unidad: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unidad')),
        anchos: [botonCopiar.width, botonImagen.width],
        columna: columna.width,
      };
    });
    const dice = JSON.stringify(medida);
    expect(medida.anterior, dice).toBe(true);
    expect(Math.abs(medida.fuenteAFila - medida.unidad * 4), dice).toBeLessThanOrEqual(1);
    expect(medida.filaEnCopiar, dice).toBeLessThanOrEqual(1);
    if (medida.enFila) {
      expect(medida.mismaAltura, dice).toBeLessThanOrEqual(1);
      expect(Math.abs(medida.alLado - medida.unidad * 2), dice).toBeLessThanOrEqual(1);
    } else {
      expect(Math.abs(medida.copiarAImagen - medida.unidad * 2), dice).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(medida.filaACompartir - medida.unidad * 3), dice).toBeLessThanOrEqual(1);
    expect(medida.compartirATarjeta, dice).toBeGreaterThan(0);
    for (const ancho of medida.anchos) expect(ancho, dice).toBeLessThan(medida.columna);
  });

  test('sin Obra, Copiar sigue donde estaba: a 32 px de la Atribución o de la Línea de la Fuente', async ({ page }) => {
    const sinObra = citaSinObra();
    expect(sinObra, 'el Corpus no tiene ninguna Cita sin Obra').toBeDefined();
    await page.goto(`/cita/${sinObra!.slug}/`);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const medida = await page.evaluate(() => {
      const fila = document.querySelector('main article > .fila-de-acciones')!;
      const anterior = fila.previousElementSibling as HTMLElement;
      return {
        tarjetas: document.querySelectorAll('.tarjeta-de-obra').length,
        anterior: anterior.matches('figure, p.fuente'),
        hueco: fila.querySelector('button.copiar')!.getBoundingClientRect().top - anterior.getBoundingClientRect().bottom,
        unidad: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unidad')),
      };
    });
    expect(medida.tarjetas, JSON.stringify(medida)).toBe(0);
    expect(medida.anterior, JSON.stringify(medida)).toBe(true);
    expect(Math.abs(medida.hueco - medida.unidad * 4), JSON.stringify(medida)).toBeLessThanOrEqual(1);
  });
});

/**
 * Historia 30.2 — la Cita a su medida y las acciones en fila desde 600 px (FR-64, UX-DR114,
 * UX-DR115, UX-DR123).
 *
 * La medida de 34ch se resuelve en el cuerpo del texto de la Cita, no en el del contenedor; se
 * compara con una sonda «0» en la misma fuente y con `letter-spacing: 0`, porque el `ch` es el
 * avance del «0» sin el espaciado del tramo. La Cita en verso más larga entra aquí cuando la
 * Épica 29 llegue a la rama (deferred del spec).
 */
test.describe('Historia 30.2 — la Cita a su medida y la Fila de acciones', () => {
  const completa = ((c) => (c === undefined ? undefined : `/cita/${c.slug}/`))(citaConTarjetaCompleta());
  const TRAMOS = ['xl', 'lg', 'md', 'sm'] as const;
  const sinImagen = ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaSinImagen());
  const SIN_CITA_SIN_IMAGEN =
    'El Corpus de hoy no tiene ninguna Cita de más de MAX_CARACTERES_IMAGEN: la fila con Copiar solo la cubre el fixture SIN_IMAGEN de tests/unit/tarjeta-de-obra.test.ts.';
  const SIN_TRAMO_SM =
    'El Corpus de hoy no tiene ninguna Cita de tramo sm (más de 240 caracteres): la regla de .texto es la misma en todos los tramos, y la vigila tests/unit/tarjeta-de-obra.test.ts.';

  async function abrirEn(page: Page, ruta: string, ancho: number, alto: number) {
    await page.setViewportSize({ width: ancho, height: alto });
    const respuesta = await page.goto(ruta);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    return respuesta;
  }

  /** La medida resuelta del texto, 34 «0» en su fuente y su cuerpo, y las cajas de alrededor. */
  async function medirLaCita(page: Page) {
    return page.evaluate(() => {
      const texto = document.querySelector('blockquote.cita .texto') as HTMLElement;
      const estilo = getComputedStyle(texto);
      const cero = (de: HTMLElement) => {
        const sonda = document.createElement('span');
        sonda.textContent = '0';
        sonda.style.letterSpacing = '0';
        sonda.style.whiteSpace = 'nowrap';
        sonda.style.position = 'absolute';
        sonda.style.visibility = 'hidden';
        de.append(sonda);
        const ancho = sonda.getBoundingClientRect().width;
        sonda.remove();
        return ancho;
      };
      const bloque = document.querySelector('figure.bloque') as HTMLElement;
      const article = document.querySelector('main article')!.getBoundingClientRect();
      const contenedor = document.querySelector('main article') as HTMLElement;
      const deArticle = getComputedStyle(contenedor);
      const columna = contenedor.clientWidth - parseFloat(deArticle.paddingLeft) - parseFloat(deArticle.paddingRight);
      const caja = texto.getBoundingClientRect();
      return {
        tramo: texto.closest('blockquote')!.getAttribute('data-tramo'),
        cuerpo: parseFloat(estilo.fontSize),
        maxWidth: parseFloat(estilo.maxWidth),
        ceroDelTexto: cero(texto),
        ceroDelBloque: cero(bloque),
        maxDelBloque: getComputedStyle(bloque).maxWidth,
        caja: { left: caja.left, right: caja.right, width: caja.width },
        article: { left: article.left, right: article.right },
        columna,
      };
    });
  }

  for (const nombre of TRAMOS) {
    test(`a 1280 × 800, tramo ${nombre}: la medida es 34 «0» de su cuerpo y la caja cabe en la columna`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== 'escritorio', 'La medida de escritorio se toma una vez.');
      const slug = citaDeTramo(nombre);
      // El Corpus real no trae hoy Citas de más de 240 caracteres: el tramo sm se salta diciéndolo
      // (lo cubre el fixture de tests/unit/tarjeta-de-obra.test.ts); los otros tres son obligatorios.
      test.skip(nombre === 'sm' && slug === undefined, SIN_TRAMO_SM);
      expect(slug, `el Corpus no tiene ninguna Cita de tramo ${nombre}`).toBeDefined();
      const ruta = `/cita/${slug}/`;
      await abrirEn(page, ruta, 1280, 800);
      const m = await medirLaCita(page);
      const dice = `${ruta}: ${JSON.stringify(m)}`;
      expect(m.tramo, dice).toBe(nombre);
      expect(Math.abs(m.maxWidth - 34 * m.ceroDelTexto), dice).toBeLessThanOrEqual(1);
      expect(m.maxDelBloque, dice).toBe('none');
      expect(m.caja.right, dice).toBeLessThanOrEqual(m.article.right + 0.5);
      expect(m.caja.width, dice).toBeLessThanOrEqual(m.columna + 0.5);
      info.annotations.push({
        type: '30.2 a 1280 × 800',
        description: `${slug}: tramo ${nombre}, cuerpo ${m.cuerpo} px, max-width ${m.maxWidth.toFixed(1)} px, caja ${m.caja.width.toFixed(1)} px (columna ${m.columna} px)`,
      });
    });

    test(`a 360 × 640, tramo ${nombre}: la medida no ata, ni la nueva ni la de antes`, async ({ page }, info) => {
      test.skip(info.project.name !== 'movil', 'El criterio se enuncia sobre 360 × 640.');
      const slug = citaDeTramo(nombre);
      // El Corpus real no trae hoy Citas de más de 240 caracteres: el tramo sm se salta diciéndolo
      // (lo cubre el fixture de tests/unit/tarjeta-de-obra.test.ts); los otros tres son obligatorios.
      test.skip(nombre === 'sm' && slug === undefined, SIN_TRAMO_SM);
      expect(slug, `el Corpus no tiene ninguna Cita de tramo ${nombre}`).toBeDefined();
      const ruta = `/cita/${slug}/`;
      await abrirEn(page, ruta, 360, 640);
      const m = await medirLaCita(page);
      const dice = `${ruta}: ${JSON.stringify(m)}`;
      expect(m.maxWidth, dice).toBeGreaterThan(m.columna);
      expect(34 * m.ceroDelBloque, dice).toBeGreaterThan(m.columna);
      expect(Math.abs(m.caja.width - m.columna), dice).toBeLessThanOrEqual(0.5);
    });
  }

  /** Las cajas de los dos botones de la fila, y si la página desborda en horizontal. */
  async function medirLaFila(page: Page) {
    return page.evaluate(() => {
      const fila = document.querySelector('main article > .fila-de-acciones')!;
      const c = fila.querySelector('button.copiar')!.getBoundingClientRect();
      const i = fila.querySelector('.isla[data-imagen] button[data-abrir]')!.getBoundingClientRect();
      const article = document.querySelector('main article')!.getBoundingClientRect();
      const caja = (r: DOMRect) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width });
      return {
        copiar: caja(c),
        imagen: caja(i),
        article: caja(article),
        unidad: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unidad')),
        desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
  }

  for (const ancho of [360, 599, 600, 768, 1280]) {
    test(`a ${ancho} px: ${ancho >= 600 ? 'Copiar e Imagen en fila, a 16 px' : 'Imagen a 16 px bajo Copiar, cada uno a su ancho'}`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== 'escritorio', 'Los anchos se fijan a mano; se miden una vez.');
      expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
      await abrirEn(page, completa!, ancho, 800);
      const m = await medirLaFila(page);
      const dice = JSON.stringify(m);
      if (ancho >= 600) {
        expect(Math.abs(m.imagen.top - m.copiar.top), dice).toBeLessThanOrEqual(1);
        expect(Math.abs(m.imagen.left - m.copiar.right - m.unidad * 2), dice).toBeLessThanOrEqual(1);
      } else {
        expect(Math.abs(m.imagen.top - m.copiar.bottom - m.unidad * 2), dice).toBeLessThanOrEqual(1);
        expect(Math.abs(m.imagen.left - m.copiar.left), dice).toBeLessThanOrEqual(1);
      }
      for (const boton of [m.copiar, m.imagen]) {
        expect(boton.width, dice).toBeLessThan(m.article.width);
        expect(boton.right, dice).toBeLessThanOrEqual(m.article.right + 0.5);
      }
      expect(m.desborda, dice).toBe(false);
    });
  }

  for (const ancho of [600, 768]) {
    test(`a ${ancho} px con el texto al 200 %: sin solapes ni desplazamiento horizontal`, async ({ page }, info) => {
      test.skip(info.project.name !== 'escritorio', 'Los anchos se fijan a mano; se miden una vez.');
      expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
      await abrirEn(page, completa!, ancho, 800);
      const zoom = await page.evaluate(() => {
        document.documentElement.style.zoom = '2';
        return getComputedStyle(document.documentElement).zoom;
      });
      expect(zoom).toBe('2');
      const m = await medirLaFila(page);
      const dice = JSON.stringify(m);
      const solapan =
        m.imagen.left < m.copiar.right && m.copiar.left < m.imagen.right && m.imagen.top < m.copiar.bottom && m.copiar.top < m.imagen.bottom;
      expect(solapan, dice).toBe(false);
      // A 600 px los dos no caben en la columna con el texto al doble: Imagen baja a la línea
      // siguiente. A 768 px puede caber aún: en la misma línea dentro de la columna, o bajo Copiar.
      const baja = m.imagen.top >= m.copiar.bottom;
      const enLinea = Math.abs(m.imagen.top - m.copiar.top) <= 1 && m.imagen.right <= m.article.right + 0.5;
      if (ancho === 600) expect(baja, dice).toBe(true);
      else expect(enLinea || baja, dice).toBe(true);
      info.annotations.push({ type: '30.2 al 200 %', description: `${ancho} px: ${baja ? 'Imagen bajo Copiar' : 'en la misma línea'}` });
      expect(m.desborda, dice).toBe(false);
    });
  }

  /** Rechaza el portapapeles, pulsa Copiar y mide el respaldo frente a los botones de la fila. */
  async function respaldoBajoLaFila(page: Page, ruta: string, ancho?: number) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denegado')) },
      });
    });
    if (ancho === undefined) {
      await page.goto(ruta);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
    } else await abrirEn(page, ruta, ancho, 800);
    await page.locator('button.copiar').click();
    await expect(page.locator('.fila-de-acciones [data-respaldo]')).toBeVisible();
    return page.evaluate(() => {
      const fila = document.querySelector('main article > .fila-de-acciones')!;
      const r = fila.querySelector('[data-respaldo]')!;
      const botones = [...fila.querySelectorAll('button.copiar, .isla[data-imagen] button[data-abrir]')].map((b) =>
        b.getBoundingClientRect(),
      );
      const sonda = document.createElement('span');
      sonda.textContent = '0';
      sonda.style.position = 'absolute';
      sonda.style.letterSpacing = '0';
      r.append(sonda);
      const cero = sonda.getBoundingClientRect().width;
      sonda.remove();
      return {
        top: r.getBoundingClientRect().top,
        width: r.getBoundingClientRect().width,
        fondo: Math.max(...botones.map((b) => b.bottom)),
        prosa: 68 * cero,
        desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
  }

  test('si el portapapeles falla, el campo de copia manual aparece bajo la fila, en la medida de prosa', async ({ page }) => {
    expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
    const m = await respaldoBajoLaFila(page, completa!);
    expect(m.top, JSON.stringify(m)).toBeGreaterThanOrEqual(m.fondo);
    expect(m.width, JSON.stringify(m)).toBeLessThanOrEqual(m.prosa + 1);
  });

  // Donde los dos botones van en fila, el respaldo no puede quedar entre ellos.
  for (const ancho of [600, 768]) {
    test(`a ${ancho} px, con la fila en línea, el campo de copia manual baja bajo los dos botones`, async ({ page }, info) => {
      test.skip(info.project.name !== 'escritorio', 'Los anchos se fijan a mano; se miden una vez.');
      expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
      const m = await respaldoBajoLaFila(page, completa!, ancho);
      expect(m.top, JSON.stringify(m)).toBeGreaterThanOrEqual(m.fondo);
      expect(m.width, JSON.stringify(m)).toBeLessThanOrEqual(m.prosa + 1);
      expect(m.desborda, JSON.stringify(m)).toBe(false);
    });
  }

  // Desde 600 px Imagen va a la derecha de Copiar: si «Copiar la cita» → «Copiado.» encogiera el
  // botón, Imagen se correría bajo el puntero durante dos segundos. Copiar guarda su ancho.
  for (const ancho of [360, 600, 768, 1280]) {
    test(`a ${ancho} px, «Copiado.» no cambia el ancho de Copiar ni mueve Imagen`, async ({ page }, info) => {
      test.skip(info.project.name !== 'escritorio', 'Los anchos se fijan a mano; se miden una vez.');
      expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.resolve() },
        });
      });
      await abrirEn(page, completa!, ancho, 800);
      const antes = await medirLaFila(page);
      await page.locator('.fila-de-acciones button.copiar').click();
      await expect(page.locator('.fila-de-acciones button.copiar [data-etiqueta]')).toHaveText('Copiado.');
      const despues = await medirLaFila(page);
      const dice = JSON.stringify({ antes, despues });
      expect(Math.abs(despues.copiar.width - antes.copiar.width), dice).toBeLessThanOrEqual(0.5);
      expect(Math.abs(despues.imagen.left - antes.imagen.left), dice).toBeLessThanOrEqual(0.5);
      expect(Math.abs(despues.imagen.top - antes.imagen.top), dice).toBeLessThanOrEqual(0.5);
      // Y el nombre accesible sigue siendo el del rótulo: la reserva de ancho no se lee.
      await expect(page.locator('.fila-de-acciones button.copiar')).toHaveAccessibleName('Copiar la cita');
    });
  }

  // FR-10 — sin Acción Imagen la fila lleva solo Copiar, y «Compartir en» sigue a 3 × de ella.
  for (const ancho of [360, 1280]) {
    test(`a ${ancho} px, una Cita sin Imagen: la fila solo trae Copiar, sin hueco`, async ({ page }, info) => {
      test.skip(info.project.name !== 'escritorio', 'Los anchos se fijan a mano; se miden una vez.');
      test.skip(sinImagen === undefined, SIN_CITA_SIN_IMAGEN);
      await abrirEn(page, sinImagen!, ancho, 800);
      const m = await page.evaluate(() => {
        const fila = document.querySelector('main article > .fila-de-acciones') as HTMLElement;
        const copiar = fila.querySelector('button.copiar')!.getBoundingClientRect();
        const caja = fila.getBoundingClientRect();
        const compartir = fila.nextElementSibling as HTMLElement;
        return {
          botones: fila.querySelectorAll('button').length,
          imagen: fila.querySelectorAll('[data-imagen]').length,
          altoDeLaFila: caja.height,
          altoDeCopiar: copiar.height,
          compartir: compartir.hasAttribute('data-compartir'),
          aCompartir: compartir.getBoundingClientRect().top - caja.bottom,
          unidad: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--unidad')),
        };
      });
      const dice = `${sinImagen}: ${JSON.stringify(m)}`;
      expect(m.imagen, dice).toBe(0);
      expect(m.botones, dice).toBe(1);
      expect(Math.abs(m.altoDeLaFila - m.altoDeCopiar), dice).toBeLessThanOrEqual(1);
      expect(m.compartir, dice).toBe(true);
      expect(Math.abs(m.aCompartir - m.unidad * 3), dice).toBeLessThanOrEqual(1);
    });
  }

  // Es el mismo Bloque: la medida en el texto vale también en la Cita del Día de la portada y del 404.
  for (const ruta of ['/', '/una-ruta-que-no-existe-30-2/']) {
    test(`${ruta === '/' ? 'la portada' : 'el 404'} construido, a 1280 × 800: la medida en el texto, la Atribución en la de prosa`, async ({
      page,
    }, info) => {
      test.skip(info.project.name !== 'escritorio', 'La medida de escritorio se toma una vez.');
      const respuesta = await abrirEn(page, ruta, 1280, 800);
      // Que se mide la superficie que se dice: la portada responde 200 y el 404, 404.
      expect(respuesta?.status(), ruta).toBe(ruta === '/' ? 200 : 404);
      const m = await page.evaluate(() => {
        const cero = (de: HTMLElement) => {
          const sonda = document.createElement('span');
          sonda.textContent = '0';
          sonda.style.letterSpacing = '0';
          sonda.style.whiteSpace = 'nowrap';
          sonda.style.position = 'absolute';
          sonda.style.visibility = 'hidden';
          de.append(sonda);
          const ancho = sonda.getBoundingClientRect().width;
          sonda.remove();
          return ancho;
        };
        const texto = document.querySelector('main figure.bloque blockquote.cita .texto') as HTMLElement;
        const bloque = texto.closest('figure.bloque') as HTMLElement;
        const pie = bloque.querySelector('figcaption') as HTMLElement;
        return {
          maxDelTexto: parseFloat(getComputedStyle(texto).maxWidth),
          medida: 34 * cero(texto),
          maxDelBloque: getComputedStyle(bloque).maxWidth,
          maxDelPie: parseFloat(getComputedStyle(pie).maxWidth),
          prosa: 68 * cero(pie),
        };
      });
      const dice = `${ruta}: ${JSON.stringify(m)}`;
      expect(Math.abs(m.maxDelTexto - m.medida), dice).toBeLessThanOrEqual(1);
      expect(m.maxDelBloque, dice).toBe('none');
      expect(Math.abs(m.maxDelPie - m.prosa), dice).toBeLessThanOrEqual(1);
    });
  }

  test('«Compartir en» sigue en su bloque, dentro de la medida de prosa', async ({ page }, info) => {
    test.skip(info.project.name !== 'escritorio', 'La medida de escritorio se toma una vez.');
    expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
    await abrirEn(page, completa!, 1280, 800);
    const m = await page.evaluate(() => {
      const isla = document.querySelector('main article > .fila-de-acciones + [data-compartir]') as HTMLElement;
      const sonda = document.createElement('span');
      sonda.textContent = '0';
      sonda.style.position = 'absolute';
      sonda.style.letterSpacing = '0';
      isla.append(sonda);
      const cero = sonda.getBoundingClientRect().width;
      sonda.remove();
      const izquierda = isla.getBoundingClientRect().left;
      const visibles = [...isla.querySelectorAll('a, button')].filter((e) => (e as HTMLElement).offsetParent !== null);
      return {
        alcance: Math.max(...visibles.map((e) => e.getBoundingClientRect().right)) - izquierda,
        visibles: visibles.length,
        prosa: 68 * cero,
      };
    });
    expect(m.visibles, JSON.stringify(m)).toBeGreaterThan(0);
    expect(m.alcance, JSON.stringify(m)).toBeLessThanOrEqual(m.prosa + 1);
  });

  test('la Atribución y la Línea de la Fuente, en la medida de prosa', async ({ page }) => {
    expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
    await abrirEn(page, completa!, 1280, 800);
    const m = await page.evaluate(() =>
      ['figure.bloque figcaption', 'article > p.fuente'].map((selector) => {
        const n = document.querySelector(selector) as HTMLElement;
        const sonda = document.createElement('span');
        sonda.textContent = '0';
        sonda.style.position = 'absolute';
        sonda.style.letterSpacing = '0';
        n.append(sonda);
        const cero = sonda.getBoundingClientRect().width;
        sonda.remove();
        return { selector, ancho: n.getBoundingClientRect().width, maxWidth: parseFloat(getComputedStyle(n).maxWidth), prosa: 68 * cero };
      }),
    );
    for (const una of m) {
      expect(Math.abs(una.maxWidth - una.prosa), JSON.stringify(una)).toBeLessThanOrEqual(1);
      expect(una.ancho, JSON.stringify(una)).toBeLessThanOrEqual(una.prosa + 1);
    }
  });

  test('Copiar antes que Imagen al tabular, con los mismos nombres accesibles y sus regiones de estado', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'escritorio', 'El teclado se recorre una vez, en escritorio.');
    expect(completa, SIN_TARJETA_COMPLETA).toBeDefined();
    await page.goto(completa!);
    await page.locator('figure.bloque figcaption a').last().focus();
    const nombres: string[] = [];
    for (let i = 0; i < 20 && nombres.length < 2; i++) {
      await page.keyboard.press('Tab');
      const dentro = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a?.closest('.fila-de-acciones')) return null;
        return a.matches('button.copiar') ? 'copiar' : a.matches('.isla[data-imagen] button[data-abrir]') ? 'imagen' : 'otro';
      });
      if (dentro !== null) nombres.push(dentro);
    }
    expect(nombres).toEqual(['copiar', 'imagen']);
    await expect(page.getByRole('button', { name: 'Copiar la cita' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Descargar como imagen' })).toHaveCount(1);
    // Una región de estado por isla, en el marcado desde la carga: la de Copiar y la del diálogo.
    await expect(page.locator('.fila-de-acciones [role="status"]')).toHaveCount(2);
  });
});

/**
 * Historia 24.6 — al pie, más de la misma obra y más del Autor.
 *
 * Los tokens calculados del pie en la cara con los dos bloques, que va siempre tras las acciones,
 * y su alto a 360 × 640 anotado (la cifra que la 24.6 anota en el spec frente a la de la
 * principal). Los valores esperados salen de los tokens de la propia página.
 */
test.describe('Historia 24.6 — el pie de la Página de Cita', () => {
  const ruta = ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaConLosDosBloques());
  const SIN_DOS_BLOQUES = 'El Corpus no tiene ninguna Cita con «De la misma obra» y «Más de {Autor}».';

  async function abrir(page: Page) {
    expect(ruta, SIN_DOS_BLOQUES).toBeDefined();
    await page.goto(ruta!);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  }

  test('los tokens calculados del pie: márgenes, filetes, rótulos, listas y cierres', async ({ page }) => {
    await abrir(page);
    const medida = await page.evaluate(() => {
      const nav = document.querySelector('nav.salidas') as HTMLElement;
      const sonda = document.createElement('div');
      sonda.style.cssText =
        'width: var(--unidad); color: var(--tinta); background-color: var(--filete); border-top: var(--grosor-filete) solid; max-width: var(--medida-prosa)';
      // Hermana del pie, con su misma letra: `--medida-prosa` va en `ch` y depende de ella.
      nav.parentElement!.append(sonda);
      const t = getComputedStyle(sonda);
      const tokens = {
        unidad: parseFloat(t.width),
        tinta: t.color,
        filete: t.backgroundColor,
        grosor: t.borderTopWidth,
        medida: t.maxWidth,
        md: 0,
      };
      sonda.style.fontSize = 'var(--cuerpo-md)';
      tokens.md = parseFloat(getComputedStyle(sonda).fontSize);
      sonda.remove();
      const n = getComputedStyle(nav);
      const secciones = [...nav.querySelectorAll(':scope > section')] as HTMLElement[];
      return {
        tokens,
        ancho: window.innerWidth,
        nav: {
          margen: parseFloat(n.marginTop),
          relleno: parseFloat(n.paddingTop),
          filete: [n.borderTopWidth, n.borderTopStyle, n.borderTopColor],
          maximo: n.maxWidth,
        },
        entreGrupos: secciones.slice(1).map((sec) => parseFloat(getComputedStyle(sec).marginTop)),
        listas: [...nav.querySelectorAll('ul.tarjetas')].map((ul) => {
          const u = getComputedStyle(ul);
          const rotulo = ul.parentElement!.querySelector('.rotulo')!.getBoundingClientRect();
          return {
            hueco: Math.round(ul.getBoundingClientRect().top - rotulo.bottom),
            viñeta: u.listStyleType,
            relleno: u.paddingLeft,
            filete: [u.borderTopWidth, u.borderTopStyle, u.borderTopColor],
          };
        }),
        // Los Temas, si están: del rótulo a los chips, el mismo hueco que a las listas.
        chips: [...nav.querySelectorAll('.temas-de-la-cita ul.chips')].map((ul) => {
          const rotulo = ul.parentElement!.querySelector('.rotulo')!.getBoundingClientRect();
          return Math.round(ul.getBoundingClientRect().top - rotulo.bottom);
        }),
        cierres: [...nav.querySelectorAll('li.fila-de-bloque a')].map((a) => {
          const c = getComputedStyle(a);
          return { tamaño: parseFloat(c.fontSize), color: c.color, subrayado: c.textDecorationLine };
        }),
        islas: Math.max(...[...document.querySelectorAll('.isla')].map((i) => i.getBoundingClientRect().bottom)),
        arriba: nav.getBoundingClientRect().top,
      };
    });
    const { tokens: t } = medida;
    expect(medida.nav).toEqual({
      margen: t.unidad * (medida.ancho >= 600 ? 12 : 8),
      relleno: t.unidad * 3,
      filete: [t.grosor, 'solid', t.filete],
      maximo: t.medida,
    });
    expect(medida.entreGrupos.length).toBeGreaterThanOrEqual(1);
    for (const m of medida.entreGrupos) expect(m).toBe(t.unidad * 4);
    expect(medida.listas).toHaveLength(2);
    for (const l of medida.listas) {
      expect(l).toEqual({ hueco: t.unidad * 2, viñeta: 'none', relleno: '0px', filete: [t.grosor, 'solid', t.filete] });
    }
    for (const hueco of medida.chips) expect(hueco).toBe(t.unidad * 2);
    expect(medida.cierres).toHaveLength(2);
    for (const c of medida.cierres) expect(c).toEqual({ tamaño: t.md, color: t.tinta, subrayado: 'none' });
    expect(medida.arriba, 'el pie va por debajo de la última acción').toBeGreaterThanOrEqual(medida.islas);
  });

  test('a 360 × 640: alto de la página y del pie, anotados', async ({ page }, info) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await abrir(page);
    const { pagina, pie } = await page.evaluate(() => ({
      pagina: document.documentElement.scrollHeight,
      pie: document.querySelector('nav.salidas')!.getBoundingClientRect().height,
    }));
    expect(pie).toBeGreaterThan(0);
    info.annotations.push({
      type: '24.6 a 360',
      description: `${ruta}: página de ${pagina} px de alto; pie de ${Math.round(pie)} px`,
    });
  });
});
