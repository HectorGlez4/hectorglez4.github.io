import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { recorrerElementos } from './ayuda/enlaces.js';
import { tarjetasDelListado } from './ayuda/listado.js';
import { leerRutasDeSalida, navDeSalidas, type GrupoLeido } from './ayuda/rutas-de-salida.js';
import {
  citasDeLaMismaObra,
  citasRelacionadas,
  problemaDeRutasDeSalida,
  repartir,
  rutasDeSalidaDeCita,
  siguienteCita,
  type Cita,
  type RutasDeSalidaDeCita,
  type SiguienteCita,
  type Tema,
} from '../../src/lib/publicado.ts';
import { cierreDeLaMismaObra, cierreDeMasDelAutor } from '../../src/lib/atribucion.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import { MAX_CITAS_DE_LA_MISMA_OBRA, MAX_CITAS_RELACIONADAS } from '../../src/lib/umbrales.ts';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 24.6 — al pie, más de la misma obra y más del Autor (FR-12, UX-DR67–69, UX-DR101,
 * UX-DR108, UX-DR112).
 *
 * Dos partes, de la más barata a la más cara:
 *
 *   · **Sin construir**: el reparto (`repartir`), las dos elecciones (`citasDeLaMismaObra`,
 *     `citasRelacionadas`), la decisión entera (`rutasDeSalidaDeCita`) en cada fila de la matriz
 *     del spec, y los dos cierres.
 *   · **Dos construcciones** del mismo Corpus con dos jornadas: el pie de cada Página de Cita,
 *     leído de `dist/`, y que las dos dan el mismo `nav` byte a byte.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const FLECHA = '→';
const AVANCE = '›';

// ─── Sin construir ───────────────────────────────────────────────────────────

/** Una Cita mínima; la Obra, por su nombre de ficha (el título es el nombre, para leerlo). */
function cita(slug: string, autor: string, obra?: string, temas: string[] = ['el-tiempo']): Cita {
  return {
    slug,
    autor,
    texto: slug,
    temas,
    procedencia: {},
    aptaParaPortada: false,
    ...(obra !== undefined ? { obra: { nombre: obra, titulo: obra, recuento: 0 } as ObraResuelta } : {}),
  } as Cita;
}

/** El mapa de `citasDeLasObras`: las Citas de cada Obra, en el orden en que se dan (el del libro). */
function porObraDe(citas: readonly Cita[]): Map<string, Cita[]> {
  const mapa = new Map<string, Cita[]>();
  for (const c of citas) if (c.obra !== undefined) mapa.set(c.obra.nombre, [...(mapa.get(c.obra.nombre) ?? []), c]);
  return mapa;
}

/** El reparto de antes de la 24.6, escrito aparte: `repartir` tiene que dar lo mismo. */
function repartoDeAntes<T>(candidatas: readonly T[], maximo: number): T[] {
  if (candidatas.length <= maximo) return [...candidatas];
  const paso = (candidatas.length - 1) / (maximo - 1);
  return Array.from({ length: maximo }, (_, i) => candidatas[Math.round(i * paso)]);
}

const slugs = (citas: readonly Cita[]) => citas.map((c) => c.slug);
const TEMA: Tema = { slug: 'el-tiempo', nombre: 'El tiempo' };

describe('Historia 24.6 — `repartir`, el único reparto', () => {
  it('da lo mismo que el reparto de «Más de {Autor}» de antes, en sus casos', () => {
    for (const largo of [0, 1, 2, 3, 4, 5, 7, 12, 39, 40, 113]) {
      const lista = Array.from({ length: largo }, (_, i) => i);
      for (const maximo of [2, 3, 4]) expect(repartir(lista, maximo), `${largo}/${maximo}`).toEqual(repartoDeAntes(lista, maximo));
    }
  });

  it('conserva el orden de entrada e incluye la primera y la última', () => {
    const lista = ['h', 'a', 'z', 'b', 'y', 'c', 'x', 'd'];
    const salida = repartir(lista, 3);
    expect(salida).toEqual(['h', 'y', 'd']);
    expect(salida[0]).toBe(lista[0]);
    expect(salida.at(-1)).toBe(lista.at(-1));
    const posiciones = salida.map((x) => lista.indexOf(x));
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
  });

  it('con menos candidatas que el máximo las devuelve todas, en una lista nueva', () => {
    const lista = [1, 2];
    const salida = repartir(lista, 4);
    expect(salida).toEqual([1, 2]);
    expect(salida).not.toBe(lista);
  });

  it.each([0, 1, -3, 2.5])('lanza con un máximo de %s', (maximo) => {
    expect(() => repartir([1, 2, 3], maximo)).toThrow(/entero de 2 o más/);
  });
});

