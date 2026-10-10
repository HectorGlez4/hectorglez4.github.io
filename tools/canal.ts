/**
 * Lo que se publicó en el canal propio — Historia 21.3, Épica 21, FR-45.
 *
 *   npm run canal [-- --corpus corpus] [--json]
 *   npm run canal -- anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD] [--nota "…"]
 *
 * Sin suborden, **consulta**: reparte lo anotado por semana ISO y red, con a dónde enlaza
 * cada publicación y lo que mira el cierre de la 18.2, y no escribe nada. Con `anotar`,
 * añade una línea al final de `corpus/publicaciones-de-canal.yml`. Es la forma de
 * `tools/rastreo.ts`, y la 21.4 añadirá aquí mismo las señales externas.
 *
 * ── La orden no publica nada ─────────────────────────────────────────────────────────
 *
 * Publicar lo hace una persona en cada red, con el Kit delante. Esto anota lo que ya se
 * publicó; no hace peticiones de red y no consulta ninguna cuenta.
 *
 * ── Códigos de salida ────────────────────────────────────────────────────────────────
 *
 * El convenio de `tools/`: **2** para la forma de la invocación —una bandera desconocida o
 * repetida, argumentos de menos o de más, un `--fecha` sin forma de jornada, una `--nota`
 * vacía— y **1** para lo que la invocación dice y se rechaza —una red ajena, un formato que
 * no existe, una ruta que el sitio no publica, un enlace marcado para otra red, una fecha
 * futura— o para un Corpus o un registro que no se dejan leer. En ninguno se escribe nada.
 */

import { esJornada } from '../src/lib/citaDelDia.ts';
import { rutasPublicadas } from '../src/lib/publicado.ts';
import { REDES_VALIDAS } from '../src/lib/redes.ts';
import { censoPorFamilia } from './lib/indexacion.ts';
import {
  FORMATOS,
  NOMBRE_DEL_DESTINO,
  SIN_ENLACE,
  cierreDe18_2,
  componerPublicacion,
  destinoDePublicacion,
  lineasDeCanal,
  rachasPorRed,
  resumenPorSemana,
  semanaIso,
  type PublicacionDeCanal,
} from './lib/canal.ts';
import {
  fechaLocal,
  leerPublicacionesDeCanal,
  registrarPublicacionDeCanal,
  rutasDelCorpus,
} from './lib/corpus.ts';
import { conjuntoDelCorpus } from './indexacion.ts';
import { motivosDeArgumentosNoReconocidos, opcion, posicionales, raizDeCorpusDe } from './lib/cli.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus', '--fecha', '--nota'] as const;

const USO = [
  'El registro de lo que se publica en el canal propio — Historia 21.3.',
  '',
  '  npm run canal [-- --corpus corpus] [--json]',
  '      Por semana ISO y red: publicaciones, a dónde enlazan, días con foto, enlaces',
  '      marcados, y las rachas que cierran la 18.2. No escribe nada.',
  '',
  '  npm run canal -- anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD] [--nota "…"]',
  '      Añade al final de corpus/publicaciones-de-canal.yml lo que YA se publicó.',
  `      <red>: ${REDES_VALIDAS.join(', ')}.`,
  `      <formato>: ${FORMATOS.join(', ')}.`,
  '      <ruta>: una página que el sitio publica —ruta o URL entera—, o',
  `      «${SIN_ENLACE}» si la publicación no enlaza. Con ?de=<red> de la misma red queda`,
  '      «marcado: true»; marcada para otra red, se rechaza.',
  '',
  'Opciones: --corpus <ruta>, --fecha <AAAA-MM-DD> (por omisión hoy), --nota <texto>,',
  '          --json, --ayuda',
].join('\n');

function uso(motivos: string[]): number {
  process.stderr.write(`${[...motivos, '', USO].join('\n')}\n`);
  return 2;
}

function mensajeDe(fallo: unknown): string {
  return fallo instanceof Error ? fallo.message : String(fallo);
}

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, como
 * `tools/rastreo.ts`: es lo que permite que las pruebas la recorran entera.
 */
