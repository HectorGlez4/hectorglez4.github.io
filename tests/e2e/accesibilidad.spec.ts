import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CRITERIOS_QUE_AÑADE_WCAG_22,
  ETIQUETAS_DEL_BARRIDO,
  axeLaCorre,
  etiquetaDeAxe,
  superficiesDelBarrido,
  type CriterioDeWcag,
} from '../../src/lib/superficies.ts';
import { desviacionDelBarrido, reglasDeLaPagina, sinDecidir } from './ayuda/barrido.ts';

/**
 * Historia 2.8 — accesibilidad y comportamiento responsive.
 *
 * Historia 23.4 — el barrido se hace contra WCAG 2.2 AA, el suelo declarado (NFR-9). Las
 * etiquetas que se le piden a axe no se escriben aquí: las declara una vez
 * `ETIQUETAS_DEL_BARRIDO` en `src/lib/superficies.ts`, el mismo dueño que dice qué superficies
 * se barren, y `tests/unit/superficies.test.ts` falla si este fichero escribe su propia lista.
 * Y cada barrido comprueba en su resultado que corrió entero (`desviacionDelBarrido`): lo que
 * dice la llamada no basta, porque un barrido acotado sale en verde igual.
 */

const dist = join(new URL('../..', import.meta.url).pathname, 'dist');

/** Las rutas que el sitio construyó de verdad. */
function rutasConstruidas(): string[] {
  const rutas: string[] = [];

  function recorrer(dir: string, prefijo: string) {
    for (const entrada of readdirSync(dir)) {
      const completa = join(dir, entrada);
      if (statSync(completa).isDirectory()) {
        recorrer(completa, `${prefijo}/${entrada}`);
        continue;
      }
      if (!entrada.endsWith('.html')) continue;
      const sinExtension = entrada.replace(/\.html$/, '');
      rutas.push(sinExtension === 'index' ? `${prefijo}/` : `${prefijo}/${sinExtension}`);
    }
  }

  recorrer(dist, '');
  return rutas;
}

/**
 * Historia 12.1 — las superficies del barrido se **derivan**, no se escriben.
 *
 * Antes eran seis rutas a mano en esta constante: la cuarta lista de sitios donde se
 * declaraba qué es una superficie del sitio, y la que nadie recordaba tocar. Ahora salen
 * de cruzar la declaración única de `src/lib/superficies.ts` con las páginas que el build
 * generó, así que una superficie pública nueva entra en el barrido sola. El Kit queda
 * fuera porque su declaración dice que no es una superficie que nadie lea.
 *
 * Se lee `dist/` al cargar el fichero y no durante la prueba porque el barrido genera una
 * prueba por superficie. Playwright arranca su `webServer` —que construye el sitio— antes
 * de cargar los ficheros de prueba, así que lo que se lee aquí es el `dist/` recién
 * construido.
 */
const DERIVADAS = superficiesDelBarrido(rutasConstruidas());

/**
 * Historia 22.4 — cuatro Páginas de Obra además de la muestra derivada, sacadas también del
 * `dist/` construido y no escritas a mano: así el barrido no depende de qué Obras tenga hoy el
 * Corpus.
 *
 * La derivación toma una ruta por familia, y la Página de Obra tiene cuatro caras que no se
 * parecen entre sí en lo que se barre: la indexable, la que lleva `noindex` (la misma página,
 * que se barre igual: accesibilidad y móvil no dependen de que el buscador la quiera), la
 * página 2+ (sin Temas) y la del título más largo del Corpus, que es la que puede desbordar
 * los 360 px si la Cabecera deja de partir palabras.
 */
