import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { revisarCobertura, type PaginaConstruida } from '../../tools/lib/cobertura.ts';

/**
 * Historia 34.0 — la primitiva de Desplegable (UX-DR117, UX-DR143–UX-DR146).
 *
 * Ninguna página la importa todavía, así que se fija fuera de toda página (AD-21): en la fuente
 * del componente, sin construir, y en sondas de una copia construida, nunca en el árbol.
 *
 *   · **Sin construir**: la API (`rotulo` y nada más), el marcado y la hoja, cuyos selectores
 *     solo pueden nombrar el marcado del propio componente.
 *   · **Una construcción**: un desplegable con contenido y dos seguidos, leídos de `dist/`, y la
 *     cobertura tipográfica de esa página con el CSS que emite la copia.
 *   · **Dos construcciones que fallan**: sin `slot` y con un `slot` en blanco.
 */

const COMPONENTE = 'src/components/Desplegable.astro';
const GLIFO = '›';
const FLECHA = '→';

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** Un fichero sin sus comentarios: de bloque, de línea, de plantilla y de HTML. */
const sinComentarios = (texto: string) =>
  texto
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

async function partes(): Promise<{ frontmatter: string; plantilla: string; estilo: string }> {
  const fuente = await readFile(join(RAIZ, COMPONENTE), 'utf8');
  const [, frontmatter, ...resto] = fuente.split(/^---$/m);
  const cuerpo = resto.join('---');
  const inicio = cuerpo.indexOf('<style>');
  const fin = cuerpo.indexOf('</style>');
  return {
    frontmatter,
    plantilla: sinComentarios(cuerpo.slice(0, inicio)),
    estilo: cuerpo.slice(inicio + '<style>'.length, fin),
  };
}

// ─── Los selectores de la hoja ───────────────────────────────────────────────

/** Lo que pinta el marcado del componente: lo único que su hoja puede nombrar. */
const ELEMENTOS_PROPIOS = new Set(['details', 'summary', 'span', 'div']);
const CLASES_PROPIAS = new Set(['desplegable', 'contenido', 'glifo']);
/** Pseudoclases, pseudoelementos y atributos que no salen del propio marcado. */
const MODIFICADORES_PROPIOS = new Set(['::-webkit-details-marker', '[open]']);

/** Los selectores de una hoja, sin comentarios y aplanando los `@media`. */
function selectoresDe(css: string): string[] {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...limpio.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map(([, selector]) => selector.trim())
    .filter((selector) => !selector.startsWith('@'))
    .flatMap((selector) => selector.split(',').map((s) => s.trim()));
}

/**
 * Los selectores de una hoja que nombran algo ajeno al marcado del componente: otro elemento,
 * otra clase, `:global`, un modificador desconocido o lo que no se sabe leer.
 */
function selectoresAjenos(css: string): string[] {
  return selectoresDe(css).filter((selector) => {
    if (/:global/.test(selector)) return true;
    const compuestos = selector.split(/\s*[\s>+~]\s*/).filter((c) => c !== '');
    return compuestos.some((compuesto) => {
      const piezas = compuesto.match(/::?[a-z-]+|\.[a-z][a-z0-9-]*|\[[^\]]*\]|[a-z][a-z0-9-]*|./gi) ?? [];
      return piezas.some((pieza) => {
        if (pieza.startsWith('.')) return !CLASES_PROPIAS.has(pieza.slice(1));
        if (pieza.startsWith(':') || pieza.startsWith('[')) return !MODIFICADORES_PROPIOS.has(pieza);
        if (/^[a-z]/i.test(pieza)) return !ELEMENTOS_PROPIOS.has(pieza);
        return true;
      });
    });
  });
}

