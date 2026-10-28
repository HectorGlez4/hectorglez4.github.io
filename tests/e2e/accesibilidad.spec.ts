import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
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
import { desviacionDelBarrido, reglasDeLaPagina, sinDecidir, versionesDeAxe } from './ayuda/barrido.ts';
import {
  SIN_TARJETA_COMPLETA,
  citaConLosDosBloques,
  citaConTarjetaCompleta,
  citaSinMasDelAutor,
  citaSinMismaObra,
  citaConTituloDeObraMasLargo,
  citaDeObraSinCotejar,
  citaSinObra,
  citasDeObraDeUnaCita,
} from './ayuda/corpus.ts';
import { leerTarjetaDeObra, tarjetaDeObraDe } from '../unit/ayuda/tarjeta-de-obra.js';

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

/**
 * Historia 24.4 — cuatro Páginas de Cita además de la muestra derivada, sacadas del Corpus con
 * los mismos ayudantes que las demás pruebas y nunca fijadas a mano: la de la tarjeta completa
 * (Línea de la Fuente, tarjeta con «Ver la obra y dónde leerla ›», Copiar e Imagen), la de una
 * Cita sin Obra (sin tarjeta), la de una Obra sin cotejar («Ver la obra ›») y la del título de
 * Obra más largo, que es la que puede desbordar la columna. Las dos primeras son obligatorias
 * —si el Corpus de hoy no las tiene, fallan las pruebas que las piden, nombrando la que falta, y
 * no el fichero entero al cargarse—; las otras dos entran si el Corpus las tiene, y la prueba de
 * abajo nombra la que falte.
 */
const CITAS_24_4 = {
  completa: ((c) => (c === undefined ? undefined : `/cita/${c.slug}/`))(citaConTarjetaCompleta()),
  sinObra: ((c) => (c === undefined ? undefined : `/cita/${c.slug}/`))(citaSinObra()),
  sinCotejar: ((c) => (c === undefined ? undefined : `/cita/${c.slug}/`))(citaDeObraSinCotejar()),
  tituloLargo: ((c) => (c === undefined ? undefined : { ruta: `/cita/${c.slug}/`, titulo: c.titulo }))(
    citaConTituloDeObraMasLargo(),
  ),
};
const SIN_CITA_SIN_OBRA = 'El Corpus no tiene ninguna Cita sin Obra: no hay cara sin tarjeta que barrer.';
/**
 * Historia 24.6 — las tres caras del pie: con «De la misma obra» y «Más de {Autor}», solo con «Más
 * de» (una Obra de dos) y solo con «De la misma obra» (un Autor que es todo una Obra). Las dos
 * primeras son obligatorias; la tercera entra si el Corpus la tiene, y la prueba la nombra si no.
 */
const CITAS_24_6 = {
  dosBloques: ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaConLosDosBloques()),
  sinMismaObra: ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaSinMismaObra()),
  sinMasDelAutor: ((s) => (s === undefined ? undefined : `/cita/${s}/`))(citaSinMasDelAutor()),
};
const SIN_DOS_BLOQUES =
  'El Corpus no tiene ninguna Cita de una Obra de 4 o más cuyo Autor tenga Citas fuera de ella: no hay pie con los dos bloques.';
const SIN_MISMA_OBRA = 'El Corpus no tiene ninguna Cita de una Obra de dos cuyo Autor tenga Citas fuera de ella.';
/** La ruta de una cara obligatoria, o el fallo de la prueba que la pide, con su motivo. */
function obligatoria(ruta: string | undefined, motivo: string): string {
  expect(ruta, motivo).toBeDefined();
  return ruta!;
}
const CITAS_DEL_BARRIDO = [
  CITAS_24_4.completa,
  CITAS_24_4.sinObra,
  CITAS_24_4.sinCotejar,
  CITAS_24_4.tituloLargo?.ruta,
  CITAS_24_6.dosBloques,
  CITAS_24_6.sinMismaObra,
  CITAS_24_6.sinMasDelAutor,
].filter((ruta): ruta is string => ruta !== undefined);

/** Una ruta sin su barra final: la muestra derivada las da sin ella, y las de arriba con ella. */
const sinBarra = (ruta: string) => (ruta.length > 1 ? ruta.replace(/\/$/, '') : ruta);
/** Sin repetir una página por escribirse con barra final y sin ella: axe la barrería dos veces. */
const SUPERFICIES = [...DERIVADAS, ...OBRAS_DEL_BARRIDO, ...CITAS_DEL_BARRIDO].filter(
  (ruta, i, todas) => todas.findIndex((otra) => sinBarra(otra) === sinBarra(ruta)) === i,
);

/** El HTML construido de una ruta con barra final. */
const construida = (ruta: string) => readFileSync(join(dist, ...ruta.split('/').filter(Boolean), 'index.html'), 'utf8');

test('24.4 — las Páginas de Cita del barrido salen del Corpus, cada una con su cara', () => {
  const rutaCompleta = obligatoria(CITAS_24_4.completa, SIN_TARJETA_COMPLETA);
  const rutaSinObra = obligatoria(CITAS_24_4.sinObra, SIN_CITA_SIN_OBRA);
  const completa = construida(rutaCompleta);
  expect(completa, rutaCompleta).toContain('<p class="fuente"');
  expect(tarjetaDeObraDe(completa), rutaCompleta).toMatch(/>Ver la obra y dónde leerla<span aria-hidden="true"[^>]*>&nbsp;›<\/span>/);
  const sinObra = construida(rutaSinObra);
  // Por el lector de la tarjeta y no por el nombre de su clase en el HTML crudo, que una hoja
  // puesta en línea traería aunque no haya tarjeta.
  expect(tarjetaDeObraDe(sinObra), rutaSinObra).toBeUndefined();
  expect(sinObra, rutaSinObra).not.toContain('>De la obra<');
  if (CITAS_24_4.sinCotejar === undefined) {
    test.info().annotations.push({ type: 'cara sin barrer', description: 'el Corpus no tiene ninguna Obra sin cotejar' });
  } else {
    const tarjeta = tarjetaDeObraDe(construida(CITAS_24_4.sinCotejar));
    expect(tarjeta, CITAS_24_4.sinCotejar).toMatch(/>Ver la obra<span aria-hidden="true"[^>]*>&nbsp;›<\/span>/);
    expect(tarjeta, CITAS_24_4.sinCotejar).not.toContain('dónde leerla');
  }
  if (CITAS_24_4.tituloLargo === undefined) {
    test.info().annotations.push({ type: 'cara sin barrer', description: 'el Corpus no tiene ninguna Cita con Obra' });
  } else {
    const { ruta, titulo } = CITAS_24_4.tituloLargo;
    const tarjeta = tarjetaDeObraDe(construida(ruta));
    expect(tarjeta, ruta).toBeDefined();
    expect(leerTarjetaDeObra(tarjeta!).titulo?.texto, ruta).toBe(titulo);
  }
  for (const ruta of CITAS_DEL_BARRIDO) expect(SUPERFICIES.map(sinBarra), ruta).toContain(sinBarra(ruta));
});

