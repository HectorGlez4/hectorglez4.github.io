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
 *
 * Historia 22.2 — también rompe una Obra publicada con dos grafías de la misma forma si
 * alguna no es literal de su Fuente, y avisa de los prefijos sin decidir y de los títulos
 * que ya no declara ninguna Cita.
 *
 * Historia 22.3 — avisa también de la «Obra con años discrepantes»: la Obra no publica año, y
 * cada Cita sigue mostrando el de su Procedencia.
 */

import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import type { AstroIntegration } from 'astro';
import {
  leerAutores,
  leerCensoDeCotejo,
  leerCitas,
  leerDocumentosDeclarados,
  leerFichasDeObra,
  rutasDelCorpus,
} from '../tools/lib/corpus.ts';
import { documentosDeCita } from '../tools/lib/cotejo.ts';
import { derivarDeLaDeclaracion, esElMismoAutor } from '../tools/lib/documento.ts';
import {
  avisosDeAñosDeObras,
  avisosDeObras,
  clave,
  fallosDeObras,
  formaDeObra,
  formatearAvisosDeObras,
  formatearFallosDeObras,
  titularDeFallosDeObras,
  type DocumentosDeObras,
} from '../src/lib/obras.ts';

/** Relativa a la raíz y con barras normales: es como se teclea, también en Windows. */
function relativa(raiz: string, ruta: string): string {
  return relative(raiz, ruta).split('\\').join('/');
}

export default function fichasDeObra(): AstroIntegration {
  let raiz = process.cwd();

  async function revisar(): Promise<{ fallos: string[]; avisos: string[] }> {
    const rutas = rutasDelCorpus(join(raiz, 'corpus'));
    const fichas = (await leerFichasDeObra(rutas)).map((ficha) => ({
      ...ficha,
      ruta: relativa(raiz, ficha.ruta),
    }));
    const citas = (await leerCitas(rutas.citas)).map((cita) => ({
      ...cita,
      ruta: relativa(raiz, cita.ruta),
    }));
    const fichasDeAutor = await leerAutores(rutas);
    const autores = fichasDeAutor.map((a) => a.slug);

    /*
     * Historia 22.2 — la puerta ortográfica necesita la `obra:` de la cabecera de cada
     * documento, leída con `analizarDocumento` como en el cotejo. Qué documentos son de qué
     * Cita lo decide `documentosDeCita`, el mismo criterio que el cotejo; aquí se resuelve y
     * se le pasa puro a `src/lib/obras.ts`.
     */
    const declarados = await leerDocumentosDeclarados(rutas);
    const cabecerasDeCita = new Map<string, string[]>();
    for (const cita of citas) {
      const obra = cita.procedencia?.obra;
      if (cita.fuente === undefined || cita.fuente === null || typeof obra !== 'string') continue;
      cabecerasDeCita.set(
        cita.slug,
        documentosDeCita(cita.fuente, obra, declarados)
          .map((nombre) => declarados.get(nombre)?.obra)
          .filter((cabecera): cabecera is string => cabecera !== undefined),
      );
    }
    /*
     * Cada documento cuenta para el Autor del Corpus que concuerda con quien lo firma, con la
     * misma comparación que `documentar` y `restituir-grafia`: así la puerta solo sugiere
     * `restituir-grafia` cuando esa orden va a encontrar el documento.
     */
    const formasConDocumento = new Set<string>();
    for (const d of declarados.values()) {
      const firma = derivarDeLaDeclaracion(d.fuente, d.declaracion).autor;
      if (firma === undefined) continue;
      for (const autor of fichasDeAutor) {
        const nombre = autor.nombre?.trim();
        if (!nombre) continue;
        if (firma.nombres.some((n) => esElMismoAutor(n, nombre))) {
          formasConDocumento.add(clave(autor.slug, formaDeObra(d.obra)));
        }
      }
    }
    const documentos: DocumentosDeObras = {
      cabecerasDeCita,
      formasConDocumento,
      censo: new Set(await leerCensoDeCotejo(rutas)),
    };

    return {
      fallos: fallosDeObras(fichas, citas, autores, documentos),
      // Historia 22.3 — y la Obra cuyas Citas declaran años distintos, que no publica año.
      avisos: [...avisosDeObras(fichas, citas), ...avisosDeAñosDeObras(fichas, citas)],
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
