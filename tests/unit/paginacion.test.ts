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


/**
 * NFR-5 contra UX-DR18 — el paginador enseña los números de página.
 *
 * Medido a lo largo de treinta y cinco sesiones, y creciendo: **3 → 12 → 6 → 30 Páginas de Cita
 * fuera de los tres saltos** que NFR-5 exige desde la portada. La causa está medida desde la
 * 57.ª: los listados ordenan por slug, y con «Anterior/Siguiente» sola la página 3 está a tres
 * saltos y sus Citas a cuatro. Al pasar los Autores mayores de 150 Citas apareció la página 4,
 * y con ella veinticuatro Citas más fuera de alcance.
 *
 * Las dos salidas se midieron en la 57.ª y las dos doblan algo. La que se toma es **ésta**, y
 * el porqué merece quedar escrito:
 *
 *   · subir `CITAS_POR_PAGINA` sería **mover un umbral para que algo pase**, que es lo que la
 *     regla dura del bucle prohíbe;
 *   · enseñar los números contradice **UX-DR18**, que es una decisión de diseño escrita —pero
 *     no toca ningún umbral y **se revierte borrando este bloque**.
 *
 * Entre doblar una regla dura y doblar una decisión reversible, se dobla la reversible.
 *
 * **Y se añade, no se sustituye.** El «Página N de M» que UX-DR18 nombra sigue ahí: los números
 * van al lado. Así la decisión que se contradice es la mínima —«solo anterior y siguiente»— y
 * no la forma entera del control.
 *
 * El remedio anterior está agotado y consta: meter las Citas en Colecciones cubrió doce de doce
 * en la 57.ª y seis de doce en la 74.ª, porque lo que queda fuera es, por construcción, lo que
 * ningún criterio editorial reunió.
 */
describe('NFR-5 — desde la primera página se llega a todas', () => {
  const total = CITAS_POR_PAGINA * 3 + 5;
  let proyecto: string;

  beforeAll(async () => {
    const resultado = await construirConCorpus(citasDeUnAutor(total));
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  });

  afterAll(async () => {
    if (proyecto) await limpiar(proyecto);
  });

  const leer = (ruta: string) => readFile(join(proyecto, 'dist', ruta), 'utf8');

  it('la primera enlaza a todas las demás, no solo a la siguiente', async () => {
    const primera = await leer('autor/seneca.html');
    for (const n of [2, 3, 4]) {
      expect(primera, `falta el enlace a la página ${n}`).toContain(`/autor/seneca/${n}`);
    }
  });

  it('y la última enlaza de vuelta a la primera', async () => {
    // Sin esto, volver del final del listado costaría tres clics de «Anterior».
    const ultima = await leer('autor/seneca/4.html');
    expect(ultima).toMatch(/href="\/autor\/seneca\/?"/);
  });

  it('la página en la que se está no se enlaza a sí misma, y se dice cuál es', async () => {
    const tercera = await leer('autor/seneca/3.html');
    expect(tercera).toMatch(/aria-current="page"/);
  });

  it('el «Página N de M» que declara UX-DR18 sigue estando', async () => {
    // Los números se AÑADEN: la decisión que se contradice es la mínima posible.
    expect(await leer('autor/seneca/3.html')).toMatch(/Página\s*3\s*de\s*4/);
  });
});
