import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  autoresPublicados,
  citasDeAutor,
  citasDeTema,
  coleccionesPublicadas,
  lineaDeCifras,
  rutasIndexables,
  rutasPublicadas,
  temasDeLaCita,
  temasPublicados,
  verificarIntegridad,
  citasDePersonaje,
  grafoDelModelo,
  obrasDelPersonaje,
  personajesIndexables,
  type Cita,
  type Autor,
  type Personaje,
  type Tema,
} from '../../src/lib/publicado.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import { MIN_CITAS_POR_COLECCION, MIN_CITAS_POR_PERSONAJE, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

const RAIZ = resolve(import.meta.dirname, '../..');

const cita = (slug: string, autor: string, temas: string[] = []): Cita => ({
  slug,
  texto: `Texto de ${slug}.`,
  autor,
  temas,
  procedencia: { obra: 'Obra', año: 1600 },
  aptaParaPortada: false,
});

const autor = (slug: string, nombre = slug): Autor => ({
  slug,
  nombre,
  semblanza: 'Semblanza.',
  añoFallecimiento: 1600,
});

const tema = (slug: string, nombre = slug): Tema => ({ slug, nombre });

/** n Citas del mismo Tema, para empujarlo por encima o por debajo del umbral. */
const nCitas = (n: number, slugTema: string): Cita[] =>
  Array.from({ length: n }, (_, i) => cita(`c${i}`, 'a', [slugTema]));

describe('Historia 2.1 / AD-11 — Autores publicables', () => {
  it('un Autor con Citas publicadas se publica', () => {
    const resultado = autoresPublicados([autor('seneca')], [cita('x', 'seneca')]);
    expect(resultado.map((a) => a.slug)).toEqual(['seneca']);
  });

  it('un Autor sin ninguna Cita publicada no se publica', () => {
    const resultado = autoresPublicados([autor('seneca'), autor('nadie')], [cita('x', 'seneca')]);
    expect(resultado.map((a) => a.slug)).toEqual(['seneca']);
  });

  it('se ordenan por nombre con las reglas del español', () => {
    const resultado = autoresPublicados(
      [autor('c', 'Ñuño'), autor('a', 'Álvarez'), autor('b', 'Bécquer')],
      [cita('1', 'a'), cita('2', 'b'), cita('3', 'c')],
    );
    expect(resultado.map((a) => a.nombre)).toEqual(['Álvarez', 'Bécquer', 'Ñuño']);
  });
});

describe('Historia 2.1 / AD-11 — Temas publicables', () => {
  it('un Tema con el umbral justo se publica', () => {
    const resultado = temasPublicados([tema('t')], nCitas(MIN_CITAS_POR_TEMA, 't'));
    expect(resultado.map((t) => t.slug)).toEqual(['t']);
  });

  it('un Tema con una Cita menos no se publica', () => {
    const resultado = temasPublicados([tema('t')], nCitas(MIN_CITAS_POR_TEMA - 1, 't'));
    expect(resultado).toEqual([]);
  });

  it('un chip nunca enlaza a un Tema sin página', () => {
    // La divergencia que AD-11 impide: la Cita pertenece a dos Temas y solo uno tiene
    // página. Renderizar los dos chips daría un enlace a 404.
    const publicados = temasPublicados(
      [tema('grande'), tema('pequeno')],
      [...nCitas(MIN_CITAS_POR_TEMA, 'grande'), cita('z', 'a', ['pequeno'])],
    );
    const laCita = cita('z', 'a', ['grande', 'pequeno']);
    expect(temasDeLaCita(laCita, publicados).map((t) => t.slug)).toEqual(['grande']);
  });

  it('una Cita conserva sus demás Temas cuando uno cae bajo el umbral', () => {
    const citas = [...nCitas(MIN_CITAS_POR_TEMA, 'grande')];
    const laCita = cita('z', 'a', ['grande', 'pequeno']);
    expect(temasDeLaCita(laCita, temasPublicados([tema('grande'), tema('pequeno')], citas))).toHaveLength(1);
  });
});

