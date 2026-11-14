/**
 * Corregir o retirar una Cita atribuida, y que conste — Historia 35.8, FR-69, SM-C6, AD-35.
 *
 *   npm run peticion [-- --corpus corpus] [--json]
 *   npm run peticion -- anotar <slug> --solicitante persona-afectada|titular-de-derechos|otro
 *                             --peticion corregir|retirar [--motivo "…"] [--fecha AAAA-MM-DD]
 *   npm run peticion -- resolver <id> corregida|retirada|rechazada [--fecha AAAA-MM-DD]
 *   npm run peticion -- auditar <AAAA-MM> [--resultado <slug>=bien|mal-atribuida|sin-fuente …]
 *
 * Sin suborden, **consulta**: las peticiones por mes, con su Cita, su solicitante y su resolución,
 * las que siguen sin resolver pasado `PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS`, y SM-C6 por mes. No
 * escribe nada y no hace peticiones de red.
 *
 * `anotar` añade una `peticion` a `corpus/peticiones-de-retirada.yml`; la de retirar de un titular
 * de derechos retira la Cita en el mismo gesto. `resolver` añade una `resolucion`; `retirada`
 * retira la Cita si sigue publicada. `auditar` imprime la muestra de SM-C6 del mes y, con
 * `--resultado` para cada slug suyo, anota la auditoría en `corpus/auditorias-de-atribuidas.yml`.
 * Ningún agente anota lo que no ha recibido o visto una persona.
 *
 * Códigos: **2** por la forma de la invocación y **1** por lo que dice; en ninguno escribe nada.
 */

import { esJornada } from '../src/lib/citaDelDia.ts';
import {
  MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6,
  MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6,
  MUESTRA_DE_AUDITORIA_SM_C6,
  PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS,
} from '../src/lib/umbrales.ts';
import { esAtribuida } from '../src/lib/clase.ts';
import { fechaLocal, leerCitas, leerRegistroDeClases, rutasDelCorpus, type Rutas } from './lib/corpus.ts';
import { leerFormasVedadas } from './lib/formasVedadas.ts';
import { motivosDeArgumentosNoReconocidos, opcion, posicionales, raizDeCorpusDe } from './lib/cli.ts';
import {
  PETICIONES,
  RESOLUCIONES,
  RESULTADOS_DE_AUDITORIA,
  SOLICITANTES,
  SOLICITANTE_QUE_RETIRA_PRIMERO,
  atribuidasAlCierre,
  esMes,
  esResultadoDeAuditoria,
  esSolicitante,
  esTipoDePeticion,
  esTipoDeResolucion,
  juicioDeSmC6,
  leerAuditorias,
  leerPeticiones,
  mesDe,
  mesesDeSmC6,
  muestraDeAuditoria,
  peticionesVencidas,
  problemaDeLaCita,
  registrarAuditoria,
  registrarEntradaDePeticiones,
  retirarPorPeticion,
  separarEntradas,
  siguienteId,
  tieneContacto,
  type Auditoria,
  type JuicioDeSmC6,
  type MesDeSmC6,
  type Peticion,
  type ResultadoDeAuditoria,
  type Solicitante,
  type TipoDePeticion,
  type TipoDeResolucion,
} from './lib/peticiones.ts';

/** Las constantes que gobiernan la orden; de `umbrales.ts`, y las pruebas las pasan. */
export interface Constantes {
  plazo: number | undefined;
  muestra: number | undefined;
  minimo: number | undefined;
  maximo: number | undefined;
}

const DEL_ARBOL: Constantes = {
  plazo: PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS,
  muestra: MUESTRA_DE_AUDITORIA_SM_C6,
  minimo: MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6,
  maximo: MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6,
};

const CON_VALOR = ['--corpus', '--fecha', '--motivo', '--solicitante', '--peticion', '--resultado'] as const;
/** `--resultado` se repite, una por slug de la muestra; las demás, una vez. */
const REPETIBLES = ['--resultado'];

