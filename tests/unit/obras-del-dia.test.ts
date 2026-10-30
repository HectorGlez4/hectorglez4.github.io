import { describe, expect, it } from 'vitest';
import { citaDelDia, obrasDelDia } from '../../src/lib/citaDelDia.ts';
import { cierreDeLasObras } from '../../src/lib/atribucion.ts';
import { ordenDeLaListaDeObras, type ObraResuelta } from '../../src/lib/obras.ts';
import { OBRAS_DE_LA_PORTADA } from '../../src/lib/umbrales.ts';
import type { Autor, Cita } from '../../src/lib/publicado.ts';

/**
 * Historia 28.3 — las Obras de la portada, puras: la regla de AD-12 en rondas sobre la lista
 * circular de Autores, en el orden del Directorio, y el cierre «Las {n} obras».
 *
 * Ninguna cifra de la portada se escribe aquí: los fixtures se dimensionan con
 * `OBRAS_DE_LA_PORTADA`, como pide la historia.
 */

const K = OBRAS_DE_LA_PORTADA;

/** La jornada de `d` días desde la época (el origen de `citaDelDia`). */
const jornada = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);

const autor = (slug: string, clave: string | undefined): Autor => ({
  slug,
  nombre: `Nombre de ${slug}`,
  semblanza: `Semblanza de ${slug}.`,
  añoFallecimiento: 1900,
  ...(clave === undefined ? {} : { ordenAlfabetico: clave }),
});

const obra = (autorSlug: string, slug: string, recuento: number): ObraResuelta => ({
  nombre: `${autorSlug}--${slug}`,
  autor: autorSlug,
  titulo: `Título ${slug}`,
  fuentes: [],
  edicionCotejada: false,
  temas: [],
  recuento,
});

/*
 * K + 2 Autores, cada uno con dos Obras (la primera de su lista, la de más Citas). Las claves no
 * siguen el orden de los slugs: el orden del Directorio es el de la clave («Zubiri» va al final
 * aunque su slug empiece por «a»).
 */
const A = K + 2;
const CLAVES = Array.from({ length: A }, (_, i) => String.fromCharCode('B'.charCodeAt(0) + i));
const MUCHOS = CLAVES.map((clave, i) => autor(`a${String(A - i).padStart(2, '0')}`, clave));
const OBRAS_DE_MUCHOS = MUCHOS.flatMap((a) => [obra(a.slug, 'segunda', 3), obra(a.slug, 'primera', 7)]);
/** La lista L de la regla: los Autores en el orden del Directorio. */
const L = MUCHOS.map((a) => a.slug);
const primera = (slug: string) => `${slug}--primera`;
const segunda = (slug: string) => `${slug}--segunda`;
const nombres = (obras: readonly ObraResuelta[]) => obras.map((o) => o.nombre);

