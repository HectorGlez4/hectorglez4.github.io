import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { CITAS_POR_PAGINA } from '../../src/lib/umbrales.ts';
import { componerBiografia } from '../../tools/lib/documento.ts';

/**
 * Historia 17.1 — la puerta de la revisión, puesta de verdad.
 *
 * `biografia.test.ts` prueba el criterio sin construir. Esto construye y exige que el build
 * **rompa** cuando el Autor declara una biografía que no es la revisión versionada, con el
 * patrón de `cotejo-build.test.ts`.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const DOCUMENTO = 'wikipedia-es--seneca--r123';

const BIOGRAFIA = componerBiografia(
  {
    fuente: 'wikipedia-es',
    titulo: 'Séneca',
    revision: 123,
    fechaDeRevision: '2024-05-01',
    licencia: 'CC BY-SA 4.0',
    url: 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123',
    recuperado: '2026-10-10',
  },
  'Séneca',
  'Lucio Anneo Séneca fue un filósofo hispanorromano y escritor latino.',
);

/** La semblanza que está literal en el cuerpo de `BIOGRAFIA` — Historia 17.2. */
const SEMBLANZA_LITERAL = 'Lucio Anneo Séneca fue un filósofo hispanorromano y escritor latino.';

function autorConBiografia(
  documento: string,
  revision: number,
  semblanza = SEMBLANZA_LITERAL,
): string {
  return (
    AUTOR_VALIDO.replace(/^semblanza: .*$/mu, `semblanza: ${semblanza}`) +
    `biografia:\n  documento: ${documento}\n  revision: ${revision}\n`
  );
}

const CORPUS_BASE = {
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--el-tiempo.md': citaValida(),
  [`biografias/${DOCUMENTO}.txt`]: BIOGRAFIA,
};

describe('Historia 17.1 — la revisión que declara un Autor es la versionada, o el build rompe', () => {
  it('el documento existe y es la revisión declarada: construye', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia(DOCUMENTO, 123),
    });
    expect(salida).not.toMatch(/Regla incumplida/);
    expect(codigo).toBe(0);
  });

  /*
   * El esquema exige ya que el sufijo del nombre sea la revisión declarada, así que para
   * llegar a la puerta con una revisión distinta el Autor declara la del nombre y es la
   * **cabecera** del documento la que dice otra.
   */
  it('revisión distinta: rompe nombrando el Autor, el documento y las dos revisiones', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia('wikipedia-es--seneca--r124', 124),
      'biografias/wikipedia-es--seneca--r124.txt': BIOGRAFIA,
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toContain('corpus/biografias/wikipedia-es--seneca--r124.txt');
    expect(salida).toMatch(/revisión 124/);
    expect(salida).toMatch(/revisión 123/);
    // Roto solo por la biografía: el titular la nombra y el resumen limpio no sale.
    expect(salida).toMatch(/1 incumplimiento \(es de la biografía de un Autor\)/);
    expect(salida).not.toMatch(/pendientes de cotejo/);
  });

  it('documento inexistente: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia('wikipedia-es--seneca--r999', 999),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toMatch(/wikipedia-es--seneca--r999\.txt.*no existe/s);
  });

  it('documento ilegible: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [`biografias/${DOCUMENTO}.txt`]: 'esto no es un documento\n',
      'autores/seneca.yml': autorConBiografia(DOCUMENTO, 123),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toMatch(/no tiene la forma que produce la recuperación/);
  });

  it('documento de una Fuente no mutable: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      [`biografias/wikisource-es--seneca--r123.txt`]: BIOGRAFIA.replace(
        'fuente: wikipedia-es',
        'fuente: wikisource-es',
      ),
      'autores/seneca.yml': autorConBiografia('wikisource-es--seneca--r123', 123),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no es la biografía de una Fuente mutable/);
  });

  it('nombre y cabecera discrepantes: rompe', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'biografias/wikipedia-es--lucio-anneo-seneca--r123.txt': BIOGRAFIA,
      'autores/seneca.yml': autorConBiografia('wikipedia-es--lucio-anneo-seneca--r123', 123),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(`corpus/biografias/${DOCUMENTO}.txt`);
    expect(salida).toMatch(/tienen que decir lo mismo/);
  });
});

/*
 * Historia 17.2 — la semblanza sitúa al Autor, publica su atribución, y sale de la Tarjeta.
 *
 * Un solo build para todas las filas que se ven en `dist/`: dos Autores con biografía —uno de
 * una revisión CC BY-SA 4.0 y con más de una página de Citas, otro de una revisión anterior al
 * cambio, CC BY-SA 3.0— y uno sin biografía, que tiene que quedar exactamente como antes.
 */

