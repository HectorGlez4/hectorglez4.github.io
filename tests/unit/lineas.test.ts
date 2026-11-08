import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
  documentoParaLosSaltos,
  esFormaDeLineas,
  FORMAS_DE_LINEAS,
  formaDeLasLineas,
  saltosDeLaCita,
  textoConSaltos,
  type FormaDeLineas,
} from '../../tools/lib/lineas.ts';
import { colapsarEspacios, tramoEnCrudo } from '../../tools/lib/cotejo.ts';
import { analizarDocumento } from '../../tools/lib/documento.ts';
import { altoDeTarjeta, lineasDeTarjetaEnVerso } from '../../tools/lib/tarjetaDelVerso.ts';
import { ALTO, svgDeTarjeta } from '../../src/lib/tarjeta.ts';
import { tramoDe } from '../../src/lib/tramos.ts';

/**
 * Historia 29.1 — la forma de las líneas, el escritor del `texto` y la cuenta en crudo (AD-29).
 *
 * Puro: los documentos son copias de documentos reales de `corpus/fuentes/`, en
 * `tests/unit/ayuda/lineas/`, para que la forma se juzgue sobre lo que el Corpus trae y no sobre
 * un cuerpo escrito a la medida del clasificador.
 */

const RAIZ = resolve(__dirname, '../..');
const FIXTURES = join(__dirname, 'ayuda/lineas');

function cuerpoDe(fichero: string): string {
  const analizado = analizarDocumento(readFileSync(join(FIXTURES, fichero), 'utf8'));
  if (analizado === undefined) throw new Error(`${fichero} no se deja analizar`);
  return analizado.cuerpo;
}

const VERSOS_SENCILLOS = 'wikisource-es--versos-sencillos--versos-sencillos-i.txt';
const AVARIENTO = 'wikisource-es--a-un-avariento.txt';
const A_FLOR_DE_PIEL = 'gutenberg--a-flor-de-piel-frases.txt';

describe('FORMAS_DE_LINEAS', () => {
  it('son las cinco del contrato, en su orden', () => {
    expect([...FORMAS_DE_LINEAS]).toEqual([
      'verso',
      'verso-espaciado',
      'prosa-por-lineas',
      'prosa-ajustada',
      'indeterminada',
    ]);
    for (const forma of FORMAS_DE_LINEAS) expect(esFormaDeLineas(forma)).toBe(true);
    expect(esFormaDeLineas('poesia')).toBe(false);
  });
});

describe('formaDeLasLineas', () => {
  const esperadas: Record<string, FormaDeLineas | readonly FormaDeLineas[]> = {
    [VERSOS_SENCILLOS]: 'verso',
    [AVARIENTO]: 'verso-espaciado',
    [A_FLOR_DE_PIEL]: 'prosa-ajustada',
    'wikisource-es--plenitud--plenitud-liv-la-libertad.txt': 'prosa-por-lineas',
    // Mezcla título, moraleja, prosa y notas: ante la duda, indeterminada.
    'wikisource-es--el-perro-fiel-fedro.txt': 'indeterminada',
    // Ajustado a ~40 columnas: un umbral de ancho medio lo daría por verso.
    'gutenberg--origenes-de-la-novela-tomo-ii.txt': ['prosa-ajustada', 'indeterminada'],
    // Índices de una entrada por línea y una carta corta: no son verso.
    'wikisource-es--maria--maria-isaacs.txt': ['prosa-por-lineas', 'indeterminada'],
    'wikisource-es--en-torno-al-casticismo.txt': ['prosa-por-lineas', 'indeterminada'],
    'wikisource-es--carta-a-jose-marti-y-zayas-bazan.txt': ['prosa-por-lineas', 'indeterminada'],
  };

  it('cubre todos los fixtures', () => {
    expect(readdirSync(FIXTURES).sort()).toEqual(Object.keys(esperadas).sort());
  });

  for (const [fichero, esperada] of Object.entries(esperadas)) {
    it(`${fichero} → ${String(esperada)}`, () => {
      const forma = formaDeLasLineas({ cuerpo: cuerpoDe(fichero) });
      if (typeof esperada === 'string') expect(forma).toBe(esperada);
      else expect(esperada).toContain(forma);
    });
  }

  it('la cabecera válida manda sobre el cálculo; una inválida da indeterminada', () => {
    const cuerpo = cuerpoDe(A_FLOR_DE_PIEL);
    expect(formaDeLasLineas({ cuerpo, lineas: 'verso' })).toBe('verso');
    expect(formaDeLasLineas({ cuerpo: cuerpoDe(VERSOS_SENCILLOS), lineas: 'poesia' })).toBe('indeterminada');
  });

  it('un cuerpo de menos de cuatro líneas no deja ver ninguna forma', () => {
    expect(formaDeLasLineas({ cuerpo: 'Uno\nDos\nTres' })).toBe('indeterminada');
  });
});

