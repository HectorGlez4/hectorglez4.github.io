import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse as parsearYaml } from 'yaml';
import {
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
  type ResultadoBuild,
} from './ayuda/construir.js';
import { cierreDeLosAutores } from '../../src/lib/atribucion.ts';
import { aplanarAutor, autoresDestacados, temasPublicados, type Autor, type Cita } from '../../src/lib/publicado.ts';
import { rutaDeAutor, rutaDeColeccion, rutaDelDirectorioDeAutores, rutaDeTema } from '../../src/lib/superficies.ts';
import { AUTORES_DESTACADOS, MIN_CITAS_POR_COLECCION, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { recorrerElementos, type Elemento } from '../../tools/lib/html.ts';

/**
 * Historia 28.4 — «Temas», «Colecciones» y «Autores» de la portada, sobre sitios construidos de
 * verdad (FR-55, UX-DR62).
 *
 * Diez Autores con recuentos distintos y una clave de orden que no sigue el recuento: nueve
 * peninsulares y, el último por Citas, uno latinoamericano que solo entra entre los ocho por el
 * suelo de FR-8. Todas las Citas son de «El tiempo», y las primeras `MIN_CITAS_POR_TEMA` además de
 * «La calma»: dos Temas publicados; «La ira», con dos, no se publica. Dos Colecciones sobre su
 * umbral —una con un criterio largo y una palabra de más de treinta letras— y una tercera a un
 * miembro de él. Una segunda construcción, con dos Autores, sin Colecciones y sin ningún Tema
 * publicado.
 *
 * Lo que la portada enseña se compara con lo que dan `autoresDestacados` y `temasPublicados` sobre
 * el mismo Corpus que se construye, leído de los ficheros que la prueba escribe —los Autores por
 * `aplanarAutor`, como los recibe el build—: la página no elige ni ordena, y la prueba no copia a
 * mano lo que ya dicen los ficheros.
 */

const JORNADA = '2026-10-30';
const WS = 'https://es.wikisource.org/wiki/';

interface AutorDelFixture {
  slug: string;
  nombre: string;
  clave: string;
  tradicion: 'peninsular' | 'latinoamericana';
  citas: number;
}

/** Diez Autores: el recuento baja de arriba abajo, la clave del Directorio no. */
const DIEZ: readonly AutorDelFixture[] = [
  { slug: 'antonio-machado', nombre: 'Antonio Machado', clave: 'Machado', tradicion: 'peninsular', citas: 10 },
  { slug: 'baltasar-gracian', nombre: 'Baltasar Gracián', clave: 'Gracián', tradicion: 'peninsular', citas: 9 },
  { slug: 'francisco-de-quevedo', nombre: 'Francisco de Quevedo', clave: 'Quevedo', tradicion: 'peninsular', citas: 8 },
  { slug: 'miguel-de-unamuno', nombre: 'Miguel de Unamuno', clave: 'Unamuno', tradicion: 'peninsular', citas: 7 },
  { slug: 'concepcion-arenal', nombre: 'Concepción Arenal', clave: 'Arenal', tradicion: 'peninsular', citas: 6 },
  { slug: 'rosalia-de-castro', nombre: 'Rosalía de Castro', clave: 'Castro', tradicion: 'peninsular', citas: 5 },
  { slug: 'jose-de-espronceda', nombre: 'José de Espronceda', clave: 'Espronceda', tradicion: 'peninsular', citas: 4 },
  { slug: 'benito-perez-galdos', nombre: 'Benito Pérez Galdós', clave: 'Galdós', tradicion: 'peninsular', citas: 3 },
  { slug: 'mariano-jose-de-larra', nombre: 'Mariano José de Larra', clave: 'Larra', tradicion: 'peninsular', citas: 2 },
  { slug: 'jose-marti', nombre: 'José Martí', clave: 'Martí', tradicion: 'latinoamericana', citas: 1 },
];

const LATINOAMERICANO = 'jose-marti';

const CRITERIO_CORTO = 'Citas de una sola frase que se sostienen fuera de su obra.';
const CRITERIO_LARGO =
  'Citas que piden leerse despacio y volver a ellas: lo que la anticonstitucionalisimamenteexageradísima prisa de cada día deja sin pensar.';

function fichaDeAutor(a: AutorDelFixture): string {
  return [
    `nombre: ${a.nombre}`,
    'añoNacimiento: 1820',
    'añoFallecimiento: 1900',
    `semblanza: Escritor de prueba, ${a.clave}.`,
    `ordenAlfabetico: ${a.clave}`,
    `tradicion: ${a.tradicion}`,
    '',
  ].join('\n');
}

/** Los ficheros de un directorio del Corpus de la prueba, por slug y con su texto. */
function ficherosDe(corpus: Record<string, string>, dir: string): [string, string][] {
  return Object.entries(corpus)
    .filter(([ruta]) => ruta.startsWith(`${dir}/`))
    .map(([ruta, texto]) => [ruta.slice(dir.length + 1).replace(/\.(yml|md)$/, ''), texto]);
}

/** Los Autores del Corpus de la prueba, leídos de sus fichas como los lee el build: por `aplanarAutor`. */
function autoresDe(corpus: Record<string, string>): Autor[] {
  return ficherosDe(corpus, 'autores').map(([id, yaml]) =>
    aplanarAutor({ id, collection: 'autores', data: parsearYaml(yaml) } as unknown as Parameters<typeof aplanarAutor>[0]),
  );
}

/** Las Citas del Corpus de la prueba —su Autor y sus Temas—, leídas de su frontmatter. */
function citasDe(corpus: Record<string, string>): Cita[] {
  return ficherosDe(corpus, 'citas').map(([, md]) => {
    const { autor, temas } = parsearYaml(/^---\n([\s\S]*?)\n---/.exec(md)![1]) as Pick<Cita, 'autor' | 'temas'>;
    return { autor, temas } as Cita;
  });
}

/** Los Temas publicados del Corpus de la prueba, por `temasPublicados`. */
function temasPublicadosDe(corpus: Record<string, string>) {
  const temas = ficherosDe(corpus, 'temas').map(([slug, yaml]) => ({ slug, nombre: (parsearYaml(yaml) as { nombre: string }).nombre }));
  return temasPublicados(temas, citasDe(corpus));
}

/** Las Citas de un Autor del fixture, por slug, con sus Temas. */
function sembrarAutor(
  corpus: Record<string, string>,
  a: AutorDelFixture,
  temasDe: (indice: number) => string[],
  contador: { n: number },
  apta = false,
): string[] {
  const slugs: string[] = [];
  const titulo = `Libro de ${a.clave}`;
  for (let i = 1; i <= a.citas; i += 1) {
    const slug = `${a.slug}-libro-${i}`;
    corpus[`citas/${a.slug}--libro-${i}.md`] = citaValida({
      slug,
      autor: a.slug,
      texto: `${titulo}, sentencia ${i}: quien mira despacio ve más lejos que quien corre, ${a.slug}.`,
      temas: temasDe(contador.n),
      procedencia: { obra: titulo, año: 1880 },
      fuente: { id: 'wikisource-es', url: `${WS}${encodeURIComponent(titulo.replaceAll(' ', '_'))}` },
      ...(apta && i === 1 ? { aptaParaPortada: true } : {}),
    });
    contador.n += 1;
    slugs.push(slug);
  }
  return slugs;
}

function corpusDeDiez(): { corpus: Record<string, string>; slugs: string[] } {
  const corpus: Record<string, string> = {
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'temas/la-calma.yml': 'nombre: La calma\n',
    'temas/la-ira.yml': 'nombre: La ira\n',
  };
  const contador = { n: 0 };
  const temasDe = (i: number) => [
    'el-tiempo',
    ...(i < MIN_CITAS_POR_TEMA ? ['la-calma'] : []),
    ...(i >= MIN_CITAS_POR_TEMA && i < MIN_CITAS_POR_TEMA + 2 ? ['la-ira'] : []),
  ];
  const slugs: string[] = [];
  for (const [i, a] of DIEZ.entries()) {
    corpus[`autores/${a.slug}.yml`] = fichaDeAutor(a);
    slugs.push(...sembrarAutor(corpus, a, temasDe, contador, i === 0));
  }
  corpus['colecciones/breves.yml'] = coleccionValida({
    nombre: 'Breves',
    criterio: CRITERIO_CORTO,
    miembros: slugs.slice(0, MIN_CITAS_POR_COLECCION),
  });
  corpus['colecciones/despacio.yml'] = coleccionValida({
    nombre: 'Para leer despacio',
    criterio: CRITERIO_LARGO,
    miembros: slugs.slice(-MIN_CITAS_POR_COLECCION),
  });
  corpus['colecciones/casi.yml'] = coleccionValida({
    nombre: 'Casi colección',
    criterio: 'A una Cita de su umbral: no se publica.',
    miembros: slugs.slice(5, 5 + MIN_CITAS_POR_COLECCION - 1),
  });
  return { corpus, slugs };
}

/** Dos Autores, tres Citas cada uno, ningún Tema publicado y ninguna Colección. */
function corpusDeDos(): Record<string, string> {
  const corpus: Record<string, string> = { 'temas/el-tiempo.yml': TEMA_VALIDO };
  const contador = { n: 0 };
  for (const [i, a] of [DIEZ[0], DIEZ[9]].entries()) {
    const tres = { ...a, citas: 3 };
    corpus[`autores/${a.slug}.yml`] = fichaDeAutor(tres);
    sembrarAutor(corpus, tres, () => ['el-tiempo'], contador, i === 0);
  }
  return corpus;
}

/** Los elementos de `main`, con sus antepasados dentro de `main`. */
function elementosDeMain(html: string): { elemento: Elemento; antepasados: readonly Elemento[] }[] {
  const main = /<main\b[\s\S]*?<\/main>/.exec(html)![0];
  const todos: { elemento: Elemento; antepasados: readonly Elemento[] }[] = [];
  recorrerElementos(main, (elemento, antepasados) => todos.push({ elemento, antepasados: [...antepasados] }));
  return todos;
}

/** Los `h2` de `main`, por su texto, en orden. */
function rotulosDe(html: string): string[] {
  const main = /<main\b[\s\S]*?<\/main>/.exec(html)![0];
  return [...main.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]*>/g, '').trim());
}