function obrasDelBarrido(): { indexable: string; noIndexable: string; segunda: string; tituloLargo: string } {
  const obras = rutasConstruidas()
    .filter((ruta) => ruta.startsWith('/obra/'))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((ruta) => {
      const html = readFileSync(join(dist, ...ruta.split('/').filter(Boolean), 'index.html'), 'utf8');
      return {
        ruta,
        segunda: /^\/obra\/[^/]+\/[^/]+\/\d+\/$/.test(ruta),
        noindex: /<meta name="robots" content="noindex/.test(html),
        titulo: /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? '',
      };
    });
  const primeras = obras.filter((o) => !o.segunda);
  const exigir = (ruta: string | undefined, cara: string) => {
    if (ruta === undefined) throw new Error(`El dist/ no trae ninguna Página de Obra ${cara}.`);
    return ruta;
  };
  return {
    indexable: exigir(primeras.find((o) => !o.noindex)?.ruta, 'indexable'),
    noIndexable: exigir(primeras.find((o) => o.noindex)?.ruta, 'con noindex'),
    segunda: exigir(obras.find((o) => o.segunda)?.ruta, 'de página 2+'),
    tituloLargo: exigir(
      [...primeras].sort((a, b) => b.titulo.length - a.titulo.length || a.ruta.localeCompare(b.ruta, 'es'))[0]
        ?.ruta,
      'con título',
    ),
  };
}

const OBRAS = obrasDelBarrido();
const OBRAS_DEL_BARRIDO = [OBRAS.indexable, OBRAS.noIndexable, OBRAS.segunda, OBRAS.tituloLargo];

const SUPERFICIES = [...new Set([...DERIVADAS, ...OBRAS_DEL_BARRIDO])];

test('las cuatro Páginas de Obra del barrido salen del dist/, cada una con su cara', () => {
  const noindex = (ruta: string) =>
    /<meta name="robots" content="noindex/.test(
      readFileSync(join(dist, ...ruta.split('/').filter(Boolean), 'index.html'), 'utf8'),
    );
  expect(noindex(OBRAS.indexable), 'la indexable').toBe(false);
  expect(noindex(OBRAS.noIndexable), 'la que no se indexa').toBe(true);
  expect(noindex(OBRAS.segunda), 'la página 2').toBe(true);
});

test('el título más largo parte en varias líneas a 360 px, sin desplazamiento horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(OBRAS.tituloLargo);
  // Se mide con la Inter del sitio y no con la de reserva, que es más estrecha y parte menos.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const medida = await page.evaluate(() => {
    const h1 = document.querySelector('h1') as HTMLElement;
    return {
      alto: h1.getBoundingClientRect().height,
      linea: parseFloat(getComputedStyle(h1).lineHeight),
      desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  /*
   * Varias líneas, sin un número fijo: con la Inter del sitio, a 320 px de texto, los dos
   * títulos más largos del Corpus de hoy (Alberdi, Ingenieros) salen en tres líneas de 32,5 px.
   * Lo que se vigila es que el título parta en vez de desbordar o encogerse, no cuántas líneas
   * le tocan a un texto concreto.
   */
  expect(medida.alto, OBRAS.tituloLargo).toBeGreaterThanOrEqual(medida.linea * 2 - 1);
  expect(medida.desborda, OBRAS.tituloLargo).toBe(false);
});

test('el barrido cubre las superficies del sitio y no el Kit', () => {
  // Sin esto, una derivación que devolviera la lista vacía dejaría el barrido entero sin
  // ejecutar y la suite seguiría en verde.
  //
  // Esta guarda corre exactamente cuando corre el barrido, que es su virtud, pero el CI
  // no ejecuta `npm run test:e2e`. Su gemela vive en
  // `tests/unit/publicable-y-alcanzable.test.ts`, que pasa por `superficiesDelBarrido` las
  // rutas de un sitio construido de verdad y exige una muestra por familia. Las dos, no
  // una: aquí se comprueba el `dist/` que se va a barrer; allí, que el CI se entere.
  expect(SUPERFICIES).toContain('/');
  expect(SUPERFICIES).toContain('/buscar');
  expect(SUPERFICIES).toContain('/404');
  expect(SUPERFICIES.some((r) => r.startsWith('/cita/'))).toBe(true);
  expect(SUPERFICIES.some((r) => r.startsWith('/autor/'))).toBe(true);
  expect(SUPERFICIES.some((r) => r.startsWith('/tema/'))).toBe(true);
  expect(SUPERFICIES).not.toContain('/kit');
});

