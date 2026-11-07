import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { ETIQUETAS_DEL_BARRIDO } from '../../../src/lib/superficies.ts';
import { desviacionDelBarrido, sinDecidir } from './barrido.ts';

/**
 * Historia 34.0 — los barridos de axe y de foco, una vez con lo plegado cerrado y otra abierto.
 *
 * Viven aquí, y no dentro de `tests/e2e/accesibilidad.spec.ts`, porque los llaman dos ficheros:
 * ese, sobre cada superficie del sitio, y `tests/e2e/desplegable.spec.ts`, sobre una sonda con
 * desplegables. Hasta que una superficie pinte uno, la sonda es lo único que hace correr la
 * pasada abierta: sin ella, un fallo de estas funciones solo saldría con el primer consumidor.
 */

/**
 * Lo que se tabula. El `<summary>` va siempre: un `<details>` cerrado sigue siendo una parada del
 * tabulador por su `<summary>`. Lo que está dentro de un `<details>` cerrado no lo es, y
 * `recorrerElFoco` lo descarta antes de contar.
 */
export const ENFOCABLES = 'a[href], button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])';

/**
 * Tabula cada enfocable alcanzable de la página una vez y exige que ninguno suprima el anillo de
 * foco. Alcanzable es no estar dentro de un `<details>` cerrado salvo en su propio `<summary>`
 * (también anidados): así el tope del recorrido cuenta las paradas que de verdad hay.
 */
export async function recorrerElFoco(page: Page, ruta: string, estado: string) {
  /*
   * Cada enfocable lleva una marca única antes de tabular: así se reconoce sin ambigüedad
   * cuándo el recorrido vuelve al primero, y el tope sale de cuántos hay, no de un número
   * escrito a mano que una página larga superaría sin que nadie lo notara.
   */
  const enfocables = await page.evaluate((selector) => {
    document.querySelectorAll('[data-barrido-de-foco]').forEach((n) => n.removeAttribute('data-barrido-de-foco'));
    const alcanzable = (n: Element) => {
      let hijo: Element = n;
      for (let a = n.parentElement; a !== null; hijo = a, a = a.parentElement) {
        if (a instanceof HTMLDetailsElement && !a.open && hijo !== a.querySelector(':scope > summary')) return false;
      }
      return true;
    };
    const candidatos = [...document.querySelectorAll<HTMLElement>(selector)].filter(alcanzable);
    candidatos.forEach((n, i) => n.setAttribute('data-barrido-de-foco', String(i)));
    return candidatos.length;
  }, ENFOCABLES);
  expect(enfocables, `${ruta} ${estado}: no hay nada enfocable`).toBeGreaterThan(0);

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
  expect(vuelta, `${ruta} ${estado}: el recorrido con el tabulador no dio la vuelta en ${enfocables + 3} pasos`).toBe(true);
  expect(suprimidos, `${ruta} ${estado}`).toEqual([]);
}

/**
 * Abre todos los `<details>` de la página (UX-DR146). Todo lo plegado del sitio es un
 * `Desplegable` (`src/components/Desplegable.astro`), y cada uso se barre cerrado y abierto sin
 * escribir su propio paso. Dice cuántos abrió: sin ninguno, la página abierta es la misma que la
 * cerrada y el segundo barrido no se repite (hoy ninguna superficie del sitio pinta uno).
 */
export const abrirLosDesplegables = (page: Page) =>
  page.evaluate(() => {
    const desplegables = [...document.querySelectorAll('details')];
    desplegables.forEach((d) => {
      // Un acordeón exclusivo (`name`) cerraría a sus hermanos al abrir cada uno.
      d.removeAttribute('name');
      d.open = true;
    });
    // Los que de verdad quedaron abiertos, no los que se intentó abrir.
    return desplegables.filter((d) => d.open).length;
  });

/** Un barrido axe de la página tal como está, con lo que exige la 23.4. */
export async function auditar(page: Page, ruta: string, estado: string) {
  const resultado = await new AxeBuilder({ page }).withTags([...ETIQUETAS_DEL_BARRIDO]).analyze();

  const resumen = resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(resumen, `${ruta} ${estado}\n${resumen.join('\n')}`).toEqual([]);
  // Historia 23.4 — y lo que no es violación tampoco se calla: el barrido corrió entero, y
  // axe decidió en cada nodo la regla con la que responde de 2.5.8.
  expect(await desviacionDelBarrido(page, resultado), `${ruta} ${estado}: el barrido no corrió lo que pide`).toEqual({
    faltan: [],
    sobran: [],
  });
  const dudas = sinDecidir(resultado);
  expect(dudas, `${ruta} ${estado}: axe no supo decidir\n${dudas.join('\n')}`).toEqual([]);
}
