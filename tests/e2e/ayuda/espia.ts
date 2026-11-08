import type { Page } from '@playwright/test';
import { EVENTOS } from '../../../src/lib/vocabulario.ts';

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

/** Las acciones de copiar, por su nombre del vocabulario (Historia 30.5). */
const DE_COPIAR: readonly string[] = [EVENTOS.copiado, EVENTOS.copiadoDeReferencia, EVENTOS.copiadoDeFragmento];

/**
 * Lo que el espía vio de las acciones de copiar, en orden. Sin datos ni destino: lo que la isla no
 * pasa llega como `undefined`, y aquí se lee como nulo.
 */
export async function emitidosDeCopiar(page: Page): Promise<Emitido[]> {
  return (await emitidos(page))
    .filter((e) => DE_COPIAR.includes(e.evento))
    .map((e) => ({ evento: e.evento, datos: e.datos ?? null, destino: e.destino ?? null }));
}

/**
 * Un portapapeles que rechaza toda escritura y cuenta los intentos en `window.__escrituras`, para
 * que una prueba de «no pide nada» compruebe antes que la rama del rechazo corrió.
 */
export async function denegarPortapapeles(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const ventana = window as unknown as { __escrituras: number };
    ventana.__escrituras = 0;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: () => {
          ventana.__escrituras++;
          return Promise.reject(new Error('denegado'));
        },
        readText: () => Promise.resolve(''),
      },
      configurable: true,
    });
  });
}

/** Cuántas escrituras intentó la página en el portapapeles de `denegarPortapapeles`. */
export function escriturasDenegadas(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __escrituras: number }).__escrituras);
}