test.describe('Historia 2.8, elevada por la 23.4 — WCAG 2.2 AA', () => {
  for (const ruta of SUPERFICIES) {
    test(`${ruta} pasa la auditoría automática`, async ({ page }) => {
      await page.goto(ruta);
      const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();

      const resumen = resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
      expect(resumen, `${ruta}\n${resumen.join('\n')}`).toEqual([]);
      // Historia 23.4 — y lo que no es violación tampoco se calla: el barrido corrió entero, y
      // axe decidió en cada nodo la regla con la que responde de 2.5.8.
      expect(await desviacionDelBarrido(page, resultado), `${ruta}: el barrido no corrió lo que pide`).toEqual({
        faltan: [],
        sobran: [],
      });
      const dudas = sinDecidir(resultado);
      expect(dudas, `${ruta}: axe no supo decidir\n${dudas.join('\n')}`).toEqual([]);
    });
  }
});

/**
 * Historia 23.4 — lo que añade WCAG 2.2 AA, criterio por criterio.
 *
 * Que el barrido pida la etiqueta de 2.2 AA no dice nada de los seis criterios que trae 2.2:
 * axe solo tiene regla para uno. El reparto —quién responde de cada criterio— lo declara
 * `CRITERIOS_QUE_AÑADE_WCAG_22` en `src/lib/superficies.ts`, y aquí cada criterio es una prueba
 * cuyo título lo enuncia, para que el informe de Playwright diga qué se comprobó y qué no sin
 * abrir ningún fichero. Cada una corre el barrido de verdad sobre la portada. La regla de un
 * criterio `axe` tiene que haber **aplicado** con su etiqueta —pasar o fallar en algún nodo; sin
 * aplicar no habría medido nada—. Y ninguna regla que axe corra puede llevar la etiqueta de un
 * criterio que se da por cumplido o que no aplica: no solo entre las que el barrido pide, sino
 * entre todas las que conoce la axe de la página, porque una regla de 3.2.6 llevaría la etiqueta
 * de 2.2 A, que el barrido no pide, y entre las ejecutadas no saldría nunca. Si un día axe añade
 * regla para 2.4.11, esto falla y pide reclasificarlo, en vez de seguir diciendo que nadie lo
 * mide mientras alguien ya lo mide. Las experimentales no cuentan (`axeLaCorre`): no corren.
 *
 * Su gemela de CI está en `tests/unit/superficies.test.ts`, contra `axe.getRules()`: el CI no
 * corre Playwright.
 */
function enunciado(criterio: CriterioDeWcag): string {
  const quien =
    criterio.comprueba === 'axe'
      ? `lo comprueba axe con ${criterio.regla}`
      : criterio.comprueba === 'ux'
        ? `no lo comprueba axe, lo da por cumplido la UX: ${criterio.motivo}`
        : `no aplica: ${criterio.motivo}`;
  return `${criterio.criterio} ${criterio.nombre} (${criterio.nivel}): ${quien}`;
}

/**
 * Dos enlaces de 30×30 px, el segundo desplazado 12 px sobre el primero: los dos se solapan y
 * ninguno llega a los 24 px de la 2.5.8 sin el otro. Es el caso que la v8 va a apilar —la fila
 * de bloque y el enlace de dentro, con el mismo destino—, y el que la 4.12 de axe daba por
 * violación aunque los dos lleven al mismo sitio.
 *
 * Se sirve bajo `baseURL` con `page.route`, y no con `setContent` sobre `about:blank`: sin una
 * URL base http axe no sabe resolver el destino de un enlace relativo (`getDestination` da
 * `null`) y marca los dos casos por igual, así que la prueba no distinguiría nada.
 */
function paginaDeSolape(destinoDelSegundo: string): string {
  const caja = 'display:block;width:30px;height:30px;position:absolute';
  return [
    '<!doctype html><html lang="es"><head><title>Solape</title></head><body><main>',
    `<a href="/x/" style="${caja};top:0;left:0">x</a>`,
    `<a href="${destinoDelSegundo}" style="${caja};top:12px;left:12px">y</a>`,
    '</main></body></html>',
  ].join('\n');
}

