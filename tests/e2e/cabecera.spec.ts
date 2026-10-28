import { expect, test, type Page } from '@playwright/test';
import {
  rutaDeCita,
  rutaDeLaBusqueda,
  rutaDeLaPortada,
  rutaDelDirectorioDeAutores,
  rutaDelDirectorioDeObras,
} from '../../src/lib/superficies.ts';

/**
 * Historia 26.5 — la cabecera «Sabiduría de Bolsillo · Autores · Obras · Buscar», en el navegador.
 *
 * Lo que `dist/` no dice y solo se ve pintado: el alto de las dos filas a 320 y 360 px (UX-DR55),
 * la fila única desde 600, el aire de `--unidad` entre zonas (UX-DR102), que la Cita sigue
 * empezando en la primera pantalla de 360 × 640 (FR-1, NFR-8), el reflujo con el texto al 200 %,
 * los colores y subrayados por función (UX-DR105), el orden de tabulación con su anillo
 * (UX-DR54, UX-DR101) y `aria-current`. Los enlaces, su orden, su zona y el alcance los fija
 * `tests/unit/publicable-y-alcanzable.test.ts` sobre `dist/`, que sí corre en el CI.
 *
 * Cada valor esperado de color y de medida sale de una sonda que resuelve el token en la misma
 * página, nunca de un número escrito aquí, salvo los 113 px que `DESIGN.md` declara y que esta
 * historia mide: si difieren, se anotan para `bmad-ux` y no se corrige `DESIGN.md` a mano.
 */

/** Una Página de Cita del Corpus servido, la misma que miden las pruebas del armazón. */
const CITA = rutaDeCita('miguel-de-cervantes-la-libertad-sancho-es-uno-de-los');
/** El alto que declara `DESIGN.md § Cabecera` bajo 600 px: 8 + 44 + 8 + 44 + 8 + 1. */
const ALTO_DECLARADO = 113;

interface Caja {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface Medida {
  ancho: number;
  cabecera: Caja;
  /** El ancho de la fila de la cabecera: su caja menos el relleno lateral del contenedor. */
  fila: number;
  marca: Caja;
  /** Dónde empieza el texto de la marca y el de «Autores», sin relleno. */
  textoDeLaMarca: number;
  textoDeAutores: number;
  enlaces: Caja[];
  /** `--unidad` resuelto dentro de la cabecera, en el mismo espacio que las cajas. */
  unidad: number;
  /** Si la página entera se desplaza en horizontal. */
  desborda: boolean;
  /** Si la cabecera desborda su caja, o algo suyo pasa del borde de su contenido. */
  desbordaLaCabecera: boolean;
  conNowrap: string[];
}

/** Mide la cabecera de la página cargada, después de que las fuentes estén listas. */
async function medirCabecera(page: Page): Promise<Medida> {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const caja = (r: DOMRect) => ({
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      width: r.width,
      height: r.height,
    });
    const cabecera = document.querySelector('header.cabecera') as HTMLElement;
    const marca = cabecera.querySelector('a.marca') as HTMLElement;
    const enlaces = [...cabecera.querySelectorAll('nav[aria-label="Principal"] a')] as HTMLElement[];
    const inicioDelTexto = (e: HTMLElement) => {
      const rango = document.createRange();
      rango.selectNodeContents(e);
      return rango.getClientRects()[0].left;
    };
    const sonda = document.createElement('div');
    sonda.style.cssText = 'height: var(--unidad)';
    cabecera.append(sonda);
    const unidad = sonda.getBoundingClientRect().height;
    sonda.remove();
    const estilo = getComputedStyle(cabecera);
    const rCabecera = cabecera.getBoundingClientRect();
    // El factor entre píxeles CSS y las cajas, por si el zoom las escala.
    const escala = rCabecera.width / cabecera.offsetWidth || 1;
    const fila =
      rCabecera.width - (parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight)) * escala;
    const conNowrap = [cabecera, ...cabecera.querySelectorAll('*')]
      .filter((e) => {
        const c = getComputedStyle(e);
        return c.whiteSpace.includes('nowrap') || (c as CSSStyleDeclaration & { textWrapMode?: string }).textWrapMode === 'nowrap';
      })
      .map((e) => `${e.tagName.toLowerCase()}.${e.className}`);
    return {
      ancho: window.innerWidth,
      cabecera: caja(rCabecera),
      fila,
      marca: caja(marca.getBoundingClientRect()),
      textoDeLaMarca: inicioDelTexto(marca),
      textoDeAutores: inicioDelTexto(enlaces[0]),
      enlaces: enlaces.map((e) => caja(e.getBoundingClientRect())),
      unidad,
      desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      desbordaLaCabecera:
        cabecera.scrollWidth > cabecera.clientWidth ||
        [...cabecera.querySelectorAll('*')].some(
          (e) => e.getBoundingClientRect().right > rCabecera.right - parseFloat(estilo.paddingRight) * escala + 0.5,
        ),
      conNowrap,
    };
  });
}

