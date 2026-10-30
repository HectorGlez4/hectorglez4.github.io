import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  TIENDA_DE_PRUEBA,
  citaValida,
  construirConCorpus,
  fuenteConModeloEncendido,
  fuenteConTiendaDePrueba,
  limpiar,
  paginaConstruida,
  type ResultadoBuild,
} from './ayuda/construir.js';
import { obrasDelDia } from '../../src/lib/citaDelDia.ts';
import { cierreDeLasObras } from '../../src/lib/atribucion.ts';
import { recuentoDeCitas } from '../../src/lib/recuentos.ts';
import { rutaDeLaObra } from '../../src/lib/obras.ts';
import { rutaDelDirectorioDeObras } from '../../src/lib/superficies.ts';
import { OBRAS_DE_LA_PORTADA } from '../../src/lib/umbrales.ts';
import { obrasDelCorpusEnDisco } from '../../integraciones/indexables.ts';
import { recorrerElementos, type Elemento } from '../../tools/lib/html.ts';

/**
 * Historia 28.3 — las Obras de la portada, sobre sitios construidos de verdad.
 *
 * Siete Autores con dos Obras indexables cada uno (y uno de ellos con una tercera que no se indexa)
 * y Séneca, de una sola Obra que no se indexa, con las Citas aptas para portada; Martí aporta dos
 * más, de su primera Obra. Tres construcciones a la misma jornada —la de siempre, una con la
 * jornada fijada en `corpus/portada.json` a la Cita de Martí, que cambia la Cita del Día, y otra con
 * la afiliación encendida, una tienda de prueba y ediciones en una ficha de las que salen ese día—
 * tienen que dar la misma sección «Obras»: no depende de la Cita del Día, de las fijaciones ni de
 * los Modelos, y la Obra de la Cita del Día sigue entre las de la regla. Otra, con la familia Obra
 * congelada en una copia de `umbrales.ts`, enseña solo Obras congeladas y conserva el bloque. Una
 * última, sin ninguna Obra indexable, no la lleva.
 */

const JORNADA = '2026-10-30';

/** Una Cita de Martí apta para portada, de su primera Obra: la que fija la jornada. */
const CITA_DE_MARTI = 'jose-marti-primero-1';
const OBRA_DE_MARTI = '/obra/jose-marti/primer-libro-de-marti/';

/** Los siete Autores con Obras indexables: slug, nombre y clave del Directorio. */
const AUTORES = [
  ['concepcion-arenal', 'Concepción Arenal', 'Arenal'],
  ['gustavo-adolfo-becquer', 'Gustavo Adolfo Bécquer', 'Bécquer'],
  ['rosalia-de-castro', 'Rosalía de Castro', 'Castro'],
  ['ruben-dario', 'Rubén Darío', 'Darío'],
  ['jose-de-espronceda', 'José de Espronceda', 'Espronceda'],
  ['benito-perez-galdos', 'Benito Pérez Galdós', 'Galdós'],
  ['jose-marti', 'José Martí', 'Martí'],
] as const;

const WS = 'https://es.wikisource.org/wiki/';

/** `n` Citas de una Obra, con su Fuente, para el corpus; las de `aptas` (por slug), aptas para portada. */
function sembrar(
  corpus: Record<string, string>,
  autor: string,
  clave: string,
  titulo: string,
  n: number,
  aptas: readonly string[] = [],
) {
  for (let i = 1; i <= n; i += 1) {
    const slug = `${autor}-${clave}-${i}`;
    corpus[`citas/${autor}--${clave}-${i}.md`] = citaValida({
      slug,
      autor,
      texto: `${titulo}, sentencia ${i}: lo que se aprende despacio se olvida tarde, ${autor}.`,
      procedencia: { obra: titulo, año: 1880 },
      fuente: { id: 'wikisource-es', url: `${WS}${encodeURIComponent(titulo.replaceAll(' ', '_'))}` },
      ...(aptas.includes(slug) ? { aptaParaPortada: true } : {}),
    });
  }
}

