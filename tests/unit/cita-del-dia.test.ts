import { describe, expect, it } from 'vitest';
import {
  aptasParaPortada,
  citaDelDia,
  esJornada,
  jornadaDelBuild,
  ordenEnRondas,
} from '../../src/lib/citaDelDia.ts';
import type { Cita } from '../../src/lib/publicado.ts';

interface OpcionesDeCita {
  apta?: boolean;
  autor?: string;
}

const cita = (slug: string, { apta = true, autor = 'autor' }: OpcionesDeCita = {}): Cita => ({
  slug,
  texto: `Texto de ${slug}.`,
  autor,
  temas: [],
  procedencia: { obra: 'Obra', año: 1600 },
  aptaParaPortada: apta,
});

const APTAS = ['a', 'b', 'c', 'd', 'e'].map((s) => cita(s));

describe('Historia 4.1 — la jornada del build', () => {
  it('sin declarar, es el día de hoy en ISO', () => {
    expect(jornadaDelBuild({}, new Date('2026-08-11T09:30:00Z'))).toBe('2026-08-11');
  });

  it('es la misma a las nueve de la mañana y a las once de la noche', () => {
    // Es lo que hace que un push a media jornada no cambie la Cita del Día.
    const mañana = jornadaDelBuild({}, new Date('2026-08-11T09:00:00Z'));
    const noche = jornadaDelBuild({}, new Date('2026-08-11T23:00:00Z'));
    expect(mañana).toBe(noche);
  });

  it('el CI puede declararla', () => {
    expect(jornadaDelBuild({ FECHA_JORNADA: '2026-01-01' }, new Date())).toBe('2026-01-01');
  });

  it('una fecha mal escrita se ignora en vez de romper la portada', () => {
    expect(jornadaDelBuild({ FECHA_JORNADA: 'ayer' }, new Date('2026-08-11T00:00:00Z'))).toBe(
      '2026-08-11',
    );
  });

  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31'])(
    'una fecha que tiene la forma y no existe en el calendario —%s— también se ignora',
    (imposible) => {
      /*
       * `2026-02-31` casa con `\d{4}-\d{2}-\d{2}` y no es ningún día. Antes se aceptaba, y
       * entonces `Date.parse` daba `NaN`, el índice de la rotación salía `NaN` y la Cita
       * elegida era `undefined` — un fallo a cuatro marcos de distancia de la errata.
       *
       * Y el consumidor no es una prueba: es la caja de texto libre del `workflow_dispatch`
       * de `.github/workflows/publicar.yml`, que rellena una persona a mano.
       */
      expect(jornadaDelBuild({ FECHA_JORNADA: imposible }, new Date('2026-08-11T09:00:00Z'))).toBe(
        '2026-08-11',
      );
    },
  );

  it('y ese día imposible no llega nunca a la selección', () => {
    // La consecuencia, por si algún día alguien relajara la comprobación de arriba: lo que
    // se protege no es el formato, es que la portada no se quede sin Cita.
    const jornada = jornadaDelBuild({ FECHA_JORNADA: '2026-02-31' }, new Date('2026-08-11T09:00:00Z'));
    const seleccion = citaDelDia([cita('a'), cita('b')], jornada);
    expect(seleccion).not.toBeNull();
    expect(seleccion!.cita).toBeDefined();
  });
});

describe('Historia 13.1 — qué tiene forma de jornada, dicho en un solo sitio', () => {
  it.each(['2026-08-11', '2026-01-01', '2024-02-29', '2026-12-31'])('admite %s', (buena) => {
    expect(esJornada(buena)).toBe(true);
  });

  it.each([
    '11-08-2026',
    '2026-8-11',
    '2026-08-11T00:00:00Z',
    'manana',
    '',
    '2026-02-31',
    '2025-02-29',
    '2026-13-01',
  ])('rechaza %s', (mala) => {
    expect(esJornada(mala)).toBe(false);
  });

  it('es el único dueño: la orden que fija jornadas y el sitio preguntan lo mismo', () => {
    // Lo que impide que la herramienta acepte una clave que el sitio no sabe leer, o al
    // revés. Las dos partes llaman aquí; ninguna escribe su propia expresión regular.
    expect(esJornada('manana')).toBe(false);
    expect(jornadaDelBuild({ FECHA_JORNADA: 'manana' }, new Date('2026-08-11T09:00:00Z'))).toBe(
      '2026-08-11',
    );
  });
});

