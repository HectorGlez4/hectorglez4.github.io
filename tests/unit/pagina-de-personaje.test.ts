import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { citaValida, construirConCorpus, limpiar, paginaConstruida } from './ayuda/construir.js';
import { CITAS_POR_PAGINA, MAX_OBRAS_ANTES_DE_LAS_CITAS, MAX_SALTOS_DESDE_LA_PORTADA } from '../../src/lib/umbrales.ts';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { componerBiografia, nombreDeBiografia } from '../../tools/lib/documento.ts';

/**
 * Historia 35.3 — la Página de Personaje, sobre un sitio construido de verdad.
 *
 * Personaje A dice `CITAS_POR_PAGINA + 1` Citas —así tiene página 2—, todas de una Obra de su
 * Autor; Personaje B dice una, de otra Obra, y lleva semblanza propia; su slug la pone en la página 1
 * del Tema, a tres saltos de la portada (si no, la puerta de NFR-5 rompe la construcción). Todas tienen Autor (`vivo`, con derechos
 * vigentes) y el Tema `el-tiempo`, que con ellas se publica. La de B es además la única apta para
 * portada, así que es la Cita del Día de la portada y del 404. Personaje C lleva su semblanza de
 * una biografía (AD-26), y Personaje D dice una Cita de cada una de `MAX_OBRAS_ANTES_DE_LAS_CITAS + 1`
 * Obras, así que su Lista de Obras se pliega. Lo puro —`obrasDelPersonaje` con una
 * Obra de dueño Personaje, el grafo del modelo, la superficie— está en `publicado.test.ts`,
 * `alcance.test.ts` y `superficies.test.ts`.
 */

const AUTOR_VIVO = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;

const PERSONAJE_A = `nombre: "Personaje A"
universo: "Universo de A"
ordenAlfabetico: "Personaje A"
`;

const PERSONAJE_B = `nombre: "Personaje B"
universo: "Universo de B"
ordenAlfabetico: "Personaje B"
semblanzaPropia:
  texto: "Un personaje de prueba con su semblanza propia y quien responde de ella."
  responde: "Héctor González"
`;

const BIOGRAFIA_DE_C = {
  fuente: 'wikipedia-es',
  titulo: 'Personaje C',
  revision: 456,
  fechaDeRevision: '2024-05-01',
  licencia: 'CC BY-SA 4.0',
  url: 'https://es.wikipedia.org/w/index.php?title=Personaje_C&oldid=456',
  recuperado: '2026-10-10',
} as const;
const DOCUMENTO_DE_C = nombreDeBiografia(BIOGRAFIA_DE_C.fuente, BIOGRAFIA_DE_C.titulo, BIOGRAFIA_DE_C.revision);
const SEMBLANZA_DE_C = 'Personaje C es un personaje de prueba creado para cotejar su semblanza literal.';

const PERSONAJE_C = `nombre: "Personaje C"
universo: "Universo de C"
ordenAlfabetico: "Personaje C"
semblanza: "${SEMBLANZA_DE_C}"
biografia:
  documento: "${DOCUMENTO_DE_C}"
  revision: ${BIOGRAFIA_DE_C.revision}
`;

const PERSONAJE_D = `nombre: "Personaje D"
universo: "Universo de D"
ordenAlfabetico: "Personaje D"
`;

/** Las Obras de D: una más de las que caben antes de las Citas. */
const OBRAS_DE_D = Array.from({ length: MAX_OBRAS_ANTES_DE_LAS_CITAS + 1 }, (_, i) => `Obra de D ${i + 1}`);

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * Una atribuida de la Autora Viva, dicha por un Personaje, con su obra y su Fuente: el cotejo la
 * sitúa como a cualquiera. Las Citas sin obra y su pie se prueban puros (`publicado.test.ts`).
 */
