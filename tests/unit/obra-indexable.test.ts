import { afterEach, describe, expect, it } from 'vitest';
import {
  colgarObras,
  esObraIndexable,
  fallosDeObras,
  formaDeObra,
  rutaDeLaObra,
  segmentosDeObra,
  type FichaDeObra,
} from '../../src/lib/obras.ts';
import {
  obrasIndexables,
  obrasPublicadas,
  rutasIndexables,
  rutasPublicadas,
  temasDeLaObra,
  type Autor,
  type Cita,
  type ConjuntoPublicable,
} from '../../src/lib/publicado.ts';
import {
  anunciableEnElSitemap,
  caracterDe,
  causaDelServicio,
  consecuenciasDe,
  declararRutasIndexables,
  olvidarRutasIndexables,
  rutaDeObra,
  superficieDeclaradaDe,
} from '../../src/lib/superficies.ts';
import {
  MAX_PROPORCION_OBRA_DEL_AUTOR,
  MIN_CITAS_OBRA_INDEXABLE,
} from '../../src/lib/umbrales.ts';
import { descripcionDeObra, lineaDeProcedencia } from '../../src/lib/atribucion.ts';
import { tituloDeObra } from '../../src/lib/marca.ts';
import { ATRIBUTO_DE_INDEXABLE, EVENTOS } from '../../src/lib/medicion.ts';
import { MARCAS_DE_OBRA } from '../../src/lib/vocabulario.ts';
import {
  desajustesDeIndexables,
  informeDeCoincidencia,
  informeDeObras,
  nombresCongeladosSinFicha,
  marcasDePagina,
  rutaDeFicheroHtml,
  rutasDelSitemap,
  titularDeDesajustes,
} from '../../tools/lib/indexables.ts';

/**
 * Historia 22.4 — la Obra tiene página, y solo se indexa si no repite otra (FR-52).
 *
 * Lo puro: la regla, la lista de rutas indexables, el fallo cerrado de `superficies.ts`, la
 * comprobación del build y los textos. Lo construido está en `obra-pagina.test.ts`.
 */

afterEach(() => {
  olvidarRutasIndexables();
});

const AUTOR: Autor = { slug: 'gracian', nombre: 'Baltasar Gracián', semblanza: 'S.', añoFallecimiento: 1658 };

/** Una ficha por obra: el nombre es `gracian--{slug}` y la forma, la canónica del título. */
const ficha = (slug: string, titulo: string): FichaDeObra => ({
  nombre: `gracian--${slug}`,
  ruta: `corpus/obras/gracian--${slug}.yml`,
  autor: 'gracian',
  titulo,
  formas: [formaDeObra(titulo)],
});

const FICHAS = [ficha('oraculo', 'Oráculo'), ficha('criticon', 'Criticón'), ficha('heroe', 'El héroe')];

/** n Citas de una obra, numeradas desde `desde` para que los slugs no choquen. */
function citasDe(titulo: string, n: number, desde = 0): Cita[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: `gracian-${titulo.toLocaleLowerCase('es').replace(/\W+/gu, '-')}-${desde + i}`,
    texto: `Texto ${desde + i}.`,
    autor: 'gracian',
    temas: [],
    procedencia: { obra: titulo, año: 1647 },
    aptaParaPortada: false,
  }));
}

function conjunto(citas: Cita[]): ConjuntoPublicable {
  return { citas: colgarObras(citas, FICHAS), autores: [AUTOR], temas: [], colecciones: [] };
}

describe('FR-52 — la regla, pura', () => {
  it('los dos números viven en umbrales.ts', () => {
    expect(MIN_CITAS_OBRA_INDEXABLE).toBe(2);
    expect(MAX_PROPORCION_OBRA_DEL_AUTOR).toBe(0.9);
  });

  it.each([
    ['3 de 10', 3, 10, true],
    ['una sola Cita', 1, 10, false],
    ['9 de 10: el 90 % es excluyente', 9, 10, false],
    ['10 de 10: todo el Autor', 10, 10, false],
    ['9 de 12: se corrige sola', 9, 12, true],
    ['2 de 3', 2, 3, true],
    ['ninguna', 0, 5, false],
  ])('%s', (_caso, recuento, delAutor, esperado) => {
    expect(esObraIndexable(recuento, delAutor)).toBe(esperado);
  });
});

