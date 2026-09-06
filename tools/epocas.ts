/**
 * La cobertura por época, derivada de la Fuente — Historia 19.5, Épica 19.
 *
 *   npx tsx tools/epocas.ts [--corpus corpus] [--epoca <id>] [--json]
 *   npx tsx tools/epocas.ts --registrar
 *   npx tsx tools/epocas.ts --descartar <slug> --motivo "por qué no da Citas"
 *
 * Sin banderas **consulta**: le pide a Wikisource-es los miembros de sus categorías de
 * época, los cruza contra el Corpus, informa y no escribe nada. Con `--registrar` versiona
 * además la lista recuperada. Es la misma separación que estrenó `tools/objetivo.ts`, y aquí
 * importa por lo mismo que en `tools/indexacion.ts`: la lista **reemplaza** por época, así
 * que versionar una consulta a medias sustituiría la buena.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────────────
 *
 * El 2026-09-05 `npm run huecos` cerraba con «Meta de Corpus alcanzada» y el bucle se quedó
 * sin hueco del que derivar trabajo. El listón que faltaba no es un número: es cobertura por
 * época, de forma extensiva y hasta agotarla. Y esa lista **no se escribe**: se deriva de las
 * categorías con las que la propia Fuente clasifica a sus autores, porque una lista de
 * noventa nombres en el repositorio se queda vieja en cuanto la Fuente crece y nadie la
 * mantiene.
 *
 * ── Por qué es una orden y no un paso del build ──────────────────────────────────────
 *
 * AD-22: la red vive solo aquí, en la cáscara. Quien decide qué se pide, cómo se lee lo que
 * contesta y cómo se cruza es `tools/lib/epocas.ts`, que es puro y se prueba sin red. Y
 * AD-24: ningún módulo de `src/lib/` lee la lista versionada, ni por parámetro — quién
 * **podría** entrar en el Corpus no es contenido del sitio, y si el build lo leyera, `dist/`
 * pasaría a ser función de lo que la Fuente categorizó ayer.
 *
 * ── El informe informa; el editor decide ─────────────────────────────────────────────
 *
 * Regla de la casa desde la v1, y aquí con un filo concreto: `DP-Autores-100` es la
 * clasificación de la Fuente para los muertos hace más de cien años y es buena señal, pero
 * **admitir sigue siendo del editor**. La marca entra en el informe y jamás en una puerta
 * automática: dominio público, año de fallecimiento, Procedencia y cotejo siguen exactamente
 * igual.
 */

import { DOMINIO } from '../src/lib/dominio.ts';
import { huecoDeEpoca, type EpocaParaHuecos } from '../src/lib/huecos.ts';
import {
  leerAutores,
  leerCandidatosPorEpoca,
  leerDescartesDeCandidatos,
  registrarCandidatosPorEpoca,
  registrarDescarteDeCandidato,
  rutasDelCorpus,
  fechaLocal,
  type DescarteRegistrado,
  type EpocaRegistrada,
  type Rutas,
} from './lib/corpus.ts';
import {
  DIAS_DE_VIGENCIA_DE_LA_LISTA,
  EPOCAS,
  FUENTE_DE_LAS_EPOCAS,
  MAXIMO_DE_PAGINAS,
  candidatosDeRespuesta,
  cruzarEpoca,
  descartesPorCandidato,
  diasDesdeLaRecuperacion,
  direccionDeCategoria,
  epocaDe,
  listaCaducada,
  listaDeEpocaRegistrada,
  ordenarCandidatos,
  pendientesSinMarca,
  slugsSembrados,
  type Candidato,
  type CandidatoCruzado,
  type CandidatosDeEpoca,
  type Epoca,
  type EpocaSinActualizar,
} from './lib/epocas.ts';
import { conReintentos, fuenteDe, fuenteDeUrl } from './lib/fuentes.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe } from './lib/cli.ts';

