import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SEÑALES, medirLegibilidad, type SeñalDeOcr } from '../../src/lib/legibilidad.ts';
import { MAX_PROPORCION_ILEGIBLE } from '../../src/lib/umbrales.ts';

/**
 * Historia 11.5 — un documento ilegible no siembra.
 *
 * La mitad corrupta de esta matriz son **frases reales**. Salieron del *Apéndice a Mis
 * últimas tradiciones peruanas* de Ricardo Palma en la primera sesión de sembrado, que
 * produjo 61 candidatas con el OCR roto y las paró una persona leyéndolas una por una. El
 * documento ya no está en `corpus/fuentes/` —se retiró a mano— y una cosecha así no se
 * vuelve a conseguir por casualidad, de modo que estas líneas son la única prueba que hay
 * de lo que esta puerta existe para parar.
 *
 * La otra mitad pesa más, y es la que hay que mirar cuando alguien toque una señal: el
 * riesgo de esta historia no es dejar pasar basura sino **descartar a Góngora**. Los
 * arcaísmos, el latín, los nombres extranjeros y la poesía con guiones no se descartan.
 */

/** La proporción por encima de la cual `tools/lib/extraccion.ts` descarta. */
const ilegible = (texto: string) => medirLegibilidad(texto).proporcion > MAX_PROPORCION_ILEGIBLE;

const señalesDe = (texto: string): SeñalDeOcr[] =>
  SEÑALES.filter((s) => medirLegibilidad(texto).señales[s] > 0);

// ── Las frases reales del documento de Palma ─────────────────────────────────

const DE_PALMA: [SeñalDeOcr, string][] = [
  [
    'palabra-partida',
    'For- mabalo un pliego, en folio menor, con las armas de la casa y el escudo de sus mayores.',
  ],
  [
    'impronunciable',
    'El que enseiia con el ejemplo no necesita levantar la voz para que lo escuchen los suyos.',
  ],
  [
    'impronunciable',
    'Era el patio un Ileno de gente que aguardaba la salida del virrey, sin qus nadie se atreviese a moverse.',
  ],
  [
    'carácter-ajeno',
    'Sus tata* rabuelos vinieron de España, y de ellos heredó la casa, el nombre y la pobreza.',
  ],
  [
    'mayúscula-intercalada',
    'Hablaba el italianoTonti con mucha gracia, y a nadie le importaba si era italiano 6 español.',
  ],
];

describe('Historia 11.5 — las candidatas reales de Palma no pasan', () => {
  it.each(DE_PALMA)('la señal %s condena «%s»', (señal, frase) => {
    expect(señalesDe(frase)).toContain(señal);
    expect(ilegible(frase)).toBe(true);
  });

  it('el documento entero se mide por encima del umbral, no solo sus frases', () => {
    const documento = DE_PALMA.map(([, frase]) => frase).join(' ');
    expect(medirLegibilidad(documento).proporcion).toBeGreaterThan(MAX_PROPORCION_ILEGIBLE);
  });

  it('la medida dice qué palabras la dispararon, para poder decirlo en el rechazo', () => {
    const medida = medirLegibilidad(DE_PALMA.map(([, frase]) => frase).join(' '));
    expect(medida.ejemplos).toContain('enseiia');
    expect(medida.ejemplos).toContain('qus');
    expect(medida.ejemplos).toContain('italianoTonti');
  });

  it('«6» donde va «ó» cuenta como letra suelta', () => {
    expect(señalesDe('Nadie sabía si el hombre era italiano 6 español.')).toContain('letra-suelta');
  });

  it('no se toca ni un carácter: la medida no devuelve texto, solo números', () => {
    const medida = medirLegibilidad(DE_PALMA[0][1]);
    // Los ejemplos son palabras copiadas del texto, jamás corregidas.
    expect(medida.ejemplos).toContain('For');
    expect(Object.keys(medida)).toEqual([
      'palabras',
      'sospechosas',
      'proporcion',
      'señales',
      'ejemplos',
    ]);
  });

  it('«Ileno» por «lleno» **no** dispara ninguna señal, y conviene saberlo', () => {
    /*
     * Es la limitación honrada de esta puerta: «Ileno» se pronuncia en español, tiene la
     * forma de una palabra y solo un lector sabe que va con eleles. Cazarla exigiría un
     * diccionario, y un diccionario descartaría medio Siglo de Oro. La frase real de Palma
     * que la traía cae igual, pero por el «qus» que la acompañaba, no por esto.
     */
    expect(señalesDe('Era el patio un Ileno de gente que aguardaba al virrey.')).toEqual([]);
  });
});