describe('textoConSaltos', () => {
  const versos = { cuerpo: cuerpoDe(VERSOS_SENCILLOS), forma: 'verso' as const };
  const enUnaLinea =
    'Yo vengo de todas partes, Y hacia todas partes voy: Arte soy entre las artes, En los montes, monte soy.';

  it('verso: un salto donde el documento parte línea, y nada más cambia', () => {
    const { texto, descartados } = textoConSaltos(enUnaLinea, versos);
    expect(texto).toBe(
      'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.',
    );
    expect(descartados).toBe(0);
    expect(colapsarEspacios(texto)).toBe(colapsarEspacios(enUnaLinea));
  });

  it('cruza estrofa: un \\n en la línea en blanco, nunca dos (verso y verso-espaciado)', () => {
    const deDos = 'En los montes, monte soy. Yo sé los nombres extraños';
    expect(textoConSaltos(deDos, versos).texto).toBe('En los montes, monte soy.\nYo sé los nombres extraños');
    const espaciado = { cuerpo: cuerpoDe(AVARIENTO), forma: 'verso-espaciado' as const };
    const cuarteta = 'Un hombre rico avariento. Murió con cien mil dolores';
    expect(textoConSaltos(cuarteta, espaciado).texto).toBe('Un hombre rico avariento.\nMurió con cien mil dolores');
  });

  it('prosa, indeterminada o sin documento: una línea', () => {
    for (const forma of ['prosa-ajustada', 'prosa-por-lineas', 'indeterminada'] as const) {
      expect(textoConSaltos(enUnaLinea, { cuerpo: versos.cuerpo, forma }).texto).toBe(enUnaLinea);
    }
    expect(textoConSaltos(enUnaLinea).texto).toBe(enUnaLinea);
    // Un documento de verso en que el texto no se localiza tampoco da saltos.
    expect(textoConSaltos('Esto no está en el poema, y no se parte.', versos).texto).toBe(
      'Esto no está en el poema, y no se parte.',
    );
  });

  it('un salto tecleado sin respaldo pasa a espacio y se cuenta; uno respaldado se queda', () => {
    const tecleado = 'Yo vengo de todas\npartes, Y hacia todas partes voy:';
    const r = textoConSaltos(tecleado, versos);
    expect(r.texto).toBe('Yo vengo de todas partes,\nY hacia todas partes voy:');
    expect(r.descartados).toBe(1);
    expect(textoConSaltos('Uno\ndos  tres')).toEqual({ texto: 'Uno dos tres', descartados: 1 });
    expect(textoConSaltos('Yo vengo de todas partes,\nY hacia', versos)).toEqual({
      texto: 'Yo vengo de todas partes,\nY hacia',
      descartados: 0,
    });
  });

  it('solo toca el espacio: lo escrito colapsa a lo recibido sobre todos los fixtures', () => {
    for (const fichero of readdirSync(FIXTURES)) {
      const cuerpo = cuerpoDe(fichero);
      const forma = formaDeLasLineas({ cuerpo });
      const colapsado = colapsarEspacios(cuerpo);
      // Tramos de palabras enteras, a pasos, por todo el cuerpo.
      const palabras = colapsado.split(' ');
      for (let i = 0; i + 12 < palabras.length; i += 37) {
        const texto = palabras.slice(i, i + 12).join(' ');
        const escrito = textoConSaltos(texto, { cuerpo, forma });
        expect(colapsarEspacios(escrito.texto)).toBe(texto);
        expect(escrito.texto).not.toMatch(/\n\n|^\n|\n$| \n|\n /u);
        if (forma !== 'verso' && forma !== 'verso-espaciado') expect(escrito.texto).not.toContain('\n');
      }
    }
  });

  it('un invisible no es espacio: U+FEFF entre letras sigue sin espacio, y junto a uno se conserva (NFR-12)', () => {
    expect(textoConSaltos('Yo\ufeffvengo de todas')).toEqual({ texto: 'Yo\ufeffvengo de todas', descartados: 0 });
    const conMarca = 'Yo vengo de todas partes,\ufeff Y hacia todas partes voy:';
    const escrito = textoConSaltos(conMarca, versos);
    expect(escrito.texto).toBe('Yo vengo de todas partes,\ufeff\nY hacia todas partes voy:');
    expect(colapsarEspacios(escrito.texto)).toBe(colapsarEspacios(conMarca));
  });

  it('documentoParaLosSaltos toma el primero de verso en que el texto se localiza', () => {
    const candidatos = [
      { nombre: 'prosa', cuerpo: cuerpoDe(A_FLOR_DE_PIEL) },
      { nombre: 'otro', cuerpo: cuerpoDe(AVARIENTO) },
      { nombre: 'martí', cuerpo: versos.cuerpo },
      { nombre: 'martí-bis', cuerpo: versos.cuerpo },
    ];
    expect(documentoParaLosSaltos(enUnaLinea, candidatos)?.nombre).toBe('martí');
    expect(documentoParaLosSaltos(enUnaLinea, candidatos.slice(0, 2))).toBeUndefined();
    // Una cabecera declarada de prosa manda: ese documento no da saltos.
    expect(
      documentoParaLosSaltos(enUnaLinea, [{ nombre: 'martí', cuerpo: versos.cuerpo, lineas: 'prosa-por-lineas' }]),
    ).toBeUndefined();
  });
});

