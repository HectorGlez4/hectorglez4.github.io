import { describe, expect, it } from 'vitest';
import {
  aptasParaPortada,
  citaDelDia,
  esJornada,
  jornadaDelBuild,
} from '../../src/lib/citaDelDia.ts';
import type { Cita } from '../../src/lib/publicado.ts';

const cita = (slug: string, apta = true): Cita => ({
  slug,
  texto: `Texto de ${slug}.`,
  autor: 'autor',
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
    const citas = [cita('si', true), cita('no', false), cita('tambien', true)];
    expect(aptasParaPortada(citas).map((c) => c.slug)).toEqual(['si', 'tambien']);
  });
});