describe('Historia 28.3 — obrasDelDia, con más Autores que Obras en la portada', () => {
  it(`da ${K} Obras de ${K} Autores distintos, desde la ventana de la jornada`, () => {
    const hoy = obrasDelDia(OBRAS_DE_MUCHOS, MUCHOS, jornada(0));
    expect(hoy).toHaveLength(K);
    expect(new Set(hoy.map((o) => o.autor)).size).toBe(K);
    // d = 0: las posiciones 0…K−1, cada Autor en su primera aparición, con su primera Obra.
    expect(nombres(hoy)).toEqual(L.slice(0, K).map(primera));
  });

  it(`la jornada siguiente la ventana avanza ${K} puestos y quien reaparece da su siguiente Obra`, () => {
    const manana = obrasDelDia(OBRAS_DE_MUCHOS, MUCHOS, jornada(1));
    expect(new Set(manana.map((o) => o.autor)).size).toBe(K);
    // Posiciones K…2K−1: los dos últimos de L aún en su primera vuelta, y los K − 2 primeros en la
    // segunda, con su segunda Obra.
    const esperadas = Array.from({ length: K }, (_, j) => {
      const p = K + j;
      const slug = L[p % A];
      return Math.floor(p / A) === 0 ? primera(slug) : segunda(slug);
    });
    expect(nombres(manana)).toEqual(esperadas);
    expect(nombres(manana).slice(0, 2)).toEqual([primera(L[A - 2]), primera(L[A - 1])]);
    expect(nombres(manana).slice(2)).toEqual(L.slice(0, K - 2).map(segunda));
  });

  it('la ventana empieza en la posición K·d mod A en cualquier jornada', () => {
    for (const d of [2, 3, 17, 20_391]) {
      const elegidas = obrasDelDia(OBRAS_DE_MUCHOS, MUCHOS, jornada(d));
      const inicio = (K * d) % A;
      expect(elegidas.map((o) => o.autor), `d = ${d}`).toEqual(
        Array.from({ length: K }, (_, j) => L[(inicio + j) % A]),
      );
      expect(new Set(elegidas.map((o) => o.autor)).size).toBe(K);
    }
  });

  it('con d negativo los módulos y la división siguen siendo los de la regla', () => {
    // d = −1: posiciones −K…−1, es decir los Autores A−K…A−1, en su aparición −1: su última Obra.
    const ayer = obrasDelDia(OBRAS_DE_MUCHOS, MUCHOS, jornada(-1));
    expect(nombres(ayer)).toEqual(L.slice(A - K).map(segunda));
  });

  it('no depende del orden en que llegan las Obras ni los Autores', () => {
    for (const d of [0, 1, 5]) {
      const una = obrasDelDia(OBRAS_DE_MUCHOS, MUCHOS, jornada(d));
      const otra = obrasDelDia([...OBRAS_DE_MUCHOS].reverse(), [...MUCHOS].reverse(), jornada(d));
      expect(nombres(otra)).toEqual(nombres(una));
    }
  });
});

describe('Historia 28.3 — obrasDelDia, con menos Autores que Obras en la portada', () => {
  // Tres Autores: uno de una Obra, otro de tres y otro de dos; en el Directorio, U, V, W.
  const UNA = autor('wenceslao', 'Ulloa');
  const TRES = autor('alba', 'Vidal');
  const DOS = autor('mario', 'Weiss');
  const AUTORES = [DOS, UNA, TRES];
  const OBRAS = [
    obra('wenceslao', 'unica', 4),
    obra('alba', 'tercera', 2),
    obra('alba', 'primera', 9),
    obra('alba', 'segunda', 5),
    obra('mario', 'beta', 3),
    obra('mario', 'alfa', 3),
  ];
  const listaDe = (slug: string) => nombres(ordenDeLaListaDeObras(OBRAS.filter((o) => o.autor === slug)));

  it('da una Obra por Autor, en el orden del Directorio', () => {
    expect(K).toBeGreaterThan(AUTORES.length);
    const hoy = obrasDelDia(OBRAS, AUTORES, jornada(0));
    expect(hoy.map((o) => o.autor)).toEqual(['wenceslao', 'alba', 'mario']);
  });

  it('cada jornada el de varias Obras da la siguiente (n = d), y el de una la repite', () => {
    for (const d of [0, 1, 2, 3, 4]) {
      const elegidas = nombres(obrasDelDia(OBRAS, AUTORES, jornada(d)));
      expect(elegidas, `d = ${d}`).toEqual([
        'wenceslao--unica',
        listaDe('alba')[d % 3],
        listaDe('mario')[d % 2],
      ]);
    }
    // La lista de cada Autor es la de su Página: más Citas primero, y el título a igualdad.
    expect(listaDe('alba')).toEqual(['alba--primera', 'alba--segunda', 'alba--tercera']);
    expect(listaDe('mario')).toEqual(['mario--alfa', 'mario--beta']);
  });
});

