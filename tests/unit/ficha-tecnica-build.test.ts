import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  fuenteConModeloEncendido,
  fuenteConTiendaDePrueba,
  limpiar,
  paginaConstruida as rutaConstruida,
} from './ayuda/construir.js';
import { CITAS_POR_PAGINA } from '../../src/lib/umbrales.ts';
import { componerVigentes, nombreDeDocumentoDeWikidata } from '../../tools/lib/wikidata.ts';
import { aEntidad, aTiempo, documento, entidad } from './ayuda/wikidata.ts';

/**
 * Historia 32.2 — la línea de Ficha técnica, construida.
 *
 * `ficha-tecnica.test.ts` prueba el texto y las reglas sin construir. Esto construye un Corpus con
 * una Obra atada a Wikidata, traducida y de más de una página, y otra atada a una entidad sin
 * ningún campo que pintar, y mira el `dist/`: dónde va la línea, qué dice, qué oye el lector de
 * pantalla, a dónde enlaza, que no salga en `/2/` ni en la Obra vacía, ni en el JSON-LD ni en el
 * índice de Pagefind, el aviso de año discrepante, y que sale byte a byte igual con la afiliación
 * encendida.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const SENECA = entidad('Q2054', 30, { es: 'Séneca' });
const NOVELA = entidad('Q8261', 40, { es: 'novela' });
const ESPAÑOL = entidad('Q1321', 41, { es: 'español' });
const BREVEDAD = entidad('Q480', 100, {
  claims: {
    P50: [aEntidad('Q2054')],
    P136: [aEntidad('Q8261')],
    P407: [aEntidad('Q1321')],
    P577: [aTiempo('+1605-00-00T00:00:00Z')],
  },
});
/** Atada, y sin género, lengua ni fecha: no hay línea. */
const IRA = entidad('Q481', 101, { claims: { P50: [aEntidad('Q2054')] } });

const enCarpeta = (...entidades: Record<string, unknown>[]) =>
  Object.fromEntries(
    entidades.map((e) => [`wikidata/${nombreDeDocumentoDeWikidata(String(e.id), Number(e.lastrevid))}`, documento(e)]),
  );

const ficha = (titulo: string, forma: string, entidadQ: string, revision: number) =>
  `autor: "seneca"\ntitulo: "${titulo}"\nformas:\n  - "${forma}"\nwikidata:\n  entidad: "${entidadQ}"\n  revision: ${revision}\n`;

const TRADUCTOR = 'Juan Pérez';
const TOTAL = CITAS_POR_PAGINA + 2;

function corpus(): Record<string, string> {
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'obras/seneca--sobre-la-brevedad-de-la-vida.yml': ficha(
      'Sobre la brevedad de la vida',
      'sobre la brevedad de la vida',
      'Q480',
      100,
    ),
    'obras/seneca--de-la-ira.yml': ficha('De la ira', 'de la ira', 'Q481', 101),
    ...enCarpeta(BREVEDAD, IRA, SENECA, NOVELA, ESPAÑOL),
    'wikidata/vigentes.yml': componerVigentes(new Map(Object.entries({ Q2054: 30, Q8261: 40, Q1321: 41 }))),
    'citas/seneca--de-la-ira.md': citaValida({
      texto: 'La ira es una locura breve.',
      slug: 'seneca-la-ira-es-una-locura-breve',
      procedencia: { obra: 'De la ira', año: 41 },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/De_la_ira' },
    }),
  };
  for (let i = 0; i < TOTAL; i += 1) {
    const orden = String(i).padStart(3, '0');
    c[`citas/seneca--frase-${orden}.md`] = citaValida({
      texto: `Frase número ${orden} del catálogo de prueba.`,
      slug: `seneca-frase-${orden}`,
      // La Obra dice 1604 y Wikidata 1605: el build avisa y no corrige ninguno.
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 1604, traduccion: { traductor: TRADUCTOR } },
    });
  }
  return c;
}

/** El HTML construido de una ruta. */
const paginaConstruida = (proyecto: string, ruta: string) => readFileSync(rutaConstruida(proyecto, ruta), 'utf8');

const OBRA = '/obra/seneca/sobre-la-brevedad-de-la-vida/';
const ENLACE = 'https://www.wikidata.org/w/index.php?title=Q480&amp;oldid=100';

/** El `<p>` de la línea, tal cual sale en el HTML, o `undefined`. */
function lineaDe(html: string): string | undefined {
  return /<p class="ficha-tecnica"[^>]*>[\s\S]*?<\/p>/u.exec(html)?.[0];
}

const sinEtiquetas = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
/** Lo que se ve: sin lo que solo oye el lector. */
const loQueSeVe = (linea: string) => sinEtiquetas(linea.replace(/<span class="solo-para-lectores"[^>]*>[\s\S]*?<\/span>/g, ''));
/** Lo que oye el lector: sin lo que es decoración. */
const loQueSeOye = (linea: string) => sinEtiquetas(linea.replace(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, ''));

