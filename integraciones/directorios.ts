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
import { rutaDelDirectorioDeObras } from '../src/lib/superficies.ts';

/**
 * El fichero que se mide, relativo a `dist/`: el `index.html` que el hospedaje sirve para
 * `rutaDelDirectorioDeObras()`. Sale del constructor y no se escribe a mano: si la ruta cambia,
 * la medida la sigue en vez de quedarse avisando de un fichero que ya no existe.
 */
export const FICHERO_DEL_DIRECTORIO_DE_OBRAS = `${rutaDelDirectorioDeObras().replace(/^\/+|\/+$/gu, '')}/index.html`;

/** Una medida que no se pudo tomar, con su motivo: nunca se disfraza de cero ni de otro estado. */
export interface MedidaFallida {
  motivo: string;
}

/** Lo que el build escribe sobre el tamaño de `/obras/`: informar o avisar, y con qué frase. */
export interface InformeDelDirectorioDeObras {
  nivel: 'info' | 'warn';
  mensaje: string;
}

/**
 * El veredicto sobre el tamaño de `/obras/`, puro: con los bytes medidos —o la medida fallida,
 * con su motivo— y el tope, que por omisión es el de `umbrales.ts`. Igualar el tope informa;
 * pasarlo avisa. Ninguna rama lanza.
 */
export function avisoDelDirectorioDeObras(
  bytes: number | MedidaFallida,
  tope: number = MAX_BYTES_DEL_DIRECTORIO_DE_OBRAS,
): InformeDelDirectorioDeObras {
  if (typeof bytes !== 'number') {
    return {
      nivel: 'warn',
      mensaje:
        `No se pudo medir el Directorio de Obras: ${bytes.motivo}. ` +
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

/**
 * Los bytes de un fichero, o por qué no se pudieron medir: que falte no es lo mismo que no
 * dejarse leer, y el aviso dice cuál de las dos pasó.
 */
export async function bytesDe(ruta: string, nombre: string): Promise<number | MedidaFallida> {
  try {
    const datos = await stat(ruta);
    return datos.isFile() ? datos.size : { motivo: `${nombre} no es un fichero` };
  } catch (error) {
    const codigo = (error as NodeJS.ErrnoException).code;
    if (codigo === 'ENOENT') return { motivo: `falta ${nombre}` };
    return { motivo: `no se pudo leer ${nombre} (${codigo ?? (error as Error).message})` };
  }
}

export default function tamañoDelDirectorioDeObras(): AstroIntegration {
  return {
    name: 'tamaño-del-directorio-de-obras',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const bytes = await bytesDe(
          join(fileURLToPath(dir), ...FICHERO_DEL_DIRECTORIO_DE_OBRAS.split('/')),
          `dist/${FICHERO_DEL_DIRECTORIO_DE_OBRAS}`,
        );
        const { nivel, mensaje } = avisoDelDirectorioDeObras(bytes);
        if (nivel === 'warn') logger.warn(mensaje);
        else logger.info(mensaje);
      },
    },
  };
}
