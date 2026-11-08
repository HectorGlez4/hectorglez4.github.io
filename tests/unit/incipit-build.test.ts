import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
import { componerDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 32.3 — «Cómo empieza», construido.
 *
 * `incipit.test.ts` prueba el corte sin construir. Esto construye un Corpus con una Obra en verso
 * de más de una página cuya ficha declara su incipit, y otra sin él, con el tope **parcheado en la
 * copia** —nunca fijado: la prueba sigue el valor que tenga el árbol— y mira el `dist/`: dónde va
 * el desplegable, que sale cerrado, qué dice, a dónde enlaza la Fuente, que no salga en `/2/` ni
 * en la Obra sin incipit ni en el JSON-LD; con el tope en `undefined`, que ninguna página lo
 * lleva; que el build rompe nombrando la ficha con un `desde` perdido o un documento ausente; y
 * que sale byte a byte igual con la afiliación encendida.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const DOC = 'wikisource-es--sobre-la-brevedad-de-la-vida';
const URL = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const VERSOS = ['Primer verso del poema de prueba,', 'segundo verso que lo sigue', 'tercer verso de la otra estrofa.'];
const TOTAL = CITAS_POR_PAGINA + 2;
const frase = (i: number) => `Frase número ${String(i).padStart(3, '0')} del catálogo de prueba.`;

const DOCUMENTO = componerDocumento(
  { fuente: 'wikisource-es', obra: 'Sobre la brevedad de la vida', año: 49, url: URL, recuperado: '2026-11-08', lineas: 'verso' },
  'Sobre la brevedad de la vida\nAño de publicación: 49',
  [`  ${VERSOS[0]}`, `  ${VERSOS[1]}`, '', `  ${VERSOS[2]}`, ...Array.from({ length: TOTAL }, (_, i) => frase(i))].join('\n'),
);

const fichaDe = (titulo: string, forma: string, incipit?: { documento: string; desde: string }) =>
  `autor: "seneca"\ntitulo: "${titulo}"\nformas:\n  - "${forma}"\n` +
  (incipit === undefined ? '' : `incipit:\n  documento: "${incipit.documento}"\n  desde: "${incipit.desde}"\n`);

function corpus(incipits: { brevedad?: { documento: string; desde: string }; ira?: { documento: string; desde: string } } = {}) {
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'obras/seneca--sobre-la-brevedad-de-la-vida.yml': fichaDe(
      'Sobre la brevedad de la vida',
      'sobre la brevedad de la vida',
      incipits.brevedad ?? { documento: DOC, desde: 'Primer verso' },
    ),
    'obras/seneca--de-la-ira.yml': fichaDe('De la ira', 'de la ira', incipits.ira),
    [`fuentes/${DOC}.txt`]: DOCUMENTO,
    'citas/seneca--de-la-ira.md': citaValida({
      texto: 'La ira es una locura breve.',
      slug: 'seneca-la-ira-es-una-locura-breve',
      procedencia: { obra: 'De la ira', año: 41 },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/De_la_ira' },
    }),
  };
  for (let i = 0; i < TOTAL; i += 1) {
    const orden = String(i).padStart(3, '0');
    c[`citas/seneca--frase-${orden}.md`] = citaValida({ texto: frase(i), slug: `seneca-frase-${orden}` });
  }
  return c;
}

/** La declaración del tope, con el valor que tenga el árbol: la prueba no lo fija. */
const DECLARACION_DEL_TOPE = /^export const MAX_CARACTERES_DEL_INCIPIT: number \| undefined = [^;\n]+;$/mu;
const conElTope = (umbrales: string, valor: string) =>
  umbrales.replace(DECLARACION_DEL_TOPE, `export const MAX_CARACTERES_DEL_INCIPIT: number | undefined = ${valor};`);

const paginaConstruida = (proyecto: string, ruta: string) => readFileSync(rutaConstruida(proyecto, ruta), 'utf8');
const OBRA = '/obra/seneca/sobre-la-brevedad-de-la-vida/';

/** El contenedor del desplegable, tal cual sale en el HTML, o `undefined`. */
function bloqueDe(html: string): string | undefined {
  return /<div data-pagefind-ignore="all" style="margin-top: calc\(var\(--unidad\) \* 3\)"[^>]*>[\s\S]*?<\/details>\s*<\/div>/u.exec(html)?.[0];
}

