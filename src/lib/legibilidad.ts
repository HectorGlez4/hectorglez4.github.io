/**
 * Legibilidad de un texto — Historia 11.5.
 *
 * La puerta literal de la Historia 11.2 comprueba que una Cita **es fiel a su documento**.
 * No comprueba que el documento se pueda leer. Un escaneo con el OCR roto la pasa entera:
 * la basura aparece literal en su fichero y se da por buena. La primera sesión de sembrado
 * real lo demostró con el *Apéndice a Mis últimas tradiciones peruanas* de Ricardo Palma:
 * 61 candidatas con «enseiia», «Ileno», «For- mabalo», «qus», «tata* rabuelos»,
 * «italianoTonti». Todas fieles a su documento; todas ilegibles.
 *
 * Esto mide lo otro: si el texto **parece transcrito o parece escaneado**. Se cuenta lo que
 * se puede contar sin entender el texto —sin diccionario, sin servicio, sin red (AD-14,
 * AD-22)— y se devuelve una proporción. Quien decide con ella es `tools/lib/extraccion.ts`,
 * cruzándola contra `MAX_PROPORCION_ILEGIBLE` (AD-9). Aquí no hay umbral ni veredicto.
 *
 * **No corrige nada.** No se devuelve texto: solo números. Arreglar un OCR a ojo es
 * inventar lo que la edición decía, y ausencia antes que mutilación.
 *
 * ## Por qué estas señales y no un diccionario
 *
 * El riesgo de esta medida no es dejar pasar basura —para eso están las seis señales y la
 * revisión humana detrás—, sino **descartar a Góngora**. Un diccionario de español moderno
 * daría por ilegible medio Siglo de Oro, el latín de Séneca y cualquier nombre propio
 * extranjero. Por eso cada señal es una imposibilidad **mecánica**: formas que un tipógrafo
 * no compone y un escáner sí produce. Donde había que elegir entre cazar más basura y
 * arriesgar un falso positivo, se ha elegido lo segundo siempre.
 */

/** Las señales de OCR roto. Cada una es una forma que la tipografía española no produce. */
export type SeñalDeOcr =
  | 'palabra-partida'
  | 'mayúscula-intercalada'
  | 'cifra-en-palabra'
  | 'carácter-ajeno'
  | 'letra-suelta'
  | 'impronunciable';

export const SEÑALES: readonly SeñalDeOcr[] = [
  'palabra-partida',
  'mayúscula-intercalada',
  'cifra-en-palabra',
  'carácter-ajeno',
  'letra-suelta',
  'impronunciable',
];

export interface MedidaDeLegibilidad {
  /** Palabras contadas: todo lo que tiene alguna letra o alguna cifra. */
  palabras: number;
  /** Palabras que dispararon **al menos** una señal. Una palabra cuenta una vez. */
  sospechosas: number;
  /** `sospechosas / palabras`, o 0 si no hay palabras. Lo que se cruza con el umbral. */
  proporcion: number;
  /** Cuántas veces disparó cada señal. Para poder decir *qué* se vio, no solo cuánto. */
  señales: Record<SeñalDeOcr, number>;
  /** Unas cuantas palabras sospechosas, literales, para el mensaje de rechazo. */
  ejemplos: string[];
}

/** Cuántas palabras sospechosas se guardan como muestra. Es presentación, no regla. */
const EJEMPLOS = 6;

/**
 * Caracteres que una transcripción de obra en español no usa nunca, y un escáner sí.
 *
 * Es una lista de lo **prohibido** y no de lo permitido, y la diferencia es deliberada. El
 * corpus real usa comillas latinas, inglesas, voladitas, rayas, guiones, paréntesis,
 * corchetes y hasta los adornos angulares del Quijote de Gutenberg (U+1F65D, U+1F65F): una
 * lista de lo permitido habría descartado ese Quijote por su propia tipografía. Un
 * carácter raro que nadie previó pasa; una mancha interpretada como asterisco, no.
 *
 * `&` queda fuera a propósito: «&c.» por «etcétera» es abreviatura de época. `/` también:
 * separa versos cuando se cita poesía en línea.
 */
