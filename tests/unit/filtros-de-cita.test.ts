import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { recorrerElementos, type Elemento } from '../../tools/lib/html.ts';
import { FILTRO_DE_TIPO, FILTROS_DE_CITA, ORDEN_DE_CITA } from '../../src/lib/tipoDeResultado.ts';

/**
 * Historia 27.1, AD-11, AD-25 — lo que cada Página de Cita declara a Pagefind, sobre `dist/`.
 *
 * Cada Página de Cita lleva exactamente un filtro `autor` (el suyo), como mucho un `obra` (el
 * nombre de la ficha de su Obra), un `tema` por Tema **publicado**, el metadato `autor` con el
 * nombre y su clave de orden; todo fuera de los bloques que se repiten en otras páginas y nunca
 * bajo un `data-pagefind-ignore="all"`. La clave sigue el orden del Directorio, la lista de obras
 * y el libro, y una clave que no cabe rompe el build.
 *
 * El fixture está hecho para que cada orden se distinga del de slug:
 *
 *   · Zenón de Citio («zenon-de-citio», clave «Citio») va antes que Séneca («seneca», clave
 *     «Séneca»), al revés que sus slugs.
 *   · El documento de «Cartas a Lucilio» trae la Carta B antes que la A, y la Cita del censo de esa
 *     Obra, sin documento, va detrás de las dos. Lo mismo el de «Fragmentos» de Zenón.
 *   · Séneca tiene una Cita sin obra (solo año) y otra con obra «…», que no resuelve Obra: las dos
 *     al final de su Autor, por slug.
 *   · «El tiempo» se publica (16 Citas de la «Brevedad» y más); «La ira», con una, no.
 *
 * Las Citas sin documento tienen que estar en el censo de cotejo, que es cerrado (11.2): son tres
 * de las de Séneca que de verdad están en él, con su texto. Con el censo en el fixture el andamio
 * deja de sembrar documentos, así que los tres se escriben aquí.
 */

const WS = { id: 'wikisource-es', nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0' };
const URL_BREVEDAD = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const URL_CARTAS = 'https://es.wikisource.org/wiki/Cartas_a_Lucilio';
const URL_FRAGMENTOS = 'https://es.wikisource.org/wiki/Fragmentos_de_Zenon';

const documento = (obra: string, url: string, textos: string[]) =>
  componerDocumento({ fuente: 'wikisource-es', obra, url, recuperado: '2026-10-29' }, obra, textos.join('\n\n'));

const cotejada = (slug: string, autor: string, texto: string, obra: string, url: string, temas: string[]) =>
  citaValida({ slug, autor, texto, temas, procedencia: { obra, año: 49 }, fuente: { ...WS, url } });

const fichero = (slug: string, autor: string) => `citas/${slug.replace(`${autor}-`, `${autor}--`)}.md`;

const BREVEDAD = Array.from({ length: 16 }, (_, i) => ({
  slug: `seneca-breve-${String(i + 1).padStart(2, '0')}`,
  texto: `Breve ${i + 1}: la vida es larga si se sabe emplear, y la perdemos sin verla.`,
}));
const CARTA_A = { slug: 'seneca-carta-a', texto: 'Carta A: el sabio se basta a sí mismo para vivir bien.' };
const CARTA_B = { slug: 'seneca-carta-b', texto: 'Carta B: nadie se hace sabio por casualidad ni de prisa.' };
// Del censo de partida, con su texto: sin documento, sin obra y con obra «…».
const CARTA_SIN_DOCUMENTO = {
  slug: 'seneca-ninguna-cosa-se-parece-tanto-a-la',
  texto: 'Ninguna cosa se parece tanto a la injusticia como la justicia tardía.',
};
const SIN_OBRA = { slug: 'seneca-mientras-esperamos-vivir-la-vida-pasa', texto: 'Mientras esperamos vivir, la vida pasa.' };
const OBRA_PUNTOS = {
  slug: 'seneca-no-hay-viento-favorable-para-el-que',
  texto: 'No hay viento favorable para el que no sabe adónde va.',
};
const ZENON_UNO = { slug: 'zenon-de-citio-uno', texto: 'Uno: el fin es vivir de acuerdo con la naturaleza.' };
const ZENON_DOS = { slug: 'zenon-de-citio-dos', texto: 'Dos: tenemos dos orejas y una boca para oír más.' };

const ZENON_YML = 'nombre: Zenón de Citio\nañoNacimiento: -334\nañoFallecimiento: -262\nsemblanza: Fundador del estoicismo.\nordenAlfabetico: Citio\n';

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/zenon-de-citio.yml': ZENON_YML,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'temas/la-ira.yml': 'nombre: La ira\n',
  'pendientes-de-cotejo.yml': `citas:\n${[CARTA_SIN_DOCUMENTO, SIN_OBRA, OBRA_PUNTOS].map((c) => `  - ${c.slug}\n`).join('')}`,
  ...Object.fromEntries(
    BREVEDAD.map((c) => [
      fichero(c.slug, 'seneca'),
      cotejada(c.slug, 'seneca', c.texto, 'Sobre la brevedad de la vida', URL_BREVEDAD, ['el-tiempo']),
    ]),
  ),
  [fichero(CARTA_A.slug, 'seneca')]: cotejada(CARTA_A.slug, 'seneca', CARTA_A.texto, 'Cartas a Lucilio', URL_CARTAS, ['el-tiempo']),
  [fichero(CARTA_B.slug, 'seneca')]: cotejada(CARTA_B.slug, 'seneca', CARTA_B.texto, 'Cartas a Lucilio', URL_CARTAS, ['el-tiempo', 'la-ira']),
  [fichero(CARTA_SIN_DOCUMENTO.slug, 'seneca')]: citaValida({
    slug: CARTA_SIN_DOCUMENTO.slug,
    texto: CARTA_SIN_DOCUMENTO.texto,
    procedencia: { obra: 'Cartas a Lucilio' },
    fuente: undefined,
  }),
  [fichero(SIN_OBRA.slug, 'seneca')]: citaValida({ slug: SIN_OBRA.slug, texto: SIN_OBRA.texto, procedencia: { año: 64 }, fuente: undefined }),
  [fichero(OBRA_PUNTOS.slug, 'seneca')]: citaValida({
    slug: OBRA_PUNTOS.slug,
    texto: OBRA_PUNTOS.texto,
    procedencia: { obra: '…' },
    fuente: undefined,
  }),
  [fichero(ZENON_UNO.slug, 'zenon-de-citio')]: cotejada(ZENON_UNO.slug, 'zenon-de-citio', ZENON_UNO.texto, 'Fragmentos', URL_FRAGMENTOS, ['el-tiempo', 'la-ira']),
  [fichero(ZENON_DOS.slug, 'zenon-de-citio')]: cotejada(ZENON_DOS.slug, 'zenon-de-citio', ZENON_DOS.texto, 'Fragmentos', URL_FRAGMENTOS, ['el-tiempo']),
  'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt': documento(
    'Sobre la brevedad de la vida',
    URL_BREVEDAD,
    BREVEDAD.map((c) => c.texto),
  ),
  'fuentes/wikisource-es--cartas-a-lucilio.txt': documento('Cartas a Lucilio', URL_CARTAS, [CARTA_B.texto, CARTA_A.texto]),
  'fuentes/wikisource-es--fragmentos.txt': documento('Fragmentos', URL_FRAGMENTOS, [ZENON_DOS.texto, ZENON_UNO.texto]),
};

