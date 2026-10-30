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
 *     `noindex` y las que llevan `data-pagefind-body` son el mismo conjunto, y —desde la Historia
 *     23.9— que la marca de Obra del `<html>` (`ATRIBUTO_DE_INDEXABLE`) está en toda página 1 de
 *     Obra, solo en ellas, y dice lo mismo que su `noindex`. Si no, rompe nombrando lo que sobra o
 *     falta en cada lado. Va **después** de la integración del sitemap
 *     en `astro.config.mjs`, porque es esa la que lo escribe en este mismo gancho. Pagefind
 *     corre después de Astro (`package.json`), así que lo que se compara es la marca.
 *
 *     Desde la Historia 28.3 (AD-17) comprueba también, en la misma lista de desajustes, que toda
 *     Obra del conjunto del que rotan las de la portada —las indexables que calculó en
 *     `astro:build:start`, no solo las de hoy— tiene página en `dist/` y sin `noindex`
 *     (`desajustesDeLasObrasDeLaPortada`): una que no, la portada la enlazaría el día que le tocara.
 *     Y, porque ese conjunto lo calcula esta instancia y las filas las pinta la de las páginas, que
 *     cada fila de Obras de la `index.html` construida lleva a una ruta del conjunto.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import type { AstroIntegration } from 'astro';
import { leerAutores, leerCitas, leerFichasDeObra, rutasDelCorpus } from '../tools/lib/corpus.ts';
import {
  desajustesDeIndexables,
  desajustesDeLasObrasDeLaPortada,
  obrasEnlazadasDesdeLaPortada,
  informeDeCoincidencia,
  informeDeObras,
  marcasDePagina,
  nombresCongeladosSinFicha,
  rutaDeFicheroHtml,
  rutasDelSitemap,
  titularDeDesajustes,
  type PaginaIndexable,
} from '../tools/lib/indexables.ts';
import { congelacionVigente, rutaDeLaObra } from '../src/lib/obras.ts';
import type { CongelacionDeObras } from '../src/lib/umbrales.ts';
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
export async function obrasDelCorpusEnDisco(
  raiz: string,
  /**
   * Historia 22.8 — la congelación con la que se aplica la regla. Sin pasar, la declarada hoy
   * (`congelacionVigente()`); `null`, ninguna. El aviso pasa la que regía en `--desde`.
   */
  congelacion?: CongelacionDeObras | null,
): Promise<ObrasDelSitio> {
  const rutas = rutasDelCorpus(join(raiz, 'corpus'));
  return obrasDeLosDatos(
    {
      citas: await leerCitas(rutas.citas),
      autores: await leerAutores(rutas),
      fichas: await leerFichasDeObra(rutas),
    },
    congelacion,
  );
}

export default function rutasIndexablesDelCorpus(): AstroIntegration {
  let raiz = process.cwd();
  /**
   * Historia 28.3 — las rutas de las Obras indexables: el conjunto del que rotan las de la portada.
   * Sin calcular hasta `astro:build:start`: un conjunto que no se calculó no se confunde con uno vacío.
   */
  let rutasQueRotan: string[] | undefined;

  return {
    name: 'rutas-indexables',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const { publicadas, indexables } = await obrasDelCorpusEnDisco(raiz);
        declararRutasIndexables(indexables.map((obra) => rutaDeLaObra(obra)));
        // Historia 28.3 — el conjunto del que rotan las Obras de la portada, para `astro:build:done`.
        rutasQueRotan = indexables.map((obra) => rutaDeLaObra(obra));
        logger.info(informeDeObras(publicadas.length, indexables.length));
        // Historia 22.8 — un nombre congelado que ya no es ninguna ficha activa avisa, no rompe.
        const congelacion = congelacionVigente();
        if (congelacion !== undefined) {
          const fichas = await leerFichasDeObra(rutasDelCorpus(join(raiz, 'corpus')));
          const sueltos = nombresCongeladosSinFicha(congelacion, fichas.map((f) => f.nombre));
          if (sueltos.length > 0) {
            logger.warn(
              `La congelación de Obras (desde ${congelacion.desde}) nombra ${sueltos.length} ficha(s) ` +
                `que no están en corpus/obras/: ${sueltos.join(', ')}. No se indexan; si se ` +
                'reunieron o retiraron, la lista se rehace con `levantar` y `congelar`.',
            );
          }
        }
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

        if (rutasQueRotan === undefined) {
          throw new Error(
            'rutas-indexables: `astro:build:done` sin el conjunto del que rotan las Obras de la portada; ' +
              '`astro:build:start` no llegó a calcularlo, y sin él la comprobación de AD-17 pasaría en vacío.',
          );
        }
        // Las filas que pintó la instancia de las páginas, cotejadas con el conjunto de esta (28.3).
        const portada = join(dist, 'index.html');
        const enlazadas = existsSync(portada) ? obrasEnlazadasDesdeLaPortada(await readFile(portada, 'utf8')) : [];

        const deIndexables = desajustesDeIndexables(sitemap, paginas);
        const deLaPortada = desajustesDeLasObrasDeLaPortada(rutasQueRotan, paginas, enlazadas);
        const desajustes = [...deIndexables, ...deLaPortada];
        if (desajustes.length === 0) {
          logger.info(informeDeCoincidencia(sitemap.length));
          return;
        }
        // El detalle por el registro y el corte por la excepción, como en la cobertura.
        logger.error(`\n${desajustes.join('\n')}`);
        throw new Error(titularDeDesajustes(deIndexables.length, deLaPortada.length));
      },
    },
  };
}