const atribuida = (slug: string, texto: string, personaje: string, obra: string, aptaParaPortada?: true) =>
  citaValida({
    texto,
    slug,
    autor: 'vivo',
    personaje,
    clase: 'atribuida',
    estadoDerechos: undefined,
    aptaParaPortada,
    procedencia: { obra, año: 2000 },
    fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${encodeURIComponent(obra)}` },
  });

const CORPUS: Record<string, string> = {
  'autores/vivo.yml': AUTOR_VIVO,
  'temas/el-tiempo.yml': 'nombre: El tiempo\n',
  'personajes/a.yml': PERSONAJE_A,
  'personajes/b.yml': PERSONAJE_B,
  'citas/vivo--de-a-con-obra.md': atribuida('vivo-de-a-con-obra', 'La de A con obra dice algo del tiempo.', 'a', 'Obras de la autora'),
  'personajes/c.yml': PERSONAJE_C,
  'personajes/d.yml': PERSONAJE_D,
  'citas/vivo--b-la-unica.md': atribuida('vivo-b-la-unica', 'La única de B también habla del tiempo.', 'b', 'Otra obra', true),
  'citas/vivo--c-la-de-c.md': atribuida('vivo-c-la-de-c', 'La de C cuenta también el tiempo.', 'c', 'Otra obra'),
  [`biografias/${DOCUMENTO_DE_C}.txt`]: componerBiografia(
    BIOGRAFIA_DE_C,
    'Personaje C',
    `${SEMBLANZA_DE_C} Aparece en varias obras de su universo.`,
  ),
};
OBRAS_DE_D.forEach((obra, i) => {
  CORPUS[`citas/vivo--c-de-d-${i + 1}.md`] = atribuida(
    `vivo-c-de-d-${i + 1}`,
    `La ${i + 1} de D dice algo del tiempo.`,
    'd',
    obra,
  );
});
for (let i = 1; i <= CITAS_POR_PAGINA; i += 1) {
  CORPUS[`citas/vivo--de-a-${pad(i)}.md`] = atribuida(
    `vivo-de-a-${pad(i)}`,
    `La número ${pad(i)} de A sobre el tiempo.`,
    'a',
    'Obras de la autora',
  );
}

let proyecto = '';
let salida = '';
let codigo = -1;

beforeAll(async () => {
  const r = await construirConCorpus(CORPUS, { jornada: '2026-11-08' });
  proyecto = r.proyecto;
  salida = r.salida;
  codigo = r.codigo;
}, 600_000);

afterAll(async () => {
  if (proyecto !== '') await limpiar(proyecto);
});

const html = (ruta: string) => readFileSync(paginaConstruida(proyecto, ruta), 'utf8');
/** El `<main>` de una página, sin la cabecera ni el pie del armazón. */
const main = (ruta: string) => /<main[^>]*>([\s\S]*)<\/main>/u.exec(html(ruta))?.[1] ?? '';
const vistas = (ruta: string) => /data-vistas="([^"]*)"/u.exec(html(ruta))?.[1] ?? '';

describe('Historia 35.3 — la Página de Personaje construida', () => {
  it('construye, con las alcanzables de NFR-5 en verde', () => {
    expect(codigo, salida).toBe(0);
    expect(existsSync(paginaConstruida(proyecto, '/personaje/a/'))).toBe(true);
    expect(existsSync(paginaConstruida(proyecto, '/personaje/a/2/'))).toBe(true);
    expect(existsSync(paginaConstruida(proyecto, '/personaje/b/'))).toBe(true);
    expect(existsSync(paginaConstruida(proyecto, '/personaje/b/2/'))).toBe(false);
    expect(existsSync(paginaConstruida(proyecto, '/personaje/c/'))).toBe(true);
    expect(existsSync(paginaConstruida(proyecto, '/personaje/d/'))).toBe(true);
  });

  it('la Ficha de la página 1: el nombre en el h1 y «personaje de {universo}»', () => {
    const pagina = main('/personaje/a/');
    expect(pagina).toMatch(/<h1[^>]*>Personaje A<\/h1>/u);
    expect(pagina).toMatch(/<p class="universo"[^>]*>personaje de Universo de A<\/p>/u);
    // Sin semblanza, ni párrafo ni atribución.
    expect(pagina).not.toContain('class="semblanza"');
  });

  it('la semblanza propia, fuera de Pagefind y con «Semblanza de {responde}.»', () => {
    const pagina = main('/personaje/b/');
    expect(pagina).toMatch(
      /<div data-pagefind-ignore[^>]*>\s*<p class="semblanza"[^>]*>Un personaje de prueba con su semblanza propia y quien responde de ella\.<\/p>\s*<p [^>]*>\s*Semblanza de Héctor González\.\s*<\/p>/u,
    );
  });

  it('la Lista de Obras con su rótulo, solo con las Obras de sus Citas', () => {
    const pagina = main('/personaje/a/');
    expect(pagina).toMatch(/<section class="obras-del-personaje"[^>]*data-pagefind-ignore/u);
    expect(pagina).toContain('Obras en este Corpus');
    expect(pagina).toMatch(/data-zona="lista-de-obras"/u);
    expect(pagina).toContain('href="/obra/vivo/obras-de-la-autora/"');
    expect(pagina).not.toContain('href="/obra/vivo/otra-obra/"');
    expect(pagina).not.toContain('sin obra documentada');
    expect(main('/personaje/b/')).toContain('href="/obra/vivo/otra-obra/"');
    expect(main('/personaje/a/2/')).not.toContain('href="/obra/');
  });

  it('el rótulo «Citas», el listado con la Tarjeta de Obra y la paginación', () => {
    const pagina = main('/personaje/a/');
    expect(pagina).toMatch(/<h2 class="rotulo"[^>]*>Citas<\/h2>/u);
    expect(pagina).not.toContain('Citas documentadas');
    const tarjetas = pagina.match(/href="\/cita\/vivo-de-a-[^"]*"/gu) ?? [];
    expect(new Set(tarjetas).size).toBe(CITAS_POR_PAGINA);
    expect(pagina).toMatch(/data-zona="listado"/u);
    expect(pagina).toContain('href="/personaje/a/2/"');
  });

  it('las 2+: el h1 y el listado, sin ficha, con noindex y sin vista', () => {
    const segunda = html('/personaje/a/2/');
    const cuerpo = main('/personaje/a/2/');
    expect(cuerpo).toMatch(/<h1[^>]*>Personaje A<\/h1>/u);
    expect(cuerpo).not.toContain('personaje de Universo de A');
    expect(cuerpo).not.toContain('Obras en este Corpus');
    expect(segunda).toMatch(/<meta name="robots" content="noindex/u);
    expect(vistas('/personaje/a/2/')).not.toContain(EVENTOS.vistaDeSuperficie);
    expect(vistas('/personaje/a/')).toBe(EVENTOS.vistaDeSuperficie);
    expect(html('/personaje/a/')).not.toMatch(/<meta name="robots" content="noindex/u);
  });

  it('pestaña y descripción: «Frases de {nombre}» y «{n} frases de {nombre}, personaje de {universo}.»', () => {
    const n = CITAS_POR_PAGINA + 1;
    expect(html('/personaje/a/')).toContain('<title>Frases de Personaje A | Sabiduría de Bolsillo</title>');
    expect(html('/personaje/a/')).toContain(
      `<meta name="description" content="${n} frases de Personaje A, personaje de Universo de A.">`,
    );
    expect(html('/personaje/a/2/')).toContain('<title>Frases de Personaje A — página 2 | Sabiduría de Bolsillo</title>');
    expect(html('/personaje/a/2/')).toContain(`content="${n} frases de Personaje A, personaje de Universo de A. Página 2."`);
    expect(html('/personaje/b/')).toContain('content="1 frase de Personaje B, personaje de Universo de B."');
    // «Frases» solo en la pestaña y en la descripción: el cuerpo dice «Citas».
    expect(main('/personaje/a/')).not.toMatch(/frases/iu);
  });

  it('el JSON-LD es una CollectionPage con su lista de Citas, sin Person', () => {
    const bloques = [...html('/personaje/a/').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu)].map(
      (m) => JSON.parse(m[1]) as Record<string, unknown>,
    );
    const pagina = bloques.find((b) => b['@type'] === 'CollectionPage');
    expect(pagina).toBeDefined();
    expect(pagina).not.toHaveProperty('about');
    expect(JSON.stringify(bloques)).not.toContain('"Person"');
    expect((pagina?.mainEntity as { '@type': string })['@type']).toBe('ItemList');
  });

  it('entra en la búsqueda propia como «personaje», sin tarjeta social', () => {
    expect(html('/personaje/a/')).toContain('data-pagefind-filter="tipo:personaje"');
    expect(html('/personaje/a/')).not.toContain('og:image');
    const sitemap = readFileSync(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toContain('/personaje/a/</loc>');
    expect(sitemap).not.toContain('/personaje/a/2/</loc>');
  });

  it('la Atribución de la Cita nombra al Personaje y enlaza a su página, en la zona `atribucion`', () => {
    const cita = main('/cita/vivo-de-a-con-obra/');
    expect(cita).toMatch(
      /<p class="autor"[^>]*data-zona="atribucion"[^>]*>\s*<a href="\/personaje\/a\/" class="enlace-en-tinta"[^>]*>Personaje A<\/a>/u,
    );
    // La línea de procedencia no cambia: el título de la Obra sigue enlazando a su página.
    expect(cita).toMatch(/<p class="procedencia"[^>]*><a href="\/obra\/vivo\/obras-de-la-autora\/"/u);
  });

  it('la semblanza de una biografía, fuera de Pagefind y con su atribución visible (AD-26, AD-28)', () => {
    const pagina = main('/personaje/c/');
    expect(pagina).toMatch(
      new RegExp(
        `<div data-pagefind-ignore[^>]*>\\s*<p class="semblanza"[^>]*>${SEMBLANZA_DE_C.replace(/\./gu, '\\.')}</p>\\s*` +
          `<p [^>]*>\\s*Semblanza tomada de <a href="https://es\\.wikipedia\\.org/w/index\\.php\\?title=Personaje_C&(?:amp;)?oldid=456"[^>]*>` +
          `«Personaje C» en [^<,]+, revisión 456</a>\\s*· <a [^>]*rel="noopener license"[^>]*>CC BY-SA 4\\.0</a>`,
        'u',
      ),
    );
  });

  it('la Lista de Obras se pliega con más de MAX_OBRAS_ANTES_DE_LAS_CITAS, y lo plegado sigue en su zona', () => {
    const seccion = /<section class="obras-del-personaje"[\s\S]*?<\/section>/u.exec(main('/personaje/d/'))?.[0] ?? '';
    expect(seccion).toContain('Y una obra más');
    for (let i = 1; i <= OBRAS_DE_D.length; i += 1) expect(seccion).toContain(`href="/obra/vivo/obra-de-d-${i}/"`);
    // Toda zona de la sección es la de la Lista de Obras, también la del Desplegable.
    const zonas = new Set([...seccion.matchAll(/data-zona="([^"]*)"/gu)].map((m) => m[1]));
    expect([...zonas]).toEqual(['lista-de-obras']);
  });

  it('la Cita del Día de la portada y del 404 nombra a su Personaje, como su Página de Cita', () => {
    for (const ruta of ['/', '/404']) {
      const delDia = /<section class="del-dia"[\s\S]*?<\/section>/u.exec(html(ruta))?.[0] ?? '';
      expect(delDia, ruta).toContain('href="/cita/vivo-b-la-unica/"');
      expect(delDia, ruta).toMatch(/<p class="autor"[^>]*>\s*<a href="\/personaje\/b\/" class="enlace-en-tinta"[^>]*>Personaje B<\/a>/u);
    }
  });

  it('«frases» solo en la pestaña y la meta de las Páginas de Obra y de Personaje, en todo `dist/`', () => {
    const dist = join(proyecto, 'dist');
    const paginas = readdirSync(dist, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html'));
    expect(paginas.length).toBeGreaterThan(0);
    // La palabra del criterio, en plural: el 404 dice «Busca la frase que te trajo» desde la v1.
    const frases = /\bfrases\b/iu;
    for (const fichero of paginas) {
      const contenido = readFileSync(join(dist, fichero), 'utf8');
      const cabecera = [...contenido.matchAll(/<title>[\s\S]*?<\/title>|<meta [^>]*>/gu)].map((m) => m[0]);
      const resto = contenido.replace(/<title>[\s\S]*?<\/title>|<meta [^>]*>/gu, '');
      expect(resto, fichero).not.toMatch(frases);
      const ruta = `/${fichero.split(/[\\/]/u).join('/')}`;
      if (!/^\/(?:obra|personaje)\//u.test(ruta)) {
        for (const etiqueta of cabecera) expect(etiqueta, fichero).not.toMatch(frases);
      }
    }
    expect(html('/personaje/a/')).toMatch(/<title>Frases de/u);
  });

  it(`el Personaje queda a ${MAX_SALTOS_DESDE_LA_PORTADA} saltos: portada → Tema → Cita → Personaje`, () => {
    expect(html('/')).toContain('href="/tema/el-tiempo/"');
    expect(main('/tema/el-tiempo/')).toContain('href="/cita/vivo-b-la-unica/"');
    expect(main('/cita/vivo-b-la-unica/')).toContain('href="/personaje/b/"');
    expect(MAX_SALTOS_DESDE_LA_PORTADA).toBeGreaterThanOrEqual(3);
  });
});
