import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clavesDeOrden,
  type AutorParaLaClave,
  type CitaParaLaClave,
} from '../../src/lib/obras.ts';
import {
  AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN,
  MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN,
} from '../../src/lib/umbrales.ts';

/**
 * Historia 27.1, AD-25 — la clave de orden de la búsqueda (`data-pagefind-sort`).
 *
 * Pura y sin construir. Lo que se escribe en `dist/` lo mira `filtros-de-cita.test.ts`; lo que
 * devuelve Pagefind al ordenar por ella, `tests/e2e/busqueda.spec.ts`.
 */

/** El entero mayor exacto en `f32`, con el que Pagefind 1.5.2 ordena. */
const F32 = 2 ** 24;

type Obra = NonNullable<CitaParaLaClave['obra']>;
const obra = (nombre: string, titulo: string, recuento: number): Obra => ({ nombre, titulo, recuento });

/*
 * Dos Autores cuyo orden del Directorio no es el de slug: «zorrilla» se ordena por «Acuña» y
 * «abad» por «Zapata». Zorrilla tiene dos Obras —«Poemas» con tres Citas y «Cartas» con una—, la
 * primera con un orden del libro que no es el de slug y una Cita sin documento al final, y dos
 * Citas sin Obra. Abad, una sola Cita sin Obra.
 */
const AUTORES: AutorParaLaClave[] = [
  { slug: 'abad', ordenAlfabetico: 'Zapata' },
  { slug: 'zorrilla', ordenAlfabetico: 'Acuña' },
  // Sin Citas: no ocupa sitio en el rango, y que no tenga clave no importa.
  { slug: 'nadie' },
];
const POEMAS = obra('zorrilla--poemas', 'Poemas', 3);
const CARTAS = obra('zorrilla--cartas', 'Cartas', 1);
const CITAS: CitaParaLaClave[] = [
  { slug: 'zorrilla-a', autor: 'zorrilla', obra: POEMAS },
  { slug: 'zorrilla-b', autor: 'zorrilla', obra: POEMAS },
  { slug: 'zorrilla-c', autor: 'zorrilla', obra: POEMAS },
  { slug: 'zorrilla-carta', autor: 'zorrilla', obra: CARTAS },
  { slug: 'zorrilla-suelta-z', autor: 'zorrilla' },
  { slug: 'zorrilla-suelta-m', autor: 'zorrilla' },
  { slug: 'abad-unica', autor: 'abad' },
];
/** El orden del libro: «c» y «a» situadas, «b» sin documento detrás (la cola de `ordenDelLibro`). */
const POR_OBRA = new Map([
  ['zorrilla--poemas', [{ slug: 'zorrilla-c' }, { slug: 'zorrilla-a' }, { slug: 'zorrilla-b' }]],
  ['zorrilla--cartas', [{ slug: 'zorrilla-carta' }]],
]);

