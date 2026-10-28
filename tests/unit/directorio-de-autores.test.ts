import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { directorioDeAutores, anclaDeLetra } from '../../src/lib/directorios.ts';
import {
  SUPERFICIES_SIN_SEMBLANZA,
  SUPERFICIES_DE_LA_SEMBLANZA,
  descripcionDelDirectorioDeAutores,
  hechosDeFilaDeAutor,
  recuentoDeAutores,
  recuentoDeCitas,
} from '../../src/lib/atribucion.ts';
import sharp from 'sharp';
import { datosDeTarjetaDelDirectorioDeAutores, svgDeTarjetaDeListado } from '../../src/lib/tarjeta.ts';
import { tituloDelDirectorioDeAutores } from '../../src/lib/marca.ts';
import {
  TARJETA_DEL_DIRECTORIO_DE_AUTORES,
  TARJETA_DEL_DIRECTORIO_DE_OBRAS,
  rutaDelDirectorioDeAutores,
  rutaDelDirectorioDeObras,
} from '../../src/lib/superficies.ts';
import type { Autor, Cita } from '../../src/lib/publicado.ts';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { comprobarFiltroEnElHtml } from './ayuda/filtro.js';
import { comprobarFiltroEjecutado, guionDelFiltro } from './ayuda/filtroEjecutado.js';

/**
 * Historia 26.3 — Todos los Autores, de la A a la Z.
 *
 * Lo puro primero: el orden por la clave de orden (AD-3), la Ñ como letra propia, la tilde fuera
 * de la inicial, el empate por slug, quién no figura, los hechos de cada fila y los textos con sus
 * singulares. Después, sobre el `dist/` de una construcción real: la página, sus letras y grupos,
 * su declaración (sitemap, canónica, Pagefind, vista), su Tarjeta Social y que no reproduce
 * ninguna semblanza ni dice «frases».
 */

// ─── Lo puro ─────────────────────────────────────────────────────────────────

const autor = (slug: string, nombre: string, clave: string | undefined, años: Partial<Autor> = {}): Autor => ({
  slug,
  nombre,
  semblanza: `Semblanza de ${nombre}.`,
  añoFallecimiento: 1900,
  ...años,
  ...(clave === undefined ? {} : { ordenAlfabetico: clave }),
});

const cita = (slug: string, deAutor: string): Cita => ({
  slug,
  texto: `Texto de ${slug}.`,
  autor: deAutor,
  temas: [],
  procedencia: {},
  aptaParaPortada: false,
});

/** Los slugs del Directorio, en orden, agrupados por inicial. */
const porGrupos = (autores: Autor[], citas: Cita[]) =>
  directorioDeAutores(autores, citas).grupos.map((g) => [g.inicial, g.entradas.map((a) => a.slug)]);

