/**
 * Qué se indexa, declarado y comprobado — Historia 22.4, FR-52.
 *
 * Dos trabajos, en los dos extremos de la construcción:
 *
 *   · **`astro:build:start`** — calcula desde el Corpus qué Obras se indexan, con la misma
 *     función pura que usa el armazón (`obrasDeLosDatos` → `obrasDelConjunto` de
 *     `src/lib/publicado.ts`, que aplica `esObraIndexable`), y se lo declara a **esta** instancia de `src/lib/superficies.ts`: la
 *     de la configuración, que es la que consulta el filtro síncrono del sitemap. El empaquetado
 *     de las páginas carga otra instancia, y ahí la declara `Armazon.astro`. Escribe en el
 *     registro «N Obras publicadas, M indexables», la línea base de SM-11.
 *
 *     Declara solo las rutas de Obra: son las únicas que `superficies.ts` consulta en la lista
 *     (las demás superficies no dependen del contenido). El armazón declara la lista entera de
 *     `rutasIndexables`, que contiene exactamente estas mismas rutas de Obra.
 *
 *   · **`astro:build:done`** — sobre el `dist/` real, comprueba que el sitemap, las páginas sin
 *     `noindex` y las que llevan `data-pagefind-body` son el mismo conjunto. Si no, rompe
 *     nombrando lo que sobra o falta en cada lado. Va **después** de la integración del sitemap
 *     en `astro.config.mjs`, porque es esa la que lo escribe en este mismo gancho. Pagefind
 *     corre después de Astro (`package.json`), así que lo que se compara es la marca.
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerAutores, leerCitas, leerFichasDeObra, rutasDelCorpus } from '../tools/lib/corpus.ts';
import {
  desajustesDeIndexables,
  informeDeObras,
  marcasDePagina,
  rutaDeFicheroHtml,
  rutasDelSitemap,
  titularDeDesajustes,
  type PaginaIndexable,
} from '../tools/lib/indexables.ts';
import { rutaDeLaObra } from '../src/lib/obras.ts';
import { obrasDeLosDatos, type ObrasDelSitio } from '../src/lib/publicado.ts';
import { declararRutasIndexables } from '../src/lib/superficies.ts';

async function ficherosBajo(raiz: string, filtro: (nombre: string) => boolean): Promise<string[]> {
  const entradas = await readdir(raiz, { withFileTypes: true, recursive: true });
  return entradas
    .filter((entrada) => entrada.isFile() && filtro(entrada.name))
    .map((entrada) => join(entrada.parentPath, entrada.name));
}

/**
 * Las Obras del sitio leídas del Corpus de `raiz`: las Citas publicadas, los Autores y las
 * fichas admitidas por su esquema (`leerFichasDeObra` valida con `obraAdmisible`), pasados por
 * `obrasDeLosDatos`, que repite los pasos de `conjuntoPublicable`. Exportada para la prueba que
 * compara esta lista con la del armazón sobre el mismo corpus.
 */
export async function obrasDelCorpusEnDisco(raiz: string): Promise<ObrasDelSitio> {
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  return obrasDeLosDatos({
    citas: await leerCitas(rutas.citas),
    autores: await leerAutores(rutas),
    fichas: await leerFichasDeObra(rutas),
  });
}

export default function rutasIndexablesDelCorpus(): AstroIntegration {
  let raiz = process.cwd();

  return {
    name: 'rutas-indexables',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const { publicadas, indexables } = await obrasDelCorpusEnDisco(raiz);
        declararRutasIndexables(indexables.map((obra) => rutaDeLaObra(obra)));
        logger.info(informeDeObras(publicadas.length, indexables.length));
      },

      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);

        const paginas: PaginaIndexable[] = await Promise.all(
          (await ficherosBajo(dist, (nombre) => nombre.endsWith('.html'))).map(async (fichero) => ({
            ruta: rutaDeFicheroHtml(relative(dist, fichero).split(sep).join('/')),
            ...marcasDePagina(await readFile(fichero, 'utf8')),
          })),
        );

        const mapas = await ficherosBajo(dist, (nombre) => /^sitemap-\d+\.xml$/u.test(nombre));
        const sitemap = (await Promise.all(mapas.map((m) => readFile(m, 'utf8')))).flatMap(
          rutasDelSitemap,
        );

        const desajustes = desajustesDeIndexables(sitemap, paginas);
        if (desajustes.length === 0) {
          logger.info(
            `El sitemap, los \`noindex\` y Pagefind coinciden (${sitemap.length} rutas indexables).`,
          );
          return;
        }
        // El detalle por el registro y el corte por la excepción, como en la cobertura.
        logger.error(`\n${desajustes.join('\n')}`);
        throw new Error(titularDeDesajustes(desajustes.length));
      },
    },
  };
}
