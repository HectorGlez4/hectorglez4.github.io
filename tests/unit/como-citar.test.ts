import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { recorrerElementos, type Elemento } from './ayuda/enlaces.js';
import { guionesEnLinea } from './ayuda/guion.js';
import { indiceDe } from './ayuda/pagefind.js';
import { MARCADOR_DE_FECHA_DE_CONSULTA } from '../../src/lib/atribucion.ts';
import { revisarCobertura } from '../../tools/lib/cobertura.ts';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 30.3 — «Cómo citar» en la Página de Cita, leído de `dist/` (FR-58, UX-DR119).
 *
 * Las formas literales las fija `tests/unit/atribucion.test.ts`; aquí, lo que solo dice lo
 * construido: dónde va el bloque, qué lleva sin guion, que el build no escribe la jornada, que
 * Pagefind no lo indexa y que el guion de Copiar sigue siendo uno, idéntico y sin contenido.
 * El comportamiento con y sin JavaScript lo mira `tests/e2e/como-citar.spec.ts`.
 */

const JORNADA = '2026-11-08';
const WS = 'https://es.wikisource.org/wiki/';
const BREVEDAD = 'Sobre la brevedad de la vida';
const SIN_OBRA = 'seneca-mientras-esperamos-vivir-la-vida-pasa';
const TEXTOS = [
  'No es que tengamos poco tiempo, es que perdemos mucho.',
  'La vida es larga si sabes emplearla.',
  'Nadie te devolverá los años perdidos.',
];
const COTEJADAS = TEXTOS.map((_, i) => `seneca-brevedad-${i}`);

