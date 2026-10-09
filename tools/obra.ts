/**
 * Las Fichas de Obra — Historia 22.1, AD-25.
 *
 *   npm run obra -- sembrar [--corpus corpus]
 *   npm run obra -- retirar <nombre-de-ficha> --motivo "…" [--corpus corpus]
 *
 * `sembrar` crea las fichas que falten para todas las Citas publicadas, con la misma
 * función que usan aprobar, el alta y documentar. Es idempotente, e informa de los grupos
 * de grafías equivalentes y de los pares de prefijo que la Historia 22.2 tiene que decidir.
 *
 * `retirar` mueve la ficha a `corpus/_obras-retiradas/` (AD-2) y se niega —código 1, sin
 * mover nada— mientras una Cita publicada o candidata la resuelva. Sin nombre o sin
 * motivo, código 2.
 *
 * Nadie escribe ni borra fichas a mano.
 */

import { rutasDelCorpus } from './lib/corpus.ts';
import {
  motivosDeArgumentosNoReconocidos,
  opcion,
  posicionales,
  raizDeCorpusDe,
  terminar,
} from './lib/cli.ts';
import {
  formatearInformeDeSiembra,
  retirarFichaDeObra,
  sembrarFichasDeObra,
} from './lib/obras.ts';

const USO = [
  'Uso:',
  '  npm run obra -- sembrar [--corpus corpus]',
  '  npm run obra -- retirar <nombre-de-ficha> --motivo "…" [--corpus corpus]',
  '',
].join('\n');

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
const resto = argumentos.slice(1);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

function usoMal(motivos: string[]): never {
  process.stderr.write(`${motivos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

switch (orden) {
  case 'sembrar': {
    const mal = motivosDeArgumentosNoReconocidos(resto, { solas: [], conValor: ['--corpus'] });
    if (mal.length > 0) usoMal(mal);
    const informe = await sembrarFichasDeObra(rutas);
    const texto = formatearInformeDeSiembra(informe);
    if (informe.fallos.length > 0) {
      process.stderr.write(`${texto}\n`);
      process.exit(1);
    }
    process.stdout.write(`${texto}\n`);
    process.exit(0);
  }

  case 'retirar': {
    const conValor = ['--corpus', '--motivo'];
    // Los sueltos los separa `posicionales`, que sabe qué opciones consumen su valor: así
    // el valor de `--motivo` nunca se toma por el nombre, ni el nombre por un sobrante.
    const sueltos = posicionales(resto, conValor);
    const soloOpciones: string[] = [];
    for (let i = 0; i < resto.length; i += 1) {
      const actual = resto[i];
      if (conValor.includes(actual)) {
        soloOpciones.push(actual);
        const siguiente = resto[i + 1];
        if (siguiente !== undefined && !siguiente.startsWith('--')) {
          soloOpciones.push(siguiente);
          i += 1;
        }
      } else if (actual.startsWith('--')) {
        soloOpciones.push(actual);
      }
    }
    const mal = motivosDeArgumentosNoReconocidos(soloOpciones, { solas: [], conValor });
    if (sueltos.length === 0) usoMal(['Indique el nombre de la ficha a retirar.']);
    if (sueltos.length > 1) {
      usoMal([`Sobra ${sueltos.slice(1).map((a) => `«${a}»`).join(', ')}: se retira una ficha cada vez.`]);
    }
    if (mal.length > 0) usoMal(mal);
    const motivo = opcion(resto, '--motivo');
    if (motivo === undefined || motivo.trim() === '') {
      usoMal([
        `Indique el motivo por el que retira «${sueltos[0]}» con --motivo "…".`,
        'Una retirada sin motivo no es una retirada: es una desaparición.',
      ]);
    }
    terminar(await retirarFichaDeObra(rutas, sueltos[0], motivo));
  }

  default:
    process.stderr.write(USO);
    process.exit(2);
}
