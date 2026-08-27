/**
 * Extracción de candidatas desde una Fuente — FR-23.
 *
 * Puro y sin red: recibe el documento ya descargado y devuelve candidatas. La descarga
 * vive en `tools/extraer.ts`, que es una capa fina encima. Así lo que decide qué se
 * propone —y sobre todo qué no— se puede probar entero sin depender de que un servidor
 * de fuera esté disponible y diga hoy lo mismo que ayer.
 *
 * Lo que esta extracción **no** hace, y es la mitad del criterio: no completa la
 * Procedencia. Ni deduce el año de la fecha de fallecimiento del Autor, ni acepta un año
 * aproximado de la Fuente. Lo que no consta se omite; nunca se aproxima.
 *
 * Desde la Historia 11.5 tampoco propone lo que no se puede leer. Aquí y no en el cotejo:
 * el cotejo comprueba que una Cita es fiel a su documento, y un escaneo con el OCR roto
 * cumple eso perfectamente. Son dos puertas y las dos tienen que estar.
 */

import {
  SEÑALES,
  medirLegibilidad,
  type MedidaDeLegibilidad,
} from '../../src/lib/legibilidad.ts';
import { porcentajeEnEspañol } from '../../src/lib/formato.ts';
import { MAX_PROPORCION_ILEGIBLE } from '../../src/lib/umbrales.ts';
import { fuenteDe, type Fuente } from './fuentes.ts';

/** El documento tal y como lo entrega la Fuente, con su metadato de obra y año. */
export interface DocumentoDeFuente {
  /** Identificador de la Fuente en el conjunto cerrado. */
  fuente: string;
  /** Obra, tal y como la declara la Fuente. */
  obra: string;
  /** Año declarado por la Fuente. Puede venir aproximado; ver `añoExacto`. */
  año?: string | number;
  /**
   * Dirección concreta del documento, para poder volver a él.
   *
   * Obligatoria desde la Historia 11.2: `fuenteDeCita` la exige en el esquema, así que
   * una candidata sin ella nace inaprobable y el desacuerdo solo se veía al revisar,
   * lejos de donde se causó. Todo documento versionado la trae en su cabecera.
   */
  url: string;
  texto: string;
}

export interface Candidata {
  texto: string;
  autor: string;
  procedencia: { obra: string; año?: number };
  /** De dónde salió el texto y bajo qué licencia — el criterio lo exige por candidata. */
  fuente: { id: string; nombre: string; licencia: string; url: string };
}

export type Descarte =
  | { texto: string; motivo: 'no-esta-en-español' }
  | { texto: string; motivo: 'longitud' }
  | { texto: string; motivo: 'repetida' }
  | { texto: string; motivo: 'ilegible' }
  | { texto: string; motivo: 'aparato-de-la-fuente' }
  | { texto: string; motivo: 'trozo-de-cita-ajena' };

/**
 * Las frases con que la Fuente **envuelve** la obra: el pie de licencia que Wikisource añade a
 * cada página. Vienen dentro del documento, así que el cotejo de la 11.2 las da por buenas —la
 * frase aparece literal, porque la sirvió la Fuente— y sin esta puerta la extracción propone
 * atribuírselas al Autor. Se vio con 167 candidatas de una sátira: dos eran de Wikisource.
 *
 * Van por **frase completa de plantilla**, nunca por palabras sueltas. Un Autor puede escribir
 * «público» y en este Corpus hay quien escribe de leyes; nadie escribe «se encuentra en dominio
 * público» dentro de su obra. Una puerta laxa perdería Citas buenas en silencio, que es peor
 * que dejar pasar aparato: el aparato lo caza un lector, y la Cita perdida no la ve nadie.
 */
