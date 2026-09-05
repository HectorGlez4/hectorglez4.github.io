/**
 * Lo que se pidió rastrear, y cuándo — Historia 18.3, Épica 18, FR-46.
 *
 *   npx tsx tools/rastreo.ts [--corpus corpus] [--json]
 *   npx tsx tools/rastreo.ts --registrar <url> [<url>...] [--fecha AAAA-MM-DD]
 *
 * Sin banderas, **consulta**: lista lo pedido, lo cruza con la serie de indexación y no
 * escribe nada. Con `--registrar`, además anota en `corpus/peticiones-de-rastreo.yml` las
 * URL que se le den. Es la misma forma que estrenó `tools/objetivo.ts` y que sigue su
 * hermana `tools/indexacion.ts`, y aquí importa por un motivo propio: el registro solo
 * añade, así que una consulta anotada por descuido metería una petición que nadie cursó.
 *
 * ── Esta orden no pide nada, y no es una limitación temporal ─────────────────────────
 *
 * La petición **la cursa una persona** en Search Console. La API de inspección de URL
 * informa y no solicita, y la Indexing API solo admite ofertas de empleo y retransmisiones
 * en directo: hoy no hay vía legítima de automatizarla. Si algún día la hubiera sería una
 * decisión de producto y no de implementación, y por eso esta orden se llama registro y no
 * solicitud.
 *
 * ── Y tampoco elige ──────────────────────────────────────────────────────────────────
 *
 * Qué URL representan al sitio es una decisión editorial, del mismo carácter que elegir la
 * Cita del Día. La orden anota lo que se le dice; lo único que hace por su cuenta es
 * negarse a anotar lo que el sitio no publica y a anotar un lote que no quepa en una
 * decena, que es lo que §4.17 llama ruido.
 *
 * ── Códigos de salida ────────────────────────────────────────────────────────────────
 *
 * El convenio de `tools/`: **2** para la forma de la invocación —una bandera desconocida,
 * una opción sin su valor— y **1** para lo que la invocación dice y se rechaza —una URL que
 * el sitio no publica, un lote de más—. Estas órdenes se encadenan en guiones y un rechazo
 * con código 0 dejaría al guion creyendo que la petición quedó anotada.
 */

import { rutasPublicadas } from '../src/lib/publicado.ts';
import { censoPorFamilia } from './lib/indexacion.ts';
import {
  TOPE_DE_LA_PETICION,
  componerPeticiones,
  destinoDePeticion,
  lineasDeRegistro,
  nombreDelDestino,
  repartoPorFamilia,
} from './lib/rastreo.ts';
import {
  fechaLocal,
  leerPeticionesDeRastreo,
  leerSerieDeIndexacion,
  registrarPeticionesDeRastreo,
  rutasDelCorpus,
} from './lib/corpus.ts';
import { conjuntoDelCorpus } from './indexacion.ts';
import { motivosDeArgumentosNoReconocidos, opcion, posicionales, raizDeCorpusDe } from './lib/cli.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus', '--fecha'] as const;

const USO = [
  'El registro de lo que se pidió rastrear — Historia 18.3.',
  '',
  '  npx tsx tools/rastreo.ts [--corpus corpus] [--json]',
  '      Lista lo pedido y lo cruza con la serie de indexación. No escribe nada.',
  '',
  '  npx tsx tools/rastreo.ts --registrar <url> [<url>...] [--fecha AAAA-MM-DD]',
  '      Anota en corpus/peticiones-de-rastreo.yml las URL que YA se pidieron en Search',
  `      Console. Se añaden al final; nunca reemplazan a las de antes. Como mucho ${TOPE_DE_LA_PETICION}`,
  '      de golpe: pedir rastreo de un lote grande no es una petición, es ruido (§4.17).',
  '',
  'La petición se cursa a mano en Search Console; esta orden solo la anota. Y no elige: qué',
  'URL representan al sitio lo decide una persona, como la Cita del Día.',
  '',
  'Opciones: --corpus <ruta>, --fecha <AAAA-MM-DD> (por omisión hoy), --json, --registrar,',
  '          --ayuda',
].join('\n');

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, como
 * `tools/indexacion.ts`: es lo que permite que las pruebas la recorran entera.
 */
