/**
 * Recuperación del documento de una Fuente — Historia 11.1.
 *
 *   npx tsx tools/recuperar.ts <url> [--corpus corpus]
 *
 * **Este fichero es el único punto de las herramientas y del sitio con una llamada de
 * red** (AD-22). `tools/lib/`, `src/lib/`, el esquema y las páginas operan sobre datos ya
 * recuperados. Lo único que el build descarga son las dos familias tipográficas que
 * declara `astro.config.mjs` por la Fonts API; ningún dato del Corpus se pide en el build,
 * así que dos construcciones del mismo commit dan el mismo sitio.
 * `tests/unit/andamiaje.test.ts` vigila las dos excepciones, escritas y con nombre.
 *
 * Lo que la orden hace, y en este orden: comprueba que la dirección pertenece al conjunto
 * cerrado de Fuentes **antes** de pedir nada, reutiliza el documento ya versionado si esa
 * misma dirección ya se recuperó, descarga con tiempo máximo y techo de tamaño, revalida
 * el destino tras cada redirección, deriva obra y año de lo que la Fuente declara y lo
 * versiona como texto plano en `corpus/fuentes/`, con el nombre que le da su obra y su
 * página: `{id-de-fuente}--{slug-de-obra}--{slug-de-página}.txt`, colapsado a
 * `{id-de-fuente}--{slug-de-obra}.txt` cuando la página es la obra.
 *
 * En Wikisource son **dos peticiones a la misma página y al mismo anfitrión**: la
 * renderizada, que trae la obra, y la de origen (`?action=raw`), que trae el metadato que
 * la página no renderiza —el año vive en `|año = 1905`, dentro del encabezado del
 * wikitexto—. La segunda hereda todas las guardas de la primera, y si no llega, la
 * recuperación sigue adelante sin año y lo dice.
 *
 * Y hay una **tercera, solo cuando la página no declara año**: el encabezado de la obra a
 * la que la página dice pertenecer. En Wikisource la obra declara el año y la página
 * declara el texto, y casi nunca son la misma página. La obra se toma del enlace absoluto
 * que la página escribe en su `|título`, nunca de la ruta —derivarla de `Obra/Capítulo`
 * sería la Procedencia inferida que la Historia 11.1 prohíbe—, y es un solo salto: si la
 * obra tampoco declara año, se acabó.
 *
 * No acepta `--obra`, `--año` ni `--licencia`, y no es un descuido: el «So that» de la
 * historia es que nadie pueda teclear una Procedencia que la Fuente no dice.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { DOMINIO } from '../src/lib/dominio.ts';
import { rutasDelCorpus } from './lib/corpus.ts';
import { posicionales, raizDeCorpusDe, terminar } from './lib/cli.ts';
import { fuenteDeUrl, type Fuente } from './lib/fuentes.ts';
import {
  analizarDocumento,
  componerDocumento,
  derivarDeLaDeclaracion,
  derivarDocumento,
  nombreDeDocumento,
  paginaDeLaObraDeclarada,
} from './lib/documento.ts';

/** La única llamada de red del proyecto no puede colgarse ni tragarse una biblioteca. */
const TIEMPO_MAXIMO_MS = 30_000;
const TECHO_DE_TAMAÑO = 12 * 1024 * 1024;
const MAXIMO_DE_REDIRECCIONES = 5;

/**
 * Wikimedia y Gutenberg rechazan —con 403— a los clientes que no se identifican, y la
 * cortesía de decir quién pide qué es parte del trato con una Fuente de dominio público.
 *
 * El dominio no se escribe aquí: sale de `public/CNAME` por `src/lib/dominio.ts`, que es
 * su único dueño. Escrito a mano, este sería el sitio que se quedaría con el dominio
 * viejo el día que cambie, y encima es el que se le enseña a la Fuente.
 */
const IDENTIFICACION = `SabiduriaDeBolsillo/0.1 (+https://${DOMINIO}; recuperacion de Fuentes)`;

const TIPOS_ADMITIDOS = ['text/html', 'text/plain', 'application/xhtml+xml'];

/**
 * Los tipos del **encabezado de origen**, que no son los del documento de la obra.
 *
 * `?action=raw` devuelve `text/x-wiki`, que no es un tipo en el que se pueda versionar
 * una obra —de ahí que no esté en `TIPOS_ADMITIDOS`— pero sí es el que trae el metadato
 * que la página no renderiza. La lista es aparte porque las dos peticiones piden cosas
 * distintas: una, el texto de la obra; la otra, la ficha que lo declara.
 */