test.describe('Historia 23.4 — lo que añade WCAG 2.2 AA', () => {
  for (const criterio of CRITERIOS_QUE_AÑADE_WCAG_22) {
    test(enunciado(criterio), async ({ page }) => {
      await page.goto('/');
      const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
      const etiqueta = etiquetaDeAxe(criterio.criterio);

      if (criterio.comprueba === 'axe') {
        const aplicadas = [...resultado.passes, ...resultado.violations];
        expect(aplicadas.length, 'el barrido no aplicó ninguna regla').toBeGreaterThan(0);
        const conSuEtiqueta = aplicadas.filter((r) => r.tags.includes(etiqueta)).map((r) => r.id);
        expect(conSuEtiqueta, `${criterio.regla} no aplicó en la portada con la etiqueta ${etiqueta}`).toContain(
          criterio.regla,
        );
      } else {
        const conocidas = await reglasDeLaPagina(page);
        expect(conocidas.length, 'la axe de la página no conoce ninguna regla').toBeGreaterThan(0);
        const conSuEtiqueta = conocidas.filter((r) => axeLaCorre(r) && r.tags.includes(etiqueta)).map((r) => r.ruleId);
        expect(
          conSuEtiqueta,
          `axe ya tiene regla para ${criterio.criterio}: hay que reclasificarlo en CRITERIOS_QUE_AÑADE_WCAG_22`,
        ).toEqual([]);
      }
    });
  }

  for (const caso of [
    { destino: '/x/', cual: 'el mismo destino', violacion: false },
    { destino: '/y/', cual: 'otro destino', violacion: true },
  ]) {
    test(`dos enlaces solapados con ${caso.cual} ${caso.violacion ? 'dan' : 'no dan'} target-size`, async ({
      page,
      baseURL,
    }) => {
      const url = new URL('/__solape-de-la-23-4/', baseURL).href;
      await page.route(url, (ruta) =>
        ruta.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: paginaDeSolape(caso.destino) }),
      );
      await page.goto(url);

      // El barrido completo, como en las superficies, y de su resultado solo `target-size`.
      const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
      const deLaRegla = (lista: typeof resultado.passes) => lista.filter((r) => r.id === 'target-size');
      const violadas = deLaRegla(resultado.violations).flatMap((r) => r.nodes.map((n) => n.target.join(' ')));
      const pasadas = deLaRegla(resultado.passes).flatMap((r) => r.nodes.map((n) => n.target.join(' ')));

      if (caso.violacion) {
        // La regla está encendida y discrimina: da la violación, y en el primer enlace, que es
        // el que el segundo tapa; el segundo, entero a la vista, pasa.
        expect(violadas).toHaveLength(1);
        const primero = await page.locator(violadas[0]).evaluate((n) => n === document.querySelectorAll('a')[0]);
        expect(primero, `la violación cae en ${violadas[0]} y no en el primer enlace`).toBe(true);
        expect(pasadas).toHaveLength(1);
        const segundo = await page.locator(pasadas[0]).evaluate((n) => n === document.querySelectorAll('a')[1]);
        expect(segundo, `pasa ${pasadas[0]} y no el segundo enlace`).toBe(true);
      } else {
        expect(violadas, 'con la 4.12 de axe el mismo destino daba violación').toEqual([]);
        // Y no porque la regla no corriera: los dos enlaces pasan.
        expect(pasadas).toHaveLength(2);
      }
    });
  }
});

