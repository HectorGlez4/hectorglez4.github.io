import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  colgarObras,
  compararDocumentos,
  compararEnElLibro,
  ordenDelLibro,
  type AparicionDeCita,
  type IndicesDeObras,
  type PosicionesDeCitas,
} from '../../src/lib/obras.ts';
import {
  guardarPosiciones,
  leerPosicionesDelCorpus,
  posicionesDeCitas,
  releerAlCambiar,
  type CitaParaSituar,
  type VigilanteDeFicheros,
} from '../../tools/lib/posiciones.ts';
import { citasDeLasObras, type ConjuntoPublicable } from '../../src/lib/publicado.ts';
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
  leerOrdenDeLosIndices,
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

/** Sin ningún índice de subpáginas capturado: el orden natural de la 24.1 (Historia 24.9). */
const SIN_INDICES: IndicesDeObras = new Map();

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
  /*
   * Los nombres que pasan por `real` son documentos de `corpus/fuentes/`, y la última prueba del
   * bloque comprueba que existen: si se retira o se renombra uno, la prueba lo dice en vez de
   * seguir afirmando «con slugs reales» sobre nombres que ya no lo son. Los demás se declaran
   * construidos donde se usan.
   */
  const reales: string[] = [];
  const real = (nombres: string[]) => {
    reales.push(...nombres);
    return nombres;
  };

  const ciudad = real(
    ['proemio', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi'].map(
      (p) => `wikisource-es--la-ciudad-de-dios--la-ciudad-de-dios-${p}`,
    ),
  );
  const dafnis = real(['proemio', 'i', 'ii', 'iii', 'iv'].map((p) => `wikisource-es--dafnis-y-cloe--dafnis-y-cloe-longo-${p}`));
  const zarco = real(
    ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'].map(
      (r) => `wikisource-es--el-zarco--el-zarco-capitulo-${r}`,
    ),
  );
  const lucanor = real([1, 2, 10, 19].map((n) => `wikisource-es--conde-lucanor--conde-lucanor-ejemplo-${n}`));
  const etica = real([2, 10].map((n) => `wikisource-es--etica-a-nicomaco--etica-a-nicomaco-libro-${n}`));
  const oraculo = real(
    ['1-25', '26-50', '101-125'].map(
      (a) => `wikisource-es--oraculo-manual-y-arte-de-prudencia--oraculo-manual-y-arte-de-prudencia-aforismos-${a}`,
    ),
  );
  const plenitud = real(
    ['iii-la-mujer', 'iv-enciende-tu-lampara', 'ix-todos-tenemos-hambre', 'l-las-preguntas', 'li-tu-cuerpo', 'lv-incomprension'].map(
      (p) => `wikisource-es--plenitud--plenitud-${p}`,
    ),
  );
  const ariel = real(['i', 'ii', 'iii', 'viii'].map((r) => `wikisource-es--ariel--ariel-capitulo-${r}`));
  const novelas = 'wikisource-es--novelas-ejemplares';
  const [novelasCorto, celoso, gitanilla, coloquio] = real([
    novelas,
    `${novelas}--el-celoso-extremeno-1825`,
    `${novelas}--la-gitanilla-1825`,
    `${novelas}--el-coloquio-de-los-perros-1825`,
  ]);
  const recuerdos = 'wikisource-es--recuerdos-de-provincia--recuerdos-de-provincia';
  const [notasDelAutor, miEducacion] = real([`${recuerdos}-notas-del-autor`, `${recuerdos}-mi-educacion`]);
  const zalamea = 'wikisource-es--el-alcalde-de-zalamea--el-alcalde-de-zalamea-jornada';
  const jornadas = real(['primera', 'segunda', 'tercera'].map((o) => `${zalamea}-${o}`));

  it('La ciudad de Dios: «proemio» antes que «i», y los romanos por su valor', () => {
    expect(natural([...ciudad].reverse())).toEqual(ciudad);
    expect(natural([...ciudad].sort())).toEqual(ciudad);
  });

  it('Dafnis y Cloe: el proemio también va delante', () => {
    expect(natural([...dafnis].sort())).toEqual(dafnis);
  });

  it('El Zarco: capítulo i a xx, con ix antes que x y xix antes que xx', () => {
    expect(natural([...zarco].sort())).toEqual(zarco);
  });

  it('El conde Lucanor: ejemplo 1, 2, 10, 19 —por valor, no por cadena—', () => {
    expect(natural([...lucanor].sort())).toEqual(lucanor);
  });

  it('Ética a Nicómaco: el libro 2 antes que el 10', () => {
    expect(natural([...etica].reverse())).toEqual(etica);
  });

  it('Oráculo manual: aforismos 1-25, 26-50, 101-125', () => {
    expect(natural([...oraculo].sort())).toEqual(oraculo);
    expect(natural([...oraculo].reverse())).toEqual(oraculo);
  });

  it('Plenitud: iii, iv, ix, l, li, lv —el romano manda aunque siga una palabra—', () => {
    expect(natural([...plenitud].sort())).toEqual(plenitud);
  });

  it('Ariel: capítulo i, ii, iii, viii', () => {
    expect(natural([...ariel].reverse())).toEqual(ariel);
    expect(natural([...ariel].sort())).toEqual(ariel);
  });

  it('Novelas ejemplares: el documento corto antes que sus páginas', () => {
    const enOrden = [novelasCorto, celoso, gitanilla];
    expect(natural([...enOrden].reverse())).toEqual(enOrden);
  });

  /*
   * Los límites que la historia acepta hasta que se capture el índice de subpáginas de la
   * Fuente. Se fijan tal y como son hoy para que, cuando ese índice los corrija, esta prueba
   * diga que el comportamiento cambió.
   */
  it('límites aceptados: páginas con nombre de capítulo, «mi», el final del libro, ordinales escritos y cifra con letra', () => {
    // Por título, alfabético: El coloquio de los perros —la última del libro— va antes que La gitanilla.
    expect(natural([gitanilla, coloquio])).toEqual([coloquio, gitanilla]);
    // «mi» se lee 1001, y «notas» es palabra: las notas del autor van antes que «Mi educación».
    expect(natural([miEducacion, notasDelAutor])).toEqual([notasDelAutor, miEducacion]);
    expect(compararDocumentos('x-mi', 'x-ii')).toBeGreaterThan(0);
    // El final del libro, como palabra, va antes que el capítulo i. Construido: hoy ninguna
    // página «epilogo» tiene capítulos hermanos en el Corpus.
    expect(compararDocumentos('wikisource-es--plenitud--plenitud-epilogo', plenitud[0])).toBeLessThan(0);
    // Los ordinales escritos son palabras: «primera, segunda, tercera» sale bien por casualidad,
    // y una «cuarta» —construida: la obra tiene tres jornadas— iría la primera.
    expect(natural([...jornadas].reverse())).toEqual(jornadas);
    expect(compararDocumentos(`${zalamea}-cuarta`, jornadas[0])).toBeLessThan(0);
    // Cifra con letra es palabra (construido): «10a» antes que «1o», y los dos antes que cualquier número.
    expect(natural(['x-1', 'x-1o', 'x-10a'])).toEqual(['x-10a', 'x-1o', 'x-1']);
  });

  it('es un orden total: cero solo consigo mismo, antisimétrico y transitivo', () => {
    const nombres = ['a-1', 'a-01', 'a-i', 'a-proemio', 'a', 'a--b', 'a-x', 'a-10', 'a-mi', 'a-10a', 'a-ii-b', ...ariel, ...oraculo, novelasCorto, coloquio];
    const signo = (x: string, y: string) => Math.sign(compararDocumentos(x, y));
    for (const x of nombres) {
      expect(compararDocumentos(x, x)).toBe(0);
      for (const y of nombres) {
        if (x === y) continue;
        expect(signo(x, y), `${x} / ${y}`).not.toBe(0);
        expect(signo(x, y)).toBe(-signo(y, x));
        for (const z of nombres) {
          if (signo(x, y) < 0 && signo(y, z) < 0) expect(signo(x, z), `${x} < ${y} < ${z}`).toBe(-1);
        }
      }
    }
    // A igual valor, decide la cadena: «01» antes que «1», y «1» antes que «i».
    expect(natural(['a-i', 'a-1', 'a-01'])).toEqual(['a-01', 'a-1', 'a-i']);
  });

  it('los nombres «reales» de estas pruebas existen en corpus/fuentes/', async () => {
    const enDisco = new Set(await readdir(join(RAIZ_DEL_REPO, 'corpus', 'fuentes')));
    expect(reales.length).toBeGreaterThan(50);
    expect(reales.filter((nombre) => !enDisco.has(`${nombre}.txt`))).toEqual([]);
  });
});

