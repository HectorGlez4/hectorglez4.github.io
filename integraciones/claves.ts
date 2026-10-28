/**
 * La clave de orden, puesta como puerta del build — Historia 26.1, AD-1 (enmienda v8).
 *
 * El esquema de la colección `autores` juzga la **forma** de `ordenAlfabetico` fichero a
 * fichero. Lo que un esquema no puede ver es su **presencia**, porque no se le exige a toda
 * ficha sino al Autor **publicado** —el que tiene alguna Cita en `corpus/citas/`—, y eso es
 * una relación entre ficheros. Esta integración la comprueba con `autoresPublicados`, la misma
 * que decide qué Autores tienen página, y rompe la construcción nombrando el fichero y la
 * orden que lo arregla. Repite además la regla de forma, con el mismo validador, para que un
 * fallo de las dos clases salga en un solo informe.
 *
 * Un Autor sin Citas publicadas —o con todas en `corpus/_revision/`— construye sin clave: no
 * tiene letra en ningún Directorio.
 *
 * Como el cotejo (`integraciones/cotejo.ts`): rompe en `astro:build:start` y solo avisa en
 * `astro dev`, que es donde se arregla lo que falla.
 */

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerAutores, leerCitas, rutasDelCorpus } from '../tools/lib/corpus.ts';
import { fallosDeClaves } from '../tools/lib/claves.ts';
import { autoresPublicados, type Autor, type Cita } from '../src/lib/publicado.ts';

/** La ruta relativa a la raíz, con barras `/`, que es como se teclea. */
function relativaALaRaiz(raiz: string, ruta: string): string {
  const conBarras = (texto: string) => texto.split('\\').join('/');
  const prefijo = conBarras(raiz).replace(/\/$/, '');
  const normalizada = conBarras(ruta);
  return normalizada.startsWith(`${prefijo}/`) ? normalizada.slice(prefijo.length + 1) : normalizada;
}

export default function clavesDeOrden(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<string[]> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const autores = await leerAutores(rutas);
    const citas = await leerCitas(rutas.citas);
    /*
     * `autoresPublicados` solo mira el slug del Autor y el `autor` de cada Cita; el resto de
     * los tipos del sitio no hace falta para decidir quién está publicado.
     */
    const publicados = new Set(
      autoresPublicados(
        autores.map((a) => ({ slug: a.slug, nombre: String(a.nombre ?? '') }) as Autor),
        citas.map((c) => ({ autor: c.autor }) as Cita),
      ).map((a) => a.slug),
    );
    return fallosDeClaves(
      autores.map((a) => ({
        slug: a.slug,
        ruta: relativaALaRaiz(raiz, a.ruta),
        nombre: a.nombre,
        ...('ordenAlfabetico' in a ? { ordenAlfabetico: a.ordenAlfabetico } : {}),
        ...('ordenRevisado' in a ? { ordenRevisado: a.ordenRevisado } : {}),
      })),
      publicados,
    );
  }

  const titular = (n: number) =>
    `Claves de orden: ${n} ${n === 1 ? 'Autor incumple' : 'Autores incumplen'} la regla. ` +
    'Un Autor publicado tiene clave de orden, y toda clave empieza por una letra de la A a la Z o la Ñ.';

  return {
    name: 'claves-de-orden',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const fallos = await revisar();
        if (fallos.length === 0) return;
        // El detalle por el registro, el corte por la excepción: igual que el cotejo.
        logger.error(`\n${fallos.join('\n')}\n`);
        throw new Error(titular(fallos.length));
      },

      'astro:server:setup': async ({ logger }) => {
        // En dev se avisa y no se corta, tampoco si el Corpus no se deja leer: lo dirá el build.
        let fallos: string[];
        try {
          fallos = await revisar();
        } catch (error) {
          logger.warn(`Claves de orden: no se pudo leer el Corpus (${error instanceof Error ? error.message : String(error)}).`);
          return;
        }
        if (fallos.length === 0) return;
        logger.warn(`\n${fallos.join('\n')}\nEl build no dejará publicar esto: ${titular(fallos.length)}\n`);
      },
    },
  };
}