describe('Historia 24.6 — la matriz del spec, sin construir', () => {
  // Séneca: una Obra de 8 en el orden del libro A…H, 7 Citas más de otras Obras o sin Obra.
  const LIBRO = 'ABCDEFGH'.split('').map((l) => cita(`seneca-libro-${l.toLowerCase()}`, 'seneca', 'seneca--libro'));
  const OTRAS = [
    ...['a', 'b', 'c'].map((l) => cita(`seneca-cartas-${l}`, 'seneca', 'seneca--cartas')),
    ...['a', 'b'].map((l) => cita(`seneca-feliz-${l}`, 'seneca', 'seneca--feliz')),
    cita('seneca-ira-a', 'seneca', 'seneca--ira', []),
    cita('seneca-suelta', 'seneca'),
  ];
  const TODAS = [...LIBRO, ...OTRAS];
  const POR_OBRA = porObraDe(TODAS);
  const [A, B, C, D, , F, , H] = LIBRO;

  it('Obra de 8 — se lee C (siguiente D): A, F y H, en el orden del libro', () => {
    expect(slugs(citasDeLaMismaObra(C, POR_OBRA, D, MAX_CITAS_DE_LA_MISMA_OBRA))).toEqual(slugs([A, F, H]));
  });

  it('Obra de 3 — se lee A (siguiente B): C sola', () => {
    const tres = LIBRO.slice(0, 3);
    expect(slugs(citasDeLaMismaObra(A, porObraDe(tres), B, MAX_CITAS_DE_LA_MISMA_OBRA))).toEqual([C.slug]);
  });

  it('Obra de 2 y Cita sin Obra — sin «De la misma obra»', () => {
    const dos = LIBRO.slice(0, 2);
    const rutas = rutasDeSalidaDeCita(A, dos, porObraDe(dos), [TEMA], { por: 'obra', cita: B });
    expect(rutas.mismaObra).toBeUndefined();
    const suelta = OTRAS.at(-1)!;
    expect(citasDeLaMismaObra(suelta, POR_OBRA, undefined, MAX_CITAS_DE_LA_MISMA_OBRA)).toEqual([]);
    expect(rutasDeSalidaDeCita(suelta, TODAS, POR_OBRA, [TEMA], undefined).mismaObra).toBeUndefined();
  });

  it('Obra de 2 — «Siguiente» es siempre la otra, también desde la última del libro, así que no queda ninguna', () => {
    const dos = LIBRO.slice(0, 2);
    const porObra = porObraDe(dos);
    for (const leida of dos) {
      const siguiente = siguienteCita(leida, porObra, [TEMA], new Map());
      expect(siguiente?.cita.slug, leida.slug).toBe(dos.find((c) => c !== leida)!.slug);
      expect(rutasDeSalidaDeCita(leida, dos, porObra, [TEMA], siguiente).mismaObra, leida.slug).toBeUndefined();
    }
  });

  it('Más de, con Obra — Autor con 15, 8 de su Obra: 4 de las 7 de fuera, ninguna de su Obra, recuento 15', () => {
    const rutas = rutasDeSalidaDeCita(C, TODAS, POR_OBRA, [TEMA], { por: 'obra', cita: D });
    expect(rutas.delAutor?.recuento).toBe(15);
    expect(rutas.delAutor?.citas).toHaveLength(MAX_CITAS_RELACIONADAS);
    for (const otra of rutas.delAutor!.citas) {
      expect(slugs(OTRAS)).toContain(otra.slug);
      expect(otra.obra?.nombre).not.toBe('seneca--libro');
    }
    expect(rutas.mismaObra?.obra).toBe(C.obra);
    expect(slugs(rutas.mismaObra!.citas)).toEqual(slugs([A, F, H]));
  });

  it('Más de, sin Obra — elige entre todas las demás del Autor', () => {
    const suelta = OTRAS.at(-1)!;
    const candidatas = citasRelacionadas(TODAS, suelta, 100, undefined);
    expect(candidatas).toHaveLength(14);
    expect(slugs(candidatas)).toEqual(expect.arrayContaining(slugs(LIBRO)));
    expect(rutasDeSalidaDeCita(suelta, TODAS, POR_OBRA, [TEMA], undefined).delAutor?.citas).toHaveLength(4);
  });

  it('Autor de una sola Obra — sin «Más de {Autor}»', () => {
    const manual = Array.from({ length: 5 }, (_, i) => cita(`epicteto-manual-${i}`, 'epicteto', 'epicteto--manual'));
    const rutas = rutasDeSalidaDeCita(manual[0], [...manual, ...TODAS], porObraDe(manual), [TEMA], { por: 'obra', cita: manual[1] });
    expect(rutas.delAutor).toBeUndefined();
    expect(slugs(rutas.mismaObra!.citas)).toEqual(slugs(manual.slice(2)));
  });

  it('Sin Tema publicado — sin «Temas»', () => {
    const ira = OTRAS.find((c) => c.slug === 'seneca-ira-a')!;
    expect(rutasDeSalidaDeCita(ira, TODAS, POR_OBRA, [TEMA], undefined).temas).toEqual([]);
    expect(rutasDeSalidaDeCita(C, TODAS, POR_OBRA, [], { por: 'obra', cita: D }).temas).toEqual([]);
  });

  it('Ningún grupo — Autor de una Cita, Obra de 1, sin Tema', () => {
    const sola = cita('antonio-machado-sola', 'antonio-machado', 'antonio-machado--soledades', []);
    const rutas = rutasDeSalidaDeCita(sola, [sola, ...TODAS], porObraDe([sola]), [TEMA], undefined);
    expect(rutas).toEqual({ mismaObra: undefined, delAutor: undefined, temas: [] });
  });

  it('Siguiente por Tema, de otra Obra y otro Autor — no afecta a los grupos', () => {
    const sola = cita('seneca-sola', 'seneca', 'seneca--sola');
    const todas = [...TODAS, sola];
    const porObra = porObraDe(todas);
    const ajena = cita('epicteto-manual-0', 'epicteto', 'epicteto--manual');
    const conTema = rutasDeSalidaDeCita(sola, todas, porObra, [TEMA], { por: 'tema', cita: ajena, tema: TEMA });
    const sin = rutasDeSalidaDeCita(sola, todas, porObra, [TEMA], undefined);
    expect(conTema).toEqual(sin);
  });

  it('Grupo roto — la Cita no está en su grupo: lanza nombrando Cita y ficha', () => {
    const rota = new Map([['seneca--libro', LIBRO.filter((c) => c !== C)]]);
    expect(() => citasDeLaMismaObra(C, rota, D, 3)).toThrow(/«seneca-libro-c».*«seneca--libro»/);
    expect(() => citasDeLaMismaObra(C, new Map(), D, 3)).toThrow(/«seneca-libro-c».*«seneca--libro»/);
    expect(() => rutasDeSalidaDeCita(C, TODAS, new Map(), [TEMA], undefined)).toThrow(/«seneca-libro-c»/);
  });

  it('el resultado no depende del orden de `citas`, nunca trae la propia ni la siguiente, y los grupos son disjuntos', () => {
    const al_reves = [...TODAS].reverse();
    for (const propia of TODAS) {
      const grupo = propia.obra === undefined ? undefined : POR_OBRA.get(propia.obra.nombre)!;
      const i = grupo?.indexOf(propia) ?? -1;
      const siguiente: SiguienteCita | undefined =
        grupo !== undefined && grupo.length >= 2 ? { por: 'obra', cita: grupo[(i + 1) % grupo.length] } : undefined;
      const rutas = rutasDeSalidaDeCita(propia, TODAS, POR_OBRA, [TEMA], siguiente);
      expect(rutasDeSalidaDeCita(propia, al_reves, POR_OBRA, [TEMA], siguiente), propia.slug).toEqual(rutas);
      const elegidas = [...(rutas.mismaObra?.citas ?? []), ...(rutas.delAutor?.citas ?? [])].map((c) => c.slug);
      expect(elegidas, propia.slug).not.toContain(propia.slug);
      if (siguiente !== undefined) expect(elegidas, propia.slug).not.toContain(siguiente.cita.slug);
      expect(new Set(elegidas).size, propia.slug).toBe(elegidas.length);
      expect(elegidas.length, propia.slug).toBeLessThanOrEqual(MAX_CITAS_DE_LA_MISMA_OBRA + MAX_CITAS_RELACIONADAS);
    }
  });
});