const TIPOS_DE_ENCABEZADO = ['text/x-wiki', 'text/plain', 'text/html'];

/** Las Fuentes cuyo metadato vive en el texto de origen y no en la página renderizada. */
const ENCABEZADO_EN_EL_ORIGEN = new Set(['wikisource-es']);

const argumentos = process.argv.slice(2);
const [url, ...sobrantes] = posicionales(argumentos, ['--corpus']);
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

if (url === undefined || sobrantes.length > 0) {
  process.stderr.write('Uso: npx tsx tools/recuperar.ts <url> [--corpus corpus]\n');
  process.exit(2);
}

// ── El conjunto cerrado se comprueba antes de pedir nada ─────────────────────

const fuente: Fuente | undefined = fuenteDeUrl(url);

if (fuente === undefined) {
  terminar({
    ok: false,
    motivos: [
      `«${url}» no pertenece a ninguna Fuente admitida, así que no se ha llegado a pedir.`,
      'El conjunto es cerrado y está en tools/lib/fuentes.ts, cada Fuente con su licencia.',
    ],
  });
}

if (!fuente.permiteReutilizacion) {
  terminar({
    ok: false,
    motivos: [
      `${fuente.nombre} no admite reutilización: ${fuente.razon ?? 'su licencia no lo permite.'}`,
      `(licencia declarada: ${fuente.licencia}). No se ha descargado nada.`,
    ],
  });
}

// ── Lo ya versionado se reutiliza, sin volver a pedirlo ──────────────────────

const yaVersionado = await documentoConUrl(url);
if (yaVersionado !== undefined) {
  terminar({
    ok: true,
    ruta: yaVersionado,
    mensaje: `Ya versionado: ${yaVersionado}\nNo se ha vuelto a descargar ni se ha añadido otra copia.`,
  });
}

// ── La descarga ──────────────────────────────────────────────────────────────

const descarga = await descargar(url, fuente);
if (!descarga.ok) terminar({ ok: false, motivos: descarga.motivos });

// ── El encabezado, de donde la Fuente declara su metadato ────────────────────

const encabezado = ENCABEZADO_EN_EL_ORIGEN.has(fuente.id)
  ? await encabezadoDeOrigen(descarga.url, fuente)
  : {};

const deLaPagina = derivarDocumento(fuente.id, descarga.contenido, encabezado.texto);
if (!deLaPagina.ok) terminar({ ok: false, motivos: [deLaPagina.motivo] });

// ── Y si la página no declara año, el encabezado de la obra que ella declara ──

/*
 * En Wikisource **la obra declara el año y la página declara el texto**, y casi nunca son
 * la misma página: el índice trae `|año = 1895` y el capítulo trae la prosa. Solo se pide
 * cuando falta el año —una página que ya lo trae no gasta una petición— y es **un solo
 * salto**: si la obra tampoco lo declara, se acabó.
 */
const laObra =
  deLaPagina.año === undefined && encabezado.texto !== undefined
    ? await encabezadoDeLaObra(descarga.url, encabezado.texto, fuente)
    : {};

const encadenado =
  laObra.texto === undefined
    ? undefined
    : derivarDocumento(fuente.id, descarga.contenido, encabezado.texto, laObra.texto);

// Encadenar no puede empeorar lo que ya se tenía: si la derivación con el encabezado de la
// obra fallara, se versiona lo que la página declaraba por su cuenta.
const derivado = encadenado !== undefined && encadenado.ok ? encadenado : deLaPagina;

const nombre = nombreDeDocumento(fuente.id, derivado.obra, derivado.pagina);
if (nombre === undefined) {
  terminar({
    ok: false,
    motivos: [
      `El título «${derivado.obra}» no deja ningún nombre utilizable al normalizarlo.`,
      'No se ha versionado nada.',
    ],
  });
}

const destino = join(rutas.fuentes, `${nombre}.txt`);

/*
 * Un documento por par (Fuente, obra), AD-23. Pero el nombre se recorta a 60 caracteres,
 * y dos obras largas distintas de la misma Fuente pueden dar el mismo. Callarlo con «ya
 * versionado» y salir 0 dejaba la segunda obra sin versionar para siempre y sin que nada
 * lo dijera: quien siembra vería un éxito y pasaría a la extracción de la obra anterior.
 */
