import { beforeAll, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  colgarObras,
  compararDocumentos,
  ordenDelLibro,
  type AparicionDeCita,
  type PosicionesDeCitas,
} from '../../src/lib/obras.ts';
import { leerPosicionesDelCorpus, posicionesDeCitas, type CitaParaSituar } from '../../tools/lib/posiciones.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import {
  apareceEnDocumento,
  BIOGRAFIA_MAL_COLOCADA,
  colapsarEspacios,
  documentosDeCita,
  localizar,
  type DocumentosDeFuente,
} from '../../tools/lib/cotejo.ts';
import {
  leerCensoDeCotejo,
  leerCitas,
  leerDocumentosDeFuente,
  leerFichasDeObra,
  rutasDelCorpus,
  separarFrontmatter,
  type CitaEnCorpus,
} from '../../tools/lib/corpus.ts';

/**
 * Historia 24.1 — la Página de Obra lista sus Citas en el orden del libro.
 *
 * Lo decidible sin construir: el orden (`ordenDelLibro` y `compararDocumentos`, en
 * `src/lib/obras.ts`), la composición que sitúa cada Cita en sus documentos
 * (`posicionesDeCitas`, en `tools/lib/posiciones.ts`), el Corpus real del repositorio y las
 * dependencias que la historia prohíbe. Que la página tome ese orden lo prueba
 * `obra-pagina.test.ts`, que construye.
 */

const RAIZ_DEL_REPO = join(import.meta.dirname, '..', '..');

/** Una Cita mínima para ordenar: slug y, si la tiene, Fuente. */
const cita = (slug: string, fuente?: string) => ({ slug, ...(fuente !== undefined ? { fuente: { id: fuente } } : {}) });
const en = (documento: string, posicion: number): AparicionDeCita => ({ documento, posicion });
const slugs = (citas: readonly { slug: string }[]) => citas.map((c) => c.slug);

/** Todas las permutaciones de una lista corta. */
function permutaciones<T>(lista: readonly T[]): T[][] {
  if (lista.length <= 1) return [[...lista]];
  return lista.flatMap((x, i) =>
    permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [x, ...resto]),
  );
}

/** Un mapa con las mismas entradas en otro orden y cada lista de apariciones al revés. */
function revuelto(posiciones: PosicionesDeCitas): PosicionesDeCitas {
  return new Map([...posiciones].reverse().map(([slug, lista]) => [slug, [...lista].reverse()]));
}

/** Ordena una lista de nombres de documento con `compararDocumentos`. */
const natural = (nombres: readonly string[]) => [...nombres].sort(compararDocumentos);