const OPCIONES_DE: Record<string, readonly string[]> = {
  consulta: ['--corpus', '--json', '--ayuda'],
  anotar: ['--corpus', '--json', '--ayuda', '--solicitante', '--peticion', '--motivo', '--fecha'],
  resolver: ['--corpus', '--json', '--ayuda', '--fecha'],
  auditar: ['--corpus', '--json', '--ayuda', '--resultado'],
};

const USO = [
  'Corregir o retirar una Cita atribuida, y que conste (Historia 35.8).',
  '',
  '  npm run peticion [-- --corpus corpus] [--json]',
  '      Las peticiones por mes, las que siguen sin resolver pasado el plazo, y SM-C6. No escribe nada.',
  '',
  `  npm run peticion -- anotar <slug> --solicitante ${SOLICITANTES.join('|')}`,
  `                            --peticion ${PETICIONES.join('|')} [--motivo "…"] [--fecha AAAA-MM-DD]`,
  '      Anota una petición que YA recibió una persona. Ningún campo admite contacto: un motivo con',
  '      forma de correo o de teléfono se rechaza. La de retirar de un titular de derechos retira',
  '      la Cita en el mismo gesto, y la resolución queda para después.',
  '',
  `  npm run peticion -- resolver <id> ${RESOLUCIONES.join('|')} [--fecha AAAA-MM-DD]`,
  '      Anota cómo se resolvió. «retirada» retira la Cita si sigue publicada.',
  '',
  `  npm run peticion -- auditar <AAAA-MM> [--resultado <slug>=${RESULTADOS_DE_AUDITORIA.join('|')} …]`,
  '      La muestra de SM-C6 de un mes cerrado; con un resultado para cada slug suyo, que decide una',
  '      persona, anota la auditoría.',
].join('\n');

function uso(motivos: string[]): number {
  process.stderr.write(`${[...motivos, '', USO].join('\n')}\n`);
  return 2;
}

function rechazo(motivos: string[]): number {
  process.stderr.write(`${[...motivos, '', 'No se ha escrito nada.'].join('\n')}\n`);
  return 1;
}

const mensajeDe = (fallo: unknown) => (fallo instanceof Error ? fallo.message : String(fallo));

/**
 * Lo que no se sostiene de las constantes con valor: el plazo es un entero de días ≥ 0, la muestra
 * y el mínimo son enteros positivos y la proporción máxima está entre 0 y 1. Sin valor no se juzga
 * (lo fija Héctor); con uno imposible la orden sale con 1 antes de leer nada, en vez de dar una
 * muestra vacía o un juicio que no significa nada.
 */
export function problemasDeLasConstantes(constantes: Constantes): string[] {
  const { plazo, muestra, minimo, maximo } = constantes;
  return [
    ...(plazo !== undefined && !(Number.isInteger(plazo) && plazo >= 0)
      ? [`PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS vale ${plazo}, y tiene que ser un entero de días mayor o igual que 0.`]
      : []),
    ...(muestra !== undefined && !(Number.isInteger(muestra) && muestra >= 1)
      ? [`MUESTRA_DE_AUDITORIA_SM_C6 vale ${muestra}, y tiene que ser un entero positivo.`]
      : []),
    ...(minimo !== undefined && !(Number.isInteger(minimo) && minimo >= 1)
      ? [`MIN_ATRIBUIDAS_PARA_JUZGAR_SM_C6 vale ${minimo}, y tiene que ser un entero positivo.`]
      : []),
    ...(maximo !== undefined && !(Number.isFinite(maximo) && maximo >= 0 && maximo <= 1)
      ? [`MAX_PROPORCION_MAL_ATRIBUIDA_SM_C6 vale ${maximo}, y tiene que ser una proporción entre 0 y 1.`]
      : []),
  ];
}

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, para que las pruebas la
 * recorran entera; las constantes llegan por parámetro, con las de `umbrales.ts` por omisión.
 */