const APARATO_DE_LA_FUENTE = [
  // El pie de licencia.
  /se encuentra en dominio p[úu]blico/i,
  /fallecid?[oó] hace m[áa]s de \d+ a[ñn]os/i,
  /la traducci[óo]n de la obra puede no estar en dominio p[úu]blico/i,
  /*
   * Y el aviso de mantenimiento, que apareció después y entero: tres frases que la puerta
   * anterior dejó pasar porque solo miraba el pie. La ironía conviene tenerla presente —es
   * el aviso de que **la Fuente no consta**, y sin puerta se publicaría firmado por el Autor
   * y cotejado contra su documento, porque la frase está literal en él: la escribió la Fuente.
   *
   * Dos aparatos distintos en la misma familia de Fuentes dicen que el aparato **no se
   * acaba**. Cuando aparezca el tercero, su sitio es esta lista.
   */
  /la fuente de este texto no se ha especificado/i,
  /a menos que se a[ñn]ada informaci[óo]n de derechos de autor/i,
  /este aviso fue puesto el/i,
  /*
   * Y la línea con que el encabezado **firma** la página, que es el tercer aparato en tres
   * sesiones y el más irónico: es exactamente la línea que el lector de documentos aprendió a
   * interpretar para saber quién firma. Leída por él es un metadato; leída por la extracción,
   * una candidata a Cita del Autor cuya firma contiene.
   *
   * Va por la etiqueta al **principio** de la línea y no por el nombre: el nombre cambia con
   * cada Autor y la etiqueta no, y filtrar por nombre perdería toda Cita que hable de otro
   * escritor — que en este Corpus son muchas. Una frase de un Autor no empieza por «Autor:».
   */
  /^\s*(?:<<|«|‹‹)?\s*autor(?:es)?\s*:/i,
  /*
   * Y el folio de la edición transcrita, que es el cuarto aparato en cuatro sesiones y el
   * primero que va **dentro** de la frase del Autor en vez de ocupar línea propia:
   *
   *     …vida que envenenase la vida, -61- adoración que produjese el desprecio…
   *
   * Wikisource lo intercala donde caía en el papel. Publicarlo pondría un número de página en
   * medio de la Cita, y **el cotejo de la 11.2 lo daría por bueno**, porque está literal en el
   * documento: lo escribió la Fuente.
   *
   * Se descarta la candidata entera y no se le quita el número: quitarlo alteraría el texto
   * —NFR-12— y además dejaría una Cita que ya no aparece literal en su documento, así que la
   * 11.2 la rechazaría después de todos modos.
   *
   * La forma es estrecha —número **entre guiones y rodeado de espacios**— para que un rango
   * «1914-1918» y un guion de inciso sigan pasando.
   */
  /(?:^|\s)-\d{1,4}-(?=\s|$)/u,
  /*
   * Y la aprobación del libro impreso, que es la quinta forma en cinco sesiones y **la peor**.
   *
   * Las otras cuatro ensucian la Cita; ésta se la atribuye a quien no la escribió:
   *
   *     Ofrécelo su Autor ilustrado con erudición curiosa… sin haber en él algo que pueda
   *     deslucir el renombre de católico, ni ofender a las buenas costumbres.
   *
   * Eso lo firmó el censor que aprobó el libro en el XVII, y la Fuente transcribe la obra
   * entera, preliminares incluidos. **Y no lo caza nada de lo que hay**: el cotejo de la 11.2
   * pasa porque el texto está literal en el documento, y la puerta de FR-23 pasa porque el
   * documento declara a ese Autor —y es verdad, es su libro—. Una atribución falsa dentro de
   * un documento auténtico es un caso que ninguna de las dos puertas mira.
   *
   * Las fórmulas son las **del trámite**, nunca las del asunto. Un moralista escribe sobre las
   * buenas costumbres y sobre la fe a todas horas —estos Autores lo hacen—; lo que no escribe
   * es la petición de licencia de su propio libro.
   */
  /*
   * Y el aviso de que la transcripción está a medias, que es la sexta forma y la primera que
   * llega **por el arreglo de otra cosa**: apareció al abrirse las páginas compuestas por
   * transclusión en la 80.ª, porque son justamente las que lo llevan mientras se corrigen.
   *
   * Lo que esta sexta enseña sobre las cinco anteriores: cada vez que se abre una puerta
   * nueva —un lector que entiende una forma más de página— entra con ella una forma nueva de
   * aparato. La lista no estaba incompleta; crece con el alcance.
   */
  /\blagunas de contenido\b|\bdeficiencias de formato\b/i,
  /\b(?:esta )?obra se encuentra en desarrollo\b/i,
  /\bla licencia que (?:se )?(?:pide|suplica|solicita)\b/i,
  /\bofr[ée]cel[oa] su autor\b/i,
  /\bofend[ae]n? las buenas costumbres\b/i,
  /\bcontrario a nuestra santa fe\b/i,
  /*
   * Séptima y octava forma, las dos de un artículo de prensa del XIX y las dos con la trampa de
   * siempre: **la 11.2 las daría por buenas**, porque están literales en el documento.
   *
   *   · `↑` es el retorno de una nota al pie, y arrastra la línea entera detrás:
   *     «↑ Almanaque de Galicia, para uso de la juventud elegante y de buen tono». Sale como
   *     candidata perfectamente formada y es la bibliografía de una nota, no una frase del Autor.
   *     Solo cuenta **al principio de la línea**: en medio, la flecha es del Autor y se respeta.
   *
   *   · El guion con que el impresor cortaba la palabra al acabar el renglón, que la
   *     transcripción conserva: «…no son en tales ocasio-». La sentencia queda cercenada.
   *     La forma es estrecha a propósito —guion **pegado a letras** y en final de frase— para que
   *     un guion de inciso («Y entonces calló —») y un compuesto («franco-alemán») sigan pasando.
   *
   * Se descarta la candidata entera y **no se recompone la palabra**: unirla sería reconstruir
   * texto que la Fuente no da junto —NFR-12— y dejaría una Cita que ya no aparece literal en su
   * documento, así que la 11.2 la rechazaría después.
   *
   * Medido antes de escribirlas: **una candidata en revisión de cada forma, de 4265, y cero de
   * las 1191 Citas publicadas**. Se llega a tiempo, como con el folio.
   */
  /^\s*↑/u,
  /[\p{Ll}\p{Lu}]-$/u,
  /*
   * Novena forma, y **la que más produce de golpe**: la línea del índice de capítulos.
   *
   *     Capítulo I - De la penitencia que a imitación de Beltenebros principió y no concluyó
   *     nuestro buen caballero don Quijote
   *
   * La página raíz de una obra con capítulos es su tabla de contenidos, y cada línea sale como
   * candidata perfectamente formada. Un solo documento dio **sesenta**. Las escribió la Fuente al
   * componer el índice, no el Autor al escribir la obra, y **la 11.2 las daría por buenas** porque
   * están literales en el documento.
   *
   * Enseña además un límite de la heurística del tamaño: `ES_INDICE_POR_DEBAJO_DE`, en
   * `tools/lib/cantera.ts`, distingue índice de texto por lo que pesa la página, y funciona
   * mientras el índice sea escueto. Éste pesaba **8,2 KB** porque sus sesenta títulos son largos,
   * así que pasó por texto. El tamaño no basta; lo que delata un índice es de qué están hechas
   * sus líneas, y por eso la puerta va aquí y no allí.
   *
   * La forma es estrecha: palabra de división, su número —romano o árabe— y un separador. «Capítulo
   * aparte merece…» y «En el capítulo III se demuestra…» siguen pasando, y hay pruebas de ello.
   */
  /^\s*(?:cap[íi]tulo|libro|parte|tomo|acto|escena)\s+[IVXLCDM\d]+\s*[-–—.:]/iu,
  /*
   * Décima forma, y **la primera que llega de otra Fuente**. Al abrir Project Gutenberg —admitido
   * desde siempre y con un solo documento en ciento cuarenta y tres— entraron sus propias marcas:
   *
   *     * Las páginas en blanco han sido eliminadas.
   *     * Los errores de imprenta han sido corregidos.
   *
   * Lo escribió quien transcribió el libro, no el Autor, y está literal en el documento: la 11.2
   * lo daría por bueno. Confirma lo que la 80.ª anotó —cada puerta nueva trae su aparato nuevo—.
   *
   * **Y hay una segunda forma que se midió y NO se puso.** El mismo libro trae títulos de sección
   * en versales, y cerrar «toda línea entera en mayúsculas» habría sido fácil; medirlo lo impidió:
   * de las cinco candidatas que casaban, **dos eran epitafios citados dentro de la obra**, que son
   * texto del Autor. Una puerta que se lleva por delante texto legítimo es peor que no tenerla,
   * porque el descarte no se ve. Los títulos en versales se descartan a mano al leer.
   *
   * **Y la forma que se eligió no enumera fórmulas.** Al leer aparecieron tres variantes más
   * —la ortografía actualizada, las notas renumeradas, las tildes puestas a las mayúsculas—, y
   * enumerar deja siempre la sexta fuera. Se midió entonces **la línea que abre con asterisco**:
   * de 6123 candidatas la cumplen **cinco, y las cinco son notas del transcriptor**; de las 1273
   * Citas publicadas, **ninguna**. Es a la vez más ancha y más segura, porque el asterisco inicial
   * lo pone la Fuente y nunca el Autor.
   */
  /^\s*\*\s/u,
  /^\s*nota\s+del\s+transcriptor/iu,
  /*
   * Y la misma nota **sin asterisco**, que llegó con el segundo libro de la misma Fuente:
   *
   *     Errores evidentes de impresión y de puntuación han sido corregidos.
   *
   * Cada libro puede traer su propio modo de decir lo mismo, así que la familia se cierra también
   * por **lo que la nota dice**: hablar de la intervención sobre el texto —errores corregidos,
   * ortografía actualizada, notas renumeradas— en voz pasiva y sin sujeto humano. «El editor
   * corrigió los errores de aquella impresión» está en activa, lo dice el Autor y se queda.
   */
  /^\s*(?:errores?|erratas?|las\s+notas|la\s+ortograf[íi]a|las\s+p[áa]ginas|se\s+han?)\b[^.]*\bhan?\s+sido\s+(?:corregid|actualizad|renumerad|eliminad|respetad|conservad)/iu,
  /*
   * Y la tercera variante, del tercer libro de la misma Fuente: el **impersonal**.
   *
   *     Se ha respetado la ortografía y la acentuación del original.
   *
   * Ni asterisco ni «han sido». A estas alturas la lección conviene dejarla escrita: **la familia
   * no se cierra enumerando fórmulas**, porque cada transcriptor escribe la suya. Lo que se cierra
   * es el patrón —hablar de lo que se le hizo al texto sin decir quién—, y de ahí las tres formas:
   * asterisco inicial, pasiva «han sido …» e impersonal «se ha …» seguido del verbo de la
   * intervención.
   *
   * Con sujeto, se queda: «La imprenta se ha modernizado, y con ella la lectura» lo dice el Autor.
   */
  /^\s*se\s+han?\s+(?:respetado|conservado|mantenido|corregido|actualizado|modernizado|unificado)\s+(?:la|las|el|los)\b/iu,
  /*
   * Decimotercera: la **ficha bibliográfica** de una sección de reseñas.
   *
   *     Federico de Castro.--Madrid, 1895; un tomo en 4.º, 2,50 pesetas.
   *
   * El volumen que la trajo no es solo un ensayo: incluye la sección de reseñas de la revista
   * donde apareció, y cada ficha sale como candidata bien formada. La escribió el redactor de esa
   * sección, no el Autor, y está literal en el documento: la 11.2 la daría por buena.
   *
   * Lo que la delata es **el aparato de librero y no el tema**: tomos con su formato, precio en
   * pesetas, o pie de imprenta con ciudad, año y punto y coma. Hablar de libros, de Madrid o de
   * dinero no basta —hay prueba de las tres cosas—, porque el Autor puede hacerlo y lo hace.
   *
   * Medido: 13 candidatas de 7209, y cero de las 1360 Citas publicadas.
   */
  /\b(?:un|dos|tres|cuatro|cinco|seis)\s+tomos?\s+en\s+\d|\d+[,.]\d+\s*pesetas|\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s*1[89]\d\d(?:-\d\d)?\s*;/u,

  /*
   * El **número de página al abrir el renglón**, que el OCR dejó pegado al texto.
   *
   * Sin ordinal a propósito: los comentarios de arriba numeran hasta la decimotercera y el array
   * tiene diecisiete patrones, así que la cuenta ya iba por detrás. Añadir «decimocuarta» sería
   * afirmar un número no comprobado, que es justo lo que este fichero existe para no hacer.
   *
   * No confundir con el **folio intercalado** —«…que envenenase la vida, -61- adoración que…»—,
   * que tiene su propia forma y su propia prueba: aquél va dentro de la frase y entre guiones;
   * éste abre el renglón y viene del entrelazado de columnas.
   *
   * El documento que la abrió está compuesto a dos columnas y el OCR las entrelazó:
   *
   *     109 Su ejemplo es por sí sólo una Su ejemplo es por sí solo una influencia social
   *     127 para cuanto dice referencia á para cuanto hace referencia á las necesidades materiales
   *
   * Es la peor clase de basura porque **es español legible**: la puerta de la 11.5 mide caracteres
   * ajenos y OCR roto, no repetición, así que la deja pasar entera.
   *
   * La firma obvia era la repetición —cuatro palabras que aparecen dos veces—, y medida **caza 17
   * de las 1497 Citas publicadas**, todas buenas: son anáfora («Aun en el nombre es peligroso
   * comunicar con los malos, y hasta en el nombre es útil comunicar con los buenos»). Diecisiete
   * muertas para cazar treinta y cuatro. Descartada.
   *
   * Lo que sirve es la etiqueta de página con que abre el renglón, sin depender de la repetición.
   *
   * Medido: **0 de 1497 publicadas** y **34 de 11 095 candidatas**, y las 34 son doblado real.
   */
  /^\s*\d{1,4}\s+\p{L}/u,

  /*
   * La **lista de lecturas** que el Autor deja al final de un capítulo.
   *
   *     Las historias y las costumbres de los germanos (uno).--SALUSTIO: Conjuración de Catilina.
   *     Teatro selecto (dos).--HUMBOLDT: Colón y el descubrimiento de América (dos).
   *
   * Hermana de la ficha bibliográfica de arriba y distinta: aquélla la escribe el redactor de una
   * sección de reseñas y la delata el aparato de librero —tomos, formato, pesetas—; ésta **la
   * escribe el Autor**, es un plan de estudios y no lleva precio ninguno. Que la escriba él no la
   * hace Cita: es un índice, y un índice no dice nada suelto.
   *
   * Lo que la delata es el **nombre en versales con dos puntos detrás de una raya doble**, que es
   * como la Fuente transcribe las entradas. Un nombre en versales dentro de la prosa no lo cumple,
   * ni un inciso con raya doble sin nombre detrás.
   *
   * Medido: **0 de 1558 publicadas** y **10 de 14 745 candidatas**, y las diez son listas.
   */
  /--\s*[A-ZÁÉÍÓÚÑÜ]{3,}\s*:/u,
];

