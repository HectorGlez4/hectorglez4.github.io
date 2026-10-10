import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
import { obrasDelCorpusEnDisco } from '../../integraciones/indexables.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { rutaDeLaObra } from '../../src/lib/obras.ts';

/**
 * Historia 22.4 — la Obra tiene página, y solo se indexa si no repite otra (FR-52).
 *
 * Lo que se ve en `dist/`: la página, su `noindex`, el sitemap, la marca de Pagefind, la
 * Atribución enlazada, los `@id` compartidos, la Cabecera, los Temas y la paginación. La regla
 * pura está en `obra-indexable.test.ts`.
 *
 * El corpus:
 *
 *   · Séneca, 55 Citas: «Sobre la brevedad de la vida» 51 (el 93 %, no se indexa, y pagina),
 *     «Cartas a Lucilio» 3 (se indexa) y «De la ira» 1 (una sola Cita, no se indexa).
 *   · Epicteto, 10 Citas, todas traducidas y sin Temas: «Enquiridión» 9 (el 90 % exacto, no se
 *     indexa) y «Disertaciones» 1. La segunda construcción le da a «Disertaciones» dos Citas más
 *     —9 de 12— y el «Enquiridión» pasa a indexarse sin tocar su ficha.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const EPICTETO = [
  'nombre: Epicteto',
  'añoNacimiento: 50',
  'añoFallecimiento: 135',
  'semblanza: Filósofo estoico griego.',
  '',
].join('\n');

const BREVEDAD = '/obra/seneca/sobre-la-brevedad-de-la-vida/';
const CARTAS = '/obra/seneca/cartas-a-lucilio/';
const IRA = '/obra/seneca/de-la-ira/';
const ENQUIRIDION = '/obra/epicteto/enquiridion/';
const DISERTACIONES = '/obra/epicteto/disertaciones/';
const SITIO = 'https://sabiduriadebolsillo.net';

const fuente = (pagina: string) => ({ id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${pagina}` });

function citasDeSeneca(): Record<string, string> {
  const corpus: Record<string, string> = {};
  for (let i = 0; i < 51; i += 1) {
    corpus[`citas/seneca--brevedad-${i}.md`] = citaValida({
      slug: `seneca-brevedad-${i}`,
      texto: `La brevedad ${i}: la vida es larga si se sabe usar, dijo el filósofo.`,
      temas: i < 20 ? ['el-tiempo', 'la-vida'] : ['el-tiempo'],
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
      fuente: fuente('Sobre_la_brevedad_de_la_vida'),
    });
  }
  // «Cartas a Lucilio»: La vida en las tres, El tiempo en una y La ira —sin publicar— en otra.
  // Por recuento el orden es La vida, El tiempo; por nombre sería el contrario.
  const temasDeCartas = [['la-vida', 'el-tiempo'], ['la-vida', 'la-ira'], ['la-vida']];
  temasDeCartas.forEach((temas, i) => {
    corpus[`citas/seneca--cartas-${i}.md`] = citaValida({
      slug: `seneca-cartas-${i}`,
      texto: `Carta ${i}: nadie se hace sabio por casualidad, y hay que aprenderlo.`,
      temas,
      procedencia: { obra: 'Cartas a Lucilio', año: 64 },
      fuente: fuente('Cartas_a_Lucilio'),
    });
  });
  corpus['citas/seneca--ira-0.md'] = citaValida({
    slug: 'seneca-ira-0',
    texto: 'La ira es una locura breve que conviene evitar siempre.',
    temas: ['el-tiempo'],
    procedencia: { obra: 'De la ira', año: 41 },
    fuente: fuente('De_la_ira'),
  });
  return corpus;
}

function citasDeEpicteto(disertaciones: number): Record<string, string> {
  const corpus: Record<string, string> = {};
  const traducida = (obra: string) => ({ obra, traduccion: { traductor: 'Pablo de Prado', año: 1888 } });
  for (let i = 0; i < 9; i += 1) {
    corpus[`citas/epicteto--enquiridion-${i}.md`] = citaValida({
      autor: 'epicteto',
      slug: `epicteto-enquiridion-${i}`,
      texto: `Enquiridión ${i}: unas cosas dependen de nosotros y otras no.`,
      temas: [],
      procedencia: traducida('Enquiridión'),
      fuente: fuente('Enquiridion'),
    });
  }
  for (let i = 0; i < disertaciones; i += 1) {
    corpus[`citas/epicteto--disertaciones-${i}.md`] = citaValida({
      autor: 'epicteto',
      slug: `epicteto-disertaciones-${i}`,
      texto: `Disertación ${i}: no son las cosas las que nos perturban.`,
      temas: [],
      procedencia: traducida('Disertaciones'),
      fuente: fuente('Disertaciones'),
    });
  }
  return corpus;
}

function corpus(disertaciones: number): Record<string, string> {
  return {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/epicteto.yml': EPICTETO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'temas/la-vida.yml': 'nombre: La vida\n',
    'temas/la-ira.yml': 'nombre: La ira\n',
    ...citasDeSeneca(),
    ...citasDeEpicteto(disertaciones),
  };
}

/** Lo que el sitemap construido anuncia, como rutas con barra final. */
async function anunciadas(proyecto: string): Promise<string[]> {
  const xml = await readFile(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

/**
 * Sonda: las Obras que el empaquetado de las páginas da por publicadas e indexables, con la
 * misma llamada que hace el armazón. Se compara con lo que calcula la integración de disco.
 */
const SONDA = `---
import { conjuntoPublicable, obrasPublicadas, rutasIndexables } from '../lib/publicado.ts';
import { rutaDeLaObra } from '../lib/obras.ts';
const conjunto = await conjuntoPublicable();
const datos = {
  publicadas: obrasPublicadas(conjunto).map((o) => rutaDeLaObra(o)),
  indexables: rutasIndexables(conjunto).filter((r) => r.startsWith('/obra/')),
};
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><pre id="obras">{JSON.stringify(datos)}</pre></body></html>
`;

/** Una ruta como literal de expresión regular: `/obra/…/` lleva barras y puede llevar puntos. */
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const html = (proyecto: string, ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');
const NOINDEX = /<meta name="robots" content="noindex, follow"/;

/**
 * La sección «Dónde leer esta obra» entera, con su `</section>` de cierre: lleva otra `section`
 * dentro —la parte de la edición cotejada—, así que no basta con el primer cierre.
 */
function seccionDondeLeer(pagina: string): string {
  const inicio = pagina.indexOf('<section class="donde-leer"');
  if (inicio === -1) return '';
  const etiquetas = /<section\b|<\/section>/g;
  etiquetas.lastIndex = inicio;
  let profundidad = 0;
  for (let m = etiquetas.exec(pagina); m !== null; m = etiquetas.exec(pagina)) {
    profundidad += m[0] === '</section>' ? -1 : 1;
    if (profundidad === 0) return pagina.slice(inicio, m.index + m[0].length);
  }
  return '';
}

/** Las líneas de la sección, sin el enlace ni los espacios del marcado. */
const lineasDe = (donde: string) =>
  [...donde.matchAll(/<p class="linea[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  );
const EN_PAGEFIND = /<main[^>]*data-pagefind-body/;

function jsonLd(pagina: string): Record<string, unknown>[] {
  return [...pagina.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as Record<string, unknown>,
  );
}

describe('Historia 22.4 — la Página de Obra, construida', () => {
  let proyecto = '';
  let salida = '';

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpus(1), { paginas: { 'sonda.astro': SONDA } });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    salida = resultado.salida;
  }, 300_000);

  it('el registro del build da las cifras y la comprobación final pasa', () => {
    expect(salida).toContain('5 Obras publicadas, 1 indexable.');
    expect(salida).toMatch(/El sitemap, los `noindex` y Pagefind coinciden/);
  });

  it('la lista de la integración y la del armazón coinciden para el mismo corpus', async () => {
    const sonda = await html(proyecto, '/sonda/');
    const delArmazon = JSON.parse(
      (/<pre id="obras">([\s\S]*?)<\/pre>/.exec(sonda)?.[1] ?? '{}').replace(/&quot;/g, '"'),
    ) as { publicadas: string[]; indexables: string[] };
    const deDisco = await obrasDelCorpusEnDisco(proyecto);
    const ordenar = (lista: readonly string[]) => [...lista].sort();
    expect(ordenar(delArmazon.publicadas)).toEqual(ordenar(deDisco.publicadas.map((o) => rutaDeLaObra(o))));
    expect(ordenar(delArmazon.indexables)).toEqual(ordenar(deDisco.indexables.map((o) => rutaDeLaObra(o))));
    // Y no por vacías: el corpus trae cinco Obras y una indexable.
    expect(delArmazon.publicadas).toHaveLength(5);
    expect(delArmazon.indexables).toEqual([CARTAS]);
  });

  it('indexable: sin `noindex`, en el sitemap y en Pagefind', async () => {
    const pagina = await html(proyecto, CARTAS);
    expect(pagina).not.toMatch(NOINDEX);
    expect(pagina).toMatch(EN_PAGEFIND);
    expect(pagina).toContain('data-pagefind-meta="tipo:obra"');
    expect(await anunciadas(proyecto)).toContain(CARTAS);
  });

  it.each([
    ['una sola Cita', IRA],
    ['casi todo el Autor (93 %)', BREVEDAD],
    ['el 90 % exacto', ENQUIRIDION],
    ['una sola Cita, traducida', DISERTACIONES],
  ])('no indexable (%s): la misma página, con `noindex, follow`, fuera del sitemap y de Pagefind', async (_caso, ruta) => {
    const pagina = await html(proyecto, ruta);
    expect(pagina).toMatch(NOINDEX);
    expect(pagina).not.toMatch(EN_PAGEFIND);
    expect(pagina).toMatch(/<h1[^>]*>/);
    expect(await anunciadas(proyecto)).not.toContain(ruta);
  });

  it('pestaña y descripción: «frases»; el cuerpo, «citas» y ninguna prosa', async () => {
    const pagina = await html(proyecto, CARTAS);
    expect(pagina).toContain('<title>Frases de Séneca en Cartas a Lucilio | Sabiduría de Bolsillo</title>');
    expect(pagina).toContain(
      '<meta name="description" content="3 frases de Séneca en Cartas a Lucilio (64), con su procedencia documentada.">',
    );
    const ira = await html(proyecto, IRA);
    expect(ira).toContain('content="1 frase de Séneca en De la ira (41), con su procedencia documentada."');
  });

  it('la Cabecera: el título en el h1 y «de {Autor} · {año}», con el punto oculto al lector', async () => {
    const pagina = await html(proyecto, CARTAS);
    expect(pagina).toMatch(/<h1[^>]*>Cartas a Lucilio<\/h1>/);
    expect(pagina).toMatch(
      /<p class="de"[^>]*>de <a href="\/autor\/seneca\/"[^>]*>Séneca<\/a><span aria-hidden="true"[^>]*> · <\/span><span class="oculto"[^>]*>, <\/span>64<\/p>/,
    );
  });

  it('una Obra con solo el año de su traducción: sin año ni traductor en la Cabecera', async () => {
    const pagina = await html(proyecto, ENQUIRIDION);
    const de = /<p class="de"[^>]*>([\s\S]*?)<\/p>/.exec(pagina)?.[1] ?? '';
    expect(de.replace(/<[^>]+>/g, '')).toBe('de Epicteto');
    expect(de).not.toContain('1888');
    expect(de).not.toContain('Pablo de Prado');
  });

  it('el listado: Tarjetas sin el Autor, en el orden de la Página de Autor', async () => {
    const pagina = await html(proyecto, CARTAS);
    const listado = /<ul class="listado"[^>]*>([\s\S]*?)<\/ul>/.exec(pagina)?.[1] ?? '';
    const enlaces = [...listado.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(enlaces).toEqual(['/cita/seneca-cartas-0/', '/cita/seneca-cartas-1/', '/cita/seneca-cartas-2/']);
    expect(listado).not.toContain('class="autor"');
  });

  it('los Temas: solo los publicados, por recuento de la Obra, sin recuento visible', async () => {
    const pagina = await html(proyecto, CARTAS);
    const temas = /<section class="temas"[\s\S]*?<\/section>/.exec(pagina)?.[0] ?? '';
    expect(temas).toMatch(/<h2[^>]*>Temas<\/h2>/);
    const chips = [...temas.matchAll(/class="chip" href="([^"]+)"/g)].map((m) => m[1]);
    expect(chips).toEqual(['/tema/la-vida/', '/tema/el-tiempo/']);
    expect(temas).not.toContain('La ira');
    expect(temas.replace(/<[^>]+>/g, '')).not.toMatch(/\d/u);
  });

  it('sin Temas publicados: ni rótulo ni hueco', async () => {
    const pagina = await html(proyecto, ENQUIRIDION);
    expect(pagina).not.toContain('class="temas"');
    expect(pagina).not.toContain('temas-de-la-obra');
  });

  it('paginada: la 2 solo con Cabecera y Listado, y `noindex` por forma', async () => {
    const segunda = await html(proyecto, `${BREVEDAD}2/`);
    expect(segunda).toMatch(NOINDEX);
    expect(segunda).not.toMatch(EN_PAGEFIND);
    expect(segunda).toMatch(/<h1[^>]*>Sobre la brevedad de la vida<\/h1>/);
    expect(segunda).toContain('class="listado"');
    expect(segunda).not.toContain('class="temas"');
    expect(segunda).toContain('— página 2 | Sabiduría de Bolsillo</title>');
    expect(segunda).toMatch(/<meta name="description" content="[^"]*documentada\. Página 2\.">/);
    // Y la primera sí lleva sus Temas.
    expect(await html(proyecto, BREVEDAD)).toContain('class="temas"');
  });

  it('la Atribución enlaza el título a la Página de Obra, también si no se indexa', async () => {
    for (const [cita, ruta, linea] of [
      ['seneca-cartas-0', CARTAS, 'Cartas a Lucilio</a>, 64.'],
      ['seneca-ira-0', IRA, 'De la ira</a>, 41.'],
    ]) {
      const pagina = await html(proyecto, `/cita/${cita}/`);
      expect(pagina, cita).toMatch(new RegExp(`<p class="procedencia"[^>]*><a href="${ruta}"[^>]*>${linea}</p>`));
    }
  });

  it('el nombre, el título y «de {Autor}» llevan la misma clase de enlace en tinta — 22.5', async () => {
    // Historia 22.5 — un solo criterio (`.enlace-en-tinta`, en tokens.css) para los tres, y
    // el resto de la línea fuera del enlace.
    const cita = await html(proyecto, '/cita/seneca-cartas-0/');
    expect(cita).toMatch(/<p class="autor"[^>]*>\s*<a href="\/autor\/seneca\/" class="enlace-en-tinta"[^>]*>Séneca<\/a>/);
    expect(cita).toMatch(
      new RegExp(
        `<p class="procedencia"[^>]*><a href="${escapar(CARTAS)}" class="enlace-en-tinta"[^>]*>Cartas a Lucilio</a>, 64\\.</p>`,
      ),
    );
    const obra = await html(proyecto, CARTAS);
    expect(obra).toMatch(/<p class="de"[^>]*>de <a href="\/autor\/seneca\/" class="enlace-en-tinta"[^>]*>Séneca<\/a>/);
  });

  /*
   * Historia 22.5 — la guardia que corre en CI. Las pruebas de punta a punta miden el subrayado y
   * las zonas de toque a 360 px, pero el CI no las ejecuta; esto lee la hoja de estilos que el
   * build emite —en línea, en los `<style>` de cada página— y fija lo que las sostiene: la regla
   * compartida, que ninguna regla de componente la pise, y los rellenos decididos.
   */
  describe('la hoja emitida — 22.5', () => {
    /** Las reglas de la página como `selector → cuerpo`, sin el atributo de ámbito de Astro. */
    async function reglas(ruta: string): Promise<{ selector: string; cuerpo: string }[]> {
      const pagina = await html(proyecto, ruta);
      return [...pagina.matchAll(/<style>([\s\S]*?)<\/style>/g)].flatMap((m) =>
        [...m[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((r) => ({
          selector: r[1].replace(/\[data-astro-cid-[\w-]+\]/g, '').trim(),
          cuerpo: r[2],
        })),
      );
    }
    const declaraciones = (cuerpo: string) =>
      new Map(
        cuerpo
          .split(';')
          .filter((d) => d.includes(':'))
          .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()] as const),
      );

    it('existe `.enlace-en-tinta`: tinta, subrayado y grosor del filete', async () => {
      for (const ruta of ['/cita/seneca-cartas-0/', CARTAS]) {
        const regla = (await reglas(ruta)).find((r) => r.selector === '.enlace-en-tinta');
        expect(regla, ruta).toBeDefined();
        const d = declaraciones(regla!.cuerpo);
        expect(d.get('color'), ruta).toBe('var(--tinta)');
        expect(d.get('text-decoration-line') ?? d.get('text-decoration'), ruta).toMatch(/^underline\b/);
        expect(d.get('text-decoration-thickness'), ruta).toBe('var(--grosor-filete)');
      }
    });

    it('ninguna regla de `.autor a`, `.procedencia a` ni `.de a` fija color ni subrayado', async () => {
      const todas = [...(await reglas('/cita/seneca-cartas-0/')), ...(await reglas(CARTAS))];
      const delEnlace = todas.filter((r) =>
        r.selector.split(',').some((s) => /^\.(autor|procedencia|de) a(:[\w-]+)?$/.test(s.trim())),
      );
      // Las tres existen —si no, la prueba no miraría nada—.
      for (const selector of ['.autor a', '.procedencia a', '.de a']) {
        expect(delEnlace.some((r) => r.selector === selector), selector).toBe(true);
      }
      for (const regla of delEnlace) {
        const fijadas = [...declaraciones(regla.cuerpo).keys()].filter(
          (p) => p === 'color' || p.startsWith('text-decoration'),
        );
        expect(fijadas, regla.selector).toEqual([]);
      }
      // Y ningún subrayado que dependa del cursor.
      expect(delEnlace.map((r) => r.selector)).not.toContain('.autor a:hover');
    });

    it('los rellenos decididos: 24 + 2 en el nombre, 5 por lado en el título y 10 + 10 en «de»', async () => {
      const todas = [...(await reglas('/cita/seneca-cartas-0/')), ...(await reglas(CARTAS))];
      const de = (selector: string) => declaraciones(todas.find((r) => r.selector === selector)?.cuerpo ?? '');
      expect(de('.autor a').get('padding-block')).toBe(
        'calc(var(--zona-de-toque) / 2 + var(--unidad) / 4) calc(var(--unidad) / 4)',
      );
      expect(de('.autor a').get('margin-block')).toBe(
        'calc(var(--zona-de-toque) / -2 - var(--unidad) / 4) calc(var(--unidad) / -4)',
      );
      expect(de('.procedencia a').get('padding')).toBe('calc(var(--unidad) * 5 / 8)');
      expect(de('.procedencia a').get('margin-inline')).toBe('calc(var(--unidad) * -5 / 8)');
      // Relleno en cada fragmento de un título partido: sin él, el anillo de foco corta letras.
      expect(de('.procedencia a').get('box-decoration-break')).toBe('clone');
      expect(de('.procedencia a:focus-visible').get('outline-offset')).toBe('calc(var(--unidad) / -2)');
      expect(de('.de a').get('padding-block')).toBe('calc((var(--zona-de-toque) - var(--cuerpo-md) * 1.6) / 2)');
    });
  });

  it('JSON-LD: el `isPartOf` de la Cita y el `about` de la Obra comparten `@id`', async () => {
    const obra = jsonLd(await html(proyecto, CARTAS)).find((b) => b['@type'] === 'CollectionPage');
    const cita = jsonLd(await html(proyecto, '/cita/seneca-cartas-0/')).find((b) => b['@type'] === 'Quotation');
    const about = obra?.about as Record<string, unknown>;
    expect(about).toEqual({
      '@type': 'Book',
      '@id': `${SITIO}${CARTAS}`,
      name: 'Cartas a Lucilio',
      author: { '@id': `${SITIO}/autor/seneca/#persona` },
      datePublished: '64',
    });
    expect((cita?.isPartOf as Record<string, unknown>)['@id']).toBe(about['@id']);
    // La canónica de la Obra es la suya; la de la Cita, su Página de Cita.
    expect(obra?.['@id']).toBe(`${SITIO}${CARTAS}`);
    expect(cita?.['@id']).toBe(`${SITIO}/cita/seneca-cartas-0/`);
    expect((obra?.mainEntity as { numberOfItems: number }).numberOfItems).toBe(3);
  });

  it('las páginas 2+ comparten el `@id` de la obra, el de su página 1', async () => {
    const segunda = jsonLd(await html(proyecto, `${BREVEDAD}2/`)).find((b) => b['@type'] === 'CollectionPage');
    expect((segunda?.about as Record<string, unknown>)['@id']).toBe(`${SITIO}${BREVEDAD}`);
    expect(segunda?.['@id']).toBe(`${SITIO}${BREVEDAD}2/`);
  });

  it('el título lleva el token propio y ningún literal de color ni tipografía', async () => {
    const tokens = await readFile(join(RAIZ, 'src/styles/tokens.css'), 'utf8');
    expect(tokens).toMatch(/--titular-obra:\s*26px;/);
    const fuente = await readFile(join(RAIZ, 'src/pages/obra/[autor]/[slug]/[...page].astro'), 'utf8');
    const estilo = /<style>([\s\S]*?)<\/style>/.exec(fuente)?.[1] ?? '';
    expect(estilo).toContain('font-size: var(--titular-obra)');
    // Colores y familias solo por token: ni `#hex`, ni `rgb(`, ni una familia escrita.
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(|hsla?\(/u);
    for (const familia of estilo.matchAll(/font-family:\s*([^;]+);/gu)) {
      expect(familia[1].trim()).toMatch(/^var\(--[a-z-]+\)$/u);
    }
  });

  /*
   * Historia 22.6 — «Dónde leer esta obra» en el corpus de arriba: todas las Citas con Fuente,
   * sin nombre ni licencia —el andamio no los declara—, así que la línea lleva el anfitrión.
   */
  describe('22.6 — «Dónde leer esta obra»', () => {
    const seccion = seccionDondeLeer;
    const lineas = (pagina: string) =>
      [...seccion(pagina).matchAll(/<p class="linea[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].trim());

    it('un documento: el h2, el rótulo y una línea con el nombre de la Fuente enlazado', async () => {
      const pagina = await html(proyecto, CARTAS);
      const donde = seccion(pagina);
      expect(donde).toMatch(/<section class="donde-leer"[^>]*aria-labelledby="donde-leer-esta-obra"/);
      expect(donde).toMatch(/<h2 class="rotulo" id="donde-leer-esta-obra"[^>]*>Dónde leer esta obra<\/h2>/);
      expect(donde).toMatch(/<section class="donde-leer"[^>]*data-pagefind-ignore/);
      expect(donde).toMatch(/<section class="parte[^"]*"[^>]*aria-labelledby="edicion-cotejada"/);
      expect(donde).toMatch(/<h3 id="edicion-cotejada"[^>]*>Edición cotejada, gratuita<\/h3>/);
      const todas = lineas(pagina);
      expect(todas).toHaveLength(1);
      expect(todas[0]).toMatch(
        /^<a href="https:\/\/es\.wikisource\.org\/wiki\/Cartas_a_Lucilio" rel="noopener nofollow"[^>]*>es\.wikisource\.org<\/a>\.$/,
      );
      // Sin licencia declarada no hay «Licencia», ni recuento de Citas sin documento.
      expect(donde).not.toContain('Licencia');
      expect(donde).not.toContain('documento cotejado');
    });

    it('traducción: «…, en la traducción de {traductor} ({año}).»', async () => {
      const [linea] = lineas(await html(proyecto, ENQUIRIDION));
      expect(linea.replace(/<[^>]+>/g, '')).toBe('es.wikisource.org, en la traducción de Pablo de Prado (1888).');
    });

    it('va después del Listado, la Paginación y los Temas, nunca entre las Citas', async () => {
      const pagina = await html(proyecto, BREVEDAD);
      const posicion = (marca: string) => pagina.indexOf(marca);
      expect(posicion('class="listado"')).toBeGreaterThan(-1);
      expect(posicion('class="paginacion"')).toBeGreaterThan(posicion('class="listado"'));
      expect(posicion('class="temas"')).toBeGreaterThan(posicion('class="paginacion"'));
      expect(posicion('class="donde-leer"')).toBeGreaterThan(posicion('class="temas"'));
    });

    it('página 2: ni la sección ni la nota', async () => {
      const segunda = await html(proyecto, `${BREVEDAD}2/`);
      // Marcado, no estilos: Astro emite la hoja de un componente importado aunque no se pinte.
      expect(segunda).not.toContain('<section class="donde-leer"');
      expect(segunda).not.toContain('Dónde leer esta obra');
      expect(segunda).not.toContain('class="nota-de-la-ficha"');
    });

    it('sin nota en la ficha: ni el párrafo ni su filete', async () => {
      expect(await html(proyecto, CARTAS)).not.toContain('class="nota-de-la-ficha"');
    });

    it('el ritmo y los colores, con tokens y sin literales', async () => {
      const fuente = await readFile(join(RAIZ, 'src/components/DondeLeer.astro'), 'utf8');
      const estilo = /<style>([\s\S]*?)<\/style>/.exec(fuente)?.[1] ?? '';
      expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(|hsla?\(|\d+px/u);
      for (const familia of estilo.matchAll(/font-family:\s*([^;]+);/gu)) {
        expect(familia[1].trim()).toMatch(/^var\(--[a-z-]+\)$/u);
      }
      expect(estilo).toContain('margin-top: calc(var(--unidad) * 4)');
      expect(estilo).toContain('margin-top: calc(var(--unidad) * 2)');
      // Un solo `.rotulo` para «Temas» y «Dónde leer»: el de `Rotulo.astro`.
      expect(estilo).not.toContain('.rotulo');
      // Las ediciones en venta (22.9) no dejan nada: ni regla, ni contenedor.
      expect(fuente.slice(fuente.indexOf("---", 3))).not.toMatch(/venta|ediciones/iu);
      const pagina = await readFile(join(RAIZ, 'src/pages/obra/[autor]/[slug]/[...page].astro'), 'utf8');
      expect(pagina).toContain('margin-top: calc(var(--unidad) * 5)');
      expect(pagina).not.toMatch(/\.rotulo\s*\{/);
      expect(pagina).toContain('<Rotulo id="temas-de-la-obra">Temas</Rotulo>');
    });
  });

  describe('se corrige sola', () => {
    let segundo = '';

    beforeAll(async () => {
      // El mismo Corpus con dos Citas más de «Disertaciones»: el «Enquiridión» queda en 9 de 12.
      const resultado = await construirConCorpus(corpus(3));
      aLimpiar.push(resultado.proyecto);
      expect(resultado.codigo, resultado.salida).toBe(0);
      segundo = resultado.proyecto;
      expect(resultado.salida).toContain('5 Obras publicadas, 3 indexables.');
    }, 300_000);

    it('el «Enquiridión» pasa a indexable sin tocar su ficha', async () => {
      expect(await html(proyecto, ENQUIRIDION)).toMatch(NOINDEX);
      const ahora = await html(segundo, ENQUIRIDION);
      expect(ahora).not.toMatch(NOINDEX);
      expect(ahora).toMatch(EN_PAGEFIND);
      expect(await anunciadas(segundo)).toContain(ENQUIRIDION);
      expect(await anunciadas(segundo)).toContain(DISERTACIONES);
    });

    it('y las fichas son las mismas en las dos construcciones', async () => {
      const ficha = 'corpus/obras/epicteto--enquiridion.yml';
      expect(existsSync(join(proyecto, ficha))).toBe(true);
      expect(await readFile(join(segundo, ficha), 'utf8')).toBe(await readFile(join(proyecto, ficha), 'utf8'));
    });
  });
});

describe('Historia 22.4 — lo que rompe el build', () => {
  it('si el sitemap, los `noindex` y Pagefind no coinciden, rompe y nombra las rutas', async () => {
    /*
     * La instancia de la configuración declara una lista distinta de la que usa el armazón:
     * todas las Obras en vez de las indexables. El sitemap anuncia así una Obra que su página
     * declara `noindex`, que es justo el desajuste que la comprobación existe para parar.
     */
    const original = await readFile(join(RAIZ, 'integraciones/indexables.ts'), 'utf8');
    const parcheada = original.replace(
      'declararRutasIndexables(indexables.map((obra) => rutaDeLaObra(obra)));',
      'declararRutasIndexables(publicadas.map((obra) => rutaDeLaObra(obra)));',
    );
    const resultado = await construirConCorpus(
      {
        'autores/seneca.yml': AUTOR_VALIDO,
        'temas/el-tiempo.yml': TEMA_VALIDO,
        'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
      },
      { ficheros: { 'integraciones/indexables.ts': parcheada } },
    );
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toContain('en el sitemap y con `noindex`: /obra/seneca/sobre-la-brevedad-de-la-vida');
    expect(resultado.salida).toContain('no coinciden');
  }, 300_000);

  it('una ficha con slug de obra numérico rompe el build', async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'obras/seneca--1984.yml': 'autor: seneca\ntitulo: "1984"\nformas:\n  - "1984"\n',
      'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida({
        procedencia: { obra: '1984', año: 49 },
        fuente: fuente('1984'),
      }),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toContain('corpus/obras/seneca--1984.yml');
    expect(resultado.salida).toContain('solo un número');
  }, 300_000);
});

/*
 * Historia 22.6 — los estados de «Dónde leer esta obra» y la nota, construidos. Las Citas sin
 * documento tienen que estar en el censo de cotejo, y con el censo en el fixture el andamio
 * deja de sembrar documentos: los dos que hacen falta se escriben aquí, a la vista.
 *
 *   · «Sobre la brevedad de la vida»: 2 cotejadas en Wikisource —con nombre y licencia— y 1 sin
 *     documento (d, singular). Su ficha trae nota.
 *   · «Cartas a Lucilio»: 1 cotejada y 2 sin documento (d, plural).
 *   · «De la ira»: 1 sin documento (c).
 */
describe('Historia 22.6 — «Dónde leer esta obra» y la nota, construidas', () => {
  const NOTA = 'Diálogo dirigido a Paulino, prefecto de la annona, sobre el uso del tiempo.';
  const WS = { id: 'wikisource-es', nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0' };
  const URL_BREVEDAD = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
  const URL_CARTAS = 'https://es.wikisource.org/wiki/Cartas_a_Lucilio';

  const cotejada = (slug: string, texto: string, obra: string, url: string) =>
    citaValida({ slug, texto, procedencia: { obra, año: 49 }, fuente: { ...WS, url } });
  const sinDocumento = (slug: string, texto: string, obra: string) =>
    citaValida({ slug, texto, procedencia: { obra, año: 49 }, fuente: undefined });
  const documento = (obra: string, url: string, textos: string[]) =>
    componerDocumento({ fuente: 'wikisource-es', obra, url, recuperado: '2026-08-21' }, obra, textos.join('\n\n'));

  const B1 = 'La vida es larga si se sabe emplear bien.';
  const B2 = 'Nadie te devolverá los años perdidos.';
  const C1 = 'Nadie se hace sabio por casualidad.';
  const E1 = 'Aprende a querer lo que tienes.';
  const E2 = 'El que está en todas partes no está en ninguna.';
  const D1 = 'El fuego prueba el oro; la desgracia, al hombre fuerte.';
  const D2 = 'Al sabio no le alcanza ni la injuria ni la afrenta.';
  const URL_EPISTOLAS = 'https://es.wikisource.org/wiki/Epistolas_morales';
  const URL_PROVIDENCIA = 'https://es.wikisource.org/wiki/De_la_providencia';
  const URL_CONSTANCIA = 'https://es.wikisource.org/wiki/De_la_constancia_del_sabio';
  // El censo es cerrado (11.2): solo admite slugs del censo de partida, así que las Citas sin
  // documento son cuatro de las de Séneca que de verdad están en él.
  const BREVEDAD_SIN = 'seneca-la-vida-si-sabes-usarla-es-larga';
  const CARTAS_SIN_1 = 'seneca-mientras-esperamos-vivir-la-vida-pasa';
  const CARTAS_SIN_2 = 'seneca-ninguna-cosa-se-parece-tanto-a-la';
  const IRA_SIN = 'seneca-no-hay-viento-favorable-para-el-que';
  const CENSADAS = [BREVEDAD_SIN, CARTAS_SIN_1, CARTAS_SIN_2, IRA_SIN];
  const fichero = (slug: string) => `citas/${slug.replace(/^seneca-/, 'seneca--')}.md`;

  let proyecto = '';

  beforeAll(async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'pendientes-de-cotejo.yml': `citas:\n${CENSADAS.map((s) => `  - ${s}\n`).join('')}`,
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml':
        'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n' +
        `nota: "${NOTA}"\n`,
      'citas/seneca--brevedad-1.md': cotejada('seneca-brevedad-1', B1, 'Sobre la brevedad de la vida', URL_BREVEDAD),
      'citas/seneca--brevedad-2.md': cotejada('seneca-brevedad-2', B2, 'Sobre la brevedad de la vida', URL_BREVEDAD),
      [fichero(BREVEDAD_SIN)]: sinDocumento(BREVEDAD_SIN, 'La vida, si sabes usarla, es larga.', 'Sobre la brevedad de la vida'),
      'citas/seneca--cartas-1.md': cotejada('seneca-cartas-1', C1, 'Cartas a Lucilio', URL_CARTAS),
      [fichero(CARTAS_SIN_1)]: sinDocumento(CARTAS_SIN_1, 'Mientras esperamos vivir, la vida pasa.', 'Cartas a Lucilio'),
      [fichero(CARTAS_SIN_2)]: sinDocumento(
        CARTAS_SIN_2,
        'Ninguna cosa se parece tanto a la injusticia como la justicia tardía.',
        'Cartas a Lucilio',
      ),
      [fichero(IRA_SIN)]: sinDocumento(IRA_SIN, 'No hay viento favorable para el que no sabe adónde va.', 'De la ira'),
      'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt': documento(
        'Sobre la brevedad de la vida',
        URL_BREVEDAD,
        [B1, B2],
      ),
      'fuentes/wikisource-es--cartas-a-lucilio.txt': documento('Cartas a Lucilio', URL_CARTAS, [C1]),
      // Dos subpáginas del mismo `Padre`: tiene entrada.
      'citas/seneca--epistolas-1.md': cotejada('seneca-epistolas-1', E1, 'Epístolas morales', `${URL_EPISTOLAS}/1`),
      'citas/seneca--epistolas-2.md': cotejada('seneca-epistolas-2', E2, 'Epístolas morales', `${URL_EPISTOLAS}/2`),
      'fuentes/wikisource-es--epistolas-morales.txt': documento('Epístolas morales', `${URL_EPISTOLAS}/1`, [E1, E2]),
      // Dos páginas de primer nivel: ninguna es la entrada de la otra.
      'citas/seneca--dialogos-1.md': cotejada('seneca-dialogos-1', D1, 'Diálogos', URL_PROVIDENCIA),
      'citas/seneca--dialogos-2.md': cotejada('seneca-dialogos-2', D2, 'Diálogos', URL_CONSTANCIA),
      'fuentes/wikisource-es--dialogos.txt': documento('Diálogos', URL_PROVIDENCIA, [D1, D2]),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  }, 300_000);

  const seccion = async (ruta: string) => seccionDondeLeer(await html(proyecto, ruta));
  const lineas = lineasDe;

  it('parcial (d), en singular: la línea con su licencia y «Una de sus 3 citas…»', async () => {
    const donde = await seccion('/obra/seneca/sobre-la-brevedad-de-la-vida/');
    expect(lineas(donde)).toEqual([
      'Wikisource en español. Licencia CC BY-SA 4.0.',
      'Una de sus 3 citas no tiene documento cotejado.',
    ]);
    expect(donde).toMatch(new RegExp(`<a href="${escapar(URL_BREVEDAD)}" rel="noopener nofollow"[^>]*>Wikisource en español</a>`));
    // La frase de las Citas sin documento va después de la parte de la edición cotejada, fuera
    // de ella y a nivel de la sección.
    const parte = /<section class="parte[\s\S]*?<\/section>/.exec(donde)?.[0] ?? '';
    expect(parte).toContain('<h3');
    expect(parte).not.toContain('documento cotejado');
    const tras = donde.slice(donde.indexOf(parte) + parte.length);
    expect(tras).toMatch(/^\s*<p class="linea sin-documento"[^>]*>Una de sus 3 citas no tiene documento cotejado\.<\/p>\s*<\/section>$/);
  });

  it('repartida en subpáginas de Wikisource: la entrada de la obra, y la línea exacta', async () => {
    const donde = await seccion('/obra/seneca/epistolas-morales/');
    expect(lineasDe(donde)).toEqual(['Wikisource en español, repartida en 2 páginas. Licencia CC BY-SA 4.0.']);
    expect(donde).toMatch(/<a href="https:\/\/es\.wikisource\.org\/wiki\/Epistolas_morales" rel="noopener nofollow"/);
  });

  it('sin entrada derivable: la línea va sin enlace', async () => {
    const donde = await seccion('/obra/seneca/dialogos/');
    expect(lineasDe(donde)).toEqual(['Wikisource en español, repartida en 2 páginas. Licencia CC BY-SA 4.0.']);
    expect(donde).not.toContain('<a');
  });

  it('parcial (d), en plural: «2 de sus 3 citas no tienen documento cotejado.»', async () => {
    const donde = await seccion('/obra/seneca/cartas-a-lucilio/');
    expect(lineas(donde)).toEqual([
      'Wikisource en español. Licencia CC BY-SA 4.0.',
      '2 de sus 3 citas no tienen documento cotejado.',
    ]);
  });

  it('sin cotejo (c): bajo el h2, solo la frase; sin rótulo ni enlace', async () => {
    const donde = await seccion('/obra/seneca/de-la-ira/');
    expect(donde).toMatch(/<h2[^>]*>Dónde leer esta obra<\/h2>/);
    expect(lineas(donde)).toEqual(['Ninguna de sus citas tiene todavía documento cotejado.']);
    expect(donde).not.toContain('<h3');
    expect(donde).not.toContain('<a ');
  });

  it('la nota: tras la sección, fuera de ella, sin encabezado; nunca en la meta', async () => {
    const pagina = await html(proyecto, '/obra/seneca/sobre-la-brevedad-de-la-vida/');
    const fin = pagina.indexOf('</section>', pagina.indexOf('class="donde-leer"'));
    const nota = pagina.indexOf('class="nota-de-la-ficha"');
    expect(fin).toBeGreaterThan(-1);
    expect(nota).toBeGreaterThan(fin);
    expect(pagina).toMatch(new RegExp(`<p class="nota-de-la-ficha"[^>]*>${escapar(NOTA)}</p>`));
    // Una sola vez: ni en la descripción, ni en `og:`, ni en los datos estructurados.
    expect(pagina.split(NOTA)).toHaveLength(2);
    expect(/<meta name="description" content="([^"]*)"/.exec(pagina)?.[1]).not.toContain('Paulino');
    // Las Obras sin nota no la llevan.
    expect(await html(proyecto, '/obra/seneca/cartas-a-lucilio/')).not.toContain('class="nota-de-la-ficha"');
  });
});

describe('Historia 22.6 — una nota de más de 160 caracteres', () => {
  it('rompe el build y nombra la regla', async () => {
    const resultado = await construirConCorpus({
      'autores/seneca.yml': AUTOR_VALIDO,
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml':
        'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n' +
        `nota: "${'n'.repeat(161)}"\n`,
      'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toContain('no puede pasar de 160 caracteres');
  }, 300_000);
});
