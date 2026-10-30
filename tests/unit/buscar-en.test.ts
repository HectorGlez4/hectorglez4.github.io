import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { guionesEnLinea, guionesExternosDe } from './ayuda/guion.js';
import { recorrerElementos, type Elemento } from '../../tools/lib/html.ts';
import {
  BOTON_DE_BUSCAR,
  ETIQUETA_DE_LA_BUSQUEDA,
  ROTULO_BUSCAR_EN_ESTA_OBRA,
  ROTULO_BUSCAR_EN_ESTE_TEMA,
  TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA,
  rotuloBuscarEnAutor,
} from '../../src/lib/busqueda.ts';
import { ARRANQUE_DE_MEDICION, ATRIBUTO_SIN_ZONA } from '../../src/lib/medicion.ts';

/**
 * Historia 27.8 — «Buscar en esta obra», «Buscar en {Autor}» y «Buscar en este tema», sobre `dist/`.
 *
 * El corpus es el de `obra-pagina.test.ts` sin Epicteto: Séneca, 55 Citas, todas con «El tiempo»
 * —así el Autor y el Tema paginan—; «Sobre la brevedad de la vida» 51 (pagina y no se indexa,
 * 93 %), «Cartas a Lucilio» 3 (se indexa) y «De la ira» 1 (no se indexa). Una segunda construcción
 * congela la familia Obra con `CONGELACION_DE_OBRAS` parcheada en su `umbrales.ts` (nunca el del
 * árbol, AD-21): ninguna Obra se indexa, y todas siguen llevando el formulario.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const BREVEDAD = '/obra/seneca/sobre-la-brevedad-de-la-vida/';
const CARTAS = '/obra/seneca/cartas-a-lucilio/';
const IRA = '/obra/seneca/de-la-ira/';
const AUTOR = '/autor/seneca/';
const TEMA = '/tema/el-tiempo/';

const fuente = (pagina: string) => ({ id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${pagina}` });

function corpus(): Record<string, string> {
  const citas: Record<string, string> = {};
  for (let i = 0; i < 51; i += 1) {
    citas[`citas/seneca--brevedad-${i}.md`] = citaValida({
      slug: `seneca-brevedad-${i}`,
      texto: `La brevedad ${i}: la vida es larga si se sabe usar, dijo el filósofo.`,
      temas: ['el-tiempo'],
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
      fuente: fuente('Sobre_la_brevedad_de_la_vida'),
    });
  }
  for (let i = 0; i < 3; i += 1) {
    citas[`citas/seneca--cartas-${i}.md`] = citaValida({
      slug: `seneca-cartas-${i}`,
      texto: `Carta ${i}: nadie se hace sabio por casualidad, y hay que aprenderlo.`,
      temas: ['el-tiempo'],
      procedencia: { obra: 'Cartas a Lucilio', año: 64 },
      fuente: fuente('Cartas_a_Lucilio'),
    });
  }
  citas['citas/seneca--ira-0.md'] = citaValida({
    slug: 'seneca-ira-0',
    texto: 'La ira es una locura breve que conviene evitar siempre.',
    temas: ['el-tiempo'],
    procedencia: { obra: 'De la ira', año: 41 },
    fuente: fuente('De_la_ira'),
  });
  return { 'autores/seneca.yml': AUTOR_VALIDO, 'temas/el-tiempo.yml': TEMA_VALIDO, ...citas };
}

/** Lo que cada página 1 tiene que llevar: rótulo y ocultos, en su orden. */
const ESPERADO: { ruta: string; rotulo: string; ocultos: [string, string][] }[] = [
  { ruta: BREVEDAD, rotulo: ROTULO_BUSCAR_EN_ESTA_OBRA, ocultos: [['autor', 'seneca'], ['obra', 'seneca--sobre-la-brevedad-de-la-vida']] },
  { ruta: CARTAS, rotulo: ROTULO_BUSCAR_EN_ESTA_OBRA, ocultos: [['autor', 'seneca'], ['obra', 'seneca--cartas-a-lucilio']] },
  { ruta: IRA, rotulo: ROTULO_BUSCAR_EN_ESTA_OBRA, ocultos: [['autor', 'seneca'], ['obra', 'seneca--de-la-ira']] },
  { ruta: AUTOR, rotulo: rotuloBuscarEnAutor('Séneca'), ocultos: [['autor', 'seneca']] },
  { ruta: TEMA, rotulo: ROTULO_BUSCAR_EN_ESTE_TEMA, ocultos: [['tema', 'el-tiempo']] },
];

const PAGINAS_2 = [`${BREVEDAD}2/`, `${AUTOR}2/`, `${TEMA}2/`];

const NOINDEX = /<meta name="robots" content="noindex, follow"/;

