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
 * Y el `--autor` tampoco se cree a ciegas — misma Historia 11.1, mismo FR-23. El
 * documento declara **quién firma** en la misma declaración literal de la que salen la
 * obra y el año, así que la orden lo coteja: un `--autor` que no nombra a ningún Autor de
 * `corpus/autores/` se rechaza antes de leer nada, y uno que el documento contradice se
 * rechaza nombrando las dos partes. Sale de un hallazgo registrado en
 * `_bmad-output/implementation-artifacts/deferred-work.md`: pasarle `--autor
 * juan-montalvo` a «El sable» —que declara «Manuel González Prada»— produjo 32 candidatas
 * atribuidas al Autor equivocado, y el cotejo literal de la 11.2 las habría dado por
 * buenas, porque el texto **está** en ese documento.
 *
 * Lo que esta puerta no cierra, y conviene no prometer: no dice que la Cita sea del Autor,
 * dice que el documento y el Corpus llaman igual a quien firma el documento. Una copla
 * ajena citada dentro de la obra sigue pasando. Eso es otra puerta y otra historia.
 *
 * Todas las candidatas van a `corpus/_revision/`, ninguna a `corpus/citas/`, aunque
 * traigan obra y año. Publicarlas es la decisión de la Historia 9.2, y es de una persona.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { normalizar } from '../src/lib/normalizar.ts';