describe('Historia 24.6 — `problemaDeRutasDeSalida`, lo que pararía la construcción', () => {
  const SENECA = { slug: 'seneca', nombre: 'Séneca' };
  const obra = (autor: string, recuento: number) =>
    ({ nombre: 'seneca--libro', autor, titulo: 'Libro', recuento, fuentes: [], edicionCotejada: false, temas: [] }) as ObraResuelta;
  const deLaObra = (n: number) => Array.from({ length: n }, (_, i) => cita(`seneca-libro-${i}`, 'seneca', 'seneca--libro'));
  const deOtras = (n: number) => Array.from({ length: n }, (_, i) => cita(`seneca-cartas-${i}`, 'seneca', 'seneca--cartas'));
  const bien = (): RutasDeSalidaDeCita => ({
    mismaObra: { obra: obra('seneca', 8), citas: deLaObra(3) },
    delAutor: { recuento: 15, citas: deOtras(4) },
    temas: [],
  });

  it('nada que objetar a un pie como los que da `rutasDeSalidaDeCita`', () => {
    expect(problemaDeRutasDeSalida(SENECA, bien())).toBeUndefined();
    expect(problemaDeRutasDeSalida(SENECA, { mismaObra: undefined, delAutor: undefined, temas: [TEMA] })).toBeUndefined();
  });

  it.each<[string, (r: RutasDeSalidaDeCita) => RutasDeSalidaDeCita, RegExp]>([
    ['un grupo de la Obra vacío', (r) => ({ ...r, mismaObra: { ...r.mismaObra!, citas: [] } }), /«De la misma obra» llega sin Citas/],
    ['un grupo del Autor vacío', (r) => ({ ...r, delAutor: { ...r.delAutor!, citas: [] } }), /«Más de Séneca» llega sin Citas/],
    ['la Obra de otro Autor', (r) => ({ ...r, mismaObra: { ...r.mismaObra!, obra: obra('epicteto', 8) } }), /de «epicteto» y no de «seneca»/],
    ['más tarjetas de la Obra de las que caben', (r) => ({ ...r, mismaObra: { ...r.mismaObra!, citas: deLaObra(4) } }), /lleva 4 Citas, y no caben más de 3/],
    ['más tarjetas del Autor de las que caben', (r) => ({ ...r, delAutor: { ...r.delAutor!, citas: deOtras(5) } }), /lleva 5 Citas, y no caben más de 4/],
    ['una Cita de otra Obra', (r) => ({ ...r, mismaObra: { ...r.mismaObra!, citas: deOtras(1) } }), /la Cita «seneca-cartas-0», que no es de la Obra «seneca--libro»/],
    ['una Cita de otro Autor', (r) => ({ ...r, delAutor: { ...r.delAutor!, citas: [cita('epicteto-manual-0', 'epicteto')] } }), /«epicteto-manual-0», que es de «epicteto» y no de «seneca»/],
    ['un cierre de la Obra que cuenta menos de lo que se enseña', (r) => ({ ...r, mismaObra: { ...r.mismaObra!, obra: obra('seneca', 3) } }), /cuenta 3 Citas de «seneca--libro», y el pie enseña 3 más la que se lee/],
    ['un cierre del Autor que cuenta menos de lo que se enseña', (r) => ({ ...r, delAutor: { ...r.delAutor!, recuento: 4 } }), /«Más de Séneca» cuenta 4 Citas, y el pie enseña 4 más la que se lee/],
    ['una tarjeta en los dos grupos', (r) => ({ ...r, delAutor: { ...r.delAutor!, citas: [deLaObra(1)[0]] } }), /la Cita «seneca-libro-0» sale dos veces/],
  ])('objeta %s', (_, romper, mensaje) => {
    expect(problemaDeRutasDeSalida(SENECA, romper(bien()))).toMatch(mensaje);
  });
});

