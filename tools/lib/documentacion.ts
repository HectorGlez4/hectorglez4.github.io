/**
 * Documentar y retirar una Cita ya publicada — Historia 11.6.
 *
 * Antes de esto, una Cita anterior a la v3 no se podía documentar. `tools/alta.ts` toma la
 * Fuente al crear y `revisar --aprobar` al aprobar, pero para una Cita **ya publicada** no
 * había ninguna orden: el único camino era editar su `.md` a mano y borrar su línea del
 * censo, que es justo lo que las herramientas existen para evitar.
 *
 * **Nada se escribe si el texto no aparece literal en el documento.** Es la puerta entera.
 * Si documentar pudiera hacerse sin cotejar, sería teclear una Procedencia con más pasos, y
 * la Historia 11.2 dejaría de significar nada para las 38 Citas que más lo necesitan. Por
 * eso la obra y el año se **derivan del documento** con los mismos lectores puros que usan
 * `recuperar` y `extraer`, y por eso el documento tiene que ser uno que produjera la
 * recuperación: las mismas tres comprobaciones de procedencia que hace `tools/extraer.ts`
 * —la ruta dentro de `corpus/fuentes/`, la dirección del conjunto cerrado y el nombre que
 * implica lo derivado—, porque si no la superficie de tecleo se mudaría del `.yaml` al
 * `.txt`.
 *
 * **Y tampoco se ata una Cita a un documento firmado por otro.** Las dos órdenes cotejan
 * el Autor contra el que declara el documento, con la misma comparación pura
 * (`esElMismoAutor`); lo que difiere es de dónde sale el lado del Corpus: en `extraer` lo
 * escribe quien invoca, en la bandera `--autor`, y aquí lo trae la **Cita que ya está
 * publicada**, de cuyo `autor` se lee la ficha de `corpus/autores/`. Sin esta puerta,
 * documentar una Cita contra el documento de otro Autor no solo la mal-atribuía: la sacaba
 * de `pendientes-de-cotejo.yml`, con lo que la Cita dejaba de estar marcada como no
 * verificada y quedaba registrada como cotejada.
 *
 * **Documentar y salir del censo son un solo gesto.** El censo declara «esta Cita se
 * publica sin cotejar porque no tiene documento». En cuanto lo tiene, la frase es falsa, y
 * el propio cotejo rompe la construcción si la encuentra en los dos sitios. Separar las dos
 * operaciones dejaría un estado intermedio que no puede existir, y una orden que puede
 * dejar el corpus en un estado imposible no es una herramienta: es una trampa. De ahí la
 * regla de o todo o nada que gobierna las dos funciones de este módulo.
 *
 * AD-22 — aquí no entra la red: el documento lo recupera `tools/recuperar.ts` y esto lee un
 * fichero ya versionado.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { normalizar } from '../../src/lib/normalizar.ts';
import {
  apareceEnDocumento,
  censoSinLaCita,
  documentosDeCita,
  FICHERO_DEL_CENSO,
  huellaDeTexto,
} from './cotejo.ts';
import {
  escribirCenso,
  escribirCita,
  fechaLocal,
  leerAutores,
  leerCensoBruto,
  leerCensoDeCotejo,
  leerCitas,
  leerDocumentosDeclarados,
  leerFichasDeObra,
  mover,
  separarFrontmatter,
  type CitaEnCorpus,
  type Rutas,
} from './corpus.ts';
import {
  analizarDocumento,
  derivarDeLaDeclaracion,
  esElMismoAutor,
  nombreDeDocumento,
  procedenciaDeLaDerivacion,
  type AutorDeLaFuente,
} from './documento.ts';
import type { Traduccion } from '../../src/lib/admision.ts';
import { fuenteUtilizable } from './extraccion.ts';
import { aplicarFichaDeObra, describirPlan, resolverFichaDeObra, type PlanDeFicha } from './obras.ts';
import { formaDeObra } from '../../src/lib/obras.ts';
import { fuenteDeUrl } from './fuentes.ts';
import type { Resultado } from './gestion.ts';

/**
 * Lo que se dice antes de escribir, cuando lo que se va a escribir cambia lo que lee el
 * visitante.
 *
 * Va por aquí y no solo en el mensaje final a propósito: la obra derivada puede no ser la
 * que la Cita declaraba, y el texto corregido nunca lo es. Que se lea **antes** de que el
 * fichero cambie es lo que permite parar la orden con Ctrl-C al ver algo que no se esperaba,
 * en vez de enterarse cuando ya está escrito. El valor por omisión no dice nada, para que
 * las pruebas de lo puro no tengan que pasarle nada.
 */
export type Avisar = (linea: string) => void;

const CALLAR: Avisar = () => {};

// ─────────────────────────────────────────────────────────────────────────────
// El parecido, que es lo que distingue corregir de sustituir
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cuánto tiene que parecerse el texto corregido al publicado para que sea **la misma Cita**.
 *
 * El caso real que obliga a que exista `--texto` está en el censo: el Corpus dice «Hombres
 * necios que acusáis a la mujer sin razón, sin ver que sois la ocasión de lo mismo que
 * culpáis.» y las *Redondillas* dicen lo mismo con una coma más y un punto y coma final. No
 * es una paráfrasis: es la misma Cita con la puntuación normalizada al teclearla en la v1, y
 * ese es el patrón general del censo. Sin esta salida, la única sería retirar Citas
 * verdaderas por una coma.
 *
 * El parecido se mide sobre la **forma canónica de AD-3**, que es la definición que el
 * proyecto ya tiene de «dos textos son la misma Cita» y la que usa la detección de
 * duplicados de FR-14. Eso hace que una corrección que solo toca signos o acentos —el caso
 * de las *Redondillas*— valga 1, sin margen de duda, y que lo que el umbral juzgue de verdad
 * sean las diferencias de **palabras**, que son las que pueden convertir una Cita en otra.
 *
 * 0,85 deja restituir una palabra elidida o una forma verbal en un texto de la longitud
 * habitual —una frase de 100 caracteres canónicos admite 15 de corrección— y se queda muy
 * por encima de lo que puntúan dos Citas distintas de la misma página: «El sabio hace luego
 * lo que el necio al fin» contra «Haga al principio el cuerdo lo que el necio al fin»
 * —justamente el par que descubrió el problema— se queda en 0,60. Entre las dos cosas hay
 * espacio de sobra, y el umbral vive en esa holgura y no pegado a ningún caso concreto.
 *
 * No es la puerta: la puerta es que el texto nuevo **aparezca literal en el documento**, que
 * es lo que impide inventárselo. Esto es lo que impide lo otro, cambiar una Cita por otra
 * distinta de la misma página, que sí aparecería literal.
 */
