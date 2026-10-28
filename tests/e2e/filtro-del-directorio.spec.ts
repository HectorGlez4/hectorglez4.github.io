import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { normalizar } from '../../src/lib/normalizar.ts';
import {
  ETIQUETAS_DEL_BARRIDO,
  rutaDeLaBusqueda,
  rutaDelDirectorioDeAutores,
  rutaDelDirectorioDeObras,
} from '../../src/lib/superficies.ts';
import { ETIQUETA_DEL_FILTRO, type DirectorioFiltrable } from '../../src/lib/filtroDelDirectorio.ts';
import { recuentoDeAutores, recuentoDeObras } from '../../src/lib/recuentos.ts';
import { PAUSA_DE_TECLEO_MS } from '../../src/lib/umbrales.ts';

/**
 * Historia 26.6 — El Directorio filtra al teclear, sin pensar en tildes, en el navegador.
 *
 * Lo que solo se ve con una página delante: el campo que inserta el guion, la lista que se repinta
 * al teclear, el recuento que llega tras la pausa y no antes, el enlace a cero, el texto hostil
 * escrito tal cual, el anclaje del desplazamiento al insertar el campo, la página sin guion y con
 * el fichero caído, el orden del foco, sus medidas con los tokens y el barrido de axe.
 *
 * Los ejemplos salen de la página servida, nunca de una lista fija: lo que se espera de cada
 * consulta se calcula con `normalizar` sobre lo que la página lista **antes** de teclear, y se
 * exige que no esté vacío y que estén los casos de la historia —Manuel González Prada, José Martí
 * y la obra de España—. El reloj de la página es el de Playwright (`page.clock`): la pausa se
 * avanza a mano, sin esperar de verdad.
 */

const AUTORES = rutaDelDirectorioDeAutores();
const OBRAS = rutaDelDirectorioDeObras();
/** El fichero del guion del filtro, como lo emite Astro. */
const FICHERO = '**/_astro/FiltroDelDirectorio.astro_astro_type_script_index_0_lang.*.js';

/** Lo que lista la página antes de teclear: por fila, su texto y el de la cabecera de su bloque. */
async function listado(page: Page, directorio: DirectorioFiltrable) {
  return page.evaluate((directorio) => {
    if (directorio === 'autores') {
      return [...document.querySelectorAll('section.grupo li.fila-de-bloque')].map((li) => ({
        fila: li.querySelector('.nombre')?.textContent ?? '',
        cabecera: '',
      }));
    }
    return [...document.querySelectorAll('section.autor')].flatMap((autor) =>
      [...autor.querySelectorAll('.lista-de-obras > li')].map((li) => ({
        fila: li.querySelector('.titulo')?.firstChild?.nodeValue ?? '',
        cabecera: autor.querySelector('h3 a')?.textContent ?? '',
      })),
    );
  }, directorio);
}

/** Las filas que se ven ahora, en orden. */
async function visibles(page: Page, directorio: DirectorioFiltrable): Promise<string[]> {
  return page.evaluate((directorio) => {
    const filas = [
      ...document.querySelectorAll<HTMLElement>(directorio === 'autores' ? 'section.grupo li.fila-de-bloque' : 'section.autor .lista-de-obras > li'),
    ].filter((li) => li.checkVisibility());
    return filas.map((li) =>
      directorio === 'autores'
        ? (li.querySelector('.nombre')?.textContent ?? '')
        : (li.querySelector('.titulo')?.firstChild?.nodeValue ?? ''),
    );
  }, directorio);
}

/** Lo que se espera con una consulta: las filas cuyo texto, o el de su cabecera, la contiene. */
function esperadas(lista: { fila: string; cabecera: string }[], consulta: string): string[] {
  const n = normalizar(consulta);
  return lista.filter((e) => normalizar(e.fila).includes(n) || normalizar(e.cabecera).includes(n)).map((e) => e.fila);
}

const recuento = (directorio: DirectorioFiltrable, n: number) =>
  `${directorio === 'autores' ? recuentoDeAutores(n) : recuentoDeObras(n)}.`;

const campo = (page: Page, directorio: DirectorioFiltrable) => page.getByLabel(ETIQUETA_DEL_FILTRO[directorio]);
const region = (page: Page) => page.locator('main [role="status"]');

/** El instante en que arranca el reloj de la página. */
const INICIO = new Date('2026-10-28T10:00:00Z');

