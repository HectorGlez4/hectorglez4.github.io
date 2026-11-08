import { expect, test, type Locator, type Page } from '@playwright/test';
import { autorEnUnaPagina, autorEnVariasPaginas, citasPorTema } from './ayuda/corpus.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

/**
 * Historia 34.3, UX-DR133, FR-6 — el Campo de búsqueda se ve como campo, en cada superficie que lo
 * lleva: contorno completo de `--grosor-filete` en `--contorno`, radio `--radio`, fondo `--papel`,
 * relleno de `--unidad` a los lados y alto de la zona de toque; al llegar con el teclado, los cuatro
 * lados a 2 × `--grosor-filete` en siena, el anillo global puesto, y ni la caja ni lo tecleado se
 * mueven. Los tokens se resuelven con sondas en el propio navegador, nunca con un literal.
 *
 * El Tema y el Autor se toman del Corpus —«La vida» si tiene página, si no el primer Tema que la
 * tenga— y la Obra, de la Página de Autor (su primer enlace a `/obra/`): así ninguna siembra deja la
 * prueba mirando una ruta que ya no existe; sin la superficie, la prueba se salta diciéndolo.
 */

const autor = autorEnVariasPaginas() ?? autorEnUnaPagina();
const temas = citasPorTema();
const tema =
  (temas.get('la-vida') ?? 0) >= MIN_CITAS_POR_TEMA
    ? 'la-vida'
    : [...temas].find(([, citas]) => citas >= MIN_CITAS_POR_TEMA)?.[0];

const SUPERFICIES: { nombre: string; ruta: (page: Page) => Promise<string | undefined> }[] = [
  { nombre: 'Tema', ruta: async () => (tema === undefined ? undefined : `/tema/${tema}/`) },
  { nombre: 'Autor', ruta: async () => (autor === undefined ? undefined : `/autor/${autor.slug}/`) },
  {
    nombre: 'Obra',
    ruta: async (page) => {
      if (autor === undefined) return undefined;
      await page.goto(`/autor/${autor.slug}/`);
      // `count()` no espera: sin ningún enlace a una Obra la superficie se salta, no agota el plazo.
      const enlaces = page.locator('main a[href^="/obra/"]');
      if ((await enlaces.count()) === 0) return undefined;
      return (await enlaces.first().getAttribute('href')) ?? undefined;
    },
  },
  { nombre: '/buscar/', ruta: async () => '/buscar/' },
  { nombre: '404', ruta: async () => '/una-ruta-que-no-existe/' },
  { nombre: '/autores/', ruta: async () => '/autores/' },
  { nombre: '/obras/', ruta: async () => '/obras/' },
];

/** Los tokens del trato, resueltos en el navegador: colores como `rgb(…)` y medidas en px. */
async function tokens(page: Page) {
  return page.evaluate(() => {
    const sonda = (propiedad: string, valor: string) => {
      const e = document.createElement('div');
      e.style.setProperty(propiedad, valor);
      document.body.append(e);
      const leido = getComputedStyle(e).getPropertyValue(propiedad);
      e.remove();
      return leido;
    };
    return {
      filete: sonda('width', 'var(--grosor-filete)'),
      doble: sonda('width', 'calc(var(--grosor-filete) * 2)'),
      contorno: sonda('color', 'var(--contorno)'),
      siena: sonda('color', 'var(--siena)'),
      papel: sonda('background-color', 'var(--papel)'),
      radio: sonda('width', 'var(--radio)'),
      unidad: sonda('width', 'var(--unidad)'),
      toque: parseFloat(sonda('width', 'var(--zona-de-toque)')),
    };
  });
}

