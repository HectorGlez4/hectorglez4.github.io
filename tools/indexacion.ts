/**
 * El estado de indexación, por familia y versionado — Historia 16.1, Épica 16.
 *
 *   npx tsx tools/indexacion.ts [--corpus corpus] [--presupuesto 2000] [--json]
 *   npx tsx tools/indexacion.ts --registrar
 *
 * Sin banderas, **consulta**: pregunta a la fuente, agrega por familia, informa y no
 * escribe nada. Con `--registrar`, además anota la entrada de hoy en
 * `corpus/serie-de-indexacion.yml`. Es la misma separación que estrenó
 * `tools/objetivo.ts`, y aquí importa por un motivo distinto: la serie es idempotente por
 * fecha, así que registrar una consulta de tanteo **reemplazaría** la lectura buena del
 * día en vez de añadirse a ella.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────────────
 *
 * El buscador ha indexado 8 URL de 1.715 y ha descartado 1.534. Por qué las descarta solo
 * se contesta comparando el reparto **por familia** a lo largo del tiempo, y esa cifra se
 * leía a ojo en un panel que no deja serie y que mezcla las páginas de una frase con las
 * de agregación. Esto es el instrumento de la épica: sin él, ni la 16.2 ni la 16.3 pueden
 * decir si funcionaron.
 *
 * ── Por qué es una orden y no un paso del build ──────────────────────────────────────
 *
 * AD-22: la red vive solo aquí, en la cáscara. `tools/lib/` es puro sobre datos ya
 * recuperados y ningún paso del build descarga nada. Y AD-24: **ningún módulo de
 * `src/lib/` recibe el estado de indexación, ni por parámetro**. Si entrara, `dist/`
 * pasaría a ser función de lo que el buscador opinó ayer y dos construcciones del mismo
 * commit dejarían de dar el mismo sitio.
 *
 * Tampoco la commitea ningún paso de CI. La vía automática obvia —que CI lea y commitee—
 * dispara el flujo por `push` y con él el aviso de la 16.2, anunciando una jornada en la
 * que no cambió un byte.
 *
 * ── El presupuesto es el eje del diseño ──────────────────────────────────────────────
 *
 * La fuente no expone informe de cobertura: es una URL por petición, 2.000 al día y 600
 * por minuto. Con 1.716 URL hoy cabe una pasada y no dos. Quien decide qué inspeccionar es
 * `tools/lib/indexacion.ts`, que es puro y se prueba sin red; aquí solo se pide y se pinta.
 */

import { DOMINIO } from '../src/lib/dominio.ts';
import {
  coleccionesPublicadas,
  type Cita,
  type Coleccion,
  type ConjuntoPublicable,
} from '../src/lib/publicado.ts';
import {
  MOTIVOS_SIN_CREDENCIALES,
  PETICIONES_POR_MINUTO,
  SALIDA_SIN_CREDENCIALES,
  TECHO_DIARIO_DE_INSPECCIONES,
  VARIABLE_DE_CREDENCIALES,
  censoPorFamilia,
  componerLectura,
  credencialDe,
  inspeccionDe,
  lineasDeLectura,
  motivoDeFallo,
  peticionDeInspeccion,
  planDeInspeccion,
  propiedadDeDominio,
  resumirFamilia,
  type Credencial,
  type Familia,
  type FamiliaSinLeer,
  type Inspeccion,
  type LecturaDeFamilia,
  type LecturaDeIndexacion,
  type PlanDeInspeccion,
} from './lib/indexacion.ts';
import {
  leerAutores,
  leerCitas,
  leerColecciones,
  leerTemas,
  registrarLecturaDeIndexacion,
  rutasDelCorpus,
  type Rutas,
} from './lib/corpus.ts';
import { motivosDeArgumentosNoReconocidos, opcion, raizDeCorpusDe } from './lib/cli.ts';

const USO = [
  'El estado de indexación por familia — Historia 16.1.',
  '',
  '  npx tsx tools/indexacion.ts [--corpus corpus] [--presupuesto <n>] [--json]',
  '      Consulta el estado, lo agrega por familia y lo informa. No escribe nada.',
  '',
  '  npx tsx tools/indexacion.ts --registrar',
  '      Anota además la entrada de hoy en corpus/serie-de-indexacion.yml, reemplazando',
  '      la que ya hubiera de la misma jornada: esto mide un estado, no una sesión.',
  '',
  `Opciones: --corpus <ruta>, --presupuesto <n> (por omisión ${TECHO_DIARIO_DE_INSPECCIONES},`,
  '          que es el techo diario de la propiedad), --json, --registrar, --ayuda',
].join('\n');