/**
 * Abre el Directorio con el reloj de Playwright, espera a que el guion haya insertado el campo y
 * para el reloj: desde ahí el tiempo de la página solo avanza con `runFor`. Con `reloj: false`,
 * el tiempo corre de verdad —el barrido de axe usa temporizadores y con el reloj parado no
 * acabaría—.
 */
async function abrir(page: Page, ruta: string, directorio: DirectorioFiltrable, reloj = true) {
  if (reloj) await page.clock.install({ time: INICIO });
  await page.goto(ruta);
  await expect(campo(page, directorio)).toBeVisible();
  if (reloj) await page.clock.pauseAt(new Date(INICIO.getTime() + 600_000));
}

test.describe('Historia 26.6 — cómo filtra, en los dos Directorios', () => {
  test('`/autores/`: sin tildes ni mayúsculas, por subcadena, con las letras y los «Volver» fuera', async ({ page }) => {
    await abrir(page, AUTORES, 'autores');
    const lista = await listado(page, 'autores');
    expect(lista.length, 'el Directorio no lista ningún Autor').toBeGreaterThan(0);

    const gonzalez = esperadas(lista, 'gonzalez');
    expect(gonzalez).toContain('Manuel González Prada');
    await campo(page, 'autores').fill('gonzalez');
    expect(await visibles(page, 'autores')).toEqual(gonzalez);
    await expect(page.locator('#letras')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Volver a las letras' })).toHaveCount(0);
    // Los grupos sin coincidencias salen enteros, con su letra; los que quedan conservan la suya.
    const grupos = await page.locator('section.grupo').evaluateAll((gs) =>
      gs.filter((g) => (g as HTMLElement).checkVisibility()).map((g) => g.querySelector('h2')?.textContent),
    );
    expect(grupos.length).toBeGreaterThan(0);
    expect(grupos.length).toBeLessThan(await page.locator('section.grupo').count());

    // «MARTÍ» y «marti», el mismo conjunto, con José Martí.
    await campo(page, 'autores').fill('MARTÍ');
    const conTilde = await visibles(page, 'autores');
    await campo(page, 'autores').fill('marti');
    expect(await visibles(page, 'autores')).toEqual(conTilde);
    expect(conTilde).toEqual(esperadas(lista, 'marti'));
    expect(conTilde).toContain('José Martí');
  });

  test('`/obras/`: la eñe plegada, el Autor que casa trae todas sus Obras, y la Obra que casa trae a su Autor', async ({ page }) => {
    await abrir(page, OBRAS, 'obras');
    const lista = await listado(page, 'obras');
    expect(lista.length, 'el Directorio no lista ninguna Obra').toBeGreaterThan(0);

    const espana = esperadas(lista, 'espana');
    expect(espana.some((titulo) => titulo.includes('España'))).toBe(true);
    await campo(page, 'obras').fill('espana');
    expect(await visibles(page, 'obras')).toEqual(espana);

    // Un Autor cuyo nombre casa: su cabecera y todas sus Obras.
    const autor = lista.find((e) => e.cabecera.includes('González Prada')) ?? lista[0];
    const suyas = lista.filter((e) => e.cabecera === autor.cabecera).map((e) => e.fila);
    await campo(page, 'obras').fill(autor.cabecera);
    const quedan = await visibles(page, 'obras');
    for (const titulo of suyas) expect(quedan).toContain(titulo);
    await expect(page.locator('section.autor h3').filter({ hasText: autor.cabecera }).first()).toBeVisible();

    // Una Obra cuyo título casa y el nombre de su Autor no: su cabecera y esa Obra.
    const titulo = lista.find((e) => e.fila.length > 12 && !normalizar(e.cabecera).includes(normalizar(e.fila)));
    expect(titulo, 'la página no lista ninguna Obra de más de 12 caracteres que no esté en el nombre de su Autor').toBeDefined();
    if (titulo === undefined) return;
    await campo(page, 'obras').fill(titulo.fila);
    expect(await visibles(page, 'obras')).toEqual(esperadas(lista, titulo.fila));
    const cabeceras = await page
      .locator('section.autor')
      .evaluateAll((s) => s.filter((a) => (a as HTMLElement).checkVisibility()).map((a) => a.querySelector('h3')?.textContent));
    expect(cabeceras).toContain(titulo.cabecera);
  });

  for (const [ruta, directorio] of [
    [AUTORES, 'autores'],
    [OBRAS, 'obras'],
  ] as const) {
    test(`${ruta}: el recuento llega tras la pausa y no antes, y no se reescribe con la misma frase`, async ({ page }) => {
      await abrir(page, ruta, directorio);
      const lista = await listado(page, directorio);
      // Dos consultas que difieren en una letra y dejan la misma cifra: la frase no cambia entre
      // ellas. Salen de un texto que lista la página, entero y sin su última letra.
      const larga = lista
        .map((e) => normalizar(e.fila))
        .find((t) => t.length > 8 && esperadas(lista, t.slice(0, -1)).length === esperadas(lista, t).length);
      expect(larga, 'ningún texto de la página sirve de ejemplo').toBeDefined();
      const corta = larga!.slice(0, -1);
      const n = esperadas(lista, larga!).length;
      expect(n).toBeGreaterThan(0);

      await page.evaluate(() => {
        const r = document.querySelector('main [role="status"]')!;
        (window as unknown as { escrituras: number }).escrituras = 0;
        new MutationObserver((m) => ((window as unknown as { escrituras: number }).escrituras += m.length)).observe(r, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
      await campo(page, directorio).fill(corta);
      // La lista, al momento; la frase, no.
      expect(await visibles(page, directorio)).toEqual(esperadas(lista, corta));
      await page.clock.runFor(PAUSA_DE_TECLEO_MS - 1);
      await expect(region(page)).toHaveText('');
      await page.clock.runFor(1);
      await expect(region(page)).toHaveText(recuento(directorio, esperadas(lista, corta).length));

      const antes = await page.evaluate(() => (window as unknown as { escrituras: number }).escrituras);
      expect(antes).toBeGreaterThan(0);
      await campo(page, directorio).fill(larga!);
      expect(await visibles(page, directorio)).toEqual(esperadas(lista, larga!));
      await page.clock.runFor(PAUSA_DE_TECLEO_MS * 2);
      await expect(region(page)).toHaveText(recuento(directorio, n));
      expect(await page.evaluate(() => (window as unknown as { escrituras: number }).escrituras)).toBe(antes);

      // Vaciar: la región se vacía al momento y todo vuelve.
      await campo(page, directorio).fill('x');
      await campo(page, directorio).fill('');
      await expect(region(page)).toHaveText('');
      await page.clock.runFor(PAUSA_DE_TECLEO_MS * 2);
      await expect(region(page)).toHaveText('');
      expect(await visibles(page, directorio)).toHaveLength(lista.length);
      await expect(page.locator('#letras')).toBeVisible();
      expect(await page.getByRole('link', { name: 'Volver a las letras' }).count()).toBeGreaterThan(0);

      // Solo signos y espacios es el campo vacío.
      await campo(page, directorio).fill('  ¿? ');
      await page.clock.runFor(PAUSA_DE_TECLEO_MS * 2);
      await expect(region(page)).toHaveText('');
      expect(await visibles(page, directorio)).toHaveLength(lista.length);
    });

    test(`${ruta}: a cero, la frase tras la pausa y «Buscar … en las citas» al momento, y lo hostil es texto`, async ({ page }) => {
      await abrir(page, ruta, directorio);
      const hostil = '<img src=x onerror="window.__hostil=1">';
      await campo(page, directorio).fill(hostil);
      expect(await visibles(page, directorio)).toEqual([]);
      await expect(page.locator('#letras')).toBeHidden();
      await expect(page.locator('section.grupo:visible')).toHaveCount(0);

      const enlace = page.getByRole('link', { name: `Buscar «${hostil}» en las citas` });
      await expect(enlace).toBeVisible();
      await expect(enlace).toHaveAttribute('href', `${rutaDeLaBusqueda()}?q=${encodeURIComponent(hostil)}`);
      await expect(enlace).not.toHaveAttribute('target', /.*/);
      await expect(region(page)).toHaveText('');
      // El enlace, a `--unidad` bajo la fila del recuento, que toma su alto al teclear —la sombra
      // lleva ya la frase—: cuando la frase llega a la región no se mueve nada, aunque ocupe varias
      // líneas, como lo hostil en el móvil.
      const posicion = () =>
        page.evaluate(() => {
          const d = document.createElement('div');
          d.style.width = 'var(--unidad)';
          document.body.append(d);
          const u1 = parseFloat(getComputedStyle(d).width);
          d.remove();
          const r = document.querySelector('.sombra')!.getBoundingClientRect();
          const p = document.querySelector('.a-cero')!.getBoundingClientRect();
          return { u1, hueco: p.top - r.bottom, arriba: p.top, alto: r.height };
        });
      const antesDeLaFrase = await posicion();
      expect(antesDeLaFrase.alto).toBeGreaterThan(0);
      expect(antesDeLaFrase.hueco).toBeCloseTo(antesDeLaFrase.u1, 0);
      await page.clock.runFor(PAUSA_DE_TECLEO_MS);
      await expect(region(page)).toHaveText(
        directorio === 'autores'
          ? `Ningún autor tiene «${hostil}» en el nombre.`
          : `Ninguna obra tiene «${hostil}» en el título ni en su autor.`,
      );
      const conLaFrase = await posicion();
      expect(conLaFrase.hueco).toBeCloseTo(conLaFrase.u1, 0);
      expect(conLaFrase.arriba).toBeCloseTo(antesDeLaFrase.arriba, 0);
      // Ningún elemento creado ni código ejecutado.
      expect(await page.locator('main img').count()).toBe(0);
      expect(await page.evaluate(() => (window as unknown as { __hostil?: number }).__hostil)).toBeUndefined();

      // El enlace: 44 px, siena y subrayado, y su contenedor más cercano con zona es `directorio`.
      const m = await enlace.evaluate((a) => {
        const sonda = document.createElement('span');
        sonda.style.color = 'var(--siena)';
        document.body.append(sonda);
        const siena = getComputedStyle(sonda).color;
        sonda.remove();
        const c = getComputedStyle(a);
        const medida = document.createElement('span');
        medida.style.cssText = 'font-size: var(--cuerpo-md); font-family: var(--sans)';
        document.body.append(medida);
        const md = { cuerpo: getComputedStyle(medida).fontSize, familia: getComputedStyle(medida).fontFamily };
        medida.remove();
        return {
          alto: a.getBoundingClientRect().height,
          letra: { cuerpo: c.fontSize, familia: c.fontFamily },
          md,
          color: c.color,
          siena,
          subrayado: c.textDecorationLine,
          zona: a.closest('[data-zona]')?.getAttribute('data-zona'),
        };
      });
      expect(m.alto).toBeGreaterThanOrEqual(44);
      expect(m.letra).toEqual(m.md);
      expect(m.color).toBe(m.siena);
      expect(m.subrayado).toBe('underline');
      expect(m.zona).toBe('directorio');

      // Al dejar de estar a cero, el enlace se va y deja de ser enlace.
      await campo(page, directorio).fill('');
      await expect(page.locator('.a-cero')).toBeHidden();
      await expect(page.locator('.a-cero a')).not.toHaveAttribute('href', /.*/);
    });
  }
});

test.describe('Historia 26.6 — por subcadena, y `/obras/` con coincidencias', () => {
  test('`/autores/`: «mar» casa también dentro de una palabra, como `normalizar` sobre la lista servida', async ({ page }) => {
    await abrir(page, AUTORES, 'autores');
    const lista = await listado(page, 'autores');
    // Un trozo que casa dentro de una palabra y no al principio de ninguna: «mar» si la página lo
    // trae así —Josefa Amar y Borbón, con el Corpus del 2026-10-18—, y si no, uno de la lista.
    const dentro = (consulta: string) =>
      lista.find((e) => {
        const t = normalizar(e.fila);
        return t.includes(consulta) && !new RegExp(`(^| )${consulta}`, 'u').test(t);
      });
    const consulta =
      ['mar', ...lista.map((e) => normalizar(e.fila).replace(/ /gu, '').slice(2, 5))].find(
        (c) => c.length === 3 && dentro(c) !== undefined,
      ) ?? '';
    expect(consulta, 'ningún nombre de la página sirve de ejemplo dentro de una palabra').not.toBe('');
    const esperado = esperadas(lista, consulta);
    expect(esperado).toContain(dentro(consulta)!.fila);
    await campo(page, 'autores').fill(consulta);
    expect(await visibles(page, 'autores')).toEqual(esperado);
    await page.clock.runFor(PAUSA_DE_TECLEO_MS);
    await expect(region(page)).toHaveText(recuento('autores', esperado.length));
  });

  test('`/obras/` con coincidencias: sin letras ni «Volver», cada grupo que queda con su letra, y el primer Autor y la primera Obra visibles a su ritmo', async ({ page }) => {
    await abrir(page, OBRAS, 'obras');
    // Una Obra que no es la primera de su Autor, de un Autor que no es el primero de su grupo, y
    // cuyo título entero no casa con nada de lo que tiene delante en su grupo: filtrada por él,
    // el primer Autor visible del grupo y su primera Obra visible siguen a otros ocultos.
    const ejemplo = await page.evaluate(() =>
      [...document.querySelectorAll('section.grupo')].flatMap((grupo, g) =>
        [...grupo.querySelectorAll('section.autor')].map((autor, a) => ({
          g,
          a,
          cabecera: autor.querySelector('h3 a')?.textContent ?? '',
          titulos: [...autor.querySelectorAll('.lista-de-obras > li')].map((li) => li.querySelector('.titulo')?.firstChild?.nodeValue ?? ''),
          antes: [...grupo.querySelectorAll('section.autor')].slice(0, a).flatMap((otro) => [
            otro.querySelector('h3 a')?.textContent ?? '',
            ...[...otro.querySelectorAll('.lista-de-obras > li')].map((li) => li.querySelector('.titulo')?.firstChild?.nodeValue ?? ''),
          ]),
        })),
      ),
    );
    const caso = ejemplo
      .filter((e) => e.a > 0)
      .flatMap((e) => e.titulos.slice(1).map((t, i) => ({ ...e, titulo: t, o: i + 1 })))
      .find((e) => {
        const n = normalizar(e.titulo);
        return (
          n.length > 0 &&
          !normalizar(e.cabecera).includes(n) &&
          e.antes.every((x) => !normalizar(x).includes(n)) &&
          e.titulos.slice(0, e.o).every((x) => !normalizar(x).includes(n))
        );
      });
    expect(caso, 'la página no trae ninguna Obra que sirva de ejemplo').toBeDefined();
    if (caso === undefined) return;

    await campo(page, 'obras').fill(caso.titulo);
    await expect(page.locator('#letras')).toBeHidden();
    await expect(page.locator('p.volver:visible')).toHaveCount(0);
    const grupos = await page.locator('section.grupo').evaluateAll((gs) =>
      gs.map((g) => ({ visible: (g as HTMLElement).checkVisibility(), letra: (g.querySelector(':scope > h2') as HTMLElement | null)?.checkVisibility() ?? false })),
    );
    const quedan = grupos.filter((g) => g.visible);
    expect(quedan.length).toBeGreaterThan(0);
    expect(quedan.length).toBeLessThan(grupos.length);
    for (const g of quedan) expect(g.letra, 'un grupo que queda sin su letra').toBe(true);

    const m = await page.evaluate(({ g, a, o }) => {
      const sonda = (css: string) => {
        const d = document.createElement('div');
        d.style.cssText = css;
        document.body.append(d);
        const ancho = parseFloat(getComputedStyle(d).width);
        d.remove();
        return ancho;
      };
      const grupo = document.querySelectorAll('section.grupo')[g];
      const autores = [...grupo.querySelectorAll<HTMLElement>('section.autor')];
      const autor = autores[a];
      const filas = [...autor.querySelectorAll<HTMLElement>('.lista-de-obras > li')];
      return {
        u2: sonda('width: calc(var(--unidad) * 2)'),
        antesOcultos: autores.slice(0, a).every((x) => !x.checkVisibility()),
        primeroVisible: autores.find((x) => x.checkVisibility()) === autor,
        bajoElRotulo: autor.getBoundingClientRect().top - grupo.querySelector(':scope > h2')!.getBoundingClientRect().bottom,
        filasAntesOcultas: filas.slice(0, o).every((x) => !x.checkVisibility()),
        primeraFila: filas.find((x) => x.checkVisibility()) === filas[o],
        filete: getComputedStyle(filas[o]).borderTopStyle === 'none' ? 0 : parseFloat(getComputedStyle(filas[o]).borderTopWidth),
      };
    }, { g: caso.g, a: caso.a, o: caso.o });
    expect(m.antesOcultos && m.primeroVisible, 'el Autor del ejemplo no es el primero visible de su grupo').toBe(true);
    expect(m.bajoElRotulo).toBeCloseTo(m.u2, 0);
    expect(m.filasAntesOcultas && m.primeraFila, 'la Obra del ejemplo no es la primera visible de su Autor').toBe(true);
    expect(m.filete).toBe(0);
  });

  test('«Buscar … en las citas» lleva a `/buscar/` con lo tecleado en su campo', async ({ page }) => {
    await abrir(page, AUTORES, 'autores', false);
    await campo(page, 'autores').fill('qqqqzzzz');
    await page.getByRole('link', { name: 'Buscar «qqqqzzzz» en las citas' }).click();
    await expect(page).toHaveURL(new RegExp(`${rutaDeLaBusqueda()}\\?q=qqqqzzzz$`));
    await expect(page.locator('#consulta')).toHaveValue('qqqqzzzz');
  });
});

test.describe('Historia 26.6 — el campo, su sitio y su foco', () => {
  for (const [ruta, directorio] of [
    [AUTORES, 'autores'],
    [OBRAS, 'obras'],
  ] as const) {
    test(`${ruta}: a 3 × --unidad del h1, sin botón ni placeholder, y el recuento a 2 × bajo él`, async ({ page }) => {
      await abrir(page, ruta, directorio);
      const entrada = campo(page, directorio);
      await expect(entrada).toHaveAttribute('type', 'search');
      await expect(entrada).not.toHaveAttribute('placeholder', /.*/);
      await expect(page.locator('main form')).toHaveCount(0);
      await expect(page.locator('.filtro button, .filtro [role="button"]')).toHaveCount(0);
      await expect(page.getByText(ETIQUETA_DEL_FILTRO[directorio], { exact: true })).toBeVisible();

      // Sin foco: filete inferior de `--grosor-filete` en `--contorno`, y nada más; la etiqueta,
      // a `--unidad` encima.
      const reposo = await entrada.evaluate((e) => {
        const sonda = (css: string) => {
          const d = document.createElement('div');
          d.style.cssText = css;
          document.body.append(d);
          const c = getComputedStyle(d);
          const r = { ancho: c.width, color: c.color };
          d.remove();
          return r;
        };
        const c = getComputedStyle(e);
        return {
          grosor: sonda('width: var(--grosor-filete)').ancho,
          contorno: sonda('color: var(--contorno)').color,
          u1: parseFloat(sonda('width: var(--unidad)').ancho),
          abajo: { ancho: c.borderBottomWidth, estilo: c.borderBottomStyle, color: c.borderBottomColor },
          otros: [c.borderTopWidth, c.borderLeftWidth, c.borderRightWidth],
          sombra: c.boxShadow,
          radio: c.borderRadius,
          fondo: c.backgroundColor,
          etiqueta: e.getBoundingClientRect().top - document.querySelector(`label[for="${e.id}"]`)!.getBoundingClientRect().bottom,
        };
      });
      expect(reposo.abajo).toEqual({ ancho: reposo.grosor, estilo: 'solid', color: reposo.contorno });
      expect(reposo.otros).toEqual(['0px', '0px', '0px']);
      expect(reposo.sombra).toBe('none');
      expect(reposo.radio).toBe('0px');
      expect(reposo.fondo).toBe('rgba(0, 0, 0, 0)');
      expect(reposo.etiqueta).toBeCloseTo(reposo.u1, 0);

      await entrada.fill('a');
      await page.clock.runFor(PAUSA_DE_TECLEO_MS);
      const m = await page.evaluate(() => {
        const sonda = (css: string) => {
          const d = document.createElement('div');
          d.style.cssText = css;
          document.body.append(d);
          const c = getComputedStyle(d);
          const r = { ancho: c.width, familia: c.fontFamily, cuerpo: c.fontSize, color: c.color };
          d.remove();
          return r;
        };
        const caja = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        const estilo = (s: string) => getComputedStyle(document.querySelector(s)!);
        return {
          u3: parseFloat(sonda('width: calc(var(--unidad) * 3)').ancho),
          u2: parseFloat(sonda('width: calc(var(--unidad) * 2)').ancho),
          sans: sonda('font-family: var(--sans)').familia,
          pie: sonda('font-size: var(--pie)').cuerpo,
          cuerpoLg: sonda('font-size: var(--cuerpo-lg)').cuerpo,
          apagada: sonda('color: var(--tinta-apagada)').color,
          tinta: sonda('color: var(--tinta)').color,
          h1: caja('main h1').bottom,
          campo: caja('.campo').top,
          entrada: caja('.campo input').bottom,
          region: caja('main [role="status"]').top,
          alto: caja('.campo input').height,
          deLaEntrada: { familia: estilo('.campo input').fontFamily, cuerpo: estilo('.campo input').fontSize, color: estilo('.campo input').color },
          deLaRegion: { familia: estilo('main [role="status"]').fontFamily, cuerpo: estilo('main [role="status"]').fontSize, color: estilo('main [role="status"]').color },
          deLaEtiqueta: { familia: estilo('.campo label').fontFamily, cuerpo: estilo('.campo label').fontSize, color: estilo('.campo label').color },
        };
      });
      expect(m.campo - m.h1).toBeCloseTo(m.u3, 0);
      expect(m.region - m.entrada).toBeCloseTo(m.u2, 0);
      expect(m.alto).toBeGreaterThanOrEqual(44);
      expect(m.deLaEntrada).toEqual({ familia: m.sans, cuerpo: m.cuerpoLg, color: m.tinta });
      expect(m.deLaRegion).toEqual({ familia: m.sans, cuerpo: m.pie, color: m.apagada });
      expect(m.deLaEtiqueta).toEqual({ familia: m.sans, cuerpo: m.pie, color: m.apagada });
    });

    test(`${ruta}: el foco va del campo a las letras y de ahí a la lista, con el anillo y el filete siena`, async ({ page }) => {
      await abrir(page, ruta, directorio);
      const entrada = campo(page, directorio);
      await entrada.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(entrada).toBeFocused();
      const foco = await entrada.evaluate((e) => {
        const sonda = document.createElement('span');
        sonda.style.color = 'var(--siena)';
        document.body.append(sonda);
        const siena = getComputedStyle(sonda).color;
        sonda.remove();
        const c = getComputedStyle(e);
        return {
          anillo: c.outlineStyle,
          colorDelAnillo: c.outlineColor,
          filete: c.borderBottomWidth,
          colorDelFilete: c.borderBottomColor,
          siena,
          visible: e.matches(':focus-visible'),
        };
      });
      expect(foco.visible).toBe(true);
      expect(foco.anillo).toBe('solid');
      expect(foco.colorDelAnillo).toBe(foco.siena);
      expect(foco.filete).toBe('2px');
      expect(foco.colorDelFilete).toBe(foco.siena);

      await page.keyboard.press('Tab');
      const primeraLetra = page.locator('#letras a').first();
      await expect(primeraLetra).toBeFocused();
      const letras = await page.locator('#letras a').count();
      for (let i = 0; i < letras; i++) await page.keyboard.press('Tab');
      // Tras la última letra, lo primero de la lista.
      const enfocado = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        return { dentroDeLetras: a.closest('#letras') !== null, enGrupo: a.closest('section.grupo') !== null };
      });
      expect(enfocado).toEqual({ dentroDeLetras: false, enGrupo: true });
    });
  }
});

test.describe('Historia 26.6 — sin guion, el Directorio entero', () => {
  for (const [ruta, directorio] of [
    [AUTORES, 'autores'],
    [OBRAS, 'obras'],
  ] as const) {
    test(`${ruta}: con JavaScript apagado, ni campo ni hueco, la lista entera y las letras a 3 × del h1`, async ({ browser }) => {
      const contexto = await browser.newContext({ javaScriptEnabled: false });
      const page = await contexto.newPage();
      try {
        await page.goto(ruta);
        await sinCampo(page, directorio);
      } finally {
        await contexto.close();
      }
    });

    test(`${ruta}: con el fichero del guion caído, igual`, async ({ page }) => {
      let abortadas = 0;
      await page.route(FICHERO, (peticion) => {
        abortadas++;
        return peticion.abort();
      });
      await page.goto(ruta);
      await page.waitForLoadState('load');
      expect(abortadas).toBe(1);
      await sinCampo(page, directorio);
    });
  }

  /** Sin campo, la región vacía y sin alto, la lista entera y las letras bajo el `h1`. */
  async function sinCampo(page: Page, directorio: DirectorioFiltrable) {
    await expect(page.locator('main input')).toHaveCount(0);
    await expect(page.getByText(ETIQUETA_DEL_FILTRO[directorio], { exact: true })).toHaveCount(0);
    const m = await page.evaluate(() => {
      const sonda = document.createElement('div');
      sonda.style.width = 'calc(var(--unidad) * 3)';
      document.body.append(sonda);
      const u3 = parseFloat(getComputedStyle(sonda).width);
      sonda.remove();
      const r = document.querySelector('main [role="status"]') as HTMLElement;
      return {
        u3,
        letras: document.querySelector('#letras')!.getBoundingClientRect().top - document.querySelector('main h1')!.getBoundingClientRect().bottom,
        region: { texto: r.textContent, alto: r.getBoundingClientRect().height, oculta: r.hidden },
        ocultas: document.querySelectorAll('.listado [hidden]').length,
        filas: document.querySelectorAll('section.grupo li').length,
        visibles: [...document.querySelectorAll<HTMLElement>('section.grupo li')].filter((li) => li.checkVisibility()).length,
      };
    });
    expect(m.region).toEqual({ texto: '', alto: 0, oculta: false });
    expect(m.letras).toBeCloseTo(m.u3, 0);
    expect(m.ocultas).toBe(0);
    expect(m.filas).toBeGreaterThan(0);
    expect(m.visibles).toBe(m.filas);
    // Las letras saltan, porque son anclas.
    const letra = page.getByRole('navigation', { name: 'Letras' }).getByRole('link').nth(1);
    const destino = (await letra.getAttribute('href'))!;
    await letra.click();
    await expect(page).toHaveURL(new RegExp(`${destino}$`));
  }
});

test.describe('Historia 26.6 — el campo entra sin mover lo que se está leyendo', () => {
  test('desplazada a un grupo antes de que llegue el guion, el grupo no se mueve al insertarse el campo', async ({ page }) => {
    let soltar: () => void = () => {};
    const retenido = new Promise<void>((r) => (soltar = r));
    await page.route(FICHERO, async (peticion) => {
      await retenido;
      await peticion.continue();
    });
    // El guion de módulo es diferido y retiene `DOMContentLoaded`: se espera a que el analizador
    // termine (`interactive`), que es antes de ejecutarlo.
    await page.goto(AUTORES, { waitUntil: 'commit' });
    await page.waitForFunction(() => document.readyState === 'interactive');
    const grupo = page.locator('section.grupo').nth(3);
    await grupo.evaluate((g) => g.scrollIntoView({ block: 'start' }));
    await expect(campo(page, 'autores')).toHaveCount(0);
    const antes = await grupo.evaluate((g) => g.getBoundingClientRect().top);
    soltar();
    await expect(campo(page, 'autores')).toBeAttached();
    // Un fotograma para que el anclaje del navegador haga su trabajo.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const despues = await grupo.evaluate((g) => g.getBoundingClientRect().top);
    expect(Math.abs(despues - antes)).toBeLessThanOrEqual(1);
  });

  test('sin desplazar, las letras bajan lo que mide el campo', async ({ page }) => {
    let soltar: () => void = () => {};
    const retenido = new Promise<void>((r) => (soltar = r));
    await page.route(FICHERO, async (peticion) => {
      await retenido;
      await peticion.continue();
    });
    await page.goto(OBRAS, { waitUntil: 'commit' });
    await page.waitForFunction(() => document.readyState === 'interactive');
    const letras = page.locator('#letras');
    const antes = await letras.evaluate((l) => l.getBoundingClientRect().top);
    soltar();
    await expect(campo(page, 'obras')).toBeAttached();
    const despues = await letras.evaluate((l) => l.getBoundingClientRect().top);
    const mide = await page.locator('.campo').evaluate((c) => c.getBoundingClientRect().height + parseFloat(getComputedStyle(c).marginTop));
    expect(despues - antes).toBeCloseTo(mide, 0);
  });
});

test.describe('Historia 26.6 — WCAG 2.2 AA con el campo', () => {
  for (const [ruta, directorio] of [
    [AUTORES, 'autores'],
    [OBRAS, 'obras'],
  ] as const) {
    test(`${ruta}: sin violaciones con el campo, con texto y a cero`, async ({ page }) => {
      await abrir(page, ruta, directorio, false);
      const estados: [string, () => Promise<void>][] = [
        ['con el campo', async () => {}],
        [
          'con texto',
          async () => {
            await campo(page, directorio).fill('a');
            await expect(region(page)).not.toHaveText('');
          },
        ],
        [
          'a cero',
          async () => {
            await campo(page, directorio).fill('qqqqzzzz');
            await expect(region(page)).toContainText('qqqqzzzz');
            await expect(page.locator('.a-cero a')).toBeVisible();
          },
        ],
      ];
      for (const [nombre, preparar] of estados) {
        await preparar();
        const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();
        const resumen = resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
        expect(resumen, `${ruta} ${nombre}\n${resumen.join('\n')}`).toEqual([]);
      }
    });
  }
});