export async function principal(
  argumentos: string[],
  ahora: Date = new Date(),
  constantes: Constantes = DEL_ARBOL,
): Promise<number> {
  const sueltos = posicionales(argumentos, CON_VALOR);
  const noReconocidos = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: [...sueltos, '--json', '--ayuda'],
    conValor: CON_VALOR,
  });
  if (noReconocidos.length > 0) return uso(noReconocidos);

  const repetidas = [...CON_VALOR, '--json', '--ayuda'].filter(
    (clave) => !REPETIBLES.includes(clave) && argumentos.filter((a) => a === clave).length > 1,
  );
  if (repetidas.length > 0) return uso(repetidas.map((clave) => `«${clave}» aparece más de una vez.`));

  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  const [suborden, ...resto] = sueltos;
  const clave = suborden ?? 'consulta';
  const admitidas = OPCIONES_DE[clave];
  if (admitidas === undefined || clave === 'consulta' && suborden !== undefined) {
    return uso([`«${suborden}» no es una suborden de esta orden: son «anotar», «resolver» y «auditar».`]);
  }
  const ajenas = argumentos.filter((a) => a.startsWith('--') && !admitidas.includes(a));
  if (ajenas.length > 0) {
    return uso(ajenas.map((a) => `«${a}» no es una opción de ${suborden === undefined ? 'la consulta' : `«${suborden}»`}.`));
  }
  const esperados = { consulta: 0, anotar: 1, resolver: 2, auditar: 1 }[clave as 'consulta'];
  if (resto.length !== esperados) {
    return uso([
      suborden === undefined
        ? `La consulta no toma argumentos sueltos, y se le han dado ${resto.length}.`
        : `«${suborden}» toma ${esperados === 1 ? 'un argumento' : `${esperados} argumentos`} y se le han dado ${resto.length}.`,
    ]);
  }

  const fechaDada = opcion(argumentos, '--fecha')?.trim();
  if (fechaDada !== undefined && !esJornada(fechaDada)) {
    return uso([`«${fechaDada}» no es una fecha del calendario: se espera AAAA-MM-DD.`]);
  }
  const quiereJson = argumentos.includes('--json');
  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  const hoy = fechaLocal(ahora);
  if (fechaDada !== undefined && fechaDada > hoy) {
    return rechazo([`«${fechaDada}» es una fecha futura: se anota lo que ya pasó, y hoy es ${hoy}.`]);
  }
  const fecha = fechaDada ?? hoy;
  const imposibles = problemasDeLasConstantes(constantes);
  if (imposibles.length > 0) return rechazo([...imposibles, 'Esos valores son de src/lib/umbrales.ts y los fija Héctor.']);

  if (clave === 'anotar') return anotar(argumentos, resto[0], fecha, rutas, quiereJson);
  if (clave === 'resolver') return resolver(resto[0], resto[1], fecha, rutas, quiereJson);
  if (clave === 'auditar') return auditar(argumentos, resto[0], hoy, rutas, quiereJson, constantes);
  return consultar(rutas, hoy, quiereJson, constantes);
}

// ─── anotar ──────────────────────────────────────────────────────────────────

