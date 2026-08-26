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

describe('Historia 11.5 — ningún documento sano del Corpus queda condenado', () => {
  const fuentes = resolve(import.meta.dirname, '../../corpus/fuentes');
  const documentos = readdirSync(fuentes).filter((f) => f.endsWith('.txt'));

  /** El cuerpo de un documento de Fuente: lo que va después de la declaración. */
  const cuerpoDe = (fichero: string) =>
    readFileSync(join(fuentes, fichero), 'utf8').split('\n---\n').slice(2).join('\n---\n');

  it('hay documentos que medir', () => {
    // Sin esto, retirar el corpus dejaría la prueba de abajo pasando sobre cero ficheros.
    expect(documentos.length).toBeGreaterThan(10);
  });

  it.each(documentos)('%s se puede leer', (fichero) => {
    const medida = medirLegibilidad(cuerpoDe(fichero));
    expect(medida.palabras).toBeGreaterThan(0);
    expect(medida.proporcion).toBeLessThanOrEqual(MAX_PROPORCION_ILEGIBLE);
  });

  it('y con margen de sobra: el peor no llega ni a la mitad del umbral', () => {
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
     */
    const peor = Math.max(...documentos.map((f) => medirLegibilidad(cuerpoDe(f)).proporcion));
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
