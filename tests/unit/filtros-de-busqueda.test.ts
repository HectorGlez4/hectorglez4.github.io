import { describe, expect, it } from 'vitest';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import {
  filtrosDeLaBusqueda,
  obrasIndexables,
  type Autor,
  type Cita,
  type Tema,
} from '../../src/lib/publicado.ts';
import { MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';

/**
 * Historia 27.1, FR-7, AD-11, AD-25 — los filtros de cada Cita y las opciones de `/buscar/` salen
 * de una sola función, `filtrosDeLaBusqueda`. Pura y sin construir: lo que se escribe en `dist/`
 * lo mira `filtros-de-cita.test.ts`, y los recuentos de `filters()` del índice de verdad,
 * `tests/e2e/busqueda.spec.ts`.
 */

const obra = (nombre: string, autor: string, titulo: string, recuento: number): ObraResuelta => ({
  nombre,
  autor,
  titulo,
  fuentes: [],
  edicionCotejada: false,
  temas: [],
  recuento,
});

const cita = (slug: string, autor: string, temas: string[], suObra?: ObraResuelta): Cita => ({
  slug,
  texto: `Texto de ${slug}.`,
  autor,
  temas,
  procedencia: {},
  ...(suObra !== undefined ? { obra: suObra } : {}),
  aptaParaPortada: false,
});

const autor = (slug: string, nombre: string): Autor => ({
  slug,
  nombre,
  semblanza: '',
  añoFallecimiento: 1900,
  ordenAlfabetico: nombre,
});

const AUTORES = [autor('horacio', 'Horacio'), autor('ruben-dario', 'Rubén Darío'), autor('nadie', 'Nadie')];
const TEMAS: Tema[] = [
  { slug: 'el-tiempo', nombre: 'El tiempo' },
  { slug: 'la-ira', nombre: 'La ira' },
];

// «Odas» de dos Autores: mismo título, dos fichas.
const ODAS_H = obra('horacio--odas', 'horacio', 'Odas', 2);
const ODAS_R = obra('ruben-dario--odas', 'ruben-dario', 'Odas', 1);

/** Lo bastante para que «el tiempo» se publique y «la ira» se quede por debajo. */
function conjunto(odasH: ObraResuelta = ODAS_H) {
  const citas = [
    cita('horacio-uno', 'horacio', ['el-tiempo', 'la-ira', 'el-tiempo'], odasH),
    cita('horacio-dos', 'horacio', ['el-tiempo'], odasH),
    cita('horacio-sin-obra', 'horacio', ['la-ira']),
    cita('ruben-dario-oda', 'ruben-dario', ['el-tiempo'], ODAS_R),
    ...Array.from({ length: MIN_CITAS_POR_TEMA }, (_, i) => cita(`ruben-dario-relleno-${i}`, 'ruben-dario', ['el-tiempo'])),
  ];
  return { citas, autores: AUTORES, temas: TEMAS };
}

describe('Historia 27.1 — los filtros de la búsqueda', () => {
  it('cada Cita lleva su Autor, su Obra por nombre de ficha y sus Temas publicados, sin repetir', () => {
    const { porCita } = filtrosDeLaBusqueda(conjunto());
    expect(porCita.get('horacio-uno')).toEqual({ autor: 'horacio', obra: 'horacio--odas', temas: ['el-tiempo'] });
    // Sin Obra resuelta, sin `obra`: la clave se omite, no va vacía.
    expect(porCita.get('horacio-sin-obra')).toEqual({ autor: 'horacio', temas: [] });
    expect('obra' in porCita.get('horacio-sin-obra')!).toBe(false);
    expect(porCita.size).toBe(conjunto().citas.length);
  });

  it('dos Obras homónimas de Autores distintos dan valores distintos', () => {
    const { porCita, obras } = filtrosDeLaBusqueda(conjunto());
    expect(porCita.get('horacio-uno')!.obra).toBe('horacio--odas');
    expect(porCita.get('ruben-dario-oda')!.obra).toBe('ruben-dario--odas');
    expect(obras.map((o) => [o.valor, o.rotulo, o.autor])).toEqual([
      ['horacio--odas', 'Odas', 'horacio'],
      ['ruben-dario--odas', 'Odas', 'ruben-dario'],
    ]);
  });

  it('retitular la ficha cambia el rótulo, nunca el valor', () => {
    const antes = filtrosDeLaBusqueda(conjunto());
    const despues = filtrosDeLaBusqueda(conjunto({ ...ODAS_H, titulo: 'Carmina' }));
    expect(despues.porCita).toEqual(antes.porCita);
    expect(despues.obras.find((o) => o.valor === 'horacio--odas')!.rotulo).toBe('Carmina');
  });

  it('un Tema bajo su umbral no es filtro ni opción', () => {
    const { porCita, temas } = filtrosDeLaBusqueda(conjunto());
    expect([...porCita.values()].some((f) => f.temas.includes('la-ira'))).toBe(false);
    expect(temas.map((t) => t.valor)).toEqual(['el-tiempo']);
  });

  it('los recuentos son las Citas con ese valor, y las opciones van por valor', () => {
    const { autores, obras, temas } = filtrosDeLaBusqueda(conjunto());
    expect(autores).toEqual([
      { valor: 'horacio', rotulo: 'Horacio', recuento: 3 },
      { valor: 'ruben-dario', rotulo: 'Rubén Darío', recuento: 1 + MIN_CITAS_POR_TEMA },
    ]);
    expect(obras.map((o) => o.recuento)).toEqual([2, 1]);
    // Una vez por Cita, aunque la Cita repita el Tema en su lista.
    expect(temas).toEqual([{ valor: 'el-tiempo', rotulo: 'El tiempo', recuento: 3 + MIN_CITAS_POR_TEMA }]);
  });

  it('un Autor sin Citas no es opción', () => {
    expect(filtrosDeLaBusqueda(conjunto()).autores.map((a) => a.valor)).not.toContain('nadie');
  });

  it('una Obra que no se indexa sigue siendo opción', () => {
    const datos = conjunto();
    // La de Rubén Darío tiene una sola Cita: FR-52 la deja sin indexar.
    expect(obrasIndexables(datos.citas, null).map((o) => o.nombre)).not.toContain('ruben-dario--odas');
    expect(filtrosDeLaBusqueda(datos).obras.map((o) => o.valor)).toContain('ruben-dario--odas');
  });

  it('una Cita cuyo Autor no está rompe', () => {
    const datos = conjunto();
    expect(() => filtrosDeLaBusqueda({ ...datos, citas: [...datos.citas, cita('fantasma-x', 'fantasma', [])] })).toThrow(
      /«fantasma-x» nombra al Autor «fantasma»/u,
    );
  });
});