/** Si la frase es aparato de la Fuente y no texto del Autor. */
export function esAparatoDeLaFuente(sentencia: string): boolean {
  return APARATO_DE_LA_FUENTE.some((plantilla) => plantilla.test(sentencia));
}

const ABRE_COMILLA = new Set(['«', '“']);
const CIERRA_COMILLA = new Set(['»', '”']);

/**
 * Si la frase lleva una comilla sin pareja, y por tanto dice palabras de otro.
 *
 * La 144.ª apartó a mano una candidata excelente por **cerrar** una comilla que no abría:
 * eso es el final de una cita dentro del texto, y publicarla atribuiría al Autor lo que
 * quizá copió. El caso espejo vale igual —si **abre** y no cierra, la cita sigue más allá
 * de la frase—, y de la 147.ª a la 151.ª el mismo peligro salió en cuatro obras seguidas y
 * sin relación entre ellas: la conferencia que reproduce al adversario para condenarlo, la
 * que cita a Maquiavelo, la que sigue traduciendo a un historiador después de nombrarlo y
 * la que copia a Tocqueville párrafo a párrafo.
 *
 * Ninguna de las otras puertas la ve, y **ésa es la razón de que sea peligrosa**: la frase
 * está literal en el documento, así que el cotejo de la 11.2 la da por buena; está en
 * español y es legible. Sólo la delata la puntuación.
 *
 * Medido antes de escribirla, que es lo que decide si una medida asciende a puerta:
 * **0 de 1595 Citas publicadas** llevan comillas descompensadas y **351 de 19 036
 * candidatas** sí. Una puerta que no muerde nada de lo publicado.
 *
 * No mira la comilla recta `"`: abre y cierra con el mismo carácter, así que un número
 * impar dentro de una frase no dice de qué lado está el hueco, y contarlo obligaría a leer
 * el párrafo entero. Ausencia de regla antes que regla que adivina.
 */
