import { afterAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';

/**
 * Historia 22.3 — la obra se llama igual en todas partes, construida.
 *
 * Una ficha reúne dos grafías —«De la brevedad de la vida» y «Sobre la brevedad de la
 * vida»— con título «De la brevedad de la vida». Las dos Citas, cada una con su grafía en la
 * Procedencia, tienen que decir ese título en la Atribución, lo copiado, el JSON-LD,
 * `data-procedencia` y la Tarjeta. El año que lo acompaña es el de **cada** Cita, y como los
 * dos discrepan, el build avisa de que la Obra no publica año.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const TITULO = 'De la brevedad de la vida';
const JORNADA = '2026-10-10';
const OTRA_GRAFIA = 'Sobre la brevedad de la vida';
const RUTA_DE_OBRA = '/obra/seneca/de-la-brevedad-de-la-vida/';

const FICHA = [
  'autor: seneca',
  `titulo: ${TITULO}`,
  'formas:',
  '  - de la brevedad de la vida',
  '  - sobre la brevedad de la vida',
  '',
].join('\n');

const CON_TITULO = {
  slug: 'seneca-no-es-que-tengamos-poco-tiempo',
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  año: 49,
};
const CON_OTRA = {
  slug: 'seneca-la-vida-es-larga-si-se-sabe-usar',
  texto: 'La vida es larga si se sabe usar.',
  año: 55,
};

/** Sonda: lo que la Tarjeta Social de cada Cita lleva escrito, antes de rasterizarlo. */
const SONDA = `---
import { getStaticPaths } from './tarjeta/[slug].png.ts';
const rutas = await getStaticPaths();
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><pre id="tarjetas">{JSON.stringify(rutas.map((r) => ({ slug: r.params.slug, ...r.props })))}</pre></body></html>
`;

describe('Historia 22.3 — una Obra reunida se llama igual en todas las superficies', () => {
  let proyecto = '';
  let salida = '';

  it('construye con una ficha que reúne dos grafías', async () => {
    const resultado = await construirConCorpus(
      {
        'autores/seneca.yml': AUTOR_VALIDO,
        'temas/el-tiempo.yml': TEMA_VALIDO,
        'obras/seneca--de-la-brevedad-de-la-vida.yml': FICHA,
        'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida({
          slug: CON_TITULO.slug,
          texto: CON_TITULO.texto,
          procedencia: { obra: TITULO, año: CON_TITULO.año },
          fuente: {
            id: 'wikisource-es',
            url: 'https://es.wikisource.org/wiki/De_la_brevedad_de_la_vida',
          },
        }),
        'citas/seneca--la-vida-es-larga-si-se-sabe-usar.md': citaValida({
          slug: CON_OTRA.slug,
          texto: CON_OTRA.texto,
          procedencia: { obra: OTRA_GRAFIA, año: CON_OTRA.año },
          fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Brevedad' },
          aptaParaPortada: true,
        }),
        // La Cita que declara la grafía que no es título, fijada como Cita del Día: el Kit.
        'portada.json': `${JSON.stringify({ fijaciones: { [JORNADA]: CON_OTRA.slug } }, null, 2)}\n`,
      },
      { paginas: { 'sonda.astro': SONDA }, jornada: JORNADA },
    );
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    salida = resultado.salida;
  });

  it('el build avisa de la Obra con años discrepantes, nombrando ficha y años', () => {
    expect(salida).toContain('Obra con años discrepantes');
    expect(salida).toContain('corpus/obras/seneca--de-la-brevedad-de-la-vida.yml');
    expect(salida).toContain('49, 55');
  });

  for (const cita of [CON_TITULO, CON_OTRA]) {
    describe(`la Página de Cita de «${cita.slug}»`, () => {
      const html = () => readFile(paginaConstruida(proyecto, `/cita/${cita.slug}/`), 'utf8');

      it('nunca nombra la otra grafía', async () => {
        expect(await html()).not.toContain(OTRA_GRAFIA);
      });

      it('la Atribución dice el título con el año de esta Cita', async () => {
        // Historia 22.4 — el título enlaza a la Página de Obra; el año queda fuera del enlace.
        expect(await html()).toMatch(
          new RegExp(
            `<p class="procedencia"[^>]*><a href="${RUTA_DE_OBRA}"[^>]*>${TITULO}</a>, ${cita.año}\\.</p>`,
          ),
        );
      });

      it('lo copiado dice el título con el año de esta Cita', async () => {
        expect(await html()).toContain(`Séneca, ${TITULO}, ${cita.año}.`);
      });

      it('data-procedencia lleva el título ya compuesto', async () => {
        expect(await html()).toContain(`data-procedencia="${TITULO}, ${cita.año}"`);
      });

      it('el JSON-LD describe la Obra: su título y, con años discrepantes, sin fecha', async () => {
        // `isPartOf` es la Obra, no el pasaje: su `datePublished` es el año de la Obra, que
        // aquí no consta porque sus Citas dicen 49 y 55. Nunca el año de esta Cita.
        const bloques = [
          ...(await html()).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
        ].map((m) => JSON.parse(m[1]) as { '@type'?: string; isPartOf?: unknown });
        const cita_ = bloques.find((b) => b['@type'] === 'Quotation');
        // Historia 22.4 — con el `@id` de la Página de Obra, el mismo que su `about`.
        expect(cita_?.isPartOf).toEqual({
          '@type': 'Book',
          '@id': `https://sabiduriadebolsillo.net${RUTA_DE_OBRA}`,
          name: TITULO,
        });
      });

      it('en la línea de la Atribución solo el título es enlace — 22.4', async () => {
        const linea = /<p class="procedencia"[^>]*>([\s\S]*?)<\/p>/.exec(await html())?.[1] ?? '';
        expect(linea.replace(/<[^>]+>/g, '')).toBe(`${TITULO}, ${cita.año}.`);
        expect([...linea.matchAll(/<a\b/g)]).toHaveLength(1);
        expect(linea).toMatch(new RegExp(`>${TITULO}</a>, ${cita.año}\\.$`));
      });
    });
  }

  it('la Tarjeta Social de las dos dice el título', async () => {
    const html = await readFile(paginaConstruida(proyecto, '/sonda/'), 'utf8');
    const tarjetas = JSON.parse(
      (/<pre id="tarjetas">([\s\S]*?)<\/pre>/.exec(html)?.[1] ?? '[]').replace(/&quot;/g, '"'),
    ) as { slug: string; procedencia?: string }[];
    expect(new Map(tarjetas.map((t) => [t.slug, t.procedencia]))).toEqual(
      new Map([
        [CON_TITULO.slug, `${TITULO}, ${CON_TITULO.año}`],
        [CON_OTRA.slug, `${TITULO}, ${CON_OTRA.año}`],
      ]),
    );
  });

  it('el Kit de la Cita fijada dice el título de la ficha en data-procedencia y lo copiado', async () => {
    const html = await readFile(paginaConstruida(proyecto, '/kit/'), 'utf8');
    expect(html).toContain(`data-imagen-kit="${CON_OTRA.slug}"`);
    expect(html).toContain(`data-procedencia="${TITULO}, ${CON_OTRA.año}"`);
    expect(html).toContain(`Séneca, ${TITULO}, ${CON_OTRA.año}.`);
    expect(html).not.toContain(OTRA_GRAFIA);
  });
});