describe('Historia 4.1 — selección', () => {
  it('dos visitantes de la misma jornada ven la misma Cita', () => {
    const uno = citaDelDia(APTAS, '2026-08-11');
    const otro = citaDelDia(APTAS, '2026-08-11');
    expect(uno!.cita.slug).toBe(otro!.cita.slug);
  });

  it('la selección es determinista a partir de la fecha', () => {
    // Mismo resultado en cualquier ejecución: no depende del orden de lectura del disco.
    const desordenadas = [...APTAS].reverse();
    expect(citaDelDia(desordenadas, '2026-08-11')!.cita.slug).toBe(
      citaDelDia(APTAS, '2026-08-11')!.cita.slug,
    );
  });

  it('cambia de una jornada a la siguiente', () => {
    expect(citaDelDia(APTAS, '2026-08-11')!.cita.slug).not.toBe(
      citaDelDia(APTAS, '2026-08-12')!.cita.slug,
    );
  });

  it('no repite ninguna mientras queden aptas sin destacar', () => {
    // Cinco jornadas seguidas deben dar las cinco Citas, sin repetir.
    const jornadas = ['2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15'];
    const elegidas = jornadas.map((j) => citaDelDia(APTAS, j)!.cita.slug);

    expect(new Set(elegidas).size).toBe(APTAS.length);
    // Y a la sexta vuelve a empezar, que es lo correcto: ya no quedan sin destacar.
    expect(citaDelDia(APTAS, '2026-08-16')!.cita.slug).toBe(elegidas[0]);
  });

  it('recorre el conjunto entero sea cual sea su tamaño', () => {
    for (const tamaño of [1, 2, 7, 38]) {
      const conjunto = Array.from({ length: tamaño }, (_, i) => cita(`c${i}`));
      const vistas = new Set<string>();
      for (let d = 0; d < tamaño; d += 1) {
        const jornada = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
        vistas.add(citaDelDia(conjunto, jornada)!.cita.slug);
      }
      expect(vistas.size, `con ${tamaño} aptas`).toBe(tamaño);
    }
  });

  it('sin ninguna Cita apta no se inventa una', () => {
    expect(citaDelDia([], '2026-08-11')).toBeNull();
  });
});

describe('Historia 4.1 — fijación manual', () => {
  it('tiene prioridad sobre la rotación en su fecha', () => {
    const automatica = citaDelDia(APTAS, '2026-08-11')!.cita.slug;
    const fijada = citaDelDia(APTAS, '2026-08-11', { '2026-08-11': 'e' })!;

    expect(fijada.cita.slug).toBe('e');
    expect(fijada.fijada).toBe(true);
    expect(fijada.cita.slug).not.toBe(automatica);
  });

  it('solo afecta a su fecha', () => {
    const otra = citaDelDia(APTAS, '2026-08-12', { '2026-08-11': 'e' })!;
    expect(otra.fijada).toBe(false);
    expect(otra.cita.slug).toBe(citaDelDia(APTAS, '2026-08-12')!.cita.slug);
  });

  it('una fijación a una Cita que ya no está apta no bloquea la portada', () => {
    // Se ignora y rota como cualquier otro día. Dejar la portada en blanco sería peor
    // que ignorar una fijación obsoleta.
    const resultado = citaDelDia(APTAS, '2026-08-11', { '2026-08-11': 'retirada' })!;
    expect(resultado).not.toBeNull();
    expect(resultado.fijada).toBe(false);
    expect(resultado.cita.slug).toBe(citaDelDia(APTAS, '2026-08-11')!.cita.slug);
  });
});

describe('Historia 4.1 — el conjunto apto', () => {
  it('solo entran las Citas marcadas', () => {
    const citas = [cita('si'), cita('no', { apta: false }), cita('tambien')];
    expect(aptasParaPortada(citas).map((c) => c.slug)).toEqual(['si', 'tambien']);
  });
});

