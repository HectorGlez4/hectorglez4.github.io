import { describe, expect, it } from 'vitest';
import { citasRelacionadas } from '../../src/lib/publicado.ts';
import type { Cita } from '../../src/lib/publicado.ts';

/**
 * UX-DR17 — «hasta 4 Citas del mismo Autor más chips de Temas; nunca vacío».
 *
 * La decisión declara **cuántas** y **de quién**, y no dice cuáles. Esto fija cuáles, que hasta
 * ahora no tenía ni una prueba.
 *
 * Lo que había era `.slice(0, 4)` sobre la lista ordenada por slug, es decir **las cuatro
 * primeras del alfabeto**. Se vio en una página real y el resultado hablaba solo:
 *
 *     «Caminante, no hay camino, se hace camino al andar.»
 *     «Caminante, no hay camino, sino estelas en la mar.»
 *
 * Slugs contiguos son casi siempre textos casi iguales —la misma obra, el mismo verso, la misma
 * arranque—, así que «Más de este Autor» enseñaba variantes de lo mismo en vez de más del Autor.
 * Y con un Autor de 113 Citas, su cola no aparecía nunca en ninguna parte.
 */

/*
 * El Autor sale del slug y no se fija a mano. La primera versión de este ayudante ponía
 * `autor: 'seneca'` en todas, así que las dos que se llamaban `marti-*` **también eran de
 * Séneca** y la prueba de «solo del mismo Autor» pasaba sin comprobar nada. Se vio en cuanto
 * el reparto empezó a llegar al final de la lista.
 */
const cita = (slug: string, temas: string[] = ['el-saber']): Cita =>
  ({
    slug,
    autor: slug.startsWith('marti-') ? 'jose-marti' : 'seneca',
    texto: slug,
    temas,
    procedencia: {},
  }) as unknown as Cita;

/** Un Autor con muchas Citas, en orden de slug como las entrega el conjunto publicable. */
const MUCHAS = Array.from({ length: 40 }, (_, i) => cita(`seneca-${String(i).padStart(2, '0')}`));

describe('UX-DR17 — cuáles son las Citas relacionadas', () => {
  it('son del mismo Autor y nunca la propia', () => {
    const otras = [...MUCHAS, cita('marti-una'), cita('marti-otra')];
    const salida = citasRelacionadas(otras, MUCHAS[0], 4);

    expect(salida).toHaveLength(4);
    expect(salida.every((c) => c.slug.startsWith('seneca-'))).toBe(true);
    expect(salida.map((c) => c.slug)).not.toContain(MUCHAS[0].slug);
  });

  it('prefiere las que comparten Tema', () => {
    const conTema = cita('seneca-zz-comparte', ['la-virtud']);
    const base = cita('seneca-00-base', ['la-virtud']);
    const otras = [base, ...MUCHAS.slice(1), conTema];

    expect(citasRelacionadas(otras, base, 4).map((c) => c.slug)).toContain('seneca-zz-comparte');
  });

  it('no son las cuatro primeras del alfabeto: se reparten por la obra del Autor', () => {
    const salida = citasRelacionadas(MUCHAS, MUCHAS[0], 4).map((c) => c.slug);
    const primeras = MUCHAS.slice(1, 5).map((c) => c.slug);

    expect(salida).not.toEqual(primeras);
    // Y llegan al final: la cola de un Autor con muchas Citas deja de ser invisible.
    expect(salida.some((s) => Number(s.replace('seneca-', '')) > 25)).toBe(true);
  });

  it('el reparto es determinista: dos construcciones del mismo commit dan el mismo sitio', () => {
    const una = citasRelacionadas(MUCHAS, MUCHAS[3], 4).map((c) => c.slug);
    const otra = citasRelacionadas(MUCHAS, MUCHAS[3], 4).map((c) => c.slug);

    expect(una).toEqual(otra);
  });

  it('con pocas candidatas las devuelve todas y sin repetir', () => {
    const pocas = MUCHAS.slice(0, 3);
    const salida = citasRelacionadas(pocas, pocas[0], 4);

    expect(salida).toHaveLength(2);
    expect(new Set(salida.map((c) => c.slug)).size).toBe(2);
  });

  it('nunca devuelve la misma Cita dos veces', () => {
    const salida = citasRelacionadas(MUCHAS, MUCHAS[10], 4);
    expect(new Set(salida.map((c) => c.slug)).size).toBe(salida.length);
  });
});
