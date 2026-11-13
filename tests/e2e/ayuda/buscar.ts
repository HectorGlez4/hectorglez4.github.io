import type { Page } from '@playwright/test';

/**
 * Escribe la consulta en `/buscar/` y espera a que la lista se estabilice: con resultados, o con la
 * salida sin resultados a la vista. Lo comparten `busqueda.spec.ts` y, desde la Historia 26.12,
 * `tipografia-calculada.spec.ts`, que mide la página con resultados pintados.
 */
export async function buscar(page: Page, consulta: string) {
  await page.goto('/buscar/');
  await page.locator('[data-consulta]').fill(consulta);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-resultados]')!.children.length > 0 ||
      !document.querySelector('[data-salida]')!.hasAttribute('hidden'),
    undefined,
    { timeout: 10_000 },
  );
}