export function esTrozoDeCitaAjena(sentencia: string): boolean {
  let abiertas = 0;
  for (const caracter of sentencia) {
    if (ABRE_COMILLA.has(caracter)) abiertas += 1;
    else if (CIERRA_COMILLA.has(caracter)) {
      if (abiertas === 0) return true;
      abiertas -= 1;
    }
  }
  return abiertas > 0;
}

export type ResultadoDeExtraccion =
  | { ok: true; candidatas: Candidata[]; descartadas: Descarte[] }
  | { ok: false; motivo: string };

/**
 * La ventana de longitud de una candidata.
 *
 * Por debajo del mínimo no es una Cita, es un fragmento de frase que no se sostiene fuera
 * de su párrafo. El máximo no es el corte de FR-10 —una Cita puede pasarlo y publicarse
 * igual, solo que sin Imagen—, sino el punto a partir del cual una frase suelta deja de
 * poder leerse como sentencia.
 */
export const MIN_CARACTERES_CANDIDATA = 40;
export const MAX_CARACTERES_CANDIDATA = 240;

/**
 * Palabras que solo son frecuentes en español, y las que delatan otra lengua.
 *
 * No es un identificador de idioma de propósito general y no pretende serlo. Es la
 * comprobación concreta que pide el criterio: una obra en español con pasajes en latín
 * —Gracián, Quevedo y media Edad de Oro citan en latín— no debe proponer esos pasajes.
 */
