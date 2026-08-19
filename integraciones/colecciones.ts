/**
 * La forma del conjunto de Colecciones, puesta como puerta del build — Historia 12.2.
 *
 * Dos ficheros que derivan el mismo identificador son una sola Colección para el sitio, y
 * el cargador de Astro se come el otro sin decir nada. Esta integración lee
 * `corpus/colecciones/`, se lo pasa a `tools/lib/colecciones.ts` —donde vive la regla,
 * pura y probada sin construir— y **aborta la construcción** si algo incumple.
 *
 * Por qué aquí y no en el esquema de contenido: un esquema juzga un fichero a la vez, y
 * esto es una relación entre ficheros. Por qué no en `src/lib/`: por AD-5 la derivación es
 * pura y no lee disco. Es el mismo reparto que el cotejo de la Historia 11.2, y va
 * enganchada en el mismo sitio y por el mismo motivo: `astro.config.mjs` es el único punto
 * por el que pasan todas las construcciones.
 *
 * Ojo con lo que esta puerta **no** hace: no comprueba que los miembros declarados
 * existan. Eso sería la referencia dura que la historia entera evita, y convertiría
 * retirar una Cita a `corpus/_revision/` en romper el build. Los miembros que no resuelven
 * se cuentan y se anuncian, en `src/lib/publicado.ts`.
 */

import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerColecciones, rutasDelCorpus } from '../tools/lib/corpus.ts';
import {
  fallosDeColecciones,
  formatearFallosDeColecciones,
  titularDeFallosDeColecciones,
  type FicheroDeColeccion,
} from '../tools/lib/colecciones.ts';

export default function formaDeLasColecciones(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<string[]> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const leidas = await leerColecciones(rutas);
    const ficheros: FicheroDeColeccion[] = leidas.map((coleccion) => ({
      // Relativa a la raíz y con barras normales: es como se teclea, también en Windows.
      ruta: relative(raiz, coleccion.ruta).split('\\').join('/'),
      slug: coleccion.slug,
    }));
    return fallosDeColecciones(ficheros);
  }

  return {
    name: 'forma-de-las-colecciones',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const fallos = await revisar();
        if (fallos.length === 0) return;
        // El detalle por el registro y el corte por la excepción, igual que en el cotejo:
        // el registro es lo que dice qué fichero renombrar y la excepción es lo que
        // detiene la construcción. Registrar sin lanzar lo degradaría a aviso.
        logger.error(`\n${formatearFallosDeColecciones(fallos)}`);
        throw new Error(titularDeFallosDeColecciones(fallos.length));
      },

      /*
       * En el servidor de desarrollo se avisa y no se detiene, por el mismo motivo que el
       * cotejo: `astro dev` no publica nada y es la superficie donde se arregla el fichero.
       */
      'astro:server:setup': async ({ logger }) => {
        const fallos = await revisar();
        if (fallos.length === 0) return;
        logger.warn(
          `\n${formatearFallosDeColecciones(fallos)}` +
            `El build no dejará publicar esto: ${titularDeFallosDeColecciones(fallos.length)}\n`,
        );
      },
    },
  };
}