/**
 * El paso entre peticiones, derivado del techo por minuto de la propiedad.
 *
 * Se pide **de una en una y espaciadas**, no en paralelo. Pasarse del techo devuelve 429
 * para el resto de la jornada, y entonces no hay lectura ninguna.
 *
 * **En la práctica este paso no lo nota nadie**, y conviene saber por qué: ver
 * `SEGUNDOS_POR_INSPECCION`.
 */
export const PASO_MS = Math.ceil(60_000 / PETICIONES_POR_MINUTO);

/**
 * Lo que tarda **de verdad** una inspección, medido contra la propiedad el 4/09/2026.
 *
 * No es una estimación: la primera lectura real dio 6,6 s, 8,0 s y 16,3 s en tres URL
 * seguidas, y la obtención del token 25 s. Está aquí porque **corrige el supuesto sobre el
 * que se diseñó esta historia**: se escribió que el techo era la cuota —2.000 peticiones
 * al día, y las ~1.714 URL cabían al 86 %— y es falso. A este ritmo, recorrerlas todas son
 * entre tres y siete horas de reloj.
 *
 * La consecuencia no es un número: **el muestreo deja de ser la previsión para cuando el
 * Corpus crezca y pasa a ser el único modo posible desde el primer día.** Una pasada
 * completa no es «cara», es impracticable.
 */
export const SEGUNDOS_POR_INSPECCION = 10;

/**
 * Reintentos por URL ante un fallo transitorio.
 *
 * Existen porque la primera lectura real cayó cuatro veces con `read ETIMEDOUT` tras lograr
 * entre una y cinco inspecciones. Lo que parecía un corte de red no lo era: la API tarda
 * segundos por URL y el cliente se cansaba antes. Se reintenta lo transitorio; un permiso
 * denegado o una cuota agotada no, porque reintentarlos no cambia la respuesta y gasta el
 * presupuesto que la familia siguiente necesita.
 */
export const REINTENTOS = 3;

/** Espera base entre reintentos; crece con el número de intento. */
export const ESPERA_DE_REINTENTO_MS = 2_000;

/** Aviso cuando lo pedido va a tardar más de lo que nadie espera de una orden. */
export const MINUTOS_ANTES_DE_AVISAR = 5;

const dormir = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

/** Preguntar por una URL. Es **el único punto por el que entra la red** en esta historia. */
export type Inspeccionar = (ruta: string) => Promise<Inspeccion>;

/**
 * La clave en línea, analizada **sin que su contenido salga en ningún mensaje**.
 *
 * `JSON.parse` cita un trozo del texto cuando falla —«Expected ',' … at position 42»— y ese
 * texto es la clave privada de la cuenta de servicio. Esta salida acaba en la terminal y
 * puede acabar en el registro de una ejecución, así que se nombra la variable y nunca lo que
 * lleva dentro, igual que hace `tools/lib/ingresos.ts` con la dirección del receptor.
 */
