import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ATESTIGUADA, citaValida, conLaPuertaAbierta, construirConCorpus, limpiar, paginaConstruida } from './ayuda/construir.js';
import {
  CITAS_POR_PAGINA,
  MAX_OBRAS_ANTES_DE_LAS_CITAS,
  MAX_SALTOS_DESDE_LA_PORTADA,
  MIN_CITAS_POR_PERSONAJE,
} from '../../src/lib/umbrales.ts';
import { EVENTOS } from '../../src/lib/medicion.ts';
import { componerBiografia, nombreDeBiografia } from '../../tools/lib/documento.ts';

/**
 * Historia 35.3 — la Página de Personaje, sobre un sitio construido de verdad.
 *
 * Personaje A dice `CITAS_POR_PAGINA + 1` Citas —así tiene página 2—, todas de una Obra de su
 * Autor; Personaje B dice exactamente `MIN_CITAS_POR_PERSONAJE` (Historia 35.3b: su página se indexa),
 * de otra Obra, y lleva semblanza propia; sus slugs la ponen en la página 1 del Tema, a tres saltos de
 * la portada (si no, la puerta de NFR-5 rompe la construcción). Todas tienen Autor (`vivo`, con derechos
 * vigentes) y el Tema `el-tiempo`, que con ellas se publica. Ninguna es apta para portada —una
 * atribuida no lo es nunca (Historia 35.1b, pregunta 22)—, así que la portada y el 404 no tienen
 * Cita del Día. La puerta de la atribuida se abre en la copia, y los textos no se parecen entre
 * sí: un duplicado entre atribuidas tampoco se publica. Personaje C lleva su semblanza de
 * una biografía (AD-26) y dice una sola Cita —bajo el umbral, si es mayor que 1: su página se sirve
 * `noindex`—, y Personaje D dice una Cita de cada una de `MAX_OBRAS_ANTES_DE_LAS_CITAS + 1`
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
 * Historia 35.1b — un texto propio para la Cita n.º `n` de una serie: dos atribuidas casi iguales
 * («La número 1…», «La número 2…») son un duplicado entre clases y no se publican.
 */
const PALABRAS = ['río', 'piedra', 'luz', 'sombra', 'camino', 'viento', 'mar', 'fuego', 'nube', 'árbol', 'pan',
  'sal', 'hierro', 'vidrio', 'lluvia', 'nieve', 'campo', 'puerta', 'casa', 'libro', 'sueño', 'voz', 'mano'];
const textoPropio = (serie: string, n: number) => {
  // Seis palabras por un xorshift sembrado con n: ninguna pareja de la prueba casa por `parecidoEntre`.
  let x = (n * 2654435761) >>> 0;
  const palabras: string[] = [];
  for (let k = 0; k < 6; k += 1) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    palabras.push(PALABRAS[x % PALABRAS.length]);
  }
  return `${serie}: ${palabras.join(' y ')}.`;
};

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
    ...ATESTIGUADA,
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
  'citas/vivo--b-la-unica.md': atribuida('vivo-b-la-unica', 'La única de B también habla del tiempo.', 'b', 'Otra obra'),
  'citas/vivo--c-la-de-c.md': atribuida('vivo-c-la-de-c', 'La de C cuenta también el tiempo.', 'c', 'Otra obra'),
  [`biografias/${DOCUMENTO_DE_C}.txt`]: componerBiografia(
    BIOGRAFIA_DE_C,
    'Personaje C',
    `${SEMBLANZA_DE_C} Aparece en varias obras de su universo.`,
  ),
};
// Historia 35.3b — B llega justo al umbral: las que le faltan, con slug que las deja en la página 1.
for (let i = 1; i < MIN_CITAS_POR_PERSONAJE; i += 1) {
  CORPUS[`citas/vivo--b-la-otra-${i}.md`] = atribuida(`vivo-b-la-otra-${i}`, textoPropio('De B', 200 + i), 'b', 'Otra obra');
}
OBRAS_DE_D.forEach((obra, i) => {
  CORPUS[`citas/vivo--c-de-d-${i + 1}.md`] = atribuida(
    `vivo-c-de-d-${i + 1}`,
    textoPropio('De D', i + 101),
    'd',
    obra,
  );
});
// Historia 36.2 — D dice además una Cita sin obra: su Lista de Obras lleva el pie y el panel cierra
// en `texto` (atribuida con solo el año en su Procedencia y sin Fuente: ninguna Obra la reclama).
CORPUS['citas/vivo--c-de-d-sin-obra.md'] = citaValida({
  texto: textoPropio('De D sin obra', 777),
  slug: 'vivo-c-de-d-sin-obra',
  autor: 'vivo',
  personaje: 'd',
  clase: 'atribuida',
  estadoDerechos: undefined,
  ...ATESTIGUADA,
  procedencia: { año: 2000 },
  fuente: undefined,
});
for (let i = 1; i <= CITAS_POR_PAGINA; i += 1) {
  CORPUS[`citas/vivo--de-a-${pad(i)}.md`] = atribuida(
    `vivo-de-a-${pad(i)}`,
    textoPropio('De A', i),
    'a',
    'Obras de la autora',
  );
}

