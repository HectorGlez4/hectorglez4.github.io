/**
 * El peso de lo que se despliega, frente al techo del alojamiento — Historia 24.2, AD-9, AD-16.
 *
 * GitHub Pages admite 1 GB por sitio y `dist/` crece unos 95 KB por Cita nueva, así que una
 * sesión de siembra puede dejar el sitio por encima del techo, y eso no se ve al construir:
 * se ve al publicar, cuando el despliegue falla sin decir cuánto sobra. Este módulo decide,
 * sobre el listado de `dist/` ya leído, cuánto pesa lo que se despliega y si cruza el aviso o
 * el tope de `src/lib/umbrales.ts`.
 *
 * **El veredicto no depende de la jornada** (AD-12). La portada, el 404, `/kit`, `/lote` y
 * `rss.xml` cambian de un día a otro con la Cita del Día; se miden y se informan aparte, y lo
 * juzgado es el resto. Ese reparto lo hace **solo** `medirDist`: lo juzgado es un tipo que
 * solo ella produce, y los veredictos lo reciben ya repartido, así que «sin lo que rota» no se
 * recuerda en dos sitios. Queda una excepción de unos bytes hasta la 26.2: la Cita del Día de
 * la portada entra en el índice de Pagefind, y `dist/pagefind/` cuenta en lo juzgado.
 *
 * Puro (AD-5): recibe rutas y tamaños, devuelve cifras y texto. Quien lee `dist/`, escribe
 * por la salida y decide el código de salida es `integraciones/peso.ts`, el paso final de
 * `npm run build`, después de Pagefind.
 */

import { milesEnEspañol, porcentajeEnEspañol } from '../../src/lib/formato.ts';
import { escaparAnotacion } from './anotacion.ts';

/**
 * Los ficheros de `dist/` que cambian con la jornada, por su ruta relativa a `dist/`.
 *
 * Son las superficies que pintan la Cita del Día o lo compuesto para el día (AD-12): la
 * portada, el 404, el Kit, el Lote y el canal RSS. Rutas exactas: `kit/index.html` y no
 * `kit/`, porque lo que rota es la página y no lo que algún día cuelgue de ella.
 */
export const FICHEROS_QUE_ROTAN_CON_LA_JORNADA: readonly string[] = [
  'index.html',
  '404.html',
  'kit/index.html',
  'lote/index.html',
  'rss.xml',
];

/** Un fichero regular de `dist/`: su ruta relativa a `dist/`, con `/`, y su tamaño. */
export interface FicheroDeDist {
  ruta: string;
  bytes: number;
}

/** Una suma de tamaños y el número de ficheros que la componen. */
export interface Recuento {
  readonly bytes: number;
  readonly ficheros: number;
}

declare const ES_LO_JUZGADO: unique symbol;

/**
 * Lo que se juzga: `dist/` sin lo que rota con la jornada.
 *
 * La marca hace que solo `medirDist` pueda producirlo, y que un veredicto no se pueda pedir
 * sobre lo desplegado entero por descuido: el compilador lo rechaza.
 */
export interface Juzgado extends Recuento {
  /** PNG dentro de lo juzgado: las Tarjetas Sociales y lo que se rasterice en el build. */
  readonly png: number;
  readonly [ES_LO_JUZGADO]: true;
}

/** La medida entera de `dist/`, repartida. */
export interface MedidaDeDist {
  /** Todo `dist/`, `pagefind/` incluido: lo que sube el despliegue. */
  desplegado: Recuento;
  /** Los ficheros de `FICHEROS_QUE_ROTAN_CON_LA_JORNADA` que había. */
  rotan: Recuento;
  /**
   * Los de `FICHEROS_QUE_ROTAN_CON_LA_JORNADA` que **no** había. Si una de esas páginas cambia
   * de ruta, su fichero nuevo se juzga con el resto y el veredicto vuelve a depender del día:
   * el parte los nombra para que eso no pase en silencio.
   */
  rotanQueFaltan: readonly string[];
  /** Lo desplegado menos lo que rota: lo único que miran los veredictos. */
  juzgado: Juzgado;
  /** Las Tarjetas Sociales (`tarjeta/…`), una parte de lo juzgado. */
  tarjetas: Recuento;
  /**
   * El índice de búsqueda (`pagefind/…`), una parte de lo juzgado. Se cuenta para que la
   * primera línea de cifras no diga «pagefind/ incluido» sobre un `dist/` que no lo trae.
   */
  pagefind: Recuento;
}