describe('el conjunto publicable: existir no es indexarse', () => {
  it('toda Obra con Citas tiene ruta; solo la que cumple FR-52 es indexable', () => {
    const c = conjunto([...citasDe('Oráculo', 3), ...citasDe('Criticón', 1), ...citasDe('El héroe', 6)]);
    expect(obrasPublicadas(c).map((o) => o.nombre)).toEqual([
      'gracian--criticon',
      'gracian--heroe',
      'gracian--oraculo',
    ]);
    expect(rutasPublicadas(c)).toEqual(
      expect.arrayContaining([
        '/obra/gracian/oraculo/',
        '/obra/gracian/criticon/',
        '/obra/gracian/heroe/',
      ]),
    );
    const indexables = rutasIndexables(c);
    expect(indexables).toContain('/obra/gracian/oraculo/');
    expect(indexables).toContain('/obra/gracian/heroe/');
    expect(indexables).not.toContain('/obra/gracian/criticon/');
  });

  it('las rutas indexables son un subconjunto de las publicadas, con todo lo demás dentro', () => {
    const c = conjunto([...citasDe('Oráculo', 9), ...citasDe('Criticón', 1)]);
    const publicadas = rutasPublicadas(c);
    const indexables = rutasIndexables(c);
    for (const ruta of indexables) expect(publicadas).toContain(ruta);
    expect(publicadas.filter((r) => !r.startsWith('/obra/'))).toEqual(
      indexables.filter((r) => !r.startsWith('/obra/')),
    );
  });

  it('se corrige sola: el Autor gana Citas de otra obra y la primera pasa a indexable', () => {
    // 9 de 10: casi todo el Autor.
    const antes = conjunto([...citasDe('Oráculo', 9), ...citasDe('Criticón', 1)]);
    expect(rutasIndexables(antes)).not.toContain('/obra/gracian/oraculo/');
    // 9 de 12, sin tocar ninguna ficha.
    const despues = conjunto([...citasDe('Oráculo', 9), ...citasDe('Criticón', 3)]);
    expect(rutasIndexables(despues)).toContain('/obra/gracian/oraculo/');
    // Y en el otro sentido, la de 3 Citas: 3 de 12 entra, igual que antes no entraba con 1.
    expect(rutasIndexables(despues)).toContain('/obra/gracian/criticon/');
  });

  it('una ficha sin Citas publicadas no tiene página', () => {
    const c = conjunto(citasDe('Oráculo', 3));
    expect(obrasPublicadas(c).map((o) => o.nombre)).toEqual(['gracian--oraculo']);
    expect(rutasPublicadas(c).filter((r) => r.startsWith('/obra/'))).toEqual(['/obra/gracian/oraculo/']);
  });

  it('obrasIndexables cuenta el Autor entero, también las Citas sin obra', () => {
    const sinObra: Cita[] = Array.from({ length: 8 }, (_, i) => ({
      ...citasDe('x', 1, 100 + i)[0],
      procedencia: { año: 1647 },
    }));
    const c = conjunto([...citasDe('Oráculo', 2), ...sinObra]);
    expect(obrasIndexables(c.citas).map((o) => o.nombre)).toEqual(['gracian--oraculo']);
  });
});

describe('la ruta de la Obra', () => {
  it('sale del nombre de la ficha partido por el primer `--`', () => {
    expect(segmentosDeObra('cervantes--el-quijote')).toEqual({ autor: 'cervantes', obra: 'el-quijote' });
    expect(rutaDeLaObra({ nombre: 'cervantes--el-quijote' })).toBe('/obra/cervantes/el-quijote/');
    expect(rutaDeLaObra({ nombre: 'cervantes--el-quijote' }, 2)).toBe('/obra/cervantes/el-quijote/2/');
    expect(rutaDeObra('a', 'b')).toBe('/obra/a/b/');
    expect(() => segmentosDeObra('sin-separador')).toThrow(/Ficha de Obra/);
  });

  it('la reconoce la Página de Obra, también la 2+', () => {
    for (const ruta of ['/obra/a/b/', '/obra/a/b/2/']) {
      expect(superficieDeclaradaDe(ruta)?.pagina, ruta).toBe('obra/[autor]/[slug]/[...page].astro');
    }
  });

  it('un slug de obra enteramente numérico rompe el build', () => {
    const numerica: FichaDeObra = {
      nombre: 'orwell--1984',
      ruta: 'corpus/obras/orwell--1984.yml',
      autor: 'orwell',
      titulo: '1984',
      formas: ['1984'],
    };
    const fallos = fallosDeObras([numerica], [], ['orwell']);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('orwell--1984.yml');
    expect(fallos[0]).toContain('solo un número');
    // Un slug que acaba en número sí vale.
    expect(fallosDeObras([{ ...numerica, nombre: 'orwell--mil-984' }], [], ['orwell'])).toEqual([]);
  });
});