const USO = [
  'La cobertura por época, derivada de las categorías de la Fuente — Historia 19.5.',
  '',
  '  npx tsx tools/epocas.ts [--corpus corpus] [--epoca <id>] [--json]',
  '      Recupera las épocas de la Fuente, las cruza contra el Corpus e informa.',
  '      No escribe nada.',
  '',
  '  npx tsx tools/epocas.ts --registrar',
  '      Versiona además la lista recuperada en corpus/candidatos-por-epoca.yml,',
  '      reemplazando la entrada anterior de cada época recuperada. Las que no se',
  '      hayan podido recuperar conservan la suya.',
  '',
  '  npx tsx tools/epocas.ts --descartar <slug> --motivo "por qué no da Citas"',
  '      Anota el descarte con su motivo. No sale a la red y no admite motivo vacío:',
  '      un descarte sin motivo es indistinguible de un candidato saltado.',
  '',
  `Épocas que la Fuente declara: ${EPOCAS.map((e) => e.id).join(', ')}`,
  'Opciones: --corpus <ruta>, --epoca <id>, --json, --registrar, --descartar <slug>,',
  '          --motivo <texto>, --ayuda',
].join('\n');

/** La única llamada de red de esta orden no puede colgarse ni tragarse una biblioteca. */
const TIEMPO_MAXIMO_MS = 30_000;

/**
 * La cortesía de decir quién pide qué, igual que en `tools/recuperar.ts`.
 *
 * El dominio no se escribe aquí: sale de `public/CNAME` por `src/lib/dominio.ts`, que es su
 * único dueño. Escrito a mano, este sería el sitio que se quedaría con el dominio viejo el
 * día que cambie, y encima es el que se le enseña a la Fuente.
 */
const IDENTIFICACION = `SabiduriaDeBolsillo/0.1 (+https://${DOMINIO}; cobertura por epoca)`;

/** Pedirle algo a la Fuente. **Es el único punto por el que entra la red en esta historia.** */
export type Pedir = (direccion: string) => Promise<unknown>;

/**
 * Un fallo que viene de la Fuente, con su código de estado cuando lo hubo.
 *
 * El código viaja en el fallo y no en el texto del mensaje porque es lo que decide si vale la
 * pena reintentar, y **una decisión no se toma leyendo una frase**: es el mismo precedente que
 * `tools/recuperar.ts`, cuya `Descarga` lleva `estado` justo para esto. Sin código —una
 * dirección que no es de la Fuente, por ejemplo— el fallo es definitivo: reintentarlo no
 * cambia la respuesta.
 */
export class FalloDeLaFuente extends Error {
  readonly estado?: number;

  constructor(mensaje: string, estado?: number) {
    super(mensaje);
    this.name = 'FalloDeLaFuente';
    if (estado !== undefined) this.estado = estado;
  }
}

/**
 * El cliente de verdad.
 *
 * Revalida la dirección **contra la Fuente de las épocas y no contra el conjunto entero**,
 * antes de pedir nada. Comprobar solo que fuera de *alguna* Fuente admitida era una
 * revalidación a medias: Gutenberg también está admitido y no tiene esta API, así que una
 * dirección mal compuesta contra él habría entrado igual en el lector de categorías. Es lo
 * mismo que hace `tools/recuperar.ts` desde la 11.1, que revalida cada redirección contra la
 * Fuente **de la que salió** y no contra el conjunto.
 */
export async function pedirALaFuente(direccion: string): Promise<unknown> {
  const fuente = fuenteDeUrl(direccion);
  const laDeLasEpocas = fuenteDe(FUENTE_DE_LAS_EPOCAS);
  if (fuente === undefined) {
    throw new FalloDeLaFuente(
      `«${direccion}» no pertenece a ninguna Fuente admitida, así que no se ha llegado a pedir.`,
    );
  }
  if (fuente.id !== FUENTE_DE_LAS_EPOCAS) {
    throw new FalloDeLaFuente(
      `«${direccion}» es de ${fuente.nombre}, y las épocas salen de ` +
        `${laDeLasEpocas?.nombre ?? FUENTE_DE_LAS_EPOCAS}. No se ha llegado a pedir: otra Fuente ` +
        'admitida no sirve esta API, y lo que contestara se leería como si viniera de aquí.',
    );
  }
  if (!fuente.permiteReutilizacion) {
    throw new FalloDeLaFuente(
      `${fuente.nombre} no admite reutilización: ${fuente.razon ?? 'su licencia no lo permite.'}`,
    );
  }

  const respuesta = await fetch(direccion, {
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    headers: { 'user-agent': IDENTIFICACION, accept: 'application/json' },
  });

  if (!respuesta.ok) {
    throw new FalloDeLaFuente(
      `${fuente.nombre} respondió ${respuesta.status} a la consulta de categoría.`,
      respuesta.status,
    );
  }

  return (await respuesta.json()) as unknown;
}

