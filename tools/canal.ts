/**
 * Lo que se publicó en el canal propio — Historia 21.3, Épica 21, FR-45 — y las señales
 * externas hacia el sitio — Historia 21.4.
 *
 *   npm run canal [-- --corpus corpus] [--json]
 *   npm run canal -- anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD] [--nota "…"]
 *   npm run canal -- senal <url-origen> <ruta-destino> --tipo propia|ajena
 *                          [--fecha AAAA-MM-DD] [--nota "…"] [--retira AAAA-MM-DD]
 *
 * Sin suborden, **consulta**: reparte lo anotado por semana ISO y red, con a dónde enlaza
 * cada publicación y lo que mira el cierre de la 18.2, y da las señales externas separadas
 * en propias y ajenas con lo que mira el cierre de la 18.1. No escribe nada. Con `anotar`,
 * añade una línea al final de `corpus/publicaciones-de-canal.yml`; con `senal`, al final de
 * `corpus/senales-externas.yml`. Es la forma de `tools/rastreo.ts`.
 *
 * Cada suborden lee **solo el registro que escribe**: uno roto no bloquea al otro. La
 * consulta lee los dos, enseña lo que pudo leer, nombra lo que no y sale con 1 si algo falló.
 *
 * ── La orden no publica nada ─────────────────────────────────────────────────────────
 *
 * Publicar lo hace una persona en cada red, con el Kit delante. Esto anota lo que ya se
 * publicó o lo que ya enlaza; no hace peticiones de red y no consulta ninguna cuenta.
 *
 * ── Códigos de salida ────────────────────────────────────────────────────────────────
 *
 * El convenio de `tools/`: **2** para la forma de la invocación y **1** para lo que la
 * invocación dice y se rechaza. En ninguno se escribe nada.
 *
 * `anotar`: 2 por una bandera desconocida o repetida, argumentos de menos o de más, un
 * `--fecha` sin forma de jornada o una `--nota` vacía; 1 por una red ajena, un formato que no
 * existe, una ruta que el sitio no publica, un enlace marcado para otra red, una fecha futura
 * o anterior a la primera anotable, o un Corpus o un registro que no se dejan leer.
 *
 * `senal`:
 * Código 1 si lo dicho se rechaza: un origen que no es una URL http(s) absoluta, que es del
 * dominio propio o de un subdominio suyo, localhost, una IP, un host sin punto o una URL
 * con usuario o contraseña; un destino que el sitio no publica; una marca ?de= de una red
 * que no existe, o más de una; una fecha futura; un --retira sin señal igual viva en esa
 * fecha; o un registro que no se deja leer. Código 2 si falla la forma de la invocación:
 * sin --tipo o con un tipo que no es propia ni ajena; una bandera desconocida o repetida;
 * argumentos de menos o de más; un --fecha o un --retira sin forma de jornada; una --nota
 * vacía; --tipo o --retira fuera de senal. Ninguno de los dos escribe nada.
 */

import { esJornada } from '../src/lib/citaDelDia.ts';
import { rutasIndexables, rutasPublicadas } from '../src/lib/publicado.ts';
import { declararRutasIndexables } from '../src/lib/superficies.ts';
import { REDES_VALIDAS } from '../src/lib/redes.ts';
import { censoPorFamilia } from './lib/indexacion.ts';
import {
  FORMATOS,
  NOMBRE_DEL_DESTINO,
  SIN_ENLACE,
  TIPOS_DE_SENAL,
  cierreDe18_2,
  componerPublicacion,
  componerSenal,
  destinoDePublicacion,
  esTipoDeSenal,
  lineasDeCanal,
  lineasDeSenales,
  rachasPorRed,
  resumenDeSenales,
  resumenPorSemana,
  semanaIso,
  senalIgualA,
  type PublicacionDeCanal,
  type SenalExterna,
  type TipoDeSenal,
} from './lib/canal.ts';
import {
  FICHERO_DE_PUBLICACIONES,
  FICHERO_DE_SENALES,
  fechaLocal,
  leerPublicacionesDeCanal,
  leerSenalesExternas,
  registrarPublicacionDeCanal,
  registrarSenalExterna,
  rutasDelCorpus,
} from './lib/corpus.ts';
import { conjuntoDelCorpus } from './indexacion.ts';
import { motivosDeArgumentosNoReconocidos, opcion, posicionales, raizDeCorpusDe } from './lib/cli.ts';