describe('Historia 24.6 — los dos cierres', () => {
  it('dicen «Las {n} citas de…», sin glifo y sin recortar el título', () => {
    const largo = 'Soledades, galerías y otros poemas, con las canciones del alto Duero y los proverbios del que hace camino';
    expect(cierreDeLaMismaObra({ recuento: 8, titulo: 'Sobre la brevedad de la vida' })).toBe(
      'Las 8 citas de Sobre la brevedad de la vida',
    );
    expect(cierreDeLaMismaObra({ recuento: 3, titulo: largo })).toBe(`Las 3 citas de ${largo}`);
    expect(cierreDeMasDelAutor({ nombre: 'Séneca' }, 15)).toBe('Las 15 citas de Séneca');
    for (const texto of [cierreDeLaMismaObra({ recuento: 8, titulo: 'X' }), cierreDeMasDelAutor({ nombre: 'Y' }, 2)]) {
      expect(texto).not.toMatch(new RegExp(`[${AVANCE}${FLECHA}…]`));
    }
  });

  it.each([1, 0])('lanzan con un recuento de %s', (recuento) => {
    expect(() => cierreDeLaMismaObra({ recuento, titulo: 'X' })).toThrow(/dos Citas o más/);
    expect(() => cierreDeMasDelAutor({ nombre: 'Y' }, recuento)).toThrow(/dos Citas o más/);
  });
});

// ─── Dos construcciones ──────────────────────────────────────────────────────

const WS = 'https://es.wikisource.org/wiki/';
const EPICTETO =
  'nombre: Epicteto\nañoNacimiento: 50\nañoFallecimiento: 135\nsemblanza: Filósofo estoico griego, esclavo liberto.\nordenAlfabetico: Epicteto\n';
const MARCO_AURELIO =
  'nombre: Marco Aurelio\nañoNacimiento: 121\nañoFallecimiento: 180\nsemblanza: Emperador romano y filósofo estoico.\nordenAlfabetico: Aurelio\n';
const MACHADO =
  'nombre: Antonio Machado\nañoNacimiento: 1875\nañoFallecimiento: 1939\nsemblanza: Poeta sevillano de la generación del 98.\nordenAlfabetico: Machado\n';

const BREVEDAD = 'Sobre la brevedad de la vida';
const CARTAS = 'Cartas a Lucilio';
const FELIZ = 'Sobre la vida feliz';
const IRA = 'De la ira';
const MANUAL = 'Manual';
const SOLEDADES = 'Soledades';
const MEDITACIONES = 'Meditaciones';
const SIN_OBRA = 'seneca-mientras-esperamos-vivir-la-vida-pasa';

/** Lo que el fixture declara de cada Cita, para juzgar el pie sin leerlo de él. */
interface CitaDelFixture {
  slug: string;
  autor: string;
  obra?: string;
  temas: string[];
}

/** El nombre de Autor y su página, por slug. */
const AUTORES: Record<string, { nombre: string; ruta: string }> = {
  seneca: { nombre: 'Séneca', ruta: '/autor/seneca/' },
  epicteto: { nombre: 'Epicteto', ruta: '/autor/epicteto/' },
  'antonio-machado': { nombre: 'Antonio Machado', ruta: '/autor/antonio-machado/' },
  'marco-aurelio': { nombre: 'Marco Aurelio', ruta: '/autor/marco-aurelio/' },
};
/** La página 1 de cada Obra, por título. */
const RUTA_DE_OBRA: Record<string, string> = {
  [BREVEDAD]: '/obra/seneca/sobre-la-brevedad-de-la-vida/',
  [CARTAS]: '/obra/seneca/cartas-a-lucilio/',
  [FELIZ]: '/obra/seneca/sobre-la-vida-feliz/',
  [IRA]: '/obra/seneca/de-la-ira/',
  [MANUAL]: '/obra/epicteto/manual/',
  [SOLEDADES]: '/obra/antonio-machado/soledades/',
  [MEDITACIONES]: '/obra/marco-aurelio/meditaciones/',
};