/** El aviso y el tope del peso, en bytes, y el tope del número de PNG, si lo hay. */
export interface UmbralesDePeso {
  aviso: number;
  tope: number;
  topeDePng: number | undefined;
}

export type VeredictoDePeso = 'por-debajo' | 'aviso' | 'sobre-el-tope';
export type VeredictoDePng = 'sin-tope' | 'dentro' | 'sobre-el-tope';

/**
 * Reparte el listado de `dist/`. La única función que sabe qué rota con la jornada.
 *
 * Los ficheros se cuentan sobre todo `dist/`; lo que rota se resta de lo juzgado y se informa
 * aparte; las Tarjetas y los PNG se cuentan dentro de lo juzgado.
 */
export function medirDist(ficheros: readonly FicheroDeDist[]): MedidaDeDist {
  const queRotan = new Set(FICHEROS_QUE_ROTAN_CON_LA_JORNADA);
  const vistos = new Set<string>();
  const desplegado = { bytes: 0, ficheros: 0 };
  const rotan = { bytes: 0, ficheros: 0 };
  const juzgado = { bytes: 0, ficheros: 0, png: 0 };
  const tarjetas = { bytes: 0, ficheros: 0 };
  const pagefind = { bytes: 0, ficheros: 0 };

  for (const { ruta, bytes } of ficheros) {
    desplegado.bytes += bytes;
    desplegado.ficheros += 1;
    if (queRotan.has(ruta)) {
      vistos.add(ruta);
      rotan.bytes += bytes;
      rotan.ficheros += 1;
      continue;
    }
    juzgado.bytes += bytes;
    juzgado.ficheros += 1;
    if (/\.png$/iu.test(ruta)) juzgado.png += 1;
    if (ruta.startsWith('tarjeta/')) {
      tarjetas.bytes += bytes;
      tarjetas.ficheros += 1;
    }
    if (ruta.startsWith('pagefind/')) {
      pagefind.bytes += bytes;
      pagefind.ficheros += 1;
    }
  }

  return {
    desplegado,
    rotan,
    rotanQueFaltan: FICHEROS_QUE_ROTAN_CON_LA_JORNADA.filter((ruta) => !vistos.has(ruta)),
    juzgado: juzgado as Juzgado,
    tarjetas,
    pagefind,
  };
}

/**
 * El veredicto del peso. Bordes estrictos: igualar el aviso no avisa, igualar el tope avisa y
 * no rompe, pasar el tope rompe.
 */
export function veredictoDePeso(
  juzgado: Juzgado,
  umbrales: { aviso: number; tope: number },
): VeredictoDePeso {
  if (juzgado.bytes > umbrales.tope) return 'sobre-el-tope';
  if (juzgado.bytes > umbrales.aviso) return 'aviso';
  return 'por-debajo';
}

/**
 * El veredicto del número de PNG (AD-16). Sin tope, solo se informa; igualarlo no avisa;
 * pasarlo avisa. Nunca rompe: es el disparador de una deuda, no un techo.
 */
export function veredictoDePng(juzgado: Juzgado, tope: number | undefined): VeredictoDePng {
  if (tope === undefined) return 'sin-tope';
  return juzgado.png > tope ? 'sobre-el-tope' : 'dentro';
}

/** Lo que el paso escribe: las cifras por stdout, lo que cruza un umbral por stderr. */
export interface ParteDePeso {
  /**
   * Siempre que haya algo que juzgar, y nunca con forma de aviso: no avisan de nada. Sin nada
   * que juzgar van vacías —ausencia antes que cero—: un margen sobre cero bytes sería inventado.
   */
  cifras: string[];
  /** Lo que cruza un umbral sin detener la construcción. Vacío si nada cruza. */
  avisos: string[];
  /**
   * Sobre el tope del peso, o sin nada que juzgar —un `dist/` sin ficheros, o solo con los
   * que rotan—: la construcción sale con 1.
   */
  error?: string;
  veredictos: { peso: VeredictoDePeso; png: VeredictoDePng };
}

const MIB = 1024 * 1024;

