import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { indiceDe } from './ayuda/pagefind.ts';
import { comprobarFiltroEjecutado, guionDelFiltro } from './ayuda/filtroEjecutado.js';
import { rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { aristasQueFaltan, grafoDeDist, modeloDelCorpus } from '../../tools/lib/alcance.ts';
import { MIN_CITAS_POR_PERSONAJE } from '../../src/lib/umbrales.ts';

/**
 * Historia 35.5 — los Personajes en los Directorios y en la búsqueda, sobre un sitio construido.
 *
 * Dos Personajes y dos Autores, en un mismo Tema que llega a `MIN_CITAS_POR_TEMA` con atribuidas
 * de relleno de la Autora Viva:
 *
 *   · **Batman** (DC Comics) dice **B1** y **B2**, de su Obra «El caballero», sin Autor, y **B3**,
 *     con Séneca, de «Obras de Séneca», que es de Séneca;
 *   · **El Zorro** dice **Z1**, sin Autor ni Obra: una sola Cita, bajo `MIN_CITAS_POR_PERSONAJE`;
 *   · **S1** es la de siempre de Séneca.
 *
 * La puerta de la atribuida se abre en la copia (`conLaPuertaAbierta`), nunca en el árbol. Lo puro
 * —las secciones, el filtro y el estado de `/buscar/`— está en `directorio-de-autores.test.ts`,
 * `directorio-de-obras.test.ts`, `filtro-del-directorio.test.ts` y `busqueda-con-filtros.test.ts`.
 */

const AUTOR_VIVO = `nombre: "Autora Viva"
vivo: true
semblanza: "Escritora de hoy."
ordenAlfabetico: "Viva"
`;

const BATMAN = `nombre: "Batman"
universo: "DC Comics"
ordenAlfabetico: "Batman"
`;

const ZORRO = `nombre: "El Zorro"
universo: "Johnston McCulley"
ordenAlfabetico: "Zorro"
`;

const FICHA_DE_BATMAN = `personaje: "batman"
personajes:
  - "batman"
titulo: "El caballero"
formas:
  - "el caballero"
`;

const B1 = 'batman-soy-la-noche';
const B2 = 'batman-la-capa-pesa-menos';
const B3 = 'seneca-con-batman-y-obra';
const Z1 = 'zorro-la-espada-firma';

const atribuida = (campos: Record<string, unknown>) =>
  citaValida({ clase: 'atribuida', estadoDerechos: undefined, fuente: undefined, ...ATESTIGUADA, ...campos });

/** Seis palabras por un xorshift sembrado con n: ningún relleno casa con otro por `parecidoEntre`. */
const PALABRAS = ['río', 'piedra', 'luz', 'sombra', 'camino', 'viento', 'mar', 'fuego', 'nube', 'árbol', 'pan',
  'sal', 'hierro', 'vidrio', 'lluvia', 'nieve', 'campo', 'puerta', 'casa', 'libro', 'sueño', 'voz', 'mano'];
const textoPropio = (n: number) => {
  let x = (n * 2654435761) >>> 0;
  const palabras: string[] = [];
  for (let k = 0; k < 6; k += 1) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    palabras.push(PALABRAS[x % PALABRAS.length]);
  }
  return `Relleno ${n}: ${palabras.join(' y ')}.`;
};

const RELLENOS = 12;

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/vivo.yml': AUTOR_VIVO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'personajes/batman.yml': BATMAN,
  'personajes/zorro.yml': ZORRO,
  'obras/batman--el-caballero.yml': FICHA_DE_BATMAN,
  'citas/batman--soy-la-noche.md': atribuida({
    slug: B1,
    texto: 'Soy la noche que vigila la ciudad dormida.',
    autor: undefined,
    personaje: 'batman',
    procedencia: { obra: 'El caballero', año: 2000 },
  }),
  'citas/batman--la-capa-pesa-menos.md': atribuida({
    slug: B2,
    texto: 'La capa pesa menos que el recuerdo de aquella calle.',
    autor: undefined,
    personaje: 'batman',
    procedencia: { obra: 'El caballero', año: 2000 },
  }),
  'citas/seneca--con-batman-y-obra.md': atribuida({
    slug: B3,
    texto: 'Quien guarda silencio en el tejado conoce cada promesa.',
    autor: 'seneca',
    personaje: 'batman',
    procedencia: { obra: 'Obras de Séneca', año: 2000 },
  }),
  'citas/zorro--la-espada-firma.md': atribuida({
    slug: Z1,
    texto: 'La espada firma lo que la boca calla en la plaza.',
    autor: undefined,
    personaje: 'zorro',
    procedencia: { año: 1919 },
  }),
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};
for (let i = 1; i <= RELLENOS; i += 1) {
  const n = String(i).padStart(2, '0');
  CORPUS[`citas/vivo--relleno-${n}.md`] = atribuida({
    slug: `vivo-relleno-${n}`,
    texto: textoPropio(i),
    autor: 'vivo',
    procedencia: { obra: 'Relleno de la autora', año: 2011 },
  });
}