describe('Historia 21.1 — la rotación recorre las aptas en rondas por Autor', () => {
  const de = (autor: string, ...slugs: string[]) => slugs.map((s) => cita(s, { autor }));
  // A: a1, a2, a3; B: b1; C: c1, c2 — la fila «Rondas» de la matriz.
  const TRES_AUTORES = [...de('c', 'c2', 'c1'), ...de('a', 'a3', 'a1', 'a2'), ...de('b', 'b1')];

  /** Las jornadas consecutivas que cubren una vuelta entera, empezando en índice 0. */
  const vuelta = (tamaño: number): string[] => {
    // 1970-01-01 es el día 0 desde la época: su índice es 0 para cualquier tamaño.
    return Array.from({ length: tamaño }, (_, d) =>
      new Date(Date.UTC(1970, 0, 1 + d)).toISOString().slice(0, 10),
    );
  };

  it('toma la 1.ª de cada Autor, luego la 2.ª de cada uno, hasta agotarlas', () => {
    expect(ordenEnRondas(TRES_AUTORES).map((c) => c.slug)).toEqual([
      'a1', 'b1', 'c1', 'a2', 'c2', 'a3',
    ]);
  });

  it('y la Cita del Día sigue ese recorrido jornada a jornada', () => {
    const elegidas = vuelta(TRES_AUTORES.length).map((j) => citaDelDia(TRES_AUTORES, j)!.cita.slug);
    expect(elegidas).toEqual(['a1', 'b1', 'c1', 'a2', 'c2', 'a3']);
  });

  it('con un solo Autor, el orden es el de siempre: por slug', () => {
    expect(ordenEnRondas(de('a', 'a2', 'a1')).map((c) => c.slug)).toEqual(['a1', 'a2']);
  });

  it('es una permutación: cada apta exactamente una vez', () => {
    for (const conjunto of [TRES_AUTORES, APTAS, de('x', 'x1'), [...de('p', 'p1', 'p2', 'p3', 'p4'), ...de('q', 'q1')]]) {
      const orden = ordenEnRondas(conjunto).map((c) => c.slug);
      expect(orden).toHaveLength(conjunto.length);
      expect([...orden].sort()).toEqual(conjunto.map((c) => c.slug).sort());
    }
  });

  it('no depende del orden de lectura del disco', () => {
    const esperado = ordenEnRondas(TRES_AUTORES).map((c) => c.slug);
    const barajados = [
      [...TRES_AUTORES].reverse(),
      [...TRES_AUTORES].sort((a, b) => b.slug.localeCompare(a.slug)),
      [TRES_AUTORES[3], TRES_AUTORES[0], TRES_AUTORES[5], TRES_AUTORES[2], TRES_AUTORES[1], TRES_AUTORES[4]],
    ];
    for (const barajado of barajados) {
      expect(ordenEnRondas(barajado).map((c) => c.slug)).toEqual(esperado);
    }
  });

  it('no altera el conjunto que recibe', () => {
    const copia = TRES_AUTORES.map((c) => c.slug);
    ordenEnRondas(TRES_AUTORES);
    expect(TRES_AUTORES.map((c) => c.slug)).toEqual(copia);
  });

  it('dos jornadas consecutivas de la misma ronda no comparten Autor si la ronda tiene dos o más', () => {
    /*
     * La lectura de «la ronda en curso»: la garantía es dentro de una ronda. En la frontera
     * entre rondas puede repetirse Autor —con A(2), B(1) sale A-1, B-1, A-2, y la vuelta
     * pasa de A-2 a A-1—, y eso no es un fallo: es lo único que una permutación sin estado
     * puede dar cuando un Autor tiene más Citas que los demás.
     */
    const conjuntos = [
      TRES_AUTORES,
      [...de('a', 'a1', 'a2'), ...de('b', 'b1')],
      [...de('s', 's1', 's2', 's3', 's4'), ...de('m', 'm1', 'm2'), ...de('g', 'g1'), ...de('u', 'u1', 'u2', 'u3')],
    ];
    for (const conjunto of conjuntos) {
      // La ronda de cada Cita es su posición dentro de las de su Autor.
      const rondaDe = new Map<string, number>();
      const porAutor = new Map<string, string[]>();
      for (const c of conjunto) porAutor.set(c.autor, [...(porAutor.get(c.autor) ?? []), c.slug]);
      for (const slugs of porAutor.values()) {
        slugs.sort((a, b) => a.localeCompare(b, 'es')).forEach((s, i) => rondaDe.set(s, i));
      }
      const autoresEnRonda = (r: number) => [...porAutor.values()].filter((s) => s.length > r).length;

      const elegidas = vuelta(conjunto.length).map((j) => citaDelDia(conjunto, j)!.cita);
      let comprobados = 0;
      for (let i = 0; i + 1 < elegidas.length; i += 1) {
        const [hoy, mañana] = [elegidas[i], elegidas[i + 1]];
        const ronda = rondaDe.get(hoy.slug)!;
        if (ronda !== rondaDe.get(mañana.slug) || autoresEnRonda(ronda) < 2) continue;
        expect(mañana.autor, `${hoy.slug} → ${mañana.slug}`).not.toBe(hoy.autor);
        comprobados += 1;
      }
      expect(comprobados).toBeGreaterThan(0);
    }
  });

  it('en la frontera sí se repite Autor, y la prueba lo enseña: A(2), B(1)', () => {
    // a1, b1, a2 y vuelta a a1: la jornada 2 (a2) y la 3 (a1 otra vez) son del mismo Autor.
    // Es la frontera de la vuelta, con la última ronda de un solo Autor que además es el
    // primero del conjunto. Dos jornadas seguidas, no tres.
    const conjunto = [...de('a', 'a1', 'a2'), ...de('b', 'b1')];
    const elegidas = vuelta(4).map((j) => citaDelDia(conjunto, j)!.cita);
    expect(elegidas.map((c) => c.slug)).toEqual(['a1', 'b1', 'a2', 'a1']);
    expect(elegidas[3].autor).toBe(elegidas[2].autor);
    expect(elegidas[1].autor).not.toBe(elegidas[0].autor);
  });

  it('el índice de partida: 1970-01-01 es el índice 0', () => {
    // El día 0 desde la época. Las pruebas de arriba que recorren `vuelta()` se apoyan en
    // esto, así que se dice explícitamente en vez de suponerlo.
    for (const conjunto of [TRES_AUTORES, APTAS, [...de('a', 'a1', 'a2'), ...de('b', 'b1')]]) {
      expect(citaDelDia(conjunto, '1970-01-01')!.cita.slug).toBe(ordenEnRondas(conjunto)[0].slug);
    }
    // Y el día siguiente es el índice 1, no otra vez el 0.
    expect(citaDelDia(TRES_AUTORES, '1970-01-02')!.cita.slug).toBe('b1');
  });

  it('con una distribución como la real, la racha máxima de un Autor es 2; por slug era 3', () => {
    /*
     * 11 Autores con una apta, 3 con dos y uno con tres, cuyo slug es el último
     * alfabéticamente. Las Citas llevan el slug de su Autor delante, como en el Corpus,
     * que es lo que hacía que el orden por slug las agrupara.
     */
    const unicos = ['alcala', 'bello', 'cervantes', 'dario', 'espronceda', 'fuentes', 'gracian', 'huidobro', 'isaacs', 'jovellanos', 'larra'];
    const dobles = ['marti', 'neruda', 'ortega'];
    const conjunto = [
      ...unicos.flatMap((a) => de(a, `${a}-1`)),
      ...dobles.flatMap((a) => de(a, `${a}-1`, `${a}-2`)),
      ...de('seneca', 'seneca-1', 'seneca-2', 'seneca-3'),
    ].reverse();
    const n = conjunto.length;
    expect(n).toBe(20);

    /** La racha más larga de un mismo Autor en n jornadas consecutivas más la vuelta. */
    const rachaMaxima = (autores: string[]): number => {
      let mayor = 1;
      let actual = 1;
      for (let i = 1; i < autores.length; i += 1) {
        actual = autores[i] === autores[i - 1] ? actual + 1 : 1;
        mayor = Math.max(mayor, actual);
      }
      return mayor;
    };

    // Dos vueltas seguidas: las n jornadas y la frontera de la vuelta al principio.
    const jornadas = vuelta(2 * n);
    const ahora = jornadas.map((j) => citaDelDia(conjunto, j)!.cita);
    expect(new Set(ahora.slice(0, n).map((c) => c.slug)).size).toBe(n);
    expect(rachaMaxima(ahora.map((c) => c.autor))).toBeLessThanOrEqual(2);

    // El orden de antes, con el mismo índice: días desde la época módulo n.
    const porSlug = [...conjunto].sort((a, b) => a.slug.localeCompare(b.slug, 'es'));
    const antes = jornadas.map((_, d) => porSlug[d % n]);
    expect(rachaMaxima(antes.map((c) => c.autor))).toBe(3);
  });

  it('una fijación a una apta manda sobre las rondas', () => {
    const [primera] = vuelta(1);
    const automatica = citaDelDia(TRES_AUTORES, primera)!;
    expect(automatica.cita.slug).toBe('a1');
    const fijada = citaDelDia(TRES_AUTORES, primera, { [primera]: 'c2' })!;
    expect(fijada.cita.slug).toBe('c2');
    expect(fijada.fijada).toBe(true);
  });

  it('una fijación a un slug no apto se ignora y rota en rondas', () => {
    const jornadas = vuelta(3);
    const resultado = citaDelDia(TRES_AUTORES, jornadas[2], { [jornadas[2]]: 'no-apta' })!;
    expect(resultado.fijada).toBe(false);
    expect(resultado.cita.slug).toBe('c1');
  });

  it('sin aptas no hay orden ni Cita', () => {
    expect(ordenEnRondas([])).toEqual([]);
    expect(citaDelDia([], '2026-08-11')).toBeNull();
  });
});
