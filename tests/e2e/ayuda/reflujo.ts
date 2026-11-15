import { expect, type Page } from '@playwright/test';

/*
 * Historia 26.9 — el reflujo a 320 px, en sus tres condiciones. Vivía dentro de
 * `tests/e2e/accesibilidad.spec.ts`; la Historia 28.3 lo saca aquí porque lo usa también
 * `tests/e2e/obras-de-la-portada.spec.ts`, sobre un sitio de prueba servido en otro puerto, y dos
 * copias de la simulación divergirían a la primera corrección.
 */

/** Historia 26.9 — las tres condiciones del reflujo a 320 px (ver «Historia 26.9 — reflujo a 320 px»). */
export const CONDICIONES = ['texto por omisión', 'texto al 200 %', 'espaciado de 1.4.12'] as const;
export type Condicion = (typeof CONDICIONES)[number];
const ESPACIADO_1412 =
  '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important } p { margin-bottom: 2em !important }';

/**
 * Carga la ruta a 320 × 640 y aplica la condición, con su premisa comprobada. Devuelve si la
 * premisa se cumple: la premisa falla con `expect.soft` —para que las demás condiciones se sigan
 * midiendo— y quien llama no mide una condición cuya simulación no se aplicó, porque mediría el
 * texto por omisión y saldría en verde. `preparar` lleva la página al estado que se mide —una
 * búsqueda escrita, por ejemplo— antes de aplicar la condición.
 */
export async function cargarEn320(
  page: Page,
  ruta: string,
  condicion: Condicion,
  preparar?: (page: Page) => Promise<void>,
): Promise<boolean> {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(ruta);
  // Se mide con la Inter del sitio y no con la de reserva, que es más estrecha.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  if (preparar !== undefined) await preparar(page);
  if (condicion === 'texto al 200 %') {
    /*
     * La ventana es el `clientWidth` de `<html>` y no `innerWidth`: en el proyecto `movil` (Pixel
     * 7, `isMobile`) la ventana de diseño se ensancha con lo que desborda, y una página que
     * desbordase con el zoom fallaría aquí por «la simulación no se aplicó» en vez de por desbordar.
     */
    const premisa = await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
      return {
        ventana: document.documentElement.clientWidth,
        cuerpo: document.body.clientWidth,
        zoom: getComputedStyle(document.documentElement).zoom,
      };
    });
    const aplicada = premisa.zoom === '2' && Math.abs(premisa.cuerpo * 2 - premisa.ventana) <= 1;
    expect
      .soft(
        aplicada,
        `${ruta}: la simulación no se aplicó (texto al 200 %): zoom ${premisa.zoom}, ancho CSS de body ${premisa.cuerpo} con la ventana a ${premisa.ventana}`,
      )
      .toBe(true);
    return aplicada;
  }
  if (condicion === 'espaciado de 1.4.12') {
    await page.addStyleTag({ content: ESPACIADO_1412 });
    // Se comprueban las cuatro propiedades, sobre un párrafo de prueba: una hoja aplicada a medias no pasa.
    const premisa = await page.evaluate(() => {
      const p = document.createElement('p');
      p.textContent = 'sonda';
      document.body.append(p);
      const c = getComputedStyle(p);
      const letra = parseFloat(c.fontSize);
      const aplicadas = {
        letras: Math.abs(parseFloat(c.letterSpacing) - 0.12 * letra) <= 0.1,
        palabras: Math.abs(parseFloat(c.wordSpacing) - 0.16 * letra) <= 0.1,
        renglon: Math.abs(parseFloat(c.lineHeight) - 1.5 * letra) <= 0.1,
        parrafo: Math.abs(parseFloat(c.marginBottom) - 2 * letra) <= 0.1,
      };
      p.remove();
      return aplicadas;
    });
    const faltan = Object.entries(premisa)
      .filter(([, aplicada]) => !aplicada)
      .map(([cual]) => cual);
    expect.soft(faltan, `${ruta}: la simulación no se aplicó (espaciado de 1.4.12)`).toEqual([]);
    return faltan.length === 0;
  }
  return true;
}

export const anchoDeLaPagina = (page: Page) =>
  page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    ventana: document.documentElement.clientWidth,
  }));