let proyecto = '';
let salida = '';
let codigo = -1;

beforeAll(async () => {
  const r = await construirConCorpus(CORPUS, { jornada: '2026-11-13', ficheros: conLaPuertaAbierta(), conBusqueda: true });
  proyecto = r.proyecto;
  salida = r.salida;
  codigo = r.codigo;
}, 600_000);

afterAll(async () => {
  if (proyecto !== '') await limpiar(proyecto);
});

const html = (ruta: string) => readFileSync(paginaConstruida(proyecto, ruta), 'utf8');
/** El contenido del `<main>` de una página. */
const main = (ruta: string) => /<main\b[\s\S]*?<\/main>/u.exec(html(ruta))?.[0] ?? '';
/** La sección «Personajes» de un Directorio: desde su `data-personajes` hasta el cierre del listado. */
const seccion = (ruta: string) => {
  const pagina = main(ruta);
  const desde = pagina.indexOf('data-personajes');
  return desde < 0 ? '' : pagina.slice(pagina.lastIndexOf('<section', desde));
};

describe('Historia 35.5 — construye', () => {
  it('construye: el grafo del modelo, con las aristas de los Personajes, está en dist/', () => {
    expect(codigo, salida.slice(-3000)).toBe(0);
    expect(MIN_CITAS_POR_PERSONAJE).toBeGreaterThan(1);
  });
});

describe('Historia 35.5 — `/autores/` con la sección «Personajes»', () => {
  it('el salto bajo el `h1` va al `h2` «Personajes», que es destino del foco y va tras la A–Z', () => {
    const pagina = main('/autores/');
    expect(pagina).toMatch(/<\/h1>\s*<p data-salto style="[^"]*"[^>]*><a href="#personajes" style="[^"]*color: var\(--siena\)[^"]*text-decoration: underline"[^>]*>Personajes<\/a><\/p>/u);
    expect(pagina).toMatch(/<h2 class="rotulo" id="personajes" tabindex="-1"[^>]*>Personajes<\/h2>/u);
    // Tras el último grupo de la A–Z (la V de la Autora Viva).
    expect(pagina.indexOf('id="personajes"')).toBeGreaterThan(pagina.indexOf('href="/autor/vivo/"'));
    expect(pagina.indexOf('href="/personaje/batman/"')).toBeGreaterThan(pagina.indexOf('id="personajes"'));
  });

  it('sus letras propias, con anclas que no chocan con las de los Autores, y un `h3` por letra', () => {
    const s = seccion('/autores/');
    expect(s).toMatch(/<nav id="letras-de-personajes" class="letras" aria-label="Letras" tabindex="-1"/u);
    for (const [letra, ancla] of [
      ['B', 'personajes-letra-b'],
      ['Z', 'personajes-letra-z'],
    ]) {
      expect(s).toMatch(new RegExp(`<a href="#${ancla}"[^>]*><span class="solo-para-lectores"[^>]*>Personajes por la </span>${letra}</a>`, 'u'));
      expect(s).toMatch(new RegExp(`<h3 class="rotulo" id="${ancla}" tabindex="-1"[^>]*>${letra}</h3>`, 'u'));
    }
    expect(s).toContain('<a href="#letras-de-personajes"');
    // Las letras de la A–Z siguen siendo las suyas, sin prefijo.
    expect(main('/autores/')).toMatch(/<nav id="letras" class="letras"/u);
    expect(main('/autores/')).toContain('href="#letra-s"');
  });

  it('la Fila de Personaje: el nombre, «personaje de {universo} · {n} citas», zona `directorio`', () => {
    const s = seccion('/autores/');
    expect(s).toMatch(
      /<li class="fila-de-bloque" data-zona="directorio"[^>]*>\s*<a href="\/personaje\/batman\/"[\s\S]*?<span class="nombre"[^>]*>Batman<\/span>[\s\S]*?personaje de DC Comics<span aria-hidden="true"[^>]*> · <\/span>[\s\S]*?3 citas/u,
    );
    expect(s).toMatch(/href="\/personaje\/zorro\/"[\s\S]*?>El Zorro<\/span>[\s\S]*?personaje de Johnston McCulley[\s\S]*?1 cita</u);
  });

  it('los Personajes no se cuentan como Autores: la meta dice los dos Autores y sus Citas', () => {
    // Séneca: B3 y S1; la Autora Viva: sus rellenos. Ni B1, ni B2, ni Z1.
    expect(html('/autores/')).toContain(`<meta name="description" content="2 autores, de la A a la Z, con ${2 + RELLENOS} citas publicadas.">`);
  });
});