describe('Historia 2.1 / AD-11 — agrupaciones y rutas', () => {
  it('las Citas de un Autor salen en orden estable', () => {
    const citas = [cita('c', 'a'), cita('a', 'a'), cita('b', 'b')];
    expect(citasDeAutor(citas, 'a').map((c) => c.slug)).toEqual(['a', 'c']);
  });

  it('las Citas de un Tema salen en orden estable', () => {
    const citas = [cita('c', 'a', ['t']), cita('a', 'a', ['t']), cita('b', 'a', ['otro'])];
    expect(citasDeTema(citas, 't').map((c) => c.slug)).toEqual(['a', 'c']);
  });

  it('las rutas publicadas cubren portada, Citas, Autores y Temas', () => {
    const conjunto = {
      citas: [...nCitas(MIN_CITAS_POR_TEMA, 't')],
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: [],
      personajes: [],
    };
    const rutas = rutasPublicadas(conjunto);
    expect(rutas).toContain('/');
    expect(rutas).toContain('/autor/a/');
    expect(rutas).toContain('/tema/t/');
    expect(rutas.filter((r) => r.startsWith('/cita/'))).toHaveLength(MIN_CITAS_POR_TEMA);
  });

  it('Historias 26.3 y 26.4 — los Directorios se enumeran siempre, tras los Autores, y los hereda `rutasIndexables`', () => {
    const conjunto = {
      citas: [...nCitas(MIN_CITAS_POR_TEMA, 't')],
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: [],
      personajes: [],
    };
    const rutas = rutasPublicadas(conjunto);
    expect(rutas.filter((r) => r === '/autores/')).toHaveLength(1);
    expect(rutas.indexOf('/autores/')).toBe(rutas.indexOf('/autor/a/') + 1);
    expect(rutasIndexables(conjunto)).toContain('/autores/');
    // `/obras/` justo detrás de `/autores/`, una vez, y también indexable.
    expect(rutas.filter((r) => r === '/obras/')).toHaveLength(1);
    expect(rutas.indexOf('/obras/')).toBe(rutas.indexOf('/autores/') + 1);
    expect(rutasIndexables(conjunto)).toContain('/obras/');
    // Páginas estáticas: también con el Corpus vacío.
    expect(rutasPublicadas({ citas: [], autores: [], temas: [], colecciones: [], personajes: [] })).toEqual(['/', '/autores/', '/obras/']);
  });

  it('un Tema bajo umbral no aparece entre las rutas', () => {
    const rutas = rutasPublicadas({
      citas: nCitas(MIN_CITAS_POR_TEMA - 1, 't'),
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: [],
      personajes: [],
    });
    expect(rutas).not.toContain('/tema/t/');
  });

  /*
   * Historia 12.3 — la línea de Colección.
   *
   * Los dos casos de arriba pasan `colecciones: []`, así que la línea nueva no la ejercitaba
   * nada: borrarla los dejaba en verde. El conjunto se compone llamando a
   * `coleccionesPublicadas`, que es la única forma que hay de obtener una `ColeccionPublicada`
   * —su marca no se puede nombrar desde fuera—, así que la prueba recorre además la puerta
   * del umbral en vez de fabricarse una Colección publicada de mentira.
   */
  const citasDeLaColeccion = nCitas(MIN_CITAS_POR_COLECCION, 't');
  const declarada = (miembros: string[]) => ({
    slug: 'frases-cortas',
    nombre: 'Frases cortas',
    criterio: 'Un criterio.',
    miembros,
  });

  it('una Colección publicada aparece entre las rutas', () => {
    const rutas = rutasPublicadas({
      citas: citasDeLaColeccion,
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: coleccionesPublicadas(
        [declarada(citasDeLaColeccion.map((c) => c.slug))],
        citasDeLaColeccion,
      ),
      personajes: [],
    });
    expect(rutas).toContain('/coleccion/frases-cortas/');
  });

  it('una Colección bajo umbral no aparece, porque no llega hasta aquí', () => {
    const rutas = rutasPublicadas({
      citas: citasDeLaColeccion,
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: coleccionesPublicadas(
        [declarada(citasDeLaColeccion.slice(0, MIN_CITAS_POR_COLECCION - 1).map((c) => c.slug))],
        citasDeLaColeccion,
      ),
      personajes: [],
    });
    expect(rutas).not.toContain('/coleccion/frases-cortas/');
  });

  it('la ruta de Colección es la de la primera página, sin las 2+', () => {
    // Paginar es cosa de la página; lo que se enumera aquí es la superficie.
    const rutas = rutasPublicadas({
      citas: citasDeLaColeccion,
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: coleccionesPublicadas(
        [declarada(citasDeLaColeccion.map((c) => c.slug))],
        citasDeLaColeccion,
      ),
      personajes: [],
    });
    expect(rutas.filter((r) => /^\/coleccion\//.test(r))).toEqual(['/coleccion/frases-cortas/']);
  });
});

describe('Historia 2.1 — integridad referencial', () => {
  it('un corpus coherente pasa', () => {
    expect(() =>
      verificarIntegridad({
        citas: [cita('x', 'a', ['t'])],
        autores: [autor('a')],
        temas: [tema('t')],
        colecciones: [],
        personajes: [],
      }),
    ).not.toThrow();
  });

  it('una Cita que apunta a un Autor inexistente rompe el build', () => {
    expect(() =>
      verificarIntegridad({
        citas: [cita('x', 'fantasma')],
        autores: [autor('a')],
        temas: [],
        colecciones: [],
        personajes: [],
      }),
    ).toThrow(/fantasma.*no existe/s);
  });

  it('una Cita que apunta a un Tema inexistente rompe el build', () => {
    expect(() =>
      verificarIntegridad({
        citas: [cita('x', 'a', ['fantasma'])],
        autores: [autor('a')],
        temas: [],
        colecciones: [],
        personajes: [],
      }),
    ).toThrow(/fantasma.*no existe/s);
  });

  it('el error nombra la Cita concreta, no solo la entidad que falta', () => {
    try {
      verificarIntegridad({
        citas: [cita('la-culpable', 'fantasma')],
        autores: [],
        temas: [],
        colecciones: [],
        personajes: [],
      });
      expect.unreachable('debería haber roto');
    } catch (error) {
      expect((error as Error).message).toContain('la-culpable');
    }
  });
});

describe('Historia 2.1 / AD-11 — nadie filtra colecciones por su cuenta', () => {
  const superficies = (function recorrer(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return recorrer(ruta);
      return /\.astro$/.test(entrada) ? [ruta] : [];
    });
  })(resolve(RAIZ, 'src'));

  it.each(superficies)('%s no llama a getCollection directamente', (ruta) => {
    // Toda superficie que enumere contenido deriva del dueño del conjunto publicable.
    // Un `getCollection` suelto es exactamente por dónde se cuela la divergencia.
    expect(readFileSync(ruta, 'utf8')).not.toMatch(/getCollection\(/);
  });

  it('el núcleo de publicado.ts no importa Astro en tiempo de ejecución', () => {
    const codigo = readFileSync(resolve(RAIZ, 'src/lib/publicado.ts'), 'utf8');
    // Solo `import type` (que se borra al compilar) y un `import()` dentro de la fachada.
    expect(codigo).not.toMatch(/^import \{[^}]*\} from 'astro:content'/m);
    expect(codigo).toMatch(/import type \{[^}]*\} from 'astro:content'/);
  });
});

