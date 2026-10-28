import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  type ResultadoBuild,
} from './ayuda/construir.js';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { grafoDeDist } from '../../tools/lib/alcance.ts';
import { rutaDeFicheroHtml } from '../../tools/lib/indexables.ts';

/**
 * Historia 26.8, AD-12 — dos construcciones del mismo commit en dos jornadas que cambian la Cita
 * del Día dan los mismos veredictos, los mismos avisos, el mismo sitemap y el mismo HTML, salvo
 * el subárbol `data-jornada` de la portada y del 404 —que pinta solo `CitaDelDia.astro`— y las
 * dos herramientas que existen para enseñar las jornadas (`/kit` y `/lote`).
 *
 * Es lo que impide que un veredicto del build cambie sin commit: si algo fuera de ese subárbol
 * rotara con el día, la puerta de NFR-5 podría pasar hoy y romper mañana sobre el mismo código.
 */

const pad = (n: number) => String(n).padStart(3, '0');

/** 51 Citas de Séneca (dos páginas), un Tema publicado y tres Citas aptas para portada. */
const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  ...Object.fromEntries(
    Array.from({ length: 51 }, (_, k) => {
      const i = k + 1;
      return [
        `citas/seneca--fragmento-${pad(i)}.md`,
        citaValida({
          slug: `seneca-fragmento-${pad(i)}`,
          texto: `Fragmento ${pad(i)} sobre la brevedad de la vida, que es larga si sabes usarla.`,
          temas: i <= MIN_CITAS_POR_TEMA ? ['el-tiempo'] : [],
          aptaParaPortada: i <= 3 ? true : undefined,
        }),
      ];
    }),
  ),
};

/** Lo que solo pueden diferir de un día a otro: las herramientas de jornadas. */
const HERRAMIENTAS = new Set(['kit/index.html', 'lote/index.html']);
/** Las que llevan la Cita del Día. */
const CON_CITA_DEL_DIA = new Set(['index.html', '404.html']);