async function anotar(argumentos: string[], slug: string, fecha: string, rutas: Rutas, quiereJson: boolean): Promise<number> {
  const solicitante = opcion(argumentos, '--solicitante')?.trim();
  const peticion = opcion(argumentos, '--peticion')?.trim();
  const motivo = opcion(argumentos, '--motivo');
  if (solicitante === undefined || !esSolicitante(solicitante)) {
    return uso([`«anotar» necesita «--solicitante», que es ${SOLICITANTES.join(', ')}.`]);
  }
  if (peticion === undefined || !esTipoDePeticion(peticion)) {
    return uso([`«anotar» necesita «--peticion», que es ${PETICIONES.join(' o ')}.`]);
  }
  if (motivo !== undefined && motivo.trim() === '') {
    return uso(['«--motivo» vacío no es un motivo: omítalo si no lo hay.']);
  }
  if (motivo !== undefined && tieneContacto(motivo)) {
    return rechazo([
      'El motivo lleva algo con forma de correo o de teléfono, y ningún campo del registro admite contacto: el repositorio es público.',
      'Anote el motivo sin el dato de contacto.',
    ]);
  }

  let contexto: Awaited<ReturnType<typeof leerLoNecesario>>;
  try {
    contexto = await leerLoNecesario(rutas);
  } catch (fallo) {
    return rechazo([mensajeDe(fallo)]);
  }
  const problema = problemaDeLaCita(slug, contexto.publicadas, contexto.clases);
  if (problema !== undefined) return rechazo([problema]);
  // Una petición no es anterior a la Cita atribuida sobre la que se pide: contaría en un mes en
  // que no estaba, y fecharía atrás su forma vedada.
  const desde = contexto.clases
    .filter((e) => e.slug === slug && esAtribuida(e))
    .map((e) => e.fecha)
    .sort()[0];
  if (desde !== undefined && fecha < desde) {
    return rechazo([`«${slug}» es atribuida desde el ${desde} (corpus/clases-de-cita.yml): una petición del ${fecha} sería anterior a ella.`]);
  }

  const nueva: Peticion = {
    id: siguienteId(contexto.entradas),
    fecha,
    cita: slug,
    solicitante: solicitante as Solicitante,
    peticion: peticion as TipoDePeticion,
    ...(motivo !== undefined ? { motivo: motivo.trim() } : {}),
  };
  const retiraPrimero = nueva.solicitante === SOLICITANTE_QUE_RETIRA_PRIMERO && nueva.peticion === 'retirar';
  const publicada = contexto.publicadas.some((c) => c.slug === slug);
  // Anotar dos veces lo mismo se admite —pueden ser dos correos—, pero se avisa: casi siempre es
  // un descuido, y cada entrada cuenta en las peticiones por cada cien.
  const igual = separarEntradas(contexto.entradas).peticiones.find(
    (p) => p.cita === slug && p.fecha === fecha && p.solicitante === nueva.solicitante && p.peticion === nueva.peticion,
  );

  let lineasDeRetirada: string[] = [];
  let devolver: (() => Promise<string[]>) | undefined;
  if (retiraPrimero && publicada) {
    const retirada = await retirarPorPeticion(rutas, slug, fecha);
    if (!retirada.ok) return rechazo(retirada.motivos);
    lineasDeRetirada = retirada.lineas;
    devolver = retirada.devolver;
  }

  let registro: string;
  try {
    registro = await registrarEntradaDePeticiones(rutas, { peticion: nueva });
  } catch (fallo) {
    return await deshacer(devolver, fallo);
  }

  const lineas = [
    `Anotada la petición ${nueva.id}  ${nueva.fecha}  ${nueva.cita}  ${nueva.solicitante}  ${nueva.peticion}` +
      (nueva.motivo !== undefined ? `  «${nueva.motivo}»` : ''),
    ...(retiraPrimero
      ? publicada
        ? ['La de retirar de un titular de derechos se atiende retirando primero:', ...lineasDeRetirada.map((l) => `  ${l}`)]
        : ['La Cita ya no está publicada: no hay nada que retirar.']
      : []),
    ...(igual !== undefined
      ? [`Aviso: ya había una igual, la petición ${igual.id} (${igual.fecha}, ${igual.solicitante}, ${igual.peticion}). Si es la misma, no son dos.`]
      : []),
    `Queda sin resolver. Para resolverla: npm run peticion -- resolver ${nueva.id} ${RESOLUCIONES.join('|')}`,
    `Registrado en ${registro}`,
  ];
  process.stdout.write(quiereJson ? `${JSON.stringify({ anotada: nueva, registro, retirada: retiraPrimero && publicada }, null, 2)}\n` : `${lineas.join('\n')}\n`);
  return 0;
}