describe('tramoEnCrudo', () => {
  const crudo = '  Uno\u00a0dos\u200b tres\n\ncuatro \u00ad\nci\u00adnco 𝄞 se\ufeffis\u2060\n  ';

  it('cada tramo del colapsado sale del crudo que lo produjo (invisibles, U+00A0, \\n, \\n\\n, astral)', () => {
    const colapsado = colapsarEspacios(crudo);
    expect(colapsado).toBe('Uno dos tres cuatro cinco 𝄞 seis');
    for (let inicio = 0; inicio < colapsado.length; inicio += 1) {
      for (let fin = inicio + 1; fin <= colapsado.length; fin += 1) {
        if (colapsado[inicio] === ' ' || colapsado[fin - 1] === ' ') continue;
        const { inicio: a, fin: b } = tramoEnCrudo(crudo, inicio, fin);
        expect(colapsarEspacios(crudo.slice(a, b))).toBe(colapsado.slice(inicio, fin));
      }
    }
  });

  it('un espacio del colapsado es la racha entera del crudo: ahí se ve si partía línea', () => {
    const colapsado = colapsarEspacios(crudo);
    const espacio = (k: number) => {
      const { inicio, fin } = tramoEnCrudo(crudo, k, k + 1);
      return crudo.slice(inicio, fin);
    };
    expect(espacio(colapsado.indexOf(' tres'))).toBe('\u200b ');
    expect(espacio(colapsado.indexOf(' cuatro'))).toBe('\n\n');
    expect(espacio(colapsado.indexOf(' cinco'))).toBe(' \u00ad\n');
  });

  it('la propiedad vale sobre los cuerpos reales', () => {
    for (const fichero of readdirSync(FIXTURES)) {
      const cuerpo = cuerpoDe(fichero);
      const colapsado = colapsarEspacios(cuerpo);
      for (let inicio = 0; inicio < colapsado.length; inicio += 211) {
        let fin = Math.min(colapsado.length, inicio + 97);
        while (fin > inicio + 1 && colapsado[fin - 1] === ' ') fin -= 1;
        if (colapsado[inicio] === ' ') continue;
        const { inicio: a, fin: b } = tramoEnCrudo(cuerpo, inicio, fin);
        expect(colapsarEspacios(cuerpo.slice(a, b))).toBe(colapsado.slice(inicio, fin));
      }
    }
  });

  it('U+FEFF casa con \\s pero no es espacio: no desplaza la cuenta (la marca de orden de bytes)', () => {
    const conMarca = 'ab\ufeffcd ef\ngh';
    const colapsado = colapsarEspacios(conMarca);
    expect(colapsado).toBe('abcd ef gh');
    const tramo = (a: number, b: number) => {
      const { inicio, fin } = tramoEnCrudo(conMarca, a, b);
      return conMarca.slice(inicio, fin);
    };
    expect(tramo(colapsado.indexOf('gh'), colapsado.length)).toBe('gh');
    expect(tramo(colapsado.indexOf(' ef'), colapsado.indexOf(' ef') + 1)).toBe(' ');
    expect(tramo(colapsado.indexOf(' gh'), colapsado.indexOf(' gh') + 1)).toBe('\n');
    // Una racha de solo marcas entre dos letras no deja espacio.
    expect(colapsarEspacios(tramo(0, 4))).toBe('abcd');
  });

  it('un tramo fuera del colapsado lanza', () => {
    expect(() => tramoEnCrudo('ab', 0, 3)).toThrow(RangeError);
  });
});