function corpus(): Record<string, string> {
  const url = `${WS}Sobre_la_brevedad_de_la_vida`;
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n  - ${SIN_OBRA}\n`,
    'citas/seneca--sin-obra.md': citaValida({
      slug: SIN_OBRA,
      texto: 'Mientras esperamos vivir, la vida pasa.',
      procedencia: { referencia: 'Carta 1' },
      fuente: undefined,
    }),
    [`fuentes/${nombreDeDocumento('wikisource-es', BREVEDAD)}.txt`]: componerDocumento(
      { fuente: 'wikisource-es', obra: BREVEDAD, url, recuperado: '2026-10-27' },
      BREVEDAD,
      TEXTOS.join('\n\n'),
    ),
  };
  TEXTOS.forEach((texto, i) => {
    c[`citas/seneca--brevedad-${i}.md`] = citaValida({
      slug: COTEJADAS[i],
      texto,
      procedencia: { obra: BREVEDAD, año: 49 },
      fuente: { id: 'wikisource-es', url },
    });
  });
  return c;
}

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** Los hijos de `<article>` por lo que son, sin `script`, `style`, `template` ni `noscript`. */
function hijosDelArticle(html: string): { que: string; elemento: Elemento }[] {
  const hijos: { que: string; elemento: Elemento }[] = [];
  recorrerElementos(html, (elemento, antepasados) => {
    const padre = antepasados.at(-1);
    if (padre?.etiqueta !== 'article') return;
    if (['script', 'style', 'template', 'noscript'].includes(elemento.etiqueta)) return;
    const clases = (elemento.atributos.get('class') ?? '').split(/\s+/);
    const a = elemento.atributos;
    const que = clases.includes('bloque')
      ? 'bloque'
      : clases.includes('fuente')
        ? 'fuente'
        : clases.includes('fila-de-acciones')
          ? 'acciones'
          : a.has('data-compartir')
            ? 'compartir'
            : clases.includes('tarjeta-de-obra')
              ? 'tarjeta'
              : clases.includes('desplegables')
                ? 'desplegables'
                : clases.includes('salidas')
                  ? 'rutas'
                  : a.has('hidden')
                    ? 'filtros'
                    : `${elemento.etiqueta}.${clases.join('.')}`;
    hijos.push({ que, elemento });
  });
  return hijos;
}

/** El marcado del bloque de desplegables, entero (una sola aparición). */
function bloqueDe(html: string): string {
  const inicio = html.indexOf('<div class="desplegables');
  expect(inicio, 'sin bloque de desplegables').toBeGreaterThan(-1);
  expect(html.indexOf('<div class="desplegables', inicio + 1), 'el bloque, una sola vez').toBe(-1);
  const fin = html.indexOf('</details>', inicio);
  return html.slice(inicio, fin + '</details>'.length);
}

describe('Historia 30.3 — «Cómo citar» en la Página de Cita construida', () => {
  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpus(), { jornada: JORNADA, conBusqueda: true });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  }, 300_000);

  it('el orden del article: tras la Tarjeta de Obra —o tras compartir, sin Obra— y antes de las rutas', async () => {
    for (const slug of [...COTEJADAS, SIN_OBRA]) {
      const que = hijosDelArticle(await html(`/cita/${slug}/`)).map((h) => h.que);
      const conObra = slug !== SIN_OBRA;
      const esperado = [
        'bloque',
        ...(conObra ? ['fuente'] : []),
        'acciones',
        'compartir',
        ...(conObra ? ['tarjeta'] : []),
        'desplegables',
      ];
      expect(que.slice(0, esperado.length), slug).toEqual(esperado);
      expect(que.filter((q) => q === 'desplegables'), slug).toHaveLength(1);
      expect(que.at(-1), slug).toBe('filtros');
      const resto = que.slice(esperado.length, -1);
      expect(resto.every((q) => q === 'rutas'), `${slug}: ${resto.join(', ')}`).toBe(true);
    }
  });

  it('un bloque bajo `data-pagefind-ignore="all"`, sin zona, con un solo `<details>` cerrado y su región vacía', async () => {
    for (const slug of [...COTEJADAS, SIN_OBRA]) {
      const pagina = await html(`/cita/${slug}/`);
      const bloque = bloqueDe(pagina);
      expect(bloque, slug).toMatch(/^<div class="desplegables[^"]*"[^>]*data-pagefind-ignore="all"/);
      expect(bloque, slug).not.toMatch(/data-zona|data-sin-zona|<a\b/);
      expect(bloque.match(/<details\b/g), slug).toHaveLength(1);
      expect(bloque, slug).not.toMatch(/<details\b[^>]*\bopen\b/);
      expect(bloque, slug).toMatch(/<summary\b[^>]*>[\s\S]*Cómo citar[\s\S]*<\/summary>/);
      // La región de estado dentro del `<details>`, vacía y sin `hidden`.
      const regiones = [...bloque.matchAll(/<p\b([^>]*)role="status"([^>]*)>([\s\S]*?)<\/p>/g)];
      expect(regiones, slug).toHaveLength(1);
      expect(regiones[0][3], slug).toBe('');
      expect(regiones[0][1] + regiones[0][2], slug).not.toMatch(/\bhidden\b/);
      expect(regiones[0][1] + regiones[0][2], slug).toContain('solo-para-lectores');
    }
  });

  it('tres estilos con su Referencia, su línea sin fecha, su marcador vacío y su botón `hidden`', async () => {
    const bloque = bloqueDe(await html(`/cita/${COTEJADAS[0]}/`));
    for (const [estilo, rotulo] of [
      ['apa', 'APA'],
      ['mla', 'MLA'],
      ['chicago', 'Chicago'],
    ]) {
      expect(bloque).toMatch(new RegExp(`<span ${MARCADOR_DE_FECHA_DE_CONSULTA}="${estilo}"[^>]*></span>`));
      expect(bloque).toMatch(
        new RegExp(`<button\\b[^>]*data-copiar-referencia[^>]*aria-label="Copiar ${rotulo}"[^>]*hidden[^>]*>`),
      );
      expect(bloque).toContain(`>${rotulo}</p>`);
    }
    expect(bloque.match(/data-referencia/g)).toHaveLength(3);
    expect(bloque.match(/data-sin-fecha/g)).toHaveLength(3);
    expect(bloque.match(/Sin fecha de consulta: añade la de hoy\./g)).toHaveLength(3);
    // El título en cursiva y la canónica como texto, en las tres.
    expect(bloque.match(/<i\b[^>]*>Sobre la brevedad de la vida<\/i>/g)).toHaveLength(3);
    expect(bloque).toContain(`/cita/${COTEJADAS[0]}/`);
    expect(bloque).not.toMatch(/[?&](de|via)=/);
  });

  it('sin Obra, las Referencias no llevan título', async () => {
    const bloque = bloqueDe(await html(`/cita/${SIN_OBRA}/`));
    expect(bloque).not.toMatch(/<i\b[^>]*>(?!Sabiduría de Bolsillo)/);
    expect(bloque).not.toContain('Sin obra documentada');
    expect(bloque).toContain('«Mientras esperamos vivir, la vida pasa.».');
  });

  it('ningún «Cómo citar» lleva la jornada del build', async () => {
    for (const slug of [...COTEJADAS, SIN_OBRA]) {
      const bloque = bloqueDe(await html(`/cita/${slug}/`));
      for (const fecha of ['8 de noviembre de 2026', '8 nov. 2026', JORNADA, 'Recuperado el', 'Consultado el']) {
        expect(bloque, `${slug}: ${fecha}`).not.toContain(fecha);
      }
    }
  });

  it('el JSON-LD no cambia: no nombra «Cómo citar» ni sus estilos', async () => {
    const pagina = await html(`/cita/${COTEJADAS[0]}/`);
    const ld = [...pagina.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(ld.length).toBeGreaterThan(0);
    for (const cuerpo of ld) expect(cuerpo).not.toMatch(/Cómo citar|APA|MLA|Chicago|Recuperado/);
  });

  it('Pagefind no lo indexa: el título de la Obra da sus Citas, y una palabra solo del bloque, ninguna', async () => {
    const indice = await indiceDe(proyecto);
    try {
      const rutas = async (termino: string) =>
        (await Promise.all((await indice.search(termino)).results.map((r) => r.data()))).map((d) => d.url);
      const deLaObra = (await rutas('brevedad')).filter((u) => u.startsWith('/cita/')).sort();
      expect(deLaObra).toEqual(COTEJADAS.map((s) => `/cita/${s}/`).sort());
      // Ninguna Página de Cita casa por lo que solo dice el bloque (la de Autor de esta copia casa
      // con casi cualquier término por la búsqueda difusa de Pagefind, y no es de esta historia).
      for (const termino of ['añade', 'consulta', 'Chicago', 'MLA']) {
        expect((await rutas(termino)).filter((u) => u.startsWith('/cita/')), termino).toEqual([]);
      }
    } finally {
      indice.soltar();
    }
  });

  it('el «›» del rótulo pasa la cobertura tipográfica', async () => {
    const ruta = `cita/${COTEJADAS[0]}/index.html`;
    const pagina = await html(`/cita/${COTEJADAS[0]}/`);
    const resultado = revisarCobertura([{ ruta, html: pagina }], await cssDeLaCopia(proyecto));
    expect(resultado.familias.length).toBeGreaterThan(0);
    expect(resultado.ok, JSON.stringify(resultado.fallos)).toBe(true);
  });

  it('el guion de Copiar es uno por página, idéntico en toda Página de Cita, sin contenido', async () => {
    const deCopiar = async (slug: string) =>
      guionesEnLinea(await html(`/cita/${slug}/`)).filter((g) => g.includes("'[data-copiar]'"));
    const primero = await deCopiar(COTEJADAS[0]);
    expect(primero).toHaveLength(1);
    for (const slug of [...COTEJADAS.slice(1), SIN_OBRA]) expect(await deCopiar(slug), slug).toEqual(primero);
    expect(primero[0]).toContain('[data-como-citar]');
    for (const ajeno of [...COTEJADAS, SIN_OBRA, 'Séneca', 'brevedad']) expect(primero[0], ajeno).not.toContain(ajeno);
  });

  it('Copiar copia lo de siempre: su `data-carga` es la del texto para copiar', async () => {
    const pagina = await html(`/cita/${COTEJADAS[0]}/`);
    expect(pagina).toContain(`data-carga="«${TEXTOS[0]}» — Séneca, ${BREVEDAD}, 49."`);
  });
});

/** El CSS que emite la copia, como lo junta la puerta de cobertura. */
async function cssDeLaCopia(proyecto: string): Promise<string> {
  const dist = join(proyecto, 'dist');
  const entradas = await readdir(dist, { recursive: true, withFileTypes: true });
  const bloques = new Set<string>();
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    if (entrada.name.endsWith('.css')) bloques.add(await readFile(ruta, 'utf8'));
    if (entrada.name.endsWith('.html')) {
      for (const [, cuerpo] of (await readFile(ruta, 'utf8')).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
        bloques.add(cuerpo);
      }
    }
  }
  return [...bloques].join('\n');
}