/**
 * Los códigos de la capa de red que dicen «ahora no» y no «esto no existe».
 *
 * `ENOTFOUND` no está a propósito: un nombre que no resuelve no se arregla insistiendo tres
 * veces, y meterlo aquí convertiría una errata en el anfitrión en tres peticiones.
 */
const CODIGOS_PASAJEROS = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

/**
 * Un fallo del que solo la Fuente es responsable, y que por eso vale la pena repetir.
 *
 * **Se clasifica por causa y no por el texto del mensaje.** La versión que comparaba cadenas
 * prometía en su comentario reintentar un tiempo de espera agotado y no lo hacía: el corte
 * propio de `AbortSignal.timeout` produce «The operation was aborted due to timeout», que no
 * casa con ninguno de sus patrones. Fallaba al lado seguro —de más no se reintentaba—, pero
 * un comentario que miente sobre lo que hace el código es peor que el fallo, porque el
 * siguiente que lo lea confiará en él. El precedente es `tools/recuperar.ts`, que clasifica
 * por código de estado.
 */
function esPasajero(fallo: unknown): boolean {
  if (fallo instanceof FalloDeLaFuente) {
    // Sin estado, el fallo lo produjimos nosotros antes de pedir: no hay nada que reintentar.
    return fallo.estado !== undefined && fallo.estado >= 500;
  }

  if (!(fallo instanceof Error)) return false;

  // El corte por tiempo, que es el caso que el comentario prometía y no cumplía.
  if (fallo.name === 'TimeoutError' || fallo.name === 'AbortError') return true;

  // Y la capa de red por debajo de `fetch`, que envuelve el motivo real en `cause`.
  const causa: unknown = (fallo as { cause?: unknown }).cause;
  if (causa instanceof Error) {
    if (causa.name === 'TimeoutError' || causa.name === 'AbortError') return true;
    const codigo = (causa as { code?: unknown }).code;
    if (typeof codigo === 'string' && CODIGOS_PASAJEROS.has(codigo)) return true;
  }
  const codigo = (fallo as { code?: unknown }).code;
  return typeof codigo === 'string' && CODIGOS_PASAJEROS.has(codigo);
}

/**
 * Recupera una época entera de la Fuente, siguiendo la continuación hasta agotarla.
 *
 * Se sigue la continuación **hasta el final o hasta el tope**, y si el tope se alcanza se
 * lanza en vez de devolver lo que hubiera. Una época servida a medias es una lista más corta
 * que la real, y una lista más corta se lee después como una época más cerca de estar
 * terminada de lo que está — exactamente el error que esta historia existe para no cometer.
 *
 * Y **la primera página tiene que traer `query`**. Medido el 2026-09-06 contra la API: una
 * categoría que no existe —porque alguien la renombró en la Fuente— contesta `200` con
 * `{"batchcomplete":true,"limits":{…}}`, sin `error` y sin `query`, exactamente igual que una
 * categoría vacía. Tomarlas por lo mismo daba «cero candidatos, recuperación correcta», la
 * lista buena de la época quedaba sustituida por una vacía con la fecha de hoy, y la orden
 * salía con código 0. Reproducido: 30 candidatos → 0, sin un aviso. Una categoría vacía de
 * verdad existe, y por existir contesta con su `query` sin páginas.
 */