/**
 * Si la entrada no se pudo anotar tras retirar, la Cita vuelve y su Ficha de Obra recupera el
 * título; la forma vedada se queda (solo añade), y con su slug no veda a esa misma Cita.
 */
async function deshacer(devolver: (() => Promise<string[]>) | undefined, fallo: unknown): Promise<number> {
  const motivos = [`No se pudo anotar en corpus/peticiones-de-retirada.yml: ${mensajeDe(fallo)}`];
  if (devolver !== undefined) {
    try {
      motivos.push(...(await devolver()));
      motivos.push(
        'Su forma quedó anotada en corpus/formas-vedadas.yml con su slug, que no veda a esa misma Cita: el registro solo añade.',
      );
    } catch (otro) {
      motivos.push(`Y la Cita no pudo volver (${mensajeDe(otro)}): sigue en corpus/_revision/. Devuélvala a mano.`);
    }
  }
  process.stderr.write(`${motivos.join('\n')}\n`);
  return 1;
}

/** Lo que leen `anotar` y `resolver` antes de escribir nada. Lanza con el motivo. */
async function leerLoNecesario(rutas: Rutas) {
  const entradas = await leerPeticiones(rutas);
  const clases = await leerRegistroDeClases(rutas);
  const publicadas = await leerCitas(rutas.citas);
  return { entradas, clases, publicadas };
}

// ─── resolver ────────────────────────────────────────────────────────────────