// ── El lado sano, que es el que de verdad importa ────────────────────────────

const SANAS: [string, string][] = [
  [
    'arcaísmos',
    'Fablar quiero de la fermosura de las dueñas, ca asaz es cosa de que agora nadie fabla.',
  ],
  [
    'arcaísmos con vuesa merced',
    'Vuesa merced trujo consigo la fazienda que el escudero dixo, y non hay más que fablar.',
  ],
  ['latín de Séneca', 'Non est quod credas quemquam fieri aliena infelicitate felicem atque beatum.'],
  [
    'latín de Sor Juana, con sus ablativos en -iis',
    'Quare, quotiesque et quotidie beneficiis in Ecclesiis quaedam unaquaeque quatenus quo quam quae.',
  ],
  [
    'nombres propios extranjeros',
    'Shakespeare, Nietzsche, Goethe, Rousseau, Molière, Dostoyevski y Vittorio Alfieri se citan sin traducirlos.',
  ],
  [
    'la poesía de Nervo, con su guion y su elisión',
    'La tarde auri-rizada de un otoño sin nubes, ¡oh alma!, no vuelve nunca a repetirse.',
  ],
  ['versos cortos y exclamaciones', '¡Oh, qué serena luz! Ya no hay dolor. Ya todo duerme. Paz.'],
  [
    'números romanos de capítulo',
    'En el capítulo XXXVIII, el libro III y la parte LXXVII se cuenta lo mismo de otro modo.',
  ],
  [
    'abreviaturas de época',
    'Así lo demuestra el R. P. Atanasio, y lo confirma B. V. M. en su carta a N. Padre.',
  ],
  [
    'ordinales voladitos y años',
    'El artículo 3.º del año 1615 y el capítulo 1.º de 1605 dicen cosas distintas.',
  ],
  ['griego citado dentro del español', 'El hombre es un ζῷον πολιτικόν, decía Aristóteles.'],
  [
    'compuestos con guion',
    'Una política franco-española, un acuerdo teórico-práctico y un ánimo agri-dulce.',
  ],
  [
    'el guion como raya de diálogo, que usa Montalvo',
    '-Tan grande es mi desventura, ¡oh amigo! -dijo don Quijote- que se ha de prolongar más allá de mis días.',
  ],
];

describe('Historia 11.5 — la señal es de OCR, no de vocabulario', () => {
  it.each(SANAS)('no descarta %s', (_que, frase) => {
    expect(señalesDe(frase)).toEqual([]);
    expect(ilegible(frase)).toBe(false);
  });
});

/**
 * Y la prueba que no se puede escribir con fixtures: los documentos que el Corpus tiene
 * versionados de verdad. Son la mejor evidencia de que la puerta no da falsos positivos,
 * porque cada uno de ellos ya produjo Citas publicadas. Ninguno puede quedar descartado.
 */
/**
 * El guion bajo con que Gutenberg marca la cursiva **no es daño de escáner** — 108.ª sesión.
 *
 * Al abrir esa Fuente, su primer libro grande llegó con **804 guiones bajos** en 55.894 palabras:
 * `_mujer_`, `_la_`, `_a_)`. Son la marca de cursiva de la transcripción, no manchas leídas mal, y
 * bastaron para que el documento midiera 1,09 % y saltara la canaria del margen.
 *
 * La prueba de la canaria dice qué hacer cuando salta —«revisar la señal que lo esté rozando, no
 * la prueba»— y eso es lo que se hizo. Aquí la señal se disparaba **sin razón**: un guion bajo que
 * abre y cierra alrededor de una palabra es tipografía; uno suelto sí puede ser basura de escaneo.
 *
 * Medido antes de tocarla: **cero candidatas y cero Citas publicadas traen guion bajo**, porque la
 * puerta por sentencia ya las descartaba. Así que no había ninguna Cita en riesgo; lo único que
 * pasaba es que un documento sano parecía dañado, y eso vuelve la medida menos útil justo cuando
 * más Fuentes entran.
 */