/** Una sección de la portada por el `id` de su rótulo, tal cual, o `undefined`. */
function seccion(html: string, id: string): string | undefined {
  return new RegExp(`<section aria-labelledby="${id}"[\\s\\S]*?</section>`).exec(html)?.[0];
}

/** El texto de un fragmento de HTML, sin etiquetas y con `&nbsp;` como el carácter que es. */
const texto = (html: string) => html.replace(/<[^>]*>/g, '').replaceAll('&nbsp;', '\u00a0');

/** Las rutas de las filas de los Autores destacados, en su orden. */
function filasDeAutores(html: string): string[] {
  return elementosDeMain(html)
    .filter(
      ({ elemento, antepasados }) =>
        elemento.etiqueta === 'a' &&
        antepasados.some((a) => a.etiqueta === 'li' && a.atributos.get('data-zona') === 'autores-de-portada'),
    )
    .map(({ elemento }) => elemento.atributos.get('href')!);
}

/** El cierre de «Autores»: su `href` y su texto visible, glifo incluido. */
function cierreDe(html: string): { href: string; texto: string; marcado: string } | undefined {
  const m = /<p data-zona="autores-de-portada"[^>]*><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/p>/.exec(html);
  // Sin los atributos de ámbito de Astro, que no son del contrato.
  return m ? { href: m[1], texto: texto(m[2]), marcado: m[2].replace(/ data-astro-cid-[\w-]+/g, '') } : undefined;
}