async function resolver(idDado: string, resolucion: string, fecha: string, rutas: Rutas, quiereJson: boolean): Promise<number> {
  if (!/^[1-9]\d*$/u.test(idDado)) return uso([`«${idDado}» no es el id de una petición: es un entero positivo.`]);
  if (!esTipoDeResolucion(resolucion)) return uso([`«${resolucion}» no es una resolución: es ${RESOLUCIONES.join(', ')}.`]);
  const id = Number(idDado);

  let contexto: Awaited<ReturnType<typeof leerLoNecesario>>;
  try {
    contexto = await leerLoNecesario(rutas);
  } catch (fallo) {
    return rechazo([mensajeDe(fallo)]);
  }
  const { peticiones, resoluciones } = separarEntradas(contexto.entradas);
  const peticion = peticiones.find((p) => p.id === id);
  if (peticion === undefined) return rechazo([`No hay ninguna petición ${id} en corpus/peticiones-de-retirada.yml.`]);
  const previa = resoluciones.get(id);
  if (previa !== undefined) {
    return rechazo([`La petición ${id} ya se resolvió ${previa.resolucion} el ${previa.fecha}: una petición se resuelve una vez.`]);
  }
  if (fecha < peticion.fecha) {
    return rechazo([`La resolución (${fecha}) no puede ser anterior a la petición ${id} (${peticion.fecha}).`]);
  }

  const cita = contexto.publicadas.find((c) => c.slug === peticion.cita);
  const retiraAhora = resolucion === 'retirada' && cita !== undefined && esAtribuida(cita);
  let lineasDeRetirada: string[] = [];
  let devolver: (() => Promise<string[]>) | undefined;
  if (retiraAhora) {
    const retirada = await retirarPorPeticion(rutas, peticion.cita, fecha);
    if (!retirada.ok) return rechazo(retirada.motivos);
    lineasDeRetirada = retirada.lineas;
    devolver = retirada.devolver;
  }

  let registro: string;
  try {
    registro = await registrarEntradaDePeticiones(rutas, {
      resolucion: { peticion: id, fecha, resolucion: resolucion as TipoDeResolucion },
    });
  } catch (fallo) {
    return await deshacer(devolver, fallo);
  }

  const retiradaPrimero = peticion.solicitante === SOLICITANTE_QUE_RETIRA_PRIMERO && peticion.peticion === 'retirar';
  const notas =
    resolucion === 'retirada'
      ? retiraAhora
        ? lineasDeRetirada.map((l) => `  ${l}`)
        : cita === undefined
          ? ['  La Cita ya no estaba publicada: no se ha movido nada, y SM-C6 no la cuenta como retirada.']
          : [
              '  La Cita sigue publicada, pero ya no es atribuida: no se ha movido nada, y SM-C6 no la cuenta como retirada.',
              '  Una Cita de siempre se retira con «npm run documentar -- --retirar».',
            ]
      : resolucion === 'corregida'
        ? ['  La corrección de una atribuida publicada se hace con su orden: npm run atribuida -- {obra|autor|personaje|variante|texto} …']
        : retiradaPrimero && cita === undefined
          ? ['  La Cita se retiró al anotar la petición y sigue en corpus/_revision/: rechazar no la devuelve. Devolverla es moverla de vuelta a corpus/citas/, a mano y con su commit.']
          : [];
  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ resuelta: { peticion: id, fecha, resolucion }, registro, retirada: retiraAhora }, null, 2)}\n`
      : `${[`Resuelta la petición ${id} (${peticion.cita}): ${resolucion}, el ${fecha}.`, ...notas, `Registrado en ${registro}`].join('\n')}\n`,
  );
  return 0;
}

// ─── auditar ─────────────────────────────────────────────────────────────────

async function auditar(
  argumentos: string[],
  mes: string,
  hoy: string,
  rutas: Rutas,
  quiereJson: boolean,
  constantes: Constantes,
): Promise<number> {
  if (!esMes(mes)) return uso([`«${mes}» no es un mes: se espera AAAA-MM.`]);
  const resultados: Record<string, ResultadoDeAuditoria> = {};
  for (let i = 0; i < argumentos.length; i += 1) {
    if (argumentos[i] !== '--resultado') continue;
    const valor = argumentos[i + 1] ?? '';
    const [slug, resultado, ...sobra] = valor.split('=');
    if (sobra.length > 0 || slug === undefined || slug === '' || !esResultadoDeAuditoria(resultado)) {
      return uso([`«--resultado ${valor}» no tiene la forma <slug>=${RESULTADOS_DE_AUDITORIA.join('|')}.`]);
    }
    if (slug in resultados) return uso([`«${slug}» lleva más de un «--resultado».`]);
    resultados[slug] = resultado;
  }
  const conResultados = Object.keys(resultados).length > 0;
  if (mes >= mesDe(hoy)) {
    return rechazo([`El mes ${mes} no ha cerrado: la muestra se elige con las atribuidas publicadas al cierre del mes.`]);
  }

  let muestra: string[] | undefined;
  let atribuidas: string[];
  try {
    const [clases, vedadas, publicadas] = await Promise.all([
      leerRegistroDeClases(rutas),
      leerFormasVedadas(rutas),
      leerCitas(rutas.citas),
    ]);
    atribuidas = atribuidasAlCierre(mes, clases, vedadas, atribuidasPublicadas(publicadas));
  } catch (fallo) {
    return rechazo([mensajeDe(fallo)]);
  }
  if (constantes.muestra === undefined) {
    if (conResultados) {
      return rechazo(['MUESTRA_DE_AUDITORIA_SM_C6 no tiene valor (lo fija Héctor): no hay muestra, así que ningún resultado es de ella.']);
    }
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify({ mes, muestra: null, atribuidas: atribuidas.length }, null, 2)}\n`
        : `MUESTRA_DE_AUDITORIA_SM_C6 no tiene valor (lo fija Héctor): no se elige muestra para ${mes}. ` +
            `Hay ${atribuidas.length} atribuidas publicadas al cierre del mes.\n`,
    );
    return 0;
  }
  muestra = muestraDeAuditoria(atribuidas, mes, constantes.muestra);

  if (!conResultados) {
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify({ mes, muestra, atribuidas: atribuidas.length }, null, 2)}\n`
        : `${[
            `Muestra de SM-C6 de ${mes}: ${muestra.length} de ${atribuidas.length} atribuidas publicadas al cierre del mes.`,
            ...muestra.map((s) => `  ${s}`),
            ...(muestra.length > 0
              ? [`Para anotar la auditoría, un resultado por slug: npm run peticion -- auditar ${mes} --resultado <slug>=${RESULTADOS_DE_AUDITORIA.join('|')} …`]
              : ['No hay ninguna atribuida que auditar.']),
          ].join('\n')}\n`,
    );
    return 0;
  }

  const ajenos = Object.keys(resultados).filter((s) => !muestra.includes(s));
  const faltan = muestra.filter((s) => !(s in resultados));
  if (ajenos.length > 0 || faltan.length > 0) {
    return rechazo([
      ...(ajenos.length > 0 ? [`No son de la muestra de ${mes}: ${ajenos.join(', ')}.`] : []),
      ...(faltan.length > 0 ? [`Falta el resultado de: ${faltan.join(', ')}.`] : []),
      `La muestra de ${mes} es: ${muestra.join(', ') || '(vacía)'}.`,
    ]);
  }

  let anteriores: Auditoria[];
  try {
    anteriores = await leerAuditorias(rutas);
  } catch (fallo) {
    return rechazo([mensajeDe(fallo)]);
  }
  const auditoria: Auditoria = { mes, muestra, resultados, auditadoEl: hoy };
  let registro: string;
  try {
    registro = await registrarAuditoria(rutas, auditoria);
  } catch (fallo) {
    return rechazo([mensajeDe(fallo)]);
  }
  const previa = anteriores.filter((a) => a.mes === mes).at(-1);
  const mal = Object.values(resultados).filter((r) => r === 'mal-atribuida').length;
  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ anotada: auditoria, registro }, null, 2)}\n`
      : `${[
          `Anotada la auditoría de ${mes}: ${mal} de ${muestra.length} mal atribuidas.`,
          ...(previa !== undefined ? [`Aviso: ya había una auditoría de ${mes}, del ${previa.auditadoEl}; la consulta lee esta, la última.`] : []),
          `Registrado en ${registro}`,
        ].join('\n')}\n`,
  );
  return 0;
}