describe('Historia 35.5 — `/obras/` con la sección «Personajes»', () => {
  it('la Obra de un Personaje sin Autor, bajo su Personaje; la de un Autor, solo bajo él', () => {
    const pagina = main('/obras/');
    const s = seccion('/obras/');
    expect(s).toMatch(/^<section class="grupo" data-personajes/u);
    expect(s).toMatch(/<h2 class="rotulo" id="personajes" tabindex="-1"[^>]*>Personajes<\/h2>/u);
    expect(s).toMatch(/<section class="autor"[^>]*>\s*<h3 data-zona="directorio"[^>]*><a href="\/personaje\/batman\/"[^>]*>Batman<\/a><\/h3>/u);
    expect(s).toContain('href="/obra/batman/el-caballero/"');
    // «Obras de Séneca» la dice Batman, pero tiene Autor: una vez, y bajo Séneca.
    expect(pagina.split('href="/obra/seneca/obras-de-seneca/"').length - 1).toBe(1);
    expect(s).not.toContain('/obra/seneca/');
    // El Zorro no tiene Obra: no tiene grupo.
    expect(s).not.toContain('/personaje/zorro/');
    // Cada Obra publicada, una vez en la página.
    for (const obra of ['/obra/batman/el-caballero/', '/obra/vivo/relleno-de-la-autora/']) {
      expect(pagina.split(`href="${obra}"`).length - 1, obra).toBe(1);
    }
  });

  it('el filtro construido, ejecutado: alcanza la sección, la oculta entera y aparta sus letras y el salto', () => {
    for (const [ruta, directorio] of [
      ['/autores/', 'autores'],
      ['/obras/', 'obras'],
    ] as const) {
      const pagina = html(ruta);
      // «bat» deja solo a Batman: la sección a la vista y, en `/autores/`, «1 personaje.».
      comprobarFiltroEjecutado(pagina, guionDelFiltro(proyecto, pagina), directorio, ['bat']);
    }
  });

  it('el aviso del tamaño de `/obras/` informa sin avisar', () => {
    expect(salida).toMatch(/El Directorio de Obras pesa [\d.]+ bytes/u);
  });
});