/**
 * Bytes en MiB, con una décima y coma decimal: «445,2 MiB», «750 MiB». Lo que no llega a una
 * décima sin ser cero es «<0,1 MiB»: «pasa del tope en 1 byte (0 MiB)» se leería como que no
 * lo pasa.
 */
export function enMiB(bytes: number): string {
  const decimas = Math.round((bytes / MIB) * 10);
  if (decimas === 0 && bytes > 0) return '<0,1 MiB';
  const resto = decimas % 10;
  const entero = milesEnEspañol((decimas - resto) / 10);
  return resto === 0 ? `${entero} MiB` : `${entero},${resto} MiB`;
}

/** «466.839.655 bytes (445,2 MiB)». */
function bytesYMiB(bytes: number): string {
  return `${milesEnEspañol(bytes)} ${bytes === 1 ? 'byte' : 'bytes'} (${enMiB(bytes)})`;
}

/** «15.334 ficheros», «1 fichero». */
function ficheros(n: number): string {
  return `${milesEnEspañol(n)} ${n === 1 ? 'fichero' : 'ficheros'}`;
}

/** Una parte de un todo en porcentaje con una décima: «66,9 %». Sin todo, «0 %». */
function porcentaje(parte: number, todo: number): string {
  return `${porcentajeEnEspañol(todo === 0 ? 0 : Math.round((parte / todo) * 1000) / 10)} %`;
}

/** Cuánto queda hasta el umbral siguiente, o cuánto se pasa del tope. */
function margen(bytes: number, umbrales: { aviso: number; tope: number }, peso: VeredictoDePeso): string {
  if (peso === 'por-debajo') return `quedan ${bytesYMiB(umbrales.aviso - bytes)} hasta el aviso`;
  if (peso === 'aviso') return `quedan ${bytesYMiB(umbrales.tope - bytes)} hasta el tope`;
  return `pasa del tope en ${bytesYMiB(bytes - umbrales.tope)}`;
}

/** Con `anotar`, la orden de flujo delante y el texto escapado; sin él, el texto tal cual. */
function anotado(orden: 'warning' | 'error', texto: string, anotar: boolean): string {
  return anotar ? `::${orden}::${escaparAnotacion(texto)}` : texto;
}

/**
 * Lo que el paso dice cuando no puede leer `dist/`: no existe, no es un directorio, o un
 * enlace de dentro no lleva a ninguna parte. Con `anotar`, como `::error::`, igual que el tope.
 */
export function errorDeLectura(dist: string, motivo: string, opciones: { anotar: boolean }): string {
  return anotado(
    'error',
    `No se pudo medir el peso de dist/ en ${dist}: ${motivo}. Este paso corre al final de ` +
      '`npm run build`, después de Astro y de Pagefind, sobre lo que se va a desplegar.',
    opciones.anotar,
  );
}

/**
 * El parte del paso: las cifras, los avisos y el error, ya redactados.
 *
 * Con `anotar` —el paso lo pide cuando corre en GitHub Actions— el aviso y el error llevan
 * delante `::warning::` y `::error::`, para que se vean en el resumen del flujo y no solo
 * enterrados en el registro de la construcción. Las cifras no se anotan nunca: no son avisos.
 */