/** Lo que cada Cita tiene que declarar, en el orden que tiene que dar su clave. */
const ESPERADO: { slug: string; autor: string; nombre: string; obra?: string; temas: string[] }[] = [
  { slug: ZENON_DOS.slug, autor: 'zenon-de-citio', nombre: 'Zenón de Citio', obra: 'zenon-de-citio--fragmentos', temas: ['el-tiempo'] },
  { slug: ZENON_UNO.slug, autor: 'zenon-de-citio', nombre: 'Zenón de Citio', obra: 'zenon-de-citio--fragmentos', temas: ['el-tiempo'] },
  ...BREVEDAD.map((c) => ({
    slug: c.slug,
    autor: 'seneca',
    nombre: 'Séneca',
    obra: 'seneca--sobre-la-brevedad-de-la-vida',
    temas: ['el-tiempo'],
  })),
  { slug: CARTA_B.slug, autor: 'seneca', nombre: 'Séneca', obra: 'seneca--cartas-a-lucilio', temas: ['el-tiempo'] },
  { slug: CARTA_A.slug, autor: 'seneca', nombre: 'Séneca', obra: 'seneca--cartas-a-lucilio', temas: ['el-tiempo'] },
  { slug: CARTA_SIN_DOCUMENTO.slug, autor: 'seneca', nombre: 'Séneca', obra: 'seneca--cartas-a-lucilio', temas: ['el-tiempo'] },
  { slug: SIN_OBRA.slug, autor: 'seneca', nombre: 'Séneca', temas: ['el-tiempo'] },
  { slug: OBRA_PUNTOS.slug, autor: 'seneca', nombre: 'Séneca', temas: ['el-tiempo'] },
];

/** Si un elemento es de los bloques que se repiten en otras páginas, o lo saca todo del índice. */
const esBloqueAjeno = (e: Elemento) => {
  const clases = (e.atributos.get('class') ?? '').split(/\s+/u);
  return (
    e.atributos.get('data-pagefind-ignore') === 'all' ||
    (e.etiqueta === 'figure' && clases.includes('bloque')) ||
    clases.includes('tarjeta-de-obra') ||
    (e.etiqueta === 'li' && clases.includes('tarjeta'))
  );
};