export async function principal(
  argumentos: string[],
  ahora: Date = new Date(),
): Promise<number> {
  const sueltos = posicionales(argumentos, CON_VALOR);

  /*
   * Una bandera que no se reconoce nunca es «lo mismo pero sin ella», y aquí menos que en
   * ninguna otra: `--registar` con la errata dejaría la orden listando lo pedido y saliendo
   * con 0, y quien la ejecutó creería haber anotado la petición que acaba de cursar. Los
   * posicionales se declaran admitidos —ya los reconoció `posicionales`— y lo que sobra es
   * cualquier opción que esta orden no tenga.
   */
  const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: [...sueltos, '--json', '--registrar', '--ayuda'],
    conValor: CON_VALOR,
  });
  if (noReconocidos.length > 0) {
    process.stderr.write(`${[...noReconocidos, '', USO].join('\n')}\n`);
    return 2;
  }

  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  const quiereJson = argumentos.includes('--json');
  const registra = argumentos.includes('--registrar');

  /*
   * Sin `--registrar`, una URL suelta no es «una consulta acotada»: es alguien que quiso
   * anotarla y olvidó la bandera. Listar y salir con 0 le diría que quedó anotada.
   */
  if (!registra && sueltos.length > 0) {
    process.stderr.write(
      `${[
        `«${sueltos[0]}» sobra: sin --registrar esta orden solo lista lo ya pedido.`,
        'Para anotar una petición que ya se cursó en Search Console:',
        `  npx tsx tools/rastreo.ts --registrar ${sueltos.join(' ')}`,
      ].join('\n')}\n`,
    );
    return 2;
  }

  // Y `--fecha` sin `--registrar` no es «lo mismo pero sin ella»: la consulta no fecha nada,
  // así que aceptarla en silencio dejaría creyendo que se anotó algo en ese día.
  if (!registra && opcion(argumentos, '--fecha') !== undefined) {
    process.stderr.write(
      '«--fecha» solo tiene sentido al anotar: la consulta lista lo pedido y no escribe nada.\n',
    );
    return 2;
  }

  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  const conjunto = await conjuntoDelCorpus(rutas);
  const censo = censoPorFamilia(conjunto);
  // El conjunto publicable lo decide su dueño (AD-11). Se calcula una vez para las dos
  // ramas: la consulta lo necesita para distinguir la portada de lo que se despublicó, y el
  // registro para decidir qué se puede pedir. La portada entra en él: se publica y se puede
  // pedir, aunque no sea de ninguna familia y el cruce la cuente aparte.
  const publicadas = rutasPublicadas(conjunto);
  const anteriores = await leerPeticionesDeRastreo(rutas);
  const serie = await leerSerieDeIndexacion(rutas);

  if (!registra) {
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify(
            { peticiones: anteriores, porFamilia: repartoPorFamilia(anteriores, censo) },
            null,
            2,
          )}\n`
        : `${[
            ...lineasDeRegistro(anteriores, censo, publicadas, serie),
            '',
            'Consulta: no se ha escrito nada.',
            'Para anotar una petición ya cursada: npx tsx tools/rastreo.ts --registrar <url>',
          ].join('\n')}\n`,
    );
    return 0;
  }

  const seleccion = componerPeticiones({
    seleccion: sueltos,
    publicadas,
    fecha: opcion(argumentos, '--fecha')?.trim() ?? fechaLocal(ahora),
    hoy: fechaLocal(ahora),
    // Lo ya anotado, para que la misma URL del mismo día no entre dos veces por ejecutar la
    // orden dos veces —lo natural cuando no se sabe si la primera cuajó—.
    anteriores,
  });

  if (!seleccion.ok) {
    process.stderr.write(
      `${[...seleccion.motivos, '', 'No se ha anotado nada: el registro se escribe entero o no se escribe.'].join('\n')}\n`,
    );
    return 1;
  }

  let ruta: string;
  try {
    ruta = await registrarPeticionesDeRastreo(rutas, seleccion.peticiones);
  } catch (fallo) {
    // Los fallos del registro son de forma del fichero, no del programa, igual que en el
    // registro de sesiones: se cuentan con su mensaje y no con una traza.
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  const todas = [...anteriores, ...seleccion.peticiones];
  process.stdout.write(
    quiereJson
      ? `${JSON.stringify(
          {
            anotadas: seleccion.peticiones,
            registro: ruta,
            porFamilia: repartoPorFamilia(todas, censo),
          },
          null,
          2,
        )}\n`
      : `${[
          ...seleccion.peticiones.map((peticion) => {
            const destino = destinoDePeticion(peticion.ruta, censo, publicadas);
            return `Anotada  ${peticion.fecha}  ${peticion.ruta}  (${nombreDelDestino(destino)})`;
          }),
          '',
          ...lineasDeRegistro(todas, censo, publicadas, serie),
          '',
          `Registrado en ${ruta}`,
          'Se añade al final: pedir la misma URL otro día es otra petición, no la misma.',
        ].join('\n')}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