test.describe('Historia 2.8 — foco', () => {
  test('el foco es visible con anillo de 2px separado 2px', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
    await page.getByRole('button', { name: 'Copiar la cita' }).focus();

    const anillo = await page
      .getByRole('button', { name: 'Copiar la cita' })
      .evaluate((n) => {
        const s = getComputedStyle(n);
        return { ancho: s.outlineWidth, estilo: s.outlineStyle, separacion: s.outlineOffset };
      });

    expect(anillo.ancho).toBe('2px');
    expect(anillo.estilo).not.toBe('none');
    expect(anillo.separacion).toBe('2px');
  });

  /*
   * Historia 22.10 — esta prueba preguntaba `getComputedStyle(n, ':focus-visible')`, que no
   * resuelve pseudoclases de estado: devuelve el estilo de reposo y pasaba con el anillo
   * suprimido en el campo de búsqueda. Ahora se tabula de verdad —`:focus-visible` solo casa
   * cuando el foco llega por teclado— y se mira el estilo del elemento que tiene el foco.
   */
  test('el indicador de foco no está suprimido en ningún elemento', async ({ page }) => {
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      /*
       * Cada enfocable lleva una marca única antes de tabular: así se reconoce sin ambigüedad
       * cuándo el recorrido vuelve al primero, y el tope sale de cuántos hay, no de un número
       * escrito a mano que una página larga superaría sin que nadie lo notara.
       */
      const enfocables = await page.evaluate(() => {
        const candidatos = [
          ...document.querySelectorAll<HTMLElement>(
            'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
          ),
        ];
        candidatos.forEach((n, i) => n.setAttribute('data-barrido-de-foco', String(i)));
        return candidatos.length;
      });
      expect(enfocables, `${ruta}: no hay nada enfocable`).toBeGreaterThan(0);

      const suprimidos: string[] = [];
      let primero: string | null = null;
      let vuelta = false;
      // Cada enfocable una vez, más las paradas fuera del documento al dar la vuelta.
      for (let i = 0; i < enfocables + 3 && !vuelta; i += 1) {
        await page.keyboard.press('Tab');
        const foco = await page.evaluate(() => {
          const n = document.activeElement as HTMLElement | null;
          if (n === null || n === document.body || n === document.documentElement) return null;
          const s = getComputedStyle(n);
          return {
            marca: n.getAttribute('data-barrido-de-foco') ?? `sin marca: ${n.outerHTML.slice(0, 80)}`,
            descripcion: n.outerHTML.slice(0, 100),
            suprimido: s.outlineStyle === 'none' || s.outlineWidth === '0px',
          };
        });
        if (foco === null) continue;
        if (primero === null) primero = foco.marca;
        else if (foco.marca === primero) {
          vuelta = true;
          break;
        }
        if (foco.suprimido) suprimidos.push(foco.descripcion);
      }
      expect(vuelta, `${ruta}: el recorrido con el tabulador no dio la vuelta en ${enfocables + 3} pasos`).toBe(true);
      expect(suprimidos, ruta).toEqual([]);
    }
  });

  for (const ruta of ['/buscar/', '/una-ruta-que-no-existe/']) {
    test(`el campo de búsqueda de ${ruta} lleva el anillo de foco al llegar con el teclado`, async ({
      page,
    }) => {
      await page.goto(ruta);
      let alcanzado = false;
      for (let i = 0; i < 40 && !alcanzado; i += 1) {
        await page.keyboard.press('Tab');
        alcanzado = await page.evaluate(() => document.activeElement?.tagName === 'INPUT');
      }
      expect(alcanzado, `${ruta}: el campo no recibe el foco por teclado`).toBe(true);

      const anillo = await page.evaluate(() => {
        const s = getComputedStyle(document.activeElement!);
        return {
          ancho: s.outlineWidth,
          estilo: s.outlineStyle,
          separacion: s.outlineOffset,
          color: s.outlineColor,
          siena: getComputedStyle(document.documentElement).getPropertyValue('--siena').trim(),
        };
      });
      expect(anillo.estilo).toBe('solid');
      expect(anillo.ancho).toBe('2px');
      expect(anillo.separacion).toBe('2px');
      // El color, el del token: se compara resolviéndolo en el propio navegador.
      const sienaResuelto = await page.evaluate((valor) => {
        const prueba = document.createElement('span');
        prueba.style.color = valor;
        document.body.append(prueba);
        const color = getComputedStyle(prueba).color;
        prueba.remove();
        return color;
      }, anillo.siena);
      expect(anillo.color).toBe(sienaResuelto);
    });
  }

  test('en la Página de Cita el orden es contenido, acciones y después salidas', async ({
    page,
  }) => {
    /*
     * EXPERIENCE.md pide «contenido primero, acciones después, navegación al final».
     * Se comprueba dentro del contenido principal, que es donde la secuencia significa
     * algo. La cabecera queda fuera a propósito: moverla detrás del `main` en el marcado
     * para que se tabule al final desalinearía el orden visual del de foco, y eso es un
     * incumplimiento de WCAG 2.4.3 — arreglaría la letra del criterio rompiendo el
     * criterio de al lado. Para eso está el enlace de salto, que es lo primero que
     * recibe foco en toda la página.
     */
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');

    const orden = await page.evaluate(() => {
      const enfocables = [...document.querySelectorAll('main a, main button')];
      return enfocables.map((n) =>
        n.closest('nav') ? 'salida' : n.tagName === 'BUTTON' ? 'accion' : 'contenido',
      );
    });

    expect(orden.indexOf('accion')).toBeLessThan(orden.indexOf('salida'));
    // Y el enlace de atribución —contenido— va antes que la acción.
    expect(orden.indexOf('contenido')).toBeLessThan(orden.indexOf('accion'));
  });

  test('el enlace de salto es lo primero que recibe foco', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.className)).toContain('saltar');
  });

  test('todo el sitio se recorre con teclado', async ({ page }) => {
    await page.goto('/autor/antonio-machado/');
    const alcanzados = new Set<string>();

    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const actual = await page.evaluate(() => {
        const n = document.activeElement as HTMLElement | null;
        return n && n !== document.body ? `${n.tagName}:${n.textContent?.trim().slice(0, 20)}` : '';
      });
      if (actual) alcanzados.add(actual);
    }

    expect(alcanzados.size).toBeGreaterThan(5);
  });
});