describe('Historia 11.5 — la marca de cursiva no es una mancha', () => {
  it('un guion bajo que abre y cierra es cursiva, y no cuenta como daño', () => {
    for (const sano of ['La _mujer_ moderna', 'el punto _a_) del capítulo', '_todo_ eso']) {
      expect(medirLegibilidad(sano).señales['carácter-ajeno'] ?? 0, sano).toBe(0);
    }
  });

  it('pero un guion bajo suelto sigue disparando: eso sí puede ser un escáner', () => {
    for (const roto of ['la mu_er moderna', 'el capi_ulo', 'palabra_']) {
      expect(medirLegibilidad(roto).señales['carácter-ajeno'] ?? 0, roto).toBeGreaterThan(0);
    }
  });

  it('y el resto de caracteres ajenos siguen disparando igual', () => {
    // El arreglo es del guion bajo y de nada más: la lista de prohibidos no se ablanda.
    for (const roto of ['pa*abra', 'te|to', 'ca^a', 'na{a']) {
      expect(medirLegibilidad(roto).señales['carácter-ajeno'] ?? 0, roto).toBeGreaterThan(0);
    }
  });
});

/**
 * Los ángulos con que el traductor marca lo que añade al original **no son daño de escáner** —
 * 13/09/2026, las *Odas* de Horacio en la traducción de Salinas.
 *
 * Mismo caso que la cursiva de arriba y mismo remedio: la canaria saltó con el libro II a 1,208 %
 * sin que el documento tuviera nada roto. Medido antes de tocar la señal: cero Citas publicadas y
 * cero candidatas llevan `<` o `>`, así que no había ninguna en riesgo.
 *
 * Lo que estas pruebas fijan de verdad son los bordes: el par se reconoce **en la línea**, porque
 * un suplemento de varias palabras deja cada ángulo suelto dentro de su palabra; lo de dentro se
 * sigue midiendo; y el ángulo que queda solo sigue disparando.
 */
describe('Historia 11.5 — el suplemento del traductor no es una mancha', () => {
  it('un suplemento de varias palabras entre ángulos no cuenta como daño', () => {
    const linea =
      'La hidropesía cruel se agrava con la bebida <al que es indulgente consigo mismo>, y no apaga la sed';
    expect(medirLegibilidad(linea).señales['carácter-ajeno'] ?? 0).toBe(0);
  });

  it('ni uno de una sola palabra', () => {
    expect(medirLegibilidad('a soportar <amigablemente> la ingrata pobreza').señales['carácter-ajeno'] ?? 0).toBe(0);
  });

  it('lo que va dentro se sigue midiendo como cualquier otra palabra', () => {
    expect(medirLegibilidad('una frase <con coraz6n roto> dentro').señales['cifra-en-palabra'] ?? 0).toBeGreaterThan(0);
  });

  it('pero un ángulo suelto sigue disparando: eso sí puede ser un escáner', () => {
    for (const roto of ['la mu<er moderna', 'palabra>', 'otra>cosa']) {
      expect(medirLegibilidad(roto).señales['carácter-ajeno'] ?? 0, roto).toBeGreaterThan(0);
    }
  });

  it('y un par que cruza de renglón no se toma por suplemento', () => {
    expect(medirLegibilidad('abre <aquí\ny cierra> allá').señales['carácter-ajeno'] ?? 0).toBeGreaterThan(0);
  });
});

/**
 * Cuatro afinados del 17/10/2026, y los cuatro por lo mismo que la cursiva y los ángulos: la
 * canaria del margen saltó **sin que los documentos tuvieran nada roto**.
 *
 * La siembra en barrido trajo de Gutenberg y de Wikisource formas que estas señales no habían
 * visto: la cursiva que abarca varias palabras y la que cruza el salto de renglón con que
 * Gutenberg corta a setenta columnas (unas 16.000 palabras en los documentos de la banda del
 * 1 al 2 %), las abreviaturas sin vocal («Sr.», «Vd.», «pp.»: unas 3.000), el «vn» del Siglo de
 * Oro (1.448 en un solo libro) y el número de página de Gutenberg entre llaves (523 en 18
 * documentos). Medido antes de tocar nada, y cada afinado medido por separado: quitar
 * cualquiera de los cuatro deja documentos sanos por encima de la canaria. El «à» y el «ò» de
 * época también se miraron, y no hacían falta: no se tocan.
 *
 * Lo que se descartó, y por qué: la «i» suelta y la cifra suelta disparan en textos sanos —la
 * «i» conjunción de la ortografía de Bello, «el 4 de Julio»—, pero son exactamente las dos
 * formas canónicas del escáner («6» por «ó», «i» por «í»). Eximirlas sería quitarle a la
 * puerta lo que existe para cazar.
 *
 * Lo que estos afinados **no** resuelven: la marca de cursiva sigue llegando literal al texto
 * de una candidata. Ya pasaba con la de una sola palabra —13.769 candidatas y una Cita
 * publicada la traen—, y es otra puerta la que tiene que decidir qué hace con ella.
 */
