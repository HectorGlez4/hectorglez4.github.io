/**
 * Qué le falta al Corpus — FR-25, LC-6.
 *
 *   npx tsx tools/huecos.ts [--corpus corpus] [--json]
 *
 * Se mira antes de elegir a quién se dedica una sesión de sembrado. No nombra Autores:
 * dice qué está vacío, y desde la Historia 11.3 cierra el informe con el objetivo que la
 * política deriva de esos mismos huecos, para que quien ya mira los huecos no tenga que
 * ejecutar dos órdenes. Ese objetivo dice qué hueco cerrar; a quién admitir, nunca.
 *
 * Desde la Historia 12.4 dice también qué Colecciones no llegan a su umbral, y con la misma
 * línea: es la misma pregunta —qué le falta a una agregación para publicarse— y quien la
 * hace la hace en el mismo momento. Lo que **no** se mezcla es el objetivo de la sesión: un
 * hueco de Tema se cierra sembrando Citas nuevas y uno de Colección asignando las que ya
 * están, que es curación y no sembrado.
 *
 * Desde la Historia 19.2 el bloque de tradición son **dos cuentas separadas**: el suelo
 * panhispánico, que se mide sobre todos los Autores menos los de tradición `otra`, y los
 * clásicos —tradición `otra`—, que se cuentan aparte y con meta propia. Estaban en el mismo
 * recuento y eso hacía que admitir a un clásico universal contase como escorarse hacia España.
 * Debajo va el margen que queda bajo el techo de concentración, que dice **dónde cabe** sembrar
 * en profundidad y no a quién sembrar: eso lo prioriza la demanda (FR-49). Sigue sin nombres, y
 * el margen por Autor viaja con su slug solo en `--json`.
 *
 * Los recuentos de Autores del informe **dicen qué cuentan**, porque son tres y no uno: los
 * declarados en el Corpus, los que tienen margen medido —declarados más los que firman— y los
 * de la Meta, que son solo los que firman alguna Cita. Hoy coinciden; divergen en silencio en
 * cuanto una Cita apunte a un Autor no declarado.
 */

import {
  lineasDeClasicos,
  verHuecos,
  type AutorParaHuecos,
  type CitaParaHuecos,
  type ColeccionParaHuecos,
  type EpocaParaHuecos,
} from '../src/lib/huecos.ts';
import { lineaDeHueco, porcentajeEnEspañol } from '../src/lib/formato.ts';
import { lineasDeMeta, objetivoDeMeta, verMeta } from '../src/lib/meta.ts';
import { lineasDeObjetivo, objetivoDeSesion } from '../src/lib/objetivo.ts';
import { temasPublicados, type Cita, type Tema } from '../src/lib/publicado.ts';
import {
  MIN_CITAS_POR_COLECCION,
  MIN_CITAS_POR_TEMA,
  TECHO_CONCENTRACION_POR_AUTOR,
} from '../src/lib/umbrales.ts';
import {
  fechaLocal,
  leerAutores,
  leerCandidatosPorEpoca,
  leerCitas,
  leerColecciones,
  leerDescartesDeCandidatos,
  leerTemas,
  rutasDelCorpus,
} from './lib/corpus.ts';
import { coleccionesParaHuecos } from './lib/curacion.ts';
import {
  diasDesdeLaRecuperacion,
  epocasParaHuecos,
  listaCaducada,
  DIAS_DE_VIGENCIA_DE_LA_LISTA,
} from './lib/epocas.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));
/*
 * La jornada de hoy, y **solo** para decir cuántos días hace que se recuperó la lista de
 * candidatos. Ninguna cuenta del informe depende de ella: el objetivo de la sesión sigue
 * siendo el mismo para el mismo estado, se pregunte cuando se pregunte.
 */
const hoy = fechaLocal(new Date());

const citas = (await leerCitas(rutas.citas)) as unknown as CitaParaHuecos[];
const temas = await leerTemas(rutas);
/*
 * Los Autores se leen **una vez**. `AutorParaHuecos` es la vista recortada con la que cuenta
 * el equilibrio de tradición; el cruce por época necesita además `tituloEnFuente`, que esa
 * vista no lleva. Dos lecturas del mismo directorio serían dos censos que pueden discrepar.
 */
