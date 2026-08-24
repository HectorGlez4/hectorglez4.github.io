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
 */

import {
  verHuecos,
  type AutorParaHuecos,
  type CitaParaHuecos,
  type ColeccionParaHuecos,
} from '../src/lib/huecos.ts';
import { lineaDeHueco, porcentajeEnEspañol } from '../src/lib/formato.ts';
import { lineasDeMeta, objetivoDeMeta, verMeta } from '../src/lib/meta.ts';
import { lineasDeObjetivo, objetivoDeSesion } from '../src/lib/objetivo.ts';
import { temasPublicados, type Cita, type Tema } from '../src/lib/publicado.ts';
import { MIN_CITAS_POR_COLECCION, MIN_CITAS_POR_TEMA } from '../src/lib/umbrales.ts';
import { leerAutores, leerCitas, leerColecciones, leerTemas, rutasDelCorpus } from './lib/corpus.ts';
import { coleccionesParaHuecos } from './lib/curacion.ts';
import { raizDeCorpusDe } from './lib/cli.ts';

const argumentos = process.argv.slice(2);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

const citas = (await leerCitas(rutas.citas)) as unknown as CitaParaHuecos[];
const temas = await leerTemas(rutas);
const autores = (await leerAutores(rutas)) as unknown as AutorParaHuecos[];
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
const informe = verHuecos(citas, temas, autores, anunciados, colecciones);
const objetivo = objetivoDeSesion(informe);
/*
 * La Meta de Corpus (v4) se deriva del mismo informe y no de una segunda lectura: dice
 * cuánto falta para el listón, no qué falta para poder publicar. Son dos preguntas y las
 * dos se responden aquí porque quien mira los huecos antes de una sesión quiere las dos.
 */
const meta = objetivoDeMeta(verMeta(citas, temas, colecciones, informe));

if (argumentos.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify({ ...informe, objetivo, meta, ...(falloDeColecciones ? { falloDeColecciones } : {}) }, null, 2)}\n`,
  );
} else {
  const { temas: huecos, tradicion } = informe;
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

  lineas.push(
    '',
    'Equilibrio de tradición',
    '───────────────────────',
    `Autores en el Corpus:        ${tradicion.total}`,
    `De tradición latinoamericana: ${tradicion.latinoamericana}  ` +
      `(${porcentajeEnEspañol(tradicion.porcentaje)} %)`,
    `De tradición peninsular:      ${tradicion.peninsular}`,
    `De otra tradición:            ${tradicion.otra}`,
    `Sin declarar:                 ${tradicion.sinDeclarar}`,
    '',
    tradicion.alcanzaElSuelo
      ? `Por encima del suelo comprometido del ${tradicion.suelo} %.`
      : `POR DEBAJO del suelo comprometido del ${tradicion.suelo} %.`,
  );

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