export function parteDePeso(
  medida: MedidaDeDist,
  umbrales: UmbralesDePeso,
  opciones: { anotar: boolean } = { anotar: false },
): ParteDePeso {
  const { desplegado, rotan, rotanQueFaltan, juzgado, tarjetas, pagefind } = medida;
  const peso = veredictoDePeso(juzgado, umbrales);
  const png = veredictoDePng(juzgado, umbrales.topeDePng);
  const presentes = FICHEROS_QUE_ROTAN_CON_LA_JORNADA.filter((ruta) => !rotanQueFaltan.includes(ruta));

  if (juzgado.ficheros === 0) {
    // Ausencia antes que cero: un dist/ sin ficheros —o solo con los que rotan— no pesa 0
    // bytes, es que no hay nada que juzgar. Ni cifras ni margen: serían de nada.
    const error =
      desplegado.ficheros === 0
        ? 'dist/ no trae ningún fichero: no hay nada que medir ni que desplegar.'
        : `dist/ solo trae ficheros que rotan con la jornada (${presentes.join(', ')}): no hay ` +
          'nada que juzgar.';
    return {
      cifras: [],
      avisos: [],
      error: anotado(
        'error',
        `${error} Este paso corre al final de \`npm run build\`, después de Astro y de Pagefind.`,
        opciones.anotar,
      ),
      veredictos: { peso, png },
    };
  }

  const cifras = [
    `Peso de dist/: ${bytesYMiB(desplegado.bytes)} en ${ficheros(desplegado.ficheros)}, ` +
      (pagefind.ficheros > 0 ? 'pagefind/ incluido.' : 'sin pagefind/: no trae índice de búsqueda.'),
    `Rotan con la jornada, aparte: ${bytesYMiB(rotan.bytes)} en ${ficheros(rotan.ficheros)}` +
      (presentes.length === 0 ? '.' : ` (${presentes.join(', ')}).`) +
      (rotanQueFaltan.length === 0
        ? ''
        : ` No están en dist/: ${rotanQueFaltan.join(', ')}; si su página cambió de ruta, ` +
          'el fichero nuevo se juzga con el resto y FICHEROS_QUE_ROTAN_CON_LA_JORNADA ' +
          '(tools/lib/peso.ts) tiene que nombrarlo.'),
    `Juzgado sin lo que rota: ${bytesYMiB(juzgado.bytes)} en ${ficheros(juzgado.ficheros)}; ` +
      `aviso en ${bytesYMiB(umbrales.aviso)}, tope en ${bytesYMiB(umbrales.tope)}; ` +
      `${margen(juzgado.bytes, umbrales, peso)}.`,
    `Tarjetas Sociales (tarjeta/): ${bytesYMiB(tarjetas.bytes)} en ${ficheros(tarjetas.ficheros)}, ` +
      `${porcentaje(tarjetas.bytes, juzgado.bytes)} de lo juzgado.`,
    umbrales.topeDePng === undefined
      ? `PNG: ${milesEnEspañol(juzgado.png)}, sin tope (TOPE_DE_PNG_DE_DIST no tiene valor): solo se informa.`
      : `PNG: ${milesEnEspañol(juzgado.png)}, tope en ${milesEnEspañol(umbrales.topeDePng)}.`,
  ];

  const avisos: string[] = [];
  let error: string | undefined;

  if (peso === 'aviso') {
    avisos.push(
      `Aviso de peso: dist/ pesa ${bytesYMiB(juzgado.bytes)} sin lo que rota con la jornada, ` +
        `por encima del aviso de ${bytesYMiB(umbrales.aviso)} (AVISO_DE_PESO_DE_DIST) y sin pasar ` +
        `del tope de ${bytesYMiB(umbrales.tope)} (TOPE_DE_PESO_DE_DIST), en src/lib/umbrales.ts; ` +
        `${margen(juzgado.bytes, umbrales, peso)}. El aviso no decide nada: la construcción ` +
        'sigue y, en el flujo de publicación, se despliega. Qué hacer antes de que el tope pare ' +
        'el despliegue —adelgazar dist/ o mudar el alojamiento— lo decide Héctor.',
    );
  }
  if (peso === 'sobre-el-tope') {
    error =
      `dist/ pesa ${bytesYMiB(juzgado.bytes)} sin lo que rota con la jornada y pasa el tope de ` +
      `${bytesYMiB(umbrales.tope)} en ${bytesYMiB(juzgado.bytes - umbrales.tope)}: ` +
      'TOPE_DE_PESO_DE_DIST en src/lib/umbrales.ts. La construcción se detiene para no ' +
      'desplegar por encima del techo del alojamiento: en el flujo de publicación el artefacto ' +
      'no se sube y sigue servido el sitio anterior. Se adelgaza dist/ o se cambia de ' +
      'alojamiento, y el tope lo mueve Héctor.';
  }
  if (png === 'sobre-el-tope') {
    avisos.push(
      `Aviso de PNG: dist/ trae ${milesEnEspañol(juzgado.png)} PNG, más que el tope de ` +
        `${milesEnEspañol(umbrales.topeDePng as number)} (TOPE_DE_PNG_DE_DIST en src/lib/umbrales.ts). ` +
        'No detiene la construcción: es el disparador de la caché de PNG que AD-16 declara como deuda.',
    );
  }

  return {
    cifras,
    avisos: avisos.map((aviso) => anotado('warning', aviso, opciones.anotar)),
    ...(error === undefined ? {} : { error: anotado('error', error, opciones.anotar) }),
    veredictos: { peso, png },
  };
}