const autoresDelCorpus = await leerAutores(rutas);
const autores = autoresDelCorpus as unknown as AutorParaHuecos[];
/*
 * Las Colecciones llegan con su recuento **ya resuelto**: resolver la pertenencia es
 * intersectar la lista declarada con el conjunto publicable y de eso tiene un solo dueño
 * (`resolverColeccion`). Contarlas aquí a mano sería una segunda respuesta a «cuántas Citas
 * tiene esta Colección», y las dos podrían discrepar.
 *
 * Y se lee aparte, porque un fichero de Colección ilegible **no puede llevarse por delante
 * el informe entero**. `leerColecciones` se niega a leer a medias y lanza, que es lo
 * correcto para quien va a escribir encima; pero aquí solo se está mirando qué le falta al
 * Corpus, y perder de paso los Temas y el equilibrio de tradición —que no tienen nada que
 * ver con ese fichero— sería castigar a quien consulta por un fallo que no le atañe. Se
 * degrada la sección y se dice cuál es el fichero.
 */
let colecciones: ColeccionParaHuecos[] = [];
let falloDeColecciones: string | undefined;
try {
  colecciones = coleccionesParaHuecos(await leerColecciones(rutas), citas as unknown as Cita[]);
} catch (fallo) {
  falloDeColecciones = fallo instanceof Error ? fallo.message : String(fallo);
}

/*
 * Los Temas anunciados se piden al dueño único del conjunto publicable (AD-11), que es
 * el mismo módulo del que sale la portada. Enumerarlos aquí a mano no comprobaría nada:
 * compararía el umbral consigo mismo. Así, si un día la portada anunciara por otra regla,
 * esto lo vería.
 */
const anunciados = temasPublicados(
  temas as unknown as Tema[],
  citas as unknown as Cita[],
).map((t) => t.slug);
/*
 * La cobertura por época — Historia 19.5. Sale de la lista **ya versionada** y esta orden no
 * toca la red: quien recupera es `tools/epocas.ts`, la cáscara, y aquí solo se lee lo que
 * dejó escrito. Así `npm run huecos` sigue contestando con la red caída, que es lo que un
 * bucle necesita de la orden que le dice qué toca.
 *
 * Se lee aparte y degradando, por lo mismo que las Colecciones: un fichero ilegible no puede
 * llevarse por delante el informe entero, y los Temas y el equilibrio de tradición no tienen
 * nada que ver con él.
 */
let epocas: EpocaParaHuecos[] = [];
let falloDeEpocas: string | undefined;
try {
  /*
   * El cruce entero sale de `tools/lib/epocas.ts` y no se rehace aquí (12.1). Estaba escrito
   * línea a línea aquí y en `tools/epocas.ts`, y el día que una copia derivara las dos
   * órdenes habrían dado cuentas distintas del mismo fichero.
   *
   * «Sembrado» se cruza contra los Autores declarados y no contra las Citas: un Autor
   * declarado ya pasó la puerta de admisión, tenga una Cita o cien, y contarlo como pendiente
   * mandaría al bucle a recuperar otra vez a quien ya está dentro.
   */
  epocas = epocasParaHuecos(
    await leerCandidatosPorEpoca(rutas),
    autoresDelCorpus,
    await leerDescartesDeCandidatos(rutas),
  );
} catch (fallo) {
  falloDeEpocas = fallo instanceof Error ? fallo.message : String(fallo);
}

const informe = verHuecos(citas, temas, autores, anunciados, colecciones, epocas);
const objetivo = objetivoDeSesion(informe);
/*
 * La Meta de Corpus (v4) se deriva del mismo informe y no de una segunda lectura: dice
 * cuánto falta para el listón, no qué falta para poder publicar. Son dos preguntas y las
 * dos se responden aquí porque quien mira los huecos antes de una sesión quiere las dos.
 */
const meta = objetivoDeMeta(verMeta(citas, temas, colecciones, informe));

