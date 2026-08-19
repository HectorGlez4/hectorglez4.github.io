/**
 * El objetivo de la sesión de sembrado — Historia 11.3, FR-25.
 *
 *   npx tsx tools/objetivo.ts [--corpus corpus] [--json]
 *   npx tsx tools/objetivo.ts --registrar
 *   npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]
 *
 * Sin banderas, **consulta**: propone el objetivo, declara de qué hueco sale y no escribe
 * nada. La propuesta es determinista —el mismo estado del Corpus da la misma frase,
 * palabra por palabra—, así que preguntar dos veces no aporta nada que guardar.
 *
 * Con `--registrar`, además anota la sesión en `corpus/sesiones-de-sembrado.yml`. Es la
 * bandera que separa «he corrido una sesión con este objetivo» de «he preguntado cuál es
 * el objetivo»: sin ella, el registro se llenaría de consultas y la cadencia que la
 * Historia 11.4 tiene que derivar de él saldría de preguntas, no de sesiones.
 *
 * Con `--anular`, el editor conserva la última palabra: la sesión se registra igual —una
 * anulación es una sesión corrida, y para la cadencia cuenta como cualquier otra— pero
 * con lo elegido y el motivo. Una anulación sin motivo se rechaza con código distinto de
 * cero: sin motivo no es un registro, es una desviación sin dueño, y estas órdenes se
 * encadenan en guiones donde un rechazo silencioso pasaría por éxito.
 *
 * Toda entrada del registro lleva además el **resultado medido** del Corpus, derivado
 * aquí de los ficheros y tecleado por nadie: Citas publicadas, SM-C1 y proporción de
 * tradición. De la diferencia entre dos entradas salen las Citas por sesión, y de la
 * serie de SM-C1 sale la sesión fallida que define el criterio de cierre de la épica.
 *
 * La orden es la cáscara: quien decide es `src/lib/objetivo.ts`, que es puro y no lee
 * disco (AD-5). Aquí solo se lee el corpus, se llama a la derivación y se imprime.
 */

import { verHuecos, type AutorParaHuecos, type CitaParaHuecos } from '../src/lib/huecos.ts';
import { porcentajeEnEspañol } from '../src/lib/formato.ts';
import { lineasDeObjetivo, objetivoDeSesion } from '../src/lib/objetivo.ts';
import { temasPublicados, type Cita, type Tema } from '../src/lib/publicado.ts';
import { auditar, type CitaParaAuditar } from '../src/lib/salud.ts';
import {
  fechaLocal,
  leerAutores,
  leerCitas,
  leerSesionesDeSembrado,
  leerTemas,
  registrarSesionDeSembrado,
  rutasDelCorpus,
} from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe, terminar } from './lib/cli.ts';

const argumentos = process.argv.slice(2);

const USO = [
  'El objetivo de la sesión de sembrado — Historia 11.3.',
  '',
  '  npx tsx tools/objetivo.ts [--corpus corpus] [--json]',
  '      Consulta el objetivo y declara de qué hueco sale. No registra nada.',
  '',
  '  npx tsx tools/objetivo.ts --registrar',
  '      Anota la sesión en corpus/sesiones-de-sembrado.yml con el objetivo aceptado.',
  '',
  '  npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]',
  '      Anota la sesión con el objetivo que el editor eligió en su lugar, y por qué.',
  '',
  'Opciones: --corpus <ruta>, --json, --registrar, --anular <motivo>, --elegido <objetivo>,',
  '          --ayuda',
].join('\n');

/*
 * Una bandera que no se reconoce nunca es «lo mismo pero sin ella». `--registar`, con la
 * errata, imprimía la propuesta, no registraba nada y salía con 0: el guion de la sesión
 * se quedaba creyendo que la había anotado.
 */
const sobrantes = motivosDeArgumentosNoReconocidos(argumentos, {
  solas: ['--json', '--registrar', '--ayuda'],
  conValor: ['--corpus', '--anular', '--elegido'],
});
if (sobrantes.length > 0) terminar({ ok: false, motivos: [...sobrantes, '', USO] });