export async function recuperarEpoca(
  epoca: Epoca,
  pedir: Pedir,
  opciones: { esperar?: (ms: number) => Promise<void> } = {},
): Promise<Candidato[]> {
  const candidatos: Candidato[] = [];
  let continuar: Record<string, string> | undefined;

  for (let pagina = 0; pagina < MAXIMO_DE_PAGINAS; pagina += 1) {
    const direccion = direccionDeCategoria(epoca, continuar);
    /*
     * Con reintento, y por el mismo motivo que `tools/recuperar.ts`: Wikisource limita la
     * tasa **por rachas**, y un 503 pasajero dice «ahora no», no «esto no existe».
     */
    const leida = await conReintentos(
      async (): Promise<{ ok: true; datos: unknown } | { ok: false; fallo: unknown }> => {
        try {
          return { ok: true, datos: await pedir(direccion) };
        } catch (fallo) {
          return { ok: false, fallo };
        }
      },
      (r) => r.ok || !esPasajero(r.fallo),
      opciones.esperar === undefined ? {} : { esperar: opciones.esperar },
    );

    if (!leida.ok) throw leida.fallo;

    const trozo = candidatosDeRespuesta(leida.datos);

    if (pagina === 0 && !trozo.respondio) {
      throw new Error(
        `la categoría «${epoca.categoria}» no ha devuelto «query»: la Fuente contesta así ` +
          'tanto a una categoría vacía como a una que ya no existe —porque la renombraron—, y ' +
          'las dos son indistinguibles desde fuera. No se da por recuperada: darla por vacía ' +
          'sustituiría la lista versionada por una de cero candidatos con cara de época ' +
          'agotada. Compruebe el título de la categoría en la Fuente.',
      );
    }

    candidatos.push(...trozo.candidatos);

    if (trozo.continuar === undefined) return ordenarCandidatos(candidatos);
    continuar = trozo.continuar;
  }

  throw new Error(
    `la categoría no terminó de servirse en ${MAXIMO_DE_PAGINAS} peticiones. Una época a ` +
      'medias se lee como una época más cerca de terminarse de lo que está, así que no se ' +
      'da por recuperada.',
  );
}

/** Los slugs de los Autores que el Corpus ya declara: con eso se cruza «sembrado». */
export async function sembradosDelCorpus(rutas: Rutas): Promise<Set<string>> {
  /*
   * Un Autor declarado en `corpus/autores/` ya pasó la puerta de admisión, tenga una Cita o
   * cien. Cruzar contra las Citas en vez de contra los Autores contaría como pendiente a
   * quien ya está admitido y mandaría al bucle a recuperarlo otra vez.
   *
   * Y con los alias: quien decide con qué slugs puede aparecer un Autor en la Fuente es
   * `slugsSembrados`, que tiene un solo dueño y lo comparte con `tools/huecos.ts`.
   */
  return slugsSembrados(await leerAutores(rutas));
}

const cifra = (valor: number | string) => String(valor).padStart(4);

/** Las líneas del informe de una época ya cruzada. */
export function lineasDeEpoca(
  lista: CandidatosDeEpoca,
  cruzada: { epoca: EpocaParaHuecos; candidatos: CandidatoCruzado[] },
  actualizada: boolean,
  hoy: string,
): string[] {
  const hueco = huecoDeEpoca(cruzada.epoca);
  const sinMarca = pendientesSinMarca(cruzada.candidatos);
  const conMarca = cruzada.candidatos.filter((c) => c.dominioPublico).length;

  const lineas = [
    '',
    `${lista.nombre} — ${lista.categoria}`,
    '─'.repeat(Math.max(24, lista.nombre.length + lista.categoria.length + 3)),
    `Candidatos de la Fuente:           ${cifra(hueco.candidatos)}` +
      (actualizada
        ? `   (recuperados el ${lista.recuperada})`
        : `   (lista versionada del ${lista.recuperada || 'día que no consta'}; no se actualizó)`),
    `  ya sembrados en el Corpus:       ${cifra(hueco.sembrados)}`,
    `  descartados con motivo escrito:  ${cifra(hueco.descartados)}`,
    `  pendientes:                      ${cifra(hueco.faltan)}`,
    `Con la marca DP-Autores-100:       ${cifra(conMarca)}   (señal, no permiso)`,
    `Pendientes sin esa marca:          ${cifra(sinMarca.length)}   (se miran a mano)`,
  ];

  /*
   * Y cuánto hace que se preguntó, cuando la lista es la versionada. «TERMINADA» se imprime
   * igual con una lista de hoy que con una de hace ocho meses, y en el segundo caso quiere
   * decir «terminada respecto de lo que la Fuente decía hace ocho meses». Es un aviso y no
   * una puerta: una lista vieja sigue siendo mejor que ninguna.
   */
  if (!actualizada && listaCaducada(lista.recuperada, hoy)) {
    const dias = diasDesdeLaRecuperacion(lista.recuperada, hoy);
    lineas.push(
      dias === undefined
        ? 'LISTA SIN FECHA: no consta cuándo se recuperó, así que las cuentas de arriba son de ' +
            'una foto de antigüedad desconocida.'
        : `LISTA DE HACE ${dias} DÍAS, más del plazo de ${DIAS_DE_VIGENCIA_DE_LA_LISTA}: lo de ` +
            'arriba se cuenta contra lo que la Fuente decía entonces, no contra lo que dice hoy.',
      'Regenérela con: npm run epocas:registrar',
    );
  }

  if (hueco.terminada) {
    lineas.push(
      'ÉPOCA TERMINADA: todos sus candidatos están sembrados o descartados con motivo.',
    );
  } else if (hueco.candidatos === 0) {
    lineas.push(
      'Sin candidatos: la categoría no ha devuelto a nadie, que no es lo mismo que estar',
      'terminada. Recupérela antes de darla por agotada.',
    );
  }

  const pendientes = cruzada.candidatos.filter((c) => c.estado === 'pendiente');
  if (pendientes.length > 0) {
    lineas.push(
      '',
      'Pendientes (la Fuente los propone; admitir es del editor):',
      ...pendientes.map(
        (c) => `  ${c.dominioPublico ? 'DP ' : '·  '}${c.nombre}  ${c.pagina}`,
      ),
    );
  }

  return lineas;
}

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, como
 * `tools/indexacion.ts`: es lo que permite que las pruebas la recorran entera.
 *
 * `pedir` tiene valor por omisión y es el **único** parámetro que existe por las pruebas.
 * Está aquí y no dentro porque la red es lo que AD-22 manda dejar en un solo sitio, y un solo
 * sitio es también un solo sitio por el que sustituirla.
 */