function credencialesEnLinea(contenido: string): Record<string, unknown> {
  try {
    return JSON.parse(contenido) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${VARIABLE_DE_CREDENCIALES} empieza por «{» pero no es un JSON válido. No es una ` +
        'avería de la lectura: es el valor de la variable, y se corrige donde esté guardada. ' +
        'Su contenido no se repite aquí a propósito — lleva dentro la clave privada de la ' +
        'cuenta de servicio.',
    );
  }
}

/**
 * El cliente de verdad, importado aquí dentro para que `--ayuda` no cargue el SDK entero.
 *
 * `googleapis` entra como dependencia de **desarrollo**: el sitio no la importa, `tools/`
 * corre por `tsx` y nada de `src/` la toca. En producción cambiaría lo que se instala para
 * construir el sitio, que es justo lo que este proyecto vigila.
 */
export async function inspectorDeSearchConsole(credencial: Credencial): Promise<Inspeccionar> {
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    ...(credencial.clase === 'json'
      ? { credentials: credencialesEnLinea(credencial.contenido) }
      : { keyFile: credencial.ruta }),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  return async function inspeccionar(ruta: string): Promise<Inspeccion> {
    /*
     * Componer la petición y leer el veredicto son de `tools/lib/indexacion.ts`, no de aquí.
     * Es lo único de este fichero que puede equivocarse en silencio —una barra final de
     * menos, la propiedad mal nombrada, el veredicto leído de otro sub-objeto devuelven
     * «no indexada» para todo—, y ahí sí lo miran las pruebas. Lo que queda aquí es la
     * llamada, que es lo que no se puede probar sin la red.
     */
    const respuesta = await searchconsole.urlInspection.index.inspect({
      requestBody: peticionDeInspeccion(DOMINIO, ruta),
    });
    return inspeccionDe(ruta, respuesta.data);
  };
}

/**
 * El conjunto publicable leído del corpus, del mismo dueño que lo publica (AD-11).
 *
 * Los `as unknown as` son los mismos que usan `tools/huecos.ts` y `tools/objetivo.ts`: lo
 * que sale del disco es la forma admisible del corpus y lo que consume el dueño del
 * conjunto publicable es la forma plana, y las dos coinciden en los campos que aquí se
 * miran. Lo que **no** se hace es reimplementar ningún umbral: quién se publica lo decide
 * `src/lib/publicado.ts` y nadie más.
 */
export async function conjuntoDelCorpus(rutas: Rutas): Promise<ConjuntoPublicable> {
  const citas = (await leerCitas(rutas.citas)) as unknown as Cita[];
  return {
    citas,
    autores: (await leerAutores(rutas)) as unknown as ConjuntoPublicable['autores'],
    temas: await leerTemas(rutas),
    colecciones: coleccionesPublicadas(
      (await leerColecciones(rutas)) as unknown as Coleccion[],
      citas,
    ),
  };
}

/**
 * La lectura entera: plan, peticiones y agregación. **No escribe nada.**
 *
 * Recibe con qué preguntar en vez de fabricarlo, que es lo que deja recorrer la matriz de
 * la historia —lectura completa, muestreo, fallo parcial— sin salir a ninguna parte. La
 * red sigue viviendo solo en la cáscara: quien construye el inspector de verdad es
 * `inspectorDeSearchConsole`, unas líneas más arriba.
 */
export async function leerIndexacion(opciones: {
  conjunto: ConjuntoPublicable;
  propiedad: string;
  presupuesto: number;
  inspeccionar: Inspeccionar;
  /**
   * El instante de la lectura, **sellado antes de la primera petición**.
   *
   * Con 100 ms de paso y ~1.716 URL una pasada dura decenas de minutos, así que fechar la
   * entrada al escribirla la archivaba en la jornada en la que **terminó**. Una lectura
   * empezada a las 23:40 se guardaba como de mañana y, por ser la serie idempotente por
   * fecha, reemplazaba la entrada de mañana antes de que existiera.
   */
  momento?: Date;
  /** El espaciado entre peticiones. Las pruebas lo ponen a cero; nadie más lo toca. */
  pasoMs?: number;
  /**
   * Por dónde sale el aviso de duración. Opcional a propósito: quien no lo pase no recibe
   * aviso y todo lo demás funciona igual, que es lo que deja a las pruebas mudas sin
   * tener que silenciar nada.
   */
  escribir?: (linea: string) => void;
}): Promise<{ lectura: LecturaDeIndexacion; plan: PlanDeInspeccion }> {
  const momento = opciones.momento ?? new Date();
  const censo = censoPorFamilia(opciones.conjunto);
  const plan = planDeInspeccion(censo, opciones.presupuesto);
  const pasoMs = opciones.pasoMs ?? PASO_MS;

  /*
   * **Se avisa antes de empezar, no después.** Una inspección tarda del orden de
   * `SEGUNDOS_POR_INSPECCION`, así que un presupuesto grande deja la terminal muda durante
   * horas y quien la mira no sabe si avanza o se colgó. El aviso no impide nada —el
   * presupuesto ya lo aceptó quien lo escribió— pero convierte una espera inexplicable en
   * una espera anunciada. Sin esto, la primera lectura real pareció un cuelgue y no lo era.
   */
  const minutos = Math.round((plan.inspecciones * SEGUNDOS_POR_INSPECCION) / 60);
  if (minutos >= MINUTOS_ANTES_DE_AVISAR) {
    opciones.escribir?.(
      `Aviso: ${plan.inspecciones} inspecciones a ~${SEGUNDOS_POR_INSPECCION} s cada una ` +
        `son unos ${minutos} min. La API es lenta; no se ha colgado.`,
    );
  }

  const lecturas: Partial<Record<Familia, LecturaDeFamilia>> = {};
  const sinLeer: FamiliaSinLeer[] = [];

  /*
   * El presupuesto que no llega a una familia no es un fallo de la fuente, pero tampoco es
   * una lectura: se declara como familia sin leer, con su motivo, para que la entrada no la
   * deje caer en silencio.
   */
  for (const familia of plan.sinPresupuesto) {
    sinLeer.push({
      familia,
      motivo:
        `el presupuesto de ${plan.presupuesto} peticiones no alcanzó a esta familia ` +
        `(${censo[familia].length} URL publicadas)`,
    });
  }

  for (const deFamilia of plan.familias) {
    const inspecciones: Inspeccion[] = [];
    let fallo: string | undefined;

    for (const ruta of deFamilia.rutas) {
      const comienzo = Date.now();
      /*
       * **Se reintenta lo transitorio, no lo definitivo.** La primera lectura real contra
       * Search Console —4/09/2026— cayó cuatro veces seguidas con `read ETIMEDOUT` tras
       * lograr entre una y cinco inspecciones: las peticiones funcionan y la conexión se
       * cansa. Sin reintento, una familia entera se tira por un corte de segundos, y con
       * el techo diario de 2.000 peticiones tirar una pasada cuesta un día.
       *
       * Un permiso denegado o una cuota agotada NO se reintentan: reintentarlos no cambia
       * la respuesta y sí gasta el presupuesto que a la familia siguiente le hace falta.
       */
      let intento = 0;
      for (;;) {
        try {
          inspecciones.push(await opciones.inspeccionar(ruta));
          break;
        } catch (error) {
          // Normalizado y acotado, nunca el mensaje crudo: esto se versiona para siempre.
          const motivo = motivoDeFallo(error);
          const reintentable = !motivo.startsWith('permiso') && !motivo.startsWith('cuota');
          if (!reintentable || intento >= REINTENTOS) {
            fallo = motivo;
            break;
          }
          intento += 1;
          await dormir(ESPERA_DE_REINTENTO_MS * intento);
        }
      }
      if (fallo !== undefined) break;
      const espera = pasoMs - (Date.now() - comienzo);
      if (espera > 0) await dormir(espera);
    }

    if (fallo !== undefined) {
      /*
       * **La familia entera se omite, aunque se hayan leído casi todas.** No es rigidez: la
       * muestra se compone equiespaciada sobre la lista ordenada, así que una lectura
       * truncada a la mitad es la mitad alfabéticamente anterior del sitio, no una muestra
       * de él. Escribirla como si lo fuera daría dos jornadas que parecen comparables y no
       * lo son, que es exactamente el daño que esta serie existe para evitar.
       */
      sinLeer.push({
        familia: deFamilia.familia,
        motivo:
          `lectura interrumpida tras ${inspecciones.length} de ${deFamilia.rutas.length}: ${fallo}`,
      });
      continue;
    }

    lecturas[deFamilia.familia] = resumirFamilia(deFamilia.publicadas, inspecciones);
  }

  return {
    lectura: componerLectura({
      momento,
      propiedad: opciones.propiedad,
      censo,
      lecturas,
      sinLeer,
    }),
    plan,
  };
}

/**
 * La orden. Devuelve el código de salida en vez de terminar el proceso, como
 * `tools/avisar.ts`: es lo que permite que las pruebas la recorran entera.
 *
 * `hacerInspector` tiene valor por omisión y es el **único** parámetro que existe por las
 * pruebas. Está aquí y no dentro porque la red es exactamente lo que AD-22 manda dejar en
 * un solo sitio, y un solo sitio es también un solo sitio por el que sustituirla.
 */
export async function principal(
  argumentos: string[],
  hacerInspector: (credencial: Credencial) => Promise<Inspeccionar> = inspectorDeSearchConsole,
  entorno: Record<string, string | undefined> = process.env,
): Promise<number> {
  const sobrantes = motivosDeArgumentosNoReconocidos(argumentos, {
    solas: ['--json', '--registrar', '--ayuda'],
    conValor: ['--corpus', '--presupuesto'],
  });
  if (sobrantes.length > 0) {
    process.stderr.write(`${[...sobrantes, '', USO].join('\n')}\n`);
    return 1;
  }

  if (argumentos.includes('--ayuda')) {
    process.stdout.write(`${USO}\n`);
    return 0;
  }

  const quiereJson = argumentos.includes('--json');
  const registra = argumentos.includes('--registrar');

  let presupuesto = TECHO_DIARIO_DE_INSPECCIONES;
  const presupuestoDado = opcion(argumentos, '--presupuesto');
  if (presupuestoDado !== undefined) {
    const leido = Number(presupuestoDado);
    /*
     * Un presupuesto que no es un entero positivo no es «lo mismo pero por omisión»: con
     * `Number('mil')` daría `NaN`, el plan saldría vacío y la entrada diría que no se leyó
     * ninguna familia — un fallo con cara de lectura.
     */
    if (!Number.isInteger(leido) || leido <= 0) {
      process.stderr.write(
        `${[
          `«${presupuestoDado}» no es un número de peticiones: se espera un entero positivo.`,
          `El techo diario de la propiedad es ${TECHO_DIARIO_DE_INSPECCIONES}.`,
        ].join('\n')}\n`,
      );
      return 1;
    }
    /*
     * Por encima del techo diario se rechaza en vez de intentarlo. Pedir más peticiones de
     * las que la propiedad concede no lee más: lee hasta agotar la cuota y deja el resto de
     * las familias con un 429 a media pasada — una entrada peor que la que habría salido
     * pidiendo lo que cabe, y con la cuota del día ya gastada para el segundo intento.
     */
    if (leido > TECHO_DIARIO_DE_INSPECCIONES) {
      process.stderr.write(
        `${[
          `${leido} peticiones pasan del techo diario de la propiedad, que es ` +
            `${TECHO_DIARIO_DE_INSPECCIONES}.`,
          'Pedir de más no lee más: agota la cuota a media pasada y deja las familias que',
          'quedaban sin leer, con el día ya gastado para volver a intentarlo.',
        ].join('\n')}\n`,
      );
      return 1;
    }
    presupuesto = leido;
  }

  const propiedad = propiedadDeDominio(DOMINIO);

  /*
   * La credencial se mira **antes** de leer el corpus y antes de escribir nada. Sin ella no
   * hay a quién preguntar, y publicar un número cuando la fuente no está disponible sería
   * peor que no publicarlo.
   */
  const credencial = credencialDe(entorno);
  if (credencial === undefined) {
    process.stderr.write(`${MOTIVOS_SIN_CREDENCIALES.join('\n')}\n`);
    return SALIDA_SIN_CREDENCIALES;
  }

  const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
  const conjunto = await conjuntoDelCorpus(rutas);

  let inspeccionar: Inspeccionar;
  try {
    inspeccionar = await hacerInspector(credencial);
  } catch (fallo) {
    // Una credencial mal formada se cuenta con su mensaje y sin traza: la traza de este
    // fallo llevaría dentro el valor de la variable.
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  const { lectura, plan } = await leerIndexacion({
    conjunto,
    propiedad,
    presupuesto,
    inspeccionar,
    // El aviso va por el error estándar: no ensucia el `--json`, que es contrato.
    escribir: (linea) => process.stderr.write(`${linea}\n`),
  });

  if (!registra) {
    process.stdout.write(
      quiereJson
        ? `${JSON.stringify({ lectura, plan }, null, 2)}\n`
        : `${[
            ...lineasDeLectura(lectura),
            '',
            'Consulta: no se ha escrito nada.',
            'Para anotar la entrada de hoy en la serie: npx tsx tools/indexacion.ts --registrar',
          ].join('\n')}\n`,
    );
    return 0;
  }

  let ruta: string;
  try {
    ruta = await registrarLecturaDeIndexacion(rutas, lectura);
  } catch (fallo) {
    // Los fallos del registro son de forma del fichero, no del programa, igual que en el
    // registro de sesiones: se cuentan con su mensaje y no con una traza.
    process.stderr.write(`${fallo instanceof Error ? fallo.message : String(fallo)}\n`);
    return 1;
  }

  process.stdout.write(
    quiereJson
      ? `${JSON.stringify({ lectura, plan, registro: ruta }, null, 2)}\n`
      : `${[
          ...lineasDeLectura(lectura),
          '',
          `Registrado en ${ruta}`,
          'La entrada reemplaza a la de hoy si ya había una: esto mide un estado, no una sesión.',
        ].join('\n')}\n`,
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await principal(process.argv.slice(2));
}