/** Todos los HTML de un `dist/`. */
function htmlDe(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...htmlDe(ruta));
    else if (nombre.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

describe('Historia 32.3 — «Cómo empieza» en el dist/', () => {
  let umbrales: string;
  let proyecto: string;
  let pagina1: string;

  beforeAll(async () => {
    umbrales = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    expect(umbrales, 'falta la declaración de `MAX_CARACTERES_DEL_INCIPIT`').toMatch(DECLARACION_DEL_TOPE);
    const resultado = await construirConCorpus(corpus(), { ficheros: { 'src/lib/umbrales.ts': conElTope(umbrales, '120') } });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    pagina1 = paginaConstruida(proyecto, OBRA);
  }, 600_000);

  it('sale entre la Cabecera y el listado, cerrado, con el rótulo «Cómo empieza»', () => {
    const bloque = bloqueDe(pagina1);
    expect(bloque).toBeDefined();
    const cabecera = pagina1.indexOf('</header>');
    const desplegable = pagina1.indexOf(bloque!);
    const listado = pagina1.indexOf('<ul class="listado"');
    expect(cabecera).toBeGreaterThan(-1);
    expect(desplegable).toBeGreaterThan(cabecera);
    expect(listado).toBeGreaterThan(desplegable);
    const details = /<details\b[^>]*>/u.exec(bloque!)?.[0] ?? '';
    expect(details).toContain('class="desplegable"');
    expect(details).not.toMatch(/\bopen\b/u);
    expect(/<summary[^>]*>([\s\S]*?)<\/summary>/u.exec(bloque!)?.[1].replace(/<span class="glifo"[\s\S]*$/u, '').replace(/<[^>]+>/g, '')).toBe(
      'Cómo empieza',
    );
    expect(bloque!.match(/<details\b/gu)).toHaveLength(1);
  });

  it('el incipit son versos enteros, unidos por un salto, en un párrafo que conserva los saltos', () => {
    const p = /<p class="incipit"([^>]*)>([\s\S]*?)<\/p>/u.exec(bloqueDe(pagina1)!);
    expect(p?.[2]).toBe(VERSOS.join('\n'));
    expect(p?.[1]).toContain('white-space: pre-line');
    expect(p?.[1]).toContain('font-family: var(--sans)');
  });

  it('la Fuente enlaza a la dirección del documento, en la misma pestaña, sin zona ni exención, con su licencia', () => {
    const bloque = bloqueDe(pagina1)!;
    const fuente = /<p class="fuente-del-incipit"[^>]*>([\s\S]*?)<\/p>/u.exec(bloque)?.[1] ?? '';
    const enlaces = [...fuente.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toContain(`href="${URL}"`);
    expect(enlaces[0]).not.toContain('target');
    expect(bloque).not.toMatch(/data-zona|data-sin-zona/u);
    expect(fuente.replace(/<[^>]+>/g, '')).toBe('Wikisource en español. Licencia CC BY-SA 4.0.');
  });

  it('no sale en la página 2, ni en la Obra sin incipit, ni en el JSON-LD, ni en la Página de Cita', () => {
    const pagina2 = paginaConstruida(proyecto, `${OBRA}2/`);
    expect(pagina2).toContain('cabecera-de-obra');
    expect(pagina2).not.toContain('Cómo empieza');
    expect(bloqueDe(pagina2)).toBeUndefined();
    const ira = paginaConstruida(proyecto, '/obra/seneca/de-la-ira/');
    expect(ira).toContain('cabecera-de-obra');
    expect(ira).not.toContain('Cómo empieza');
    expect(bloqueDe(ira)).toBeUndefined();
    const jsonLd = [...pagina1.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    expect(jsonLd.length).toBeGreaterThan(0);
    expect(jsonLd).not.toContain('Primer verso');
    expect(paginaConstruida(proyecto, '/cita/seneca-frase-000/')).not.toContain('Cómo empieza');
  });

  it('con el tope en `undefined`, ninguna página lo lleva y el build no rompe', async () => {
    const sinElTope = conElTope(umbrales, 'undefined');
    const sin = await construirConCorpus(corpus(), sinElTope === umbrales ? {} : { ficheros: { 'src/lib/umbrales.ts': sinElTope } });
    aLimpiar.push(sin.proyecto);
    expect(sin.codigo, sin.salida).toBe(0);
    for (const ruta of htmlDe(join(sin.proyecto, 'dist'))) {
      const html = readFileSync(ruta, 'utf8');
      expect(html, ruta).not.toContain('Cómo empieza');
      // Solo el bloque del incipit: otros desplegables (32.4, 34.2) pueden ir en la misma página.
      expect(bloqueDe(html), ruta).toBeUndefined();
    }
  }, 600_000);

  it('el build rompe nombrando la ficha con un «desde» perdido y con un documento ausente', async () => {
    const roto = await construirConCorpus(
      corpus({
        brevedad: { documento: DOC, desde: 'Érase una vez' },
        ira: { documento: 'wikisource-es--no-existe', desde: 'La ira' },
      }),
      { ficheros: { 'src/lib/umbrales.ts': conElTope(umbrales, '120') } },
    );
    aLimpiar.push(roto.proyecto);
    expect(roto.codigo).not.toBe(0);
    expect(roto.salida).toContain('Regla incumplida');
    expect(roto.salida).toMatch(/seneca--sobre-la-brevedad-de-la-vida\.yml declara el incipit de «wikisource-es--sobre-la-brevedad-de-la-vida»: su «desde» ya no se localiza/u);
    expect(roto.salida).toMatch(/seneca--de-la-ira\.yml declara el incipit de «wikisource-es--no-existe»: su documento no está en corpus\/fuentes/u);
    expect(existsSync(join(roto.proyecto, 'dist', 'obra'))).toBe(false);
  }, 600_000);

  it('sale byte a byte igual con la afiliación encendida y una tienda declarada', async () => {
    const fuente = await readFile(join(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const encendida = fuenteConModeloEncendido(fuenteConTiendaDePrueba(fuente), 'afiliacion-de-libros');
    const otro = await construirConCorpus(corpus(), {
      ficheros: { 'src/lib/ingreso.ts': encendida, 'src/lib/umbrales.ts': conElTope(umbrales, '120') },
    });
    aLimpiar.push(otro.proyecto);
    expect(otro.codigo, otro.salida).toBe(0);
    const bloque = bloqueDe(pagina1);
    expect(bloque).toBeDefined();
    expect(bloqueDe(paginaConstruida(otro.proyecto, OBRA))).toBe(bloque);
  }, 600_000);
});
