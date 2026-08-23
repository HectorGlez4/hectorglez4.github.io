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

import { normalizar, palabras } from '../../src/lib/normalizar.ts';
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

/** El primer año que este proyecto admite como año de publicación de una obra. */
export const PRIMER_AÑO_POSIBLE = 1;

/**
 * El último año que puede constar como año de publicación: el corriente.
 *
 * Un año en el futuro no es un año de publicación, es una errata o un número de otra
 * cosa que se coló en el parámetro. Se calcula en cada llamada y no se congela en una
 * constante para que el límite no se quede corto el 1 de enero.
 *
 * Corre en la misma dirección que el tiempo: lo que hoy se admite se seguirá admitiendo
 * mañana, así que el año que derivó la recuperación es el que deriva la extracción
 * aunque medien años entre una y otra.
 */
export function ultimoAñoPosible(): number {
  return new Date().getUTCFullYear();
}

/**
 * El año que declara un fragmento, solo si consta uno, exacto y posible.
 *
 * «Madrid: Renacimiento, 1913» da 1913. «c. 1615», «1615-1620» y «January 1, 2005
 * [eBook #7500]» no dan nada: el primero es aproximado, el segundo un intervalo y el
 * tercero trae tres números y ninguno se puede elegir sin inventar. «3050» tampoco: un
 * número de cuatro cifras no es un año por serlo, y versionarlo dejaría una Procedencia
 * que nadie puede haber leído en ninguna edición.
 */
