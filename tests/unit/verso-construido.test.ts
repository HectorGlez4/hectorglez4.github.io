import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
  type ResultadoBuild,
} from './ayuda/construir.js';
import { indiceDe } from './ayuda/pagefind.js';
import { enUnaLinea } from '../../src/lib/verso.ts';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';
import { FICHERO_DEL_CENSO } from '../../tools/lib/cotejo.ts';

/**
 * Historia 29.3 — el verso en toda superficie, construido.
 *
 * **Una** construcción con fixtures: dos Citas en verso de *Versos sencillos* I —una de cuatro
 * versos y otra de cinco, de más de 120 caracteres, cuyo recorte del título y del fragmento cae
 * sobre un salto—, respaldadas por su documento de verso; una de prosa; y relleno de prosa
 * hasta que el Tema tenga página. La de cuatro versos es apta para portada y la única apta: con
 * la jornada fija, es la Cita del Día de la portada, del 404 y del Kit.
 */

const FIXTURES = join(RAIZ, 'tests/unit/ayuda/lineas');
const DOC_MARTI = 'fuentes/wikisource-es--versos-sencillos--versos-sencillos-i.txt';
const URL_MARTI = 'https://es.wikisource.org/wiki/Versos_sencillos/I';

const MARTI =
  'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';
const SLUG_MARTI = 'jose-marti-yo-vengo-de-todas-partes-y-hacia';

/** 135 caracteres: el carácter 109 es un salto, y el 119 cae dentro del quinto verso. */
const LARGA =
  'De aquélla que lo ha matado.\nRápida como un reflejo,\nDos veces vi el alma, dos:\nCuando murió el pobre viejo,\nCuando ella me dijo adiós.';
const SLUG_LARGA = 'jose-marti-de-aquella-que-lo-ha-matado-rapida';

const PROSA = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const SLUG_PROSA = 'seneca-no-es-que-tengamos-poco-tiempo-es';
const OBRA_SENECA = 'Sobre la brevedad de la vida';
const URL_SENECA = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';

const AUTOR_MARTI = `nombre: José Martí
añoNacimiento: 1853
añoFallecimiento: 1895
semblanza: Poeta y político cubano.
ordenAlfabetico: Martí
`;

const RELLENO = Array.from({ length: 13 }, (_, i) => `Una sentencia de prosa distinta para cada número, la ${i}.`);

const deMarti = (slug: string, texto: string, campos: Record<string, unknown> = {}) =>
  citaValida({
    slug,
    texto,
    autor: 'jose-marti',
    procedencia: { obra: 'Versos sencillos' },
    fuente: { id: 'wikisource-es', url: URL_MARTI },
    ...campos,
  });

const deSeneca = (slug: string, texto: string) =>
  citaValida({ slug, texto, procedencia: { obra: OBRA_SENECA, año: 49 }, fuente: { id: 'wikisource-es', url: URL_SENECA } });

let construccion: ResultadoBuild;
const leer = (ruta: string) => readFile(paginaConstruida(construccion.proyecto, ruta), 'utf8');

beforeAll(async () => {
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/jose-marti.yml': AUTOR_MARTI,
    'temas/el-tiempo.yml': 'nombre: El tiempo\n',
    // Con el censo en el fixture, el andamio no siembra documentos: se escriben aquí.
    [FICHERO_DEL_CENSO]: 'citas: []\n',
    [DOC_MARTI]: await readFile(join(FIXTURES, 'wikisource-es--versos-sencillos--versos-sencillos-i.txt'), 'utf8'),
    [`fuentes/${nombreDeDocumento('wikisource-es', OBRA_SENECA)}.txt`]: componerDocumento(
      { fuente: 'wikisource-es', obra: OBRA_SENECA, año: 49, url: URL_SENECA, recuperado: '2026-08-19' },
      [OBRA_SENECA, 'Año de publicación: 49'].join('\n'),
      [PROSA, ...RELLENO].join('\n\n'),
    ),
    'citas/jose-marti--yo-vengo-de-todas-partes-y-hacia.md': deMarti(SLUG_MARTI, MARTI, { aptaParaPortada: true }),
    'citas/jose-marti--de-aquella-que-lo-ha-matado-rapida.md': deMarti(SLUG_LARGA, LARGA),
    'citas/seneca--no-es-que-tengamos-poco-tiempo-es.md': deSeneca(SLUG_PROSA, PROSA),
  };
  RELLENO.forEach((texto, i) => {
    corpus[`citas/seneca--una-sentencia-${i}.md`] = deSeneca(`seneca-una-sentencia-${i}`, texto);
  });
  construccion = await construirConCorpus(corpus, { jornada: '2026-11-08', conBusqueda: true });
  if (construccion.codigo !== 0) throw new Error(`La construcción falló:\n${construccion.salida.slice(-4000)}`);
}, 600_000);