/** Las filas que forman unas cajas, por su borde superior, de arriba abajo. */
function filasDe(cajas: Caja[]): Caja[][] {
  const filas: Caja[][] = [];
  for (const c of [...cajas].sort((a, b) => a.top - b.top)) {
    const fila = filas.find((f) => Math.abs(f[0].top - c.top) < 1);
    if (fila) fila.push(c);
    else filas.push([c]);
  }
  return filas;
}

test.describe('Historia 26.5 — la cabecera, pintada', () => {
  for (const ancho of [320, 360]) {
    test(`a ${ancho} px va en dos filas de ${ALTO_DECLARADO} px, con 8 px entre zonas`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 640 });
      await page.goto(CITA);
      const m = await medirCabecera(page);
      test.info().annotations.push({
        type: 'medida',
        description: `cabecera a ${ancho} px: ${m.cabecera.height.toFixed(2)} px de alto`,
      });

      expect(m.unidad).toBe(8);
      expect(Math.abs(m.cabecera.height - ALTO_DECLARADO), `alto ${m.cabecera.height}`).toBeLessThanOrEqual(1);
      expect(m.desborda).toBe(false);
      expect(m.desbordaLaCabecera).toBe(false);

      // Dos filas: la marca en la suya y los tres enlaces debajo, en una.
      expect(filasDe(m.enlaces)).toHaveLength(1);
      for (const enlace of m.enlaces) expect(enlace.top).toBeGreaterThanOrEqual(m.marca.bottom);

      // La marca va a su ancho, no a la fila entera.
      expect(m.marca.width).toBeLessThan(m.fila);
      // El texto de «Autores» alineado con el de la marca: el primero se retranquea su relleno.
      expect(Math.abs(m.textoDeAutores - m.textoDeLaMarca), `${m.textoDeAutores} frente a ${m.textoDeLaMarca}`).toBeLessThanOrEqual(1);
      // La zona de la marca, a `--unidad` de las de los enlaces.
      expect(Math.abs(m.enlaces[0].top - m.marca.bottom - m.unidad)).toBeLessThanOrEqual(0.5);
      // Y aire de `--unidad` arriba y abajo (el filete de 1 px va debajo del relleno).
      expect(Math.abs(m.marca.top - m.cabecera.top - m.unidad)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(m.cabecera.bottom - 1 - m.enlaces[0].bottom - m.unidad)).toBeLessThanOrEqual(0.5);

      // Cada zona de toque, de 44 × 44 como mínimo, también la de la marca en alto.
      expect(m.marca.height).toBeGreaterThanOrEqual(44);
      for (const enlace of m.enlaces) {
        expect(enlace.height).toBeGreaterThanOrEqual(44);
        expect(enlace.width).toBeGreaterThanOrEqual(44);
      }
      expect(m.conNowrap).toEqual([]);
    });
  }

  for (const ancho of [600, 1280]) {
    test(`a ${ancho} px va en una sola fila`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto(CITA);
      const m = await medirCabecera(page);
      expect(filasDe(m.enlaces)).toHaveLength(1);
      // La marca a la izquierda y los enlaces a la derecha, en la misma línea.
      expect(m.marca.top).toBeLessThan(m.enlaces[0].bottom);
      expect(m.enlaces[0].top).toBeLessThan(m.marca.bottom);
      expect(m.enlaces[0].left).toBeGreaterThan(m.marca.right);
      // Con 2 × `--unidad` de aire arriba.
      expect(Math.abs(m.enlaces[0].top - m.cabecera.top - 2 * m.unidad)).toBeLessThanOrEqual(0.5);
      expect(m.desborda).toBe(false);
    });
  }

  test('a 360 × 640, el texto de la Cita empieza en la primera pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(CITA);
    await page.evaluate(() => document.fonts.ready);
    const texto = await page.evaluate(() => {
      const e = document.querySelector('main .texto') as HTMLElement;
      const rango = document.createRange();
      rango.selectNodeContents(e);
      const primeraLinea = rango.getClientRects()[0];
      return { arriba: e.getBoundingClientRect().top, finDeLaPrimeraLinea: primeraLinea.bottom };
    });
    test.info().annotations.push({
      type: 'medida',
      description: `la Cita empieza a ${texto.arriba.toFixed(2)} px y su primera línea acaba a ${texto.finDeLaPrimeraLinea.toFixed(2)} px (360 × 640)`,
    });
    expect(texto.arriba).toBeLessThan(640);
    expect(texto.finDeLaPrimeraLinea).toBeLessThan(640);
  });

  /*
   * El texto al 200 % se simula con zoom sobre `<html>` (decisión de Héctor del 2026-10-19): los
   * cuerpos de `src/styles/tokens.css` están en px y subir la letra raíz no los movería. La
   * ventana sigue en 320 —las media queries ven 320— y el ancho CSS queda en 160.
   *
   * Se juzga la cabecera, que es lo de esta historia: que la **página** entera no se desplace
   * con el texto al 200 % en toda superficie es la 26.9, que extiende esta misma simulación (hoy
   * desborda el contenido de la Página de Cita, no la cabecera).
   */
  test('a 320 px con el texto al 200 %, los enlaces se parten con 8 px entre filas y la cabecera no desborda', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(CITA);
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    const m = await medirCabecera(page);

    expect(m.desbordaLaCabecera, 'la cabecera desborda').toBe(false);
    const filas = filasDe(m.enlaces);
    expect(filas.length, 'los enlaces no se partieron').toBeGreaterThan(1);
    for (let i = 1; i < filas.length; i += 1) {
      const entre = filas[i][0].top - Math.max(...filas[i - 1].map((c) => c.bottom));
      expect(Math.abs(entre - m.unidad), `entre filas: ${entre} frente a ${m.unidad}`).toBeLessThanOrEqual(0.5);
    }
    for (const enlace of m.enlaces) expect(enlace.right).toBeLessThanOrEqual(m.cabecera.right);
    expect(m.marca.right).toBeLessThanOrEqual(m.cabecera.right);
    expect(m.conNowrap).toEqual([]);
  });

  test('colores y subrayados por función, y los puntos ocultos al lector', async ({ page }) => {
    await page.goto(CITA);
    const m = await page.evaluate(() => {
      const sonda = (css: string) => {
        const d = document.createElement('div');
        d.style.cssText = css;
        document.body.append(d);
        const r = getComputedStyle(d).color;
        d.remove();
        return r;
      };
      const de = (e: Element) => {
        const c = getComputedStyle(e);
        return { color: c.color, subrayado: c.textDecorationLine, familia: c.fontFamily };
      };
      const cabecera = document.querySelector('header.cabecera')!;
      return {
        tinta: sonda('color: var(--tinta)'),
        apagada: sonda('color: var(--tinta-apagada)'),
        siena: sonda('color: var(--siena)'),
        filete: sonda('color: var(--filete)'),
        fileteDeLaCabecera: getComputedStyle(cabecera).borderBottomColor,
        marca: de(cabecera.querySelector('a.marca')!),
        enlaces: [...cabecera.querySelectorAll('nav[aria-label="Principal"] a')].map((a) => ({
          texto: a.textContent!.trim(),
          ...de(a),
        })),
        puntos: [...cabecera.querySelectorAll('nav[aria-label="Principal"] li > [aria-hidden]')].map((p) => ({
          texto: p.textContent,
          oculto: p.getAttribute('aria-hidden'),
          color: getComputedStyle(p).color,
        })),
      };
    });

    expect(m.fileteDeLaCabecera).toBe(m.filete);
    expect(m.marca).toMatchObject({ color: m.tinta, subrayado: 'none' });
    expect(m.enlaces).toEqual([
      expect.objectContaining({ texto: 'Autores', color: m.tinta, subrayado: 'underline' }),
      expect.objectContaining({ texto: 'Obras', color: m.tinta, subrayado: 'underline' }),
      expect.objectContaining({ texto: 'Buscar', color: m.siena, subrayado: 'underline' }),
    ]);
    // Dos puntos medios, uno detrás de «Autores» y otro detrás de «Obras»; ninguna flecha.
    expect(m.puntos).toEqual([
      { texto: '·', oculto: 'true', color: m.apagada },
      { texto: '·', oculto: 'true', color: m.apagada },
    ]);
    await expect(page.locator('header.cabecera')).not.toContainText(/[→›]/);
    // La lista sigue teniendo tres elementos para el lector de pantalla.
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('listitem')).toHaveCount(3);
  });

  test('el teclado recorre el salto, la marca, Autores, Obras, Buscar y luego `main`, con el anillo', async ({ page }) => {
    await page.goto(CITA);
    const siena = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.cssText = 'color: var(--siena)';
      document.body.append(d);
      const c = getComputedStyle(d).color;
      d.remove();
      return c;
    });
    const enfocado = () =>
      page.evaluate(() => {
        const e = document.activeElement as HTMLElement;
        const c = getComputedStyle(e);
        return {
          texto: e.textContent?.trim() ?? '',
          enMain: e.closest('main') !== null,
          anillo: `${c.outlineStyle} ${c.outlineColor}`,
        };
      });

    const recorrido = [];
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      recorrido.push(await enfocado());
    }
    expect(recorrido.slice(0, 5).map((f) => f.texto)).toEqual([
      'Saltar al contenido.',
      'Sabiduría de Bolsillo',
      'Autores',
      'Obras',
      'Buscar',
    ]);
    expect(recorrido[5].enMain, `tras «Buscar» el foco va a ${recorrido[5].texto}`).toBe(true);
    for (const f of recorrido.slice(1, 5)) expect(f.anillo, f.texto).toBe(`solid ${siena}`);
  });

  test('`aria-current="page"` solo en su página', async ({ page }) => {
    const casos: [string, string | null][] = [
      [rutaDeLaPortada(), rutaDeLaPortada()],
      [rutaDelDirectorioDeAutores(), rutaDelDirectorioDeAutores()],
      [rutaDelDirectorioDeObras(), rutaDelDirectorioDeObras()],
      [`${rutaDeLaBusqueda()}?q=tiempo`, rutaDeLaBusqueda()],
      [CITA, null],
    ];
    for (const [ruta, actual] of casos) {
      await page.goto(ruta);
      const conActual = await page
        .locator('header.cabecera a[aria-current]')
        .evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('aria-current')]));
      expect(conActual, ruta).toEqual(actual === null ? [] : [[actual, 'page']]);
    }
  });
});