if (argumentos.includes('--ayuda')) {
  process.stdout.write(`${USO}\n`);
  process.exit(0);
}

/** El valor de una opción, con los blancos colapsados a «no se ha dado». */
function valor(clave: string): string | undefined {
  const dado = opcion(argumentos, clave)?.trim();
  // Un solo sitio: si no, «   » salía omitido en el YAML, como cadena vacía en el --json
  // y como una línea en blanco en la terminal — tres respuestas para la misma entrada.
  return dado === '' ? undefined : dado;
}

const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

const citas = (await leerCitas(rutas.citas)) as unknown as CitaParaHuecos[];
const temas = await leerTemas(rutas);
const autores = (await leerAutores(rutas)) as unknown as AutorParaHuecos[];

/*
 * Los Temas anunciados salen del dueño único del conjunto publicable (AD-11), igual que
 * en `tools/huecos.ts`: el objetivo se deriva de lo **publicado**, no de lo que hay en
 * los ficheros, que es lo mismo que mide el umbral que el objetivo quiere cerrar.
 */
const anunciados = temasPublicados(
  temas as unknown as Tema[],
  citas as unknown as Cita[],
).map((t) => t.slug);

const huecos = verHuecos(citas, temas, autores, anunciados);
const objetivo = objetivoDeSesion(huecos);

const quiereJson = argumentos.includes('--json');
const anula = argumentos.includes('--anular');
// Anular es correr la sesión con otro objetivo, así que registra sin pedirlo aparte.
const registra = anula || argumentos.includes('--registrar');

/*
 * Declarar otro objetivo **es** anular la propuesta. Admitir `--elegido` a secas abriría
 * la puerta de atrás que `--anular` cierra: una desviación registrada sin motivo, que es
 * justamente lo que esta orden no admite.
 */
if (!anula && opcion(argumentos, '--elegido') !== undefined) {
  terminar({
    ok: false,
    motivos: [
      'Declarar otro objetivo es anular la propuesta, y una anulación lleva motivo.',
      '',
      '  npx tsx tools/objetivo.ts --anular "<motivo>" --elegido "<objetivo>"',
    ],
  });
}

