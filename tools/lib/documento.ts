/**
 * El documento de una Fuente: lo decidible sin red — AD-22, AD-23.
 *
 * Aquí vive todo lo que convierte una página descargada en un documento versionable:
 * acotarla a su región de contenido, retirarle el marcado, derivar la obra y el año, y
 * componer y analizar la cabecera. Puro: no lee disco, no pide nada. La única `fetch` del
 * proyecto está en `tools/recuperar.ts`, que es una cáscara fina encima de esto.
 *
 * La separación no es estética. Lo que decide qué se versiona —y sobre todo qué no— se
 * prueba entero con una página guardada en la propia prueba, sin depender de que un
 * servidor de fuera esté disponible y diga hoy lo mismo que ayer.
 */

import { slugDeObra } from '../../src/lib/slug.ts';
import { añoExacto } from './extraccion.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Entidades
// ─────────────────────────────────────────────────────────────────────────────

const ENTIDADES: Readonly<Record<string, string>> = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  mdash: '—', ndash: '–', hellip: '…', bull: '•', middot: '·', deg: '°',
  iquest: '¿', iexcl: '¡', copy: '©', reg: '®', trade: '™', euro: '€',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  auml: 'ä', euml: 'ë', iuml: 'ï', ouml: 'ö', uuml: 'ü',
  ntilde: 'ñ', ccedil: 'ç', szlig: 'ß',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', Ntilde: 'Ñ', Ccedil: 'Ç',
};

/** Las que, resueltas antes de tiempo, se comerían con el marcado o lo falsearían. */
const PELIGROSAS = new Set(['amp', 'lt', 'gt']);

const ENTIDAD = /&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/**
 * Resuelve las entidades de un fragmento.
 *
 * Se hace en dos pasadas —antes de retirar las etiquetas y otra vez después—, y por eso
 * la primera **conserva** `&amp;`, `&lt;` y `&gt;`: resolver `&lt;` antes de tiempo
 * fabricaría una etiqueta que el retirado se comería, y resolver `&amp;` abriría la
 * puerta a que la segunda pasada interpretara como marcado lo que la Fuente escribió
 * como texto (`&amp;lt;` es el texto «&lt;», no un «<»).
 *
 * Una entidad desconocida se deja **entera**. Dejarla a medias produciría un texto que ya
 * no es el de la Fuente ni uno legible, y se versionaría así para siempre.
 */