describe('Historia 26.3 — el orden y los grupos del Directorio de Autores', () => {
  it('ordena por la clave y no por el nombre: Cervantes va en la C', () => {
    const autores = [
      autor('miguel-de-cervantes', 'Miguel de Cervantes', 'Cervantes'),
      autor('rosalia-de-castro', 'Rosalía de Castro', 'Castro'),
      autor('jose-cadalso', 'José Cadalso', 'Cadalso'),
      autor('leopoldo-alas', 'Leopoldo Alas', 'Alas'),
    ];
    const citas = autores.map((a) => cita(`${a.slug}-x`, a.slug));
    expect(porGrupos(autores, citas)).toEqual([
      ['A', ['leopoldo-alas']],
      ['C', ['jose-cadalso', 'rosalia-de-castro', 'miguel-de-cervantes']],
    ]);
  });

  it('la Ñ es letra propia, entre la N y la O', () => {
    const autores = [
      autor('ocampo', 'Luis Ocampo', 'Ocampo'),
      autor('nandu', 'Pedro Ñandú', 'Ñandú'),
      autor('nuno', 'Gonzalo Nuño', 'Nuño'),
    ];
    const citas = autores.map((a) => cita(`${a.slug}-x`, a.slug));
    const directorio = directorioDeAutores(autores, citas);
    expect(directorio.grupos.map((g) => [g.inicial, g.ancla, g.entradas.map((a) => a.slug)])).toEqual([
      ['N', 'letra-n', ['nuno']],
      ['Ñ', 'letra-ñ', ['nandu']],
      ['O', 'letra-o', ['ocampo']],
    ]);
  });

  it('la tilde de la inicial no hace grupo propio: «Álvarez» va en la A', () => {
    const autores = [autor('alvarez', 'Ana Álvarez', 'Álvarez'), autor('azorin', 'Azorín', 'Azorín')];
    const citas = autores.map((a) => cita(`${a.slug}-x`, a.slug));
    expect(porGrupos(autores, citas)).toEqual([['A', ['alvarez', 'azorin']]]);
    expect(anclaDeLetra('A')).toBe('letra-a');
  });

  it('a igual clave, por slug: `seneca` antes que `seneca-el-viejo`, entre los dos órdenes de entrada', () => {
    const viejo = autor('seneca-el-viejo', 'Séneca el Viejo', 'Séneca');
    const joven = autor('seneca', 'Séneca', 'Séneca');
    const citas = [cita('seneca-x', 'seneca'), cita('seneca-el-viejo-x', 'seneca-el-viejo')];
    expect(porGrupos([viejo, joven], citas)).toEqual([['S', ['seneca', 'seneca-el-viejo']]]);
    expect(porGrupos([joven, viejo], citas)).toEqual([['S', ['seneca', 'seneca-el-viejo']]]);
  });

  it('un Autor sin Citas publicadas no tiene fila, y si era el único de su inicial no hay grupo', () => {
    const autores = [autor('alvarez', 'Ana Álvarez', 'Álvarez'), autor('ocampo', 'Luis Ocampo', 'Ocampo')];
    expect(porGrupos(autores, [cita('alvarez-x', 'alvarez')])).toEqual([['A', ['alvarez']]]);
  });

  it('los hechos: años y Citas publicadas —no las documentadas—, con «Fallecido en» sin nacimiento', () => {
    const autores = [
      autor('miguel-de-cervantes', 'Miguel de Cervantes', 'Cervantes', { añoNacimiento: 1547, añoFallecimiento: 1616 }),
      autor('seneca', 'Séneca', 'Séneca', { añoFallecimiento: 65 }),
    ];
    const citas = [
      ...Array.from({ length: 12 }, (_, i) => cita(`miguel-de-cervantes-${i}`, 'miguel-de-cervantes')),
      cita('seneca-x', 'seneca'),
    ];
    const directorio = directorioDeAutores(autores, citas);
    const filas = directorio.grupos.flatMap((g) => g.entradas);
    expect(filas).toEqual([
      { slug: 'miguel-de-cervantes', nombre: 'Miguel de Cervantes', ruta: '/autor/miguel-de-cervantes/', años: '1547–1616', recuento: '12 citas' },
      { slug: 'seneca', nombre: 'Séneca', ruta: '/autor/seneca/', años: 'Fallecido en 65', recuento: '1 cita' },
    ]);
    expect(directorio.autores).toBe(2);
    expect(directorio.citas).toBe(13);
  });

  it('sin ningún año que conste, la fila es solo el recuento: ni punto medio ni hueco', () => {
    expect(hechosDeFilaDeAutor({}, 3)).toEqual({ recuento: '3 citas' });
    expect(hechosDeFilaDeAutor({ añoNacimiento: 1547 }, 1)).toEqual({ recuento: '1 cita' });
    expect(hechosDeFilaDeAutor({ añoNacimiento: -4, añoFallecimiento: 65 }, 2)).toEqual({
      años: '4 a. C.–65 d. C.',
      recuento: '2 citas',
    });
  });

  it('un Autor publicado sin clave lanza nombrando el slug y la orden que la propone', () => {
    const autores = [autor('horacio', 'Horacio', undefined)];
    expect(() => directorioDeAutores(autores, [cita('horacio-x', 'horacio')])).toThrow(/«horacio».*proponer-claves/su);
    // Sin Citas publicadas no hace falta clave: no figura.
    expect(directorioDeAutores(autores, []).grupos).toEqual([]);
  });

  it('una clave que no da inicial —cifra, signo o espacio delante— lanza nombrando el slug, sin inventarle una letra', () => {
    for (const clave of ['1984', '¡Ay', ' Horacio']) {
      const autores = [autor('horacio', 'Horacio', clave)];
      expect(() => directorioDeAutores(autores, [cita('horacio-x', 'horacio')]), clave).toThrow(
        /«horacio».*no da inicial/su,
      );
    }
  });

  it('con el Corpus vacío no hay letras ni grupos, y la descripción dice ceros', () => {
    expect(directorioDeAutores([], [])).toEqual({ grupos: [], autores: 0, citas: 0 });
    expect(descripcionDelDirectorioDeAutores(directorioDeAutores([], []))).toBe('0 autores, de la A a la Z, con 0 citas publicadas.');
  });
});