describe('24.1 — compararDocumentos: el orden natural de los documentos de una Obra', () => {
  it('La ciudad de Dios: «proemio» antes que «i», y los romanos por su valor', () => {
    const base = 'wikisource-es--la-ciudad-de-dios--la-ciudad-de-dios';
    const enOrden = ['proemio', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi'].map(
      (p) => `${base}-${p}`,
    );
    expect(natural([...enOrden].reverse())).toEqual(enOrden);
    expect(natural([...enOrden].sort())).toEqual(enOrden);
  });

  it('Dafnis y Cloe: el proemio también va delante', () => {
    const base = 'wikisource-es--dafnis-y-cloe--dafnis-y-cloe-longo';
    const enOrden = ['proemio', 'i', 'ii', 'iii', 'iv'].map((p) => `${base}-${p}`);
    expect(natural([...enOrden].sort())).toEqual(enOrden);
  });

  it('El Zarco: capítulo i a xx, con ix antes que x y xix antes que xx', () => {
    const romanos = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];
    const enOrden = romanos.map((r) => `wikisource-es--el-zarco--el-zarco-capitulo-${r}`);
    expect(natural([...enOrden].sort())).toEqual(enOrden);
  });

  it('El conde Lucanor: ejemplo 1, 2, 10, 19 —por valor, no por cadena—', () => {
    const enOrden = [1, 2, 10, 19].map((n) => `wikisource-es--conde-lucanor--conde-lucanor-ejemplo-${n}`);
    expect(natural([...enOrden].sort())).toEqual(enOrden);
  });

  it('Ética a Nicómaco: el libro 2 antes que el 10', () => {
    const enOrden = [2, 10].map((n) => `wikisource-es--etica-a-nicomaco--etica-a-nicomaco-libro-${n}`);
    expect(natural([...enOrden].reverse())).toEqual(enOrden);
  });

  it('Oráculo manual: aforismos 1-25, 26-50, 101-125, y el documento corto antes que sus páginas', () => {
    const base = 'wikisource-es--oraculo-manual-y-arte-de-prudencia';
    const enOrden = [
      base,
      `${base}--oraculo-manual-y-arte-de-prudencia-aforismos-1-25`,
      `${base}--oraculo-manual-y-arte-de-prudencia-aforismos-26-50`,
      `${base}--oraculo-manual-y-arte-de-prudencia-aforismos-101-125`,
    ];
    expect(natural([...enOrden].sort())).toEqual(enOrden);
    expect(natural([...enOrden].reverse())).toEqual(enOrden);
  });

  it('Plenitud: iii, iv, ix, l, li, lv —el romano manda aunque siga una palabra—', () => {
    const enOrden = [
      'iii-la-mujer',
      'iv-enciende-tu-lampara',
      'ix-todos-tenemos-hambre',
      'l-las-preguntas',
      'li-tu-cuerpo',
      'lv-incomprension',
    ].map((p) => `wikisource-es--plenitud--plenitud-${p}`);
    expect(natural([...enOrden].sort())).toEqual(enOrden);
  });

  it('Ariel: capítulo i, ii, iii, viii', () => {
    const enOrden = ['i', 'ii', 'iii', 'viii'].map((r) => `wikisource-es--ariel--ariel-capitulo-${r}`);
    expect(natural([...enOrden].reverse())).toEqual(enOrden);
    expect(natural([...enOrden].sort())).toEqual(enOrden);
  });

  it('Novelas ejemplares: el documento corto antes que sus páginas', () => {
    const base = 'wikisource-es--novelas-ejemplares';
    const enOrden = [base, `${base}--el-celoso-extremeno-1825`, `${base}--la-gitanilla-1825`];
    expect(natural([...enOrden].reverse())).toEqual(enOrden);
  });

  /*
   * Los límites que la historia acepta hasta que se capture el índice de subpáginas de la
   * Fuente. Se fijan tal y como son hoy para que, cuando ese índice los corrija, esta prueba
   * diga que el comportamiento cambió.
   */
  it('límites aceptados: páginas con nombre de capítulo, «mi», el final del libro, ordinales escritos y cifra con letra', () => {
    // Por título, alfabético: El coloquio de los perros —la última del libro— va antes que La gitanilla.
    const novelas = 'wikisource-es--novelas-ejemplares';
    expect(natural([`${novelas}--la-gitanilla-1825`, `${novelas}--el-coloquio-de-los-perros-1825`])).toEqual([
      `${novelas}--el-coloquio-de-los-perros-1825`,
      `${novelas}--la-gitanilla-1825`,
    ]);
    // «mi» se lee 1001, y «notas» es palabra: las notas del autor van antes que «Mi educación».
    const recuerdos = 'wikisource-es--recuerdos-de-provincia--recuerdos-de-provincia';
    expect(natural([`${recuerdos}-mi-educacion`, `${recuerdos}-notas-del-autor`])).toEqual([
      `${recuerdos}-notas-del-autor`,
      `${recuerdos}-mi-educacion`,
    ]);
    expect(compararDocumentos('x-mi', 'x-ii')).toBeGreaterThan(0);
    // El final del libro, como palabra, va antes que el capítulo i.
    expect(compararDocumentos('wikisource-es--plenitud--plenitud-epilogo', 'wikisource-es--plenitud--plenitud-iii-la-mujer')).toBeLessThan(0);
    // Los ordinales escritos son palabras: «primera, segunda, tercera» sale bien por casualidad, «cuarta» no.
    const zalamea = 'wikisource-es--el-alcalde-de-zalamea--el-alcalde-de-zalamea-jornada';
    const jornadas = ['primera', 'segunda', 'tercera'].map((o) => `${zalamea}-${o}`);
    expect(natural([...jornadas].reverse())).toEqual(jornadas);
    expect(compararDocumentos(`${zalamea}-cuarta`, `${zalamea}-primera`)).toBeLessThan(0);
    // Cifra con letra es palabra: «10a» antes que «1o», y los dos antes que cualquier número.
    expect(natural(['x-1', 'x-1o', 'x-10a'])).toEqual(['x-10a', 'x-1o', 'x-1']);
  });

  it('es un orden total y estable: cero solo consigo mismo, y antisimétrico', () => {
    const nombres = ['a-1', 'a-01', 'a-i', 'a-proemio', 'a', 'a--b', 'a-x', 'a-10'];
    for (const x of nombres) {
      expect(compararDocumentos(x, x)).toBe(0);
      for (const y of nombres) {
        if (x === y) continue;
        expect(compararDocumentos(x, y), `${x} / ${y}`).not.toBe(0);
        expect(Math.sign(compararDocumentos(x, y))).toBe(-Math.sign(compararDocumentos(y, x)));
      }
    }
    // A igual valor, decide la cadena: «01» antes que «1», y «1» antes que «i».
    expect(natural(['a-i', 'a-1', 'a-01'])).toEqual(['a-01', 'a-1', 'a-i']);
  });
});

