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
 * versiona como texto plano en `corpus/fuentes/{id-de-fuente}--{slug-de-obra}.txt`.
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
  derivarDocumento,
  nombreDeDocumento,
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

const derivado = derivarDocumento(fuente.id, descarga.contenido);
if (!derivado.ok) terminar({ ok: false, motivos: [derivado.motivo] });

const nombre = nombreDeDocumento(fuente.id, derivado.obra);
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

  const obraExistente = existente.cabecera.obra;

  if (obraExistente !== derivado.obra) {
    terminar({
      ok: false,
      motivos: [
        `«${derivado.obra}» y «${obraExistente}» comparten nombre de documento (${nombre}.txt).`,
        'El nombre se recorta, y estas dos obras coinciden al recortarlo. No se ha ' +
          'versionado nada: renombre el documento existente o acorte el título antes de ' +
          'volver a recuperar.',
      ],
    });
  }

  terminar({
    ok: true,
    ruta: destino,
    mensaje: `Ya versionado: ${destino}\nNo se ha sobrescrito: un documento por par (Fuente, obra).`,
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

terminar({
  ok: true,
  ruta: destino,
  mensaje:
    `Documento versionado: ${destino}\n` +
    `Obra: ${derivado.obra}\n` +
    `Año: ${derivado.año ?? 'no consta exacto (la candidata quedará con obra y sin año)'}\n` +
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

type Descarga = { ok: true; contenido: string; url: string } | { ok: false; motivos: string[] };

/**
 * Pide el documento y devuelve su texto, o el motivo por el que no.
 *
 * Las redirecciones se siguen **a mano** (`redirect: 'manual'`) para poder revalidar cada
 * destino contra el conjunto cerrado. Con el seguimiento automático, un anfitrión admitido
 * que redirige fuera traería texto no verificado que se versionaría con la licencia de una
 * Fuente admitida escrita al lado — y nadie volvería a mirar de dónde salió.
 */
async function descargar(inicial: string, fuente: Fuente): Promise<Descarga> {
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
        headers: { 'user-agent': IDENTIFICACION, accept: 'text/html, text/plain' },
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
    if (!TIPOS_ADMITIDOS.some((admitido) => tipo.startsWith(admitido))) {
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