/** Lo que se mide del campo: bordes, fondo, relleno, anillo y dónde caen su caja y su contenido. */
function medir(entrada: Locator) {
  return entrada.evaluate((e) => {
    const c = getComputedStyle(e);
    const caja = e.getBoundingClientRect();
    const lados = ['Top', 'Right', 'Bottom', 'Left'] as const;
    // Lo que sigue al campo en el flujo: el primer elemento pintado tras `.campo-de-busqueda`
    // (los `hidden` del formulario no se pintan), subiendo de nivel si no hay hermano.
    const pintadoTras = (desde: Element | null): Element | undefined => {
      for (let nivel = desde; nivel !== null && nivel !== document.body; nivel = nivel.parentElement) {
        for (let h = nivel.nextElementSibling; h !== null; h = h.nextElementSibling) {
          if (h.getClientRects().length > 0) return h;
        }
      }
      return undefined;
    };
    const siguiente = pintadoTras(e.closest('.campo-de-busqueda'))?.getBoundingClientRect();
    return {
      anchos: lados.map((l) => c.getPropertyValue(`border-${l.toLowerCase()}-width`)),
      colores: lados.map((l) => c.getPropertyValue(`border-${l.toLowerCase()}-color`)),
      estilos: lados.map((l) => c.getPropertyValue(`border-${l.toLowerCase()}-style`)),
      radios: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius],
      fondo: c.backgroundColor,
      rellenoIzquierdo: c.paddingLeft,
      rellenoDerecho: c.paddingRight,
      rellenoArriba: c.paddingTop,
      rellenoAbajo: c.paddingBottom,
      sombra: c.boxShadow,
      anillo: c.outlineStyle,
      colorDelAnillo: c.outlineColor,
      enfocado: e.matches(':focus-visible'),
      // En coordenadas de la página, no de la ventana: un desplazamiento al enfocar no es un movimiento.
      caja: { x: caja.x + scrollX, y: caja.y + scrollY, ancho: caja.width, alto: caja.height },
      contenido: {
        x: caja.x + scrollX + parseFloat(c.borderLeftWidth) + parseFloat(c.paddingLeft),
        y: caja.y + scrollY + parseFloat(c.borderTopWidth) + parseFloat(c.paddingTop),
      },
      siguiente: siguiente === undefined ? undefined : { x: siguiente.x + scrollX, y: siguiente.y + scrollY },
    };
  });
}

test.describe('Historia 34.3 — el Campo de búsqueda se ve como campo', () => {
  for (const superficie of SUPERFICIES) {
    test(`${superficie.nombre}: contorno completo en reposo y siena doble al foco, sin mover nada`, async ({ page }) => {
      const ruta = await superficie.ruta(page);
      test.skip(ruta === undefined, `${superficie.nombre}: el Corpus no tiene hoy esta superficie`);
      const respuesta = await page.goto(ruta!);
      expect(respuesta?.status(), ruta).toBe(superficie.nombre === '404' ? 404 : 200);
      const entrada = page.locator('.campo-de-busqueda input[type="search"]').first();
      await expect(entrada, `${ruta}: sin Campo de búsqueda`).toBeVisible();

      const t = await tokens(page);
      const reposo = await medir(entrada);
      expect(reposo.anchos, ruta).toEqual([t.filete, t.filete, t.filete, t.filete]);
      expect(reposo.estilos, ruta).toEqual(['solid', 'solid', 'solid', 'solid']);
      expect(reposo.colores, ruta).toEqual([t.contorno, t.contorno, t.contorno, t.contorno]);
      expect(reposo.radios, ruta).toEqual([t.radio, t.radio, t.radio, t.radio]);
      expect(reposo.fondo, ruta).toBe(t.papel);
      expect(reposo.rellenoIzquierdo, ruta).toBe(t.unidad);
      expect(reposo.rellenoDerecho, ruta).toBe(t.unidad);
      expect([reposo.rellenoArriba, reposo.rellenoAbajo], ruta).toEqual([t.unidad, t.unidad]);
      expect(reposo.sombra, ruta).toBe('none');
      expect(reposo.caja.alto, ruta).toBeGreaterThanOrEqual(t.toque);
      // Sin algo pintado tras el campo, «lo que sigue no se mueve» se cumpliría en vacío.
      expect(reposo.siguiente, `${ruta}: nada pintado tras el campo`).toBeDefined();

      // Al campo con el teclado: se enfoca, se sale hacia atrás y se vuelve con Tab.
      await entrada.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(entrada).toBeFocused();
      const foco = await medir(entrada);
      expect(foco.enfocado, ruta).toBe(true);
      expect(foco.anchos, ruta).toEqual([t.doble, t.doble, t.doble, t.doble]);
      expect(foco.colores, ruta).toEqual([t.siena, t.siena, t.siena, t.siena]);
      expect(foco.anillo, ruta).toBe('solid');
      expect(foco.colorDelAnillo, ruta).toBe(t.siena);
      expect(foco.caja, `${ruta}: la caja del campo se mueve al foco`).toEqual(reposo.caja);
      expect(foco.contenido, `${ruta}: lo tecleado se mueve al foco`).toEqual(reposo.contenido);
      expect(foco.siguiente, `${ruta}: lo que sigue al campo se mueve al foco`).toEqual(reposo.siguiente);
    });
  }
});