describe('Historia 32.2 — la línea de Ficha técnica en el dist/', () => {
  let proyecto: string;
  let salida: string;
  let pagina1: string;

  beforeAll(async () => {
    // `astro build` más Pagefind sobre medio centenar de Citas no caben en el plazo de un gancho.
    const resultado = await construirConCorpus(corpus(), { conBusqueda: true });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    salida = resultado.salida;
    pagina1 = paginaConstruida(proyecto, OBRA);
  }, 600_000);

  it('va dentro de la Cabecera de Obra, tras «de {Autor} · {año}» y antes del contenedor de los desplegables', () => {
    const cabecera = /<header class="cabecera-de-obra"[^>]*>[\s\S]*?<\/header>/u.exec(pagina1)?.[0] ?? '';
    const de = cabecera.indexOf('<p class="de"');
    const linea = cabecera.indexOf('<p class="ficha-tecnica"');
    expect(de).toBeGreaterThan(-1);
    expect(linea).toBeGreaterThan(de);
    // Historia 32.4 — sin el salto: la línea es lo último de la Cabecera, y tras ella el contenedor.
    expect(cabecera).not.toContain('class="salto"');
    const tras = pagina1.slice(pagina1.indexOf(cabecera) + cabecera.length).trimStart();
    expect(tras).toMatch(/^<div data-pagefind-ignore="all" style="margin-top: calc\(var\(--unidad\) \* 2\)"[^>]*><details class="desplegable"/u);
  });

  it('dice sus partes en orden, con el traductor de la edición que encabeza, y el lector oye comas', () => {
    const linea = lineaDe(pagina1) ?? '';
    expect(loQueSeVe(linea)).toBe(`Novela · 1605 · Escrita en español · Traducción de ${TRADUCTOR} · Datos: Wikidata, CC0`);
    expect(loQueSeOye(linea)).toBe(`Novela, 1605, Escrita en español, Traducción de ${TRADUCTOR}, Datos: Wikidata, CC0`);
    // La Cabecera sigue con el año de las Citas: ninguno de los dos se corrige.
    expect(sinEtiquetas(/<p class="de"[^>]*>[\s\S]*?<\/p>/u.exec(pagina1)?.[0] ?? '')).toContain('1604');
  });

  it('enlaza al permanente de la revisión, en la misma pestaña, sin zona ni exención, y fuera de Pagefind', () => {
    const linea = lineaDe(pagina1) ?? '';
    const enlaces = [...linea.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toContain(`href="${ENLACE}"`);
    expect(enlaces[0]).not.toContain('target');
    expect(linea).not.toMatch(/data-zona|data-sin-zona/);
    expect(linea).toMatch(/^<p class="ficha-tecnica" data-pagefind-ignore="all"/);
  });

  it('no sale en la página 2, ni en la Obra atada sin campos, ni en otra superficie', () => {
    const pagina2 = paginaConstruida(proyecto, `${OBRA}2/`);
    expect(pagina2).toContain('cabecera-de-obra');
    expect(lineaDe(pagina2)).toBeUndefined();
    expect(pagina2).not.toContain('wikidata.org');
    const ira = paginaConstruida(proyecto, '/obra/seneca/de-la-ira/');
    expect(ira).toContain('cabecera-de-obra');
    expect(lineaDe(ira)).toBeUndefined();
    expect(ira).not.toContain('wikidata');
    const cita = paginaConstruida(proyecto, '/cita/seneca-frase-000/');
    expect(cita).not.toContain('wikidata.org');
    expect(cita).not.toContain('Escrita en');
  });

  it('el JSON-LD de la Obra no lleva etiquetas ni Wikidata', () => {
    const jsonLd = [...pagina1.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    expect(jsonLd.length).toBeGreaterThan(0);
    for (const ausente of ['novela', 'Novela', 'español', 'wikidata', 'Wikidata', '1605']) expect(jsonLd, ausente).not.toContain(ausente);
  });

  it('el índice de Pagefind no recoge la línea', async () => {
    const carpeta = join(proyecto, 'dist', 'pagefind', 'fragment');
    const fragmentos = await readdir(carpeta);
    expect(fragmentos.length).toBeGreaterThan(0);
    let deLaObra = 0;
    for (const nombre of fragmentos) {
      const texto = gunzipSync(await readFile(join(carpeta, nombre))).toString('utf8');
      if (texto.includes('Sobre la brevedad de la vida')) deLaObra += 1;
      for (const ausente of ['Escrita en', 'Datos: Wikidata', 'wikidata.org']) expect(texto, ausente).not.toContain(ausente);
    }
    expect(deLaObra).toBeGreaterThan(0);
  });

  it('el build avisa «Ficha técnica con año discrepante», nombrando la ficha y los dos años, sin romper', () => {
    expect(salida).toMatch(
      /Ficha técnica con año discrepante: corpus\/obras\/seneca--sobre-la-brevedad-de-la-vida\.yml → Wikidata dice 1605; sus Citas, 1604/,
    );
    expect(salida).not.toMatch(/seneca--de-la-ira\.yml → Wikidata dice/);
  });

  it('sale byte a byte igual con la afiliación encendida y una tienda declarada', async () => {
    const fuente = await readFile(join(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const encendida = fuenteConModeloEncendido(fuenteConTiendaDePrueba(fuente), 'afiliacion-de-libros');
    const otro = await construirConCorpus(corpus(), { ficheros: { 'src/lib/ingreso.ts': encendida } });
    aLimpiar.push(otro.proyecto);
    expect(otro.codigo, otro.salida).toBe(0);
    const linea = lineaDe(pagina1);
    expect(linea).toBeDefined();
    expect(lineaDe(paginaConstruida(otro.proyecto, OBRA))).toBe(linea);
  }, 600_000);
});