test('24.6 — las caras del pie del barrido salen del Corpus, cada una con sus grupos', () => {
  const dos = construida(obligatoria(CITAS_24_6.dosBloques, SIN_DOS_BLOQUES));
  expect(dos).toContain('<section class="de-la-misma-obra"');
  expect(dos).toContain('<section class="mas-del-autor"');
  const sinMisma = construida(obligatoria(CITAS_24_6.sinMismaObra, SIN_MISMA_OBRA));
  expect(sinMisma).not.toContain('<section class="de-la-misma-obra"');
  expect(sinMisma).toContain('<section class="mas-del-autor"');
  if (CITAS_24_6.sinMasDelAutor === undefined) {
    test.info().annotations.push({
      type: 'cara sin barrer',
      description: 'el Corpus no tiene ningún Autor con todas sus Citas en una Obra de 4 o más',
    });
  } else {
    const sinMas = construida(CITAS_24_6.sinMasDelAutor);
    expect(sinMas, CITAS_24_6.sinMasDelAutor).toContain('<section class="de-la-misma-obra"');
    expect(sinMas, CITAS_24_6.sinMasDelAutor).not.toContain('<section class="mas-del-autor"');
  }
  for (const ruta of [CITAS_24_6.dosBloques, CITAS_24_6.sinMismaObra, CITAS_24_6.sinMasDelAutor]) {
    if (ruta !== undefined) expect(SUPERFICIES.map(sinBarra), ruta).toContain(sinBarra(ruta));
  }
});