describe('Historia 35.3 — el Personaje en el conjunto publicable', () => {
  const personaje = (slug: string, nombre = slug): Personaje => ({ slug, nombre, universo: 'Un universo' });
  const dicha = (slug: string, de: string, temas: string[] = ['t'], obra?: ObraResuelta): Cita => ({
    ...cita(slug, 'a', temas),
    personaje: de,
    ...(obra === undefined ? {} : { obra }),
  });
  const obra = (nombre: string, dueño: ObraResuelta['dueño']): ObraResuelta => ({
    nombre,
    dueño,
    titulo: nombre,
    fuentes: [],
    edicionCotejada: false,
    temas: [],
    recuento: 1,
  });
  const conjunto = (citas: Cita[], personajes: Personaje[]) => ({
    citas,
    autores: [autor('a')],
    temas: [tema('t')],
    colecciones: [],
    personajes,
  });

  /** `n` Citas dichas por un Personaje, con slugs propios. */
  const dichas = (n: number, de: string) => Array.from({ length: n }, (_, i) => dicha(`a-${de}-${i}`, de));

  it('se publica, y se indexa en el umbral, el Personaje que alguna Cita declara; el que no, no tiene ruta', () => {
    const c = conjunto(
      [...nCitas(MIN_CITAS_POR_TEMA, 't'), ...dichas(MIN_CITAS_POR_PERSONAJE, 'batman')],
      [personaje('batman'), personaje('joker')],
    );
    const rutas = rutasPublicadas(c);
    expect(rutas).toContain('/personaje/batman/');
    expect(rutas).not.toContain('/personaje/joker/');
    expect(rutas.indexOf('/personaje/batman/')).toBe(rutas.indexOf('/autor/a/') + 1);
    expect(rutasIndexables(c)).toContain('/personaje/batman/');
    expect(personajesIndexables(c.personajes, c.citas).map((p) => p.slug)).toEqual(['batman']);
  });

  it('Historia 35.3b — bajo MIN_CITAS_POR_PERSONAJE se publica y no se indexa; las Citas de otro Personaje no cuentan', () => {
    const bajo = MIN_CITAS_POR_PERSONAJE - 1;
    const c = conjunto(
      [
        ...nCitas(MIN_CITAS_POR_TEMA, 't'),
        // Joker llega al umbral él solo; las suyas no suben a Batman.
        ...dichas(MIN_CITAS_POR_PERSONAJE, 'joker'),
        ...dichas(Math.max(bajo, 1), 'batman'),
      ],
      [personaje('batman'), personaje('joker')],
    );
    expect(rutasPublicadas(c)).toContain('/personaje/batman/');
    expect(personajesIndexables(c.personajes, c.citas).map((p) => p.slug)).toEqual(
      bajo >= 1 ? ['joker'] : ['batman', 'joker'],
    );
    if (bajo >= 1) expect(rutasIndexables(c)).not.toContain('/personaje/batman/');
    expect(rutasIndexables(c)).toContain('/personaje/joker/');
  });

  it('sus Citas, en el orden de las de Autor; una Cita con Autor y Personaje está en las dos páginas', () => {
    const citas = [dicha('a-z', 'batman'), dicha('a-b', 'batman'), dicha('a-m', 'joker')];
    expect(citasDePersonaje(citas, 'batman').map((c) => c.slug)).toEqual(['a-b', 'a-z']);
    expect(citasDeAutor(citas, 'a')).toHaveLength(3);
  });

  it('sus Obras: la del Autor que la Cita resuelve y la de dueño Personaje (puro), con las sin obra al pie', () => {
    const delAutor = obra('a--la-obra', { tipo: 'autor', slug: 'a' });
    const propia = obra('batman--el-caballero', { tipo: 'personaje', slug: 'batman' });
    const citas = [dicha('a-1', 'batman', ['t'], delAutor), dicha('a-2', 'batman', ['t'], propia), dicha('a-3', 'batman')];
    const { obras, sinObra } = obrasDelPersonaje(citas, 'batman');
    expect(obras.map((o) => o.nombre).sort()).toEqual(['a--la-obra', 'batman--el-caballero']);
    expect(sinObra).toBe(1);
    expect(obrasDelPersonaje(citas, 'joker')).toEqual({ obras: [], sinObra: 0 });
  });

  it('el grafo del modelo: su listado, su página 1 → sus Obras y cada Cita que lo declara → su página', () => {
    const delAutor = obra('a--la-obra', { tipo: 'autor', slug: 'a' });
    const citas = [...nCitas(MIN_CITAS_POR_TEMA, 't'), dicha('a-1', 'batman', ['t'], delAutor), dicha('a-2', 'batman')];
    const c = conjunto(citas, [personaje('batman')]);
    const grafo = grafoDelModelo(c, new Map([['a--la-obra', [{ slug: 'a-1' }]]]));
    expect(grafo.get('/personaje/batman')).toEqual(
      expect.arrayContaining(['/cita/a-1', '/cita/a-2', '/obra/a/la-obra', '/']),
    );
    expect(grafo.get('/cita/a-1')).toContain('/personaje/batman');
    expect(grafo.get('/cita/c0')).not.toContain('/personaje/batman');
  });

  it('una Cita que declara un Personaje que no existe rompe la integridad', () => {
    expect(() => verificarIntegridad(conjunto([dicha('x', 'fantasma')], []))).toThrow(/Personaje «fantasma» no existe/u);
  });
});