/** Séneca: tres Citas aptas para portada, todas de una sola Obra, que por eso no se indexa. */
function conSeneca(corpus: Record<string, string>): Record<string, string> {
  corpus['autores/seneca.yml'] = AUTOR_VALIDO;
  corpus['temas/el-tiempo.yml'] = TEMA_VALIDO;
  for (let i = 1; i <= 3; i += 1) {
    corpus[`citas/seneca--brevedad-${i}.md`] = citaValida({
      slug: `seneca-brevedad-${i}`,
      texto: `Sobre la brevedad, sentencia ${i}: no es que tengamos poco tiempo, es que perdemos mucho.`,
      aptaParaPortada: true,
    });
  }
  return corpus;
}

function corpusConObras(): Record<string, string> {
  const corpus = conSeneca({});
  for (const [slug, nombre, clave] of AUTORES) {
    corpus[`autores/${slug}.yml`] = [
      `nombre: ${nombre}`,
      'añoNacimiento: 1820',
      'añoFallecimiento: 1900',
      `semblanza: Escritor de prueba, ${clave}.`,
      `ordenAlfabetico: ${clave}`,
      '',
    ].join('\n');
    // Dos Citas de Martí aptas: con ellas y las tres de Séneca, la rotación de `JORNADA` da una de
    // Séneca, y la fijación a la de Martí cambia de verdad la Cita del Día.
    sembrar(corpus, slug, 'primero', `Primer libro de ${clave}`, 3, [CITA_DE_MARTI, 'jose-marti-primero-2']);
    sembrar(corpus, slug, 'segundo', `Segundo libro de ${clave}`, 2);
  }
  // Una tercera Obra de Martí, de una sola Cita: se publica (cuenta en el cierre) y no se indexa.
  sembrar(corpus, 'jose-marti', 'tercero', 'Tercer libro de Martí', 1);
  return corpus;
}

/**
 * La ficha de una Obra del conjunto con dos ediciones de la tienda de prueba (22.9): la primera de
 * Martí, que está entre las que salen en `JORNADA` (lo comprueba la prueba).
 */
const FICHA_CON_EDICIONES = [
  'autor: "jose-marti"',
  'titulo: "Primer libro de Martí"',
  'formas:',
  '  - "primer libro de marti"',
  'ediciones:',
  `  - tienda: "${TIENDA_DE_PRUEBA.clave}"`,
  '    formato: "impresa"',
  `    url: "https://www.${TIENDA_DE_PRUEBA.dominio}/dp/A1"`,
  `  - tienda: "${TIENDA_DE_PRUEBA.clave}"`,
  '    formato: "electronica"',
  `    url: "https://${TIENDA_DE_PRUEBA.dominio}/e/A2"`,
  '',
].join('\n');

/** Los elementos de `main`, con sus antepasados dentro de `main`. */
function elementosDeMain(html: string): { elemento: Elemento; antepasados: readonly Elemento[] }[] {
  const main = /<main\b[\s\S]*?<\/main>/.exec(html)![0];
  const todos: { elemento: Elemento; antepasados: readonly Elemento[] }[] = [];
  recorrerElementos(main, (elemento, antepasados) => todos.push({ elemento, antepasados: [...antepasados] }));
  return todos;
}

/** La sección «Obras» de la portada, tal cual, o `undefined`. */
function seccionDeObras(html: string): string | undefined {
  return /<section aria-labelledby="obras"[\s\S]*?<\/section>/.exec(html)?.[0];
}

/** Las rutas de las filas de Obras de la sección, en su orden. */
function rutasDeLasFilas(seccion: string): string[] {
  return [...seccion.matchAll(/<li class="fila-de-bloque" data-zona="obras-de-portada"[^>]*><a href="([^"]+)"/g)].map(
    (m) => m[1],
  );
}

/** La ruta de la Página de Cita a la que lleva «Ver esta cita» en la Cita del Día. */
function citaDelDiaEn(html: string): string {
  return /<p class="ir" data-zona="cita-del-dia"[^>]*>\s*<a href="([^"]+)"/.exec(html)![1];
}