describe('Historia 11.5 — la cursiva de varias palabras tampoco es una mancha', () => {
  const ajenos = (texto: string) => medirLegibilidad(texto).señales['carácter-ajeno'];

  it('abre en una palabra y cierra en otra de la misma línea', () => {
    expect(ajenos('el _Tratado de la pintura_ de Leonardo')).toBe(0);
  });

  it('y cruza el salto de renglón con que Gutenberg corta la línea', () => {
    expect(ajenos('_Mari-Gaila, con la\ncesta en la cadera, se aleja._ Y sigue.')).toBe(0);
  });

  it('lo que va dentro se sigue midiendo', () => {
    expect(medirLegibilidad('_una frase con coraz6n roto_').señales['cifra-en-palabra']).toBeGreaterThan(0);
  });

  it('pero no cruza un párrafo: con una línea en blanco en medio, los dos siguen sueltos', () => {
    expect(ajenos('abre _aquí\n\ny cierra_ allá')).toBe(2);
  });

  it('ni empareja dos marcas más lejanas que una frase', () => {
    expect(ajenos(`abre _aquí${' y sigue'.repeat(50)} y cierra_ allá`)).toBe(2);
  });

  it('y un guion bajo pegado por los dos lados a una letra sigue siendo basura', () => {
    expect(ajenos('la mu_er y el capi_ulo')).toBe(2);
  });
});

describe('Historia 11.5 — la abreviatura sin vocal se lee por su punto', () => {
  const impronunciables = (texto: string) => medirLegibilidad(texto).señales.impronunciable;

  it('«Sr.», «Vd.», «Dr.», «pp.» y «cf.» no son impronunciables: el punto las declara', () => {
    expect(impronunciables('El Sr. Pedro y Vd. lo saben, como el Dr. Gómez en las pp. 3 y 4; cf. lo dicho.')).toBe(0);
  });

  it('sin el punto, la misma forma sigue siendo impronunciable', () => {
    expect(impronunciables('el Sr Pedro y el rbl')).toBe(2);
  });

  it('una tira de consonantes demasiado larga para abreviatura no se salva por el punto', () => {
    expect(impronunciables('así acaba el rbltk.')).toBe(1);
  });

  it('y el punto no salva lo que otra regla condena', () => {
    expect(impronunciables('dijo qus. Y luego enseiia.')).toBe(2);
  });
});

describe('Historia 11.5 — «vn» es «un» en la grafía del Siglo de Oro', () => {
  const impronunciables = (texto: string) => medirLegibilidad(texto).señales.impronunciable;

  it('no es impronunciable', () => {
    expect(impronunciables('vn hombre de bien, y Vn buen soldado')).toBe(0);
  });

  it('la exención es de esa palabra, no de la «v» como vocal', () => {
    expect(impronunciables('vrt y vnt')).toBe(2);
  });
});

describe('Historia 11.5 — el número de página de Gutenberg no es una mancha', () => {
  it('«{pg 23}» entre dos palabras no cuenta', () => {
    expect(medirLegibilidad('la guerra {pg 23} injusta').sospechosas).toBe(0);
  });

  it('ni la forma que nombra dos páginas', () => {
    expect(medirLegibilidad('la guerra {pg 23, 24} injusta').sospechosas).toBe(0);
  });

  it('pero una llave que no encierra un número de página sigue disparando', () => {
    expect(medirLegibilidad('la {pg guerra} injusta').señales['carácter-ajeno']).toBe(2);
  });
});