describe('superficies.ts falla cerrado', () => {
  it('sin lista declarada, la página 1 de una Obra lanza', () => {
    expect(() => caracterDe('/obra/a/b')).toThrow(/lista de rutas indexables no se ha declarado/);
    expect(() => consecuenciasDe('/obra/a/b/')).toThrow(/no se ha declarado/);
    expect(() => anunciableEnElSitemap('https://sabiduriadebolsillo.net/obra/a/b/')).toThrow(
      /no se ha declarado/,
    );
  });

  it('las rutas que no son de Obra no necesitan la lista', () => {
    expect(caracterDe('/autor/x')).toBe('producto');
    expect(caracterDe('/autor/x/2')).toBe('servicio');
    expect(caracterDe('/buscar')).toBe('servicio');
    expect(causaDelServicio('/cita/x')).toBeUndefined();
  });

  it('la página 2+ es servicio por forma, sin lista', () => {
    expect(caracterDe('/obra/a/b/2/')).toBe('servicio');
    expect(causaDelServicio('/obra/a/b/2/')).toBe('forma');
  });

  it('con lista: en ella es producto; fuera, servicio por contenido', () => {
    declararRutasIndexables(['/obra/a/b/']);
    expect(caracterDe('/obra/a/b')).toBe('producto');
    expect(causaDelServicio('/obra/a/b')).toBeUndefined();
    expect(consecuenciasDe('/obra/a/b/')).toEqual({
      enElSitemap: true,
      noIndexar: false,
      enLaBusquedaPropia: true,
      enElBarrido: true,
      cargaLaMedicion: true,
      // Historia 23.9 — la indexable emite las dos vistas, en este orden, con su marca.
      vistas: [EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra],
      marcaDeObra: MARCAS_DE_OBRA[0],
    });

    expect(caracterDe('/obra/a/c/')).toBe('servicio');
    expect(causaDelServicio('/obra/a/c/')).toBe('contenido');
    // La no indexable se barre igual: accesibilidad y móvil como cualquier superficie pública.
    expect(consecuenciasDe('/obra/a/c/')).toEqual({
      enElSitemap: false,
      noIndexar: true,
      enLaBusquedaPropia: false,
      enElBarrido: true,
      // Historia 23.1 — se visita y carga la medición, pero no emite la vista de superficie.
      cargaLaMedicion: true,
      // Historia 23.9 — emite la de Obra, con la marca de su `noindex`.
      vistas: [EVENTOS.vistaDeObra],
      marcaDeObra: MARCAS_DE_OBRA[1],
    });
    expect(anunciableEnElSitemap('https://sabiduriadebolsillo.net/obra/a/c/')).toBe(false);
  });

  it('la lista se normaliza: da igual la barra final', () => {
    declararRutasIndexables(['/obra/a/b']);
    expect(caracterDe('/obra/a/b/')).toBe('producto');
  });
});