const AJENOS = /[*|\\_^~=+#@<>{}$%`�]/u;

/** Guiones que parten una palabra al final de renglón. La raya (—) no es uno de ellos. */
const GUIONES_DE_CORTE = /\p{L}[-‐‑­¬]$/u;

/**
 * Las palabras españolas de una sola letra, incluidas las de ortografía antigua.
 *
 * «ó» y «é» por «o» y «y» son de las ediciones del XIX, que son justamente las que se
 * escanean. Fuera de esta lista, una letra suelta en medio de la prosa es un resto: la «í»
 * que el escáner leyó como «i», o la mitad de una palabra que perdió el resto.
 */
const DE_UNA_LETRA = new Set(['a', 'e', 'o', 'u', 'y', 'á', 'é', 'í', 'ó', 'ú']);

/** Vocales del español, con la «y» incluida por su valor vocálico en «rey» o «muy». */
const VOCALES = /[aeiouáéíóúüy]/;

/** Un número romano no lleva vocal y no por eso es basura: «MDCXL», «LXX», «XV». */
const ROMANO = /^[IVXLCDM]+$/;

/** Escritura latina: fuera de ella no se juzga la pronunciación. Ver `esImpronunciable`. */
const NO_LATINA = /[^\p{Script=Latin}]/u;

/**
 * Si el texto usa el guion corto como raya de diálogo, a la manera de muchas ediciones.
 *
 * Importa porque una raya de cierre —«-dijo don Quijote- que…»— es indistinguible de una
 * palabra cortada al final de renglón si se mira solo el guion. Los dos *Capítulos que se
 * le olvidaron a Cervantes* de Montalvo dan 34 de esas, todas legítimas. Cuando el texto
 * abre diálogos así, la señal de palabra partida deja de ser fiable y se calla: es
 * preferible perder una señal de seis a descartar a Montalvo por su puntuación.
 */
function usaGuionComoRaya(crudas: string[]): boolean {
  return crudas.some((t) => /^[-‐‑]\p{L}/u.test(t));
}

const SIN_PUNTUACION_INICIAL = /^[^\p{L}\p{N}]+/u;
const SIN_PUNTUACION_FINAL = /[^\p{L}\p{N}]+$/u;
/** Los ordinales voladitos son letras para Unicode, pero no para «cifra pegada a letra». */
const VOLADITAS = /[ºª°]/gu;

/**
 * Si la palabra es impronunciable en español, por su forma y no por su significado.
 *
 * Las cuatro reglas son fonotácticas, no de vocabulario: valen igual para un arcaísmo, un
 * cultismo y un nombre propio que nadie ha oído. «Fablar», «auri-rizada», «Nietzsche» y
 * «Shakespeare» las pasan; «qus», «enseiia» y «rbl» no.
 */
function esImpronunciable(nucleo: string, letras: string): boolean {
  if (letras.length < 2) return false;

  /*
   * Un número romano no es una palabra y no se pronuncia como tal: «III» lleva la í
   * triplicada, «XVIII» tiene «ii», y «LXX» no tiene vocal. Los tres capítulos de
   * cualquier obra darían positivo en tres señales distintas. Se exime entero, y en
   * mayúsculas, que es como se compone: así «vivid» sigue juzgándose como palabra.
   */
  if (ROMANO.test(nucleo)) return false;

  /*
   * Tras «qu» siempre va vocal, y tras «q» siempre va «u». «qus» —que es «que» mal leído—
   * no lo cumple.
   *
   * Se para en la vocal y no en «e/i» a propósito, aunque el español solo tenga «que» y
   * «qui»: el latín escribe «quod», «quam», «quae» y «aequo», y Sor Juana, Unamuno y el
   * propio Quijote los traen a docenas. La regla que los descartara sería una regla de
   * vocabulario disfrazada de fonotaxis, y esto no juzga vocabulario.
   */
  if (/q(?!u|$)/.test(letras) || /qu(?![aeiouáéíóú])/.test(letras)) return true;

  /*
   * «ii» y «uu» seguidas de vocal no existen: «enseiia» es «enseña» con la eñe partida en
   * dos íes. Seguidas de consonante sí existen, y en textos que este Corpus siembra: los
   * ablativos latinos de Sor Juana —«beneficiis», «Ecclesiis»— y los compuestos modernos
   * con prefijo, «antiinflamatorio», «chiita».
   */
  if (/([iu])\1[aeiouáéíóú]/.test(letras)) return true;

  // Ninguna letra se triplica en español.
  if (/(.)\1\1/.test(letras)) return true;

  /*
   * Y ninguna palabra española se pronuncia sin vocal. Solo se juzga lo escrito en
   * alfabeto latino: el «ζῷον πολιτικόν» que Unamuno cita en griego no lleva ninguna de
   * nuestras vocales y está perfectamente transcrito.
   */
  if (!VOCALES.test(letras) && !NO_LATINA.test(letras)) return true;

  return false;
}

/**
 * La medida de legibilidad de un texto.
 *
 * Sirve igual para un documento entero y para una candidata suelta: es la misma
 * proporción, y por eso el umbral es uno solo. Lo que cambia es el efecto —en un documento
 * de diez mil palabras un tropiezo aislado no mueve la aguja; en una candidata de treinta,
 * uno solo la condena—, y ese desnivel es el que se quiere: un documento no se juzga por su
 * peor renglón, pero una Cita sí, porque se publica entera y con la firma de su Autor.
 */
export function medirLegibilidad(texto: string): MedidaDeLegibilidad {
  const señales: Record<SeñalDeOcr, number> = {
    'palabra-partida': 0,
    'mayúscula-intercalada': 0,
    'cifra-en-palabra': 0,
    'carácter-ajeno': 0,
    'letra-suelta': 0,
    impronunciable: 0,
  };
  const ejemplos: string[] = [];

  const crudas = texto.split(/\s+/).filter((t) => t !== '');
  const conRaya = usaGuionComoRaya(crudas);
  let palabras = 0;
  let sospechosas = 0;

  for (let i = 0; i < crudas.length; i += 1) {
    const cruda = crudas[i];
    const nucleo = cruda.replace(SIN_PUNTUACION_INICIAL, '').replace(SIN_PUNTUACION_FINAL, '');
    if (nucleo === '') continue;
    palabras += 1;

    const disparadas: SeñalDeOcr[] = [];

    /*
     * «For- mabalo»: el corte de renglón que la extracción del escaneo dejó abierto. Un
     * guion de compuesto —«auri-rizada»— no lleva espacio detrás, y por eso no dispara.
     *
     * Lo que esta señal no sabe distinguir es el **verso de cabo roto**: los preliminares
     * del Quijote cortan las palabras a propósito —«Soy Rocinante, el famo- bisnieto del
     * gran Babie-»— y ahí no hay ningún escáner. Se descartan igual, y está bien que así
     * sea: una Cita así publicada se lee exactamente como un OCR roto, que es de lo que
     * esta puerta protege al lector. Son once candidatas de un Quijote entero.
     */
    const siguiente = crudas[i + 1];
    if (
      !conRaya &&
      GUIONES_DE_CORTE.test(cruda) &&
      siguiente !== undefined &&
      /^\p{Ll}{3}/u.test(siguiente)
    ) {
      disparadas.push('palabra-partida');
    }

    // «italianoTonti»: dos palabras que el escáner pegó sin ver el espacio.
    if (/\p{Ll}\p{Lu}/u.test(nucleo)) disparadas.push('mayúscula-intercalada');

    // «coraz6n»: la cifra que el escáner puso donde iba una letra.
    const sinVoladitas = nucleo.replace(VOLADITAS, '');
    if (/\p{L}\p{N}|\p{N}\p{L}/u.test(sinVoladitas)) disparadas.push('cifra-en-palabra');

    // «tata* rabuelos»: la mancha que se leyó como signo.
    if (AJENOS.test(cruda)) disparadas.push('carácter-ajeno');

    /*
     * «6» donde va «ó», «i» donde va «í».
     *
     * Solo cuenta si el signo va **desnudo**, sin punto ni dos puntos pegados, porque lo
     * que lleva punto es abreviatura o numeración y de eso está lleno el corpus sano:
     * «R. P. Atanasio» en Sor Juana, «B.» y «R.» por Babieca y Rocinante en el Quijote,
     * «1.» al frente de cada aforismo de Gracián. Y solo si es minúscula o cifra: la
     * mayúscula desnuda es número de capítulo —«Capítulo V», «I - II - III»— o letra
     * nombrada —«desde la A hasta la Z»—.
     */
    const desnudo = cruda === nucleo && [...nucleo].length === 1;
    if (desnudo && !DE_UNA_LETRA.has(nucleo) && !/\p{Lu}/u.test(nucleo)) {
      disparadas.push('letra-suelta');
    }

    const letras = nucleo.toLocaleLowerCase('es').replace(/[^\p{L}]/gu, '');
    if (esImpronunciable(nucleo, letras)) disparadas.push('impronunciable');

    if (disparadas.length === 0) continue;
    sospechosas += 1;
    for (const señal of disparadas) señales[señal] += 1;
    if (ejemplos.length < EJEMPLOS) ejemplos.push(nucleo);
  }

  return {
    palabras,
    sospechosas,
    proporcion: palabras === 0 ? 0 : sospechosas / palabras,
    señales,
    ejemplos,
  };
}