const esDeObras = (e: Elemento) => e.atributos.get('data-zona') === 'obras-de-portada';
const marcado = (e: Elemento) => e.atributos.has('data-jornada');

/** Los Autores del fixture con su clave, como los recibe `obrasDelDia`. */
function autoresDelFixture() {
  return [
    ...AUTORES.map(([slug, , clave]) => ({ slug, ordenAlfabetico: clave })),
    { slug: 'seneca', ordenAlfabetico: 'Séneca' },
  ];
}

describe('Historia 28.3 — las Obras de la portada, construidas', () => {
  let base: ResultadoBuild;
  let fijada: ResultadoBuild;
  let afiliada: ResultadoBuild;
  let html = '';

  beforeAll(async () => {
    base = await construirConCorpus(corpusConObras(), { jornada: JORNADA });
    expect(base.codigo, base.salida).toBe(0);
    html = readFileSync(paginaConstruida(base.proyecto, '/'), 'utf8');

    // La misma jornada, fijada a la Cita de Martí, que no es la que da la rotación: la Cita del Día
    // cambia, las Obras no (lo comprueba la prueba).
    const conFijacion = corpusConObras();
    conFijacion['portada.json'] = JSON.stringify({ fijaciones: { [JORNADA]: CITA_DE_MARTI } }, null, 2);
    fijada = await construirConCorpus(conFijacion, { jornada: JORNADA });
    expect(fijada.codigo, fijada.salida).toBe(0);

    // La afiliación encendida, con tienda y ediciones en una ficha del conjunto: ningún enlace
    // comercial llega a la portada (las ediciones son de la Página de Obra).
    const conEdiciones = corpusConObras();
    conEdiciones['obras/jose-marti--primer-libro-de-marti.yml'] = FICHA_CON_EDICIONES;
    const ingreso = fuenteConModeloEncendido(
      fuenteConTiendaDePrueba(await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8')),
      'afiliacion-de-libros',
    );
    afiliada = await construirConCorpus(conEdiciones, { jornada: JORNADA, ficheros: { 'src/lib/ingreso.ts': ingreso } });
    expect(afiliada.codigo, afiliada.salida).toBe(0);
  }, 900_000);

  afterAll(async () => {
    for (const r of [base, fijada, afiliada]) if (r) await limpiar(r.proyecto);
  });

  it('«Obras» va entre «La cita de hoy» y «Temas», con su `h2`', () => {
    const main = /<main\b[\s\S]*?<\/main>/.exec(html)![0];
    const rotulos = [...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(
      (m) => `h${m[1]}:${m[2].replace(/<[^>]*>/g, '').trim()}`,
    );
    expect(rotulos.slice(0, 3)).toEqual(['h2:La cita de hoy', 'h2:Obras', 'h2:Temas']);
  });

  it(`${OBRAS_DE_LA_PORTADA} filas de Autores distintos, las de obrasDelDia sobre el mismo conjunto y en su orden`, async () => {
    const { indexables, publicadas } = await obrasDelCorpusEnDisco(base.proyecto);
    expect(indexables.length).toBe(AUTORES.length * 2);
    expect(publicadas.length).toBeGreaterThan(indexables.length);
    const esperadas = obrasDelDia(indexables, autoresDelFixture(), JORNADA);
    expect(esperadas).toHaveLength(OBRAS_DE_LA_PORTADA);

    const enlaces = elementosDeMain(html).filter(
      ({ elemento, antepasados }) =>
        elemento.etiqueta === 'a' && antepasados.some((a) => a.etiqueta === 'li' && esDeObras(a)),
    );
    expect(enlaces.map(({ elemento }) => elemento.atributos.get('href'))).toEqual(esperadas.map((o) => rutaDeLaObra(o)));
    expect(new Set(esperadas.map((o) => o.autor)).size).toBe(OBRAS_DE_LA_PORTADA);
    for (const { elemento } of enlaces) {
      expect(elemento.atributos.has('target')).toBe(false);
      // Cada fila lleva a una Página de Obra construida, que se indexa.
      const pagina = readFileSync(paginaConstruida(base.proyecto, elemento.atributos.get('href')!), 'utf8');
      expect(pagina).not.toMatch(/<meta name="robots" content="noindex/);
    }
  });

  it('cada fila nombra al Autor de su Obra, con su año y su recuento, tras el título de esa Obra', async () => {
    const { indexables } = await obrasDelCorpusEnDisco(base.proyecto);
    const porRuta = new Map(indexables.map((o) => [rutaDeLaObra(o), o]));
    const nombreDe = new Map<string, string>(AUTORES.map(([slug, nombre]) => [slug, nombre]));
    const filas = [
      ...seccionDeObras(html)!.matchAll(
        /<li class="fila-de-bloque" data-zona="obras-de-portada"[^>]*><a href="([^"]+)"[\s\S]*?<span class="titulo-de-obra"[^>]*>([^<]*)<\/span>[\s\S]*?<span class="hechos-de-obra"[^>]*>([\s\S]*?)<\/span><\/span><\/a>/g,
      ),
    ];
    expect(filas).toHaveLength(OBRAS_DE_LA_PORTADA);
    for (const [, href, titulo, hechos] of filas) {
      const obra = porRuta.get(href)!;
      expect(obra, href).toBeDefined();
      expect(titulo, href).toBe(obra.titulo);
      const partes = hechos
        .replace(/<span aria-hidden="true"[^>]*> · <\/span><span class="solo-para-lectores"[^>]*>, <\/span>/g, '|')
        .replace(/<[^>]*>/g, '')
        .split('|');
      expect(partes, href).toEqual([nombreDe.get(obra.autor), '1880', recuentoDeCitas(obra.recuento)]);
    }
  });

  it('cada fila dice el título y, detrás, los hechos con el punto medio oculto al lector', () => {
    const seccion = seccionDeObras(html)!;
    const filas = [...seccion.matchAll(/<li class="fila-de-bloque" data-zona="obras-de-portada"[\s\S]*?<\/li>/g)].map(
      (m) => m[0],
    );
    expect(filas).toHaveLength(OBRAS_DE_LA_PORTADA);
    for (const fila of filas) {
      expect(fila).toMatch(/<span class="titulo-de-obra"[^>]*>[^<]+<\/span><span class="solo-para-lectores"[^>]*>, <\/span><span class="hechos-de-obra"/);
      expect(fila).toMatch(/<span aria-hidden="true"[^>]*> · <\/span><span class="solo-para-lectores"[^>]*>, <\/span>/);
      expect(fila).toMatch(/1880/);
      expect(fila).toMatch(/[23] citas/);
      // Sin glifo de avance en las filas: lo lleva el cierre.
      expect(fila).not.toContain('›');
    }
  });

  it('las filas van dentro de un único subárbol que rota; el rótulo y el cierre, fuera', () => {
    const elementos = elementosDeMain(html);
    const filas = elementos.filter(({ elemento }) => elemento.etiqueta === 'li' && esDeObras(elemento));
    expect(filas).toHaveLength(OBRAS_DE_LA_PORTADA);
    const contenedores = new Set(filas.map(({ antepasados }) => antepasados.filter(marcado)).flat());
    expect(contenedores.size).toBe(1);
    const [contenedor] = contenedores;
    expect(contenedor.etiqueta).toBe('div');
    expect(contenedor.atributos.get('data-pagefind-ignore')).toBe('all');

    const rotulo = elementos.find(({ elemento }) => elemento.atributos.get('id') === 'obras')!;
    expect(rotulo.elemento.etiqueta).toBe('h2');
    expect(rotulo.antepasados.some(marcado)).toBe(false);

    const cierres = elementos.filter(({ elemento }) => elemento.etiqueta === 'p' && esDeObras(elemento));
    expect(cierres).toHaveLength(1);
    expect(cierres[0].antepasados.some(marcado)).toBe(false);
  });

  it('la sección entera —rótulo, filas y cierre— queda fuera de la búsqueda propia', () => {
    const seccion = elementosDeMain(html).find(
      ({ elemento }) => elemento.etiqueta === 'section' && elemento.atributos.get('aria-labelledby') === 'obras',
    )!;
    expect(seccion).toBeDefined();
    const ignorada = (e: Elemento) => e.atributos.get('data-pagefind-ignore') === 'all';
    expect(ignorada(seccion.elemento) || seccion.antepasados.some(ignorada)).toBe(true);
  });

  it('el cierre cuenta las Obras del Directorio —también las que no se indexan— y lleva a /obras/', async () => {
    const { publicadas } = await obrasDelCorpusEnDisco(base.proyecto);
    const seccion = seccionDeObras(html)!;
    const cierre = /<p data-zona="obras-de-portada"[^>]*><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/p>/.exec(seccion);
    expect(cierre).not.toBeNull();
    expect(cierre![1]).toBe(rutaDelDirectorioDeObras());
    expect(cierre![2].replace(/<[^>]*>/g, '')).toBe(`${cierreDeLasObras(publicadas.length)}&nbsp;›`);
    expect(cierre![2]).toMatch(/<span aria-hidden="true"[^>]*>&nbsp;›<\/span>/);
    // El mismo número que el Directorio de Obras construido.
    const directorio = readFileSync(paginaConstruida(base.proyecto, '/obras/'), 'utf8');
    const filasDelDirectorio = (directorio.match(/<a href="\/obra\//g) ?? []).length;
    expect(filasDelDirectorio).toBe(publicadas.length);
  });

  it('la fijación cambia la Cita del Día y no las Obras, y la Obra de esa Cita sigue entre ellas', () => {
    const htmlFijada = readFileSync(paginaConstruida(fijada.proyecto, '/'), 'utf8');
    // La fijación actúa: sin ella la rotación da otra Cita, con ella sale la de Martí.
    expect(citaDelDiaEn(html)).not.toBe(`/cita/${CITA_DE_MARTI}/`);
    expect(citaDelDiaEn(htmlFijada)).toBe(`/cita/${CITA_DE_MARTI}/`);
    // Las Obras son las mismas, y entre ellas, la de la Cita del Día fijada.
    expect(rutasDeLasFilas(seccionDeObras(htmlFijada)!)).toEqual(rutasDeLasFilas(seccionDeObras(html)!));
    expect(rutasDeLasFilas(seccionDeObras(htmlFijada)!)).toContain(OBRA_DE_MARTI);
  });

  it('la sección es idéntica con la jornada fijada y con la afiliación encendida, y no sale del sitio', () => {
    const otraFijada = seccionDeObras(readFileSync(paginaConstruida(fijada.proyecto, '/'), 'utf8'));
    const otraAfiliada = seccionDeObras(readFileSync(paginaConstruida(afiliada.proyecto, '/'), 'utf8'));
    const seccion = seccionDeObras(html)!;
    expect(otraFijada).toBe(seccion);
    expect(otraAfiliada).toBe(seccion);
    const hrefs = [...seccion.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBe(OBRAS_DE_LA_PORTADA + 1);
    for (const href of hrefs) expect(href).toMatch(/^\/(?!\/)/);
    expect(seccion).not.toContain(TIENDA_DE_PRUEBA.dominio);
    expect(seccion).not.toContain('data-ingreso');
    // La afiliación sí está encendida en esa copia, y la Obra con ediciones sale hoy en la portada:
    // su Página de Obra lleva la edición, y su fila no.
    expect(rutasDeLasFilas(otraAfiliada!)).toContain(OBRA_DE_MARTI);
    const deLaObra = readFileSync(paginaConstruida(afiliada.proyecto, OBRA_DE_MARTI), 'utf8');
    expect(deLaObra).toContain(TIENDA_DE_PRUEBA.dominio);
  });
});

describe('Historia 28.3 — con la familia Obra congelada, la portada enseña solo las congeladas', () => {
  let congelada: ResultadoBuild;
  /** Las dos fichas de la lista congelada, de dos Autores, y sus rutas en el orden del Directorio. */
  const CONGELADAS = ['concepcion-arenal--segundo-libro-de-arenal', 'jose-marti--primer-libro-de-marti'];
  const RUTAS = ['/obra/concepcion-arenal/segundo-libro-de-arenal/', OBRA_DE_MARTI];

  beforeAll(async () => {
    // `CONGELACION_DE_OBRAS` en la copia, nunca en el árbol (AD-21); la portada no la lee: le llega
    // por `obrasIndexables`.
    const original = await readFile(resolve(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    const declaracion = 'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;';
    expect(original).toContain(declaracion);
    const conCongelacion = original.replace(
      declaracion,
      `export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = {\n  desde: '2026-10-28',\n  indexables: [\n${CONGELADAS.map((n) => `    '${n}',`).join('\n')}\n  ],\n};`,
    );
    congelada = await construirConCorpus(corpusConObras(), {
      jornada: JORNADA,
      ficheros: { 'src/lib/umbrales.ts': conCongelacion },
    });
    expect(congelada.codigo, congelada.salida).toBe(0);
  }, 300_000);

  afterAll(async () => {
    if (congelada) await limpiar(congelada.proyecto);
  });

  it('las filas son las congeladas, una por Autor; el rótulo y el cierre siguen ahí', async () => {
    const html = readFileSync(paginaConstruida(congelada.proyecto, '/'), 'utf8');
    const seccion = seccionDeObras(html);
    expect(seccion).toBeDefined();
    expect(seccion).toMatch(/>Obras<\/h2>/);
    expect(rutasDeLasFilas(seccion!)).toEqual(RUTAS);
    // El cierre sigue contando todo el Directorio de Obras, congelado o no.
    const { publicadas } = await obrasDelCorpusEnDisco(congelada.proyecto);
    expect(seccion).toContain(`${cierreDeLasObras(publicadas.length)}<span aria-hidden="true"`);
    for (const ruta of RUTAS) {
      const pagina = readFileSync(paginaConstruida(congelada.proyecto, ruta), 'utf8');
      expect(pagina, ruta).not.toMatch(/<meta name="robots" content="noindex/);
    }
  });
});

describe('Historia 28.3 — sin ninguna Obra indexable, la portada no tiene «Obras»', () => {
  let sinObras: ResultadoBuild;

  beforeAll(async () => {
    // Solo Séneca, cuya única Obra reúne todas sus Citas: se publica y no se indexa.
    const corpus = conSeneca({});
    for (let i = 4; i <= 16; i += 1) {
      corpus[`citas/seneca--brevedad-${i}.md`] = citaValida({
        slug: `seneca-brevedad-${i}`,
        texto: `Sobre la brevedad, sentencia ${i}: no es que tengamos poco tiempo, es que perdemos mucho.`,
      });
    }
    sinObras = await construirConCorpus(corpus, { jornada: JORNADA });
    expect(sinObras.codigo, sinObras.salida).toBe(0);
  }, 300_000);

  afterAll(async () => {
    if (sinObras) await limpiar(sinObras.proyecto);
  });

  it('ni rótulo, ni lista, ni cierre', () => {
    const html = readFileSync(paginaConstruida(sinObras.proyecto, '/'), 'utf8');
    const main = /<main\b[\s\S]*?<\/main>/.exec(html)![0];
    expect(main).toContain('La cita de hoy');
    expect(main).not.toContain('aria-labelledby="obras"');
    expect(main).not.toMatch(/>Obras<\/h2>/);
    expect(main).not.toContain('obras-de-portada');
    // La marca de lo que rota queda solo para la Cita del Día.
    expect(main.split('data-jornada').length - 1).toBe(1);
  });
});
