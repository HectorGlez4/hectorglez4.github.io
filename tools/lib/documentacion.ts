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
 * recuperación: las mismas tres comprobaciones que hace `tools/extraer.ts`, porque si no la
 * superficie de tecleo se mudaría del `.yaml` al `.txt`.
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

import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { normalizar } from '../../src/lib/normalizar.ts';
import {
  apareceEnDocumento,
  censoSinLaCita,
  FICHERO_DEL_CENSO,
  huellaDeTexto,
} from './cotejo.ts';
import {
  escribirCenso,
  escribirCita,
  fechaLocal,
  leerCensoBruto,
  leerCensoDeCotejo,
  leerCitas,
  mover,
  separarFrontmatter,
  type CitaEnCorpus,
  type Rutas,
} from './corpus.ts';
import { analizarDocumento, derivarDeLaDeclaracion, nombreDeDocumento } from './documento.ts';
import { fuenteUtilizable } from './extraccion.ts';
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
  año?: number;
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
 * El documento ya recuperado, comprobado como lo comprueba `tools/extraer.ts`.
 *
 * Las mismas tres puertas, y por el mismo motivo: mientras se admita cualquier fichero con
 * forma de cabecera, la superficie de tecleo solo se muda del frontmatter al `.txt`. Un
 * fichero compuesto a mano con `fuente: gutenberg` y `año: 1492` documentaría una Cita
 * publicada con esa Procedencia, que es exactamente lo que esta orden existe para impedir.
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

  return {
    ok: true,
    documento: {
      obra: derivado.obra,
      ...(derivado.año !== undefined ? { año: derivado.año } : {}),
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
