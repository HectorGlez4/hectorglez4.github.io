/**
 * Los Personajes, puestos como puerta del build — Historia 35.2, AD-1, AD-4 v9.1.
 *
 * El esquema de la colección `personajes` juzga cada ficha a solas. Lo que ningún esquema ve es
 * la relación entre ficheros, y aquí se comprueban dos:
 *
 *   · **un solo espacio de slugs** con los Autores: un Personaje no puede llamarse como un Autor,
 *     activo en `corpus/autores/` o retirado en `corpus/_autores-retirados/`, porque el prefijo
 *     de una Cita (`dueñoPorPrefijo`) diría de quién es y no se sabría. El fallo nombra los dos
 *     ficheros;
 *   · **la Cita que nombra un Personaje que no existe**: su `personaje` es un slug y no una
 *     referencia del esquema, así que sin esto pasaría. El fallo nombra el fichero de la Cita y
 *     el slug.
 *
 * La clave de orden del Personaje publicado la exige `integraciones/claves.ts`, con la del Autor,
 * y su semblanza cotejada contra su biografía, `integraciones/cotejo.ts`. Como ellas, rompe en
 * `astro:build:start` y solo avisa en `astro dev`, que es donde se arregla lo que falla.
 */

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerAutores, leerCitas, leerPersonajes, rutasDelCorpus } from '../tools/lib/corpus.ts';
import { fallosDePersonajes } from '../tools/lib/personajes.ts';

/** La ruta relativa a la raíz, con barras `/`, que es como se teclea. */
function relativaALaRaiz(raiz: string, ruta: string): string {
  const conBarras = (texto: string) => texto.split('\\').join('/');
  const prefijo = conBarras(raiz).replace(/\/$/, '');
  const normalizada = conBarras(ruta);
  return normalizada.startsWith(`${prefijo}/`) ? normalizada.slice(prefijo.length + 1) : normalizada;
}

export default function personajesDelCorpus(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<string[]> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const [personajes, autores, retirados, citas] = await Promise.all([
      leerPersonajes(rutas),
      leerAutores(rutas),
      leerAutores({ ...rutas, autores: rutas.autoresRetirados }),
      leerCitas(rutas.citas),
    ]);
    const enRaiz = <E extends { ruta: string }>(e: E) => ({ ...e, ruta: relativaALaRaiz(raiz, e.ruta) });
    return fallosDePersonajes({
      personajes: personajes.map(enRaiz),
      autores: [...autores, ...retirados].map(enRaiz),
      citas: citas.map(enRaiz),
    });
  }

  const titular = (n: number) =>
    `Personajes: ${n} ${n === 1 ? 'incumplimiento' : 'incumplimientos'}. Un Personaje no comparte ` +
    'slug con ningún Autor, y toda Cita que nombra un Personaje lo encuentra en corpus/personajes/.';

  return {
    name: 'personajes',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const fallos = await revisar();
        if (fallos.length === 0) return;
        logger.error(`\n${fallos.join('\n')}\n`);
        throw new Error(titular(fallos.length));
      },

      'astro:server:setup': async ({ logger }) => {
        let fallos: string[];
        try {
          fallos = await revisar();
        } catch (error) {
          logger.warn(`Personajes: no se pudo leer el Corpus (${error instanceof Error ? error.message : String(error)}).`);
          return;
        }
        if (fallos.length === 0) return;
        logger.warn(`\n${fallos.join('\n')}\nEl build no dejará publicar esto: ${titular(fallos.length)}\n`);
      },
    },
  };
}