const ESPAÑOLAS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'por', 'con',
  'para', 'su', 'sus', 'es', 'se', 'no', 'al', 'lo', 'como', 'más', 'pero', 'sin',
  'sobre', 'ni', 'porque', 'cuando', 'quien', 'todo', 'todos', 'nada', 'hay', 'ser',
]);

const AJENAS = new Set([
  // latín
  'est', 'non', 'quod', 'qui', 'sed', 'cum', 'atque', 'enim', 'nec', 'ipse', 'omnia',
  // inglés
  'the', 'and', 'of', 'to', 'is', 'that', 'it', 'with', 'for', 'not', 'this',
  // francés
  'le', 'les', 'des', 'est', 'pas', 'dans', 'pour', 'qui', 'vous', 'nous', 'être',
  // italiano
  'gli', 'che', 'della', 'sono', 'perché', 'anche', 'questo',
  // portugués
  'não', 'uma', 'você', 'mais', 'está', 'são', 'muito',
]);

function palabras(texto: string): string[] {
  return texto
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p !== '');
}

/**
 * Si el texto está en español.
 *
 * Se compara el peso de las palabras funcionales españolas contra el de las ajenas, en
 * vez de buscar solo las españolas: un pasaje en latín dentro de una obra en español
 * puede traer alguna palabra que coincida, y contar solo aciertos lo daría por bueno.
 */