describe('Historia 34.0 — el contrato del componente, sin construir', () => {
  it('`Props` es `rotulo: string`, obligatoria, y nada más', async () => {
    const { frontmatter } = await partes();
    const fuente = ts.createSourceFile(COMPONENTE, frontmatter, ts.ScriptTarget.Latest, true);
    const props = fuente.statements.find(
      (s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'Props',
    );
    expect(props, 'sin `interface Props`').toBeDefined();
    const miembros = props!.members.filter(ts.isPropertySignature);
    expect(miembros).toHaveLength(props!.members.length);
    expect(miembros.map((m) => m.name.getText(fuente))).toEqual(['rotulo']);
    expect(miembros[0].type?.getText(fuente)).toBe('string');
    expect(miembros[0].questionToken).toBeUndefined();
  });

  it('pinta un `<details class="desplegable">` cerrado, con el glifo «›» oculto y sin nada ajeno', async () => {
    const { plantilla, estilo } = await partes();
    expect(plantilla).toContain('<details class="desplegable">');
    expect(plantilla).not.toMatch(/<details[^>]*\bopen\b/);
    expect(plantilla).toContain(`<span class="glifo" aria-hidden="true">&nbsp;${GLIFO}</span>`);
    expect(plantilla).toMatch(/<summary><span>\{rotulo\}<span class="glifo"/);
    expect(plantilla).toContain('<div class="contenido">');
    for (const ajeno of ['<script', 'data-zona', 'data-ingreso', 'data-pagefind', '<svg', FLECHA]) {
      expect(plantilla, ajeno).not.toContain(ajeno);
    }
    expect(plantilla).not.toMatch(/<h[1-6]\b/);
    const hoja = sinComentarios(estilo);
    expect(hoja).not.toMatch(/content\s*:/);
    expect(hoja).not.toContain(FLECHA);
  });

  it('la hoja lleva el trato de Boundaries, todo en tokens salvo el espaciado', async () => {
    const { estilo } = await partes();
    const hoja = sinComentarios(estilo).replace(/\s+/g, ' ');
    for (const declaracion of [
      'border-block: var(--grosor-filete) solid var(--filete)',
      'max-inline-size: var(--medida-prosa)',
      'border-block-start: none',
      'list-style: none',
      'display: flex',
      'align-items: center',
      'min-block-size: var(--zona-de-toque)',
      'font-family: var(--sans)',
      'font-size: var(--autor)',
      'font-weight: var(--peso-fuerte)',
      'letter-spacing: 0.09em',
      'line-height: var(--interlineado-autor)',
      'text-transform: uppercase',
      'color: var(--tinta-apagada)',
      'transform: rotate(90deg)',
      'padding-block: calc(var(--unidad) * 2) calc(var(--unidad) * 3)',
    ]) {
      expect(hoja, declaracion).toContain(declaracion);
    }
    expect(hoja).toMatch(/summary::-webkit-details-marker \{ display: none; \}/);
    expect(hoja).toMatch(/\.desplegable \+ \.desplegable \{ border-block-start: none; \}/);
    // Sin fondo, radio, subrayado, siena, transición ni regla de foco propia.
    expect(hoja).not.toMatch(/background|border-radius|text-decoration|--siena|transition|:focus/);
  });

  it('cada selector de la hoja nombra solo el marcado propio, sin `:global`', async () => {
    const { estilo } = await partes();
    expect(selectoresDe(estilo).length).toBeGreaterThan(0);
    expect(selectoresAjenos(estilo)).toEqual([]);
  });

  it('el vigilante de selectores rechaza una regla ajena', () => {
    expect(selectoresAjenos('.desplegable { color: red; }')).toEqual([]);
    expect(selectoresAjenos('p { margin: 0; }')).toEqual(['p']);
    expect(selectoresAjenos('.contenido a { color: red; }')).toEqual(['.contenido a']);
    expect(selectoresAjenos(':global(.cita) { color: red; }')).toEqual([':global(.cita)']);
    expect(selectoresAjenos('.desplegable, .otra { x: y; }')).toEqual(['.otra']);
    expect(selectoresAjenos('summary:hover { x: y; }')).toEqual(['summary:hover']);
    expect(selectoresAjenos('@media (min-width: 1px) { h2 { x: y; } }')).toEqual(['h2']);
  });

  it('ninguna página ni componente del sitio lo importa todavía, ni escribe su propio `<details>`', async () => {
    const entradas = await readdir(join(RAIZ, 'src'), { recursive: true, withFileTypes: true });
    for (const entrada of entradas) {
      if (!entrada.isFile() || !/\.(astro|mdx|ts)$/.test(entrada.name)) continue;
      const ruta = join(entrada.parentPath, entrada.name);
      if (ruta === join(RAIZ, COMPONENTE)) continue;
      const fuente = sinComentarios(await readFile(ruta, 'utf8'));
      expect(fuente, ruta).not.toContain('Desplegable.astro');
      expect(fuente, ruta).not.toMatch(/<details\b/);
    }
  });
});

// ─── Una construcción ────────────────────────────────────────────────────────

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

const sonda = (cuerpo: string) => `---
import Desplegable from '../components/Desplegable.astro';
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body>${cuerpo}</body></html>
`;

const SONDA_CON_CONTENIDO = sonda(
  '<Desplegable rotulo="Cómo citar"><p id="dentro">Séneca, «Sobre la brevedad de la vida».</p></Desplegable>' +
    '<section id="seguidos"><Desplegable rotulo="Lee el pasaje"><p>Uno.</p></Desplegable>' +
    '<Desplegable rotulo="Ediciones"><p>Dos.</p></Desplegable></section>',
);

/** Los `<details>` de un HTML, con su `<summary>` y su contenido. */
function desplegablesDe(html: string): { apertura: string; summary: string; contenido: string }[] {
  return [...html.matchAll(/(<details\b[^>]*>)<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map(
    ([, apertura, summary, contenido]) => ({ apertura, summary, contenido }),
  );
}

/** El texto de un fragmento sin el glifo: lo que el lector de pantalla oye. */
const textoSinGlifo = (fragmento: string) =>
  fragmento
    .replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();

describe('Historia 34.0 — el desplegable construido en una sonda', () => {
  let proyecto = '';
  let html = '';

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS, {
      paginas: { 'sonda-desplegable.astro': SONDA_CON_CONTENIDO },
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    html = await readFile(paginaConstruida(proyecto, '/sonda-desplegable/'), 'utf8');
  }, 300_000);

  it('pinta cada desplegable cerrado, con el rótulo como único texto del `<summary>` y el contenido dentro', () => {
    const desplegables = desplegablesDe(html);
    expect(desplegables.map((d) => textoSinGlifo(d.summary))).toEqual(['Cómo citar', 'Lee el pasaje', 'Ediciones']);
    for (const { apertura, summary, contenido } of desplegables) {
      expect(apertura).toMatch(/class="desplegable[ "]/);
      expect(apertura).not.toMatch(/\bopen\b/);
      expect(summary).not.toMatch(/<h[1-6]\b/);
      expect(summary).toMatch(new RegExp(`<span\\b[^>]*aria-hidden="true"[^>]*>&nbsp;${GLIFO}</span>|<span\\b[^>]*aria-hidden="true"[^>]*> ${GLIFO}</span>`));
      expect(contenido).toMatch(/^<div\b[^>]*class="contenido[ "]/);
    }
    expect(desplegables[0].contenido).toContain('<p id="dentro">Séneca, «Sobre la brevedad de la vida».</p>');
  });

  it('dos seguidos son hermanos, y la hoja quita el filete de encima del segundo', async () => {
    expect(html).toMatch(/<\/details><details\b[^>]*class="desplegable/);
    const css = await cssDeLaCopia(proyecto);
    expect(css.replace(/\s+/g, '')).toMatch(/\.desplegable(\[data-astro-cid-[a-z0-9]+\])?(:where\(\.astro-[a-z0-9]+\))?\+\.desplegable(\[data-astro-cid-[a-z0-9]+\])?(:where\(\.astro-[a-z0-9]+\))?\{border-block-start:none\}/);
  });

  it('el glifo pasa la cobertura tipográfica con las fuentes que emite la copia', async () => {
    const css = await cssDeLaCopia(proyecto);
    const pagina: PaginaConstruida = { ruta: 'sonda-desplegable/index.html', html };
    const resultado = revisarCobertura([pagina], css);
    expect(resultado.familias.length, 'la copia no emite familias').toBeGreaterThan(0);
    expect(resultado.ok, JSON.stringify(resultado.fallos)).toBe(true);
  });
});

/**
 * El CSS que emite la copia, como lo junta la puerta de cobertura (`integraciones/cobertura.ts`):
 * los `<style>` en línea de sus páginas y las hojas sueltas de `dist/`.
 */
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

// ─── Dos construcciones que fallan ───────────────────────────────────────────

describe('Historia 34.0 — un desplegable sin contenido detiene la construcción', () => {
  it.each([
    ['sin slot', '<Desplegable rotulo="Cómo citar" />', 'Cómo citar'],
    ['con slot en blanco', '<Desplegable rotulo="Lee el pasaje">   </Desplegable>', 'Lee el pasaje'],
  ])('%s: código distinto de 0, nombrando el rótulo', async (_caso, uso, rotulo) => {
    const resultado = await construirConCorpus(CORPUS, { paginas: { 'sonda-vacia.astro': sonda(uso) } });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toContain(`Desplegable «${rotulo}» sin contenido: quien lo usa no lo renderiza (UX-DR144)`);
  }, 300_000);
});