if (existsSync(destino)) {
  const existente = analizarDocumento(await readFile(destino, 'utf8'));

  // Un fichero que ocupa el sitio pero no se deja analizar no es «ya versionado»: es un
  // documento a medio escribir o tocado a mano. Salir con éxito aquí lo dejaría ahí para
  // que la extracción lo rechazase después, lejos de donde se puede arreglar.
  if (existente === undefined) {
    terminar({
      ok: false,
      motivos: [
        `${destino} ya existe pero no tiene la forma de un documento de Fuente.`,
        'No se ha sobrescrito. Revíselo y retírelo antes de volver a recuperar.',
      ],
    });
  }

  /*
   * Lo que ocupa el nombre tiene que ser **la misma página de la misma obra**. Se compara
   * contra lo derivado de su propia declaración, no contra su cabecera, porque es lo
   * derivado lo que el nombre codifica.
   *
   * Dos páginas distintas ya no colisionan por serlo —cada una tiene su segmento—, pero el
   * nombre se recorta, y dos títulos largos pueden seguir coincidiendo al recortarlo.
   * Callarlo con «ya versionado» y salir 0 dejaba la segunda sin versionar para siempre y
   * sin que nada lo dijera.
   */
  const suyo = derivarDeLaDeclaracion(existente.cabecera.fuente, existente.declaracion);
  const comoSeLlama = (obra: string | undefined, pagina: string | undefined) =>
    pagina === undefined || pagina === obra ? `«${obra}»` : `«${pagina}», de «${obra}»`;

  if (suyo.obra !== derivado.obra || suyo.pagina !== derivado.pagina) {
    terminar({
      ok: false,
      motivos: [
        `${comoSeLlama(derivado.obra, derivado.pagina)} y ` +
          `${comoSeLlama(suyo.obra, suyo.pagina)} comparten nombre de documento (${nombre}.txt).`,
        'El nombre se recorta, y estas dos coinciden al recortarlo. No se ha versionado ' +
          'nada: renombre el documento existente o acorte el título antes de volver a ' +
          'recuperar.',
      ],
    });
  }

  /*
   * Misma obra y misma página: es el mismo documento, alcanzado por otra dirección —la
   * variante móvil, un alias que no quedó registrado—. Reutilizar es lo que se quiere, y
   * decir de dónde salió el que ya está es lo que deja comprobarlo.
   */
  const porOtraDireccion =
    existente.cabecera.url !== descarga.url && existente.cabecera.pedido !== url;

  terminar({
    ok: true,
    ruta: destino,
    mensaje:
      `Ya versionado: ${destino}\nNo se ha sobrescrito: un documento por página de la obra.` +
      (porOtraDireccion
        ? `\nEse documento se recuperó de «${existente.cabecera.url}»: esta dirección lleva a ` +
          'la misma página de la misma obra, así que se reutiliza y no se ha añadido otra copia.'
        : ''),
  });
}

await mkdir(rutas.fuentes, { recursive: true });
await writeFile(
  destino,
  componerDocumento(
    {
      fuente: fuente.id,
      obra: derivado.obra,
      ...(derivado.año !== undefined ? { año: derivado.año } : {}),
      url: descarga.url,
      // Solo cuando hubo redirección: si no, sería la misma línea dos veces.
      ...(descarga.url !== url ? { pedido: url } : {}),
      recuperado: new Date().toISOString().slice(0, 10),
    },
    derivado.declaracion,
    derivado.cuerpo,
  ),
  'utf8',
);

/*
 * Un metadato que falta no es un fallo, pero callarlo sí lo sería: quien siembra tiene que
 * poder distinguir «la Fuente no declara año» de «no se pudo leer lo que declara».
 */
const avisos = [encabezado.aviso, laObra.aviso].filter((a): a is string => a !== undefined);
if (laObra.texto !== undefined && derivado.año === undefined) {
  avisos.push(
    `Aviso: «${laObra.obra}», la obra que esta página declara, tampoco declara año. ` +
      'No se encadena más: un solo salto, de la página a su obra.',
  );
}

