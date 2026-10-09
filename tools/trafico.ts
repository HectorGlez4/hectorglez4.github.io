/**
 * El tráfico orgánico por mes y familia, versionado — Historia 20.2, Épica 20.
 *
 *   npx tsx tools/trafico.ts [--corpus corpus] [--meses 16] [--json]
 *   npx tsx tools/trafico.ts --registrar
 *
 * Hermana de `tools/indexacion.ts`, con la misma separación: sin banderas **consulta** —lee,
 * agrega e informa, y no escribe nada—; con `--registrar` anota además los meses leídos en
 * `corpus/serie-de-trafico.yml`, reemplazando la entrada que ya hubiera de cada mes.
 *
 * Es la cáscara (AD-22): la red solo entra aquí, por `clienteDeSearchAnalytics`, y llega a
 * `principal` como parámetro para que las pruebas la sustituyan por respuestas fijas. Qué se
 * pide y cómo se agrega es de `tools/lib/trafico.ts`, que es puro. Y ningún módulo de
 * `src/lib/` recibe la serie (AD-24).
 *
 * El orden de los pasos de `principal`, que es parte del contrato:
 *
 *   1. la forma de la invocación —banderas desconocidas, `--meses`— (código 2);
 *   2. `--ayuda`;
 *   3. la credencial, antes de leer el corpus y antes de escribir nada (código 2);
 *   4. el corpus, del que sale el censo por familia, y la serie ya registrada (código 1 si
 *      no se pueden leer);
 *   5. el cliente (una credencial mal formada es código 1);
 *   6. la lectura, mes a mes: total sin dimensiones y luego por página, paginando (código 1
 *      si revienta);
 *   7. si no se leyó ningún mes, código 1 y nada escrito;
 *   8. consulta: se informa y se sale con 0; registro: se escribe y se informa.
 */

import { DOMINIO } from '../src/lib/dominio.ts';
import type { ConjuntoPublicable } from '../src/lib/publicado.ts';
import {
  SALIDA_SIN_CREDENCIALES,
  VARIABLE_DE_CREDENCIALES,
  censoPorFamilia,
  credencialDe,
  motivoDeFallo,
  propiedadDeDominio,
  type Credencial,
  type FamiliaSinLeer,
} from './lib/indexacion.ts';
import {
  FILAS_POR_PAGINA,
  MESES_QUE_CONSERVA_LA_FUENTE,
  MOTIVOS_SIN_CREDENCIALES_DE_TRAFICO,
  MOTIVO_SIN_DATOS_DEFINITIVOS,
  PAGINAS_MAXIMAS_POR_MES,
  agregarPorFamilia,
  componerLecturaDeTrafico,
  familiasPublicadas,
  jornadaLocal,
  lineasDeTrafico,
  mesesALeer,
  metricasDeTotal,
  peticionDeTotal,
  peticionPorPagina,
  type FilaDeTrafico,
  type LecturaDeMes,
  type LecturaDeTrafico,
  type MesSinLeer,
  type PeticionDeTrafico,
} from './lib/trafico.ts';
import {
  leerSerieDeTrafico,
  registrarLecturaDeTrafico,
  rutasDelCorpus,
} from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe } from './lib/cli.ts';
import { conjuntoDelCorpus } from './indexacion.ts';

const USO = [
  'El tráfico orgánico por mes y familia — Historia 20.2.',
  '',
  '  npx tsx tools/trafico.ts [--corpus corpus] [--meses <n>] [--json]',
  '      Lee de Search Console clics, impresiones, CTR y posición por mes, en total y por',
  '      familia, y lo informa. No escribe nada.',
  '',
  '  npx tsx tools/trafico.ts --registrar',
  '      Anota además los meses leídos en corpus/serie-de-trafico.yml, reemplazando la',
  '      entrada que ya hubiera de cada mes.',
  '',
  `Opciones: --corpus <ruta>, --meses <n> (1–${MESES_QUE_CONSERVA_LA_FUENTE}; por omisión ` +
    `${MESES_QUE_CONSERVA_LA_FUENTE},`,
  '          incluido el mes en curso), --json, --registrar, --ayuda',
].join('\n');

/** Una petición a Search Analytics. **El único punto por el que entra la red** aquí. */
export type Consultar = (peticion: PeticionDeTrafico) => Promise<FilaDeTrafico[]>;

/**
 * El cliente de verdad, con el mismo alcance y la misma forma de autenticarse que la
 * indexación. El SDK se importa aquí dentro para que `--ayuda` no lo cargue.
 */
