/**
 * Documentar —y retirar— una Cita ya publicada — Historia 11.6.
 *
 *   npx tsx tools/documentar.ts <slug> <corpus/fuentes/documento.txt> [--texto "<literal>"]
 *   npx tsx tools/documentar.ts --retirar <slug> "<motivo>"
 *
 * Un interruptor fino sobre `tools/lib/documentacion.ts`, con el patrón de
 * `tools/coleccion.ts`: aquí se leen argumentos y se escribe la salida, y toda la lógica
 * está debajo.
 *
 * **Esto sí es puerta, y no comodidad.** La diferencia con `tools/coleccion.ts` es que lo
 * que esta orden escribe no lo puede comprobar ningún esquema: que el texto de la Cita
 * aparezca literalmente en el documento de su Fuente. Editar el `.md` a mano y borrar la
 * línea del censo produce exactamente el mismo fichero sin haber cotejado nada, y el build
 * no lo distingue —porque el build coteja contra el documento, y quien lo edita a mano ya
 * ha decidido cuál es—. Por eso la orden existe: para que el gesto barato sea el correcto.
 *
 * Los códigos de salida son los de todas las órdenes de `tools/`: **2 la forma de la
 * invocación** —una bandera que no existe, un argumento que falta— y **1 lo que la
 * invocación dice** —una Cita que no está, un texto que no aparece—. Un rechazo con código
 * 0 dejaría a un guion de ingesta creyendo que la Cita quedó documentada.
 */

import { documentarCita, retirarCita } from './lib/documentacion.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import {
  motivosDeArgumentosNoReconocidos,
  opcion,
  posicionales,
  raizDeCorpusDe,
  terminar,
} from './lib/cli.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus', '--texto'] as const;

const USO = [
  'Uso:',
  '  npx tsx tools/documentar.ts <slug> <corpus/fuentes/documento.txt> [--texto "<literal>"]',
  '  npx tsx tools/documentar.ts --retirar <slug> "<motivo>"',
  '',
  'Documentar escribe la Fuente y la Procedencia derivadas del documento, y saca la Cita',
  'del censo de pendientes de cotejo. Solo si su texto aparece literal en el documento.',
  '',
  '--texto restituye el texto literal de la edición cuando el publicado difiere en signos.',
  'El texto nuevo también tiene que aparecer literal, y ser la misma Cita.',
  '',
  'Toda orden admite --corpus <ruta>.',
  '',
].join('\n');

function porLaForma(...motivos: string[]): never {
  process.stderr.write(`${motivos.join('\n')}\n\n${USO}`);
  process.exit(2);
}

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
const sueltos = posicionales(argumentos, CON_VALOR);
const retirando = argumentos.includes('--retirar');

/*
 * Una bandera con errata no es «lo mismo pero sin ella», y aquí menos que en ninguna otra
 * orden: `--texto` con errata dejaría documentar la Cita con su texto sin corregir contra
 * un documento donde no aparece —o peor, la documentaría en silencio si por casualidad
 * apareciera—, y un `--retirarr` haría que la orden intentase documentar una Cita con el
 * motivo de posicional. Los posicionales se declaran como admitidos —ya los reconoció
 * `posicionales`— y lo que sobra es cualquier opción que esta orden no tenga.
 */
const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: [...sueltos, '--retirar'],
  conValor: retirando ? (['--corpus'] as const) : CON_VALOR,
});
if (noReconocidos.length > 0) porLaForma(...noReconocidos);

try {
  if (retirando) {
    const [slug, motivo, ...sobrantes] = sueltos;
    if (slug === undefined) porLaForma('Indique el slug de la Cita que retira.');
    /*
     * El motivo que falta se rechaza **por la forma** —código 2— y no por lo que dice: no
     * es que el motivo sea malo, es que la invocación está incompleta. Sin este rechazo,
     * `--retirar <slug>` sería una desaparición sin explicación, que es la única manera de
     * que una Cita verdadera salga del Corpus sin que nadie sepa por qué.
     */
    if (motivo === undefined) {
      porLaForma(
        `Indique el motivo por el que retira «${slug}».`,
        'Una retirada sin motivo no es una retirada: es una desaparición.',
      );
    }
    if (sobrantes.length > 0) {
      porLaForma(
        `Sobran argumentos: «${sobrantes.join('», «')}».`,
        'El motivo va entre comillas, en un solo argumento.',
      );
    }
    terminar(await retirarCita(rutas, slug, motivo));
  }

  const [slug, rutaDelDocumento, ...sobrantes] = sueltos;
  if (slug === undefined || rutaDelDocumento === undefined) {
    porLaForma('Indique el slug de la Cita y el documento contra el que se coteja.');
  }
  if (sobrantes.length > 0) {
    porLaForma(`Sobran argumentos: «${sobrantes.join('», «')}».`);
  }

  const literal = opcion(argumentos, '--texto');

  terminar(
    await documentarCita(rutas, slug, rutaDelDocumento, {
      ...(literal !== undefined ? { texto: literal } : {}),
      // Lo que cambia se escribe por el error estándar **antes** de tocar el fichero, para
      // que se pueda parar la orden al leer algo que no se esperaba. Va otra vez en el
      // mensaje final, que es el que queda en el registro de la sesión.
      avisar: (linea) => process.stderr.write(`${linea}\n`),
    }),
  );
} catch (fallo) {
  /*
   * El envoltorio, por lo mismo que en `tools/coleccion.ts`: `leerCensoDeCotejo` y
   * `leerCitas` se niegan a leer a medias un fichero ilegible y lanzan nombrándolo. Hacen
   * bien, pero ese fallo no puede salir como traza de Node desde una orden cuya cabecera
   * promete rechazos redactados.
   */
  process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
  process.exit(1);
}