describe('la comprobación del build, pura', () => {
  const pagina = (ruta: string, noindex: boolean, enPagefind = !noindex) => ({ ruta, noindex, enPagefind });
  const [INDEXABLE, NO_INDEXABLE] = MARCAS_DE_OBRA;
  /** Una página con la marca de Obra en su `<html>`, tal cual, y la vista de Obra que la envía. */
  const conMarca = (ruta: string, noindex: boolean, marcaDeObra: string) => ({
    ...pagina(ruta, noindex),
    marcaDeObra,
    vistas: [EVENTOS.vistaDeObra],
  });

  it('coinciden: nada que decir', () => {
    expect(
      desajustesDeIndexables(['/', '/cita/x'], [
        pagina('/', false),
        pagina('/cita/x', false),
        pagina('/buscar', true),
        pagina('/sonda', false), // no declarada: no cuenta
      ]),
    ).toEqual([]);
  });

  it('no coinciden: nombra las rutas de cada lado', () => {
    const lineas = desajustesDeIndexables(['/', '/obra/a/b'], [
      pagina('/', false),
      conMarca('/obra/a/b', true, NO_INDEXABLE),
      pagina('/cita/x', false),
      pagina('/autor/y', false, false),
    ]);
    const texto = lineas.join('\n');
    expect(texto).toContain('en el sitemap y con `noindex`: /obra/a/b');
    expect(texto).toContain('sin `noindex` y fuera del sitemap: /autor/y, /cita/x');
    expect(texto).toContain('sin `noindex` y fuera de Pagefind: /autor/y');
  });

  it('23.9 — las Obras con su marca, que casa con su `noindex`: nada que decir', () => {
    expect(
      desajustesDeIndexables(['/', '/obra/a/b'], [
        pagina('/', false),
        conMarca('/obra/a/b', false, INDEXABLE),
        conMarca('/obra/a/c', true, NO_INDEXABLE),
        pagina('/obra/a/c/2', true),
        pagina('/obra/a/b/2', true),
      ]),
    ).toEqual([]);
  });

  it('23.9 — nombra cada una de las clases de desajuste de la marca', () => {
    const atributo = `\`${ATRIBUTO_DE_INDEXABLE}\``;
    // Una página 1 de Obra sin marca, o con una que no es del vocabulario.
    expect(
      desajustesDeIndexables(['/obra/a/b'], [pagina('/obra/a/b', false), conMarca('/obra/a/c', true, 'si')]),
    ).toEqual([`  · página 1 de Obra sin marca ${atributo} válida: /obra/a/b (sin el atributo), /obra/a/c («si»)`]);
    // Una indexable con `noindex`, fuera del sitemap y de Pagefind: solo la de la marca.
    expect(desajustesDeIndexables([], [conMarca('/obra/a/b', true, INDEXABLE)])).toEqual([
      `  · marca \`${INDEXABLE}\` con \`noindex\`: /obra/a/b`,
    ]);
    // Una no indexable sin `noindex`, que el sitemap anuncia: solo la de la marca.
    expect(desajustesDeIndexables(['/obra/a/c'], [conMarca('/obra/a/c', false, NO_INDEXABLE)])).toEqual([
      `  · marca \`${NO_INDEXABLE}\` sin \`noindex\`: /obra/a/c`,
    ]);
    // Una marca fuera de la página 1 de una Obra: una 2+, una Cita, la portada.
    expect(
      desajustesDeIndexables(['/cita/x', '/'], [
        conMarca('/obra/a/c/2', true, NO_INDEXABLE),
        conMarca('/cita/x', false, INDEXABLE),
        conMarca('/', false, 'ajena'),
      ]),
    ).toEqual([`  · marca de Obra en una página que no es la 1 de una Obra: /, /cita/x, /obra/a/c/2`]);
    // La marca sin la vista de Obra que la envía, y la vista sin la marca: van juntas o no van.
    const porSeparado = `  · marca de Obra y \`${EVENTOS.vistaDeObra}\` de \`data-vistas\` por separado`;
    expect(
      desajustesDeIndexables(['/obra/a/b'], [
        { ...conMarca('/obra/a/b', false, INDEXABLE), vistas: [EVENTOS.vistaDeSuperficie] },
        { ...conMarca('/obra/a/c', true, NO_INDEXABLE), vistas: undefined },
      ]),
    ).toEqual([`${porSeparado}: /obra/a/b (la marca sin la vista), /obra/a/c (la marca sin la vista)`]);
    expect(
      desajustesDeIndexables(['/cita/x'], [{ ...pagina('/cita/x', false), vistas: [EVENTOS.vistaDeObra] }]),
    ).toEqual([`${porSeparado}: /cita/x (la vista sin la marca)`]);
  });

  it('23.9 — una página no declarada no se juzga, lleve o no la marca', () => {
    expect(desajustesDeIndexables([], [conMarca('/sonda', true, INDEXABLE)])).toEqual([]);
  });

  it('23.9 — la línea del registro y el titular nombran la marca', () => {
    expect(informeDeCoincidencia(3)).toBe(
      'El sitemap, los `noindex`, Pagefind y la marca de Obra coinciden (3 rutas indexables).',
    );
    expect(informeDeCoincidencia(1)).toBe(
      'El sitemap, los `noindex`, Pagefind y la marca de Obra coinciden (1 ruta indexable).',
    );
    expect(titularDeDesajustes(2)).toMatch(/^El sitemap, los `noindex`, el índice de Pagefind y la marca de Obra no coinciden \(2 desajustes\)/);
  });

  it('lee las marcas y las rutas del dist', () => {
    expect(marcasDePagina('<meta name="robots" content="noindex, follow"><main id="contenido" data-pagefind-ignore>')).toEqual({
      noindex: true,
      enPagefind: false,
    });
    // Historia 26.2 — el tipo de la Obra va como filtro de Pagefind, no como metadato.
    expect(marcasDePagina('<main id="contenido" data-pagefind-body data-pagefind-filter="tipo:obra">')).toEqual({
      noindex: false,
      enPagefind: true,
    });
    // Historia 23.9 — la marca de Obra del `<html>`: presente, ausente y ajena, tal cual.
    const [INDEXABLE] = MARCAS_DE_OBRA;
    const conHtml = (atributos: string) =>
      `<html lang="es"${atributos}><head></head><main id="contenido" data-pagefind-body></main></html>`;
    expect(marcasDePagina(conHtml(` data-vistas="a b" ${ATRIBUTO_DE_INDEXABLE}="${INDEXABLE}"`))).toEqual({
      noindex: false,
      enPagefind: true,
      marcaDeObra: INDEXABLE,
      vistas: ['a', 'b'],
    });
    const sinMarca = marcasDePagina(conHtml(' data-vistas="a"'));
    expect(sinMarca).toEqual({ noindex: false, enPagefind: true, vistas: ['a'] });
    expect('marcaDeObra' in sinMarca).toBe(false);
    expect('vistas' in marcasDePagina(conHtml(''))).toBe(false);
    expect(marcasDePagina(conHtml(` ${ATRIBUTO_DE_INDEXABLE}="si"`)).marcaDeObra).toBe('si');
    // Con comillas simples, sin ellas o sin valor, se lee lo que hay y no se toma por ausente.
    expect(marcasDePagina(conHtml(` ${ATRIBUTO_DE_INDEXABLE}='${INDEXABLE}'`)).marcaDeObra).toBe(INDEXABLE);
    expect(marcasDePagina(conHtml(` ${ATRIBUTO_DE_INDEXABLE}=${INDEXABLE}`)).marcaDeObra).toBe(INDEXABLE);
    expect(marcasDePagina(conHtml(` ${ATRIBUTO_DE_INDEXABLE}`)).marcaDeObra).toBe('');
    expect(marcasDePagina(conHtml(` data-vistas='a b'`)).vistas).toEqual(['a', 'b']);
    // Un atributo que solo empieza igual no es la marca.
    expect('marcaDeObra' in marcasDePagina(conHtml(` ${ATRIBUTO_DE_INDEXABLE}-otra="${INDEXABLE}"`))).toBe(false);
    // Fuera del `<html>` no es la marca.
    expect('marcaDeObra' in marcasDePagina(`<html lang="es"><body><p ${ATRIBUTO_DE_INDEXABLE}="${INDEXABLE}"></p>`)).toBe(false);
    expect(rutaDeFicheroHtml('index.html')).toBe('/');
    expect(rutaDeFicheroHtml('404.html')).toBe('/404');
    expect(rutaDeFicheroHtml('obra/a/b/2/index.html')).toBe('/obra/a/b/2');
    expect(rutasDelSitemap('<url><loc>https://x.net/obra/a/b/</loc></url><url><loc>https://x.net</loc></url>')).toEqual([
      '/obra/a/b',
      '/',
    ]);
  });

  it('22.8 — los nombres congelados que no son ninguna ficha activa', () => {
    expect(
      nombresCongeladosSinFicha({ indexables: ['a--b', 'a--absorbida'] }, ['a--b', 'a--c']),
    ).toEqual(['a--absorbida']);
  });

  it('el informe de SM-11', () => {
    expect(informeDeObras(182, 40)).toBe('182 Obras publicadas, 40 indexables.');
    expect(informeDeObras(1, 1)).toBe('1 Obra publicada, 1 indexable.');
  });
});