describe('Historia 35.5 — `/buscar/`, el mapa de rótulos y el índice', () => {
  it('el selector de Autor lista los Autores y después el grupo «Personajes», con el slug como valor', () => {
    const plantilla = /<select id="filtro-de-autor"[\s\S]*?<\/select>/u.exec(html('/buscar/'))?.[0] ?? '';
    expect(plantilla).toMatch(
      /<option value="vivo"[^>]*>Autora Viva<\/option>[\s\S]*<option value="seneca"[^>]*>Séneca<\/option>\s*<optgroup label="Personajes"[^>]*>\s*<option value="batman"[^>]*>Batman<\/option>\s*<option value="zorro"[^>]*>El Zorro<\/option>\s*<\/optgroup>\s*<\/select>/u,
    );
    expect(html('/buscar/').match(/<select\b/gu)).toHaveLength(3);
  });

  it('el mapa nombra al dueño con su tipo: `personaje:{slug}` y el tercer elemento de la ficha ajena', () => {
    const mapa = JSON.parse(readFileSync(join(proyecto, 'dist/buscar/obras.json'), 'utf8')) as Record<string, string[][]>;
    expect(Object.keys(mapa)).toEqual(['seneca', 'vivo', 'personaje:batman']);
    expect(mapa['personaje:batman']).toEqual([
      ['batman--el-caballero', 'El caballero'],
      ['seneca--obras-de-seneca', 'Obras de Séneca', 'seneca'],
    ]);
    // La lista de Séneca no lleva «El caballero» (B1 y B2 no lo declaran), ni ningún tercer elemento.
    expect(mapa.seneca.every((par) => par.length === 2)).toBe(true);
    expect(mapa.seneca.map((par) => par[0])).toContain('seneca--obras-de-seneca');
    expect(mapa.seneca.map((par) => par[0])).not.toContain('batman--el-caballero');
  });

  it('el filtro `personaje` en cada Página de Cita que lo declara; con Autor, los dos; el metadato, del Personaje', () => {
    const b3 = html(`/cita/${B3}/`);
    expect(b3).toContain('data-pagefind-filter="autor:seneca"');
    expect(b3).toContain('data-pagefind-filter="personaje:batman"');
    expect(b3).toContain('data-pagefind-meta="autor">Batman</span>');
    const b1 = html(`/cita/${B1}/`);
    expect(b1).not.toContain('data-pagefind-filter="autor:');
    expect(b1).toContain('data-pagefind-filter="personaje:batman"');
    expect(html('/cita/seneca-no-es-que-tengamos-poco-tiempo/')).not.toContain('data-pagefind-filter="personaje:');
  });

  it('en el índice: todo registro con `personaje` es una Cita, ningún metadato nuevo, y el Zorro, bajo el mínimo, fuera', async () => {
    const indice = await indiceDe(proyecto);
    try {
      const filtros = await indice.filters();
      expect(filtros.personaje).toEqual({ batman: 3, zorro: 1 });
      const conPersonaje = await indice.search(null, { filters: { personaje: { any: ['batman', 'zorro'] } } });
      const registros = await Promise.all(conPersonaje.results.map((r) => r.data()));
      expect(registros.length).toBe(4);
      for (const r of registros) {
        expect(r.url, r.url).toMatch(/^\/cita\//u);
        // Ningún metadato nuevo: el título, el `autor` de siempre y lo que Pagefind pone de la imagen.
        expect(Object.keys(r.meta).filter((k) => k !== 'title' && k !== 'autor' && !k.startsWith('image')), r.url).toEqual([]);
      }
      const deB3 = registros.find((r) => r.url.includes(B3))!;
      expect(deB3.meta.autor).toBe('Batman');
      expect(deB3.filters.autor).toEqual(['seneca']);
      // La Página de Personaje bajo el mínimo no se indexa; la de Batman, sí.
      const todos = await Promise.all((await indice.search(null)).results.map((r) => r.data()));
      expect(todos.map((r) => r.url)).not.toContain('/personaje/zorro/');
      expect(todos.map((r) => r.url)).toContain('/personaje/batman/');
    } finally {
      indice.soltar();
    }
    expect(html('/personaje/zorro/')).toMatch(/<meta name="robots" content="noindex/u);
  });
});

describe('Historia 35.5 — «Buscar en…» de los Personajes', () => {
  it('«Buscar en {Personaje}» en la página 1, encima del listado, con `personaje` oculto', () => {
    const pagina = main('/personaje/batman/');
    expect(pagina).toMatch(
      /<form class="buscar-en" role="search" method="get" action="\/buscar\/"[\s\S]*?<label for="buscar-en-el-personaje"[^>]*>Buscar en Batman<\/label>[\s\S]*?<input type="hidden" name="personaje" value="batman"[^>]*>\s*<\/form>\s*<ul class="listado"/u,
    );
    expect(pagina).not.toMatch(/<input type="hidden" name="autor"/u);
  });

  it('«Buscar en esta obra» de la Obra de un Personaje: `personaje` y `obra`, en ese orden', () => {
    expect(main('/obra/batman/el-caballero/')).toMatch(
      /<input type="hidden" name="personaje" value="batman"[^>]*>\s*<input type="hidden" name="obra" value="batman--el-caballero"/u,
    );
  });
});

describe('Historia 35.5 — NFR-5: las aristas nuevas del modelo', () => {
  it('Directorio de Autores → cada Personaje y Directorio de Obras → la Obra de Personaje; quitarlas se nombra', async () => {
    const { grafo } = await modeloDelCorpus(rutasDelCorpus(join(proyecto, 'corpus')));
    expect(grafo.get('/autores')).toEqual(expect.arrayContaining(['/personaje/batman', '/personaje/zorro']));
    expect(grafo.get('/obras')).toEqual(expect.arrayContaining(['/obra/batman/el-caballero']));
    const deLosDirectorios = new Map([...grafo].filter(([origen]) => origen === '/autores' || origen === '/obras'));
    const construido = grafoDeDist([
      { ruta: '/autores/', html: html('/autores/') },
      { ruta: '/obras/', html: html('/obras/') },
    ]);
    expect(aristasQueFaltan(deLosDirectorios, construido)).toEqual([]);
    // Sin la sección, el modelo pide lo que falta, y lo nombra.
    const sinLaSeccion = grafoDeDist([
      { ruta: '/autores/', html: html('/autores/').replace(/<section data-personajes[\s\S]*?<\/section>\s*<\/div>/u, '</div>') },
      { ruta: '/obras/', html: html('/obras/').replace(/<section class="grupo" data-personajes[\s\S]*<\/section>\s*<\/div>/u, '</div>') },
    ]);
    expect(aristasQueFaltan(deLosDirectorios, sinLaSeccion)).toEqual(
      expect.arrayContaining(['/autores → /personaje/batman', '/autores → /personaje/zorro', '/obras → /obra/batman/el-caballero']),
    );
  });
});