/** Los slugs por su clave, de menor a mayor: el orden en que Pagefind los devolvería. */
const enOrden = (claves: ReadonlyMap<string, string>) =>
  [...claves].sort((a, b) => Number(a[1]) - Number(b[1])).map(([slug]) => slug);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Historia 27.1 — la clave de orden de la búsqueda', () => {
  it('ordena por el Directorio, la lista de obras, el libro y, al final del Autor, «sin Obra» por slug', () => {
    expect(enOrden(clavesDeOrden(AUTORES, CITAS, POR_OBRA))).toEqual([
      // Zorrilla primero: su clave es «Acuña», aunque su slug vaya detrás.
      // «Poemas» (3 Citas) antes que «Cartas» (1): la lista de obras, de más a menos.
      'zorrilla-c',
      'zorrilla-a',
      // La de sin documento, detrás de las documentadas de su Obra: la lista la trae así.
      'zorrilla-b',
      'zorrilla-carta',
      // El hueco «sin Obra», tras todas sus Obras y por slug.
      'zorrilla-suelta-m',
      'zorrilla-suelta-z',
      'abad-unica',
    ]);
  });

  it('compone a·B + p: el Autor en el rango alto y la posición dentro de él en el bajo', () => {
    const claves = clavesDeOrden(AUTORES, CITAS, POR_OBRA);
    const B = MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN;
    expect(claves.get('zorrilla-c')).toBe('00000000');
    expect(claves.get('zorrilla-suelta-z')).toBe('00000005');
    expect(claves.get('abad-unica')).toBe(String(B).padStart(8, '0'));
  });

  it('todas numéricas, de ocho cifras, distintas y por debajo de 2^24', () => {
    const claves = clavesDeOrden(AUTORES, CITAS, POR_OBRA);
    expect(claves.size).toBe(CITAS.length);
    for (const [slug, clave] of claves) {
      expect(clave, slug).toMatch(/^\d{8}$/u);
      expect(Number(clave), slug).toBeLessThan(F32);
    }
    expect(new Set(claves.values()).size).toBe(claves.size);
  });

  it('la clave mayor posible, B² − 1, es exacta en f32 y distinta de su vecina', () => {
    const B = MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN;
    const mayor = B * B - 1;
    expect(mayor).toBeLessThan(F32);
    expect(Math.fround(mayor)).toBe(mayor);
    expect(Math.fround(mayor - 1)).not.toBe(Math.fround(mayor));
    // El caso que la descarta: un 3+2+3 decimal pasa de 2^24 y empata con su vecina.
    expect(Math.fround(17_123_457)).toBe(Math.fround(17_123_456));
  });

  it('no depende del orden de la entrada', () => {
    const base = clavesDeOrden(AUTORES, CITAS, POR_OBRA);
    const permutada = clavesDeOrden([...AUTORES].reverse(), [...CITAS].reverse(), new Map([...POR_OBRA].reverse()));
    expect(Object.fromEntries(permutada)).toEqual(Object.fromEntries(base));
  });

  it('retitular una ficha no mueve ninguna clave', () => {
    const cartas = obra('zorrilla--cartas', 'Epístolas', 1);
    const retituladas = CITAS.map((c) => (c.obra?.nombre === 'zorrilla--cartas' ? { ...c, obra: cartas } : c));
    expect(Object.fromEntries(clavesDeOrden(AUTORES, retituladas, POR_OBRA))).toEqual(
      Object.fromEntries(clavesDeOrden(AUTORES, CITAS, POR_OBRA)),
    );
  });

  it('la lista de obras desempata por título y por nombre de ficha', () => {
    const autores = [{ slug: 'ana', ordenAlfabetico: 'Ana' }];
    const beta = obra('ana--beta', 'Beta', 1);
    const alfa = obra('ana--alfa', 'Alfa', 1);
    const citas: CitaParaLaClave[] = [
      { slug: 'ana-1', autor: 'ana', obra: beta },
      { slug: 'ana-2', autor: 'ana', obra: alfa },
    ];
    const porObra = new Map([
      ['ana--beta', [{ slug: 'ana-1' }]],
      ['ana--alfa', [{ slug: 'ana-2' }]],
    ]);
    expect(enOrden(clavesDeOrden(autores, citas, porObra))).toEqual(['ana-2', 'ana-1']);
  });

  describe('un rango que no cabe rompe nombrándolo', () => {
    it('el de los Autores, con un tope pequeño', () => {
      const limites = { tope: 2, aviso: undefined };
      // Dos Autores con tope 2: el rango lo alcanza.
      expect(() => clavesDeOrden(AUTORES, CITAS, POR_OBRA, limites)).toThrow(/«Autor» tiene 2 posiciones y el tope es 2/u);
      // Uno solo cabe.
      const soloAbad = CITAS.filter((c) => c.autor === 'abad');
      expect(clavesDeOrden(AUTORES, soloAbad, POR_OBRA, limites).get('abad-unica')).toBe('00000000');
    });

    it('el de la posición dentro de un Autor, con un tope pequeño', () => {
      const limites = { tope: 3, aviso: undefined };
      expect(() => clavesDeOrden(AUTORES, CITAS, POR_OBRA, limites)).toThrow(
        /«posición dentro de zorrilla» tiene 6 posiciones y el tope es 3/u,
      );
    });

    it('con el tope real: 4.097 Autores', () => {
      const autores = Array.from({ length: MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN + 1 }, (_, i) => ({
        slug: `autor-${i}`,
        ordenAlfabetico: `Autor ${String(i).padStart(5, '0')}`,
      }));
      const citas = autores.map((a) => ({ slug: `${a.slug}-cita`, autor: a.slug }));
      expect(() => clavesDeOrden(autores, citas, new Map())).toThrow(
        new RegExp(`«Autor» tiene ${MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN + 1} posiciones y el tope es ${MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN}`, 'u'),
      );
    });

    it('con el tope real: 4.097 Citas de un Autor', () => {
      const citas = Array.from({ length: MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN + 1 }, (_, i) => ({
        slug: `abad-${String(i).padStart(5, '0')}`,
        autor: 'abad',
      }));
      expect(() => clavesDeOrden(AUTORES, citas, new Map())).toThrow(
        new RegExp(`«posición dentro de abad» tiene ${MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN + 1} posiciones`, 'u'),
      );
    });

    it('un tope que sacaría la clave mayor de lo exacto en f32 se rechaza', () => {
      expect(() => clavesDeOrden(AUTORES, CITAS, POR_OBRA, { tope: 4097, aviso: undefined })).toThrow(/f32/u);
    });
  });

  describe('una lista de Obra que no casa con sus Citas rompe nombrando la Obra y el slug', () => {
    it('una Cita con Obra que falta en la lista de su Obra', () => {
      const porObra = new Map([...POR_OBRA, ['zorrilla--poemas', [{ slug: 'zorrilla-c' }, { slug: 'zorrilla-a' }]]]);
      expect(() => clavesDeOrden(AUTORES, CITAS, porObra)).toThrow(/«zorrilla-b» es de la Obra «zorrilla--poemas» y falta en su lista/u);
    });

    it('una Obra sin lista', () => {
      const porObra = new Map([['zorrilla--poemas', POR_OBRA.get('zorrilla--poemas')!]]);
      expect(() => clavesDeOrden(AUTORES, CITAS, porObra)).toThrow(/«zorrilla-carta» es de la Obra «zorrilla--cartas»/u);
    });

    it('una lista que trae una Cita ajena', () => {
      const porObra = new Map([...POR_OBRA, ['zorrilla--cartas', [{ slug: 'zorrilla-carta' }, { slug: 'abad-unica' }]]]);
      expect(() => clavesDeOrden(AUTORES, CITAS, porObra)).toThrow(/La lista de la Obra «zorrilla--cartas» trae «abad-unica»/u);
    });
  });

  it('un Autor con Citas y sin clave de orden rompe, como en el Directorio', () => {
    const autores = AUTORES.map((a) => (a.slug === 'abad' ? { slug: 'abad' } : a));
    expect(() => clavesDeOrden(autores, CITAS, POR_OBRA)).toThrow(/«abad» tiene Citas publicadas y no tiene clave de orden \(ordenAlfabetico\)/u);
  });

  describe('el aviso previo al tope', () => {
    it('sin valor no avisa, y así lo declara el repositorio', () => {
      expect(AVISO_DE_RANGO_DE_LA_CLAVE_DE_ORDEN).toBeUndefined();
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
      clavesDeOrden(AUTORES, CITAS, POR_OBRA);
      clavesDeOrden(AUTORES, CITAS, POR_OBRA, { tope: MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN, aviso: undefined });
      expect(aviso).not.toHaveBeenCalled();
    });

    it('con valor avisa del rango que lo alcanza, con su recuento, y no rompe', () => {
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const claves = clavesDeOrden(AUTORES, CITAS, POR_OBRA, { tope: MAX_POR_RANGO_DE_LA_CLAVE_DE_ORDEN, aviso: 2 });
      expect(claves.size).toBe(CITAS.length);
      const mensajes = aviso.mock.calls.map((llamada) => String(llamada[0]));
      // Los Autores (2) y la posición dentro de Zorrilla (6) lo alcanzan; la de Abad (1), no.
      expect(mensajes).toHaveLength(2);
      expect(mensajes[0]).toMatch(/«Autor» .* tiene 2 posiciones/u);
      expect(mensajes[1]).toMatch(/«posición dentro de zorrilla» .* tiene 6 posiciones/u);
    });
  });
});