describe('24.1 — ordenDelLibro: la matriz de la historia', () => {
  it('un documento: por posición, no por slug', () => {
    const posiciones = new Map([
      ['a', [en('ws--obra', 30)]],
      ['b', [en('ws--obra', 10)]],
    ]);
    expect(slugs(ordenDelLibro([cita('a', 'ws'), cita('b', 'ws')], posiciones))).toEqual(['b', 'a']);
  });

  it('varias Fuentes: primero la que más Citas sitúa; a igualdad, el identificador menor', () => {
    const tres = new Map<string, AparicionDeCita[]>([
      ['w1', [en('wikisource-es--obra', 300)]],
      ['w2', [en('wikisource-es--obra', 200)]],
      ['w3', [en('wikisource-es--obra', 100)]],
      ['g1', [en('gutenberg--obra', 1)]],
      ['g2', [en('gutenberg--obra', 2)]],
    ]);
    const citas = [cita('g1', 'gutenberg'), cita('g2', 'gutenberg'), cita('w1', 'wikisource-es'), cita('w2', 'wikisource-es'), cita('w3', 'wikisource-es')];
    expect(slugs(ordenDelLibro(citas, tres))).toEqual(['w3', 'w2', 'w1', 'g1', 'g2']);

    // Con 2 y 2, `gutenberg` < `wikisource-es` por unidades de código.
    const dos = new Map([...tres].filter(([slug]) => slug !== 'w3'));
    expect(slugs(ordenDelLibro(citas.filter((c) => c.slug !== 'w3'), dos))).toEqual(['g1', 'g2', 'w2', 'w1']);
  });

  it('paginada: proemio, i, ii, ix, x; el corto antes que sus páginas', () => {
    const base = 'wikisource-es--la-ciudad-de-dios';
    const pagina = (p: string) => `${base}--la-ciudad-de-dios-${p}`;
    const posiciones = new Map<string, AparicionDeCita[]>([
      ['c-x', [en(pagina('x'), 0)]],
      ['c-ix', [en(pagina('ix'), 0)]],
      ['c-ii', [en(pagina('ii'), 0)]],
      ['c-i', [en(pagina('i'), 0)]],
      ['c-proemio', [en(pagina('proemio'), 0)]],
      ['c-corto', [en(base, 9_999)]],
    ]);
    const citas = [...posiciones.keys()].map((s) => cita(s, 'wikisource-es'));
    expect(slugs(ordenDelLibro(citas, posiciones))).toEqual(['c-corto', 'c-proemio', 'c-i', 'c-ii', 'c-ix', 'c-x']);

    // Y los números, por valor: el libro 2 antes que el 10.
    const libros = new Map([
      ['diez', [en('ws--etica--etica-libro-10', 0)]],
      ['dos', [en('ws--etica--etica-libro-2', 50)]],
    ]);
    expect(slugs(ordenDelLibro([cita('diez', 'ws'), cita('dos', 'ws')], libros))).toEqual(['dos', 'diez']);
  });

  it('varias apariciones: la Cita toma la del primer documento en orden natural', () => {
    const base = 'wikisource-es--la-ciudad-de-dios--la-ciudad-de-dios';
    const posiciones = new Map<string, AparicionDeCita[]>([
      // c aparece en la x (pos 3) y en la ii (pos 500): toma la ii, pos 500.
      ['c', [en(`${base}-x`, 3), en(`${base}-ii`, 500)]],
      ['d', [en(`${base}-ii`, 499)]],
      ['e', [en(`${base}-ii`, 501)]],
      ['f', [en(`${base}-x`, 1)]],
    ]);
    const citas = ['c', 'd', 'e', 'f'].map((s) => cita(s, 'wikisource-es'));
    expect(slugs(ordenDelLibro(citas, posiciones))).toEqual(['d', 'c', 'e', 'f']);
  });

  it('empate en documento y posición: decide el slug', () => {
    const posiciones = new Map([
      ['zeta', [en('ws--obra', 7)]],
      ['alfa', [en('ws--obra', 7)]],
    ]);
    expect(slugs(ordenDelLibro([cita('zeta', 'ws'), cita('alfa', 'ws')], posiciones))).toEqual(['alfa', 'zeta']);
  });

  it('sin documento: sin Fuente, o con posiciones vacías o ausentes, al final y por slug', () => {
    const posiciones = new Map<string, AparicionDeCita[]>([
      ['situada', [en('ws--obra', 900)]],
      ['vacia', []],
      // Con apariciones pero sin Fuente: no se sitúa —la Fuente es la primera clave—.
      ['sin-fuente', [en('ws--obra', 0)]],
    ]);
    const citas = [cita('vacia', 'ws'), cita('sin-fuente'), cita('ausente', 'ws'), cita('situada', 'ws'), { slug: 'nula', fuente: null }];
    expect(slugs(ordenDelLibro(citas, posiciones))).toEqual(['situada', 'ausente', 'nula', 'sin-fuente', 'vacia']);
  });

  it('permutación: el orden de las Citas, del mapa y de las apariciones no cambia nada (AD-23)', () => {
    const base = 'wikisource-es--obra';
    const posiciones = new Map<string, AparicionDeCita[]>([
      ['a', [en(`${base}--obra-ii`, 4), en(`${base}--obra-x`, 1)]],
      ['b', [en(`${base}--obra-ii`, 4)]],
      ['c', [en(`${base}--obra-i`, 80)]],
      ['d', [en('gutenberg--obra', 0)]],
      ['e', []],
    ]);
    const citas = [cita('a', 'wikisource-es'), cita('b', 'wikisource-es'), cita('c', 'wikisource-es'), cita('d', 'gutenberg'), cita('e', 'wikisource-es'), cita('f')];
    const esperado = ['c', 'a', 'b', 'd', 'e', 'f'];
    for (const orden of permutaciones(citas)) {
      expect(slugs(ordenDelLibro(orden, posiciones))).toEqual(esperado);
      expect(slugs(ordenDelLibro(orden, revuelto(posiciones)))).toEqual(esperado);
    }
  });

  it('no toca la entrada', () => {
    const citas = [cita('b', 'ws'), cita('a', 'ws')];
    const copia = structuredClone(citas);
    ordenDelLibro(citas, new Map([['b', [en('ws--o', 0)]], ['a', [en('ws--o', 1)]]]));
    expect(citas).toEqual(copia);
  });
});