const ENTIDADES: Record<string, string> = { amp: '&', quot: '"', lt: '<', gt: '>', '#39': "'" };
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|quot|lt|gt|#39);/g, (_, e: string) => ENTIDADES[e])
    .replace(/\s+/g, ' ')
    .trim();

/** Los formularios de búsqueda de una página, enteros. */
const formulariosDeBusqueda = (html: string) =>
  [...html.matchAll(/<form\b[^>]*\brole="search"[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]);

/** Los antepasados del `<form role="search">`, del más lejano al más cercano. */
function antepasadosDelFormulario(html: string): readonly Elemento[] {
  let encontrados: readonly Elemento[] | undefined;
  recorrerElementos(html, (elemento, antepasados) => {
    if (elemento.etiqueta === 'form' && elemento.atributos.get('role') === 'search') encontrados = [...antepasados];
  });
  if (encontrados === undefined) throw new Error('No hay formulario de búsqueda.');
  return encontrados;
}

/** Comprueba un «Buscar en…» entero contra lo esperado. */
function comprobarBuscarEn(html: string, esperado: (typeof ESPERADO)[number]): void {
  const { ruta, rotulo, ocultos } = esperado;
  const formularios = formulariosDeBusqueda(html);
  expect(formularios, ruta).toHaveLength(1);
  const formulario = formularios[0];
  const apertura = /^<form\b[^>]*>/.exec(formulario)![0];
  expect(apertura, ruta).toMatch(/\bmethod="get"/);
  expect(apertura, ruta).toMatch(/\baction="\/buscar\/"/);
  expect(apertura, ruta).toMatch(/\bdata-pagefind-ignore\b/);
  expect(apertura, ruta).not.toMatch(/\btarget=/);

  // La etiqueta es el rótulo, y apunta al campo `q`, que no lleva ejemplo.
  const etiqueta = /<label\b[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/label>/.exec(formulario);
  expect(etiqueta, ruta).not.toBeNull();
  expect(texto(etiqueta![2]), ruta).toBe(rotulo);
  const campos = [...formulario.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
  const campo = campos.find((c) => /\bname="q"/.test(c));
  expect(campo, ruta).toBeDefined();
  expect(campo, ruta).toContain(`id="${etiqueta![1]}"`);
  expect(campo, ruta).toMatch(/\btype="search"/);
  expect(campo, ruta).toMatch(/\benterkeyhint="search"/);
  expect(campo, ruta).not.toMatch(/\bplaceholder=/);
  // El `id` es único en la página.
  expect(html.split(`id="${etiqueta![1]}"`).length - 1, ruta).toBe(1);

  // El botón «Buscar», `submit`, tras el campo.
  const botones = [...formulario.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  expect(botones, ruta).toHaveLength(1);
  expect(botones[0][1], ruta).toMatch(/\btype="submit"/);
  expect(botones[0][1], ruta).not.toMatch(/\bname=/);
  expect(texto(botones[0][2]), ruta).toBe(BOTON_DE_BUSCAR);
  expect(formulario.indexOf('<button'), ruta).toBeGreaterThan(formulario.indexOf(campo!));

  // Los ocultos, exactos y en su orden, después del campo.
  const deOcultos = campos.filter((c) => /\btype="hidden"/.test(c));
  expect(
    deOcultos.map((c) => [/\bname="([^"]*)"/.exec(c)?.[1], /\bvalue="([^"]*)"/.exec(c)?.[1]]),
    ruta,
  ).toEqual(ocultos);
  expect(campos.indexOf(campo!), ruta).toBe(0);

  comprobarSinZona(html, ruta);
}

/** Sin zona: ni el formulario de búsqueda ni ningún antepasado suyo la declara ni la exime. */
function comprobarSinZona(html: string, ruta: string): void {
  for (const antepasado of antepasadosDelFormulario(html)) {
    expect(antepasado.atributos.has('data-zona'), `${ruta}: <${antepasado.etiqueta}>`).toBe(false);
    expect(antepasado.atributos.has(ATRIBUTO_SIN_ZONA), `${ruta}: <${antepasado.etiqueta}>`).toBe(false);
  }
  const apertura = /<form\b[^>]*\brole="search"[^>]*>/.exec(html)![0];
  expect(apertura, ruta).not.toMatch(/\bdata-zona=|\bdata-sin-zona=/);
}

/** Las rutas de cada HTML de `dist/`: `x/index.html` → `/x/`, `404.html` → `/404`. */
async function paginasDe(dist: string): Promise<{ ruta: string; fichero: string }[]> {
  const ficheros = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith('.html'));
  return ficheros.map((f) => {
    const relativo = f.split(sep).join('/');
    const ruta = relativo.endsWith('index.html') ? `/${relativo.slice(0, -'index.html'.length)}` : `/${relativo.slice(0, -'.html'.length)}`;
    return { ruta, fichero: join(dist, f) };
  });
}

describe('Historia 27.8 — «Buscar en…», construido', () => {
  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const resultado = await construirConCorpus(corpus());
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  }, 300_000);

  it('la página 1 de cada Obra —indexable o no—, del Autor y del Tema lleva un solo «Buscar en…» con sus filtros', async () => {
    // Las tres Obras: «Cartas» se indexa; «Brevedad» e «Ira», no.
    expect(await html(CARTAS)).not.toMatch(NOINDEX);
    expect(await html(BREVEDAD)).toMatch(NOINDEX);
    expect(await html(IRA)).toMatch(NOINDEX);
    for (const esperado of ESPERADO) comprobarBuscarEn(await html(esperado.ruta), esperado);
  });

  it('las páginas 2 no lo llevan, ni cargan un guion distinto de su página 1', async () => {
    for (const ruta of PAGINAS_2) {
      const segunda = await html(ruta);
      expect(formulariosDeBusqueda(segunda), ruta).toEqual([]);
      expect(segunda, ruta).not.toContain('class="buscar-en');
      const primera = await html(ruta.replace(/2\/$/, ''));
      expect(guionesEnLinea(primera), ruta).toEqual(guionesEnLinea(segunda));
      expect(guionesExternosDe(primera), ruta).toEqual(guionesExternosDe(segunda));
    }
  });

  it('en el Autor y en el Tema, el formulario va justo encima del listado que filtra', async () => {
    for (const ruta of [AUTOR, TEMA]) {
      const pagina = await html(ruta);
      const fin = pagina.indexOf('</form>', pagina.indexOf('class="buscar-en'));
      const despues = pagina.slice(fin + '</form>'.length).trimStart();
      expect(despues, ruta).toMatch(/^<ul class="listado"/);
    }
  });

  it('en la Obra va debajo: tras el listado y su paginación, antes de Temas y de «Dónde leer» (UX v8.4)', async () => {
    for (const ruta of [BREVEDAD, CARTAS, IRA]) {
      const pagina = await html(ruta);
      const posicion = (marca: string) => pagina.indexOf(marca);
      // La Cabecera sigue dando directamente al listado, como sin formulario (24.1, 24.7).
      expect(pagina, ruta).toMatch(/<\/header>\s*<ul class="listado"/);
      const formulario = posicion('<form class="buscar-en"');
      expect(formulario, ruta).toBeGreaterThan(posicion('class="listado"'));
      // Justo detrás de la paginación —«Brevedad» pagina— o, sin ella, del cierre del listado.
      const antes = pagina.slice(0, formulario).trimEnd();
      if (ruta === BREVEDAD) {
        expect(posicion('class="paginacion"'), ruta).toBeGreaterThan(posicion('class="listado"'));
        expect(formulario, ruta).toBeGreaterThan(posicion('class="paginacion"'));
        expect(antes, ruta).toMatch(/<\/nav>$/);
      } else {
        expect(pagina, ruta).not.toContain('class="paginacion"');
        expect(antes, ruta).toMatch(/<\/ul>$/);
      }
      for (const despues of ['class="temas"', 'class="donde-leer"']) {
        expect(posicion(despues), `${ruta}: ${despues}`).toBeGreaterThan(formulario);
      }
    }
  });

  it('ninguna ruta nueva: el sitemap no anuncia `/buscar/`, y lo que entra en Pagefind es lo del sitemap y nada más', async () => {
    const dist = join(proyecto, 'dist');
    const xml = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
    expect(xml).not.toContain('/buscar');
    expect(xml).not.toMatch(/\?q=/);
    // Pagefind indexa solo lo que lleva `data-pagefind-body`: es el mismo conjunto que el sitemap,
    // sin `/buscar/`, y el texto de «Buscar en…» queda fuera por su `data-pagefind-ignore`.
    const delSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).sort();
    const indexadas: string[] = [];
    for (const { ruta, fichero } of await paginasDe(dist)) {
      if (/<main\b[^>]*\bdata-pagefind-body/.test(await readFile(fichero, 'utf8'))) indexadas.push(ruta);
    }
    expect(indexadas.sort()).toEqual(delSitemap);
    expect(indexadas).not.toContain('/buscar/');
    for (const { ruta } of ESPERADO) {
      for (const formulario of formulariosDeBusqueda(await html(ruta))) {
        expect(/^<form\b[^>]*>/.exec(formulario)![0], ruta).toMatch(/\bdata-pagefind-ignore\b/);
      }
    }
  });

  it('el 404 lleva el Campo con su ejemplo y el botón, y sigue sin guion propio', async () => {
    const pagina = await html('/404');
    const formularios = formulariosDeBusqueda(pagina);
    expect(formularios).toHaveLength(1);
    const formulario = formularios[0];
    expect(formulario).toMatch(/^<form\b[^>]*\baction="\/buscar\/"/);
    expect(formulario).toMatch(/^<form\b[^>]*\bmethod="get"/);
    expect(texto(/<label\b[^>]*\bfor="consulta"[^>]*>([\s\S]*?)<\/label>/.exec(formulario)![1])).toBe(
      ETIQUETA_DE_LA_BUSQUEDA,
    );
    const campo = /<input\b[^>]*\bid="consulta"[^>]*>/.exec(formulario)![0];
    expect(campo).toMatch(/\bname="q"/);
    expect(campo).toContain(`placeholder="${TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA}"`);
    expect(campo).toMatch(/\benterkeyhint="search"/);
    const boton = /<button\b([^>]*)>([\s\S]*?)<\/button>/.exec(formulario);
    expect(boton).not.toBeNull();
    expect(boton![1]).toMatch(/\btype="submit"/);
    // Sin `name`, que añadiría algo a la dirección, y tras el campo, como en «Buscar en…».
    expect(boton![1]).not.toMatch(/\bname=/);
    expect(formulario.indexOf('<button')).toBeGreaterThan(formulario.indexOf(campo));
    expect(texto(boton![2])).toBe(BOTON_DE_BUSCAR);
    expect(guionesEnLinea(pagina)).toEqual([ARRANQUE_DE_MEDICION]);
    expect(guionesExternosDe(pagina)).toEqual([]);
    comprobarSinZona(pagina, '/404');
  });

  it('el Campo sin botón sale como antes: ni `/buscar/` ni los Directorios llevan «Buscar» ni tecla de buscar', async () => {
    for (const ruta of ['/buscar/', '/autores/', '/obras/']) {
      const pagina = await html(ruta);
      expect(pagina, ruta).toContain('class="campo-de-busqueda');
      expect(pagina, ruta).not.toMatch(/<button\b[^>]*\btype="submit"/);
      expect(pagina, ruta).not.toMatch(/\benterkeyhint=/);
    }
  });
});

