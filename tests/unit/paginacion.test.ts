import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AUTOR_VALIDO, RAIZ, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { CITAS_POR_PAGINA } from '../../src/lib/umbrales.ts';

/**
 * Historia 2.4 — paginación de listados largos.
 *
 * El corpus real no tiene ningún Autor con más de 50 Citas, y sembrarlo con cincuenta
 * frases inventadas para poder probar la paginación contaminaría el catálogo con
 * atribuciones sin verificar — justo lo que el producto promete que no ocurre. Así que
 * se construye un proyecto aparte con un corpus fabricado.
 */

/** `n` Citas del mismo Autor, todas válidas y con textos distintos. */
function citasDeUnAutor(n: number): Record<string, string> {
  const corpus: Record<string, string> = { 'autores/seneca.yml': AUTOR_VALIDO };
  for (let i = 0; i < n; i += 1) {
    const orden = String(i).padStart(3, '0');
    corpus[`citas/seneca--frase-${orden}.md`] = citaValida({
      texto: `Frase número ${orden} del catálogo de prueba.`,
      slug: `seneca-frase-${orden}`,
      temas: [],
    });
  }
  return corpus;
}

describe('Historia 2.4 — un listado por encima del umbral', () => {
  const total = CITAS_POR_PAGINA + 12;
  let proyecto: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus(citasDeUnAutor(total));
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  afterAll(async () => {
    // Si el build falló, `proyecto` no llegó a asignarse: limpiar a ciegas revienta con
    // un TypeError que tapa el error de verdad.
    if (proyecto) await limpiar(proyecto);
  });

  const leer = (ruta: string) => readFile(join(proyecto, 'dist', ruta), 'utf8');
  const contarTarjetas = (html: string) => [...html.matchAll(/<li class="tarjeta"/g)].length;

  it('la primera página trae exactamente el tamaño de página', async () => {
    expect(contarTarjetas(await leer('autor/seneca.html'))).toBe(CITAS_POR_PAGINA);
  });

  it('la segunda trae el resto', async () => {
    expect(contarTarjetas(await leer('autor/seneca/2.html'))).toBe(total - CITAS_POR_PAGINA);
  });

  it('aparecen controles de anterior y siguiente numerados', async () => {
    const primera = await leer('autor/seneca.html');
    expect(primera).toMatch(/Paginación del listado/);
    expect(primera).toMatch(/Siguiente/);
    expect(primera).toMatch(/Página\s*1\s*de\s*2/);
    // En la primera no hay «Anterior» que seguir.
    expect(primera).not.toMatch(/>Anterior</);

    const segunda = await leer('autor/seneca/2.html');
    expect(segunda).toMatch(/>Anterior</);
    expect(segunda).not.toMatch(/>Siguiente</);
    expect(segunda).toMatch(/Página\s*2\s*de\s*2/);
  });

  it('la segunda página y siguientes son rastreables pero no indexables', async () => {
    const segunda = await leer('autor/seneca/2.html');
    expect(segunda).toMatch(/<meta name="robots" content="noindex, follow">/);

    const primera = await leer('autor/seneca.html');
    expect(primera).not.toMatch(/noindex/);
  });

  it('cada página declara su propia canónica', async () => {
    expect(await leer('autor/seneca.html')).toMatch(/rel="canonical" href="[^"]*\/autor\/seneca"/);
    expect(await leer('autor/seneca/2.html')).toMatch(
      /rel="canonical" href="[^"]*\/autor\/seneca\/2"/,
    );
  });

  it('no hay dos filetes seguidos entre el listado y la paginación', async () => {
    // Regresión: la paginación traía su propio `border-top` y el listado ya cerraba con
    // el de su última tarjeta, así que salían dos reglas paralelas separadas por un
    // hueco. UX-DR13 hace del filete de 1px el único separador, no dos.
    const css = readFileSync(resolve(RAIZ, 'src/components/Paginacion.astro'), 'utf8');
    expect(css).not.toMatch(/border-top:\s*var\(--grosor-filete\)/);
  });

  it('ninguna Cita se pierde ni se repite entre páginas', async () => {
    const slugs = (html: string) =>
      [...html.matchAll(/href="\/cita\/(seneca-frase-\d+)"/g)].map((m) => m[1]);

    const todos = [
      ...slugs(await leer('autor/seneca.html')),
      ...slugs(await leer('autor/seneca/2.html')),
    ];
    expect(todos).toHaveLength(total);
    expect(new Set(todos).size).toBe(total);
  });
});

describe('Historia 2.4 — un listado en el umbral justo', () => {
  let proyecto: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus(citasDeUnAutor(CITAS_POR_PAGINA));
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  afterAll(async () => {
    // Si el build falló, `proyecto` no llegó a asignarse: limpiar a ciegas revienta con
    // un TypeError que tapa el error de verdad.
    if (proyecto) await limpiar(proyecto);
  });

  it('con el tamaño de página exacto no aparece paginación', async () => {
    const html = await readFile(join(proyecto, 'dist', 'autor', 'seneca.html'), 'utf8');
    expect(html).not.toMatch(/Paginación del listado/);
  });

  it('y no se genera una segunda página vacía', () => {
    expect(existsSync(join(proyecto, 'dist', 'autor', 'seneca', '2.html'))).toBe(false);
  });
});

describe('Historia 2.4 — el umbral tiene nombre', () => {
  it('vive en el módulo de umbrales y no como literal en la página', () => {
    const pagina = readFileSync(resolve(RAIZ, 'src/pages/autor/[slug]/[...page].astro'), 'utf8');
    expect(pagina).toMatch(/CITAS_POR_PAGINA/);
    expect(pagina).not.toMatch(/pageSize:\s*\d+/);
  });
});