describe('24.1 — posicionesDeCitas: dónde cae cada Cita, con el localizador del cotejo', () => {
  const frontmatter = (slug: string, texto: string, extra: Record<string, unknown> = {}): CitaParaSituar => ({
    slug,
    texto,
    procedencia: { obra: 'La obra' },
    fuente: { id: 'ws', url: 'https://ejemplo.org/obra' },
    ...extra,
  });

  const documentos: DocumentosDeFuente = new Map<string, string | null | typeof BIOGRAFIA_MAL_COLOCADA>([
    ['ws--la-obra', 'Prólogo.\n\nUna   frase\nrepartida en líneas. Y otra frase.'],
    ['ws--la-obra--la-obra-ii', 'Capítulo segundo. La frase de las dos páginas.'],
    ['ws--la-obra--la-obra-x', 'La frase de las dos páginas. Capítulo décimo.'],
    ['ws--la-obra--la-obra-rota', null],
    ['ws--la-obra--la-obra-biografia', BIOGRAFIA_MAL_COLOCADA],
    ['ws--otra-obra', 'Una frase repartida en líneas.'],
  ]);

  it('una aparición por documento en que aparece, con la posición en el cuerpo colapsado y sin texto', () => {
    const posiciones = posicionesDeCitas(
      [frontmatter('una', 'Una frase repartida\nen líneas.'), frontmatter('dos', 'La frase de las dos páginas.')],
      documentos,
    );
    expect(posiciones.get('una')).toEqual([{ documento: 'ws--la-obra', posicion: 'Prólogo. '.length }]);
    // En dos documentos: dos apariciones, sin elegir; el orden no importa.
    expect([...(posiciones.get('dos') ?? [])].sort((a, b) => a.documento.localeCompare(b.documento))).toEqual([
      { documento: 'ws--la-obra--la-obra-ii', posicion: 'Capítulo segundo. '.length },
      { documento: 'ws--la-obra--la-obra-x', posicion: 0 },
    ]);
    for (const apariciones of posiciones.values()) {
      for (const aparicion of apariciones) expect(Object.keys(aparicion).sort()).toEqual(['documento', 'posicion']);
    }
  });

  it('censo (sin Fuente), texto vacío, sin obra o que no aparece: lista vacía', () => {
    const posiciones = posicionesDeCitas(
      [
        frontmatter('censada', 'Una frase repartida en líneas.', { fuente: undefined }),
        frontmatter('vacia', '   \n '),
        frontmatter('sin-obra', 'Y otra frase.', { procedencia: { año: 1900 } }),
        frontmatter('ausente', 'Esta frase no está.'),
        frontmatter('sin-texto', undefined as unknown as string),
      ],
      documentos,
    );
    expect([...posiciones]).toEqual([
      ['censada', []],
      ['vacia', []],
      ['sin-obra', []],
      ['ausente', []],
      ['sin-texto', []],
    ]);
  });

  it('un documento ilegible o una biografía mal colocada no entran', () => {
    const solos: DocumentosDeFuente = new Map<string, string | null | typeof BIOGRAFIA_MAL_COLOCADA>([
      ['ws--la-obra--la-obra-rota', null],
      ['ws--la-obra--la-obra-biografia', BIOGRAFIA_MAL_COLOCADA],
    ]);
    expect(posicionesDeCitas([frontmatter('x', 'Una frase.')], solos).get('x')).toEqual([]);
  });

  it('solo los documentos de su obra: el de otra obra no cuenta aunque traiga el texto', () => {
    const posiciones = posicionesDeCitas([frontmatter('una', 'Una frase repartida en líneas.')], documentos);
    expect(posiciones.get('una')?.map((a) => a.documento)).toEqual(['ws--la-obra']);
  });

  it('la clave es el `slug` del frontmatter, no el nombre del fichero', () => {
    const leida: CitaEnCorpus = {
      ...(frontmatter('y', 'Y otra frase.') as unknown as CitaEnCorpus),
      ruta: 'corpus/citas/x.md',
    };
    expect([...posicionesDeCitas([leida], documentos).keys()]).toEqual(['y']);
  });

  it('el orden de entrada no cambia ninguna aparición', () => {
    const citas = [
      frontmatter('una', 'Una frase repartida en líneas.'),
      frontmatter('dos', 'La frase de las dos páginas.'),
      frontmatter('tres', 'Capítulo décimo.'),
    ];
    const normal = (p: Map<string, AparicionDeCita[]>) =>
      [...p].map(([s, l]) => [s, [...l].sort((a, b) => a.documento.localeCompare(b.documento))] as const).sort();
    const referencia = normal(posicionesDeCitas(citas, documentos));
    for (const orden of permutaciones(citas)) {
      const revueltos = new Map([...documentos].reverse());
      expect(normal(posicionesDeCitas(orden, revueltos))).toEqual(referencia);
    }
  });

  it('el localizador: indexOf sobre formas colapsadas, y -1 para el texto vacío', () => {
    const c = colapsarEspacios;
    expect(localizar(c('b\n c'), c('a  b c'))).toBe(2);
    expect(localizar(c('  '), c('a b c'))).toBe(-1);
    expect(localizar(c('d'), c('a b c'))).toBe(-1);
  });
});