export function estaEnEspañol(texto: string): boolean {
  const todas = palabras(texto);
  if (todas.length < 6) return false;

  let españolas = 0;
  let ajenas = 0;
  for (const palabra of todas) {
    if (ESPAÑOLAS.has(palabra)) españolas += 1;
    // Una palabra puede estar en las dos listas («que», «qui»); manda el desempate.
    else if (AJENAS.has(palabra)) ajenas += 1;
  }

  // Una frase española cualquiera pasa holgadamente de una función de cada diez palabras.
  return españolas > ajenas && españolas / todas.length >= 0.12;
}

/**
 * El año de la Fuente, solo si es exacto.
 *
 * «c. 1615», «hacia 1615», «1615?» y «1615-1620» son aproximaciones, y FR-2 no admite
 * Procedencia aproximada. Se devuelve `undefined` y la candidata queda con obra y sin
 * año: procedencia parcial, que es un estado legítimo del modelo. Lo que no es legítimo
 * es escribir 1615 como si constara.
 */
export function añoExacto(declarado: string | number | undefined): number | undefined {
  if (declarado === undefined) return undefined;
  if (typeof declarado === 'number') return Number.isInteger(declarado) ? declarado : undefined;

  const limpio = declarado.trim();
  return /^-?\d{1,4}$/.test(limpio) ? Number(limpio) : undefined;
}

/**
 * Parte el texto en sentencias, respetando las comillas angulares y los puntos suspensivos.
 *
 * **Dentro de cada párrafo, nunca a través de ellos.** Antes esto empezaba colapsando todo
 * el espacio en blanco a un espacio, y con él se llevaba por delante los saltos de párrafo;
 * entonces un párrafo que no acaba en punto —un epígrafe— se pegaba al que venía detrás:
 *
 *   «Discurso Puede el hombre con ardimiento y con bondad ser valiente y virtuoso…»
 *
 * Es el mismo defecto que el título pegado de la 60.ª sesión, un renglón más abajo, y en un
 * solo documento de 222 KB envenenaba 42 candidatas — 26 de ellas las mejores del libro.
 *
 * El arreglo no adivina qué es un epígrafe: **respeta una estructura que la Fuente ya
 * declara**. Una frase no cruza un párrafo, y un epígrafe es un párrafo entero. Los saltos
 * sueltos de dentro del párrafo sí se colapsan: ahí Wikisource parte los renglones donde le
 * caben, y cortar por ellos trocearía media obra por la mitad de sus frases.
 */