describe('Historia 26.3 — los textos del Directorio de Autores', () => {
  it('el recuento de Citas y el de Autores, con sus singulares', () => {
    expect(recuentoDeAutores(1)).toBe('1 autor');
    expect(recuentoDeAutores(0)).toBe('0 autores');
    expect(recuentoDeAutores(135)).toBe('135 autores');
    expect(recuentoDeCitas(1)).toBe('1 cita');
    expect(recuentoDeCitas(0)).toBe('0 citas');
    expect(recuentoDeCitas(27)).toBe('27 citas');
  });

  it('la meta description: hechos del Corpus, con sus singulares', () => {
    const a = autor('a', 'A', 'A');
    const b = autor('b', 'B', 'B');
    const sinCitas = autor('c', 'C', 'C');
    expect(descripcionDelDirectorioDeAutores(directorioDeAutores([a], [cita('a-1', 'a')]))).toBe(
      '1 autor, de la A a la Z, con 1 cita publicada.',
    );
    // Las cifras son las del Directorio (AD-11): el Autor sin Citas no cuenta.
    expect(descripcionDelDirectorioDeAutores(directorioDeAutores([a, b, sinCitas], [cita('a-1', 'a'), cita('a-2', 'a'), cita('b-1', 'b')]))).toBe(
      '2 autores, de la A a la Z, con 3 citas publicadas.',
    );
  });

  it('el título de pestaña, sin «citas» ni «frases»', () => {
    expect(tituloDelDirectorioDeAutores()).toBe('Autores, de la A a la Z | Sabiduría de Bolsillo');
  });

  it('la Tarjeta Social de los Directorios: «Autores» en la sans y cuántos lista, con su singular', () => {
    expect(datosDeTarjetaDelDirectorioDeAutores(135)).toEqual({
      titulo: 'Autores',
      hechos: ['135 autores'],
      familiaDelTitulo: 'sans',
    });
    expect(datosDeTarjetaDelDirectorioDeAutores(1).hechos).toEqual(['1 autor']);
  });

  it('la lista de superficies sin semblanza: los dos Directorios y sus Tarjetas, aparte de las que consultan', () => {
    expect([...SUPERFICIES_SIN_SEMBLANZA]).toEqual([
      '/autores/',
      '/tarjeta/directorio/autores.png',
      '/obras/',
      '/tarjeta/directorio/obras.png',
    ]);
    expect(SUPERFICIES_SIN_SEMBLANZA).toEqual([
      rutaDelDirectorioDeAutores(),
      TARJETA_DEL_DIRECTORIO_DE_AUTORES,
      rutaDelDirectorioDeObras(),
      TARJETA_DEL_DIRECTORIO_DE_OBRAS,
    ]);
    for (const superficie of SUPERFICIES_SIN_SEMBLANZA) {
      expect((SUPERFICIES_DE_LA_SEMBLANZA as readonly string[]).includes(superficie)).toBe(false);
    }
  });
});

// ─── Sobre lo construido ─────────────────────────────────────────────────────

/** Semblanzas que no pueden aparecer en ningún otro sitio por casualidad. */
const SEMBLANZAS = {
  seneca: 'Filósofo estoico hispanorromano, tutor y después consejero de Nerón.',
  'seneca-el-viejo': 'Retórico cordobés y padre del filósofo, semblanza zanahoria-uno.',
  alvarez: 'Poeta inventada para la prueba, semblanza zanahoria-dos.',
  nuno: 'Cronista sin año de nacimiento, semblanza zanahoria-tres.',
  nandu: 'Autor cuya clave empieza por eñe, semblanza zanahoria-cuatro.',
  ocampo: 'Autor sin ninguna Cita publicada, semblanza zanahoria-cinco.',
} as const;