describe('24.1 — leerPosicionesDelCorpus: lo que el cargador entrega, leído de disco', () => {
  it('por el slug del frontmatter, con los lectores del cotejo y sin tocar ningún fichero', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'posiciones-'));
    try {
      const corpus = join(raiz, 'corpus');
      await mkdir(join(corpus, 'citas'), { recursive: true });
      await mkdir(join(corpus, 'fuentes'), { recursive: true });
      const fuente = 'fuente:\n  id: ws\n  url: https://ejemplo.org/la-obra\n';
      const ficheros: Record<string, string> = {
        // El fichero se llama x y su slug es y: la clave es y.
        'citas/x.md': `---\nslug: y\ntexto: "Y otra frase."\nprocedencia:\n  obra: La obra\n${fuente}---\n`,
        'citas/doble.md': `---\nslug: doble\ntexto: "La frase de las dos páginas."\nprocedencia:\n  obra: La obra\n${fuente}---\n`,
        // Del censo: sin Fuente, lista vacía.
        'citas/censada.md': '---\nslug: censada\ntexto: "Y otra frase."\nprocedencia:\n  obra: La obra\n---\n',
        'fuentes/ws--la-obra.txt': componerDocumento(
          { fuente: 'ws', obra: 'La obra', url: 'https://ejemplo.org/la-obra', recuperado: '2026-10-25' },
          'La obra',
          'Prólogo. Y otra frase.',
        ),
        'fuentes/ws--la-obra--la-obra-ii.txt': componerDocumento(
          { fuente: 'ws', obra: 'La obra', url: 'https://ejemplo.org/la-obra/ii', recuperado: '2026-10-25' },
          'La obra',
          'La frase de las dos páginas.',
        ),
        'fuentes/ws--la-obra--la-obra-x.txt': componerDocumento(
          { fuente: 'ws', obra: 'La obra', url: 'https://ejemplo.org/la-obra/x', recuperado: '2026-10-25' },
          'La obra',
          'Antes. La frase de las dos páginas.',
        ),
        // Ocupa el nombre y no se deja analizar: no entra.
        'fuentes/ws--la-obra--la-obra-rota.txt': 'Y otra frase. La frase de las dos páginas.',
      };
      for (const [ruta, contenido] of Object.entries(ficheros)) await writeFile(join(corpus, ruta), contenido, 'utf8');
      // El árbol entero, con el contenido de cada fichero: ni se reescribe uno ni aparece otro.
      const arbol = async () => {
        const entradas = (await readdir(raiz, { recursive: true, withFileTypes: true })).filter((e) => e.isFile());
        return Promise.all(
          entradas.map(async (e) => [join(e.parentPath, e.name), await readFile(join(e.parentPath, e.name), 'utf8')]),
        ).then((pares) => pares.sort((a, b) => (a[0] < b[0] ? -1 : 1)));
      };
      const antes = await arbol();
      expect(antes).toHaveLength(Object.keys(ficheros).length);

      const posiciones = await leerPosicionesDelCorpus(corpus);
      expect([...posiciones.keys()].sort()).toEqual(['censada', 'doble', 'y']);
      expect(posiciones.get('y')).toEqual([{ documento: 'ws--la-obra', posicion: 'Prólogo. '.length }]);
      expect(posiciones.get('censada')).toEqual([]);
      expect([...(posiciones.get('doble') ?? [])].sort((a, b) => a.documento.localeCompare(b.documento))).toEqual([
        { documento: 'ws--la-obra--la-obra-ii', posicion: 0 },
        { documento: 'ws--la-obra--la-obra-x', posicion: 'Antes. '.length },
      ]);
      expect(await arbol()).toEqual(antes);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

describe('24.1 — el Corpus real, sin construir', () => {
  const rutas = rutasDelCorpus(join(RAIZ_DEL_REPO, 'corpus'));
  let citas: CitaEnCorpus[] = [];
  let documentos: DocumentosDeFuente = new Map();
  let posiciones: Map<string, AparicionDeCita[]> = new Map();

  beforeAll(async () => {
    [citas, documentos] = await Promise.all([leerCitas(rutas.citas), leerDocumentosDeFuente(rutas)]);
    posiciones = posicionesDeCitas(citas, documentos);
  });

  it('cada Cita publicada tiene su entrada, y toda Cita con Fuente y obra aparece en algún documento', () => {
    expect(citas.length).toBeGreaterThan(100);
    expect(posiciones.size).toBe(new Set(citas.map((c) => c.slug)).size);
    const sinSitio = citas
      .filter((c) => c.fuente !== undefined && c.procedencia?.obra !== undefined)
      .filter((c) => (posiciones.get(c.slug) ?? []).length === 0)
      .map((c) => c.slug);
    expect(sinSitio).toEqual([]);
  });

  it('las Citas del censo no tienen apariciones', async () => {
    const censo = await leerCensoDeCotejo(rutas);
    expect(censo.length).toBeGreaterThan(0);
    let miradas = 0;
    for (const slug of censo) {
      if (!posiciones.has(slug)) continue;
      expect(posiciones.get(slug), slug).toEqual([]);
      miradas += 1;
    }
    // Y no por no mirar ninguna: las del censo son Citas publicadas con su entrada.
    expect(miradas).toBeGreaterThan(0);
  });

  it('aparecer ⇔ apareceEnDocumento, y la posición es la del cuerpo colapsado', () => {
    // El oráculo es `apareceEnDocumento` tal cual, con el texto y el cuerpo sin colapsar; la
    // posición esperada se calcula aparte, con el cuerpo colapsado una vez por documento.
    const colapsados = new Map<string, string>();
    const colapsado = (nombre: string) => {
      if (!colapsados.has(nombre)) colapsados.set(nombre, colapsarEspacios(documentos.get(nombre) as string));
      return colapsados.get(nombre) as string;
    };
    const discrepancias: string[] = [];
    let pares = 0;
    for (const c of citas) {
      const candidatos = documentosDeCita(c.fuente, c.procedencia?.obra, documentos).filter(
        (n) => typeof documentos.get(n) === 'string',
      );
      const suyas = new Map((posiciones.get(c.slug) ?? []).map((a) => [a.documento, a.posicion]));
      for (const nombre of candidatos) {
        const aparece = apareceEnDocumento(c.texto, documentos.get(nombre) as string);
        if (suyas.has(nombre) !== aparece) discrepancias.push(`${c.slug} en ${nombre}: ${aparece}`);
        const esperada = aparece ? colapsado(nombre).indexOf(colapsarEspacios(c.texto)) : undefined;
        if (aparece && suyas.get(nombre) !== esperada) discrepancias.push(`${c.slug} en ${nombre}: posición`);
        pares += 1;
      }
      // Ninguna aparición fuera de los documentos de su obra.
      for (const documento of suyas.keys()) {
        if (!candidatos.some((n) => n === documento)) discrepancias.push(`${c.slug} fuera: ${documento}`);
      }
    }
    expect(discrepancias).toEqual([]);
    expect(pares).toBeGreaterThan(citas.length / 2);
  });

  it('alguna Obra de varias Citas documentadas sale distinta del orden por slug', async () => {
    const fichas = await leerFichasDeObra(rutas);
    const conObra = colgarObras(citas, fichas);
    const porObra = new Map<string, typeof conObra>();
    for (const c of conObra) {
      if (c.obra === undefined) continue;
      porObra.set(c.obra.nombre, [...(porObra.get(c.obra.nombre) ?? []), c]);
    }
    let distintas = 0;
    for (const suyas of porObra.values()) {
      const documentadas = suyas.filter((c) => (posiciones.get(c.slug) ?? []).length > 0);
      if (documentadas.length < 2) continue;
      const delLibro = slugs(ordenDelLibro(suyas, posiciones));
      const porSlug = slugs([...suyas].sort((a, b) => a.slug.localeCompare(b.slug, 'es')));
      expect(new Set(delLibro)).toEqual(new Set(porSlug));
      if (delLibro.join() !== porSlug.join()) distintas += 1;
    }
    expect(distintas).toBeGreaterThan(0);
  });

  it('ningún frontmatter de Cita guarda una posición (AD-23)', async () => {
    const ficheros = (await readdir(rutas.citas, { recursive: true })).filter((f) => f.endsWith('.md'));
    expect(ficheros.length).toBe(citas.length);
    for (const fichero of ficheros) {
      const datos = separarFrontmatter(await readFile(join(rutas.citas, fichero), 'utf8')) ?? {};
      for (const campo of ['posicion', 'posiciones', 'apariciones']) {
        expect(Object.keys(datos), fichero).not.toContain(campo);
      }
    }
  });
});

describe('24.1 — las dependencias que la historia prohíbe', () => {
  /** El código sin comentarios de bloque ni de línea (los `//` de una URL se respetan). */
  const sinComentarios = (codigo: string) =>
    codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

  /** Lo que un fichero importa: estático, `export … from` e `import()`. */
  const IMPORTA = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"`]([^'"`]+)['"`]/g;
  const importados = (codigo: string) => [...sinComentarios(codigo).matchAll(IMPORTA)].map((m) => m[1]);

  it('el detector ve las tres formas', () => {
    expect(importados("import { a } from '../../tools/lib/x.ts';")).toEqual(['../../tools/lib/x.ts']);
    expect(importados("export { a } from '../../tools/lib/x.ts';")).toEqual(['../../tools/lib/x.ts']);
    expect(importados("const m = await import('../../tools/lib/x.ts');")).toEqual(['../../tools/lib/x.ts']);
    expect(importados("// import { a } from '../../tools/lib/x.ts';")).toEqual([]);
  });

  it('ningún fichero de src/ —src/lib/ incluido— importa de tools/lib/, salvo el cargador de content.config.ts', async () => {
    const directorio = join(RAIZ_DEL_REPO, 'src');
    const ficheros = (await readdir(directorio, { recursive: true })).filter((f) => /\.(ts|js|mjs|astro)$/.test(f));
    expect(ficheros).toContain(join('lib', 'obras.ts'));
    expect(ficheros.some((f) => f.startsWith(join('pages', 'obra')))).toBe(true);
    const infractores: string[] = [];
    for (const fichero of ficheros) {
      if (fichero === 'content.config.ts') continue;
      const codigo = await readFile(join(directorio, fichero), 'utf8');
      for (const ruta of importados(codigo)) if (/(^|\/)tools\//.test(ruta)) infractores.push(`${fichero} → ${ruta}`);
    }
    expect(infractores).toEqual([]);
  });

  it('content.config.ts toma `z` de astro/zod y de tools/lib/ importa solo posiciones.ts', async () => {
    const codigo = sinComentarios(await readFile(join(RAIZ_DEL_REPO, 'src', 'content.config.ts'), 'utf8'));
    expect(codigo).not.toMatch(/import\s*\{[^}]*\bz\b[^}]*\}\s*from\s*['"]astro:content['"]/);
    expect(codigo).toMatch(/import\s*\{\s*z\s*\}\s*from\s*['"]astro\/zod['"]/);
    expect(importados(codigo).filter((r) => /(^|\/)tools\//.test(r))).toEqual(['../tools/lib/posiciones.ts']);
  });

  it('tools/lib/posiciones.ts localiza solo con `localizar` y lee con los lectores del cotejo', async () => {
    const codigo = sinComentarios(await readFile(join(RAIZ_DEL_REPO, 'tools', 'lib', 'posiciones.ts'), 'utf8'));
    const prohibidos = ['indexOf', 'IndexOf', 'includes(', 'search(', 'match(', 'startsWith(', 'endsWith(', '.test(', '.exec('];
    for (const prohibido of prohibidos) expect(codigo, prohibido).not.toContain(prohibido);
    const deCorpus = /import\s*\{([^}]*)\}\s*from\s*'\.\/corpus\.ts'/.exec(codigo)?.[1] ?? '';
    const deCotejo = /import\s*\{([^}]*)\}\s*from\s*'\.\/cotejo\.ts'/.exec(codigo)?.[1] ?? '';
    // De `corpus.ts`, solo los lectores: ninguna de sus funciones que escriben en `corpus/`.
    const nombres = (lista: string) => lista.split(',').map((n) => n.trim()).filter((n) => n !== '').sort();
    expect(nombres(deCorpus)).toEqual(['leerCitas', 'leerDocumentosDeFuente', 'rutasDelCorpus']);
    for (const nombre of ['documentosDeCita', 'localizar']) expect(deCotejo).toMatch(new RegExp(`\\b${nombre}\\b`));
    // Y nada del sistema de ficheros por su cuenta: todo lo que importa es de `./`.
    expect(importados(codigo).filter((r) => !r.startsWith('./') && !r.startsWith('../../src/lib/'))).toEqual([]);
  });
});