describe('altoDeTarjeta', () => {
  /** El bloque que implica el `y` del primer `<text>` de la Tarjeta real, si cabe centrado. */
  function bloqueDeLaTarjetaReal(texto: string, procedencia: string | undefined): number {
    const svg = svgDeTarjeta({ texto, autor: 'Autor de prueba', ...(procedencia ? { procedencia } : {}) });
    const y = Number(/<text x="\d+" y="([\d.]+)"/u.exec(svg)?.[1]);
    const cuerpo = tramoDe(texto).pixelesEnTarjeta;
    return ALTO - 2 * (y - cuerpo);
  }

  const palabras = 'la vida es sueño y los sueños sueños son dice el poeta sin saberlo nunca'.split(' ');
  const deLargo = (n: number) => {
    let texto = '';
    for (let i = 0; [...texto].length < n; i += 1) texto += `${texto === '' ? '' : ' '}${palabras[i % palabras.length]}`;
    return texto;
  };

  for (const largo of [60, 140, 220, 290]) {
    for (const procedencia of ['Una obra, 1635', undefined]) {
      it(`coincide con svgDeTarjeta, ${largo} caracteres, ${procedencia ? 'con' : 'sin'} procedencia`, () => {
        const texto = deLargo(largo);
        const alto = altoDeTarjeta(texto, procedencia !== undefined);
        expect(alto).toBeDefined();
        expect(alto!).toBeLessThanOrEqual(ALTO);
        expect(alto).toBe(160 + bloqueDeLaTarjetaReal(texto, procedencia));
      });
    }
  }

  it('el verso se reparte verso a verso, con las comillas en el primero y el último', () => {
    expect(lineasDeTarjetaEnVerso('Uno\nDos\nTres', 56)).toEqual(['«Uno', 'Dos', 'Tres»']);
    expect(altoDeTarjeta('Uno\nDos\nTres', true)).toBe(160 + 3 * Math.round(56 * 1.3) + 40 + 24 + 34 + 30);
  });

  it('sin Imagen, sin alto: la Tarjeta no lleva texto', () => {
    expect(altoDeTarjeta(deLargo(320), true)).toBeUndefined();
  });
});