export function añoDeclarado(fragmento: string): number | undefined {
  const texto = fragmento.trim();
  if (texto === '') return undefined;
  if (APROXIMADO.some((patron) => patron.test(texto))) return undefined;

  const numeros = [...new Set([...texto.matchAll(/\b\d{1,4}\b/gu)].map((m) => m[0]))];
  if (numeros.length !== 1) return undefined;

  const año = añoExacto(numeros[0]);
  if (año === undefined) return undefined;
  return año >= PRIMER_AÑO_POSIBLE && año <= ultimoAñoPosible() ? año : undefined;
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

/**
 * El año que declara un parámetro de plantilla del wikitexto (`|año = 1905`).
 *
 * A diferencia de la etiqueta de una página renderizada, un parámetro declara su valor
 * **en su propia línea**: mirar la siguiente convertiría en año de la obra el número del
 * parámetro de al lado —«|volumen = 2»— cada vez que el año viniera vacío.
 */
export function añoDeParametro(declaracion: string, parametro: RegExp): number | undefined {
  for (const linea of declaracion.split('\n')) {
    const encontrado = parametro.exec(linea);
    if (encontrado === null) continue;
    return añoDeclarado(linea.slice(encontrado.index + encontrado[0].length));
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// El encabezado del wikitexto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cuánto wikitexto se mira buscando el encabezado, y cuántas plantillas.
 *
 * El encabezado de una página de Wikisource va arriba del todo, a veces detrás de una
 * plantilla de mantenimiento. Más allá empieza la obra, y en una obra larga el wikitexto
 * son megabytes: recorrerlo entero para buscar un parámetro que solo vive en la cabecera
 * es trabajo que no puede dar nada.
 */
export const MAX_CARACTERES_DE_ENCABEZADO = 20_000;
const MAX_PLANTILLAS_DE_ENCABEZADO = 5;

/** Cuántas líneas del encabezado entran en la declaración, y de qué largo. */
export const MAX_LINEAS_DE_ENCABEZADO = 20;
const MAX_CARACTERES_POR_LINEA = 300;

/**
 * Los parámetros del encabezado que se versionan como declaración.
 *
 * Es una lista cerrada, y por el mismo motivo que la ficha de Gutenberg lo es: `|notas =`
 * puede traer párrafos de prosa —con sus propias etiquetas «Año:» dentro— y esa prosa
 * acabaría en la zona de la que salen la obra y el año. Aquí solo entra metadato.
 */
const PARAMETRO_DE_ENCABEZADO =
  /^\s*(?:t[íi]tulo|title|autor|author|traductor|translator|a[ñn]o(?:\s+de\s+(?:publicaci[óo]n|edici[óo]n))?|fecha(?:\s+de\s+publicaci[óo]n)?|edici[óo]n|editorial|publicaci[óo]n|idioma|lengua|language)\s*=/iu;

/** El parámetro del que sale el año. Solo «año», nunca «fecha»: una fecha no es un año. */
const PARAMETRO_DE_AÑO_WIKITEXTO =
  /^\s*\|\s*a[ñn]o(?:\s+de\s+(?:publicaci[óo]n|edici[óo]n))?\s*=/iu;

/** El parámetro del que sale la obra. */
const PARAMETRO_DE_TITULO_WIKITEXTO = /^\s*\|\s*(?:t[íi]tulo|title)\s*=/iu;

/** El parámetro del que sale el Autor que la Fuente declara. */
const PARAMETRO_DE_AUTOR_WIKITEXTO = /^\s*\|\s*(?:autor|author)\s*=/iu;

const ENLACE_CON_TEXTO = /\[\[[^[\]|]*\|([^[\]|]*)\]\]/gu;
const ENLACE_SIMPLE = /\[\[([^[\]|]*)\]\]/gu;

/**
 * El título que declara un parámetro del encabezado, o nada si no declara ninguno.
 *
 * El nombre de la página **no** es el nombre de la obra: Wikisource desambigua las
 * páginas —«Triste (Nervo)», «Amor de madre (Palma)»— y ese paréntesis acabaría literal
 * en la atribución que lee el visitante. El encabezado declara la obra que contiene al
 * fragmento: «Los jardines interiores», «Tradiciones peruanas».
 *
 * Viene en forma de enlace, así que se resuelve como lo resuelve la propia Fuente:
 * `[[Los jardines interiores]]` es su texto, y `[[destino|texto visible]]` es el texto
 * visible, que es lo que la página enseña.
 *
 * Devuelve `undefined` —y quien llama cae al encabezado de la página— cuando el valor no
 * es un título: vacío, un enlace relativo («Ariel/Capítulo I» declara `[[../]]`), o una
 * forma de wikitexto que este análisis no sabe resolver sin inventarse nada. Reconstruir
 * el título del padre a partir de la ruta sería derivarlo de la URL, que es exactamente lo
 * que la Historia 11.1 prohíbe.
 */
export function tituloDeclarado(valor: string): string | undefined {
  const limpio = valor
    .replace(ENLACE_CON_TEXTO, '$1')
    .replace(ENLACE_SIMPLE, '$1')
    .replace(/'{2,}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();

  // Lo que sobrevive con marcado dentro es una forma que no sabemos resolver: una
  // plantilla sin expandir, un enlace sin cerrar. No se adivina; se cae al encabezado.
  if (/[[\]{}<>]/u.test(limpio)) return undefined;
  if (limpio.startsWith('../') || limpio.startsWith('/')) return undefined;
  if (!/[\p{L}\p{N}]/u.test(limpio)) return undefined;
  return limpio;
}

/** El espacio de nombres con el que Wikisource enlaza a la página de un Autor. */
const ESPACIO_DE_AUTOR = /^(?:autor|author)\s*:\s*/iu;

/** Un enlace entero de wikitexto, con su interior: `[[destino]]` o `[[destino|visible]]`. */
const ENLACE_ENTERO = /\[\[([^[\]]*)\]\]/gu;

/**
 * Las formas con las que una Fuente firma «sin firma».
 *
 * `|autor=Anónimo` **no** nombra a nadie, y tratarlo como un nombre real hacía que un
 * documento anónimo se rechazara contra cualquier `--autor` con un «no son el mismo
 * Autor» que era falso: no hay dos partes que comparar, hay una sola. Se comparan en
 * forma canónica, así que «Anónimo», «anonimo» y «ANÓNIMA» son la misma.
 */
const SIN_FIRMA: ReadonlySet<string> = new Set([
  'anonimo', 'anonima', 'anonimos', 'anonimas', 'anonymous',
  'desconocido', 'desconocida', 'autor desconocido', 'autora desconocida',
  'author unknown', 'unknown', 'unknown author',
  'varios', 'varios autores', 'autores varios', 'various authors',
  'vv aa', 'vvaa', 'aa vv', 'aavv',
]);

/**
 * Lo que una Fuente declara en su parámetro de autor.
 *
 * `undefined` —el valor que devuelven los lectores— es «no declara a nadie»: el parámetro
 * falta, viene vacío, o firma sin firmar («Anónimo»). Eso pasa sin cotejar, como el año
 * que falta.
 *
 * Un objeto con `nombres` **vacío** es otra cosa muy distinta: el documento sí declara
 * autor y no se sabe interpretar lo que declara. Confundir los dos estados era el fallo
 * que esta forma existe para impedir: `|autor=Manuel González Prada<ref>nota</ref>` se
 * leía como «no declara autor», la puerta no actuaba y el informe imprimía que el
 * documento no declaraba autor, que es mentira. Toda la razón de esa línea del informe es
 * que una puerta muda no parezca una puerta que aprueba.
 */
export interface AutorDeLaFuente {
  /** Los Autores que se han sabido leer. Vacío cuando lo declarado no se sabe interpretar. */
  nombres: string[];
  /** Lo que la Fuente escribió, en una línea, para poder citarlo en el rechazo. */
  crudo: string;
}

/**
 * El Autor al que enlaza un `[[…]]`, prefiriendo **el destino** al texto visible.
 *
 * El destino es a quién enlaza la Fuente; el texto visible es cómo lo llama en esa frase,
 * y puede no ser un nombre: `[[Autor:Juan Montalvo|el maestro]]` declara a Montalvo y
 * enseña «el maestro», y quedarse con lo segundo rechazaría un documento legítimo.
 *
 * Se cae al texto visible cuando el destino no sirve como nombre: vacío, relativo
 * (`[[../]]`), o de otro espacio de nombres que no sea el de Autor —`[[w:es:Fulano|…]]`—,
 * porque ahí el nombre está en lo visible y no en la dirección.
 */
function autorDeEnlace(interior: string): string {
  const barra = interior.indexOf('|');
  const visible = barra === -1 ? '' : interior.slice(barra + 1).trim();
  // La marca de sección designa un trozo de la página, no a otra persona.
  const destino = (barra === -1 ? interior : interior.slice(0, barra))
    .split('#')[0]
    .replace(/_/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(ESPACIO_DE_AUTOR, '')
    .trim();

  const sirve =
    destino !== '' &&
    !destino.includes(':') &&
    !destino.startsWith('../') &&
    !destino.startsWith('/') &&
    /\p{L}/u.test(destino);

  return sirve ? destino : visible;
}

/**
 * Si dos mitades separadas por « y » son dos Autores o los dos apellidos de uno.
 *
 * En español la conjunción une los apellidos de una sola persona —«Santiago Ramón y
 * Cajal», «José Ortega y Gasset»— tanto como a dos personas. Lo que los distingue es que
 * el segundo apellido va **solo**: se parte únicamente cuando las dos mitades traen
 * nombre y apellido. Sin esta comprobación, Ramón y Cajal —que está declarado en el
 * Corpus— quedaría partido en «Santiago Ramón» y «Cajal» y no concordaría con ninguno.
 */
function partirPorConjuncion(trozo: string): string[] {
  const mitades = trozo.split(/\s+(?:y|e|and)\s+/iu);
  if (mitades.length < 2) return [trozo];
  return mitades.every((mitad) => tokensDeNombreDeAutor(mitad).length >= 2) ? mitades : [trozo];
}

/**
 * Los nombres que declara un valor, uno por Autor.
 *
 * Dos Autores en una línea no se pueden fundir en un nombre: `|autor=[[Manuel Machado]] y
 * [[Antonio Machado]]` daría los tokens {manuel, machado, antonio} —`y` es partícula— y
 * con esa unión cruzaría la puerta cualquiera de los dos **y también un tercero** que se
 * llamara «Manuel Antonio Machado». Cada declarado se compara entero y por separado.
 *
 * Cuando hay dos enlaces o más, cada enlace es un Autor y lo que va entre ellos es
 * conjunción. Cuando no los hay, se parte por comas y por la conjunción, con la cautela
 * de `partirPorConjuncion`.
 */
function trozosDeAutor(crudo: string): string[] {
  const enlaces = [...crudo.matchAll(ENLACE_ENTERO)];
  if (enlaces.length >= 2) return enlaces.map((enlace) => autorDeEnlace(enlace[1]));

  const llano = crudo
    .replace(ENLACE_ENTERO, (_entero, interior: string) => autorDeEnlace(interior))
    // Un enlace sin cerrar —`[[Autor:Antonio Machado`— no lo resuelve el patrón entero.
    .replace(/\[\[|\]\]/gu, '');

  const porComa = llano.split(/\s*[;,]\s*|\s+&\s+/u).filter((trozo) => trozo.trim() !== '');
  const trozos = porComa.flatMap(partirPorConjuncion);
  return trozos.length === 0 ? [llano] : trozos;
}

/** Un nombre suelto, ya sin enlace, o nada si lo que queda no se sabe leer. */
function nombreLegible(trozo: string): string | undefined {
  const limpio = trozo
    .replace(/'{2,}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(ESPACIO_DE_AUTOR, '')
    .trim();

  // Lo que sobrevive con marcado dentro es una forma que no sabemos resolver: una
  // plantilla sin expandir, una referencia, un enlace roto. No se adivina —y tampoco se
  // calla: quien llama distingue esto de «no declara nadie» y lo rechaza.
  if (/[[\]{}<>|]/u.test(limpio)) return undefined;
  if (!/\p{L}/u.test(limpio)) return undefined;
  return limpio;
}

/**
 * Lo que declara el parámetro de autor de un encabezado — FR-23, Historia 11.1.
 *
 * Sale del mismo sitio del que salen la obra y el año —la declaración literal que el
 * documento conserva— y no de la cabecera, que es registro de auditoría. Las formas
 * reales de los documentos versionados son cuatro: `Juan Montalvo`, `[[José Martí]]`,
 * `[[Autor:Antonio Machado|Antonio Machado]]` y `Author: Miguel de Cervantes Saavedra`.
 *
 * Devuelve `undefined` cuando no declara a nadie —vacío, o una firma sin firma— y un
 * objeto con `nombres` vacío cuando declara algo que no se sabe interpretar. Los dos
 * estados son distintos y quien llama los trata distinto.
 */
export function autoresDeclarados(valor: string): AutorDeLaFuente | undefined {
  const crudo = valor.replace(/\s+/gu, ' ').trim();
  // Un valor sin ni una letra —una fecha suelta, un signo— no nombra a nadie ni pretende.
  if (crudo === '' || !/\p{L}/u.test(crudo)) return undefined;

  const nombres: string[] = [];
  let ilegible = false;

  for (const trozo of trozosDeAutor(crudo)) {
    const nombre = nombreLegible(trozo);
    if (nombre === undefined) {
      ilegible = true;
      continue;
    }
    // Una firma sin firma no es un Autor: no hay dos partes que comparar.
    if (SIN_FIRMA.has(normalizar(nombre))) continue;
    nombres.push(nombre);
  }

  if (nombres.length > 0) return { nombres, crudo };
  // Declara algo, y no se sabe qué. No es lo mismo que no declarar.
  if (ilegible) return { nombres: [], crudo };
  return undefined;
}

/**
 * El primer bloque `{{ … }}` que empieza en `desde`, contando anidamientos.
 *
 * Un `indexOf('}}')` cortaría en la primera plantilla anidada, y un encabezado con
 * `{{PD-old}}` dentro de un parámetro las tiene.
 */
function plantillaEquilibrada(
  wikitexto: string,
  desde: number,
): { fin: number; interior: string } | undefined {
  const apertura = wikitexto.indexOf('{{', desde);
  if (apertura === -1) return undefined;

  let profundidad = 0;
  for (let i = apertura; i < wikitexto.length - 1; i += 1) {
    if (wikitexto.startsWith('{{', i)) {
      profundidad += 1;
      i += 1;
    } else if (wikitexto.startsWith('}}', i)) {
      profundidad -= 1;
      i += 1;
      if (profundidad === 0) {
        return { fin: i + 1, interior: wikitexto.slice(apertura + 2, i - 1) };
      }
    }
  }

  return undefined;
}

/** Parte el interior de una plantilla por sus `|` de primer nivel. */
function segmentosDePlantilla(interior: string): string[] {
  const segmentos: string[] = [];
  let actual = '';
  let llaves = 0;
  let corchetes = 0;

  for (let i = 0; i < interior.length; i += 1) {
    if (interior.startsWith('{{', i) || interior.startsWith('[[', i)) {
      if (interior[i] === '{') llaves += 1;
      else corchetes += 1;
      actual += interior.slice(i, i + 2);
      i += 1;
      continue;
    }
    if (interior.startsWith('}}', i) || interior.startsWith(']]', i)) {
      if (interior[i] === '}') llaves -= 1;
      else corchetes -= 1;
      actual += interior.slice(i, i + 2);
      i += 1;
      continue;
    }
    if (interior[i] === '|' && llaves === 0 && corchetes === 0) {
      segmentos.push(actual);
      actual = '';
      continue;
    }
    // Un enlace no cerrado no se lleva por delante los parámetros de las líneas
    // siguientes. «Ariel/Capítulo I» declara `|título = [[../`, y sin este corte el
    // `|año` de debajo quedaba dentro del título y no se versionaba nunca.
    if (interior[i] === '\n') corchetes = 0;
    actual += interior[i];
  }

  segmentos.push(actual);
  return segmentos;
}

/**
 * Las líneas del encabezado del wikitexto que se versionan, **literales**.
 *
 * Wikisource no renderiza el año: el dato vive en los parámetros de la plantilla de
 * encabezado (`|año = 1905`), y por eso el lector de la página renderizada no podía
 * dispararse nunca. Estas líneas son las que la Fuente escribió, tal cual, y son las que
 * dejan que la extracción vuelva a derivar el mismo año del documento versionado.
 *
 * Cada parámetro sale en su propia línea aunque en el wikitexto vinieran todos seguidos
 * —`{{Encabezado|título=Triste|año=1905}}` es una forma tan común como la de una línea
 * por parámetro—, porque la declaración se analiza por líneas. El texto de cada parámetro
 * no se toca: solo se le quitan los saltos de línea que no cabrían en una.
 */
export function lineasDeEncabezadoDeWikitexto(wikitexto: string): string[] {
  const cabeza = wikitexto.replace(/\r\n?/gu, '\n').slice(0, MAX_CARACTERES_DE_ENCABEZADO);
  const lineas: string[] = [];
  const vistas = new Set<string>();
  let desde = 0;

  for (let plantilla = 0; plantilla < MAX_PLANTILLAS_DE_ENCABEZADO; plantilla += 1) {
    const bloque = plantillaEquilibrada(cabeza, desde);
    if (bloque === undefined) break;
    desde = bloque.fin;

    // El primer segmento es el nombre de la plantilla, no un parámetro.
    for (const segmento of segmentosDePlantilla(bloque.interior).slice(1)) {
      if (!PARAMETRO_DE_ENCABEZADO.test(segmento)) continue;
      // Un parámetro sin valor no declara nada, y el encabezado los trae a docenas.
      if (segmento.slice(segmento.indexOf('=') + 1).trim() === '') continue;
      const linea = `|${segmento.replace(/\s+/gu, ' ').trim()}`.slice(0, MAX_CARACTERES_POR_LINEA);
      if (vistas.has(linea)) continue;
      vistas.add(linea);
      lineas.push(linea);
      if (lineas.length >= MAX_LINEAS_DE_ENCABEZADO) return lineas;
    }
  }

  return lineas;
}

// ─────────────────────────────────────────────────────────────────────────────
// La obra que la página declara — Fix 11.1c
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La marca con la que se distinguen, dentro de la declaración, las líneas de **la obra**.
 *
 * En Wikisource la obra declara el año y la página declara el texto, y casi nunca son la
 * misma página: el índice de «Capítulos que se le olvidaron a Cervantes» trae `|año = 1895`
 * y su «Capítulo XLIII» trae ocho mil caracteres de prosa y ningún año. Cuando la página no
 * declara año se recupera el encabezado de la obra que ella misma declara, y sus líneas se
 * guardan **junto a las suyas y distinguibles de ellas**: la obra sale siempre de las
 * propias —si el padre pudiera aportarla, una subpágina heredaría el nombre del índice— y
 * solo el año puede caer a las de la obra.
 *
 * La marca va delante para que los patrones de parámetro, todos anclados en `^\s*\|`, no
 * puedan dispararse sobre una línea del padre por descuido.
 */
export const MARCA_DE_LA_OBRA = 'obra>';

/** Las líneas que declaró **la página**: todo lo que no viene marcado como de la obra. */
function loQueDeclaraLaPagina(declaracion: string): string {
  return declaracion
    .split('\n')
    .filter((linea) => !linea.startsWith(MARCA_DE_LA_OBRA))
    .join('\n');
}

/** Las líneas que declaró **la obra**, ya sin la marca. */
function loQueDeclaraLaObra(declaracion: string): string {
  return declaracion
    .split('\n')
    .filter((linea) => linea.startsWith(MARCA_DE_LA_OBRA))
    .map((linea) => linea.slice(MARCA_DE_LA_OBRA.length).trim())
    .join('\n');
}

/** Las líneas del encabezado de la obra, marcadas para entrar en la declaración. */
export function lineasDeLaObraDeclarada(encabezadoDeLaObra: string): string[] {
  return lineasDeEncabezadoDeWikitexto(encabezadoDeLaObra).map(
    (linea) => `${MARCA_DE_LA_OBRA} ${linea}`,
  );
}

/**
 * El destino de un enlace de wikitexto, **solo si es absoluto y del espacio principal**.
 *
 * No es lo mismo que `tituloDeclarado`, que resuelve el texto **visible** del enlace: para
 * pedirle el año a la obra hace falta la página a la que el enlace apunta, que en
 * `[[Obra|otra cosa]]` es la primera mitad.
 *
 * Se rechaza —y entonces no se encadena— todo lo que no sea una página de esta misma
 * Fuente y de su espacio principal:
 *
 *   · lo relativo (`[[../]]`, `[[/Capítulo I]]`), porque el destino lo resolvería la ruta
 *     de la página y derivar el padre de la ruta es justo lo que la Historia 11.1 prohíbe;
 *   · lo que lleva prefijo con dos puntos (`[[:en:Something]]`, `[[Índice:Ariel.djvu]]`,
 *     `[[Wikisource:Portada]]`), que es otro anfitrión u otro espacio de nombres;
 *   · lo que no es un enlace suelto: una URL externa, una plantilla sin expandir, un
 *     enlace sin cerrar, o un valor con algo más además del enlace.
 *
 * El precio de los dos puntos es que un título que los lleve dentro no encadena. Es el
 * precio correcto: no encadenar deja la candidata con obra y sin año, que es un estado
 * legítimo, y confundir un espacio de nombres con un título no lo es.
 */
export function destinoDeEnlaceAbsoluto(valor: string): string | undefined {
  const limpio = valor.replace(/'{2,}/gu, '').replace(/\s+/gu, ' ').trim();

  const enlace = /^\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]$/u.exec(limpio);
  if (enlace === null) return undefined;

  // La marca de sección designa un trozo de la página, no otra página.
  const destino = enlace[1].split('#')[0].replace(/_/gu, ' ').replace(/\s+/gu, ' ').trim();

  if (destino === '') return undefined;
  if (destino.startsWith('../') || destino.startsWith('/')) return undefined;
  if (destino.includes(':')) return undefined;
  if (!/[\p{L}\p{N}]/u.test(destino)) return undefined;
  return destino;
}

/**
 * La página que hay que pedir para que la obra declare su año, o nada si no hay ninguna.
 *
 * La subpágina **ya declara a qué obra pertenece**: `|título = [[Capítulos que se le
 * olvidaron a Cervantes]]` es un enlace absoluto a la página de la obra en esta misma
 * Fuente. Encadenar esas dos declaraciones —«pertenezco a esta obra» y «soy de 1895»— no
 * añade ninguna frase nuestra. Sacar el padre de la ruta `Obra/Capítulo` sí la añadiría, y
 * por eso el único padre admisible es el que la página escribe como enlace.
 */
export function paginaDeLaObraDeclarada(encabezado: string): string | undefined {
  for (const linea of lineasDeEncabezadoDeWikitexto(encabezado)) {
    const encontrado = PARAMETRO_DE_TITULO_WIKITEXTO.exec(linea);
    if (encontrado === null) continue;
    const destino = destinoDeEnlaceAbsoluto(linea.slice(encontrado.index + encontrado[0].length));
    if (destino !== undefined) return destino;
  }
  return undefined;
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
   *
   * `encabezado` es el texto de origen de la página —el wikitexto, en MediaWiki—, cuando
   * la recuperación ha podido traerlo. Es opcional a propósito: si no llega, la Fuente
   * declara lo que declare la página renderizada y ya está. Un metadato que falta no es
   * un fallo.
   *
   * `encabezadoDeLaObra` es el texto de origen de **la obra que la página declara**, que
   * la recuperación solo pide cuando la página no declara año. Sus líneas se guardan junto
   * a las de la página y **distinguibles** de ellas: la obra sale siempre de la página, y
   * solo el año puede caer a lo que declare la obra.
   */
  declaracion(
    bruto: string,
    plano: string,
    regionPlana: string,
    encabezado?: string,
    encabezadoDeLaObra?: string,
  ): string;
  /** La obra que declara esa declaración. */
  obra(declaracion: string): string | undefined;
  /**
   * El **Autor** que declara esa declaración, si declara alguno.
   *
   * Sale de donde salen la obra y el año, y por el mismo motivo: la cabecera es registro
   * de auditoría, y un `--autor` cotejado contra ella se cotejaría contra un campo
   * editable. `undefined` cuando la Fuente no declara autor, que no es un fallo —igual
   * que con el año— sino una puerta que no actúa; y `nombres` vacío cuando declara algo
   * que no se sabe interpretar, que sí lo es.
   */
  autor(declaracion: string): AutorDeLaFuente | undefined;
  /**
   * La **página** de la que salió este documento, cuando la obra tiene más de una.
   *
   * Un documento es el texto de una página concreta, no el de una obra entera: «Triste» y
   * «Tibi Regina» son dos páginas de «Los jardines interiores», y si las dos compitieran
   * por el mismo fichero la que perdiera quedaría sin texto contra el que cotejar. La
   * obra deja de ser la identidad del documento y pasa a ser lo que es: su metadato.
   *
   * `undefined` cuando la Fuente no pagina —el `.txt` de Gutenberg es la obra entera— o
   * cuando la página **es** la obra, que es el caso que ya funcionaba.
   */
  pagina(declaracion: string): string | undefined;
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
 * El encabezado de la página de Wikisource, que es la primera línea de la declaración.
 *
 * Es lo que distingue a dos documentos de la misma obra, y es también el respaldo del
 * nombre de la obra cuando el encabezado del wikitexto no declara ninguno. Sale de la
 * declaración, como todo lo demás, para que la extracción pueda comprobar el nombre del
 * fichero contra lo **derivado** y no contra la cabecera, que es registro de auditoría.
 */
function paginaDeWikisource(declaracion: string): string | undefined {
  const primera = declaracion.split('\n')[0]?.trim() ?? '';
  if (primera === '' || primera.startsWith('|')) return undefined;
  // Las líneas de la obra van detrás de las de la página y nunca las primeras, pero si
  // alguna llegara aquí sería el nombre del índice ocupando el de la página.
  if (primera.startsWith(MARCA_DE_LA_OBRA)) return undefined;
  return ETIQUETA_DE_AÑO_WIKISOURCE.test(primera) ? undefined : primera;
}

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
    declaracion(bruto, _plano, regionPlana, encabezadoDeOrigen, encabezadoDeLaObra) {
      const encabezado = /<h1\b[^>]*\bid\s*=\s*["']firstHeading["'][^>]*>([\s\S]*?)<\/h1>/i.exec(bruto);
      const titulo =
        textoDeCaptura(encabezado?.[1]) ??
        textoDeCaptura(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(bruto)?.[1])
          ?.replace(/\s*[-–—|]\s*Wikisource.*$/iu, '')
          .trim();

      // La primera línea es **siempre** el título, aunque venga vacía: si las líneas del
      // año pudieran ocupar su sitio, una página sin encabezado daría por título la
      // primera frase de la obra y se versionaría con ese nombre.
      //
      // Detrás van, literales, las dos formas en las que Wikisource declara su metadato:
      // la etiqueta de la página renderizada —que casi nunca aparece— y los parámetros
      // del encabezado del wikitexto, que es donde el dato vive de verdad.
      //
      // Y al final, marcadas, las líneas de la obra que la página declara, cuando la
      // recuperación las ha tenido que pedir. Se guardan las dos literales porque
      // `extraer` vuelve a derivar el año de aquí, sin red: guardar «año: 1895» ya
      // interpretado convertiría la puerta de la 11.1 en un campo editable.
      return [
        titulo ?? '',
        ...recorteDeEtiqueta(regionPlana, ETIQUETA_DE_AÑO_WIKISOURCE),
        ...(encabezadoDeOrigen === undefined ? [] : lineasDeEncabezadoDeWikitexto(encabezadoDeOrigen)),
        ...(encabezadoDeLaObra === undefined ? [] : lineasDeLaObraDeclarada(encabezadoDeLaObra)),
      ].join('\n');
    },
    /**
     * La obra que declara el encabezado, y el título de la página cuando no lo declara.
     *
     * El nombre de la página no es el nombre de la obra: «Triste (Nervo)» lleva dentro el
     * desambiguador de Wikisource, y la obra que contiene a ese poema —la que un lector
     * esperaría ver citada— es «Los jardines interiores», que es lo que el encabezado
     * declara en `|título`. Cuando no lo declara, o declara algo que no es un título, se
     * cae al encabezado de la página, que es lo que había antes de esto.
     *
     * **La obra la declara siempre la página**, nunca el encabezado de la obra que se
     * recuperó para el año: si el padre pudiera aportar el título, toda subpágina heredaría
     * el nombre del índice y se perdería la distinción entre obra y página. Por eso aquí
     * solo se miran las líneas propias.
     */
    obra(declaracion) {
      for (const linea of loQueDeclaraLaPagina(declaracion).split('\n')) {
        const encontrado = PARAMETRO_DE_TITULO_WIKITEXTO.exec(linea);
        if (encontrado === null) continue;
        const titulo = tituloDeclarado(linea.slice(encontrado.index + encontrado[0].length));
        if (titulo !== undefined) return titulo;
      }

      return paginaDeWikisource(declaracion);
    },
    /**
     * El Autor que declara el encabezado de **la página**, nunca el de la obra.
     *
     * La misma dirección que la obra, y por el mismo motivo: si el índice pudiera aportar
     * el Autor, una subpágina de una antología heredaría el de su índice y la puerta
     * cotejaría contra quien no firma el texto. Cuando la página no declara ninguno, la
     * puerta no actúa: un metadato que falta no es un fallo.
     */
    autor(declaracion) {
      for (const linea of loQueDeclaraLaPagina(declaracion).split('\n')) {
        const encontrado = PARAMETRO_DE_AUTOR_WIKITEXTO.exec(linea);
        if (encontrado === null) continue;
        const declarado = autoresDeclarados(linea.slice(encontrado.index + encontrado[0].length));
        if (declarado !== undefined) return declarado;
      }
      return undefined;
    },
    pagina: paginaDeWikisource,
    /**
     * El año, de la etiqueta renderizada si la hay y del parámetro del wikitexto si no.
     *
     * El orden importa poco en la práctica —el índice de Wikisource no tiene ni una
     * página con «Año de publicación» visible— y por eso el parámetro es el que trabaja.
     * Se conserva la etiqueta porque es la forma que declara la página que se versionó, y
     * lo que la página dice manda sobre lo que dice su código fuente.
     *
     * Y en último lugar, el de **la obra que la página declara**. En Wikisource la obra
     * declara el año y la página declara el texto, y casi nunca son la misma página: sin
     * este último salto, toda subpágina de una obra conocida se sembraría con Procedencia
     * parcial. Lo que declara la página manda sobre lo que declara su obra.
     */
    año(declaracion) {
      const deLaPagina = loQueDeclaraLaPagina(declaracion);
      return (
        añoJuntoAEtiqueta(deLaPagina, ETIQUETA_DE_AÑO_WIKISOURCE) ??
        añoDeParametro(deLaPagina, PARAMETRO_DE_AÑO_WIKITEXTO) ??
        añoDeParametro(loQueDeclaraLaObra(declaracion), PARAMETRO_DE_AÑO_WIKITEXTO)
      );
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
    /** La línea `Author:` de la ficha, que es donde Gutenberg declara quién firma. */
    autor(declaracion) {
      const declarado = /^\s*author\s*:\s*(.+)$/im.exec(declaracion)?.[1];
      return declarado === undefined ? undefined : autoresDeclarados(declarado);
    },
    /** Gutenberg no pagina: el `.txt` que se recupera es la obra entera. */
    pagina() {
      return undefined;
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
 * Obra, página, Autor y año a partir de la declaración de un documento ya versionado.
 *
 * Es la misma derivación que corre al recuperar, y corre otra vez al extraer. La cabecera
 * no participa: es registro de auditoría. Atar el año a la cabecera lo dejaba suelto —el
 * nombre del fichero solo ata la Fuente y la obra—, y editar a mano `año: 1492` en un
 * documento realmente recuperado producía candidatas con 1492.
 *
 * La **página** sale de aquí por el mismo motivo que la obra y el año: el nombre del
 * fichero la lleva dentro, y la puerta de la extracción lo compara contra lo derivado.
 */
export function derivarDeLaDeclaracion(
  idFuente: string,
  declaracion: string,
): { obra?: string; pagina?: string; autor?: AutorDeLaFuente; año?: number } {
  const lector = LECTORES_POR_FUENTE[idFuente];
  if (lector === undefined) return {};

  const obra = lector.obra(declaracion)?.trim();
  const pagina = lector.pagina(declaracion)?.trim();
  const autor = lector.autor(declaracion);
  const año = lector.año(declaracion);
  return {
    ...(obra !== undefined && obra !== '' ? { obra } : {}),
    ...(pagina !== undefined && pagina !== '' ? { pagina } : {}),
    // Ausente cuando el documento no declara a nadie: no es un documento roto, y la
    // puerta que lo coteja simplemente no actúa. Presente y con `nombres` vacío cuando
    // declara algo ilegible, que es otro estado y se rechaza.
    ...(autor !== undefined ? { autor } : {}),
    ...(año !== undefined ? { año } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// El Autor declarado y el Autor del Corpus — FR-23, Historia 11.1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partículas y tratamientos que no distinguen a un Autor de otro.
 *
 * Sin descartar `santa`, «Santa Teresa de Jesús» no concuerda con la «Teresa de Jesús»
 * que declara el Corpus. Sin descartar las partículas, la comparación se vuelve sensible
 * a cómo escribe cada Fuente el mismo nombre. `sor` se descarta aunque el Corpus lo lleve
 * dentro de «Sor Juana Inés de la Cruz», y por eso la regla funciona en los dos sentidos.
 */
const PARTICULAS_DE_NOMBRE: ReadonlySet<string> = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'san', 'santa', 'santo', 'sor', 'fray', 'don',
]);

/** Las palabras de un nombre que sí distinguen a un Autor, en forma canónica. */
export function tokensDeNombreDeAutor(nombre: string): string[] {
  return palabras(nombre).filter((token) => !PARTICULAS_DE_NOMBRE.has(token));
}

/**
 * Si el nombre que declara un documento y el que declara el Corpus son el mismo Autor.
 *
 * La dirección de la comparación es **Corpus ⊆ declarado**, y está medida sobre los
 * documentos versionados: la Fuente añade y no quita. «Miguel de Cervantes Saavedra» por
 * «Miguel de Cervantes», «Santa Teresa de Jesús» por «Teresa de Jesús». Exigir igualdad
 * rechazaría los dos; exigir que los tokens del declarado estén en el del Corpus
 * rechazaría los mismos dos, al revés. Exigir que los del Corpus estén en el declarado
 * los admite y sigue rechazando el caso real que abrió esta puerta: «Juan Montalvo»
 * contra «Manuel González Prada» no comparte ni un token.
 *
 * **Lo que esa dirección deja abierto, y conviene no prometer.** El argumento «la Fuente
 * añade y no quita» vale mientras lo que añade sea del mismo Autor. Cuando lo que añade
 * es el desambiguador de **otra persona**, la puerta pasa: el Corpus dice «Séneca» y un
 * documento de «Séneca el Viejo» concuerda, porque todos los tokens del Corpus están en
 * el declarado. No se arregla con un tope de tokens añadidos —«Cervantes Saavedra» y
 * «Séneca el Viejo» añaden uno cada uno y no se distinguen así—, y el riesgo crece cuanto
 * menos significativo sea el nombre del Corpus: un solo token lo contiene cualquier
 * nombre más largo. La vía de cerrarlo es declarar el nombre completo, o nombres
 * alternativos, en `corpus/autores/`, que es el dueño del lado del Corpus; endurecer esta
 * comparación rechazaría a Cervantes y a Teresa de Jesús antes que a nadie.
 *
 * No inventa nada ni deduce a nadie: compara lo que la Fuente declara con lo que el
 * Corpus declara, y quien no coincide no se extrae.
 */
export function esElMismoAutor(declarado: string, nombreDelCorpus: string): boolean {
  const delCorpus = tokensDeNombreDeAutor(nombreDelCorpus);
  const delDocumento = tokensDeNombreDeAutor(declarado);

  /*
   * Un nombre que se queda **entero** en partículas —«Sor», a secas— daría un conjunto
   * exigido vacío, y un conjunto vacío está contenido en cualquier cosa: la puerta se
   * abriría del todo. En ese caso mandan las palabras sin filtrar, en los dos lados a la
   * vez, para que la comparación siga siendo la misma en un sentido y en el otro.
   */
  const sinFiltrar = delCorpus.length === 0 || delDocumento.length === 0;
  const exigidos = sinFiltrar ? palabras(nombreDelCorpus) : delCorpus;
  const presentes = new Set(sinFiltrar ? palabras(declarado) : delDocumento);

  if (exigidos.length === 0 || presentes.size === 0) return false;
  return exigidos.every((token) => presentes.has(token));
}

// ─────────────────────────────────────────────────────────────────────────────
// El documento versionado
// ─────────────────────────────────────────────────────────────────────────────

export type DerivacionDeDocumento =
  | {
      ok: true;
      obra: string;
      /** La página de la obra de la que salió el cuerpo, si la obra tiene más de una. */
      pagina?: string;
      año?: number;
      declaracion: string;
      cuerpo: string;
    }
  | { ok: false; motivo: string };

/**
 * Declaración, obra, año y cuerpo de una página bruta, sin tocar disco ni red.
 *
 * `encabezado` es el texto de origen de la página cuando se ha podido recuperar —el
 * wikitexto de MediaWiki, de donde sale el `|año = 1905` que la página no renderiza—. Si
 * no llega, la derivación sigue con lo que declare la página: un metadato que falta no es
 * un fallo, y la candidata queda con obra y sin año.
 *
 * `encabezadoDeLaObra` es el texto de origen de la obra que la página declara en su
 * `|título`, que la recuperación solo pide cuando la página no declara año. Aporta el año
 * y nada más: la obra la sigue declarando la página.
 */
export function derivarDocumento(
  idFuente: string,
  bruto: string,
  encabezado?: string,
  encabezadoDeLaObra?: string,
): DerivacionDeDocumento {
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
    declaracion = lector.declaracion(
      bruto,
      aTextoPlano(bruto),
      cuerpo,
      encabezado,
      encabezadoDeLaObra,
    );
  } catch (fallo) {
    // Retirar el cromo puede rendirse; que se rinda es un error, no medio documento.
    return { ok: false, motivo: fallo instanceof Error ? fallo.message : String(fallo) };
  }

  const { obra, pagina, año } = derivarDeLaDeclaracion(idFuente, declaracion);
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

  return {
    ok: true,
    obra,
    declaracion,
    cuerpo,
    ...(pagina !== undefined ? { pagina } : {}),
    ...(año !== undefined ? { año } : {}),
  };
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
 * Un segmento del nombre: el slug, acotado y sin partir una palabra por la mitad.
 *
 * `undefined` cuando el texto no deja **ni una letra** al normalizarlo. No es un caso de
 * laboratorio: `normalizar` no retira `·` ni los símbolos sueltos, así que un título como
 * «···» produce un slug no vacío y sin nombre, y el fichero resultante no lo podría
 * volver a encontrar nadie.
 */
function segmentoDeNombre(texto: string): string | undefined {
  const limpio = slugDeObra(texto)
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
  return /[a-z0-9]/u.test(recortado) ? recortado : undefined;
}

/**
 * El nombre del documento de **una página**: `{id-de-fuente}--{slug-de-obra}--{slug-de-página}`.
 *
 * Un documento es el texto de una página concreta, y la 11.2 coteja cada Cita contra el
 * documento que la contiene. Atar el nombre solo a la obra hacía que dos páginas del mismo
 * libro —«Triste» y «Tibi Regina», las dos de «Los jardines interiores»— compitieran por
 * el mismo fichero, y la que perdía quedaba sin texto contra el que cotejar: la segunda
 * recuperación decía «ya versionado» y salía con éxito sin haber versionado su poema.
 *
 * Cuando la página **es** la obra —«El estado», «El sable»— el nombre se colapsa a
 * `{id-de-fuente}--{slug-de-obra}`, que es el de siempre: el caso que ya funcionaba no se
 * renombra. Y Gutenberg, que no pagina, no pasa nunca de un segmento.
 */
export function nombreDeDocumento(
  idFuente: string,
  obra: string,
  pagina?: string,
): string | undefined {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(idFuente)) return undefined;

  const deLaObra = segmentoDeNombre(obra);
  if (deLaObra === undefined) return undefined;

  const deLaPagina = pagina === undefined ? undefined : segmentoDeNombre(pagina);
  if (deLaPagina === undefined || deLaPagina === deLaObra) return `${idFuente}--${deLaObra}`;

  return `${idFuente}--${deLaObra}--${deLaPagina}`;
}
