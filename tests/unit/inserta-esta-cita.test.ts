import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
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
import { recorrerElementos, type Elemento } from './ayuda/enlaces.js';
import { decodificar } from './ayuda/listado.js';
import { indiceDe } from './ayuda/pagefind.js';
import { componerDocumento, nombreDeDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 30.4 — «Inserta esta cita» en la Página de Cita, leído de `dist/` (FR-57, UX-DR120).
 *
 * El Fragmento literal lo fija `tests/unit/atribucion.test.ts`; aquí, lo que solo dice lo
 * construido: que toda Página de Cita lo lleva, plegado y el último del bloque de desplegables;
 * que el campo trae un Fragmento que, analizado, es un solo `blockquote` sin nada vedado y con la
 * canónica como único enlace; que la página no gana ningún `<a>`, que el JSON-LD no lo lleva y que
 * Pagefind no lo indexa. El comportamiento en el navegador lo mira `tests/e2e/inserta-esta-cita.spec.ts`.
 */

const WS = 'https://es.wikisource.org/wiki/';
const BREVEDAD = 'Sobre la brevedad de la vida';
const SIN_OBRA = 'seneca-mientras-esperamos-vivir-la-vida-pasa';
const TEXTOS = [
  'No es que tengamos poco tiempo, es que perdemos mucho.',
  'La vida es larga si sabes emplearla.',
  'Lo breve & lo bueno <dos veces> bueno, dice "el sabio".',
];
const COTEJADAS = TEXTOS.map((_, i) => `seneca-brevedad-${i}`);
const TEXTO_SIN_OBRA = 'Mientras esperamos vivir, la vida pasa.';

/**
 * Una Cita en verso (AD-29), respaldada por su documento de verso —el mismo fixture de la 29.3—:
 * su Fragmento lleva cada salto como `<br>`, y leídos como saltos, el texto es su `texto`.
 */
const DOC_MARTI = 'fuentes/wikisource-es--versos-sencillos--versos-sencillos-i.txt';
const URL_MARTI = 'https://es.wikisource.org/wiki/Versos_sencillos/I';
const EN_VERSO = 'jose-marti-yo-vengo-de-todas-partes-y-hacia';
const TEXTO_EN_VERSO =
  'Yo vengo de todas partes,\nY hacia todas partes voy:\nArte soy entre las artes,\nEn los montes, monte soy.';
const AUTOR_MARTI = `nombre: José Martí
añoNacimiento: 1853
añoFallecimiento: 1895
semblanza: Poeta y político cubano.
ordenAlfabetico: Martí
`;

async function corpus(): Promise<Record<string, string>> {
  const url = `${WS}Sobre_la_brevedad_de_la_vida`;
  const c: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'autores/jose-marti.yml': AUTOR_MARTI,
    [DOC_MARTI]: await readFile(join(RAIZ, 'tests/unit/ayuda/lineas', 'wikisource-es--versos-sencillos--versos-sencillos-i.txt'), 'utf8'),
    'citas/jose-marti--yo-vengo-de-todas-partes-y-hacia.md': citaValida({
      slug: EN_VERSO,
      texto: TEXTO_EN_VERSO,
      autor: 'jose-marti',
      procedencia: { obra: 'Versos sencillos' },
      fuente: { id: 'wikisource-es', url: URL_MARTI },
    }),
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n  - ${SIN_OBRA}\n`,
    'citas/seneca--sin-obra.md': citaValida({
      slug: SIN_OBRA,
      texto: TEXTO_SIN_OBRA,
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

const TEXTO_DE: Record<string, string> = {
  ...Object.fromEntries(COTEJADAS.map((slug, i) => [slug, TEXTOS[i]])),
  [SIN_OBRA]: TEXTO_SIN_OBRA,
  [EN_VERSO]: TEXTO_EN_VERSO,
};

const VEDADOS = ['script', 'img', 'iframe', 'link', 'style', 'object', 'embed', 'svg'];

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/** El bloque de desplegables, de su apertura al cierre del `article`. */
function regionDeDesplegables(html: string): string {
  const inicio = html.indexOf('<div class="desplegables');
  expect(inicio, 'sin bloque de desplegables').toBeGreaterThan(-1);
  return html.slice(inicio, html.indexOf('</article>', inicio));
}

/** Los `<details>` del bloque, enteros, en orden. */
function detallesDe(region: string): string[] {
  return [...region.matchAll(/<details\b[\s\S]*?<\/details>/g)].map((m) => m[0]);
}

/** El valor del campo del Fragmento, decodificado. */
function fragmentoDe(html: string): string {
  const campos = [...html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g)].filter((m) => /\bdata-copiable\b/.test(m[1]));
  expect(campos).toHaveLength(1);
  return decodificar(campos[0][2]);
}

describe('Historia 30.4 — «Inserta esta cita» en la Página de Cita construida', () => {
  let proyecto = '';
  let rutas: string[] = [];
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const resultado = await construirConCorpus(await corpus(), { conBusqueda: true });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    rutas = (await readdir(join(proyecto, 'dist', 'cita'), { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => `/cita/${d.name}/`);
  }, 300_000);

  it('toda Página de Cita lo lleva: el último `<details>` del bloque, cerrado, con su `label`, su región vacía y su botón `hidden`', async () => {
    expect(rutas.sort()).toEqual([...COTEJADAS, SIN_OBRA, EN_VERSO].map((s) => `/cita/${s}/`).sort());
    for (const ruta of rutas) {
      const region = regionDeDesplegables(await html(ruta));
      expect(region, ruta).toMatch(/^<div class="desplegables[^"]*"[^>]*data-pagefind-ignore="all"/);
      const detalles = detallesDe(region);
      expect(detalles.map((d) => /<summary\b[\s\S]*?(Cómo citar|Inserta esta cita)[\s\S]*?<\/summary>/.exec(d)?.[1]), ruta).toEqual([
        'Cómo citar',
        'Inserta esta cita',
      ]);
      const inserta = detalles.at(-1)!;
      expect(inserta, ruta).not.toMatch(/<details\b[^>]*\bopen\b/);
      expect(inserta, ruta).toMatch(/<div\b[^>]*\bdata-inserta-esta-cita\b[^>]*\bdata-copiables\b/);
      expect(inserta.match(/<textarea\b[^>]*\bdata-copiable\b/g), ruta).toHaveLength(1);
      expect(inserta, ruta).toMatch(/<textarea\b[^>]*id="fragmento-para-insertar"[^>]*\breadonly\b/);
      expect(inserta, ruta).toMatch(
        /<label\b[^>]*for="fragmento-para-insertar"[^>]*>Pega este fragmento en tu página: lleva la cita, su autor y el enlace a esta página\.<\/label>/,
      );
      expect(inserta, ruta).toMatch(/<button\b[^>]*\bdata-copiar-texto\b[^>]*aria-label="Copiar el fragmento"[^>]*\bhidden\b/);
      const regiones = [...inserta.matchAll(/<p\b([^>]*)role="status"([^>]*)>([\s\S]*?)<\/p>/g)];
      expect(regiones, ruta).toHaveLength(1);
      expect(regiones[0][3], ruta).toBe('');
      expect(regiones[0][1] + regiones[0][2], ruta).not.toMatch(/\bhidden\b/);
      expect(regiones[0][1] + regiones[0][2], ruta).toContain('solo-para-lectores');
      // Ningún enlace de la página sale del bloque: el del Fragmento es texto del campo.
      expect(inserta, ruta).not.toMatch(/<a\b|data-zona|data-sin-zona/);
    }
  });

  it('el Fragmento es un solo `blockquote` sin nada vedado, con la canónica como único enlace y el texto literal', async () => {
    for (const ruta of rutas) {
      const pagina = await html(ruta);
      const canonica = decodificar(/<link rel="canonical" href="([^"]+)"/.exec(pagina)![1]);
      expect(canonica, ruta).toMatch(/^https?:\/\/[^?#]+$/);
      const fragmento = fragmentoDe(pagina);
      const raices: Elemento[] = [];
      const todos: Elemento[] = [];
      recorrerElementos(fragmento, (elemento, antepasados) => {
        todos.push(elemento);
        if (antepasados.length === 0) raices.push(elemento);
      });
      expect(raices.map((e) => e.etiqueta), ruta).toEqual(['blockquote']);
      expect(fragmento.trim().endsWith('</blockquote>'), ruta).toBe(true);
      for (const e of todos) {
        expect(VEDADOS, `${ruta}: <${e.etiqueta}>`).not.toContain(e.etiqueta);
        expect(e.atributos.has('class') || e.atributos.has('style'), `${ruta}: <${e.etiqueta}> con clase o estilo`).toBe(false);
        for (const nombre of e.atributos.keys()) expect(nombre, ruta).not.toMatch(/^on/);
      }
      const enlaces = todos.filter((e) => e.etiqueta === 'a');
      expect(enlaces.map((e) => e.atributos.get('href')), ruta).toEqual([canonica]);
      expect(fragmento, ruta).not.toMatch(/\bsrc=|[?&](de|via)=/);
      const primero = /<p>([\s\S]*?)<\/p>/.exec(fragmento)![1];
      const slug = ruta.split('/')[2];
      // Los `<br>` son los saltos de verso (versosDe): leídos como U+000A, el texto es el `texto`.
      expect(decodificar(primero.replaceAll('<br>', '\n')), ruta).toBe(TEXTO_DE[slug]);
      expect(primero, ruta).not.toContain('\n');
    }
  });

  it('con Obra lleva su título en `<cite>`; sin Obra, ninguno', async () => {
    expect(fragmentoDe(await html(`/cita/${COTEJADAS[0]}/`))).toContain(`<p>— Séneca, <cite>${BREVEDAD}</cite>. <a href=`);
    const sinObra = fragmentoDe(await html(`/cita/${SIN_OBRA}/`));
    expect(sinObra).not.toContain('<cite>');
    expect(sinObra).toContain('<p>— Séneca. <a href=');
  });

  it('en verso, cada salto es un `<br>` entre versos, y el campo no parte ningún U+000A', async () => {
    const primero = /<p>([\s\S]*?)<\/p>/.exec(fragmentoDe(await html(`/cita/${EN_VERSO}/`)))![1];
    expect(primero).toBe('Yo vengo de todas partes,<br>Y hacia todas partes voy:<br>Arte soy entre las artes,<br>En los montes, monte soy.');
    expect(primero.match(/<br>/g)).toHaveLength(3);
  });

  it('el texto con `&`, `<`, `>` y `"` va escapado en el Fragmento, y doblemente en el marcado del campo', async () => {
    const pagina = await html(`/cita/${COTEJADAS[2]}/`);
    expect(fragmentoDe(pagina)).toContain('<p>Lo breve &amp; lo bueno &lt;dos veces&gt; bueno, dice &quot;el sabio&quot;.</p>');
    expect(pagina).toContain('&lt;p&gt;Lo breve &amp;amp; lo bueno &amp;lt;dos veces&amp;gt;');
  });

  it('el JSON-LD no lleva el Fragmento', async () => {
    for (const ruta of rutas) {
      const pagina = await html(ruta);
      const ld = [...pagina.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      expect(ld.length, ruta).toBeGreaterThan(0);
      for (const cuerpo of ld) expect(cuerpo, ruta).not.toMatch(/blockquote|Pega este fragmento|Inserta esta cita/);
    }
  });

  it('Pagefind no lo indexa: lo que solo dice el bloque no da ninguna Página de Cita', async () => {
    const indice = await indiceDe(proyecto);
    try {
      const rutasDe = async (termino: string) =>
        (await Promise.all((await indice.search(termino)).results.map((r) => r.data()))).map((d) => d.url);
      for (const termino of ['fragmento', 'blockquote', 'pega', 'cite', 'inserta', 'insertar']) {
        expect((await rutasDe(termino)).filter((u) => u.startsWith('/cita/')), termino).toEqual([]);
      }
    } finally {
      indice.soltar();
    }
  });
});

