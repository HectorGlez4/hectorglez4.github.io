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
import { recorrerElementos } from '../../tools/lib/html.ts';

/**
 * Historia 26.8, AD-12 — dos construcciones del mismo commit en dos jornadas que cambian la Cita
 * del Día dan los mismos veredictos, los mismos avisos, el mismo sitemap y el mismo HTML, salvo
 * los subárboles `data-jornada` de la portada y del 404 —que pinta solo `LoQueRota.astro`, para la
 * Cita del Día y, desde la 28.3, para las Obras de la portada— y las dos herramientas que existen
 * para enseñar las jornadas (`/kit` y `/lote`).
 *
 * Es lo que impide que un veredicto del build cambie sin commit: si algo fuera de ese subárbol
 * rotara con el día, la puerta de NFR-5 podría pasar hoy y romper mañana sobre el mismo código.
 */

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * 51 Citas de Séneca (dos páginas), un Tema publicado y tres Citas aptas para portada. Y, desde la
 * Historia 28.3, Epicteto con dos Obras indexables de dos Citas cada una: con un solo Autor en la
 * lista, la portada enseña una Obra cada jornada, y en dos jornadas seguidas enseña las dos.
 */
const OBRAS_DE_EPICTETO = [
  { titulo: 'Enquiridión', url: 'https://es.wikisource.org/wiki/Enquiridi%C3%B3n' },
  { titulo: 'Disertaciones', url: 'https://es.wikisource.org/wiki/Disertaciones' },
];
const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/epicteto.yml': [
    'nombre: Epicteto',
    'añoNacimiento: 50',
    'añoFallecimiento: 135',
    'semblanza: Filósofo estoico griego, esclavo liberto y maestro en Nicópolis.',
    'ordenAlfabetico: Epicteto',
    '',
  ].join('\n'),
  ...Object.fromEntries(
    OBRAS_DE_EPICTETO.flatMap(({ titulo, url }, o) =>
      [1, 2].map((i) => [
        `citas/epicteto--obra-${o}-${i}.md`,
        citaValida({
          slug: `epicteto-obra-${o}-maxima-${i}`,
          autor: 'epicteto',
          texto: `Máxima ${i} de ${titulo}: no te turban las cosas, sino lo que opinas de ellas.`,
          procedencia: { obra: titulo, año: 125 },
          fuente: { id: 'wikisource-es', url },
        }),
      ]),
    ),
  ),
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

/** Cuántos elementos marcados hay en el HTML, leído con el árbol de elementos. */
function marcados(html: string): number {
  let cuantos = 0;
  recorrerElementos(html, (elemento) => {
    if (elemento.atributos.has('data-jornada')) cuantos++;
  });
  return cuantos;
}

/**
 * El HTML sin **todos** los subárboles `data-jornada` (Historia 28.3: la Cita del Día y las Obras
 * de la portada): de la apertura del elemento marcado a su cierre, contando los anidados de la
 * misma etiqueta. El árbol de elementos dice cuántos hay antes y que no queda ninguno después.
 */
function sinLoQueRota(html: string): string {
  const antes = marcados(html);
  let resto = html;
  let quitados = 0;
  for (let marca = resto.indexOf('data-jornada'); marca !== -1; marca = resto.indexOf('data-jornada')) {
    const desde = resto.lastIndexOf('<', marca);
    const etiqueta = /^<([a-z][\w-]*)/u.exec(resto.slice(desde))![1];
    const abre = new RegExp(`<${etiqueta}[\\s>]|</${etiqueta}>`, 'gu');
    abre.lastIndex = desde + 1;
    let profundidad = 1;
    let hasta = -1;
    for (let m = abre.exec(resto); m !== null; m = abre.exec(resto)) {
      profundidad += m[0].startsWith('</') ? -1 : 1;
      if (profundidad === 0) {
        hasta = m.index + m[0].length;
        break;
      }
    }
    expect(hasta, `el subárbol marcado de <${etiqueta}> no se cierra`).toBeGreaterThan(desde);
    resto = resto.slice(0, desde) + resto.slice(hasta);
    quitados++;
  }
  expect(quitados).toBe(antes);
  expect(marcados(resto)).toBe(0);
  return resto;
}

/** Los títulos de las Obras de la portada, en su orden. */
function obrasDeLaPortada(html: string): string[] {
  return [...html.matchAll(/<span class="titulo-de-obra"[^>]*>([^<]*)<\/span>/gu)].map((m) => m[1]);
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

  /*
   * Historia 28.1 — la línea de cifras de la portada depende solo del Corpus del commit: es la
   * misma en las dos jornadas y no cuelga del subárbol que rota.
   */
  it('la línea de cifras de la portada es la misma en las dos jornadas, fuera del subárbol data-jornada', async () => {
    const lineas: string[] = [];
    for (const resultado of [hoy, manana]) {
      const html = await leer(resultado, 'index.html');
      const linea = /<p class="cifras[^"]*"[^>]*>([\s\S]*?)<\/p>/u.exec(html)?.[1];
      expect(linea).toBeDefined();
      lineas.push(linea!);
      // Sigue ahí cuando se quita lo que rota: no está dentro de él.
      expect(sinLoQueRota(html)).toContain(`>${linea}</p>`);
      // Y ningún antepasado suyo lleva la marca, leído con el árbol de elementos y no por un corte
      // del texto: la marca puede cambiar de elemento (la 28.2 rehace ese bloque).
      let conMarca = 0;
      const lineasEnElArbol: boolean[] = [];
      recorrerElementos(html, (elemento, antepasados) => {
        if (elemento.atributos.has('data-jornada')) conMarca++;
        if (elemento.etiqueta === 'p' && (elemento.atributos.get('class') ?? '').split(/\s+/u).includes('cifras')) {
          lineasEnElArbol.push(antepasados.some((a) => a.atributos.has('data-jornada')));
        }
      });
      expect(conMarca, 'la portada sin subárbol data-jornada: la prueba no miraría nada').toBeGreaterThan(0);
      expect(lineasEnElArbol).toEqual([false]);
    }
    expect(lineas[1]).toBe(lineas[0]);
    expect(lineas[0]).toBe('55 citas de 2 autores, cada una cotejada con el texto de su fuente.');
  });

  /*
   * Historia 28.3 — las Obras de la portada cambian de una jornada a otra, y solo dentro de su
   * subárbol: el rótulo «Obras» y el cierre a `/obras/` quedan fuera y son los mismos.
   */
  it('las Obras de la portada cambian entre las dos jornadas, dentro de su subárbol', async () => {
    const [una, otra] = [await leer(hoy, 'index.html'), await leer(manana, 'index.html')];
    for (const html of [una, otra]) {
      expect(obrasDeLaPortada(html)).toHaveLength(1);
      expect(marcados(html)).toBe(2);
      const limpio = sinLoQueRota(html);
      expect(obrasDeLaPortada(limpio)).toEqual([]);
      expect(limpio).toContain('>Obras</h2>');
      expect(limpio).toContain('href="/obras/"');
    }
    expect(obrasDeLaPortada(otra)).not.toEqual(obrasDeLaPortada(una));
    expect([...obrasDeLaPortada(una), ...obrasDeLaPortada(otra)].sort()).toEqual(
      OBRAS_DE_EPICTETO.map((o) => o.titulo).sort(),
    );
    // El 404 no lleva Obras: solo su Cita del Día.
    expect(marcados(await leer(hoy, '404.html'))).toBe(1);
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
