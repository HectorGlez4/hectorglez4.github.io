/**
 * Componer una Pieza de Canal de varias Citas — Historia 13.2, FR-22.
 *
 *   npx tsx tools/pieza.ts componer --red instagram <slug> <slug> [<slug>...]
 *   npx tsx tools/pieza.ts componer --red x <slug> <slug> --salida /tmp/prueba.png
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
 */

import { componerPieza } from './lib/piezas.ts';
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
  '',
  `Redes: ${REDES.map((r) => r.id).join(', ')}. Una sola por composición: la Pieza declara`,
  'un único enlace de destino y lo marca con la cuenta desde la que se publica.',
  '',
  'Toda orden admite --corpus <ruta> y --salida <ruta.png>, que ha de ser un fichero PNG y',
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