export async function principal(
  argumentos: string[],
  ahora: Date = new Date(),
): Promise<number> {
  const sueltos = posicionales(argumentos, CON_VALOR);

  const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: [...sueltos, '--json', '--ayuda'],
    conValor: CON_VALOR,
  });
  if (noReconocidos.length > 0) return uso(noReconocidos);

  // Una opción dada dos veces no es «la última gana»: `opcion` se queda con la primera, y
  // quien corrigió la fecha al final de la línea anotaría la que quiso corregir.
  const repetidas = [...CON_VALOR, '--json', '--ayuda'].filter(
    (clave) => argumentos.filter((a) => a === clave).length > 1,
  );
  if (repetidas.length > 0) {
    return uso(repetidas.map((clave) => `«${clave}» aparece más de una vez.`));
  }

  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  const quiereJson = argumentos.includes('--json');
  const [suborden, ...resto] = sueltos;
  const anota = suborden === 'anotar';

  if (suborden !== undefined && !anota) {
    return uso([`«${suborden}» no es una suborden de esta orden: la única es «anotar».`]);
  }

  const fechaDada = opcion(argumentos, '--fecha')?.trim();
  const nota = opcion(argumentos, '--nota');
  if (!anota && (fechaDada !== undefined || nota !== undefined)) {
    return uso(['«--fecha» y «--nota» solo tienen sentido al anotar: la consulta no escribe nada.']);
  }

  if (anota && resto.length !== 3) {
    return uso([
      resto.length < 3
        ? `«anotar» necesita tres argumentos —red, formato y ruta— y se le han dado ${resto.length}.`
        : `«anotar» toma tres argumentos —red, formato y ruta— y se le han dado ${resto.length}. ` +
          'Se anota una publicación por invocación.',
    ]);
  }

  if (fechaDada !== undefined && !esJornada(fechaDada)) {
    return uso([`«${fechaDada}» no es una fecha del calendario: se espera AAAA-MM-DD.`]);
  }

  if (nota !== undefined && nota.trim() === '') {
    return uso(['«--nota» vacía no es una nota: omítala si no hay nada que anotar.']);
  }

  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  const hoy = fechaLocal(ahora);

  let anteriores: PublicacionDeCanal[];
  try {
    anteriores = await leerPublicacionesDeCanal(rutas);
  } catch (fallo) {
    process.stderr.write(`${mensajeDe(fallo)}\n`);
    return 1;
  }

  let conjunto: Awaited<ReturnType<typeof conjuntoDelCorpus>>;
  try {
    conjunto = await conjuntoDelCorpus(rutas);
  } catch (fallo) {
    process.stderr.write(
      `No se ha podido leer el Corpus de ${rutas.raiz}: ${mensajeDe(fallo)}\n` +
        'Sin él no se sabe qué publica el sitio, así que no se anota ni se reparte nada.\n',
    );
    return 1;
  }
  const censo = censoPorFamilia(conjunto);
  const publicadas = rutasPublicadas(conjunto);

  if (!anota) {
    const resumen = resumenPorSemana(anteriores, censo, publicadas);
    const rachas = rachasPorRed(resumen, hoy);
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify(
            { publicaciones: anteriores, porSemana: resumen, rachas, cierreDe18_2: cierreDe18_2(rachas) },
            null,
            2,
          )}\n`
        : `${[
            ...lineasDeCanal(resumen, rachas),
            '',
            'Consulta: no se ha escrito nada.',
            'Para anotar lo ya publicado: npm run canal -- anotar <red> <formato> <ruta|->',
          ].join('\n')}\n`,
    );
    return 0;
  }

  const [red, formato, ruta] = resto;
  const compuesta = componerPublicacion(
    { red, formato, ruta, fecha: fechaDada ?? hoy, ...(nota !== undefined ? { nota } : {}) },
    { publicadas, hoy },
  );

  if (!compuesta.ok) {
    process.stderr.write(`${[...compuesta.motivos, '', 'No se ha anotado nada.'].join('\n')}\n`);
    return 1;
  }

  let registro: string;
  try {
    registro = await registrarPublicacionDeCanal(rutas, compuesta.publicacion);
  } catch (fallo) {
    process.stderr.write(`${mensajeDe(fallo)}\n`);
    return 1;
  }

  const publicacion = compuesta.publicacion;
  const resumen = resumenPorSemana([...anteriores, publicacion], censo, publicadas);
  const rachas = rachasPorRed(resumen, hoy);
  /*
   * Tras anotar, solo la semana en curso —y la de lo anotado, si se fechó en otra—: es lo
   * que quien acaba de publicar quiere comprobar. El historial entero es de la consulta.
   */
  const semanas = new Set([semanaIso(hoy), semanaIso(publicacion.fecha)]);
  const deEstaSemana = resumen.filter((fila) => semanas.has(fila.semana));
  const destino = NOMBRE_DEL_DESTINO[destinoDePublicacion(publicacion.ruta, censo, publicadas)];
  process.stdout.write(
    quiereJson
      ? `${JSON.stringify(
          {
            anotada: publicacion,
            registro,
            porSemana: deEstaSemana,
            rachas,
            cierreDe18_2: cierreDe18_2(rachas),
          },
          null,
          2,
        )}\n`
      : `${[
          `Anotada  ${publicacion.fecha}  ${publicacion.red}  ${publicacion.formato}  ` +
            `${publicacion.ruta}  (${destino}` +
            `${publicacion.marcado === undefined ? '' : publicacion.marcado ? ', marcada' : ', SIN MARCAR'})`,
          '',
          ...lineasDeCanal(deEstaSemana, rachas),
          '',
          `Registrado en ${registro}`,
        ].join('\n')}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
