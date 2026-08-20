import { describe, expect, it } from 'vitest';
import { citaDelDia } from '../../src/lib/citaDelDia.ts';
import { materialDelKit } from '../../src/lib/kit.ts';
import { materialDelLote } from '../../src/lib/lote.ts';
import { fijacionesDeclaradas } from '../../src/lib/portada.ts';
import { MAX_CARACTERES_IMAGEN } from '../../src/lib/umbrales.ts';
import type { Cita } from '../../src/lib/publicado.ts';

/**
 * Historia 13.1 — el material de varias jornadas.
 *
 * La aserción que sostiene la historia entera es la primera: lo que el lote compone para una
 * jornada es **idéntico** a lo que el Kit compone para esa misma jornada. Es lo que hace
 * cierto «indistinguible», y también lo que impide que aparezca un segundo calendario sin
 * que nadie se entere: en cuanto el lote decidiera algo por su cuenta, dejaría de coincidir.
 */

const cita = (slug: string, texto: string): Cita =>
  ({
    slug,
    texto,
    autor: 'seneca',
    temas: [],
    procedencia: { obra: 'Cartas a Lucilio', año: 65 },
    aptaParaPortada: true,
  }) as unknown as Cita;

const CORTA = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const LARGA = 'a'.repeat(MAX_CARACTERES_IMAGEN + 20);

const APTAS = [cita('a', CORTA), cita('b', 'Cada uno es hijo de sus obras.'), cita('c', LARGA)];

const HOY = '2026-08-19';
const MANANA = '2026-08-20';
const PASADO = '2026-08-21';
const AYER = '2026-08-18';

describe('Historia 13.1 — lo compuesto por adelantado y lo del día son lo mismo', () => {
  it('el material de cada jornada es el que el Kit compone para esa jornada', () => {
    const fijaciones = { [MANANA]: 'b', [PASADO]: 'c' };
    const lote = materialDelLote(APTAS, fijaciones, HOY);

    for (const dia of lote) {
      // La comparación es contra `materialDelKit` con las mismas fijaciones, que es
      // literalmente la llamada que hará `kit.astro` ese día. No contra una lista escrita a
      // mano: si la rotación cambiara, esta prueba seguiría valiendo.
      expect(dia.material, dia.jornada).toEqual(materialDelKit(APTAS, dia.jornada, fijaciones));
    }
    expect(lote).toHaveLength(2);
  });

  it('y para una jornada sin fijar, el Kit y el lote coinciden igual: la rotación es la misma', () => {
    // La otra mitad de «no hay dos calendarios»: una jornada fijada y otra que no salen del
    // mismo módulo, así que fijar el martes no cambia lo que se compone el miércoles.
    const fijaciones = { [MANANA]: 'b' };
    const [manana] = materialDelLote(APTAS, fijaciones, HOY);
    expect(manana.material!.delDia.cita.slug).toBe('b');
    expect(citaDelDia(APTAS, PASADO, fijaciones)!.cita.slug).toBe(
      citaDelDia(APTAS, PASADO)!.cita.slug,
    );
  });

  it('la jornada fijada sale marcada como fijada, no como rotación', () => {
    const [dia] = materialDelLote(APTAS, { [MANANA]: 'b' }, HOY);
    expect(dia.material!.delDia.fijada).toBe(true);
    expect(dia.honrada).toBe(true);
  });

  it('nada se guarda: cambiar la fijación cambia el material sin recomponer nada', () => {
    const antes = materialDelLote(APTAS, { [MANANA]: 'a' }, HOY);
    const despues = materialDelLote(APTAS, { [MANANA]: 'b' }, HOY);
    expect(antes[0].material!.delDia.cita.slug).toBe('a');
    expect(despues[0].material!.delDia.cita.slug).toBe('b');
  });
});

describe('Historia 13.1 — qué jornadas entra a componer el lote', () => {
  it('las fijadas de hoy en adelante, ordenadas por fecha', () => {
    const lote = materialDelLote(APTAS, { [PASADO]: 'a', [HOY]: 'b', [MANANA]: 'a' }, HOY);
    expect(lote.map((d) => d.jornada)).toEqual([HOY, MANANA, PASADO]);
  });

  it('lo pasado se queda fuera: ninguna construcción vuelve a componer el día de ayer', () => {
    const lote = materialDelLote(APTAS, { [AYER]: 'a', [MANANA]: 'b' }, HOY);
    expect(lote.map((d) => d.jornada)).toEqual([MANANA]);
  });

  it('sin fijaciones no hay lote, y no revienta', () => {
    expect(materialDelLote(APTAS, {}, HOY)).toEqual([]);
  });

  it('sin Citas aptas cada jornada se queda sin material, y tampoco revienta', () => {
    const lote = materialDelLote([], { [MANANA]: 'a' }, HOY);
    expect(lote).toHaveLength(1);
    expect(lote[0].material).toBeNull();
    expect(lote[0].honrada).toBe(false);
  });
});