function sentencias(texto: string): string[] {
  return texto
    .split(/\n[ \t]*\n\s*/u)
    .flatMap((parrafo) =>
      parrafo
        .replace(/\s+/gu, ' ')
        .split(/(?<=[.!?…])\s+(?=[«"¿¡A-ZÁÉÍÓÚÑ])/u),
    )
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/**
 * Candidatas de un documento.
 *
 * Se detiene entera —sin proponer ni una— cuando la licencia de la Fuente no permite
 * reutilizar. Devolver «las que se puedan» sería peor que no devolver nada: dejaría en
 * revisión candidatas que nadie puede publicar y que alguien acabaría aprobando.
 */
/**
 * Si de esa Fuente se puede extraer, y si no, por qué no.
 *
 * Vive aparte porque la puerta se cruza dos veces: aquí, y antes de derivar nada en
 * `tools/extraer.ts`. Con el mensaje escrito en un solo sitio, una Fuente cuya licencia
 * no permite reutilizar recibe la misma explicación se detenga donde se detenga.
 */
export function fuenteUtilizable(
  id: string,
): { ok: true; fuente: Fuente } | { ok: false; motivo: string } {
  const fuente: Fuente | undefined = fuenteDe(id);
  if (fuente === undefined) {
    return {
      ok: false,
      motivo:
        `«${id}» no es una Fuente admitida. Las admitidas están en ` +
        'tools/lib/fuentes.ts, cada una con su licencia.',
    };
  }

  if (!fuente.permiteReutilizacion) {
    return {
      ok: false,
      motivo:
        `${fuente.nombre} no admite extracción: ${fuente.razon} ` +
        `(licencia declarada: ${fuente.licencia}). No se ha escrito ninguna candidata.`,
    };
  }

  return { ok: true, fuente };
}

/**
 * Si un texto pasa la puerta de legibilidad — Historia 11.5.
 *
 * Vale igual para el documento entero y para una candidata suelta, con el mismo umbral, y
 * el desnivel entre los dos casos es el que se busca: ver `MAX_PROPORCION_ILEGIBLE`.
 */
export function esLegible(medida: MedidaDeLegibilidad): boolean {
  return medida.proporcion <= MAX_PROPORCION_ILEGIBLE;
}

/** El porcentaje de una medida, escrito como lo escribe el proyecto: «4,3 %». */
function comoPorcentaje(proporcion: number): string {
  return porcentajeEnEspañol(Number((proporcion * 100).toFixed(1)));
}

/**
 * Por qué se rechaza un documento entero, con la medida y con lo que se vio.
 *
 * La medida va en el mensaje a propósito. Sin ella, «no se puede leer» es un veredicto sin
 * apelación posible: quien siembra no sabe si el documento está roto del todo o si le ha
 * faltado un pelo, ni si el umbral es el que hay que discutir.
 */
function motivoDeIlegible(medida: MedidaDeLegibilidad): string {
  const vistas = SEÑALES.filter((s) => medida.señales[s] > 0).join(', ');
  return (
    `El documento no se puede leer: ${medida.sospechosas} de sus ${medida.palabras} palabras ` +
    `traen señales de OCR roto (${comoPorcentaje(medida.proporcion)} %, por encima del ` +
    `${comoPorcentaje(MAX_PROPORCION_ILEGIBLE)} % admitido).\n` +
    `Señales vistas: ${vistas}. Por ejemplo: ${medida.ejemplos.map((e) => `«${e}»`).join(', ')}.\n` +
    'No se ha escrito ninguna candidata: una Cita sacada de aquí saldría mutilada y con la ' +
    'firma de su Autor, y el cotejo literal la daría por buena porque la basura está en el ' +
    'documento.\n' +
    'El documento se queda versionado tal cual. Recuperar es archivar lo que la Fuente da; ' +
    'lo que no puede es sembrar, y corregirlo a mano sería inventar lo que la edición decía.'
  );
}

/**
 * El cuerpo sin la línea del título, cuando la trae.
 *
 * Wikisource renderiza el título **dentro** de la región de contenido, así que el cuerpo que
 * `recuperar` versiona empieza a menudo con el nombre de la obra en su propia línea. Como esa
 * línea no acaba en punto, el troceador la pega a la primera frase de verdad y la candidata sale
 * así:
 *
 *   «La crisis actual del patriotismo español «Á lo cual replicó el vizcaíno: ¿yo no caballero?»
 *
 * Estaba anotado en `LOOP-PROTOCOL-V4.md` desde la 20.ª sesión y seguía sin arreglar. No es solo
 * una candidata desperdiciada: aprobarla publicaría una Cita cuyo texto **empieza con el título de
 * su propia obra**, y el cotejo de la 11.2 la daría por buena, porque ese texto está en el
 * documento.
 *
 * Se quita por **igualdad con la obra declarada**, y solo la primera línea. Una heurística del
 * tipo «línea corta y sin punto» cazaría también el primer verso de un poema; y quitar cualquier
 * aparición del título silenciaría al Autor que nombra su propia obra dentro del texto.
 */
function sinElEncabezado(texto: string, obra: string): string {
  const lineas = texto.split('\n');
  const primera = lineas.findIndex((l) => l.trim() !== '');
  if (primera === -1 || lineas[primera].trim() !== obra.trim()) return texto;
  return lineas.slice(primera + 1).join('\n');
}

export function extraerCandidatas(
  documento: DocumentoDeFuente,
  autor: string,
): ResultadoDeExtraccion {
  const utilizable = fuenteUtilizable(documento.fuente);
  if (!utilizable.ok) return utilizable;
  const { fuente } = utilizable;

  if (documento.obra.trim() === '') {
    return {
      ok: false,
      motivo:
        'El documento no declara obra. Sin obra, la Procedencia habría que inferirla, y ' +
        'FR-2 no lo admite.',
    };
  }

  /*
   * La puerta del documento entero, antes de proponer nada.
   *
   * Se detiene entero y no candidata a candidata porque cuando la edición está rota lo que
   * falla no son unas frases sino el testimonio: las que salieran limpias lo estarían por
   * suerte, y aprobarlas sería fiarse de un documento que ya se sabe que miente.
   */
  const medida = medirLegibilidad(documento.texto);
  if (!esLegible(medida)) return { ok: false, motivo: motivoDeIlegible(medida) };

  const año = añoExacto(documento.año);
  const descartadas: Descarte[] = [];
  const candidatas: Candidata[] = [];
  const vistas = new Set<string>();

  for (const sentencia of sentencias(sinElEncabezado(documento.texto, documento.obra))) {
    const longitud = [...sentencia].length;

    if (longitud < MIN_CARACTERES_CANDIDATA || longitud > MAX_CARACTERES_CANDIDATA) {
      descartadas.push({ texto: sentencia, motivo: 'longitud' });
      continue;
    }

    if (!estaEnEspañol(sentencia)) {
      descartadas.push({ texto: sentencia, motivo: 'no-esta-en-español' });
      continue;
    }

    /*
     * Antes que la legibilidad, porque el pie **es** legible y está en español: no lo caza
     * ninguna de las otras puertas, y el cotejo tampoco, que es justo lo que lo hace peligroso.
     */
    if (esAparatoDeLaFuente(sentencia)) {
      descartadas.push({ texto: sentencia, motivo: 'aparato-de-la-fuente' });
      continue;
    }

    /*
     * Y aquí mismo, por lo mismo: la frase con una comilla sin pareja está literal en el
     * documento y en español, así que ninguna de las puertas de abajo la ve. La diferencia
     * con el aparato es de quién son las palabras — allí de la Fuente, aquí de un tercero
     * a quien el Autor cita— y por eso lleva motivo propio en vez de colarse en aquél.
     */
    if (esTrozoDeCitaAjena(sentencia)) {
      descartadas.push({ texto: sentencia, motivo: 'trozo-de-cita-ajena' });
      continue;
    }

    /*
     * Y la puerta por candidata, para el documento que solo está roto a trozos. Se
     * descarta entera: jamás se «arregla» el texto para que pase, porque corregir un OCR a
     * ojo es inventar lo que la edición decía. Ausencia antes que mutilación.
     */
    if (!esLegible(medirLegibilidad(sentencia))) {
      descartadas.push({ texto: sentencia, motivo: 'ilegible' });
      continue;
    }

    const clave = sentencia.toLocaleLowerCase('es');
    if (vistas.has(clave)) {
      descartadas.push({ texto: sentencia, motivo: 'repetida' });
      continue;
    }
    vistas.add(clave);

    candidatas.push({
      texto: sentencia,
      autor,
      procedencia: año === undefined ? { obra: documento.obra } : { obra: documento.obra, año },
      fuente: {
        id: fuente.id,
        nombre: fuente.nombre,
        licencia: fuente.licencia,
        url: documento.url,
      },
    });
  }

  return { ok: true, candidatas, descartadas };
}
