import { describe, expect, it } from 'vitest';
import { citaAdmisible, LENGUAS_DE_PARTIDA, variante } from '../../src/lib/admision.ts';
import { REGIONES_DE_VARIANTE, esRegionDeVariante } from '../../src/lib/variante.ts';
import {
  firmaDeCita,
  fragmentoParaInsertar,
  lineaDeVariante,
  procedenciaCompuesta,
  textoParaCopiar,
} from '../../src/lib/atribucion.ts';
import { svgDeTarjeta } from '../../src/lib/tarjeta.ts';
import { fallosDeAtribuidas, textoDeVariante, type CitaParaAtribuidas } from '../../tools/lib/atribuidas.ts';
import type { Cita } from '../../src/lib/publicado.ts';

/**
 * Historia 35.6 — la Variante de España, en puro: el esquema y su forma, la regla de clase, la línea
 * que la dice, el tope y los duplicados de `fallosDeAtribuidas`, y que nada de lo que se lleva el
 * visitante —lo copiado, el Fragmento, la Tarjeta Social— la contiene. Lo construido está en
 * `variante-build.test.ts`; la orden, en `atribuida-cli.test.ts`.
 */

const ATESTIGUACIONES = [
  { url: 'https://es.wikiquote.org/wiki/Prueba', consultadaEl: '2026-11-01' },
  { url: 'https://www.elpais.com/cultura/prueba.html', consultadaEl: '2026-11-02' },
];

const VARIANTE = { texto: 'Hasta el infinito y aún más allá', region: 'espana', origen: 'doblaje' };

const atribuida = (campos: Record<string, unknown> = {}) => ({
  texto: 'Hasta el infinito y más allá',
  personaje: 'buzz',
  temas: [],
  slug: 'buzz-hasta-el-infinito-y-mas-alla',
  procedencia: { año: 1995 },
  clase: 'atribuida',
  atestiguaciones: ATESTIGUACIONES,
  origen: 'doblaje',
  ...campos,
});