/*
 * Historia 28.1, AD-11 — la línea de cifras de la portada. «Queda censo» es «k < n»: lo garantiza
 * `integraciones/cotejo.ts`, así que aquí basta con Citas con Fuente y sin ella, en memoria.
 */
describe('Historia 28.1 — la línea de cifras de la portada', () => {
  const documentada = (slug: string, slugAutor: string): Cita => ({
    ...cita(slug, slugAutor),
    fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${slug}` },
  });
  const documentadas = (n: number, autores: readonly string[]) =>
    Array.from({ length: n }, (_, i) => documentada(`d${i}`, autores[i % autores.length]));
  const censadas = (n: number, slugAutor: string) =>
    Array.from({ length: n }, (_, i) => cita(`p${i}`, slugAutor));

  it('con censo: n citas de m autores; k cotejadas, con punto de millar', () => {
    const slugs = Array.from({ length: 400 }, (_, i) => `a${i}`);
    const citas = [...documentadas(3473, slugs), ...censadas(21, 'a0')];
    // Un Autor sin Citas no cuenta: m son los publicados.
    const linea = lineaDeCifras(citas, [...slugs.map((s) => autor(s)), autor('sin-citas')]);
    expect(linea).toBe('3.494 citas de 400 autores; 3.473 cotejadas con el texto de su fuente.');
  });

  it('con censo, en singular: 1 autor, 1 cotejada', () => {
    const linea = lineaDeCifras([documentada('d', 'a'), cita('p', 'a')], [autor('a')]);
    expect(linea).toBe('2 citas de 1 autor; 1 cotejada con el texto de su fuente.');
  });

  it('con censo nunca dice «cada una», tampoco con una sola Cita y ninguna cotejada', () => {
    const casos: [Cita[], Autor[]][] = [
      [[cita('p', 'a')], [autor('a')]],
      [[documentada('d', 'a'), cita('p', 'b')], [autor('a'), autor('b')]],
      [[...documentadas(50, ['a', 'b', 'c']), cita('p', 'a')], [autor('a'), autor('b'), autor('c')]],
    ];
    for (const [citas, autores] of casos) {
      const linea = lineaDeCifras(citas, autores);
      expect(linea).toMatch(/; \d[\d.]* cotejadas? con el texto de su fuente\.$/);
      expect(linea).not.toContain('cada una');
    }
    expect(lineaDeCifras([cita('p', 'a')], [autor('a')])).toBe('1 cita de 1 autor; 0 cotejadas con el texto de su fuente.');
  });

  it('censo vacío, varios Autores: cada una cotejada', () => {
    const linea = lineaDeCifras(documentadas(12, ['a', 'b', 'c']), [autor('a'), autor('b'), autor('c')]);
    expect(linea).toBe('12 citas de 3 autores, cada una cotejada con el texto de su fuente.');
  });

  it('censo vacío, un Autor: de 1 autor', () => {
    const linea = lineaDeCifras(documentadas(51, ['a']), [autor('a')]);
    expect(linea).toBe('51 citas de 1 autor, cada una cotejada con el texto de su fuente.');
  });

  it('censo vacío, una Cita: 1 cita de 1 autor, cotejada', () => {
    const linea = lineaDeCifras([documentada('d', 'a')], [autor('a')]);
    expect(linea).toBe('1 cita de 1 autor, cotejada con el texto de su fuente.');
  });

  it('sin Citas no hay línea', () => {
    expect(lineaDeCifras([], [autor('a')])).toBeUndefined();
  });
});
