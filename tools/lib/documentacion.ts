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
import { MIN_PARECIDO_PARA_CORREGIR, parecidoDeTextos } from './parecido.ts';
import {
  apareceEnDocumento,
  candidatosDeLosSaltos,
  censoSinLaCita,
  colapsarEspacios,
  documentoDeCita,
  documentosDeCita,
  documentosLegibles,
  FICHERO_DEL_CENSO,
  huellaDeTexto,
} from './cotejo.ts';
import {
  conLaLineaDeTexto,
  escribirCenso,
  escribirCita,
  fechaLocal,
  leerAutores,
  leerCensoBruto,
  leerCensoDeCotejo,
  leerCitas,
  leerDocumentosDeclarados,
  leerDocumentosParaElCotejo,
  leerFichasDeObra,
  mover,
  separarFrontmatter,
  type CitaEnCorpus,
  type Rutas,
} from './corpus.ts';
import {
  analizarDocumento,
  CLASE_BIOGRAFIA,
  derivarDeLaDeclaracion,
  esElMismoAutor,
  nombreDeDocumento,
  procedenciaDeLaDerivacion,
  type AutorDeLaFuente,
} from './documento.ts';
import type { Traduccion } from '../../src/lib/admision.ts';
import { fuenteUtilizable } from './extraccion.ts';
import {
  ajustarTitulosDeObra,
  aplicarFichaDeObra,
  describirPlan,
  resolverFichaDeObra,
  type PlanDeFicha,
} from './obras.ts';
import { formaDeObra } from '../../src/lib/obras.ts';
import { fuenteDeUrl } from './fuentes.ts';
import type { Resultado } from './gestion.ts';
import { negativaPorAlcance } from './alcance.ts';
import {
  documentoParaLosSaltos,
  FORMAS_DE_LINEAS,
  formaDeLasLineas,
  parteDeSaltosDescartados,
  saltosDeLaCita,
  textoConSaltos,
  type FormaDeLineas,
} from './lineas.ts';
import { relacionDeSuperficies } from './cambios.ts';
import { rutasAvisadasPor } from './avisar.ts';
import { corpusParaFechar } from '../../integraciones/historial.ts';

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
  /** Historia 29.1 — el nombre del documento, sin extensión, y su `lineas:` en crudo. */
  nombre: string;
  lineas?: string;
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

  // Historia 17.1 — una Cita no se ata nunca a una biografía, aunque esté mal colocada.
  if (analizado.cabecera.clase === CLASE_BIOGRAFIA) {
    return {
      ok: false,
      motivos: [
        `«${rutaDelDocumento}» es un documento de biografía (clase: biografia): no documenta ` +
          'ninguna Cita. Su sitio es corpus/biografias/.',
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
      nombre: basename(rutaDelDocumento, extname(rutaDelDocumento)),
      ...(cabecera.lineas !== undefined ? { lineas: cabecera.lineas } : {}),
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

  /*
   * ── El texto que se escribe: con los saltos del documento de verso — Historia 29.1 ──
   *
   * Lo escribe `textoConSaltos`, el escritor único, también con `--texto`: los saltos salen del
   * documento de verso de la Cita (el primero de su obra, en el orden de `documentosDeCita`, en
   * que el texto se localiza), nunca de lo tecleado. Un salto tecleado sin respaldo se pierde y
   * el parte lo dice.
   */
  let declarados: Awaited<ReturnType<typeof leerDocumentosDeclarados>>;
  try {
    declarados = await leerDocumentosDeclarados(rutas);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [
        `corpus/fuentes/ no se deja leer (${(fallo as Error).message}): sin los documentos no se ` +
          'sabe de cuál salen los saltos de verso. No se ha escrito nada.',
      ],
    };
  }
  const nombres = documentosDeCita({ id: documento.idFuente }, documento.obra, declarados);
  if (!nombres.includes(documento.nombre)) nombres.unshift(documento.nombre);
  const candidatos = nombres.map((nombre) => {
    if (nombre === documento.nombre) {
      return { nombre, cuerpo: documento.cuerpo, ...(documento.lineas !== undefined ? { lineas: documento.lineas } : {}) };
    }
    const d = declarados.get(nombre)!;
    return { nombre, cuerpo: d.cuerpo, ...(d.lineas !== undefined ? { lineas: d.lineas } : {}) };
  });
  const escrito = textoConSaltos(textoFinal, documentoParaLosSaltos(textoFinal, candidatos));
  const textoEscrito = escrito.texto;

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

  const saltosDescartados = parteDeSaltosDescartados(escrito.descartados);
  if (saltosDescartados !== undefined) cambios.push(saltosDescartados);
  if (textoEscrito !== cita.texto && colapsarEspacios(textoEscrito) === colapsarEspacios(cita.texto)) {
    // Lo que dice el parte es la diferencia con lo publicado, no los saltos que acaba teniendo.
    const antes = (cita.texto.match(/\n/gu) ?? []).length;
    const despues = (textoEscrito.match(/\n/gu) ?? []).length;
    const diferencia = Math.abs(despues - antes);
    const cuantos = `${diferencia} ${diferencia === 1 ? 'salto' : 'saltos'} de verso`;
    cambios.push(
      despues > antes
        ? `El texto toma ${cuantos} de su documento; no cambia ninguna letra ni ningún signo.`
        : despues < antes
          ? `El texto pierde ${cuantos} que su documento no respalda; no cambia ninguna letra ni ningún signo.`
          : 'El texto mueve sus saltos de verso a donde los parte su documento; no cambia ninguna letra ni ningún signo.',
    );
  }
  if (colapsarEspacios(textoEscrito) !== colapsarEspacios(cita.texto)) {
    cambios.push(
      `El texto se corrige contra la edición (se parecen ${parecido.toFixed(2)}):`,
      `  antes:   «${cita.texto}»`,
      `  después: «${textoEscrito}»`,
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

  datos.texto = textoEscrito;

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

  /*
   * Historia 22.2 — el título de la ficha, en el mismo gesto: si la grafía que lo sostenía
   * era la de esta Cita y ya no la declara nadie, pasa a la grafía por omisión. Se mira la
   * ficha de antes y la de ahora, que son la misma cuando solo cambia la grafía.
   */
  if (obraDeclarada !== documento.obra) {
    const formas = [formaDeObra(documento.obra)];
    if (obraDeclarada !== undefined) formas.push(formaDeObra(obraDeclarada));
    for (const linea of await ajustarTitulosDeObra(rutas, cita.autor, formas)) avisar(linea);
  }

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

  /*
   * Historia 26.8 — NFR-5, antes de tocar nada: si al retirarla otra Cita queda fuera de alcance
   * (su Tema cae bajo el umbral, una Colección deja de publicarse, una página se corre), se niega
   * nombrándola. La que se retira no cuenta: sale del sitio, no queda fuera de alcance.
   */
  const negativa = await negativaPorAlcance(rutas, (datos) => ({
    ...datos,
    citas: datos.citas.filter((c) => c.slug !== cita.slug),
  }));
  if (negativa !== undefined) return negativa;

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

  // Historia 22.2 — si esta Cita era la que sostenía el título de su ficha, se pone al día.
  const obraRetirada = cita.procedencia?.obra;
  const titulos =
    typeof obraRetirada === 'string' && formaDeObra(obraRetirada) !== ''
      ? await ajustarTitulosDeObra(rutas, cita.autor, [formaDeObra(obraRetirada)])
      : [];

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
      ...titulos,
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

// ─────────────────────────────────────────────────────────────────────────────
// La restitución de los saltos de verso — Historia 29.2
// ─────────────────────────────────────────────────────────────────────────────

export interface OpcionesDeRestitucionDeSaltos {
  /** Solo estas Citas, publicadas o candidatas. Sin ellas, todas. */
  slugs?: readonly string[];
  /** Decide y da el parte, sin escribir nada. */
  seco?: boolean;
}

/** Por qué una Cita se queda en una línea: el motivo del parte. */
const MOTIVOS_DE_CONSERVAR = {
  'sin-documento': 'sin documento',
  'no-se-localiza': 'no se localiza en su documento',
  prosa: 'documento en prosa',
  'sin-saltos': 'documento sin saltos en su tramo',
} as const;

type MotivoDeConservar = keyof typeof MOTIVOS_DE_CONSERVAR;

interface SaltoPendiente {
  ruta: string;
  slug: string;
  enRevision: boolean;
  documento: string;
  forma: FormaDeLineas;
  original: string;
  nuevo: string;
  antes: Record<string, unknown>;
  despues: Record<string, unknown>;
}

interface Lote {
  restituidas: SaltoPendiente[];
  ya: number;
  conservan: Map<MotivoDeConservar, number>;
  /** Por forma, las que conservan por estar en prosa. */
  enProsa: Map<FormaDeLineas, number>;
  conflictos: string[];
  /** Lo que se dice de cada Cita nombrada que no se restituye. */
  nombradas: string[];
}

function loteVacio(): Lote {
  return { restituidas: [], ya: 0, conservan: new Map(), enProsa: new Map(), conflictos: [], nombradas: [] };
}

/**
 * Restituye los saltos de verso de las Citas publicadas **y, aparte, de las candidatas** desde su
 * documento — Historia 29.2, AD-29.
 *
 * Decide con `saltosDeLaCita`, la misma función que la regla 4 de la puerta del cotejo, así que
 * tras correr la orden el build pasa. Reescribe solo la línea `texto:` de cada fichero, y solo si
 * lo nuevo colapsa a lo mismo que lo publicado (NFR-12); slug, nombre de fichero y URL no cambian.
 * **Primero se decide todo y después se escribe**; si una escritura falla, lo ya escrito en la
 * pasada vuelve a su contenido original. Con `seco`, el mismo parte y nada escrito. Idempotente.
 */
export async function restituirSaltos(
  rutas: Rutas,
  opciones: OpcionesDeRestitucionDeSaltos = {},
): Promise<Resultado> {
  const inicio = Date.now();
  const seco = opciones.seco === true;
  const nombradas = opciones.slugs === undefined ? undefined : new Set(opciones.slugs);

  let publicadas: CitaEnCorpus[];
  let candidatas: CitaEnCorpus[];
  let leidos: Awaited<ReturnType<typeof leerDocumentosParaElCotejo>>;
  let censo: string[];
  try {
    [publicadas, candidatas, leidos, censo] = await Promise.all([
      leerCitas(rutas.citas),
      leerCitas(rutas.revision),
      leerDocumentosParaElCotejo(rutas),
      leerCensoDeCotejo(rutas),
    ]);
  } catch (fallo) {
    return {
      ok: false,
      motivos: [
        `El Corpus no se deja leer (${fallo instanceof Error ? fallo.message : String(fallo)}): ` +
          'sin él no se sabe qué saltos le tocan a cada Cita. No se ha escrito nada.',
      ],
    };
  }
  const { documentos, lineasDeclaradas } = leidos;
  const enCenso = new Set(censo);

  if (nombradas !== undefined) {
    const conocidas = new Set([...publicadas, ...candidatas].map((c) => c.slug));
    const desconocidas = [...nombradas].filter((s) => !conocidas.has(s));
    if (desconocidas.length > 0) {
      return {
        ok: false,
        motivos: [
          `No ${desconocidas.length === 1 ? 'es' : 'son'} de ninguna Cita publicada ni candidata: ` +
            `«${desconocidas.join('», «')}». No se ha escrito nada.`,
        ],
      };
    }
  }

  // Lo que se calcula una vez por documento, aunque lo pregunten miles de Citas: los mismos
  // candidatos que arma la regla 4 del cotejo (`candidatosDeLosSaltos`).
  const { candidatos: conForma } = candidatosDeLosSaltos(documentos, lineasDeclaradas);
  const porObra = new Map<string, string[]>();
  const legiblesDe = (cita: CitaEnCorpus): string[] => {
    if (enCenso.has(cita.slug) || cita.fuente === undefined) return [];
    const corto = documentoDeCita(cita.fuente, cita.procedencia?.obra);
    if (corto === undefined) return [];
    let nombres = porObra.get(corto);
    if (nombres === undefined) {
      nombres = documentosLegibles(documentosDeCita(cita.fuente, cita.procedencia?.obra, documentos), documentos);
      porObra.set(corto, nombres);
    }
    return nombres;
  };

  const sinDocumentoNombradas: string[] = [];
  const lotes = { publicadas: loteVacio(), candidatas: loteVacio() };
  for (const [citasDelLote, enRevision] of [
    [publicadas, false],
    [candidatas, true],
  ] as const) {
    const lote = enRevision ? lotes.candidatas : lotes.publicadas;
    for (const cita of citasDelLote) {
      if (nombradas !== undefined && !nombradas.has(cita.slug)) continue;
      if (typeof cita.texto !== 'string') continue;
      const legibles = legiblesDe(cita);
      const decision = saltosDeLaCita(cita.texto, conForma(legibles));
      const enumerar = (nombres: readonly string[]) => nombres.map((n) => `corpus/fuentes/${n}.txt`).join(', ');

      if (decision.tipo === 'conflicto') {
        lote.conflictos.push(
          `  ${cita.slug}: sus documentos de verso le dan saltos distintos (${enumerar(decision.documentos)}).`,
        );
        continue;
      }
      if (decision.tipo !== 'saltos') {
        lote.conservan.set(decision.tipo, (lote.conservan.get(decision.tipo) ?? 0) + 1);
        if (decision.tipo === 'prosa') {
          lote.enProsa.set(decision.forma, (lote.enProsa.get(decision.forma) ?? 0) + 1);
        }
        if (nombradas !== undefined) {
          if (decision.tipo === 'sin-documento') sinDocumentoNombradas.push(cita.slug);
          lote.nombradas.push(
            `  ${cita.slug}: se queda en una línea, ${MOTIVOS_DE_CONSERVAR[decision.tipo]}` +
              (decision.tipo === 'prosa' ? ` (${decision.forma}, ${enumerar([decision.documento])})` : '') +
              (decision.tipo === 'sin-saltos' ? ` (${enumerar([decision.documento])})` : '') +
              '.',
          );
        }
        continue;
      }
      if (decision.texto === cita.texto) {
        lote.ya += 1;
        continue;
      }
      // NFR-12: lo escrito colapsa a lo publicado, letra a letra y signo a signo.
      if (colapsarEspacios(decision.texto) !== colapsarEspacios(cita.texto)) {
        lote.conflictos.push(
          `  ${cita.slug}: lo restituido no colapsa a lo publicado (${enumerar([decision.documento])}); ` +
            'no se toca.',
        );
        continue;
      }
      let original: string;
      try {
        original = await readFile(cita.ruta, 'utf8');
      } catch (fallo) {
        return {
          ok: false,
          motivos: [
            `El Corpus no se deja leer (${cita.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}): ` +
              'sin él no se sabe qué saltos le tocan a cada Cita. No se ha escrito nada.',
          ],
        };
      }
      const nuevo = conLaLineaDeTexto(original, cita.texto, decision.texto);
      const antes = nuevo === undefined ? null : separarFrontmatter(original);
      const despues = nuevo === undefined ? null : separarFrontmatter(nuevo);
      if (nuevo === undefined || antes === null || despues === null || despues.texto !== decision.texto) {
        lote.conflictos.push(
          `  ${cita.slug}: ${cita.ruta} no tiene una sola línea «texto:» como la escribe el Corpus; ` +
            'no se toca.',
        );
        continue;
      }
      lote.restituidas.push({
        ruta: cita.ruta,
        slug: cita.slug,
        enRevision,
        documento: decision.documento,
        forma: decision.forma,
        original,
        nuevo,
        antes,
        despues,
      });
    }
  }

  if (sinDocumentoNombradas.length > 0) {
    return {
      ok: false,
      motivos: [
        `${sinDocumentoNombradas.length === 1 ? 'La Cita nombrada no tiene' : 'Las Citas nombradas no tienen'} ` +
          `documento del que salgan sus saltos: «${sinDocumentoNombradas.join('», «')}». ` +
          'No se ha escrito nada.',
      ],
    };
  }

  // Qué superficies cambian de fecha: la relación de AD-27, con el comparador de campos.
  const cambios = lotes.publicadas.restituidas.map((p) => ({
    fichero: resolve(p.ruta),
    antes: p.antes,
    despues: p.despues,
  }));
  const porFamilia = new Map<string, number>();
  if (cambios.length > 0) {
    // Se cuenta **antes** de escribir: solo cambia `texto`, que no mueve ninguna arista de la
    // relación, y un fallo aquí no puede dejar escrito lo que el código 1 dice que no se escribió.
    try {
      const corpus = await corpusParaFechar(rutas.raiz, { corpus: rutas.raiz });
      const relacion = relacionDeSuperficies(corpus);
      for (const ruta of rutasAvisadasPor(cambios, relacion)) {
        const familia = relacion.get(ruta)?.familia ?? 'sin familia';
        porFamilia.set(familia, (porFamilia.get(familia) ?? 0) + 1);
      }
    } catch (fallo) {
      return {
        ok: false,
        motivos: [
          `No se pueden contar las superficies que cambian de fecha (${fallo instanceof Error ? fallo.message : String(fallo)}): ` +
            'el Corpus no se deja leer entero. No se ha escrito nada.',
        ],
      };
    }
  }
  const pendientes = [...lotes.publicadas.restituidas, ...lotes.candidatas.restituidas];
  const escritas: SaltoPendiente[] = [];
  if (!seco) {
    for (const pendiente of pendientes) {
      let escribiendo = false;
      try {
        // Lo decidido se decidió sobre `original`: si el fichero cambió entretanto (otra sesión en
        // el mismo checkout), escribir encima perdería ese cambio.
        if ((await readFile(pendiente.ruta, 'utf8')) !== pendiente.original) {
          throw new Error('ha cambiado desde que se decidió; vuelva a correr la orden');
        }
        escribiendo = true;
        await writeFile(pendiente.ruta, pendiente.nuevo, 'utf8');
        escritas.push(pendiente);
      } catch (fallo) {
        const sinDeshacer: string[] = [];
        // Una escritura que falla a medias (disco lleno, E/S) puede dejar truncado el propio
        // fichero: vuelve también a su original. Si falló antes de escribir, no se toca.
        if (escribiendo) {
          try {
            if ((await readFile(pendiente.ruta, 'utf8')) !== pendiente.original) {
              await writeFile(pendiente.ruta, pendiente.original, 'utf8');
            }
          } catch {
            sinDeshacer.push(`  ${pendiente.ruta}`);
          }
        }
        for (const escrita of escritas) {
          try {
            await writeFile(escrita.ruta, escrita.original, 'utf8');
          } catch {
            sinDeshacer.push(`  ${escrita.ruta}`);
          }
        }
        return {
          ok: false,
          motivos: [
            `No se pudo escribir ${pendiente.ruta}: ${fallo instanceof Error ? fallo.message : String(fallo)}`,
            sinDeshacer.length > 0
              ? 'No se pudieron devolver a su contenido original, y hay que mirarlas:'
              : escritas.length === 0
                ? 'No se había escrito ninguna antes: no queda nada escrito.'
                : `Las ${citas(escritas.length)} ya escritas en esta pasada han vuelto a su contenido original: no queda nada escrito.`,
            ...sinDeshacer,
          ],
        };
      }
    }
  }

  const paginasDeCita = porFamilia.get('cita') ?? 0;
  const listados = [...porFamilia].filter(([f]) => f !== 'cita').sort(([a], [b]) => a.localeCompare(b, 'es'));
  const totalListados = listados.reduce((s, [, n]) => s + n, 0);

  const parteDelLote = (titulo: string, lote: Lote, conDetalle: boolean): string[] => {
    const porForma = FORMAS_DE_LINEAS.map((f) => [f, lote.restituidas.filter((r) => r.forma === f).length] as const).filter(
      ([, n]) => n > 0,
    );
    const docs = new Set(lote.restituidas.map((r) => r.documento)).size;
    const conservan = (Object.keys(MOTIVOS_DE_CONSERVAR) as MotivoDeConservar[])
      .map((m) => [m, lote.conservan.get(m) ?? 0] as const)
      .filter(([, n]) => n > 0);
    return [
      `${titulo}:`,
      `  ${seco ? 'Ganarían saltos' : 'Restituidas'}: ${lote.restituidas.length}` +
        (lote.restituidas.length === 0
          ? '.'
          : `, de ${docs} ${docs === 1 ? 'documento' : 'documentos'} (${porForma.map(([f, n]) => `${f}: ${n}`).join(', ')}).`),
      ...(conDetalle
        ? lote.restituidas.map(
            (r) => `    ${r.slug} — corpus/fuentes/${r.documento}.txt, ${String(r.despues.texto).split('\n').length} versos`,
          )
        : []),
      `  Ya restituidas, sin cambios: ${lote.ya}.`,
      `  Conservan el texto en una línea: ${[...lote.conservan.values()].reduce((s, n) => s + n, 0)}` +
        (conservan.length === 0 ? '.' : ':'),
      ...conservan.map(
        ([m, n]) =>
          `    ${MOTIVOS_DE_CONSERVAR[m]}: ${n}` +
          (m === 'prosa'
            ? ` (${FORMAS_DE_LINEAS.filter((f) => lote.enProsa.has(f))
                .map((f) => `${f}: ${lote.enProsa.get(f)}`)
                .join(', ')})`
            : ''),
      ),
      ...lote.nombradas,
      `  Conflictos, que no se tocan y decide una persona: ${lote.conflictos.length}` +
        (lote.conflictos.length === 0 ? '.' : ':'),
      ...lote.conflictos.map((c) => `  ${c}`),
    ];
  };

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  return {
    ok: true,
    ruta: rutas.citas,
    mensaje: [
      `Saltos de verso${seco ? ', en seco' : ''} (${segundos} s):`,
      ...parteDelLote('Citas publicadas', lotes.publicadas, true),
      ...parteDelLote('Candidatas de revisión', lotes.candidatas, false),
      `Cambian de fecha ${paginasDeCita} ${paginasDeCita === 1 ? 'Página de Cita' : 'Páginas de Cita'} y ` +
        `${totalListados} ${totalListados === 1 ? 'listado' : 'listados'}` +
        (listados.length === 0 ? '.' : ` (${listados.map(([f, n]) => `${f}: ${n}`).join(', ')}).`),
      ...(cambios.length > 0
        ? ['Tras el commit, lo que avisaría: npx tsx tools/avisar.ts --ensayo --desde <A> --hasta <B>']
        : []),
      seco || escritas.length === 0
        ? 'No se ha escrito nada.'
        : `Escritas ${citas(escritas.length)}: solo su línea «texto:». Ni una letra, ni un signo, ni el ` +
          'slug han cambiado. El cambio del corpus va en un commit propio.',
    ].join('\n'),
  };
}