describe('Historia 30.4 — `--mono` y `--codigo` son solo del campo del Fragmento', () => {
  it('en `src/` solo los nombran `tokens.css` e `InsertaEstaCita.astro`', async () => {
    const raiz = join(import.meta.dirname, '..', '..', 'src');
    const ficheros = (await readdir(raiz, { recursive: true, withFileTypes: true }))
      .filter((d) => d.isFile() && /\.(astro|css|ts|js|mjs)$/.test(d.name))
      .map((d) => join(d.parentPath, d.name));
    const nombran: string[] = [];
    for (const f of ficheros) {
      if (/var\(\s*--(mono|codigo)(?![\w-])|--(mono|codigo)\s*:/.test(await readFile(f, 'utf8'))) nombran.push(f.slice(raiz.length + 1));
    }
    expect(nombran.sort()).toEqual(['components/InsertaEstaCita.astro', 'styles/tokens.css']);
  });
});

describe('Historia 30.4 — una sola función nombra al Autor en la Atribución y en el Fragmento', () => {
  it('la Atribución nombra al Autor por `nombreEnAtribucion`, la misma función que el Fragmento', async () => {
    const atribucion = await readFile(join(import.meta.dirname, '..', '..', 'src', 'components', 'Atribucion.astro'), 'utf8');
    expect(atribucion).toMatch(/\{nombreEnAtribucion\(autor\)\}/);
    expect(atribucion).not.toMatch(/\{autor\.nombre\}/);
  });
});
