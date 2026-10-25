import type { Page } from '@playwright/test';

/** Lo que una superficie pasó a `__medir`, en el orden en que lo pasó. */
export interface Emitido {
  evento: string;
  datos: unknown;
  destino: unknown;
}

/**
 * Un espía en `__medir`, el hueco por donde pasa toda la medición (AD-13) — Historia 23.1.
 *
 * Hasta la 23.1 las pruebas **asignaban** `window.__medir`, y valía porque nada lo definía sin
 * punto final. Ahora el arranque del armazón lo define en toda página, y una asignación de la
 * prueba —antes de cargar— la pisaría el arranque; y después de cargar, la pisaría el fichero
 * de medición cuando lo hay. Así que el espía es un **accesor**: quien lee `__medir` recibe el
 * espía, y quien lo asigna —el arranque, el fichero— solo cambia a quién reenvía el espía. La
 * cola del arranque queda colgada del espía (`__medir.q`) y el fichero la encuentra igual, de
 * modo que vale con y sin fichero, y también cuando el servidor de las pruebas se construya con
 * punto final.
 *
 * Se instala antes de navegar: `addInitScript` corre antes que cualquier guion de la página.
 */
export async function espiarMedicion(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const ventana = window as unknown as { __emitidos: unknown[] };
    ventana.__emitidos = [];
    let real: ((...argumentos: unknown[]) => void) | undefined;
    const espia = function (...argumentos: unknown[]) {
      ventana.__emitidos.push({ evento: argumentos[0], datos: argumentos[1], destino: argumentos[2] });
      if (real) real(...argumentos);
    };
    Object.defineProperty(window, '__medir', {
      configurable: true,
      get: () => espia,
      set: (funcion) => {
        real = funcion;
      },
    });
  });
}

/** Lo que el espía ha visto hasta ahora. */
export function emitidos(page: Page): Promise<Emitido[]> {
  return page.evaluate(() => (window as unknown as { __emitidos: Emitido[] }).__emitidos);
}