afterAll(async () => {
  if (construccion) await limpiar(construccion.proyecto);
});

/** Los `span.verso` de un trozo de HTML, con su texto. */
const versos = (html: string) => [...html.matchAll(/<span class="verso" style="display:block">([^<]*)<\/span>/g)].map((m) => m[1]);
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const decodificar = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('Historia 29.3 — la Cita en verso, verso a verso', () => {
  it('Página de Cita: el `h1` lleva cuatro `span.verso`, « en el primero y » en el último, separados por un espacio', async () => {
    const html = await leer(`/cita/${SLUG_MARTI}/`);
    const h1 = html.match(/<h1 class="texto"[^>]*>([\s\S]*?)<\/h1>/)![1];
    expect(versos(h1)).toEqual([
      '«Yo vengo de todas partes,',
      'Y hacia todas partes voy:',
      'Arte soy entre las artes,',
      'En los montes, monte soy.»',
    ]);
    expect(h1).toMatch(/<\/span> <span class="verso"/);
    expect(h1).not.toContain('\n');
  });

  it('ningún `<br>` ni « / » en el `<main>` de las dos Páginas de Cita en verso, salvo la Referencia de «Cómo citar»', async () => {
    // UX-DR116: la única salida en línea es la Referencia (30.3), y la da `enUnaLinea`; el `<br>`
    // del Fragmento (30.4) va escapado dentro de su campo, como texto, y no es marcado de la página.
    const REFERENCIA = /<p class="referencia"[^>]*>([\s\S]*?)<\/p>/g;
    for (const [slug, texto] of [[SLUG_MARTI, MARTI], [SLUG_LARGA, LARGA]]) {
      const cuerpo = main(await leer(`/cita/${slug}/`));
      const referencias = [...cuerpo.matchAll(REFERENCIA)].map((m) => m[1]);
      expect(referencias, slug).toHaveLength(3);
      for (const referencia of referencias) expect(referencia, slug).toContain(`«${enUnaLinea(texto)}».`);
      const fuera = cuerpo.replace(REFERENCIA, '');
      expect(fuera).not.toMatch(/<br\b/i);
      expect(fuera).not.toContain(' / ');
    }
  });

  it('Tarjeta de Cita del listado del Tema: los versos del fragmento, y el corte de 120 en el mismo índice', async () => {
    const html = await leer('/tema/el-tiempo/');
    const tarjeta = (slug: string) => html.match(new RegExp(`href="/cita/${slug}/"[^>]*><span class="fragmento"[^>]*>([\\s\\S]*?)</span><span class="solo`))![1];
    expect(versos(tarjeta(SLUG_MARTI))).toEqual([
      '«Yo vengo de todas partes,',
      'Y hacia todas partes voy:',
      'Arte soy entre las artes,',
      'En los montes, monte soy.»',
    ]);
    // 135 caracteres: el fragmento corta en el 119 —dentro del quinto verso— como siempre.
    expect(versos(tarjeta(SLUG_LARGA))).toEqual([
      '«De aquélla que lo ha matado.',
      'Rápida como un reflejo,',
      'Dos veces vi el alma, dos:',
      'Cuando murió el pobre viejo,',
      'Cuando ell…»',
    ]);
  });

  it('Tarjeta de Cita del listado: su texto es el visible, en orden, con «, » solo para lectores', async () => {
    const html = await leer('/tema/el-tiempo/');
    const enlace = html.match(new RegExp(`<a href="/cita/${SLUG_MARTI}/"[^>]*>([\\s\\S]*?)</a>`))![1];
    // El texto del enlace, del que sale su nombre accesible: los versos separados por el
    // espacio entre `span`, y la pausa «, » de `.solo-para-lectores` delante de cada parte.
    const texto = decodificar(enlace.replace(/<[^>]+>/g, ''));
    expect(texto).toBe(
      '«Yo vengo de todas partes, Y hacia todas partes voy: Arte soy entre las artes, En los montes, monte soy.», José Martí, Versos sencillos',
    );
    expect(enlace.match(/<span class="solo-para-lectores"[^>]*>, <\/span>/g)).toHaveLength(2);
    expect(enlace).not.toContain('\n');
  });

  it('lo copiado y compartido de la Página de Cita lleva los saltos en texto plano', async () => {
    const html = decodificar(await leer(`/cita/${SLUG_MARTI}/`));
    const plano = `«${MARTI}» — José Martí, Versos sencillos.`;
    // El respaldo del diálogo de Imagen (atributo y `textarea`) y el texto de Compartir.
    expect(html.match(/data-texto-plano="([^"]*)"/)![1]).toBe(plano);
    expect(html.match(/<textarea data-fallo-texto[^>]*>([^<]*)<\/textarea>/)![1]).toBe(plano);
    expect(html.match(/data-compartir data-texto="([^"]*)"/)![1]).toBe(plano);
  });

  it('la Cita del Día de la portada y del 404, y el material del Kit, salen verso a verso con el mismo componente', async () => {
    for (const ruta of ['/', '/404', '/kit/']) {
      const html = await leer(ruta);
      expect(versos(html), ruta).toEqual([
        '«Yo vengo de todas partes,',
        'Y hacia todas partes voy:',
        'Arte soy entre las artes,',
        'En los montes, monte soy.»',
      ]);
    }
  });

  it('título y meta descripción en una línea, con « / » y sin salto', async () => {
    const html = await leer(`/cita/${SLUG_MARTI}/`);
    const titulo = html.match(/<title>([^<]*)<\/title>/)![1];
    const meta = html.match(/<meta name="description" content="([^"]*)"/)![1];
    for (const valor of [titulo, meta]) {
      expect(valor).toContain('Yo vengo de todas partes, / Y hacia todas partes voy: / Arte soy entre las artes, / En los montes, monte soy.');
      expect(valor).not.toContain('\n');
    }
  });

  it('el recorte del título cae en el mismo índice y no deja salto ni « / » colgando antes de «…»', async () => {
    const html = await leer(`/cita/${SLUG_LARGA}/`);
    const titulo = decodificar(html.match(/<title>([^<]*)<\/title>/)![1]);
    expect(titulo).toContain(
      '«De aquélla que lo ha matado. / Rápida como un reflejo, / Dos veces vi el alma, dos: / Cuando murió el pobre viejo,…»',
    );
    expect(titulo).not.toMatch(/(\/|\s)…/);
  });

  it('el `text` del JSON-LD y la `description` del RSS van con « / »', async () => {
    const html = await leer(`/cita/${SLUG_MARTI}/`);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]) as Record<string, unknown>)
      .find((d) => d['@type'] === 'Quotation')!;
    expect(ld.text).toBe(
      'Yo vengo de todas partes, / Y hacia todas partes voy: / Arte soy entre las artes, / En los montes, monte soy.',
    );
    const rss = await readFile(join(construccion.proyecto, 'dist', 'rss.xml'), 'utf8');
    expect(rss).toContain(
      '<![CDATA[«Yo vengo de todas partes, / Y hacia todas partes voy: / Arte soy entre las artes, / En los montes, monte soy.» — José Martí]]>',
    );
  });

  it('Pagefind la encuentra por la primera palabra de un verso, «arte»', async () => {
    const indice = await indiceDe(construccion.proyecto);
    try {
      const { results } = await indice.search('arte');
      const urls = await Promise.all(results.map(async (r) => (await r.data()).url));
      expect(urls).toContain(`/cita/${SLUG_MARTI}/`);
    } finally {
      indice.soltar();
    }
  });

  it('la de prosa: el `h1` es `«…»` byte a byte, como antes, sin ningún `span.verso`', async () => {
    const html = await leer(`/cita/${SLUG_PROSA}/`);
    expect(html).toMatch(new RegExp(`<h1 class="texto"( data-astro-cid-[a-z0-9]+)?>«${PROSA}»</h1>`));
    expect(html).not.toContain('class="verso"');
  });
});