const deDondeSaleElAño =
  derivado.año !== undefined && laObra.texto !== undefined
    ? ` (lo declara «${laObra.obra}», la obra a la que esta página dice pertenecer)`
    : '';

terminar({
  ok: true,
  ruta: destino,
  mensaje:
    `Documento versionado: ${destino}\n` +
    `Obra: ${derivado.obra}\n` +
    `Año: ${derivado.año === undefined ? 'no consta exacto (la candidata quedará con obra y sin año)' : `${derivado.año}${deDondeSaleElAño}`}\n` +
    avisos.map((aviso) => `${aviso}\n`).join('') +
    `Licencia: ${fuente.licencia} (${fuente.nombre})`,
});

// ── Piezas ───────────────────────────────────────────────────────────────────

/**
 * El documento ya versionado que salió de esta misma dirección, si lo hay.
 *
 * Se mira contra las dos direcciones que puede llevar la cabecera —la pedida y la final—,
 * porque con redirección no son la misma y comparar solo con la final hacía que cada
 * ejecución volviera a descargar lo que ya estaba versionado.
 */
async function documentoConUrl(direccion: string): Promise<string | undefined> {
  if (!existsSync(rutas.fuentes)) return undefined;

  for (const entrada of await readdir(rutas.fuentes)) {
    if (extname(entrada) !== '.txt') continue;
    const ruta = join(rutas.fuentes, entrada);
    const cabecera = analizarDocumento(await readFile(ruta, 'utf8'))?.cabecera;
    if (cabecera === undefined) continue;
    if (cabecera.url === direccion || cabecera.pedido === direccion) return ruta;
  }

  return undefined;
}

/**
 * El texto de origen de la página, de donde la Fuente declara su metadato.
 *
 * Wikisource **no renderiza el año**: vive en los parámetros del encabezado del wikitexto
 * (`|año = 1905`), así que el lector que buscaba una línea «Año:» en la página no podía
 * dispararse nunca. Se pide la **misma página del mismo anfitrión** con `?action=raw` —no
 * un servicio de datos aparte, que sería un segundo origen de verdad y un anfitrión que el
 * conjunto cerrado de Fuentes no cubre—, y con las mismas guardas que la primera petición:
 * mismo tiempo máximo, mismo techo, misma identificación y misma revalidación de anfitrión
 * tras cada redirección.
 *
 * Si no llega, no pasa nada: la recuperación sigue y la obra queda sin año. Un metadato
 * que falta no es un fallo, y una Fuente caída no puede dejar el corpus a medias.
 */
async function encabezadoDeOrigen(
  direccion: string,
  fuente: Fuente,
): Promise<{ texto?: string; aviso?: string }> {
  let cruda: string;
  try {
    const destino = new URL(direccion);
    destino.hash = '';
    destino.searchParams.set('action', 'raw');
    cruda = destino.toString();
  } catch {
    return { aviso: `No se pudo componer la dirección del encabezado de «${direccion}».` };
  }

  const descarga = await descargar(cruda, fuente, {
    tipos: TIPOS_DE_ENCABEZADO,
    acepta: 'text/x-wiki, text/plain',
  });

  if (!descarga.ok) {
    return {
      aviso:
        `Aviso: no se pudo leer el encabezado de origen (${cruda}): ${descarga.motivos[0]} ` +
        'El documento se versiona igual; si la Fuente declaraba el año ahí, la candidata ' +
        'quedará con obra y sin año.',
    };
  }

  return { texto: descarga.contenido };
}

/**
 * El texto de origen de **la obra que la página declara**, cuando la página no declara año.
 *
 * En Wikisource la obra declara el año y la página declara el texto, y casi nunca son la
 * misma página: «Capítulos que se le olvidaron a Cervantes» declara `|año = 1895` y su
 * cuerpo es el índice; su «Capítulo XLIII» trae ocho mil caracteres de prosa y ningún año.
 * Sin este salto, ninguna obra paginada —que son las de los autores conocidos— se puede
 * sembrar sin degradar la Procedencia a parcial.
 *
 * El padre **no se deriva de la ruta**: sale del enlace absoluto que la propia página
 * escribe en su `|título`, que es una declaración suya y no una inferencia nuestra
 * (`paginaDeLaObraDeclarada`). La dirección se compone sobre el **mismo anfitrión** de la
 * página, y la petición pasa por las mismas guardas que las otras dos, revalidación de
 * anfitrión incluida.
 *
 * Si no hay enlace utilizable, si apunta a la propia página, o si la petición falla, se
 * devuelve lo que se pueda decir y la recuperación sigue adelante sin año.
 */