export const MIN_PARECIDO_PARA_CORREGIR = 0.85;

/**
 * Cuánto se parecen dos textos, entre 0 y 1, sobre su forma canónica.
 *
 * Distancia de edición normalizada por la longitud del más largo. Se cuenta por caracteres
 * y no por palabras porque una corrección típica del censo cambia media palabra —una `s`
 * final, una tilde que en forma canónica ni se ve— y un parecido por palabras la contaría
 * como palabra entera cambiada, castigando más una corrección menor en un texto corto que
 * una reescritura en uno largo.
 */
export function parecidoDeTextos(a: string, b: string): number {
  const uno = normalizar(a);
  const otro = normalizar(b);
  if (uno === otro) return 1;
  if (uno === '' || otro === '') return 0;
  return 1 - distanciaDeEdicion(uno, otro) / Math.max(uno.length, otro.length);
}

/** Distancia de Levenshtein, con una sola fila viva: los textos de una Cita son cortos. */
function distanciaDeEdicion(uno: string, otro: string): number {
  let fila = Array.from({ length: otro.length + 1 }, (_, i) => i);

  for (let i = 1; i <= uno.length; i += 1) {
    const siguiente = [i];
    for (let j = 1; j <= otro.length; j += 1) {
      siguiente[j] = Math.min(
        fila[j] + 1,
        siguiente[j - 1] + 1,
        fila[j - 1] + (uno[i - 1] === otro[j - 1] ? 0 : 1),
      );
    }
    fila = siguiente;
  }

  return fila[otro.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// La Cita sobre la que se opera
// ─────────────────────────────────────────────────────────────────────────────

type Localizada = { ok: true; cita: CitaEnCorpus } | { ok: false; motivos: string[] };

/**
 * La Cita **publicada** con ese slug, o por qué no se puede operar sobre ella.
 *
 * Que esté en revisión merece su propio mensaje: no es una errata, es que quien la busca
 * está en la puerta equivocada, y la suya —`revisar --aprobar`— ya toma la Fuente al
 * aprobar.
 */
async function localizarPublicada(rutas: Rutas, slug: string): Promise<Localizada> {
  const publicadas = await leerCitas(rutas.citas);
  const cita = publicadas.find((c) => c.slug === slug);
  if (cita !== undefined) return { ok: true, cita };

  const enRevision = (await leerCitas(rutas.revision)).some((c) => c.slug === slug);
  return {
    ok: false,
    motivos: enRevision
      ? [
          `«${slug}» no está publicada: está en ${rutas.revision}.`,
          'Una candidata se documenta al aprobarla, que ya toma su Fuente:',
          `  npx tsx tools/revisar.ts --aprobar ${slug} --corpus ${rutas.raiz}`,
        ]
      : [
          `No hay ninguna Cita publicada con el slug «${slug}» en ${rutas.citas}.`,
          'Compruebe el slug: es el del frontmatter, no el nombre del fichero.',
        ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// El documento contra el que se coteja
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentoLeido {
  obra: string;
  /** El año de la Obra. Ausente cuando la Fuente declara traductor (Historia 19.1). */
  año?: number;
  /** La traducción que declara la Fuente, con el año que trae junto al traductor. */
  traduccion?: Traduccion;
  /**
   * Quién firma, según la declaración literal del documento.
   *
   * Ausente cuando no declara a nadie —o firma «Anónimo»—, que no es un fallo; y con
   * `nombres` vacío cuando declara algo que no se sabe interpretar, que sí lo es.
   */
  autor?: AutorDeLaFuente;
  url: string;
  idFuente: string;
  nombreDeLaFuente: string;
  licencia: string;
  cuerpo: string;
}

type LecturaDeDocumento =
  | { ok: true; documento: DocumentoLeido }
  | { ok: false; motivos: string[] };

/**
 * El documento ya recuperado, con las tres puertas de **procedencia** de `tools/extraer.ts`.
 *
 * Las mismas tres, y por el mismo motivo: mientras se admita cualquier fichero con forma
 * de cabecera, la superficie de tecleo solo se muda del frontmatter al `.txt`. Un fichero
 * compuesto a mano con `fuente: gutenberg` y `año: 1492` documentaría una Cita publicada
 * con esa Procedencia, que es exactamente lo que esta orden existe para impedir.
 *
 * De aquí sale también **quién firma el documento**, que es el lado de la Fuente en la
 * puerta del Autor. Quien la aplica es `documentarCita`, porque el otro lado —el nombre
 * del Corpus— lo trae la Cita y aquí todavía no se sabe cuál es.
 */
async function leerDocumento(
  rutas: Rutas,
  rutaDelDocumento: string,
): Promise<LecturaDeDocumento> {
  const enSuLugar = [
    `Recupérelo con: npx tsx tools/recuperar.ts <url de la Fuente> --corpus ${rutas.raiz}`,
    'No se ha escrito nada: ni la Cita ni el censo.',
  ];

  const dentro = relative(resolve(rutas.fuentes), resolve(rutaDelDocumento));
  if (dentro === '' || dentro.startsWith('..') || isAbsolute(dentro) || dentro.includes(sep)) {
    return {
      ok: false,
      motivos: [
        `«${rutaDelDocumento}» no está en ${rutas.fuentes}, así que no lo produjo la recuperación.`,
        ...enSuLugar,
      ],
    };
  }

  let contenido: string;
  try {
    contenido = await readFile(rutaDelDocumento, 'utf8');
  } catch {
    return { ok: false, motivos: [`No se pudo leer «${rutaDelDocumento}».`, ...enSuLugar] };
  }

  const analizado = analizarDocumento(contenido);
  if (analizado === undefined) {
    return {
      ok: false,
      motivos: [
        `«${rutaDelDocumento}» no tiene la forma de un documento de Fuente ` +
          '(cabecera, «---», declaración de la Fuente, «---» y cuerpo debajo).',
        ...enSuLugar,
      ],
    };
  }

  const { cabecera, declaracion, cuerpo } = analizado;

  const fuenteDeclarada = fuenteDeUrl(cabecera.url);
  if (fuenteDeclarada === undefined || fuenteDeclarada.id !== cabecera.fuente) {
    return {
      ok: false,
      motivos: [
        `La dirección «${cabecera.url}» no es de la Fuente «${cabecera.fuente}» ` +
          'ni de ninguna del conjunto cerrado.',
        ...enSuLugar,
      ],
    };
  }

  const utilizable = fuenteUtilizable(cabecera.fuente);
  if (!utilizable.ok) return { ok: false, motivos: [utilizable.motivo] };

  // La obra y el año salen de la declaración literal, no de la cabecera, con los mismos
  // lectores puros que corrieron al recuperar. La cabecera es registro de auditoría.
  const derivado = derivarDeLaDeclaracion(cabecera.fuente, declaracion);
  if (derivado.obra === undefined) {
    return {
      ok: false,
      motivos: [
        `«${rutaDelDocumento}» no declara ninguna obra que ${cabecera.fuente} sepa leer.`,
        'La obra sale de lo que la Fuente declara en el documento, no de su cabecera.',
        ...enSuLugar,
      ],
    };
  }

  const nombreEsperado = nombreDeDocumento(cabecera.fuente, derivado.obra, derivado.pagina);
  const nombreReal = basename(rutaDelDocumento, extname(rutaDelDocumento));
  if (extname(rutaDelDocumento) !== '.txt' || nombreEsperado !== nombreReal) {
    return {
      ok: false,
      motivos: [
        `El nombre «${nombreReal}» no es el que implica la obra que declara el documento ` +
          `(${nombreEsperado ?? 'la obra declarada no deja nombre utilizable'}).`,
        'Un documento que la recuperación produjo se llama siempre así; este no.',
        ...enSuLugar,
      ],
    };
  }

  const { traduccion } = procedenciaDeLaDerivacion(derivado);

  return {
    ok: true,
    documento: {
      obra: derivado.obra,
      ...(derivado.año !== undefined ? { año: derivado.año } : {}),
      // Historia 19.1: con traductor, el año que trae la Fuente es el de la traducción.
      ...(traduccion !== undefined ? { traduccion } : {}),
      ...(derivado.autor !== undefined ? { autor: derivado.autor } : {}),
      url: cabecera.url,
      idFuente: utilizable.fuente.id,
      nombreDeLaFuente: utilizable.fuente.nombre,
      licencia: utilizable.fuente.licencia,
      cuerpo,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Documentar
// ─────────────────────────────────────────────────────────────────────────────

export interface OpcionesDeDocumentacion {
  /**
   * El texto literal de la edición, cuando el publicado difiere de ella en signos.
   *
   * No es una bandera de comodidad: es la salida que la 11.2 ya ofrecía por escrito
   * —«corríjala contra su edición, o retírela»— y que hasta ahora no tenía orden. Lo que
   * la hace segura son sus dos guardas, que están en `documentarCita`: el texto nuevo
   * tiene que aparecer **literal en el documento**, y tiene que ser reconociblemente la
   * misma Cita que la publicada.
   */
  texto?: string;
  avisar?: Avisar;
}

/** Lo que se dice cuando no hay Cita ni censo que tocar porque el documento es de otro. */
const NI_LA_CITA_NI_EL_CENSO = 'No se ha escrito nada: ni la Cita ni el censo.';

/**
 * Por qué el documento **no** es de esta Cita, o nada si lo es.
 *
 * El lado de la Fuente ya viene leído; el del Corpus se lee aquí, de la ficha del Autor
 * que la Cita declara, porque `nombre` es el único dueño de cómo se llama un Autor. Se
 * consulta solo cuando el documento declara a alguien: si no declara a nadie no hay nada
 * que comparar, y exigir la ficha convertiría en fallo un caso que no lo es.
 */
async function motivoParaNoCotejarElAutor(
  rutas: Rutas,
  cita: CitaEnCorpus,
  declarado: AutorDeLaFuente,
  rutaDelDocumento: string,
): Promise<string[] | undefined> {
  if (declarado.nombres.length === 0) {
    return [
      `${rutaDelDocumento} declara un autor que no se sabe interpretar: ` +
        `«${declarado.crudo}».`,
      'No se coteja lo que no se entiende, y tampoco se da por no declarado: documentar ' +
        `«${cita.slug}» contra él la daría por verificada sin que nada lo respalde.`,
      NI_LA_CITA_NI_EL_CENSO,
    ];
  }

  let ficha: { slug: string; nombre?: string } | undefined;
  try {
    ficha = (await leerAutores(rutas)).find((a) => a.slug === cita.autor);
  } catch (fallo) {
    return [
      `No se pudieron leer los Autores de ${rutas.autores}: ` +
        `${fallo instanceof Error ? fallo.message : String(fallo)}`,
      `Sin la ficha de «${cita.autor}» no hay contra qué cotejar quien firma el documento.`,
      NI_LA_CITA_NI_EL_CENSO,
    ];
  }

  if (ficha === undefined) {
    return [
      `«${cita.slug}» dice ser de «${cita.autor}», y ese Autor no está en ${rutas.autores}.`,
      'El nombre del Autor lo declara su ficha, que es su único dueño, y sin ella no hay ' +
        'contra qué cotejar a quien firma el documento.',
      NI_LA_CITA_NI_EL_CENSO,
    ];
  }

  const nombreDelCorpus = ficha.nombre?.trim();
  if (nombreDelCorpus === undefined || nombreDelCorpus === '') {
    // Sin esto, la comparación llegaba a normalizar `undefined` y la orden salía por una
    // traza, que es lo que no hace ninguna otra rama de este módulo.
    return [
      `La ficha de «${cita.autor}» no declara ningún nombre, y el nombre es lo que el ` +
        'Corpus pone en el cotejo.',
      'Sin él no hay contra qué comparar lo que declare el documento.',
      NI_LA_CITA_NI_EL_CENSO,
    ];
  }

  // Basta con concordar con **uno** de los declarados: un documento firmado por dos es de
  // los dos. Comparar contra la unión de sus palabras admitiría a un tercero hecho de
  // pedazos de ambos.
  if (declarado.nombres.some((nombre) => esElMismoAutor(nombre, nombreDelCorpus))) {
    return undefined;
  }

  return [
    `${rutaDelDocumento} declara «${declarado.nombres.join('» y «')}» y «${cita.slug}» es ` +
      `de «${cita.autor}», que el Corpus llama «${nombreDelCorpus}». No son el mismo Autor.`,
    'Documentar ata una Cita a un documento **y la saca del censo de pendientes de ' +
      'cotejo**: hacerlo contra el documento de otro la dejaría mal atribuida y, además, ' +
      'registrada como verificada.',
    NI_LA_CITA_NI_EL_CENSO,
    `Documente «${cita.slug}» contra un documento de ${nombreDelCorpus}, o retírela con`,
    `  npx tsx tools/documentar.ts --retirar ${cita.slug} "<motivo>"`,
  ];
}

/**
 * Documenta una Cita publicada contra un documento ya recuperado.
 *
 * O todo o nada: si algo no cuadra, no se toca ni la Cita ni el censo. Y cuando cuadra, se
 * tocan **los dos**, porque una Cita que declara Fuente y sigue en el censo rompe la
 * construcción, y un slug del censo sin Cita publicada también.
 */
export async function documentarCita(
  rutas: Rutas,
  slug: string,
  rutaDelDocumento: string,
  opciones: OpcionesDeDocumentacion = {},
): Promise<Resultado> {
  const avisar = opciones.avisar ?? CALLAR;

  const localizada = await localizarPublicada(rutas, slug);
  if (!localizada.ok) return { ok: false, motivos: localizada.motivos };
  const { cita } = localizada;

  if (cita.fuente !== undefined && cita.fuente !== null) {
    return {
      ok: false,
      motivos: [
        `«${slug}» ya declara la Fuente «${cita.fuente.id}»: ya está documentada.`,
        'Documentar no sustituye una Fuente por otra. Para cambiarla, retírela primero y ' +
          'apruébela de nuevo desde revisión:',
        `  npx tsx tools/documentar.ts --retirar ${slug} "<motivo>" --corpus ${rutas.raiz}`,
      ],
    };
  }

  const lectura = await leerDocumento(rutas, rutaDelDocumento);
  if (!lectura.ok) return { ok: false, motivos: lectura.motivos };
  const { documento } = lectura;

  /*
   * ── Y que el documento sea de **este** Autor ──────────────────────────────
   *
   * Va antes del cotejo literal a propósito: cuando el documento es de otra persona, «su
   * texto no aparece aquí» es el síntoma y no la causa, y mandaría a corregir la Cita con
   * `--texto` cuando lo que hay que cambiar es el documento. El caso que abrió esta
   * puerta pasa **las dos**: una Cita de Montalvo contra «El sable», que declara a
   * González Prada y cuyo cuerpo contiene el texto, se documentaba con `ok: true`.
   *
   * Y no se quedaba en la atribución: documentar saca a la Cita de
   * `pendientes-de-cotejo.yml`, así que la Cita mal atribuida dejaba de estar marcada como
   * no verificada y quedaba registrada como cotejada, que es lo contrario de lo que había
   * pasado.
   *
   * Las tres decisiones son las de `extraer`, porque es la misma puerta: un documento que
   * no declara autor documenta igual —un metadato que falta no es un fallo, y el parte lo
   * dice—; uno que declara algo que no se sabe interpretar se niega, para que una puerta
   * muda no parezca una que aprueba; y con varios Autores declarados basta con que la Cita
   * concuerde con uno.
   */
  const declarado = documento.autor;

  if (declarado !== undefined) {
    const noCotejable = await motivoParaNoCotejarElAutor(rutas, cita, declarado, rutaDelDocumento);
    if (noCotejable !== undefined) return { ok: false, motivos: noCotejable };
  }

  // ── El cotejo, que es la puerta entera ────────────────────────────────────

  const corregido = opciones.texto?.trim();
  const textoFinal = corregido !== undefined && corregido !== '' ? corregido : cita.texto;

  if (!apareceEnDocumento(textoFinal, documento.cuerpo)) {
    return {
      ok: false,
      motivos:
        textoFinal === cita.texto
          ? [
              `«${slug}» no aparece en ${rutaDelDocumento}.`,
              'La comparación colapsa espacios y nada más. No se toca el texto de la Cita ' +
                'para que cuadre (NFR-12): corríjala contra su edición —con --texto "<el ' +
                'texto literal de la edición>"—, o retírela con',
              `  npx tsx tools/documentar.ts --retirar ${slug} "<motivo>"`,
              'No se ha escrito nada: ni la Cita ni el censo.',
            ]
          : [
              `El texto que da --texto no aparece en ${rutaDelDocumento}.`,
              'Corregir es restituir lo que la edición dice, así que lo que se teclee tiene ' +
                'que estar ahí literalmente; si no, sería inventarlo. La comparación ' +
                'colapsa espacios y nada más: cópielo del documento tal cual.',
              'No se ha escrito nada: ni la Cita ni el censo.',
            ],
    };
  }

  // ── Y, si se corrige, que siga siendo la misma Cita ───────────────────────

  const parecido = parecidoDeTextos(cita.texto, textoFinal);
  if (textoFinal !== cita.texto && parecido < MIN_PARECIDO_PARA_CORREGIR) {
    return {
      ok: false,
      motivos: [
        `El texto que da --texto aparece en ${rutaDelDocumento}, pero no es la misma Cita ` +
          `que «${slug}»: se parecen ${parecido.toFixed(2)} y hace falta al menos ` +
          `${MIN_PARECIDO_PARA_CORREGIR.toFixed(2)}.`,
        `  Publicada: «${cita.texto}»`,
        `  --texto:   «${textoFinal}»`,
        'Corregir restituye la puntuación o la letra de la edición; sustituir una Cita por ' +
          'otra del mismo documento es otra cosa, y no se hace por aquí. Si la publicada no ' +
          'es de esta edición, retírela y siembre la otra desde el documento.',
        'No se ha escrito nada: ni la Cita ni el censo.',
      ],
    };
  }

  // ── Lo que cambia, dicho antes de escribir ────────────────────────────────

  const cambios: string[] = [];

  const obraDeclarada = cita.procedencia?.obra;
  if (obraDeclarada !== undefined && obraDeclarada !== documento.obra) {
    cambios.push(
      `La obra cambia: declaraba «${obraDeclarada}» y el documento declara ` +
        `«${documento.obra}». Manda el documento.`,
    );
  }

  const añoDeclarado = cita.procedencia?.año;
  if (añoDeclarado !== documento.año) {
    cambios.push(
      `El año cambia: declaraba ${añoDeclarado ?? 'ninguno'} y el documento declara ` +
        `${documento.año ?? 'ninguno'}.`,
    );
  }

  const traduccionDeclarada = cita.procedencia?.traduccion;
  if (!mismaTraduccion(traduccionDeclarada, documento.traduccion)) {
    cambios.push(
      `La traducción cambia: declaraba ${describirTraduccion(traduccionDeclarada)} y el ` +
        `documento declara ${describirTraduccion(documento.traduccion)}.`,
    );
  }

  if (textoFinal !== cita.texto) {
    cambios.push(
      `El texto se corrige contra la edición (se parecen ${parecido.toFixed(2)}):`,
      `  antes:   «${cita.texto}»`,
      `  después: «${textoFinal}»`,
      // AD-4: el slug es la URL y no se recalcula. Que el texto ya no lo componga es
      // exactamente lo que ocurre con cualquier Cita cuyo texto se corrige, y el precio de
      // no romper los enlaces entrantes.
      `El slug sigue siendo «${slug}»: es la URL y no se recalcula (AD-4).`,
    );
  }

  // ── La Ficha de Obra, si la obra cambia — Historia 22.1 (AD-25) ───────────
  /*
   * Se **resuelve** antes de escribir nada, en solo lectura: si la ficha de la obra nueva no
   * se puede asegurar sin decidir, la Cita no se toca. Se escribe después de la Cita, y entra
   * en la vuelta atrás: si falla, la Cita y el censo vuelven a como estaban. El conjunto
   * publicado que se pasa es el de después, con esta Cita ya en su obra nueva.
   */
  let plan: PlanDeFicha | undefined;
  const avisosDeFicha: string[] = [];
  if (obraDeclarada !== documento.obra) {
    const publicadas = await leerCitas(rutas.citas);
    plan = await resolverFichaDeObra(rutas, {
      autor: cita.autor,
      obra: documento.obra,
      citasPublicadas: publicadas.map((c) =>
        c.slug === cita.slug ? { autor: c.autor, procedencia: { obra: documento.obra } } : c,
      ),
    });
    if (!plan.ok) {
      return {
        ok: false,
        motivos: [...plan.motivos, 'No se ha escrito nada: ni la Cita ni el censo.'],
      };
    }
    const descrito = describirPlan(plan);
    if (descrito !== undefined) cambios.push(descrito);

    /*
     * Y la ficha de la obra de antes, si se queda sin Citas: avisa en el build, y la orden
     * que la retira se dice aquí, que es donde se sabe por qué.
     */
    const formaAnterior = obraDeclarada === undefined ? '' : formaDeObra(obraDeclarada);
    if (formaAnterior !== '' && formaAnterior !== formaDeObra(documento.obra)) {
      try {
        const anterior = (await leerFichasDeObra(rutas)).find(
          (f) => f.autor === cita.autor && f.formas.includes(formaAnterior),
        );
        const sigueResuelta =
          anterior !== undefined &&
          publicadas.some(
            (c) =>
              c.slug !== cita.slug &&
              c.autor === anterior.autor &&
              typeof c.procedencia?.obra === 'string' &&
              anterior.formas.includes(formaDeObra(c.procedencia.obra)),
          );
        if (anterior !== undefined && !sigueResuelta) {
          avisosDeFicha.push(
            `La Ficha de Obra ${anterior.ruta} se queda sin Citas publicadas: el build avisará. ` +
              'Si la Obra salió del Corpus, retírela con',
            `  npm run obra -- retirar ${anterior.nombre} --motivo "<motivo>"`,
          );
        }
      } catch {
        // Si las fichas no se dejan leer, la puerta del build lo dirá; aquí solo se avisa.
      }
    }
  }

  for (const linea of cambios) avisar(linea);

  // ── Escribir: la Cita y el censo, o ninguno de los dos ────────────────────

  const bruto = await readFile(cita.ruta, 'utf8');
  const datos = separarFrontmatter(bruto);
  if (datos === null) {
    return { ok: false, motivos: [`El fichero ${cita.ruta} no tiene frontmatter.`] };
  }

  datos.texto = textoFinal;

  /*
   * La Procedencia se compone de lo derivado, no de lo que la Cita tuviera tecleado: es el
   * sentido entero de la orden. `referencia` sí se conserva porque no es ni obra ni año —es
   * la nota que alguien escribió para poder volver a la edición— y el documento no la
   * declara, así que derivarla sería borrarla.
   */
  const previa = (datos.procedencia ?? {}) as Record<string, unknown>;
  datos.procedencia = {
    obra: documento.obra,
    ...(documento.año !== undefined ? { año: documento.año } : {}),
    ...(typeof previa.referencia === 'string' ? { referencia: previa.referencia } : {}),
    // Historia 19.1: lo que la Fuente declara de su traducción, aparte del año de la Obra.
    ...(documento.traduccion !== undefined ? { traduccion: documento.traduccion } : {}),
  };

  datos.fuente = {
    id: documento.idFuente,
    nombre: documento.nombreDeLaFuente,
    licencia: documento.licencia,
    url: documento.url,
  };

  const censoAntes = await leerCensoBruto(rutas);
  const censoDespues =
    censoAntes === undefined ? undefined : censoSinLaCita(censoAntes, slug);

  /*
   * El censo primero y la Cita después, con vuelta atrás si la segunda falla.
   *
   * Los dos órdenes rompen la construcción si se quedan a medias —una Cita con Fuente
   * censada, o una Cita sin Fuente descensada—, así que lo que decide no es cuál va antes
   * sino que exista la vuelta atrás. Va antes el censo porque es el que se puede deshacer
   * con lo que ya se tiene en memoria, sin volver a leer nada.
   */
  if (censoDespues !== undefined) await escribirCenso(rutas, censoDespues);

  try {
    await escribirCita(dirname(cita.ruta), basename(cita.ruta, '.md'), datos);
  } catch (fallo) {
    if (censoAntes !== undefined && censoDespues !== undefined) {
      await escribirCenso(rutas, censoAntes);
    }
    return {
      ok: false,
      motivos: [
        `No se pudo escribir ${cita.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
        'El censo se ha dejado como estaba: la Cita y el censo siguen de acuerdo.',
      ],
    };
  }

  // La ficha, después de la Cita y dentro de la vuelta atrás (Historia 22.1).
  if (plan !== undefined) {
    const ficha = await aplicarFichaDeObra(rutas, plan);
    if (!ficha.ok) {
      await writeFile(cita.ruta, bruto, 'utf8');
      if (censoAntes !== undefined && censoDespues !== undefined) {
        await escribirCenso(rutas, censoAntes);
      }
      return {
        ok: false,
        motivos: [
          ...ficha.motivos,
          'La Cita y el censo se han dejado como estaban.',
        ],
      };
    }
  }
  for (const linea of avisosDeFicha) avisar(linea);

  const pendientes = (await leerCensoDeCotejo(rutas)).length;

  return {
    ok: true,
    ruta: cita.ruta,
    /*
     * Los cambios **no** se repiten aquí: ya salieron por `avisar` antes de escribir, que es
     * cuando sirven de algo. Volver a ponerlos en el mensaje final los imprimía dos veces
     * seguidas en la orden, y un parte que se repite se lee peor que uno que dice menos.
     */
    mensaje: [
      `«${slug}» queda documentada contra ${rutaDelDocumento}.`,
      `  Fuente:      ${documento.nombreDeLaFuente} (${documento.licencia})`,
      `  Procedencia: ${documento.obra}${documento.año !== undefined ? `, ${documento.año}` : ''}`,
      ...(documento.traduccion !== undefined
        ? [`  Traducción:  ${describirTraduccion(documento.traduccion)}`]
        : []),
      // Que se vea de qué lado quedó la puerta del Autor, y sobre todo cuándo **no**
      // actuó: una puerta muda que no se disparó se parece demasiado a una que aprobó.
      declarado === undefined
        ? `  Autor:       sin cotejar — el documento no declara autor, así que nada ` +
          `contradice a «${cita.autor}».`
        : `  Autor:       cotejado — el documento declara ` +
          `«${declarado.nombres.join('» y «')}».`,
      censoDespues === undefined
        ? `No estaba en el censo de ${FICHERO_DEL_CENSO}; siguen ${pendientes} pendientes.`
        : `Sale del censo de ${FICHERO_DEL_CENSO}: quedan ${pendientes} pendientes de cotejo.`,
    ].join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Retirar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retira una Cita publicada a `corpus/_revision/`, con su motivo.
 *
 * Mueve, nunca borra (AD-2): git conserva la historia y la Cita se puede volver a aprobar
 * el día que aparezca su edición. Y sale del censo si estaba, por lo mismo que documentar:
 * una exención que sobrevive a la Cita que la justificaba ampara mañana a otra que reutilice
 * el slug.
 *
 * **El motivo no se guarda en ningún fichero, y es deliberado.** No hay más almacén que git
 * (AD-10), así que el sitio del motivo es el mensaje del commit que mueve el fichero; un
 * registro de retiradas sería un segundo origen de verdad sobre algo que `git log` ya
 * cuenta mejor. Que la orden lo exija es lo que impide que la retirada ocurra sin que nadie
 * lo haya pensado, y que lo devuelva escrito es para poder copiarlo al commit.
 */
export async function retirarCita(
  rutas: Rutas,
  slug: string,
  motivo: string,
): Promise<Resultado> {
  if (motivo.trim() === '') {
    return {
      ok: false,
      motivos: [
        'Una retirada sin motivo no es una retirada: es una desaparición.',
        `  npx tsx tools/documentar.ts --retirar ${slug} "<motivo>"`,
      ],
    };
  }

  const localizada = await localizarPublicada(rutas, slug);
  if (!localizada.ok) return { ok: false, motivos: localizada.motivos };
  const { cita } = localizada;

  const censoAntes = await leerCensoBruto(rutas);
  const censoDespues =
    censoAntes === undefined ? undefined : censoSinLaCita(censoAntes, slug);

  if (censoDespues !== undefined) await escribirCenso(rutas, censoDespues);

  let destino: string;
  try {
    // `mover` nunca sobrescribe: si en revisión ya hay un fichero con ese nombre, se para
    // aquí antes de que una Cita publicada se evapore encima de otra.
    destino = await mover(cita.ruta, rutas.revision);
  } catch (fallo) {
    if (censoAntes !== undefined && censoDespues !== undefined) {
      await escribirCenso(rutas, censoAntes);
    }
    return {
      ok: false,
      motivos: [
        `No se pudo retirar ${cita.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
        'El censo se ha dejado como estaba: la Cita sigue publicada y sigue censada.',
      ],
    };
  }

  const pendientes = (await leerCensoDeCotejo(rutas)).length;

  return {
    ok: true,
    ruta: destino,
    mensaje: [
      `«${slug}» retirada a ${rutas.revision} el ${fechaLocal(new Date())}.`,
      `  Motivo: ${motivo.trim()}`,
      `  Huella del texto retirado: ${huellaDeTexto(cita.texto)}`,
      censoDespues === undefined
        ? `No estaba en el censo de ${FICHERO_DEL_CENSO}; siguen ${pendientes} pendientes.`
        : `Sale del censo de ${FICHERO_DEL_CENSO}: quedan ${pendientes} pendientes de cotejo.`,
      'No se ha borrado nada. El motivo va en el mensaje del commit: git es el único ' +
        'almacén del contenido (AD-10).',
    ].join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Restituir la traducción — Historia 19.1
// ─────────────────────────────────────────────────────────────────────────────

/** Si dos traducciones declaran lo mismo. Dos ausentes son la misma. */
export function mismaTraduccion(a: Traduccion | undefined, b: Traduccion | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.traductor === b.traductor && a.año === b.año;
}

/** La traducción como se dice en un parte: «Germán Salinas», 1909, o «ninguna». */
export function describirTraduccion(traduccion: Traduccion | undefined): string {
  if (traduccion === undefined) return 'ninguna';
  return `«${traduccion.traductor}»${traduccion.año !== undefined ? `, ${traduccion.año}` : ', sin año'}`;
}

/** «1 Cita», «2 Citas»: el parte concuerda en número. */
export function citas(n: number, singular = 'Cita', plural = 'Citas'): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Lo que la restitución lee de un documento versionado. */
export interface DocumentoDeclarado {
  fuente: string;
  declaracion: string;
  cuerpo: string;
}

/** Lo que la restitución lee de una Cita, publicada o candidata. */
export interface CitaParaRestituir {
  slug: string;
  texto: string;
  fuente?: { id: string } | null;
  procedencia?: {
    obra?: string;
    año?: number;
    referencia?: string;
    traduccion?: Traduccion;
  } | null;
}

export type RestitucionDeTraduccion =
  /** Sin documento, o su documento no declara traductor: no hay nada que restituir. */
  | { tipo: 'nada' }
  /** Ya declara lo que el documento declara: una segunda pasada no cambia nada. */
  | { tipo: 'igual' }
  | {
      tipo: 'cambia';
      obra: string;
      procedencia: {
        obra: string;
        año?: number;
        referencia?: string;
        traduccion: Traduccion;
      };
      /** Si el año publicado pasó a ser el de la traducción. */
      añoMovido: boolean;
    }
  /** Block If de la historia: no se toca, se lista y la orden sigue. */
  | { tipo: 'omitida'; obra: string; motivo: string };

/**
 * Qué le toca a una Cita al restituir su traducción. **Puro**: no lee ni escribe.
 *
 * El documento es el de su obra (`documentosDeCita`, el mismo que coteja el build) en el que
 * su texto aparece literal: una obra paginada tiene un documento por página, y la traducción
 * se lee de la página de la que salió. Se lista sin tocarla, y la orden sigue:
 *
 *   · la Cita cuyo texto aparece en varias páginas que declaran traducciones distintas;
 *   · la que ya trae una traducción distinta de la que declara el documento —nunca se
 *     sobrescribe lo que alguien escribió—;
 *   · la que publica un año distinto del que el documento declara junto al traductor.
 *
 * El año publicado igual al de la traducción deja de ser el de la Obra. Cuando el documento
 * no declara año de traducción, el que la Cita trae se conserva. Nunca se infiere nada.
 */
export function restitucionDeTraduccion(
  cita: CitaParaRestituir,
  documentos: ReadonlyMap<string, DocumentoDeclarado>,
): RestitucionDeTraduccion {
  const procedencia = cita.procedencia ?? undefined;
  const obra = procedencia?.obra;
  const fuente = cita.fuente ?? undefined;
  if (fuente === undefined || obra === undefined) return { tipo: 'nada' };

  const suyos = documentosDeCita(fuente, obra, documentos)
    .map((nombre) => documentos.get(nombre))
    .filter((d): d is DocumentoDeclarado => d !== undefined && apareceEnDocumento(cita.texto, d.cuerpo));
  if (suyos.length === 0) return { tipo: 'nada' };

  const declaradas = suyos.map(
    (d) => procedenciaDeLaDerivacion(derivarDeLaDeclaracion(d.fuente, d.declaracion)).traduccion,
  );
  const [primera] = declaradas;
  if (!declaradas.every((t) => mismaTraduccion(t, primera))) {
    return {
      tipo: 'omitida',
      obra,
      motivo:
        `su texto aparece en ${suyos.length} documentos de «${obra}» que no declaran la misma ` +
        `traducción (${declaradas.map(describirTraduccion).join('; ')}).`,
    };
  }
  if (primera === undefined) return { tipo: 'nada' };

  const previa = procedencia?.traduccion;
  if (previa !== undefined && !mismaTraduccion(previa, primera)) {
    return {
      tipo: 'omitida',
      obra,
      motivo:
        `ya declara la traducción ${describirTraduccion(previa)} y su documento declara ` +
        `${describirTraduccion(primera)}. No se sobrescribe.`,
    };
  }

  const publicado = procedencia?.año;
  if (publicado !== undefined && primera.año !== undefined && publicado !== primera.año) {
    return {
      tipo: 'omitida',
      obra,
      motivo:
        `publica el año ${publicado} y su documento declara ${primera.año} junto al traductor ` +
        `«${primera.traductor}». No se sabe de qué es el publicado, así que no se toca.`,
    };
  }

  const añoMovido = publicado !== undefined && publicado === primera.año;
  if (!añoMovido && previa !== undefined) return { tipo: 'igual' };

  return {
    tipo: 'cambia',
    obra,
    procedencia: {
      obra,
      ...(publicado !== undefined && !añoMovido ? { año: publicado } : {}),
      ...(procedencia?.referencia !== undefined ? { referencia: procedencia.referencia } : {}),
      traduccion: primera,
    },
    añoMovido,
  };
}

/** Lo que se hizo con una obra, para el parte. */
export interface InformeDeObra {
  obra: string;
  cambiadas: number;
  conAñoMovido: number;
}

interface Pendiente {
  ruta: string;
  slug: string;
  obra: string;
  añoMovido: boolean;
  datos: Record<string, unknown>;
  enRevision: boolean;
}

/**
 * Restituye la traducción de las Citas publicadas **y de las candidatas de revisión** cuyo
 * documento la declara.
 *
 * Las candidatas entran porque se extrajeron antes de la 19.1 con el año de la traducción
 * como año de la Obra, y aprobarlas así lo publicaría. Se cuentan aparte.
 *
 * No toca ninguna Cita sin documento, ni el texto, ni el slug: reescribe la Procedencia y
 * nada más. **Primero se decide todo y después se escribe**, así que un rechazo no deja nada
 * a medias; si una escritura falla, el parte dice cuáles se escribieron. Es idempotente.
 */
export async function restituirTraducciones(rutas: Rutas): Promise<Resultado> {
  const [publicadas, candidatas, documentos] = await Promise.all([
    leerCitas(rutas.citas),
    leerCitas(rutas.revision),
    leerDocumentosDeclarados(rutas),
  ]);

  const pendientes: Pendiente[] = [];
  const omitidas: string[] = [];
  let iguales = 0;

  for (const [lote, enRevision] of [
    [publicadas, false],
    [candidatas, true],
  ] as const) {
    for (const cita of lote) {
      const restitucion = restitucionDeTraduccion(cita as CitaParaRestituir, documentos);
      if (restitucion.tipo === 'nada') continue;
      if (restitucion.tipo === 'igual') {
        iguales += 1;
        continue;
      }
      const donde = enRevision ? ' (candidata)' : '';
      if (restitucion.tipo === 'omitida') {
        omitidas.push(`  ${cita.slug}${donde}: ${restitucion.motivo}`);
        continue;
      }

      const datos = separarFrontmatter(await readFile(cita.ruta, 'utf8'));
      if (datos === null) {
        omitidas.push(`  ${cita.slug}${donde}: ${cita.ruta} no tiene frontmatter.`);
        continue;
      }
      datos.procedencia = restitucion.procedencia;
      pendientes.push({
        ruta: cita.ruta,
        slug: cita.slug,
        obra: restitucion.obra,
        añoMovido: restitucion.añoMovido,
        datos,
        enRevision,
      });
    }
  }

  const escritas: Pendiente[] = [];
  for (const pendiente of pendientes) {
    try {
      await escribirCita(dirname(pendiente.ruta), basename(pendiente.ruta, '.md'), pendiente.datos);
      escritas.push(pendiente);
    } catch (fallo) {
      return {
        ok: false,
        motivos: [
          `No se pudo escribir ${pendiente.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
          escritas.length === 0
            ? 'No se había escrito ninguna antes.'
            : `Ya se habían escrito ${citas(escritas.length)}:`,
          ...escritas.map((e) => `  ${e.ruta}`),
          'Volver a correr la orden termina lo que falta: es idempotente.',
        ],
      };
    }
  }

  const porObra = new Map<string, InformeDeObra>();
  for (const e of escritas.filter((p) => !p.enRevision)) {
    const informe = porObra.get(e.obra) ?? { obra: e.obra, cambiadas: 0, conAñoMovido: 0 };
    informe.cambiadas += 1;
    if (e.añoMovido) informe.conAñoMovido += 1;
    porObra.set(e.obra, informe);
  }
  const informe = [...porObra.values()].sort(
    (a, b) => b.cambiadas - a.cambiadas || a.obra.localeCompare(b.obra, 'es'),
  );
  const total = informe.reduce((suma, o) => suma + o.cambiadas, 0);
  const movidas = informe.reduce((suma, o) => suma + o.conAñoMovido, 0);
  const deRevision = escritas.filter((p) => p.enRevision);
  const deRevisionMovidas = deRevision.filter((p) => p.añoMovido).length;

  return {
    ok: true,
    ruta: rutas.citas,
    mensaje: [
      `Traducción restituida en ${citas(total, 'Cita publicada', 'Citas publicadas')}` +
        (total === 0 ? '.' : `, ${movidas} con el año publicado movido a la traducción:`),
      ...informe.map(
        (o) =>
          `  ${o.obra}: ${o.cambiadas}` +
          (o.conAñoMovido > 0 ? ` (${o.conAñoMovido} con el año movido)` : ''),
      ),
      `Candidatas de revisión restituidas: ${deRevision.length}` +
        (deRevisionMovidas > 0 ? ` (${deRevisionMovidas} con el año movido).` : '.'),
      ...(iguales > 0 ? [`Ya restituidas, sin cambios: ${iguales}.`] : []),
      ...(omitidas.length > 0
        ? [`No se han tocado ${citas(omitidas.length)}, y hay que mirarlas:`, ...omitidas]
        : []),
      'Ni el texto ni el slug han cambiado. El cambio del corpus va en un commit propio.',
    ].join('\n'),
  };
}
