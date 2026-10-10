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
 * Historia 22.2 — una obra, un nombre:
 *
 *   npm run obra -- restituir-grafia <slug-de-cita>
 *   npm run obra -- reunir <ficha-destino> <ficha-absorbida>
 *   npm run obra -- separar <ficha> <ficha-otra>
 *   npm run obra -- titular <ficha> "<grafía>"
 *
 * `restituir-grafia` iguala la obra de una Cita del censo a la cabecera de un documento
 * versionado de su Obra, sin sacarla del censo. `reunir`, `separar` y `titular` editan la
 * ficha y nunca las Citas. Reunir y separar los decide el dueño del Corpus.
 *
 * Historia 22.8 — el freno de SM-11:
 *
 *   npm run obra -- congelar
 *   npm run obra -- levantar
 *
 * `congelar` reescribe solo el bloque `CONGELACION_DE_OBRAS` de `src/lib/umbrales.ts` con la
 * jornada y la lista indexable vigente; `levantar` lo devuelve a `undefined`. Ninguna hace
 * commit, y las dos se niegan —código 1, nada escrito— si no hay nada que hacer. `--umbrales
 * <fichero>` sirve a las pruebas para no tocar el del repositorio.
 *
 * Códigos: 2 es la forma de la invocación (falta un argumento, sobra uno, una bandera que no
 * existe); 1 es lo que la invocación dice.
 *
 * Nadie escribe ni borra fichas a mano.
 */

import { fechaLocal, rutasDelCorpus } from './lib/corpus.ts';
import {
  motivosDeArgumentosNoReconocidos,
  opcion,
  posicionales,
  raizDeCorpusDe,
  terminar,
} from './lib/cli.ts';
import {
  congelarObras,
  formatearInformeDeSiembra,
  levantarCongelacion,
  restituirGrafia,
  retirarFichaDeObra,
  reunirFichas,
  sembrarFichasDeObra,
  separarFichas,
  titularFicha,
} from './lib/obras.ts';

const USO = [
  'Uso:',
  '  npm run obra -- sembrar [--corpus corpus]',
  '  npm run obra -- retirar <nombre-de-ficha> --motivo "…" [--corpus corpus]',
  '  npm run obra -- restituir-grafia <slug-de-cita> [--corpus corpus]',
  '  npm run obra -- reunir <ficha-destino> <ficha-absorbida> [--corpus corpus]',
  '  npm run obra -- separar <ficha> <ficha-otra> [--corpus corpus]',
  '  npm run obra -- titular <ficha> "<grafía>" [--corpus corpus]',
  '  npm run obra -- congelar [--corpus corpus]',
  '  npm run obra -- levantar',
  '',
].join('\n');

const argumentos = process.argv.slice(2);
const orden = argumentos[0];
/*
 * Todo lo que va detrás de un `--` literal es posicional, aunque empiece por guiones: una
 * grafía como «--Prólogo» o un slug raro no se toma por bandera. `npm run obra --` ya consume
 * el primero, así que este es el segundo: `npm run obra -- titular <ficha> -- "<grafía>"`.
 */
const separador = argumentos.indexOf('--', 1);
const resto = separador === -1 ? argumentos.slice(1) : argumentos.slice(1, separador);
const trasElSeparador = separador === -1 ? [] : argumentos.slice(separador + 1);
const rutas = rutasDelCorpus(raizDeCorpusDe(resto));

function usoMal(motivos: string[]): never {
  process.stderr.write(`${motivos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

/**
 * Los posicionales de una suborden que solo admite `--corpus`, exactamente `cuantos`. Lo que
 * falte o sobre, o una bandera que no existe, sale con código 2.
 */
function exactamente(cuantos: number, que: string): string[] {
  const conValor = ['--corpus'];
  const sueltos = [...posicionales(resto, conValor), ...trasElSeparador];
  const soloOpciones = resto.filter((a, i) => a.startsWith('--') || (i > 0 && resto[i - 1] === '--corpus'));
  const mal = motivosDeArgumentosNoReconocidos(soloOpciones, { solas: [], conValor });
  if (mal.length > 0) usoMal(mal);
  if (sueltos.length < cuantos) usoMal([`Falta ${que}.`]);
  if (sueltos.length > cuantos) {
    usoMal([`Sobra ${sueltos.slice(cuantos).map((a) => `«${a}»`).join(', ')}: esta orden toma ${que}.`]);
  }
  return sueltos;
}

/** Cada suborden sale con `return`: ninguna cae en la siguiente. */
async function principal(): Promise<never> {
  switch (orden) {
    case 'restituir-grafia': {
      const [slug] = exactamente(1, 'el slug de la Cita');
      return terminar(await restituirGrafia(rutas, slug));
    }

    case 'reunir': {
      const [destino, absorbida] = exactamente(2, 'la ficha destino y la ficha absorbida');
      return terminar(await reunirFichas(rutas, destino, absorbida));
    }

    case 'separar': {
      const [una, otra] = exactamente(2, 'las dos fichas que se declaran distintas');
      return terminar(await separarFichas(rutas, una, otra));
    }

    case 'titular': {
      const [ficha, grafia] = exactamente(2, 'la ficha y la grafía');
      return terminar(await titularFicha(rutas, ficha, grafia));
    }

    case 'sembrar': {
      const mal = motivosDeArgumentosNoReconocidos([...resto, ...trasElSeparador], {
        solas: [],
        conValor: ['--corpus'],
      });
      if (mal.length > 0) usoMal(mal);
      const informe = await sembrarFichasDeObra(rutas);
      const texto = formatearInformeDeSiembra(informe);
      if (informe.fallos.length > 0) {
        process.stderr.write(`${texto}\n`);
        return process.exit(1);
      }
      process.stdout.write(`${texto}\n`);
      return process.exit(0);
    }

    case 'retirar': {
      const conValor = ['--corpus', '--motivo'];
      // Los sueltos los separa `posicionales`, que sabe qué opciones consumen su valor: así
      // el valor de `--motivo` nunca se toma por el nombre, ni el nombre por un sobrante.
      const sueltos = [...posicionales(resto, conValor), ...trasElSeparador];
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
      return terminar(await retirarFichaDeObra(rutas, sueltos[0], motivo));
    }

    case 'congelar':
    case 'levantar': {
      const conValor = ['--corpus', '--umbrales'];
      const mal = motivosDeArgumentosNoReconocidos([...resto, ...trasElSeparador], {
        solas: [],
        conValor,
      });
      if (mal.length > 0) usoMal(mal);
      const sueltos = [...posicionales(resto, conValor), ...trasElSeparador];
      if (sueltos.length > 0) {
        usoMal([`Sobra ${sueltos.map((a) => `«${a}»`).join(', ')}: «${orden}» no toma argumentos.`]);
      }
      const umbrales = opcion(resto, '--umbrales');
      const destino = umbrales === undefined ? {} : { umbrales };
      return terminar(
        orden === 'congelar'
          ? await congelarObras(rutas, { ...destino, hoy: fechaLocal(new Date()) })
          : await levantarCongelacion(destino),
      );
    }

    default:
      process.stderr.write(USO);
      return process.exit(2);
  }
}

await principal();