async function encabezadoDeLaObra(
  direccion: string,
  encabezadoDePagina: string,
  fuente: Fuente,
): Promise<{ texto?: string; obra?: string; aviso?: string }> {
  const obra = paginaDeLaObraDeclarada(encabezadoDePagina);
  if (obra === undefined) return {};

  let cruda: string;
  try {
    const destino = new URL(direccion);
    destino.hash = '';
    destino.search = '';
    destino.pathname = `/wiki/${obra.replace(/ /gu, '_')}`;

    // Un `|título` que apunta a la propia página no es un salto: es la misma declaración
    // que ya se leyó, y pedirla otra vez sería una petición que no puede dar nada.
    if (mismaPagina(destino.pathname, new URL(direccion).pathname)) return { obra };

    destino.searchParams.set('action', 'raw');
    cruda = destino.toString();
  } catch {
    return { obra, aviso: `No se pudo componer la dirección de la obra «${obra}».` };
  }

  const descarga = await descargar(cruda, fuente, {
    tipos: TIPOS_DE_ENCABEZADO,
    acepta: 'text/x-wiki, text/plain',
  });

  if (!descarga.ok) {
    return {
      obra,
      aviso:
        `Aviso: esta página no declara año y no se pudo leer el de «${obra}», la obra a la ` +
        `que dice pertenecer (${cruda}): ${descarga.motivos[0]} El documento se versiona ` +
        'igual, y la candidata quedará con obra y sin año.',
    };
  }

  return { texto: descarga.contenido, obra };
}

/** Dos rutas que designan la misma página, comparadas ya sin la codificación por ciento. */
function mismaPagina(una: string, otra: string): boolean {
  const legible = (ruta: string) => {
    try {
      return decodeURIComponent(ruta);
    } catch {
      return ruta;
    }
  };
  return legible(una) === legible(otra);
}

type Descarga = { ok: true; contenido: string; url: string } | { ok: false; motivos: string[] };

/**
 * Pide el documento y devuelve su texto, o el motivo por el que no.
 *
 * Las redirecciones se siguen **a mano** (`redirect: 'manual'`) para poder revalidar cada
 * destino contra el conjunto cerrado. Con el seguimiento automático, un anfitrión admitido
 * que redirige fuera traería texto no verificado que se versionaría con la licencia de una
 * Fuente admitida escrita al lado — y nadie volvería a mirar de dónde salió.
 */