if (!registra) {
  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ objetivo }, null, 2)}\n`
      : `${lineasDeObjetivo(objetivo).join('\n')}\n`,
  );
  process.exit(0);
}

let motivo: string | undefined;
let elegido: string | undefined;

if (anula) {
  motivo = valor('--anular');
  if (motivo === undefined) {
    terminar({
      ok: false,
      motivos: [
        'Una anulación sin motivo no es un registro: no se admite.',
        '',
        'La política es determinista y su propuesta se vuelve a obtener cuando se quiera;',
        'lo que no se reconstruye de ningún sitio es por qué se decidió otra cosa.',
        '',
        '  npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]',
      ],
    });
  }
  elegido = valor('--elegido');
} else if (objetivo.clase === 'ninguno' || objetivo.clase === 'sin-estado') {
  /*
   * No se puede aceptar un objetivo que no existe. Registrarlo metería en la serie de la
   * cadencia una sesión sin nada que sembrar, y la 11.4 la contaría como si fuera real.
   * Con `--anular` sí se admite: ahí el editor declara un objetivo propio y su motivo, y
   * eso sí es una sesión corrida.
   */
  terminar({
    ok: false,
    motivos: [
      `No hay objetivo que aceptar: ${objetivo.objetivo}`,
      '',
      'Una sesión sin nada que sembrar no entra en la serie de la que sale la cadencia.',
      'Si ha dedicado la sesión a algo por su cuenta, regístrelo como lo que es:',
      '',
      '  npx tsx tools/objetivo.ts --anular "<motivo>" [--elegido "<objetivo>"]',
    ],
  });
}

/*
 * El resultado medido — Historia 11.4. Sale de los mismos ficheros que acaba de leer la
 * política, no de un argumento: un resultado tecleado mide lo que quien lo teclea cree
 * recordar, y el criterio de cierre de la épica compara estas cifras entre entradas.
 */
const salud = auditar(citas as unknown as CitaParaAuditar[]);
const resultado = {
  citasPublicadas: salud.publicadas.total,
  procedenciaCompleta: salud.publicadas.porcentajeCompleta,
  tradicionLatinoamericana: huecos.tradicion.porcentaje,
};

const momento = new Date();

/*
 * Un reintento —el guion relanzado, la orden repetida por si acaso— no es una sesión más.
 * Dos entradas idénticas de la misma jornada inflarían la cadencia justo en el sentido
 * que la haría parecer mejor de lo que fue.
 */
/*
 * Los fallos del registro son de forma del fichero, no del programa: que esté vacío, que
 * le falte la clave «sesiones:», que alguien haya escrito algo detrás de la lista. Salen
 * por `terminar` y no por una traza, porque quien los va a leer es quien acaba de sembrar.
 */
async function comoRechazo<T>(hacer: () => Promise<T>): Promise<T> {
  try {
    // El `await` va dentro del `try` a propósito: sin él se devolvería la promesa sin
    // esperarla y el rechazo escaparía del `catch` como excepción no capturada.
    return await hacer();
  } catch (fallo) {
    if (fallo instanceof Error) terminar({ ok: false, motivos: [fallo.message] });
    throw fallo;
  }
}

const jornada = fechaLocal(momento);
const registradas = await comoRechazo(() => leerSesionesDeSembrado(rutas));
const yaRegistrada = registradas.some(
  (s) =>
    s.fecha === jornada &&
    s.propuesto === objetivo.objetivo &&
    (s.motivo ?? '') === (motivo ?? '') &&
    (s.elegido ?? '') === (elegido ?? ''),
);
if (yaRegistrada) {
  terminar({
    ok: false,
    motivos: [
      'Hoy ya hay registrada una sesión con este mismo objetivo y este mismo motivo.',
      '',
      'Si es un reintento, no hay nada que anotar: la sesión ya está en el registro.',
      'Si de verdad ha corrido otra sesión, se distinguirá por su objetivo o por su motivo.',
    ],
  });
}

const ruta = await comoRechazo(() =>
  registrarSesionDeSembrado(rutas, {
    // La fecha entra **solo** aquí. La política no la mira: si la mirara, el mismo Corpus
    // daría objetivos distintos según el día y dejaría de ser determinista. Y es la que
    // convierte el registro en una serie de la que se lee cadencia (Historia 11.4).
    momento,
    clase: objetivo.clase,
    propuesto: objetivo.objetivo,
    hueco: objetivo.hueco,
    // Los ejes estructurados, no solo la frase: sin ellos la 11.4 tendría que analizar
    // prosa en español para saber a qué Tema se dedicó una sesión.
    tema: objetivo.tema,
    tradicion: objetivo.tradicion,
    // Ausentes cuando la propuesta se acepta: una sesión sin `motivo` es una sesión
    // aceptada, y escribirlos vacíos haría creer que hubo una desviación que no hubo.
    elegido,
    motivo,
    resultado,
  }),
);

const mensaje = quiereJson
  ? JSON.stringify(
      { objetivo, sesion: { aceptado: !anula, elegido, motivo, resultado }, registro: ruta },
      null,
      2,
    )
  : [
      ...lineasDeObjetivo(objetivo),
      '',
      anula ? 'Anulado por el editor' : 'Sesión registrada',
      anula ? '─────────────────────' : '─────────────────',
      ...(anula
        ? [
            elegido === undefined
              ? 'En su lugar: otro objetivo, sin declarar.'
              : `En su lugar: ${elegido}`,
            `Motivo: ${motivo}`,
          ]
        : ['Objetivo aceptado, sin anulación.']),
      '',
      'Resultado medido del Corpus',
      '───────────────────────────',
      `Citas publicadas:            ${resultado.citasPublicadas}`,
      `Con procedencia completa:    ${porcentajeEnEspañol(resultado.procedenciaCompleta)} %`,
      `Tradición latinoamericana:   ${porcentajeEnEspañol(resultado.tradicionLatinoamericana)} %`,
      '',
      `Registrado en ${ruta}`,
    ].join('\n');

terminar({ ok: true, ruta, mensaje });