const HORACIO_DOCUMENTO = 'wikipedia-es--horacio--r77';
const HORACIO_URL = 'https://es.wikipedia.org/w/index.php?title=Horacio&oldid=77';
const HORACIO_SEMBLANZA = 'Quinto Horacio Flaco fue un poeta lírico latino.';
const SENECA_URL = 'https://es.wikipedia.org/w/index.php?title=S%C3%A9neca&oldid=123';
const SEMBLANZA_PROPIA = 'Emperador romano y filósofo estoico.';

/** Lo visible de un fragmento de HTML: sin etiquetas, con los espacios colapsados. */
function visible(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** El bloque de la semblanza ajena: el `<div data-pagefind-ignore>` de la ficha. */
function bloqueDeSemblanza(html: string): string {
  return /<div data-pagefind-ignore[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
}

function metaDescripcion(html: string): string {
  return /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
}

function descripcionDeLaPersona(html: string): string | undefined {
  const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  const datos = JSON.parse(json ?? '{}') as { about?: { description?: string } };
  return datos.about?.description;
}

describe('Historia 17.2 — la semblanza ajena solo donde porta su atribución', () => {
  const totalDeSeneca = CITAS_POR_PAGINA + 2;
  let proyecto: string;

  beforeAll(async () => {
    const corpus: Record<string, string> = {
      'temas/el-tiempo.yml': TEMA_VALIDO,
      [`biografias/${DOCUMENTO}.txt`]: BIOGRAFIA,
      [`biografias/${HORACIO_DOCUMENTO}.txt`]: componerBiografia(
        {
          fuente: 'wikipedia-es',
          titulo: 'Horacio',
          revision: 77,
          fechaDeRevision: '2020-03-01',
          licencia: 'CC BY-SA 3.0',
          url: HORACIO_URL,
          recuperado: '2026-10-10',
        },
        'Horacio',
        `${HORACIO_SEMBLANZA} Escribió odas y sátiras.`,
      ),
      'autores/seneca.yml': autorConBiografia(DOCUMENTO, 123),
      'autores/horacio.yml':
        `nombre: Horacio\nañoNacimiento: -65\nañoFallecimiento: -8\nsemblanza: ${HORACIO_SEMBLANZA}\n` +
        `biografia:\n  documento: ${HORACIO_DOCUMENTO}\n  revision: 77\n`,
      'autores/marco-aurelio.yml':
        `nombre: Marco Aurelio\nañoNacimiento: 121\nañoFallecimiento: 180\nsemblanza: ${SEMBLANZA_PROPIA}\n`,
      'citas/horacio--carpe-diem.md': citaValida({
        texto: 'Aprovecha el día.',
        autor: 'horacio',
        slug: 'horacio-aprovecha-el-dia',
        temas: [],
        procedencia: { obra: 'Odas', año: -23 },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Odas' },
      }),
      'citas/marco-aurelio--la-vida.md': citaValida({
        texto: 'La vida es opinión.',
        autor: 'marco-aurelio',
        slug: 'marco-aurelio-la-vida-es-opinion',
        temas: [],
        procedencia: { obra: 'Meditaciones', año: 170 },
        fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Meditaciones' },
      }),
    };
    for (let i = 0; i < totalDeSeneca; i += 1) {
      const orden = String(i).padStart(3, '0');
      corpus[`citas/seneca--frase-${orden}.md`] = citaValida({
        texto: `Frase número ${orden} del catálogo de prueba.`,
        slug: `seneca-frase-${orden}`,
        temas: [],
      });
    }
    const resultado = await construir(corpus);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  const leer = (ruta: string) => readFileSync(paginaConstruida(proyecto, ruta), 'utf8');

  it('página 1: la semblanza y, debajo, su atribución enlazada a la revisión', () => {
    const html = leer('/autor/seneca/');
    const [semblanza, atribucion] = bloqueDeSemblanza(html).split('</p>').map(visible);
    expect(semblanza).toBe(SEMBLANZA_LITERAL);
    expect(atribucion).toBe(
      'Semblanza tomada de «Séneca» en Wikipedia en español, revisión 123 · CC BY-SA 4.0',
    );
    const enlace = /<a href="([^"]+)"[^>]*>«Séneca» en Wikipedia en español, revisión 123<\/a>/.exec(
      html,
    );
    expect(enlace?.[1]?.replace(/&amp;/g, '&')).toBe(SENECA_URL);
    const licencia = /<a href="([^"]+)"[^>]*>CC BY-SA 4.0<\/a>/.exec(html);
    expect(licencia?.[1]).toBe('https://creativecommons.org/licenses/by-sa/4.0/deed.es');
  });

  it('la semblanza ajena va dentro de data-pagefind-ignore', () => {
    const html = leer('/autor/seneca/');
    const bloque = bloqueDeSemblanza(html);
    expect(bloque).toContain(SEMBLANZA_LITERAL);
    expect(bloque).toContain('Semblanza tomada de');
    // Y en ningún otro sitio de la página.
    expect(html.split(SEMBLANZA_LITERAL)).toHaveLength(2);
  });

  it('meta y JSON-LD: hechos del Corpus, sin la semblanza', () => {
    const html = leer('/autor/seneca/');
    expect(metaDescripcion(html)).toBe(
      'Citas de Séneca con su procedencia documentada. 4 a. C.–65 d. C. ' +
        `${totalDeSeneca} cotejadas con su documento.`,
    );
    expect(descripcionDeLaPersona(html)).toBe(
      `Séneca (4 a. C.–65 d. C.). ${totalDeSeneca} citas documentadas en Sabiduría de Bolsillo.`,
    );
  });

  it('la página 2 no muestra la semblanza ajena', () => {
    const html = leer('/autor/seneca/2/');
    expect(html).not.toContain(SEMBLANZA_LITERAL);
    expect(html).not.toContain('Semblanza tomada de');
    expect(metaDescripcion(html)).not.toContain(SEMBLANZA_LITERAL);
  });

  it('una revisión anterior al cambio de licencia se atribuye con CC BY-SA 3.0', () => {
    const html = leer('/autor/horacio/');
    const [semblanza, atribucion] = bloqueDeSemblanza(html).split('</p>').map(visible);
    expect(semblanza).toBe(HORACIO_SEMBLANZA);
    expect(atribucion).toBe(
      'Semblanza tomada de «Horacio» en Wikipedia en español, revisión 77 · CC BY-SA 3.0',
    );
    expect(html).toContain('href="https://creativecommons.org/licenses/by-sa/3.0/deed.es"');
    expect(descripcionDeLaPersona(html)).toBe(
      'Horacio (65–8 a. C.). 1 cita documentada en Sabiduría de Bolsillo.',
    );
  });

  it('un Autor sin biografía conserva su semblanza en cuerpo, meta y JSON-LD', () => {
    const html = leer('/autor/marco-aurelio/');
    expect(html).toMatch(new RegExp(`<p class="semblanza"[^>]*>${SEMBLANZA_PROPIA}</p>`));
    expect(html).not.toContain('Semblanza tomada de');
    // En la ficha, la semblanza propia sigue en el índice: sin envoltorio que la excluya.
    const ficha = /<header class="ficha"[^>]*>([\s\S]*?)<\/header>/.exec(html)?.[1] ?? '';
    expect(ficha).toContain(SEMBLANZA_PROPIA);
    expect(ficha).not.toMatch(/data-pagefind-ignore/);
    expect(metaDescripcion(html)).toBe(
      `Citas de Marco Aurelio con su procedencia documentada. ${SEMBLANZA_PROPIA}`,
    );
    expect(descripcionDeLaPersona(html)).toBe(SEMBLANZA_PROPIA);
  });

  it('cada Autor tiene su Tarjeta Social', () => {
    for (const slug of ['seneca', 'horacio', 'marco-aurelio']) {
      expect(existsSync(join(proyecto, 'dist', 'tarjeta', 'autor', `${slug}.png`)), slug).toBe(
        true,
      );
    }
  });
});

describe('Historia 17.2 — una semblanza que no está en su revisión no se publica', () => {
  it('rompe el build nombrando el fichero de Autor', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'autores/seneca.yml': autorConBiografia(
        DOCUMENTO,
        123,
        'Filósofo estoico hispanorromano, tutor y después consejero de Nerón.',
      ),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/autores/seneca.yml');
    expect(salida).toMatch(/no aparece literal/);
  });
});

describe('Historia 17.2 — el cargador no salta en silencio una cabecera ilegible', () => {
  it('rompe nombrando el documento aunque ningún Autor lo declare', async () => {
    const { codigo, salida } = await construir({
      'temas/el-tiempo.yml': TEMA_VALIDO,
      'citas/seneca--el-tiempo.md': citaValida(),
      'autores/seneca.yml': AUTOR_VALIDO,
      'biografias/wikipedia-es--otro--r5.txt': 'esto no es un documento\n',
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain(
      'la cabecera de corpus/biografias/wikipedia-es--otro--r5.txt no se puede leer',
    );
  });
});