test('24.4 — a 320 px el título de Obra más largo de la tarjeta parte en varias líneas, sin desplazamiento', async ({
  page,
}) => {
  test.skip(CITAS_24_4.tituloLargo === undefined, 'el Corpus no tiene ninguna Cita con Obra');
  const { ruta } = CITAS_24_4.tituloLargo!;
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(ruta);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const medida = await page.evaluate(() => {
    const titulo = document.querySelector('.tarjeta-de-obra .titulo') as HTMLElement;
    // Todas las filas: desde la 24.5 puede ir «Siguiente…» encima de «Ver la obra».
    const filas = [...document.querySelectorAll('.tarjeta-de-obra .fila-de-bloque a')] as HTMLElement[];
    return {
      alto: titulo.getBoundingClientRect().height,
      linea: parseFloat(getComputedStyle(titulo).lineHeight),
      filaDentro:
        filas.length > 0 &&
        filas.every((fila) => fila.getBoundingClientRect().right <= document.documentElement.clientWidth + 0.5),
      desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  test.info().annotations.push({ type: 'alto del título a 320 px', description: `${medida.alto} px (${medida.linea} px por línea)` });
  expect(medida.alto, ruta).toBeGreaterThanOrEqual(medida.linea * 2 - 1);
  expect(medida.filaDentro, ruta).toBe(true);
  expect(medida.desborda, ruta).toBe(false);
});

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
 * Con el segundo fuera del orden de tabulación (`tabindex="-1"`), axe no sabe si ese vecino es un
 * objetivo y deja el primero **sin decidir**: es la página con la que se ve que `sinDecidir`
 * encuentra lo que dice buscar.
 *
 * Se sirve bajo `baseURL` con `page.route`, y no con `setContent` sobre `about:blank`: sin una
 * URL base http axe no sabe resolver el destino de un enlace relativo (`getDestination` da
 * `null`) y marca los dos casos por igual, así que la prueba no distinguiría nada.
 */
function paginaDeSolape(destinoDelSegundo: string, segundoFueraDelTabulador = false): string {
  const caja = 'display:block;width:30px;height:30px;position:absolute';
  const tabulador = segundoFueraDelTabulador ? ' tabindex="-1"' : '';
  return [
    '<!doctype html><html lang="es"><head><title>Solape</title></head><body><main>',
    `<a href="/x/" style="${caja};top:0;left:0">x</a>`,
    `<a href="${destinoDelSegundo}"${tabulador} style="${caja};top:12px;left:12px">y</a>`,
    '</main></body></html>',
  ].join('\n');
}

/** Sirve una página inventada bajo `baseURL` y navega a ella. */
async function servir(page: Page, baseURL: string | undefined, ruta: string, cuerpo: string): Promise<void> {
  const url = new URL(ruta, baseURL).href;
  await page.route(url, (peticion) =>
    peticion.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: cuerpo }),
  );
  await page.goto(url);
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
      await servir(page, baseURL, '/__solape-de-la-23-4/', paginaDeSolape(caso.destino));

      // El barrido completo, como en las superficies, y de su resultado solo `target-size`.
      const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
      // Y con la axe que se comprobó: la que inyecta el adaptador es la de la raíz, que Vitest fija.
      // Un `node_modules` viejo con otra axe anidada bajo el adaptador se ve aquí y no en el lock.
      const versiones = await versionesDeAxe(page);
      expect(versiones.pagina, 'la axe que inyecta el adaptador no es la de axe-core en la raíz').toBe(
        versiones.raiz,
      );
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

  /*
   * Las dos comprobaciones que cada barrido hace de sí mismo (`ayuda/barrido.ts`) solo se ven en
   * verde sobre el sitio, y una comprobación que solo se ha visto en verde no se sabe si mira algo.
   * Aquí se las ve encontrar lo que dicen buscar: una duda de `target-size` de verdad, y un
   * resultado al que le falta una regla o le sobra otra —recortado a mano, no con `.include(` ni
   * `.withRules(`, que la guardia de Vitest prohíbe en este directorio—.
   */
  test('lo que axe deja sin decidir de target-size y lo que un barrido no corrió se ven en el resultado', async ({
    page,
    baseURL,
  }) => {
    await servir(page, baseURL, '/__duda-de-la-23-4/', paginaDeSolape('/z/', true));
    const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();

    expect(sinDecidir(resultado), 'el primer enlace, tapado por un vecino fuera del tabulador').toEqual([
      'target-size: a[href="/x/"]',
    ]);

    expect(await desviacionDelBarrido(page, resultado), 'el barrido entero').toEqual({ faltan: [], sobran: [] });
    const sinLaRegla = <T extends { id: string }>(lista: T[]) => lista.filter((r) => r.id !== 'target-size');
    const recortado = {
      ...resultado,
      passes: sinLaRegla(resultado.passes),
      violations: sinLaRegla(resultado.violations),
      incomplete: sinLaRegla(resultado.incomplete),
      inapplicable: sinLaRegla(resultado.inapplicable),
    };
    expect(await desviacionDelBarrido(page, recortado), 'sin target-size').toEqual({
      faltan: ['target-size'],
      sobran: [],
    });
    const [modelo] = resultado.inapplicable;
    if (modelo === undefined) throw new Error('el barrido no dejó ninguna regla sin aplicar que copiar');
    const conOtra = { ...resultado, inapplicable: [...resultado.inapplicable, { ...modelo, id: 'regla-inventada' }] };
    expect(await desviacionDelBarrido(page, conOtra), 'con una regla que no se pidió').toEqual({
      faltan: [],
      sobran: ['regla-inventada'],
    });
  });
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
    /*
     * Historia 26.4 — es una prueba de barrido, como la de alcance de `seo.spec.ts`: tabula cada
     * enfocable de cada superficie, y `/obras/` trae unos 700 (cada Obra publicada, cada Autor con
     * Obras, las letras y sus «Volver»). Medido el 2026-10-28: unos 10 s antes de `/obras/`, 29,4 s
     * en escritorio y más de 30 en móvil con ella. `test.slow()` triplica el presupuesto de ésta y
     * solo de ésta; no toca ningún umbral del producto ni lo que se comprueba. Se revierte borrando
     * la línea. `/obras/` crece con cada Obra: si esta prueba vuelve a agotar el tiempo, es el
     * mismo crecimiento que vigila `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS` (`src/lib/umbrales.ts`), y
     * paginar `/obras/` lo decide Héctor —no se sube el presupuesto otra vez sin decirlo—.
     */
    test.slow();
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

  /*
   * EXPERIENCE.md pide «contenido primero, acciones después, navegación al final», y la v8 mete
   * la Tarjeta de Obra entre el contenido y las acciones (Historia 24.4, enmienda de la 2.8). Se
   * comprueba dentro del contenido principal, que es donde la secuencia significa algo. La
   * cabecera queda fuera a propósito: moverla detrás del `main` en el marcado para que se
   * tabule al final desalinearía el orden visual del de foco, y eso es un incumplimiento de
   * WCAG 2.4.3 — arreglaría la letra del criterio rompiendo el criterio de al lado. Para eso
   * está el enlace de salto, que es lo primero que recibe foco en toda la página.
   *
   * Con Tab de verdad, desde el enlace del Autor hasta el primer enlace de las salidas: cada
   * parada se clasifica por dónde está —`figcaption` o `.fuente` es contenido, `.tarjeta-de-obra`
   * es tarjeta, `.isla` es acción y `nav` es salida— y cualquier otra es un fallo.
   */
  async function paradasDesdeElAutor(page: Page, ruta: string) {
    await page.goto(ruta);
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll('main [tabindex]')].filter((n) => Number(n.getAttribute('tabindex')) > 0).length,
      ),
      `${ruta}: un elemento de main con tabindex positivo`,
    ).toBe(0);
    await page.locator('main figcaption a[href^="/autor/"]').first().focus();
    const paradas: { grupo: string; texto: string; href: string | null }[] = [];
    for (let i = 0; i < 80; i += 1) {
      const parada = await page.evaluate(() => {
        const n = document.activeElement as HTMLElement | null;
        const grupo =
          n === null || !n.closest('main')
            ? 'fuera'
            : n.closest('nav')
              ? 'salida'
              : n.closest('.tarjeta-de-obra')
                ? 'tarjeta'
                : n.closest('.isla')
                  ? 'accion'
                  : n.closest('figcaption, .fuente')
                    ? 'contenido'
                    : 'otro';
        return { grupo, texto: (n?.textContent ?? '').replace(/\s+/g, ' ').trim(), href: n?.getAttribute('href') ?? null };
      });
      paradas.push(parada);
      if (parada.grupo === 'salida') break;
      await page.keyboard.press('Tab');
    }
    expect(paradas.filter((p) => p.grupo === 'otro' || p.grupo === 'fuera'), `${ruta}\n${JSON.stringify(paradas)}`).toEqual([]);
    const grupos = paradas.map((p) => p.grupo).filter((g, k, todos) => k === 0 || todos[k - 1] !== g);
    return { paradas, grupos };
  }

  test('en la Página de Cita el orden es contenido, tarjeta, acciones y después salidas', async ({ page }) => {
    const ruta = obligatoria(CITAS_24_4.completa, SIN_TARJETA_COMPLETA);
    const { paradas, grupos } = await paradasDesdeElAutor(page, ruta);
    expect(grupos, `${ruta}\n${JSON.stringify(paradas)}`).toEqual(['contenido', 'tarjeta', 'accion', 'salida']);
    const contenido = paradas.filter((p) => p.grupo === 'contenido');
    // El Autor, el título de la Obra y la Fuente, delante de la tarjeta.
    expect(contenido[0].href, ruta).toMatch(/^\/autor\//);
    expect(contenido.some((p) => p.href?.startsWith('/obra/')), ruta).toBe(true);
    expect(contenido.some((p) => /^https?:/.test(p.href ?? '')), `${ruta}: sin parada en la Fuente`).toBe(true);
    // Dos paradas en la tarjeta (Historia 24.5, UX-DR63): «Siguiente cita de esta obra» —la
    // cara completa es de una Obra de dos Citas o más— y después «Ver la obra y dónde leerla».
    const tarjeta = paradas.filter((p) => p.grupo === 'tarjeta');
    expect(tarjeta, ruta).toHaveLength(2);
    expect(tarjeta[0].texto, ruta).toMatch(/^Siguiente cita de esta obra/);
    expect(tarjeta[0].href, ruta).toMatch(/^\/cita\//);
    expect(tarjeta[0].href, ruta).not.toBe(ruta);
    expect(tarjeta[1].texto, ruta).toMatch(/^Ver la obra y dónde leerla/);
    expect(tarjeta[1].href, ruta).toMatch(/^\/obra\//);
  });

  /*
   * Historia 24.6 — dentro del pie, el orden de tabulación es el del marcado: las tarjetas de la
   * misma obra, su cierre, las tarjetas del Autor, su cierre y los chips.
   */
  test('24.6 — en el pie, misma obra, su cierre, Autor, su cierre y chips', async ({ page }) => {
    const ruta = obligatoria(CITAS_24_6.dosBloques, SIN_DOS_BLOQUES);
    await page.goto(ruta);
    await page.locator('nav.salidas a').first().focus();
    const paradas: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      const parada = await page.evaluate(() => {
        const n = document.activeElement as HTMLElement | null;
        if (n === null || !n.closest('nav.salidas')) return 'fuera';
        const grupo = n.closest('section')?.classList[0] ?? 'sin-grupo';
        const pieza = n.closest('li.tarjeta') ? 'tarjeta' : n.closest('li.fila-de-bloque') ? 'cierre' : n.closest('.chips') ? 'chip' : 'otro';
        return `${grupo}:${pieza}`;
      });
      if (parada === 'fuera') break;
      paradas.push(parada);
      await page.keyboard.press('Tab');
    }
    const secuencia = paradas.filter((p, k, todas) => k === 0 || todas[k - 1] !== p);
    // Si hay chips lo dice el marcado, no las paradas: un chip que no recibiera foco encogería la
    // secuencia esperada y la prueba pasaría igual.
    const hayChips = (await page.locator('nav.salidas section.temas-de-la-cita a').count()) > 0;
    expect(secuencia, `${ruta}\n${JSON.stringify(paradas)}`).toEqual([
      'de-la-misma-obra:tarjeta',
      'de-la-misma-obra:cierre',
      'mas-del-autor:tarjeta',
      'mas-del-autor:cierre',
      ...(hayChips ? ['temas-de-la-cita:chip'] : []),
    ]);
  });

  test('sin Obra, el orden es contenido, acciones y después salidas', async ({ page }) => {
    const ruta = obligatoria(CITAS_24_4.sinObra, SIN_CITA_SIN_OBRA);
    const { paradas, grupos } = await paradasDesdeElAutor(page, ruta);
    expect(grupos, `${ruta}\n${JSON.stringify(paradas)}`).toEqual(['contenido', 'accion', 'salida']);
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

  /**
   * Las zonas de toque de `main` en una página, a 360 px: 44 px de alto y 8 px entre vecinas,
   * salvo las filas apiladas de un enlace de bloque, que basta con que no se solapen.
   */
  async function medirZonasDeToque(page: Page, ruta: string) {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(ruta);

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
        /*
         * Solo los listados de bloque con filete entre filas: el `ul` que reúne Tarjetas de Cita
         * o Filas de bloque (los componentes `.tarjeta` y `.fila-de-bloque`), como las dos filas
         * de la Tarjeta de Obra (24.5) o las tarjetas y el cierre de cada grupo del pie (24.6).
         * Por el componente, no por la ruta.
         */
        .map((n) => ({
          r: n.getBoundingClientRect(),
          lista: n.closest('li.tarjeta, li.fila-de-bloque')?.parentElement ?? null,
        }))
        .filter(({ r }) => r.width > 0 && r.height > 0)
        .map(({ r, lista }) => ({
          arriba: r.top,
          abajo: r.bottom,
          izq: r.left,
          der: r.right,
          alto: r.height,
          // El listado al que pertenece, para reconocer las filas apiladas de un enlace de bloque.
          lista:
            lista === null
              ? -1
              : [...document.querySelectorAll('ul:has(> li.tarjeta), ul:has(> li.fila-de-bloque)')].indexOf(lista),
          // Si la lista reúne Tarjetas de Cita: solo ahí hay margen negativo que absorber.
          conTarjetas: lista !== null && lista.querySelector(':scope > li.tarjeta') !== null,
        })),
    );
    // El margen negativo de la tarjeta (`margin-inline: -1 × --unidad`) la saca un `--unidad` por
    // cada lado de la fila que la cierra: dentro de una lista con tarjetas, eso no es otra columna.
    // Una lista solo de Filas de bloque (la Tarjeta de Obra) sigue con el píxel de siempre.
    const unidad = await page.evaluate(() => {
      const sonda = document.createElement('div');
      sonda.style.width = 'var(--unidad)';
      document.body.append(sonda);
      const ancho = sonda.getBoundingClientRect().width;
      sonda.remove();
      return ancho;
    });

    for (const caja of cajas) expect(caja.alto, `${ruta}: ${JSON.stringify(caja)}`).toBeGreaterThanOrEqual(44);

    /*
     * Y entre dos zonas vecinas quedan 8px. Antes solo se pedía que no se solapasen, y el
     * comentario prometía los 8px sin medirlos (Historia 22.10). El hueco es por eje: dos
     * cajas quedan separadas por el eje en el que no se cruzan.
     *
     * Las filas de un mismo `ul` de Tarjetas de Cita o de Filas de bloque —con el ancho entero
     * de la columna y el filete entre una y otra, el único separador del sistema— no se miden
     * entre sí: son enlaces de bloque de `EXPERIENCE.md` y su separación es el filete, no un
     * hueco. Basta con que no se solapen (Historia 24.5: «Siguiente…» sobre «Ver la obra»; 24.6:
     * las tarjetas y el cierre de cada grupo del pie, que sustituyen a las Citas hermanas). La
     * exención se nombra por componente, no por «cualquier lista», para que una botonera en `ul`
     * no se cuele por ella.
     */
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        const a = cajas[i];
        const b = cajas[j];
        const holgura = a.conTarjetas ? unidad + 1 : 1;
        const filasDeUnListado =
          a.lista !== -1 &&
          a.lista === b.lista &&
          Math.abs(a.izq - b.izq) <= holgura &&
          Math.abs(a.der - b.der) <= holgura;
        if (filasDeUnListado) {
          expect(a.abajo <= b.arriba || b.abajo <= a.arriba, `${ruta}: ${JSON.stringify([a, b])}`).toBe(true);
          continue;
        }
        const vertical = Math.max(a.arriba - b.abajo, b.arriba - a.abajo);
        const horizontal = Math.max(a.izq - b.der, b.izq - a.der);
        // Medio píxel de holgura por el redondeo subpíxel del navegador.
        expect(Math.max(vertical, horizontal), `${ruta}: ${JSON.stringify([a, b])}`).toBeGreaterThanOrEqual(7.5);
      }
    }
  }

  test('las zonas de toque miden 44px con 8px de separación', async ({ page }) => {
    await medirZonasDeToque(page, '/cita/antonio-machado-hoy-es-siempre-todavia/');
  });

  test('24.6 — las zonas de toque del pie con los dos bloques', async ({ page }) => {
    await medirZonasDeToque(page, obligatoria(CITAS_24_6.dosBloques, SIN_DOS_BLOQUES));
  });

  /*
   * Historia 24.5 — la otra variante de la fila, «Siguiente cita sobre {tema}», que cambia de
   * largo con el nombre del Tema: la de la etiqueta más larga del `dist/` de hoy, entre las
   * Citas de una Obra de una sola Cita. Zonas de toque y, a 320 px, que las dos filas caben.
   */
  test('24.5 — la fila «Siguiente cita sobre {tema}» más larga mide 44px y cabe a 320 px', async ({ page }) => {
    const candidatas = citasDeObraDeUnaCita()
      .map((slug) => {
        const ruta = `/cita/${slug}/`;
        const tarjeta = tarjetaDeObraDe(construida(ruta));
        const etiqueta = tarjeta === undefined ? undefined : />(Siguiente cita sobre [^<]+)<span aria-hidden/.exec(tarjeta)?.[1];
        return { ruta, etiqueta };
      })
      .filter((c): c is { ruta: string; etiqueta: string } => c.etiqueta !== undefined)
      .sort((a, b) => b.etiqueta.length - a.etiqueta.length || a.ruta.localeCompare(b.ruta));
    test.skip(candidatas.length === 0, 'el Corpus de hoy no tiene ninguna fila «Siguiente cita sobre {tema}»');
    const { ruta, etiqueta } = candidatas[0];
    test.info().annotations.push({ type: '24.5 fila por Tema', description: `${ruta}: «${etiqueta}»` });
    // El Tema va en minúscula tras «sobre» (`temaEnFrase`).
    expect(etiqueta, ruta).toMatch(/^Siguiente cita sobre \p{Ll}/u);

    await medirZonasDeToque(page, ruta);
    const zonas = await page.locator('.tarjeta-de-obra li.fila-de-bloque').evaluateAll((lis) =>
      lis.map((li) => li.getAttribute('data-zona')),
    );
    expect(zonas, ruta).toEqual(['siguiente', 'tarjeta-de-obra']);

    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(ruta);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const medida = await page.evaluate(() => {
      const filas = [...document.querySelectorAll('.tarjeta-de-obra .fila-de-bloque a')] as HTMLElement[];
      return {
        filas: filas.length,
        dentro: filas.every((fila) => fila.getBoundingClientRect().right <= document.documentElement.clientWidth + 0.5),
        desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(medida.filas, ruta).toBe(2);
    expect(medida.dentro, ruta).toBe(true);
    expect(medida.desborda, ruta).toBe(false);
  });

  test('24.5 — con la tarjeta de dos filas, las zonas de toque miden 44px y las filas se apilan sin solaparse', async ({
    page,
  }) => {
    const ruta = obligatoria(CITAS_24_4.completa, SIN_TARJETA_COMPLETA);
    await medirZonasDeToque(page, ruta);
    // La cara completa trae las dos Filas de bloque, «Siguiente…» encima de «Ver la obra».
    const filas = await page.locator('.tarjeta-de-obra li.fila-de-bloque').evaluateAll((lis) =>
      lis.map((li) => {
        const r = li.getBoundingClientRect();
        return { zona: li.getAttribute('data-zona'), arriba: r.top, abajo: r.bottom };
      }),
    );
    expect(filas.map((f) => f.zona), ruta).toEqual(['siguiente', 'tarjeta-de-obra']);
    expect(filas[1].arriba, ruta).toBeGreaterThanOrEqual(filas[0].abajo - 0.5);
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

/**
 * Historia 24.7 — las Páginas de Obra con las que se mide el pie y la Cabecera, sacadas del
 * `dist/` como `OBRAS` y no escritas a mano: una página 1 con Paginación y Temas, otra sin
 * Paginación, con Temas y alguna línea de edición cotejada, y, si alguna Obra del `dist/` trae
 * nota, la primera. Y dos listas de páginas 1: todas (`primeras`), para la primera pantalla, que
 * depende del alto de la Cabecera y se mide en cada una —la más alta no es siempre la del título
 * más largo: parte en más líneas la que tiene palabras más largas—, y las Cabeceras de texto más
 * largo (`cabecerasLargas`: las cinco de título más largo y las cinco de «de {Autor} · {año}» más
 * largo), para las zonas del salto, que no dependen del alto: «de {Autor}» parta o no, su zona
 * acaba 10 px bajo `p.de` y la del salto empieza en el borde de `p.salto`.
 */
function obrasDelPie(): {
  conPaginacion: string;
  sinPaginacion: string;
  conNota: string | undefined;
  primeras: string[];
  cabecerasLargas: string[];
} {
  const obras = rutasConstruidas()
    .filter((ruta) => ruta.startsWith('/obra/'))
    .sort((a, b) => a.localeCompare(b, 'es'));
  const paginadas = new Set(
    obras.filter((ruta) => /^\/obra\/[^/]+\/[^/]+\/\d+\/$/.test(ruta)).map((ruta) => ruta.replace(/\d+\/$/, '')),
  );
  const texto = (marcado: string) =>
    marcado
      .replace(/<span class="oculto"[^>]*>[^<]*<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const primeras = obras
    .filter((ruta) => /^\/obra\/[^/]+\/[^/]+\/$/.test(ruta))
    .map((ruta) => {
      const html = readFileSync(join(dist, ...ruta.split('/').filter(Boolean), 'index.html'), 'utf8');
      return {
        ruta,
        html,
        titulo: texto(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '').length,
        de: texto(/<p class="de"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '').length,
      };
    });
  const conTemas = (html: string) => html.includes('<section class="temas"');
  const exigir = (ruta: string | undefined, cara: string) => {
    if (ruta === undefined) throw new Error(`El dist/ no trae ninguna página 1 de Obra ${cara}.`);
    return ruta;
  };
  const las5MasLargas = (campo: 'titulo' | 'de') =>
    [...primeras]
      .sort((a, b) => b[campo] - a[campo] || a.ruta.localeCompare(b.ruta, 'es'))
      .slice(0, 5)
      .map((o) => o.ruta);
  return {
    conPaginacion: exigir(
      primeras.find((o) => paginadas.has(o.ruta) && conTemas(o.html))?.ruta,
      'con Paginación y Temas',
    ),
    sinPaginacion: exigir(
      primeras.find((o) => !paginadas.has(o.ruta) && conTemas(o.html) && o.html.includes('id="edicion-cotejada"'))
        ?.ruta,
      'sin Paginación, con Temas y edición cotejada',
    ),
    conNota: primeras.find((o) => o.html.includes('class="nota-de-la-ficha"'))?.ruta,
    primeras: primeras.map((o) => o.ruta),
    cabecerasLargas: [...new Set([...las5MasLargas('titulo'), ...las5MasLargas('de')])],
  };
}

/*
 * Se deriva al pedirla, no al cargar el fichero: si el Corpus del día deja de traer alguna de
 * estas caras, fallan las pruebas de la 24.7 que la piden, nombrándola, y no deja de cargar el
 * barrido entero.
 */
let pie: ReturnType<typeof obrasDelPie> | undefined;
const PIE = () => (pie ??= obrasDelPie());

/**
 * Historia 24.7 — el salto «Dónde leer esta obra ↓» de la Cabecera de Obra (UX-DR96, UX-DR100).
 *
 * Se tabula hasta él y se activa con Intro, sin guion de por medio: el foco tiene que acabar en
 * el `h2` de destino (`tabindex="-1"`) con el anillo global, porque el salto nativo del navegador
 * enfoca un destino enfocable y el último gesto fue de teclado; y el Tab siguiente sale de ahí
 * hacia delante, no vuelve a la Cabecera. Con el puntero el foco llega igual y el anillo es el que
 * decida la regla global, sin ninguna de la página que lo pinte o lo quite; y, se llegue con
 * Intro, con el puntero o abriendo la dirección con el fragmento, el `h2` queda a 2 × `--unidad`
 * del borde. Las medidas son las de `DESIGN.md`
 * § Página de Obra: el salto a 3 × de «de {Autor}», su zona de 44 px a 8 px como poco de la de
 * «de {Autor}» —sin tocar ninguna de las dos—, la primera Cita aún en la primera pantalla y el
 * ritmo del pie, que el salto no mueve. Medio píxel de holgura por el redondeo subpíxel, como en
 * las demás.
 */
test.describe('Historia 24.7 — el salto «Dónde leer esta obra ↓»', () => {
  const ANCLA = 'donde-leer-esta-obra';

  for (const cara of ['indexable', 'noIndexable'] as const) {
    test(`${cara}: Intro sobre el salto deja el foco en el h2 de destino, con el anillo global`, async ({
      page,
    }) => {
      const ruta = OBRAS[cara];
      await page.goto(ruta);
      const salto = page.getByRole('link', { name: 'Dónde leer esta obra', exact: true });
      await expect(salto, ruta).toHaveCount(1);
      expect(await salto.getAttribute('href'), ruta).toBe(`#${ANCLA}`);
      expect(await salto.getAttribute('target'), ruta).toBeNull();

      let alcanzado = false;
      for (let i = 0; i < 60 && !alcanzado; i += 1) {
        await page.keyboard.press('Tab');
        alcanzado = await salto.evaluate((n) => n === document.activeElement);
      }
      expect(alcanzado, `${ruta}: el salto no recibe el foco por teclado`).toBe(true);

      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => location.hash), { message: ruta }).toBe(`#${ANCLA}`);
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.id), { message: `${ruta}: el foco no llega al h2` })
        .toBe(ANCLA);

      const foco = await page.evaluate(() => {
        const n = document.activeElement as HTMLElement;
        const s = getComputedStyle(n);
        return {
          etiqueta: n.tagName,
          tabindex: n.getAttribute('tabindex'),
          visible: n.matches(':focus-visible'),
          estilo: s.outlineStyle,
          ancho: s.outlineWidth,
          separacion: s.outlineOffset,
          color: s.outlineColor,
          margen: s.scrollMarginTop,
          siena: getComputedStyle(document.documentElement).getPropertyValue('--siena').trim(),
        };
      });
      expect(foco.etiqueta, ruta).toBe('H2');
      expect(foco.tabindex, ruta).toBe('-1');
      expect(foco.visible, `${ruta}: el h2 enfocado no casa :focus-visible`).toBe(true);
      expect(foco.estilo, ruta).toBe('solid');
      expect(foco.ancho, ruta).toBe('2px');
      expect(foco.separacion, ruta).toBe('2px');
      expect(foco.margen, ruta).toBe('16px');
      // El color, el del token: se compara resolviéndolo en el propio navegador.
      const sienaResuelto = await page.evaluate((valor) => {
        const prueba = document.createElement('span');
        prueba.style.color = valor;
        document.body.append(prueba);
        const color = getComputedStyle(prueba).color;
        prueba.remove();
        return color;
      }, foco.siena);
      expect(foco.color, ruta).toBe(sienaResuelto);

      // UX-DR100 — el destino mueve también el punto de partida de la tabulación: el Tab
      // siguiente sigue desde «Dónde leer esta obra» hacia delante y no vuelve a la Cabecera.
      await page.keyboard.press('Tab');
      const siguiente = await page.evaluate((ancla) => {
        const destino = document.getElementById(ancla)!;
        const activo = document.activeElement;
        if (activo === null || activo === document.body) return { despues: false, enCabecera: false };
        return {
          despues: Boolean(destino.compareDocumentPosition(activo) & Node.DOCUMENT_POSITION_FOLLOWING),
          enCabecera: activo.closest('.cabecera-de-obra') !== null,
        };
      }, ANCLA);
      expect(siguiente, `${ruta}: el Tab tras el salto`).toStrictEqual({ despues: true, enCabecera: false });
    });
  }

  /*
   * Con el puntero, que el anillo salga o no lo decide `:focus-visible` —la regla global, que
   * nunca se suprime (UX-DR100)—, no la página: se exige que el contorno sea exactamente el de esa
   * regla según case o no, y no qué decide el navegador. Lo que esto atrapa es una regla de foco
   * propia (`.rotulo:focus`, un `outline` local), que la 24.7 no puede añadir.
   */
  test('con el puntero, el salto lleva el foco al h2 con el anillo de la regla global, y un clic en el h2 también', async ({
    page,
    isMobile,
  }) => {
    for (const ruta of [OBRAS.indexable, OBRAS.noIndexable]) {
      await page.goto(ruta);
      const salto = page.getByRole('link', { name: 'Dónde leer esta obra', exact: true });
      // En el proyecto móvil, un toque; en el de escritorio, un clic.
      if (isMobile) await salto.tap();
      else await salto.click();
      await expect.poll(() => page.evaluate(() => location.hash), { message: ruta }).toBe(`#${ANCLA}`);
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.id), { message: `${ruta}: el foco no llega al h2` })
        .toBe(ANCLA);
      // El contorno, el que da la regla global: 2 px `solid` si casa `:focus-visible`, ninguno si no.
      const anillo = () =>
        page.evaluate(() => {
          const n = document.activeElement as HTMLElement;
          const s = getComputedStyle(n);
          const visible = n.matches(':focus-visible');
          return {
            id: n.id,
            deLaRegla: visible ? s.outlineStyle === 'solid' && s.outlineWidth === '2px' : s.outlineStyle === 'none',
          };
        });
      expect(await anillo(), `${ruta}, tras el salto`).toStrictEqual({ id: ANCLA, deLaRegla: true });

      // `tabindex="-1"` hace enfocable el h2 también al pulsarlo, con el mismo anillo.
      await page.goto(ruta);
      await page.locator(`#${ANCLA}`).click();
      expect(await anillo(), `${ruta}, clic en el h2`).toStrictEqual({ id: ANCLA, deLaRegla: true });
    }
  });

  test('al llegar, el h2 queda a 2 × --unidad del borde: con Intro, con el puntero y al abrir la dirección', async ({
    page,
    isMobile,
  }) => {
    /*
     * Una ventana baja, para que lo que sigue al h2 dé para subirlo hasta arriba: con la alta, la
     * página se acaba antes y el navegador se queda en el fondo, más abajo de los 16 px. El
     * desplazamiento es de píxeles enteros, así que la holgura es de uno.
     */
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 320 });
    const llegada = (ruta: string, como: string) =>
      expect
        .poll(
          () =>
            page.evaluate(
              (ancla) => Math.abs(document.getElementById(ancla)!.getBoundingClientRect().top - 16) <= 1,
              ANCLA,
            ),
          { message: `${ruta}, ${como}: el h2 no queda a 16 px del borde` },
        )
        .toBe(true);
    for (const ruta of [OBRAS.indexable, PIE().sinPaginacion]) {
      const salto = page.getByRole('link', { name: 'Dónde leer esta obra', exact: true });
      await page.goto(ruta);
      // Antes de medir, que la página dé de sí: si lo que sigue al h2 no llena la ventana, el
      // navegador se queda en el fondo y la llegada no dice nada del `scroll-margin-top`.
      const daDeSi = await page.evaluate((ancla) => {
        const arriba = document.getElementById(ancla)!.getBoundingClientRect().top + window.scrollY;
        return document.scrollingElement!.scrollHeight - (arriba - 16) >= window.innerHeight;
      }, ANCLA);
      expect(daDeSi, `${ruta}: lo que sigue al h2 no llena la ventana; aquí no se puede medir la llegada`).toBe(true);
      await salto.focus();
      await page.keyboard.press('Enter');
      await llegada(ruta, 'con Intro');

      await page.goto(ruta);
      if (isMobile) await salto.tap();
      else await salto.click();
      await llegada(ruta, 'con el puntero');

      // Un enlace compartido con el fragmento, o volver atrás: la misma llegada.
      await page.goto('about:blank');
      await page.goto(`${ruta}#${ANCLA}`);
      await llegada(ruta, 'al abrir la dirección con el fragmento');
    }
  });

  test('el salto va en siena y subrayado siempre, también bajo el puntero', async ({ page }) => {
    await page.goto(OBRAS.indexable);
    const salto = page.locator('.cabecera-de-obra .salto a');
    const pintado = () =>
      salto.evaluate((n) => {
        const s = getComputedStyle(n);
        const prueba = document.createElement('span');
        prueba.style.color = getComputedStyle(document.documentElement).getPropertyValue('--siena').trim();
        document.body.append(prueba);
        const siena = getComputedStyle(prueba).color;
        prueba.remove();
        return { color: s.color, siena, subrayado: s.textDecorationLine };
      });
    const quieto = await pintado();
    expect(quieto.color, 'el color del salto').toBe(quieto.siena);
    expect(quieto.subrayado, 'el subrayado del salto').toBe('underline');
    await salto.hover();
    expect(await pintado(), 'bajo el puntero').toStrictEqual(quieto);
  });

  for (const ancho of [360, 320]) {
    test(`a ${ancho} px, el salto a 3 × de «de {Autor}», su zona de 44 px y a 8 px de la de «de {Autor}»`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 640 });
      for (const ruta of new Set([OBRAS.indexable, OBRAS.noIndexable, OBRAS.tituloLargo, ...PIE().cabecerasLargas])) {
        await page.goto(ruta);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const medida = await page.evaluate(() => {
          const parrafoDe = document.querySelector('.cabecera-de-obra .de')!.getBoundingClientRect();
          const parrafo = document.querySelector('.cabecera-de-obra .salto')!.getBoundingClientRect();
          const salto = document.querySelector('.cabecera-de-obra .salto a')!.getBoundingClientRect();
          const de = document.querySelector('.cabecera-de-obra .de a')!.getBoundingClientRect();
          return { linea: parrafo.top - parrafoDe.bottom, alto: salto.height, hueco: salto.top - de.bottom };
        });
        expect(Math.abs(medida.linea - 24), `${ruta}: de «de» al salto, ${medida.linea}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(medida.alto - 44), `${ruta}: la zona del salto mide ${medida.alto}`).toBeLessThanOrEqual(0.5);
        expect(medida.hueco, `${ruta}: entre las dos zonas`).toBeGreaterThanOrEqual(7.5);
      }
    });
  }

  test('a 360 × 640, la primera Cita sigue empezando en la primera pantalla de toda página 1', async ({ page }) => {
    /*
     * En todas, no en una muestra: el alto de la Cabecera depende de cómo parten el título y
     * «de {Autor} · {año}» a 360 px, y ninguna longitud dice de antemano cuál es la más alta. Una
     * navegación por Obra; el plazo crece con el Corpus.
     */
    const { primeras } = PIE();
    expect(primeras.length, 'páginas 1 de Obra en el dist/').toBeGreaterThan(0);
    test.setTimeout(60_000 + primeras.length * 500);
    await page.setViewportSize({ width: 360, height: 640 });
    const fuera: string[] = [];
    let peor = { ruta: '', fin: 0 };
    for (const ruta of primeras) {
      await page.goto(ruta);
      const medida = await page.evaluate(async () => {
        await document.fonts.ready;
        const fragmento = document.querySelector<HTMLElement>('.listado .fragmento');
        if (fragmento === null) return null;
        return {
          desplazada: window.scrollY,
          fin: fragmento.getBoundingClientRect().top + parseFloat(getComputedStyle(fragmento).lineHeight),
        };
      });
      if (medida === null || medida.desplazada !== 0 || medida.fin > 640) {
        fuera.push(`${ruta}: ${JSON.stringify(medida)}`);
      } else if (medida.fin > peor.fin) {
        peor = { ruta, fin: medida.fin };
      }
    }
    expect(fuera, `fuera de la primera pantalla (la peor de las que caben: ${peor.ruta}, ${peor.fin} px)`).toEqual([]);
  });

  /** El hueco vertical entre el borde inferior de `a` y el superior de `b`. */
  const hueco = (page: Page, a: string, b: string) =>
    page.evaluate(
      ([selectorA, selectorB]) => {
        const sobre = document.querySelector(selectorA);
        const bajo = document.querySelector(selectorB);
        if (sobre === null || bajo === null) return null;
        return bajo.getBoundingClientRect().top - sobre.getBoundingClientRect().bottom;
      },
      [a, b] as const,
    );
  const cerca = (medido: number | null, esperado: number, que: string) => {
    expect(medido, `${que}: no está en la página`).not.toBeNull();
    expect(Math.abs(medido! - esperado), `${que}: ${medido} px en vez de ${esperado}`).toBeLessThanOrEqual(0.5);
  };

  test('la Cabecera: el listado a 32 px del salto en la página 1, y de «de {Autor}» en la 2', async ({ page }) => {
    for (const ruta of [OBRAS.indexable, OBRAS.noIndexable, PIE().conPaginacion]) {
      await page.goto(ruta);
      cerca(await hueco(page, '.cabecera-de-obra .salto', 'ul.listado'), 32, `${ruta}, salto → listado`);
    }
    await page.goto(OBRAS.segunda);
    expect(await page.locator('.salto').count(), OBRAS.segunda).toBe(0);
    expect(await page.locator(`[href="#${ANCLA}"], #${ANCLA}`).count(), OBRAS.segunda).toBe(0);
    cerca(await hueco(page, '.cabecera-de-obra .de', 'ul.listado'), 32, `${OBRAS.segunda}, «de» → listado`);
  });

  test('el pie no se mueve: 5 × hasta los Temas, 4 × hasta «Dónde leer», 2 × y 1 ×', async ({ page }) => {
    const { conPaginacion, sinPaginacion } = PIE();
    await page.goto(conPaginacion);
    cerca(await hueco(page, 'nav.paginacion', '.temas'), 40, `${conPaginacion}, Paginación → Temas`);
    cerca(await hueco(page, '.temas', '.donde-leer'), 32, `${conPaginacion}, Temas → «Dónde leer»`);
    cerca(await hueco(page, `#${ANCLA}`, `#${ANCLA} + *`), 16, `${conPaginacion}, h2 → lo que sigue`);

    await page.goto(sinPaginacion);
    expect(await page.locator('nav.paginacion').count(), sinPaginacion).toBe(0);
    cerca(await hueco(page, 'ul.listado', '.temas'), 40, `${sinPaginacion}, listado → Temas`);
    cerca(await hueco(page, '.temas', '.donde-leer'), 32, `${sinPaginacion}, Temas → «Dónde leer»`);
    cerca(await hueco(page, `#${ANCLA}`, `#${ANCLA} + *`), 16, `${sinPaginacion}, h2 → lo que sigue`);
    cerca(await hueco(page, '#edicion-cotejada', '#edicion-cotejada + .linea'), 8, `${sinPaginacion}, h3 → línea`);
  });

  test('la Nota: 4 × sobre su filete y 3 × bajo él', async ({ page }) => {
    const { conNota, sinPaginacion } = PIE();
    const ruta = conNota ?? sinPaginacion;
    await page.goto(ruta);
    if (conNota === undefined) {
      /*
       * Ninguna Obra del Corpus trae nota todavía —la escribe Héctor, y ningún agente siembra
       * una—, así que se pone en la página servida con el marcado que emite la plantilla: un
       * `p.nota-de-la-ficha` con `data-pagefind-ignore`, tras la sección y con el ámbito de la
       * página, que es el de la Cabecera. Lo que se mide es la hoja que el sitio sirve; sin el
       * ámbito no se le aplicaría y el filete saldría de 0 px.
       */
      await page.evaluate(() => {
        const cabecera = document.querySelector('.cabecera-de-obra')!;
        const nota = document.createElement('p');
        nota.className = 'nota-de-la-ficha';
        nota.setAttribute('data-pagefind-ignore', '');
        for (const { name, value } of [...cabecera.attributes]) {
          if (name.startsWith('data-astro-cid-')) nota.setAttribute(name, value);
        }
        nota.textContent = 'Una nota de una línea, como las que escribe Héctor.';
        document.querySelector('.donde-leer')!.after(nota);
      });
    }
    cerca(await hueco(page, '.donde-leer', '.nota-de-la-ficha'), 32, `${ruta}, «Dónde leer» → nota`);
    const nota = await page.locator('.nota-de-la-ficha').evaluate((n) => {
      const s = getComputedStyle(n);
      return { filete: s.borderTopWidth, estilo: s.borderTopStyle, relleno: parseFloat(s.paddingTop) };
    });
    expect(nota.filete, `${ruta}, el filete de la nota`).toBe('1px');
    expect(nota.estilo, `${ruta}, el filete de la nota`).toBe('solid');
    cerca(nota.relleno, 24, `${ruta}, filete → texto de la nota`);
  });
});