// ─── consulta ────────────────────────────────────────────────────────────────

/** Los slugs de las atribuidas publicadas hoy: las de siempre no cuentan para SM-C6. */
const atribuidasPublicadas = (publicadas: readonly { slug: string; clase?: unknown }[]) =>
  new Set(publicadas.filter((c) => esAtribuida(c)).map((c) => c.slug));

const porCien = (v: number | undefined) => (v === undefined ? 'sin tasa' : v.toFixed(2));

/** Lo que la consulta dice del juicio de SM-C6. Nunca propone el freno. */
export function lineaDelJuicio(juicio: JuicioDeSmC6): string[] {
  if (juicio.estado === 'sin-valores') {
    return [`SM-C6 no se juzga: no tienen valor ${juicio.faltan.join(' ni ')} (los fija Héctor). Se informa sin juzgar.`];
  }
  if (juicio.estado === 'sin-pareja') {
    return ['SM-C6 no se juzga: todavía no hay dos meses cerrados seguidos que comparar.'];
  }
  if (juicio.estado === 'bajo-minimo') {
    return [
      `SM-C6 no se juzga: ningún par de meses cerrados seguidos llega a ${juicio.minimo} atribuidas publicadas. ` +
        'Un cero de reclamaciones puede ser el cero del tráfico, no el de la calidad.',
    ];
  }
  if (juicio.saltos.length === 0) return ['SM-C6 no salta en ningún par de meses cerrados seguidos que llega al mínimo.'];
  return [
    ...juicio.saltos.flatMap((s) => [`SM-C6 salta en ${s.mes}:`, ...s.motivos.map((m) => `  · ${m}`)]),
    'Qué hacer lo decide Héctor.',
  ];
}