const fichaDeAutor = (nombre: string, clave: string, semblanza: string, años: string) =>
  `nombre: ${nombre}\n${años}semblanza: ${semblanza}\nordenAlfabetico: ${clave}\n`;

const citaDe = (slugAutor: string, n: number, obra: string) =>
  citaValida({
    texto: `Frase número ${n} de la prueba del Directorio, escrita por ${slugAutor}.`,
    autor: slugAutor,
    slug: `${slugAutor}-cita-de-prueba-${n}`,
    procedencia: { obra },
    fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${encodeURIComponent(obra)}` },
  });

const CORPUS = {
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/seneca-el-viejo.yml': fichaDeAutor(
    'Séneca el Viejo',
    'Séneca',
    SEMBLANZAS['seneca-el-viejo'],
    'añoNacimiento: -54\nañoFallecimiento: 39\n',
  ),
  'autores/alvarez.yml': fichaDeAutor('Ana Álvarez', 'Álvarez', SEMBLANZAS.alvarez, 'añoNacimiento: 1850\nañoFallecimiento: 1910\n'),
  'autores/nuno.yml': fichaDeAutor('Gonzalo Nuño', 'Nuño', SEMBLANZAS.nuno, 'añoFallecimiento: 1600\n'),
  'autores/nandu.yml': fichaDeAutor('Pedro Ñandú', 'Ñandú', SEMBLANZAS.nandu, 'añoNacimiento: 1500\nañoFallecimiento: 1560\n'),
  'autores/ocampo.yml': fichaDeAutor('Luis Ocampo', 'Ocampo', SEMBLANZAS.ocampo, 'añoFallecimiento: 1700\n'),
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
  'citas/seneca--segunda.md': citaValida({
    texto: 'La vida, si sabes usarla, es larga.',
    slug: 'seneca-la-vida-si-sabes-usarla',
  }),
  'citas/seneca-el-viejo--1.md': citaDe('seneca-el-viejo', 1, 'Controversias'),
  'citas/alvarez--1.md': citaDe('alvarez', 2, 'Versos de Álvarez'),
  'citas/nuno--1.md': citaDe('nuno', 3, 'Crónica de Nuño'),
  'citas/nandu--1.md': citaDe('nandu', 4, 'Libro de Ñandú'),
};

/** Lo que se espera en orden: por clave y, a igual clave, por slug. Ocampo no tiene Citas. */
const ORDEN = ['alvarez', 'nuno', 'nandu', 'seneca', 'seneca-el-viejo'];

describe('Historia 26.3 — `/autores/` construido', () => {
  let proyecto = '';
  let html = '';
  let codigo = 0;
  let salida = '';

  beforeAll(async () => {
    const r = await construirConCorpus(CORPUS);
    proyecto = r.proyecto;
    codigo = r.codigo;
    salida = r.salida;
    if (r.codigo === 0) html = readFileSync(paginaConstruida(proyecto, '/autores/'), 'utf8');
  }, 600_000);

  afterAll(async () => {
    if (proyecto !== '') await limpiar(proyecto);
  });

  const main = () => {
    const inicio = html.indexOf('<main');
    return html.slice(inicio, html.indexOf('</main>', inicio));
  };
  const filas = () => [...html.matchAll(/<li class="fila-de-bloque"[^>]*>.*?<\/li>/gsu)].map((m) => m[0]);

  it('construye', () => {
    expect(codigo, salida).toBe(0);
  });

  it('una Fila de Autor por cada Autor publicado, en el orden de la clave, y ninguna para el que no tiene Citas', () => {
    const enlaces = filas().map((fila) => /href="\/autor\/([^/"]+)\/"/u.exec(fila)?.[1]);
    expect(enlaces).toEqual(ORDEN);
    expect(html).not.toContain('/autor/ocampo/');
    expect(html).not.toContain('Luis Ocampo');
    for (const fila of filas()) {
      expect(fila).toContain('data-zona="directorio"');
      expect(fila).not.toContain('target=');
    }
  });

  it('los hechos de cada fila, con el punto medio oculto y la coma para el lector', () => {
    const [alvarez, nuno, , seneca] = filas();
    expect(alvarez).toMatch(/>Ana Álvarez<\/span><span class="solo-para-lectores"[^>]*>, <\/span>/u);
    expect(alvarez).toMatch(/1850–1910<span aria-hidden="true"[^>]*> · <\/span><span class="solo-para-lectores"[^>]*>, <\/span>1 cita</u);
    expect(nuno).toContain('Fallecido en 1600<span aria-hidden="true"');
    expect(seneca).toContain('4 a. C.–65 d. C.');
    expect(seneca).toContain('2 citas');
    // Ningún punto medio sin ocultar.
    expect(html.match(/(?<!aria-hidden="true"[^>]*>) · /gu) ?? []).toEqual([]);
  });

  it('el texto de cada fila, entero y sin espacios de más: el marcado de la fila no mete huecos', () => {
    /*
     * `FilaDeAutor.astro` va en una sola línea porque Astro conserva un espacio donde hay salto:
     * un formateador que la partiera diría «1850–1910  · 1 cita». Se mira el texto de **todas**
     * las filas, con lo que oye el lector («, ») y lo que ve la vista (« · »).
     */
    const textos = filas().map((fila) => fila.replace(/<[^>]+>/gu, ''));
    expect(textos).toEqual([
      'Ana Álvarez, 1850–1910 · , 1 cita',
      'Gonzalo Nuño, Fallecido en 1600 · , 1 cita',
      'Pedro Ñandú, 1500–1560 · , 1 cita',
      'Séneca, 4 a. C.–65 d. C. · , 2 citas',
      'Séneca el Viejo, 54 a. C.–39 d. C. · , 1 cita',
    ]);
    for (const texto of textos) expect(texto, texto).not.toMatch(/\s{2}/u);
  });

  it('las letras: una por inicial con Autor, con su nombre accesible, y su grupo con un `h2` destino', () => {
    const letras = [...html.matchAll(/<a href="#(letra-[^"]+)"[^>]*><span class="solo-para-lectores"[^>]*>Autores por la <\/span>([^<]+)<\/a>/gu)].map(
      (m) => [m[1], m[2]],
    );
    expect(letras).toEqual([
      ['letra-a', 'A'],
      ['letra-n', 'N'],
      ['letra-ñ', 'Ñ'],
      ['letra-s', 'S'],
    ]);
    expect(html).toMatch(/<nav id="letras" class="letras" aria-label="Letras" tabindex="-1"[^>]*><ul role="list"/u);
    for (const [ancla, inicial] of letras) {
      expect(html).toMatch(new RegExp(`<h2 class="rotulo" id="${ancla}" tabindex="-1"[^>]*>${inicial}</h2>`, 'u'));
    }
    expect(html).not.toContain('letra-o');
    // «Volver a las letras» cierra cada grupo y lleva a la navegación.
    expect([...html.matchAll(/<a href="#letras"[^>]*>Volver a las letras<\/a>/gu)]).toHaveLength(letras.length);
  });

  it('un único `h1`, «Autores», y el título y la meta exactos', () => {
    expect([...html.matchAll(/<h1[\s>]/gu)]).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Autores<\/h1>/u);
    expect(html).toContain('<title>Autores, de la A a la Z | Sabiduría de Bolsillo</title>');
    expect(html).toContain('<meta name="description" content="5 autores, de la A a la Z, con 6 citas publicadas.">');
  });

  it('es producto: canónica sin `noindex`, en el sitemap, vista de superficie, y sin páginas 2+', () => {
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/autores\/">/u);
    expect(html).not.toContain('noindex');
    expect(html).toMatch(/<html[^>]*data-vistas="vista-de-superficie"/u);
    const sitemap = readFileSync(join(proyecto, 'dist', 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toMatch(/<loc>https:\/\/[^<]+\/autores\/<\/loc>/u);
    expect(existsSync(paginaConstruida(proyecto, '/autores/2/'))).toBe(false);
  });

  it('en la búsqueda propia responde por su título: el listado entero va fuera del índice, con el filtro `directorio`', () => {
    const cuerpo = main();
    expect(cuerpo).toMatch(/^<main[^>]*data-pagefind-body[^>]*data-pagefind-filter="tipo:directorio"/u);
    const ignorado = /<div class="listado" data-pagefind-ignore="all"[^>]*>(.*)<\/div>/su.exec(cuerpo)?.[1] ?? '';
    expect(ignorado).toContain('id="letras"');
    for (const slug of ORDEN) expect(ignorado).toContain(`/autor/${slug}/`);
  });

  it('declara su Tarjeta Social de los Directorios, de 1200 × 630', () => {
    expect(html).toMatch(
      /<meta property="og:image" content="https:\/\/[^"]+\/tarjeta\/directorio\/autores\.png">/u,
    );
    const png = readFileSync(join(proyecto, 'dist', 'tarjeta', 'directorio', 'autores.png'));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  /** El SVG que la Tarjeta tiene que rasterizar: la de listado, con los Autores que lista la página. */
  const svgEsperado = () => svgDeTarjetaDeListado(datosDeTarjetaDelDirectorioDeAutores(ORDEN.length));

  it('la Tarjeta construida dice los Autores de la página, no los del Corpus: los mismos bytes que su SVG', async () => {
    /*
     * Se compara el PNG servido con el que sale de rasterizar la Tarjeta esperada: cinco Autores
     * —Ocampo no tiene Citas y no cuenta—, banda siena y «Autores» en la sans de la plantilla de
     * listado. Una ruta que contara las fichas («6 autores») o pasara otros datos pintaría otro PNG.
     */
    expect(svgEsperado()).toContain('5 autores');
    const construido = readFileSync(join(proyecto, 'dist', 'tarjeta', 'directorio', 'autores.png'));
    const esperado = await sharp(Buffer.from(svgEsperado())).png().toBuffer();
    expect(construido.equals(esperado)).toBe(true);
  });

  it('ninguna superficie sin semblanza reproduce la de ningún Autor, ni dice «frases»', async () => {
    /*
     * Las del Directorio de Autores: las de `/obras/` y su Tarjeta las juzga, con su propio
     * corpus y su propio SVG, `tests/unit/directorio-de-obras.test.ts` (Historia 26.4).
     */
    const deAutores = SUPERFICIES_SIN_SEMBLANZA.filter(
      (ruta) => ruta === rutaDelDirectorioDeAutores() || ruta === TARJETA_DEL_DIRECTORIO_DE_AUTORES,
    );
    expect(deAutores).toHaveLength(2);
    for (const ruta of deAutores) {
      if (ruta.endsWith('.png')) {
        /*
         * La imagen no se deja leer como texto: se juzga el SVG que la compone, y aquí mismo se
         * exige que el PNG construido sea byte a byte su rasterizado. Así lo que se mira es lo que
         * sale del build aunque otra prueba se omita o se reordene, no una llamada que la prueba
         * se inventa.
         */
        const construido = readFileSync(join(proyecto, 'dist', ...ruta.split('/').filter(Boolean)));
        const svg = svgEsperado();
        expect(construido.equals(await sharp(Buffer.from(svg)).png().toBuffer()), ruta).toBe(true);
        for (const semblanza of Object.values(SEMBLANZAS)) expect(svg, ruta).not.toContain(semblanza);
        expect(svg.toLowerCase(), ruta).not.toContain('frase');
        continue;
      }
      const pagina = readFileSync(paginaConstruida(proyecto, ruta), 'utf8');
      for (const semblanza of Object.values(SEMBLANZAS)) expect(pagina, ruta).not.toContain(semblanza);
      // El texto de las Citas de la prueba dice «Frase número…», y tampoco se reproduce aquí.
      expect(pagina.toLowerCase(), ruta).not.toContain('frase');
    }
  });

  it('Historia 26.6 — sin guion, ni campo ni hueco: la región del recuento vacía, la plantilla inerte y la lista entera', () => {
    comprobarFiltroEnElHtml(html, 'autores');
  });

  it('Historia 26.6 — el guion construido, ejecutado sobre este Directorio: oculta, aparta las letras, anuncia tras la pausa y ofrece buscar a cero', () => {
    comprobarFiltroEjecutado(html, guionDelFiltro(proyecto, html), 'autores');
  });
});
