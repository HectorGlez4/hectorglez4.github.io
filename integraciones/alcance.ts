/**
 * Ninguna superficie publicada queda a más de tres saltos de la portada — Historia 26.8, NFR-5.
 *
 * En `astro:build:done`, sobre el `dist/` real:
 *
 *   1. lee el grafo de enlaces de cada página construida (`grafoDeDist`), sin los subárboles de
 *      `data-jornada` —la Cita del Día, que rota sin commit—, `<template>` ni `<noscript>`;
 *   2. compone el **grafo del modelo** con el Corpus leído de disco (`modeloDelCorpus` →
 *      `grafoDelModelo`, las mismas enumeraciones que pintan las páginas) y exige que el de
 *      `dist/` lo contenga: una arista que falta es una enumeración que una plantilla dejó de
 *      pintar;
 *   3. corre `superficiesInalcanzables` sobre `rutasPublicadas` —también la Obra que no se
 *      indexa— con el tope de siempre, `MAX_SALTOS_DESDE_LA_PORTADA`.
 *
 * Avisa, sin romper, de las Citas que solo la lista de Autores de la portada deja a ≤3 saltos: el
 * modelo no la lleva (la quita la Épica 28), y sin el aviso nadie las vería hasta entonces.
 *
 * Si todo se sostiene escribe una línea fija, que no depende de la jornada; si no, el detalle va
 * al registro —cada superficie fuera, con el Tema que cayó bajo su umbral y su recuento, y cada
 * arista `origen → destino` que falta— y la excepción corta el build con los dos números. El
 * tope no se relaja aquí ni en ninguna parte del código de producción: solo las pruebas pasan
 * otro `maximoDeSaltos`.
 *
 * El Corpus se lee de disco (`tools/lib/alcance.ts`), nunca de `astro:content`, como en
 * `integraciones/indexables.ts`.
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import type { AstroIntegration } from 'astro';
import { rutasDelCorpus } from '../tools/lib/corpus.ts';
import { rutaDeFicheroHtml } from '../tools/lib/indexables.ts';
import {
  avisoDeFueraDelModelo,
  detalleDeAlcance,
  grafoDeDist,
  informeDeAlcance,
  modeloDelCorpus,
  rompeElBuild,
  titularDeAlcance,
  veredictoDeAlcance,
} from '../tools/lib/alcance.ts';

/** Cuántas páginas de `dist/` se leen a la vez. */
const PAGINAS_POR_TANDA = 64;

export default function alcanceDesdeLaPortada(): AstroIntegration {
  let raiz = process.cwd();

  return {
    name: 'alcance-desde-la-portada',
    hooks: {
      'astro:config:setup': ({ config }) => {
        raiz = fileURLToPath(config.root);
      },

      'astro:build:done': async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const entradas = await readdir(dist, { withFileTypes: true, recursive: true });
        const ficheros = entradas
          .filter((entrada) => entrada.isFile() && entrada.name.endsWith('.html'))
          .map((entrada) => join(entrada.parentPath, entrada.name));

        /*
         * Por tandas de `PAGINAS_POR_TANDA`: abrir los ~5.300 ficheros a la vez arriesga EMFILE y
         * guardaría todo el HTML en memoria. De cada página se queda solo su lista de enlaces.
         */
        const construido = new Map<string, string[]>();
        for (let desde = 0; desde < ficheros.length; desde += PAGINAS_POR_TANDA) {
          const tanda = await Promise.all(
            ficheros.slice(desde, desde + PAGINAS_POR_TANDA).map(async (fichero) => ({
              ruta: rutaDeFicheroHtml(relative(dist, fichero).split(sep).join('/')),
              html: await readFile(fichero, 'utf8'),
            })),
          );
          // `grafoDeDist` nombra la página cuyo marcado no sabe leer.
          for (const [origen, destinos] of grafoDeDist(tanda)) construido.set(origen, destinos);
        }

        const modelo = await modeloDelCorpus(rutasDelCorpus(join(raiz, 'corpus')));
        const veredicto = veredictoDeAlcance(modelo.conjunto, modelo.grafo, construido);
        // Lo que `dist/` alcanza solo por la lista de Autores de la portada: avisa, no rompe.
        const aviso = avisoDeFueraDelModelo(modelo);
        if (aviso !== undefined) logger.warn(aviso);

        if (!rompeElBuild(veredicto)) {
          logger.info(informeDeAlcance(veredicto));
          return;
        }
        // El detalle por el registro y el corte por la excepción, como en `indexables.ts`.
        logger.error(`\n${detalleDeAlcance(veredicto).join('\n')}`);
        throw new Error(titularDeAlcance(veredicto));
      },
    },
  };
}
