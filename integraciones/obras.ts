/**
 * Toda Obra publicada tiene Ficha de Obra — Historia 22.1, AD-25.
 *
 * El esquema de `src/content.config.ts` juzga una ficha a la vez; esto juzga la relación
 * entre fichas, Citas y Autores, que ningún esquema ve. Lee el corpus, se lo pasa a
 * `src/lib/obras.ts` —donde vive la regla, pura y probada sin construir— y **aborta la
 * construcción** si algo incumple. Es el mismo reparto que `integraciones/colecciones.ts`.
 *
 * Una ficha sin Citas publicadas **avisa y no rompe**: retirar una Cita no puede tumbar el
 * sitio (AD-18).
 */

import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerAutores, leerCitas, leerFichasDeObra, rutasDelCorpus } from '../tools/lib/corpus.ts';
import {
  avisosDeObras,
  fallosDeObras,
  formatearAvisosDeObras,
  formatearFallosDeObras,
  titularDeFallosDeObras,
} from '../src/lib/obras.ts';

export default function fichasDeObra(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<{ fallos: string[]; avisos: string[] }> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const fichas = (await leerFichasDeObra(rutas)).map((ficha) => ({
      ...ficha,
      // Relativa a la raíz y con barras normales: es como se teclea, también en Windows.
      ruta: relative(raiz, ficha.ruta).split('\\').join('/'),
    }));
    const citas = await leerCitas(rutas.citas);
    const autores = (await leerAutores(rutas)).map((a) => a.slug);
    return {
      fallos: fallosDeObras(fichas, citas, autores),
      avisos: avisosDeObras(fichas, citas),
    };
  }

  return {
    name: 'fichas-de-obra',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const { fallos, avisos } = await revisar();
        if (avisos.length > 0) logger.warn(`\n${formatearAvisosDeObras(avisos)}`);
        if (fallos.length === 0) return;
        // El detalle por el registro y el corte por la excepción, como en las Colecciones.
        logger.error(`\n${formatearFallosDeObras(fallos)}`);
        throw new Error(titularDeFallosDeObras(fallos.length));
      },

      // En el servidor de desarrollo se avisa y no se detiene: ahí es donde se arregla.
      'astro:server:setup': async ({ logger }) => {
        let revision: { fallos: string[]; avisos: string[] };
        try {
          revision = await revisar();
        } catch (fallo) {
          // Una ficha ilegible no tumba el servidor de desarrollo: es donde se arregla.
          logger.warn(
            `No se han podido revisar las Fichas de Obra: ${fallo instanceof Error ? fallo.message : String(fallo)}\n` +
              'El build no dejará publicar esto.',
          );
          return;
        }
        const { fallos, avisos } = revision;
        if (avisos.length > 0) logger.warn(`\n${formatearAvisosDeObras(avisos)}`);
        if (fallos.length === 0) return;
        logger.warn(
          `\n${formatearFallosDeObras(fallos)}` +
            `El build no dejará publicar esto: ${titularDeFallosDeObras(fallos.length)}\n`,
        );
      },
    },
  };
}