export async function clienteDeSearchAnalytics(
  credencial: Credencial,
  propiedad: string,
): Promise<Consultar> {
  const { google } = await import('googleapis');
  let credenciales: Record<string, unknown> | undefined;
  if (credencial.clase === 'json') {
    try {
      credenciales = JSON.parse(credencial.contenido) as Record<string, unknown>;
    } catch {
      // Se nombra la variable y nunca su contenido: lleva dentro la clave privada.
      throw new Error(
        `${VARIABLE_DE_CREDENCIALES} empieza por «{» pero no es un JSON válido. Su contenido ` +
          'no se repite aquí a propósito — lleva dentro la clave privada de la cuenta de servicio.',
      );
    }
  }
  const auth = new google.auth.GoogleAuth({
    ...(credenciales !== undefined
      ? { credentials: credenciales }
      : { keyFile: (credencial as { ruta: string }).ruta }),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  return async function consultar(peticion: PeticionDeTrafico): Promise<FilaDeTrafico[]> {
    const respuesta = await searchconsole.searchanalytics.query({
      siteUrl: propiedad,
      requestBody: peticion,
    });
    return respuesta.data.rows ?? [];
  };
}

/**
 * Todas las filas por página de un rango —un mes aquí, una ventana en la demanda (20.3)—,
 * pidiendo hasta recibir menos de `rowLimit`.
 */
export async function filasPorPagina(
  consultar: Consultar,
  rango: Parameters<typeof peticionPorPagina>[0],
): Promise<FilaDeTrafico[]> {
  const filas: FilaDeTrafico[] = [];
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS_POR_MES; pagina += 1) {
    const recibidas = await consultar(peticionPorPagina(rango, pagina * FILAS_POR_PAGINA));
    filas.push(...recibidas);
    if (recibidas.length < FILAS_POR_PAGINA) return filas;
  }
  throw new Error(
    `la consulta por página no acabó tras ${PAGINAS_MAXIMAS_POR_MES} páginas de ${FILAS_POR_PAGINA} filas`,
  );
}

/**
 * La lectura entera: meses, peticiones y agregación. **No escribe nada.**
 *
 * Un mes se da por leído si su total se leyó **con filas**. Si el total falla, o llega sin
 * filas —la fuente aún no tiene datos definitivos—, el mes entero va a `sinLeer` y no se
 * escribe. Si el total se lee y la consulta por página no:
 *
 *   · si la serie ya tiene una entrada de ese mes con familias, el mes se trata como sin
 *     leer, para que la entrada buena no se machaque con una peor;
 *   · si no, se escribe con su total y las familias publicadas en `sinLeer`, con el motivo.
 */
export async function leerTrafico(opciones: {
  conjunto: ConjuntoPublicable;
  propiedad: string;
  /** El host canónico: una página de otro host va fuera del censo. */
  dominio: string;
  meses: number;
  consultar: Consultar;
  /** Los meses que la serie ya tiene registrados **con** familias. */
  conFamiliasPrevias?: ReadonlySet<string>;
  /** El instante de la lectura. Por omisión, ahora. */
  momento?: Date;
}): Promise<LecturaDeTrafico> {
  const momento = opciones.momento ?? new Date();
  const censo = censoPorFamilia(opciones.conjunto);
  const leidos: LecturaDeMes[] = [];
  const sinLeer: MesSinLeer[] = [];

  for (const mes of mesesALeer(momento, opciones.meses)) {
    let total;
    try {
      total = metricasDeTotal(await opciones.consultar(peticionDeTotal(mes)));
    } catch (error) {
      sinLeer.push({ mes: mes.mes, motivo: motivoDeFallo(error) });
      continue;
    }
    if (total === undefined) {
      sinLeer.push({ mes: mes.mes, motivo: MOTIVO_SIN_DATOS_DEFINITIVOS });
      continue;
    }

    let porPagina: ReturnType<typeof agregarPorFamilia> | undefined;
    const familiasSinLeer: FamiliaSinLeer[] = [];
    try {
      porPagina = agregarPorFamilia(
        await filasPorPagina(opciones.consultar, mes),
        censo,
        opciones.dominio,
      );
    } catch (error) {
      const motivo = motivoDeFallo(error);
      if (opciones.conFamiliasPrevias?.has(mes.mes)) {
        sinLeer.push({
          mes: mes.mes,
          motivo:
            `la consulta por página falló (${motivo}) y la serie ya tiene las familias de ` +
            'este mes: se conserva la entrada anterior',
        });
        continue;
      }
      for (const familia of familiasPublicadas(censo)) familiasSinLeer.push({ familia, motivo });
    }

    leidos.push(
      componerLecturaDeTrafico({
        mes,
        momento,
        propiedad: opciones.propiedad,
        censo,
        total,
        porPagina,
        sinLeer: familiasSinLeer,
      }),
    );
  }

  return { propiedad: opciones.propiedad, leidoEl: jornadaLocal(momento), meses: leidos, sinLeer };
}

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, para que las
 * pruebas la recorran entera. `hacerConsulta` existe solo para sustituir la red.
 */
export async function principal(
  argumentos: string[],
  hacerConsulta: (credencial: Credencial, propiedad: string) => Promise<Consultar> =
    clienteDeSearchAnalytics,
  entorno: Record<string, string | undefined> = process.env,
  momento: Date = new Date(),
): Promise<number> {
  // 1 — la forma de la invocación. Aquí es código 2: es la forma, no lo que dice.
  const sobrantes = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: ['--json', '--registrar', '--ayuda'],
    conValor: ['--corpus', '--meses'],
  });
  if (sobrantes.length > 0) {
    process.stderr.write(`${[...sobrantes, '', USO].join('\n')}\n`);
    return 2;
  }

  let meses = MESES_QUE_CONSERVA_LA_FUENTE;
  const mesesDados = opcion(argumentos, '--meses');
  if (mesesDados !== undefined) {
    const leido = Number(mesesDados);
    if (
      !/^\d+$/.test(mesesDados) ||
      !Number.isInteger(leido) ||
      leido < 1 ||
      leido > MESES_QUE_CONSERVA_LA_FUENTE
    ) {
      process.stderr.write(
        `${[
          `«${mesesDados}» no es un número de meses: se espera un entero de 1 a ` +
            `${MESES_QUE_CONSERVA_LA_FUENTE}, que son los que conserva la fuente.`,
          '',
          USO,
        ].join('\n')}\n`,
      );
      return 2;
    }
    meses = leido;
  }

  // 2 — la ayuda.
  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  const quiereJson = argumentos.includes('--json');
  const registra = argumentos.includes('--registrar');
  const propiedad = propiedadDeDominio(DOMINIO);

  // 3 — la credencial, antes de leer el corpus y antes de escribir nada.
  const credencial = credencialDe(entorno);
  if (credencial === undefined) {
    process.stderr.write(`${MOTIVOS_SIN_CREDENCIALES_DE_TRAFICO.join('\n')}\n`);
    return SALIDA_SIN_CREDENCIALES;
  }

  // 4 — el corpus y la serie ya registrada.
  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  let conjunto: ConjuntoPublicable;
  let conFamiliasPrevias: Set<string>;
  try {
    conjunto = await conjuntoDelCorpus(rutas);
    conFamiliasPrevias = new Set(
      (await leerSerieDeTrafico(rutas))
        .filter((e) => Object.keys(e.familias ?? {}).length > 0)
        .map((e) => e.mes),
    );
  } catch (fallo) {
    process.stderr.write(
      `No se pudo leer el corpus ni la serie: ${fallo instanceof Error ? fallo.message : String(fallo)}\n` +
        'No se ha escrito nada.\n',
    );
    return 1;
  }

  // 5 — el cliente.
  let consultar: Consultar;
  try {
    consultar = await hacerConsulta(credencial, propiedad);
  } catch (fallo) {
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  // 6 — la lectura.
  let lectura: LecturaDeTrafico;
  try {
    lectura = await leerTrafico({
      conjunto,
      propiedad,
      dominio: DOMINIO,
      meses,
      consultar,
      momento,
      conFamiliasPrevias,
    });
  } catch (fallo) {
    process.stderr.write(
      `La lectura no se pudo componer: ${fallo instanceof Error ? fallo.message : String(fallo)}\n` +
        'No se ha escrito nada.\n',
    );
    return 1;
  }

  // 7 — nada legible: nada escrito.
  if (lectura.meses.length === 0) {
    process.stderr.write(
      `${[
        ...lineasDeTrafico(lectura),
        '',
        'No se pudo leer ningún mes. No se ha escrito nada.',
      ].join('\n')}\n`,
    );
    return 1;
  }

  // 8 — consulta o registro.
  if (!registra) {
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify({ lectura }, null, 2)}\n`
        : `${[
            ...lineasDeTrafico(lectura),
            '',
            'Consulta: no se ha escrito nada.',
            'Para anotar los meses leídos en la serie: npm run trafico:registrar',
          ].join('\n')}\n`,
    );
    return 0;
  }

  let ruta: string;
  try {
    ruta = await registrarLecturaDeTrafico(rutas, lectura);
  } catch (fallo) {
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ lectura, registro: ruta }, null, 2)}\n`
      : `${[
          ...lineasDeTrafico(lectura),
          '',
          `Registrado en ${ruta}`,
          'Cada mes leído reemplaza a su entrada anterior; los meses sin leer conservan la suya.',
        ].join('\n')}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
