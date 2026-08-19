import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  autoresPublicados,
  citasDeAutor,
  citasDeTema,
  coleccionesPublicadas,
  rutasPublicadas,
  temasDeLaCita,
  temasPublicados,
  verificarIntegridad,
  type Cita,
  type Autor,
  type Tema,
} from '../../src/lib/publicado.ts';
import { MIN_CITAS_POR_COLECCION, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

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
    };
    const rutas = rutasPublicadas(conjunto);
    expect(rutas).toContain('/');
    expect(rutas).toContain('/autor/a');
    expect(rutas).toContain('/tema/t');
    expect(rutas.filter((r) => r.startsWith('/cita/'))).toHaveLength(MIN_CITAS_POR_TEMA);
  });

  it('un Tema bajo umbral no aparece entre las rutas', () => {
    const rutas = rutasPublicadas({
      citas: nCitas(MIN_CITAS_POR_TEMA - 1, 't'),
      autores: [autor('a')],
      temas: [tema('t')],
      colecciones: [],
    });
    expect(rutas).not.toContain('/tema/t');
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
    });
    expect(rutas).toContain('/coleccion/frases-cortas');
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
    });
    expect(rutas).not.toContain('/coleccion/frases-cortas');
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
    });
    expect(rutas.filter((r) => /^\/coleccion\//.test(r))).toEqual(['/coleccion/frases-cortas']);
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
