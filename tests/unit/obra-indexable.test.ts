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
import {
  desajustesDeIndexables,
  informeDeObras,
  marcasDePagina,
  rutaDeFicheroHtml,
  rutasDelSitemap,
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
    });

    expect(caracterDe('/obra/a/c/')).toBe('servicio');
    expect(causaDelServicio('/obra/a/c/')).toBe('contenido');
    // La no indexable se barre igual: accesibilidad y móvil como cualquier superficie pública.
    expect(consecuenciasDe('/obra/a/c/')).toEqual({
      enElSitemap: false,
      noIndexar: true,
      enLaBusquedaPropia: false,
      enElBarrido: true,
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
      pagina('/obra/a/b', true),
      pagina('/cita/x', false),
      pagina('/autor/y', false, false),
    ]);
    const texto = lineas.join('\n');
    expect(texto).toContain('en el sitemap y con `noindex`: /obra/a/b');
    expect(texto).toContain('sin `noindex` y fuera del sitemap: /autor/y, /cita/x');
    expect(texto).toContain('sin `noindex` y fuera de Pagefind: /autor/y');
  });

  it('lee las marcas y las rutas del dist', () => {
    expect(marcasDePagina('<meta name="robots" content="noindex, follow"><main id="contenido" data-pagefind-ignore>')).toEqual({
      noindex: true,
      enPagefind: false,
    });
    expect(marcasDePagina('<main id="contenido" data-pagefind-body data-pagefind-meta="tipo:obra">')).toEqual({
      noindex: false,
      enPagefind: true,
    });
    expect(rutaDeFicheroHtml('index.html')).toBe('/');
    expect(rutaDeFicheroHtml('404.html')).toBe('/404');
    expect(rutaDeFicheroHtml('obra/a/b/2/index.html')).toBe('/obra/a/b/2');
    expect(rutasDelSitemap('<url><loc>https://x.net/obra/a/b/</loc></url><url><loc>https://x.net</loc></url>')).toEqual([
      '/obra/a/b',
      '/',
    ]);
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