if (argumentos.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify(
      {
        ...informe,
        objetivo,
        meta,
        ...(falloDeColecciones ? { falloDeColecciones } : {}),
        ...(falloDeEpocas ? { falloDeEpocas } : {}),
      },
      null,
      2,
    )}\n`,
  );
} else {
  const { temas: huecos, tradicion, clasicos } = informe;
  const lineas = [
    'Huecos del Corpus',
    '═════════════════',
    '',
    `Temas por debajo del umbral de publicación (${MIN_CITAS_POR_TEMA} Citas)`,
    '─────────────────────────────────────────────────────',
  ];

  if (huecos.length === 0) {
    lineas.push('Ninguno: todos los Temas del corpus llegan al umbral.');
  } else {
    // La línea la escribe `lineaDeHueco` y no este bucle: desde la Historia 12.4 la usan
    // dos órdenes, y una segunda redacción de «le faltan cuatro» acabaría mintiendo.
    for (const hueco of huecos) lineas.push(lineaDeHueco(hueco));
  }

  lineas.push(
    '',
    `Colecciones por debajo de su umbral de publicación (${MIN_CITAS_POR_COLECCION} Citas)`,
    '─────────────────────────────────────────────────────────────',
  );

  if (falloDeColecciones !== undefined) {
    lineas.push(
      'No se han podido leer: ' + falloDeColecciones,
      'El resto del informe no depende de ese fichero y sigue siendo válido.',
    );
  } else if (informe.colecciones.length === 0) {
    /*
     * Dos silencios distintos con la misma forma, y merecen mensajes distintos: mientras
     * `corpus/colecciones/` esté vacío —que es el estado de hoy— no hay ninguna Colección
     * que pueda faltarle nada, y decir «todas llegan al umbral» sería decir que hay alguna.
     */
    /*
     * Sin guillemets, y no es capricho: una prueba de la Historia 9.3 exige que lo único
     * que este informe entrecomille sean nombres de Tema, para que no pueda colarse un
     * nombre de Autor. La orden que se sugiere aquí no es un nombre del Corpus.
     */
    lineas.push(
      colecciones.length === 0
        ? 'Ninguna: todavía no hay Colecciones. Se curan con: npm run coleccion'
        : 'Ninguna: todas las Colecciones del corpus llegan a su umbral.',
    );
  } else {
    for (const hueco of informe.colecciones) lineas.push(lineaDeHueco(hueco));
  }

  // Las cifras del informe se alinean a cuatro, y con un solo formateador: dos anchos
  // distintos en el mismo informe se leen como dos escalas distintas.
  const cifra = (valor: number | string) => String(valor).padStart(4);

  /*
   * La cobertura por época — Historia 19.5. Va junto a la de Tema y no dentro de ella porque
   * son dos listones distintos: el de un Tema es un número de Citas y el de una época es
   * cobertura extensiva hasta agotarla, candidato a candidato.
   *
   * **Sin nombres, como todo este informe.** La lista de candidatos vive versionada en
   * corpus/candidatos-por-epoca.yml, que es donde el editor la mira; aquí van las cuentas.
   * El nombre de una época es una categoría de la Fuente, no el de un Autor.
   */
  lineas.push(
    '',
    'Cobertura por época (todos los candidatos de la Fuente, hasta agotarla)',
    '───────────────────────────────────────────────────────────────────────',
  );

  if (falloDeEpocas !== undefined) {
    lineas.push(
      'No se ha podido leer: ' + falloDeEpocas,
      'El resto del informe no depende de ese fichero y sigue siendo válido.',
    );
  } else if (informe.epocas.length === 0) {
    /*
     * Sin guillemets, como el resto: una prueba de la Historia 9.3 exige que lo único que
     * este informe entrecomille sean nombres de Tema, y la orden que se sugiere aquí no es
     * un nombre del Corpus.
     */
    lineas.push(
      'Ninguna: la lista de candidatos no se ha recuperado todavía, que no es lo mismo que',
      'no quedar nada. Se deriva de las categorías de la Fuente con: npm run epocas:registrar',
    );
  } else {
    /*
     * Con la edad de la lista al lado de la cuenta, y no solo en `npm run epocas`. TERMINADA
     * se imprime igual con una lista de hoy que con una de hace ocho meses, y en el segundo
     * caso quiere decir «terminada respecto de lo que la Fuente decía entonces». La lista se
     * versiona para que el bucle siga con la red caída, y esa misma caché reintroduce por la
     * puerta de atrás la lista que se queda vieja: enseñar su edad es lo que la deja a la
     * vista. Una fecha no es un nombre de Autor, así que la regla de la 9.3 sigue entera.
     */
    let algunaCaducada = false;
    for (const epoca of informe.epocas) {
      const dias = diasDesdeLaRecuperacion(epoca.recuperada, hoy);
      const caducada = listaCaducada(epoca.recuperada, hoy);
      algunaCaducada = algunaCaducada || caducada;
      lineas.push(
        `${epoca.nombre.padEnd(22)} ${cifra(epoca.candidatos)} candidatos, ` +
          `${cifra(epoca.sembrados)} sembrados, ${cifra(epoca.descartados)} descartados, ` +
          `${cifra(epoca.faltan)} pendientes` +
          (epoca.terminada ? '   TERMINADA' : '') +
          (dias === undefined
            ? '   (sin fecha de recuperación)'
            : `   (recuperada hace ${dias} ${dias === 1 ? 'día' : 'días'}${caducada ? ', CADUCADA' : ''})`),
      );
    }
    lineas.push(
      '',
      'Una época está terminada cuando todos sus candidatos están sembrados o descartados con',
      'motivo escrito: es una cuenta, no una opinión. Saltarse a uno no lo descarta.',
      'La lista sale de las categorías de la Fuente y se regenera: npm run epocas',
    );
    if (algunaCaducada) {
      lineas.push(
        `Hay listas de más de ${DIAS_DE_VIGENCIA_DE_LA_LISTA} días: lo de arriba se cuenta contra`,
        'lo que la Fuente decía entonces. Regenérelas con: npm run epocas:registrar',
      );
    }
  }

  /*
   * Las dos cuentas van en dos bloques y no en dos filas del mismo, que es el cambio de la
   * v6: el suelo panhispánico mide el reparto **entre hispánicos**, y los clásicos tienen
   * meta propia. Mezclarlos es lo que hacía que admitir a Séneca contase como escorarse
   * hacia España, y con cuarenta clásicos nuevos habría tirado el indicador al 24 % sin que
   * un solo Autor hispánico cambiara de sitio.
   */

  lineas.push(
    '',
    'Suelo panhispánico (sobre todos los Autores menos los de tradición otra)',
    '────────────────────────────────────────────────────────────────────────',
    `Autores declarados en el Corpus:   ${cifra(tradicion.total)}`,
    `Base del suelo:                    ${cifra(tradicion.hispanicos)}`,
    `  de tradición latinoamericana:    ${cifra(tradicion.latinoamericana)}` +
      (tradicion.porcentaje === undefined
        ? ''
        : `  (${porcentajeEnEspañol(tradicion.porcentaje)} % de la base)`),
    `  de tradición peninsular:         ${cifra(tradicion.peninsular)}`,
    `  sin tradición declarada:         ${cifra(tradicion.sinDeclarar)}`,
    `Fuera de la base (tradición otra): ${cifra(tradicion.otra)}`,
    '',
    /*
     * Los que no declaran tradición cuentan en la base, y se dice: es la cuenta conservadora
     * —un dato que falta no puede mejorar el indicador— y quien lee la cifra tiene que saber
     * que no todos los de la base están clasificados.
     */
    'Los Autores sin tradición declarada cuentan en la base del suelo: un dato que falta no',
    'puede volver el reparto más favorable de lo medido. Los de tradición otra quedan fuera.',
    '',
    /*
     * Denominador cero: se dice y no se publica cifra. Un 0 % aquí sería el artefacto de no
     * dividir por cero disfrazado de medición, y de esta línea sale una decisión editorial.
     */
    tradicion.porcentaje === undefined
      ? `Sin Autores en la base no hay reparto que medir: el suelo del ` +
        `${tradicion.suelo} % no se informa.`
      : tradicion.alcanzaElSuelo
        ? `Por encima del suelo comprometido del ${tradicion.suelo} %.`
        : `POR DEBAJO del suelo comprometido del ${tradicion.suelo} %.`,
  );

  lineas.push(
    '',
    'Clásicos y otras tradiciones (cuenta aparte, meta propia)',
    '─────────────────────────────────────────────────────────',
    `Autores de tradición otra:         ${cifra(clasicos.autores)}`,
    // Las escribe `lineasDeClasicos`, que es su dueño único: la rama de la meta puesta no la
    // corre nadie mientras el listón siga sin poner, y ahí es donde vivía el «Faltan 1».
    ...lineasDeClasicos(clasicos),
    'No entran en el denominador del suelo panhispánico, y por lo demás pasan la misma',
    'puerta que cualquiera: dominio público, año de fallecimiento, Procedencia y cotejo.',
  );

  /*
   * Y cuánto sitio queda bajo el techo. Es **capacidad, no prioridad**: dice dónde cabe
   * sembrar en profundidad, nunca a quién sembrar. Ordenar el trabajo por este margen sería
   * priorizar por disponibilidad, que es exactamente el eje que FR-49 prohíbe. Sin nombres,
   * como todo este informe: el margen de **cada** Autor va en la salida `--json` con su slug,
   * que es dato para el bucle y no una propuesta a una persona.
   */
  lineas.push(
    '',
    'Margen bajo el techo de concentración por Autor (capacidad, no prioridad)',
    '────────────────────────────────────────────────────────────────────────',
    `Techo por Autor:                   ${cifra(TECHO_CONCENTRACION_POR_AUTOR)} % del Corpus`,
  );

  const masEstrecho = informe.margenPorAutor[0];
  const masAncho = informe.margenPorAutor[informe.margenPorAutor.length - 1];

  if (masEstrecho === undefined || masAncho === undefined) {
    lineas.push('Todavía no hay Autores: no hay reparto del que hablar.');
  } else {
    /*
     * Tres estados y no uno. «Rozan el techo» los mezclaba: quien está en el límite —cabe
     * cero, pero no lo pasa— y quien ya lo pasó, que es un problema distinto y se cierra
     * sembrando **a los demás**. El segundo no se recuenta aquí: sale de la Meta, que ya lo
     * cuenta con la razón exacta y es su dueña. Recontarlo era arriesgarse a que las dos
     * cuentas del mismo techo divergieran.
     */
    const porEncima = meta.meta.concentracion?.porEncimaDelTecho ?? 0;
    const sinSitio = informe.margenPorAutor.filter((m) => m.caben === 0).length;

    lineas.push(
      `Autores con margen medido:         ${cifra(informe.margenPorAutor.length)}` +
        '   (declarados y con Cita)',
      `Del más representado caben:        ${cifra(masEstrecho.caben)} Citas más suyas ` +
        `(aporta ${masEstrecho.citas})`,
      `Del que menos aporta caben:        ${cifra(masAncho.caben)} Citas más suyas ` +
        `(aporta ${masAncho.citas})`,
      `Autores en el límite:              ${cifra(Math.max(0, sinSitio - porEncima))}` +
        '   (no cabe ninguna más suya, y no lo pasan)',
      `Autores por encima del techo:      ${cifra(porEncima)}` +
        '   (se cierra sembrando a los demás)',
      '',
      'Este orden es capacidad y no prioridad: dice dónde cabe sembrar, no a quién sembrar.',
      'Entre dos Autores admisibles la prioridad la pone la demanda (FR-49).',
      'El margen de cada Autor, con su slug, va en la salida --json: esta vista informa la',
      'decisión del editor y no nombra a nadie.',
    );
  }

  if (informe.anunciadosBajoUmbral.length > 0) {
    lineas.push(
      '',
      'ATENCIÓN: la portada anuncia Temas que no llegan al umbral:',
      ...informe.anunciadosBajoUmbral.map((slug) => `  ${slug}`),
    );
  }

  /*
   * El objetivo va al final, después de los huecos de los que sale: leerlo antes que su
   * fundamento sería leer una orden en lugar de una derivación. Y sigue sin nombrar a
   * nadie — dice qué hueco cerrar, y al Autor que falta lo caracteriza por su tradición.
   */
  lineas.push('', ...lineasDeObjetivo(objetivo));

  /*
   * Y debajo, la Meta. Va después del objetivo de la sesión y no antes porque el objetivo
   * sale del suelo de publicación, que es una regla del producto, y la Meta de una ambición
   * que Héctor puede mover mañana: leer primero lo que no se negocia.
   *
   * Tampoco nombra a nadie, y ahí estuvo el filo: el tramo de concentración habla del «Autor
   * más representado» y jamás de su nombre. La prueba de la Historia 9.3 que vigila que lo
   * único entrecomillado de este informe sean Temas sigue valiendo palabra por palabra.
   */
  lineas.push('', ...lineasDeMeta(meta));

  process.stdout.write(`${lineas.join('\n')}\n`);
}