export function resolverEntidades(texto: string, conservarPeligrosas = false): string {
  return texto.replace(ENTIDAD, (entera: string, cuerpo: string) => {
    if (cuerpo.startsWith('#')) {
      const hexadecimal = cuerpo[1] === 'x' || cuerpo[1] === 'X';
      const codigo = Number.parseInt(hexadecimal ? cuerpo.slice(2) : cuerpo.slice(1), hexadecimal ? 16 : 10);
      if (!Number.isFinite(codigo) || codigo <= 0 || codigo > 0x10ffff) return entera;
      if (codigo >= 0xd800 && codigo <= 0xdfff) return entera;
      const caracter = String.fromCodePoint(codigo);
      if (conservarPeligrosas && (caracter === '&' || caracter === '<' || caracter === '>')) return entera;
      return caracter;
    }
    if (conservarPeligrosas && PELIGROSAS.has(cuerpo.toLowerCase())) return entera;
    const resuelta = ENTIDADES[cuerpo] ?? ENTIDADES[cuerpo.toLowerCase()];
    return resuelta ?? entera;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Retirada de marcado
// ─────────────────────────────────────────────────────────────────────────────

/** Etiquetas cuyo cierre o apertura separa líneas: la vecindad importa para el año. */
const BLOQUES =
  /<\/?(?:p|div|br|hr|h[1-6]|li|tr|td|th|blockquote|section|article|header|footer|nav|ul|ol|dl|dt|dd|table|pre|figure|figcaption|aside|main|caption)\b[^>]*>/gi;

const NO_ES_TEXTO = /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi;

function normalizarEspacios(texto: string): string {
  return texto
    .replace(/\r\n?/gu, '\n')
    .replace(/[   ]/gu, ' ')
    .split('\n')
    .map((linea) => linea.replace(/[^\S\n]+/gu, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

/** Un fragmento de marcado convertido en texto plano, con los saltos de bloque intactos. */
export function aTextoPlano(marcado: string): string {
  let texto = marcado.replace(/<!--[\s\S]*?-->/gu, ' ').replace(NO_ES_TEXTO, ' ');
  texto = resolverEntidades(texto, true);
  texto = texto.replace(BLOQUES, '\n').replace(/<[^>]*>/gu, '');
  texto = resolverEntidades(texto, false);
  return normalizarEspacios(texto);
}

/**
 * El elemento que empieza en `desde`, contando aperturas y cierres de su misma etiqueta.
 *
 * Un `indexOf('</div>')` cortaría en el primer div anidado, y en MediaWiki la región de
 * contenido tiene decenas.
 */
function elementoEquilibrado(
  html: string,
  desde: number,
  etiqueta: string,
): { fin: number; interior: string } {
  const patron = new RegExp(`<\\/?${etiqueta}\\b[^>]*>`, 'gi');
  patron.lastIndex = desde;
  let profundidad = 0;
  let inicioInterior = desde;
  let primero = true;
  let encontrado: RegExpExecArray | null;

  while ((encontrado = patron.exec(html)) !== null) {
    if (primero) {
      inicioInterior = encontrado.index + encontrado[0].length;
      primero = false;
    }
    if (encontrado[0].startsWith('</')) {
      profundidad -= 1;
      if (profundidad === 0) {
        return {
          fin: encontrado.index + encontrado[0].length,
          interior: html.slice(inicioInterior, encontrado.index),
        };
      }
    } else if (!encontrado[0].endsWith('/>')) {
      profundidad += 1;
    }
  }

  return { fin: html.length, interior: html.slice(inicioInterior) };
}

/**
 * Tope de elementos de cromo que se retiran de una página.
 *
 * Una obra larga de Wikisource pasa holgadamente de doscientas notas al pie, así que el
 * tope está donde solo lo alcanza un bucle que no avanza, no una página real.
 */
export const MAX_ELEMENTOS_RETIRADOS = 5000;

/**
 * Quita del marcado los elementos que casan con `apertura`, con su contenido.
 *
 * Agotar el tope **es un error**, no un resultado. Devolver el marcado a medio limpiar
 * versionaría media barra lateral como si fuera la obra, y en silencio: nadie mira un
 * documento de 300 KB para comprobar dónde dejó de limpiarse.
 */
function quitarElementos(html: string, etiqueta: string, apertura: RegExp): string {
  let salida = html;
  for (let vueltas = 0; vueltas < MAX_ELEMENTOS_RETIRADOS; vueltas += 1) {
    const encontrado = apertura.exec(salida);
    if (encontrado === null) return salida;
    const { fin } = elementoEquilibrado(salida, encontrado.index, etiqueta);
    salida = `${salida.slice(0, encontrado.index)}\n${salida.slice(fin)}`;
  }
  throw new Error(
    `Retirar <${etiqueta}> del cromo pasó de ${MAX_ELEMENTOS_RETIRADOS} elementos sin ` +
      'terminar: el marcado quedaría a medio limpiar y no se versiona.',
  );
}

function conClase(etiqueta: string, clase: string): RegExp {
  return new RegExp(`<${etiqueta}\\b[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${clase}\\b[^"']*["'][^>]*>`, 'i');
}

// ─────────────────────────────────────────────────────────────────────────────
// El año declarado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formas que delatan que el año no consta exacto. FR-2 no admite Procedencia aproximada:
 * ante cualquiera de estas, la candidata queda con obra y sin año.
 */
const APROXIMADO: readonly RegExp[] = [
  /\bc(?:a)?\.\s*\d/iu,
  /\bcirca\b/iu,
  /\bhacia\b/iu,
  /\bsiglo\b/iu,
  /\d\s*\?/u,
  /\d{1,4}\s*[-–—]\s*\d{1,4}/u,
  // Antes de Cristo: el año consta, pero con un signo que este análisis no fija, y
  // escribir 49 donde la obra dice «49 a. C.» es errar por casi un siglo. Se exige el
  // punto de la abreviatura: sin él, «a cargo de» bastaría para tirar un año bueno.
  /\ba\.\s*(?:de\s+)?[cj]\.?/iu,
  /\bantes\s+de\s+(?:cristo|jesucristo|nuestra\s+era)\b/iu,
  /\bB\.?C\.?E?\.?\b/u,
];

/**
 * El año que declara un fragmento, solo si consta uno y exacto.
 *
 * «Madrid: Renacimiento, 1913» da 1913. «c. 1615», «1615-1620» y «January 1, 2005
 * [eBook #7500]» no dan nada: el primero es aproximado, el segundo un intervalo y el
 * tercero trae tres números y ninguno se puede elegir sin inventar.
 */
export function añoDeclarado(fragmento: string): number | undefined {
  const texto = fragmento.trim();
  if (texto === '') return undefined;
  if (APROXIMADO.some((patron) => patron.test(texto))) return undefined;

  const numeros = [...new Set([...texto.matchAll(/\b\d{1,4}\b/gu)].map((m) => m[0]))];
  if (numeros.length !== 1) return undefined;
  return añoExacto(numeros[0]);
}

/**
 * El año que sigue a una etiqueta, mirando **solo su vecindad**.
 *
 * La ventana es la propia línea y, si la etiqueta va suelta, la siguiente o la de después
 * si media una en blanco. Buscar «la siguiente línea no vacía» a cualquier distancia
 * convertía en año declarado el primer número del cromo de la página —una paginación, un
 * número de nota— con la etiqueta a veinte líneas de allí.
 */
export function añoJuntoAEtiqueta(plano: string, etiqueta: RegExp): number | undefined {
  const lineas = plano.split('\n');

  for (let i = 0; i < lineas.length; i += 1) {
    const encontrado = etiqueta.exec(lineas[i]);
    if (encontrado === null) continue;

    const resto = lineas[i].slice(encontrado.index + encontrado[0].length);
    if (resto.trim() !== '') return añoDeclarado(resto);

    for (const vecina of [lineas[i + 1], lineas[i + 2]]) {
      if (vecina === undefined) break;
      if (vecina.trim() === '') continue;
      return añoDeclarado(vecina);
    }
    return undefined;
  }

  return undefined;
}
/**
 * Las líneas de la ventana que mira `añoJuntoAEtiqueta`, tal y como están en el texto.
 *
 * Se conservan **literales** en la declaración del documento versionado para que la
 * derivación se pueda repetir en la extracción sobre lo mismo que se leyó al recuperar.
 */
export function recorteDeEtiqueta(plano: string, etiqueta: RegExp): string[] {
  const lineas = plano.split('\n');
  const indice = lineas.findIndex((linea) => etiqueta.exec(linea) !== null);
  if (indice === -1) return [];

  const ventana = lineas.slice(indice, indice + 3);
  while (ventana.length > 1 && ventana[ventana.length - 1].trim() === '') ventana.pop();
  return ventana;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lectores por Fuente
// ─────────────────────────────────────────────────────────────────────────────

export type Region = { ok: true; region: string } | { ok: false; motivo: string };

export interface LectorDeFuente {
  /** Acota el documento bruto a la región donde está la obra, antes de retirar marcado. */
  region(bruto: string): Region;
  /**
   * Las líneas **literales** en las que la Fuente declara su metadato.
   *
   * Se versionan dentro del documento, entre la cabecera y el cuerpo, y son de donde
   * salen la obra y el año: al recuperar y otra vez al extraer. La cabecera es registro
   * de auditoría; lo que llega a una candidata sale de aquí.
   */
  declaracion(bruto: string, plano: string, regionPlana: string): string;
  /** La obra que declara esa declaración. */
  obra(declaracion: string): string | undefined;
  /** El año de la obra, solo si consta exacto en esa declaración. */
  año(declaracion: string): number | undefined;
}

function textoDeCaptura(captura: string | undefined): string | undefined {
  if (captura === undefined) return undefined;
  const texto = aTextoPlano(captura).replace(/\s+/gu, ' ').trim();
  return texto === '' ? undefined : texto;
}

const REGION_MEDIAWIKI: readonly RegExp[] = [
  /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bmw-parser-output\b[^"']*["'][^>]*>/i,
  /<div\b[^>]*\bid\s*=\s*["']mw-content-text["'][^>]*>/i,
];

const CROMO_MEDIAWIKI: readonly [string, RegExp][] = [
  ['div', conClase('div', 'printfooter')],
  ['div', conClase('div', 'catlinks')],
  ['div', conClase('div', 'navbox')],
  ['div', conClase('div', 'noprint')],
  ['div', conClase('div', 'ws-noexport')],
  ['table', conClase('table', 'header')],
  ['span', conClase('span', 'mw-editsection')],
  ['sup', conClase('sup', 'reference')],
];

const ETIQUETA_DE_AÑO_WIKISOURCE =
  /^\s*(?:a[ñn]o(?:\s+de\s+(?:publicaci[óo]n|edici[óo]n))?|fecha\s+de\s+publicaci[óo]n|publicaci[óo]n)\s*:/iu;

const ETIQUETA_DE_AÑO_GUTENBERG = /^\s*(?:original\s+publication|first\s+published)\s*:/iu;

const INICIO_GUTENBERG = /\*\*\*\s*START OF [\s\S]{0,300}?\*\*\*/i;
const FIN_GUTENBERG = /\*\*\*\s*END OF [\s\S]{0,300}?\*\*\*/i;

/** Las etiquetas de la ficha de Gutenberg que se conservan como declaración. */
const FICHA_DE_GUTENBERG =
  /^\s*(?:title|author|translator|original\s+publication|first\s+published|release\s+date|language|credits)\s*:/i;

/**
 * Los lectores del conjunto cerrado. Toda Fuente que permita reutilización tiene el suyo:
 * sin él la recuperación descargaría y fallaría después con «no declara título», y quien
 * añadió la Fuente se enteraría en la primera obra, no al añadirla.
 */
export const LECTORES_POR_FUENTE: Readonly<Record<string, LectorDeFuente>> = {
  'wikisource-es': {
    region(bruto) {
      for (const marcador of REGION_MEDIAWIKI) {
        const encontrado = marcador.exec(bruto);
        if (encontrado === null) continue;
        let region = elementoEquilibrado(bruto, encontrado.index, 'div').interior;
        for (const [etiqueta, apertura] of CROMO_MEDIAWIKI) {
          region = quitarElementos(region, etiqueta, apertura);
        }
        return { ok: true, region };
      }
      // Sin región de contenido, lo que se versionaría es la barra lateral, el pie y la
      // lista de categorías, y de ahí saldrían candidatas.
      return {
        ok: false,
        motivo:
          'La página no trae la región de contenido de MediaWiki (.mw-parser-output o ' +
          '#mw-content-text). No se ha versionado nada: sin ella se versionaría el cromo ' +
          'del sitio como si fuera la obra.',
      };
    },
    /**
     * El título literal del encabezado, y las líneas donde la propia obra declara su año.
     * El año sale de la **región ya limpia** (fix: antes salía de la página entera, y una
     * etiqueta de un navbox o de la cabecera del sitio ganaba a la de la obra).
     */
    declaracion(bruto, _plano, regionPlana) {
      const encabezado = /<h1\b[^>]*\bid\s*=\s*["']firstHeading["'][^>]*>([\s\S]*?)<\/h1>/i.exec(bruto);
      const titulo =
        textoDeCaptura(encabezado?.[1]) ??
        textoDeCaptura(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(bruto)?.[1])
          ?.replace(/\s*[-–—|]\s*Wikisource.*$/iu, '')
          .trim();

      // La primera línea es **siempre** el título, aunque venga vacía: si las líneas del
      // año pudieran ocupar su sitio, una página sin encabezado daría por título la
      // primera frase de la obra y se versionaría con ese nombre.
      return [titulo ?? '', ...recorteDeEtiqueta(regionPlana, ETIQUETA_DE_AÑO_WIKISOURCE)].join('\n');
    },
    obra(declaracion) {
      const primera = declaracion.split('\n')[0]?.trim() ?? '';
      return primera === '' || ETIQUETA_DE_AÑO_WIKISOURCE.test(primera) ? undefined : primera;
    },
    año(declaracion) {
      return añoJuntoAEtiqueta(declaracion, ETIQUETA_DE_AÑO_WIKISOURCE);
    },
  },

  gutenberg: {
    /**
     * Entre `*** START OF … ***` y `*** END OF … ***`, y **solo** si las dos marcas están.
     *
     * Sin ellas, la vista que se descargó no es la obra: es la ficha del catálogo
     * (`/ebooks/N`), que es justo la dirección que una persona copia del navegador. Caer
     * al documento entero versionaría el cromo del sitio y el preámbulo legal como si
     * fueran la obra, y de ahí saldrían candidatas.
     */
    region(bruto) {
      const inicio = INICIO_GUTENBERG.exec(bruto);
      if (inicio === null) {
        return {
          ok: false,
          motivo:
            'Esta página de Project Gutenberg no trae las marcas «*** START OF … ***» y ' +
            '«*** END OF … ***», así que no es el texto de la obra sino la ficha del ' +
            'catálogo. Recupere la vista en texto plano de la obra (por ejemplo ' +
            'https://www.gutenberg.org/cache/epub/N/pgN.txt o /files/N/N-0.txt).',
        };
      }

      const resto = bruto.slice(inicio.index + inicio[0].length);
      const fin = FIN_GUTENBERG.exec(resto);
      if (fin === null) {
        return {
          ok: false,
          motivo:
            'Esta página de Project Gutenberg abre con «*** START OF … ***» y no cierra ' +
            'con «*** END OF … ***». No se versiona a medias: el resto sería el preámbulo ' +
            'legal de Gutenberg, no la obra.',
        };
      }

      return { ok: true, region: resto.slice(0, fin.index) };
    },
    /** La ficha que Gutenberg escribe antes de la marca de inicio, línea a línea. */
    declaracion(_bruto, plano) {
      const inicio = INICIO_GUTENBERG.exec(plano);
      const ficha = inicio === null ? plano : plano.slice(0, inicio.index);
      return ficha
        .split('\n')
        .map((linea) => linea.trim())
        .filter((linea) => FICHA_DE_GUTENBERG.test(linea))
        .join('\n');
    },
    obra(declaracion) {
      const declarado = /^\s*title\s*:\s*(.+)$/im.exec(declaracion)?.[1]?.trim();
      return declarado === undefined || declarado === '' ? undefined : declarado;
    },
    /**
     * El año sale **solo** de `Original Publication`.
     *
     * La «Release Date» de Gutenberg es cuándo Gutenberg publicó el fichero, no cuándo se
     * escribió la obra. Escribirla como año de la Procedencia es exactamente la
     * Procedencia inferida que FR-2 prohíbe, y encima con una fecha del siglo XXI en una
     * obra del XVII. La línea se conserva en la declaración —es lo que la Fuente dice—,
     * pero la etiqueta que se lee no es esa.
     */
    año(declaracion) {
      return añoJuntoAEtiqueta(declaracion, ETIQUETA_DE_AÑO_GUTENBERG);
    },
  },
};

/**
 * Obra y año a partir de la declaración de un documento ya versionado.
 *
 * Es la misma derivación que corre al recuperar, y corre otra vez al extraer. La cabecera
 * no participa: es registro de auditoría. Atar el año a la cabecera lo dejaba suelto —el
 * nombre del fichero solo ata la Fuente y la obra—, y editar a mano `año: 1492` en un
 * documento realmente recuperado producía candidatas con 1492.
 */
export function derivarDeLaDeclaracion(
  idFuente: string,
  declaracion: string,
): { obra?: string; año?: number } {
  const lector = LECTORES_POR_FUENTE[idFuente];
  if (lector === undefined) return {};

  const obra = lector.obra(declaracion)?.trim();
  const año = lector.año(declaracion);
  return {
    ...(obra !== undefined && obra !== '' ? { obra } : {}),
    ...(año !== undefined ? { año } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// El documento versionado
// ─────────────────────────────────────────────────────────────────────────────

export type DerivacionDeDocumento =
  | { ok: true; obra: string; año?: number; declaracion: string; cuerpo: string }
  | { ok: false; motivo: string };

/** Declaración, obra, año y cuerpo de una página bruta, sin tocar disco ni red. */
export function derivarDocumento(idFuente: string, bruto: string): DerivacionDeDocumento {
  const lector = LECTORES_POR_FUENTE[idFuente];
  if (lector === undefined) {
    return {
      ok: false,
      motivo:
        `No hay lector de obra para «${idFuente}». Toda Fuente que permita reutilización ` +
        'necesita el suyo en tools/lib/documento.ts.',
    };
  }

  let declaracion: string;
  let cuerpo: string;
  try {
    const region = lector.region(bruto);
    if (!region.ok) return region;
    cuerpo = aTextoPlano(region.region);
    declaracion = lector.declaracion(bruto, aTextoPlano(bruto), cuerpo);
  } catch (fallo) {
    // Retirar el cromo puede rendirse; que se rinda es un error, no medio documento.
    return { ok: false, motivo: fallo instanceof Error ? fallo.message : String(fallo) };
  }

  const { obra, año } = derivarDeLaDeclaracion(idFuente, declaracion);
  if (obra === undefined) {
    return {
      ok: false,
      motivo:
        'El documento no declara título. Sin obra la Procedencia habría que inferirla, y ' +
        'FR-2 no lo admite: no se ha versionado nada.',
    };
  }

  if (cuerpo === '') {
    return { ok: false, motivo: 'El documento no trae texto: no se ha versionado nada.' };
  }

  return { ok: true, obra, declaracion, cuerpo, ...(año !== undefined ? { año } : {}) };
}

export interface CabeceraDeDocumento {
  fuente: string;
  obra: string;
  /** Se omite cuando no consta exacto. Nunca se escribe vacío. */
  año?: number;
  /** La dirección de la que llegó el documento, ya resueltas las redirecciones. */
  url: string;
  /**
   * La dirección que se pidió, cuando no es la misma que `url`.
   *
   * Sin ella, una Fuente que redirige rompía la reutilización: la cabecera guardaba el
   * destino final y la siguiente ejecución, que trae la dirección original, no encontraba
   * el documento y volvía a descargarlo.
   */
  pedido?: string;
  recuperado: string;
}

const SEPARADOR = '---';

function unaLinea(valor: string): string {
  return valor.replace(/\s+/gu, ' ').trim();
}

/**
 * El documento tal y como se versiona: cabecera, declaración y cuerpo.
 *
 * AD-23 dice «un documento por par (Fuente, obra)», en singular. Un fichero de metadato al
 * lado sería un segundo documento, así que todo vive dentro del mismo `.txt`, en tres
 * zonas separadas por `---`:
 *
 *   · la **cabecera**, registro de auditoría legible: qué Fuente, qué obra, qué año, de
 *     qué dirección y cuándo;
 *   · la **declaración**, las líneas literales en las que la Fuente dice su metadato, de
 *     donde salen la obra y el año que llegan a una candidata; y
 *   · el **cuerpo**, el texto de la obra en texto plano.
 */
export function componerDocumento(
  cabecera: CabeceraDeDocumento,
  declaracion: string,
  cuerpo: string,
): string {
  const lineas = [`fuente: ${unaLinea(cabecera.fuente)}`, `obra: ${unaLinea(cabecera.obra)}`];
  if (cabecera.año !== undefined) lineas.push(`año: ${cabecera.año}`);
  lineas.push(`url: ${unaLinea(cabecera.url)}`);
  if (cabecera.pedido !== undefined) lineas.push(`pedido: ${unaLinea(cabecera.pedido)}`);
  lineas.push(`recuperado: ${unaLinea(cabecera.recuperado)}`);

  // Una línea `---` dentro de la declaración partiría el documento en otro sitio.
  const declarado = declaracion
    .split('\n')
    .map((linea) => (linea.trim() === SEPARADOR ? linea.replace(/-/gu, '–') : linea))
    .join('\n')
    .trim();

  return `${lineas.join('\n')}\n${SEPARADOR}\n${declarado}\n${SEPARADOR}\n${cuerpo.trim()}\n`;
}

/** Lo contrario de `componerDocumento`. `undefined` si el fichero no tiene esa forma. */
export function analizarDocumento(
  contenido: string,
): { cabecera: CabeceraDeDocumento; declaracion: string; cuerpo: string } | undefined {
  const lineas = contenido.replace(/\r\n?/gu, '\n').split('\n');
  const primero = lineas.findIndex((linea) => linea.trim() === SEPARADOR);
  if (primero === -1) return undefined;
  const segundo = lineas.findIndex((linea, i) => i > primero && linea.trim() === SEPARADOR);
  if (segundo === -1) return undefined;

  const campos = new Map<string, string>();
  for (const linea of lineas.slice(0, primero)) {
    if (linea.trim() === '') continue;
    const dosPuntos = linea.indexOf(':');
    if (dosPuntos === -1) return undefined;
    campos.set(linea.slice(0, dosPuntos).trim().toLowerCase(), linea.slice(dosPuntos + 1).trim());
  }

  const fuente = campos.get('fuente');
  const obra = campos.get('obra');
  const url = campos.get('url');
  const recuperado = campos.get('recuperado');
  if (!fuente || !obra || !url || !recuperado) return undefined;

  const declarado = campos.get('año') ?? campos.get('ano');
  const año = añoExacto(declarado);
  // Una línea de año que no es un año exacto no se ignora: el fichero está mal formado y
  // versionarlo a medias sería aceptar una Procedencia que nadie derivó.
  if (declarado !== undefined && declarado !== '' && año === undefined) return undefined;

  const pedido = campos.get('pedido');

  return {
    cabecera: {
      fuente,
      obra,
      url,
      recuperado,
      ...(año !== undefined ? { año } : {}),
      ...(pedido !== undefined && pedido !== '' ? { pedido } : {}),
    },
    declaracion: lineas.slice(primero + 1, segundo).join('\n').trim(),
    cuerpo: lineas.slice(segundo + 1).join('\n'),
  };
}
/**
 * Cuántos caracteres del slug de obra entran en el nombre. Los títulos largos existen
 * —«Historia general de las cosas de Nueva España»— y algunos sistemas de ficheros cortan
 * por los 255 bytes; con la eñe y los acentos ya normalizados, 60 deja margen de sobra.
 */
export const MAX_CARACTERES_SLUG_DE_OBRA = 60;

/**
 * El nombre del documento de una obra: `{id-de-fuente}--{slug-de-obra}`, sin extensión.
 *
 * Devuelve `undefined` cuando el título no deja **ni una letra** al normalizarlo. No es
 * un caso de laboratorio: `normalizar` no retira `·` ni los símbolos sueltos, así que un
 * título como «···» produce un slug no vacío y sin nombre, y el fichero resultante no lo
 * podría volver a encontrar nadie.
 */
export function nombreDeDocumento(idFuente: string, obra: string): string | undefined {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(idFuente)) return undefined;

  const limpio = slugDeObra(obra)
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-|-$/gu, '');
  if (!/[a-z0-9]/u.test(limpio)) return undefined;

  let recortado = limpio.slice(0, MAX_CARACTERES_SLUG_DE_OBRA);
  if (limpio.length > MAX_CARACTERES_SLUG_DE_OBRA) {
    const porPalabra = recortado.replace(/-[^-]*$/u, '');
    if (/[a-z0-9]/u.test(porPalabra)) recortado = porPalabra;
  }
  recortado = recortado.replace(/^-|-$/gu, '');
  if (!/[a-z0-9]/u.test(recortado)) return undefined;

  return `${idFuente}--${recortado}`;
}