let proyecto = '';
let salida = '';
let codigo = -1;

beforeAll(async () => {
  const r = await construirConCorpus(CORPUS, { jornada: '2026-11-08', ficheros: conLaPuertaAbierta() });
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
    const deB = `${MIN_CITAS_POR_PERSONAJE} ${(MIN_CITAS_POR_PERSONAJE as number) === 1 ? 'frase' : 'frases'}`;
    expect(html('/personaje/b/')).toContain(`content="${deB} de Personaje B, personaje de Universo de B."`);
    expect(html('/personaje/c/')).toContain('content="1 frase de Personaje C, personaje de Universo de C."');
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

  it('entra en la búsqueda propia como «personaje»', () => {
    expect(html('/personaje/a/')).toContain('data-pagefind-filter="tipo:personaje"');
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

  it('Historia 36.2 — la semblanza y su atribución, dentro del panel del Autor; las 2+, sin ningún panel', () => {
    for (const [ruta, firma] of [
      ['/personaje/b/', 'Semblanza de Héctor González.'],
      ['/personaje/c/', 'Semblanza tomada de'],
    ] as const) {
      const panel = /<div class="panel panel-autor cierre-texto"[^>]*>\s*<header class="ficha"[\s\S]*?<\/header>\s*<\/div>/u.exec(main(ruta))?.[0];
      expect(panel, ruta).toBeDefined();
      expect(panel, ruta).toContain('class="semblanza"');
      expect(panel, ruta).toContain(firma);
    }
    const segunda = main('/personaje/a/2/');
    expect(segunda).not.toContain('class="panel ');
    expect(segunda).toMatch(/<header class="ficha"[^>]*>\s*<h1[^>]*>Personaje A<\/h1>\s*<\/header>/u);
  });

  it('Historia 36.2 — la hoja de la página: el nombre en la tinta del panel del Autor y la Lista de Obras a una unidad de su rótulo', () => {
    const reglas = [...html('/personaje/a/').matchAll(/<style>([\s\S]*?)<\/style>/gu)].flatMap((m) =>
      [...m[1].matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((r) => ({
        selectores: r[1]
          .replace(/\[data-astro-cid-[\w-]+\]/gu, '')
          .split(',')
          .map((x) => x.replace(/\s+/gu, ' ').replace(/\s*>\s*/gu, '>').trim()),
        cuerpo: r[2],
      })),
    );
    const de = (selector: string) =>
      reglas
        .filter((r) => r.selectores.includes(selector))
        .map((r) => r.cuerpo)
        .join(';');
    expect(de('.panel-autor h1'), '.panel-autor h1').toMatch(/color:\s*var\(--sobre-contenedor-autor\)/u);
    expect(de('.obras-del-personaje>.lista-de-obras')).toMatch(/margin-top:\s*var\(--unidad\)/u);
    expect(reglas.some((r) => r.selectores.includes('.obras-del-personaje')), 'la regla existe').toBe(true);
    expect(de('.obras-del-personaje')).not.toMatch(/margin-top/u);
  });

  it('Historia 36.2 — con Citas sin obra, la Lista de Obras y su pie van en el panel de la Obra, que cierra en `texto`', () => {
    const panel = /<div class="panel panel-obra cierre-texto"[^>]*>\s*<section class="obras-del-personaje"[\s\S]*?<\/section>\s*<\/div>/u.exec(
      main('/personaje/d/'),
    )?.[0];
    expect(panel).toBeDefined();
    expect(panel).toMatch(/<p class="sin-obra"[^>]*>Y una cita sin obra documentada\.<\/p>/u);
    expect(main('/personaje/a/')).toContain('<div class="panel panel-obra cierre-fila"');
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

  it('ninguna atribuida es la Cita del Día: sin otra apta, la portada y el 404 no la tienen (35.1b, pregunta 22)', () => {
    for (const ruta of ['/', '/404']) {
      expect(html(ruta), ruta).not.toMatch(/<section class="del-dia"/u);
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

/** Las páginas de Personaje construidas, como rutas («/personaje/a/», «/personaje/a/2/»). */
const paginasDePersonaje = () =>
  readdirSync(join(proyecto, 'dist', 'personaje'), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('index.html'))
    .map((f) => `/personaje/${f.split(/[\\/]/u).slice(0, -1).join('/')}/`);

describe('Historia 35.3b — cuándo se indexa la Página de Personaje, y su Tarjeta Social', () => {
  const sitemap = () => readFileSync(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');

  it(`con MIN_CITAS_POR_PERSONAJE (${MIN_CITAS_POR_PERSONAJE}) Citas, su página 1 se indexa`, () => {
    expect(codigo, salida).toBe(0);
    expect(sitemap()).toContain('/personaje/b/</loc>');
    expect(html('/personaje/b/')).not.toMatch(/<meta name="robots"/u);
    expect(html('/personaje/b/')).toMatch(/<main[^>]*data-pagefind-body/u);
    expect(vistas('/personaje/b/')).toBe(EVENTOS.vistaDeSuperficie);
    expect(sitemap()).toContain('/personaje/d/</loc>');
  });

  it.runIf(1 < MIN_CITAS_POR_PERSONAJE)('con menos, la misma página con noindex, follow, fuera del sitemap, de Pagefind y sin vista', () => {
    const pagina = html('/personaje/c/');
    expect(pagina).toContain('<meta name="robots" content="noindex, follow">');
    expect(sitemap()).not.toContain('/personaje/c/</loc>');
    expect(pagina).not.toContain('data-pagefind-body');
    expect(vistas('/personaje/c/')).not.toContain(EVENTOS.vistaDeSuperficie);
    // El mismo `<main>` que tendría indexable: la ficha, la semblanza y el listado, sin marca ni aviso.
    const cuerpo = main('/personaje/c/');
    expect(cuerpo).toMatch(/<h1[^>]*>Personaje C<\/h1>/u);
    expect(cuerpo).toMatch(/<p class="universo"[^>]*>personaje de Universo de C<\/p>/u);
    expect(cuerpo).toContain(SEMBLANZA_DE_C);
    expect(cuerpo).toMatch(/<h2 class="rotulo"[^>]*>Citas<\/h2>/u);
    expect(cuerpo).toContain('href="/cita/vivo-c-la-de-c/"');
    expect(cuerpo).not.toMatch(/noindex|no se indexa/iu);
  });

  it('toda página de Personaje —la 1 y las 2+, se indexe o no— declara su Tarjeta Social, que es un PNG de dist/', () => {
    const rutas = paginasDePersonaje();
    expect(rutas).toEqual(expect.arrayContaining(['/personaje/a/', '/personaje/a/2/', '/personaje/b/', '/personaje/c/', '/personaje/d/']));
    for (const ruta of rutas) {
      const imagen = /<meta property="og:image" content="([^"]+)">/u.exec(html(ruta))?.[1];
      expect(imagen, ruta).toBeDefined();
      const { pathname } = new URL(imagen ?? '');
      const slug = ruta.split('/')[2];
      expect(pathname, ruta).toBe(`/tarjeta/personaje/${slug}.png`);
      const fichero = join(proyecto, 'dist', pathname);
      expect(existsSync(fichero), ruta).toBe(true);
      // La firma de un PNG: 89 50 4E 47 0D 0A 1A 0A.
      expect(readFileSync(fichero).subarray(0, 8).toString('hex'), ruta).toBe('89504e470d0a1a0a');
    }
  });

  it('dist/tarjeta/personaje/ tiene un PNG por Personaje publicado, y nada más', () => {
    const tarjetas = readdirSync(join(proyecto, 'dist', 'tarjeta', 'personaje')).sort();
    expect(tarjetas).toEqual(['a.png', 'b.png', 'c.png', 'd.png']);
  });
});

describe('Historia 35.8 — la línea de retirada de la Página de Personaje', () => {
  it('va en la página 1 y en la 2, tras el listado y su paginación, la última de la página', () => {
    for (const ruta of ['/personaje/a/', '/personaje/a/2/', '/personaje/b/']) {
      const pagina = html(ruta);
      const inicio = pagina.indexOf('<p class="linea-de-retirada"');
      expect(inicio, ruta).toBeGreaterThan(pagina.lastIndexOf('<ul class="listado"'));
      if (ruta !== '/personaje/b/') expect(inicio, ruta).toBeGreaterThan(pagina.indexOf('<nav class="paginacion"'));
      const linea = pagina.slice(inicio, pagina.indexOf('</p>', inicio));
      expect(linea).toContain('¿Alguna cita de esta página está mal atribuida o te afecta? ');
      expect(linea).toContain(`subject=Corregir%20o%20retirar%20citas%20del%20personaje%20${ruta.split('/')[2]}`);
      // Nada visible tras ella dentro de `main`.
      const resto = pagina.slice(pagina.indexOf('</p>', inicio) + 4, pagina.indexOf('</main>'));
      expect(resto.replace(/<[^>]*>/gu, '').trim(), ruta).toBe('');
    }
  });
});