export async function principal(
  argumentos: string[],
  pedir: Pedir = pedirALaFuente,
  ahora: Date = new Date(),
): Promise<number> {
  const sobrantes = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: ['--json', '--registrar', '--ayuda'],
    conValor: ['--corpus', '--epoca', '--descartar', '--motivo'],
  });
  if (sobrantes.length > 0) {
    process.stderr.write(`${[...sobrantes, '', USO].join('\n')}\n`);
    return 1;
  }

  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  /*
   * Banderas que no se pueden dar juntas, y que antes se ignoraban en silencio — el mismo
   * modo de fallo que `motivosDeArgumentosNoReconocidos` cierra en el resto del proyecto.
   *
   * `--descartar` corta arriba y devuelve, así que `--registrar` y `--epoca` a su lado no
   * hacían nada. Lo grave no era el gesto perdido: era que la salida terminaba diciendo
   * «Registrado en …», que se lee como la lista de candidatos, cuando lo que se había escrito
   * era el registro de descartes. Una orden que hace la mitad de lo que se le pidió y lo
   * cuenta con la frase de la otra mitad es peor que una que se niega.
   */
  if (opcion(argumentos, '--descartar') !== undefined) {
    const incompatibles = ['--registrar', '--epoca'].filter((bandera) =>
      argumentos.includes(bandera),
    );
    if (incompatibles.length > 0) {
      process.stderr.write(
        `${[
          `«--descartar» no se combina con ${incompatibles.map((b) => `«${b}»`).join(' ni con ')}: ` +
            'descartar es un acto del editor sobre la lista ya versionada y no sale a la red.',
          'Son dos órdenes, y en este orden: primero se recupera y se versiona, y después se',
          'descarta a quien no dé Citas.',
          '',
          USO,
        ].join('\n')}\n`,
      );
      return 1;
    }
  }

  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  const quiereJson = argumentos.includes('--json');

  /*
   * Lo versionado se lee **antes de pedir nada**: es de donde sale el respaldo cuando la
   * Fuente no responde y contra lo que se comprueba un descarte. Un fichero ilegible se
   * cuenta con su mensaje y sin traza, como en los otros tres registros del Corpus: el fallo
   * es de forma del fichero, no del programa, y sale a mano.
   */
  let versionadas: EpocaRegistrada[];
  try {
    versionadas = await leerCandidatosPorEpoca(rutas);
  } catch (fallo) {
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  // ── Descartar: es un acto del editor y no sale a la red ────────────────────

  /*
   * `--descartar` sin valor no llega aquí: lo rechaza arriba `motivosDeArgumentosNoReconocidos`,
   * que desde la 13.x cuenta también las opciones con valor a las que no se les dio ninguno.
   * Por eso el slug entra ya como cadena y no hay una rama de «vino vacío» que nadie corre.
   */
  const aDescartar = opcion(argumentos, '--descartar');
  if (aDescartar !== undefined) {
    return await descartar(rutas, aDescartar, argumentos, versionadas, ahora, quiereJson);
  }

  if (opcion(argumentos, '--motivo') !== undefined) {
    process.stderr.write(
      `${[
        '«--motivo» solo tiene sentido junto a «--descartar»: es el motivo de un descarte.',
        '',
        USO,
      ].join('\n')}\n`,
    );
    return 1;
  }

  // ── Qué épocas se miran ────────────────────────────────────────────────────

  const pedida = opcion(argumentos, '--epoca');
  if (pedida !== undefined && epocaDe(pedida) === undefined) {
    process.stderr.write(
      `${[
        `«${pedida}» no es una época que la Fuente declare.`,
        `Las que declara: ${EPOCAS.map((e) => e.id).join(', ')}.`,
        'Añadir categorías que no sean de la Fuente, o inventar épocas que no declare, es',
        'una decisión del editor y no de esta orden.',
      ].join('\n')}\n`,
    );
    return 1;
  }
  const epocas = pedida === undefined ? EPOCAS : EPOCAS.filter((e) => e.id === pedida);

  // ── Se recupera de la Fuente; lo que no llegue se toma de lo versionado ────

  const hoy = fechaLocal(ahora);
  const recuperadas: EpocaRegistrada[] = [];
  const sinActualizar: EpocaSinActualizar[] = [];
  const listas: CandidatosDeEpoca[] = [];

  for (const epoca of epocas) {
    const versionada = versionadas.find((v) => v.id === epoca.id);
    try {
      const candidatos = await recuperarEpoca(epoca, pedir);
      const lista: CandidatosDeEpoca = {
        id: epoca.id,
        nombre: epoca.nombre,
        categoria: epoca.categoria,
        recuperada: hoy,
        candidatos,
      };
      listas.push(lista);
      recuperadas.push(lista);
    } catch (fallo) {
      /*
       * **La Fuente caída no rompe el bucle.** Se dice que no se actualizó y se sigue con la
       * lista versionada, que es justo para lo que se versiona. Una época que nunca se
       * recuperó entra igual, vacía y con su aviso: es lo que distingue «no hay nadie» de
       * «no lo hemos preguntado nunca».
       */
      sinActualizar.push({
        id: epoca.id,
        motivo: fallo instanceof Error ? fallo.message : String(fallo),
      });
      listas.push(
        versionada === undefined
          ? {
              id: epoca.id,
              nombre: epoca.nombre,
              categoria: epoca.categoria,
              recuperada: '',
              candidatos: [],
            }
          : listaDeEpocaRegistrada(versionada),
      );
    }
  }

  // ── El cruce contra el Corpus ──────────────────────────────────────────────

  const sembrados = await sembradosDelCorpus(rutas);
  const descartes = descartesPorCandidato(await leerDescartesDeCandidatos(rutas));
  const cruzadas = listas.map((lista) => ({
    lista,
    cruce: cruzarEpoca(lista, sembrados, descartes),
    actualizada: !sinActualizar.some((s) => s.id === lista.id),
  }));

  // ── Y solo entonces se escribe, si se pidió ────────────────────────────────

  let registro: string | undefined;
  if (argumentos.includes('--registrar')) {
    try {
      if (recuperadas.length > 0) {
        registro = await registrarCandidatosPorEpoca(rutas, recuperadas);
      }
    } catch (fallo) {
      // Los fallos del registro son de forma del fichero, no del programa: se cuentan con su
      // mensaje y no con una traza, como en los otros tres registros del Corpus.
      process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
      return 1;
    }
  }

  if (quiereJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          epocas: cruzadas.map(({ lista, cruce, actualizada }) => ({
            ...huecoDeEpoca(cruce.epoca),
            categoria: lista.categoria,
            recuperada: lista.recuperada,
            actualizada,
            candidatos: cruce.candidatos,
          })),
          ...(sinActualizar.length > 0 ? { sinActualizar } : {}),
          ...(registro === undefined ? {} : { registro }),
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  const lineas = [
    'Cobertura por época',
    '═══════════════════',
    '',
    'La lista sale de las categorías de Wikisource-es y se regenera; no se escribe a mano.',
    'DP-Autores-100 es la clasificación de la Fuente para los muertos hace más de cien años:',
    'es señal y no permiso — admitir sigue siendo del editor, y la puerta no se mueve.',
  ];

  for (const { lista, cruce, actualizada } of cruzadas) {
    lineas.push(...lineasDeEpoca(lista, cruce, actualizada, hoy));
  }

  if (sinActualizar.length > 0) {
    lineas.push(
      '',
      'No se pudo actualizar desde la Fuente:',
      ...sinActualizar.map((s) => `  ${s.id}: ${s.motivo}`),
      'Se ha trabajado con la lista versionada. El bucle no se detiene por esto.',
    );
  }

  lineas.push(
    '',
    registro === undefined
      ? argumentos.includes('--registrar')
        ? 'No se ha escrito nada: ninguna época se pudo recuperar de la Fuente.'
        : 'Consulta: no se ha escrito nada. Para versionar la lista: npm run epocas:registrar'
      : `Registrado en ${registro}`,
    'Un candidato que no dé Citas se descarta CON SU MOTIVO, que es distinto de saltárselo:',
    '  npx tsx tools/epocas.ts --descartar <slug> --motivo "por qué no da Citas"',
  );

  process.stdout.write(`${lineas.join('\n')}\n`);
  return 0;
}

/**
 * Anota un descarte. No sale a la red y no admite motivo vacío.
 *
 * El slug se comprueba **contra la lista versionada**: un descarte de quien no es candidato
 * de ninguna época es casi siempre una errata, y una errata aquí no descarta a nadie y sí
 * deja el registro con una entrada que no cuenta para ninguna cuenta.
 */
async function descartar(
  rutas: Rutas,
  slug: string,
  argumentos: string[],
  versionadas: readonly EpocaRegistrada[],
  ahora: Date,
  quiereJson: boolean,
): Promise<number> {
  const motivo = opcion(argumentos, '--motivo');
  if (motivo === undefined || motivo.trim() === '') {
    process.stderr.write(
      `${[
        'Un descarte sin motivo no se registra.',
        'Sin motivo escrito es indistinguible de un candidato saltado, y saltarse a uno es',
        'como una época se da por terminada por cansancio en vez de por la cuenta.',
        '',
        `  npx tsx tools/epocas.ts --descartar ${slug} --motivo "por qué no da Citas"`,
      ].join('\n')}\n`,
    );
    return 1;
  }

  const enEpoca = versionadas.find((epoca) =>
    (epoca.candidatos ?? []).some((candidato) => candidato.slug === slug),
  );
  if (enEpoca === undefined) {
    process.stderr.write(
      `${[
        `«${slug}» no es candidato de ninguna época versionada, así que no se ha escrito nada.`,
        'Se descarta lo que la Fuente propone; para saber qué propone: npm run epocas',
        versionadas.length === 0
          ? 'Todavía no hay ninguna lista versionada: npm run epocas:registrar'
          : `Épocas versionadas: ${versionadas.map((e) => e.id).join(', ')}.`,
      ].join('\n')}\n`,
    );
    return 1;
  }

  const candidato = (enEpoca.candidatos ?? []).find((c) => c.slug === slug);
  const descarte: DescarteRegistrado = {
    fecha: fechaLocal(ahora),
    epoca: enEpoca.id,
    candidato: slug,
    /*
     * Y su identificador de página, que es la clave que sobrevive a un renombrado en la
     * Fuente. Sin él, el día que Wikisource mueva «Autor:Apolodoro de Atenas» a
     * «Autor:Apolodoro» el slug cambia, el descarte deja de casar y el candidato se vuelve a
     * proponer — el bucle que este registro existe para cortar.
     */
    ...(typeof candidato?.idDePagina === 'number' ? { idDePagina: candidato.idDePagina } : {}),
    ...(candidato?.nombre === undefined ? {} : { nombre: candidato.nombre }),
    motivo,
  };

  let ruta: string;
  try {
    ruta = await registrarDescarteDeCandidato(rutas, descarte);
  } catch (fallo) {
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ descarte, registro: ruta }, null, 2)}\n`
      : `${[
          `Descartado ${candidato?.nombre ?? slug} de ${enEpoca.nombre ?? enEpoca.id}.`,
          `Motivo: ${motivo}`,
          `Registrado en ${ruta}`,
          'Deja de contar como pendiente, y no se vuelve a proponer. Si algún día aparece obra',
          'suya con sentencia suelta, se siembra: el cruce cuenta como sembrado a quien está',
          'en el Corpus, mire lo que mire este registro.',
        ].join('\n')}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
