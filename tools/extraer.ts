/**
 * Extracción de candidatas desde un documento de Fuente — FR-23, Historia 11.1.
 *
 *   npx tsx tools/extraer.ts <corpus/fuentes/…​.txt> --autor <slug> [--corpus corpus] [--seco]
 *
 * La entrada es el documento que produjo `tools/recuperar.ts`, y **no** un fichero escrito
 * a mano. La obra, el año y la licencia salen de su cabecera y de la entrada del conjunto
 * cerrado que corresponde a su dirección; no hay banderas `--obra`, `--año` ni
 * `--licencia`, porque escribir el año a mano en la orden sería exactamente la Procedencia
 * inferida que FR-2 prohíbe.
 *
 * Quitar las banderas no bastaba. Mientras la orden aceptase cualquier fichero con forma
 * de cabecera, la superficie de tecleo solo se mudaba del `.yaml` al `.txt`: un fichero
 * compuesto a mano con `fuente: gutenberg` y `año: 1492` producía candidatas reales con
 * esa Procedencia. Por eso se comprueba que el documento lo produjo la recuperación:
 *
 *   1. la ruta resuelve dentro de `corpus/fuentes/`,
 *   2. su `url` pertenece al conjunto cerrado y a la Fuente que declara, y
 *   3. su nombre coincide con el que implican la obra y la página **derivadas del
 *      documento**.
 *
 * Y por eso la obra y el año **no se leen de la cabecera**: se vuelven a derivar aquí, con
 * los mismos lectores puros por Fuente, de la declaración que el documento conserva
 * literal. La cabecera es registro de auditoría. Atarlo todo al nombre del fichero dejaba
 * el año suelto —el nombre solo ata la Fuente y la obra—, y editar a mano `año: 1492` en
 * un documento realmente recuperado producía candidatas con 1492.
 *
 * No es una credencial —el documento es texto legible, no una firma, y no resiste a quien
 * edite ficheros con intención—, sino la puerta que cierra el accidente y el atajo: que
 * quien siembra, persona o agente con prisa, componga el documento a mano porque es más
 * rápido que recuperarlo.
 *
 * Todas las candidatas van a `corpus/_revision/`, ninguna a `corpus/citas/`, aunque
 * traigan obra y año. Publicarlas es la decisión de la Historia 9.2, y es de una persona.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { normalizar } from '../src/lib/normalizar.ts';
import { slugDeCita, slugLibre } from '../src/lib/slug.ts';
import { aYaml, leerCitas, nombreDeFicheroDeCita, rutasDelCorpus } from './lib/corpus.ts';
import {
  analizarDocumento,
  derivarDeLaDeclaracion,
  nombreDeDocumento,
} from './lib/documento.ts';
import {
  extraerCandidatas,
  fuenteUtilizable,
  type DocumentoDeFuente,
} from './lib/extraccion.ts';
import { fuenteDeUrl } from './lib/fuentes.ts';
import { opcion, posicionales, raizDeCorpusDe, terminar } from './lib/cli.ts';

const USO =
  'Uso: npx tsx tools/extraer.ts <corpus/fuentes/documento.txt> --autor <slug> ' +
  '[--corpus corpus] [--seco]';

const argumentos = process.argv.slice(2);
const [rutaDelDocumento, ...sobrantes] = posicionales(argumentos, ['--corpus', '--autor']);
const autor = opcion(argumentos, '--autor');
const seco = argumentos.includes('--seco');
const rutas = rutasDelCorpus(raizDeCorpusDe(argumentos));

if (rutaDelDocumento === undefined || autor === undefined || sobrantes.length > 0) {
  process.stderr.write(`${USO}\n`);
  process.exit(2);
}

/** Lo que hay que hacer en vez de componer el documento a mano. Va en cada rechazo. */
const EN_SU_LUGAR =
  'Recupérelo con: npx tsx tools/recuperar.ts <url de la Fuente> --corpus ' +
  `${rutas.raiz}`;

// ── El documento tiene que haberlo producido la recuperación ─────────────────

const dentro = relative(resolve(rutas.fuentes), resolve(rutaDelDocumento));
if (dentro === '' || dentro.startsWith('..') || isAbsolute(dentro) || dentro.includes(sep)) {
  terminar({
    ok: false,
    motivos: [
      `«${rutaDelDocumento}» no está en ${rutas.fuentes}, así que no lo produjo la recuperación.`,
      'No se ha escrito ninguna candidata.',
      EN_SU_LUGAR,
    ],
  });
}

let contenido: string;
try {
  contenido = await readFile(rutaDelDocumento, 'utf8');
} catch {
  // Un ENOENT crudo saldría por una traza y dejaría al guion de ingesta sin saber qué pasó.
  terminar({
    ok: false,
    motivos: [`No se pudo leer «${rutaDelDocumento}».`, EN_SU_LUGAR],
  });
}

const analizado = analizarDocumento(contenido);
if (analizado === undefined) {
  terminar({
    ok: false,
    motivos: [
      `«${rutaDelDocumento}» no tiene la forma de un documento de Fuente ` +
        '(cabecera, «---», declaración de la Fuente, «---» y cuerpo debajo).',
      'No se ha escrito ninguna candidata.',
      EN_SU_LUGAR,
    ],
  });
}

const { cabecera, declaracion, cuerpo } = analizado;