/** Las opciones que consumen el argumento siguiente, para que no se cuelen de posicional. */
const CON_VALOR = ['--corpus', '--fecha', '--nota', '--tipo', '--retira'] as const;

const USO = [
  'El registro de lo que se publica en el canal propio (Historia 21.3) y de las señales',
  'externas hacia el sitio (Historia 21.4).',
  '',
  '  npm run canal [-- --corpus corpus] [--json]',
  '      Por semana ISO y red: publicaciones, a dónde enlazan, días con foto, enlaces',
  '      marcados, y las rachas que cierran la 18.2. Las señales externas, propias y',
  '      ajenas, con la primera ajena que cierra la 18.1. No escribe nada.',
  '',
  '  npm run canal -- anotar <red> <formato> <ruta|-> [--fecha AAAA-MM-DD] [--nota "…"]',
  '      Añade al final de corpus/publicaciones-de-canal.yml lo que YA se publicó.',
  `      <red>: ${REDES_VALIDAS.join(', ')}.`,
  `      <formato>: ${FORMATOS.join(', ')}.`,
  '      <ruta>: una página que el sitio publica —ruta o URL entera—, o',
  `      «${SIN_ENLACE}» si la publicación no enlaza. Con ?de=<red> de la misma red queda`,
  '      «marcado: true»; marcada para otra red, se rechaza.',
  '',
  '  npm run canal -- senal <url-origen> <ruta-destino> --tipo propia|ajena',
  '                         [--fecha AAAA-MM-DD] [--nota "…"] [--retira AAAA-MM-DD]',
  '      Añade al final de corpus/senales-externas.yml un enlace hacia el sitio desde fuera.',
  '      <url-origen>: la página pública que enlaza, con http(s)://; nunca del dominio propio.',
  '      <ruta-destino>: una página que el sitio publica —ruta o URL entera—.',
  `      --tipo: ${TIPOS_DE_SENAL.join(' o ')}. Obligatorio: propia si la puso Héctor, ajena si un tercero.`,
  '      --retira: la fecha de una señal igual (mismo origen, destino y tipo) que se',
  '      corrige; la consulta deja de contarla. Nada se reescribe.',
  '',
  'Opciones:',
  '  --corpus <ruta>, --json, --ayuda',
  '  --fecha <AAAA-MM-DD>   con «anotar» y con «senal»; por omisión, hoy.',
  '  --nota <texto>         con «anotar» y con «senal».',
  '  --tipo <propia|ajena>  solo con «senal», y obligatorio en ella.',
  '  --retira <AAAA-MM-DD>  solo con «senal».',
].join('\n');

function uso(motivos: string[]): number {
  process.stderr.write(`${[...motivos, '', USO].join('\n')}\n`);
  return 2;
}

function mensajeDe(fallo: unknown): string {
  return fallo instanceof Error ? fallo.message : String(fallo);
}

/** Un registro leído, o por qué no se pudo leer. */
type Lectura<T> = { ok: true; entradas: T[] } | { ok: false; motivo: string };

