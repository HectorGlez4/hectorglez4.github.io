/**
 * La cobertura tipográfica, puesta como puerta del build.
 *
 * Ninguna página se publica con un carácter que las fuentes declaradas en
 * `astro.config.mjs` no sepan componer. Esta integración lee el `dist/` recién
 * construido, se lo pasa a `tools/lib/cobertura.ts` —que es donde vive el criterio, puro
 * y probado sin construir— y **aborta la construcción** si algo se sale. No se degrada a
 * aviso.
 *
 * Por qué en `astro:build:done` y no antes: lo que se juzga es la página compuesta, con
 * su Cita, su Autor, su Tema y su pie ya puestos. Un carácter puede entrar por el corpus,
 * por un rótulo de `src/lib/` o por una plantilla, y solo el HTML final los tiene todos.
 * Es la misma razón por la que el cotejo mira el corpus entero y no un fichero suelto.
 *
 * Por qué se llega tarde a propósito: aquí el `dist/` ya está escrito. Romper después de
 * escribirlo suena raro y no lo es —lo que publica es el despliegue, no el build, y el
 * despliegue no ocurre si el build sale con error—. La alternativa, componer las páginas
 * a mano antes de tiempo, sería un segundo motor de construcción que puede discrepar del
 * de verdad.
 *
 * AD-22 — no pide nada por la red. Lee lo que el build acaba de dejar en disco.
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import type { AstroIntegration } from 'astro';
import {
  formatearFallos,
  resumenDelBuild,
  revisarCobertura,
  titularDeFallos,
  type PaginaConstruida,
} from '../tools/lib/cobertura.ts';

/** Como se teclea: relativa a `dist/` y con `/` también en Windows. */
function comoSeNombra(raiz: string, ruta: string): string {
  return relative(raiz, ruta).split(sep).join('/');
}

async function ficherosBajo(raiz: string, extensiones: readonly string[]): Promise<string[]> {
  const entradas = await readdir(raiz, { withFileTypes: true, recursive: true });
  return entradas
    .filter((entrada) => entrada.isFile() && extensiones.some((ext) => entrada.name.endsWith(ext)))
    .map((entrada) => join(entrada.parentPath, entrada.name));
}

/**
 * De dónde salen los `@font-face` que la puerta lee.
 *
 * Astro reparte el CSS entre `<style>` incrustados en cada página y hojas sueltas en
 * `_astro/`, y el reparto depende del tamaño: una familia que hoy va incrustada mañana
 * puede salir a un fichero sin que nadie lo decida. Se miran los dos sitios para que la
 * puerta no dependa de ese umbral.
 *
 * Se deduplica porque los mismos `@font-face` se repiten en las 283 páginas.
 */
function hojasDeEstilo(paginas: readonly PaginaConstruida[], sueltas: readonly string[]): string {
  const bloques = new Set<string>(sueltas);

  for (const { html } of paginas) {
    for (const bloque of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      const cuerpo = bloque[1] ?? '';
      if (cuerpo.includes('@font-face')) bloques.add(cuerpo);
    }
  }

  return [...bloques].join('\n');
}

export default function coberturaTipografica(): AstroIntegration {
  return {
    name: 'cobertura-tipografica',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const raiz = fileURLToPath(dir);

        const rutasDePagina = await ficherosBajo(raiz, ['.html']);
        const paginas: PaginaConstruida[] = await Promise.all(
          rutasDePagina.map(async (ruta) => ({
            ruta: comoSeNombra(raiz, ruta),
            html: await readFile(ruta, 'utf8'),
          })),
        );

        const rutasDeHoja = await ficherosBajo(raiz, ['.css']);
        const sueltas = await Promise.all(rutasDeHoja.map((ruta) => readFile(ruta, 'utf8')));

        const resultado = revisarCobertura(paginas, hojasDeEstilo(paginas, sueltas));

        if (!resultado.ok) {
          /*
           * El detalle por el registro y el corte por la excepción, como en el cotejo: el
           * registro es lo que se lee para saber qué arreglar, y la excepción es lo que
           * detiene la construcción. Registrar sin lanzar degradaría la puerta a aviso y
           * publicaría justo lo que existe para impedir.
           */
          logger.error(`\n${formatearFallos(resultado.fallos)}`);
          throw new Error(titularDeFallos(resultado.fallos.length));
        }

        logger.info(resumenDelBuild(resultado.paginasRevisadas, resultado.familias));
      },
    },
  };
}