describe('Historia 29.3 — una Tarjeta Social en verso que no cabe ni en `sm` para la construcción', () => {
  /** Nueve versos de *Versos sencillos* I, 235 caracteres: a 32 px piden 9 · 42 + 128 + 160 = 666 px. */
  const NUEVE =
    'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.\nYo sé los nombres extraños\nDe las yerbas y las flores,\nY de mortales engaños,\nY de sublimes dolores.\nYo he visto en la noche oscura';
  const SLUG = 'jose-marti-yo-vengo-de-todas-partes-nueve';

  it('el build se para nombrando la Cita', async () => {
    const corpus: Record<string, string> = {
      'autores/jose-marti.yml': AUTOR_MARTI,
      'temas/el-tiempo.yml': 'nombre: El tiempo\n',
      [FICHERO_DEL_CENSO]: 'citas: []\n',
      [DOC_MARTI]: await readFile(join(FIXTURES, 'wikisource-es--versos-sencillos--versos-sencillos-i.txt'), 'utf8'),
      'citas/jose-marti--yo-vengo-de-todas-partes-nueve.md': deMarti(SLUG, NUEVE),
    };
    const { codigo, salida } = await construirConCorpus(corpus, { conservar: false });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(`Tarjeta Social de «${SLUG}»`);
    expect(salida).toMatch(/no cabe en 630 px ni con el tramo más pequeño/);
  }, 600_000);
});