describe('dueños del salto (AD-29)', () => {
  const ARBOLES = ['tools', 'src', 'integraciones', 'public/islas'];
  function ficheros(dir: string): string[] {
    const salida: string[] = [];
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta));
      else if (/\.(ts|mts|js|mjs|astro)$/u.test(nombre)) salida.push(ruta);
    }
    return salida;
  }
  const todos = ARBOLES.flatMap((a) => ficheros(join(RAIZ, a))).map((ruta) => ({
    ruta: relative(RAIZ, ruta).split('\\').join('/'),
    contenido: readFileSync(ruta, 'utf8'),
  }));

  it('cada función y el conjunto se definen en un solo sitio', () => {
    const definiciones: [RegExp, string][] = [
      [/function\s+formaDeLasLineas\b/u, 'tools/lib/lineas.ts'],
      [/function\s+textoConSaltos\b/u, 'tools/lib/lineas.ts'],
      [/function\s+documentoParaLosSaltos\b/u, 'tools/lib/lineas.ts'],
      [/function\s+saltosDeLaCita\b/u, 'tools/lib/lineas.ts'],
      [/\bFORMAS_DE_LINEAS\s*=/u, 'tools/lib/lineas.ts'],
      [/function\s+tramoEnCrudo\b/u, 'tools/lib/cotejo.ts'],
      [/function\s+rachasDeEspacio\b/u, 'tools/lib/cotejo.ts'],
    ];
    for (const [patron, dueño] of definiciones) {
      expect(todos.filter((f) => patron.test(f.contenido)).map((f) => f.ruta)).toEqual([dueño]);
    }
  });

  it('las cinco formas solo se escriben como literal en tools/lib/lineas.ts', () => {
    // `class="verso"` no es la forma de un documento: es la clase con que `TextoDeCita.astro`
    // pinta cada verso desde la 29.3, y queda fuera de la guarda.
    const literal = /(?<!class=)(['"])(?:verso|verso-espaciado|prosa-por-lineas|prosa-ajustada|indeterminada)\1/u;
    expect(todos.filter((f) => literal.test(f.contenido)).map((f) => f.ruta)).toEqual(['tools/lib/lineas.ts']);
  });

  it('quien importa tools/lib/lineas.ts es exactamente la lista declarada (la 31.1 y la 32.3 la amplían)', () => {
    const importadores = todos
      .filter((f) =>
        [...f.contenido.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]*lineas\.ts)['"]/gu)].some(
          (m) => resolve(RAIZ, dirname(f.ruta), m[1]) === join(RAIZ, 'tools/lib/lineas.ts'),
        ),
      )
      .map((f) => f.ruta)
      .sort();
    expect(importadores).toEqual(
      [
        'tools/alta.ts',
        'tools/extraer.ts',
        'tools/lib/cotejo.ts',
        'tools/lib/documentacion.ts',
        // La aprobación publica con sus saltos la candidata que llega sin ellos (29.2, `saltosDeLaCita`).
        'tools/lib/revision.ts',
        'tools/lineas.ts',
        'tools/recuperar.ts',
      ].sort(),
    );
  });

  it('quien importa tramoEnCrudo o rachasDeEspacio de tools/lib/cotejo.ts es exactamente la lista declarada', () => {
    const importadores = todos
      .filter((f) => f.ruta !== 'tools/lib/cotejo.ts')
      .filter((f) =>
        [...f.contenido.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]*cotejo\.ts)['"]/gu)].some(
          (m) =>
            resolve(RAIZ, dirname(f.ruta), m[2]) === join(RAIZ, 'tools/lib/cotejo.ts') &&
            /\b(?:tramoEnCrudo|rachasDeEspacio)\b/u.test(m[1]),
        ),
      )
      .map((f) => f.ruta)
      .sort();
    expect(importadores).toEqual(['tools/lib/lineas.ts']);
  });
});