describe('UX-DR49 — pestaña y descripción', () => {
  it('la pestaña dice «Frases de {Autor} en {Título}», y el número en las 2+', () => {
    expect(tituloDeObra('Baltasar Gracián', 'Oráculo manual y arte de prudencia')).toBe(
      'Frases de Baltasar Gracián en Oráculo manual y arte de prudencia | Sabiduría de Bolsillo',
    );
    expect(tituloDeObra('Baltasar Gracián', 'Oráculo', 2)).toBe(
      'Frases de Baltasar Gracián en Oráculo — página 2 | Sabiduría de Bolsillo',
    );
  });

  it('la descripción cuenta frases, con el año si consta y en singular si es una', () => {
    expect(descripcionDeObra(AUTOR, { titulo: 'Oráculo', año: 1647, recuento: 114 })).toBe(
      '114 frases de Baltasar Gracián en Oráculo (1647), con su procedencia documentada.',
    );
    expect(descripcionDeObra(AUTOR, { titulo: 'Oráculo', recuento: 1 })).toBe(
      '1 frase de Baltasar Gracián en Oráculo, con su procedencia documentada.',
    );
  });

  it('las páginas 2+ dicen la página en la descripción, como en el título', () => {
    expect(descripcionDeObra(AUTOR, { titulo: 'Oráculo', año: 1647, recuento: 114 }, 2)).toBe(
      '114 frases de Baltasar Gracián en Oráculo (1647), con su procedencia documentada. Página 2.',
    );
  });

  it('los Temas de la Obra cuentan cada Tema una vez por Cita', () => {
    const citas = [
      { ...citasDe('Oráculo', 1)[0], temas: ['b', 'b', 'b'] },
      { ...citasDe('Oráculo', 1, 1)[0], temas: ['a'] },
      { ...citasDe('Oráculo', 1, 2)[0], temas: ['a'] },
    ];
    const temas = [
      { slug: 'a', nombre: 'Zeta' },
      { slug: 'b', nombre: 'Alfa' },
    ];
    // «a» está en dos Citas y «b» en una, aunque la repita: «a» va primero pese al nombre.
    expect(temasDeLaObra(citas, temas).map((t) => t.slug)).toEqual(['a', 'b']);
  });
});