function corpusDelPie(): { corpus: Record<string, string>; citas: CitaDelFixture[] } {
  const citas: CitaDelFixture[] = [];
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/epicteto.yml': EPICTETO,
    'autores/antonio-machado.yml': MACHADO,
    'autores/marco-aurelio.yml': MARCO_AURELIO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    // Con el censo en el fixture el andamio no siembra documentos: se escriben aquí.
    'pendientes-de-cotejo.yml': `citas:\n  - ${SIN_OBRA}\n`,
  };

  /**
   * `n` Citas cotejadas de una Obra, con su documento. `orden` da el orden del libro: los índices
   * de las Citas en el orden en que aparecen en el documento.
   */
  function sembrar(autor: string, clave: string, titulo: string, n: number, temas: string[], orden?: number[]) {
    const url = `${WS}${titulo.replaceAll(' ', '_')}`;
    const textos = new Map<number, string>();
    for (let i = 0; i < n; i += 1) {
      const slug = `${autor}-${clave}-${i}`;
      const texto = `${clave} ${i}: una sentencia distinta para cada número, la ${i}.`;
      textos.set(i, texto);
      corpus[`citas/${autor}--${clave}-${i}.md`] = citaValida({
        autor,
        slug,
        texto,
        temas,
        procedencia: { obra: titulo, año: 50 },
        fuente: { id: 'wikisource-es', url },
      });
      citas.push({ slug, autor, obra: titulo, temas });
    }
    corpus[`fuentes/${nombreDeDocumento('wikisource-es', titulo)}.txt`] = componerDocumento(
      { fuente: 'wikisource-es', obra: titulo, url, recuperado: '2026-10-27' },
      titulo,
      (orden ?? [...textos.keys()]).map((i) => textos.get(i)!).join('\n\n'),
    );
  }

  // Séneca, 15: Brevedad 8 (insertadas 7…0: el orden del libro es el inverso del de los slugs),
  // Cartas 3, Vida feliz 2, De la ira 1 sin Temas y una sin Obra del censo.
  sembrar('seneca', 'brevedad', BREVEDAD, 8, ['el-tiempo'], [7, 6, 5, 4, 3, 2, 1, 0]);
  sembrar('seneca', 'cartas', CARTAS, 3, ['el-tiempo']);
  sembrar('seneca', 'feliz', FELIZ, 2, ['el-tiempo']);
  sembrar('seneca', 'ira', IRA, 1, []);
  corpus['citas/seneca--sin-obra.md'] = citaValida({
    slug: SIN_OBRA,
    texto: 'Mientras esperamos vivir, la vida pasa.',
    procedencia: { referencia: 'Carta 1' },
    fuente: undefined,
  });
  citas.push({ slug: SIN_OBRA, autor: 'seneca', temas: ['el-tiempo'] });
  // Epicteto: una sola Obra de 5. Machado: una Cita, de una Obra de una, sin Temas.
  sembrar('epicteto', 'manual', MANUAL, 5, ['el-tiempo']);
  sembrar('antonio-machado', 'soledades', SOLEDADES, 1, []);
  // Marco Aurelio: una sola Obra de 4, sin Temas. Su pie no tiene más que «De la misma obra»: es
  // la cara que sostiene el `nav` sin «Más de» ni chips.
  sembrar('marco-aurelio', 'meditaciones', MEDITACIONES, 4, []);
  return { corpus, citas };
}

/** Lo que espera cada Página de Cita: cuántas tarjetas en cada grupo, y si hay chip. */
const ESPERADO: Record<string, { mismaObra: number; delAutor: number; chip: boolean } | 'sin-nav'> = {
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`seneca-brevedad-${i}`, { mismaObra: 3, delAutor: 4, chip: true }])),
  ...Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`seneca-cartas-${i}`, { mismaObra: 1, delAutor: 4, chip: true }])),
  ...Object.fromEntries(Array.from({ length: 2 }, (_, i) => [`seneca-feliz-${i}`, { mismaObra: 0, delAutor: 4, chip: true }])),
  'seneca-ira-0': { mismaObra: 0, delAutor: 4, chip: false },
  [SIN_OBRA]: { mismaObra: 0, delAutor: 4, chip: true },
  ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`epicteto-manual-${i}`, { mismaObra: 3, delAutor: 0, chip: true }])),
  'antonio-machado-soledades-0': 'sin-nav',
  ...Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`marco-aurelio-meditaciones-${i}`, { mismaObra: 2, delAutor: 0, chip: false }])),
};

/** Los cierres que espera el fixture, todos los que hay. */
const CIERRES_ESPERADOS = [
  'Las 15 citas de Séneca',
  `Las 3 citas de ${CARTAS}`,
  `Las 5 citas de ${MANUAL}`,
  `Las 8 citas de ${BREVEDAD}`,
  `Las 4 citas de ${MEDITACIONES}`,
];

