/**
 * Componer una Pieza de Canal — Historias 13.2 y 13.3, FR-22.
 *
 *   npx tsx tools/pieza.ts componer --red instagram <slug> <slug> [<slug>...]
 *   npx tsx tools/pieza.ts componer --red x <slug> <slug> --salida /tmp/prueba.png
 *   npx tsx tools/pieza.ts coleccion <slug-de-coleccion> --red instagram
 *
 * Dos subórdenes hermanas. `componer` reúne las Citas que se le nombran y enlaza a la
 * portada; `coleccion` anuncia una Colección publicada —lleva su nombre como título y enlaza
 * a su Página—, y elige sus Citas por la pertenencia declarada, no por la línea de órdenes.
 *
 * Un interruptor fino sobre `tools/lib/piezas.ts`, con el patrón de `tools/coleccion.ts` y
 * `tools/jornada.ts`: aquí se leen argumentos y se escribe la salida, y toda la lógica está
 * debajo.
 *
 * **El PNG no se versiona** (AD-15): cae en `piezas/`, que está en `.gitignore`. Lo
 * versionado es la decisión —qué Citas van juntas y a qué cuenta— nunca el artefacto.
 *
 * **Una red por composición.** La Pieza declara un único enlace de destino y lo marca con la
 * cuenta desde la que se publica, que es lo único que distingue después de qué red vino cada
 * visita. Publicar la misma Pieza en dos cuentas son dos composiciones, una por cada marca.
 *
 * Los rechazos salen con código distinto de cero, como el resto de `tools/`: **2** para lo
 * que la orden no supo leer y **1** para lo que entendió y rechazó.
 *
 * Dónde cae la raya, porque las dos subórdenes la ponen en el mismo sitio y conviene que se
 * lea como una decisión: **2 es la forma de la invocación** —una bandera desconocida, la red
 * ausente, cero o dos slugs donde va uno— y **1 es lo que la invocación dice**. Un slug con
 * forma de ruta (`../../fuera`) llega bien formado como invocación y es su *contenido* el que
 * no nombra nada, así que sale con 1, exactamente igual que en `componer`. Repartirlo por «lo
 * ilegible frente a lo legible» daría dos códigos distintos para el mismo argumento según qué
 * suborden lo reciba, que es peor que cualquiera de los dos criterios.
 */

import { componerPieza, componerPiezaDeColeccion } from './lib/piezas.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import {
  motivosDeArgumentosNoReconocidos,
  opcion,
  posicionales,
  raizDeCorpusDe,
  terminar,
} from './lib/cli.ts';
import { REDES } from '../src/lib/redes.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus', '--red', '--salida'] as const;

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const sueltos = posicionales(argumentos, CON_VALOR);
const orden = sueltos[0];

const USO = [
  'Uso:',
  '  npx tsx tools/pieza.ts componer --red <red> <slug-de-cita> <slug-de-cita> [<slug>...]',
  '  npx tsx tools/pieza.ts coleccion <slug-de-coleccion> --red <red> [--salida <ruta.png>]',
  '',
  'La Pieza de una Colección lleva su nombre y enlaza a su Página de Colección, no a una',
  'Cita. Sus Citas salen de la pertenencia declarada, en ese orden; lo que no quepa se dice',
  'con su motivo. Una Colección por debajo de su umbral no compone Pieza.',
  '',
  `Redes: ${REDES.map((r) => r.id).join(', ')}. Una sola por composición: la Pieza declara`,
  'un único enlace de destino y lo marca con la cuenta desde la que se publica.',
  '',
  'Las dos admiten --corpus <ruta> y --salida <ruta.png>, que ha de ser un fichero PNG y',
  'no un directorio. Sin --salida el PNG cae en piezas/, que no se versiona: lo versionado',
  'es la decisión, no el artefacto.',
  '',
].join('\n');

/*
 * Una bandera con errata no es «lo mismo pero sin ella». Aquí lo peor que puede hacer es
 * componer una Pieza distinta de la pedida —otro corpus, otra marca de origen— y publicarla
 * sin que nada haya fallado: `--formato vertical` se ignoraría en silencio y `--corpuss /tmp`
 * dejaría a `raizDeCorpusDe` cayendo al corpus real. Se para antes de tocar nada.
 */
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: sueltos,
  conValor: CON_VALOR,
});
if (noReconocidos.length > 0) {
  process.stderr.write(`${noReconocidos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

try {
  switch (orden) {
    case 'componer': {
      const red = opcion(argumentos, '--red');
      if (red === undefined) {
        /*
         * Sin `--red` no hay composición por omisión que valga: la marca de origen es lo
         * único que distingue después de qué cuenta vino cada visita, y elegir una por
         * defecto atribuiría en silencio a Instagram lo que se publicó en Threads. Es error
         * de uso, así que 2.
         */
        process.stderr.write(
          `Indique la cuenta con --red: ${REDES.map((r) => r.id).join(', ')}.\n\n${USO}`,
        );
        process.exit(2);
      }
      terminar(await componerPieza(rutas, sueltos.slice(1), red, opcion(argumentos, '--salida')));
      break;
    }

    case 'coleccion': {
      const red = opcion(argumentos, '--red');
      if (red === undefined) {
        // Mismo criterio que arriba, y por el mismo motivo: elegir una cuenta por omisión
        // atribuiría en silencio a Instagram lo que se publicó en Threads. Error de uso: 2.
        process.stderr.write(
          `Indique la cuenta con --red: ${REDES.map((r) => r.id).join(', ')}.\n\n${USO}`,
        );
        process.exit(2);
      }

      const slug = sueltos[1];
      if (slug === undefined || sueltos.length > 2) {
        /*
         * Una Pieza de Colección anuncia **una** Colección: es su nombre el que lleva el
         * lienzo y su Página la que recibe el enlace único. Dos slugs no son «las dos
         * juntas», son una orden que no significa nada, y componer la primera en silencio
         * publicaría un anuncio que no es el que se pidió.
         */
        process.stderr.write(
          `Indique el slug de una Colección, y solo uno.\n\n${USO}`,
        );
        process.exit(2);
      }

      terminar(await componerPiezaDeColeccion(rutas, slug, red, opcion(argumentos, '--salida')));
      break;
    }

    default:
      process.stderr.write(USO);
      process.exit(2);
  }
} catch (fallo) {
  /*
   * Por la misma razón que en `tools/coleccion.ts`: el lector del corpus se niega a leer a
   * medias una Cita con el frontmatter roto y lanza nombrando el fichero, y una orden cuya
   * cabecera promete rechazos redactados no puede contestar con una traza de Node.
   */
  process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
  process.exit(1);
}