describe('Historia 11.5 — ningún documento sano del Corpus queda condenado', () => {
  const fuentes = resolve(import.meta.dirname, '../../corpus/fuentes');
  const documentos = readdirSync(fuentes).filter((f) => f.endsWith('.txt'));

  /** El cuerpo de un documento de Fuente: lo que va después de la declaración. */
  const cuerpoDe = (fichero: string) =>
    readFileSync(join(fuentes, fichero), 'utf8').split('\n---\n').slice(2).join('\n---\n');

  /**
   * Por debajo de este tamaño, una sola palabra rara pesa más que el margen que se quiere medir
   * —con 50 palabras, una vale un 2 %, el umbral entero—. Es una medida de la prueba, no un
   * umbral del producto: la puerta de `extraer` no lo conoce.
   */
  const MIN_PALABRAS_PARA_EL_MARGEN = 500;

  it('hay documentos que medir', () => {
    // Sin esto, retirar el corpus dejaría la prueba de abajo pasando sobre cero ficheros.
    expect(documentos.length).toBeGreaterThan(10);
  });

  it.each(documentos)('%s se puede leer', (fichero) => {
    const medida = medirLegibilidad(cuerpoDe(fichero));
    expect(medida.palabras).toBeGreaterThan(0);
    expect(medida.proporcion).toBeLessThanOrEqual(MAX_PROPORCION_ILEGIBLE);
  });

  it('y con margen de sobra: el peor de tamaño suficiente no llega ni a la mitad del umbral', () => {
    /*
     * El número importa tanto como el aprobado: el margen es lo que separa una puerta de una
     * lotería. Y esta prueba decía qué hacer cuando saltara —«revisar la señal que lo esté
     * rozando, no la prueba»—, así que en la 85.ª se hizo eso.
     *
     * Saltó con un ensayo sobre **la letra K**: «Kant, con K mayúscula, es el cant mayúsculo»,
     * «el quilo con q es el que se suda». Siete letras sueltas en 982 palabras, 0,71 %. La
     * señal se disparó bien y el documento está sano: **las letras sueltas son su asunto**.
     *
     * No hay señal que arreglar, así que lo que se corrige es la cifra, y se dice por qué: la
     * anterior —una cuarta parte— describía un Corpus de 59 documentos cuyo peor caso era una
     * página de índice con 1 palabra rara de 204. Con 93 documentos y textos que hablan de
     * ortografía, la mitad del umbral sigue siendo margen de verdad y ya no es una foto vieja.
     *
     * Y desde el 17/10/2026 se mide sobre los documentos de al menos `MIN_PALABRAS_PARA_EL_MARGEN`.
     * La siembra en barrido trajo cientos de páginas cortas —352 de 1.421 bajan de 500
     * palabras—, y en ellas la canaria ya no mide un margen sino una palabra: en los sonetos
     * de «Las tres musas», 73 palabras, el «1» de «Sonetos 1 al 25» vale 1,37 %; en «Cuatro de
     * julio», el «4» de la fecha. Eximir la cifra o la «i» sueltas sería quitarle a la puerta
     * sus dos señales canónicas, así que lo que se acota es la medida del margen, no la señal
     * (decisión de Héctor). Todo documento, de cualquier tamaño, sigue sujeto al umbral entero
     * en la prueba de arriba.
     */
    const medidas = documentos
      .map((f) => medirLegibilidad(cuerpoDe(f)))
      .filter((medida) => medida.palabras >= MIN_PALABRAS_PARA_EL_MARGEN);
    // El suelo acota la medida, no la vacía: sin esto, subirlo de más la dejaría en verde sin mirar nada.
    expect(medidas.length).toBeGreaterThan(documentos.length / 2);

    const peor = Math.max(...medidas.map((medida) => medida.proporcion));
    expect(peor).toBeLessThan(MAX_PROPORCION_ILEGIBLE / 2);
  });
});

describe('Historia 11.5 — la medida se comporta en los bordes', () => {
  it('un texto vacío no es ilegible: es que no hay nada que medir', () => {
    for (const vacio of ['', '   ', '\n\n', '—— ¡! ¿?']) {
      const medida = medirLegibilidad(vacio);
      expect(medida.palabras, JSON.stringify(vacio)).toBe(0);
      expect(medida.proporcion, JSON.stringify(vacio)).toBe(0);
    }
  });

  it('una palabra cuenta una sola vez aunque dispare varias señales', () => {
    const medida = medirLegibilidad('coraz6nTonti');
    expect(medida.sospechosas).toBe(1);
    expect(medida.señales['cifra-en-palabra']).toBe(1);
    expect(medida.señales['mayúscula-intercalada']).toBe(1);
  });
});