describe('Historia 29.2 — saltosDeLaCita, la decisión que comparten la restitución y la puerta', () => {
  const versos = { nombre: 'versos', cuerpo: cuerpoDe(VERSOS_SENCILLOS), forma: 'verso' as const };
  const espaciado = { nombre: 'avariento', cuerpo: cuerpoDe(AVARIENTO), forma: 'verso-espaciado' as const };
  const enUnaLinea =
    'Yo vengo de todas partes, Y hacia todas partes voy: Arte soy entre las artes, En los montes, monte soy.';
  const enVerso =
    'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';

  it('sin documentos: sin-documento', () => {
    expect(saltosDeLaCita(enUnaLinea, [])).toEqual({ tipo: 'sin-documento' });
  });

  it('en ninguno se localiza: no-se-localiza', () => {
    expect(saltosDeLaCita('Esto no está en el poema.', [versos])).toEqual({ tipo: 'no-se-localiza' });
  });

  it('solo en prosa: prosa, con la forma del primero donde se localiza', () => {
    const prosa = { nombre: 'p', cuerpo: versos.cuerpo, forma: 'prosa-por-lineas' as const };
    const otra = { nombre: 'q', cuerpo: versos.cuerpo, forma: 'indeterminada' as const };
    expect(saltosDeLaCita(enUnaLinea, [prosa, otra])).toEqual({ tipo: 'prosa', forma: 'prosa-por-lineas', documento: 'p' });
  });

  it('de verso: el texto del escritor único, con su documento y su forma', () => {
    expect(saltosDeLaCita(enUnaLinea, [versos])).toEqual({
      tipo: 'saltos',
      texto: enVerso,
      documento: 'versos',
      forma: 'verso',
    });
    // Ya restituida: la misma decisión, el mismo texto.
    expect(saltosDeLaCita(enVerso, [versos])).toMatchObject({ tipo: 'saltos', texto: enVerso });
    // Con el colapsado dado, lo mismo.
    expect(saltosDeLaCita(enUnaLinea, [{ ...versos, colapsado: colapsarEspacios(versos.cuerpo) }])).toMatchObject({
      tipo: 'saltos',
      texto: enVerso,
    });
  });

  it('verso espaciado: un solo \\n entre dos versos', () => {
    expect(saltosDeLaCita('Un hombre rico avariento. Murió con cien mil dolores', [espaciado])).toMatchObject({
      tipo: 'saltos',
      texto: 'Un hombre rico avariento.\nMurió con cien mil dolores',
      forma: 'verso-espaciado',
    });
  });

  it('de verso, con el tramo dentro de una línea: sin-saltos', () => {
    expect(saltosDeLaCita('Yo vengo de todas partes,', [versos])).toEqual({ tipo: 'sin-saltos', documento: 'versos' });
  });

  it('dos de verso que dan textos distintos: conflicto; si dan el mismo, no', () => {
    const otraDisposicion = {
      nombre: 'otra',
      cuerpo: 'Yo vengo de todas partes, Y hacia todas partes voy:\nArte soy entre las artes, En los montes, monte soy.\nUno\nDos\nTres',
      forma: 'verso' as const,
    };
    expect(saltosDeLaCita(enUnaLinea, [versos, otraDisposicion])).toEqual({
      tipo: 'conflicto',
      documentos: ['versos', 'otra'],
    });
    // También si uno no da ningún salto y el otro sí.
    const deUnaLinea = { nombre: 'llana', cuerpo: `${enUnaLinea}\nUno\nDos`, forma: 'verso' as const };
    expect(saltosDeLaCita(enUnaLinea, [versos, deUnaLinea])).toMatchObject({ tipo: 'conflicto' });
    expect(saltosDeLaCita(enUnaLinea, [versos, { ...versos, nombre: 'copia' }])).toMatchObject({
      tipo: 'saltos',
      documento: 'versos',
    });
    // Uno de prosa al lado no es conflicto.
    expect(
      saltosDeLaCita(enUnaLinea, [{ ...deUnaLinea, forma: 'prosa-ajustada' as const }, versos]),
    ).toMatchObject({ tipo: 'saltos', documento: 'versos' });
  });
});
