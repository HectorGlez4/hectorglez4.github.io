/**
 * La clase de cada Cita, puesta como puerta del build — Historia 35.1, AD-1, AD-32.
 *
 * El esquema juzga cada Cita sola. Esta integración juzga las relaciones con
 * `fallosDeClases` (`tools/lib/clases.ts`): que toda Cita publicada esté en
 * `corpus/clases-de-cita.yml` con su clase, que ningún slug tenga dos, que la de siempre sea de
 * un Autor de dominio público y la atribuida de un dueño con derechos vigentes. Lee el registro
 * solo para romper: ningún byte de `dist/` sale de él.
 *
 * Como las claves de orden (`integraciones/claves.ts`): rompe en `astro:build:start` y solo
 * avisa en `astro dev`.
 */

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import {
  leerAutores,
  leerCitas,
  leerFichasDeObra,
  leerRegistroDeClases,
  rutasDelCorpus,
} from '../tools/lib/corpus.ts';
import { fallosDeClases } from '../tools/lib/clases.ts';
import { fallosDeAtribuidas, lineaDelBuild } from '../tools/lib/atribuidas.ts';
import { claseDe, esAtribuida } from '../src/lib/clase.ts';

/** La ruta relativa a la raíz, con barras `/`, que es como se teclea. */
function relativaALaRaiz(raiz: string, ruta: string): string {
  const conBarras = (texto: string) => texto.split('\\').join('/');
  const prefijo = conBarras(raiz).replace(/\/$/, '');
  const normalizada = conBarras(ruta);
  return normalizada.startsWith(`${prefijo}/`) ? normalizada.slice(prefijo.length + 1) : normalizada;
}

export default function clasesDeCita(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<string[]> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const [autores, citas, registro, fichas] = await Promise.all([
      leerAutores(rutas),
      leerCitas(rutas.citas),
      leerRegistroDeClases(rutas),
      leerFichasDeObra(rutas),
    ]);
    const deClases = fallosDeClases(
      citas.map((c) => ({
        slug: c.slug,
        ruta: relativaALaRaiz(raiz, c.ruta),
        autor: c.autor,
        // La clase la lee `esAtribuida`, su único lector; la de siempre no lleva el campo.
        ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
        ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
      })),
      autores.map((a) => ({
        slug: a.slug,
        ruta: relativaALaRaiz(raiz, a.ruta),
        vivo: a.vivo,
        añoFallecimiento: a.añoFallecimiento,
      })),
      registro,
    );
    /*
     * Historia 35.1b — la puerta de la atribuida: con alguna de sus cinco constantes sin valor,
     * cada atribuida de corpus/citas/ rompe nombrándolas; con todas, sus topes, la figura sin
     * Obra y los duplicados entre clases, contra lo versionado (`tools/lib/atribuidas.ts`).
     */
    const deAtribuidas = fallosDeAtribuidas({
      citas: citas.map((c) => ({
        slug: c.slug,
        ruta: relativaALaRaiz(raiz, c.ruta),
        texto: c.texto,
        ...(c.autor !== undefined ? { autor: c.autor } : {}),
        ...(c.personaje !== undefined ? { personaje: c.personaje } : {}),
        ...(esAtribuida(c) ? { clase: claseDe(c) } : {}),
        ...(c.procedencia !== undefined ? { procedencia: c.procedencia } : {}),
      })),
      autores,
      // Con su ruta relativa a la raíz: el fallo de un tope por Obra nombra el fichero de la ficha.
      fichas: fichas.map((f) => ({ ...f, ruta: relativaALaRaiz(raiz, f.ruta) })),
    }).map(lineaDelBuild);
    return [...deClases, ...deAtribuidas];
  }

  const titular = (n: number) =>
    `Clases de Cita: ${n} ${n === 1 ? 'desacuerdo' : 'desacuerdos'} entre las Citas, sus Autores, ` +
    'corpus/clases-de-cita.yml y la puerta de la atribuida (sus constantes, sus topes, sus Fichas de Obra). Toda Cita publicada está registrada con su clase, la de siempre es de ' +
    'dominio público y la atribuida de un dueño con derechos vigentes, por su puerta y dentro de sus topes.';

  return {
    name: 'clases-de-cita',
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
          logger.warn(`Clases de Cita: no se pudo leer el Corpus (${error instanceof Error ? error.message : String(error)}).`);
          return;
        }
        if (fallos.length === 0) return;
        logger.warn(`\n${fallos.join('\n')}\nEl build no dejará publicar esto: ${titular(fallos.length)}\n`);
      },
    },
  };
}