const mensajes = (valor: unknown) => {
  const r = citaAdmisible.safeParse(valor);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('Historia 35.6 — el esquema de la Variante', () => {
  it('admite una Variante con texto, región y origen en la atribuida', () => {
    expect(mensajes(atribuida({ variante: VARIANTE }))).toEqual([]);
  });

  it('España es la región, con su rótulo', () => {
    expect(REGIONES_DE_VARIANTE).toEqual({ espana: 'España' });
    expect(esRegionDeVariante('espana')).toBe(true);
    expect(esRegionDeVariante('mexico')).toBe(false);
    expect(esRegionDeVariante('toString')).toBe(false);
  });

  it.each([
    ['una región ajena', { ...VARIANTE, region: 'mexico' }, /«region» de la Variante es una de «espana»/],
    ['un origen ajeno', { ...VARIANTE, origen: 'radio' }, /el «origen» de la Variante es uno de/],
    // Historia 35.10 — la traducción del sitio no es la letra de ninguna región.
    ['la traducción propia', { ...VARIANTE, origen: 'traduccion-propia' }, /nunca una traducción del sitio/],
    ['una lista en vez de un objeto', [VARIANTE], /«variante» es un objeto con «texto», «region» y «origen»; una como mucho/],
    ['una clave de más', { ...VARIANTE, idioma: 'es' }, /la Variante solo declara «texto», «region» y «origen»/],
    ['un texto vacío', { ...VARIANTE, texto: '' }, /el texto de la Variante no puede estar vacío/],
    ['un texto en blanco', { ...VARIANTE, texto: '   ' }, /el texto de la Variante no puede estar en blanco/],
    ['sin texto', { region: 'espana', origen: 'doblaje' }, /la Variante declara su «texto»/],
  ])('rechaza %s con su regla', (_, v, regla) => {
    expect(variante.safeParse(v).success).toBe(false);
    expect(mensajes(atribuida({ variante: v })).join('\n')).toMatch(regla);
  });

  it('rechaza un salto de línea en el texto de la Variante de la atribuida', () => {
    expect(mensajes(atribuida({ variante: { ...VARIANTE, texto: 'Hasta el infinito\ny más allá' } })).join('\n')).toMatch(
      /la Variante de una Cita atribuida va en una sola línea/,
    );
  });

  it('rechaza una Variante que repite el texto de su Cita, también con otra puntuación', () => {
    for (const texto of ['Hasta el infinito y más allá', '¡Hasta el infinito, y más allá!']) {
      expect(mensajes(atribuida({ variante: { ...VARIANTE, texto } })).join('\n')).toMatch(
        /la Variante repite el texto de la Cita/,
      );
    }
  });

  it('la Cita de siempre no lleva Variante (`reglasDeClase`)', () => {
    const deSiempre = {
      texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
      autor: 'seneca',
      slug: 'seneca-no-es-que-tengamos-poco-tiempo',
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
      estadoDerechos: 'dominio-público',
      variante: VARIANTE,
    };
    expect(mensajes(deSiempre)).toEqual([expect.stringMatching(/solo una Cita atribuida declara «variante»/)]);
  });

  it('textoDeVariante solo lee una Variante con texto', () => {
    expect(textoDeVariante({ variante: VARIANTE })).toBe(VARIANTE.texto);
    expect(textoDeVariante({})).toBeUndefined();
    expect(textoDeVariante({ variante: 'x' })).toBeUndefined();
    expect(textoDeVariante({ variante: { texto: '' } })).toBeUndefined();
  });
});

describe('Historia 35.6 — la línea de la Variante', () => {
  it('«En España: «{texto}»», y nada sin Variante', () => {
    expect(lineaDeVariante({ variante: { texto: 'Hasta el infinito y aún más allá', region: 'espana', origen: 'doblaje' } })).toBe(
      'En España: «Hasta el infinito y aún más allá»',
    );
    expect(lineaDeVariante({})).toBeUndefined();
  });

  it('una región sin rótulo no se pinta como «En undefined»: se para', () => {
    expect(() =>
      lineaDeVariante({ variante: { texto: 'x', region: 'mexico', origen: 'doblaje' } } as unknown as Parameters<typeof lineaDeVariante>[0]),
    ).toThrow(/no es de REGIONES_DE_VARIANTE/);
  });
});

describe('Historia 35.11 — la página no dice la traducción propia', () => {
  it('ningún módulo de src/lib/atribucion.ts compone una línea de traducción propia', async () => {
    const atribucion = await import('../../src/lib/atribucion.ts');
    expect(Object.keys(atribucion)).not.toContain('lineaDeTraduccionPropia');
  });
});

describe('Historia 35.11 — el esquema de la traducción propia: la partida', () => {
  const PARTIDA = { texto: 'To infinity and beyond!', lengua: 'en' };

  it('admite la traducción propia con su partida {texto, lengua}', () => {
    expect(mensajes(atribuida({ origen: 'traduccion-propia', partida: PARTIDA }))).toEqual([]);
  });

  it('admite cada lengua de LENGUAS_DE_PARTIDA', () => {
    for (const lengua of LENGUAS_DE_PARTIDA) {
      expect(mensajes(atribuida({ origen: 'traduccion-propia', partida: { ...PARTIDA, lengua } })), lengua).toEqual([]);
    }
    expect([...LENGUAS_DE_PARTIDA]).toEqual(['en', 'fr', 'it', 'de', 'pt', 'ja']);
  });

  it('rechaza la traducción propia sin partida, nombrando «partida»', () => {
    expect(mensajes(atribuida({ origen: 'traduccion-propia' })).join('\n')).toMatch(
      /«origen: traduccion-propia» declara su «partida»/,
    );
  });

  it.each([
    ['otro origen de la atribuida (doblaje)', atribuida({ partida: PARTIDA })],
    ['la Cita de siempre', { texto: 'Una frase', autor: 'seneca', temas: [], slug: 'seneca-una-frase', procedencia: { año: 60 }, estadoDerechos: 'dominio-público', partida: PARTIDA }],
  ])('rechaza partida con %s', (_, cita) => {
    expect(mensajes(cita).join('\n')).toMatch(/declara «partida»/);
  });

  it('el campo viejo, textoOriginal, no sustituye a la partida: el rechazo nombra «partida»', () => {
    expect(mensajes(atribuida({ origen: 'traduccion-propia', textoOriginal: PARTIDA.texto })).join('\n')).toMatch(/«partida»/);
  });

  it.each([
    ['una lengua fuera del conjunto', { texto: PARTIDA.texto, lengua: 'es' }, /«lengua» de la «partida» es una de/],
    ['sin lengua', { texto: PARTIDA.texto }, /«lengua» de la «partida» es una de/],
    ['un texto en blanco', { texto: '   ', lengua: 'en' }, /no puede estar en blanco/],
    ['un texto con salto de línea', { texto: 'To infinity\nand beyond!', lengua: 'en' }, /va en una sola línea/],
    ['una clave de más', { ...PARTIDA, fuente: 'x' }, /solo declara «texto» y «lengua»/],
    ['una cadena en vez de un objeto', 'To infinity and beyond!', /«partida» es un objeto con «texto» y «lengua»/],
  ])('rechaza una partida con %s', (_, valor, regla) => {
    expect(mensajes(atribuida({ origen: 'traduccion-propia', partida: valor })).join('\n')).toMatch(regla);
  });

  it('rechaza la traducción propia con Variante', () => {
    expect(
      mensajes(atribuida({ origen: 'traduccion-propia', partida: PARTIDA, variante: VARIANTE })).join('\n'),
    ).toMatch(/«origen: traduccion-propia» no declara Variante/);
  });
});

describe('Historia 35.6 — lo que se lleva el visitante no lleva la Variante', () => {
  const cita = {
    slug: 'buzz-hasta-el-infinito-y-mas-alla',
    texto: 'Hasta el infinito y más allá',
    personaje: 'buzz',
    clase: 'atribuida',
    temas: [],
    procedencia: { año: 1995 },
    variante: { texto: 'Hasta el infinito y aún más allá', region: 'espana', origen: 'doblaje' },
    aptaParaPortada: false,
  } as Cita;
  const personaje = { nombre: 'Buzz Lightyear' };
  const quienes = { autor: undefined, personaje };

  it('ni lo copiado, ni el Fragmento, ni la Tarjeta Social', () => {
    expect(textoParaCopiar(cita, undefined, personaje)).not.toContain('aún más allá');
    expect(textoParaCopiar(cita, undefined, personaje)).toContain('Hasta el infinito y más allá');
    expect(fragmentoParaInsertar(cita, undefined, 'https://ejemplo.org/cita/x/', personaje)).not.toContain('aún más allá');
    const svg = svgDeTarjeta({
      texto: cita.texto,
      autor: firmaDeCita(cita, quienes).nombre,
      procedencia: procedenciaCompuesta(cita, quienes),
    });
    expect(svg).not.toContain('aún más allá');
  });
});

describe('Historia 35.6 — el tope y los duplicados con la Variante', () => {
  const PUERTA = { maxCaracteres: 60, maxPorObra: 100, maxPorDueño: 100, minAtestiguaciones: 2, buzon: 'b@ejemplo.org' };
  const fichas: never[] = [];
  const autores = [{ slug: 'seneca', añoFallecimiento: 65 }];
  const deBuzz = (slug: string, texto: string, variante?: string): CitaParaAtribuidas => ({
    slug,
    texto,
    personaje: 'buzz',
    clase: 'atribuida',
    atestiguaciones: ATESTIGUACIONES,
    ...(variante !== undefined ? { variante } : {}),
  });
  const deSiempre = (slug: string, texto: string): CitaParaAtribuidas => ({ slug, texto, autor: 'seneca' });
  const juicio = (citas: CitaParaAtribuidas[], juzgar?: string[]) =>
    fallosDeAtribuidas({
      citas,
      autores,
      fichas,
      valores: PUERTA,
      ...(juzgar !== undefined ? { juzgar: new Set(juzgar) } : {}),
    }).map((f) => f.motivo);

  it('una Variante más larga que el tope falla nombrando la variante', () => {
    const larga = 'Una variante que es claramente mucho más larga que los sesenta caracteres del tope.';
    expect(juicio([deBuzz('buzz-a', 'Hasta el infinito', larga)])).toEqual([
      expect.stringMatching(/^la variante de la atribuida «buzz-a» tiene \d+ caracteres y el tope es 60/),
    ]);
  });

  it('sin duplicado no hay fallo', () => {
    expect(juicio([deBuzz('buzz-a', 'Hasta el infinito', 'Hasta el infinito y aún más'), deSiempre('seneca-b', 'Perdemos mucho tiempo.')])).toEqual([]);
  });

  it.each([
    ['su Variante repite el texto de una de siempre', deBuzz('buzz-a', 'Una frase del doblaje latino.', 'Perdemos mucho tiempo en la vida.'), deSiempre('seneca-b', 'Perdemos mucho tiempo en la vida.'), 'siempre'],
    ['su texto repite la Variante de otra atribuida', deBuzz('buzz-a', 'Al infinito y más allá, compañeros.'), deBuzz('buzz-b', 'Otra cosa del todo distinta.', 'Al infinito y más allá, compañeros.'), 'atribuida'],
    ['su Variante repite la Variante de otra atribuida', deBuzz('buzz-a', 'Primer texto latino sin nada.', 'La variante compartida de España.'), deBuzz('buzz-b', 'Segundo texto latino distinto.', 'La variante compartida de España.'), 'atribuida'],
  ])('%s: duplicado entre clases', (_, juzgada, otra, clase) => {
    expect(juicio([juzgada, otra], [juzgada.slug])).toEqual([
      expect.stringMatching(new RegExp(`^la atribuida «${juzgada.slug}» coincide con «${otra.slug}», de la clase ${clase}`)),
    ]);
  });

  it('una de siempre que repite la Variante de una atribuida rompe el juicio de la atribuida', () => {
    expect(
      juicio([deBuzz('buzz-a', 'Texto latino.', 'Perdemos mucho tiempo en la vida.'), deSiempre('seneca-b', 'Perdemos mucho tiempo en la vida.')]),
    ).toHaveLength(1);
  });
});