describe('Historia 27.8 — «Buscar en…» con la familia Obra congelada', () => {
  let proyecto = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const original = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    const declaracion = 'export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = undefined;';
    expect(original).toContain(declaracion);
    const congelado = original.replace(
      declaracion,
      "export const CONGELACION_DE_OBRAS: CongelacionDeObras | undefined = {\n  desde: '2026-12-06',\n  indexables: [\n    'seneca--sobre-la-brevedad-de-la-vida',\n  ],\n};",
    );
    const resultado = await construirConCorpus(corpus(), { ficheros: { 'src/lib/umbrales.ts': congelado } });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
  }, 300_000);

  it('toda página 1 de Obra lleva el formulario, también la que dejó de indexarse por la congelación', async () => {
    // «Cartas» cumple FR-52 y no está en la lista congelada: `noindex`, y con su «Buscar en esta obra».
    // «Brevedad» está en la lista pero no cumple FR-52, e «Ira» tampoco: ninguna Obra se indexa.
    for (const ruta of [CARTAS, BREVEDAD, IRA]) expect(await html(ruta), ruta).toMatch(NOINDEX);
    for (const esperado of ESPERADO) comprobarBuscarEn(await html(esperado.ruta), esperado);
    expect(formulariosDeBusqueda(await html(`${BREVEDAD}2/`))).toEqual([]);
  });
});

/*
 * Un filtro vacío detiene la construcción, nombrando el rótulo y el campo: un oculto `tema=""` lo
 * leería `/buscar/` como «sin filtro», y la búsqueda saldría sin acotar bajo «Buscar en este tema».
 * La página de Tema se parchea en la copia (nunca la del árbol, AD-21) para pasar un valor en blanco.
 */
describe('Historia 27.8 — «Buscar en…» con un filtro vacío', () => {
  it('no construye, y dice qué rótulo y qué filtro iban vacíos', async () => {
    const pagina = 'src/pages/tema/[slug]/[...page].astro';
    const original = await readFile(join(RAIZ, pagina), 'utf8');
    const llamada = 'filtros={{ tema: tema.slug }}';
    expect(original).toContain(llamada);
    const resultado = await construirConCorpus(corpus(), {
      ficheros: { [pagina]: original.replace(llamada, "filtros={{ tema: ' ' }}") },
    });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toContain(`«${ROTULO_BUSCAR_EN_ESTE_TEMA}»: el filtro «tema» va vacío.`);
  }, 300_000);
});