async function leer<T>(lector: () => Promise<T[]>): Promise<Lectura<T>> {
  try {
    return { ok: true, entradas: await lector() };
  } catch (fallo) {
    return { ok: false, motivo: mensajeDe(fallo) };
  }
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
  const senala = suborden === 'senal';

  if (suborden !== undefined && !anota && !senala) {
    return uso([`«${suborden}» no es una suborden de esta orden: son «anotar» y «senal».`]);
  }

  const fechaDada = opcion(argumentos, '--fecha')?.trim();
  const nota = opcion(argumentos, '--nota');
  const tipo = opcion(argumentos, '--tipo')?.trim();
  const retira = opcion(argumentos, '--retira')?.trim();
  if (
    !anota &&
    !senala &&
    [fechaDada, nota, tipo, retira].some((valor) => valor !== undefined)
  ) {
    return uso([
      '«--fecha» y «--nota» son de «anotar» y de «senal», y «--tipo» y «--retira», solo de ' +
        '«senal»: la consulta no escribe nada.',
    ]);
  }

  if (anota && (tipo !== undefined || retira !== undefined)) {
    return uso([
      '«--tipo» y «--retira» son de las señales externas («senal»): una publicación no tiene ' +
        'clase, y se corrige con otra publicación.',
    ]);
  }

  if (senala) {
    if (resto.length !== 2) {
      return uso([
        resto.length < 2
          ? `«senal» necesita dos argumentos —origen y destino— y se le han dado ${resto.length}.`
          : `«senal» toma dos argumentos —origen y destino— y se le han dado ${resto.length}. ` +
            'Se anota una señal por invocación.',
      ]);
    }
    if (tipo === undefined) {
      return uso([
        '«senal» necesita «--tipo propia» o «--tipo ajena»: la clase de la señal es lo que ' +
          'decide si cierra la 18.1, y no se supone.',
      ]);
    }
    if (!esTipoDeSenal(tipo)) {
      return uso([`«--tipo ${tipo}» no es una clase de señal: es ${TIPOS_DE_SENAL.join(' o ')}.`]);
    }
    if (retira !== undefined && !esJornada(retira)) {
      return uso([`«--retira ${retira}» no es una fecha del calendario: se espera AAAA-MM-DD.`]);
    }
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

  // Cada suborden lee solo el registro que escribe; la consulta, los dos.
  const publicacionesLeidas: Lectura<PublicacionDeCanal> | undefined = senala
    ? undefined
    : await leer(() => leerPublicacionesDeCanal(rutas));
  const senalesLeidas: Lectura<SenalExterna> | undefined = anota
    ? undefined
    : await leer(() => leerSenalesExternas(rutas));

  const delaSuborden = anota ? publicacionesLeidas : senala ? senalesLeidas : undefined;
  if (delaSuborden !== undefined && !delaSuborden.ok) {
    process.stderr.write(`${delaSuborden.motivo}\nNo se ha anotado nada.\n`);
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
  /*
   * Historia 22.4 — la lista de rutas indexables, declarada antes de validar nada. El canal
   * sigue aceptando cualquier ruta **publicada**: una publicación puede enlazar una Obra con
   * `noindex`, y eso es un enlace al sitio igual.
   */
  declararRutasIndexables(rutasIndexables(conjunto));

  if (!anota && !senala) {
    return consultar(
      publicacionesLeidas as Lectura<PublicacionDeCanal>,
      senalesLeidas as Lectura<SenalExterna>,
      { censo, publicadas, hoy, quiereJson },
    );
  }

  if (senala) {
    const anteriores = (senalesLeidas as { ok: true; entradas: SenalExterna[] }).entradas;
    const [origen, destino] = resto;
    const compuesta = componerSenal(
      {
        origen,
        destino,
        tipo: tipo as TipoDeSenal,
        fecha: fechaDada ?? hoy,
        ...(retira !== undefined ? { retira } : {}),
        ...(nota !== undefined ? { nota } : {}),
      },
      { publicadas, hoy, anteriores },
    );
    if (!compuesta.ok) {
      process.stderr.write(`${[...compuesta.motivos, '', 'No se ha anotado nada.'].join('\n')}\n`);
      return 1;
    }

    const senal = compuesta.senal;
    const igual = senalIgualA(senal, anteriores);

    let registro: string;
    try {
      registro = await registrarSenalExterna(rutas, senal);
    } catch (fallo) {
      process.stderr.write(`${mensajeDe(fallo)}\n`);
      return 1;
    }

    const deSenales = resumenDeSenales([...anteriores, senal], censo, publicadas, hoy);
    const familia = NOMBRE_DEL_DESTINO[destinoDePublicacion(senal.destino, censo, publicadas)];
    const aviso =
      igual !== undefined
        ? `Aviso: ya hay una igual del ${igual.fecha} (mismo origen, destino y tipo). Se ha ` +
          'anotado igual; la consulta cuenta enlaces distintos, no entradas.'
        : undefined;
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify(
            { anotada: senal, registro, ...(aviso !== undefined ? { aviso } : {}), senales: deSenales },
            null,
            2,
          )}\n`
        : `${[
            senal.retira !== undefined
              ? `Anotada corrección: retira la señal ${senal.tipo} del ${senal.retira}  ` +
                `${senal.origen}  →  ${senal.destino}`
              : `Anotada señal ${senal.tipo}  ${senal.fecha}  ${senal.origen}  →  ${senal.destino}  ` +
                `(${familia}${senal.marcado === true ? ', marcada' : ''})`,
            ...(aviso !== undefined ? [aviso] : []),
            '',
            ...lineasDeSenales(deSenales),
            '',
            `Registrado en ${registro}`,
          ].join('\n')}\n`,
    );
    return 0;
  }

  const anteriores = (publicacionesLeidas as { ok: true; entradas: PublicacionDeCanal[] }).entradas;
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

/**
 * La consulta: enseña lo que pudo leer y nombra lo que no. Un registro roto no esconde el
 * otro, pero la salida es 1 para que un guion no tome por buena una consulta a medias.
 */
function consultar(
  publicaciones: Lectura<PublicacionDeCanal>,
  senales: Lectura<SenalExterna>,
  contexto: {
    censo: ReturnType<typeof censoPorFamilia>;
    publicadas: readonly string[];
    hoy: string;
    quiereJson: boolean;
  },
): number {
  const { censo, publicadas, hoy, quiereJson } = contexto;
  const sinLeer: { registro: string; motivo: string }[] = [];
  if (!publicaciones.ok) {
    sinLeer.push({ registro: `corpus/${FICHERO_DE_PUBLICACIONES}`, motivo: publicaciones.motivo });
  }
  if (!senales.ok) sinLeer.push({ registro: `corpus/${FICHERO_DE_SENALES}`, motivo: senales.motivo });

  const resumen = publicaciones.ok ? resumenPorSemana(publicaciones.entradas, censo, publicadas) : undefined;
  const rachas = resumen !== undefined ? rachasPorRed(resumen, hoy) : undefined;
  const deSenales = senales.ok ? resumenDeSenales(senales.entradas, censo, publicadas, hoy) : undefined;

  const sinLeerTexto = (registro: string, motivo: string) => [
    `No se ha podido leer ${registro}; no se cuenta nada de él.`,
    `  ${motivo}`,
  ];

  process.stdout.write(
    quiereJson
      ? `${JSON.stringify(
          {
            ...(publicaciones.ok && resumen !== undefined && rachas !== undefined
              ? {
                  publicaciones: publicaciones.entradas,
                  porSemana: resumen,
                  rachas,
                  cierreDe18_2: cierreDe18_2(rachas),
                }
              : {}),
            ...(deSenales !== undefined ? { senales: deSenales } : {}),
            ...(sinLeer.length > 0 ? { sinLeer } : {}),
          },
          null,
          2,
        )}\n`
      : `${[
          ...(resumen !== undefined && rachas !== undefined
            ? lineasDeCanal(resumen, rachas)
            : ['Publicaciones del canal', '═══════════════════════', '', ...sinLeerTexto(sinLeer[0].registro, sinLeer[0].motivo)]),
          '',
          ...(deSenales !== undefined
            ? lineasDeSenales(deSenales)
            : [
                'Señales externas',
                '════════════════',
                '',
                ...sinLeerTexto(`corpus/${FICHERO_DE_SENALES}`, (senales as { motivo: string }).motivo),
              ]),
          '',
          'Consulta: no se ha escrito nada.',
          'Para anotar lo ya publicado: npm run canal -- anotar <red> <formato> <ruta|->',
          'Para anotar una señal: npm run canal -- senal <url-origen> <ruta-destino> --tipo propia|ajena',
        ].join('\n')}\n`,
  );
  if (sinLeer.length > 0) {
    process.stderr.write(
      `${sinLeer.map((s) => `No se ha podido leer ${s.registro}.`).join('\n')}\n`,
    );
    return 1;
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