// La dirección tiene que ser del conjunto cerrado y de la Fuente que el documento dice.
const fuenteDeclarada = fuenteDeUrl(cabecera.url);
if (fuenteDeclarada === undefined || fuenteDeclarada.id !== cabecera.fuente) {
  terminar({
    ok: false,
    motivos: [
      `La dirección «${cabecera.url}» no es de la Fuente «${cabecera.fuente}» ` +
        'ni de ninguna del conjunto cerrado.',
      'La obra, el año y la licencia solo salen de un documento recuperado de una Fuente admitida.',
      'No se ha escrito ninguna candidata.',
      EN_SU_LUGAR,
    ],
  });
}

// Y su licencia tiene que permitir reutilizar, antes de derivar nada de su contenido.
const utilizable = fuenteUtilizable(cabecera.fuente);
if (!utilizable.ok) terminar({ ok: false, motivos: [utilizable.motivo] });

// La obra y el año salen del documento, no de la cabecera: misma derivación que corrió
// al recuperar, sobre las líneas literales que la Fuente escribió.
const derivado = derivarDeLaDeclaracion(cabecera.fuente, declaracion);

if (derivado.obra === undefined) {
  terminar({
    ok: false,
    motivos: [
      `«${rutaDelDocumento}» no declara ninguna obra que ${cabecera.fuente} sepa leer.`,
      'La obra sale de lo que la Fuente declara en el documento, no de su cabecera.',
      'No se ha escrito ninguna candidata.',
      EN_SU_LUGAR,
    ],
  });
}

/*
 * El nombre lleva dentro la obra **y la página**, y las dos se comprueban contra lo que el
 * documento declara. Un documento es el texto de una página concreta —«Triste» y «Tibi
 * Regina» son dos páginas de «Los jardines interiores», con un documento cada una—, así
 * que admitir el segmento de página sin comprobarlo abriría de nuevo la puerta que esto
 * cierra: componer un `.txt` a mano saldría más barato que recuperarlo.
 */
const nombreEsperado = nombreDeDocumento(cabecera.fuente, derivado.obra, derivado.pagina);
const nombreReal = basename(rutaDelDocumento, extname(rutaDelDocumento));

if (extname(rutaDelDocumento) !== '.txt' || nombreEsperado !== nombreReal) {
  terminar({
    ok: false,
    motivos: [
      `El nombre «${nombreReal}» no es el que implica la obra que declara el documento ` +
        `(${nombreEsperado ?? 'la obra declarada no deja nombre utilizable'}).`,
      'Un documento que la recuperación produjo se llama siempre así; este no.',
      'No se ha escrito ninguna candidata.',
      EN_SU_LUGAR,
    ],
  });
}

// ── A partir de aquí, la extracción de la 9.1 tal cual ───────────────────────

const documento: DocumentoDeFuente = {
  fuente: cabecera.fuente,
  obra: derivado.obra,
  url: cabecera.url,
  texto: cuerpo,
  ...(derivado.año !== undefined ? { año: derivado.año } : {}),
};

const resultado = extraerCandidatas(documento, autor);
if (!resultado.ok) terminar({ ok: false, motivos: [resultado.motivo] });

await mkdir(rutas.revision, { recursive: true });

let escritas = 0;

/*
 * Los slugs ocupados son los del corpus entero, no solo los de esta ejecución.
 *
 * Con el conjunto vacío, repetir la extracción de una obra —el gesto natural tras
 * ajustar la ventana de longitud— sobrescribía las candidatas de la vez anterior,
 * incluidas las ya revisadas a medias. Y una candidata cuyo slug coincidiera con el de
 * una Cita publicada llegaba a la aprobación arrastrando una colisión que allí ya no
 * puede pisar nada, pero que obliga a renombrar.
 */
const ocupados = new Set([
  ...(await leerCitas(rutas.citas)).map((c) => c.slug),
  ...(await leerCitas(rutas.revision)).map((c) => c.slug),
]);

for (const candidata of resultado.candidatas) {
  const slug = slugLibre(slugDeCita(autor, normalizar(candidata.texto)), ocupados);
  ocupados.add(slug);
  // El nombre lo fija la espina: `{slug-autor}--{fragmento}.md`. Se compone con el mismo
  // ayudante que el alta y se deriva del slug ya calculado, no del texto, para que
  // fichero y URL no puedan divergir.
  const fichero = join(rutas.revision, `${nombreDeFicheroDeCita(autor, slug)}.md`);
  if (seco) {
    escritas += 1;
    continue;
  }
  await writeFile(
    fichero,
    `---\n${aYaml({
      texto: candidata.texto,
      autor: candidata.autor,
      temas: [],
      slug,
      procedencia: candidata.procedencia,
      estadoDerechos: 'dominio-público',
      fuente: candidata.fuente,
    })}---\n`,
    'utf8',
  );
  escritas += 1;
}

const porMotivo = (motivo: string) =>
  resultado.descartadas.filter((d) => d.motivo === motivo).length;

terminar({
  ok: true,
  ruta: rutas.revision,
  mensaje:
    `Candidatas en revisión: ${escritas}${seco ? ' (en seco, no se ha escrito nada)' : ''}\n` +
    `Descartadas por longitud: ${porMotivo('longitud')}\n` +
    `Descartadas por no estar en español: ${porMotivo('no-esta-en-español')}\n` +
    // Historia 11.5 — un descarte mudo es el mismo problema con otro disfraz: si el
    // documento trae unos párrafos con el OCR roto, quien siembra tiene que enterarse
    // aquí, no al preguntarse por qué de una página larga salieron cuatro candidatas.
    `Descartadas por ilegibles (OCR roto): ${porMotivo('ilegible')}\n` +
    `Descartadas por repetidas: ${porMotivo('repetida')}`,
});