describe('Historia 24.6 — el pie de cada Página de Cita, en `dist/`', () => {
  const { corpus, citas } = corpusDelPie();
  const porSlug = new Map(citas.map((c) => [c.slug, c]));
  let proyecto = '';
  let otro = '';
  const paginas = new Map<string, string>();

  beforeAll(async () => {
    // Una tras otra, como el resto de la suite: cada una lanza un `astro build`.
    const una = await construirConCorpus(corpus, { jornada: '2026-10-27' });
    aLimpiar.push(una.proyecto);
    const dos = await construirConCorpus(corpus, { jornada: '2026-11-03' });
    aLimpiar.push(dos.proyecto);
    expect(una.codigo, una.salida).toBe(0);
    expect(dos.codigo, dos.salida).toBe(0);
    proyecto = una.proyecto;
    otro = dos.proyecto;
    for (const slug of await readdir(join(proyecto, 'dist', 'cita'))) {
      paginas.set(slug, await readFile(paginaConstruida(proyecto, `/cita/${slug}/`), 'utf8'));
    }
  }, 600_000);

  const grupo = (html: string, slug: string, clase: string): GrupoLeido | undefined =>
    leerRutasDeSalida(html, `/cita/${slug}/`)?.grupos.find((g) => g.clase === clase);
  const siguienteDe = (html: string) =>
    /<li class="fila-de-bloque" data-zona="siguiente"[^>]*><a href="\/cita\/([^/"]+)\/"/.exec(html)?.[1];

  it('construye una Página de Cita por cada Cita del fixture', () => {
    expect([...paginas.keys()].sort()).toEqual(citas.map((c) => c.slug).sort());
  });

  it('(a) ninguna lleva más de siete tarjetas al pie, y alguna lleva siete', () => {
    const cuantas = [...paginas].map(([slug, html]) =>
      (leerRutasDeSalida(html, slug)?.grupos ?? []).reduce((n, g) => n + g.tarjetas.length, 0),
    );
    for (const n of cuantas) expect(n).toBeLessThanOrEqual(MAX_CITAS_DE_LA_MISMA_OBRA + MAX_CITAS_RELACIONADAS);
    expect(Math.max(...cuantas)).toBe(7);
  });

  it('(b) ninguna tarjeta repite la propia, la de «Siguiente» ni otra tarjeta', () => {
    for (const [slug, html] of paginas) {
      const tarjetas = (leerRutasDeSalida(html, slug)?.grupos ?? []).flatMap((g) => g.tarjetas.map((t) => t.slug));
      expect(tarjetas, slug).not.toContain(slug);
      const siguiente = siguienteDe(html);
      // En una Obra de dos Citas o más siempre hay «Siguiente»: si no se lee, la comprobación no
      // miraría nada, y eso es un fallo, no un salto.
      const obra = porSlug.get(slug)!.obra;
      if (obra !== undefined && citas.filter((c) => c.obra === obra).length >= 2) {
        expect(siguiente, `${slug}: sin «Siguiente» legible`).toBeDefined();
      }
      if (siguiente !== undefined) expect(tarjetas, slug).not.toContain(siguiente);
      expect(new Set(tarjetas).size, slug).toBe(tarjetas.length);
    }
  });

  it('(c) «De la misma obra»: en el orden del Listado de Obra, sin atribución, por `misma-obra`, con su cierre', async () => {
    let vistos = 0;
    for (const [slug, html] of paginas) {
      const misma = grupo(html, slug, 'de-la-misma-obra');
      if (misma === undefined) continue;
      vistos += 1;
      const obra = porSlug.get(slug)!.obra!;
      const listado = tarjetasDelListado(
        await readFile(paginaConstruida(proyecto, RUTA_DE_OBRA[obra]), 'utf8'),
        RUTA_DE_OBRA[obra],
      ).map((t) => t.slug);
      const posiciones = misma.tarjetas.map((t) => listado.indexOf(t.slug));
      expect(posiciones.every((p) => p >= 0), slug).toBe(true);
      expect(posiciones, slug).toEqual([...posiciones].sort((a, b) => a - b));
      for (const tarjeta of misma.tarjetas) {
        expect(tarjeta.zona, slug).toBe('misma-obra');
        expect(tarjeta.visibles.map((v) => v.clase), slug).toEqual(['fragmento']);
      }
      expect(misma.cierre, slug).toEqual({
        texto: `Las ${listado.length} citas de ${obra}`,
        href: RUTA_DE_OBRA[obra],
        zona: 'misma-obra',
        glifo: AVANCE,
      });
    }
    expect(vistos).toBe(8 + 3 + 5 + 4);
    // La Página de Obra de Brevedad lista en el orden del libro, que es el inverso del de los slugs.
    expect(
      tarjetasDelListado(await readFile(paginaConstruida(proyecto, RUTA_DE_OBRA[BREVEDAD]), 'utf8'), BREVEDAD).map((t) => t.slug),
    ).toEqual([7, 6, 5, 4, 3, 2, 1, 0].map((i) => `seneca-brevedad-${i}`));
    // Se lee la 5 (siguiente, la 4): quedan 7, 6, 3, 2, 1, 0 y se reparten 7, 2, 0.
    expect(grupo(paginas.get('seneca-brevedad-5')!, 'seneca-brevedad-5', 'de-la-misma-obra')!.tarjetas.map((t) => t.slug)).toEqual(
      ['seneca-brevedad-7', 'seneca-brevedad-2', 'seneca-brevedad-0'],
    );
  });

  /** Las Citas que lista la Página de Autor construida, en todas sus páginas. */
  async function listadoDelAutor(ruta: string): Promise<string[]> {
    const slugsListados: string[] = [];
    for (let n = 1; ; n += 1) {
      const pagina = n === 1 ? ruta : `${ruta}${n}/`;
      const fichero = paginaConstruida(proyecto, pagina);
      try {
        await access(fichero);
      } catch {
        return slugsListados;
      }
      slugsListados.push(...tarjetasDelListado(await readFile(fichero, 'utf8'), pagina).map((t) => t.slug));
    }
  }

  it('(d) «Más de {Autor}»: del Autor, nada de su Obra, la línea de Obra de la ficha, por `rutas-de-salida`, con su cierre', async () => {
    let vistos = 0;
    const listados = new Map<string, string[]>();
    for (const [slug, html] of paginas) {
      const mas = grupo(html, slug, 'mas-del-autor');
      if (mas === undefined) continue;
      vistos += 1;
      const propia = porSlug.get(slug)!;
      const autor = AUTORES[propia.autor];
      expect(mas.rotulo, slug).toEqual({ nivel: 'h2', id: 'mas-del-autor', texto: `Más de ${autor.nombre}` });
      for (const tarjeta of mas.tarjetas) {
        const otra = porSlug.get(tarjeta.slug)!;
        expect(otra.autor, slug).toBe(propia.autor);
        if (propia.obra !== undefined) expect(otra.obra, slug).not.toBe(propia.obra);
        expect(tarjeta.zona, slug).toBe('rutas-de-salida');
        expect(tarjeta.visibles.map((v) => v.clase), slug).toEqual(otra.obra === undefined ? ['fragmento'] : ['fragmento', 'obra']);
        if (otra.obra !== undefined) expect(tarjeta.visibles[1].texto, slug).toBe(otra.obra);
      }
      const recuento = citas.filter((c) => c.autor === propia.autor).length;
      // El cierre promete lo que lista la Página de Autor a la que lleva: se lee de `dist/`.
      if (!listados.has(autor.ruta)) listados.set(autor.ruta, await listadoDelAutor(autor.ruta));
      expect(listados.get(autor.ruta)!.length, slug).toBe(recuento);
      expect(mas.cierre, slug).toEqual({
        texto: `Las ${recuento} citas de ${autor.nombre}`,
        href: autor.ruta,
        zona: 'rutas-de-salida',
        glifo: AVANCE,
      });
    }
    expect(vistos).toBe(15);
  });

  it('(e) los chips son los Temas publicados de la Cita, por `chip-de-tema`', () => {
    for (const [slug, html] of paginas) {
      const temas = grupo(html, slug, 'temas-de-la-cita');
      const declarados = porSlug.get(slug)!.temas;
      if (declarados.length === 0) {
        expect(temas, slug).toBeUndefined();
        continue;
      }
      expect(temas?.chips, slug).toEqual([{ href: '/tema/el-tiempo/', zona: 'chip-de-tema' }]);
      expect(temas?.rotulo, slug).toEqual({ nivel: 'h2', id: 'temas-de-la-cita', texto: 'Temas' });
    }
  });

  it('(f) un grupo vacío no está, y sin ninguno no hay `nav` ni «Seguir leyendo»', () => {
    for (const [slug, html] of paginas) {
      const esperado = ESPERADO[slug];
      const leidas = leerRutasDeSalida(html, slug);
      if (esperado === 'sin-nav') {
        expect(leidas, slug).toBeUndefined();
        expect(html, slug).not.toContain('Seguir leyendo');
        expect(html, slug).not.toContain('class="salidas"');
        continue;
      }
      const clases = leidas!.grupos.map((g) => g.clase);
      expect(clases.includes('de-la-misma-obra'), slug).toBe(esperado.mismaObra > 0);
      expect(clases.includes('mas-del-autor'), slug).toBe(esperado.delAutor > 0);
      expect(clases.includes('temas-de-la-cita'), slug).toBe(esperado.chip);
      for (const g of leidas!.grupos) {
        expect(g.rotulo, `${slug}: ${g.clase}`).toBeDefined();
        // Una lista de tarjetas son sus tarjetas y, la última, la Fila de bloque del cierre.
        if (g.clase !== 'temas-de-la-cita') {
          expect(g.piezas, `${slug}: ${g.clase}`).toEqual([...g.tarjetas.map(() => 'tarjeta'), 'fila-de-bloque']);
        }
      }
    }
    // Ni rastro de los respaldos de antes ni de la lista propia.
    for (const html of paginas.values()) {
      expect(html).not.toContain('Explorar por tema');
      expect(html).not.toContain('class="hermanas"');
    }
  });

  it('(g) toda tarjeta y la Tarjeta de Obra van bajo `data-pagefind-ignore="all"`, y no hay «→»', () => {
    for (const [slug, html] of paginas) {
      let tarjetas = 0;
      recorrerElementos(html, (elemento, antepasados) => {
        const clases = (elemento.atributos.get('class') ?? '').split(/\s+/);
        const esTarjeta = elemento.etiqueta === 'li' && clases.includes('tarjeta');
        const esDeObra = elemento.etiqueta === 'section' && clases.includes('tarjeta-de-obra');
        if (!esTarjeta && !esDeObra) return;
        tarjetas += 1;
        // Un antepasado estricto para las tarjetas del pie (el `nav`); la Tarjeta de Obra lleva el
        // atributo en su propia `section` desde la 24.4, que para Pagefind la excluye igual.
        const candidatos = esDeObra ? [...antepasados, elemento] : antepasados;
        const ignorada = candidatos.some((e) => e.atributos.get('data-pagefind-ignore') === 'all');
        expect(ignorada, `${slug}: ${elemento.etiqueta}.${clases.join('.')}`).toBe(true);
      });
      if (ESPERADO[slug] !== 'sin-nav') expect(tarjetas, slug).toBeGreaterThan(0);
      expect(html, slug).not.toContain(FLECHA);
      const nav = leerRutasDeSalida(html, slug);
      if (nav !== undefined) {
        expect(nav.apertura, slug).toMatch(/\bdata-pagefind-ignore="all"/);
        expect(nav.apertura, slug).toMatch(/\baria-label="Seguir leyendo"/);
        expect(nav.apertura, slug).not.toMatch(/data-zona=/);
      }
    }
  });

  it('(h) los grupos van en su orden, cada uno con su `h2`', () => {
    const ORDEN = ['de-la-misma-obra', 'mas-del-autor', 'temas-de-la-cita'];
    const ROTULOS: Record<string, string> = { 'de-la-misma-obra': 'De la misma obra', 'temas-de-la-cita': 'Temas' };
    for (const [slug, html] of paginas) {
      const leidas = leerRutasDeSalida(html, slug);
      if (leidas === undefined) continue;
      const clases = leidas.grupos.map((g) => g.clase);
      expect(clases, slug).toEqual(ORDEN.filter((c) => clases.includes(c)));
      for (const g of leidas.grupos) {
        expect(g.rotulo?.nivel, slug).toBe('h2');
        expect(g.rotulo?.id, slug).toBe(g.clase);
        if (ROTULOS[g.clase] !== undefined) expect(g.rotulo?.texto, slug).toBe(ROTULOS[g.clase]);
      }
      // Y el pie va tras las acciones: después de la última isla.
      expect(html.indexOf('<nav class="salidas"'), slug).toBeGreaterThan(html.lastIndexOf('class="isla'));
    }
  });

  it('(i) dos construcciones con jornadas distintas dan el mismo pie, byte a byte', async () => {
    for (const [slug, html] of paginas) {
      const enLaOtra = await readFile(paginaConstruida(otro, `/cita/${slug}/`), 'utf8');
      expect(navDeSalidas(enLaOtra), slug).toBe(navDeSalidas(html));
    }
  });

  it('(j) las cifras del fixture: tarjetas por grupo y cierres', () => {
    const cierres = new Set<string>();
    for (const [slug, html] of paginas) {
      const esperado = ESPERADO[slug];
      if (esperado === 'sin-nav') continue;
      expect(grupo(html, slug, 'de-la-misma-obra')?.tarjetas.length ?? 0, slug).toBe(esperado.mismaObra);
      expect(grupo(html, slug, 'mas-del-autor')?.tarjetas.length ?? 0, slug).toBe(esperado.delAutor);
      for (const g of leerRutasDeSalida(html, slug)!.grupos) if (g.cierre !== undefined) cierres.add(g.cierre.texto);
    }
    expect([...cierres].sort()).toEqual([...CIERRES_ESPERADOS].sort());
    // La Cita sin Obra no tiene Tarjeta de Obra, y elige 4 de las 14 demás de Séneca.
    expect(paginas.get(SIN_OBRA)).not.toContain('class="tarjeta-de-obra"');
  });
});