test.describe('Historia 2.8 — semántica', () => {
  test('un único h1 en cada superficie', async ({ page }) => {
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      await expect(page.locator('h1'), ruta).toHaveCount(1);
    }
  });

  test('los listados son listas reales', async ({ page }) => {
    for (const ruta of ['/autor/antonio-machado', '/tema/la-vida', '/']) {
      await page.goto(ruta);
      const sueltos = await page.evaluate(
        () => [...document.querySelectorAll('li')].filter((n) => !n.closest('ul, ol')).length,
      );
      expect(sueltos, ruta).toBe(0);
      expect(await page.locator('ul').count(), ruta).toBeGreaterThan(0);
    }
  });

  test('la Cita se marca como cita con su atribución asociada', async ({ page }) => {
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
    await expect(page.locator('figure > blockquote')).toHaveCount(1);
    await expect(page.locator('figure > figcaption')).toHaveCount(1);
  });
});

test.describe('Historia 2.8 — responsive', () => {
  test('en 360px no hay desplazamiento horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborda, ruta).toBe(false);
    }
  });

  test('las zonas de toque miden 44px con 8px de separación', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/cita/antonio-machado-hoy-es-siempre-todavia/');

    const cajas = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button')]
        .filter((n) => {
          /*
           * La exención en línea de EXPERIENCE.md § Interaction Primitives: queda fuera el
           * objetivo que va dentro de una frase y cuya altura fija el interlineado del
           * texto que lo rodea. Es la excepción que trae el propio criterio de WCAG —la
           * 2.5.5 y la 2.5.8 la tienen las dos—, y sin ella un enlace de procedencia a
           * mitad de oración solo podría cumplir saliéndose de la frase.
           *
           * Se reconoce por las dos condiciones a la vez, y la segunda importa: un enlace
           * en línea que fuese **todo** el párrafo no está dentro de una frase, nada le
           * constriñe la altura y sigue debiendo sus 44px.
           */
          const enLinea = getComputedStyle(n).display === 'inline';
          const padre = n.parentElement;
          const acompanado =
            padre !== null &&
            (padre.textContent ?? '').trim().length > (n.textContent ?? '').trim().length;
          return !(enLinea && acompanado);
        })
        // Solo los listados de bloque con filete entre filas: las Citas hermanas.
        .map((n) => ({ r: n.getBoundingClientRect(), lista: n.closest('.hermanas') }))
        .filter(({ r }) => r.width > 0 && r.height > 0)
        .map(({ r, lista }) => ({
          arriba: r.top,
          abajo: r.bottom,
          izq: r.left,
          der: r.right,
          alto: r.height,
          // El listado al que pertenece, para reconocer las filas apiladas de un enlace de bloque.
          lista: lista === null ? -1 : [...document.querySelectorAll('.hermanas')].indexOf(lista),
        })),
    );

    for (const caja of cajas) expect(caja.alto).toBeGreaterThanOrEqual(44);

    /*
     * Y entre dos zonas vecinas quedan 8px. Antes solo se pedía que no se solapasen, y el
     * comentario prometía los 8px sin medirlos (Historia 22.10). El hueco es por eje: dos
     * cajas quedan separadas por el eje en el que no se cruzan.
     *
     * Las filas de las Citas hermanas —`.hermanas`, con el ancho entero de la columna y el
     * filete entre una y otra, el único separador del sistema— no se miden entre sí: son
     * enlaces de bloque de `EXPERIENCE.md` y su separación es el filete, no un hueco. Basta
     * con que no se solapen. La exención se nombra por selector, no por «cualquier lista»,
     * para que una botonera en `ul` no se cuele por ella.
     */
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        const a = cajas[i];
        const b = cajas[j];
        const filasDeUnListado =
          a.lista !== -1 &&
          a.lista === b.lista &&
          Math.abs(a.izq - b.izq) <= 1 &&
          Math.abs(a.der - b.der) <= 1;
        if (filasDeUnListado) {
          expect(a.abajo <= b.arriba || b.abajo <= a.arriba, JSON.stringify([a, b])).toBe(true);
          continue;
        }
        const vertical = Math.max(a.arriba - b.abajo, b.arriba - a.abajo);
        const horizontal = Math.max(a.izq - b.der, b.izq - a.der);
        // Medio píxel de holgura por el redondeo subpíxel del navegador.
        expect(Math.max(vertical, horizontal), JSON.stringify([a, b])).toBeGreaterThanOrEqual(7.5);
      }
    }
  });

  /*
   * Historia 22.10 — la prueba de arriba solo pedía que las cajas no se solapasen; los 8px de
   * `{spacing.unit}` entre zonas vecinas no los medía nadie, y los números de la Paginación
   * iban a 4px. Se mide en el listado de Autor con más páginas del `dist/`, a 360 px, con el
   * hueco por eje: dos cajas vecinas quedan separadas al menos 8px en el eje que las separa.
   */
  test('los números de la Paginación quedan a 8px entre zonas de toque, en la fila y entre filas', async ({
    page,
  }) => {
    const autores = readdirSync(join(dist, 'autor'))
      .map((slug) => ({
        slug,
        paginas: readdirSync(join(dist, 'autor', slug)).filter((e) => /^\d+$/.test(e)).length,
      }))
      .sort((a, b) => b.paginas - a.paginas || a.slug.localeCompare(b.slug, 'es'));
    expect(autores[0]?.paginas ?? 0, 'ningún Autor del dist/ tiene más de una página').toBeGreaterThan(0);

    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`/autor/${autores[0].slug}/`);

    const cajas = await page.evaluate(() =>
      [...document.querySelectorAll('.numeros > li > *')].map((n) => {
        const r = n.getBoundingClientRect();
        return { arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right, alto: r.height, ancho: r.width };
      }),
    );
    expect(cajas.length).toBeGreaterThan(1);
    // Sin dos filas, la separación entre filas no se mediría: el listado más largo a 360 px
    // tiene que envolver, o esta prueba no prueba lo que dice.
    const filas = new Set(cajas.map((c) => Math.round(c.arriba))).size;
    expect(filas, 'los números de la Paginación no envuelven a 360 px').toBeGreaterThanOrEqual(2);

    for (const caja of cajas) {
      expect(caja.alto).toBeGreaterThanOrEqual(44);
      expect(caja.ancho).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        const a = cajas[i];
        const b = cajas[j];
        const vertical = Math.max(a.arriba - b.abajo, b.arriba - a.abajo);
        const horizontal = Math.max(a.izq - b.der, b.izq - a.der);
        // Medio píxel de holgura por el redondeo subpíxel del navegador.
        expect(Math.max(vertical, horizontal), `números ${i + 1} y ${j + 1}`).toBeGreaterThanOrEqual(7.5);
      }
    }

    // Y el `span` oculto de dentro del enlace no hereda la zona de toque.
    const oculto = await page.evaluate(() => {
      const n = document.querySelector('.numeros a .oculto');
      return n === null ? null : n.getBoundingClientRect().width;
    });
    expect(oculto).not.toBeNull();
    expect(oculto!).toBeLessThanOrEqual(1);
  });

  test('el ancho extra de escritorio es margen y no contenido nuevo', async ({ page }) => {
    const bloques = async (ancho: number) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');
      return page.evaluate(() => document.querySelectorAll('main *').length);
    };

    const enTablet = await bloques(768);
    const enEscritorio = await bloques(1440);

    // Ni una columna lateral ni un bloque de más: exactamente los mismos elementos.
    expect(enEscritorio).toBe(enTablet);
  });

  test('con zoom al 200 % no se pierde contenido ni aparece desplazamiento horizontal', async ({
    page,
  }) => {
    // Zoom del navegador al 200 % equivale a la mitad de ancho de ventana gráfica.
    await page.setViewportSize({ width: 640, height: 512 });
    await page.goto('/cita/miguel-de-cervantes-la-libertad-sancho-es-uno-de-los/');

    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);

    // El contenido sigue estando: no se ha ocultado nada para que quepa.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.autor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar la cita' })).toBeVisible();
  });
});

