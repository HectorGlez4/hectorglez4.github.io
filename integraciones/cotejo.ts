/**
 * El cotejo, puesto como puerta del build — Historia 11.2.
 *
 * Ninguna Cita se publica sin que su texto aparezca literalmente en el cuerpo del
 * documento de su Fuente. Esta integración lee `corpus/citas/`, `corpus/fuentes/` y el
 * censo de pendientes, se lo pasa a `tools/lib/cotejo.ts` —que es donde vive el criterio,
 * puro y probado sin construir— y **aborta la construcción** si algo incumple. No se
 * degrada a aviso.
 *
 * Por qué aquí y no en `src/lib/`: por AD-5, la derivación es pura y no lee disco, y esto
 * necesita leer el corpus entero. Por qué en `astro:build:start` y no en el esquema de
 * contenido: el cotejo no es una regla de forma de un fichero suelto, sino una relación
 * entre dos ficheros, y necesita ver el corpus completo para saber que el censo solo
 * mengua.
 *
 * Por qué en `astro.config.mjs`: es el único sitio por el que pasan **todas** las
 * construcciones. Una Cita escrita a mano directamente en `corpus/citas/`, sin pasar por
 * el sembrado, cruza exactamente esta misma puerta.
 *
 * Historia 17.1 — y comprueba, con el mismo corte, que la biografía que declara un Autor
 * es **la revisión versionada** en `corpus/biografias/`. Va en la misma puerta porque es la
 * misma regla —lo publicado se apoya en el documento que dice— y porque así sus fallos se
 * leen en el mismo informe, con la ruta del fichero de Autor delante. Las dos lecturas son
 * disjuntas: el cotejo de Citas no lee `corpus/biografias/`.
 *
 * AD-22 — no pide nada por la red. Todo lo que lee está versionado en el repositorio.
 */

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { AstroIntegration } from 'astro';
import {
  leerAutores,
  leerCensoDeCotejo,
  leerCitas,
  leerDocumentosDeBiografia,
  leerDocumentosDeFuente,
  rutasDelCorpus,
} from '../tools/lib/corpus.ts';
import {
  cotejar,
  cotejarBiografias,
  formatearFallos,
  resumenDelBuild,
  titularDeFallos,
  TOPE_DE_PENDIENTES_DE_COTEJO,
  type CitaParaCotejar,
  type ResultadoDeCotejo,
} from '../tools/lib/cotejo.ts';

/**
 * La ruta que se nombra en un fallo: relativa a la raíz, que es como se teclea.
 *
 * Las barras se normalizan a `/` como en el resto del repositorio: en Windows `join`
 * compone con `\` y la comparación con el prefijo no casaba nunca, así que el fallo
 * nombraba la ruta absoluta de la máquina.
 */
function relativaALaRaiz(raiz: string, ruta: string): string {
  const conBarras = (texto: string) => texto.split('\\').join('/');
  const prefijo = conBarras(raiz).replace(/\/$/, '');
  const normalizada = conBarras(ruta);
  return normalizada.startsWith(`${prefijo}/`)
    ? normalizada.slice(prefijo.length + 1)
    : normalizada;
}

export default function cotejoDeCitas(): AstroIntegration {
  let raiz = process.cwd();

  async function cotejarElCorpus(): Promise<ResultadoDeCotejo & { deBiografias: number }> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));

    const publicadas = await leerCitas(rutas.citas);
    const documentos = await leerDocumentosDeFuente(rutas);
    const censo = await leerCensoDeCotejo(rutas);

    const citas: CitaParaCotejar[] = publicadas.map((cita) => ({
      slug: cita.slug,
      ruta: relativaALaRaiz(raiz, cita.ruta),
      texto: cita.texto ?? '',
      ...(cita.procedencia?.obra !== undefined ? { obra: cita.procedencia.obra } : {}),
      ...(cita.fuente !== undefined ? { fuente: cita.fuente } : {}),
    }));

    const deCitas = cotejar({
      citas,
      documentos,
      censo,
      rutaDelCenso: relativaALaRaiz(raiz, rutas.pendientesDeCotejo),
    });

    const autores = (await leerAutores(rutas)).map((autor) => ({
      ruta: relativaALaRaiz(raiz, autor.ruta),
      ...(autor.biografia !== undefined ? { biografia: autor.biografia } : {}),
    }));
    const deBiografias = cotejarBiografias(
      autores,
      await leerDocumentosDeBiografia(rutas),
      relativaALaRaiz(raiz, rutas.biografias),
    );

    /*
     * Los fallos de biografía entran en el **mismo** recuento y en el mismo veredicto: un build
     * roto solo por biografías no puede imprimir el resumen limpio del cotejo de Citas.
     */
    const fallos = [...deCitas.fallos, ...deBiografias];
    return { ...deCitas, ok: fallos.length === 0, fallos, deBiografias: deBiografias.length };
  }

  return {
    name: 'cotejo-de-citas',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:start': async ({ logger }) => {
        const resultado = await cotejarElCorpus();

        if (!resultado.ok) {
          /*
           * El detalle sale por el registro y el corte por la excepción, y las dos cosas
           * son necesarias: el registro es lo que el editor lee para saber qué fichero
           * arreglar, y la excepción es lo que **detiene la construcción**. Registrar sin
           * lanzar degradaría el cotejo a aviso y publicaría justo lo que existe para
           * impedir.
           *
           * El titular lo dice solo la excepción. Y el detalle no viaja dentro de su
           * mensaje por un motivo tonto pero real: Astro añade a cualquier error que
           * contenga la palabra «document» una pista sobre APIs del navegador
           * —`generateHint`, en `core/errors/dev/utils.js`—, y aquí «documento» sale en
           * casi cada línea. La pista sería ruido que despista a quien lee el fallo.
           */
          logger.error(`\n${formatearFallos(resultado.fallos)}`);
          throw new Error(titularDeFallos(resultado.fallos.length, resultado.deBiografias));
        }

        logger.info(
          resumenDelBuild(
            resultado.cotejadas,
            resultado.pendientes.length,
            TOPE_DE_PENDIENTES_DE_COTEJO,
          ),
        );
      },

      /*
       * En el servidor de desarrollo se avisa y no se detiene, y es deliberado.
       *
       * `astro dev` no publica nada: es la superficie donde se **arregla** una Cita que
       * no cuadra, y para arreglarla hay que poder mirarla al lado de su documento. Un
       * servidor que se niega a arrancar mientras hay un fallo obliga a trabajar a
       * ciegas, y empuja a quitar la Cita del corpus para poder verla — justo el gesto
       * que no queremos.
       *
       * Lo que la historia exige es que ninguna Cita se **publique** sin aparecer en su
       * documento, y publicar es construir: ahí sí rompe, arriba. `astro preview` sirve
       * un `dist/` que ya pasó por esa puerta, así que no hay nada que volver a mirar.
       */
      'astro:server:setup': async ({ logger }) => {
        const resultado = await cotejarElCorpus();
        if (resultado.ok) return;
        logger.warn(
          `\n${formatearFallos(resultado.fallos)}` +
            `El build no dejará publicar esto: ${titularDeFallos(resultado.fallos.length, resultado.deBiografias)}\n`,
        );
      },
    },
  };
}
