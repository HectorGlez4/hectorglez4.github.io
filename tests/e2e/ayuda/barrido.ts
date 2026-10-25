import type { Page } from '@playwright/test';
import axe, { type AxeResults } from 'axe-core';
import { CRITERIOS_QUE_AÑADE_WCAG_22, elBarridoLaCorre, type ReglaDeAxe } from '../../../src/lib/superficies.ts';

/**
 * Historia 23.4 — lo que un barrido de axe dice de sí mismo, para que la prueba lo observe en el
 * resultado y no se lo crea por cómo está escrita la llamada.
 *
 * Un barrido por etiquetas que alguien acota después —`.withRules(…)` sustituye las etiquetas,
 * `.include(…)` lo reduce a un nodo— devuelve cero violaciones igual que uno entero. La guardia
 * de `tests/unit/superficies.test.ts` lee el código y lo prohíbe; esto lo **ve**: cada regla que
 * corre sale en una, y solo una, de las cuatro listas del resultado, así que el conjunto de las
 * que salen es el de las que corrieron, y se coteja con el de las que el barrido pide.
 */

/** Las reglas que corrieron en un análisis, sin repetir y en orden. */
export function reglasEjecutadas(resultado: AxeResults): string[] {
  const listas = [resultado.passes, resultado.violations, resultado.incomplete, resultado.inapplicable];
  return [...new Set(listas.flat().map((r) => r.id))].sort();
}

/**
 * Las reglas que conoce la axe que el análisis inyectó en la página: todas, también las
 * experimentales, las retiradas y las de etiquetas que el barrido no pide. Se leen de la página
 * y no de `axe-core` en Node para que sean las de la axe que de verdad midió.
 */
export async function reglasDeLaPagina(page: Page): Promise<ReglaDeAxe[]> {
  return page.evaluate(() => {
    const axe = (window as unknown as { axe?: { getRules(): { ruleId: string; tags: string[] }[] } }).axe;
    if (axe === undefined) throw new Error('la página no tiene axe: hay que analizarla antes de preguntar');
    return axe.getRules().map((r) => ({ ruleId: r.ruleId, tags: r.tags }));
  });
}

/**
 * Lo que separa lo que corrió de lo que el barrido de página entera pide (`elBarridoLaCorre`):
 * `faltan` son reglas que no corrieron —un `.withRules(…)`, o una regla de página a la que un
 * `.include(…)` deja sin página— y `sobran`, reglas que el barrido no pide. Las dos vacías.
 */
export async function desviacionDelBarrido(
  page: Page,
  resultado: AxeResults,
): Promise<{ faltan: string[]; sobran: string[] }> {
  const pedidas = (await reglasDeLaPagina(page)).filter(elBarridoLaCorre).map((r) => r.ruleId);
  const corridas = reglasEjecutadas(resultado);
  return {
    faltan: pedidas.filter((id) => !corridas.includes(id)).sort(),
    sobran: corridas.filter((id) => !pedidas.includes(id)).sort(),
  };
}

/**
 * Los nodos en que axe no supo decidir una regla con la que responde de un criterio de 2.2
 * (`comprueba: 'axe'`, hoy `target-size`), uno por línea con su selector. Lo que axe deja en
 * `incomplete` no lo ha comprobado nadie, y el título del barrido dice que 2.5.8 «lo comprueba
 * axe»: un solape que no sabe medir o un objetivo tapado tienen que verse, no pasar en silencio.
 */
export function sinDecidir(resultado: AxeResults): string[] {
  const reglas = new Set(CRITERIOS_QUE_AÑADE_WCAG_22.flatMap((c) => (c.comprueba === 'axe' ? [c.regla] : [])));
  return resultado.incomplete
    .filter((r) => reglas.has(r.id))
    .flatMap((r) => r.nodes.map((n) => `${r.id}: ${n.target.join(' ')}`));
}

/**
 * La versión de la axe que el adaptador inyectó en la página y la de `axe-core` en la raíz, que
 * es la que lee Vitest y la que fija `tests/unit/superficies.test.ts`. Tienen que ser la misma: si
 * un `node_modules` viejo deja otra axe anidada bajo el adaptador, el navegador mediría con unas
 * reglas y Vitest cotejaría el reparto con otras, y el lock no lo diría porque no es el disco.
 */
export async function versionesDeAxe(page: Page): Promise<{ pagina: string; raiz: string }> {
  const pagina = await page.evaluate(() => {
    const axe = (window as unknown as { axe?: { version: string } }).axe;
    if (axe === undefined) throw new Error('la página no tiene axe: hay que analizarla antes de preguntar');
    return axe.version;
  });
  return { pagina, raiz: axe.version };
}