import { slugDeCita, slugLibre } from '../src/lib/slug.ts';
import {
  aYaml,
  leerAutores,
  leerCitas,
  nombreDeFicheroDeCita,
  rutasDelCorpus,
} from './lib/corpus.ts';
import {
  analizarDocumento,
  derivarDeLaDeclaracion,
  esElMismoAutor,
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

// ── El Autor de la orden tiene que existir en el Corpus ──────────────────────
//
// Antes de leer nada: `--autor autor-que-no-existe` producía 32 candidatas atribuidas a
// un Autor inventado y salía con código 0, de modo que el guion de ingesta que la llamó
// creía haber sembrado bien. El Autor de una candidata lo declara `corpus/autores/`, que
// es su único dueño, y esta orden no lo inventa ni lo deduce del documento.

/*
 * Que el directorio falte se comprueba aparte, y no por pulcritud: `leerAutores` no
 * lanza si no existe —devuelve lista vacía—, así que un corpus sin `autores/` recibía
 * «este Autor no existe» y mandaba a dar de alta a quien puede que ya estuviera dado. Son
 * dos fallos distintos y se dicen distinto.
 */
if (!existsSync(rutas.autores)) {
  terminar({
    ok: false,
    motivos: [
      `No existe ${rutas.autores}, así que este corpus no declara ningún Autor.`,
      'Sin los Autores del Corpus no hay contra qué cotejar el --autor de la orden.',
      'No se ha escrito ninguna candidata.',
    ],
  });
}

let delCorpus: { slug: string; nombre?: string } | undefined;
try {
  delCorpus = (await leerAutores(rutas)).find((a) => a.slug === autor);
} catch (fallo) {
  // Una ficha de Autor con el YAML roto tampoco es «este Autor no existe»: es que no se
  // sabe qué Autores hay.
  terminar({
    ok: false,
    motivos: [
      `No se pudieron leer los Autores de ${rutas.autores}: ` +
        `${fallo instanceof Error ? fallo.message : String(fallo)}`,
      'Sin los Autores del Corpus no hay contra qué cotejar el --autor de la orden.',
      'No se ha escrito ninguna candidata.',
    ],
  });
}

if (delCorpus === undefined) {
  terminar({
    ok: false,
    motivos: [
      // La extensión va en plural porque el lector acepta las dos: señalar solo `.yml` a
      // quien escribe `.yaml` es mandarlo a mirar una ruta que la orden no lee.
      `«${autor}» no es ningún Autor del Corpus: no existe ` +
        `${join(rutas.autores, `${autor}.yml`)} (ni su .yaml).`,
      'El Autor de una candidata es el que declara corpus/autores/, y esta orden no lo inventa.',
      'No se ha escrito ninguna candidata.',
      `Dé de alta al Autor primero, o extraiga con el slug de uno que ya esté en ${rutas.autores}.`,
    ],
  });
}

/*
 * El `nombre` es el lado del Corpus en el cotejo, y una ficha que no lo declara no tiene
 * lado. Sin esta comprobación la comparación llegaba a normalizar `undefined` y la orden
 * salía por una traza, que es justo lo que no hace ninguna otra rama de este guion.
 */
const nombreDelCorpus = delCorpus.nombre?.trim();
if (nombreDelCorpus === undefined || nombreDelCorpus === '') {
  terminar({
    ok: false,
    motivos: [
      `La ficha de «${autor}» no declara ningún nombre, y el nombre es lo que el Corpus ` +
        'pone en el cotejo.',
      'Sin él no hay contra qué comparar lo que declare el documento.',
      'No se ha escrito ninguna candidata.',
      `Declare «nombre» en ${join(rutas.autores, `${autor}.yml`)}.`,
    ],
  });
}

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

/*
 * ── Y el Autor que declara el documento tiene que ser el de la orden ─────────
 *
 * El autor sale de la **declaración literal** que el documento conserva, con los mismos
 * lectores por Fuente de los que salen la obra y el año, y nunca de la cabecera, que es
 * registro de auditoría: cotejar contra la cabecera sería cotejar contra un campo
 * editable a mano.
 *
 * La comparación es Corpus ⊆ declarado, va contra el `nombre` del Autor en
 * `corpus/autores/` —su único dueño— y se hace contra **cada** Autor declarado por
 * separado: fundir dos en un nombre dejaría cruzar la puerta a un tercero hecho de
 * pedazos de los dos.
 *
 * Tres estados, y los tres se tratan distinto:
 *
 *   · no declara a nadie —ni parámetro, ni firma— pasa sin cotejar, como el año que
 *     falta, y el informe lo dice para que se vea que la puerta no actuó;
 *   · declara algo que no se sabe interpretar se **rechaza**: dar eso por «no declara
 *     autor» convertía la línea del informe en una mentira, que es el único modo en que
 *     una puerta muda se parece a una puerta que aprueba;
 *   · declara y no concuerda se rechaza nombrando las dos partes.
 */
const autorDeclarado = derivado.autor;

if (autorDeclarado !== undefined && autorDeclarado.nombres.length === 0) {
  terminar({
    ok: false,
    motivos: [
      `El documento declara un autor que no se sabe interpretar: «${autorDeclarado.crudo}».`,
      'No se coteja lo que no se entiende, y tampoco se da por no declarado: pasarlo ' +
        'atribuiría el texto a quien dice la orden sin que nada lo respalde.',
      'No se ha escrito ninguna candidata.',
      `Recupere el documento otra vez, o corrija la Fuente, hasta que su línea de autor ` +
        'nombre a una persona.',
    ],
  });
}

if (
  autorDeclarado !== undefined &&
  !autorDeclarado.nombres.some((nombre) => esElMismoAutor(nombre, nombreDelCorpus))
) {
  terminar({
    ok: false,
    motivos: [
      `El documento declara «${autorDeclarado.nombres.join('» y «')}» y la orden dice ` +
        `«${autor}», que el Corpus llama «${nombreDelCorpus}». No son el mismo Autor.`,
      'El Autor sale de lo que la Fuente declara en el documento, y el nombre de ' +
        'corpus/autores/; extraer así atribuiría el texto a quien no lo escribió.',
      'No se ha escrito ninguna candidata.',
      `Extraiga con el --autor que este documento declara, o recupere un documento de ${nombreDelCorpus}.`,
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
const enRevision = await leerCitas(rutas.revision);

const publicadas = await leerCitas(rutas.citas);

const ocupados = new Set([
  ...publicadas.map((c) => c.slug),
  ...enRevision.map((c) => c.slug),
]);

/*
 * Y lo que ya está por revisar de este Autor, por TEXTO.
 *
 * Sin esto, el arreglo de arriba cambia una pérdida por una duplicación: como las
 * candidatas de la vez anterior cuentan como slugs ocupados, repetir la extracción las
 * reescribe enteras con sufijo `-2`. Medido en vivo re-extrayendo una sátira tras añadir
 * una puerta: **332 ficheros para 167 textos**. El montón por revisar se dobla y las dos
 * copias solo se distinguen por el nombre.
 *
 * Va por texto y no por slug precisamente porque el slug es lo que `slugLibre` hace
 * divergir. Y va por Autor porque el mismo refrán en dos obras de Autores distintos son
 * dos candidatas, no una.
 */
const clave = (autorDeLaCita: string, texto: string) => `${autorDeLaCita} ${normalizar(texto)}`;

const yaEnRevision = new Set(enRevision.map((c) => clave(c.autor, c.texto)));

/*
 * Y lo que ya **es Cita publicada**, también por texto.
 *
 * La puerta de arriba no basta, y falta en el gesto más natural que hay: **volver a extraer un
 * documento del que ya se publicó**. Se vio con un tratado del que salían 36 candidatas y del
 * que 15 ya eran Citas publicadas —las que se aprobaron de él la primera vez—. Como sus slugs
 * estaban ocupados, `slugLibre` les puso sufijo `-2` y se escribieron como si fueran nuevas.
 * Revisarlas es trabajo perdido; aprobarlas, duplicar.
 *
 * Y re-extraer no es raro: es lo que se hace cada vez que entra una puerta nueva y hay que
 * pasar por ella los documentos viejos.
 */
const yaPublicadas = new Set(publicadas.map((c) => clave(c.autor, c.texto)));

let repetidas = 0;
let yaEstaban = 0;

for (const candidata of resultado.candidatas) {
  if (yaEnRevision.has(clave(autor, candidata.texto))) {
    repetidas += 1;
    continue;
  }
  /*
   * Aparte de las de revisión a propósito: fundidas en un solo número se perdería la única
   * señal de que el documento nuevo es, en realidad, una reedición de lo que ya está dentro.
   */
  if (yaPublicadas.has(clave(autor, candidata.texto))) {
    yaEstaban += 1;
    continue;
  }
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
    // Que se vea de qué lado quedó la puerta del Autor, y sobre todo cuándo **no** actuó:
    // una puerta muda que no se disparó se parece demasiado a una puerta que aprobó.
    (autorDeclarado === undefined
      ? `Autor sin cotejar: el documento no declara autor, así que «${nombreDelCorpus}» ` +
        'lo pone la orden y nada lo contradice.\n'
      : `Autor cotejado: el documento declara «${autorDeclarado.nombres.join('» y «')}» ` +
        `y el Corpus, «${nombreDelCorpus}».\n`) +
    `Descartadas por longitud: ${porMotivo('longitud')}\n` +
    `Descartadas por no estar en español: ${porMotivo('no-esta-en-español')}\n` +
    // Historia 11.5 — un descarte mudo es el mismo problema con otro disfraz: si el
    // documento trae unos párrafos con el OCR roto, quien siembra tiene que enterarse
    // aquí, no al preguntarse por qué de una página larga salieron cuatro candidatas.
    `Descartadas por ilegibles (OCR roto): ${porMotivo('ilegible')}\n` +
    `Descartadas por ser aparato de la Fuente: ${porMotivo('aparato-de-la-fuente')}\n` +
    `Descartadas por repetidas: ${porMotivo('repetida')}` +
    // Se dice aunque sea cero: es lo que distingue «no había nada nuevo» de «no se ejecutó».
    `\nYa estaban en revisión: ${repetidas}` +
    // Y este número, además, dice algo del documento: si es alto, lo que se ha recuperado no
    // es cantera nueva sino una antología de lo que el Corpus ya tiene.
    `\nYa eran Cita publicada: ${yaEstaban}`,
});