describe('Historia 13.1 — una fijación que ya no vale se ve antes de que llegue el día', () => {
  it('la fijación a una Cita que no está entre las aptas no se honra, y se dice', () => {
    /*
     * `citaDelDia` ignora una fijación cuya Cita ya no está apta y rota, para no dejar la
     * portada muda. Es lo correcto y lo más silencioso que hay: el lote lo enseña mientras
     * todavía se puede arreglar.
     */
    const lote = materialDelLote(APTAS, { [MANANA]: 'retirada-hace-un-mes' }, HOY);

    expect(lote[0].fijadaA).toBe('retirada-hace-un-mes');
    expect(lote[0].honrada).toBe(false);
    // Y lo que enseña es lo que saldrá de verdad: la Cita de la rotación, no un hueco.
    expect(lote[0].material!.delDia.cita.slug).toBe(citaDelDia(APTAS, MANANA)!.cita.slug);
  });

  it('y aun así compone el mismo material que el Kit compondría ese día', () => {
    const fijaciones = { [MANANA]: 'retirada-hace-un-mes' };
    expect(materialDelLote(APTAS, fijaciones, HOY)[0].material).toEqual(
      materialDelKit(APTAS, MANANA, fijaciones),
    );
  });
});

describe('Historia 13.1 — la Cita larga se trata igual que en el Kit', () => {
  it('una jornada fijada a una Cita que no admite Imagen ofrece alternativa', () => {
    const lote = materialDelLote(APTAS, { [MANANA]: 'c' }, HOY);
    expect(lote[0].material!.delDia.cita.slug).toBe('c');
    expect(lote[0].material!.alternativa).not.toBeNull();
    // Y no se sustituye en silencio: la del Día sigue siendo la del Día, como en el Kit.
    expect(lote[0].material!.alternativa!.cita.slug).not.toBe('c');
  });
});

/**
 * Historia 13.1 — `corpus/portada.json` lo puede escribir una persona, y el sitio lo enumera.
 *
 * Hasta esta historia una clave mal escrita era **inerte**: `citaDelDia` consultaba una sola
 * clave, la de hoy, y una que sobrara no la miraba nadie. El lote las enumera todas, así que
 * lo que era inofensivo pasa a poder tumbar `npm run build` entero —el sitio, no `/lote`— y
 * con él la reconstrucción diaria. Estas pruebas son la puerta de eso.
 */
describe('Historia 13.1 — una clave mal escrita no puede tumbar el build', () => {
  it('«manana» no entra en el lote, aunque como cadena sea mayor que cualquier fecha', () => {
    // El caso exacto: la comparación de jornadas es entre cadenas, y `'manana' >= '2026-08-19'`
    // es cierto. Sin filtrar, esa entrada caía a la rotación con `Date.parse` a `NaN`.
    const lote = materialDelLote(APTAS, { manana: 'a', [MANANA]: 'b' }, HOY);
    expect(lote.map((d) => d.jornada)).toEqual([MANANA]);
  });

  it.each(['manana', '2026-02-31', '11-08-2026', '2026-8-4', ''])(
    'la clave «%s» se descarta en vez de componer nada',
    (mala) => {
      const lote = materialDelLote(APTAS, { [mala]: 'a' }, HOY);
      expect(lote).toEqual([]);
    },
  );

  it('y componer con una clave mala no lanza: el build no puede morir por esto', () => {
    expect(() => materialDelLote(APTAS, { manana: 'no-existe' }, HOY)).not.toThrow();
    // La demostración de que el daño era real: la jornada imposible no produce Cita.
    for (const dia of materialDelLote(APTAS, { manana: 'a', '2026-02-31': 'b' }, HOY)) {
      expect(dia.material?.delDia.cita).toBeDefined();
    }
  });
});

describe('Historia 13.1 — cómo lee el sitio el fichero de portada', () => {
  it('lo bien escrito pasa tal cual', () => {
    expect(fijacionesDeclaradas({ _comentario: 'x', fijaciones: { [MANANA]: 'a' } })).toEqual({
      [MANANA]: 'a',
    });
  });

  it('sin la clave «fijaciones» devuelve el conjunto vacío, y no lanza', () => {
    // Es una forma que la propia orden acepta al escribir. `Object.entries(undefined)`
    // habría tumbado el build por una clave ausente.
    expect(fijacionesDeclaradas({ _comentario: 'x' })).toEqual({});
  });

  it.each([undefined, null, 42, 'texto', [], { fijaciones: [] }, { fijaciones: null }])(
    'lo que no tiene forma de fichero de portada —%s— se lee como vacío',
    (bruto) => {
      expect(fijacionesDeclaradas(bruto)).toEqual({});
    },
  );

  it('descarta la entrada mal escrita y conserva las buenas', () => {
    expect(
      fijacionesDeclaradas({
        fijaciones: { manana: 'a', [MANANA]: 'b', '2026-02-31': 'c', [PASADO]: 7 },
      }),
    ).toEqual({ [MANANA]: 'b' });
  });

  it('descartar y seguir, en vez de rechazar: al build no hay a quién preguntarle', () => {
    // La asimetría con `tools/lib/jornadas.ts`, que sí rechaza. Las dos preguntan a
    // `esJornada`; lo que cambia es que delante de la orden hay alguien que puede corregir.
    expect(() => fijacionesDeclaradas({ fijaciones: { manana: 'a' } })).not.toThrow();
  });
});