async function consultar(rutas: Rutas, hoy: string, quiereJson: boolean, constantes: Constantes): Promise<number> {
  let leido;
  try {
    const [entradas, auditorias, clases, vedadas, publicadas] = await Promise.all([
      leerPeticiones(rutas),
      leerAuditorias(rutas),
      leerRegistroDeClases(rutas),
      leerFormasVedadas(rutas),
      leerCitas(rutas.citas),
    ]);
    leido = { entradas, auditorias, clases, vedadas, publicadasHoy: atribuidasPublicadas(publicadas) };
  } catch (fallo) {
    process.stderr.write(`${mensajeDe(fallo)}\nNo se ha podido consultar: no se cuenta nada a medias.\n`);
    return 1;
  }
  const { peticiones, resoluciones } = separarEntradas(leido.entradas);
  const vencidas = peticionesVencidas(leido.entradas, constantes.plazo, hoy);
  const meses: MesDeSmC6[] = mesesDeSmC6({ ...leido, hoy });
  const juicio = juicioDeSmC6(meses, { minimo: constantes.minimo, maximo: constantes.maximo });

  if (quiereJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          peticiones: peticiones.map((p) => ({ ...p, resolucion: resoluciones.get(p.id) })),
          ...(vencidas !== undefined ? { plazo: constantes.plazo, vencidas: vencidas.map((p) => p.id) } : { plazo: null }),
          smC6: { meses, juicio },
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  const porMes = new Map<string, Peticion[]>();
  for (const p of [...peticiones].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id))) {
    porMes.set(mesDe(p.fecha), [...(porMes.get(mesDe(p.fecha)) ?? []), p]);
  }
  const lineas = [
    'Peticiones de corrección y retirada',
    '═══════════════════════════════════',
    '',
    ...(peticiones.length === 0
      ? ['No hay ninguna petición anotada.']
      : [...porMes].flatMap(([mes, deMes]) => [
          mes,
          ...deMes.map((p) => {
            const r = resoluciones.get(p.id);
            return (
              `  ${p.id}  ${p.fecha}  ${p.cita}  ${p.solicitante}  ${p.peticion}  → ` +
              (r === undefined ? 'sin resolver' : `${r.resolucion} el ${r.fecha}`)
            );
          }),
        ])),
    '',
    vencidas === undefined
      ? 'PLAZO_DE_RESPUESTA_A_RETIRADA_DIAS no tiene valor (lo fija Héctor): se listan sin juzgar plazo.'
      : vencidas.length === 0
        ? `Ninguna petición sigue sin resolver pasado el plazo de ${constantes.plazo} días.`
        : `Sin resolver pasado el plazo de ${constantes.plazo} días: ${vencidas.map((p) => `${p.id} (${p.cita}, del ${p.fecha})`).join('; ')}.`,
    '',
    'SM-C6 — reclamaciones de la Cita atribuida',
    '══════════════════════════════════════════',
    '',
    ...(meses.length === 0
      ? ['No hay ninguna atribuida, petición ni auditoría: no hay meses que contar.']
      : [
          'mes      atribuidas  peticiones/100  retiradas/100  mal atribuida',
          ...meses.map(
            (m) =>
              `${m.mes}${m.cerrado ? ' ' : '*'} ${String(m.atribuidas).padStart(10)}  ${porCien(m.peticionesPorCien).padStart(14)}  ` +
              `${porCien(m.retiradasPorCien).padStart(13)}  ` +
              (m.auditoria === undefined
                ? 'sin auditar'
                : `${m.auditoria.malAtribuidas} de ${m.auditoria.muestra} (${m.auditoria.proporcion.toFixed(2)}), ` +
                  `${m.auditoria.sinFuente} sin fuente`),
          ),
          '* mes en curso: no se juzga.',
        ]),
    '',
    ...lineaDelJuicio(juicio),
    '',
    'Consulta: no se ha escrito nada.',
  ];
  process.stdout.write(`${lineas.join('\n')}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