describe('24.1 — ordenDelLibro: la matriz de la historia', () => {
  it('un documento: por posición, no por slug', () => {
    const posiciones = new Map([
      ['a', [en('ws--obra', 30)]],
      ['b', [en('ws--obra', 10)]],
    ]);
    expect(slugs(ordenDelLibro([cita('a', 'ws'), cita('b', 'ws')], posiciones, SIN_INDICES))).toEqual(['b', 'a']);
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
    expect(slugs(ordenDelLibro(citas, tres, SIN_INDICES))).toEqual(['w3', 'w2', 'w1', 'g1', 'g2']);

    // Con 2 y 2, `gutenberg` < `wikisource-es` por unidades de código.
    const dos = new Map([...tres].filter(([slug]) => slug !== 'w3'));
    expect(slugs(ordenDelLibro(citas.filter((c) => c.slug !== 'w3'), dos, SIN_INDICES))).toEqual(['g1', 'g2', 'w2', 'w1']);
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
    expect(slugs(ordenDelLibro(citas, posiciones, SIN_INDICES))).toEqual(['c-corto', 'c-proemio', 'c-i', 'c-ii', 'c-ix', 'c-x']);

    // Y los números, por valor: el libro 2 antes que el 10.
    const libros = new Map([
      ['diez', [en('ws--etica--etica-libro-10', 0)]],
      ['dos', [en('ws--etica--etica-libro-2', 50)]],
    ]);
    expect(slugs(ordenDelLibro([cita('diez', 'ws'), cita('dos', 'ws')], libros, SIN_INDICES))).toEqual(['dos', 'diez']);
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
    expect(slugs(ordenDelLibro(citas, posiciones, SIN_INDICES))).toEqual(['d', 'c', 'e', 'f']);
  });

  it('empate en documento y posición: decide el slug', () => {
    const posiciones = new Map([
      ['zeta', [en('ws--obra', 7)]],
      ['alfa', [en('ws--obra', 7)]],
    ]);
    expect(slugs(ordenDelLibro([cita('zeta', 'ws'), cita('alfa', 'ws')], posiciones, SIN_INDICES))).toEqual(['alfa', 'zeta']);
  });

  it('sin documento: sin Fuente, o con posiciones vacías o ausentes, al final y por slug', () => {
    const posiciones = new Map<string, AparicionDeCita[]>([
      ['situada', [en('ws--obra', 900)]],
      ['vacia', []],
      // Con apariciones pero sin Fuente: no se sitúa —la Fuente es la primera clave—.
      ['sin-fuente', [en('ws--obra', 0)]],
    ]);
    const citas = [cita('vacia', 'ws'), cita('sin-fuente'), cita('ausente', 'ws'), cita('situada', 'ws'), { slug: 'nula', fuente: null }];
    expect(slugs(ordenDelLibro(citas, posiciones, SIN_INDICES))).toEqual(['situada', 'ausente', 'nula', 'sin-fuente', 'vacia']);
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
      expect(slugs(ordenDelLibro(orden, posiciones, SIN_INDICES))).toEqual(esperado);
      expect(slugs(ordenDelLibro(orden, revuelto(posiciones), SIN_INDICES))).toEqual(esperado);
    }
  });

  it('no toca la entrada', () => {
    const citas = [cita('b', 'ws'), cita('a', 'ws')];
    const copia = structuredClone(citas);
    ordenDelLibro(citas, new Map([['b', [en('ws--o', 0)]], ['a', [en('ws--o', 1)]]]), SIN_INDICES);
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

/*
 * La relectura de `astro dev` del cargador `posiciones`: `content.config.ts` solo la cablea, y
 * lo que decide —qué cambio cuenta, cuándo se relee, que nunca haya dos a la vez y que un fallo
 * se diga sin tumbar nada— vive en `releerAlCambiar`, que se prueba aquí con un vigilante de
 * mentira y el reloj de Vitest.
 */
describe('24.1 — releerAlCambiar: la relectura de desarrollo', () => {
  const CITAS = '/p/corpus/citas';
  const FUENTES = '/p/corpus/fuentes';

  /** Un vigilante que guarda lo que se le pide y deja disparar los eventos a mano. */
  function vigilante() {
    const oyentes = new Map<string, ((ruta: string) => void)[]>();
    const anadidas: string[] = [];
    const v: VigilanteDeFicheros & { emitir: (evento: string, ruta: string) => void; anadidas: string[] } = {
      anadidas,
      add: (ruta: string) => anadidas.push(ruta),
      on: (evento, oyente) => oyentes.set(evento, [...(oyentes.get(evento) ?? []), oyente]),
      emitir: (evento, ruta) => {
        for (const oyente of oyentes.get(evento) ?? []) oyente(ruta);
      },
    };
    return v;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  function montar(releer: () => Promise<void>) {
    vi.useFakeTimers();
    const v = vigilante();
    const avisos: string[] = [];
    const { terminado } = releerAlCambiar({
      vigilante: v,
      carpetas: [CITAS, FUENTES],
      releer,
      esperaMs: 250,
      avisar: (mensaje) => avisos.push(mensaje),
    });
    return { v, avisos, terminado };
  }

  it('vigila las dos carpetas, y una ráfaga de cambios es una sola relectura tras la espera', async () => {
    const releer = vi.fn(async () => {});
    const { v, terminado } = montar(releer);
    expect(v.anadidas).toEqual([CITAS, FUENTES]);
    v.emitir('change', `${CITAS}/a.md`);
    await vi.advanceTimersByTimeAsync(200);
    v.emitir('add', `${CITAS}/b.md`);
    v.emitir('unlink', `${FUENTES}/ws--obra.txt`);
    v.emitir('change', `${FUENTES}/ws--obra--obra-ii.txt`);
    await vi.advanceTimersByTimeAsync(249);
    expect(releer).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await terminado();
    expect(releer).toHaveBeenCalledTimes(1);
  });

  it('un cambio fuera de las carpetas no relee, tampoco una carpeta que solo comparte el prefijo', async () => {
    const releer = vi.fn(async () => {});
    const { v, terminado } = montar(releer);
    for (const ruta of ['/p/corpus/autores/x.yml', '/p/corpus/citas-borrador/x.md', '/p/corpus/fuentes.bak', '/p/src/x.ts']) {
      v.emitir('change', ruta);
    }
    await vi.advanceTimersByTimeAsync(1_000);
    await terminado();
    expect(releer).not.toHaveBeenCalled();
    // La carpeta misma sí cuenta: se borra o se crea entera.
    v.emitir('unlink', CITAS);
    await vi.advanceTimersByTimeAsync(250);
    await terminado();
    expect(releer).toHaveBeenCalledTimes(1);
  });

  it('nunca hay dos a la vez: la que llega mientras otra lee espera a que acabe', async () => {
    let enMarcha = 0;
    let maximo = 0;
    const lentas: (() => void)[] = [];
    const releer = vi.fn(
      () =>
        new Promise<void>((resolver) => {
          enMarcha += 1;
          maximo = Math.max(maximo, enMarcha);
          lentas.push(() => {
            enMarcha -= 1;
            resolver();
          });
        }),
    );
    const { v, terminado } = montar(releer);
    v.emitir('change', `${CITAS}/a.md`);
    await vi.advanceTimersByTimeAsync(250);
    expect(releer).toHaveBeenCalledTimes(1);
    v.emitir('change', `${CITAS}/b.md`);
    await vi.advanceTimersByTimeAsync(250);
    // La segunda está programada, pero no empieza hasta que la primera termina.
    expect(releer).toHaveBeenCalledTimes(1);
    lentas.shift()?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(releer).toHaveBeenCalledTimes(2);
    lentas.shift()?.();
    await terminado();
    expect(maximo).toBe(1);
  });

  it('una relectura que falla se dice, no deja ninguna promesa rechazada y no impide la siguiente', async () => {
    const rechazadas: unknown[] = [];
    const alRechazar = (motivo: unknown) => rechazadas.push(motivo);
    process.on('unhandledRejection', alRechazar);
    try {
      const releer = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error('corpus/citas/a.md no tiene un frontmatter YAML válido'))
        .mockResolvedValue(undefined);
      const { v, avisos, terminado } = montar(releer);
      v.emitir('change', `${CITAS}/a.md`);
      await vi.advanceTimersByTimeAsync(250);
      await terminado();
      expect(avisos).toEqual([
        'No se pudieron volver a situar las Citas: corpus/citas/a.md no tiene un frontmatter YAML válido',
      ]);
      v.emitir('change', `${CITAS}/a.md`);
      await vi.advanceTimersByTimeAsync(250);
      await terminado();
      expect(releer).toHaveBeenCalledTimes(2);
      expect(avisos).toHaveLength(1);
      vi.useRealTimers();
      await new Promise((resolver) => setTimeout(resolver, 0));
      expect(rechazadas).toEqual([]);
    } finally {
      process.off('unhandledRejection', alRechazar);
    }
  });
});

describe('24.1 — guardarPosiciones: el almacén cambia de un golpe o no cambia', () => {
  /** Un almacén de mentira que anota cada operación. */
  function almacen(inicial: Record<string, unknown>) {
    const datos = new Map(Object.entries(inicial));
    const operaciones: string[] = [];
    return {
      datos,
      operaciones,
      clear: () => {
        operaciones.push('clear');
        datos.clear();
      },
      set: (entrada: { id: string; data: Record<string, unknown> }) => {
        operaciones.push(`set ${entrada.id}`);
        datos.set(entrada.id, entrada.data);
      },
    };
  }
  const leidas = new Map<string, AparicionDeCita[]>([
    ['a', [en('ws--obra', 3)]],
    ['b', []],
  ]);

  it('lee y analiza todo antes de vaciar, y entonces vacía y llena sin esperar a nada', async () => {
    const destino = almacen({ vieja: { apariciones: [] } });
    const analizar = vi.fn(async (entrada: { id: string; data: Record<string, unknown> }) => {
      destino.operaciones.push(`analizar ${entrada.id}`);
      return entrada.data;
    });
    await guardarPosiciones({ leer: async () => leidas, analizar, almacen: destino });
    expect(destino.operaciones).toEqual(['analizar a', 'analizar b', 'clear', 'set a', 'set b']);
    expect(Object.fromEntries(destino.datos)).toEqual({
      a: { apariciones: [{ documento: 'ws--obra', posicion: 3 }] },
      b: { apariciones: [] },
    });
  });

  it('si la lectura o el análisis fallan, el almacén se queda como estaba', async () => {
    const anterior = { vieja: { apariciones: [en('ws--obra', 1)] } };
    const destino = almacen(anterior);
    await expect(
      guardarPosiciones({ leer: async () => Promise.reject(new Error('frontmatter roto')), analizar: async (e) => e.data, almacen: destino }),
    ).rejects.toThrow('frontmatter roto');
    const analizar = async (entrada: { id: string; data: Record<string, unknown> }) => {
      if (entrada.id === 'b') throw new Error('esquema');
      return entrada.data;
    };
    await expect(guardarPosiciones({ leer: async () => leidas, analizar, almacen: destino })).rejects.toThrow('esquema');
    expect(destino.operaciones).toEqual([]);
    expect(Object.fromEntries(destino.datos)).toEqual(anterior);
  });
});

/*
 * La fachada de `publicado.ts` memoriza por conjunto, y lo que se memoriza es una promesa: si
 * la de un conjunto fallara y se quedara guardada, toda página posterior repetiría el fallo.
 * En Vitest `astro:content` no existe, así que la consulta falla de verdad.
 */
describe('24.1 — citasDeLasObras: un fallo no se memoriza', () => {
  it('mientras está en curso es la misma promesa; si falla, la siguiente vuelve a intentarlo', async () => {
    const conjunto = {
      citas: [{ slug: 'a', obra: { nombre: 'x--y' } }],
      autores: [],
      temas: [],
      colecciones: [],
    } as unknown as ConjuntoPublicable;
    const primera = citasDeLasObras(conjunto);
    expect(citasDeLasObras(conjunto)).toBe(primera);
    await expect(primera).rejects.toThrow();
    const segunda = citasDeLasObras(conjunto);
    expect(segunda).not.toBe(primera);
    await expect(segunda).rejects.toThrow();
  });

  it('sin ninguna Cita con Obra no consulta nada, y eso sí se memoriza', async () => {
    const conjunto = { citas: [{ slug: 'a' }], autores: [], temas: [], colecciones: [] } as unknown as ConjuntoPublicable;
    const primera = citasDeLasObras(conjunto);
    expect(await primera).toEqual(new Map());
    expect(citasDeLasObras(conjunto)).toBe(primera);
  });
});

describe('24.1 — el Corpus real, sin construir', () => {
  const rutas = rutasDelCorpus(join(RAIZ_DEL_REPO, 'corpus'));
  let citas: CitaEnCorpus[] = [];
  let documentos: DocumentosDeFuente = new Map();
  let posiciones: Map<string, AparicionDeCita[]> = new Map();
  let indices: IndicesDeObras = new Map();

  beforeAll(async () => {
    [citas, documentos, indices] = await Promise.all([
      leerCitas(rutas.citas),
      leerDocumentosDeFuente(rutas),
      leerOrdenDeLosIndices(rutas),
    ]);
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
    // Todas, y no por no mirar ninguna: un slug del censo sin Cita publicada rompe la
    // construcción, así que cada uno tiene su entrada. Con el censo vacío —la meta de la
    // Historia 11.4— no queda ninguna que mirar, y la prueba sigue en verde.
    expect(censo.filter((slug) => !posiciones.has(slug))).toEqual([]);
    for (const slug of censo) expect(posiciones.get(slug), slug).toEqual([]);
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
      const delLibro = slugs(ordenDelLibro(suyas, posiciones, indices));
      const porSlug = slugs([...suyas].sort((a, b) => a.slug.localeCompare(b.slug, 'es')));
      expect(new Set(delLibro)).toEqual(new Set(porSlug));
      if (delLibro.join() !== porSlug.join()) distintas += 1;
    }
    expect(distintas).toBeGreaterThan(0);
  });

  /*
   * La anterior dice que el orden **cambia**; esta, que lo que sale **es** el del libro, sin usar
   * `ordenDelLibro` de oráculo: en cada Obra real, las Citas situadas van delante, cada Fuente
   * junta y por recuento, y dentro de una Fuente el documento de cada Cita —el primero de los
   * suyos— y su posición nunca retroceden; las sueltas, detrás y por slug.
   */
  it('en cada Obra real, documento y posición nunca retroceden dentro de una Fuente', async () => {
    const fichas = await leerFichasDeObra(rutas);
    const porObra = new Map<string, CitaEnCorpus[]>();
    for (const c of colgarObras(citas, fichas)) {
      if (c.obra === undefined) continue;
      porObra.set(c.obra.nombre, [...(porObra.get(c.obra.nombre) ?? []), c]);
    }
    const primera = (slug: string) =>
      [...(posiciones.get(slug) ?? [])].sort((a, b) => compararEnElLibro(a.documento, b.documento, indices) || a.posicion - b.posicion)[0];
    const fallos: string[] = [];
    let comparadas = 0;
    for (const [obra, suyas] of porObra) {
      const enOrden = ordenDelLibro(suyas, posiciones, indices);
      const situada = (c: CitaEnCorpus) => typeof c.fuente?.id === 'string' && primera(c.slug) !== undefined;
      const nSituadas = enOrden.filter(situada).length;
      if (enOrden.slice(0, nSituadas).some((c) => !situada(c))) fallos.push(`${obra}: una suelta entre las situadas`);
      const sueltas = slugs(enOrden.slice(nSituadas));
      if (sueltas.join() !== [...sueltas].sort((a, b) => a.localeCompare(b, 'es') || (a < b ? -1 : 1)).join()) {
        fallos.push(`${obra}: las sueltas no van por slug`);
      }
      const situadas = enOrden.slice(0, nSituadas);
      const recuento = new Map<string, number>();
      for (const c of situadas) recuento.set(c.fuente!.id, (recuento.get(c.fuente!.id) ?? 0) + 1);
      const fuentes = situadas.map((c) => c.fuente!.id).filter((f, i, todas) => i === 0 || todas[i - 1] !== f);
      if (new Set(fuentes).size !== fuentes.length) fallos.push(`${obra}: una Fuente partida`);
      for (let i = 1; i < fuentes.length; i += 1) {
        if (recuento.get(fuentes[i - 1])! < recuento.get(fuentes[i])!) fallos.push(`${obra}: Fuentes fuera de recuento`);
      }
      for (let i = 1; i < situadas.length; i += 1) {
        const [a, b] = [situadas[i - 1], situadas[i]];
        if (a.fuente!.id !== b.fuente!.id) continue;
        const [pa, pb] = [primera(a.slug), primera(b.slug)];
        const orden = compararEnElLibro(pa.documento, pb.documento, indices) || pa.posicion - pb.posicion;
        if (orden > 0) fallos.push(`${obra}: ${a.slug} (${pa.documento} ${pa.posicion}) antes que ${b.slug} (${pb.documento} ${pb.posicion})`);
        comparadas += 1;
      }
    }
    expect(fallos).toEqual([]);
    expect(comparadas).toBeGreaterThan(1000);
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
  /**
   * El código sin comentarios de bloque ni de línea. Recorre el texto respetando las cadenas
   * —entre comillas simples, dobles o invertidas— y las expresiones regulares literales, así que
   * un `'corpus/**' + '/*.md'`, el `//` de una URL o un `/['"]/` no abren, cortan ni esconden
   * nada. Una regex se reconoce como lo hace el analizador: una `/` donde no puede ir una
   * división, tras un signo de puntuación o una palabra como `return`. No sigue las plantillas
   * anidadas dentro de `${…}`.
   */
  function sinComentarios(codigo: string): string {
    let salida = '';
    let i = 0;
    const puedeEmpezarRegex = () => {
      const previo = salida.slice(-12).trimEnd();
      return previo === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(previo) || /\b(?:return|typeof|case|in|of|void|yield|await)$/.test(previo);
    };
    while (i < codigo.length) {
      const c = codigo[i];
      const siguiente = codigo[i + 1];
      if (c === '/' && siguiente === '*') {
        const fin = codigo.indexOf('*/', i + 2);
        i = fin === -1 ? codigo.length : fin + 2;
        continue;
      }
      if (c === '/' && siguiente === '/') {
        while (i < codigo.length && codigo[i] !== '\n') i += 1;
        continue;
      }
      let fin = -1;
      if (c === "'" || c === '"' || c === '`') {
        fin = i + 1;
        while (fin < codigo.length && codigo[fin] !== c) fin += codigo[fin] === '\\' ? 2 : 1;
      } else if (c === '/' && puedeEmpezarRegex()) {
        let enClase = false;
        fin = i + 1;
        while (fin < codigo.length && codigo[fin] !== '\n') {
          const d = codigo[fin];
          if (d === '\\') {
            fin += 2;
            continue;
          }
          if (d === '[') enClase = true;
          else if (d === ']') enClase = false;
          else if (d === '/' && !enClase) break;
          fin += 1;
        }
      }
      if (fin !== -1) {
        salida += codigo.slice(i, fin + 1);
        i = fin + 1;
        continue;
      }
      salida += c;
      i += 1;
    }
    return salida;
  }

  /** Lo que un fichero importa: estático, `export … from`, `import()`, `import.meta.glob()` y `require()`. */
  const IMPORTA =
    /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bimport\.meta\.glob(?:Eager)?\s*\(\s*\[?\s*|\brequire\s*\(\s*)['"`]([^'"`]+)['"`]/g;
  const importados = (codigo: string) => [...sinComentarios(codigo).matchAll(IMPORTA)].map((m) => m[1]);

  it('el detector ve todas las formas, y las cadenas no lo engañan', () => {
    const x = '../../tools/lib/x.ts';
    expect(importados(`import { a } from '${x}';`)).toEqual([x]);
    expect(importados(`export { a } from '${x}';`)).toEqual([x]);
    expect(importados(`const m = await import('${x}');`)).toEqual([x]);
    expect(importados(`const m = import.meta.glob('${x}');`)).toEqual([x]);
    expect(importados(`const m = import.meta.glob(['${x}']);`)).toEqual([x]);
    expect(importados(`const m = require('${x}');`)).toEqual([x]);
    expect(importados(`// import { a } from '${x}';`)).toEqual([]);
    expect(importados(`/* import { a } from '${x}'; */`)).toEqual([]);
    // Un patrón de glob dentro de una cadena no abre un comentario que se trague lo de después…
    expect(importados(`const p = 'corpus/**/*.md';\nconst m = await import('${x}');`)).toEqual([x]);
    // …ni una URL dentro de una cadena corta la línea.
    expect(importados(`const u = 'https://x.org'; const m = await import('${x}');`)).toEqual([x]);
    expect(importados(`const u = "a // b"; import('${x}');`)).toEqual([x]);
    // …ni una regex con comillas o con barras esconde lo que viene detrás.
    expect(importados(`const r = /['"]/g;\nconst m = await import('${x}');`)).toEqual([x]);
    expect(importados(`const r = s.replace(/\\/\\//g, '');\nimport('${x}');`)).toEqual([x]);
    // Y una división no es una regex.
    expect(importados(`const r = a / b; const t = c / d;\nimport('${x}');`)).toEqual([x]);
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

  it('el único localizador: el `indexOf` de cotejo.ts está en `localizar`, y `apareceEnDocumento` lo usa', async () => {
    const codigo = sinComentarios(await readFile(join(RAIZ_DEL_REPO, 'tools', 'lib', 'cotejo.ts'), 'utf8'));
    const cuerpoDe = (nombre: string) =>
      new RegExp(`export function ${nombre}\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(codigo)?.[1] ?? '';
    expect(codigo.match(/indexOf\(/g) ?? []).toHaveLength(1);
    expect(cuerpoDe('localizar')).toMatch(/cuerpo\.indexOf\(buscado\)/);
    expect(cuerpoDe('apareceEnDocumento').trim()).toBe(
      'return localizar(colapsarEspacios(texto), colapsarEspacios(cuerpo)) !== -1;',
    );
  });

  it('tools/lib/posiciones.ts localiza solo con `localizar` y lee con los lectores del cotejo', async () => {
    const codigo = sinComentarios(await readFile(join(RAIZ_DEL_REPO, 'tools', 'lib', 'posiciones.ts'), 'utf8'));
    const prohibidos = ['indexOf', 'IndexOf', 'includes(', 'search(', 'match(', 'startsWith(', 'endsWith(', '.test(', '.exec('];
    for (const prohibido of prohibidos) expect(codigo, prohibido).not.toContain(prohibido);
    const deCorpus = /import\s*\{([^}]*)\}\s*from\s*'\.\/corpus\.ts'/.exec(codigo)?.[1] ?? '';
    const deCotejo = /import\s*\{([^}]*)\}\s*from\s*'\.\/cotejo\.ts'/.exec(codigo)?.[1] ?? '';
    // De `corpus.ts`, solo los lectores: ninguna de sus funciones que escriben en `corpus/`.
    const nombres = (lista: string) => lista.split(',').map((n) => n.trim()).filter((n) => n !== '').sort();
    expect(nombres(deCorpus)).toEqual(['leerCitas', 'leerDocumentosDeFuente', 'leerOrdenDeLosIndices', 'rutasDelCorpus']);
    for (const nombre of ['documentosDeCita', 'localizar']) expect(deCotejo).toMatch(new RegExp(`\\b${nombre}\\b`));
    // Y nada del sistema de ficheros por su cuenta: todo lo que importa es de `./`.
    expect(importados(codigo).filter((r) => !r.startsWith('./') && !r.startsWith('../../src/lib/'))).toEqual([]);
  });
});

/**
 * Historia 24.9 — el orden del libro lo declara la Fuente: con el índice de subpáginas
 * capturado, los documentos de una Obra van en su orden; sin él, rige el natural de la 24.1.
 */
describe('24.9 — compararEnElLibro: el índice manda sobre el orden natural', () => {
  const obra = 'wikisource-es--novelas-ejemplares';
  const gitanilla = `${obra}--la-gitanilla-1825`;
  const coloquio = `${obra}--el-coloquio-de-los-perros-1825`;
  const cornelia = `${obra}--la-senora-cornelia`;
  const fregona = `${obra}--la-ilustre-fregona-1825`;
  const indices: IndicesDeObras = new Map([[obra, [obra, gitanilla, fregona, coloquio]]]);

  it('con índice, su orden; sin índice, el natural', () => {
    expect(compararEnElLibro(gitanilla, coloquio, indices)).toBeLessThan(0);
    expect(compararEnElLibro(gitanilla, coloquio, SIN_INDICES)).toBeGreaterThan(0);
    expect(Math.sign(compararEnElLibro(gitanilla, coloquio, SIN_INDICES))).toBe(Math.sign(compararDocumentos(gitanilla, coloquio)));
  });

  it('lo que el índice no enlaza va detrás, en orden natural', () => {
    const otro = `${obra}--a-otra-pagina`;
    expect([cornelia, coloquio, otro, gitanilla, obra].sort((a, b) => compararEnElLibro(a, b, indices))).toEqual([
      obra,
      gitanilla,
      coloquio,
      otro,
      cornelia,
    ]);
  });

  it('el índice de una Obra no toca los documentos de otra', () => {
    const ajenos = ['wikisource-es--vidas-paralelas--vidas-paralelas-pericles', 'wikisource-es--vidas-paralelas--vidas-paralelas-ciceron'];
    expect([...ajenos].sort((a, b) => compararEnElLibro(a, b, indices))).toEqual(natural(ajenos));
  });

  it('es un orden total: cero solo consigo mismo, antisimétrico y transitivo', () => {
    const nombres = [
      obra, gitanilla, coloquio, cornelia, fregona, `${obra}--a-otra-pagina`,
      'wikisource-es--novelas-ejemplares-x', 'wikisource-es--novelas', 'gutenberg--novelas-ejemplares--i',
      'wikisource-es--la-ciudad-de-dios--la-ciudad-de-dios-ii', 'wikisource-es--la-ciudad-de-dios--la-ciudad-de-dios-proemio',
    ];
    const c = (a: string, b: string) => compararEnElLibro(a, b, indices);
    for (const a of nombres) {
      for (const b of nombres) {
        expect(c(a, b) === 0, `${a} ${b}`).toBe(a === b);
        expect(Math.sign(c(a, b)) + Math.sign(c(b, a)), `${a} ${b}`).toBe(0);
        for (const d of nombres) if (c(a, b) < 0 && c(b, d) < 0) expect(c(a, d), `${a} ${b} ${d}`).toBeLessThan(0);
      }
    }
  });
});

describe('24.9 — ordenDelLibro con el índice por parámetro', () => {
  const obra = 'ws--libro';
  const indices: IndicesDeObras = new Map([[obra, [`${obra}--b`, `${obra}--a`]]]);

  it('las Citas siguen el índice; lo demás de la regla de la 24.1 no cambia', () => {
    const posiciones: PosicionesDeCitas = new Map([
      ['en-a', [en(`${obra}--a`, 0)]],
      ['en-b-tarde', [en(`${obra}--b`, 90)]],
      ['en-b-pronto', [en(`${obra}--b`, 10)]],
      ['en-c', [en(`${obra}--c`, 0)]],
      // En dos documentos: toma el primero en el orden del índice, no en el natural.
      ['en-a-y-b', [en(`${obra}--a`, 1), en(`${obra}--b`, 50)]],
    ]);
    const citas = [cita('suelta'), cita('en-c', 'ws'), cita('en-a', 'ws'), cita('en-b-tarde', 'ws'), cita('en-a-y-b', 'ws'), cita('en-b-pronto', 'ws')];
    expect(slugs(ordenDelLibro(citas, posiciones, indices))).toEqual(['en-b-pronto', 'en-a-y-b', 'en-b-tarde', 'en-a', 'en-c', 'suelta']);
    expect(slugs(ordenDelLibro(citas, posiciones, SIN_INDICES))).toEqual(['en-a', 'en-a-y-b', 'en-b-pronto', 'en-b-tarde', 'en-c', 'suelta']);
    for (const orden of permutaciones(citas.slice(0, 4))) {
      expect(slugs(ordenDelLibro(orden, revuelto(posiciones), indices))).toEqual(slugs(ordenDelLibro(citas.slice(0, 4), posiciones, indices)));
    }
  });
});

describe('24.9 — las cuatro Obras del Corpus real, sin construir', () => {
  const rutas = rutasDelCorpus(join(RAIZ_DEL_REPO, 'corpus'));
  let porObra = new Map<string, CitaEnCorpus[]>();
  let posiciones: Map<string, AparicionDeCita[]> = new Map();
  let indices: IndicesDeObras = new Map();

  beforeAll(async () => {
    const [citas, documentos, fichas] = await Promise.all([
      leerCitas(rutas.citas),
      leerDocumentosDeFuente(rutas),
      leerFichasDeObra(rutas),
    ]);
    indices = await leerOrdenDeLosIndices(rutas);
    posiciones = posicionesDeCitas(citas, documentos);
    porObra = new Map();
    for (const c of colgarObras(citas, fichas)) {
      if (c.obra !== undefined) porObra.set(c.obra.nombre, [...(porObra.get(c.obra.nombre) ?? []), c]);
    }
  });

  /** Los documentos de las Citas de una Obra, en el orden en que salen, sin repetir seguidos. */
  const documentosEnOrden = (obra: string, conIndices: IndicesDeObras) =>
    ordenDelLibro(porObra.get(obra) ?? [], posiciones, conIndices)
      .map((c) => (posiciones.get(c.slug) ?? [])[0]?.documento.split('--').pop())
      .filter((d, i, todos): d is string => d !== undefined && d !== todos[i - 1]);

  it('las cuatro tienen su índice versionado, y cada uno ordena documentos suyos', () => {
    for (const obra of [
      'wikisource-es--novelas-ejemplares',
      'wikisource-es--vidas-paralelas',
      'wikisource-es--recuerdos-de-provincia',
      'wikisource-es--novelas-y-cuadros-de-la-vida-sur-americana',
    ]) {
      const suyos = indices.get(obra);
      expect(suyos, obra).toBeDefined();
      expect(suyos!.length, obra).toBeGreaterThan(1);
      expect(suyos!.every((d) => d === obra || d.startsWith(`${obra}--`)), obra).toBe(true);
    }
  });

  it('Novelas ejemplares: «la-gitanilla» antes que «el-coloquio-de-los-perros», que antes iba delante', () => {
    const obra = 'miguel-de-cervantes--novelas-ejemplares';
    expect(documentosEnOrden(obra, indices)).toEqual([
      'la-gitanilla-1825',
      'el-licenciado-vidriera-1825',
      'la-ilustre-fregona-1825',
      'el-coloquio-de-los-perros-1825',
    ]);
    expect(documentosEnOrden(obra, SIN_INDICES)[0]).toBe('el-coloquio-de-los-perros-1825');
  });

  it('Vidas paralelas: «pericles» antes que «ciceron», que antes iba delante', () => {
    const obra = 'plutarco--vidas-paralelas';
    expect(documentosEnOrden(obra, indices)).toEqual(['vidas-paralelas-pericles', 'vidas-paralelas-ciceron']);
    expect(documentosEnOrden(obra, SIN_INDICES)).toEqual(['vidas-paralelas-ciceron', 'vidas-paralelas-pericles']);
  });

  it('Recuerdos de provincia y Novelas y cuadros: en el orden de su índice, no en el de sus títulos', () => {
    for (const [obra, grupo] of [
      ['domingo-faustino-sarmiento--recuerdos-de-provincia', 'wikisource-es--recuerdos-de-provincia'],
      ['soledad-acosta-de-samper--novelas-y-cuadros-de-la-vida-sur-americana', 'wikisource-es--novelas-y-cuadros-de-la-vida-sur-americana'],
    ] as const) {
      const delIndice = (indices.get(grupo) ?? []).map((d) => d.split('--').pop());
      const enOrden = documentosEnOrden(obra, indices);
      expect(enOrden.length, obra).toBeGreaterThan(1);
      expect(enOrden, obra).toEqual([...enOrden].sort((a, b) => delIndice.indexOf(a) - delIndice.indexOf(b)));
      expect(enOrden.every((d) => delIndice.includes(d)), obra).toBe(true);
    }
    expect(documentosEnOrden('domingo-faustino-sarmiento--recuerdos-de-provincia', indices).slice(0, 3)).toEqual([
      'recuerdos-de-provincia-a-mis-compatriotas-solamente',
      'recuerdos-de-provincia-los-huarpes',
      'recuerdos-de-provincia-los-albarracines',
    ]);
  });
});