describe('la Atribución en piezas: el título siempre es el enlace', () => {
  const OBRA = {
    nombre: 'gracian--oraculo',
    autor: 'gracian',
    titulo: 'Oráculo',
    fuentes: [],
    edicionCotejada: false,
    temas: [],
    recuento: 1,
  };
  const conProcedencia = (procedencia: Cita['procedencia'], obra?: string): Cita => ({
    slug: 'x',
    texto: 'X.',
    autor: 'gracian',
    temas: [],
    procedencia,
    aptaParaPortada: false,
    ...(obra !== undefined ? { obra: { ...OBRA, titulo: obra } } : {}),
  });

  it.each([
    ['con año', { obra: 'Oráculo', año: 1647 }, 'Oráculo', ', 1647.'],
    ['sin año', { obra: 'Oráculo' }, 'Oráculo', '. Sin año documentado.'],
    ['con traducción', { obra: 'Oráculo', traduccion: { traductor: 'Ana', año: 1900 } }, 'Oráculo', '. Traducción de Ana, 1900.'],
    ['con referencia', { obra: 'Oráculo', año: 1647, referencia: 'Aforismo 1' }, 'Oráculo', ', 1647. Aforismo 1.'],
    // El título que ya acaba en signo no se dobla: antes el enlace salía de buscar el título
    // al principio de la línea compuesta; ahora va aparte y no depende de eso.
    ['título con signo final', { obra: '¿Qué es?' }, '¿Qué es?', ' Sin año documentado.'],
    ['título distinto de la grafía de la Cita', { obra: 'Oraculo manual', año: 1647 }, 'Oráculo', ', 1647.'],
  ] as const)('%s', (_caso, procedencia, titulo, resto) => {
    const linea = lineaDeProcedencia(conProcedencia(procedencia as Cita['procedencia'], titulo));
    expect(linea).toEqual({ titulo, resto });
  });

  it('sin Obra no hay título que enlazar, y la ausencia se dice', () => {
    expect(lineaDeProcedencia(conProcedencia({ año: 1647 }))).toEqual({
      resto: 'Sin obra documentada. Año 1647.',
    });
    expect(lineaDeProcedencia(conProcedencia({}))).toEqual({ resto: 'Sin obra documentada.' });
  });
});