/** Lo que una Página de Cita declara a Pagefind, con sus antepasados juzgados. */
function declaracionesDe(html: string) {
  const filtros: { clave: string; valor: string }[] = [];
  const orden: string[] = [];
  const fueraDeSitio: string[] = [];
  recorrerElementos(html, (elemento, antepasados) => {
    const filtro = elemento.atributos.get('data-pagefind-filter');
    const sort = elemento.atributos.get('data-pagefind-sort');
    const meta = elemento.atributos.get('data-pagefind-meta');
    if (filtro === undefined && sort === undefined && meta === undefined) return;
    if (filtro !== undefined) {
      const corte = filtro.indexOf(':');
      filtros.push({ clave: filtro.slice(0, corte), valor: filtro.slice(corte + 1) });
      if (filtro.startsWith(`${FILTRO_DE_TIPO}:`)) return;
    }
    if (sort !== undefined) orden.push(sort);
    const enCuerpo = antepasados.some((a) => a.etiqueta === 'main' && a.atributos.has('data-pagefind-body'));
    if (!enCuerpo || antepasados.some(esBloqueAjeno) || esBloqueAjeno(elemento)) {
      fueraDeSitio.push(filtro ?? sort ?? meta!);
    }
  });
  const metas = [...html.matchAll(/<span data-pagefind-meta="autor">([^<]*)<\/span>/gu)].map((m) => m[1]);
  const de = (clave: string) => filtros.filter((f) => f.clave === clave).map((f) => f.valor);
  return { de, orden, metas, fueraDeSitio };
}

describe('Historia 27.1 — la Página de Cita declara sus filtros y su clave de orden', () => {
  let proyecto = '';
  const html = new Map<string, string>();

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS);
    proyecto = resultado.proyecto;
    expect(resultado.codigo, resultado.salida).toBe(0);
    for (const { slug } of ESPERADO) html.set(slug, await readFile(paginaConstruida(proyecto, `/cita/${slug}/`), 'utf8'));
  }, 300_000);

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  it('cada Cita lleva un `autor`, como mucho una `obra` y sus Temas publicados, los suyos', () => {
    for (const esperado of ESPERADO) {
      const { de } = declaracionesDe(html.get(esperado.slug)!);
      expect(de(FILTROS_DE_CITA.autor), esperado.slug).toEqual([esperado.autor]);
      expect(de(FILTROS_DE_CITA.obra), esperado.slug).toEqual(esperado.obra === undefined ? [] : [esperado.obra]);
      // «La ira» está declarada en dos Citas y no llega a su umbral: no es filtro.
      expect(de(FILTROS_DE_CITA.tema), esperado.slug).toEqual(esperado.temas);
      // Y el tipo de la 26.2 sigue siendo uno.
      expect(de(FILTRO_DE_TIPO), esperado.slug).toEqual(['cita']);
    }
  });

  it('el metadato `autor` lleva el nombre del Autor, una vez', () => {
    for (const esperado of ESPERADO) {
      expect(declaracionesDe(html.get(esperado.slug)!).metas, esperado.slug).toEqual([esperado.nombre]);
    }
  });

  it('nada va fuera del cuerpo indexado, bajo `data-pagefind-ignore="all"` ni en un bloque que se repite', () => {
    for (const esperado of ESPERADO) {
      expect(declaracionesDe(html.get(esperado.slug)!).fueraDeSitio, esperado.slug).toEqual([]);
    }
    // No en vacío: la página trae los bloques de los que tiene que quedar fuera.
    const conTarjeta = html.get(CARTA_A.slug)!;
    expect(conTarjeta).toContain('<figure class="bloque"');
    expect(conTarjeta).toContain('class="tarjeta-de-obra"');
  });

  it('cada Cita lleva una clave numérica de ocho cifras, distinta, bajo 2^24 y en el orden esperado', () => {
    const claves = ESPERADO.map(({ slug }) => {
      const { orden } = declaracionesDe(html.get(slug)!);
      expect(orden, slug).toHaveLength(1);
      const [nombre, clave] = orden[0].split(':');
      expect(nombre, slug).toBe(ORDEN_DE_CITA);
      expect(clave, slug).toMatch(/^\d{8}$/u);
      expect(Number(clave), slug).toBeLessThan(2 ** 24);
      return { slug, clave: Number(clave) };
    });
    expect(new Set(claves.map((c) => c.clave)).size).toBe(claves.length);
    // Ordenadas por su clave dan el orden del Directorio, la lista de obras y el libro.
    expect([...claves].sort((a, b) => a.clave - b.clave).map((c) => c.slug)).toEqual(ESPERADO.map((e) => e.slug));
    // Que no es el de slug.
    expect([...claves].sort((a, b) => (a.slug < b.slug ? -1 : 1)).map((c) => c.slug)).not.toEqual(ESPERADO.map((e) => e.slug));
  });
});

describe('Historia 27.1 — una clave de orden que no cabe rompe el build', () => {
  it('con un tope de 2, los dos Autores llenan su rango y el build se para nombrándolo', async () => {
    const umbrales = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    const parcheado = umbrales.replace(
      'export const MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN = 4096;',
      'export const MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN = 2;',
    );
    const resultado = await construirConCorpus(CORPUS, {
      conservar: false,
      ficheros: { 'src/lib/umbrales.ts': parcheado },
    });
    expect(resultado.codigo).not.toBe(0);
    expect(resultado.salida).toMatch(/el rango «Autor» tiene 2 posiciones y el tope es 2/u);
  }, 300_000);
});
