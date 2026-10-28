/**
 * El tamaño del Directorio de Obras, medido en el build — Historia 26.4, AD-9.
 *
 * `/obras/` es una sola página con todas las Obras publicadas y crece con el Corpus; paginarla
 * está aplazado. En `astro:build:done` esta integración mide los bytes de `dist/obras/index.html`
 * y los informa siempre; si pasan de `MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS` (`src/lib/umbrales.ts`),
 * avisa y reabre paginar `/obras/`. **Nunca rompe**: tampoco si no encuentra el fichero, que
 * entonces avisa de que no pudo medir —ausencia antes que cero—.
 *
 * Es una integración propia porque no es asunto de las demás: ni de la cobertura tipográfica ni
 * de qué se indexa. AD-22: no pide nada por la red, solo lee lo que el build acaba de escribir.
 */

import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import { MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS } from '../src/lib/umbrales.ts';

/** El fichero que se mide, relativo a `dist/`: la página de `rutaDelDirectorioDeObras()`. */
export const FICHERO_DEL_DIRECTORIO_DE_OBRAS = 'obras/index.html';

/** Lo que el build escribe sobre el tamaño de `/obras/`: informar o avisar, y con qué frase. */
export interface InformeDelDirectorioDeObras {
  nivel: 'info' | 'warn';
  mensaje: string;
}

/**
 * El veredicto sobre el tamaño de `/obras/`, puro: con los bytes medidos —o `undefined` si no se
 * pudo medir— y el tope, que por omisión es el de `umbrales.ts`. Igualar el tope informa;
 * pasarlo avisa. Ninguna rama lanza.
 */
export function avisoDelDirectorioDeObras(
  bytes: number | undefined,
  tope: number = MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS,
): InformeDelDirectorioDeObras {
  if (bytes === undefined) {
    return {
      nivel: 'warn',
      mensaje:
        `No se pudo medir el Directorio de Obras: falta dist/${FICHERO_DEL_DIRECTORIO_DE_OBRAS}. ` +
        'El build sigue; el tope MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS no se ha comprobado.',
    };
  }
  if (bytes > tope) {
    return {
      nivel: 'warn',
      mensaje:
        `El Directorio de Obras pesa ${bytes} bytes y pasa de MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS ` +
        `(${tope}): reabre paginar /obras/. El build sigue; decidirlo es de Héctor.`,
    };
  }
  return {
    nivel: 'info',
    mensaje: `El Directorio de Obras pesa ${bytes} bytes, dentro de MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS (${tope}).`,
  };
}

/** Los bytes de un fichero, o `undefined` si no existe o no se deja leer. */
async function bytesDe(ruta: string): Promise<number | undefined> {
  try {
    const datos = await stat(ruta);
    return datos.isFile() ? datos.size : undefined;
  } catch {
    return undefined;
  }
}

export default function tamañoDelDirectorioDeObras(): AstroIntegration {
  return {
    name: 'tamaño-del-directorio-de-obras',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const bytes = await bytesDe(join(fileURLToPath(dir), ...FICHERO_DEL_DIRECTORIO_DE_OBRAS.split('/')));
        const { nivel, mensaje } = avisoDelDirectorioDeObras(bytes);
        if (nivel === 'warn') logger.warn(mensaje);
        else logger.info(mensaje);
      },
    },
  };
}
