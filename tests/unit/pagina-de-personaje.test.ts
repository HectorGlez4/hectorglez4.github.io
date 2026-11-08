import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { citaValida, construirConCorpus, limpiar, paginaConstruida } from './ayuda/construir.js';
import { CITAS_POR_PAGINA, MAX_SALTOS_DESDE_LA_PORTADA } from '../../src/lib/umbrales.ts';
import { EVENTOS } from '../../src/lib/medicion.ts';

/**
 * Historia 35.3 — la Página de Personaje, sobre un sitio construido de verdad.
 *
 * Personaje A dice `CITAS_POR_PAGINA + 1` Citas —así tiene página 2—, todas de una Obra de su
 * Autor; Personaje B dice una, de otra Obra, y lleva semblanza propia; su slug la pone en la página 1
 * del Tema, a tres saltos de la portada (si no, la puerta de NFR-5 rompe la construcción). Todas tienen Autor (`vivo`, con derechos
 * vigentes) y el Tema `el-tiempo`, que con ellas se publica. Lo puro —`obrasDelPersonaje` con una
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

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * Una atribuida de la Autora Viva, dicha por un Personaje, con su obra y su Fuente: el cotejo la
 * sitúa como a cualquiera. Las Citas sin obra y su pie se prueban puros (`publicado.test.ts`).
 */
const atribuida = (slug: string, texto: string, personaje: string, obra: string) =>
  citaValida({
    texto,
    slug,
    autor: 'vivo',
    personaje,
    clase: 'atribuida',
    estadoDerechos: undefined,
    procedencia: { obra, año: 2000 },
    fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${encodeURIComponent(obra)}` },
  });

const CORPUS: Record<string, string> = {
  'autores/vivo.yml': AUTOR_VIVO,
  'temas/el-tiempo.yml': 'nombre: El tiempo\n',
  'personajes/a.yml': PERSONAJE_A,
  'personajes/b.yml': PERSONAJE_B,
  'citas/vivo--de-a-con-obra.md': atribuida('vivo-de-a-con-obra', 'La de A con obra dice algo del tiempo.', 'a', 'Obras de la autora'),
  'citas/vivo--b-la-unica.md': atribuida('vivo-b-la-unica', 'La única de B también habla del tiempo.', 'b', 'Otra obra'),
};
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

  it(`el Personaje queda a ${MAX_SALTOS_DESDE_LA_PORTADA} saltos: portada → Tema → Cita → Personaje`, () => {
    expect(html('/')).toContain('href="/tema/el-tiempo/"');
    expect(main('/tema/el-tiempo/')).toContain('href="/cita/vivo-b-la-unica/"');
    expect(main('/cita/vivo-b-la-unica/')).toContain('href="/personaje/b/"');
    expect(MAX_SALTOS_DESDE_LA_PORTADA).toBeGreaterThanOrEqual(3);
  });
});