async function descargar(
  inicial: string,
  fuente: Fuente,
  {
    tipos = TIPOS_ADMITIDOS,
    acepta = 'text/html, text/plain',
  }: { tipos?: string[]; acepta?: string } = {},
): Promise<Descarga> {
  let actual = inicial;

  for (let salto = 0; salto <= MAXIMO_DE_REDIRECCIONES; salto += 1) {
    const destinoAdmitido = fuenteDeUrl(actual);
    if (destinoAdmitido === undefined || destinoAdmitido.id !== fuente.id) {
      return {
        ok: false,
        motivos: [
          `La redirección lleva a «${actual}», que no es de ${fuente.nombre}.`,
          'No se ha versionado nada: el texto de otro anfitrión no hereda la licencia de una Fuente admitida.',
        ],
      };
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(actual, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
        headers: { 'user-agent': IDENTIFICACION, accept: acepta },
      });
    } catch (fallo) {
      // Un mensaje propio, no una traza: quien siembra tiene que saber si reintentar.
      const detalle = fallo instanceof Error ? fallo.message : String(fallo);
      return {
        ok: false,
        motivos: [`No se pudo pedir «${actual}»: ${detalle}.`, 'No se ha versionado nada.'],
      };
    }

    if (respuesta.status >= 300 && respuesta.status < 400) {
      const siguiente = respuesta.headers.get('location');
      if (siguiente === null) {
        return {
          ok: false,
          motivos: [`«${actual}» redirige sin decir a dónde (${respuesta.status}).`],
        };
      }
      actual = new URL(siguiente, actual).toString();
      continue;
    }

    if (!respuesta.ok) {
      return {
        ok: false,
        motivos: [
          `${fuente.nombre} respondió ${respuesta.status} a «${actual}».`,
          'No se ha versionado nada.',
        ],
      };
    }

    // `respuesta.url` viene vacía en respuestas sintéticas; cuando viene, manda.
    if (respuesta.url !== '' && fuenteDeUrl(respuesta.url)?.id !== fuente.id) {
      return {
        ok: false,
        motivos: [
          `La respuesta llegó de «${respuesta.url}», que no es de ${fuente.nombre}.`,
          'No se ha versionado nada.',
        ],
      };
    }

    const tipo = (respuesta.headers.get('content-type') ?? '').toLowerCase();
    if (!tipos.some((admitido) => tipo.startsWith(admitido))) {
      return {
        ok: false,
        motivos: [
          `«${actual}» no devolvió texto sino «${tipo === '' ? 'sin tipo declarado' : tipo}».`,
          'Solo se versionan documentos de texto. No se ha versionado nada.',
        ],
      };
    }

    const anunciado = Number(respuesta.headers.get('content-length') ?? '0');
    if (Number.isFinite(anunciado) && anunciado > TECHO_DE_TAMAÑO) {
      return {
        ok: false,
        motivos: [
          `«${actual}» anuncia ${anunciado} bytes, por encima del techo de ${TECHO_DE_TAMAÑO}.`,
          'No se ha descargado: el techo acota la memoria, no solo el disco.',
        ],
      };
    }

    const cuerpo = await leerConTecho(respuesta);
    if (!cuerpo.ok) return { ok: false, motivos: cuerpo.motivos };

    return { ok: true, contenido: descodificar(cuerpo.bytes, tipo), url: actual };
  }

  return {
    ok: false,
    motivos: [`«${inicial}» encadena más de ${MAXIMO_DE_REDIRECCIONES} redirecciones.`],
  };
}

/**
 * Lee el cuerpo por trozos y corta en cuanto pasa del techo.
 *
 * `arrayBuffer()` se traga la respuesta entera y solo después se puede medir, así que el
 * techo protegía el disco y no la memoria: una respuesta de un giga la reventaba antes de
 * llegar a la comprobación. Aquí se cancela la lectura en el trozo que se pasa.
 */
async function leerConTecho(
  respuesta: Response,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; motivos: string[] }> {
  if (respuesta.body === null) return { ok: true, bytes: new Uint8Array() };

  const lector = respuesta.body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > TECHO_DE_TAMAÑO) {
      await lector.cancel();
      return {
        ok: false,
        motivos: [
          `La respuesta pasa del techo de ${TECHO_DE_TAMAÑO} bytes y se ha cortado la lectura.`,
          'No se ha versionado nada.',
        ],
      };
    }
    trozos.push(value);
  }

  const bytes = new Uint8Array(total);
  let escrito = 0;
  for (const trozo of trozos) {
    bytes.set(trozo, escrito);
    escrito += trozo.byteLength;
  }
  return { ok: true, bytes };
}

/**
 * Descodifica respetando el juego de caracteres que declare la respuesta.
 *
 * Gutenberg todavía sirve Latin-1 en parte de su catálogo. Suponer UTF-8 convertiría cada
 * acento en un rombo, y ese rombo se versionaría para siempre: el cotejo literal de la
 * Historia 11.2 no encontraría el texto de ninguna Cita en su propio documento.
 */
function descodificar(bytes: Uint8Array, tipoDeclarado: string): string {
  const enCabecera = /charset\s*=\s*"?([\w-]+)"?/i.exec(tipoDeclarado)?.[1];
  const enDocumento = enCabecera ?? charsetDelMarcado(bytes);

  for (const juego of [enDocumento, 'utf-8']) {
    if (juego === undefined) continue;
    try {
      return new TextDecoder(juego, { fatal: false }).decode(bytes);
    } catch {
      // Un juego de caracteres que Node no conoce: se prueba el siguiente.
    }
  }

  return new TextDecoder('utf-8').decode(bytes);
}

/** `<meta charset>` de la cabecera del documento, cuando la respuesta no lo declaró. */
function charsetDelMarcado(bytes: Uint8Array): string | undefined {
  const principio = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
  return (
    /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(principio)?.[1] ??
    /encoding\s*=\s*["']([\w-]+)["']/i.exec(principio)?.[1]
  );
}