describe('Historia 28.3 — obrasDelDia, el orden que decide qué sale cada jornada', () => {
  it(`con exactamente ${K} Autores la ventana da la vuelta entera: cada jornada todos, con la siguiente Obra`, () => {
    const justos = MUCHOS.slice(0, K);
    const obras = justos.flatMap((a) => [obra(a.slug, 'segunda', 3), obra(a.slug, 'primera', 7)]);
    const lista = justos.map((a) => a.slug);
    expect(nombres(obrasDelDia(obras, justos, jornada(0)))).toEqual(lista.map(primera));
    expect(nombres(obrasDelDia(obras, justos, jornada(1)))).toEqual(lista.map(segunda));
    expect(nombres(obrasDelDia(obras, justos, jornada(2)))).toEqual(lista.map(primera));
  });

  it('dos Autores con la misma clave van por su slug, como en el Directorio', () => {
    const zeta = autor('zeta', 'Igual');
    const alfa = autor('alfa', 'Igual');
    const elegidas = obrasDelDia([obra('zeta', 'libro', 2), obra('alfa', 'libro', 2)], [zeta, alfa], jornada(0));
    expect(elegidas.map((o) => o.autor)).toEqual(['alfa', 'zeta']);
  });

  it('dos Obras del mismo Autor con el mismo recuento y el mismo título van por su nombre de ficha', () => {
    const solo = autor('solo', 'Solo');
    const gemela = (slug: string): ObraResuelta => ({ ...obra('solo', slug, 2), titulo: 'Poesías' });
    const obras = [gemela('poesias-2'), gemela('poesias-1')];
    expect(nombres(obrasDelDia(obras, [solo], jornada(0)))).toEqual(['solo--poesias-1']);
    expect(nombres(obrasDelDia(obras, [solo], jornada(1)))).toEqual(['solo--poesias-2']);
  });
});

describe('Historia 28.3 — obrasDelDia, los bordes', () => {
  it('lanza, nombrándola, ante una jornada que no es del calendario', () => {
    for (const mala of ['2026-13-01', '2026-02-31', '30/10/2026', '']) {
      expect(() => obrasDelDia(OBRAS_DE_MUCHOS, MUCHOS, mala), mala).toThrow(/no es una jornada/);
    }
  });

  it('sin Obras, ninguna', () => {
    expect(obrasDelDia([], MUCHOS, jornada(0))).toEqual([]);
    expect(obrasDelDia([], [], jornada(0))).toEqual([]);
  });

  it('lanza, nombrando al Autor, si una Obra es de un Autor sin clave de orden', () => {
    const sinClave = autor('anonimo-de-prueba', undefined);
    expect(() => obrasDelDia([obra('anonimo-de-prueba', 'x', 2)], [sinClave], jornada(0))).toThrow(
      /anonimo-de-prueba.*ordenAlfabetico/,
    );
  });

  it('lanza si una Obra es de un Autor que no recibe', () => {
    expect(() => obrasDelDia([obra('fantasma', 'x', 2)], MUCHOS, jornada(0))).toThrow(/fantasma/);
  });

  it('la Obra de la Cita del Día, si la regla la elige, sigue entre las Obras', () => {
    const X = autor('xenia', 'Xenia');
    const Y = autor('yago', 'Yago');
    const DE_X = obra('xenia', 'libro', 3);
    const DE_Y = obra('yago', 'libro', 3);
    const apta: Cita = {
      slug: 'xenia-una-cita',
      texto: 'Una cita.',
      autor: 'xenia',
      temas: [],
      procedencia: { obra: 'Título libro' },
      aptaParaPortada: true,
      obra: DE_X,
    };
    const dia = jornada(0);
    expect(citaDelDia([apta], dia)?.cita.obra?.nombre).toBe(DE_X.nombre);
    expect(nombres(obrasDelDia([DE_X, DE_Y], [X, Y], dia))).toContain(DE_X.nombre);
  });
});

describe('Historia 28.3 — el cierre de las Obras de la portada', () => {
  it('«Las {n} obras», con punto de millar, y «La 1 obra»', () => {
    expect(cierreDeLasObras(1)).toBe('La 1 obra');
    expect(cierreDeLasObras(2)).toBe('Las 2 obras');
    expect(cierreDeLasObras(1234)).toBe('Las 1.234 obras');
  });

  it('lanza con un recuento que no es un entero de 1 en adelante', () => {
    for (const n of [0, -3, 1.5, Number.NaN]) {
      expect(() => cierreDeLasObras(n), String(n)).toThrow(/cierreDeLasObras/);
    }
  });
});