// ─── Construcciones que fallan ───────────────────────────────────────────────

/*
 * Las guardas de `RutasDeSalida.astro`: un uso que no venga de `rutasDeSalidaDeCita` (la portada
 * pasará el suyo, 28.2) y diga algo falso detiene la construcción. La página real nunca las
 * dispara, así que solo una sonda las prueba.
 */
describe('Historia 24.6 — un pie roto detiene la construcción', () => {
  const sonda = (rutas: string) => `---
import RutasDeSalida from '../components/RutasDeSalida.astro';
import { conjuntoPublicable } from '../lib/publicado.ts';
const conjunto = await conjuntoPublicable();
const de = (slug: string) => conjunto.citas.find((c) => c.slug === slug)!;
const autor = conjunto.autores.find((a) => a.slug === 'seneca')!;
const obra = de('seneca-brevedad-0').obra!;
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><RutasDeSalida autor={autor} rutas={${rutas}} zona="rutas-de-salida" /></body></html>
`;
  const construirSonda = async (rutas: string) => {
    const resultado = await construirConCorpus(corpusDelPie().corpus, {
      paginas: { 'sonda-rutas-de-salida.astro': sonda(rutas) },
    });
    aLimpiar.push(resultado.proyecto);
    return resultado;
  };

  it('«Más de {Autor}» con una Cita de otro Autor, nombrando la ruta, la Cita y los dos Autores', async () => {
    const resultado = await construirSonda(
      "{ mismaObra: undefined, delAutor: { recuento: 15, citas: [de('epicteto-manual-0')] }, temas: [] }",
    );
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(
      /\/sonda-rutas-de-salida\/?[^\n]*«Más de Séneca» lleva la Cita «epicteto-manual-0», que es de «epicteto» y no de «seneca»/,
    );
  }, 300_000);

  it('«De la misma obra» con una Cita de otra Obra, nombrando la ruta y la Cita', async () => {
    const resultado = await construirSonda(
      "{ mismaObra: { obra, citas: [de('seneca-cartas-0')] }, delAutor: undefined, temas: [] }",
    );
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(
      /\/sonda-rutas-de-salida\/?[^\n]*«De la misma obra» lleva la Cita «seneca-cartas-0», que no es de la Obra/,
    );
  }, 300_000);

  it('una tarjeta en los dos grupos, nombrando la ruta y la Cita', async () => {
    const resultado = await construirSonda(
      "{ mismaObra: { obra, citas: [de('seneca-brevedad-1')] }, delAutor: { recuento: 15, citas: [de('seneca-brevedad-1')] }, temas: [] }",
    );
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toMatch(/\/sonda-rutas-de-salida\/?[^\n]*la Cita «seneca-brevedad-1» sale dos veces/);
  }, 300_000);
});