test.describe('Historia 2.8 — sin muro de entrada ni movimiento impuesto', () => {
  test('ninguna superficie muestra modal, aviso ni invitación antes del contenido', async ({
    page,
  }) => {
    for (const ruta of SUPERFICIES) {
      await page.goto(ruta);
      expect(await page.locator('dialog[open], [role="dialog"], [role="alertdialog"]').count(), ruta).toBe(0);

      // Ni nada fijo que tape el contenido al cargar.
      const tapando = await page.evaluate(() =>
        [...document.querySelectorAll('body *')].filter((n) => {
          const s = getComputedStyle(n);
          return (
            (s.position === 'fixed' || s.position === 'sticky') &&
            s.display !== 'none' &&
            n.getBoundingClientRect().height > 100
          );
        }).length,
      );
      expect(tapando, ruta).toBe(0);
    }
  });

  test('con movimiento reducido no se ejecuta ninguna transición', async ({ browser }) => {
    const contexto = await browser.newContext({ reducedMotion: 'reduce' });
    const pagina = await contexto.newPage();
    await pagina.goto('http://localhost:4321/cita/antonio-machado-hoy-es-siempre-todavia');

    const conTransicion = await pagina.evaluate(() =>
      [...document.querySelectorAll('body *')].filter((n) => {
        const s = getComputedStyle(n);
        return s.transitionDuration !== '0s' || s.animationDuration !== '0s';
      }).length,
    );
    expect(conTransicion).toBe(0);
    await contexto.close();
  });

  test('sin movimiento reducido, las transiciones no pasan de 150 ms', async ({ page }) => {
    await page.goto('/cita/antonio-machado-hoy-es-siempre-todavia/');
    const duraciones = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .flatMap((n) => getComputedStyle(n).transitionDuration.split(', '))
        .filter((d) => d !== '0s')
        .map((d) => (d.endsWith('ms') ? Number.parseFloat(d) : Number.parseFloat(d) * 1000)),
    );
    for (const duracion of duraciones) expect(duracion).toBeLessThanOrEqual(150);
  });
});