/** La m de la línea de cifras: «… de {m} autores». */
function mDeLaLinea(html: string): string {
  const linea = /<p class="cifras"[^>]*>([\s\S]*?)<\/p>/.exec(html)![1];
  return /de ([\d.]+) autor/.exec(linea)![1];
}

describe('Historia 28.4 — Temas, Colecciones y ocho Autores en la portada, construidos', () => {
  let diez: ResultadoBuild;
  let dos: ResultadoBuild;
  let html = '';
  let htmlDeDos = '';
  const corpusDiez = corpusDeDiez().corpus;
  const corpusDos = corpusDeDos();

  beforeAll(async () => {
    diez = await construirConCorpus(corpusDiez, { jornada: JORNADA });
    expect(diez.codigo, diez.salida).toBe(0);
    html = readFileSync(paginaConstruida(diez.proyecto, '/'), 'utf8');

    dos = await construirConCorpus(corpusDos, { jornada: JORNADA });
    expect(dos.codigo, dos.salida).toBe(0);
    htmlDeDos = readFileSync(paginaConstruida(dos.proyecto, '/'), 'utf8');
  }, 600_000);

  afterAll(async () => {
    for (const r of [diez, dos]) if (r) await limpiar(r.proyecto);
  });

  it('los rótulos van en su orden: «Temas», «Colecciones» y «Autores» al final', () => {
    const rotulos = rotulosDe(html);
    expect(rotulos.slice(-3)).toEqual(['Temas', 'Colecciones', 'Autores']);
  });

  it('«Temas» enseña todos los publicados, en su orden, y ninguno más', () => {
    const temas = seccion(html, 'temas')!;
    expect(temas).toMatch(/<ul class="chips" data-zona="chip-de-tema"/);
    const rutas = [...temas.matchAll(/<a class="chip"[^>]* href="([^"]+)"|<a [^>]*href="([^"]+)"[^>]* class="chip"/g)].map(
      (m) => m[1] ?? m[2],
    );
    const esperados = temasPublicadosDe(corpusDiez).map((t) => rutaDeTema(t.slug));
    // El fixture publica dos de sus tres Temas: «La ira» se queda bajo su umbral.
    expect(esperados).toHaveLength(2);
    expect(rutas).toEqual(esperados);
    expect(temas).not.toContain('la-ira');
  });

  it('cada Colección publicada lleva su criterio entero debajo, como descripción de su chip', () => {
    const colecciones = seccion(html, 'colecciones')!;
    expect(colecciones).toMatch(/<ul class="colecciones" data-zona="colecciones"/);
    const chips = elementosDeMain(html).filter(
      ({ elemento, antepasados }) =>
        elemento.etiqueta === 'a' && antepasados.some((a) => a.atributos.get('data-zona') === 'colecciones'),
    );
    expect(chips.map(({ elemento }) => elemento.atributos.get('href'))).toEqual([
      rutaDeColeccion('breves'),
      rutaDeColeccion('despacio'),
    ]);
    for (const [slug, criterio] of [
      ['breves', CRITERIO_CORTO],
      ['despacio', CRITERIO_LARGO],
    ] as const) {
      const chip = chips.find(({ elemento }) => elemento.atributos.get('href') === rutaDeColeccion(slug))!;
      expect(chip.elemento.atributos.get('class')).toMatch(/\bchip\b/);
      const id = chip.elemento.atributos.get('aria-describedby');
      expect(id).toBe(`criterio-de-${slug}`);
      const p = new RegExp(`<p class="criterio"[^>]* id="${id}"[^>]*>([^<]*)</p>|<p id="${id}" class="criterio"[^>]*>([^<]*)</p>`).exec(
        colecciones,
      );
      expect(p, slug).not.toBeNull();
      expect(p![1] ?? p![2]).toBe(criterio);
      // Un solo elemento con ese id en la página: la descripción no es ambigua.
      expect(html.split(`id="${id}"`).length - 1).toBe(1);
    }
    // La tercera, a un miembro de su umbral, no sale: ni chip ni criterio.
    expect(colecciones).not.toContain('casi');
    expect(colecciones).not.toContain('Casi colección');
  });

  it(`«Autores» lleva los ${AUTORES_DESTACADOS} de autoresDestacados, en su orden, y ningún otro enlace a un Autor`, () => {
    const esperados = autoresDestacados(autoresDe(corpusDiez), citasDe(corpusDiez)).map((a) => rutaDeAutor(a.slug));
    expect(esperados).toHaveLength(AUTORES_DESTACADOS);
    // El latinoamericano, último por Citas, entra por el suelo; la página no lo decide.
    expect(esperados).toContain(rutaDeAutor(LATINOAMERICANO));
    // El orden es el del Directorio, no el del recuento.
    expect(esperados[0]).toBe(rutaDeAutor('concepcion-arenal'));

    expect(filasDeAutores(html)).toEqual(esperados);

    // Ningún otro enlace a una Página de Autor en `main` salvo la Atribución de la Cita del Día.
    const aAutores = elementosDeMain(html).filter(
      ({ elemento }) => elemento.etiqueta === 'a' && /^\/autor\//.test(elemento.atributos.get('href') ?? ''),
    );
    const fuera = aAutores.filter(
      ({ antepasados }) => !antepasados.some((a) => a.atributos.get('data-zona') === 'autores-de-portada'),
    );
    // El fixture siempre tiene Cita del Día (la primera de Machado es apta): su Atribución, exactamente una.
    expect(fuera.length).toBe(1);
    for (const { antepasados } of fuera) {
      const zona = [...antepasados].reverse().find((a) => a.atributos.has('data-zona'));
      expect(zona?.atributos.get('data-zona')).toBe('atribucion');
    }
    expect(html).not.toMatch(/<ul class="autores"/);
  });

  it('cada fila es una Fila de bloque con el nombre en `.nombre`, sin glifo ni otra cosa dentro', () => {
    const autores = seccion(html, 'autores')!;
    const filas = [...autores.matchAll(/<li class="fila-de-bloque" data-zona="autores-de-portada"[^>]*>([\s\S]*?)<\/li>/g)];
    expect(filas).toHaveLength(AUTORES_DESTACADOS);
    const nombres = new Map(DIEZ.map((a) => [rutaDeAutor(a.slug), a.nombre]));
    for (const [, fila] of filas) {
      const href = /<a href="([^"]+)"/.exec(fila)![1];
      expect(fila).toMatch(new RegExp(`<span class="nombre"[^>]*>${nombres.get(href)}</span>`));
      expect(texto(fila)).toBe(nombres.get(href));
      expect(fila).not.toContain('›');
    }
  });

  it('el cierre «Los {m} autores, de la A a la Z ›» lleva a /autores/ con la m de la línea de cifras', () => {
    const cierre = cierreDe(html)!;
    expect(cierre).toBeDefined();
    expect(cierre.href).toBe(rutaDelDirectorioDeAutores());
    expect(cierre.marcado.replaceAll('&nbsp;', '\u00a0')).toBe(`${cierreDeLosAutores(DIEZ.length)}<span aria-hidden="true">\u00a0›</span>`);
    expect(mDeLaLinea(html)).toBe(String(DIEZ.length));
    expect(cierre.texto).toContain(`Los ${mDeLaLinea(html)} autores`);
    // Va dentro de la sección, detrás de la lista.
    const autores = seccion(html, 'autores')!;
    expect(autores.indexOf('<p data-zona="autores-de-portada"')).toBeGreaterThan(autores.lastIndexOf('</ul>'));
  });

  it('todo va bajo data-pagefind-ignore="all", sin ningún data-ingreso', () => {
    const relevantes = elementosDeMain(html).filter(({ elemento }) =>
      ['chip-de-tema', 'colecciones', 'autores-de-portada'].includes(elemento.atributos.get('data-zona') ?? ''),
    );
    expect(relevantes.length).toBeGreaterThan(AUTORES_DESTACADOS);
    for (const { antepasados } of relevantes) {
      expect(antepasados.some((a) => a.atributos.get('data-pagefind-ignore') === 'all')).toBe(true);
    }
    expect(html).not.toContain('data-ingreso');
  });

  it('con dos Autores, sin Colecciones y sin Temas publicados: solo «Autores», con dos filas', () => {
    const rotulos = rotulosDe(htmlDeDos);
    expect(rotulos).not.toContain('Temas');
    expect(rotulos).not.toContain('Colecciones');
    expect(rotulos.at(-1)).toBe('Autores');
    // Lo que da `autoresDestacados` sobre el mismo Corpus de dos Autores: la prueba no reescribe la
    // regla de orden del Directorio.
    const esperados = autoresDestacados(autoresDe(corpusDos), citasDe(corpusDos)).map((a) => rutaDeAutor(a.slug));
    expect(esperados).toHaveLength(2);
    expect(filasDeAutores(htmlDeDos)).toEqual(esperados);
    const cierre = cierreDe(htmlDeDos)!;
    expect(cierre.texto).toBe(`${cierreDeLosAutores(2)}\u00a0›`);
    expect(mDeLaLinea(htmlDeDos)).toBe('2');
  });
});