/** Los ficheros de un `dist/`, por su ruta relativa. */
async function ficherosDe(dist: string): Promise<string[]> {
  return (await readdir(dist, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile())
    .map((e) => relative(dist, join(e.parentPath, e.name)))
    .sort();
}

/** El HTML sin el subárbol `data-jornada`: de su `<section` a su `</section>`. */
function sinLoQueRota(html: string): string {
  const marca = html.indexOf('data-jornada');
  if (marca === -1) return html;
  const desde = html.lastIndexOf('<section', marca);
  const hasta = html.indexOf('</section>', marca) + '</section>'.length;
  return html.slice(0, desde) + html.slice(hasta);
}

/** El texto de la Cita del Día de una página. */
function citaDelDia(html: string): string | undefined {
  const marca = html.indexOf('data-jornada');
  return marca === -1 ? undefined : /<p class="texto"[^>]*>([^<]*)<\/p>/u.exec(html.slice(marca))?.[1];
}

/** Las líneas de aviso de una salida, sin la hora que el registro les pone delante. */
const avisos = (salida: string) =>
  salida
    .split('\n')
    .filter((linea) => linea.includes('[WARN]'))
    .map((linea) => linea.replace(/^\S*\d\d:\d\d:\d\d\S*\s+/u, ''));

/** La línea de la puerta de NFR-5 y la de las Obras indexables: los veredictos del build. */
const veredictos = (salida: string) =>
  salida
    .split('\n')
    .filter((linea) => /NFR-5:|Obras publicadas|coinciden \(/u.test(linea))
    .map((linea) => linea.replace(/^\S*\d\d:\d\d:\d\d\S*\s+/u, ''));

describe('Historia 26.8 — dos jornadas, un mismo sitio', () => {
  let hoy: ResultadoBuild;
  let manana: ResultadoBuild;

  beforeAll(async () => {
    hoy = await construirConCorpus(CORPUS, { jornada: '2026-10-28' });
    manana = await construirConCorpus(CORPUS, { jornada: '2026-10-29' });
  });

  afterAll(async () => {
    for (const resultado of [hoy, manana]) if (resultado) await limpiar(resultado.proyecto);
  });

  const dist = (resultado: ResultadoBuild) => join(resultado.proyecto, 'dist');
  const leer = (resultado: ResultadoBuild, ruta: string) => readFile(join(dist(resultado), ruta), 'utf8');

  it('las dos construyen, y la Cita del Día cambia de verdad', async () => {
    expect(hoy.codigo, hoy.salida).toBe(0);
    expect(manana.codigo, manana.salida).toBe(0);
    for (const ruta of CON_CITA_DEL_DIA) {
      const una = citaDelDia(await leer(hoy, ruta));
      const otra = citaDelDia(await leer(manana, ruta));
      expect(una, ruta).toBeDefined();
      expect(otra, ruta).toBeDefined();
      expect(una, ruta).not.toBe(otra);
    }
  });

  it('mismos veredictos y mismos avisos', () => {
    expect(veredictos(hoy.salida).length).toBeGreaterThanOrEqual(2);
    expect(veredictos(manana.salida)).toEqual(veredictos(hoy.salida));
    expect(avisos(manana.salida)).toEqual(avisos(hoy.salida));
  });

  it('el mismo HTML, salvo el subárbol data-jornada de la portada y el 404, y /kit y /lote', async () => {
    const ficheros = await ficherosDe(dist(hoy));
    expect(await ficherosDe(dist(manana))).toEqual(ficheros);
    const html = ficheros.filter((f) => f.endsWith('.html'));
    expect(html.length).toBeGreaterThan(50);
    for (const ruta of html) {
      if (HERRAMIENTAS.has(ruta)) continue;
      const [una, otra] = [await leer(hoy, ruta), await leer(manana, ruta)];
      if (CON_CITA_DEL_DIA.has(ruta)) {
        expect(una, ruta).not.toBe(otra);
        expect(sinLoQueRota(otra), ruta).toBe(sinLoQueRota(una));
      } else {
        expect(otra, ruta).toBe(una);
      }
    }
  });

  it('el mismo sitemap', async () => {
    expect(await leer(manana, 'sitemap-0.xml')).toBe(await leer(hoy, 'sitemap-0.xml'));
  });

  it('el mismo grafo de enlaces del sitio construido, fuera de /kit y /lote', async () => {
    const grafo = async (resultado: ResultadoBuild) =>
      grafoDeDist(
        await Promise.all(
          (await ficherosDe(dist(resultado)))
            .filter((f) => f.endsWith('.html'))
            .map(async (f) => ({ ruta: rutaDeFicheroHtml(f), html: await leer(resultado, f) })),
        ),
      );
    /*
     * `/kit` y `/lote` enlazan a la Cita de su jornada fuera de cualquier `data-jornada`: son las
     * herramientas de las jornadas, y su HTML es lo único que puede rotar entero. No pesan en
     * ningún veredicto porque **ninguna otra página las enlaza**: el recorrido desde la portada
     * no pasa nunca por ellas. Eso es lo que se fija, y el resto del grafo es idéntico.
     */
    const HERRAMIENTAS_DE_JORNADA = ['/kit', '/lote'];
    const sinHerramientas = (g: Map<string, string[]>) =>
      new Map([...g].filter(([origen]) => !HERRAMIENTAS_DE_JORNADA.includes(origen)));
    const deHoy = await grafo(hoy);
    const deManana = await grafo(manana);
    expect(deHoy.size).toBeGreaterThan(50);
    expect(sinHerramientas(deManana)).toEqual(sinHerramientas(deHoy));
    for (const [origen, destinos] of sinHerramientas(deHoy)) {
      for (const herramienta of HERRAMIENTAS_DE_JORNADA) expect(destinos, origen).not.toContain(herramienta);
    }
  });
});