test.describe('Historia 22.10 — subrayado y pestaña nueva', () => {
  test('«Buscar» de la cabecera y los enlaces del pie van subrayados sin pasar el cursor', async ({
    page,
  }) => {
    // UX-DR52: no son enlaces de bloque de la lista cerrada, y en móvil no hay cursor.
    await page.goto('/');
    const enlaces = page.locator('header a.buscar, footer nav a');
    expect(await enlaces.count()).toBeGreaterThan(1);
    const sinSubrayar = await enlaces.evaluateAll((ns) =>
      ns
        .filter((n) => !getComputedStyle(n).textDecorationLine.includes('underline'))
        .map((n) => n.textContent?.trim()),
    );
    expect(sinSubrayar).toEqual([]);
  });

  test('las cuentas sociales del pie abren en la misma pestaña y conservan rel="me"', async ({
    page,
  }) => {
    await page.goto('/');
    const cuentas = page.locator('footer nav a[rel~="me"]');
    expect(await cuentas.count()).toBeGreaterThan(0);
    // Solo las cuentas: si un día el pie aloja un enlace que entrega algo a un tercero
    // —donar, comprar—, ese sí abriría pestaña nueva.
    expect(await cuentas.evaluateAll((ns) => ns.filter((n) => n.hasAttribute('target')).length)).toBe(0);
  });
});
